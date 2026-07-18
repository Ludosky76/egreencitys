"""
Genere 8 emails de LANCEMENT OFFICIEL personnalises pour les mairies cibles
du dossier ADVENIR EGREENCITY'S.

Contexte :
- Faisant suite aux courriers / emails de proposition de partenariat
- Annonce le LANCEMENT OFFICIEL (post-Seed levee + ADVENIR confirme)
- Propose la signature de la convention domaine public + calendrier travaux
- Invite a un rendez-vous formel

Lit le fichier _data_mairies.json et produit les .txt + .html dans
_dossiers/02_Dossier_ADVENIR/Emails_Mairies/
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Courriers_Mairies" / "_data_mairies.json"
OUT_DIR = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Emails_Mairies"

with DATA_FILE.open(encoding="utf-8-sig") as f:
    data = json.load(f)

OP = data["operateur"]
PROJET = data["projet"]
TODAY = date.today().strftime("%d/%m/%Y")


# ============================================================
#  TEMPLATE TXT
# ============================================================
TXT_TEMPLATE = """À      : {email_mairie}
Cc     : (direction urbanisme, transition énergétique, services techniques)
De     : egreencitys@gmail.com
Sujet  : [EGREENCITY'S — Lancement officiel] Bornes de recharge ADVENIR à {commune} — Signature convention et calendrier de mise en service

----------------------------------------------------------------------

{civilite_maire},

Faisant suite à nos précédents échanges concernant le projet ADVENIR
EGREENCITY'S, j'ai le plaisir de vous annoncer le LANCEMENT OFFICIEL
de notre programme de déploiement de bornes de recharge pour véhicules
électriques en Guyane.

ÉTAPES SÉCURISÉES À CE JOUR
===========================

  - Levée de fonds Seed (300 000 €) bouclée — closing financier acté
  - Subvention ADVENIR confirmée à 75,2 % (37 200 € pour les 20 PDC du réseau)
  - Devis fournisseur E-TOTEM signé (DEV26000037 du 30/04/2026)
  - 10 bornes commandées (20 points de charge) — production lancée
  - Délai de livraison Guyane : 8 à 10 semaines après signature des conventions
  - Équipe technique IRVE Qualifelec en cours de recrutement

CE QUE NOUS VOUS PROPOSONS POUR {commune_upper}
{soulign_commune}

  - {nb_pdc} point{s_pdc} de charge sur {nb_stations} station{s_station} :
{liste_sites_txt}
  - Modèle E-TOTEM e-Premium AC 2x22 kW — fabrication française,
    peinture milieu humide tropicale, écran d'information, badge RFID
  - Logo de la commune sérigraphié sur la borne (visibilité)
  - Tarif préférentiel agents municipaux (-50 %) + 2 badges RFID gratuits
    pour les véhicules de service
  - Reporting trimestriel de fréquentation
  - Conformité AFIR 2024 garantie sans coût pour la commune

CALENDRIER PROPOSÉ
==================

  Semaine 1-2  | Signature de la convention d'occupation du domaine public
  Semaine 3-4  | Visite technique conjointe (services techniques + EGREENCITY'S)
  Semaine 5-8  | Travaux de génie civil et raccordement EDF SEI
  Semaine 9-12 | Livraison, installation et mise en service de la borne
  Semaine 13   | Inauguration officielle (date à convenir avec vous)

POURQUOI {commune_upper} ?
{soulign_pourquoi}

> {argument_specifique}

PROCHAINE ÉTAPE — RDV DE SIGNATURE
==================================

Pour formaliser notre partenariat, je vous propose un rendez-vous de
30 minutes en mairie ou en visioconférence afin de :

  1. Signer la convention d'occupation gratuite du domaine public
  2. Valider ensemble l'emplacement précis du ou des site{s_site}
  3. Présenter la fiche technique des bornes à vos services techniques
  4. Convenir de la date d'inauguration

Pourriez-vous nous indiquer 2 ou 3 créneaux possibles dans les 2 prochaines
semaines ? Notre équipe se tient prête à se déplacer en mairie de {commune}.

DOCUMENTS JOINTS
================

  - Convention d'occupation du domaine public (modèle pré-rempli)
  - Fiche technique borne E-TOTEM e-Premium AC 2x22 kW
  - Plan d'implantation pour {commune}
  - Plaquette commerciale EGREENCITY'S 2026

Je reste à votre entière disposition, ainsi que mon Directeur Général
{dg}, pour toute question ou complément d'information.

Vous remerciant par avance de l'attention que vous voudrez bien porter
à ce projet structurant pour la Guyane et pour {commune},

Cordialement,

{president}
Président — Fondateur
EGREENCITY'S SAS

----------------------------------------------------------------------
EGREENCITY'S — Bornes de recharge électrique en Guyane
{adresse_op}
{cp_op} {ville_op} — Guyane française
Tél : {tel_op} | Email : {email_op}
Web : {web_op}
SAS au capital de 250 EUR — RCS Cayenne {siren}
----------------------------------------------------------------------

Programme ADVENIR : https://advenir.mobi
Référence devis matériel : {devis_ref}
"""


# ============================================================
#  TEMPLATE HTML
# ============================================================
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EGREENCITY'S — Lancement officiel à {commune}</title>
<style>
  @page {{ size: A4; margin: 12mm 8mm 12mm 8mm; }}
  @media print {{
    body {{ background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .wrapper {{ box-shadow: none !important; margin: 0 auto !important; }}
  }}
  body {{ margin: 0; padding: 0; background: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif; color: #1a3a00; }}
  .wrapper {{ max-width: 720px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }}
  .header {{ background: linear-gradient(135deg, #0a4800 0%, #2e7d32 100%); padding: 36px 40px 28px; text-align: center; }}
  .header .badge {{ display: inline-block; background: #33CC00; color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 12px; }}
  .header h1 {{ color: #ffffff; font-size: 24px; margin: 0 0 6px; font-weight: 700; }}
  .header p {{ color: #a5d6a7; font-size: 13px; margin: 0; letter-spacing: 0.5px; }}
  .body {{ padding: 36px 44px; }}
  .greeting {{ font-size: 16px; color: #1a3a00; margin-bottom: 20px; }}
  .intro {{ font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 28px; }}
  .section-title {{ font-size: 13px; font-weight: 700; color: #0a4800; text-transform: uppercase; letter-spacing: 0.8px; margin: 28px 0 14px; border-left: 4px solid #33CC00; padding-left: 12px; }}
  .check-list {{ list-style: none; padding: 0; margin: 0 0 24px; }}
  .check-list li {{ padding: 6px 0; font-size: 14px; color: #444; line-height: 1.5; }}
  .check-list li::before {{ content: "✔ "; color: #33CC00; font-weight: 700; margin-right: 4px; }}
  .calendar {{ background: #f4fff0; border: 1px solid #c8e6c9; border-radius: 6px; padding: 16px 20px; margin: 0 0 24px; }}
  .calendar table {{ width: 100%; border-collapse: collapse; }}
  .calendar td {{ padding: 6px 8px; font-size: 13px; }}
  .calendar td:first-child {{ font-weight: 700; color: #0a4800; width: 30%; }}
  .calendar tr {{ border-bottom: 1px solid #c8e6c9; }}
  .calendar tr:last-child {{ border-bottom: none; }}
  .why-box {{ background: #fff9c4; border-left: 4px solid #f9a825; padding: 14px 20px; border-radius: 0 4px 4px 0; margin: 0 0 24px; }}
  .why-box .label {{ font-size: 11px; font-weight: 700; color: #5d4037; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
  .why-box .text {{ font-size: 14px; color: #5d4037; font-style: italic; line-height: 1.5; }}
  .sites-list {{ background: #e8f5e9; border-radius: 6px; padding: 14px 18px; margin: 0 0 16px; }}
  .sites-list ol {{ margin: 0; padding-left: 22px; }}
  .sites-list li {{ padding: 4px 0; font-size: 14px; color: #1a3a00; font-weight: 600; }}
  .next-steps {{ list-style: none; padding: 0; margin: 0 0 24px; counter-reset: numbered; }}
  .next-steps li {{ counter-increment: numbered; padding: 10px 0 10px 40px; font-size: 14px; color: #333; line-height: 1.5; position: relative; border-bottom: 1px solid #eef3e9; }}
  .next-steps li:last-child {{ border-bottom: none; }}
  .next-steps li::before {{ content: counter(numbered); position: absolute; left: 0; top: 8px; width: 28px; height: 28px; background: #0a4800; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; }}
  .cta-block {{ background: #0a4800; border-radius: 8px; padding: 26px 30px; text-align: center; margin: 32px 0; }}
  .cta-block p {{ color: #c8e6c9; font-size: 14px; margin: 0 0 18px; line-height: 1.5; }}
  .cta-btn {{ display: inline-block; background: #33CC00; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 6px; letter-spacing: 0.3px; }}
  .signature {{ font-size: 14px; color: #333; margin: 28px 0 0; line-height: 1.6; }}
  .signature strong {{ color: #0a4800; font-size: 15px; }}
  .footer {{ background: #263238; padding: 28px 44px; text-align: center; }}
  .footer p {{ color: #90a4ae; font-size: 12px; margin: 4px 0; line-height: 1.5; }}
  .footer a {{ color: #66bb6a; text-decoration: none; }}
</style>
</head>
<body>
<div class="wrapper">

  <div class="header">
    <span class="badge">▸ LANCEMENT OFFICIEL</span>
    <h1>Bornes de recharge ADVENIR à {commune}</h1>
    <p>EGREENCITY'S — Signature de convention et calendrier de mise en service</p>
  </div>

  <div class="body">

    <p class="greeting">{civilite_maire},</p>

    <p class="intro">
      Faisant suite à nos précédents échanges concernant le projet ADVENIR EGREENCITY'S,
      j'ai le plaisir de vous annoncer le <strong>lancement officiel</strong> de notre programme
      de déploiement de bornes de recharge pour véhicules électriques en Guyane.
    </p>

    <div class="section-title">Étapes sécurisées à ce jour</div>
    <ul class="check-list">
      <li><strong>Levée de fonds Seed (300 000 €) bouclée</strong> — closing financier acté</li>
      <li><strong>Subvention ADVENIR confirmée à 75,2 %</strong> (37 200 € pour les 20 PDC du réseau)</li>
      <li><strong>Devis fournisseur E-TOTEM signé</strong> (DEV26000037 du 30/04/2026)</li>
      <li><strong>10 bornes commandées</strong> (20 points de charge) — production lancée</li>
      <li>Délai de livraison Guyane : <strong>8 à 10 semaines</strong> après signature des conventions</li>
      <li>Équipe technique IRVE Qualifelec en cours de recrutement</li>
    </ul>

    <div class="section-title">Ce que nous vous proposons pour {commune}</div>

    <div class="sites-list">
      <strong style="color:#0a4800; font-size:13px;">{nb_pdc} point{s_pdc} de charge sur {nb_stations} station{s_station} :</strong>
      <ol>
{liste_sites_html}
      </ol>
    </div>

    <ul class="check-list">
      <li>Modèle <strong>E-TOTEM e-Premium AC 2x22 kW</strong> — fabrication française, peinture milieu humide tropicale</li>
      <li>Logo de la commune sérigraphié sur la borne (visibilité permanente)</li>
      <li>Tarif préférentiel agents municipaux (-50 %) + 2 badges RFID gratuits véhicules de service</li>
      <li>Reporting trimestriel de fréquentation et données énergétiques</li>
      <li>Conformité <strong>AFIR 2024</strong> garantie — sans coût pour la commune</li>
    </ul>

    <div class="why-box">
      <div class="label">Pourquoi {commune} ?</div>
      <div class="text">{argument_specifique}</div>
    </div>

    <div class="section-title">Calendrier proposé</div>
    <div class="calendar">
      <table>
        <tr><td>Semaine 1-2</td><td>Signature de la convention d'occupation du domaine public</td></tr>
        <tr><td>Semaine 3-4</td><td>Visite technique conjointe (services techniques + EGREENCITY'S)</td></tr>
        <tr><td>Semaine 5-8</td><td>Travaux de génie civil et raccordement EDF SEI</td></tr>
        <tr><td>Semaine 9-12</td><td>Livraison, installation et mise en service de la borne</td></tr>
        <tr><td>Semaine 13</td><td>Inauguration officielle (date à convenir avec vous)</td></tr>
      </table>
    </div>

    <div class="section-title">Prochaine étape — RDV de signature</div>
    <p style="font-size:14px; color:#333; line-height:1.6; margin-bottom:14px;">
      Pour formaliser notre partenariat, je vous propose un rendez-vous de 30 minutes
      en mairie ou en visioconférence afin de :
    </p>
    <ol class="next-steps">
      <li>Signer la convention d'occupation gratuite du domaine public</li>
      <li>Valider ensemble l'emplacement précis du ou des site{s_site}</li>
      <li>Présenter la fiche technique des bornes à vos services techniques</li>
      <li>Convenir de la date d'inauguration</li>
    </ol>

    <div class="cta-block">
      <p>Pourriez-vous nous indiquer <strong>2 ou 3 créneaux possibles</strong><br>
      dans les 2 prochaines semaines pour un rendez-vous en mairie ?</p>
      <a href="mailto:egreencitys@gmail.com?subject=RDV%20Signature%20Convention%20-%20{commune}" class="cta-btn">
        Proposer un créneau
      </a>
    </div>

    <p class="signature">
      Vous remerciant par avance de l'attention que vous voudrez bien porter
      à ce projet structurant pour la Guyane et pour {commune},<br><br>
      Cordialement,<br><br>
      <strong>{president}</strong><br>
      Président — Fondateur, EGREENCITY'S SAS<br>
      Tél : {tel_op} | {email_op}
    </p>

  </div>

  <div class="footer">
    <p><strong style="color:#90a4ae;">EGREENCITY'S</strong> — Bornes de recharge électrique en Guyane</p>
    <p>{adresse_op} — {cp_op} {ville_op} — Guyane française</p>
    <p>Tél : {tel_op} | <a href="mailto:{email_op}">{email_op}</a> | <a href="{web_op}">{web_op}</a></p>
    <p style="margin-top:8px; font-size:11px; color:#607d8b;">SAS au capital de 250 EUR — RCS Cayenne {siren}</p>
  </div>

</div>
</body>
</html>
"""


# ============================================================
def slugify(s):
    return s.lower().replace(" ", "-").replace("é", "e").replace("è", "e") \
            .replace("ê", "e").replace("à", "a").replace("'", "").replace("--", "-")


def build_sites_txt(sites):
    if not sites:
        return "      - (a definir avec la mairie)"
    return "\n".join(f"      {i+1}. {s}" for i, s in enumerate(sites))


def build_sites_html(sites):
    if not sites:
        return "        <li>(à définir avec la mairie)</li>"
    return "\n".join(f"        <li>{s}</li>" for s in sites)


print(f"=== Generation de {len(data['mairies'])} emails de lancement ===\n")

for m in data["mairies"]:
    nb_pdc = m["nb_pdc"]
    nb_stations = m["nb_stations"]
    s_pdc = "s" if nb_pdc > 1 else ""
    s_station = "s" if nb_stations > 1 else ""
    s_site = "s" if nb_stations > 1 else ""

    commune_upper = m["commune"].upper()
    soulign_commune = "=" * (len(commune_upper) + 36)
    soulign_pourquoi = "=" * (len(commune_upper) + 11)

    common = dict(
        commune=m["commune"],
        commune_upper=commune_upper,
        soulign_commune=soulign_commune,
        soulign_pourquoi=soulign_pourquoi,
        email_mairie=m["email_generique"],
        civilite_maire=m["civilite_maire"],
        nb_pdc=nb_pdc,
        nb_stations=nb_stations,
        s_pdc=s_pdc,
        s_station=s_station,
        s_site=s_site,
        argument_specifique=m["argument_specifique"],
        adresse_op=OP["adresse"],
        cp_op=OP["code_postal"],
        ville_op=OP["ville"],
        tel_op=OP["telephone"],
        email_op=OP["email"],
        web_op=OP["site_web"],
        siren=OP["siren"],
        president=OP["president"],
        dg=OP["directeur_general"],
        devis_ref=PROJET["devis_ref"],
    )

    # TXT version
    txt = TXT_TEMPLATE.format(
        liste_sites_txt=build_sites_txt(m["sites_proposes"]),
        **common
    )
    fname_txt = f"Email_Lancement_Mairie_{m['id']}_{slugify(m['commune'])}.txt"
    (OUT_DIR / fname_txt).write_text(txt, encoding="utf-8")

    # HTML version
    html = HTML_TEMPLATE.format(
        liste_sites_html=build_sites_html(m["sites_proposes"]),
        **common
    )
    fname_html = f"Email_Lancement_Mairie_{m['id']}_{slugify(m['commune'])}.html"
    (OUT_DIR / fname_html).write_text(html, encoding="utf-8")

    print(f"  [OK] {fname_txt}")
    print(f"  [OK] {fname_html}")

print(f"\n=== Termine : {len(data['mairies']) * 2} fichiers generes ===")
print(f"Dossier : {OUT_DIR}")
