# Activation du back-office EGREENCITY'S

> Objectif : enregistrer automatiquement chaque paiement Stripe comme commande,
> et disposer d'un tableau de bord (commandes + leads). Tout est déjà codé — il
> reste à l'activer sur **le bon compte Google** (celui qui possède le projet
> `egreencitys-93e0b` : **egreencitys@gmail.com**).

---

## Partie A — Firestore + Admin (GRATUIT, plan Spark)

Suffit pour le **tableau de bord**, les **leads** et l'historique client.

1. **Se connecter avec le bon compte** sur https://console.firebase.google.com
   → le projet `egreencitys-93e0b` doit apparaître (sinon vous êtes sur le mauvais compte Google).
2. **Firestore Database** → *Créer une base* → **mode production** → région **`eur3` (europe-west)**
   ⚠️ la région est **définitive**.
3. **Onglet Règles** → coller le contenu de [`_backend/firestore.rules`](firestore.rules) → **Publier**.
   *(Si vous aviez déjà des règles pour `users/{uid}`, fusionnez plutôt que remplacer.)*
4. Le tableau de bord est en ligne : **https://egreencitys.com/pages/admin.html**
   → connexion avec un email admin (défini dans les règles + dans `admin.html` : `egreencitys@gmail.com`, `ludosky.loic@gmail.com`).
   *(Le compte doit exister dans Authentication ; créez-le si besoin dans Authentication → Users.)*

À ce stade : les **leads** (capture panier) et l'historique client remontent déjà.

---

## Partie B — Webhook Stripe → commandes automatiques (nécessite le plan Blaze)

Les Cloud Functions exigent le plan **Blaze** (paiement à l'usage — quasi gratuit à faible volume, mais **carte bancaire requise**). C'est **votre décision** (financière).

1. Console Firebase → **Modifier le forfait** → **Blaze**.
2. Installer l'outil et se connecter (dans un terminal) :
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
3. Depuis le dossier du projet :
   ```bash
   firebase use egreencitys-93e0b
   firebase deploy --only functions --project egreencitys-93e0b
   ```
   *(Le code est dans `_backend/functions/`. Copiez ce dossier en `functions/` à la racine, ou pointez `firebase.json` dessus.)*
4. Définir les secrets Stripe :
   ```bash
   firebase functions:secrets:set STRIPE_SECRET          # sk_live_...
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  # whsec_... (étape 5)
   ```
5. **Stripe** → Développeurs → Webhooks → *Ajouter un endpoint* :
   - URL = celle affichée après le déploiement (ex. `https://europe-west1-egreencitys-93e0b.cloudfunctions.net/stripeWebhook`)
   - Événement : **`checkout.session.completed`**
   - Copier le **signing secret** (`whsec_...`) → le mettre dans `STRIPE_WEBHOOK_SECRET` (étape 4) puis redéployer.

Résultat : **chaque paiement** (y compris via vos Payment Links actuels) crée automatiquement une commande dans Firestore, visible dans `admin.html`. Fini la ressaisie manuelle de `data/commandes.json`.

---

## Fichiers fournis
- `_backend/firestore.rules` — règles de sécurité (leads publics en création, lecture admin ; commandes en lecture admin).
- `_backend/functions/index.js` + `package.json` — la Cloud Function `stripeWebhook`.
- `pages/admin.html` — tableau de bord (CA, commandes, leads).

## Reste possible plus tard
- **Checkout serverless** (montant payé = montant affiché, panier unifié) : une 2ᵉ fonction `createCheckoutSession`. À faire quand le webhook tourne.
