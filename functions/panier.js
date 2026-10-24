/* Coeur du paiement des paniers de la quincaillerie (testable hors de Firebase).
   creerSessionPanier(corps, cleStripe) -> { statut, json } ; json.url = page de paiement Stripe. */
const Stripe = require('stripe');

const SITE = 'https://egreencitys.com';
const BOUTIQUE = SITE + '/pages/boutique-quincaillerie.html';
const POIDS_MAX_COLIS = 30; // kg — au-delà : devis
const QTE_MAX = 20;

/* Données publiées par le site : catalogue (prix tout compris), stock (automate horaire), offre. */
async function lireJson(chemin, facultatif) {
  try {
    const r = await fetch(SITE + chemin + (chemin.includes('?') ? '&' : '?') + 't=' + Date.now());
    if (!r.ok) throw new Error(chemin + ' : ' + r.status);
    return await r.json();
  } catch (e) {
    if (facultatif) return null;
    throw e;
  }
}

async function creerSessionPanier(corps, cleStripe) {
  corps = (corps && typeof corps === 'object') ? corps : {};
  const lignes = Array.isArray(corps.panier) ? corps.panier : [];
  if (lignes.length === 0 || lignes.length > 50) return { statut: 400, json: { erreur: 'panier vide ou trop grand' } };

  let catalogue, stock, offre;
  try {
    [catalogue, stock, offre] = await Promise.all([
      lireJson('/assets/data/quincaillerie-catalogue.json'),
      lireJson('/assets/data/quincaillerie-stock.json'),
      lireJson('/assets/data/quincaillerie-offre.json', true),
    ]);
  } catch (e) {
    console.error('Lecture des données du site impossible :', e.message);
    return { statut: 503, json: { erreur: 'donnees' } };
  }

  const parRef = new Map(catalogue.articles.map((a) => [a.ref, a]));
  const articles = [], refus = [];
  let total = 0, poids = 0;
  for (const l of lignes) {
    const ref = String((l && l.ref) || '').slice(0, 20);
    const q = Math.floor(Number(l && l.q));
    const a = parRef.get(ref);
    if (!a || !(q >= 1 && q <= QTE_MAX)) { refus.push({ ref, motif: 'article inconnu ou quantité invalide' }); continue; }
    if (a.devis) { refus.push({ ref, motif: 'colis de plus de 30 kg : sur devis' }); continue; }
    const s = (stock.stock || {})[ref];
    if (!s || s.s !== 'disponible') { refus.push({ ref, motif: 'indisponible chez le fournisseur' }); continue; }
    articles.push({ a, q });
    total += a.prix * q;
    poids += (a.poids || 0) * q;
  }
  if (refus.length) return { statut: 409, json: { erreur: 'panier', refus } };
  if (poids > POIDS_MAX_COLIS) return { statut: 409, json: { erreur: 'poids', poids: Math.round(poids * 10) / 10 } };

  // Un seul colis : un seul forfait d'expédition. Offre de lancement : appliquée avec le VRAI
  // code Stripe (mêmes limites de date et de nombre d'utilisations que sur les liens d'article).
  const maintenant = Date.now();
  const offreActive = !!(offre && offre.actif && offre.stripe_promotion_code
    && maintenant >= Date.parse(offre.debut) && maintenant <= Date.parse(offre.fin));
  const offert = offreActive && total >= offre.seuil;

  const line_items = articles.map(({ a, q }) => ({
    quantity: q,
    price_data: {
      currency: 'eur',
      unit_amount: Math.round(a.prix * 100),
      product_data: { name: ('[' + a.ref + '] ' + a.nom).slice(0, 250), images: a.img ? [a.img] : [] },
    },
  }));
  line_items.push({
    quantity: 1,
    price_data: { currency: 'eur', unit_amount: Math.round(catalogue.forfait_expedition * 100),
      product_data: { name: "Forfait d'expédition — un seul colis pour la commande" } },
  });

  const params = {
    mode: 'payment',
    line_items,
    locale: 'fr',
    shipping_address_collection: { allowed_countries: ['GF', 'FR'] },
    phone_number_collection: { enabled: true },
    client_reference_id: 'QP-' + maintenant,
    metadata: {
      panier: articles.map(({ a, q }) => q + 'x' + a.ref).join(',').slice(0, 500),
      poids_kg: poids.toFixed(2),
      offre: offert ? offre.code : '',
    },
    success_url: BOUTIQUE + '?paiement=succes&panier=1',
    cancel_url: BOUTIQUE + '#panier',
  };
  if (offert) params.discounts = [{ promotion_code: offre.stripe_promotion_code }];
  else params.allow_promotion_codes = true;
  const email = String(corps.email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) params.customer_email = email.slice(0, 200);

  try {
    const stripe = new Stripe(cleStripe, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.create(params);
    return { statut: 200, json: { url: session.url, offert } };
  } catch (e) {
    console.error('Création de la session Stripe impossible :', e.message);
    return { statut: 502, json: { erreur: 'stripe' } };
  }
}

module.exports = { creerSessionPanier };
