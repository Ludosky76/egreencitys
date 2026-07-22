"""
Injecte customer-account.js + session-nav.js dans toutes les pages HTML.
Idempotent : ne re-injecte pas si deja present.
Ces scripts affichent l'etat de connexion (menu utilisateur) dans la nav
de chaque page et gardent la session active pendant la navigation.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CUST = '<script src="/assets/js/customer-account.js?v=1"></script>'
SESS = '<script src="/assets/js/session-nav.js?v=1" defer></script>'

PAGES = [
    "index.html",
    "pages/produits.html", "pages/reseau.html", "pages/investisseurs.html",
    "pages/economies.html", "pages/faq.html", "pages/blog.html", "pages/devis.html",
    "pages/compte.html", "pages/suivi.html", "pages/facture.html",
    "pages/legal/cgv.html", "pages/legal/mentions-legales.html",
    "pages/communes/borne-recharge-cayenne.html",
    "pages/communes/borne-recharge-kourou.html",
    "pages/communes/borne-recharge-macouria.html",
    "pages/communes/borne-recharge-matoury.html",
    "pages/communes/borne-recharge-remire-montjoly.html",
    "pages/communes/borne-recharge-saint-laurent-du-maroni.html",
]

print("=== Injection session-nav sur toutes les pages ===\n")
n_ok = n_skip = 0
for rel in PAGES:
    p = ROOT / rel
    if not p.exists():
        print(f"  [SKIP] {rel} (absent)")
        continue
    html = p.read_text(encoding="utf-8")

    has_cust = "customer-account.js" in html
    has_sess = "session-nav.js" in html
    if has_cust and has_sess:
        n_skip += 1
        continue

    inject = ""
    if not has_cust:
        inject += "  " + CUST + "\n"
    if not has_sess:
        inject += "  " + SESS + "\n"

    new = re.sub(r"(</body>)", inject + r"\1", html, count=1, flags=re.IGNORECASE)
    if new != html:
        p.write_text(new, encoding="utf-8")
        print(f"  [OK]  {rel}")
        n_ok += 1
    else:
        print(f"  [WARN] {rel} : </body> introuvable")

print(f"\n=== Termine : {n_ok} injecte(s), {n_skip} deja OK ===")
