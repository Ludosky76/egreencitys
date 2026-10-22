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
window.STRIPE_ENV = 'live';   // <-- 'test' ou 'live'

var STRIPE_KEYS = {
  test: {
    publishableKey: 'pk_test_51TvM98HVp8b7CHe3Qymb6RG8PgUXy4F3ibWfB7YIuBBxTZYtHKOsd0RoquVXXvSmnQ4T6jHOrROIPVs9s5DpUz7e00jrYZrmcl'
  },
  live: {
    // Cle publique LIVE (publique par nature — safe cote client)
    publishableKey: 'pk_live_51TvM8iHq3SoDDNowGtC4nnzAtVtqN9j14HiU8EnbTgVimGBTCYfkWYP7S0M4K4fXHhye7nZBoXHZFRhsJTnJjldz00zfVQF4oi'
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
    'wb-mur':      '',
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
    'wb-mur22-pcr': 'https://buy.stripe.com/00w3cv8jC9YO6PA2HOfIJ2U',
    'wb-mur22-cr': 'https://buy.stripe.com/00w5kDgQ80oe7TE2HOfIJ2T',
    'wb-mur22-pr': 'https://buy.stripe.com/dRm28r6bub2S6PA96cfIJ2S',
    'wb-mur22-r': 'https://buy.stripe.com/8x2eVdarKdb0fm64PWfIJ2R',
    'wb-mur22-pc': 'https://buy.stripe.com/8x200jdDW3Aq1vg0zGfIJ2Q',
    'wb-mur22-c': 'https://buy.stripe.com/8x2fZh0Radb0ddY2HOfIJ2P',
    'wb-mur22-p': 'https://buy.stripe.com/28EdR943m3Aq5LwfuAfIJ2O',
    'wb-mur22': 'https://buy.stripe.com/28EfZhdDWgnc6PA828fIJ2N',
    'wb-mur-pcr': 'https://buy.stripe.com/bJebJ157q7QG7TEbekfIJ2M',
    'wb-mur-cr': 'https://buy.stripe.com/4gMaEX43m4Eu1vg6Y4fIJ2L',
    'wb-mur-pr': 'https://buy.stripe.com/5kQfZh43mef40rc6Y4fIJ2K',
    'wb-mur-r': 'https://buy.stripe.com/dRmeVd6bugnc5LwgyEfIJ2J',
    'wb-mur-pc': 'https://buy.stripe.com/9B66oH2Zi3Aq4Hs0zGfIJ2I',
    'wb-mur-c': 'https://buy.stripe.com/6oU00j1Ve4Eu5LwaagfIJ2H',
    'wb-mur-p': 'https://buy.stripe.com/9B6dR96bufj80rc0zGfIJ2G',
    'wb-mur':      'https://buy.stripe.com/6oUeVd8jC1siddYaagfIJ2F',
    'wb-pied-7':  'https://buy.stripe.com/fZu4gzeI0b2S5Lw6Y4fIJ2u',
    'wb-pied-22': 'https://buy.stripe.com/6oU7sLfM44Eu3Do0zGfIJ2v',
    'sm7-mur-1':  'https://buy.stripe.com/00w7sLdDW4Eufm6aagfIJ2w',
    'sm7-mur-2':  'https://buy.stripe.com/aFa8wP9nGb2S1vg2HOfIJ2x',
    'sm7-pied-1': 'https://buy.stripe.com/7sY4gz7fy6MC6PA2HOfIJ2y',
    'sm7-pied-2': 'https://buy.stripe.com/7sY00jeI0gnc1vgbekfIJ2z',
    'sm22-mur-1':  'https://buy.stripe.com/00waEX6bu1siddYbekfIJ2A',
    'sm22-mur-2':  'https://buy.stripe.com/fZu6oH7fy4Eugqa5U0fIJ2B',
    'sm22-pied-1': 'https://buy.stripe.com/28E8wParKdb0b5Q4PWfIJ2C',
    'sm22-pied-2': 'https://buy.stripe.com/aFa00j57q5Iy0rc2HOfIJ2D',
    'prem-2x22':   'https://buy.stripe.com/5kQ4gz2Zi1sia1M5U0fIJ2E'
  }
};
window.STRIPE_PAYMENT_LINKS = STRIPE_LINKS[window.STRIPE_ENV] || STRIPE_LINKS.test;

/* Utilitaire : vrai si un lien Payment Link est configure pour le produit */
window.hasStripeLink = function (productId) {
  var link = window.STRIPE_PAYMENT_LINKS[productId];
  return !!(link && link.indexOf('https://') === 0);
};
