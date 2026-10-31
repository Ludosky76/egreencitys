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

/* liste « 2xREF,1xREF » répartie sur panier, panier_2… (Stripe : 500 caractères par métadonnée) */
function decouper(elements) {
  const md = {};
  let cle = 'panier', n = 1, cour = '';
  for (const e of elements) {
    if (cour && (cour + ',' + e).length > 500) { md[cle] = cour; n += 1; cle = 'panier_' + n; cour = e; } else cour = cour ? cour + ',' + e : e;
  }
  if (cour) md[cle] = cour;
  return md;
}

/* nombre de cartons Carton Atelier : plus lourd d'abord, dans le premier carton où il reste de la place */
function nbCartons(unites, max) {
  const cartons = [];
  for (const p of unites.slice().sort((a, b) => b - a)) {
    const i = cartons.findIndex((c) => c + p <= max);
    if (i >= 0) cartons[i] += p; else cartons.push(p);
  }
  return Math.max(1, cartons.length);
}

async function creerSessionPanier(corps, cleStripe) {
  corps = (corps && typeof corps === 'object') ? corps : {};
  const lignes = Array.isArray(corps.panier) ? corps.panier : [];
  if (lignes.length === 0 || lignes.length > 50) return { statut: 400, json: { erreur: 'panier vide ou trop grand' } };

  // Gamme Holex (réf. HX…) : catalogue à part, lu seulement si le panier en contient
  const avecHolex = lignes.some((l) => /^HX/.test(String((l && l.ref) || '')));
  let catalogue, stock, offre, holex, reglages;
  try {
    [catalogue, stock, offre, holex, reglages] = await Promise.all([
      lireJson('/assets/data/quincaillerie-catalogue.json'),
      lireJson('/assets/data/quincaillerie-stock.json'),
      lireJson('/assets/data/quincaillerie-offre.json', true),
      avecHolex ? lireJson('/assets/data/quincaillerie-holex.json') : null,
      lireJson('/assets/data/quincaillerie-paiement.json', true),
    ]);
  } catch (e) {
    console.error('Lecture des données du site impossible :', e.message);
    return { statut: 503, json: { erreur: 'donnees' } };
  }

  const parRef = new Map(catalogue.articles.map((a) => [a.ref, a]));
  if (holex) holex.articles.forEach((a) => parRef.set(a.ref, a));
  const articles = [], refus = [];
  let total = 0, poids = 0, points = 0, cartons = 0;
  const unitesCarton = [];
  for (const l of lignes) {
    const ref = String((l && l.ref) || '').slice(0, 20);
    const q = Math.floor(Number(l && l.q));
    const a = parRef.get(ref);
    if (!a || !(q >= 1 && q <= QTE_MAX)) { refus.push({ ref, motif: 'article inconnu ou quantité invalide' }); continue; }
    if (a.devis) { refus.push({ ref, motif: 'colis de plus de 30 kg : sur devis' }); continue; }
    const s = a.pc ? { s: a.s } : (stock.stock || {})[ref];  // Holex : disponibilité publiée avec sa gamme
    if (!s || !(s.s === 'disponible' || (a.pc && s.s === 'faible'))) { refus.push({ ref, motif: 'indisponible chez le fournisseur' }); continue; }
    articles.push({ a, q });
    total += a.prix * q;
    if (a.pc) { points += a.pc * q; for (let i = 0; i < q; i++) unitesCarton.push(a.poids || 0.5); } else poids += (a.poids || 0) * q;
  }
  if (refus.length) return { statut: 409, json: { erreur: 'panier', refus } };
  if (poids > POIDS_MAX_COLIS) return { statut: 409, json: { erreur: 'poids', poids: Math.round(poids * 10) / 10 } };
  // Carton Atelier : part seulement complet (minimum d'achat fournisseur) et dans sa limite de poids
  if (points > 0) {
    const c = holex.carton;
    // paiement par carte du Carton Atelier : seulement quand il est explicitement ouvert
    if (!(reglages && reglages.carton_cb === true)) return { statut: 409, json: { erreur: 'carton_cb' } };
    if (points < c.seuil_points) return { statut: 409, json: { erreur: 'carton' } };
    // plusieurs cartons de poids_max kg possibles (transport compté au kilo dans les prix), au plus cartons_max
    cartons = nbCartons(unitesCarton, c.poids_max);
    if (cartons > (c.cartons_max || 5)) {
      return { statut: 409, json: { erreur: 'poids', poids: Math.round(unitesCarton.reduce((s, p) => s + p, 0) * 10) / 10 } };
    }
  }

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
      product_data: { name: ('[' + a.ref + '] ' + a.nom).slice(0, 250), images: a.img ? [/^https?:/.test(a.img) ? a.img : SITE + a.img] : [] },
    },
  }));
  // le 1er carton est compris dans le prix des articles Holex ; chaque carton en plus est facturé à part
  if (cartons > 1) line_items.push({
    quantity: cartons - 1,
    price_data: { currency: 'eur', unit_amount: Math.round((holex.carton.prix_carton || 150) * 100),
      product_data: { name: 'Carton Atelier supplémentaire (' + holex.carton.poids_max + ' kg max par carton)' } },
  });
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
      ...decouper(articles.map(({ a, q }) => q + 'x' + a.ref)),
      poids_kg: poids.toFixed(2),
      carton_atelier: points > 0 ? unitesCarton.reduce((s, p) => s + p, 0).toFixed(2) + ' kg, ' + cartons + ' carton(s)' : '',
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
