"""
Genere 8 courriers personnalises pour les mairies cibles du dossier ADVENIR.

Pour chaque mairie :
- Lettre proposant un PARTENARIAT avec CO-INVESTISSEMENT (5 000 EUR/station)
- Personnalisation : adresse, civilite maire, sites proposes, argument
  specifique de la commune, montant adapte au nombre de stations.

Lit le fichier _data_mairies.json et produit les .md + .pdf dans
_dossiers/02_Dossier_ADVENIR/Courriers_Mairies/
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Courriers_Mairies" / "_data_mairies.json"
OUT_DIR = ROOT / "_dossiers" / "02_Dossier_ADVENIR" / "Courriers_Mairies"

with DATA_FILE.open(encoding="utf-8") as f:
    data = json.load(f)

OP = data["operateur"]
PROJET = data["projet"]
INV = data["investissement_propose_par_station"]
TODAY = date.today().strftime("%d/%m/%Y")


# Liste a puces pour les contreparties
def bullets(items):
    return "\n".join(f"- {it}" for it in items)


# ============================================================
#  Template de courrier
# ============================================================
TEMPLATE = """# Courrier — Proposition de partenariat avec co-investissement
## {commune} — Programme ADVENIR EGREENCITY'S

---

**EGREENCITY'S**
SAS au capital de 250 € · RCS Cayenne {siren}
{adresse_op}
{cp_op} {ville_op} · Guyane française
{tel_op} · {email_op}
{web_op}

**{civilite_maire}**
Mairie de {commune}
{adresse_mairie}
{cp} {commune_destinataire}

{tel_mairie}
{email_mairie}

Macouria-Tonate, le {date_courrier}
LRAR n° __________________________

---

**Objet :** Proposition de partenariat — Co-investissement dans le réseau de bornes de recharge électrique
**Programme :** ADVENIR — Voirie publique — {commune} ({nb_stations} station{pluriel_s} / {nb_pdc} points de charge)

{civilite_maire},

J'ai l'honneur de vous proposer, au nom de la société **EGREENCITY'S** (SAS — SIREN {siren} — siège social à Macouria-Tonate), un **partenariat structurant** pour le déploiement de **{nb_pdc} points de charge** pour véhicules électriques sur le territoire de {commune}, dans le cadre du programme national **ADVENIR**.

Cette démarche s'inscrit dans un projet plus large de **réseau inter-communal** couvrant 8 communes du littoral guyanais ({nb_pdc_total} PDC au total, {nb_stations_total} stations), conforme aux exigences de la directive européenne **AFIR 2024** et explicitement aligné avec les recommandations **Avere-France** d'avril 2026 pour les territoires ultramarins.

## 1. Pourquoi {commune} est-elle une commune cible prioritaire ?

> **{argument_specifique}**

Nous avons identifié pour votre commune {nb_stations_str} stratégique{pluriel_s} :

{liste_sites}

Chaque station accueille **2 points de charge** (bornes **{modele_borne}**) délivrant **22 kW AC par PDC**, soit **44 kW** par station, ce qui permet de recharger un véhicule électrique de 20 % à 80 % en moins d'une heure.

## 2. Qu'est-ce qui change par rapport à une simple lettre d'intention ?

Notre première démarche, en mars dernier, consistait à solliciter votre **soutien de principe** afin de déposer notre dossier ADVENIR. Aujourd'hui, fort des avancées du projet (devis fournisseur 2026 confirmé E-TOTEM, alignement avec la note Avere outre-mer, taux de couverture ADVENIR exceptionnel de 75,2 %), nous vous proposons d'aller **un cran plus loin** : devenir **co-investisseur** du projet sur votre territoire.

## 3. La proposition de co-investissement

| Apport de la commune de {commune} | Montant |
|---|---:|
| Apport financier symbolique au projet | **{investissement_str} HT** *(soit {investissement_par_station} HT × {nb_stations} station{pluriel_s})* |
| Mise à disposition gratuite du domaine public *(convention d'occupation)* | en nature |
| Soutien institutionnel et communication conjointe | en nature |

**En contrepartie, EGREENCITY'S s'engage envers la commune de {commune} :**

{contreparties_bullets}

> **Important** : ce co-investissement n'est **pas exigé** pour la signature de la convention d'occupation. Il s'agit d'une **proposition** que nous formulons aux communes les plus engagées dans la transition énergétique, qui souhaitent s'inscrire durablement dans la gouvernance du projet et bénéficier de retours sur investissement à moyen terme.

## 4. Bénéfices attendus pour la commune de {commune}

- ✅ **Conformité AFIR 2024** : la directive européenne impose un point de recharge tous les 60 km sur les axes structurants. Notre projet permet à {commune} d'être en règle dès 2027.
- ✅ **Image moderne et engagée** dans la transition énergétique — sticker "Commune partenaire EGREENCITY'S" visible sur chaque borne.
- ✅ **Attractivité** renforcée pour les habitants, professionnels et touristes équipés de véhicules électriques.
- ✅ **Création d'emplois locaux** : EGREENCITY'S Elec recrutera des techniciens IRVE Qualifelec sur le territoire guyanais (taux de chômage 17,5 %).
- ✅ **Reporting trimestriel** transparent : nombre de sessions, énergie délivrée, recettes, retours utilisateurs sur votre commune spécifiquement.
- ✅ **Tarif préférentiel** pour les véhicules de service et les agents municipaux (économie estimée : 70 % sur le carburant).

## 5. Notre engagement chiffré

| Indicateur du projet global | Valeur |
|---|---:|
| Nombre total de stations | {nb_stations_total} |
| Nombre total de PDC | {nb_pdc_total} |
| Investissement total HT (bornes nues) | {investissement_total_str} |
| Aide ADVENIR sollicitée | {advenir_total_str} |
| Couverture ADVENIR | **{couverture_advenir} %** *(taux exceptionnel pour un projet voirie publique en outre-mer)* |
| Durée d'engagement opérateur | **{duree_engagement} ans** minimum |
| Modèle de borne | {modele_borne} |
| Devis fournisseur de référence | {devis_ref} |

## 6. Calendrier proposé

| Étape | Échéance |
|---|---|
| Réception de votre accord de principe | sous 3 semaines |
| Rendez-vous technique avec vos services | semaine suivante |
| Signature de la convention de partenariat | dans le mois suivant |
| Dépôt du dossier ADVENIR consolidé | T+1 mois |
| Notification ADVENIR + commande matériel | T+3 mois |
| **Mise en service de la première borne sur {commune}** | **T+5 à T+6 mois** |

## 7. Contact et suite

Je me tiens à votre entière disposition, ainsi que mon Directeur Général **{dg}**, pour vous présenter ce projet en réunion de bureau ou en commission technique :

- **Téléphone** : {tel_op}
- **Email** : {email_op}
- **Site web** : {web_op}
- **Plaquette commerciale** : https://egreencitys.com/plaquette-egreencitys-2026.pdf
- **Dossier ADVENIR complet** disponible sur demande (note de cadrage, mémoire technique, plan de financement, alignement Avere RUP)

Convaincu que ce partenariat servira l'intérêt de la commune de {commune} et participera au rayonnement de la Guyane comme territoire pionnier de la mobilité électrique en outre-mer, je reste à votre disposition pour tout échange.

Je vous prie d'agréer, {civilite_maire}, l'expression de mes salutations distinguées.

---

**{president}**
Président — Fondateur
EGREENCITY'S SAS

*(Signature manuscrite + cachet de l'entreprise)*

```
___________________________________
{president} — Président
EGREENCITY'S
```

---

**Pièces jointes :**
- Plaquette commerciale EGREENCITY'S 2026 (13 pages)
- Note de cadrage du projet ADVENIR (12 pages)
- Tableau des 20 PDC (Excel — détail des 10 stations)
- Modèle de convention d'occupation du domaine public *(à signer)*
- Modèle de convention de co-investissement *(à signer)*

---

> **Note pour l'envoi** : courrier à imprimer sur papier en-tête EGREENCITY'S, signer manuscritement, cacheter et envoyer en **lettre recommandée avec accusé de réception** à l'adresse de la mairie. Conserver l'avis de réception (pièce D1 du dossier ADVENIR).
"""


# ============================================================
#  Generation des 8 lettres
# ============================================================
def slugify(s):
    return s.lower().replace(" ", "-").replace("é", "e").replace("è", "e") \
            .replace("ê", "e").replace("à", "a").replace("'", "").replace("--", "-")


print(f"=== Generation de {len(data['mairies'])} courriers ===\n")

for m in data["mairies"]:
    nb_stations = m["nb_stations"]
    nb_pdc = m["nb_pdc"]
    pluriel_s = "s" if nb_stations > 1 else ""

    nb_stations_str = (
        "deux sites d'implantation" if nb_stations == 2
        else "un site d'implantation"
    )

    sites_lines = []
    for i, s in enumerate(m["sites_proposes"], 1):
        if nb_stations > 1:
            sites_lines.append(f"**{i}.** {s}")
        else:
            sites_lines.append(f"- {s}")
    liste_sites = "\n".join(sites_lines)

    contreparties_text = "\n".join(f"- {c}" for c in INV["contreparties"])

    inv_total = m["investissement_propose_ht"]
    inv_str = f"{inv_total:,} EUR".replace(",", " ")
    inv_par_station = INV["montant_ht"]
    inv_par_station_str = f"{inv_par_station:,} EUR".replace(",", " ")

    investissement_total_str = f"{PROJET['investissement_ht']:,} EUR".replace(",", " ")
    advenir_total_str = f"{PROJET['advenir_total']:,} EUR".replace(",", " ")

    text = TEMPLATE.format(
        # Operateur
        commune=m["commune"],
        commune_destinataire=m["commune"].upper(),
        siren=OP["siren"],
        adresse_op=OP["adresse"],
        cp_op=OP["code_postal"],
        ville_op=OP["ville"],
        tel_op=OP["telephone"],
        email_op=OP["email"],
        web_op=OP["site_web"],
        president=OP["president"],
        dg=OP["directeur_general"],
        # Mairie
        adresse_mairie=m["adresse_mairie"],
        cp=m["code_postal"],
        tel_mairie=m["telephone"],
        email_mairie=m["email_generique"],
        civilite_maire=m["civilite_maire"],
        # Stations
        nb_stations=nb_stations,
        nb_pdc=nb_pdc,
        nb_stations_str=nb_stations_str,
        pluriel_s=pluriel_s,
        liste_sites=liste_sites,
        argument_specifique=m["argument_specifique"],
        # Investissement
        investissement_str=inv_str,
        investissement_par_station=inv_par_station_str,
        contreparties_bullets=contreparties_text,
        # Projet global
        nb_stations_total=PROJET["nb_stations_total"],
        nb_pdc_total=PROJET["nb_pdc_total"],
        investissement_total_str=investissement_total_str,
        advenir_total_str=advenir_total_str,
        couverture_advenir=str(PROJET["couverture_advenir_pct"]).replace(".", ","),
        duree_engagement=PROJET["duree_engagement_ans"],
        modele_borne=PROJET["modele_borne"],
        devis_ref=PROJET["devis_ref"],
        # Date
        date_courrier=TODAY,
    )

    fname = f"Courrier_Mairie_{m['id']}_{slugify(m['commune'])}.md"
    out_path = OUT_DIR / fname
    out_path.write_text(text, encoding="utf-8")

    advenir_commune = nb_pdc * 1860
    print(f"  [OK] {fname}")
    print(f"        {nb_stations} station(s) | {nb_pdc} PDC | "
          f"Apport propose : {inv_str} | ADVENIR commune : {advenir_commune:,} EUR".replace(",", " "))

print(f"\n=== Termine : {len(data['mairies'])} courriers .md generes ===")
print(f"\nProchaine etape : python _tools/_md_to_pdf.py "
      f"_dossiers/02_Dossier_ADVENIR/Courriers_Mairies")
