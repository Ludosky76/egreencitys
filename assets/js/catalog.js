/* ==========================================================================
   EGREENCITY'S — Catalogue boutique WallBox
   ==========================================================================
   IMPORTANT — FISCALITE GUYANE :
     - PAS de TVA (Guyane hors champ TVA, art. 294 CGI)
     - OCTROI DE MER preleve par la douane a la LIVRAISON (variable selon
       le taux applicable au produit, non connu a l'avance) - a la charge
       du destinataire final
     - Frais de livraison Chronopost DOM : forfait par gamme (voir SHIPPING)

   Structure de prix boutique :
     - Prix produit = HT fournisseur E-TOTEM * COEF_MARGE (arrondi marketing)
     - Frais livraison Chronopost DOM ajoutes au total
     - Total facture (sans TVA) = prix produit + frais livraison
     - Octroi de mer = a la charge du client, preleve a la livraison
   ========================================================================== */

/* ================================================================
   CONFIGURATION MARGE
   ================================================================
   COEF_MARGE :
     1.00 = prix coutant fournisseur (aucune marge)
     1.35 = +35 % (recommande dropshipping, DEFAUT)
     1.50 = +50 % (marge confortable)

   LIVRAISON :
     Les frais de livraison Chronopost DOM vers la Guyane NE SONT PAS
     forfaitaires. Ils dependent du poids reel du colis et de la commune
     de destination. Ils sont calcules par Chronopost et communiques au
     client AVANT la validation de la commande (devis).
     -> Le prix affiche en boutique = PRIX PRODUIT SEUL (hors livraison).
   ================================================================ */
window.CATALOG_CONFIG = {
  COEF_MARGE: 1.35,       // <-- Ajustez ici votre marge dropshipping
  DEVISE: '€',
  ARRONDI: 10,            // arrondi marketing a 10 € pres (donne 999, 1049, etc.)

  // OCTROI DE MER Guyane (TGOM 2026, delib. AP-2026-47) — code 8504.40
  // Bornes = convertisseurs statiques / chargeurs d'accumulateurs :
  //   Octroi de mer (OM externe)       : 17 %
  //   Octroi de mer regional (OMR ext.) :  3 %
  //   Total                             : 20 %
  // Preleve par la douane a la LIVRAISON, a la charge du destinataire.
  CODE_DOUANE:  '8504 40',
  OCTROI_OM:    0.17,     // octroi de mer externe
  OCTROI_OMR:   0.03,     // octroi de mer regional externe
  OCTROI_TOTAL: 0.20,     // total (17 % + 3 %)

  // Mentions legales / info affichees a divers endroits
  MENTION_TVA:    'Prix sans TVA (Guyane hors champ TVA - art. 294 CGI)',
  MENTION_OCTROI: 'Octroi de mer 20 % (code douanier 8504.40) preleve par la douane a la livraison, a la charge du destinataire',
  MENTION_LIVRAISON: 'Frais de livraison Chronopost DOM en sus, calculés selon le poids et votre commune, communiqués avant validation de commande'
};

/* Prix produit seul (sans livraison, sans TVA) */
window.priceProduct = function (htFournisseur) {
  var C = window.CATALOG_CONFIG;
  var raw = htFournisseur * C.COEF_MARGE;
  if (C.ARRONDI > 0) {
    var rounded = Math.round(raw / C.ARRONDI) * C.ARRONDI;
    return rounded - 1; // 999, 1049, 2349...
  }
  return Math.round(raw);
};

/* Alias pour retrocompatibilite (ex-priceTTC → maintenant priceProduct) */
window.priceTTC = window.priceProduct;

/* Octroi de mer (20 %) sur la valeur produit. */
window.octroiMer = function (montant) {
  return Math.round(montant * window.CATALOG_CONFIG.OCTROI_TOTAL);
};

/* ================================================================
   LIVRAISON FORFAITAIRE Chronopost DOM (littoral guyanais)
   ================================================================
   Grille par tranche de poids. Au-dela de 30 kg : transport palette.
   Base : Cayenne / Matoury / Remire / Macouria / Kourou.
   Communes isolees (Maripasoula, Saint-Georges) : supplement sur devis.
   ================================================================ */
window.shippingForWeight = function (kg) {
  var grid = [[1,35],[2,48],[5,72],[10,115],[15,165],[20,215],[25,270],[30,330]];
  for (var i = 0; i < grid.length; i++) {
    if (kg <= grid[i][0]) return grid[i][1];
  }
  return Math.round(380 + (kg - 30) * 4.5); // palette
};

/* Livraison forfaitaire pour un produit donne */
window.shippingFor = function (productId) {
  return window.shippingForWeight(window.weightFor(productId));
};

/* ================================================================
   PRIX TOUT COMPRIS (affiche et facture)
   ================================================================
   = (prix fournisseur x COEF_MARGE)   <- benefice EGREENCITY'S
   + octroi de mer 20 %                <- reverse a la douane
   + livraison Chronopost DOM          <- reverse au transporteur
   Le client paie ce montant en UNE SEULE FOIS.
   ================================================================ */
window.priceAllIn = function (htFournisseur, productId) {
  var base = window.priceProduct(htFournisseur);
  return base + window.octroiMer(base) + window.shippingFor(productId);
};

/* Detail de la decomposition (pour affichage transparent) */
window.priceBreakdown = function (htFournisseur, productId) {
  var base = window.priceProduct(htFournisseur);
  var octroi = window.octroiMer(base);
  var ship = window.shippingFor(productId);
  return {
    produit: base,
    octroi: octroi,
    livraison: ship,
    total: base + octroi + ship
  };
};

/* ================================================================
   POIDS REELS (kg) — pour le devis de livraison Chronopost DOM
   ================================================================
   Estimations d'apres les fiches E-TOTEM. Le colis > 30 kg necessite
   une palette (tarif Chronopost superieur / DPD palette).
   ================================================================ */
window.PRODUCT_WEIGHTS = {
  'wb-mur':      8,
  'wb-mur-rfid': 8,
  'wb-mur-7':    8,
  'wb-mur-22':   9,
  'wb-pied-7':  18,
  'wb-pied-22': 19,
  'sm7-mur-1':  15,
  'sm7-mur-2':  22,
  'sm7-pied-1': 30,
  'sm7-pied-2': 38,
  'sm22-mur-1': 15,
  'sm22-mur-2': 22,
  'sm22-pied-1':30,
  'sm22-pied-2':38,
  'prem-2x22':  60
};
window.weightFor = function (productId) {
  if (productId && productId.indexOf('wb-mur') === 0) return 8;  // toutes les combinaisons murale
  return window.PRODUCT_WEIGHTS[productId] || 15;
};

/* Formatage prix */
window.formatPrice = function (n) {
  return n.toLocaleString('fr-FR') + ' ' + window.CATALOG_CONFIG.DEVISE;
};


/* ================================================================
   📦 CATALOGUE PRODUITS (source E-TOTEM 2026)
   ================================================================ */
window.CATALOG = {

  // ---- Gamme e-WallBox (entree de gamme, particuliers) -------------
  wallbox: {
    title: 'e-WallBox',
    subtitle: 'Résidentiel et copropriété',
    description: 'Bornes wallbox murales et sur pied. Capot aluminium + plastique, lecteur RFID intégré, protections déportées à installer par l\'électricien IRVE.',
    icon: '🏠',
    color: '#33CC00',
    products: [
      {
        id: 'wb-mur',
        name: 'e-WallBox Murale',
        ht: 420,                 // borne e-Wallbox NG NUE (prix de base)
        configurable: true,      // carte configurateur : mono/tri + options a cocher
        phases: [
          { key: 'mono', label: 'Monophasé 7 kW', power: '7 kW AC · monophasé' },
          { key: 'tri',  label: 'Triphasé 22 kW', power: '22 kW AC · triphasé 32A' }
        ],
        // Options a cocher — l'ordre définit le suffixe de l'id Stripe (p,c,t,r).
        options: [
          { key: 'p', name: 'Prise Type 2S',       sub: 'connecteur de charge (indispensable)', ht: 196 },
          { key: 'c', name: 'Cache de finition',   sub: 'façade (si pas de RFID)',              ht: 56  },
          { key: 't', name: 'Transport métropole', sub: 'acheminement vers EGREENCITY\'S',       ht: 70  },
          { key: 'r', name: 'Lecteur RFID',        sub: 'badge d\'accès',                        ht: 84  }
        ],
        power: '7 kW mono ou 22 kW tri',
        pdc: 1,
        format: 'Murale',
        image: 'e-wallbox-murale.jpg',
        specs: [
          'Borne e-Wallbox NG — fabrication France E-TOTEM',
          'Configurable Monophasé 7 kW ou Triphasé 22 kW — même prix',
          'Prix de base = borne nue ; ajoutez vos options',
          'Prise Type 2S, cache, transport et lecteur RFID en options',
          'Protections différentielles à installer par un électricien IRVE',
        ],
        tag: 'Configurable mono / tri'
      },
      {
        id: 'wb-pied-7',
        name: 'e-WallBox sur Pied 1×7 kW',
        ht: 911,
        power: '7 kW AC · monophasé',
        pdc: 1,
        format: 'Sur pied',
        image: 'e-wallbox-pied.jpg',
        specs: [
          'Capot aluminium + plastique',
          '1 prise Type 2S verrouillable',
          'Avec pied intégré (installation extérieure)',
          'Lecteur RFID intégré',
          'Transport France métropole inclus',
          'Protections différentielles à installer',
        ]
      },
      {
        id: 'wb-pied-22',
        name: 'e-WallBox sur Pied 1×22 kW',
        ht: 1041,
        power: '22 kW AC · triphasé 32A',
        pdc: 1,
        format: 'Sur pied',
        image: 'e-wallbox-pied.jpg',
        specs: [
          'Capot aluminium + plastique',
          '1 prise Type 2S verrouillable',
          'Avec pied intégré (extérieur)',
          'Lecteur RFID intégré',
          'Transport France métropole inclus',
          'Protections différentielles à installer',
        ]
      }
    ]
  },

  // ---- Gamme e-Smart 7 kW (entreprises, zones commerciales) -------
  smart7: {
    title: 'e-Smart 7 kW',
    subtitle: 'Entreprises et zones commerciales',
    description: 'Bornes premium 7 kW avec capot fonderie aluminium, protections différentielles intégrées, compteur MID pour facturation.',
    icon: '⚡',
    color: '#28a800',
    products: [
      {
        id: 'sm7-mur-1',
        name: 'e-Smart 7 kW Murale 1 PDC',
        ht: 1485,
        power: '7 kW AC · 1 point',
        pdc: 1,
        format: 'Murale + plaque',
        image: 'e-smart-7kw-murale-1p.jpg',
        specs: [
          'Capot fonderie aluminium (robuste)',
          '1 prise Type 2S',
          'Lecteur RFID',
          'Protection différentielle intégrée',
          'Compteur MID (facturation légale)',
          'Plaque murale incluse',
          'Transport France métropole inclus',
        ],
        tag: 'PME · commerce'
      },
      {
        id: 'sm7-mur-2',
        name: 'e-Smart 7 kW Murale 2 PDC',
        ht: 2560,
        power: '2×7 kW AC (14 kW)',
        pdc: 2,
        format: 'Murale + potence',
        image: 'e-smart-7kw-murale-2p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '2 prises Type 2S (2 véhicules simultanés)',
          'Lecteur RFID',
          '2 protections différentielles intégrées',
          '2 compteurs MID',
          'Potence murale incluse',
          'Transport France métropole inclus',
        ]
      },
      {
        id: 'sm7-pied-1',
        name: 'e-Smart 7 kW sur Pied 1 PDC',
        ht: 1517,
        power: '7 kW AC · 1 point',
        pdc: 1,
        format: 'Sur pied',
        image: 'e-smart-7kw-pied-1p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '1 prise Type 2S',
          'Pied intégré (parking extérieur)',
          'Lecteur RFID',
          'Protection différentielle intégrée',
          'Compteur MID',
          'Transport France métropole inclus',
        ]
      },
      {
        id: 'sm7-pied-2',
        name: 'e-Smart 7 kW sur Pied 2 PDC',
        ht: 2572,
        power: '2×7 kW AC (14 kW)',
        pdc: 2,
        format: 'Sur pied',
        image: 'e-smart-7kw-pied-2p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '2 prises Type 2S',
          'Pied intégré',
          'Lecteur RFID',
          '2 protections différentielles',
          '2 compteurs MID',
          'Transport France métropole inclus',
        ]
      }
    ]
  },

  // ---- Gamme e-Smart 22 kW ----------------------------------------
  smart22: {
    title: 'e-Smart 22 kW',
    subtitle: 'Entreprises · recharge rapide',
    description: 'Bornes 22 kW triphasées — recharge complète en 1-2 h. Capot fonderie aluminium, écrans en option, borne maître pour supervision jusqu\'à 16 PDC.',
    icon: '⚡',
    color: '#0a4800',
    products: [
      {
        id: 'sm22-mur-1',
        name: 'e-Smart 22 kW Murale 1 PDC',
        ht: 1568,
        power: '22 kW AC triphasé',
        pdc: 1,
        format: 'Murale + plaque',
        image: 'e-smart-22kw-murale-1p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '1 prise Type 2S',
          'Lecteur RFID',
          'Protection différentielle intégrée',
          'Compteur MID (facturation légale)',
          'Plaque murale incluse',
          'Transport France métropole inclus',
        ],
        tag: 'Recommandé PME'
      },
      {
        id: 'sm22-mur-2',
        name: 'e-Smart 22 kW Murale 2 PDC',
        ht: 2727,
        power: '2×22 kW AC (44 kW)',
        pdc: 2,
        format: 'Murale + potence',
        image: 'e-smart-22kw-murale-2p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '2 prises Type 2S',
          'Lecteur RFID',
          '2 protections différentielles intégrées',
          '2 compteurs MID',
          'Potence murale incluse',
          'Transport France métropole inclus',
        ]
      },
      {
        id: 'sm22-pied-1',
        name: 'e-Smart 22 kW sur Pied 1 PDC',
        ht: 1599,
        power: '22 kW AC triphasé',
        pdc: 1,
        format: 'Sur pied',
        image: 'e-smart-22kw-pied-1p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '1 prise Type 2S',
          'Pied intégré (extérieur)',
          'Lecteur RFID',
          'Protection différentielle intégrée',
          'Compteur MID',
          'Transport France métropole inclus',
        ]
      },
      {
        id: 'sm22-pied-2',
        name: 'e-Smart 22 kW sur Pied 2 PDC',
        ht: 2739,
        power: '2×22 kW AC (44 kW)',
        pdc: 2,
        format: 'Sur pied',
        image: 'e-smart-22kw-pied-2p.jpg',
        specs: [
          'Capot fonderie aluminium',
          '2 prises Type 2S',
          'Pied intégré',
          'Lecteur RFID',
          '2 protections différentielles',
          '2 compteurs MID',
          'Transport France métropole inclus',
        ],
        tag: 'Top vente · hôtels'
      }
    ]
  },

  // ---- Gamme e-Premium AC (voirie publique, ADVENIR) -------------
  premium: {
    title: 'e-Premium AC',
    subtitle: 'Voirie publique · ADVENIR',
    description: 'Borne inox premium 2×22 kW dédiée aux collectivités. Parafoudre, TPE optionnel, écran couleur 10", peinture zone humide compatible tropical.',
    icon: '🏛️',
    color: '#2B4DB5',
    products: [
      {
        id: 'prem-2x22',
        name: 'e-Premium AC 2×22 kW',
        ht: 4948,
        power: '2×22 kW AC (44 kW)',
        pdc: 2,
        format: 'Sur pied inox',
        image: 'e-premium-ac.jpg',
        specs: [
          'Borne inox anti-vandalisme',
          '2 prises Type 2 + 2 prises E',
          'Lecteur RFID',
          '2 protections différentielles intégrées',
          '2 compteurs MID',
          'Parafoudre type 2',
          'Modèle du programme ADVENIR',
          'Transport France métropole inclus',
        ],
        tag: 'ADVENIR voirie publique'
      }
    ]
  }

};


/* ================================================================
   ⚙️ OPTIONS (add-ons transversales)
   ================================================================ */
window.CATALOG_OPTIONS = [
  { id: 'opt-modem-4g',       name: 'Modem 4G intégré (sans SIM)',                    ht: 104, gammes: ['smart7','smart22','wallbox'] },
  { id: 'opt-ecran',          name: 'Écran afficheur par PDC',                        ht: 224, gammes: ['smart7','smart22'] },
  { id: 'opt-ecran-10',       name: 'Écran 10" couleur tactile',                      ht: 648, gammes: ['premium'] },
  { id: 'opt-tpe-cb',         name: 'TPE CB sans contact (à la commande)',            ht: 837, gammes: ['premium'] },
  { id: 'opt-prise-e',        name: 'Prise E/F additionnelle',                        ht:  69, gammes: ['smart7','smart22'] },
  { id: 'opt-borne-maitre',   name: 'Borne maître (gère jusqu\'à 16 PDC)',            ht: 351, gammes: ['smart7','smart22'] },
  { id: 'opt-anti-graffiti',  name: 'Revêtement anti-graffiti',                       ht:  41, gammes: ['premium'] },
  { id: 'opt-peinture-humide',name: 'Peinture zone humide tropicale (DOM)',            ht: 203, gammes: ['premium','smart7','smart22'] },
  { id: 'opt-pied-pdl',       name: 'Pied PDL (préparation coffret CIBE)',            ht: 108, gammes: ['premium'] },
  { id: 'opt-personnalisation', name: 'Sérigraphie logo entreprise sur capot',        ht: 120, gammes: ['smart7','smart22','wallbox','premium'] }
];
