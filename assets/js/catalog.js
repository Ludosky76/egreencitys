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
     - Prix produit = prix de vente (champ prix ; fixe hors de ce fichier)
     - Frais livraison Chronopost DOM ajoutes au total
     - Total facture (sans TVA) = prix produit + frais livraison
     - Octroi de mer = a la charge du client, preleve a la livraison
   ========================================================================== */

/* ================================================================
   CONFIGURATION
   ================================================================
   LIVRAISON :
     Les frais de livraison Chronopost DOM vers la Guyane NE SONT PAS
     forfaitaires. Ils dependent du poids reel du colis et de la commune
     de destination. Ils sont calcules par Chronopost et communiques au
     client AVANT la validation de la commande (devis).
     -> Le prix affiche en boutique = PRIX PRODUIT SEUL (hors livraison).
   ================================================================ */
window.CATALOG_CONFIG = {
  DEVISE: '€',

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

/* Prix produit seul (sans livraison, sans TVA) : le prix de vente du catalogue */
window.priceProduct = function (prix) {
  return prix;
};

/* Alias pour retrocompatibilite (ex-priceTTC → maintenant priceProduct) */
window.priceTTC = window.priceProduct;

/* Octroi de mer (20 %) sur la valeur produit. */
window.octroiMer = function (montant) {
  return Math.round(montant * window.CATALOG_CONFIG.OCTROI_TOTAL);
};

/* Prix d'une OPTION/accessoire : son prix de vente (supplement, pas de prix d'appel). */
window.priceOption = function (prix) {
  return prix;
};

/* ================================================================
   LIVRAISON Chronopost DOM — TARIF A9 (grille contractuelle)
   ================================================================
   Colonne A9 (metropole -> DOM) : 23,10 € la tranche 0-0,5 kg puis
   +3,90 € par tranche de 0,5 kg, borne basse incluse (8,00 kg =
   tranche 8,00-8,50 = 85,50 €). Au-dela de 30 kg : +3,90 € par
   0,5 kg supplementaire (« Pour tout 0,5 kg sup. » de la grille).
   Tarif appliqué tel quel, sans majoration.
   Communes isolees (Maripasoula, Saint-Georges) : supplement sur devis.
   ================================================================ */
window.shippingForWeight = function (kg) {
  var n = Math.floor(kg / 0.5);           // 8,00 kg -> tranche 8,00-8,50
  return (2310 + 390 * n) / 100;          // centimes : evite les flottants
};

/* Livraison forfaitaire pour un produit donne */
window.shippingFor = function (productId) {
  return window.shippingForWeight(window.weightFor(productId));
};

/* ================================================================
   PRIX TOUT COMPRIS (affiche et facture)
   ================================================================
   = prix de vente du produit
   + octroi de mer 20 %                <- reverse a la douane
   + livraison Chronopost DOM          <- reverse au transporteur
   Le client paie ce montant en UNE SEULE FOIS.
   ================================================================ */
window.priceAllIn = function (prix, productId) {
  var base = window.priceProduct(prix);
  return base + window.octroiMer(base) + window.shippingFor(productId);
};

/* Detail de la decomposition (pour affichage transparent) */
window.priceBreakdown = function (prix, productId) {
  var base = window.priceProduct(prix);
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
  if (productId && productId.indexOf('wb-mur') === 0) {
    // Murale : triphasee 22 kW = 9 kg (93,30 €), monophasee 7 kW = 8 kg (85,50 €)
    return (productId.indexOf('wb-mur-22') === 0 || productId.indexOf('wb-mur22') === 0) ? 9 : 8;
  }
  return window.PRODUCT_WEIGHTS[productId] || 15;
};

/* Formatage prix — centimes affiches seulement si necessaires (85,50 €) */
window.formatPrice = function (n) {
  var entier = Math.abs(n % 1) < 0.005;
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: entier ? 0 : 2,
    maximumFractionDigits: 2
  }) + ' ' + window.CATALOG_CONFIG.DEVISE;
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
        prix: 569,                 // borne e-Wallbox NG NUE — base MONOPHASÉ 7 kW
        prixTri: 689,              // borne NUE — base TRIPHASÉ 22 kW (config élec différente)
        configurable: true,      // carte configurateur : mono/tri + options a cocher
        phases: [
          { key: 'mono', label: 'Monophasé 7 kW', power: '7 kW AC · monophasé' },
          { key: 'tri',  label: 'Triphasé 22 kW', power: '22 kW AC · triphasé 32A' }
        ],
        // Options a cocher — l'ordre définit le suffixe de l'id Stripe (p,c,t,r).
        // Transport France métropole DÉJÀ inclus dans le prix de vente (pas d'option séparée).
        options: [
          { key: 'p', name: 'Prise Type 2S',       sub: 'connecteur de charge (indispensable)', prix: 216 },
          { key: 'c', name: 'Cache de finition',   sub: 'façade (si pas de RFID)',              prix: 62  },
          { key: 'r', name: 'Lecteur RFID',        sub: 'badge d\'accès',                        prix: 92  }
        ],
        power: '7 kW mono ou 22 kW tri',
        pdc: 1,
        format: 'Murale',
        image: 'e-wallbox-murale.jpg',
        specs: [
          'Borne e-Wallbox NG — fabrication France E-TOTEM',
          'Configurable Monophasé 7 kW ou Triphasé 22 kW',
          'Prix de base = borne nue ; ajoutez vos options',
          'Prise Type 2S, cache et lecteur RFID en options',
          'Transport France métropole inclus',
          'Protections différentielles à installer par un électricien IRVE',
        ],
        tag: 'Configurable mono / tri'
      },
      {
        id: 'wb-pied-7',
        name: 'e-WallBox sur Pied 1×7 kW',
        prix: 1229,
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
        prix: 1409,
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
        prix: 1999,
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
        prix: 3459,
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
        prix: 2049,
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
        prix: 3469,
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
        prix: 2119,
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
        prix: 3679,
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
        prix: 2159,
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
        prix: 3699,
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
        prix: 6679,
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
/* kg = surpoids estimé de l'option pour le calcul de la livraison (colis).
   Revêtements / sérigraphie = 0 (appliqués sur la borne, aucun surpoids). */
window.CATALOG_OPTIONS = [
  { id: 'opt-modem-4g',       name: 'Modem 4G intégré (sans SIM)',                    prix: 114, kg: 0.3, gammes: ['smart7','smart22','wallbox'] },
  { id: 'opt-ecran',          name: 'Écran afficheur par PDC',                        prix: 246, kg: 1.5, gammes: ['smart7','smart22'] },
  { id: 'opt-ecran-10',       name: 'Écran 10" couleur tactile',                      prix: 713, kg: 2.5, gammes: ['premium'] },
  { id: 'opt-tpe-cb',         name: 'TPE CB sans contact (à la commande)',            prix: 921, kg: 1.5, gammes: ['premium'] },
  { id: 'opt-prise-e',        name: 'Prise E/F additionnelle',                        prix: 76, kg: 0.5, gammes: ['smart7','smart22'] },
  { id: 'opt-borne-maitre',   name: 'Borne maître (gère jusqu\'à 16 PDC)',            prix: 386, kg: 0.5, gammes: ['smart7','smart22'] },
  { id: 'opt-anti-graffiti',  name: 'Revêtement anti-graffiti',                       prix: 45, kg: 0,   gammes: ['premium'] },
  { id: 'opt-peinture-humide',name: 'Peinture zone humide tropicale (DOM)',            prix: 223, kg: 0,   gammes: ['premium','smart7','smart22'] },
  { id: 'opt-pied-pdl',       name: 'Pied PDL (préparation coffret CIBE)',            prix: 119, kg: 6,   gammes: ['premium'] },
  { id: 'opt-personnalisation', name: 'Sérigraphie logo entreprise sur capot',        prix: 132, kg: 0,   gammes: ['smart7','smart22','wallbox','premium'] }
];


/* ================================================================
   🛠️ SERVICES COMPLEMENTAIRES (E-TOTEM) — abonnements & prestations
   ================================================================
   - Supervision FULL : proposée SUR DEVIS (tarif selon l'offre et l'engagement).
       Aucun octroi de mer (c'est un service, pas un bien importé).
   - Maintenance préventive / extension de garantie : sur devis.
   Ces services s'affichent dans la boutique pour les gammes concernées
   (e-Smart, e-Premium) et sont facturés SEPAREMENT de la borne.
   ================================================================ */
window.priceSupervision = function (prixPdcAn) {
  return prixPdcAn;
};

window.CATALOG_SERVICES = [
  { id: 'sup-full',     name: 'Supervision FULL',       sub: 'Pilotage à distance, monétisation, hotline & SAV — sur devis',
    type: 'devis', prixPdcAn: 225, perPdc: true, gammes: ['smart7','smart22','premium'] },
  { id: 'maint-prev',   name: 'Maintenance préventive', sub: 'Visite annuelle obligatoire (décret 2017-26)',
    type: 'devis', gammes: ['smart7','smart22','premium'] },
  { id: 'ext-garantie', name: 'Extension de garantie',  sub: '+1 à +3 ans au-delà des 2 ans (jusqu\'à 5 ans)',
    type: 'devis', gammes: ['smart7','smart22','premium'] }
];
