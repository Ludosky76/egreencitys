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

## Partie B — Webhook Stripe → commandes automatiques ✅ EN LIGNE (24/10/2026)

> Étapes 1 à 5 faites. Endpoint Stripe (mode réel) « Commande lien payement site
> et stripe » → `https://europe-west1-egreencitys-93e0b.cloudfunctions.net/stripeWebhook`,
> événements `checkout.session.completed` + `checkout.session.async_payment_succeeded`,
> secret `whsec_…` en version 4, fonction redéployée dessus.
> Vérifié en local avec des événements signés (panier QP, article QF, borne, impayé,
> autre type, fausse signature, renvoi idempotent). **Test final = le premier vrai
> paiement** : il doit apparaître dans `admin.html` (sinon : `firebase functions:log
> --only stripeWebhook`, et Stripe → Webhooks → la destination → tentatives de livraison).

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

## Partie C — Paiement par carte des paniers quincaillerie ✅ EN LIGNE (24/10/2026)

> Blaze activé, secrets posés, fonctions `paiementPanier` et `stripeWebhook`
> déployées (Node.js 22, europe-west1), purge des images à 1 jour, bouton activé
> sur la boutique. Testé en réel après déploiement (sessions expirées, 0 encaissement).
> Les paiements de panier s'enregistrent seuls dans `admin.html` via le webhook
> (Partie B, en ligne).
>
> **Leçons du déploiement :**
> - Saisie masquée peu fiable : passer la valeur par le presse-papiers
>   `Get-Clipboard | firebase functions:secrets:set NOM --data-file - --project egreencitys-93e0b`
>   (la fonction fait `.trim()` sur les secrets, le retour à la ligne final est sans effet).
> - Copier la clé avec le bouton de Stripe : une application de notes peut supprimer
>   le `_` de `rk_live_` (Stripe répond alors « Invalid API Key provided: rk_live5… »).
> - Une fonction reste liée à la version du secret lue au déploiement : après un
>   nouveau `secrets:set`, **redéployer**.
> - Si le déploiement échoue sur « User code failed to load… Timeout after 10000 »,
>   relancer avec `FUNCTIONS_DISCOVERY_TIMEOUT=60` (premier chargement lent sous Windows).

**Ce que ça apporte :** un panier de plusieurs articles se paie par carte en une fois
(un seul forfait d'expédition), au lieu du formulaire. Fonction `paiementPanier`
(`functions/index.js` + `functions/panier.js`) : prix, stock, poids (≤ 30 kg) et offre
de lancement relus côté serveur dans les fichiers publiés du site. Testée en réel
(sessions Stripe créées puis expirées) : panier 4 × 688HX = 50,52 € (forfait offert),
688HX + 290HV = 50,99 € (forfait payé), article en rupture / sur devis refusés.

1. **Blaze activé** (Partie B, étape 1).
2. **Clé Stripe restreinte** : Stripe → Développeurs → Clés API → *Créer une clé
   restreinte* → nom « paiementPanier » → droit **Checkout Sessions : Écriture**
   (tout le reste : Aucun) → copier la clé `rk_live_…` (affichée une seule fois).
3. **Secrets** (le terminal demande la valeur, la coller puis Entrée) :
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY        # la clé rk_live_…
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET    # whsec_placeholder si le webhook n'est pas encore branché
   ```
4. **Déployer** : `firebase deploy --only functions`
   → URL : `https://europe-west1-egreencitys-93e0b.cloudfunctions.net/paiementPanier`
5. **Activer sur le site** : `assets/data/quincaillerie-paiement.json` → `"panier_cb": true`.

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
