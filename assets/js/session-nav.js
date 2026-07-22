/* ==========================================================================
   EGREENCITY'S — Session & navigation globale
   ==========================================================================
   A inclure sur TOUTES les pages (apres customer-account.js).
   Role :
   - Affiche l'etat de connexion dans la barre de navigation
   - Transforme le lien "Mon compte" en menu utilisateur si connecte
     (Bonjour Prenom → Mon compte, Mes commandes, Suivi, Deconnexion)
   - Garde la session active pendant toute la navigation (localStorage)
   ========================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (!window.EGCCustomer) return; // customer-account.js requis
    var c = window.EGCCustomer.current();
    var loggedIn = !!(c && c.sessionActive);

    // Cherche tous les liens "compte" dans les barres de navigation
    var accountLinks = document.querySelectorAll(
      'nav a[href*="compte.html"], .nav-links a[href*="compte.html"]'
    );

    accountLinks.forEach(function (link) {
      if (loggedIn) {
        buildUserMenu(link, c);
      } else {
        // Deconnecte : libelle clair
        link.innerHTML = '👤 Connexion';
        link.style.fontWeight = '600';
      }
    });

    // Injecte le CSS du menu une seule fois
    if (loggedIn && !document.getElementById('egc-session-css')) {
      injectCss();
    }
  });

  function buildUserMenu(link, c) {
    // Remplace le lien par un conteneur avec dropdown
    var wrap = document.createElement('span');
    wrap.className = 'egc-user-menu';
    wrap.innerHTML = ''
      + '<button type="button" class="egc-user-btn" aria-haspopup="true" aria-expanded="false">'
      +   '<span class="egc-avatar">' + initials(c) + '</span>'
      +   '<span class="egc-hello">' + escapeHtml(c.prenom) + '</span>'
      +   '<span class="egc-caret">▾</span>'
      + '</button>'
      + '<div class="egc-dropdown" role="menu">'
      +   '<div class="egc-dd-head">'
      +     '<div class="egc-dd-name">' + escapeHtml(c.prenom + ' ' + c.nom) + '</div>'
      +     '<div class="egc-dd-email">' + escapeHtml(c.email) + '</div>'
      +   '</div>'
      +   '<a href="/pages/compte.html" role="menuitem">👤 Mon compte</a>'
      +   '<a href="/pages/compte.html#commandes" role="menuitem">📦 Mes commandes</a>'
      +   '<a href="/pages/suivi.html" role="menuitem">🔍 Suivre une commande</a>'
      +   '<a href="/pages/boutique-wallbox.html" role="menuitem">🛒 Boutique</a>'
      +   '<button type="button" class="egc-logout" role="menuitem">🚪 Se déconnecter</button>'
      + '</div>';

    link.parentNode.replaceChild(wrap, link);

    var btn = wrap.querySelector('.egc-user-btn');
    var dd = wrap.querySelector('.egc-dropdown');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.querySelector('.egc-logout').addEventListener('click', function () {
      window.EGCCustomer.signOut();
      // Recharge pour rafraichir toute la nav
      location.reload();
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initials(c) {
    var a = (c.prenom || '?').charAt(0);
    var b = (c.nom || '').charAt(0);
    return (a + b).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function injectCss() {
    var css = document.createElement('style');
    css.id = 'egc-session-css';
    css.textContent = [
      '.egc-user-menu{position:relative;display:inline-block;}',
      '.egc-user-btn{display:inline-flex;align-items:center;gap:.5rem;background:rgba(51,204,0,.12);',
      '  border:1px solid rgba(51,204,0,.3);color:#0a4800;padding:.35rem .7rem .35rem .4rem;',
      '  border-radius:50px;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600;',
      '  transition:all .2s;}',
      '.egc-user-btn:hover{background:rgba(51,204,0,.2);border-color:#33CC00;}',
      '.egc-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#33CC00,#0a4800);',
      '  color:#fff;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;}',
      '.egc-hello{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.egc-caret{font-size:.6rem;opacity:.7;}',
      '.egc-dropdown{position:absolute;top:calc(100% + 8px);right:0;min-width:230px;background:#fff;',
      '  border:1px solid #e0ebd8;border-radius:14px;box-shadow:0 12px 40px rgba(10,72,0,.18);',
      '  padding:.5rem;opacity:0;transform:translateY(-8px);pointer-events:none;transition:all .2s;z-index:2000;}',
      '.egc-user-menu.open .egc-dropdown{opacity:1;transform:translateY(0);pointer-events:auto;}',
      '.egc-dd-head{padding:.7rem .8rem;border-bottom:1px solid #eef3e9;margin-bottom:.4rem;}',
      '.egc-dd-name{font-weight:800;color:#0a4800;font-size:.9rem;}',
      '.egc-dd-email{font-size:.75rem;color:#4a6a40;margin-top:.15rem;overflow:hidden;text-overflow:ellipsis;}',
      '.egc-dropdown a,.egc-dropdown .egc-logout{display:block;width:100%;text-align:left;padding:.6rem .8rem;',
      '  border-radius:8px;text-decoration:none;color:#1a3a00;font-size:.85rem;font-family:inherit;',
      '  border:none;background:none;cursor:pointer;transition:background .15s;}',
      '.egc-dropdown a:hover,.egc-dropdown .egc-logout:hover{background:#f4fff0;}',
      '.egc-logout{color:#c62828!important;border-top:1px solid #eef3e9;margin-top:.3rem;}',
      '@media(max-width:768px){.egc-hello{max-width:80px;}}'
    ].join('\n');
    document.head.appendChild(css);
  }

})();
