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

   paiementPanier : crée la page de paiement Stripe d'un PANIER de plusieurs
   articles de la quincaillerie (un seul forfait d'expédition). Les prix, le
   stock, la limite de 30 kg et l'offre de lancement sont relus côté serveur
   dans les fichiers publiés du site : rien ne vient du navigateur, sauf les
   références et quantités. Secret requis : une clé Stripe RESTREINTE
   (droit « Checkout Sessions : écriture ») :
     firebase functions:secrets:set STRIPE_SECRET_KEY
   ========================================================================== */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const { creerSessionPanier } = require('./panier');

admin.initializeApp();

const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY'); // clé RESTREINTE (Checkout Sessions : écriture)

exports.paiementPanier = onRequest(
  { secrets: [STRIPE_SECRET_KEY], region: 'europe-west1', cors: ['https://egreencitys.com', 'https://www.egreencitys.com'], maxInstances: 5, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode' });
    // trim : une valeur collée ou envoyée par pipe peut garder un retour à la ligne final
    const r = await creerSessionPanier(req.body, STRIPE_SECRET_KEY.value().trim());
    return res.status(r.statut).json(r.json);
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET], region: 'europe-west1' },
  async (req, res) => {
    // Aucune clé d'API nécessaire : constructEvent ne fait que vérifier une signature.
    const stripe = new Stripe('sk_unused', { apiVersion: '2024-06-20' });
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      // req.rawBody est fourni par Cloud Functions — indispensable pour la vérif de signature.
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value().trim());
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

    // Libellé lisible pour l'espace client (compte.html liste "articles").
    // QF-<ref> = boutique quincaillerie ; sinon identifiant produit bornes.
    const libelle = produit
      ? (produit.startsWith('QF-')
          ? 'Quincaillerie — réf. ' + produit.slice(3)
          : produit.startsWith('QP-')
            ? 'Quincaillerie — panier'
            : 'Borne de recharge — ' + produit)
      : 'Commande en ligne';
    // Panier (paiementPanier) : une ligne par référence, lue dans les métadonnées « 2x688HX,1x290HV ».
    const panier = (s.metadata && s.metadata.panier) || '';
    const articlesPanier = panier
      ? panier.split(',').map((x) => {
          const m = x.match(/^(\d+)x(.+)$/);
          return m ? { libelle: 'Quincaillerie — réf. ' + m[2], quantite: Number(m[1]) } : null;
        }).filter(Boolean)
      : null;

    const donnees = {
      numero,
      email: (s.customer_details && s.customer_details.email) || s.customer_email || null,
      nom: (s.customer_details && s.customer_details.name) || null,
      telephone: (s.customer_details && s.customer_details.phone) || null,
      montant: (s.amount_total || 0) / 100,
      devise: s.currency,
      produit,
      client_reference_id: refClient,
      stripe_session: s.id,
      paye_at: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      const snap = await ref.get();
      if (!snap.exists) {
        // Posés une seule fois : les renvois Stripe ne doivent pas écraser
        // created_at, ni un n° de suivi / des articles édités par l'admin.
        donnees.created_at = admin.firestore.FieldValue.serverTimestamp();
        donnees.statut = 'payee';
        donnees.articles = (articlesPanier && articlesPanier.length) ? articlesPanier : [{ libelle, quantite: 1 }];
        donnees.numero_suivi = '';
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
