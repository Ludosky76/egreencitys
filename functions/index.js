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
   références et quantités. Secret requis : une clé Stripe RESTREINTE :
     firebase functions:secrets:set STRIPE_SECRET_KEY

   groupe / gererCartons / stripeWebhook (carton groupé Holex v3, functions/groupe.js)
   utilisent la MÊME clé restreinte, qui doit avoir EXACTEMENT ces droits
   (tableau de bord Stripe > Développeurs > Clés API > clé restreinte) :
     - Checkout Sessions ....... écriture  (panier, paiement d'une participation : create / expire / retrieve —
                                            page payée dont le webhook tarde, vérifiée avant un retrait)
     - PaymentIntents .......... lecture   (remboursement désigné par son PaymentIntent)
     - Refunds ................. écriture  (remboursement intégral ou partiel : refunds.create, clé d'idempotence fixe)
     - Promotion codes ......... lecture   (quota de l'offre de lancement : promotionCodes.retrieve)
   Tout autre droit reste « Aucun » (plus de Customers, SetupIntents, PaymentMethods
   ni capture manuelle depuis la v3). Sans ces droits : paiement en erreur 500,
   offre jamais appliquée ; un remboursement décidé est NOTÉ avant l'appel Stripe
   (remboursements_dus, participations « remboursement ») et rejoué par la tâche
   planifiée toutes les 10 min jusqu'au succès (visible dans l'administration).

   Emails et SMS du carton groupé (functions/notifier.js, Brevo) : secret
     firebase functions:secrets:set BREVO_API_KEY
   À CRÉER AVANT TOUT DÉPLOIEMENT des fonctions : stripeWebhook (paniers et bornes
   compris), groupe et gererCartons le déclarent, et Firebase refuse de les déployer
   sans lui. Valeur « - » (un tiret) = mode test : rien n'est envoyé, chaque envoi est
   journalisé ; remplacer ensuite par la vraie clé Brevo (puis redéployer).
   ========================================================================== */
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const { creerSessionPanier } = require('./panier');
const groupe = require('./groupe');
const { creerNotifier } = require('./notifier');

admin.initializeApp();

const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY'); // clé RESTREINTE (droits exacts : voir l'en-tête)
const BREVO_API_KEY = defineSecret('BREVO_API_KEY');         // emails et SMS du carton groupé
const EVENEMENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const ORIGINES = ['https://egreencitys.com', 'https://www.egreencitys.com'];

/* contexte de la commande groupée : base, Stripe (clé restreinte), horloge, emails / SMS (Brevo ; clé « - » = mode test) */
function ctxGroupe() {
  const brevo = String(BREVO_API_KEY.value() || '').trim();
  return { db: admin.firestore(), FieldValue: admin.firestore.FieldValue, maintenant: Date.now,
    stripe: new Stripe(STRIPE_SECRET_KEY.value().trim(), { apiVersion: '2024-06-20' }),
    notifier: creerNotifier({ cle: brevo === '-' ? '' : brevo, fetch }) };
}
/* utilisateur Firebase du jeton « Authorization: Bearer … » (null si absent ou invalide) ; groupe.js n'utilise
   son email que si email_verified est vrai */
async function utilisateur(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!m) return null;
  try { return await admin.auth().verifyIdToken(m[1]); } catch (e) { return null; }
}

/* Commande groupée Holex (carton groupé) : rejoindre (intention sans carte), annuler, payer (lien de paiement),
   reconfirmer (prix en hausse), interet / desinscription (liens des emails, par jeton), preferences, pilotage admin */
exports.groupe = onRequest(
  { secrets: [STRIPE_SECRET_KEY, BREVO_API_KEY], region: 'europe-west1', cors: ORIGINES, maxInstances: 5, timeoutSeconds: 300 },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode' });
    try {
      const corps = (req.body && typeof req.body === 'object') ? req.body : {};
      const actions = { rejoindre: groupe.rejoindre, annuler: groupe.annuler, payer: groupe.payer, reconfirmer: groupe.reconfirmer,
        interet: groupe.interet, desinscription: groupe.desinscription, preferences: groupe.preferences, admin: groupe.admin };
      const f = actions[corps.action];
      if (!f) return res.status(400).json({ erreur: 'action' });
      const r = await f(ctxGroupe(), await utilisateur(req), corps);
      return res.status(r.statut).json(r.json);
    } catch (e) {
      console.error('groupe :', e && e.message);
      return res.status(500).json({ erreur: 'serveur' });
    }
  }
);

/* toutes les 10 minutes : déclenchements repris, rappels et fin des délais de paiement, cartons « à décider »,
   remboursements (21 jours, reprises), relances d'intérêt, paliers d'avancement et alerte de marge */
exports.gererCartons = onSchedule(
  { schedule: 'every 10 minutes', region: 'europe-west1', secrets: [STRIPE_SECRET_KEY, BREVO_API_KEY], timeoutSeconds: 540 },
  async () => { console.log('cartons groupés :', JSON.stringify(await groupe.gerer(ctxGroupe()))); }
);

exports.paiementPanier = onRequest(
  { secrets: [STRIPE_SECRET_KEY], region: 'europe-west1', cors: ['https://egreencitys.com', 'https://www.egreencitys.com'], maxInstances: 5, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode' });
    try {
      // trim : une valeur collée ou envoyée par pipe peut garder un retour à la ligne final
      const r = await creerSessionPanier(req.body, STRIPE_SECRET_KEY.value().trim());
      return res.status(r.statut).json(r.json);
    } catch (e) {
      console.error('paiementPanier :', e && e.message);
      return res.status(400).json({ erreur: 'panier invalide' });
    }
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, BREVO_API_KEY], region: 'europe-west1' },
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

    // Carton groupé : participation payée (capture immédiate). Elle passe « payee » si elle attendait ce paiement,
    // sinon le paiement est remboursé ; JAMAIS de commande générique ici (la commande « orders » est écrite quand
    // l'admin commande le carton). Une session « setup » (ancienne v2) n'est plus traitée.
    if (s.metadata && s.metadata.participation) {
      if (s.mode !== 'payment') return res.json({ received: true, ignore: 'groupe_' + s.mode });
      try {
        return res.json({ received: true, groupe: await groupe.paiementRecu(ctxGroupe(), s, (event.created || 0) * 1000 || Date.now()) });
      } catch (e) {
        console.error('Carton groupé, paiement non traité :', e && e.message);
        return res.status(500).send('groupe'); // Stripe réessaiera (traitement idempotent)
      }
    }

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
    // année du paiement à l'heure de la Guyane (pas l'heure UTC du traitement, ni celle d'un renvoi Stripe)
    const annee = new Date(((s.created || Date.now() / 1000) - 3 * 3600) * 1000).getUTCFullYear();
    const numero = 'EGC-' + annee + '-' + String(s.id).slice(-8).toUpperCase();

    // Libellé lisible pour l'espace client (compte.html liste "articles").
    // QF-<ref> = boutique quincaillerie ; sinon identifiant produit bornes.
    const libelle = produit
      ? (produit.startsWith('QF-')
          ? 'Quincaillerie — réf. ' + produit.slice(3)
          : produit.startsWith('QP-')
            ? 'Quincaillerie — panier'
            : produit.startsWith('QG-')
              ? 'Quincaillerie — carton groupé'
            : 'Borne de recharge — ' + produit)
      : 'Commande en ligne';
    // Panier (paiementPanier) : une ligne par référence, lue dans les métadonnées « 2x688HX,1x290HV ».
    // (liste longue : suite dans panier_2, panier_3… — 500 caractères par métadonnée Stripe)
    const md = s.metadata || {};
    const panier = [md.panier, md.panier_2, md.panier_3, md.panier_4].filter(Boolean).join(',');
    const articlesPanier = panier
      ? panier.split(',').map((x) => {
          const m = x.match(/^(\d+)x(.+)$/);
          return m ? { libelle: 'Quincaillerie — réf. ' + m[2], quantite: Number(m[1]) } : null;
        }).filter(Boolean)
      : null;
    const livraison = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || null;

    const donnees = {
      email: (s.customer_details && s.customer_details.email) || s.customer_email || null,
      nom: (s.customer_details && s.customer_details.name) || null,
      telephone: (s.customer_details && s.customer_details.phone) || null,
      montant: (s.amount_total || 0) / 100,
      devise: s.currency,
      produit,
      client_reference_id: refClient,
      stripe_session: s.id,
      carton_atelier: md.carton_atelier || '',  // interne : poids et nombre de cartons à expédier
      cartons_sup: Number(md.cartons_sup) || 0,
      poids_kg: Number(md.poids_kg) || 0,
      offre: md.offre || '',
      livraison: livraison ? { nom: livraison.name || null, adresse: livraison.address || null } : null
    };

    try {
      const snap = await ref.get();
      if (!snap.exists) {
        // Posés une seule fois : les renvois Stripe ne doivent pas écraser
        // created_at, ni un n° de suivi / des articles édités par l'admin.
        donnees.created_at = admin.firestore.FieldValue.serverTimestamp();
        donnees.paye_at = admin.firestore.FieldValue.serverTimestamp();
        donnees.numero = numero;
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
