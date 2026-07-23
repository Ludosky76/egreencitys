/* ==========================================================================
   EGREENCITY'S — Menu hamburger mobile (global)
   ==========================================================================
   A inclure sur toutes les pages, APRES session-nav.js.
   - Ajoute un bouton hamburger visible < 900px
   - Ouvre un panneau lateral avec tous les liens de nav + etat du compte
   - Autonome : reconstruit les liens et l'etat de session lui-meme
   ========================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var navLinks = nav.querySelector('.nav-links');
    if (!navLinks) return;

    injectCss();

    // 1. Extraire les liens de navigation (hors menu compte transforme)
    var links = [];
    navLinks.querySelectorAll('a').forEach(function (a) {
      // Ignore les liens internes au menu utilisateur (dropdown)
      if (a.closest('.egc-dropdown')) return;
      var href = a.getAttribute('href');
      var label = a.textContent.trim();
      // Ignore les liens "compte" : la section compte en bas de panneau les gere
      if (href && /compte\.html/i.test(href)) return;
      if (href && label) links.push({ href: href, label: label });
    });

    // 2. Bouton hamburger
    var burger = document.createElement('button');
    burger.className = 'egc-burger';
    burger.setAttribute('aria-label', 'Menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(burger);

    // 3. Panneau + overlay
    var overlay = document.createElement('div');
    overlay.className = 'egc-mnav-overlay';

    var panel = document.createElement('div');
    panel.className = 'egc-mnav-panel';

    var c = window.EGCCustomer ? window.EGCCustomer.current() : null;
    var loggedIn = !!(c && c.sessionActive);

    var accountHtml;
    if (loggedIn) {
      accountHtml = ''
        + '<div class="egc-mnav-user">'
        +   '<div class="egc-mnav-avatar">' + initials(c) + '</div>'
        +   '<div><div class="egc-mnav-name">' + esc(c.prenom + ' ' + c.nom) + '</div>'
        +   '<div class="egc-mnav-email">' + esc(c.email) + '</div></div>'
        + '</div>'
        + '<a href="/pages/compte.html">👤 Mon compte</a>'
        + '<a href="/pages/compte.html#commandes">📦 Mes commandes</a>'
        + '<a href="/pages/suivi.html">🔍 Suivre une commande</a>'
        + '<button type="button" class="egc-mnav-logout">🚪 Se déconnecter</button>';
    } else {
      accountHtml = '<a href="/pages/compte.html" class="egc-mnav-cta">👤 Connexion / Créer un compte</a>';
    }

    var linksHtml = links.map(function (l) {
      return '<a href="' + l.href + '">' + esc(l.label) + '</a>';
    }).join('');

    panel.innerHTML = ''
      + '<div class="egc-mnav-head">'
      +   '<img src="/logo.png" alt="EGREENCITY\'S" style="height:36px;">'
      +   '<button type="button" class="egc-mnav-close" aria-label="Fermer">×</button>'
      + '</div>'
      + '<div class="egc-mnav-links">' + linksHtml + '</div>'
      + '<div class="egc-mnav-account">' + accountHtml + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    function open() { overlay.classList.add('open'); panel.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { overlay.classList.remove('open'); panel.classList.remove('open'); document.body.style.overflow = ''; }

    burger.addEventListener('click', open);
    overlay.addEventListener('click', close);
    panel.querySelector('.egc-mnav-close').addEventListener('click', close);

    var logout = panel.querySelector('.egc-mnav-logout');
    if (logout) logout.addEventListener('click', function () {
      if (window.EGCCustomer) window.EGCCustomer.signOut();
      location.reload();
    });
  });

  function initials(c) {
    return ((c.prenom || '?').charAt(0) + (c.nom || '').charAt(0)).toUpperCase();
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function injectCss() {
    if (document.getElementById('egc-mnav-css')) return;
    var s = document.createElement('style');
    s.id = 'egc-mnav-css';
    s.textContent = [
      /* Hamburger caché en desktop, visible en mobile */
      '.egc-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:44px;height:44px;',
      '  background:none;border:none;cursor:pointer;padding:0;margin-left:auto;}',
      '.egc-burger span{display:block;width:26px;height:3px;background:#0a4800;border-radius:3px;transition:.25s;margin:0 auto;}',
      '@media(max-width:900px){',
      '  nav .nav-links{display:none!important;}',
      '  .egc-burger{display:flex;}',
      '}',
      /* Overlay */
      '.egc-mnav-overlay{position:fixed;inset:0;background:rgba(8,26,0,.5);opacity:0;pointer-events:none;',
      '  transition:opacity .3s;z-index:3000;backdrop-filter:blur(2px);}',
      '.egc-mnav-overlay.open{opacity:1;pointer-events:auto;}',
      /* Panneau */
      '.egc-mnav-panel{position:fixed;top:0;right:-340px;width:320px;max-width:86vw;height:100vh;background:#fff;',
      '  z-index:3001;box-shadow:-8px 0 40px rgba(0,0,0,.2);transition:right .32s cubic-bezier(.4,0,.2,1);',
      '  display:flex;flex-direction:column;overflow-y:auto;font-family:inherit;}',
      '.egc-mnav-panel.open{right:0;}',
      '.egc-mnav-head{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.3rem;',
      '  border-bottom:1px solid #eef3e9;}',
      '.egc-mnav-close{background:none;border:none;font-size:2rem;line-height:1;color:#0a4800;cursor:pointer;}',
      '.egc-mnav-links{display:flex;flex-direction:column;padding:.8rem 0;}',
      '.egc-mnav-links a{padding:.9rem 1.4rem;text-decoration:none;color:#1a3a00;font-weight:600;font-size:1rem;',
      '  border-left:3px solid transparent;transition:.15s;}',
      '.egc-mnav-links a:hover{background:#f4fff0;border-left-color:#33CC00;color:#0a4800;}',
      '.egc-mnav-account{margin-top:auto;padding:1rem 1.4rem 1.6rem;border-top:1px solid #eef3e9;background:#f9fdf6;}',
      '.egc-mnav-account a,.egc-mnav-logout{display:block;padding:.7rem .2rem;text-decoration:none;color:#1a3a00;',
      '  font-size:.92rem;font-weight:600;background:none;border:none;width:100%;text-align:left;cursor:pointer;}',
      '.egc-mnav-account a:hover,.egc-mnav-logout:hover{color:#33CC00;}',
      '.egc-mnav-logout{color:#c62828;border-top:1px solid #eef3e9;margin-top:.4rem;padding-top:.8rem;}',
      '.egc-mnav-cta{background:#33CC00;color:#fff!important;text-align:center;border-radius:50px;padding:.85rem!important;',
      '  margin-top:.4rem;box-shadow:0 4px 14px rgba(51,204,0,.3);}',
      '.egc-mnav-user{display:flex;align-items:center;gap:.7rem;padding:.6rem 0 1rem;}',
      '.egc-mnav-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#33CC00,#0a4800);',
      '  color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;}',
      '.egc-mnav-name{font-weight:800;color:#0a4800;font-size:.95rem;}',
      '.egc-mnav-email{font-size:.78rem;color:#4a6a40;}'
    ].join('\n');
    document.head.appendChild(s);
  }

})();
