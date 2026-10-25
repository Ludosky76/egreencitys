/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — adresses des pages statiques
   ==========================================================================
   Chaque produit et chaque rayon ont une page HTML statique, générée par
   _tools/quinc_pages_seo.py pour le référencement Google :
     /quincaillerie-pro/produit/<nom>-<ref>.html
     /quincaillerie-pro/rayon/<rayon>.html
   Le calcul du <nom> doit rester IDENTIQUE à slug() du script Python.
   ========================================================================== */
(function () {
  'use strict';

  function slug(nom) {
    var s = String(nom || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length > 70) {
      s = s.slice(0, 70);
      var i = s.lastIndexOf('-');
      if (i > 0) s = s.slice(0, i);
      s = s.replace(/-+$/, '');
    }
    return s;
  }

  window.EGCQUrl = {
    slug: slug,
    fiche: function (a) {
      var s = slug(a.nom);
      return '/quincaillerie-pro/produit/' + (s ? s + '-' : '') + String(a.ref).toLowerCase() + '.html';
    },
    rayon: function (slugRayon) { return '/quincaillerie-pro/rayon/' + slugRayon + '.html'; }
  };
})();
