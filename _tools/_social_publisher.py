"""
EGREENCITY'S — Publication automatique Facebook + LinkedIn
===========================================================

Lit posts-calendar.json, publie ce qui est du :
  - status == 'pending'
  - publish_at <= maintenant (ou == 'now')

Met a jour le statut en 'published' ou 'error'.

USAGE
-----
    python _tools/_social_publisher.py              # publie tout ce qui est du
    python _tools/_social_publisher.py --dry-run    # affiche sans poster
    python _tools/_social_publisher.py --force ID   # force la republication d'un post

DEPENDANCES
-----------
    pip install requests python-dotenv

CONFIGURATION
-------------
Creer un fichier .env a la racine du projet (NE JAMAIS COMMITER) :

    FACEBOOK_PAGE_ID=123456789012345
    FACEBOOK_PAGE_TOKEN=EAAxxxxxxxxxxxxxxx
    LINKEDIN_ACCESS_TOKEN=AQVxxxxxxxxxxxxxxxxxx
    LINKEDIN_ORG_URN=urn:li:organization:12345678

Voir _dossiers/social-api-setup-guide.md pour obtenir ces tokens.
"""
from __future__ import annotations
import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERREUR] pip install requests python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
CALENDAR = ROOT / "_dossiers" / "posts-calendar.json"
LOGFILE = ROOT / "_dossiers" / "_social_publisher.log"

if load_dotenv and ENV.exists():
    load_dotenv(ENV)

FB_PAGE_ID    = os.getenv("FACEBOOK_PAGE_ID", "").strip()
FB_TOKEN      = os.getenv("FACEBOOK_PAGE_TOKEN", "").strip()
LI_TOKEN      = os.getenv("LINKEDIN_ACCESS_TOKEN", "").strip()
LI_ORG_URN    = os.getenv("LINKEDIN_ORG_URN", "").strip()


# ============================================================
#  Logging simple
# ============================================================
def log(msg: str) -> None:
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line)
    LOGFILE.parent.mkdir(parents=True, exist_ok=True)
    with LOGFILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


# ============================================================
#  Facebook Graph API
# ============================================================
def post_facebook(text: str, image_path: Path | None = None) -> tuple[bool, str]:
    """Publie sur la page Facebook. Retourne (succes, message_ou_id)."""
    if not (FB_PAGE_ID and FB_TOKEN):
        return False, "Tokens Facebook absents (.env)"

    base = f"https://graph.facebook.com/v19.0/{FB_PAGE_ID}"
    try:
        if image_path and image_path.exists():
            url = f"{base}/photos"
            with image_path.open("rb") as f:
                r = requests.post(
                    url,
                    data={"caption": text, "access_token": FB_TOKEN},
                    files={"source": f},
                    timeout=60,
                )
        else:
            url = f"{base}/feed"
            r = requests.post(
                url,
                data={"message": text, "access_token": FB_TOKEN},
                timeout=30,
            )
        r.raise_for_status()
        data = r.json()
        post_id = data.get("post_id") or data.get("id", "?")
        return True, f"FB ok id={post_id}"
    except requests.HTTPError as e:
        return False, f"FB HTTP {e.response.status_code}: {e.response.text[:300]}"
    except Exception as e:
        return False, f"FB exception: {e}"


# ============================================================
#  LinkedIn API (UGC Posts)
# ============================================================
def post_linkedin(text: str, image_path: Path | None = None) -> tuple[bool, str]:
    """Publie sur la page LinkedIn de l'organisation. Retourne (succes, message_ou_id)."""
    if not (LI_TOKEN and LI_ORG_URN):
        return False, "Tokens LinkedIn absents (.env)"

    headers = {
        "Authorization": f"Bearer {LI_TOKEN}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    # 1) Si image : upload via Assets API
    image_asset = None
    if image_path and image_path.exists():
        try:
            reg_url = "https://api.linkedin.com/v2/assets?action=registerUpload"
            reg_payload = {
                "registerUploadRequest": {
                    "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                    "owner": LI_ORG_URN,
                    "serviceRelationships": [
                        {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
                    ],
                }
            }
            rr = requests.post(reg_url, headers=headers, json=reg_payload, timeout=30)
            rr.raise_for_status()
            rj = rr.json()
            upload_url = rj["value"]["uploadMechanism"][
                "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
            ]["uploadUrl"]
            image_asset = rj["value"]["asset"]

            with image_path.open("rb") as f:
                up = requests.put(
                    upload_url,
                    headers={"Authorization": f"Bearer {LI_TOKEN}"},
                    data=f.read(),
                    timeout=60,
                )
                up.raise_for_status()
        except Exception as e:
            log(f"  [warn] LinkedIn image upload failed: {e} — post sans image")
            image_asset = None

    # 2) UGC Post
    media_category = "IMAGE" if image_asset else "NONE"
    ugc_payload = {
        "author": LI_ORG_URN,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": media_category,
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    if image_asset:
        ugc_payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
            {
                "status": "READY",
                "media": image_asset,
                "title": {"text": "EGREENCITY'S"},
            }
        ]

    try:
        r = requests.post(
            "https://api.linkedin.com/v2/ugcPosts",
            headers=headers,
            json=ugc_payload,
            timeout=30,
        )
        r.raise_for_status()
        post_id = r.headers.get("x-restli-id") or r.json().get("id", "?")
        return True, f"LI ok id={post_id}"
    except requests.HTTPError as e:
        return False, f"LI HTTP {e.response.status_code}: {e.response.text[:300]}"
    except Exception as e:
        return False, f"LI exception: {e}"


# ============================================================
#  Calendrier
# ============================================================
def is_due(publish_at: str) -> bool:
    if not publish_at or publish_at == "now":
        return True
    try:
        dt = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= dt
    except ValueError:
        return False


def load_calendar() -> dict:
    with CALENDAR.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_calendar(data: dict) -> None:
    with CALENDAR.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> int:
    ap = argparse.ArgumentParser(description="Publier les posts pending du calendrier.")
    ap.add_argument("--dry-run", action="store_true", help="N'envoie rien, montre seulement.")
    ap.add_argument("--force", metavar="ID", help="Reposter le post id (meme deja publie).")
    args = ap.parse_args()

    cal = load_calendar()
    posts = cal.get("posts", [])
    todo = []
    for p in posts:
        if args.force and p.get("id") == args.force:
            todo.append(p); continue
        if p.get("status") == "published":
            continue
        if is_due(p.get("publish_at", "")):
            todo.append(p)

    if not todo:
        log("Rien a publier (aucun post 'pending' du).")
        return 0

    log(f"=== {len(todo)} post(s) a publier ===")
    changes = False

    for p in todo:
        pid = p.get("id", "?")
        plats = (p.get("platforms") or "").lower()
        text = p.get("text", "").strip()
        image_path = None
        if p.get("image"):
            ip = ROOT / p["image"]
            if ip.exists():
                image_path = ip

        results = {}

        if "facebook" in plats or plats == "both":
            log(f"  [{pid}] -> Facebook")
            if args.dry_run:
                results["facebook"] = (True, "DRY-RUN")
            else:
                results["facebook"] = post_facebook(text, image_path)
            log(f"     {results['facebook'][1]}")

        if "linkedin" in plats or plats == "both":
            log(f"  [{pid}] -> LinkedIn")
            if args.dry_run:
                results["linkedin"] = (True, "DRY-RUN")
            else:
                results["linkedin"] = post_linkedin(text, image_path)
            log(f"     {results['linkedin'][1]}")

        if not results:
            log(f"  [{pid}] aucune plateforme reconnue (champ 'platforms' invalide)")
            continue

        ok = all(r[0] for r in results.values())
        if not args.dry_run:
            p["status"] = "published" if ok else "error"
            p["last_attempt"] = datetime.now(timezone.utc).isoformat()
            p["last_result"] = {k: v[1] for k, v in results.items()}
            changes = True

    if changes and not args.dry_run:
        save_calendar(cal)
        log("Calendrier mis a jour.")

    log("=== Fin ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
