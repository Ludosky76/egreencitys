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
    var nav = document.querySelector('nav') || document.querySelector('header.ltopbar')
            || document.querySelector('header.topbar') || document.querySelector('header');
    if (!nav) return;

    injectCss();

    var navLinks = nav.querySelector('.nav-links');

    // Bouton "Boutique" toujours accessible dans la barre du haut
    // (toutes les pages sauf la boutique elle-meme)
    if (!/boutique-wallbox\.html/i.test(location.pathname)) {
      var shop = document.createElement('a');
      shop.className = 'egc-shop-btn' + (navLinks ? '' : ' egc-shop-btn--always');
      shop.href = '/pages/boutique-wallbox.html';
      shop.innerHTML = '🛒 Boutique';
      var shopHost = nav.querySelector('.ltopbar-inner') || nav.querySelector('.topbar-inner') || nav;
      var backLink = shopHost.querySelector('.lback') || shopHost.querySelector('.back-btn');
      if (backLink) shopHost.insertBefore(shop, backLink);
      else shopHost.appendChild(shop);
    }

    // Bouton WhatsApp flottant global (uniquement si la page n'en a pas deja un)
    if (!document.querySelector('.whatsapp-float, .egc-wa-float')) {
      var wa = document.createElement('a');
      wa.className = 'egc-wa-float' + (document.querySelector('.cart-pill, #cartPill') ? ' egc-wa-float--up' : '');
      wa.href = 'https://wa.me/33651141118?text=' + encodeURIComponent("Bonjour EGREENCITY'S, je vous contacte depuis votre site web pour...");
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.setAttribute('aria-label', 'Contactez-nous sur WhatsApp');
      wa.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
      document.body.appendChild(wa);
    }

    if (!navLinks) return; // pas de menu complet : pas de hamburger (bouton Boutique deja pose)

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
      /* Bouton Boutique persistant */
      '.egc-shop-btn{display:none;align-items:center;gap:.3rem;background:#33CC00;color:#fff!important;text-decoration:none;',
      '  font-weight:700;font-size:.82rem;line-height:1;padding:.55rem .95rem;border-radius:50px;',
      '  box-shadow:0 3px 12px rgba(51,204,0,.4);white-space:nowrap;transition:background .2s,transform .15s;}',
      '.egc-shop-btn:hover{background:#28a800;color:#fff!important;}',
      '.egc-shop-btn:active{transform:scale(.96);}',
      '.egc-shop-btn--always{display:inline-flex;margin-left:auto;margin-right:.55rem;}',
      /* WhatsApp flottant global */
      '.egc-wa-float{position:fixed;right:1.1rem;bottom:1.1rem;z-index:2500;width:56px;height:56px;',
      '  border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;',
      '  box-shadow:0 6px 20px rgba(37,211,102,.45);transition:transform .18s;}',
      '.egc-wa-float svg{width:30px;height:30px;}',
      '.egc-wa-float:hover{transform:scale(1.08);}',
      '.egc-wa-float--up{bottom:5.8rem;}',
      '@media(max-width:900px){',
      '  nav .nav-links{display:none!important;}',
      '  .egc-burger{display:flex;}',
      '  nav .egc-shop-btn{display:inline-flex;margin-left:auto;}',
      '  nav .egc-burger{margin-left:.5rem;}',
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
