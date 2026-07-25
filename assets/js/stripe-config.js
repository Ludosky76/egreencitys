/* ==========================================================================
   EGREENCITY'S — Configuration Stripe
   ==========================================================================
   Cle publique Stripe (safe cote client — publique par nature).
   Pour passer en PRODUCTION : remplacer par la cle pk_live_...

   Documentation :
     - https://stripe.com/docs/payments/checkout
     - Guide activation : _dossiers/05_Dropshipping_WallBox/GUIDE_ACTIVATION_STRIPE.md
   ========================================================================== */

/* ================================================================
   ⚙️ ENVIRONNEMENT — un seul flag a changer
   ================================================================
   'test' = mode bac a sable (cartes de test, aucune vraie transaction)
   'live' = PRODUCTION (encaissement reel)

   AVANT de passer a 'live', il faut :
     1. Activer le compte Stripe en mode Live (dashboard)
     2. Coller la cle pk_live_... ci-dessous (LIVE.publishableKey)
     3. Regenerer les Payment Links en mode LIVE :
          python _tools/create_stripe_payment_links.py --live
        (necessite sk_live_... dans _config/stripe.env)
     4. Passer STRIPE_ENV a 'live', commit + push
   Paiement en 3x : activer Klarna dans le dashboard Stripe (Moyens de paiement).
   ================================================================ */
window.STRIPE_ENV = 'test';   // <-- 'test' ou 'live'

var STRIPE_KEYS = {
  test: {
    publishableKey: 'pk_test_51TvM98HVp8b7CHe3Qymb6RG8PgUXy4F3ibWfB7YIuBBxTZYtHKOsd0RoquVXXvSmnQ4T6jHOrROIPVs9s5DpUz7e00jrYZrmcl'
  },
  live: {
    // ⚠️ Coller ici votre cle publique LIVE (commence par pk_live_)
    publishableKey: 'pk_live_A_REMPLIR'
  }
};

window.STRIPE_CONFIG = {
  publishableKey: STRIPE_KEYS[window.STRIPE_ENV].publishableKey,
  mode: window.STRIPE_ENV,
  successUrl: 'https://egreencitys.com/pages/boutique-wallbox.html?paiement=succes',
  cancelUrl:  'https://egreencitys.com/pages/boutique-wallbox.html?paiement=annule'
};

/* ============================================================
   PAYMENT LINKS Stripe (URLs generees dans le dashboard Stripe)
   ============================================================
   Comment obtenir : Dashboard Stripe > Payment Links > "Nouveau lien"
   1. Selectionner un produit (ou en creer un)
   2. Copier l'URL commencant par https://buy.stripe.com/...
   3. Coller dans le mapping ci-dessous en face du bon product id.
   Un lien vide '' = pas encore configure (fallback : formulaire manuel).

   Deux jeux de liens : test (bac a sable) et live (production).
   Le script create_stripe_payment_links.py remplit automatiquement le bon
   jeu selon --live. Le site utilise le jeu correspondant a STRIPE_ENV.
   ============================================================ */
var STRIPE_LINKS = {
  test: {
    'wb-mur-7':   'https://buy.stripe.com/test_6oU8wPgQ84Eu0rc828fIs00',
    'wb-mur-22':  'https://buy.stripe.com/test_9B6cN51Veef43Do6Y4fIs01',
    'wb-pied-7':  'https://buy.stripe.com/test_aFaeVdarK4Eu1vg2HOfIs02',
    'wb-pied-22': 'https://buy.stripe.com/test_3cIcN5czS6MC7TE2HOfIs03',
    'sm7-mur-1':  'https://buy.stripe.com/test_28EdR957q4Eu6PA0zGfIs04',
    'sm7-mur-2':  'https://buy.stripe.com/test_28E6oHeI07QGgqagyEfIs05',
    'sm7-pied-1': 'https://buy.stripe.com/test_dRm7sL8jCfj87TEfuAfIs06',
    'sm7-pied-2': 'https://buy.stripe.com/test_fZu28r7fyc6W3Do828fIs07',
    'sm22-mur-1':  'https://buy.stripe.com/test_7sY3cv2Zi8UKb5Q2HOfIs08',
    'sm22-mur-2':  'https://buy.stripe.com/test_4gMfZh9nG9YOb5QfuAfIs09',
    'sm22-pied-1': 'https://buy.stripe.com/test_eVq4gzeI07QGb5QciofIs0a',
    'sm22-pied-2': 'https://buy.stripe.com/test_7sY8wP6bu1si5Lw6Y4fIs0b',
    'prem-2x22':   'https://buy.stripe.com/test_14AeVd1Ve9YO4HsgyEfIs0c'
  },
  live: {
    // ⚠️ Rempli automatiquement par create_stripe_payment_links.py --live
    'wb-mur-7': '', 'wb-mur-22': '', 'wb-pied-7': '', 'wb-pied-22': '',
    'sm7-mur-1': '', 'sm7-mur-2': '', 'sm7-pied-1': '', 'sm7-pied-2': '',
    'sm22-mur-1': '', 'sm22-mur-2': '', 'sm22-pied-1': '', 'sm22-pied-2': '',
    'prem-2x22': ''
  }
};
window.STRIPE_PAYMENT_LINKS = STRIPE_LINKS[window.STRIPE_ENV] || STRIPE_LINKS.test;

/* Utilitaire : vrai si un lien Payment Link est configure pour le produit */
window.hasStripeLink = function (productId) {
  var link = window.STRIPE_PAYMENT_LINKS[productId];
  return !!(link && link.indexOf('https://') === 0);
};
