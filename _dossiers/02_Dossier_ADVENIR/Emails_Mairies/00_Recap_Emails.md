# Récapitulatif des emails à envoyer aux mairies
## Programme ADVENIR EGREENCITY'S — 8 communes guyanaises

*Généré le 04/05/2026 — `_dossiers/02_Dossier_ADVENIR/Emails_Mairies/`*

---

## Tableau de suivi des envois

| ID | Commune | Destinataire | PDC | Apport | Priorité | Date envoi | Réponse |
|---|---|---|---:|---:|---|---|---|
| S01-S02-CAY | **Cayenne** | `mairie@ville-cayenne.fr` | 4 | 10 000 € | TRES HAUTE - Capitale guyanaise | __ / __ / 2026 | __ / __ |
| S03-MAT | **Matoury** | `mairie@matoury.fr` | 2 | 5 000 € | HAUTE - Banlieue de Cayenne | __ / __ / 2026 | __ / __ |
| S04-REM | **Rémire-Montjoly** | `mairie@remire-montjoly.fr` | 2 | 5 000 € | HAUTE - Fort potentiel VE | __ / __ / 2026 | __ / __ |
| S05-MAC | **Macouria-Tonate** | `mairie@macouria.fr` | 2 | 5 000 € | STRATEGIQUE - Site pilote operateur | __ / __ / 2026 | __ / __ |
| S06-KOU | **Kourou** | `mairie@ville-kourou.fr` | 2 | 5 000 € | HAUTE - 2e pole economique | __ / __ / 2026 | __ / __ |
| S07-S08-IRA | **Iracoubo** | `mairie-iracoubo@orange.fr` | 4 | 10 000 € | TRES HAUTE - Relais RN1 km 95 unique | __ / __ / 2026 | __ / __ |
| S09-SLM | **Saint-Laurent-du-Maroni** | `mairie@saintlaurentdumaroni.fr` | 2 | 5 000 € | HAUTE - 3e pole + desenclavement | __ / __ / 2026 | __ / __ |
| S10-MAN | **Mana** | `mairie@mana.fr` | 2 | 5 000 € | MOYENNE - Desserte Ouest | __ / __ / 2026 | __ / __ |

---

## Procédure d'envoi étape par étape

### Option A — Via Outlook / Gmail / messagerie classique (recommandé)

1. **Préparer les pièces jointes** (à joindre à TOUS les emails) :
   - `plaquette-egreencitys-2026.pdf` (à la racine du projet, 13 pages, ~2 Mo)
   - `_dossiers/02_Dossier_ADVENIR/01_Fiche_Projet_EGREENCITYS.pdf` (note de cadrage)

2. **Pour chaque mairie**, ouvrir le fichier `.html` correspondant dans un navigateur :
   - Ctrl+A pour tout sélectionner
   - Ctrl+C pour copier
   - Coller dans le corps du mail (Outlook / Gmail conservent la mise en forme)

3. **Renseigner** :
   - **À** : adresse email de la mairie (colonne « Destinataire » ci-dessus)
   - **Objet** : copier-coller la première ligne du fichier `.txt` correspondant
   - **Pièces jointes** : les 2 PDF préparés à l'étape 1

4. **Envoyer** et reporter la date dans le tableau ci-dessus.

### Option B — Via Claude dans Edge (plus simple si vous l'utilisez)

1. Ouvrir le fichier `.html` dans Edge
2. Demander à Claude (sidebar) : *« Envoie-moi le texte de cet email pour le copier dans Outlook »*
3. Claude fournira le texte propre
4. Coller dans Outlook + ajouter les pièces jointes

---

## Stratégie d'envoi recommandée (3 vagues sur 3 semaines)

### Vague 1 — Cette semaine (communes prioritaires)
1. **S05 Macouria-Tonate** — Site pilote opérateur (mairie locale, lien direct)
2. **S01-S02 Cayenne** — Capitale, effet d'entraînement maximal
3. **S07-S08 Iracoubo** — Position stratégique unique RN1

### Vague 2 — Semaine prochaine (communes alignées)
4. **S06 Kourou** — 2e pôle économique, image techno
5. **S09 Saint-Laurent-du-Maroni** — 3e pôle, désenclavement
6. **S04 Rémire-Montjoly** — Fort potentiel VE
7. **S03 Matoury** — Banlieue Cayenne

### Vague 3 — Dans 2-3 semaines (commune à convaincre)
8. **S10 Mana** — Mentionner les communes déjà engagées dans la suite du mail

---

## Modèle d'objet à copier-coller

Sujet recommandé (extrait de chaque .txt) :

```
[EGREENCITY'S - Projet ADVENIR Guyane] Bornes de recharge pour [COMMUNE] — Demande de rendez-vous
```

> Personnaliser `[COMMUNE]` avec le nom de la commune destinataire.
> Ce sujet est volontairement explicite (programme + objet + objectif) pour maximiser le taux d'ouverture.

---

## Calendrier de relance par email (si pas de réponse)

| Délai | Action |
|---|---|
| **J+10** | Email court de relance courtoise *(« Avez-vous bien reçu mon email ? »)* |
| **J+20** | Appel téléphonique au standard de la mairie pour proposer un RDV physique |
| **J+30** | Visite physique en mairie avec le dossier complet papier |
| **J+45** | Email à un adjoint au maire (urbanisme / mobilité / transition énergétique) |
| **J+60** | Si toujours pas de réponse : courrier LRAR officiel *(voir `Courriers_Mairies/`)* |

---

## Astuces conversion taux d'ouverture

- **Heure d'envoi** : mardi-jeudi entre 9h et 11h heure de Guyane (UTC-3, soit 13h-15h en France hexagonale)
- **Éviter** : lundi matin (boîte saturée), vendredi après 14h, week-ends
- **Adresse expéditeur** : `egreencitys@gmail.com` est OK mais `loic.ludosky@egreencitys.com`
  serait plus pro — créer un alias OVH si possible
- **Demander un AR de lecture** : décocher (peut être perçu comme intrusif)
- **Importance** : Normale (ne pas mettre Haute, sauf relance J+30)
- **Signature image** : ajouter le logo EGREENCITY'S en signature (drag-drop dans Outlook)

---

*Document préparé par EGREENCITY'S — À utiliser conjointement avec le dossier dans `Courriers_Mairies/` (version LRAR formelle pour les relances tardives).*