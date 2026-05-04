"""
Genere 8 emails personnalises pour les mairies cibles du dossier ADVENIR.

Pour chaque mairie : 2 fichiers
  - Email_Mairie_*.txt   : version texte brut a copier dans le client mail
  - Email_Mairie_*.html  : version HTML formatee a coller dans Outlook/Gmail

Plus :
  - 00_Recap_Emails.md / .pdf : tableau recapitulatif sujets + destinataires
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Courriers_Mairies" / "_data_mairies.json"
OUT_DIR = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Emails_Mairies"
OUT_DIR.mkdir(parents=True, exist_ok=True)

with DATA_FILE.open(encoding="utf-8") as f:
    data = json.load(f)

OP = data["operateur"]
PROJET = data["projet"]
INV = data["investissement_propose_par_station"]
TODAY = date.today().strftime("%d/%m/%Y")


# ============================================================
#  EMAIL — VERSION TEXTE BRUT (.txt)
# ============================================================
EMAIL_TXT = """SUJET : [EGREENCITY'S - Projet ADVENIR Guyane] Bornes de recharge pour {commune} — Demande de rendez-vous

Destinataire : {email_mairie}
Copie : (à compléter — direction urbanisme, transition énergétique, etc.)
De : egreencitys@gmail.com
Importance : Normale
Pièces jointes : Plaquette_EGREENCITYS_2026.pdf | Note_Cadrage_ADVENIR.pdf

----------------------------------------------------------------------

{civilite_maire},

Permettez-moi de vous présenter EGREENCITY'S, jeune entreprise guyanaise
basée à Macouria-Tonate, dont la mission est de doter la Guyane d'un
réseau structuré de bornes de recharge pour véhicules électriques.

Nous portons aujourd'hui un projet de **20 points de charge** répartis sur
**10 stations** dans **8 communes du littoral guyanais**, dans le cadre du
programme national **ADVENIR** (subvention de 37 200 EUR sollicitée auprès
d'AVERE-France, soit 75,2 % de couverture sur les bornes — taux exceptionnel
en outre-mer). La directive européenne AFIR 2024 impose désormais un point
de recharge tous les 60 km sur les axes structurants, et nous souhaitons
permettre à votre commune d'être en règle dès 2027 sans avoir à porter
seule cet investissement.

POURQUOI {commune_upper} ?

{argument_specifique}

Pour {commune}, nous proposons {nb_stations_str} :

{liste_sites_txt}

NOTRE PROPOSITION CONCRETE

Nous prenons en charge intégralement :
  - L'achat et l'installation des {nb_pdc} points de charge
    (bornes e-Premium AC 2x22 kW — fabrication française E-TOTEM)
  - Le raccordement EDF SEI BT
  - La supervision OCPP/GIREVE pendant 5 ans
  - La maintenance préventive 1 fois/an
  - L'application mobile et l'accueil utilisateur

La commune nous accorde uniquement :
  - Une convention d'occupation gratuite du domaine public
  - Un soutien institutionnel pour le dépôt ADVENIR

EN CONTREPARTIE, NOUS OFFRONS A {commune_upper} :
  - Le logo de la commune sérigraphié sur les bornes (visibilité)
  - Un tarif préférentiel pour les agents municipaux (-50 %)
  - 2 badges RFID gratuits pour les véhicules de service
  - Un reporting trimestriel de fréquentation
  - La conformité AFIR 2024 garantie sans coût pour la commune

OPTION CO-INVESTISSEMENT (FACULTATIVE)

Pour les communes qui souhaitent s'inscrire durablement dans la gouvernance
du projet, nous proposons un co-investissement symbolique de
{investissement_str} ({investissement_par_station_str} par station x {nb_stations})
qui ouvre droit à :
  - Un siège au comité de pilotage
  - Un accès prioritaire aux phases 2 et 3 du réseau
  - Une quote-part proportionnelle sur les recettes au-delà du seuil de
    rentabilité (à partir de l'an 4)

Cette option n'est en aucun cas exigée pour la signature de la convention
d'occupation.

LA SUITE

Pourrions-nous convenir d'un rendez-vous (en présentiel ou en visio) sous
3 semaines pour vous présenter le projet en détail ? Notre équipe peut se
rendre en mairie ou recevoir vos services techniques à Macouria.

Je joins à ce courriel :
  - La plaquette commerciale EGREENCITY'S 2026 (13 pages)
  - La note de cadrage du projet ADVENIR (12 pages)

Le dossier ADVENIR complet (mémoire technique, plan de financement,
alignement avec les recommandations Avere Outre-mer d'avril 2026, tableau
des 20 PDC) est disponible sur simple demande.

Je reste à votre entière disposition, ainsi que mon Directeur Général
Patrice Claude LUDOSKY, pour toute question ou complément d'information.

Vous remerciant par avance de l'attention que vous voudrez bien porter à
ce projet structurant pour la Guyane,

Cordialement,

Loïc Yvon LUDOSKY
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
Note Avere-France Outre-mer (avril 2026) : https://avere-france.org
Référence devis matériel : E-TOTEM DEV26000037 du 30/04/2026
"""


# ============================================================
#  EMAIL — VERSION HTML (.html) - prête à coller dans Outlook/Gmail
# ============================================================
EMAIL_HTML = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Projet ADVENIR EGREENCITY'S — {commune}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a3a00; max-width: 720px; margin: 0; padding: 20px; line-height: 1.55;">

<!-- En-tête EGREENCITY'S -->
<div style="border-top: 4px solid #33CC00; padding-top: 12px; margin-bottom: 20px;">
  <div style="font-size: 22px; font-weight: bold; color: #33CC00; letter-spacing: 0.5px;">EGREENCITY'S</div>
  <div style="font-size: 11px; color: #2B4DB5; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">Borne de recharge électrique · Guyane française</div>
</div>

<!-- Salutation -->
<p>{civilite_maire},</p>

<!-- Hook + intro -->
<p>Permettez-moi de vous présenter <strong>EGREENCITY'S</strong>, jeune entreprise guyanaise basée à Macouria-Tonate, dont la mission est de doter la Guyane d'un <strong>réseau structuré de bornes de recharge pour véhicules électriques</strong>.</p>

<p>Nous portons aujourd'hui un projet de <strong>20 points de charge répartis sur 10 stations dans 8 communes du littoral guyanais</strong>, dans le cadre du programme national <strong>ADVENIR</strong> (subvention de 37 200 € sollicitée auprès d'AVERE-France — taux de couverture exceptionnel de <strong>75,2 %</strong> en outre-mer). La directive européenne <strong>AFIR 2024</strong> impose désormais un point de recharge tous les 60 km sur les axes structurants, et nous souhaitons permettre à votre commune d'<strong>être en règle dès 2027 sans avoir à porter seule cet investissement</strong>.</p>

<!-- Pourquoi cette commune -->
<h3 style="color: #0a4800; border-left: 4px solid #33CC00; padding-left: 10px; margin-top: 22px;">Pourquoi {commune} ?</h3>
<p style="background: #f0f3fb; border-left: 3px solid #2B4DB5; padding: 10px 14px; margin: 10px 0; font-style: italic; color: #1a3a00;">{argument_specifique}</p>

<p>Pour {commune}, nous proposons {nb_stations_str} :</p>
<ul style="padding-left: 22px;">
{liste_sites_html}
</ul>

<!-- Notre proposition -->
<h3 style="color: #0a4800; border-left: 4px solid #33CC00; padding-left: 10px; margin-top: 22px;">Notre proposition concrète</h3>

<p><strong>Nous prenons en charge intégralement :</strong></p>
<ul style="padding-left: 22px;">
  <li>L'achat et l'installation des <strong>{nb_pdc} points de charge</strong> (bornes e-Premium AC 2×22 kW — fabrication française E-TOTEM, Aytré 17)</li>
  <li>Le raccordement EDF SEI BT</li>
  <li>La supervision OCPP/GIREVE pendant 5 ans</li>
  <li>La maintenance préventive (1 visite/an minimum)</li>
  <li>L'application mobile EGREENCITY'S et l'accueil utilisateur 24/7</li>
</ul>

<p><strong>La commune nous accorde uniquement :</strong></p>
<ul style="padding-left: 22px;">
  <li>Une convention d'occupation gratuite du domaine public</li>
  <li>Un soutien institutionnel pour le dépôt ADVENIR</li>
</ul>

<!-- Ce qu'on offre en retour -->
<h3 style="color: #0a4800; border-left: 4px solid #33CC00; padding-left: 10px; margin-top: 22px;">Ce que nous offrons à {commune} en retour</h3>
<ul style="padding-left: 22px;">
  <li>✅ <strong>Logo de la commune sérigraphié sur les bornes</strong> (visibilité touristique permanente)</li>
  <li>✅ <strong>Tarif préférentiel agents municipaux</strong> : −50 % via badge RFID dédié</li>
  <li>✅ <strong>2 badges RFID gratuits</strong> pour les véhicules de service</li>
  <li>✅ <strong>Reporting trimestriel</strong> de fréquentation et de consommation énergétique</li>
  <li>✅ <strong>Conformité AFIR 2024</strong> garantie sans coût pour la commune</li>
</ul>

<!-- Option co-investissement -->
<div style="background: #f4fff0; border: 1px solid #33CC00; border-radius: 6px; padding: 12px 16px; margin: 20px 0;">
<p style="margin: 0 0 8px 0;"><strong style="color: #0a4800;">Option co-investissement (facultative)</strong></p>
<p style="margin: 0 0 8px 0;">Pour les communes qui souhaitent s'inscrire durablement dans la gouvernance du projet, nous proposons un co-investissement symbolique de <strong>{investissement_str}</strong> ({investissement_par_station_str} par station × {nb_stations}) qui ouvre droit à :</p>
<ul style="margin: 0; padding-left: 22px;">
  <li>Un siège au <strong>comité de pilotage</strong> (1 réunion/trimestre)</li>
  <li>Un <strong>accès prioritaire aux phases 2 et 3</strong> du réseau</li>
  <li>Une <strong>quote-part proportionnelle</strong> sur les recettes au-delà du seuil de rentabilité (à partir de l'an 4)</li>
</ul>
<p style="margin: 8px 0 0 0; font-size: 12px; color: #555;"><em>Cette option n'est en aucun cas exigée pour la signature de la convention d'occupation.</em></p>
</div>

<!-- Indicateurs clés du projet -->
<h3 style="color: #0a4800; border-left: 4px solid #33CC00; padding-left: 10px; margin-top: 22px;">Le projet en quelques chiffres</h3>
<table style="border-collapse: collapse; width: 100%; font-size: 13px; margin: 10px 0;">
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0;"><strong>Nombre total de stations</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">10</td></tr>
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; background: #f4fff0;"><strong>Nombre total de PDC</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; background: #f4fff0;">20</td></tr>
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0;"><strong>Investissement HT (bornes nues)</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">49 480 €</td></tr>
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; background: #f4fff0;"><strong>Subvention ADVENIR sollicitée</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; background: #f4fff0;">37 200 €</td></tr>
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0;"><strong>Taux de couverture ADVENIR</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #33CC00; font-weight: bold;">75,2 %</td></tr>
  <tr><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; background: #f4fff0;"><strong>Engagement opérateur</strong></td><td style="padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; background: #f4fff0;">5 ans minimum</td></tr>
  <tr><td style="padding: 4px 8px;"><strong>Mise en service prévue</strong></td><td style="padding: 4px 8px; text-align: right;">T+5 à T+6 mois</td></tr>
</table>

<!-- Call to action -->
<h3 style="color: #0a4800; border-left: 4px solid #33CC00; padding-left: 10px; margin-top: 22px;">Pouvons-nous échanger ?</h3>
<p>Pourrions-nous convenir d'un <strong>rendez-vous (en présentiel ou en visio) sous 3 semaines</strong> pour vous présenter le projet en détail ? Notre équipe peut se rendre en mairie ou recevoir vos services techniques à Macouria-Tonate.</p>

<p style="background: #f4fff0; padding: 10px 14px; border-left: 3px solid #33CC00; border-radius: 3px;">
<strong>Le dossier ADVENIR complet</strong> (note de cadrage, mémoire technique, plan de financement, alignement avec les recommandations Avere Outre-mer d'avril 2026, tableau des 20 PDC) est disponible <strong>sur simple demande par retour de mail</strong>.
</p>

<!-- Pièces jointes -->
<p style="font-size: 13px; color: #555; margin-top: 16px;">
<strong>📎 Pièces jointes à ce courriel :</strong><br>
&nbsp;&nbsp;– Plaquette commerciale EGREENCITY'S 2026 (13 pages, ~2 Mo)<br>
&nbsp;&nbsp;– Note de cadrage du projet ADVENIR (12 pages)
</p>

<!-- Signature -->
<p>Vous remerciant par avance de l'attention que vous voudrez bien porter à ce projet structurant pour la Guyane,</p>

<p>Cordialement,</p>

<table style="border-collapse: collapse; margin-top: 20px;">
  <tr>
    <td style="padding-right: 16px; vertical-align: top;">
      <div style="font-size: 16px; font-weight: bold; color: #33CC00;">Loïc Yvon LUDOSKY</div>
      <div style="font-size: 12px; color: #2B4DB5;">Président — Fondateur</div>
      <div style="font-size: 12px; color: #555; margin-top: 8px;">EGREENCITY'S SAS</div>
      <div style="font-size: 11px; color: #777;">SAS au capital de 250 € — RCS Cayenne 878 682 854</div>
    </td>
  </tr>
</table>

<!-- Footer pro -->
<div style="border-top: 2px solid #33CC00; padding-top: 10px; margin-top: 24px; font-size: 11px; color: #555;">
  <strong>EGREENCITY'S</strong> — Bornes de recharge électrique en Guyane française<br>
  📍 1 rue Akangoue, Résidence La Rougerie · 97355 Macouria-Tonate<br>
  📞 +33 6 51 14 11 18 · ✉️ <a href="mailto:egreencitys@gmail.com" style="color: #0a4800;">egreencitys@gmail.com</a> · 🌐 <a href="https://egreencitys.com" style="color: #0a4800;">egreencitys.com</a><br>
  <br>
  <em>Programme ADVENIR : <a href="https://advenir.mobi" style="color: #0a4800;">advenir.mobi</a> · Référence devis : E-TOTEM DEV26000037 du 30/04/2026</em>
</div>

</body>
</html>
"""


# ============================================================
#  Generation
# ============================================================
def slugify(s):
    return s.lower().replace(" ", "-").replace("é", "e").replace("è", "e") \
            .replace("ê", "e").replace("à", "a").replace("'", "").replace("--", "-")


print(f"=== Generation de {len(data['mairies'])} emails (txt + html) ===\n")

recap_rows = []

for m in data["mairies"]:
    nb_stations = m["nb_stations"]
    nb_pdc = m["nb_pdc"]

    nb_stations_str = (
        "deux sites stratégiques" if nb_stations == 2
        else "un site stratégique"
    )

    # Listes sites en TXT et HTML
    sites_lines_txt = []
    sites_lines_html = []
    for i, s in enumerate(m["sites_proposes"], 1):
        if nb_stations > 1:
            sites_lines_txt.append(f"  {i}. {s}")
            sites_lines_html.append(f"  <li><strong>{s}</strong></li>")
        else:
            sites_lines_txt.append(f"  - {s}")
            sites_lines_html.append(f"  <li><strong>{s}</strong></li>")
    liste_sites_txt = "\n".join(sites_lines_txt)
    liste_sites_html = "\n".join(sites_lines_html)

    inv_total = m["investissement_propose_ht"]
    inv_str = f"{inv_total:,} €".replace(",", " ")
    inv_par_station = INV["montant_ht"]
    inv_par_station_str = f"{inv_par_station:,} €".replace(",", " ")

    # Variables communes
    common = dict(
        commune=m["commune"],
        commune_upper=m["commune"].upper(),
        siren=OP["siren"],
        adresse_op=OP["adresse"],
        cp_op=OP["code_postal"],
        ville_op=OP["ville"],
        tel_op=OP["telephone"],
        email_op=OP["email"],
        web_op=OP["site_web"],
        email_mairie=m["email_generique"],
        civilite_maire=m["civilite_maire"],
        nb_stations=nb_stations,
        nb_pdc=nb_pdc,
        nb_stations_str=nb_stations_str,
        liste_sites_txt=liste_sites_txt,
        liste_sites_html=liste_sites_html,
        argument_specifique=m["argument_specifique"],
        investissement_str=inv_str,
        investissement_par_station_str=inv_par_station_str,
    )

    # TXT
    txt_content = EMAIL_TXT.format(**common)
    # HTML
    html_content = EMAIL_HTML.format(**common)

    slug = slugify(m["commune"])
    fname_base = f"Email_Mairie_{m['id']}_{slug}"

    (OUT_DIR / f"{fname_base}.txt").write_text(txt_content, encoding="utf-8")
    (OUT_DIR / f"{fname_base}.html").write_text(html_content, encoding="utf-8")

    print(f"  [OK] {fname_base}.txt + .html")
    print(f"        Destinataire : {m['email_generique']}")

    recap_rows.append({
        "commune": m["commune"],
        "id": m["id"],
        "destinataire": m["email_generique"],
        "telephone": m["telephone"],
        "civilite": m["civilite_maire"],
        "nb_pdc": nb_pdc,
        "investissement": inv_str,
        "priorite": m["priorite"],
        "fichier_txt": f"{fname_base}.txt",
        "fichier_html": f"{fname_base}.html",
    })

# ============================================================
#  Recap centralise
# ============================================================
recap_lines = ["# Récapitulatif des emails à envoyer aux mairies",
               "## Programme ADVENIR EGREENCITY'S — 8 communes guyanaises",
               "",
               f"*Généré le {TODAY} — `_dossiers/02_Dossier_ADVENIR/Emails_Mairies/`*",
               "",
               "---",
               "",
               "## Tableau de suivi des envois",
               "",
               "| ID | Commune | Destinataire | PDC | Apport | Priorité | Date envoi | Réponse |",
               "|---|---|---|---:|---:|---|---|---|"]

for r in recap_rows:
    recap_lines.append(
        f"| {r['id']} | **{r['commune']}** | `{r['destinataire']}` | "
        f"{r['nb_pdc']} | {r['investissement']} | {r['priorite']} | __ / __ / 2026 | __ / __ |"
    )

recap_lines.extend([
    "",
    "---",
    "",
    "## Procédure d'envoi étape par étape",
    "",
    "### Option A — Via Outlook / Gmail / messagerie classique (recommandé)",
    "",
    "1. **Préparer les pièces jointes** (à joindre à TOUS les emails) :",
    "   - `plaquette-egreencitys-2026.pdf` (à la racine du projet, 13 pages, ~2 Mo)",
    "   - `_dossiers/02_Dossier_ADVENIR/01_Fiche_Projet_EGREENCITYS.pdf` (note de cadrage)",
    "",
    "2. **Pour chaque mairie**, ouvrir le fichier `.html` correspondant dans un navigateur :",
    "   - Ctrl+A pour tout sélectionner",
    "   - Ctrl+C pour copier",
    "   - Coller dans le corps du mail (Outlook / Gmail conservent la mise en forme)",
    "",
    "3. **Renseigner** :",
    "   - **À** : adresse email de la mairie (colonne « Destinataire » ci-dessus)",
    "   - **Objet** : copier-coller la première ligne du fichier `.txt` correspondant",
    "   - **Pièces jointes** : les 2 PDF préparés à l'étape 1",
    "",
    "4. **Envoyer** et reporter la date dans le tableau ci-dessus.",
    "",
    "### Option B — Via Claude dans Edge (plus simple si vous l'utilisez)",
    "",
    "1. Ouvrir le fichier `.html` dans Edge",
    "2. Demander à Claude (sidebar) : *« Envoie-moi le texte de cet email pour le copier dans Outlook »*",
    "3. Claude fournira le texte propre",
    "4. Coller dans Outlook + ajouter les pièces jointes",
    "",
    "---",
    "",
    "## Stratégie d'envoi recommandée (3 vagues sur 3 semaines)",
    "",
    "### Vague 1 — Cette semaine (communes prioritaires)",
    "1. **S05 Macouria-Tonate** — Site pilote opérateur (mairie locale, lien direct)",
    "2. **S01-S02 Cayenne** — Capitale, effet d'entraînement maximal",
    "3. **S07-S08 Iracoubo** — Position stratégique unique RN1",
    "",
    "### Vague 2 — Semaine prochaine (communes alignées)",
    "4. **S06 Kourou** — 2e pôle économique, image techno",
    "5. **S09 Saint-Laurent-du-Maroni** — 3e pôle, désenclavement",
    "6. **S04 Rémire-Montjoly** — Fort potentiel VE",
    "7. **S03 Matoury** — Banlieue Cayenne",
    "",
    "### Vague 3 — Dans 2-3 semaines (commune à convaincre)",
    "8. **S10 Mana** — Mentionner les communes déjà engagées dans la suite du mail",
    "",
    "---",
    "",
    "## Modèle d'objet à copier-coller",
    "",
    "Sujet recommandé (extrait de chaque .txt) :",
    "",
    "```",
    "[EGREENCITY'S - Projet ADVENIR Guyane] Bornes de recharge pour [COMMUNE] — Demande de rendez-vous",
    "```",
    "",
    "> Personnaliser `[COMMUNE]` avec le nom de la commune destinataire.",
    "> Ce sujet est volontairement explicite (programme + objet + objectif) pour maximiser le taux d'ouverture.",
    "",
    "---",
    "",
    "## Calendrier de relance par email (si pas de réponse)",
    "",
    "| Délai | Action |",
    "|---|---|",
    "| **J+10** | Email court de relance courtoise *(« Avez-vous bien reçu mon email ? »)* |",
    "| **J+20** | Appel téléphonique au standard de la mairie pour proposer un RDV physique |",
    "| **J+30** | Visite physique en mairie avec le dossier complet papier |",
    "| **J+45** | Email à un adjoint au maire (urbanisme / mobilité / transition énergétique) |",
    "| **J+60** | Si toujours pas de réponse : courrier LRAR officiel *(voir `Courriers_Mairies/`)* |",
    "",
    "---",
    "",
    "## Astuces conversion taux d'ouverture",
    "",
    "- **Heure d'envoi** : mardi-jeudi entre 9h et 11h heure de Guyane (UTC-3, soit 13h-15h en France hexagonale)",
    "- **Éviter** : lundi matin (boîte saturée), vendredi après 14h, week-ends",
    "- **Adresse expéditeur** : `egreencitys@gmail.com` est OK mais `loic.ludosky@egreencitys.com`",
    "  serait plus pro — créer un alias OVH si possible",
    "- **Demander un AR de lecture** : décocher (peut être perçu comme intrusif)",
    "- **Importance** : Normale (ne pas mettre Haute, sauf relance J+30)",
    "- **Signature image** : ajouter le logo EGREENCITY'S en signature (drag-drop dans Outlook)",
    "",
    "---",
    "",
    "*Document préparé par EGREENCITY'S — À utiliser conjointement avec le dossier dans `Courriers_Mairies/` (version LRAR formelle pour les relances tardives).*",
])

(OUT_DIR / "00_Recap_Emails.md").write_text("\n".join(recap_lines), encoding="utf-8")

print(f"\n=== Termine : {len(recap_rows)} emails generes (txt + html) + 1 recap ===")
print(f"\nFichiers dans : {OUT_DIR}")
print("\nProchaine etape :")
print('  python _tools/_md_to_pdf.py _dossiers/02_Dossier_ADVENIR/Emails_Mairies/00_Recap_Emails.md')
