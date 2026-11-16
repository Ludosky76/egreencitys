/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — page « Vus sur notre Instagram » (/instagram/)
   ==========================================================================
   Liste des derniers produits publiés sur Instagram (lien de la bio).
   - /assets/data/quincaillerie-instagram.json : ref, date, lien de la publication
     (écrit par _tools/page_instagram.py, sans aucun prix) ;
   - nom, photo et prix : lus dans quincaillerie-catalogue.json, mis à la destination
     de livraison par quincaillerie-destination.js (même logique que la boutique) ;
   - article absent du catalogue (ou de la destination) ou « sur devis » : non affiché ;
   - les paramètres de suivi (utm_*, fbclid…) de l'adresse sont repris dans les liens.
   ========================================================================== */
(function () {
  'use strict';

  var DEST = window.EGCQDest || null;
  var ADR = window.EGCQUrl || { fiche: function (a) { return '/pages/produit-quincaillerie.html?ref=' + encodeURIComponent(a.ref); } };
  var SUIVI = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid)$/;

  function $(id) { return document.getElementById(id); }
  function eur(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  /* paramètres de suivi de l'adresse, ajoutés à un lien interne */
  var suivi = (function () {
    var p = new URLSearchParams();
    try { new URLSearchParams(location.search).forEach(function (v, k) { if (SUIVI.test(k)) p.set(k, v.slice(0, 100)); }); } catch (e) {}
    return p.toString();
  })();
  function avecSuivi(url) {
    if (!suivi) return url;
    var h = url.indexOf('#'), base = h < 0 ? url : url.slice(0, h), ancre = h < 0 ? '' : url.slice(h);
    return base + (base.indexOf('?') < 0 ? '?' : '&') + suivi + ancre;
  }
  function dateTexte(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  function carte(a, p, i, horsGuyane) {
    var fiche = avecSuivi(ADR.fiche(a));
    var taxe = horsGuyane ? '<span class="q-ttc">TTC</span>' : '<span class="q-ttc" title="Prix net : TVA non applicable en Guyane (art. 294 du CGI)">sans TVA</span>';
    var attrs = ' data-ref="' + esc(a.ref) + '" data-i="' + i + '"';
    return '<article class="q-card">'
      + '<a class="q-lien q-img' + (a.img ? '' : ' q-noimg') + '" href="' + esc(fiche) + '"' + attrs + '><img loading="lazy" src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
      + '<div class="q-body">'
      + '<div class="q-ref">Réf. ' + esc(a.ref) + (p.date ? ' · publié le ' + esc(dateTexte(p.date)) : '') + '</div>'
      + (a.marque ? '<div class="q-marque">' + esc(a.marque) + '</div>' : '')
      + '<a class="q-lien" href="' + esc(fiche) + '"' + attrs + '><h2 class="q-nom">' + esc(a.nom) + '</h2></a>'
      + '<div class="q-prix">' + eur(a.prix) + taxe + '</div>'
      + (a.lot > 1 ? '<div class="q-poids">Lot de ' + a.lot + ', soit ' + eur(a.prix / a.lot) + '/pièce</div>' : '')
      + '<div class="q-inclus">' + ((horsGuyane && DEST.info().inclus_court) || 'Octroi &amp; transport inclus* · + forfait') + '</div>'
      + '<div class="q-actions">'
      + '<a class="q-pay" href="' + esc(fiche) + '"' + attrs + '>Voir l’article</a>'
      + (p.lien ? '<a class="q-insta" href="' + esc(p.lien) + '" target="_blank" rel="noopener">Voir la publication</a>' : '')
      + '</div></div></article>';
  }

  /* GA4 : select_item au clic (seulement si la mesure d'audience est acceptée et chargée) */
  function suivreClics(liste) {
    $('q-grille').addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('a[data-ref]') : null;
      if (!t || typeof window.gtag !== 'function') return;
      var x = liste[+t.getAttribute('data-i')];
      if (!x) return;
      window.gtag('event', 'select_item', {
        item_list_id: 'instagram', item_list_name: 'Vus sur Instagram', transport_type: 'beacon',
        items: [{ item_id: x.a.ref, item_name: x.a.nom, item_brand: x.a.marque || undefined, price: x.a.prix, currency: 'EUR', index: +t.getAttribute('data-i') }]
      });
    });
  }

  document.querySelectorAll('a[data-suivi]').forEach(function (a) { a.setAttribute('href', avecSuivi(a.getAttribute('href'))); });

  Promise.all([
    fetch('/assets/data/quincaillerie-instagram.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
    fetch('/assets/data/quincaillerie-catalogue.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }),
    DEST ? DEST.pret : null
  ]).then(function (res) {
    var etat = { catalogue: res[1], liens: {}, offre: null, paiement: null, promo: null };
    var horsGuyane = !!DEST && !DEST.estGuyane();
    if (DEST) DEST.appliquer(etat);  /* prix de la destination ; article non chiffré retiré */
    var index = {};
    etat.catalogue.articles.forEach(function (a) { index[a.ref] = a; });
    var liste = ((res[0] && res[0].produits) || []).map(function (p) { return { p: p, a: index[p.ref] }; })
      .filter(function (x) { return x.a && !x.a.devis && x.a.prix > 0; });
    $('q-grille').innerHTML = liste.map(function (x, i) { return carte(x.a, x.p, i, horsGuyane); }).join('')
      || '<p class="q-vide">Aucun article à afficher pour le moment. <a href="' + esc(avecSuivi('/pages/boutique-quincaillerie.html')) + '">Voir toute la boutique</a></p>';
    suivreClics(liste);
  }).catch(function () {
    $('q-grille').innerHTML = '<p class="q-vide">La liste ne se charge pas. Rafraîchissez la page ou <a href="' + esc(avecSuivi('/pages/boutique-quincaillerie.html')) + '">voyez toute la boutique</a>.</p>';
  });
})();
