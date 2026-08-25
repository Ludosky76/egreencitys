# Activation du back-office EGREENCITY'S

> État au 25/08/2026 : la **Partie A est active** (Firestore, règles de sécurité,
> tableau de bord, capture de leads). La **Partie B** (enregistrement automatique
> des commandes Stripe) est **codée, testée et prête à déployer** — elle attend
> uniquement l'activation du plan Blaze, prévue à la première vente.

---

## Partie A — Firestore + tableau de bord ✅ FAIT (plan gratuit)

- Firestore actif, règles publiées (`firestore.rules`) :
  - `leads` : création publique (capture panier), lecture réservée aux admins
  - `orders` : lecture admin uniquement, écriture réservée à la Cloud Function
  - `users/{uid}` : chacun accède à ses propres données
- Tableau de bord : **https://egreencitys.com/pages/admin.html**
  → connexion avec un compte admin (`egreencitys@`, `ludosky.loic@`, `melanie.clery@`)
- Vérifié : écriture d'un lead OK, lecture anonyme refusée (`permission-denied`).

---

## Partie B — Webhook Stripe → commandes automatiques ⏳ EN ATTENTE

**Ce que ça apporte :** chaque paiement crée automatiquement sa commande dans le
tableau de bord (numéro, client, montant, produit). Fini la saisie manuelle de
`data/commandes.json` via `_tools/manage_orders.py`.

**Ce qui est déjà fait :** code de la fonction (`functions/index.js`), configuration
de déploiement (`firebase.json`, `.firebaserc`), dépendances installées, CLI
connecté, accès au projet validé. Signature testée localement (valide acceptée,
falsifiée rejetée).

**Bon à savoir :** la clé secrète Stripe (`sk_live_…`) **n'est pas nécessaire**.
La vérification de signature n'utilise que le secret du webhook, et le produit
acheté est déduit du `client_reference_id` transmis par la boutique.

### Les 5 étapes le jour J

1. **Activer Blaze** (carte bancaire requise, ~0 € au volume attendu — le palier
   gratuit couvre 2 M d'appels/mois). Pensez à poser un budget d'alerte à 5 €.
   → https://console.firebase.google.com/project/egreencitys-93e0b/usage/details

2. **Ouvrir un terminal dans le dossier du projet.** Si `firebase` n'est pas
   reconnu, ajouter son chemin à la session :
   ```powershell
   cd C:\projet\Egreencity
   $env:PATH += ";C:\Users\ludosky\AppData\Roaming\npm"
   ```

3. **Créer le secret provisoire**, sinon le déploiement échoue :
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
   → saisir `whsec_placeholder`

4. **Déployer**, puis noter l'URL affichée :
   ```bash
   firebase deploy --only functions
   ```
   → URL attendue : `https://europe-west1-egreencitys-93e0b.cloudfunctions.net/stripeWebhook`

5. **Brancher Stripe**, puis enregistrer le vrai secret :
   - Stripe → Développeurs → Webhooks → *Ajouter un endpoint*
   - URL = celle de l'étape 4 · Événement = **`checkout.session.completed`**
   - Copier le `whsec_…` affiché, puis :
     ```bash
     firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
     firebase deploy --only functions
     ```
     *(le redéploiement est nécessaire pour que la fonction lise la nouvelle version du secret)*

**Test :** effectuer un paiement réel de faible montant, puis vérifier qu'il
apparaît dans `admin.html`. Les journaux sont consultables via
`firebase functions:log`.

---

## Fichiers de référence
- `_backend/firestore.rules` — règles publiées (copie de référence)
- `functions/index.js` — la Cloud Function (source déployée)
- `_backend/functions/` — copie de sauvegarde
- `pages/admin.html` — tableau de bord

## Étape suivante possible
**Checkout serverless** : faire correspondre le montant payé au montant affiché
(options incluses) et permettre un paiement unique pour un panier multi-bornes.
Aujourd'hui, le bouton « Payer par CB » est masqué dès qu'une option est cochée
afin de ne jamais sous-facturer.
