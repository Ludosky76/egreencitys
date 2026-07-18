/* ==========================================================================
   EGREENCITY'S — Refonte JS v1.0
   Micro-interactions : scroll-top, reveal-on-scroll
   ========================================================================== */
(function () {
  'use strict';

  // ---- 1. Reveal-on-scroll via IntersectionObserver -----------------------
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    // Applique .reveal automatiquement aux sections / cards principales
    var autoTargets = document.querySelectorAll(
      'section > .container, section > .content, .card, [class*="card"], .feature, .stat-card'
    );
    autoTargets.forEach(function (el) {
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
      revealObserver.observe(el);
    });

    // Elements déjà taggés .reveal manuellement
    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  // ---- 2. Bouton scroll-to-top --------------------------------------------
  var btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Retour en haut');
  btn.setAttribute('title', 'Retour en haut');
  btn.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(btn);

  var toggleScrollTop = function () {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', toggleScrollTop, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- 3. Nav .scrolled (backup si pas géré ailleurs) --------------------
  var nav = document.querySelector('nav');
  if (nav) {
    var toggleNav = function () {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', toggleNav, { passive: true });
    toggleNav();
  }

  // ---- 4. Smooth focus quand on ancre (fix scroll offset nav fixe) --------
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href.length > 1) {
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
        }
      }
    });
  });

})();
