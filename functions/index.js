/* ==========================================================================
   EGREENCITY'S — Cloud Functions
   ==========================================================================
   stripeWebhook : reçoit les événements Stripe et enregistre chaque paiement
   comme une COMMANDE dans Firestore (collection "orders"). Fini la ressaisie
   manuelle dans data/commandes.json.

   Fonctionne avec les Payment Links actuels : Stripe déclenche
   "checkout.session.completed" à chaque paiement réussi.

   Secrets à définir (voir _backend/SETUP_BACKEND.md) :
     firebase functions:secrets:set STRIPE_SECRET          (clé secrète sk_live_...)
     firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  (signing secret whsec_...)
   ========================================================================== */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

/* Événements traités : paiement immédiat, et paiement différé confirmé plus tard. */
const EVENEMENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

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

    if (!EVENEMENTS.includes(event.type)) {
      return res.json({ received: true, ignore: event.type });
    }

    const s = event.data.object;

    // On n'enregistre que les paiements réellement encaissés.
    if (s.payment_status && s.payment_status !== 'paid') {
      console.log('Session non payée, ignorée :', s.id, s.payment_status);
      return res.json({ received: true, ignore: 'unpaid' });
    }

    // Détail des articles achetés (le Payment Link ne le transmet pas dans l'événement).
    let articles = [];
    try {
      const li = await stripe.checkout.sessions.listLineItems(s.id, { limit: 50 });
      articles = li.data.map((l) => ({
        libelle: l.description || '(article)',
        quantite: l.quantity || 1,
        montant: (l.amount_total || 0) / 100
      }));
    } catch (e) {
      console.warn('Détail des articles indisponible :', e.message);
    }

    const db = admin.firestore();
    const ref = db.collection('orders').doc(s.id); // doc id = session -> idempotent
    const annee = new Date().getFullYear();
    const numero = 'EGC-' + annee + '-' + String(s.id).slice(-8).toUpperCase();

    const donnees = {
      numero,
      email: (s.customer_details && s.customer_details.email) || s.customer_email || null,
      nom: (s.customer_details && s.customer_details.name) || null,
      telephone: (s.customer_details && s.customer_details.phone) || null,
      montant: (s.amount_total || 0) / 100,
      devise: s.currency,
      statut: 'payee',
      articles,
      client_reference_id: s.client_reference_id || null,
      stripe_session: s.id,
      paye_at: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      const snap = await ref.get();
      if (!snap.exists) {
        // created_at posé une seule fois (les renvois Stripe ne le réécrasent pas)
        donnees.created_at = admin.firestore.FieldValue.serverTimestamp();
      }
      await ref.set(donnees, { merge: true });
      console.log('Commande enregistrée :', numero, '-', donnees.montant, donnees.devise);
    } catch (e) {
      console.error('Écriture Firestore échouée :', e);
      return res.status(500).send('DB error'); // Stripe réessaiera
    }

    return res.json({ received: true, numero });
  }
);
