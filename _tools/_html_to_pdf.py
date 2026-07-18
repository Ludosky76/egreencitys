"""
EGREENCITY'S — Conversion HTML -> PDF via Microsoft Edge headless
==================================================================

Convertit des fichiers .html en .pdf en utilisant Microsoft Edge en mode
headless (rendu identique au navigateur, support complet CSS3, gradients,
flexbox, web fonts, etc.).

USAGE
-----
    python _tools/_html_to_pdf.py fichier.html
    python _tools/_html_to_pdf.py dossier/                # tous les .html du dossier
    python _tools/_html_to_pdf.py "path/Email_*.html"     # glob

NECESSITE
---------
    Microsoft Edge installe (par defaut sur Windows 10/11)
"""
from __future__ import annotations
import sys
import subprocess
import argparse
import tempfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Chemins typiques de msedge.exe sur Windows
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def find_edge() -> str:
    for p in EDGE_PATHS:
        if Path(p).exists():
            return p
    # Fallback : essayer chrome
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for p in chrome_paths:
        if Path(p).exists():
            return p
    raise RuntimeError("Microsoft Edge / Chrome introuvable")


def html_to_pdf(html_path: Path, pdf_path: Path | None = None) -> Path:
    if not html_path.exists():
        raise FileNotFoundError(html_path)
    if pdf_path is None:
        pdf_path = html_path.with_suffix(".pdf")
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    edge = find_edge()
    # URL file:// (avec encodage Windows correct)
    file_uri = html_path.resolve().as_uri()

    # user-data-dir unique pour eviter le conflit "Edge deja lance"
    tmp_profile = Path(tempfile.gettempdir()) / f"edge_pdf_{uuid.uuid4().hex[:8]}"
    cmd = [
        edge,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        f"--user-data-dir={tmp_profile}",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={pdf_path}",
        file_uri,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    # Cleanup du profil temporaire
    try:
        import shutil
        shutil.rmtree(tmp_profile, ignore_errors=True)
    except Exception:
        pass
    if not pdf_path.exists() or pdf_path.stat().st_size < 1000:
        raise RuntimeError(
            f"Echec conversion : {result.stderr[:300] if result.stderr else 'PDF vide'}"
        )
    return pdf_path


def collect_html(target: Path) -> list[Path]:
    if target.is_file() and target.suffix.lower() in (".html", ".htm"):
        return [target]
    if target.is_dir():
        return sorted(target.glob("*.html"))
    return []


def main() -> int:
    ap = argparse.ArgumentParser(description="Convertit des .html en .pdf via Edge headless.")
    ap.add_argument("target", help="Fichier .html ou dossier")
    ap.add_argument("-o", "--out", help="Fichier ou dossier de sortie")
    args = ap.parse_args()

    target = Path(args.target)
    if not target.is_absolute():
        target = (ROOT / target).resolve()

    html_files = collect_html(target)
    if not html_files:
        print(f"[ERREUR] Aucun .html trouve : {target}")
        return 1

    out_arg = Path(args.out) if args.out else None
    if out_arg and not out_arg.is_absolute():
        out_arg = (ROOT / out_arg).resolve()

    print(f"=== Conversion {len(html_files)} fichier(s) ===\n")
    ok = errors = 0
    for html in html_files:
        try:
            if out_arg and out_arg.suffix.lower() == ".pdf":
                pdf = out_arg
            elif out_arg:
                pdf = out_arg / (html.stem + ".pdf")
            else:
                pdf = html.with_suffix(".pdf")
            html_to_pdf(html, pdf)
            size_kb = pdf.stat().st_size / 1024
            try:
                rel = pdf.relative_to(ROOT)
            except ValueError:
                rel = pdf
            print(f"  [OK]  {rel}  ({size_kb:.0f} KB)")
            ok += 1
        except Exception as e:
            print(f"  [ERR] {html.name}: {e}")
            errors += 1

    print(f"\n=== Termine : {ok} OK, {errors} erreur(s) ===")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
