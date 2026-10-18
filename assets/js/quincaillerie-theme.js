/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — mode nuit
   ==========================================================================
   Chargé SANS defer dans le <head> (avant le premier rendu) pour éviter un
   éclair blanc. Même convention que le reste du site : clé localStorage
   « theme » ('dark' / 'light'), attribut data-theme="dark" sur <html>.
   Sans préférence enregistrée, suit le réglage du système.
   ========================================================================== */
(function () {
  'use strict';

  function appliquer(sombre) {
    if (sombre) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  var memo = null;
  try { memo = localStorage.getItem('theme'); } catch (e) {}
  appliquer(memo === 'dark'
    || (!memo && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches));

  function majBouton() {
    var b = document.getElementById('q-theme');
    if (!b) return;
    var sombre = document.documentElement.getAttribute('data-theme') === 'dark';
    b.textContent = sombre ? '☀️' : '🌙';
    var titre = sombre ? 'Passer en thème clair' : 'Passer en thème sombre';
    b.setAttribute('title', titre);
    b.setAttribute('aria-label', titre);
  }

  function pret(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  pret(function () {
    var b = document.getElementById('q-theme');
    if (!b) return;
    majBouton();
    b.addEventListener('click', function () {
      var sombre = document.documentElement.getAttribute('data-theme') !== 'dark';
      appliquer(sombre);
      try { localStorage.setItem('theme', sombre ? 'dark' : 'light'); } catch (e) {}
      majBouton();
    });
  });
})();
