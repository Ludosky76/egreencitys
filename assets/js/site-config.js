/* ==========================================================================
   EGREENCITY'S — Configuration partagée du site
   ==========================================================================
   SOURCE UNIQUE des adresses de la boutique « PRO QUINCAILLERIE ».

   Depuis octobre 2026, la boutique quincaillerie est une PAGE INTERNE du
   site (/pages/boutique-quincaillerie.html) : catalogue statique + liens de
   paiement Stripe, plus aucun sous-domaine ni serveur dédié. Ce fichier
   réécrit les liens balisés data-egc-quincaillerie — y compris les anciens
   chemins profonds de l'époque « application séparée » (/compte, /devis,
   /cgv), redirigés vers leurs équivalents du site.

   Utilisation dans une page :
     <a href="#acces-boutique" data-egc-quincaillerie>…</a>
     <a href="#acces-boutique" data-egc-quincaillerie="/cgv">CGV</a>
   Le href écrit en dur (#acces-boutique) n'est qu'un repli sans JavaScript.
   L'attribut data-egc-quincaillerie-texte remplace aussi le TEXTE visible
   par l'adresse lisible (bloc de secours #acces-boutique).
   ========================================================================== */
(function (global) {
  'use strict';

  /* ── Adresse de la boutique quincaillerie (page interne) ────── */
  var QUINCAILLERIE_PAGE = '/pages/boutique-quincaillerie.html';

  /* Anciens chemins profonds de l'application séparée -> pages du site */
  var CHEMINS = {
    '/':             QUINCAILLERIE_PAGE,
    '/catalogue':    QUINCAILLERIE_PAGE,
    '/compte':       '/pages/suivi.html',
    '/compte/suivi': '/pages/suivi.html',
    '/devis':        '/pages/devis.html',
    '/cgv':          '/pages/legal/cgv.html'
  };

  /**
   * Adresse effective pour un chemin demandé.
   * @param {string} [chemin] ex. '/cgv' ou 'catalogue'
   * @returns {string}
   */
  function quincaillerieUrl(chemin) {
    if (!chemin) return QUINCAILLERIE_PAGE;
    var c = chemin.charAt(0) === '/' ? chemin : '/' + chemin;
    return CHEMINS[c] || QUINCAILLERIE_PAGE;
  }

  global.EGCSiteConfig = {
    quincailleriePage: QUINCAILLERIE_PAGE,
    /* conservés pour compatibilité avec d'anciens appels */
    quincaillerieProd:  QUINCAILLERIE_PAGE,
    quincaillerieLocal: QUINCAILLERIE_PAGE,
    estRecetteLocale:   function () { return false; },
    quincaillerieUrl:   quincaillerieUrl
  };

  /* ── Réécriture automatique des liens balisés ───────────────── */
  function appliquer() {
    var liens = document.querySelectorAll('[data-egc-quincaillerie]');
    for (var i = 0; i < liens.length; i++) {
      var chemin = liens[i].getAttribute('data-egc-quincaillerie') || '';
      var url = quincaillerieUrl(chemin);
      liens[i].setAttribute('href', url);
      /* Bloc de secours : adresse lisible, à recopier. textContent : aucun
         HTML injecté. */
      if (liens[i].hasAttribute('data-egc-quincaillerie-texte')) {
        liens[i].textContent = 'egreencitys.com' + url;
      }
    }
  }

  /* Première passe immédiate (script en bas de <body>) ; seconde passe pour
     les liens ajoutés plus tard. */
  appliquer();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appliquer);
  }
  global.EGCSiteConfig.appliquerLiens = appliquer;

})(window);
