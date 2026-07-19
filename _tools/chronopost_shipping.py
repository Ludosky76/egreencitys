"""
EGREENCITY'S — Module d'expedition Chronopost DOM
===================================================
Cree automatiquement une etiquette d'expedition Chronopost pour chaque
commande de la boutique WallBox.

USAGE
-----
    python _tools/chronopost_shipping.py --order EGC-2026-0001
    python _tools/chronopost_shipping.py --csv commandes.csv

CONFIGURATION
-------------
Renseigner les credentials Chronopost dans le fichier :
    _config/chronopost.env (non versionne, cf .gitignore)

Format .env (NE JAMAIS commiter ce fichier) :
    CHRONOPOST_ACCOUNT=XXXXXX
    CHRONOPOST_PASSWORD=XXXXXX
    CHRONOPOST_SUBACCOUNT=

Ces credentials sont fournis par Chronopost apres signature du contrat
DOM Grands Comptes (contact : cdd@chronopost.fr).

API DOC : https://www.chronopost.fr/tracking-doc/API-Chronopost.pdf
Endpoint : https://www.chronopost.fr/shipping-cxf/ShippingServiceWS

DEPENDANCES
-----------
    pip install requests zeep

STATUT
------
    [PROTOTYPE] — module pret a l'emploi une fois les credentials fournis.
    Le code utilise le SOAP officiel de Chronopost avec zeep.
"""
from __future__ import annotations
import os
import sys
import argparse
import base64
import json
import logging
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("chronopost")

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "_config" / "chronopost.env"
LABELS_DIR = ROOT / "_config" / "labels_chronopost"

# ============================================================
#  CONFIGURATION EXPÉDITEUR (EGREENCITY'S)
# ============================================================
EXPEDITEUR = {
    "civility": "M",
    "nom": "LUDOSKY",
    "prenom": "Loic",
    "raison_sociale": "EGREENCITY'S SAS",
    "adresse1": "1 rue Anangosi, Residence La Rougerie",
    "adresse2": "",
    "code_postal": "97355",
    "ville": "MACOURIA",
    "pays": "FR",  # Chronopost France pour DOM
    "telephone": "+33651141118",
    "email": "egreencitys@gmail.com",
}

# Code service Chronopost Guyane DOM
CHRONO_SERVICE = {
    "CHRONO_18_DOM": "16",           # Chrono 18 (48-72h ouvres)
    "CHRONO_ECO_DOM": "17",          # Chrono Eco (5-8 j ouvres, moins cher)
}
DEFAULT_SERVICE = "CHRONO_ECO_DOM"


# ============================================================
#  Modèle de commande
# ============================================================
@dataclass
class Recipient:
    civility: str = "M"
    nom: str = ""
    prenom: str = ""
    raison_sociale: str = ""
    adresse1: str = ""
    adresse2: str = ""
    code_postal: str = ""
    ville: str = ""
    pays: str = "FR"
    telephone: str = ""
    email: str = ""


@dataclass
class Package:
    weight_kg: float = 15.0    # Poids typique d'une WallBox
    length_cm: int = 60
    width_cm: int = 40
    height_cm: int = 25
    value_eur: float = 999.0


@dataclass
class ShippingOrder:
    order_id: str
    recipient: Recipient
    package: Package
    service: str = DEFAULT_SERVICE
    reference_client: str = ""
    consignee_ref: str = ""


# ============================================================
#  Config loader
# ============================================================
def load_config() -> dict:
    """Charge le fichier _config/chronopost.env"""
    cfg = {}
    if not CONFIG_FILE.exists():
        log.error(f"Fichier config introuvable : {CONFIG_FILE}")
        log.error("Creez _config/chronopost.env avec :")
        log.error("  CHRONOPOST_ACCOUNT=XXXXXX")
        log.error("  CHRONOPOST_PASSWORD=XXXXXX")
        log.error("  CHRONOPOST_SUBACCOUNT=XXX")
        sys.exit(1)

    for line in CONFIG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")

    for req in ("CHRONOPOST_ACCOUNT", "CHRONOPOST_PASSWORD"):
        if req not in cfg:
            log.error(f"Variable manquante dans config : {req}")
            sys.exit(1)
    return cfg


# ============================================================
#  Appel API Chronopost via SOAP (zeep)
# ============================================================
def create_shipment(order: ShippingOrder, cfg: dict) -> dict:
    """
    Cree une expedition et retourne { pdf_bytes, tracking_number, ... }
    """
    try:
        from zeep import Client
    except ImportError:
        log.error("zeep non installe. pip install zeep requests")
        sys.exit(1)

    WSDL_URL = "https://ws.chronopost.fr/shipping-cxf/ShippingServiceWS?wsdl"
    client = Client(WSDL_URL)

    # Construction du payload conforme au WSDL Chronopost
    header = {
        "accountNumber": cfg["CHRONOPOST_ACCOUNT"],
        "idEmit": "CHRFR",
        "identWebPro": "",
        "subAccount": cfg.get("CHRONOPOST_SUBACCOUNT", ""),
    }
    password = {"password": cfg["CHRONOPOST_PASSWORD"]}

    shipper = {
        "shipperAdress1": EXPEDITEUR["adresse1"],
        "shipperAdress2": EXPEDITEUR["adresse2"],
        "shipperCity": EXPEDITEUR["ville"],
        "shipperCivility": EXPEDITEUR["civility"],
        "shipperContactName": f"{EXPEDITEUR['prenom']} {EXPEDITEUR['nom']}",
        "shipperCountry": EXPEDITEUR["pays"],
        "shipperEmail": EXPEDITEUR["email"],
        "shipperMobilePhone": EXPEDITEUR["telephone"],
        "shipperName": EXPEDITEUR["raison_sociale"],
        "shipperPhone": EXPEDITEUR["telephone"],
        "shipperType": 2,  # 1 = particulier, 2 = entreprise
        "shipperZipCode": EXPEDITEUR["code_postal"],
    }

    customer = {**shipper}
    customer["customerName"] = EXPEDITEUR["raison_sociale"]

    recipient = {
        "recipientAdress1": order.recipient.adresse1,
        "recipientAdress2": order.recipient.adresse2,
        "recipientCity": order.recipient.ville,
        "recipientCivility": order.recipient.civility,
        "recipientContactName": f"{order.recipient.prenom} {order.recipient.nom}",
        "recipientCountry": order.recipient.pays,
        "recipientEmail": order.recipient.email,
        "recipientMobilePhone": order.recipient.telephone,
        "recipientName": order.recipient.raison_sociale or f"{order.recipient.prenom} {order.recipient.nom}",
        "recipientPhone": order.recipient.telephone,
        "recipientType": 1,
        "recipientZipCode": order.recipient.code_postal,
    }

    ref = {
        "customerSkybillNumber": order.order_id,
        "recipientRef": order.order_id,
        "shipperRef": order.reference_client or order.order_id,
    }

    skybill = {
        "bulkNumber": 1,
        "codCurrency": "EUR",
        "codValue": 0,
        "content1": f"Borne recharge WallBox - {order.order_id}",
        "customsCurrency": "EUR",
        "customsValue": order.package.value_eur,
        "evtCode": "DC",
        "insuredCurrency": "EUR",
        "insuredValue": order.package.value_eur,
        "objectType": "MAR",
        "portCurrency": "EUR",
        "portValue": 0,
        "productCode": CHRONO_SERVICE[order.service],
        "service": "0",  # domicile
        "shipDate": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "shipHour": datetime.now().hour,
        "weight": order.package.weight_kg,
        "weightUnit": "KGM",
        "height": order.package.height_cm,
        "length": order.package.length_cm,
        "width": order.package.width_cm,
        "as": "0",
    }

    skybill_params = {"mode": "PDF"}

    try:
        result = client.service.shippingV2(
            headerValue=header,
            shipperValue=shipper,
            customerValue=customer,
            recipientValue=recipient,
            refValue=ref,
            skybillValue=skybill,
            skybillParamsValue=skybill_params,
            password=password["password"],
        )
    except Exception as e:
        log.error(f"Erreur SOAP Chronopost : {e}")
        raise

    # Le retour contient l'etiquette PDF en base64 et le numero de suivi
    if hasattr(result, "errorCode") and result.errorCode != 0:
        raise RuntimeError(f"Chronopost erreur {result.errorCode} : {result.errorMessage}")

    return {
        "tracking_number": result.skybillNumber,
        "pdf_bytes": result.skybill,  # bytes ou base64 selon config
        "raw": result,
    }


# ============================================================
#  Enregistrement de l'etiquette PDF
# ============================================================
def save_label(shipment_result: dict, order_id: str) -> Path:
    LABELS_DIR.mkdir(parents=True, exist_ok=True)
    fname = f"label_{order_id}_{shipment_result['tracking_number']}.pdf"
    path = LABELS_DIR / fname
    data = shipment_result["pdf_bytes"]
    if isinstance(data, str):
        data = base64.b64decode(data)
    path.write_bytes(data)
    return path


# ============================================================
#  CLI
# ============================================================
def parse_args():
    ap = argparse.ArgumentParser(description="Cree une expedition Chronopost DOM.")
    ap.add_argument("--order", help="ID commande (ex: EGC-2026-0001)")
    ap.add_argument("--csv", help="CSV avec plusieurs commandes")
    ap.add_argument("--from-json", help="Fichier JSON avec les infos de la commande")
    ap.add_argument("--service", default=DEFAULT_SERVICE,
                    choices=list(CHRONO_SERVICE.keys()),
                    help="Service Chronopost (defaut: %(default)s)")
    ap.add_argument("--test", action="store_true", help="Mode test (pas d'appel API reel)")
    return ap.parse_args()


def demo_order(order_id: str) -> ShippingOrder:
    """Cree une commande de demo pour tester le format."""
    return ShippingOrder(
        order_id=order_id,
        recipient=Recipient(
            civility="M",
            nom="MARTIN",
            prenom="Jean",
            adresse1="12 rue des Palmistes",
            code_postal="97300",
            ville="CAYENNE",
            pays="FR",
            telephone="+594694123456",
            email="client@example.gf",
        ),
        package=Package(weight_kg=15.0, value_eur=1049.0),
    )


def main() -> int:
    args = parse_args()

    if args.test:
        log.info("=== MODE TEST — pas d'appel API reel ===")
        order = demo_order(args.order or "EGC-2026-TEST")
        log.info(f"Commande de demo :\n{json.dumps(asdict(order), indent=2, ensure_ascii=False)}")
        log.info("Pour lancer un vrai appel, retirer --test et configurer _config/chronopost.env")
        return 0

    cfg = load_config()

    if args.order:
        order = demo_order(args.order)  # a remplacer par une lecture DB / email
        log.info(f"Creation expedition {args.order} vers {order.recipient.ville}...")
        try:
            result = create_shipment(order, cfg)
            path = save_label(result, args.order)
            log.info(f"[OK] Etiquette generee : {path}")
            log.info(f"[OK] Numero de suivi Chronopost : {result['tracking_number']}")
        except Exception as e:
            log.error(f"Echec : {e}")
            return 1
        return 0

    log.error("Aucune commande specifiee. Utiliser --order XXX ou --csv fichier.csv")
    return 1


if __name__ == "__main__":
    sys.exit(main())
