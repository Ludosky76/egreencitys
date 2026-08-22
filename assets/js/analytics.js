/* ==========================================================================
   EGREENCITY'S — Mesure d'audience partagée (GA4)
   ==========================================================================
   Charge Google Analytics 4 UNIQUEMENT si le visiteur a accepté les cookies.
   Le bandeau de consentement est géré par l'accueil (index.html) ; ce script
   se contente de respecter le choix stocké (localStorage "cookieConsent").
   À inclure sur toutes les pages hors accueil (l'accueil a déjà son loader).
   ========================================================================== */
(function () {
  'use strict';
  if (window.__analyticsLoaded) return;
  try {
    if (localStorage.getItem('cookieConsent') !== 'accept') return;
  } catch (e) { return; }
  window.__analyticsLoaded = true;

  var GA_ID = 'G-MPRFT15BDP';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });
})();
