/* Pages « bornes de recharge » vues depuis la Guadeloupe, la Martinique ou la France métropolitaine.

   L'installation de bornes est assurée en Guyane seulement. Ailleurs, le site ne propose ni devis
   d'installation ni achat de borne : il invite à envoyer une demande d'informations.
   Le territoire est celui choisi dans la boutique quincaillerie (clé egc_quinc_dest), sinon il est
   proposé d'après le fuseau horaire de l'appareil (aucune donnée envoyée). Guyane : rien ne change. */
(function () {
  'use strict';
  var CLE = 'egc_quinc_dest';
  var ZONES = {
    gp: { nom: 'Guadeloupe', en: 'en Guadeloupe' },
    mq: { nom: 'Martinique', en: 'en Martinique' },
    fr: { nom: 'France métropolitaine', en: 'en France métropolitaine' }
  };
  var FUSEAUX = { 'America/Guadeloupe': 'gp', 'America/Martinique': 'mq', 'Europe/Paris': 'fr' };
  var code = '';
  try { code = localStorage.getItem(CLE) || ''; } catch (e) {}
  if (!code) { try { code = FUSEAUX[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'gf'; } catch (e) { code = 'gf'; } }
  var z = ZONES[code];
  if (!z) return;  /* Guyane */

  var INFOS = 'Demander des informations';

  /* achat et paiement d'une borne : masqués (les cartes de produits sont dessinées après coup, d'où une règle de style) */
  var st = document.createElement('style');
  st.textContent = '.btn-add,.btn-stripe-direct,#btnStripeDirect,#btnCartStripe{display:none!important}'
    + '#egc-zone{background:#fff6dd;color:#1b2460;border-bottom:1px solid #e6cf8a;padding:.7rem 1rem;font-size:.92rem;line-height:1.45;text-align:center;position:relative;z-index:5}'
    + '#egc-zone a.z-btn{display:inline-block;margin:.45rem .3rem 0;padding:.4rem .9rem;border-radius:999px;font-weight:700;text-decoration:none;background:#2A39C0;color:#fff}'
    + '#egc-zone a.z-btn.z-2{background:#fff;color:#2A39C0;border:1px solid #2A39C0}'
    + '#egc-zone button{font:inherit;font-size:.8rem;background:none;border:0;color:#5b6399;text-decoration:underline;cursor:pointer;margin-top:.35rem}';
  document.head.appendChild(st);

  function adapter() {
    /* bandeau d'explication, sous le menu */
    if (!document.getElementById('egc-zone')) {
      var b = document.createElement('div');
      b.id = 'egc-zone';
      b.innerHTML = '📍 <strong>' + z.nom + '</strong> : l’installation de bornes de recharge est assurée en Guyane. '
        + 'Pour un projet ' + z.en + ', envoyez-nous une demande d’informations.<br>'
        + '<a class="z-btn" href="/pages/devis.html">' + INFOS + '</a>'
        + '<a class="z-btn z-2" href="/pages/boutique-quincaillerie.html">Outillage pro livré ' + z.en + '</a><br>'
        + '<button type="button" id="egc-zone-gf">Vous êtes en Guyane ? Afficher le site Guyane</button>';
      var nav = document.querySelector('body > nav, body > header');
      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(b, nav.nextSibling);
        /* menu fixe : le bandeau passe dessous, on le décale de la hauteur du menu */
        if (/fixed/.test(getComputedStyle(nav).position)) b.style.marginTop = nav.offsetHeight + 'px';
      } else document.body.insertBefore(b, document.body.firstChild);
      document.getElementById('egc-zone-gf').addEventListener('click', function () {
        try { localStorage.setItem(CLE, 'gf'); } catch (e) {}
        location.reload();
      });
    }
    /* liens « devis » : deviennent une demande d'informations */
    document.querySelectorAll('a[href*="devis"]').forEach(function (a) {
      if (a.closest('#egc-zone') || a.dataset.zone) return;
      a.dataset.zone = '1';
      /* location de bornes : offre réservée à la Guyane */
      if (/devis-location/.test(a.getAttribute('href'))) { a.style.display = 'none'; return; }
      if (/devis/i.test(a.textContent)) a.textContent = INFOS;
    });
    /* formulaires de devis : envoyés comme demande d'informations, avec le territoire */
    var f = document.getElementById('devisForm') || document.querySelector('form[action*="formsubmit"]');
    if (f && !f.dataset.zone) {
      f.dataset.zone = '1';
      var h1 = document.querySelector('h1');
      if (h1) h1.innerHTML = 'Votre <em>demande d’informations</em>';
      var s = f.querySelector('input[name="_subject"]');
      if (s) s.value = 'Demande d’informations (' + z.nom + ') — egreencitys.com';
      var t = document.createElement('input');
      t.type = 'hidden'; t.name = 'territoire'; t.value = z.nom;
      f.appendChild(t);
      var c = f.querySelector('select[name="commune"]');
      if (c) { var o = document.createElement('option'); o.textContent = z.nom; c.insertBefore(o, c.firstChild); c.value = z.nom; }
      var bt = f.querySelector('button[type="submit"]');
      if (bt) bt.textContent = 'Envoyer ma demande d’informations →';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adapter); else adapter();
})();
