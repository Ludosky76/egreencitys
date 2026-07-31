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
    'wb-mur-pctr': 'https://buy.stripe.com/14A9ATgQ88UK8XI96cfIs0u',
    'wb-mur-ctr': 'https://buy.stripe.com/14AfZh1Ve6MC8XI1DKfIs0t',
    'wb-mur-ptr': 'https://buy.stripe.com/dRm8wP7fyb2S5Lw96cfIs0s',
    'wb-mur-tr': 'https://buy.stripe.com/3cI3cvczSb2S3Do828fIs0r',
    'wb-mur-pcr': 'https://buy.stripe.com/dRm3cveI04Eua1M4PWfIs0q',
    'wb-mur-cr': 'https://buy.stripe.com/dRm14n7fy6MCb5Q5U0fIs0p',
    'wb-mur-pr': 'https://buy.stripe.com/4gM00j2Zic6Wc9U3LSfIs0o',
    'wb-mur-r': 'https://buy.stripe.com/aFa3cvczSgnc7TEdmsfIs0n',
    'wb-mur-pct': 'https://buy.stripe.com/dRmfZh43m0oeb5Q5U0fIs0m',
    'wb-mur-ct': 'https://buy.stripe.com/dRm14n0Raef44Hs5U0fIs0l',
    'wb-mur-pt': 'https://buy.stripe.com/dRm14ndDW7QGgqa828fIs0k',
    'wb-mur-t': 'https://buy.stripe.com/14A4gzdDWc6W1vgaagfIs0j',
    'wb-mur-pc': 'https://buy.stripe.com/fZu00j0Ra0oegqa5U0fIs0i',
    'wb-mur-c': 'https://buy.stripe.com/6oU7sLbvOef42zkeqwfIs0h',
    'wb-mur-p': 'https://buy.stripe.com/fZueVddDW4EuddYgyEfIs0g',
    'wb-mur':      'https://buy.stripe.com/bJe4gz43m8UK1vg96cfIs0f',
    'wb-pied-7':  'https://buy.stripe.com/aFaeVdarK4Eu1vg2HOfIs02',
    'wb-pied-22': 'https://buy.stripe.com/3cIcN5czS6MC7TE2HOfIs03',
    'sm7-mur-1':  'https://buy.stripe.com/28EdR957q4Eu6PA0zGfIs04',
    'sm7-mur-2':  'https://buy.stripe.com/28E6oHeI07QGgqagyEfIs05',
    'sm7-pied-1': 'https://buy.stripe.com/dRm7sL8jCfj87TEfuAfIs06',
    'sm7-pied-2': 'https://buy.stripe.com/fZu28r7fyc6W3Do828fIs07',
    'sm22-mur-1':  'https://buy.stripe.com/7sY3cv2Zi8UKb5Q2HOfIs08',
    'sm22-mur-2':  'https://buy.stripe.com/4gMfZh9nG9YOb5QfuAfIs09',
    'sm22-pied-1': 'https://buy.stripe.com/eVq4gzeI07QGb5QciofIs0a',
    'sm22-pied-2': 'https://buy.stripe.com/7sY8wP6bu1si5Lw6Y4fIs0b',
    'prem-2x22':   'https://buy.stripe.com/14AeVd1Ve9YO4HsgyEfIs0c'
  }
};
window.STRIPE_PAYMENT_LINKS = STRIPE_LINKS[window.STRIPE_ENV] || STRIPE_LINKS.test;

/* Utilitaire : vrai si un lien Payment Link est configure pour le produit */
window.hasStripeLink = function (productId) {
  var link = window.STRIPE_PAYMENT_LINKS[productId];
  return !!(link && link.indexOf('https://') === 0);
};
