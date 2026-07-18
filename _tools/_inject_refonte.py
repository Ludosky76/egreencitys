"""
Injecte refonte.css + refonte.js dans toutes les pages HTML du site.
Idempotent : si deja injecte, saute la page.

- Le CSS est injecte juste avant </head>
- Le JS est injecte juste avant </body>
- Le chemin est relatif a la racine du site (/assets/...)
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CSS_TAG = '<link rel="stylesheet" href="/assets/css/refonte.css?v=1">'
JS_TAG = '<script src="/assets/js/refonte.js?v=1" defer></script>'

PAGES = [
    "index.html",
    "pages/produits.html", "pages/reseau.html", "pages/investisseurs.html",
    "pages/economies.html", "pages/faq.html", "pages/blog.html", "pages/devis.html",
    "pages/legal/cgv.html", "pages/legal/mentions-legales.html",
    "pages/communes/borne-recharge-cayenne.html",
    "pages/communes/borne-recharge-kourou.html",
    "pages/communes/borne-recharge-macouria.html",
    "pages/communes/borne-recharge-matoury.html",
    "pages/communes/borne-recharge-remire-montjoly.html",
    "pages/communes/borne-recharge-saint-laurent-du-maroni.html",
    "pages/video/video-presentation.html",
    "pages/video/video-presentation-9x16.html",
]

print("=== Injection refonte.css + refonte.js ===\n")
n_ok = n_skip = 0
for rel in PAGES:
    p = ROOT / rel
    if not p.exists():
        print(f"  [SKIP] {rel} (fichier absent)")
        continue

    html = p.read_text(encoding="utf-8")

    css_present = "refonte.css" in html
    js_present  = "refonte.js" in html

    if css_present and js_present:
        n_skip += 1
        continue

    changed = html
    if not css_present:
        changed = re.sub(
            r"(</head>)",
            f"  {CSS_TAG}\n\\1",
            changed, count=1, flags=re.IGNORECASE,
        )
    if not js_present:
        changed = re.sub(
            r"(</body>)",
            f"{JS_TAG}\n\\1",
            changed, count=1, flags=re.IGNORECASE,
        )

    if changed != html:
        p.write_text(changed, encoding="utf-8")
        print(f"  [OK]  {rel}")
        n_ok += 1
    else:
        print(f"  [WARN] {rel} : head/body introuvable")

print(f"\n=== Termine : {n_ok} injecte(s), {n_skip} deja OK ===")
