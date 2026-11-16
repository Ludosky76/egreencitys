/* Test local de functions/recap.js (et de metadataSource de panier.js) — sans réseau : node functions/test_recap.js */
const assert = require('assert');
const { recapPaiements, construireRecap } = require('./recap');

const MAINTENANT = Date.UTC(2026, 10, 16, 10, 0, 0);  // 16/11/2026 10 h UTC = 7 h en Guyane
const T = Math.floor(MAINTENANT / 1000);

function fauxStripe(sessions, parPage) {
  const appels = [];
  return {
    appels,
    checkout: { sessions: { list: async (p) => {
      appels.push(p);
      const tri = sessions.filter((s) => s.created >= p.created.gte).sort((a, b) => b.created - a.created);
      const debut = p.starting_after ? tri.findIndex((s) => s.id === p.starting_after) + 1 : 0;
      const data = tri.slice(debut, debut + Math.min(p.limit, parPage || 100));
      return { data, has_more: debut + data.length < tri.length };
    } } },
  };
}
function fauxNotifier() {
  const envois = [];
  return { envois, email: async (m) => { envois.push(m); return { ok: true, simule: true }; } };
}

const SESSIONS = [
  { id: 'cs_1', created: T - 3600, status: 'complete', payment_status: 'paid', amount_total: 15990, metadata: { panier: '1x688HX', destination: 'gf' } },
  // créée la veille (T - 30 h), expirée à T - 6 h (24 h après, sans expires_at fixé dans panier.js) : lien de reprise
  { id: 'cs_2', created: T - 30 * 3600, expires_at: T - 6 * 3600, status: 'expired', payment_status: 'unpaid', amount_total: 23450,
    metadata: { panier: '2x290HV,1x12345', destination: 'mq', src_source: 'facebook', src_medium: 'paid', src_campaign: 'chantier<ouvert>', src_fbclid: '1' },
    customer_details: { email: 'client@example.com', phone: '+594694000000' },
    after_expiration: { recovery: { enabled: true, url: 'https://checkout.stripe.com/c/pay/cs_recup' } } },
  { id: 'cs_3', created: T - 600, status: 'open', payment_status: 'unpaid', amount_total: 4200, metadata: { panier: '1x77777', destination: 'gf' }, customer_email: 'autre@example.com' },
  { id: 'cs_vieux', created: T - 50 * 3600, expires_at: T - 26 * 3600, status: 'expired', payment_status: 'unpaid', amount_total: 100, metadata: {} },
  // créée la veille et payée : ni comptée ni détaillée
  { id: 'cs_veille', created: T - 28 * 3600, status: 'complete', payment_status: 'paid', amount_total: 900, metadata: { panier: '1x55555' } },
  // créée sur 48 h mais expirée il y a plus de 24 h (expiration courte) : exclue
  { id: 'cs_exp_old', created: T - 47 * 3600, expires_at: T - 46 * 3600, status: 'expired', payment_status: 'unpaid', amount_total: 300, metadata: { panier: '1x66666' } },
  // sans expires_at : expiration = création + 24 h = T - 16 h, donc dans la fenêtre
  { id: 'cs_sans_exp', created: T - 40 * 3600, status: 'expired', payment_status: 'unpaid', amount_total: 1250, metadata: { panier: '1x44444', destination: 'fr' } },
];

(async () => {
  // 1. sessions listées sur 48 h, pagination (2 par page) ; créées / payées sur 24 h, expirées dans les dernières 24 h ; email au gérant
  const stripe = fauxStripe(SESSIONS, 2), notifier = fauxNotifier();
  const r = await recapPaiements({ stripe, notifier, destinataire: 'gerant@example.com', maintenant: () => MAINTENANT });
  assert.deepStrictEqual({ s: r.sessions, p: r.payees, e: r.expirees, o: r.ouvertes, env: r.envoye }, { s: 2, p: 1, e: 2, o: 1, env: true });
  assert.strictEqual(stripe.appels[0].created.gte, T - 48 * 3600);
  assert.strictEqual(stripe.appels.length, 3);
  assert.strictEqual(stripe.appels[1].starting_after, 'cs_1');
  assert.strictEqual(notifier.envois.length, 1);
  const m = notifier.envois[0];
  assert.strictEqual(m.to, 'gerant@example.com');
  assert.ok(/2 créée\(s\), 1 payée\(s\), 2 expirée\(s\)/.test(m.sujet), m.sujet);
  assert.ok(m.texte.includes('(créées sur 48 h) : 2') && m.texte.includes('ouvertes : 1'));
  assert.ok(m.texte.includes('Non payées (3)'));
  assert.ok(m.texte.includes('15/11 01:00'), 'heure de création, heure de Guyane (UTC-3)');
  assert.ok(m.texte.includes('expirée le 16/11 01:00'), 'heure d’expiration');
  assert.ok(m.texte.includes('12,50') && m.texte.includes('expirée le 15/11 15:00'), 'expiration par défaut : création + 24 h');
  assert.ok(m.texte.includes('234,50 €'));
  assert.ok(m.texte.includes('Martinique'));
  assert.ok(m.texte.includes('2x290HV,1x12345'));
  assert.ok(m.texte.includes('facebook / paid / chantier<ouvert> + clic Facebook'));
  assert.ok(m.texte.includes('client@example.com') && m.texte.includes('+594694000000') && m.texte.includes('autre@example.com'));
  assert.ok(m.texte.includes('https://checkout.stripe.com/c/pay/cs_recup'));
  assert.ok(!m.texte.includes('1x688HX') && !m.texte.includes('1x55555'), 'session payée : pas de détail');
  assert.ok(!m.texte.includes('1,00 €'), 'session de plus de 48 h exclue');
  assert.ok(!m.texte.includes('1x66666'), 'session expirée il y a plus de 24 h exclue');
  assert.ok(m.html.includes('chantier&lt;ouvert&gt;') && !m.html.includes('chantier<ouvert>'), 'HTML échappé');
  assert.ok(m.html.includes('<a href="https://checkout.stripe.com/c/pay/cs_recup">'));
  assert.ok(m.texte.indexOf('15/11 01:00') < m.texte.indexOf('16/11 06:50'), 'ordre chronologique');

  // 2. aucune session : pas d'email
  const n2 = fauxNotifier();
  const r2 = await recapPaiements({ stripe: fauxStripe([SESSIONS[3], SESSIONS[5]]), notifier: n2, destinataire: 'gerant@example.com', maintenant: () => MAINTENANT });
  assert.strictEqual(r2.envoye, false);
  assert.strictEqual(n2.envois.length, 0);
  assert.strictEqual(construireRecap([]), null);

  // 3. toutes payées : email sans détail
  const n3 = fauxNotifier();
  await recapPaiements({ stripe: fauxStripe([SESSIONS[0]]), notifier: n3, destinataire: 'gerant@example.com', maintenant: () => MAINTENANT });
  assert.ok(n3.envois[0].texte.includes('Toutes les pages créées ont été payées.'));

  // 4. metadataSource (panier.js) : nettoyage, 100 caractères, clés absentes si vides, fbclid = présence
  let panier = null;
  try { panier = require('./panier'); } catch (e) { console.log('panier.js non chargé (module stripe absent : npm install dans functions/) — test 4 sauté'); }
  if (panier) {
    const md = panier.metadataSource({ source: ' facebook\n', medium: '', campaign: 'x'.repeat(150), content: 12, fbclid: 'IwAR123456', autre: 'y' });
    assert.deepStrictEqual(md, { src_source: 'facebook', src_campaign: 'x'.repeat(100), src_fbclid: '1' });
    assert.deepStrictEqual(panier.metadataSource(null), {});
    assert.deepStrictEqual(panier.metadataSource(['a']), {});
    assert.deepStrictEqual(panier.metadataSource('facebook'), {});
  }

  console.log('test_recap : OK');
})().catch((e) => { console.error('test_recap : ÉCHEC', e); process.exit(1); });
