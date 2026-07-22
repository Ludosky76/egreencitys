"""
EGREENCITY'S — Creation automatique des 13 Payment Links Stripe
=================================================================
Cree les produits, prix et Payment Links dans votre compte Stripe,
puis met a jour assets/js/stripe-config.js avec les URLs generees.

USAGE
-----
    1. Copier votre CLE SECRETE Stripe dans _config/stripe.env :
         STRIPE_SECRET_KEY=sk_test_...

    2. Installer le SDK Stripe Python :
         pip install stripe

    3. Lancer le script :
         python _tools/create_stripe_payment_links.py

    4. Le script :
       - Cree 13 Products dans Stripe
       - Cree 13 Prices (un par Product)
       - Cree 13 Payment Links avec redirection vers votre boutique
       - Met a jour assets/js/stripe-config.js avec les URLs generees
       - Retourne un fichier .json de sauvegarde

SECURITE
--------
    - La cle secrete reste DANS votre fichier _config/stripe.env
    - Ce fichier est bloque par .gitignore (JAMAIS pousse sur Git)
    - La cle publique (deja dans stripe-config.js) est safe cote client
"""
from __future__ import annotations
import os
import sys
import json
import re
from pathlib import Path

try:
    import stripe
except ImportError:
    print("[ERREUR] SDK Stripe non installe. Lancez : pip install stripe")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "_config" / "stripe.env"
CATALOG_FILE = ROOT / "assets" / "js" / "catalog.js"
CONFIG_JS_FILE = ROOT / "assets" / "js" / "stripe-config.js"
OUTPUT_JSON = ROOT / "_config" / "stripe-payment-links-output.json"

# ============================================================
#  Config
# ============================================================
def load_secret_key() -> str:
    if not CONFIG_FILE.exists():
        print(f"[ERREUR] {CONFIG_FILE} introuvable.")
        print("Creez ce fichier avec :")
        print("  STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXX")
        sys.exit(1)

    for line in CONFIG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("STRIPE_SECRET_KEY="):
            k = line.split("=", 1)[1].strip().strip('"').strip("'")
            if not (k.startswith("sk_test_") or k.startswith("sk_live_")):
                print(f"[ERREUR] La cle ne commence pas par sk_test_ ou sk_live_")
                sys.exit(1)
            return k
    print("[ERREUR] STRIPE_SECRET_KEY manquante dans le fichier.")
    sys.exit(1)


# ============================================================
#  Catalogue produits (miroir de catalog.js)
# ============================================================
# FISCALITE GUYANE : PAS de TVA (art. 294 CGI).
# Le Payment Link Stripe facture le PRODUIT SEUL.
# La livraison Chronopost DOM (variable selon poids + commune) est devisee
# separement et payee via un 2e lien de paiement.
# L'octroi de mer est preleve par la douane a la livraison (hors facture).
COEF_MARGE = 1.35
ARRONDI = 10

def price_product(ht: float) -> int:
    """Prix produit seul (sans TVA, sans livraison)."""
    raw = ht * COEF_MARGE
    rounded = round(raw / ARRONDI) * ARRONDI
    return rounded - 1  # 999, 1049, 2349...

# Poids reels (kg) par produit — pour info devis Chronopost (miroir catalog.js)
WEIGHTS = {
    "wb-mur-7": 8, "wb-mur-22": 9, "wb-pied-7": 18, "wb-pied-22": 19,
    "sm7-mur-1": 15, "sm7-mur-2": 22, "sm7-pied-1": 30, "sm7-pied-2": 38,
    "sm22-mur-1": 15, "sm22-mur-2": 22, "sm22-pied-1": 30, "sm22-pied-2": 38,
    "prem-2x22": 60,
}

PRODUCTS = [
    # (product_id, name, ht_fournisseur, gamme, description)
    ("wb-mur-7",   "e-WallBox Résidentielle 7 kW",       715, "wallbox",  "1 point de charge - 7 kW AC monophasé - murale - lecteur RFID - fabrication France E-TOTEM. Livraison Chronopost DOM incluse."),
    ("wb-mur-22",  "e-WallBox Confort 22 kW",            845, "wallbox",  "1 point de charge - 22 kW AC triphasé - murale - lecteur RFID - fabrication France E-TOTEM. Livraison Chronopost DOM incluse."),
    ("wb-pied-7",  "e-WallBox sur Pied 7 kW",            911, "wallbox",  "1 point de charge - 7 kW AC - sur pied - lecteur RFID - fabrication France E-TOTEM. Livraison Chronopost DOM incluse."),
    ("wb-pied-22", "e-WallBox sur Pied 22 kW",          1041, "wallbox",  "1 point de charge - 22 kW AC - sur pied - lecteur RFID - fabrication France E-TOTEM. Livraison Chronopost DOM incluse."),
    ("sm7-mur-1",  "e-Smart 7 kW Murale 1 PDC",         1485, "smart7",   "1 point de charge - 7 kW AC - capot fonderie aluminium - MID - murale. Livraison Chronopost DOM incluse."),
    ("sm7-mur-2",  "e-Smart 7 kW Murale 2 PDC",         2560, "smart7",   "2 points de charge - 2x7 kW AC - capot fonderie aluminium - MID - murale + potence. Livraison Chronopost DOM incluse."),
    ("sm7-pied-1", "e-Smart 7 kW sur Pied 1 PDC",       1517, "smart7",   "1 point de charge - 7 kW AC - capot fonderie aluminium - MID - sur pied. Livraison Chronopost DOM incluse."),
    ("sm7-pied-2", "e-Smart 7 kW sur Pied 2 PDC",       2572, "smart7",   "2 points de charge - 2x7 kW AC - capot fonderie aluminium - MID - sur pied. Livraison Chronopost DOM incluse."),
    ("sm22-mur-1", "e-Smart 22 kW Murale 1 PDC",        1568, "smart22",  "1 point de charge - 22 kW AC triphasé - MID - murale. Livraison Chronopost DOM incluse."),
    ("sm22-mur-2", "e-Smart 22 kW Murale 2 PDC",        2727, "smart22",  "2 points de charge - 2x22 kW AC - MID - murale + potence. Livraison Chronopost DOM incluse."),
    ("sm22-pied-1","e-Smart 22 kW sur Pied 1 PDC",      1599, "smart22",  "1 point de charge - 22 kW AC triphasé - MID - sur pied. Livraison Chronopost DOM incluse."),
    ("sm22-pied-2","e-Smart 22 kW sur Pied 2 PDC",      2739, "smart22",  "2 points de charge - 2x22 kW AC - MID - sur pied. Livraison Chronopost DOM incluse."),
    ("prem-2x22",  "e-Premium AC 2x22 kW (ADVENIR)",    4948, "premium",  "2 points de charge - 2x22 kW AC - borne inox - parafoudre - modele voirie publique ADVENIR. Livraison Chronopost DOM incluse."),
]

SITE_URL = "https://egreencitys.com"
SUCCESS_URL = f"{SITE_URL}/pages/boutique-wallbox.html?paiement=succes"
CANCEL_URL  = f"{SITE_URL}/pages/boutique-wallbox.html?paiement=annule"


# ============================================================
#  Creation Products + Prices + Payment Links
# ============================================================
def create_all(dry_run: bool = False) -> dict:
    results = {}
    total = len(PRODUCTS)

    for i, (pid, name, ht, gamme, desc) in enumerate(PRODUCTS, 1):
        prod_price = price_product(ht)
        # Le Payment Link facture le PRODUIT SEUL (sans TVA, sans livraison).
        # La livraison Chronopost DOM est devisee separement selon poids + commune,
        # et payee via un 2e lien de paiement apres confirmation du devis.
        amount_cents = prod_price * 100  # Stripe utilise les centimes

        print(f"\n[{i}/{total}] {name}")
        print(f"    HT E-TOTEM : {ht} EUR  ->  Produit seul : {prod_price} EUR (sans TVA, hors livraison Chronopost)")

        if dry_run:
            print(f"    [DRY RUN] pas de creation reelle")
            continue

        try:
            # 1. Product
            product = stripe.Product.create(
                name=name,
                description=desc,
                metadata={
                    "egc_product_id": pid,
                    "coef_marge": str(COEF_MARGE),
                    "gamme": gamme,
                    "product_price": str(prod_price),
                    "poids_kg": str(WEIGHTS.get(pid, 15)),
                    "fiscalite": "Sans TVA (Guyane) - livraison Chronopost devisee separement - octroi de mer a la livraison",
                },
                images=[f"{SITE_URL}/assets/img/products/{pid_to_img(pid)}"]
            )
            print(f"    [OK] Product cree : {product.id}")

            # 2. Price
            price = stripe.Price.create(
                unit_amount=amount_cents,
                currency="eur",
                product=product.id,
                metadata={"egc_product_id": pid}
            )
            print(f"    [OK] Price cree   : {price.id}")

            # 3. Payment Link
            link = stripe.PaymentLink.create(
                line_items=[{"price": price.id, "quantity": 1}],
                after_completion={
                    "type": "redirect",
                    "redirect": {"url": SUCCESS_URL}
                },
                shipping_address_collection={
                    "allowed_countries": ["FR", "GF"]
                },
                phone_number_collection={"enabled": True},
                metadata={"egc_product_id": pid}
            )
            print(f"    [OK] Payment Link : {link.url}")

            results[pid] = {
                "product_id": product.id,
                "price_id": price.id,
                "payment_link_id": link.id,
                "payment_link_url": link.url,
                "ttc": ttc,
                "name": name
            }

        except stripe.error.StripeError as e:
            print(f"    [ERREUR] {e}")
            results[pid] = {"error": str(e)}

    return results


def pid_to_img(pid: str) -> str:
    """Mapping product_id -> nom d'image dans /assets/img/products/"""
    mapping = {
        "wb-mur-7":   "e-wallbox-murale.jpg",
        "wb-mur-22":  "e-wallbox-murale.jpg",
        "wb-pied-7":  "e-wallbox-pied.jpg",
        "wb-pied-22": "e-wallbox-pied.jpg",
        "sm7-mur-1":  "e-smart-7kw-murale-1p.jpg",
        "sm7-mur-2":  "e-smart-7kw-murale-2p.jpg",
        "sm7-pied-1": "e-smart-7kw-pied-1p.jpg",
        "sm7-pied-2": "e-smart-7kw-pied-2p.jpg",
        "sm22-mur-1": "e-smart-22kw-murale-1p.jpg",
        "sm22-mur-2": "e-smart-22kw-murale-2p.jpg",
        "sm22-pied-1":"e-smart-22kw-pied-1p.jpg",
        "sm22-pied-2":"e-smart-22kw-pied-2p.jpg",
        "prem-2x22":  "e-premium-ac.jpg",
    }
    return mapping.get(pid, "e-wallbox-murale.jpg")


# ============================================================
#  Mise a jour stripe-config.js
# ============================================================
def update_stripe_config_js(results: dict):
    if not CONFIG_JS_FILE.exists():
        print(f"[WARN] {CONFIG_JS_FILE} introuvable, saut de la mise a jour.")
        return

    content = CONFIG_JS_FILE.read_text(encoding="utf-8")

    for pid, info in results.items():
        if "payment_link_url" not in info:
            continue
        url = info["payment_link_url"]
        # Remplace la ligne '  pid': '',   ->   '  pid': 'https://buy.stripe.com/...',
        pattern = re.compile(
            r"('" + re.escape(pid) + r"'\s*:\s*)'[^']*'",
            re.MULTILINE
        )
        replacement = r"\1'" + url + r"'"
        content, n = pattern.subn(replacement, content)
        if n > 0:
            print(f"  [OK] stripe-config.js : {pid} -> {url[:50]}...")

    CONFIG_JS_FILE.write_text(content, encoding="utf-8")
    print(f"\n[OK] {CONFIG_JS_FILE} mis a jour.")


# ============================================================
#  Main
# ============================================================
def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Ne rien creer chez Stripe, juste afficher")
    ap.add_argument("--skip-config-update", action="store_true", help="Ne pas modifier stripe-config.js")
    args = ap.parse_args()

    print("=" * 60)
    print("  EGREENCITY'S — Creation Payment Links Stripe")
    print("=" * 60)

    if not args.dry_run:
        stripe.api_key = load_secret_key()
        print(f"[OK] Cle API chargee : {stripe.api_key[:12]}...")
        mode = "TEST" if stripe.api_key.startswith("sk_test_") else "LIVE (PRODUCTION)"
        print(f"[OK] Mode : {mode}")

        if mode == "LIVE (PRODUCTION)":
            resp = input("\n!!  ATTENTION : mode PRODUCTION - vraies transactions possibles.\n"
                         "Confirmer la creation ? (oui/non) : ")
            if resp.lower() not in ("oui", "o", "yes", "y"):
                print("Annule.")
                sys.exit(0)
    else:
        print("[DRY RUN] Aucun appel API reel — juste affichage")

    results = create_all(dry_run=args.dry_run)

    if not args.dry_run:
        # Sauvegarde JSON
        OUTPUT_JSON.parent.mkdir(exist_ok=True)
        OUTPUT_JSON.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"\n[OK] Sauvegarde : {OUTPUT_JSON}")

        if not args.skip_config_update:
            print("\n--- Mise a jour de assets/js/stripe-config.js ---")
            update_stripe_config_js(results)

    print("\n" + "=" * 60)
    ok = sum(1 for r in results.values() if "payment_link_url" in r)
    err = sum(1 for r in results.values() if "error" in r)
    print(f"  Termine : {ok}/{len(PRODUCTS)} OK, {err} erreur(s)")
    print("=" * 60)

    if ok > 0 and not args.dry_run:
        print("\nProchaines etapes :")
        print("  1. Verifier assets/js/stripe-config.js (URLs collees)")
        print("  2. git add assets/js/stripe-config.js")
        print("  3. git commit -m 'stripe: Payment Links generes'")
        print("  4. git push  ->  GitHub Pages deploie en 2 min")
        print("  5. Tester une commande sur egreencitys.com/pages/boutique-wallbox.html")


if __name__ == "__main__":
    main()
