# Guide — Activation de l'expédition Chronopost DOM automatique
## Boutique WallBox EGREENCITY'S

---

## Pourquoi Chronopost DOM ?

**Chronopost** est le transporteur historique du Groupe La Poste, spécialisé dans
l'express. Sa filiale **Chronopost DOM** couvre l'ensemble des Départements et
Régions d'Outre-Mer.

**Avantages** :
- ✅ Couverture 100 % de la Guyane (Cayenne, Kourou, Saint-Laurent, communes isolées)
- ✅ Délai garanti : **48-72 h** (Chrono 18 DOM) ou **5-8 j** (Chrono Éco DOM)
- ✅ Assurance jusqu'à 23 000 € par colis
- ✅ Suivi temps réel + notification SMS/email au destinataire
- ✅ API SOAP officielle (WSDL) permettant génération d'étiquettes en 100 % automatique
- ✅ Tarifs Grands Comptes négociables selon volume

---

## Étape 1 — Ouvrir un compte Grand Compte Chronopost DOM

### Prérequis
- SIRET (EGREENCITY'S : 87868285400019 — vérifier)
- KBIS de moins de 3 mois
- RIB pro
- Attestation d'assurance RC pro
- CGV publiées sur le site (déjà en place : `/pages/legal/cgv.html`)

### Contact
- **Téléphone** : 3634 (service marchand)
- **Email** : cdd@chronopost.fr (Chronopost Distribution DOM)
- **Formulaire en ligne** : https://www.chronopost.fr/fr/entreprise

### Documents à demander
1. **Contrat Chronopost DOM Petites Entreprises** (chiffre d'affaires prévisionnel < 500 k€/an)
   - Frais d'ouverture : **0 €**
   - Pas de minimum de volume
   - Grille tarifaire standard DOM
2. **Grille tarifaire** avec vos zones desservies
3. **Identifiants API Web Services** (nécessaire pour l'automatisation)

### Délai
- Signature contrat : **1-2 semaines**
- Activation API : **3-5 jours ouvrés** après signature

---

## Étape 2 — Récupérer les identifiants API

Une fois le compte activé, Chronopost fournit par email :

| Paramètre | Description |
|---|---|
| **Account Number** | Numéro de compte marchand (6 chiffres) |
| **Password** | Mot de passe API dédié (différent du mot de passe portail) |
| **Sub Account** | Sous-compte optionnel (si vous gérez plusieurs sites) |
| **URL WSDL** | Endpoint SOAP (par défaut : `https://ws.chronopost.fr/shipping-cxf/ShippingServiceWS?wsdl`) |

### Ouvrir un ticket API si absent
Si les identifiants ne vous sont pas transmis automatiquement :
- Email : `api-support@chronopost.fr`
- Objet : « Demande activation Web Services — compte [numéro] »

---

## Étape 3 — Configuration du module dans EGREENCITY'S

### 3.1 Créer le fichier de configuration

Créer le fichier **`_config/chronopost.env`** (à ne pas versionner sur GitHub) :

```env
# Config API Chronopost — EGREENCITY'S
CHRONOPOST_ACCOUNT=XXXXXX
CHRONOPOST_PASSWORD=XXXXXX
CHRONOPOST_SUBACCOUNT=
```

### 3.2 Ajouter au .gitignore

Vérifier que `.gitignore` contient :

```
_config/
*.env
```

### 3.3 Installer les dépendances Python

```bash
pip install zeep requests
```

Le module est déjà en place : `_tools/chronopost_shipping.py`

---

## Étape 4 — Workflow d'utilisation

### Option A — Manuel (recommandé pour démarrer)

Pour chaque nouvelle commande reçue par email FormSubmit :

```bash
python _tools/chronopost_shipping.py --order EGC-2026-0001
```

Le script :
1. Lit les infos de la commande (à adapter selon votre process)
2. Appelle l'API SOAP Chronopost
3. Génère l'étiquette PDF dans `_config/labels_chronopost/`
4. Retourne le **numéro de suivi** à envoyer au client

### Option B — Automatisé via webhook (futur)

Configurer FormSubmit pour envoyer un webhook vers un serveur, qui :
1. Reçoit la commande
2. Exécute `chronopost_shipping.py --from-json commande.json`
3. Renvoie automatiquement le tracking au client par email

Nécessite un backend (Cloudflare Workers, Vercel Function, VPS) — hors périmètre GitHub Pages.

### Option C — Tests avant production

```bash
python _tools/chronopost_shipping.py --order EGC-2026-TEST --test
```

Affiche la commande formatée sans appeler l'API — utile pour valider le format.

---

## Étape 5 — Envoi du numéro de suivi au client

Après génération de l'étiquette, envoyez un email au client avec :

```
Objet : Votre commande EGC-2026-0001 est expédiée

Bonjour [Prénom],

Votre commande [modèle borne] a été expédiée via Chronopost DOM.

Numéro de suivi : XXNNNNNNNNN
Suivi en ligne : https://www.chronopost.fr/tracking-no?listeNumerosLT=XXNNNNNNNNN

Livraison estimée : sous 5 à 8 jours ouvrés à votre adresse.

Bonne réception !
```

Cet email peut être automatisé (template dans votre CRM ou via un script Python).

---

## Tarifs indicatifs Chronopost DOM

**Chrono 18 DOM** (48-72 h) — pour Cayenne / Kourou :

| Poids | Prix HT | Prix TTC |
|---|---|---|
| 0-2 kg | ~25 € | ~27 € |
| 2-5 kg | ~35 € | ~38 € |
| 5-10 kg | ~55 € | ~60 € |
| 10-20 kg | ~85 € | ~92 € |
| 20-30 kg | ~120 € | ~130 € |

**Chrono Éco DOM** (5-8 j) — 25-40 % moins cher.

**Poids typique WallBox** :
- e-WallBox murale 1×7 kW : ~8 kg
- e-Smart 1×22 kW pied : ~35 kg (nécessite palette pour > 30 kg)
- e-Premium AC 2×22 kW : ~60 kg (palette obligatoire)

> Pour les colis > 30 kg, Chronopost recommande le service **Chronoship Express DOM**
> ou une prise en charge **DPD Palettes** en complément.

---

## Estimation des marges avec Chronopost intégré

Avec un coefficient de marge x1.35 sur le catalogue E-TOTEM et les frais Chronopost :

| Modèle | Prix TTC | Coût E-TOTEM | Chronopost | Marge nette |
|---|---|---|---|---|
| e-WallBox Murale 1×7 kW | 1 049 € | 715 € | 60 € | +274 € (26 %) |
| e-Smart 22 kW Pied 1 PDC | 2 349 € | 1 599 € | 120 € | +630 € (27 %) |
| e-Premium AC 2×22 kW | 7 249 € | 4 948 € | 200 € | +2 101 € (29 %) |

> Le coefficient peut être ajusté dans `assets/js/catalog.js` — ligne `COEF_MARGE`.

---

## Sécurité et RGPD

- Les identifiants API sont stockés **hors dépôt Git** (`_config/`)
- Les adresses clients sont chiffrées en transit (HTTPS + SOAP)
- Chronopost est certifié **ISO 27001** et **RGPD**
- Conservation des données clients : **5 ans** (obligations comptables)

---

## Support technique Chronopost

- **Hotline API** : 09 69 39 13 91 (lundi-vendredi 8h-19h)
- **Email dev** : api-support@chronopost.fr
- **Documentation API** : https://www.chronopost.fr/tracking-doc/API-Chronopost.pdf
- **WSDL** : https://ws.chronopost.fr/shipping-cxf/ShippingServiceWS?wsdl
- **Tracking public** : https://www.chronopost.fr/tracking-no?listeNumerosLT=[numero]

---

## Check-list de mise en production

- [ ] Contrat Chronopost DOM signé
- [ ] Identifiants API reçus (Account + Password)
- [ ] Fichier `_config/chronopost.env` créé et rempli
- [ ] `.gitignore` mis à jour (déjà fait)
- [ ] Python + `zeep` + `requests` installés
- [ ] Test avec `--test` OK
- [ ] Première étiquette générée en mode réel
- [ ] Numéro de suivi transmis au client
- [ ] Livraison vérifiée sur le site Chronopost

---

*Guide activation Chronopost DOM — EGREENCITY'S SAS — v1.0 (07/05/2026)*
