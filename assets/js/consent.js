/* ==========================================================================
   EGREENCITY'S — Bandeau de consentement cookies (RGPD / CNIL)
   ==========================================================================
   À inclure sur TOUTES les pages, avec analytics.js. Le bandeau était
   auparavant codé en dur dans l'accueil : les visiteurs arrivant par la
   recherche sur un article ou une page commune n'avaient aucun moyen
   d'accepter ni de refuser.

   - Affiche le bandeau tant qu'aucun choix n'a été fait
   - Ne charge la mesure d'audience qu'après acceptation explicite
   - Expose window.resetCookieConsent() pour revenir sur son choix
     (RGPD art. 7.3 : le retrait doit être aussi simple que le consentement)
   ========================================================================== */
(function () {
  'use strict';

  function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var VERT = '#0a4800', VERT_VIF = '#33CC00';

  function construireBandeau() {
    if (document.getElementById('egc-cookie-banner')) return null;
    var b = document.createElement('div');
    b.id = 'egc-cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-live', 'polite');
    b.setAttribute('aria-label', 'Gestion des cookies');
    b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#fff;'
      + 'box-shadow:0 -4px 28px rgba(0,0,0,.15);padding:1.4rem 1.6rem;border-top:3px solid ' + VERT_VIF + ';'
      + 'font-family:inherit;display:none;';
    b.innerHTML = ''
      + '<div style="max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:1.2rem;align-items:center;justify-content:space-between;">'
      +   '<div style="flex:1;min-width:260px;">'
      +     '<div style="color:' + VERT + ';font-size:1rem;font-weight:700;margin-bottom:.35rem;">🍪 Respect de votre vie privée</div>'
      +     '<p style="color:#1a3a00;font-size:.84rem;line-height:1.55;margin:0;">'
      +       'Ce site utilise uniquement des cookies de <strong>mesure d\'audience anonymisée</strong> '
      +       '(Google Analytics 4, adresse IP anonymisée). <strong>Aucun cookie publicitaire</strong>, aucun profilage. '
      +       'Vous pouvez accepter ou refuser, et revenir sur votre choix à tout moment. '
      +       '<a href="/pages/legal/mentions-legales.html#cookies" style="color:' + VERT + ';font-weight:600;">En savoir plus</a>'
      +     '</p>'
      +   '</div>'
      +   '<div style="display:flex;gap:.6rem;flex-wrap:wrap;">'
      +     '<button type="button" data-choix="refuse" style="padding:.7rem 1.3rem;background:#fff;color:#1a3a00;border:2px solid #ddd;border-radius:50px;font-weight:600;cursor:pointer;font-size:.85rem;font-family:inherit;">Tout refuser</button>'
      +     '<button type="button" data-choix="accept" style="padding:.7rem 1.6rem;background:' + VERT + ';color:#fff;border:none;border-radius:50px;font-weight:700;cursor:pointer;font-size:.85rem;font-family:inherit;">Tout accepter ✓</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(b);
    b.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-choix]');
      if (btn) choisir(btn.getAttribute('data-choix'));
    });
    return b;
  }

  function choisir(choix) {
    ecrire('cookieConsent', choix);
    ecrire('cookieConsentDate', new Date().toISOString());
    var b = document.getElementById('egc-cookie-banner');
    if (b) b.style.display = 'none';
    if (choix === 'accept' && typeof window.EGCLoadAnalytics === 'function') window.EGCLoadAnalytics();
  }
  window.cookieChoice = choisir; // compatibilité avec l'ancien appel inline

  // Permet de revenir sur son choix (lien « Gérer mes cookies »)
  window.resetCookieConsent = function () {
    try { localStorage.removeItem('cookieConsent'); localStorage.removeItem('cookieConsentDate'); } catch (e) {}
    location.reload();
  };

  function demarrer() {
    if (lire('cookieConsent')) return; // choix déjà exprimé
    var b = construireBandeau();
    if (!b) return;
    setTimeout(function () { b.style.display = 'block'; }, 800);
  }

  if (document.readyState !== 'loading') demarrer();
  else document.addEventListener('DOMContentLoaded', demarrer);
})();
