"""
EGREENCITY'S — Gestion des commandes (data/commandes.json)
============================================================
CLI Python pour ajouter, modifier ou lister les commandes de la boutique.

USAGE
-----
    # Ajouter une nouvelle commande (a la reception paiement Stripe)
    python _tools/manage_orders.py add \\
        --customer "Jean MARTIN" \\
        --email jean.martin@example.gf \\
        --address "12 rue des Palmistes" \\
        --commune Cayenne \\
        --postal 97300 \\
        --product "e-WallBox Confort 22 kW" \\
        --amount 1239 \\
        --stripe pi_xxxxxxxxxxxxx

    # Changer le statut d'une commande existante
    python _tools/manage_orders.py status EGC-2026-0001 preparation
    python _tools/manage_orders.py status EGC-2026-0001 expediee --tracking XX123456789
    python _tools/manage_orders.py status EGC-2026-0001 livree

    # Lister toutes les commandes (dashboard mini-console)
    python _tools/manage_orders.py list
    python _tools/manage_orders.py list --status preparation

    # Voir le detail d'une commande
    python _tools/manage_orders.py show EGC-2026-0001

    # Auto-numerotation : les IDs sont EGC-<annee>-<seq> auto-incrementes.

STATUTS DISPONIBLES
-------------------
    payee         : Paiement recu (statut initial)
    preparation   : Commande transmise a E-TOTEM pour preparation
    expediee      : Colis expedie (avec numero Chronopost)
    en_livraison  : Colis en Guyane, livraison finale
    livree        : Colis livre au client

WORKFLOW TYPIQUE
----------------
    Jour J    : Client paie sur Stripe
                -> `add` cree la commande statut "payee"
                -> Email auto au client (voir GUIDE)
    Jour J+1  : `status EGC-XXXX preparation`
    Jour J+3  : Colis expedie
                -> `status EGC-XXXX expediee --tracking XX...`
                -> Email au client avec numero de suivi Chronopost
    Jour J+5  : `status EGC-XXXX en_livraison`
    Jour J+8  : `status EGC-XXXX livree`
                -> Email de confirmation livraison + demande d'avis

Apres chaque modification :
    git add data/commandes.json
    git commit -m "commandes: mise a jour EGC-XXXX -> statut X"
    git push
"""
from __future__ import annotations
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "commandes.json"

STATUSES = ["payee", "preparation", "expediee", "en_livraison", "livree"]
STATUS_LABELS = {
    "payee":        "Paiement recu",
    "preparation":  "En preparation",
    "expediee":     "Expediee",
    "en_livraison": "En livraison",
    "livree":       "Livree",
}


def load_db() -> dict:
    if not DATA_FILE.exists():
        return {
            "_comment": "Base de donnees des commandes EGREENCITY'S",
            "_version": "1.0",
            "orders": {}
        }
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_db(db: dict):
    db["_last_updated"] = datetime.now().strftime("%Y-%m-%d")
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(db, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


def next_order_number(db: dict) -> str:
    """Genere le prochain n de commande : EGC-<annee>-<seq>"""
    year = datetime.now().year
    prefix = f"EGC-{year}-"
    max_seq = 0
    for oid in db.get("orders", {}).keys():
        if oid.startswith(prefix):
            try:
                seq = int(oid[len(prefix):])
                max_seq = max(max_seq, seq)
            except ValueError:
                pass
    return f"{prefix}{max_seq + 1:04d}"


# ============================================================
#  ADD
# ============================================================
def cmd_add(args):
    db = load_db()
    number = args.number or next_order_number(db)

    if number in db.get("orders", {}):
        print(f"[ERREUR] Commande {number} existe deja. Utilisez `status` pour modifier.")
        return 1

    now_iso = datetime.now().isoformat(timespec="seconds")
    shipping = args.shipping if args.shipping is not None else 0.0
    # amount = total facture (produits + livraison). Si non fourni, calcule.
    order = {
        "date": now_iso,
        "customer": args.customer,
        "email": args.email or "",
        "phone": args.phone or "",
        "address": args.address or "",
        "postal_code": args.postal or "",
        "commune": args.commune or "",
        "product": args.product,
        "amount": args.amount,
        "shipping": shipping,
        "status": "payee",
        "stripe_payment_intent": args.stripe or "",
        "timeline": {"payee": now_iso},
        "items": []
    }
    if args.item:
        for it in args.item:
            parts = it.split("|")
            if len(parts) >= 2:
                order["items"].append({
                    "name": parts[0].strip(),
                    "qty":  int(parts[1]) if len(parts) > 1 else 1,
                    "priceTTC": float(parts[2]) if len(parts) > 2 else args.amount
                })

    db.setdefault("orders", {})[number] = order
    save_db(db)
    print(f"\n[OK] Commande {number} creee")
    print(f"     Client   : {args.customer}")
    print(f"     Montant  : {args.amount} EUR TTC")
    print(f"     Statut   : payee")
    print(f"\nLiens client :")
    print(f"     Suivi   : https://egreencitys.com/pages/suivi.html?commande={number}")
    print(f"     Facture : https://egreencitys.com/pages/facture.html?commande={number}")
    print(f"\nProchaines etapes :")
    print(f"     git add data/commandes.json")
    print(f"     git commit -m 'commande {number} creee'")
    print(f"     git push")
    return 0


# ============================================================
#  STATUS
# ============================================================
def cmd_status(args):
    db = load_db()
    number = args.number.upper()

    if number not in db.get("orders", {}):
        print(f"[ERREUR] Commande {number} introuvable.")
        return 1

    if args.new_status not in STATUSES:
        print(f"[ERREUR] Statut invalide : {args.new_status}")
        print(f"        Statuts valides : {', '.join(STATUSES)}")
        return 1

    order = db["orders"][number]
    old_status = order.get("status", "?")
    now_iso = datetime.now().isoformat(timespec="seconds")

    order["status"] = args.new_status
    order.setdefault("timeline", {})[args.new_status] = now_iso

    if args.tracking:
        order.setdefault("chronopost", {})
        order["chronopost"]["tracking"] = args.tracking
        order["chronopost"]["ship_date"] = now_iso

    save_db(db)
    print(f"[OK] {number} : {old_status} -> {args.new_status}")
    if args.tracking:
        print(f"     Chronopost : {args.tracking}")
        print(f"     URL suivi  : https://www.chronopost.fr/tracking-no?listeNumerosLT={args.tracking}")
    print(f"\nProchaines etapes :")
    print(f"     git add data/commandes.json")
    print(f"     git commit -m 'commande {number} -> {args.new_status}'")
    print(f"     git push")
    return 0


# ============================================================
#  LIST
# ============================================================
def cmd_list(args):
    db = load_db()
    orders = db.get("orders", {})
    if not orders:
        print("Aucune commande enregistree.")
        return 0

    filtered = orders.items()
    if args.status:
        filtered = [(n, o) for n, o in filtered if o.get("status") == args.status]

    if not filtered:
        print(f"Aucune commande avec statut '{args.status}'.")
        return 0

    print(f"\n{'N COMMANDE':<20} {'DATE':<12} {'CLIENT':<25} {'STATUT':<15} {'MONTANT':>12}")
    print("-" * 90)
    total = 0
    for number, o in sorted(filtered, key=lambda x: x[1].get("date", ""), reverse=True):
        date = o.get("date", "")[:10]
        client = (o.get("customer") or "")[:24]
        status = STATUS_LABELS.get(o.get("status", ""), o.get("status", ""))
        amt = o.get("amount", 0)
        total += amt
        print(f"{number:<20} {date:<12} {client:<25} {status:<15} {amt:>10.0f} EUR")
    print("-" * 90)
    print(f"{'TOTAL':<74} {total:>10.0f} EUR ({len(list(filtered)) if not args.status else len(filtered)} commandes)")
    return 0


# ============================================================
#  SHOW
# ============================================================
def cmd_show(args):
    db = load_db()
    number = args.number.upper()
    if number not in db.get("orders", {}):
        print(f"[ERREUR] Commande {number} introuvable.")
        return 1

    o = db["orders"][number]
    print(f"\n=== Commande {number} ===\n")
    print(json.dumps(o, indent=2, ensure_ascii=False))

    print(f"\nLiens client :")
    print(f"  Suivi   : https://egreencitys.com/pages/suivi.html?commande={number}")
    print(f"  Facture : https://egreencitys.com/pages/facture.html?commande={number}")

    if o.get("chronopost", {}).get("tracking"):
        print(f"  Chronopost : https://www.chronopost.fr/tracking-no?listeNumerosLT={o['chronopost']['tracking']}")

    return 0


# ============================================================
#  MAIN
# ============================================================
def main():
    ap = argparse.ArgumentParser(description="Gestion des commandes EGREENCITY'S.")
    sp = ap.add_subparsers(dest="cmd", required=True)

    # add
    p = sp.add_parser("add", help="Ajouter une nouvelle commande")
    p.add_argument("--number", help="Forcer un numero (sinon auto)")
    p.add_argument("--customer", required=True, help="Nom Prenom du client")
    p.add_argument("--email")
    p.add_argument("--phone")
    p.add_argument("--address")
    p.add_argument("--postal")
    p.add_argument("--commune")
    p.add_argument("--product", required=True, help="Description du produit")
    p.add_argument("--amount", type=float, required=True, help="Montant total paye en EUR (produits + livraison, SANS TVA)")
    p.add_argument("--shipping", type=float, help="Frais de livraison Chronopost DOM inclus dans le montant")
    p.add_argument("--stripe", help="ID transaction Stripe (pi_...)")
    p.add_argument("--item", action="append", help="Format : 'nom|qty|prix' (repetable, prix sans TVA)")

    # status
    p = sp.add_parser("status", help="Changer le statut d'une commande")
    p.add_argument("number", help="Numero commande EGC-YYYY-NNNN")
    p.add_argument("new_status", help=f"Nouveau statut ({', '.join(STATUSES)})")
    p.add_argument("--tracking", help="N Chronopost (obligatoire si expediee)")

    # list
    p = sp.add_parser("list", help="Lister les commandes")
    p.add_argument("--status", help="Filtrer par statut")

    # show
    p = sp.add_parser("show", help="Voir le detail d'une commande")
    p.add_argument("number")

    args = ap.parse_args()

    if args.cmd == "add":     return cmd_add(args)
    if args.cmd == "status":  return cmd_status(args)
    if args.cmd == "list":    return cmd_list(args)
    if args.cmd == "show":    return cmd_show(args)


if __name__ == "__main__":
    sys.exit(main())
