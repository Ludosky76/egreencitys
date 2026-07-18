"""
Injecte le lien Boutique WallBox dans le nav de toutes les pages du site.
Idempotent : ne re-injecte pas si deja present.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

LINK_HTML = '<li><a href="/pages/boutique-wallbox.html" style="color:#33CC00;font-weight:700;">🛒 Boutique</a></li>'

# Pages a modifier (toutes celles avec un menu nav)
PAGES = [
    "pages/produits.html", "pages/reseau.html", "pages/investisseurs.html",
    "pages/economies.html", "pages/faq.html", "pages/blog.html", "pages/devis.html",
    "pages/communes/borne-recharge-cayenne.html",
    "pages/communes/borne-recharge-kourou.html",
    "pages/communes/borne-recharge-macouria.html",
    "pages/communes/borne-recharge-matoury.html",
    "pages/communes/borne-recharge-remire-montjoly.html",
    "pages/communes/borne-recharge-saint-laurent-du-maroni.html",
]

# Pattern : trouver la ligne "Produits" dans un <li> du nav et ajouter la Boutique juste apres
PATTERN = re.compile(
    r'(<li><a href="[^"]*produits\.html">Produits</a></li>)',
    re.IGNORECASE
)

print("=== Injection du lien Boutique WallBox ===\n")
n_ok = n_skip = 0
for rel in PAGES:
    p = ROOT / rel
    if not p.exists():
        print(f"  [SKIP] {rel} (introuvable)")
        continue

    html = p.read_text(encoding="utf-8")

    if "boutique-wallbox" in html:
        n_skip += 1
        continue

    new_html, n = PATTERN.subn(r'\1\n    ' + LINK_HTML, html, count=1)
    if n == 0:
        # Fallback : essayer d'injecter avant </ul> nav-links
        # (pages sans lien Produits explicite dans nav)
        pat2 = re.compile(r'(<ul class="nav-links">.*?)(</ul>)', re.DOTALL)
        new_html, n = pat2.subn(
            r'\1  ' + LINK_HTML + '\n  \\2', html, count=1
        )

    if n > 0 and new_html != html:
        p.write_text(new_html, encoding="utf-8")
        print(f"  [OK]   {rel}")
        n_ok += 1
    else:
        print(f"  [WARN] {rel} : nav pattern introuvable")

print(f"\n=== Termine : {n_ok} injecte(s), {n_skip} deja OK ===")
