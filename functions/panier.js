/* Coeur du paiement des paniers de la quincaillerie (testable hors de Firebase).
   creerSessionPanier(corps, cleStripe) -> { statut, json } ; json.url = page de paiement Stripe. */
const Stripe = require('stripe');

const SITE = 'https://egreencitys.com';
const BOUTIQUE = SITE + '/pages/boutique-quincaillerie.html';
const POIDS_MAX_COLIS = 30; // kg — au-delà : devis
const QTE_MAX = 20; // par référence (toutes lignes confondues)
const REF_VALIDE = /^[A-Z0-9]{3,12}$/i;
const REF_HOLEX = /^HX[0-9A-F]{9}$/;
// gamme Milwaukee / Bosch (quincaillerie-marques.json) : sans carton, colis normal de la commande, disponibilité publiée avec la gamme
const REF_MARQUES = /^MB[0-9A-F]{9}$/;
// destinations de livraison : Guyane (par défaut, inchangée) ; les autres ont leurs prix et leur forfait publiés
// (quincaillerie-destinations.json, quincaillerie-prix-destinations.json) et ne sont payables que si panier_cb y est vrai
const DESTINATIONS = ['gf', 'gp', 'mq', 'fr'];
// batterie lithium vendue seule (UN3480, refusée au transport) : « Batterie… », ou kit/pack/set de batteries sans machine
const BATT_DEBUT = /^(batterie|batteries|accu|accus)\b/i;
const BATT_KIT = /^(kit|pack|set|lot)\b/i;
const BATT_MOT = /\b(batterie|batteries|accu|accus)\b/i;
const MACHINE = /\b(perceuse|visseuse|perforateur|meuleuse|scie|ponceuse|cl[ée] [àa] chocs?|boulonneuse|d[ée]fonceuse|rabot|marteau|burineur|lampe|projecteur|souffleur|tondeuse|taille-haies?|d[ée]broussailleuse|tron[çc]onneuse|aspirateur|radio|agrafeuse|cloueur|riveteuse|pistolet|polisseuse|multi-?outils?|outils?|malaxeur|cisaille|d[ée]capeur|niveau laser|laser)\b/i;
// pile au lithium vendue seule (UN3090/UN3091 sans équipement, refusée de même — audit du 04/11/2026) : l'article EST une pile
// (« Pile… », « 12 piles… », « Lot de 2 piles… ») de chimie lithium (CR2032, CR123, CRP2… sont au lithium, même libellées « alcaline ») ;
// un appareil livré avec sa pile (détecteur, télécommande…) reste autorisé
const PILE_DEBUT = /^((lot|pack|set|kit|blister|bo[iî]te|coffret)\s+(de\s+)?)?(\d+\s+)?piles?\b/i;
const LITHIUM = /\blithium\b|\bli-?ion\b|\blifepo4\b|\b[cb]r[- ]?(\d{3,4}|p2|2|123a?)\b|\b2cr5\b/i;
function batterieSeule(nom) {
  nom = String(nom || '').trim();
  return BATT_DEBUT.test(nom) || (BATT_KIT.test(nom) && BATT_MOT.test(nom) && !MACHINE.test(nom))
    || (PILE_DEBUT.test(nom) && LITHIUM.test(nom));
}
/* Gamme Milwaukee / Bosch (réf. MB) : libellés propres à ces marques (« Li-Ion Système M12B4, 4,0 Ah », « Accumulateur… »,
   « Bloc-batterie… », « Jeu de batteries… », « ProCORE… », « Bosch Professional Kit: 3 batteries… », kits « NRG » ou
   « Kit de démarrage » = batteries + chargeur sans machine). MÊME règle que le script privé de construction de la gamme (batterie_seule_mb)
   et assets/js/quincaillerie-shop.js (batterieSeuleMB) : toute modification se fait aux trois endroits.
   Dans le rayon (sr) d'une machine, « … à batterie » veut dire « sans fil » : seules la règle commune et NRG s'y appliquent.
   Limites de mot : (?:^|[^\p{L}\p{N}_]) … (?![\p{L}\p{N}_]) = \b de Python (lettres accentuées comprises). */
const MB_MARQUE = /^(milwaukee|bosch)(\s+professional)?\s*:?\s+/i;
const MB_CTX_BATT = /^(batter|accu|chargeur|piles?(?![\p{L}\p{N}_]))/iu;
const MB_SANS_BATT = /sans (batterie|accu)/i;
const MB_NRG = /nrg/i;
const MB_FORT = /^(bloc-?batteries?|accumulateurs?|li-?ion(?![\p{L}\p{N}_])|jeu de batteries|procore)/iu;
const MB_KIT_DEMARRAGE = /kit de d[ée]marrage/i;
const MB_KIT_BATT = /batter|\+|(?:^|[^\p{L}\p{N}_])(exba|gba)/iu;
const MB_MACHINE = new RegExp('(?:^|[^\\p{L}\\p{N}_])(perceuses?|visseuses?|perforateurs?|meuleuses?|scies?|ponceuses?|cl[ée]s?|boulonneuses?|d[ée]fonceuses?|rabots?|'
  + 'marteaux?|burineurs?|lampes?|projecteurs?|souffleurs?|tondeuses?|taille-haies?|d[ée]broussailleuses?|tron[çc]onneuses?|'
  + 'aspirateurs?|radios?|agrafeuses?|cloueurs?|riveteuses?|pistolets?|polisseuses?|multi-?outils?|outils?|malaxeurs?|'
  + 'cisailles?|d[ée]capeurs?|lasers?|voyants?|cam[ée]ras?|d[ée]tecteurs?|localisateurs?|appareils?|ventilateurs?|boosters?|'
  + 'inverseurs?|pompes?|sertisseuses?|coupe-?tubes?|torches?|enceintes?|vestes?|gilets?|machines?|tournevis|grignoteuses?|'
  + 'compresseurs?|gonfleurs?|d[ée]coupeuses?|t[ée]l[ée]m[èe]tres?|niveaux?|pulv[ée]risateurs?|tarauds?|vibrateurs?|pinces?|'
  + 'presses?|cliquets?|combi|power pack)(?![\\p{L}\\p{N}_])', 'iu');
const MB_CHARGEUR = /chargeur|charger|caricatore/i;
const MB_CHARGEUR_AVEC_BATT = /\+|battery|(?:^|[^\p{L}\p{N}_])(kit|pack)(?![\p{L}\p{N}_])/iu;
const MB_AH = /(?:^|[^\p{L}\p{N}_])\d+([.,]\d+)?\s*ah(?![\p{L}\p{N}_])/iu;
const MB_OBJET = /adaptateur|bo[iî]tier|bague|support|(?:^|[^\p{L}\p{N}_])sac(?![\p{L}\p{N}_])|accessoires?|station de charge/iu;
const MB_MOT_BATT = /(?:^|[^\p{L}\p{N}_])(batterie|batteries|battery|accu|accus|accumulateurs?|li-?ion)(?![\p{L}\p{N}_])/iu;
function batterieSeuleMB(nom, sr) {
  nom = String(nom || '').trim();
  const n = nom.replace(MB_MARQUE, '');
  if (batterieSeule(nom) || batterieSeule(n)) return true;
  if (MB_SANS_BATT.test(n)) return false;
  if (MB_NRG.test(n)) return true;                       // Milwaukee NRG : batteries + chargeur, sans machine
  sr = String(sr || '').trim();
  if (sr && !MB_CTX_BATT.test(sr)) return false;         // rayon d'une machine ou d'un accessoire
  if (MB_FORT.test(n) || (MB_KIT_DEMARRAGE.test(n) && MB_KIT_BATT.test(n))) return true;
  if (MB_MACHINE.test(n)) return false;
  if (MB_CHARGEUR.test(n) && !MB_CHARGEUR_AVEC_BATT.test(n) && !MB_AH.test(n)) return false;  // chargeur seul
  if (MB_OBJET.test(n)) return false;
  return MB_AH.test(n) || MB_MOT_BATT.test(n);
}
const CACHE_MS = 90 * 1000;
const cache = new Map(); // chemin -> { t, promesse } : une instance ne relit pas les 7 Mo publiés à chaque appel

/* Données publiées par le site : catalogue (prix tout compris), stock (automate horaire), offre.
   facultatif : un fichier ABSENT (404) vaut null ; une panne de lecture reste une erreur (on ne devine pas). */
function lireJson(chemin, facultatif) {
  const c = cache.get(chemin);
  if (c && Date.now() - c.t < CACHE_MS) return c.promesse;
  const promesse = telecharger(chemin, facultatif);
  cache.set(chemin, { t: Date.now(), promesse });
  promesse.catch(() => cache.delete(chemin));  // une panne n'est pas gardée en cache
  return promesse;
}
async function telecharger(chemin, facultatif) {
  const r = await fetch(SITE + chemin + (chemin.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / CACHE_MS));
  if (facultatif && r.status === 404) return null;
  if (!r.ok) throw new Error(chemin + ' : ' + r.status);
  return r.json();
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

/* erreur Stripe due au code promo lui-même (et non à une panne passagère) */
function refusDuCode(e) {
  return !!e && e.type === 'StripeInvalidRequestError'
    && (/discount|promotion|coupon/i.test(String(e.param || '')) || /promotion|coupon|code/i.test(String(e.message || '')));
}

/* source de la visite envoyée par la boutique ({ source, medium, campaign, content, fbclid }) -> metadata src_* :
   texte nettoyé, 100 caractères au plus, clé absente si vide ; fbclid : présence seulement ('1') */
function metadataSource(src) {
  const md = {};
  if (!src || typeof src !== 'object' || Array.isArray(src)) return md;
  for (const k of ['source', 'medium', 'campaign', 'content', 'fbclid']) {
    let v = typeof src[k] === 'string' ? src[k].replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 100).trim() : '';
    if (k === 'fbclid' && v) v = '1';
    if (v) md['src_' + k] = v;
  }
  return md;
}

async function creerSessionPanier(corps, cleStripe) {
  corps = (corps && typeof corps === 'object') ? corps : {};
  const lignes = Array.isArray(corps.panier) ? corps.panier : [];
  if (lignes.length === 0 || lignes.length > 50) return { statut: 400, json: { erreur: 'panier vide ou trop grand' } };

  // une réf. mal formée est refusée avant toute lecture ; quantités regroupées par réf. (QTE_MAX sur la somme)
  const qtes = new Map();
  for (const l of lignes) {
    const ref = l && typeof l.ref === 'string' ? l.ref.slice(0, 20) : '';
    const q = l && typeof l.q === 'number' ? Math.floor(l.q) : NaN;
    if (!REF_VALIDE.test(ref) || !(q >= 1 && q <= 1000)) return { statut: 400, json: { erreur: 'panier invalide' } };
    qtes.set(ref, (qtes.get(ref) || 0) + q);
  }
  const dest = corps.destination === undefined ? 'gf' : String(corps.destination);
  if (!DESTINATIONS.includes(dest)) return { statut: 400, json: { erreur: 'destination' } };
  const horsGuyane = dest !== 'gf';
  // Gamme Holex (réf. HX…) : catalogue à part, lu seulement si le panier en contient
  const avecHolex = [...qtes.keys()].some((r) => REF_HOLEX.test(r));
  const avecMarques = [...qtes.keys()].some((r) => REF_MARQUES.test(r));
  let catalogue, stock, offre, holex, reglages, destinations, prixDest, marques;
  try {
    [catalogue, stock, offre, holex, reglages, destinations, prixDest, marques] = await Promise.all([
      lireJson('/assets/data/quincaillerie-catalogue.json'),
      lireJson('/assets/data/quincaillerie-stock.json'),
      lireJson('/assets/data/quincaillerie-offre.json', true),
      avecHolex ? lireJson('/assets/data/quincaillerie-holex.json') : null,
      lireJson('/assets/data/quincaillerie-paiement.json', true),
      horsGuyane ? lireJson('/assets/data/quincaillerie-destinations.json') : null,
      horsGuyane ? lireJson('/assets/data/quincaillerie-prix-destinations.json') : null,
      // facultatif : gamme absente (404) = chaque réf. MB refusée « article inconnu » (409), le reste du panier n'est pas bloqué
      avecMarques ? lireJson('/assets/data/quincaillerie-marques.json', true) : null,
    ]);
  } catch (e) {
    console.error('Lecture des données du site impossible :', e.message);
    return { statut: 503, json: { erreur: 'donnees' } };
  }

  // autre destination que la Guyane : ouverte au paiement par carte, prix et forfait de la destination
  let reglDest = null, colonne = -1, forfait = catalogue.forfait_expedition;
  if (horsGuyane) {
    reglDest = destinations && destinations.destinations && destinations.destinations[dest];
    colonne = prixDest && Array.isArray(prixDest.colonnes) ? prixDest.colonnes.indexOf(dest) : -1;
    if (!reglDest || reglDest.panier_cb !== true || colonne < 0 || !(reglDest.forfait > 0 || (Array.isArray(reglDest.grille) && reglDest.grille.length)) || !/^[A-Z]{2}$/.test(String(reglDest.pays || ''))) {
      return { statut: 409, json: { erreur: 'destination_fermee' } };
    }
    forfait = reglDest.forfait;  // remplacé plus bas par la grille au poids, si la destination en a une
  }
  const parRef = new Map(catalogue.articles.map((a) => [a.ref, a]));
  if (holex) holex.articles.forEach((a) => parRef.set(a.ref, a));
  // réf. MB : seulement celles de la gamme Milwaukee / Bosch (jamais une réf. du catalogue remplacée)
  if (marques) marques.articles.forEach((a) => { if (REF_MARQUES.test(a.ref) && !a.pc) parRef.set(a.ref, a); });
  const articles = [], refus = [];
  let total = 0, poids = 0, points = 0, cartons = 0;
  const unitesCarton = [];
  for (const [ref, q] of qtes) {
    let a = parRef.get(ref);
    if (!a) { refus.push({ ref, motif: 'article inconnu' }); continue; }
    if (horsGuyane) {
      // gamme Holex (carton) et article non chiffré pour la destination : pas de paiement par carte
      const p = !a.pc && prixDest.prix && prixDest.prix[ref];
      if (!p || !(p[colonne] > 0)) { refus.push({ ref, motif: 'article non proposé pour cette destination' }); continue; }
      a = { ...a, prix: p[colonne] };
    }
    if (q > QTE_MAX) { refus.push({ ref, motif: 'au plus ' + QTE_MAX + ' exemplaires par article (au-delà : envoyez la commande, nous vous répondons)' }); continue; }
    // gamme Milwaukee / Bosch : marque en tête du nom et libellés propres à ces marques (batterieSeuleMB, nom + type de produit)
    if (batterieSeule(a.nom) || (REF_MARQUES.test(ref) && batterieSeuleMB(a.nom, a.sr))) { refus.push({ ref, motif: 'pile ou batterie au lithium vendue seule : interdite au transport aérien' }); continue; }
    if (a.devis) { refus.push({ ref, motif: 'colis de plus de 30 kg : sur devis' }); continue; }
    // Holex, Milwaukee / Bosch : disponibilité publiée avec leur gamme ; catalogue : relevé horaire (stock.json)
    const s = (a.pc || REF_MARQUES.test(ref)) ? { s: a.s } : (stock.stock || {})[ref];
    if (!s || !(s.s === 'disponible' || (a.pc && s.s === 'faible'))) { refus.push({ ref, motif: 'indisponible chez le fournisseur' }); continue; }
    articles.push({ a, q });
    total += a.prix * q;
    if (a.pc) { points += a.pc * q; for (let i = 0; i < q; i++) unitesCarton.push(a.poids || 0.5); } else poids += (a.poids || (horsGuyane ? 2 : 0)) * q;
  }
  if (refus.length) return { statut: 409, json: { erreur: 'panier', refus } };
  if (poids > POIDS_MAX_COLIS) return { statut: 409, json: { erreur: 'poids', poids: Math.round(poids * 10) / 10 } };
  // destination à grille : l'expédition est le prix de la tranche de poids de la commande
  if (horsGuyane && Array.isArray(reglDest.grille) && reglDest.grille.length) {
    const tranche = reglDest.grille.find((t) => poids <= t[0] + 1e-9) || reglDest.grille[reglDest.grille.length - 1];
    forfait = tranche[1];
    if (!(forfait > 0)) return { statut: 409, json: { erreur: 'destination_fermee' } };
  }
  // Carton Atelier : part seulement complet (minimum d'achat fournisseur) et dans sa limite de poids
  if (points > 0) {
    const c = holex.carton;
    // paiement par carte du Carton Atelier : seulement quand il est explicitement ouvert
    if (!(reglages && reglages.carton_cb === true)) return { statut: 409, json: { erreur: 'carton_cb' } };
    if (points < c.seuil_points) return { statut: 409, json: { erreur: 'carton' } };
    // plusieurs cartons de poids_max kg possibles (le 1er compris dans les prix, les suivants à la charge de la boutique), au plus cartons_max
    cartons = nbCartons(unitesCarton, c.poids_max);
    if (cartons > (c.cartons_max || 5)) {
      return { statut: 409, json: { erreur: 'cartons', cartons, max: c.cartons_max || 5 } };
    }
  }

  // Un seul colis : un seul forfait d'expédition. Offre de lancement : appliquée avec le VRAI
  // code Stripe (mêmes limites de date et de nombre d'utilisations que sur les liens d'article).
  const maintenant = Date.now();
  const offreActive = !horsGuyane && !!(offre && offre.actif && offre.stripe_promotion_code
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
  // Carton Atelier : le 1er carton est compris dans les prix ; les suivants sont à la charge de la boutique (rien de facturé)
  line_items.push({
    quantity: 1,
    price_data: { currency: 'eur', unit_amount: Math.round(forfait * 100),
      product_data: { name: horsGuyane ? 'Expédition — ' + poids.toFixed(1).replace('.', ',') + ' kg, un seul colis' : "Forfait d'expédition — un seul colis pour la commande" } },
  });

  const params = {
    mode: 'payment',
    line_items,
    locale: 'fr',
    shipping_address_collection: { allowed_countries: horsGuyane ? [reglDest.pays] : ['GF', 'FR'] },
    phone_number_collection: { enabled: true },
    client_reference_id: 'QP-' + maintenant,
    metadata: {
      ...decouper(articles.map(({ a, q }) => q + 'x' + a.ref)),
      poids_kg: poids.toFixed(2),
      carton_atelier: points > 0 ? unitesCarton.reduce((s, p) => s + p, 0).toFixed(2) + ' kg, ' + cartons + ' carton(s)' : '',
      cartons_sup: cartons > 1 ? String(cartons - 1) : '',
      offre: offert ? offre.code : '',
      destination: dest,
      ...metadataSource(corps.source),
    },
    success_url: BOUTIQUE + '?paiement=succes&panier=1&sid={CHECKOUT_SESSION_ID}',
    cancel_url: BOUTIQUE + '#panier',
    // page expirée (24 h par défaut, expires_at non fixé) : Stripe fournit un lien de reprise (recapPaiements, functions/recap.js)
    after_expiration: { recovery: { enabled: true, allow_promotion_codes: false } },
  };
  if (offert) params.discounts = [{ promotion_code: offre.stripe_promotion_code }];
  else if (!horsGuyane) params.allow_promotion_codes = true;  // codes de la boutique : conçus pour la Guyane
  const email = String(corps.email || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) params.customer_email = email.slice(0, 200);

  const stripe = new Stripe(cleStripe, { apiVersion: '2024-06-20' });
  try {
    const session = await stripe.checkout.sessions.create(params);
    return { statut: 200, json: { url: session.url, offert } };
  } catch (e) {
    console.error('Création de la session Stripe impossible :', e.message);
    if (!(params.discounts && refusDuCode(e))) return { statut: 502, json: { erreur: 'stripe' } };
  }
  // code de l'offre refusé par Stripe (200 utilisations atteintes, désactivé, expiré) : on encaisse sans l'offre
  {
    delete params.discounts;
    params.allow_promotion_codes = true;
    params.metadata.offre = '';
    try {
      const session = await stripe.checkout.sessions.create(params);
      return { statut: 200, json: { url: session.url, offert: false, offre_epuisee: true } };
    } catch (e) {
      console.error('Création de la session Stripe impossible (sans offre) :', e.message);
    }
  }
  return { statut: 502, json: { erreur: 'stripe' } };
}

module.exports = { creerSessionPanier, metadataSource, lireJson, decouper, nbCartons, batterieSeule, batterieSeuleMB, SITE, BOUTIQUE, QTE_MAX, REF_HOLEX, REF_MARQUES, DESTINATIONS };
