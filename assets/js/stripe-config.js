/* ==========================================================================
   EGREENCITY'S — Configuration Stripe
   ==========================================================================
   Cle publique Stripe (safe cote client — publique par nature).
   Pour passer en PRODUCTION : remplacer par la cle pk_live_...

   Documentation :
     - https://stripe.com/docs/payments/checkout
     - Guide activation : _dossiers/05_Dropshipping_WallBox/GUIDE_ACTIVATION_STRIPE.md
   ========================================================================== */

window.STRIPE_CONFIG = {
  // ⚠️ Cle TEST — passer a pk_live_... quand vous voulez encaisser en reel
  publishableKey: 'pk_test_51TvM98HVp8b7CHe3Qymb6RG8PgUXy4F3ibWfB7YIuBBxTZYtHKOsd0RoquVXXvSmnQ4T6jHOrROIPVs9s5DpUz7e00jrYZrmcl',

  // Mode : 'test' (pas de vraie transaction) ou 'live' (encaissement reel)
  mode: 'test',

  // URLs de retour apres paiement
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
   ============================================================ */
window.STRIPE_PAYMENT_LINKS = {
  // e-WallBox
  'wb-mur-7':   'https://buy.stripe.com/test_6oU8wPgQ84Eu0rc828fIs00',   // 1 049 EUR
  'wb-mur-22':  'https://buy.stripe.com/test_9B6cN51Veef43Do6Y4fIs01',   // 1 239 EUR
  'wb-pied-7':  'https://buy.stripe.com/test_aFaeVdarK4Eu1vg2HOfIs02',   // 1 339 EUR
  'wb-pied-22': 'https://buy.stripe.com/test_3cIcN5czS6MC7TE2HOfIs03',   // 1 529 EUR

  // e-Smart 7 kW
  'sm7-mur-1':  'https://buy.stripe.com/test_28EdR957q4Eu6PA0zGfIs04',   // 2 179 EUR
  'sm7-mur-2':  'https://buy.stripe.com/test_28E6oHeI07QGgqagyEfIs05',   // 3 749 EUR
  'sm7-pied-1': 'https://buy.stripe.com/test_dRm7sL8jCfj87TEfuAfIs06',   // 2 219 EUR
  'sm7-pied-2': 'https://buy.stripe.com/test_fZu28r7fyc6W3Do828fIs07',   // 3 769 EUR

  // e-Smart 22 kW
  'sm22-mur-1':  'https://buy.stripe.com/test_7sY3cv2Zi8UKb5Q2HOfIs08',  // 2 299 EUR
  'sm22-mur-2':  'https://buy.stripe.com/test_4gMfZh9nG9YOb5QfuAfIs09',  // 3 999 EUR
  'sm22-pied-1': 'https://buy.stripe.com/test_eVq4gzeI07QGb5QciofIs0a',  // 2 349 EUR
  'sm22-pied-2': 'https://buy.stripe.com/test_7sY8wP6bu1si5Lw6Y4fIs0b',  // 4 009 EUR

  // e-Premium AC
  'prem-2x22':   'https://buy.stripe.com/test_14AeVd1Ve9YO4HsgyEfIs0c'   // 7 249 EUR
};

/* Utilitaire : vrai si un lien Payment Link est configure pour le produit */
window.hasStripeLink = function (productId) {
  var link = window.STRIPE_PAYMENT_LINKS[productId];
  return !!(link && link.indexOf('https://') === 0);
};
