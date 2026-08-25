/* ==========================================================================
   EGREENCITY'S — Cloud Functions
   ==========================================================================
   stripeWebhook : reçoit les événements Stripe et enregistre chaque paiement
   comme une COMMANDE dans Firestore (collection "orders"). Fini la ressaisie
   manuelle dans data/commandes.json.

   Fonctionne avec les Payment Links actuels : Stripe déclenche
   "checkout.session.completed" à chaque paiement réussi.

   UN SEUL SECRET NÉCESSAIRE (fourni par Stripe à la création du webhook) :
     firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   (whsec_...)

   La clé secrète d'API (sk_live_...) n'est PAS requise : la vérification de
   signature n'utilise que le secret du webhook, et le produit acheté est
   identifié via le client_reference_id transmis par la boutique.
   ========================================================================== */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();

const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

/* Événements traités : paiement immédiat, et paiement différé confirmé plus tard. */
const EVENEMENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET], region: 'europe-west1' },
  async (req, res) => {
    // Aucune clé d'API nécessaire : constructEvent ne fait que vérifier une signature.
    const stripe = new Stripe('sk_unused', { apiVersion: '2024-06-20' });
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

    // La boutique transmet "<idProduit>_<horodatage>" comme client_reference_id.
    const refClient = s.client_reference_id || null;
    const produit = refClient ? String(refClient).split('_')[0] : null;

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
      produit,
      client_reference_id: refClient,
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
