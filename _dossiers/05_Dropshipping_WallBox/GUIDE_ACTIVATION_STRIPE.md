# Guide — Activation Stripe pour la Boutique WallBox
## EGREENCITY'S — Paiement CB en ligne

---

## Pourquoi Stripe ?

**Stripe** est la référence mondiale du paiement en ligne. Avantages pour EGREENCITY'S :

- ✅ **Ouverture de compte en 5 min** (aucun dossier papier)
- ✅ Encaissement CB Visa/Mastercard/Amex, Apple Pay, Google Pay
- ✅ Frais transparents : **1,4 % + 0,25 €** par transaction (EU)
- ✅ Versement sous **2-7 jours** sur votre compte bancaire
- ✅ Facturation, reçus, remboursements automatiques
- ✅ Payment Links = **aucun code à écrire**, tout dans le dashboard
- ✅ Certifié PCI-DSS niveau 1, RGPD, 3D Secure

---

## Statut actuel de l'intégration

| Élément | Statut |
|---|---|
| Module Stripe (`assets/js/stripe-config.js`) | ✅ En place |
| Clé publique TEST configurée | ✅ `pk_test_51TvM98...` |
| SDK Stripe.js chargé dans la boutique | ✅ Oui |
| Bouton « Payer par CB — Stripe » dans le configurateur | ✅ S'active dès qu'un Payment Link est configuré |
| Payment Links produits | ⏳ **À créer** (13 produits) |
| Passage en production (clé `pk_live_`) | ⏳ À faire quand vous voulez encaisser réellement |

---

## Étape 1 — Créer votre compte Stripe

### 1.1 Inscription
1. Aller sur https://dashboard.stripe.com/register
2. Remplir :
   - Email : `egreencitys@gmail.com`
   - Mot de passe fort (≥ 12 caractères)
3. Confirmer l'email

### 1.2 Activer votre compte marchand
Dans le dashboard Stripe → **Activer votre compte** :

| Info | Valeur |
|---|---|
| Raison sociale | EGREENCITY'S SAS |
| SIREN | 878 682 854 |
| RCS | Cayenne |
| Adresse | 1 rue Anangosi, Résidence La Rougerie — 97355 MACOURIA |
| Représentant légal | Loïc Yves LUDOSKY (Président) |
| Compte bancaire (RIB pro EGREENCITY'S) | IBAN + BIC |
| Site web | https://egreencitys.com |
| Type d'activité | Vente en ligne — équipement / high-tech |
| Ticket moyen | ~1 500 € |
| CA prévisionnel An 1 | 30 000 € |

**Délai** : activation immédiate en général (5-15 min de validation automatique).

---

## Étape 2 — Créer les 13 Payment Links (dashboard Stripe)

C'est l'étape principale : créer une URL de paiement pour chaque produit.

### 2.1 Aller dans Payment Links
Dashboard Stripe → **Paiements** → **Liens de paiement** → **+ Nouveau lien**

### 2.2 Pour chaque produit :

**Exemple — WallBox Murale 1×7 kW à 1 049 €**

1. Cliquer **+ Ajouter un produit** → **+ Créer un nouveau produit**
2. Remplir :
   - **Nom** : `WallBox Résidentielle 7 kW`
   - **Description** : `Borne de recharge E-TOTEM 1×7 kW AC — capot alu, RFID, garantie 2 ans`
   - **Image** : uploader `assets/img/products/e-wallbox-murale.jpg`
   - **Prix** : `1 049,00 €`
   - **Taxes** : (laisser par défaut ou activer TVA Guyane 8,5 %)
3. **Créer**
4. Options du lien de paiement :
   - Quantité fixée à 1 (ou modifiable si vous voulez)
   - Collecte de l'adresse de livraison : **Oui**
   - Adresse de facturation : **Oui**
   - Numéro de téléphone : **Oui**
   - Message personnalisé après achat : `Merci ! Nous vous contactons sous 24 h pour organiser la livraison Chronopost DOM.`
   - **URL de redirection après paiement** : `https://egreencitys.com/pages/boutique-wallbox.html?paiement=succes`
5. **Créer le lien** → Stripe génère une URL du type `https://buy.stripe.com/test_xxxxxxxxxxxx`
6. **Copier cette URL**

### 2.3 Coller les URLs dans le fichier de config

Ouvrir `assets/js/stripe-config.js` et remplir :

```javascript
window.STRIPE_PAYMENT_LINKS = {
  'wb-mur-7':   'https://buy.stripe.com/test_XXXXX',   // 1 049 EUR
  'wb-mur-22':  'https://buy.stripe.com/test_YYYYY',   // 1 239 EUR
  // etc.
};
```

Faire de même pour les **13 produits** (liste ci-dessous).

---

## Étape 3 — Tarifs à créer dans Stripe

Prix TTC calculés avec coefficient marge x1.35 sur les tarifs HT E-TOTEM 2026 + TVA 8,5 % :

| ID produit | Nom | Prix TTC |
|---|---|---:|
| `wb-mur-7` | WallBox Résidentielle 7 kW | 1 049 € |
| `wb-mur-22` | WallBox Confort 22 kW | 1 239 € |
| `wb-pied-7` | WallBox sur Pied 7 kW | 1 339 € |
| `wb-pied-22` | WallBox sur Pied 22 kW | 1 529 € |
| `sm7-mur-1` | e-Smart 7 kW Murale 1 PDC | 2 179 € |
| `sm7-mur-2` | e-Smart 7 kW Murale 2 PDC | 3 749 € |
| `sm7-pied-1` | e-Smart 7 kW sur Pied 1 PDC | 2 219 € |
| `sm7-pied-2` | e-Smart 7 kW sur Pied 2 PDC | 3 769 € |
| `sm22-mur-1` | e-Smart 22 kW Murale 1 PDC | 2 299 € |
| `sm22-mur-2` | e-Smart 22 kW Murale 2 PDC | 3 999 € |
| `sm22-pied-1` | e-Smart 22 kW sur Pied 1 PDC | 2 349 € |
| `sm22-pied-2` | e-Smart 22 kW sur Pied 2 PDC | 4 009 € |
| `prem-2x22` | e-Premium AC 2×22 kW | 7 249 € |

> Ces prix suivent le coefficient de marge défini dans `catalog.js` (`COEF_MARGE: 1.35`).
> Si vous changez le coefficient, régénérez également les Payment Links dans Stripe.

---

## Étape 4 — Tester avec les cartes de démo Stripe

Une fois les Payment Links créés en mode **TEST** :

1. Aller sur la boutique : https://egreencitys.com/pages/boutique-wallbox.html
2. Cliquer sur un produit → **Configurer & commander** → **💳 Payer par CB — Stripe**
3. Sur la page Stripe hébergée :
   - **Email** : votre email de test
   - **Numéro de carte** : `4242 4242 4242 4242`
   - **Date d'expiration** : n'importe quelle date future (ex : `12/29`)
   - **CVC** : `123`
   - **Code postal** : `97300`
4. Cliquer **Payer**
5. Vous êtes redirigé sur `https://egreencitys.com/pages/boutique-wallbox.html?paiement=succes`
6. Toast vert « ✅ Paiement CB validé » s'affiche

### Autres cartes de test utiles
| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement OK |
| `4000 0025 0000 3155` | Nécessite authentification 3D Secure (auth OK) |
| `4000 0000 0000 9995` | Fonds insuffisants (échec) |
| `4000 0000 0000 0002` | Carte refusée |

Toutes les infos : https://stripe.com/docs/testing

---

## Étape 5 — Passer en production (encaissement réel)

Quand vous êtes prêt à encaisser vraiment :

### 5.1 Basculer le compte Stripe en mode LIVE
Dans le dashboard Stripe (en haut à droite) → toggle **Mode test** → **Mode production**

### 5.2 Créer les mêmes Payment Links en mode LIVE
Répéter l'étape 2 en mode production. Les URLs commencent maintenant par `https://buy.stripe.com/` (sans `test_`).

### 5.3 Récupérer la clé publique LIVE
Dashboard Stripe (en mode Live) → **Développeurs** → **Clés API** → copier la **clé publique publiable** (`pk_live_...`)

### 5.4 Mettre à jour la config
Éditer `assets/js/stripe-config.js` :

```javascript
window.STRIPE_CONFIG = {
  publishableKey: 'pk_live_XXXXXXX',  // <-- remplacer
  mode: 'live',                        // <-- passer à live
  successUrl: 'https://egreencitys.com/pages/boutique-wallbox.html?paiement=succes',
  cancelUrl:  'https://egreencitys.com/pages/boutique-wallbox.html?paiement=annule'
};

window.STRIPE_PAYMENT_LINKS = {
  'wb-mur-7': 'https://buy.stripe.com/XXXXX',   // <-- URLs Live
  // etc. pour les 13 produits
};
```

### 5.5 Commit + push
```bash
git add assets/js/stripe-config.js
git commit -m "prod: passage Stripe en mode Live"
git push
```

→ Boutique en production, prête à encaisser les vraies commandes.

---

## Frais Stripe (indicatifs Europe)

| Type transaction | Frais |
|---|---|
| CB standard EU (Visa/MC) | 1,4 % + 0,25 € |
| CB hors EU / Amex | 2,9 % + 0,25 € |
| Apple Pay / Google Pay | 1,4 % + 0,25 € |
| Remboursement | Gratuit (frais initiaux non restitués) |
| Chargeback | 15 € par contestation |
| Payout (versement bancaire) | Gratuit vers IBAN FR |

**Exemple** : commande 1 990 € payée en CB → EGREENCITY'S touche **1 962,89 € net** (Stripe prélève 27,11 €).

---

## Sécurité — Rappels importants

- ✅ La clé **publique** (`pk_...`) est safe dans le code — versionnée sur Git, exposée dans le navigateur
- ❌ La clé **secrète** (`sk_...`) doit **rester dans votre dashboard Stripe uniquement** — jamais dans le code, jamais partagée
- ✅ Stripe gère **entièrement** la conformité PCI-DSS — vous ne stockez aucune donnée bancaire
- ✅ 3D Secure activé par défaut sur toutes les transactions EU (protection anti-fraude)

---

## En cas de problème

**Support Stripe France** :
- Chat : https://support.stripe.com (24/7)
- Email : support@stripe.com
- Documentation : https://stripe.com/docs

**Sur EGREENCITY'S** :
- Le module `stripe-config.js` fonctionne côté client, pas de backend requis
- Les logs des transactions sont dans le **dashboard Stripe** (Paiements → Toutes les transactions)
- Chaque paiement génère un email de confirmation au client et à `egreencitys@gmail.com`

---

## Check-list de mise en production

- [ ] Compte Stripe créé et activé
- [ ] KBIS + RIB pro validés
- [ ] 13 Payment Links créés en mode TEST
- [ ] URLs collées dans `stripe-config.js` (mode test)
- [ ] Test transaction OK avec carte `4242 4242 4242 4242`
- [ ] 13 Payment Links créés en mode LIVE (répliqués)
- [ ] Clé `pk_live_...` récupérée et collée
- [ ] `mode: 'live'` activé
- [ ] Commit + push
- [ ] Test transaction avec vraie CB (2 €) puis remboursement de test
- [ ] Communication : ajouter mention « Paiement 100 % sécurisé par Stripe » sur la boutique

---

*Guide activation Stripe — EGREENCITY'S SAS — v1.0 (07/05/2026)*
