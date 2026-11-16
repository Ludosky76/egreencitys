/* Récapitulatif quotidien des pages de paiement Stripe (Checkout) des dernières 24 h, envoyé au gérant.
   Une page de paiement expire 24 h après sa création (panier.js ne fixe pas expires_at) : on liste donc les sessions
   créées sur 48 h, on compte comme « créées / payées / ouvertes » celles des dernières 24 h, et on détaille aussi les
   non payées qui ont EXPIRÉ dans les dernières 24 h (créées la veille) : ce sont elles qui portent le lien de reprise.
   Testable hors de Firebase (functions/test_recap.js : faux objet stripe, faux notifier, sans réseau).
   recapPaiements({ stripe, notifier, destinataire, maintenant }) -> { sessions, payees, expirees, ouvertes, envoye, resultat? }
     stripe    : client Stripe (checkout.sessions.list) — clé restreinte, droit « Checkout Sessions » (écriture = lecture comprise)
     notifier  : creerNotifier(...) de functions/notifier.js (email({ to, nom, sujet, html, texte }))
   Aucune session créée ni expirée sur 24 h : aucun email. Email INTERNE (gérant) : jamais envoyé à un client. */

const FUSEAU = 'America/Cayenne';
const PAGES_MAX = 10;  // 10 x 100 sessions au plus par récapitulatif
const DESTINATIONS = { gf: 'Guyane', gp: 'Guadeloupe', mq: 'Martinique', fr: 'Métropole' };
const JOUR = 24 * 3600;
/* expiration d'une session (secondes) : expires_at, sinon création + 24 h (valeur par défaut de Stripe) */
function expiration(s) { return Number(s.expires_at) || (Number(s.created || 0) + JOUR); }

function echapper(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function euros(centimes) {
  return (Number(centimes || 0) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function heureGuyane(sec) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    .format(new Date(Number(sec || 0) * 1000));
}

/* sessions créées depuis « depuis » (secondes), toutes pages */
async function listerSessions(stripe, depuis) {
  const toutes = [];
  let apres;
  for (let i = 0; i < PAGES_MAX; i++) {
    const p = { limit: 100, created: { gte: depuis } };
    if (apres) p.starting_after = apres;
    const page = await stripe.checkout.sessions.list(p);
    const lot = (page && Array.isArray(page.data)) ? page.data : [];
    toutes.push(...lot);
    if (!page || !page.has_more || !lot.length) break;
    apres = lot[lot.length - 1].id;
  }
  return toutes;
}

/* détail d'une session non payée (champs absents = non affichés) */
function detail(s) {
  const md = s.metadata || {};
  const articles = [md.panier, md.panier_2, md.panier_3, md.panier_4].filter(Boolean).join(',')
    || (s.client_reference_id ? String(s.client_reference_id) : '');
  const src = ['source', 'medium', 'campaign', 'content'].map((k) => md['src_' + k]).filter(Boolean).join(' / ')
    + (md.src_fbclid ? (md.src_source || md.src_medium || md.src_campaign || md.src_content ? ' + ' : '') + 'clic Facebook' : '');
  const c = s.customer_details || {};
  const reprise = s.after_expiration && s.after_expiration.recovery && s.after_expiration.recovery.url;
  return {
    heure: heureGuyane(s.created),
    montant: euros(s.amount_total),
    statut: s.status === 'expired' ? 'expirée le ' + heureGuyane(expiration(s)) : s.status === 'open' ? 'ouverte' : String(s.status || ''),
    destination: DESTINATIONS[md.destination] || md.destination || '',
    articles,
    groupe: !!md.participation,
    source: src,
    email: c.email || s.customer_email || '',
    telephone: c.phone || '',
    reprise: reprise || '',
  };
}

/* contenu de l'email ; null si aucune session créée ni expirée depuis « depuis » (secondes ; absent = toutes les sessions)
   sessions : liste sur 48 h ; créées / payées / ouvertes = créées depuis « depuis » ; expirées = non payées expirées depuis « depuis » */
function construireRecap(sessions, depuis) {
  const d = Number(depuis) || -Infinity;
  const creees = sessions.filter((s) => Number(s.created || 0) >= d);
  const expireesListe = sessions.filter((s) => s.status === 'expired' && s.payment_status !== 'paid' && expiration(s) >= d);
  if (!creees.length && !expireesListe.length) return null;
  const payees = creees.filter((s) => s.payment_status === 'paid').length;
  const expirees = expireesListe.length;
  const ouvertes = creees.filter((s) => s.status === 'open').length;
  const vus = new Set();
  const nonPayees = creees.filter((s) => s.payment_status !== 'paid').concat(expireesListe)
    .filter((s) => !vus.has(s.id) && vus.add(s.id))
    .sort((a, b) => (a.created || 0) - (b.created || 0)).map(detail);
  const sujet = 'Paiements des dernières 24 h : ' + creees.length + ' créée(s), ' + payees + ' payée(s)' + (expirees ? ', ' + expirees + ' expirée(s)' : '');
  const resume = 'Pages de paiement créées : ' + creees.length + ' — payées : ' + payees + ' — ouvertes : ' + ouvertes + ' — expirées sans paiement (créées sur 48 h) : ' + expirees;

  const champs = (d) => [
    ['Statut', d.statut], ['Montant', d.montant], ['Destination', d.destination],
    ['Articles', d.articles + (d.groupe ? ' (carton groupé)' : '')], ['Source', d.source],
    ['E-mail', d.email], ['Téléphone', d.telephone], ['Lien de reprise', d.reprise],
  ].filter((x) => x[1]);

  const texte = [resume, ''].concat(nonPayees.length ? ['Non payées (' + nonPayees.length + ') :'] : ['Toutes les pages créées ont été payées.'])
    .concat(...nonPayees.map((d) => ['', '— ' + d.heure + ' (heure de Guyane)'].concat(champs(d).map((x) => '  ' + x[0] + ' : ' + x[1]))))
    .join('\n');

  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">'
    + '<p><strong>' + echapper(resume) + '</strong></p>'
    + (nonPayees.length
      ? '<p>Non payées (' + nonPayees.length + ') :</p>' + nonPayees.map((d) => '<table style="border-collapse:collapse;margin:0 0 14px;border:1px solid #ddd">'
        + '<tr><th colspan="2" style="text-align:left;background:#f3f3f3;padding:6px 8px">' + echapper(d.heure) + ' (heure de Guyane)</th></tr>'
        + champs(d).map((x) => '<tr><td style="padding:4px 8px;color:#666;vertical-align:top">' + echapper(x[0]) + '</td><td style="padding:4px 8px">'
          + (x[0] === 'Lien de reprise' ? '<a href="' + echapper(x[1]) + '">' + echapper(x[1]) + '</a>'
            : x[0] === 'E-mail' ? '<a href="mailto:' + echapper(x[1]) + '">' + echapper(x[1]) + '</a>' : echapper(x[1])) + '</td></tr>').join('')
        + '</table>').join('')
      : '<p>Toutes les pages créées ont été payées.</p>')
    + '</div>';
  return { sujet, html, texte, creees: creees.length, payees, expirees, ouvertes };
}

async function recapPaiements(ctx) {
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant() : Date.now();
  const depuis = Math.floor(maintenant / 1000) - JOUR;
  const sessions = await listerSessions(ctx.stripe, depuis - JOUR);  // 48 h : pages expirées dans les dernières 24 h
  const r = construireRecap(sessions, depuis);
  if (!r) return { sessions: 0, payees: 0, expirees: 0, ouvertes: 0, envoye: false };
  const resultat = await ctx.notifier.email({ to: ctx.destinataire, nom: "EGREENCITY'S", sujet: r.sujet, html: r.html, texte: r.texte });
  return { sessions: r.creees, payees: r.payees, expirees: r.expirees, ouvertes: r.ouvertes, envoye: !!(resultat && resultat.ok), resultat };
}

module.exports = { recapPaiements, construireRecap, listerSessions, detail };
