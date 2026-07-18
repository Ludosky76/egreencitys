# Guide — Activation du paiement en 3× / 4× sans frais via Alma
## Boutique WallBox EGREENCITY'S

---

## Pourquoi Alma ?

**Alma** (alma.eu) est le leader français du paiement fractionné B2C.
Avantages :

- ✅ **100 % en ligne**, sans dossier papier, réponse en 30 secondes
- ✅ **Disponible en Guyane** et tous les DOM
- ✅ **Sans frais pour le client** — les frais sont côté marchand (2-4 %)
- ✅ **Paiement garanti** — Alma verse l'intégralité du montant sous 1-3 jours,
  puis se rembourse auprès du client (aucun risque d'impayé)
- ✅ Intégration **widget JS** simple sur site statique (pas besoin de backend)
- ✅ Certifié PCI-DSS, conforme RGPD

**Alternatives** :
- **Cofidis Pay** (3xCB / 4xCB) — similaire mais moins de widgets ready
- **PayPal 4x** — frais un peu inférieurs mais moins bien perçu
- **Klarna** — non recommandé (surtout US, mauvaise UX en FR)

---

## Étapes d'activation (30 minutes)

### 1. Créer le compte Alma marchand

1. Aller sur https://alma.eu/marchands
2. Cliquer sur **« Créer un compte marchand »**
3. Remplir le formulaire :
   - Raison sociale : **EGREENCITY'S SAS**
   - SIREN : **878 682 854**
   - RCS : **Cayenne**
   - Adresse : 1 rue Anangosi, Résidence La Rougerie — 97355 MACOURIA
   - Représentant légal : **Loïc Yves LUDOSKY**, Président
   - Email : egreencitys@gmail.com
   - Téléphone : +33 6 51 14 11 18
   - Secteur : Équipement / high-tech
   - CA prévisionnel An 1 : ~30 000 € (à ajuster)
   - Ticket moyen : ~1 500 € (moyenne des 3 WallBox)

### 2. Justificatifs à fournir

Alma demande sous 24-48h :

- **KBIS** de moins de 3 mois (téléchargeable sur infogreffe.fr)
- **RIB pro** au nom d'EGREENCITY'S SAS
- **Pièce d'identité** du représentant légal (Loïc Yves LUDOSKY)
- **Statuts** de la société
- **Attestation URSSAF** (à jour)
- **CGV de la boutique** (celles de egreencitys.com — pages/legal/cgv.html)

Délai d'activation : **3 à 7 jours ouvrés** après réception complète.

### 3. Récupérer votre clé publique API

Une fois validé :

1. Se connecter sur https://dashboard.getalma.eu
2. Menu **Paramètres** → **API**
3. Copier votre clé publique **PRODUCTION** (commence par `live_A...`)
4. (Optionnel) Copier également votre clé de **TEST** (commence par `test_A...`)
   pour vos essais avant mise en production

### 4. Configurer le widget dans le site

Ouvrir le fichier : `assets/js/alma-widget.js`

Modifier les 2 lignes suivantes :

```javascript
var ALMA_MERCHANT_ID = 'live_AXXXXXXXXXXXXXXXXXXXXXX';  // votre clé
var ALMA_MODE = 'production';  // ou 'test' pour tests
```

Puis dans `pages/boutique-wallbox.html`, ajouter juste avant `</body>` :

```html
<script src="/assets/js/alma-widget.js?v=1" defer></script>
```

Commit et push, GitHub Pages déploie sous 2 minutes.

### 5. Tester

En mode `test` :
- Utilisez la carte de test Alma : `4242 4242 4242 4242`, CVV `123`, date future
- Une commande de test doit s'afficher dans votre dashboard Alma

En mode `production` :
- Faire une commande réelle de 200 € (montant minimum) et rembourser depuis
  le dashboard Alma après vérification

---

## Ce que le client verra

Après activation, sur chaque carte produit apparaîtra automatiquement :

```
[Prix : 1 990 €]
💳 Ou payez en :
   [ 3× 663,33 € ]  [ 4× 497,50 € ]  ← sans frais
```

Quand le client clique sur « Commander », il :
1. Remplit le formulaire de commande EGREENCITY'S (comme actuellement)
2. À la validation, il est redirigé vers Alma pour choisir 3× ou 4×
3. Il saisit sa CB, Alma valide en 30 secondes
4. EGREENCITY'S reçoit un email de confirmation Alma + FormSubmit
5. EGREENCITY'S transmet la commande à E-TOTEM (dropshipping)

---

## Frais Alma

Grille tarifaire indicative (à confirmer avec Alma lors du contrat) :

| Type de paiement | Frais côté marchand |
|---|---|
| Paiement 3× sans frais | 2,4 % du montant |
| Paiement 4× sans frais | 3,2 % du montant |
| Comptant CB | 1,4 % + 0,25 € (via Alma Pay ou Stripe séparé) |

**Exemple** : commande 1 990 € payée en 4× → EGREENCITY'S touche
1 990 - 3,2 % = **1 926,32 € net** (Alma prélève 63,68 €).

À noter : ces frais sont intégralement à votre charge (pas au client). Vous
pouvez soit les absorber (marge dropshipping suffisante), soit les répercuter
sur le prix affiché.

---

## Passage en production — Check-list finale

- [ ] Compte Alma validé (email de confirmation reçu)
- [ ] Clé `live_A...` récupérée
- [ ] `ALMA_MERCHANT_ID` remplacée dans `alma-widget.js`
- [ ] `ALMA_MODE = 'production'` activé
- [ ] Script `<script src="/assets/js/alma-widget.js?v=1" defer></script>`
      ajouté dans `pages/boutique-wallbox.html`
- [ ] Commit + push GitHub
- [ ] Attendre 2 min déploiement GitHub Pages
- [ ] Tester une commande de 200 € avec sa propre CB
- [ ] Vérifier le versement sur le compte EGREENCITY'S sous 3 jours
- [ ] Rembourser la commande de test depuis dashboard Alma

---

## Alternatives en cas de refus Alma

Si le dossier EGREENCITY'S est refusé (jeune société, historique bancaire
insuffisant), voici les fallbacks :

### Cofidis Pay (3xCB / 4xCB)

- Site : https://www.cofidis-retail.com
- Similaire à Alma, plus tolérant sur jeunes sociétés
- Widget JS disponible
- Frais : ~3-4 %

### PayPal 4x

- Aucun dossier à monter — activation immédiate depuis PayPal Business
- Frais fixes : 1,2 % + 0,25 € par transaction
- Widget déjà présent dans les bouton PayPal standard
- Moins premium qu'Alma mais universel

### Solution manuelle temporaire (déjà en place)

Le formulaire actuel envoie la commande à egreencitys@gmail.com.
Vous pouvez :
1. Répondre au client sous 24h avec un devis PDF
2. Générer manuellement un lien de paiement Cofidis / Stripe / PayPal
3. Envoyer le lien au client par email
4. À la validation, transmettre à E-TOTEM

Ce workflow fonctionne dès aujourd'hui, sans intégration technique.

---

## Support

Alma support marchand :
- Email : marchand@alma.eu
- Téléphone : 01 44 82 65 65 (jours ouvrés 9h-19h)
- Documentation : https://developers.alma.eu

---

*Guide activation Alma — EGREENCITY'S SAS — v1.0 (07/05/2026)*
