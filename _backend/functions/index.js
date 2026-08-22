/* ==========================================================================
   EGREENCITY'S — Cloud Functions
   ==========================================================================
   stripeWebhook : reçoit les événements Stripe et enregistre chaque paiement
   comme une COMMANDE dans Firestore (collection "orders"). Fini la ressaisie
   manuelle dans data/commandes.json.

   Fonctionne avec vos Payment Links actuels : Stripe déclenche
   "checkout.session.completed" à chaque paiement réussi, y compris via Payment Link.

   Secrets à définir (voir SETUP_BACKEND.md) :
     firebase functions:secrets:set STRIPE_SECRET          (clé secrète sk_live_...)
     firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  (signing secret whsec_...)
   ========================================================================== */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET], region: 'europe-west1' },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET.value());
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      // req.rawBody est fourni par Cloud Functions — indispensable pour la vérif de signature.
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      console.error('Signature webhook invalide :', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const db = admin.firestore();
      const annee = new Date().getFullYear();
      const numero = 'EGC-' + annee + '-' + String(s.id).slice(-8).toUpperCase();
      try {
        await db.collection('orders').doc(s.id).set({
          numero: numero,
          email: (s.customer_details && s.customer_details.email) || s.customer_email || null,
          nom: (s.customer_details && s.customer_details.name) || null,
          telephone: (s.customer_details && s.customer_details.phone) || null,
          montant: (s.amount_total || 0) / 100,
          devise: s.currency,
          statut: 'payee',
          client_reference_id: s.client_reference_id || null,
          stripe_session: s.id,
          paye_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Commande enregistrée :', numero);
      } catch (e) {
        console.error('Écriture Firestore échouée :', e);
        return res.status(500).send('DB error');
      }
    }

    return res.json({ received: true });
  }
);
