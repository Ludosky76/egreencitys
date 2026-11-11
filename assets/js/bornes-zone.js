/* Pages « bornes de recharge » : choix du département et adaptation du site.

   Une barre « Votre département » (Guyane, Guadeloupe, Martinique, France métropolitaine) est affichée
   sous le menu de toutes les pages. Le choix est le même que dans la boutique quincaillerie
   (clé egc_quinc_dest) ; à la première visite, il est proposé d'après le fuseau horaire de l'appareil
   (aucune donnée envoyée).

   Guyane : le site ne change pas. Ailleurs, l'installation de bornes n'est pas proposée : ni devis
   d'installation, ni achat, ni location — seulement une demande d'informations. */
(function () {
  'use strict';
  var CLE = 'egc_quinc_dest';
  var ORDRE = ['gf', 'gp', 'mq', 'fr'];
  var ZONES = {
    gf: { nom: 'Guyane', en: 'en Guyane' },
    gp: { nom: 'Guadeloupe', en: 'en Guadeloupe' },
    mq: { nom: 'Martinique', en: 'en Martinique' },
    fr: { nom: 'France métropolitaine', en: 'en France métropolitaine' }
  };
  var FUSEAUX = { 'America/Cayenne': 'gf', 'America/Guadeloupe': 'gp', 'America/Martinique': 'mq', 'Europe/Paris': 'fr' };
  var code = '';
  try { code = localStorage.getItem(CLE) || ''; } catch (e) {}
  if (!ZONES[code]) { try { code = FUSEAUX[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'gf'; } catch (e) { code = 'gf'; } }
  var z = ZONES[code];
  /* page de présentation de la quincaillerie : la barre seule, sans le message sur les bornes */
  var pageQuinc = /quincaillerie|packs-pro|carton-/.test(location.pathname);
  var guyane = code === 'gf' || pageQuinc;  /* « guyane » : rien à adapter sur cette page */

  var INFOS = 'Demander des informations';

  var st = document.createElement('style');
  st.textContent = '#egc-zone{background:#eef3ff;color:#1b2460;border-bottom:1px solid #cfd8f5;padding:.5rem 1rem;font-size:.9rem;line-height:1.45;text-align:center;position:relative;z-index:5}'
    + '#egc-zone.z-hors{background:#fff6dd;border-bottom-color:#e6cf8a}'
    + '#egc-zone select{font:inherit;padding:.3rem .5rem;border-radius:8px;border:1px solid #9aa8dd;background:#fff;color:#1b2460;max-width:100%;margin-left:.4rem}'
    + '#egc-zone p{margin:.5rem 0 0}'
    + '#egc-zone a.z-btn{display:inline-block;margin:.45rem .3rem 0;padding:.4rem .9rem;border-radius:999px;font-weight:700;text-decoration:none;background:#2A39C0;color:#fff}'
    + '#egc-zone a.z-btn.z-2{background:#fff;color:#2A39C0;border:1px solid #2A39C0}'
    /* hors Guyane : achat et paiement d'une borne masqués (les cartes de produits sont dessinées après coup, d'où une règle de style) */
    + (guyane ? '' : '.btn-add,.btn-stripe-direct,#btnStripeDirect,#btnCartStripe{display:none!important}');
  document.head.appendChild(st);

  function barre() {
    if (document.getElementById('egc-zone')) return;
    var b = document.createElement('div');
    b.id = 'egc-zone';
    if (!guyane) b.className = 'z-hors';
    b.innerHTML = '<label for="egc-zone-choix"><strong>📍 Votre département :</strong></label>'
      + '<select id="egc-zone-choix">' + ORDRE.map(function (c) {
        return '<option value="' + c + '"' + (c === code ? ' selected' : '') + '>' + ZONES[c].nom + '</option>';
      }).join('') + '</select>'
      + (guyane ? '' : '<p>L’installation de bornes de recharge est assurée en Guyane. Pour un projet ' + z.en + ', envoyez-nous une demande d’informations.</p>'
        + '<a class="z-btn" href="/pages/devis.html">' + INFOS + '</a>'
        + '<a class="z-btn z-2" href="/pages/boutique-quincaillerie.html">Outillage pro livré ' + z.en + '</a>');
    var nav = document.querySelector('body > nav, body > header');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(b, nav.nextSibling);
      /* menu fixe : la barre passerait dessous, on la décale de la hauteur du menu */
      if (/fixed/.test(getComputedStyle(nav).position)) b.style.marginTop = nav.offsetHeight + 'px';
    } else document.body.insertBefore(b, document.body.firstChild);
    var sel = document.getElementById('egc-zone-choix');
    sel.addEventListener('change', function () {
      try { localStorage.setItem(CLE, sel.value); } catch (e) {}
      location.reload();
    });
  }

  function adapter() {
    barre();
    if (guyane) return;
    /* liens « devis » : deviennent une demande d'informations */
    document.querySelectorAll('a[href*="devis"]').forEach(function (a) {
      if (a.closest('#egc-zone') || a.dataset.zone) return;
      a.dataset.zone = '1';
      /* location de bornes : offre réservée à la Guyane */
      if (/devis-location/.test(a.getAttribute('href'))) { a.style.display = 'none'; return; }
      if (/devis/i.test(a.textContent)) a.textContent = INFOS;
    });
    /* formulaire de devis : envoyé comme demande d'informations */
    var f = document.getElementById('devisForm');
    if (f && !f.dataset.zone) {
      f.dataset.zone = '1';
      var h1 = document.querySelector('h1');
      if (h1) h1.innerHTML = 'Votre <em>demande d’informations</em>';
      var s = f.querySelector('input[name="_subject"]');
      if (s) s.value = 'Demande d’informations (' + z.nom + ') — egreencitys.com';
      var c = f.querySelector('select[name="commune"]');
      if (c) { var o = document.createElement('option'); o.textContent = z.nom; c.insertBefore(o, c.firstChild); c.value = z.nom; }
      var bt = f.querySelector('button[type="submit"]');
      if (bt) bt.textContent = 'Envoyer ma demande d’informations →';
    }
    /* tout formulaire envoyé à l'équipe porte le département du visiteur */
    document.querySelectorAll('form[action*="formsubmit"]').forEach(function (g) {
      if (g.querySelector('input[name="territoire"]')) return;
      var t = document.createElement('input');
      t.type = 'hidden'; t.name = 'territoire'; t.value = z.nom;
      g.appendChild(t);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adapter); else adapter();
})();
