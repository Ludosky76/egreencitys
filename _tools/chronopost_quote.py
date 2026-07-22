"""
EGREENCITY'S — Devis de livraison Chronopost DOM (Guyane)
==========================================================
Calcule le cout de livraison d'une borne vers une commune de Guyane,
AVANT la vente, pour le communiquer au client.

Deux modes :
  1. API Chronopost (tarif reel) — si _config/chronopost.env est configure
     avec les credentials Web Services (voir GUIDE_ACTIVATION_CHRONOPOST).
  2. Grille estimative DOM — fallback base sur les tarifs publics Chronopost
     DOM par tranche de poids (a ajuster selon votre contrat).

USAGE
-----
    # Devis pour un produit par son ID catalogue
    python _tools/chronopost_quote.py --product wb-mur-7 --commune Cayenne

    # Devis pour un poids libre
    python _tools/chronopost_quote.py --weight 30 --commune Kourou

    # Forcer le mode grille (sans appel API)
    python _tools/chronopost_quote.py --product prem-2x22 --commune Cayenne --grid

POIDS DES PRODUITS (miroir catalog.js)
--------------------------------------
    wb-mur-7:8  wb-mur-22:9  wb-pied-7:18  wb-pied-22:19
    sm7-mur-1:15  sm7-mur-2:22  sm7-pied-1:30  sm7-pied-2:38
    sm22-mur-1:15  sm22-mur-2:22  sm22-pied-1:30  sm22-pied-2:38
    prem-2x22:60

IMPORTANT
---------
    - Les colis > 30 kg depassent le format Chronopost standard : ils
      necessitent un transport palette (fret / DPD Palettes) devise a part.
    - La grille ci-dessous est INDICATIVE. Le tarif reel depend de votre
      contrat Chronopost DOM. Adaptez GRID_DOM apres reception de votre
      grille tarifaire signee.
"""
from __future__ import annotations
import sys
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "_config" / "chronopost.env"

# Poids reels (kg) par produit — miroir catalog.js
WEIGHTS = {
    "wb-mur-7": 8, "wb-mur-22": 9, "wb-pied-7": 18, "wb-pied-22": 19,
    "sm7-mur-1": 15, "sm7-mur-2": 22, "sm7-pied-1": 30, "sm7-pied-2": 38,
    "sm22-mur-1": 15, "sm22-mur-2": 22, "sm22-pied-1": 30, "sm22-pied-2": 38,
    "prem-2x22": 60,
}
PRODUCT_NAMES = {
    "wb-mur-7": "e-WallBox Murale 1x7 kW",
    "wb-mur-22": "e-WallBox Murale 1x22 kW",
    "wb-pied-7": "e-WallBox sur Pied 1x7 kW",
    "wb-pied-22": "e-WallBox sur Pied 1x22 kW",
    "sm7-mur-1": "e-Smart 7 kW Murale 1 PDC",
    "sm7-mur-2": "e-Smart 7 kW Murale 2 PDC",
    "sm7-pied-1": "e-Smart 7 kW sur Pied 1 PDC",
    "sm7-pied-2": "e-Smart 7 kW sur Pied 2 PDC",
    "sm22-mur-1": "e-Smart 22 kW Murale 1 PDC",
    "sm22-mur-2": "e-Smart 22 kW Murale 2 PDC",
    "sm22-pied-1": "e-Smart 22 kW sur Pied 1 PDC",
    "sm22-pied-2": "e-Smart 22 kW sur Pied 2 PDC",
    "prem-2x22": "e-Premium AC 2x22 kW",
}

# Communes de Guyane et code postal
COMMUNES = {
    "cayenne": "97300", "matoury": "97351", "remire-montjoly": "97354",
    "macouria": "97355", "kourou": "97310", "saint-laurent-du-maroni": "97320",
    "iracoubo": "97350", "mana": "97360", "sinnamary": "97315",
    "saint-georges": "97313", "maripasoula": "97370",
}

# ============================================================
#  GRILLE TARIFAIRE ESTIMATIVE Chronopost DOM (a ajuster !)
# ============================================================
# Tranches de poids (kg) -> prix TTC estime EUR pour la Guyane.
# Ces valeurs sont INDICATIVES et bien plus elevees que la metropole.
# A REMPLACER par votre grille contractuelle Chronopost DOM reelle.
GRID_DOM = [
    # (poids_max_kg, prix_eur)
    (1,   35),
    (2,   48),
    (5,   72),
    (10,  115),
    (15,  165),
    (20,  215),
    (25,  270),
    (30,  330),   # limite colis Chronopost standard
]
# Au-dela de 30 kg : transport palette / fret (devis specifique)
PALETTE_BASE = 380       # forfait de base palette Guyane
PALETTE_PAR_KG = 4.5     # + par kg au-dela de 30 kg

# Majoration communes eloignees (hors littoral central)
MAJORATION_ELOIGNEE = {
    "maripasoula": 1.6,   # acces fluvial/aerien
    "saint-georges": 1.3,
    "iracoubo": 1.15,
    "mana": 1.15,
    "sinnamary": 1.10,
}


def estimate_grid(weight: float, commune_slug: str) -> dict:
    """Estime le cout via la grille DOM."""
    if weight <= 30:
        prix = None
        for wmax, p in GRID_DOM:
            if weight <= wmax:
                prix = p
                break
        if prix is None:
            prix = GRID_DOM[-1][1]
        mode = "Chronopost DOM (colis)"
        palette = False
    else:
        prix = PALETTE_BASE + (weight - 30) * PALETTE_PAR_KG
        mode = "Transport palette / fret (devis a confirmer)"
        palette = True

    maj = MAJORATION_ELOIGNEE.get(commune_slug, 1.0)
    prix_final = round(prix * maj)

    return {
        "weight": weight,
        "commune": commune_slug,
        "prix_base": round(prix),
        "majoration": maj,
        "prix_final": prix_final,
        "mode": mode,
        "palette": palette,
        "source": "grille estimative (contrat Chronopost non configure)"
    }


def estimate_api(weight: float, commune_slug: str, cfg: dict) -> dict:
    """
    Interroge l'API tarifaire Chronopost (quickcost / TarifServiceWS).
    Retourne le tarif REEL selon votre contrat.
    Necessite zeep + credentials dans _config/chronopost.env.
    """
    try:
        from zeep import Client
    except ImportError:
        raise RuntimeError("zeep non installe (pip install zeep) — utilisez --grid")

    WSDL = "https://ws.chronopost.fr/quickcost-cxf/QuickcostServiceWS?wsdl"
    client = Client(WSDL)
    zip_code = COMMUNES.get(commune_slug, "97300")

    result = client.service.quickCost(
        accountNumber=cfg["CHRONOPOST_ACCOUNT"],
        password=cfg["CHRONOPOST_PASSWORD"],
        depCode="97355",         # depart : Macouria (ou metropole selon flux)
        depCountryCode="FR",
        arrCode=zip_code,
        arrCountryCode="FR",
        weight=weight,
        productCode="16",        # Chrono DOM
        type="M",
    )
    # Le retour contient reservedAmount / weightPrice selon le WSDL
    montant = getattr(result, "reservedAmount", None) or getattr(result, "amount", None)
    return {
        "weight": weight,
        "commune": commune_slug,
        "prix_final": round(float(montant)) if montant else None,
        "mode": "Chronopost DOM (API tarif reel)",
        "source": "API Chronopost QuickCost",
        "raw": str(result),
    }


def load_cfg() -> dict | None:
    if not CONFIG_FILE.exists():
        return None
    cfg = {}
    for line in CONFIG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            cfg[k.strip()] = v.strip()
    if cfg.get("CHRONOPOST_ACCOUNT") and cfg.get("CHRONOPOST_PASSWORD"):
        return cfg
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Devis livraison Chronopost DOM Guyane.")
    ap.add_argument("--product", help="ID produit catalogue (ex: wb-mur-7)")
    ap.add_argument("--weight", type=float, help="Poids en kg (si pas de --product)")
    ap.add_argument("--commune", required=True, help="Commune de livraison")
    ap.add_argument("--grid", action="store_true", help="Forcer la grille (pas d'appel API)")
    args = ap.parse_args()

    # Poids
    if args.product:
        if args.product not in WEIGHTS:
            print(f"[ERREUR] Produit inconnu : {args.product}")
            print(f"        Produits : {', '.join(WEIGHTS.keys())}")
            return 1
        weight = WEIGHTS[args.product]
        pname = PRODUCT_NAMES.get(args.product, args.product)
    elif args.weight:
        weight = args.weight
        pname = f"Colis {weight} kg"
    else:
        print("[ERREUR] Preciser --product ou --weight")
        return 1

    commune_slug = args.commune.lower().replace(" ", "-").replace("é", "e")
    if commune_slug not in COMMUNES:
        print(f"[WARN] Commune '{args.commune}' non listee, tarif littoral central applique.")

    # Devis
    cfg = None if args.grid else load_cfg()
    if cfg:
        try:
            res = estimate_api(weight, commune_slug, cfg)
        except Exception as e:
            print(f"[WARN] API Chronopost indisponible ({e}) — bascule sur grille.")
            res = estimate_grid(weight, commune_slug)
    else:
        res = estimate_grid(weight, commune_slug)

    # Affichage
    print("\n" + "=" * 56)
    print("  DEVIS LIVRAISON CHRONOPOST DOM — GUYANE")
    print("=" * 56)
    print(f"  Produit     : {pname}")
    print(f"  Poids       : {weight} kg")
    print(f"  Destination : {args.commune} ({COMMUNES.get(commune_slug, '???')})")
    print(f"  Mode        : {res['mode']}")
    if res.get("majoration", 1.0) != 1.0:
        print(f"  Majoration  : x{res['majoration']} (commune eloignee)")
    print("-" * 56)
    print(f"  COUT LIVRAISON ESTIME : {res['prix_final']} EUR")
    print("-" * 56)
    print(f"  Source : {res['source']}")
    if res.get("palette"):
        print(f"  [!] Colis > 30 kg : transport palette — confirmer avec le transporteur.")
    print("\n  A communiquer au client AVANT validation de la commande.")
    print("  Puis creer un 2e lien de paiement Stripe pour la livraison,")
    print("  ou l'inclure dans le devis global.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
