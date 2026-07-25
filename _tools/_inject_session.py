"""
Injecte customer-account.js + session-nav.js dans toutes les pages HTML.
Idempotent : ne re-injecte pas si deja present.
Ces scripts affichent l'etat de connexion (menu utilisateur) dans la nav
de chaque page et gardent la session active pendant la navigation.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CUST = '<script src="/assets/js/customer-account.js?v=2"></script>'
FBCFG = '<script src="/assets/js/firebase-config.js?v=1"></script>'
FBAUTH = '<script src="/assets/js/firebase-auth.js?v=1"></script>'
SESS = '<script src="/assets/js/session-nav.js?v=1" defer></script>'
MNAV = '<script src="/assets/js/mobile-nav.js?v=3" defer></script>'

PAGES = [
    "index.html",
    "pages/produits.html", "pages/reseau.html", "pages/investisseurs.html",
    "pages/economies.html", "pages/faq.html", "pages/blog.html", "pages/devis.html",
    "pages/boutique-wallbox.html",
    "pages/compte.html", "pages/suivi.html", "pages/facture.html",
    "pages/legal/cgv.html", "pages/legal/mentions-legales.html",
    "pages/communes/borne-recharge-cayenne.html",
    "pages/communes/borne-recharge-kourou.html",
    "pages/communes/borne-recharge-macouria.html",
    "pages/communes/borne-recharge-matoury.html",
    "pages/communes/borne-recharge-remire-montjoly.html",
    "pages/communes/borne-recharge-saint-laurent-du-maroni.html",
]

print("=== Injection scripts compte/session/firebase ===\n")
n_ok = n_skip = 0
for rel in PAGES:
    p = ROOT / rel
    if not p.exists():
        print(f"  [SKIP] {rel} (absent)")
        continue
    html = p.read_text(encoding="utf-8")
    orig = html

    # 1. customer-account.js — ajoute avant </body> si absent
    if "customer-account.js" not in html:
        html = re.sub(r"(</body>)", "  " + CUST + "\n\\1", html, count=1, flags=re.IGNORECASE)

    # 2. firebase-config.js + firebase-auth.js — juste APRES customer-account.js
    if "firebase-auth.js" not in html:
        html = re.sub(
            r'(<script src="/assets/js/customer-account\.js[^"]*"></script>)',
            r"\1\n  " + FBCFG + "\n  " + FBAUTH,
            html, count=1
        )

    # 3. session-nav.js
    if "session-nav.js" not in html:
        html = re.sub(r"(</body>)", "  " + SESS + "\n\\1", html, count=1, flags=re.IGNORECASE)

    # 4. mobile-nav.js
    if "mobile-nav.js" not in html:
        html = re.sub(r"(</body>)", "  " + MNAV + "\n\\1", html, count=1, flags=re.IGNORECASE)

    if html != orig:
        p.write_text(html, encoding="utf-8")
        print(f"  [OK]  {rel}")
        n_ok += 1
    else:
        n_skip += 1

print(f"\n=== Termine : {n_ok} injecte(s), {n_skip} deja OK ===")
