/* ==========================================================================
   EGREENCITY'S — Protection du contenu (dissuasive)
   ==========================================================================
   Chargé sur toutes les pages. Mesures volontairement proportionnées :
   - pas de clic droit ni de glisser-déposer sur les images ;
   - copie BLOQUÉE au-delà de 300 caractères (aspiration de contenu),
     remplacée par une mention de propriété ;
   - copie AUTORISÉE pour les champs de formulaire et les courtes
     sélections (téléphone, email, référence produit…) : l'expérience
     client n'est pas dégradée ;
   - Ctrl/Cmd+S (enregistrer la page) découragé.
   Ceci décourage la copie opportuniste ; aucune protection côté
   navigateur n'arrête un copieur déterminé — la vraie protection reste
   le droit d'auteur (mentions légales) et le robots.txt pour les IA.
   ========================================================================== */
(function () {
  'use strict';

  var LIMITE = 300; // caractères copiables librement
  var MENTION = "Contenu protégé — © EGREENCITY'S · https://egreencitys.com";

  function dansChamp(el) {
    return !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
  }

  var toastEl = null, toastTimer = null;
  function toast() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'background:rgba(10,20,8,.92);color:#fff;padding:.6rem 1.1rem;border-radius:50px;' +
        'font:600 .78rem Poppins,system-ui,sans-serif;z-index:99999;pointer-events:none;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .25s;opacity:0;';
      toastEl.textContent = '© EGREENCITY\'S — contenu protégé';
      document.body.appendChild(toastEl);
    }
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 1800);
  }

  /* Images : pas de menu contextuel ni de glisser-déposer */
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.closest && e.target.closest('img, svg, picture, canvas')) {
      e.preventDefault();
      toast();
    }
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SVG')) e.preventDefault();
  });

  /* Copie : libre dans les formulaires et pour les courtes sélections */
  document.addEventListener('copy', function (e) {
    if (dansChamp(e.target)) return;
    var sel = '';
    try { sel = String(window.getSelection ? window.getSelection() : ''); } catch (err) {}
    if (sel.length <= LIMITE) return;
    e.preventDefault();
    try { if (e.clipboardData) e.clipboardData.setData('text/plain', MENTION); } catch (err) {}
    toast();
  });
  document.addEventListener('cut', function (e) {
    if (!dansChamp(e.target)) e.preventDefault();
  });

  /* Enregistrement de la page */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      toast();
    }
  });
})();
