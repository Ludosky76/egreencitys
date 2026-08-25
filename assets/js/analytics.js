/* ==========================================================================
   EGREENCITY'S — Mesure d'audience (GA4)
   ==========================================================================
   Expose window.EGCLoadAnalytics() et ne charge Google Analytics QUE si le
   visiteur a donné son consentement (localStorage "cookieConsent" = accept).
   Le recueil du consentement est assuré par consent.js, présent sur toutes
   les pages. Les deux fichiers vont toujours de pair.
   ========================================================================== */
(function () {
  'use strict';
  var GA_ID = 'G-MPRFT15BDP';

  window.EGCLoadAnalytics = function () {
    if (window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  };

  // Consentement déjà donné lors d'une visite précédente : on charge tout de suite.
  try {
    if (localStorage.getItem('cookieConsent') === 'accept') window.EGCLoadAnalytics();
  } catch (e) { /* stockage indisponible : on ne charge rien */ }
})();
