/* ==========================================================================
   EGREENCITY'S — Widget Alma (paiement 3× / 4× sans frais)
   ==========================================================================
   ACTIVATION :
   1. Créer un compte sur https://alma.eu/marchands
   2. Récupérer votre CLE PUBLIQUE dans dashboard.getalma.eu → Paramètres → API
   3. Remplacer ALMA_MERCHANT_ID ci-dessous par votre clé publique
   4. Charger ce fichier + le SDK Alma dans la page boutique
   ========================================================================== */

(function () {
  'use strict';

  // ⚠️ REMPLACER par votre clé publique Alma (commence par "live_" en production
  //    ou "test_" en environnement de test)
  var ALMA_MERCHANT_ID = 'test_A0000000000000000000000000';

  // Mode : "test" ou "production"
  var ALMA_MODE = 'test'; // Passer à "production" pour prod

  // Mapping produit → prix TTC en centimes (comme demande par Alma)
  var PRODUCTS = {
    'starter':  { name: 'WallBox Résidentielle 7 kW',   amount:  99900 },   // 999,00 €
    'standard': { name: 'WallBox Confort 22 kW',        amount: 199000 },   // 1 990,00 €
    'premium':  { name: 'WallBox Premium 2×22 kW',      amount: 349000 }    // 3 490,00 €
  };

  // ---- Injection du SDK Alma ----------------------------------------------
  function loadAlmaSDK(callback) {
    if (window.Alma) { callback(); return; }
    var script = document.createElement('script');
    script.src = ALMA_MODE === 'production'
      ? 'https://cdn.jsdelivr.net/npm/@alma/widgets@2/dist/index.umd.js'
      : 'https://cdn.jsdelivr.net/npm/@alma/widgets@2/dist/index.umd.js';
    script.onload = callback;
    script.onerror = function () {
      console.warn('[Alma] SDK non chargé — vérifiez CSP / connexion');
    };
    document.head.appendChild(script);
  }

  // ---- Rendre le badge éligibilité "Payez en 3× ou 4×" sur chaque carte ---
  function renderEligibilityBadges() {
    if (!window.Alma || !window.Alma.Widgets) return;

    var widgets = window.Alma.Widgets.initialize(ALMA_MERCHANT_ID, ALMA_MODE);

    // Sur chaque prix produit, ajouter un badge d'éligibilité
    document.querySelectorAll('.product-card').forEach(function (card, idx) {
      var priceEl = card.querySelector('.product-price');
      if (!priceEl) return;

      var badgeEl = document.createElement('div');
      badgeEl.className = 'alma-badge';
      badgeEl.setAttribute('data-alma-widget', 'payment-plans');
      priceEl.after(badgeEl);

      // Récupérer le modèle depuis le CTA
      var cta = card.querySelector('.product-cta');
      var model = cta && cta.href ? (cta.href.split('model=')[1] || 'starter') : 'starter';
      var product = PRODUCTS[model] || PRODUCTS.starter;

      widgets.add(window.Alma.Widgets.PaymentPlans, {
        container: badgeEl,
        purchaseAmount: product.amount,
        plans: [
          { installmentsCount: 3, minAmount: 5000,   maxAmount: 400000 },
          { installmentsCount: 4, minAmount: 5000,   maxAmount: 400000 }
        ]
      });
    });
  }

  // ---- Handler du bouton "Commander" : ouvre le checkout Alma -------------
  function handleOrderClick(evt) {
    var target = evt.target.closest('a[href^="#commande?model="]');
    if (!target) return;

    var model = target.href.split('model=')[1] || 'starter';
    var product = PRODUCTS[model];
    if (!product) return;

    // Vérifier que l'utilisateur est bien informé — laisser le comportement
    // normal (scroll vers le formulaire) puis stocker le modèle
    sessionStorage.setItem('egc_order_model', model);
    sessionStorage.setItem('egc_order_amount', product.amount);
  }

  // ---- Initialisation à charge de page -----------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    // 1. Attacher le handler aux liens Commander
    document.body.addEventListener('click', handleOrderClick);

    // 2. Charger Alma + rendre les badges (seulement si clé configurée)
    if (ALMA_MERCHANT_ID.indexOf('_A0000') === -1) {
      loadAlmaSDK(renderEligibilityBadges);
    } else {
      console.info('[Alma] Widget désactivé — clé publique par défaut détectée. ' +
                   'Éditez assets/js/alma-widget.js pour activer.');
    }
  });

  // Export pour utilisation externe (formulaire de commande)
  window.EGC_ALMA = {
    products: PRODUCTS,
    isConfigured: function () { return ALMA_MERCHANT_ID.indexOf('_A0000') === -1; }
  };

})();
