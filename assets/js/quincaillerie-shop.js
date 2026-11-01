/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — boutique statique
   ==========================================================================
   Catalogue : /assets/data/quincaillerie-catalogue.json  (export de la base)
   Stock     : /assets/data/quincaillerie-stock.json      (rafraîchi toutes les
               heures par GitHub Actions — rotation ~100 fiches fournisseur/h)
   Liens CB  : /assets/data/quincaillerie-liens.json      (liens Stripe par ref)
   Holex     : /assets/data/quincaillerie-holex.json      (gamme Holex, chargée à part :
               recherche, onglet Holex, ou panier qui en contient)

   « Carton Atelier » : les articles Holex partent ensemble, en un carton,
   quand leur commande fournisseur atteint le minimum. Chaque article porte ses
   points de carton (pc) ; le panier montre un voyant rouge / jaune / vert et
   le montant restant. Ni le montant d'achat ni le fournisseur ne sont affichés.

   Prix affiché = tout compris (produit + octroi de mer + transport au poids).
   Le forfait d'expédition (21,12 €) s'ajoute UNE FOIS par commande : il est
   déjà inclus dans le prix des liens Stripe mono-article, et ajouté une seule
   fois au total du panier.

   Sécurité paiement : au clic « Payer par carte », le stock est RECHARGÉ
   depuis le serveur (anti-cache) ; si l'article n'est plus « disponible »,
   la redirection Stripe est refusée et la commande passe par le formulaire.
   ========================================================================== */
(function () {
  'use strict';

  var PAR_PAGE = 24;
  var CLE_PANIER = 'egc_quinc_panier';
  /* Chaque produit a sa propre page web statique (quincaillerie-url.js) */
  var ADR = window.EGCQUrl || { /* repli si une page en cache n'a pas chargé quincaillerie-url.js */
    fiche: function (a) { return '/pages/produit-quincaillerie.html?ref=' + encodeURIComponent(a.ref); },
    rayon: function (s) { return '/pages/boutique-quincaillerie.html?cat=' + encodeURIComponent(s); }
  };

  var etat = {
    catalogue: null, stock: {}, stockMaj: 0, liens: {}, index: {}, holex: null, holexCharge: null,
    recherche: '', mots: [], cat: '', dispo: false, tri: 'pertinence',
    f: { m: {}, a: {}, v: {}, b: {}, p: {}, pmin: '', pmax: '' }, facettes: {}, compat: {}, marquesToutes: false,
    visibles: PAR_PAGE, panier: []
  };

  function eur(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function $(id) { return document.getElementById(id); }

  /* ---------------- stock ---------------- */
  var LIBELLES = {
    disponible: ['En stock fournisseur', 'qs-ok'],
    faible: ['Stock faible', 'qs-faible'],
    rupture: ['Sur commande', 'qs-cmd'],
    introuvable: ['Indisponible', 'qs-off'],
    inconnu: ['Disponibilité à confirmer', 'qs-cmd']
  };
  function statutDe(ref) {
    var s = etat.stock[ref];
    if (s && s.s) return s.s;
    var a = etat.index[ref];  /* gamme Holex : disponibilité relevée avec le catalogue */
    return (a && a.s) || 'inconnu';
  }
  function badgeStock(ref) {
    var s = statutDe(ref);
    var l = LIBELLES[s] || LIBELLES.inconnu;
    return '<span class="qs ' + l[1] + '">' + l[0] + '</span>';
  }

  /* Délai annoncé : un article DISPONIBLE chez le fournisseur est livré sous
     7 jours ouvrés ; sinon, pas d'estimation affichée — le client fait une
     demande et nous confirmons le délai avant toute commande. */
  function delaiTexte(ref, a, long) {
    if (a && a.pc) return long ? 'part dans le Carton Atelier, ' + cartonConfig().delai : 'envoi groupé · Carton Atelier';
    if (statutDe(ref) === 'disponible') {
      return long ? 'livraison sous 7 jours ouvrés' : 'livré sous 7 j ouvrés';
    }
    return long ? 'disponibilité à confirmer — faites une demande' : 'disponibilité sur demande';
  }
  function urlDemande(ref) { return '/pages/demande-produit.html?ref=' + encodeURIComponent(ref); }

  /* ---------------- filtres (volet masquable) ----------------
     Valeurs par article dans quincaillerie-facettes.json (générées par _tools/quinc_pages_seo.py) :
     m marque, a alimentation (s sans fil / f filaire), v tension, p puissance (W), b batteries incluses. */
  var GROUPES = [
    { cle: 'm', titre: 'Marque', valeur: function (f, a) { return f.m || ''; } },
    { cle: 'a', titre: 'Alimentation', libelles: { s: 'Sans fil (batterie)', f: 'Filaire (secteur)' }, valeur: function (f) { return f.a || ''; } },
    { cle: 'v', titre: 'Tension', ordre: ['12 V', '18 V', '36 V', '54 V', '230 V'], libelles: { '54 V': '54 V (FlexVolt)', '230 V': '230 V (secteur)' }, valeur: function (f) { return f.v || ''; } },
    { cle: 'b', titre: 'Batterie', libelles: { 'avec': 'Livré avec batterie(s)', 'nu': 'Sans batterie (outil nu)' },
      valeur: function (f) { return f.b === undefined ? '' : (f.b > 0 ? 'avec' : 'nu'); } },
    { cle: 'p', titre: 'Puissance', ordre: ['<500', '500-999', '1000-1499', '1500-1999', '2000+'],
      libelles: { '<500': 'Moins de 500 W', '500-999': '500 à 999 W', '1000-1499': '1 000 à 1 499 W', '1500-1999': '1 500 à 1 999 W', '2000+': '2 000 W et plus' },
      valeur: function (f) { var w = f.p; return !w ? '' : w < 500 ? '<500' : w < 1000 ? '500-999' : w < 1500 ? '1000-1499' : w < 2000 ? '1500-1999' : '2000+'; } }
  ];
  function fac(a) { return etat.facettes[a.ref] || (a.pc ? { m: a.marque } : {}); }
  function sansAccents(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function texteRecherche(a) {
    if (!a._q) { var f = fac(a); a._q = sansAccents([a.nom, f.m || a.marque, a.ref, a.ean || '', f.v, f.v ? f.v.replace(' ', '') : ''].join(' '));  /* EAN : recherche par code-barres */ }
    return a._q;
  }
  /* un article passe-t-il tous les filtres, sauf éventuellement le groupe « sauf » (pour compter les options) ? */
  function passe(a, sauf) {
    if (etat.cat && a.cat !== etat.cat) return false;
    if (etat.dispo && statutDe(a.ref) !== 'disponible') return false;
    if (etat.mots.length) {
      var t = texteRecherche(a);
      for (var i = 0; i < etat.mots.length; i++) if (t.indexOf(etat.mots[i]) === -1) return false;
    }
    if (sauf !== 'prix') {
      if (etat.f.pmin !== '' && a.prix < +etat.f.pmin) return false;
      if (etat.f.pmax !== '' && a.prix > +etat.f.pmax) return false;
    }
    var f = fac(a);
    for (var g = 0; g < GROUPES.length; g++) {
      var G = GROUPES[g], choisis = etat.f[G.cle];
      if (G.cle === sauf || !Object.keys(choisis).length) continue;
      if (!choisis[G.valeur(f, a)]) return false;
    }
    return true;
  }
  function filtres() {
    var res = etat.catalogue.articles.filter(function (a) { return passe(a); });
    if (etat.tri === 'prix-asc') res.sort(function (x, y) { return x.prix - y.prix; });
    if (etat.tri === 'prix-desc') res.sort(function (x, y) { return y.prix - x.prix; });
    return res;
  }
  function nbFiltres() {
    var n = GROUPES.reduce(function (s, G) { return s + Object.keys(etat.f[G.cle]).length; }, 0);
    return n + (etat.f.pmin !== '' || etat.f.pmax !== '' ? 1 : 0);
  }
  function libelle(G, v) { return (G.libelles && G.libelles[v]) || v; }
  function rendreVolet() {
    var html = '<div class="qv-tete"><strong>Filtres</strong>'
      + (nbFiltres() ? '<button type="button" class="qv-effacer" data-effacer="1">Tout effacer</button>' : '')
      + '<button type="button" class="qv-fermer" aria-label="Fermer les filtres">×</button></div>';
    GROUPES.forEach(function (G) {
      var comptes = {};
      etat.catalogue.articles.forEach(function (a) {
        if (!passe(a, G.cle)) return;
        var v = G.valeur(fac(a), a);
        if (v) comptes[v] = (comptes[v] || 0) + 1;
      });
      var valeurs = Object.keys(comptes);
      Object.keys(etat.f[G.cle]).forEach(function (v) { if (valeurs.indexOf(v) === -1) { valeurs.push(v); comptes[v] = 0; } });
      if (!valeurs.length) return;
      if (G.ordre) valeurs.sort(function (x, y) { return G.ordre.indexOf(x) - G.ordre.indexOf(y); });
      else valeurs.sort(function (x, y) { return (comptes[y] - comptes[x]) || x.localeCompare(y); });
      var plie = G.cle === 'm' && !etat.marquesToutes && valeurs.length > 10;
      var montrees = plie ? valeurs.filter(function (v, i) { return i < 10 || etat.f.m[v]; }) : valeurs;
      html += '<fieldset class="qv-groupe"><legend>' + G.titre + '</legend>'
        + montrees.map(function (v) {
          return '<label class="qv-option"><input type="checkbox" data-groupe="' + G.cle + '" value="' + esc(v) + '"'
            + (etat.f[G.cle][v] ? ' checked' : '') + '> <span>' + esc(libelle(G, v)) + '</span> <em>' + comptes[v] + '</em></label>';
        }).join('')
        + (plie ? '<button type="button" class="qv-plus" data-marques="toutes">Voir les ' + valeurs.length + ' marques</button>' : '')
        + (G.cle === 'm' && etat.marquesToutes && valeurs.length > 10 ? '<button type="button" class="qv-plus" data-marques="top">Réduire la liste</button>' : '')
        + '</fieldset>';
    });
    html += '<fieldset class="qv-groupe"><legend>Prix (€, tout compris)</legend><div class="qv-prix">'
      + '<input type="number" min="0" step="1" inputmode="numeric" id="qv-pmin" placeholder="min" value="' + esc(etat.f.pmin) + '" aria-label="Prix minimum">'
      + '<span>à</span><input type="number" min="0" step="1" inputmode="numeric" id="qv-pmax" placeholder="max" value="' + esc(etat.f.pmax) + '" aria-label="Prix maximum">'
      + '</div></fieldset>';
    var haut = $('q-volet').scrollTop; /* la case cochée reste sous les yeux */
    $('q-volet').innerHTML = html;
    $('q-volet').scrollTop = haut;
    var n = nbFiltres();
    $('q-volet-nb').textContent = n ? ' (' + n + ')' : '';
  }
  function rendreActifs() {
    var puces = [];
    GROUPES.forEach(function (G) {
      Object.keys(etat.f[G.cle]).forEach(function (v) {
        puces.push('<button type="button" class="qv-puce" data-retirer="' + G.cle + '" data-valeur="' + esc(v) + '">' + esc(libelle(G, v)) + ' ×</button>');
      });
    });
    if (etat.f.pmin !== '' || etat.f.pmax !== '') {
      puces.push('<button type="button" class="qv-puce" data-retirer="prix">' + (etat.f.pmin !== '' ? etat.f.pmin + ' €' : '0 €') + ' à ' + (etat.f.pmax !== '' ? etat.f.pmax + ' €' : '…') + ' ×</button>');
    }
    var dewalt = Object.keys(etat.f.m).length === 1 && etat.f.m.DeWalt;
    var holex = Object.keys(etat.f.m).length === 1 && etat.f.m.Holex, c = cartonConfig();
    $('q-actifs').innerHTML = (holex ? '<div class="q-bandeau-holex"><strong>Holex</strong> : outillage de précision pour l’atelier, la maintenance et le chantier — '
        + 'forets, fraises, tarauds, mesure, serrage, outillage à main, EPI. Prix tout compris livrés en Guyane.'
        + (groupeActif()
          ? '<br>📦 Ces articles partent par carton : <strong>carton groupé sans minimum</strong> (aucune carte demandée : vous réglez seulement quand le carton commun part), ou <strong>commande unique</strong> à partir d’environ '
            + eur(c.minimum_affiche).replace(',00', '') + ' d’articles Holex. Livraison ' + esc(c.delai) + '.'
          : '<br>📦 Ces articles partent ensemble dans le <strong>' + esc(c.nom) + '</strong> : commande possible <strong>à partir d’environ '
            + eur(c.minimum_affiche).replace(',00', '') + ' d’articles Holex</strong>, livraison ' + esc(c.delai) + '. Le voyant du panier vous dit en direct ce qu’il reste.')
        + '<div id="q-carton-direct" class="q-carton-direct"></div></div>' : '')
      + (dewalt ? '<div class="q-bandeau-dewalt"><strong>DeWalt</strong> : outils filaires et sans fil, batteries 18 V XR et 54 V FlexVolt, accessoires — '
        + 'prix tout compris livrés en Guyane. <a href="/quincaillerie-pro/marque/dewalt.html">Toute la gamme DeWalt</a></div>' : '')
      + (puces.length ? '<div class="qv-puces">' + puces.join('') + '<button type="button" class="qv-puce qv-tout" data-effacer="1">Tout effacer</button></div>' : '');
  }
  /* état des filtres dans l'adresse : partageable, et conservé au retour depuis une fiche.
     Les paramètres de suivi (utm_*, gclid, fbclid…) restent dans l'adresse : la mesure d'audience,
     chargée après le consentement, la lit à ce moment-là (sans eux : visite comptée en accès direct). */
  var SUIVI = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid)$/;
  function syncUrl() {
    var p = new URLSearchParams();
    if (etat.recherche) p.set('q', etat.recherche);
    if (etat.cat) p.set('cat', etat.cat);
    GROUPES.forEach(function (G) { var v = Object.keys(etat.f[G.cle]); if (v.length) p.set(G.cle === 'm' ? 'marque' : G.cle, v.join(',')); });
    if (etat.f.pmin !== '') p.set('pmin', etat.f.pmin);
    if (etat.f.pmax !== '') p.set('pmax', etat.f.pmax);
    if (etat.dispo) p.set('dispo', '1');
    new URLSearchParams(location.search).forEach(function (v, k) { if (SUIVI.test(k)) p.set(k, v); });
    var q = p.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) {}
  }
  function lireUrl() {
    var p = new URLSearchParams(location.search);
    if (p.get('q')) { etat.recherche = p.get('q'); $('q-recherche').value = etat.recherche; majMots(); }
    GROUPES.forEach(function (G) {
      var brut = p.get(G.cle === 'm' ? 'marque' : G.cle);
      if (brut) brut.split(',').forEach(function (v) { if (v) etat.f[G.cle][v] = true; });
    });
    if (p.get('pmin')) etat.f.pmin = p.get('pmin');
    if (p.get('pmax')) etat.f.pmax = p.get('pmax');
    if (p.get('dispo') === '1') { etat.dispo = true; $('q-dispo').checked = true; }
  }
  function majMots() { etat.mots = sansAccents(etat.recherche).split(/\s+/).filter(Boolean); }
  /* volet ouvert/fermé : retenu sur l'appareil (ordinateur) ; en tiroir sur téléphone */
  var CLE_VOLET = 'egc_quinc_volet';
  function mobile() { return window.matchMedia('(max-width: 900px)').matches; }
  function appliquerVolet() {
    var z = $('q-zone');
    z.classList.toggle('sans-volet', !mobile() && !etat.voletOuvert);
    z.classList.toggle('volet-mobile', mobile() && etat.voletMobile);
    $('q-volet-btn').setAttribute('aria-expanded', String(mobile() ? etat.voletMobile : etat.voletOuvert));
  }
  function basculerVolet() {
    if (mobile()) etat.voletMobile = !etat.voletMobile;
    else {
      etat.voletOuvert = !etat.voletOuvert;
      try { localStorage.setItem(CLE_VOLET, etat.voletOuvert ? 'ouvert' : 'ferme'); } catch (e) {}
    }
    appliquerVolet();
  }
  function initVolet() {
    var pref = null;
    try { pref = localStorage.getItem(CLE_VOLET); } catch (e) {}
    etat.voletOuvert = pref !== 'ferme';
    etat.voletMobile = false;
    appliquerVolet();
    window.addEventListener('resize', appliquerVolet);
    $('q-volet-btn').addEventListener('click', basculerVolet);
    $('q-volet-fond').addEventListener('click', function () { etat.voletMobile = false; appliquerVolet(); });
    function effacer() {
      GROUPES.forEach(function (G) { etat.f[G.cle] = {}; });
      etat.f.pmin = ''; etat.f.pmax = '';
    }
    function apres() { etat.visibles = PAR_PAGE; rendre(); majRayons(); }
    $('q-volet').addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.groupe) {
        if (t.checked) etat.f[t.dataset.groupe][t.value] = true; else delete etat.f[t.dataset.groupe][t.value];
        apres();
      } else if (t.id === 'qv-pmin' || t.id === 'qv-pmax') {
        etat.f[t.id === 'qv-pmin' ? 'pmin' : 'pmax'] = t.value === '' ? '' : String(Math.max(0, Math.round(+t.value)));
        apres();
      }
    });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-effacer],[data-retirer],[data-marques],.qv-fermer');
      if (!t) return;
      if (t.classList.contains('qv-fermer')) { if (mobile()) etat.voletMobile = false; else { etat.voletOuvert = false; try { localStorage.setItem(CLE_VOLET, 'ferme'); } catch (er) {} } appliquerVolet(); return; }
      if (t.dataset.marques) { etat.marquesToutes = t.dataset.marques === 'toutes'; rendreVolet(); return; }
      if (t.dataset.effacer) effacer();
      if (t.dataset.retirer === 'prix') { etat.f.pmin = ''; etat.f.pmax = ''; }
      else if (t.dataset.retirer) delete etat.f[t.dataset.retirer][t.dataset.valeur];
      apres();
    });
  }

  function carte(a) {
    var dispo = statutDe(a.ref) === 'disponible';
    var lien = etat.liens[a.ref];
    var fiche = ADR.fiche(a);
    return '<article class="q-card" data-ref="' + esc(a.ref) + '">'
      + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
      + '<div class="q-body">'
      + '<div class="q-ref">Réf. ' + esc(a.ref) + (a.ean && !a.pc ? '<span class="q-ean"> · EAN ' + esc(a.ean) + '</span>' : '') + '</div>'
      + (fac(a).m ? '<div class="q-marque">' + esc(fac(a).m) + '</div>' : '')
      + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(a.nom) + '</h3></a>'
      + badgeStock(a.ref)
      + (a.devis
          ? '<div class="q-prix q-prix-devis">Prix sur devis</div>'
            + '<div class="q-inclus">Colis de plus de 30 kg ou hors format : acheminement adapté</div>'
            + '<div class="q-poids">' + a.poids.toLocaleString('fr-FR') + ' kg · délai confirmé avec le devis</div>'
          : '<div class="q-prix">' + eur(a.prix) + '<span class="q-ttc">TTC</span></div>'
            + (a.lot > 1 ? '<div class="q-poids">Lot de ' + a.lot + ', soit ' + eur(a.prix / a.lot) + '/pièce</div>' : '')  /* prix affiché = le lot */
            + '<div class="q-inclus">Octroi &amp; livraison inclus*</div>'
            + (a.poids ? '<div class="q-poids">' + a.poids.toLocaleString('fr-FR') + ' kg · ' + delaiTexte(a.ref, a) + '</div>' : ''))
      + '<div class="q-actions">'
      + (a.pc  /* Carton Atelier : panier seulement (pas de paiement article seul), sauf fin de série */
          ? (statutDe(a.ref) !== 'introuvable'
            ? '<button type="button" class="q-add" data-add="' + esc(a.ref) + '">🛒 Ajouter au panier</button>'
            : '<a class="q-pay" href="' + urlDemande(a.ref) + '">✉️ Faire une demande<span class="q-pay-sub">réponse sous 24 h ouvrées</span></a>')
      : a.devis
          ? '<a class="q-pay" href="' + urlDemande(a.ref) + '">📦 Demander un devis<span class="q-pay-sub">plus de 30 kg ou hors format — réponse sous 24 h ouvrées</span></a>'
          : dispo
          ? '<button type="button" class="q-add" data-add="' + esc(a.ref) + '">🛒 Ajouter au panier</button>'
            + (lien ? (forfaitOffert(a.prix)
                ? '<button type="button" class="q-pay" data-pay="' + esc(a.ref) + '">💳 Payer ' + eur(a.prix) + '<span class="q-pay-sub">🎁 forfait d’expédition offert</span></button>'
                : '<button type="button" class="q-pay" data-pay="' + esc(a.ref) + '">💳 Payer ' + eur(a.lien_prix) + '<span class="q-pay-sub">dont ' + eur(etat.catalogue.forfait_expedition) + ' de forfait, unique par commande</span></button>') : '')
          : '<a class="q-pay" href="' + urlDemande(a.ref) + '">✉️ Faire une demande<span class="q-pay-sub">réponse sous 24 h ouvrées</span></a>')
      + '</div></div></article>';
  }

  function rendre() {
    var res = filtres();
    var grille = $('q-grille');
    grille.innerHTML = res.slice(0, etat.visibles).map(carte).join('')
      || '<p class="q-vide">Aucun article ne correspond. Élargissez la recherche ou <a href="/pages/devis.html">demandez un devis</a>.</p>';
    $('q-compte').textContent = res.length.toLocaleString('fr-FR') + ' article' + (res.length > 1 ? 's' : '');
    $('q-plus').style.display = res.length > etat.visibles ? '' : 'none';
    rendreVolet(); rendreActifs(); syncUrl();
    var d = etat.stockMaj ? new Date(etat.stockMaj * 1000) : null;
    $('q-stock-maj').textContent = d
      ? 'Disponibilités vérifiées chez le fournisseur — dernière synchronisation le '
        + d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '';
    majPastille();
  }

  /* ---------------- panier ----------------
     Conservé 7 jours sur l'appareil (à compter de la dernière activité) :
     enregistré horodaté { maj, lignes }, purgé au-delà de PANIER_RETENTION. */
  var PANIER_RETENTION = 7 * 24 * 3600 * 1000;
  var syncTimer = null;
  function sauver() {
    var p = { maj: Date.now(), lignes: etat.panier };
    etat.panierMaj = p.maj;
    try { localStorage.setItem(CLE_PANIER, JSON.stringify(p)); } catch (e) {}
    /* client connecté : le panier suit le compte (users/{uid}.panier_quinc) */
    if (window.EGCQCompte) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () { window.EGCQCompte.sauverPanier(p); }, 600);
    }
  }
  function charger() {
    try {
      var j = JSON.parse(localStorage.getItem(CLE_PANIER) || 'null');
      if (!j) { etat.panier = []; return; }
      if (Array.isArray(j)) { etat.panier = j; sauver(); return; } /* ancien format, migré */
      var expire = j.maj && Date.now() - j.maj > PANIER_RETENTION;
      etat.panier = expire ? [] : (j.lignes || []);
      etat.panierMaj = expire ? 0 : (j.maj || 0);
    } catch (e) { etat.panier = []; }
  }
  /* Au chargement, si le client est connecté : le panier le plus récent
     (appareil ou compte) gagne, dans la limite des 7 jours. */
  function reconcilierPanierCompte() {
    if (!window.EGCQCompte) return;
    window.EGCQCompte.pret.then(function (u) {
      if (!u) return;
      var distant = window.EGCQCompte.lirePanier();
      var distantOk = distant && distant.lignes && distant.lignes.length
        && !(distant.maj && Date.now() - distant.maj > PANIER_RETENTION);
      if (distantOk && (distant.maj || 0) > (etat.panierMaj || 0)) {
        etat.panier = distant.lignes;
        etat.panierMaj = distant.maj;
        try { localStorage.setItem(CLE_PANIER, JSON.stringify(distant)); } catch (e) {}
        purgerHolex();
        rendre(); rendrePanier();
        if (holexUtile()) chargerHolex();
      } else if (etat.panier.length) {
        window.EGCQCompte.sauverPanier({ maj: etat.panierMaj || Date.now(), lignes: etat.panier });
      }
    });
  }
  function article(ref) { return etat.index[ref]; }
  function indexer() {
    etat.index = {};
    etat.catalogue.articles.forEach(function (a) { etat.index[a.ref] = a; });
  }
  /* ---------------- Carton Atelier (gamme Holex, envoi groupé) ----------------
     Le carton part quand ses articles totalisent seuil_points (achat fournisseur minimum).
     Voyant : rouge sous 50 %, jaune jusqu'à 99 %, vert = le carton peut partir.
     Montant restant = points manquants × prix moyen d'un point des articles déjà au carton
     (repère du catalogue quand le carton est vide), arrondi aux 5 € supérieurs. */
  function cartonConfig() {
    return (etat.holex && etat.holex.carton) || { nom: 'Carton Atelier', seuil_points: 100, eur_par_point: 9.39, minimum_affiche: 940, poids_max: 10, cartons_max: 1, prix_carton: 150, dims: [30, 40, 40], delai: 'environ 2 semaines après l’envoi du carton' };
  }
  function cartonInfo() {
    var c = cartonConfig(), pts = 0, montant = 0, kg = 0, n = 0, unites = [];
    etat.panier.forEach(function (l) {
      var a = article(l.ref);
      if (!a || !a.pc || l.pack) return;  /* super pack : son propre carton, compris dans son prix fixe — hors voyant */
      var p = a.poids || 0.5;  /* poids inconnu : 0,5 kg, jamais 0 */
      pts += a.pc * l.q; montant += a.prix * l.q; kg += p * l.q; n += l.q;
      for (var i = 0; i < l.q && unites.length < 1000; i++) unites.push(p);
    });
    /* lignes Holex dont la gamme n'est pas (encore) chargée : rien ne part tant qu'on ne les connaît pas */
    var attente = !etat.holex && etat.panier.some(function (l) { return /^HX/.test(l.ref) && !article(l.ref); });
    var pct = Math.min(100, Math.floor(pts / c.seuil_points * 100));
    var parPoint = pts > 0 ? montant / pts : c.eur_par_point;
    return {
      c: c, n: n, kg: kg, pts: pts, pct: Math.floor(pct / 5) * 5, montant: montant, attente: attente,
      complet: pts >= c.seuil_points,
      reste: pts >= c.seuil_points ? 0 : Math.ceil((c.seuil_points - pts) * parPoint / 5) * 5,
      feu: pts >= c.seuil_points ? 'vert' : pct >= 50 ? 'jaune' : 'rouge',
      cartons: nbCartons(unites, c.poids_max),
      lourd: nbCartons(unites, c.poids_max) > (c.cartons_max || 1),           // commande unique : 1 colis de 10 kg (31/10/2026)
      lourdGroupe: nbCartons(unites, c.poids_max) > CARTONS_MAX_GROUPE        // carton groupé : 5 colis par participation (serveur)
    };
  }
  /* La commande peut partir en plusieurs cartons de poids_max kg (le 1er est compris dans les prix, les suivants
     à la charge de la boutique) : rangement « plus lourd d'abord » dans le premier carton où il reste de la place. */
  function nbCartons(unites, max) {
    var cartons = [];
    unites.slice().sort(function (a, b) { return b - a; }).forEach(function (p) {
      for (var i = 0; i < cartons.length; i++) if (cartons[i] + p <= max) { cartons[i] += p; return; }
      cartons.push(p);
    });
    return Math.max(1, cartons.length);
  }
  function poidsTexte(ci) { return kgTexte(ci.kg) + ' kg'; }
  function kgTexte(x) { return x.toLocaleString('fr-FR', { maximumFractionDigits: x < 10 ? 2 : 1 }); }
  function blocCarton(ci) {
    var c = ci.c;
    /* trop lourde pour la commande unique (1 colis) mais pas pour le carton groupé (5 colis) : on propose la bascule */
    var versGroupe = ci.lourd && !ci.lourdGroupe && groupeActif();
    var msg = versGroupe
      ? '⚠️ Votre commande pèse environ <strong>' + kgTexte(ci.kg) + ' kg</strong> : trop lourde pour la commande unique (un seul colis de ' + c.poids_max + ' kg). Elle peut partir par le <strong>carton groupé</strong>, sans minimum.'
      : ci.lourd
      ? '⚠️ Votre commande pèse environ <strong>' + kgTexte(ci.kg) + ' kg</strong> : le ' + esc(c.nom) + ' part en un seul colis de ' + c.poids_max + ' kg au plus. Retirez des articles lourds, ou envoyez la commande par le formulaire : nous vous proposons un devis.'
      : ci.complet
      ? '✅ <strong>Carton complet : il peut partir !</strong> Livraison ' + esc(c.delai) + '.'
      : 'Encore <strong>' + eur(ci.reste).replace(',00', '') + '</strong> d’articles Holex pour déclencher l’envoi du carton (ce montant dépend des articles choisis). Les articles Holex partent ensemble, dès que le carton est complet.';
    return '<div class="q-carton q-feu-' + (ci.lourd ? 'rouge q-carton-lourd' : ci.feu) + '" role="status">'
      + '<div class="q-carton-tete"><span class="q-feu" aria-hidden="true"></span><strong>📦 ' + esc(c.nom) + '</strong>'
      + '<span class="q-carton-pct">' + (ci.lourd ? 'trop lourd' : ci.complet ? 'prêt' : ci.feu === 'jaune' ? 'presque' : 'à compléter') + '</span></div>'
      + '<div class="q-jauge" aria-hidden="true"><span style="width:' + ci.pct + '%"></span></div>'
      + '<p class="q-carton-msg">' + msg + '</p>'
      + '<div class="q-carton-poids"><span>⚖️ Poids : ' + poidsTexte(ci) + '</span></div>'
      + (versGroupe ? '<button type="button" class="q-pay q-pay-alt" data-mode-holex="groupe">👥 Passer au carton groupé<span class="q-pay-sub">sans minimum · aucune carte demandée maintenant</span></button>' : '')
      + '</div>';
  }
  /* ---------------- carton groupé (commande groupée Holex, functions/groupe.js, v3) ----------------
     Le client connecté (email confirmé) met ses articles Holex dans le carton en cours : c'est une INTENTION, sans carte,
     sans empreinte ni prélèvement, annulable à tout moment avant de payer. Quand EGREENCITY'S fait partir le carton,
     chacun reçoit par email un lien de paiement (72 h au moins pour régler). Prix figés à l'inscription : une baisse est
     répercutée, une hausse est soumise à l'accord du client. Le montant affiché est envoyé au serveur : s'il a changé
     (prix republiés, offre épuisée), le client le reconfirme. La jauge publique ne donne que total, objectif (1 700 €),
     nombre de participants et poids : le carton peut partir avant l'objectif.
     Compte en « paiement immédiat » (2 paiements non reçus) : le serveur répond 409 « paiement_immediat » ; le client
     accepte de payer tout de suite (30 min) avant que rien ne soit créé (accepte_immediat).
     La commande unique reste le Carton Atelier ci-dessus (minimum ≈ carton.minimum_affiche, ~940 €, payée tout de suite). */
  var CLE_COORD = 'egc_quinc_coord';
  /* = functions/groupe.js (LIMITE_KG, REGLAGES_DEFAUT.objectif ; delai_paiement_h : 72 h AU MOINS, borne des réglages) */
  var LIMITE_KG_GROUPE = 50, OBJECTIF_GROUPE = 1700, DELAI_PAIEMENT_H = 72, CARTONS_MAX_GROUPE = 5; // CARTONS_MAX_PARTICIPATION
  var GROUPE_SMS = false; // = SMS_ACTIF de functions/groupe.js (emails seuls au lancement, 31/10/2026)
  var AVERTIR_GROUPE = [['email', 'Email'], ['sms', 'Email + SMS'], ['aucun', 'Aucun']].filter(function (x) { return GROUPE_SMS || x[0] !== 'sms'; });
  /* batterie lithium vendue seule (refusée au transport aérien) : même règle que functions/panier.js (batterieSeule) */
  var BATT_DEBUT = /^(batterie|batteries|accu|accus)\b/i, BATT_KIT = /^(kit|pack|set|lot)\b/i, BATT_MOT = /\b(batterie|batteries|accu|accus)\b/i;
  var BATT_MACHINE = /\b(perceuse|visseuse|perforateur|meuleuse|scie|ponceuse|cl[ée] [àa] chocs?|boulonneuse|d[ée]fonceuse|rabot|marteau|burineur|lampe|projecteur|souffleur|tondeuse|taille-haies?|d[ée]broussailleuse|tron[çc]onneuse|aspirateur|radio|agrafeuse|cloueur|riveteuse|pistolet|polisseuse|multi-?outils?|outils?|malaxeur|cisaille|d[ée]capeur|niveau laser|laser)\b/i;
  function batterieSeule(nom) {
    nom = String(nom || '').trim();
    return BATT_DEBUT.test(nom) || (BATT_KIT.test(nom) && BATT_MOT.test(nom) && !BATT_MACHINE.test(nom));
  }
  function groupeActif() { return !!(etat.paiement && etat.paiement.groupe && window.firebase && firebase.apps && firebase.apps.length); }
  /* onglet par défaut : commande unique seulement si elle peut partir (carton complet ET un seul colis de 10 kg), sinon carton groupé */
  function modeHolex(ci) { return !groupeActif() ? 'unique' : (etat.modeHolex || (ci.complet && !ci.lourd ? 'unique' : 'groupe')); }
  /* carton en cours (lecture publique : numero, statut, total, objectif, nb, poids — aucune donnée client), relu au plus
     une fois par minute. etat.groupe : undefined = pas encore lu ou lecture en échec (état inconnu), null = aucun carton ouvert */
  function chargerGroupe(force) {
    if (!groupeActif() || (!force && etat.groupeLu && Date.now() - etat.groupeLu < 60000)) return;
    etat.groupeLu = Date.now();
    var db = firebase.firestore();
    db.collection('cartons_groupes').doc('_courant').get()
      .then(function (s) { var id = s.exists && s.data().carton; return id ? db.collection('cartons_groupes').doc(id).get() : null; })
      .then(function (d) { var g = d && d.exists ? d.data() : null; etat.groupe = g && g.statut === 'ouvert' ? g : null; })
      .catch(function () { etat.groupe = undefined; etat.groupeLu = 0; })  /* relu à la prochaine ouverture du panier */
      .then(function () { if ($('q-tiroir').classList.contains('ouvert')) rendrePanier(); });
  }
  function lignesHolex() { return etat.panier.filter(function (l) { var a = article(l.ref); return a && a.pc && !l.pack; }); }
  function blocChoix(ci) {
    var m = modeHolex(ci);
    return '<div class="q-mode" role="tablist" aria-label="Envoi de vos articles Holex">'
      + '<button type="button" role="tab" data-mode-holex="groupe" aria-selected="' + (m === 'groupe') + '">👥 Carton groupé<span>sans minimum</span></button>'
      + '<button type="button" role="tab" data-mode-holex="unique" aria-selected="' + (m === 'unique') + '">📦 Commande unique<span>dès ' + eur(cartonConfig().minimum_affiche || 940).replace(',00', '') + '</span></button></div>'
      + (m === 'groupe' ? blocGroupe(ci) : blocCarton(ci));
  }
  /* disponibilité à confirmer (ni disponible, ni stock faible) : refusée par le carton groupé comme par la commande unique */
  function aConfirmer(ref) { var st = statutDe(ref); return !(st === 'disponible' || st === 'faible'); }
  /* motif pour lequel une ligne Holex ne peut pas partir dans le carton groupé (le serveur la refuserait), '' sinon */
  function motifHorsGroupe(l) {
    var a = article(l.ref);
    if (a && batterieSeule(a.nom)) return 'batterie sans machine : interdite au transport aérien';
    if (aConfirmer(l.ref)) return 'disponibilité à confirmer';
    if (l.q > QTE_MAX_CB) return 'au plus ' + QTE_MAX_CB + ' exemplaires';
    return '';
  }
  function lignesNonEligibles() { return lignesHolex().filter(function (l) { return !!motifHorsGroupe(l); }); }
  /* la commande unique est-elle une solution pour les articles refusés par le carton groupé ? Seulement pour une quantité
     trop forte (son formulaire l'accepte) et dans son colis de 10 kg : disponibilité à confirmer et batterie seule y sont
     refusées aussi (« demander » : nous vérifions la disponibilité) */
  function uniqueSolution(ci) {
    return !ci.lourd && lignesNonEligibles().every(function (l) { var a = article(l.ref); return !(a && batterieSeule(a.nom)) && !aConfirmer(l.ref); });
  }
  function saisieGroupe(id, defaut) { return etat.saisieGroupe && etat.saisieGroupe[id] !== undefined ? etat.saisieGroupe[id] : defaut; }
  /* le carton groupé peut-il prendre TOUS les articles Holex du panier ? (sinon : commande unique, demande ou devis) */
  function groupePossible(ci) { return !ci.lourdGroupe && !lignesNonEligibles().length; }
  function blocGroupe(ci) {
    /* même règle que le serveur (rejoindre) : aucun carton ouvert -> nouveau carton ; carton en cours qui dépasserait
       50 kg avec cette commande -> carton précédent encore ouvert s'il a la place, sinon nouveau carton (on ne sait pas
       lequel : pas de jauge) ; carton pas encore lu ou illisible (inconnu) : texte neutre, sans jauge */
    var g = etat.groupe, inconnu = g === undefined, lourdCourant = !!g && (Number(g.poids) || 0) + ci.kg > LIMITE_KG_GROUPE;
    var nouveau = g === null, sansJauge = inconnu || lourdCourant;
    var objectif = (g && Number(g.objectif)) || OBJECTIF_GROUPE;
    var total = g && !lourdCourant ? (Number(g.total) || 0) : 0, apres = total + ci.montant;
    var pct = Math.min(100, Math.round(total / objectif * 100)), pctApres = Math.min(100, Math.round(apres / objectif * 100));
    var aRegler = ci.montant + (forfaitOffert(ci.montant) ? 0 : etat.catalogue.forfait_expedition);
    etat.groupeMontant = Math.round(aRegler * 100) / 100;
    var u = window.EGCQCompte && window.EGCQCompte.utilisateur();
    var coord = {};
    try { if (u) coord = JSON.parse(localStorage.getItem(CLE_COORD + '_' + u.uid) || '{}') || {}; } catch (e) {}
    var obj = eur(objectif).replace(',00', ''), repere = 'objectif ' + obj + ' — le carton peut partir avant';
    var vos = 'vos articles (<strong>' + eur(ci.montant) + '</strong>)';
    var nb = g && !lourdCourant ? Math.floor(Number(g.nb) || 0) : 0;
    var h = '<div class="q-carton q-groupe-carton" role="status">'
      + '<div class="q-carton-tete"><strong>👥 Carton groupé</strong><span class="q-carton-pct">'
      + (sansJauge || nouveau ? 'objectif ' + obj : eur(total).replace(',00', '') + ' / objectif ' + obj) + '</span></div>'
      + (sansJauge ? '' : '<div class="q-jauge q-jauge-groupe" aria-hidden="true"><span style="width:' + pct + '%"></span><span class="q-jauge-vous" style="width:' + (pctApres - pct) + '%"></span></div>')
      + '<p class="q-carton-msg">' + (inconnu
        ? 'Avec ' + vos + ', vous rejoignez le carton en cours : ' + repere + '.'
        : lourdCourant
        ? 'Le carton en cours atteindrait sa limite de ' + LIMITE_KG_GROUPE + ' kg : ' + vos + ' rejoignent un carton précédent encore ouvert s’il a la place, sinon ils <strong>ouvrent un nouveau carton</strong> (' + repere + ').'
        : nouveau
        ? 'Avec ' + vos + ', vous ouvrez un nouveau carton : ' + repere + '.'
        : 'Avec ' + vos + ' : <strong>' + eur(apres).replace(',00', '') + '</strong> / ' + repere + '.'
          + (nb ? ' Déjà ' + nb + ' participation' + (nb > 1 ? 's' : '') + '.' : ''))
      + '</p><p class="q-groupe-garantie">✅ <strong>Aucune carte demandée maintenant.</strong> Vous recevez un lien de paiement (au moins ' + DELAI_PAIEMENT_H
      + ' h pour régler) quand le carton part. Annulation libre jusqu’au paiement. Livraison ' + esc(cartonConfig().delai) + '.</p>';
    /* articles qui ne peuvent pas partir dans le carton groupé : on le dit AVANT la saisie, avec « retirer », « demander »
       et, seulement si elle peut les prendre (uniqueSolution), la bascule en commande unique (jamais un renvoi vers un
       formulaire désactivé). Disponibilité à confirmer : « demander », nous la vérifions */
    var unique = '<button type="button" class="q-pay q-pay-alt" data-mode-holex="unique">📦 Passer en commande unique<span class="q-pay-sub">dès '
      + eur(cartonConfig().minimum_affiche || 940).replace(',00', '') + ' d’articles Holex, payée tout de suite</span></button>';
    var exclus = lignesNonEligibles();
    if (exclus.length) {
      var verifier = exclus.some(function (l) { return aConfirmer(l.ref); }), parUnique = uniqueSolution(ci);
      return h + '<div class="q-groupe-exclus"><p><strong>Ces articles ne peuvent pas partir dans le carton groupé</strong> :</p><ul>'
        + exclus.map(function (l) { var a = article(l.ref); return '<li>' + esc(a ? a.nom : l.ref) + ' <em>(' + esc(motifHorsGroupe(l)) + ')</em> <button type="button" class="q-lien-btn" data-suppr="' + esc(l.ref) + '">retirer</button>'
          + '<a class="q-lien-btn" href="' + urlDemande(l.ref) + '">demander</a></li>'; }).join('')
        + '</ul><p>Retirez-les pour rejoindre le carton'
        + (verifier ? ', ou cliquez sur « demander » : nous vérifions leur disponibilité et vous confirmons délai et prix' : ', ou faites-en la demande (nous vous confirmons délai et prix)')
        + (parUnique ? ', ou passez en commande unique' : '') + '.</p></div>' + (parUnique ? unique : '') + '</div>';
    }
    if (ci.lourdGroupe) {  /* = serveur (409 « cartons ») : la limite est le nombre de colis, pas le poids total ; ni jauge ni « vous rejoignez » */
      return '<div class="q-carton q-groupe-carton" role="status"><div class="q-carton-tete"><strong>👥 Carton groupé</strong><span class="q-carton-pct">objectif ' + obj + '</span></div>'
        + '<p class="q-carton-note">⚠️ Vos articles Holex ne se répartissent pas en ' + CARTONS_MAX_GROUPE + ' colis de ' + cartonConfig().poids_max
        + ' kg (il en faudrait ' + ci.cartons + ') : c’est la limite du carton groupé. Retirez des articles lourds, ou envoyez la commande par le formulaire ci-dessous : nous vous proposons un devis.</p></div>';
    }
    if (!u) return h + '<a class="q-pay" href="/pages/compte.html">🔑 Se connecter pour rejoindre le carton groupé</a><p class="q-groupe-garantie">Votre panier est gardé : revenez ici une fois connecté.</p></div>';
    /* le lien de paiement part par email : adresse confirmée obligatoire (le serveur refuse sinon) */
    if (u.emailVerified === false) {
      return h + '<p class="q-carton-note">📧 Confirmez d’abord votre adresse email (lien reçu à la création de votre compte) : c’est par email que vous recevrez le lien de paiement.</p>'
        + '<button type="button" class="q-pay q-pay-alt" data-groupe-verifier="1">✅ J’ai confirmé mon adresse email</button>'
        + '<p class="q-groupe-garantie">Lien non reçu ? <a href="/pages/compte.html">Renvoyez-le depuis votre espace client</a> (pensez à vos courriers indésirables).</p></div>';
    }
    var avertir = saisieGroupe('qg-avertir', coord.avertir || 'email');
    return h + '<div class="q-groupe-form">'
      + '<input id="qg-nom" autocomplete="name" placeholder="Nom et prénom" value="' + esc(saisieGroupe('qg-nom', coord.nom || '')) + '">'
      + '<input id="qg-tel" type="tel" autocomplete="tel" placeholder="' + (GROUPE_SMS ? 'Téléphone (mobile pour les SMS de paiement)' : 'Téléphone (pour la livraison)') + '" value="' + esc(saisieGroupe('qg-tel', coord.tel || '')) + '">'
      + '<textarea id="qg-adresse" rows="2" autocomplete="street-address" placeholder="Adresse de livraison en Guyane, avec le code postal (973…)">' + esc(saisieGroupe('qg-adresse', coord.adresse || '')) + '</textarea>'
      + '<fieldset class="q-groupe-avertir"><legend>Être informé de l’avancement du carton</legend>'
      + AVERTIR_GROUPE.map(function (x) {
        return '<label><input type="radio" name="qg-avertir" value="' + x[0] + '"' + (avertir === x[0] ? ' checked' : '') + '> ' + x[1] + '</label>';
      }).join('')
      + '<span class="q-groupe-aide">' + (GROUPE_SMS ? 'L’avancement arrive par email. Le lien de paiement et les reçus partent toujours par email ; avec « Email + SMS », le lien de paiement, les rappels et les reçus arrivent aussi par SMS (numéro mobile obligatoire).' : 'L’avancement arrive par email. Le lien de paiement et les reçus partent toujours par email.') + ' Modifiable dans votre espace client.</span></fieldset>'
      + '<label class="q-groupe-cgv"><input type="checkbox" id="qg-cgv"' + (saisieGroupe('qg-cgv', false) ? ' checked' : '') + '> <span>J’accepte les <a href="/pages/legal/cgv-quincaillerie.html#commande-groupee" target="_blank" rel="noopener">conditions de la commande groupée</a> : '
      + 'intention sans engagement, ' + eur(aRegler) + ' à régler uniquement quand le carton part, par le lien de paiement.</span></label>'
      + '<button type="button" class="q-pay" data-groupe-rejoindre="1">👥 Mettre mes articles dans le carton groupé — ' + eur(aRegler)
      + '<span class="q-pay-sub">aucune carte demandée maintenant · ' + (forfaitOffert(ci.montant) ? 'forfait d’expédition offert' : 'forfait d’expédition compris') + '</span></button>'
      + '</div></div>';
  }
  /* message flottant (quelques secondes) */
  function toastGroupe(texte) {
    var bandeau = document.createElement('div');
    bandeau.setAttribute('role', 'status');
    bandeau.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#17631a;color:#fff;padding:.7rem 1.3rem;border-radius:16px;font-weight:700;font-size:.85rem;z-index:99999;box-shadow:0 10px 28px rgba(0,0,0,.35);max-width:92vw;text-align:center;';
    bandeau.textContent = texte;
    document.body.appendChild(bandeau);
    setTimeout(function () { bandeau.remove(); }, 10000);
  }
  /* intention enregistrée : les articles Holex sont dans le carton groupé, ils sortent du panier. Compte en « paiement
     immédiat » (2 paiements non reçus) : la participation se règle tout de suite (30 min), la page de paiement s'ouvre */
  function inscritGroupe(j, lignes) {
    var refs = lignes.map(function (l) { return l.ref; });
    etat.panier = etat.panier.filter(function (l) { return l.pack || refs.indexOf(l.ref) < 0; });
    sauver(); majPastille(); rendre(); rendrePanier(); chargerGroupe(true);
    if (j.paiement_immediat) {
      alert('Vos articles sont dans le carton groupé' + (j.carton ? ' ' + j.carton : '') + '.\n\n'
        + 'Pour ce compte, la participation se règle dès l’inscription : vous avez 30 minutes pour payer ' + eur(Number(j.total) || 0) + '. La page de paiement sécurisée va s’ouvrir.');
      location.href = j.url && /^https:\/\//.test(j.url) ? j.url : '/pages/compte.html?payer=' + encodeURIComponent(j.participation);
      return;
    }
    toastGroupe('✅ Vos articles sont dans le carton groupé' + (j.carton ? ' ' + j.carton : '') + ' (' + eur(Number(j.total) || 0) + '). Aucune carte demandée : '
      + 'vous recevrez le lien de paiement par email quand le carton part. Suivi et annulation dans votre espace client.');
  }
  /* doublon : réponse 409 « deja » si le même panier est déjà en cours ; le client confirme (confirmer_doublon) pour en ajouter un second.
     Email confirmé depuis l'ouverture de la page : le jeton est rafraîchi une fois (rafraichi) pour que le serveur le voie.
     Compte en « paiement immédiat » : 409 « paiement_immediat », le client confirme (immediat) qu'il paie dans les 30 min */
  function rejoindreGroupe(bouton, montant, doublon, rafraichi, immediat) {
    var nom = $('qg-nom').value.trim(), tel = $('qg-tel').value.trim(), adr = $('qg-adresse').value.trim();
    if (nom.length < 2 || tel.replace(/\D/g, '').length < 9 || adr.length < 10) { alert('Indiquez votre nom, votre téléphone et votre adresse de livraison.'); return; }
    if (!/\b973\d{2}\b/.test(adr)) { alert('Indiquez votre adresse de livraison en Guyane avec son code postal (973…) : le carton groupé livre en Guyane uniquement.'); return; }
    if (!$('qg-cgv').checked) { alert('Merci d’accepter les conditions de la commande groupée.'); return; }
    var choix = document.querySelector('input[name="qg-avertir"]:checked'), avertir = choix ? choix.value : 'email';
    var u = window.EGCQCompte && window.EGCQCompte.utilisateur();
    if (!u) { location.href = '/pages/compte.html'; return; }
    try { localStorage.setItem(CLE_COORD + '_' + u.uid, JSON.stringify({ nom: nom, tel: tel, adresse: adr, avertir: avertir })); } catch (e) {}
    var lignes = lignesHolex();
    montant = typeof montant === 'number' ? montant : etat.groupeMontant;
    bouton.disabled = true; bouton.classList.add('q-verif');
    var corps = { action: 'rejoindre', panier: lignes.map(function (l) { return { ref: l.ref, q: l.q }; }), nom: nom, telephone: tel, adresse: adr,
      conditions: true, montant: montant, avertir: avertir };
    if (doublon) corps.confirmer_doublon = true;
    if (immediat) corps.accepte_immediat = true;
    /* nouvel envoi après confirmation : sa promesse est rendue, le bouton reste inactif jusqu'à la fin */
    function relancer(m, d, r, im) { return rejoindreGroupe(bouton, m, d, r || rafraichi, im || immediat); }
    return u.getIdToken(!!rafraichi).then(function (jeton) {
      return fetch(etat.paiement.groupe, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
        body: JSON.stringify(corps)
      });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { statut: r.status, j: j || {} }; }); })
      .then(function (x) {
        var e = x.j.erreur;
        if (x.statut === 200 && x.j.participation) { inscritGroupe(x.j, lignes); return; }
        if (x.statut === 409 && e === 'prix_change') {
          /* prix republiés ou offre de lancement épuisée : le client valide le montant exact */
          if (confirm('Le montant de votre participation a été mis à jour : ' + eur(Number(x.j.total) || 0)
            + (x.j.forfait > 0 ? ' (dont ' + eur(Number(x.j.forfait)) + ' de forfait d’expédition)' : ' (forfait d’expédition offert)')
            + '.\nMettre vos articles dans le carton groupé pour ' + eur(Number(x.j.total) || 0) + ' ?' + (immediat ? '' : ' (rien n’est à payer maintenant)'))) return relancer(x.j.total, doublon);
          return;
        }
        if (x.statut === 409 && e === 'paiement_immediat') {
          /* 2 paiements non reçus : la participation se paie tout de suite ; rien n'est créé sans l'accord du client */
          if (confirm('Pour votre compte, la participation au carton groupé se règle dès l’inscription (deux paiements précédents n’ont pas été reçus).\n\n'
            + 'Vous aurez ' + (Number(x.j.minutes) || 30) + ' minutes pour payer ' + eur(Number(x.j.total) || montant) + ' par carte, sur la page de paiement sécurisée qui va s’ouvrir.\n'
            + 'Continuer ?')) return relancer(montant, doublon, false, true);
          return;
        }
        if (x.statut === 409 && e === 'deja' && x.j.statut === 'a_payer' && x.j.participation) {
          /* même panier déjà en attente de paiement : on propose de le régler plutôt que d'en créer un second */
          if (confirm('Ces mêmes articles sont déjà dans le carton groupé et attendent votre paiement.\n\nOuvrir le paiement de cette participation ?\n(Annuler = en ajouter une deuxième participation)')) {
            location.href = '/pages/compte.html?payer=' + encodeURIComponent(x.j.participation);
            return;
          }
          if (confirm('En ajouter une deuxième participation ?')) return relancer(montant, true);
          return;
        }
        if (x.statut === 409 && e === 'deja') {
          /* même panier déjà en cours (en attente du départ, à reconfirmer ou à payer) */
          if (confirm('Ces mêmes articles sont déjà dans le carton groupé (participation ' + ({ a_payer: 'à payer', a_reconfirmer: 'à reconfirmer' }[x.j.statut] || 'en attente du départ') + ').\n'
            + 'En ajouter une deuxième participation ?')) return relancer(montant, true);
          alert('Votre participation est bien enregistrée : suivez-la dans votre espace client.');
          return;
        }
        if (x.statut === 409 && e === 'panier') {
          alert('Certains articles ne peuvent pas partir dans le carton groupé :\n' + (x.j.refus || []).map(function (r) { return '• ' + (r.nom || r.ref) + ' : ' + r.motif; }).join('\n')
            + '\nRetirez-les du panier, ou faites-en la demande depuis leur fiche : nous vérifions leur disponibilité et vous confirmons délai et prix.');
          return;
        }
        if (x.statut === 409 && e === 'cartons') {
          alert('Vos articles Holex ne se répartissent pas en ' + CARTONS_MAX_GROUPE + ' colis de ' + cartonConfig().poids_max + ' kg, la limite du carton groupé : '
            + 'retirez des articles lourds, ou envoyez la commande par le formulaire du panier, nous vous proposons un devis.');
          return;
        }
        if (x.statut === 429) {
          alert('Vous avez déjà 5 participations en cours au carton groupé (en attente du départ, à payer, ou payées en attente de la commande du carton) : c’est le maximum par compte.'
            + '\nRetrouvez-les dans votre espace client : annulez-en une, ou attendez la commande du carton.');
          return;
        }
        if (x.statut === 403 && e === 'email_non_verifie') {
          /* email confirmé entre-temps ? on relit le compte, puis un seul nouvel essai avec un jeton neuf */
          return (rafraichi ? Promise.resolve() : u.reload()).then(function () {
            if (!rafraichi && u.emailVerified) return relancer(montant, doublon, true);
            alert('Confirmez d’abord votre adresse email (lien reçu à la création de votre compte, pensez aux courriers indésirables) : c’est par email que vous recevrez le lien de paiement.\nVous pouvez renvoyer le lien depuis votre espace client.');
            rendrePanier();
          });
        }
        if (x.statut === 400 && e === 'telephone_sms') { alert('Les SMS ne partent que vers un numéro mobile (0694… en Guyane, 06 ou 07 en métropole). Indiquez un mobile, ou choisissez « Email ».'); return; }
        if (x.statut === 400 && e === 'coordonnees') { alert('Indiquez votre nom, votre téléphone et votre adresse de livraison.'); return; }
        if (x.statut === 400 && e === 'adresse_guyane') { alert('Indiquez votre adresse de livraison en Guyane avec son code postal (973…).'); return; }
        if (x.statut === 400 && e === 'conditions') { alert('Merci d’accepter les conditions de la commande groupée.'); return; }
        if (x.statut === 400) { alert('Votre panier ne peut pas partir tel quel dans le carton groupé (50 lignes au plus, articles Holex uniquement). Vérifiez-le puis réessayez.'); return; }
        if (x.statut === 401) { location.href = '/pages/compte.html'; return; }
        throw 0;  /* 503 « donnees », 500 « serveur », réseau… */
      })
      .catch(function () { alert('Le carton groupé est momentanément indisponible. Réessayez dans un instant, ou choisissez la commande unique.'); })
      .then(function () { bouton.disabled = false; bouton.classList.remove('q-verif'); });
  }
  /* « J'ai confirmé mon adresse email » : compte relu (et jeton rafraîchi) puis panier redessiné */
  function verifierEmailGroupe(bouton) {
    var u = window.EGCQCompte && window.EGCQCompte.utilisateur();
    if (!u) { rendrePanier(); return; }
    bouton.disabled = true;
    u.reload().then(function () { return u.emailVerified ? u.getIdToken(true) : null; })
      .then(function () {
        if (!u.emailVerified) alert('Votre adresse email n’est pas encore confirmée : ouvrez le lien reçu par email (pensez aux courriers indésirables), puis réessayez.');
        rendrePanier();
      }, function () { bouton.disabled = false; alert('Vérification impossible pour le moment : réessayez dans un instant.'); });
  }
  /* repère permanent : pastille du panier + bandeau de l'onglet Holex, mis à jour à chaque ajout.
     Carton groupé choisi : sans minimum, donc pas de voyant ni de « encore X € pour déclencher l'envoi » (commande unique seulement) */
  function majCartonMini() {
    var ci = cartonInfo(), b = $('q-ouvrir-panier'), groupe = groupeActif() && modeHolex(ci) === 'groupe';
    var feu = ci.lourd ? 'rouge' : ci.feu;  /* commande unique : un seul colis de 10 kg */
    if (b) {
      var f = $('q-feu-mini');
      if (!f) { f = document.createElement('span'); f.id = 'q-feu-mini'; f.className = 'q-feu'; b.appendChild(f); }
      f.className = 'q-feu q-feu-' + feu;
      f.style.display = ci.n && !groupe ? '' : 'none';
      f.title = ci.n && !groupe ? (ci.lourd ? 'Carton Atelier : trop lourd pour un colis de ' + ci.c.poids_max + ' kg' : ci.complet ? 'Carton Atelier complet' : 'Carton Atelier : encore ' + eur(ci.reste)) : '';
    }
    var z = $('q-carton-direct');
    if (z) z.innerHTML = !ci.n
      ? (groupeActif() ? '<span class="q-feu"></span> Aucun article Holex dans votre panier pour l’instant.'
        : '<span class="q-feu q-feu-rouge"></span> Votre carton est vide : ajoutez des articles Holex, le voyant passe au vert quand il peut partir.')
      : groupe
      ? '👥 Vos articles Holex : <strong>' + eur(ci.montant).replace(',00', '') + '</strong> · ' + poidsTexte(ci) + ' — '
        + (ci.lourdGroupe ? 'trop lourds pour partir en ligne : devis par le formulaire du panier'
          : 'carton groupé sans minimum' + (ci.lourd ? '' : ci.complet ? ', ou commande unique' : ', ou commande unique dès '
            + eur(ci.c.minimum_affiche || 940).replace(',00', '') + ' (encore ' + eur(ci.reste).replace(',00', '') + ')'))
      : '<span class="q-feu q-feu-' + feu + '"></span> Votre carton : ' + (ci.lourd ? '<strong>trop lourd</strong> pour un seul colis de ' + ci.c.poids_max + ' kg'
        : ci.complet ? '<strong>complet, il peut partir</strong>' : 'encore <strong>' + eur(ci.reste).replace(',00', '') + '</strong> pour déclencher l’envoi') + ' · ' + poidsTexte(ci);
  }
  function majPastille() {
    majCartonMini();
    /* un carton (lignes « pack ») compte pour 1 */
    var packs = {};
    var n = etat.panier.reduce(function (s, l) { if (l.pack) { if (packs[l.pack]) return s; packs[l.pack] = 1; return s + 1; } return s + l.q; }, 0);
    $('q-pastille').textContent = n;
    $('q-pastille').style.display = n ? '' : 'none';
  }
  var QTE_MAX_CB = 20;  /* paiement par carte : 20 exemplaires par article au plus (functions/panier.js) ; le formulaire accepte davantage */
  function ajouter(ref) {
    var l = etat.panier.find(function (x) { return x.ref === ref && !x.pack; });
    if (l) l.q += 1; else etat.panier.push({ ref: ref, q: 1 });
    sauver(); majPastille(); rendrePanier();
    $('q-tiroir').classList.add('ouvert');
  }
  /* pack à prix fixe (lignes avec packPrix, page /packs-pro/) : compté UNE fois à son prix */
  function prixPack(id) {
    var l = etat.panier.find(function (x) { return x.pack === id; });
    return l && typeof l.packPrix === 'number' ? l.packPrix : null;
  }
  /* commande groupée : les articles Holex partent (et sont réglés) par le carton groupé, hors du total du panier ;
     carton groupé impossible (article exclu, trop lourd) : ils restent dans le total (commande unique, demande ou devis) */
  function enModeGroupe() { var ci = cartonInfo(); return groupeActif() && ci.n > 0 && modeHolex(ci) === 'groupe' && groupePossible(ci); }
  function filtreHorsGroupe() { var g = enModeGroupe(); return function (l) { var a = article(l.ref); return !(g && a && a.pc && !l.pack); }; }
  /* lignes réglées en bas du panier (articles connus, hors carton groupé) */
  function lignesHorsGroupe() { var f = filtreHorsGroupe(); return etat.panier.filter(function (l) { return article(l.ref) && f(l); }); }
  function totalPanier() {
    var vus = {};
    var lignes = etat.panier.filter(filtreHorsGroupe());
    var t = lignes.reduce(function (s, l) {
      if (l.pack && prixPack(l.pack) !== null) { if (vus[l.pack]) return s; vus[l.pack] = 1; return s + prixPack(l.pack); }
      var a = article(l.ref); return a ? s + a.prix * l.q : s;
    }, 0);
    /* packs pro à prix fixe : prix annoncé « tout compris, livré » = prix final, forfait inclus (seuls au panier) */
    var inclus = lignes.length > 0 && lignes.every(function (l) { return l.pack && prixPack(l.pack) !== null; });
    var offert = !inclus && lignes.length > 0 && forfaitOffert(t);
    var f = lignes.length && !offert && !inclus ? etat.catalogue.forfait_expedition : 0;
    return { articles: t, forfait: f, offert: offert, inclus: inclus, total: t + f };
  }
  function rendrePanier() {
    var corps = $('q-tiroir-corps');
    if (!etat.panier.length) {
      corps.innerHTML = (etat.packsRetires ? '<p class="q-carton-note" role="status">ℹ️ Un pack de votre panier n’est plus proposé tel quel : il a été retiré. Écrivez-nous, nous vous proposons une composition proche.</p>' : '')
        + '<p class="q-vide">Votre panier est vide.</p>';
      $('q-tiroir-pied').style.display = 'none'; return;
    }
    $('q-tiroir-pied').style.display = '';
    /* carton promo (lignes marquées « pack ») : UNE ligne, détail des articles sans prix unitaire, prix final seul */
    var vusPack = {};
    corps.innerHTML = etat.panier.map(function (l) {
      var a = article(l.ref); if (!a) return '';
      if (l.pack) {
        if (vusPack[l.pack]) return '';
        vusPack[l.pack] = true;
        var lp = etat.panier.filter(function (x) { return x.pack === l.pack && article(x.ref); });
        var tp = prixPack(l.pack) !== null ? prixPack(l.pack) : lp.reduce(function (s, x) { return s + article(x.ref).prix * x.q; }, 0);
        /* pack pro : le détail reprend les libellés du pack (promo.json) quand il les connaît */
        var pkDef = ((etat.promo && etat.promo.packs_pro) || []).find(function (p) { return p.id === l.pack; });
        var nomDe = function (x) { var y = pkDef && (pkDef.articles || []).find(function (z) { return z.ref === x.ref; }); return (y && y.nom) || article(x.ref).nom; };
        return '<div class="q-ligne q-ligne-pack">'
          + '<img src="' + esc(a.img) + '" alt="">'
          + '<div class="q-ligne-infos"><div class="q-ligne-nom"><span class="q-pack-promo">' + (prixPack(l.pack) !== null ? (/^HX/.test(l.ref) ? 'Holex' : 'Pack pro') : 'Offre spéciale') + '</span> ' + esc(l.packTitre || 'Pack') + '</div>'
          + '<div class="q-ligne-prix"><strong>' + eur(tp) + '</strong> · ' + lp.length + ' articles, 1 colis</div>'
          + '<details class="q-pack-detail"><summary>Voir le détail des articles</summary><ul>'
          + lp.map(function (x) { return '<li>' + (x.q > 1 && !/^\d+ × /.test(nomDe(x)) ? x.q + ' × ' : '') + esc(nomDe(x)) + '</li>'; }).join('')
          + '</ul></details></div>'
          + '<button type="button" class="q-suppr" data-suppr-pack="' + esc(l.pack) + '" aria-label="Retirer le pack">×</button>'
          + '</div>';
      }
      return '<div class="q-ligne">'
        + '<img src="' + esc(a.img) + '" alt="">'
        + '<div class="q-ligne-infos"><div class="q-ligne-nom">' + esc(a.nom) + '</div>'
        + '<div class="q-ligne-prix">' + eur(a.prix) + ' × '
        + '<button type="button" data-moins="' + esc(l.ref) + '">−</button> ' + l.q + ' '
        + '<button type="button" data-plus="' + esc(l.ref) + '">+</button></div></div>'
        + '<button type="button" class="q-suppr" data-suppr="' + esc(l.ref) + '" aria-label="Retirer">×</button>'
        + '</div>';
    }).join('');
    var ci = cartonInfo();
    if (ci.attente) {  /* gamme Holex pas encore là (ou échec) : on la (re)demande, rien ne part en attendant */
      corps.insertAdjacentHTML('afterbegin', '<div class="q-carton q-feu-rouge" role="status"><p class="q-carton-msg">⏳ Chargement de vos articles Holex… '
        + (etat.holexEchec ? '<button type="button" class="q-reessayer" data-holex-recharger="1">Réessayer</button>' : '') + '</p></div>');
      if (!etat.holexEchec) chargerHolex();
    } else if (ci.n) corps.insertAdjacentHTML('afterbegin', groupeActif() ? blocChoix(ci) : blocCarton(ci));
    if (etat.holexRetires) corps.insertAdjacentHTML('afterbegin', '<p class="q-carton-note" role="status">ℹ️ '
      + (etat.packsRetires ? 'Un pack de votre panier n’est plus proposé tel quel : il a été retiré. Écrivez-nous, nous vous proposons une composition proche.'
        : etat.holexRetires > 1 ? etat.holexRetires + ' articles Holex de votre panier ne sont plus proposés : ils ont été retirés.' : 'Un article Holex de votre panier n’est plus proposé : il a été retiré.') + '</p>');
    var g = $('q-groupage');
    if (!g) { g = document.createElement('div'); g.id = 'q-groupage'; $('q-tiroir-pied').insertBefore(g, $('q-tiroir-pied').firstChild); }
    g.innerHTML = messageGroupage();
    /* tant que le Carton Atelier n'est pas complet, la commande ne peut pas partir */
    /* articles Holex : commande unique quand le Carton Atelier est complet ; en commande groupée, ils partent par le bouton du carton groupé.
       Trop lourd (devis) : le formulaire reste ouvert. Trop lourd = pour le mode choisi : 5 colis de 10 kg en carton groupé, 1 en commande unique. */
    var choixGroupe = ci.n > 0 && modeHolex(ci) === 'groupe', groupe = choixGroupe && groupePossible(ci);
    var tropLourd = choixGroupe ? ci.lourdGroupe : ci.lourd;
    /* tout le panier part par le carton groupé : en bas, ni total à 0 €, ni indication de paiement, ni formulaire (messageGroupage le dit) */
    var seulGroupe = groupe && !lignesHorsGroupe().length;
    var bloque = ci.attente || (ci.n > 0 && (groupe || (!ci.complet && !tropLourd)));
    if ($('q-envoyer')) $('q-envoyer').disabled = bloque || !!etat.envoiEnCours;
    var nb = $('q-carton-bloque');
    if (!nb && $('q-form')) { nb = document.createElement('p'); nb.id = 'q-carton-bloque'; nb.className = 'q-carton-note'; $('q-form').appendChild(nb); }
    if (nb) nb.innerHTML = ci.attente ? '⏳ Vos articles Holex se chargent : la commande sera possible dans un instant.'
      : groupe ? '👥 Vos articles Holex partent par le carton groupé (bouton plus haut) : le total ci-dessus ne les comprend pas. Vos autres articles se commandent ensuite, avec leur propre forfait d’expédition.'
      : tropLourd && ci.n > 0 ? (!choixGroupe && !ci.lourdGroupe && groupeActif()
        ? '📦 Commande Holex trop lourde pour la commande unique (un seul colis de ' + ci.c.poids_max + ' kg) : passez au carton groupé (plus haut, sans minimum), ou envoyez-la par ce formulaire, nous vous proposons un devis.'
        : '📦 Commande Holex trop lourde pour partir en ligne : envoyez-la par ce formulaire, nous vous proposons un devis.')
      : choixGroupe && bloque ? '👥 Le carton groupé ne peut pas prendre tous vos articles Holex (voir plus haut) : retirez ou demandez les articles signalés' + (uniqueSolution(ci) ? ', ou passez en commande unique' : '') + '.'
      : bloque ? '🔴 Complétez le Carton Atelier (encore ' + eur(ci.reste).replace(',00', '') + ')' + (groupeActif() ? ', passez au carton groupé (sans minimum),' : '') + ' ou retirez ses articles Holex pour commander le reste.' : '';
    corps.insertAdjacentHTML('beforeend', blocSuggestions());  // zone défilante : ne réduit pas la liste
    var t = totalPanier();
    $('q-total-articles').textContent = seulGroupe ? '—' : eur(t.articles);
    $('q-total-forfait').textContent = seulGroupe ? '—' : t.inclus ? 'inclus dans le prix du pack' : t.offert ? 'offert 🎁' : eur(t.forfait);
    $('q-total').textContent = seulGroupe ? '—' : eur(t.total);
    ['q-total-articles', 'q-total-forfait', 'q-total'].forEach(function (id) { var r = $(id).parentNode; if (r) r.style.display = seulGroupe ? 'none' : ''; });
    if ($('q-form-zone')) $('q-form-zone').style.display = seulGroupe ? 'none' : '';
    // paiement CB direct : uniquement UN article, quantité 1, disponible, lien actif
    var cb = $('q-payer-cb');
    var ok = etat.panier.length === 1 && etat.panier[0].q === 1
          && statutDe(etat.panier[0].ref) === 'disponible' && etat.liens[etat.panier[0].ref];
    cb.style.display = ok ? '' : 'none';
    // paiement par carte du PANIER (fonction serveur) : tous les articles disponibles, un seul colis ≤ 30 kg
    var bp = $('q-payer-panier');
    /* colis Screwfix ≤ 30 kg ; le Carton Atelier a sa propre limite (cartonInfo) */
    var poidsPanier = etat.panier.reduce(function (s, l) { var a = article(l.ref); return s + (a && a.poids && !a.pc ? a.poids * l.q : 0); }, 0);
    var okPanier = !ok && !!(etat.paiement && etat.paiement.panier_cb && etat.paiement.fonction)
      && etat.panier.every(function (l) { var a = article(l.ref); return a && !a.devis && (statutDe(l.ref) === 'disponible' || (a.pc && statutDe(l.ref) === 'faible')); })
      && poidsPanier <= 30
      /* limites du paiement serveur : 50 lignes, 20 exemplaires par article (au-delà : formulaire) */
      && etat.panier.length <= 50
      && Object.values(etat.panier.reduce(function (m, l) { m[l.ref] = (m[l.ref] || 0) + l.q; return m; }, {})).every(function (q) { return q <= QTE_MAX_CB; })
      /* Carton Atelier : paiement par carte seulement quand le serveur le gère (réglage carton_cb) et carton complet */
      && !ci.attente && (!ci.n || (modeHolex(ci) === 'unique' && etat.paiement.carton_cb && ci.complet && !ci.lourd))
      /* prix fixe de pack inconnu du serveur de paiement : ces packs passent par le formulaire */
      && !etat.panier.some(function (l) { return l.pack && typeof l.packPrix === 'number'; });
    if (bp) {
      bp.style.display = okPanier ? '' : 'none';
      bp.textContent = '💳 Payer le panier par carte — ' + eur(t.total);
    }
    $('q-cb-indice').style.display = (ok || okPanier || seulGroupe) ? 'none' : '';
  }

  /* ---------------- offre de lancement (assets/data/quincaillerie-offre.json) ----------------
     Forfait d'expédition offert dès le seuil d'articles, jusqu'à la date de fin. Côté Stripe,
     le code est pré-rempli sur le lien d'un article éligible (même seuil, même date). */
  function offreActive() {
    var o = etat.offre, t = Date.now();
    return !!(o && o.actif && t >= Date.parse(o.debut) && t <= Date.parse(o.fin));
  }
  function forfaitOffert(montantArticles) { return offreActive() && montantArticles >= etat.offre.seuil; }
  function afficherOffre() {
    if (!offreActive() || $('q-offre')) return;
    var o = etat.offre, d = document.createElement('div');
    d.id = 'q-offre'; d.className = 'q-offre';
    d.innerHTML = '🎁 <strong>' + esc(o.titre) + '</strong> : forfait d’expédition (' + eur(o.forfait) + ') <strong>offert dès '
      + eur(o.seuil).replace(',00', '') + ' d’articles</strong>, appliqué automatiquement (code <strong>' + esc(o.code) + '</strong>) — jusqu’au '
      + esc(o.fin_texte) + ', pour les ' + o.max_commandes + ' premières commandes.';
    var avant = $('q-filtres');
    avant.parentNode.insertBefore(d, avant);
  }

  /* ---------------- pack du moment (assets/data/quincaillerie-promo.json) ----------------
     Un pack par semaine, présenté en un seul prix : la SOMME des prix en vigueur (aucune remise,
     la marge de chaque article est conservée), forfait d'expédition offert si l'offre de lancement
     s'applique. On affiche la 1re variante de la semaine dont TOUS les articles sont disponibles au
     comptoir (le panier se paie alors par carte) ; sinon la suivante ; sinon rien. */
  function packDisponible(pack) {
    var L = (pack.articles || []).map(function (x) { return { a: article(x.ref), nom: x.nom }; });
    return L.length && L.every(function (x) { return x.a && !x.a.devis && statutDe(x.a.ref) === 'disponible'; }) ? L : null;
  }
  /* Packs affichés : le pack du moment de la semaine (1re variante disponible), puis les packs permanents disponibles. */
  function packsAffiches() {
    var p = etat.promo, t = Date.now(), out = [];
    if (!(p && p.actif)) return out;
    var sem = (p.semaines || []).find(function (s) { return t >= Date.parse(s.debut) && t <= Date.parse(s.fin); });
    if (sem) {
      for (var i = 0; i < sem.packs.length; i++) {
        var L = packDisponible(sem.packs[i]);
        if (L) { out.push({ pack: sem.packs[i], L: L, etiquette: p.etiquette }); break; }
      }
    }
    (p.permanents || []).forEach(function (pk) {
      var L = packDisponible(pk);
      if (L) out.push({ pack: pk, L: L, etiquette: pk.etiquette || 'Pack' });
    });
    return out;
  }
  /* Packs « pro » à prix fixe (promo.json → packs_pro, page /packs-pro/) : affichés si tous leurs articles sont au catalogue. */
  /* super pack Holex (categorie « superpacks ») : ses photos sont dans promo.json, il s'affiche sans charger la gamme Holex */
  function estSuper(pk) { return pk.categorie === 'superpacks'; }
  function packsPro() {
    var p = etat.promo;
    return ((p && p.packs_pro) || []).map(function (pk) {
      var sup = estSuper(pk);
      var L = (pk.articles || []).map(function (x) { return { a: article(x.ref) || (sup && x.img ? { ref: x.ref, img: x.img } : null), nom: x.nom }; });
      return L.length && L.every(function (x) { return x.a && !x.a.devis; }) ? { pack: pk, L: L, sup: sup } : null;
    }).filter(Boolean);
  }
  function vignettes(L, sansLien) {  /* super pack : aucune fiche liée (on n'y montre que le contenu et le prix du pack) */
    return '<div class="q-pack-vign">' + L.slice(0, 6).map(function (x) {
      return '<a' + (sansLien ? '' : ' href="' + esc(ADR.fiche(x.a)) + '"') + ' title="' + esc(x.nom) + '"><img src="' + esc(x.a.img) + '" alt="' + esc(x.nom) + '" loading="lazy"></a>';
    }).join('') + '</div>';
  }
  function cartePackMoment(pm, i) {
    var total = pm.L.reduce(function (s, x) { return s + x.a.prix; }, 0);
    return '<article class="q-pack q-pack-l">'
      + '<div class="q-pack-info"><span class="q-promo-et">' + esc(pm.etiquette) + '</span><h2>' + esc(pm.pack.titre) + '</h2>'
      + '<p class="q-pack-liste">' + pm.L.map(function (x) { return esc(x.nom); }).join(' · ') + '</p></div>'
      + vignettes(pm.L)
      + '<div class="q-pack-pied"><div><div class="q-promo-prix">' + eur(total) + '</div>'
      + '<div class="q-promo-inclus">livré, octroi de mer compris'
      + (forfaitOffert(total) ? ' · <strong>forfait offert</strong>' : ' · + forfait ' + eur(etat.catalogue.forfait_expedition)) + '</div></div>'
      + '<button type="button" class="q-promo-btn" data-pack="' + i + '">🛒 Ajouter le pack</button></div>'
      + '</article>';
  }
  function cartePackPro(pp, j) {
    var p = pp.pack;
    return '<article class="q-pack q-pack-l q-pack-pro">'
      + '<div class="q-pack-info"><span class="q-promo-et">' + esc(p.marque || 'Pack pro') + '</span><h2>' + esc(p.titre) + '</h2>'
      + '<p class="q-pack-liste">' + esc(p.accroche ? p.accroche + ' — ' : '') + pp.L.length + ' articles · ' + esc(p.colis || '1 colis') + '</p></div>'
      + vignettes(pp.L, pp.sup)
      + '<div class="q-pack-pied"><div><div class="q-promo-prix">' + eur(p.prix) + '</div>'
      + '<div class="q-promo-inclus">' + esc(p.prix_txt || 'le pack complet') + ', livré, octroi de mer compris · <a href="/packs-pro/' + (pp.sup ? '#cat=superpacks' : '') + '">détails</a></div></div>'
      + '<button type="button" class="q-promo-btn" data-pro="' + j + '">🛒 Ajouter le pack</button></div>'
      + '</article>';
  }
  /* Défilement vertical automatique, une carte à la fois (copie de la 1re carte en fin de piste pour boucler sans retour visible). */
  var mouvementReduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function defileur(panneau) {
    var fen = panneau.querySelector('.q-defil'), piste = panneau.querySelector('.q-defil-piste');
    var items = [].slice.call(piste.children), n = items.length, i = 0, timer = null, vu = true;
    var pts = panneau.querySelector('.q-defil-points');
    if (n > 1) piste.appendChild(items[0].cloneNode(true)).setAttribute('aria-hidden', 'true');
    var tous = [].slice.call(piste.children);
    tous[n] && (tous[n].inert = true);
    function pas() { return n > 1 ? tous[1].offsetTop - tous[0].offsetTop : 0; }
    function placer(k, sec) {
      piste.style.transition = sec || mouvementReduit ? 'none' : '';
      piste.style.transform = 'translateY(' + (-k * pas()) + 'px)';
    }
    function aller(k, sec) {
      if (n < 2) return;
      if (i >= n) { placer(0, true); piste.offsetHeight; i = 0; }  /* clic pendant le passage sur la copie : recaler d'abord */
      if (k >= n && (sec || mouvementReduit)) k = 0;                /* sans transition, pas de transitionend : aller directement au 1er */
      if (k < 0) { placer(n, true); piste.offsetHeight; k = n - 1; }
      i = k; placer(i, sec);
      var reel = i % n;
      items.forEach(function (it, j) { it.inert = j !== reel; it.setAttribute('aria-hidden', j !== reel ? 'true' : 'false'); });
      if (pts) [].forEach.call(pts.children, function (b, j) { b.setAttribute('aria-current', j === reel ? 'true' : 'false'); });
    }
    piste.addEventListener('transitionend', function (e) { if (e.target === piste && i >= n) aller(0, true); });
    function hauteur() {
      var h = 0;
      tous.forEach(function (it) { it.style.minHeight = ''; });
      tous.forEach(function (it) { h = Math.max(h, it.offsetHeight); });
      tous.forEach(function (it) { it.style.minHeight = h + 'px'; });
      fen.style.height = h + 'px';
      aller(i % n, true);
    }
    /* Défilement TOUJOURS automatique (demande du gérant, 30/10/2026) : pas d'arrêt au survol, au toucher ni après un clic.
       Seules exceptions : le bouton ⏸ (arrêt volontaire) et la navigation au clavier dans une carte (focus visible).
       « Animations réduites » sur l'appareil : le pack change sans glissement, mais change quand même. */
    var arret = false, btnPause = panneau.querySelector('[data-pause]');
    function clavier() { try { return !!panneau.querySelector('.q-defil :focus-visible'); } catch (e) { return false; } }
    function tic() { if (!arret && !clavier() && vu && !panneau.hidden && !document.hidden) aller(i + 1); }
    function demarrer() { clearInterval(timer); if (n > 1) timer = setInterval(tic, 4500); }
    function majPause() {
      if (!btnPause) return;
      btnPause.textContent = arret ? '▶' : '⏸';
      btnPause.setAttribute('aria-pressed', arret ? 'true' : 'false');
      btnPause.setAttribute('aria-label', arret ? 'Relancer le défilement des packs' : 'Mettre en pause le défilement des packs');
    }
    panneau.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dir],[data-aller],[data-pause]');
      if (!b) return;
      if (b.hasAttribute('data-pause')) { arret = !arret; majPause(); }
      else if (b.dataset.dir) aller(i % n + (+b.dataset.dir)); else aller(+b.dataset.aller);
      demarrer();
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vu = e[0].isIntersecting; }).observe(fen);
    window.addEventListener('resize', function () { clearTimeout(panneau._rz); panneau._rz = setTimeout(hauteur, 150); });
    return { hauteur: hauteur, demarrer: demarrer };
  }
  function panneauPacks(cle, cartes) {
    var n = cartes.length;
    return '<div class="q-op-panneau" id="q-op-' + cle + '" role="tabpanel" aria-labelledby="q-op-t-' + cle + '" hidden>'
      + '<div class="q-defil"><div class="q-defil-piste">' + cartes.join('') + '</div></div>'
      + (n > 1 ? '<div class="q-defil-nav"><button type="button" data-dir="-1" aria-label="Pack précédent">▲</button>'
        + '<div class="q-defil-points">' + cartes.map(function (c, j) { return '<button type="button" data-aller="' + j + '" aria-label="Pack ' + (j + 1) + '"></button>'; }).join('') + '</div>'
        + '<button type="button" data-dir="1" aria-label="Pack suivant">▼</button>'
        + '<button type="button" class="q-defil-pause" data-pause aria-pressed="false" aria-label="Mettre en pause le défilement des packs">⏸</button></div>' : '')
      + '</div>';
  }
  function afficherPromo() {
    var packs = packsAffiches(), pros = packsPro();
    if ((!packs.length && !pros.length) || $('q-promo')) return;
    var onglets = [];
    if (packs.length) onglets.push({ cle: 'moment', titre: '🔥 Packs du moment', cartes: packs.map(cartePackMoment) });
    var machines = [], supers = [];
    pros.forEach(function (pp, j) { (pp.sup ? supers : machines).push(cartePackPro(pp, j)); });  /* j = index dans pros (data-pro) */
    if (machines.length) onglets.push({ cle: 'pro', titre: '⚡ Packs pro machines', cartes: machines });
    if (supers.length) onglets.push({ cle: 'super', titre: '💎 Super packs Holex', cartes: supers });
    var d = document.createElement('div');  /* pas <section> : refonte.css force un padding !important sur les sections en mobile */
    d.id = 'q-promo'; d.className = 'q-op'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Packs');
    d.innerHTML = '<div class="q-op-tabs" role="tablist">' + onglets.map(function (o) {
        return '<button type="button" role="tab" id="q-op-t-' + o.cle + '" aria-controls="q-op-' + o.cle + '" data-onglet="' + o.cle + '">'
          + o.titre + ' <span>' + o.cartes.length + '</span></button>';
      }).join('') + '<a class="q-op-tout" href="/packs-pro/">Tous les packs →</a></div>'
      + onglets.map(function (o) { return panneauPacks(o.cle, o.cartes); }).join('');
    var avant = $('q-filtres');
    avant.parentNode.insertBefore(d, avant);
    var defs = {};
    onglets.forEach(function (o) { defs[o.cle] = defileur($('q-op-' + o.cle)); });
    function ouvrir(cle) {
      onglets.forEach(function (o) {
        var actif = o.cle === cle;
        $('q-op-' + o.cle).hidden = !actif;
        $('q-op-t-' + o.cle).setAttribute('aria-selected', actif ? 'true' : 'false');
        $('q-op-t-' + o.cle).tabIndex = actif ? 0 : -1;
      });
      defs[cle].hauteur(); defs[cle].demarrer();
      try { localStorage.setItem('egc_quinc_onglet_packs', cle); } catch (e) {}
    }
    var memo = null;
    try { memo = localStorage.getItem('egc_quinc_onglet_packs'); } catch (e) {}
    ouvrir(defs[memo] ? memo : onglets[0].cle);
    /* hauteur recalculée une fois les polices chargées (le texte des cartes change alors de hauteur) */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var o = d.querySelector('.q-op-panneau:not([hidden])'); if (o) defs[o.id.slice(5)].hauteur(); });
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-onglet]');
      if (t) { ouvrir(t.dataset.onglet); return; }
      var b = e.target.closest('[data-pack]');
      if (b) {
        packs[+b.dataset.pack].L.forEach(function (x) {
          if (!etat.panier.some(function (l) { return l.ref === x.a.ref; })) etat.panier.push({ ref: x.a.ref, q: 1 });
        });
      } else if ((b = e.target.closest('[data-pro]'))) {
        var p = pros[+b.dataset.pro].pack;
        etat.panier = etat.panier.filter(function (l) { return l.pack !== p.id; });
        p.articles.forEach(function (x) { etat.panier.push({ ref: x.ref, q: x.q || 1, pack: p.id, packTitre: p.titre, packPrix: p.prix }); });
        if (window.gtag) gtag('event', 'add_to_cart', { currency: 'EUR', value: p.prix, items: [{ item_id: p.id, item_name: p.titre }] });
      } else return;
      sauver(); majPastille(); rendrePanier();
      $('q-tiroir').classList.add('ouvert');
    });
    d.querySelector('.q-op-tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var k = onglets.findIndex(function (o) { return $('q-op-t-' + o.cle).getAttribute('aria-selected') === 'true'; });
      var o = onglets[(k + (e.key === 'ArrowRight' ? 1 : onglets.length - 1)) % onglets.length];
      ouvrir(o.cle); $('q-op-t-' + o.cle).focus();
    });
  }

  /* ---------------- paniers groupés : un seul forfait par commande ----------------
     Le forfait d'expédition est dû une fois par colis : l'afficher comme une économie
     dès le 2e article, et proposer des accessoires compatibles disponibles. */
  /* Accessoires COMPATIBLES uniquement (assets/data/quincaillerie-compat.json : table établie à partir des
     caractéristiques — même plateforme de batterie, emmanchement, diamètre et alésage, gamme électrique… —
     et contre-vérifiée) ; en stock, pas déjà au panier. Aucune compatibilité connue : aucune suggestion. */
  function suggestions(n) {
    var dans = {};
    etat.panier.forEach(function (l) { dans[l.ref] = true; });
    var listes = etat.panier.slice().reverse().map(function (l) {  /* dernier article ajouté en premier */
      return (etat.compat[l.ref] || []).map(function (r) { return { ref: r, pour: l.ref }; });
    });
    var res = [], vus = {};
    for (var rang = 0; res.length < n && listes.some(function (x) { return x.length > rang; }); rang++) {
      listes.forEach(function (x) {
        var c = x[rang];
        if (!c || res.length >= n || dans[c.ref] || vus[c.ref]) return;
        var a = article(c.ref);
        if (!a || a.devis || statutDe(c.ref) !== 'disponible') return;
        vus[c.ref] = true;
        res.push({ a: a, pour: article(c.pour) });
      });
    }
    return res;
  }
  function messageGroupage() {
    var f = etat.catalogue.forfait_expedition, groupe = enModeGroupe(), lignes = lignesHorsGroupe();
    /* carton groupé : ses articles Holex ne comptent ni dans le total ni pour l'offre ; on ne parle que des « autres articles »,
       envoyés à part (jamais « dans le même colis ») ; sans autre article, rien à régler en bas du panier */
    if (groupe && !lignes.length) return '<p class="q-groupe">👥 Vos articles Holex partent par le <strong>carton groupé</strong> (plus haut) : rien à payer maintenant.</p>';
    var vusU = {}, unites = lignes.reduce(function (s, l) {
      if (l.pack) { if (vusU[l.pack]) return s; vusU[l.pack] = 1; return s + 1; }
      return s + l.q;
    }, 0);
    if (totalPanier().inclus) return '<p class="q-groupe q-groupe-ok">✅ Prix fixe du pack : <strong>transport et forfait d’expédition inclus</strong>.</p>';
    if (offreActive()) {
      var manque = etat.offre.seuil - totalPanier().articles;  /* hors carton groupé (totalPanier) */
      return manque > 0
        ? (groupe
          ? '<p class="q-groupe">🎁 Vos autres articles : plus que <strong>' + eur(manque) + '</strong> et leur forfait d’expédition (' + eur(f) + ') vous est offert — offre de lancement jusqu’au ' + esc(etat.offre.fin_texte) + '.</p>'
          : '<p class="q-groupe">🎁 Plus que <strong>' + eur(manque) + '</strong> d’articles et le forfait d’expédition (' + eur(f) + ') vous est offert — offre de lancement jusqu’au ' + esc(etat.offre.fin_texte) + '.</p>')
        : '<p class="q-groupe q-groupe-ok">🎁 <strong>Forfait d’expédition offert</strong> sur ' + (groupe ? 'vos autres articles' : 'cette commande') + ' — offre de lancement.</p>';
    }
    return unites >= 2
      ? '<p class="q-groupe q-groupe-ok">✅ Un seul forfait d’expédition pour vos ' + unites + (groupe ? ' autres' : '') + ' articles : <strong>' + eur(f * (unites - 1)) + ' économisés</strong> par rapport à des commandes séparées.</p>'
      : groupe
      ? '<p class="q-groupe">💡 Vos autres articles partent à part, avec un forfait d’expédition (' + eur(f) + ') qui couvre toute leur commande.</p>'
      : '<p class="q-groupe">💡 Le forfait d’expédition (' + eur(f) + ') couvre toute la commande : ajoutez d’autres articles, ils partent dans le même colis sans frais d’envoi en plus.</p>';
  }
  function blocSuggestions() {
    var html = '';
    var s = suggestions(3);
    var plusieurs = etat.panier.length > 1;
    if (s.length) {
      html += '<div class="q-sugg"><div class="q-sugg-titre">Accessoires compatibles · même colis</div>' + s.map(function (x) {
        var a = x.a;
        return '<div class="q-sugg-ligne"><img src="' + esc(a.img) + '" alt="" loading="lazy">'
          + '<span class="q-sugg-txt"><a class="q-sugg-nom" href="' + ADR.fiche(a) + '">' + esc(a.nom) + '</a>'
          + (plusieurs && x.pour ? '<small class="q-sugg-pour">pour : ' + esc(x.pour.nom.length > 48 ? x.pour.nom.slice(0, 46) + '…' : x.pour.nom) + '</small>' : '') + '</span>'
          + '<span class="q-sugg-prix">' + eur(a.prix) + '</span>'
          + '<button type="button" class="q-sugg-add" data-add="' + esc(a.ref) + '" aria-label="Ajouter ' + esc(a.nom) + ' au panier">+</button></div>';
      }).join('') + '</div>';
    }
    return html;
  }

  /* ---------------- rayons (chips + menu burger) ---------------- */
  function choisirRayon(slug) {
    etat.cat = slug;
    etat.visibles = PAR_PAGE;
    $('q-cat').value = slug;
    rendre(); majRayons(); fermerMenu();
  }

  function majRayons() {
    document.querySelectorAll('#q-rayons button').forEach(function (b) {
      if (b.dataset.marque) { b.classList.toggle('actif', Object.keys(etat.f.m).length === 1 && !!etat.f.m[b.dataset.marque]); return; }
      b.classList.toggle('actif', b.dataset.rayon === etat.cat);
    });
    document.querySelectorAll('#q-menu-rayons a').forEach(function (a) {
      a.classList.toggle('actif', a.dataset.rayon === etat.cat);
    });
  }

  function ouvrirMenu() { document.body.classList.add('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'true'); }
  function fermerMenu() { document.body.classList.remove('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'false'); }

  /* onglets d'accès rapide (DeWalt, Holex, tous les rayons) dans la barre de filtres, et menu des rayons :
     reconstruits quand la gamme Holex arrive ; les rayons eux-mêmes se choisissent dans le menu et le volet de filtres */
  function rendreRayons() {
    var comptes = {};
    etat.catalogue.articles.forEach(function (a) { comptes[a.cat] = (comptes[a.cat] || 0) + 1; });
    var total = etat.catalogue.articles.length;
    var nbDewalt = etat.catalogue.articles.filter(function (a) { return fac(a).m === 'DeWalt'; }).length;
    var nbHolex = etat.holex ? etat.holex.articles.length : 0;
    var chips = (nbDewalt ? '<button type="button" class="q-onglet-dewalt" data-marque="DeWalt" title="Toute la gamme DeWalt">DeWalt <span>' + nbDewalt + '</span></button>' : '')
      + '<button type="button" class="q-onglet-holex" data-marque="Holex" title="Outillage de précision Holex — envoi groupé en Carton Atelier">Holex' + (nbHolex ? ' <span>' + nbHolex.toLocaleString('fr-FR') + '</span>' : '') + '</button>'
      + '<button type="button" data-rayon="">Tous les rayons</button>';
    var menu = '<div class="q-menu-titre">Rayons</div>'
      + '<a href="#" data-rayon="">Tous les rayons <span class="nb">' + total.toLocaleString('fr-FR') + '</span></a>';
    etat.catalogue.categories.forEach(function (c) {
      if (!comptes[c.slug]) return; /* rayon vide : rien à montrer */
      menu += '<a href="#" data-rayon="' + esc(c.slug) + '">' + esc(c.nom)
        + ' <span class="nb">' + comptes[c.slug] + '</span></a>';
    });
    $('q-rayons').innerHTML = chips;
    $('q-menu-rayons').innerHTML = menu;
    majRayons();
  }
  function construireRayons() {
    rendreRayons();
    $('q-rayons').addEventListener('click', function (e) {
      var d = e.target.closest('button[data-marque]');
      if (d) { /* onglet de marque : bascule le filtre marque seul */
        var m = d.dataset.marque, seul = Object.keys(etat.f.m).length === 1 && etat.f.m[m];
        etat.f.m = {}; if (!seul) etat.f.m[m] = true;
        etat.visibles = PAR_PAGE; rendre(); majRayons();
        if (m === 'Holex' && !seul) chargerHolex();
        return;
      }
      var b = e.target.closest('button[data-rayon]');
      if (b) choisirRayon(b.dataset.rayon);
    });
    $('q-menu-rayons').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-rayon]');
      if (a) { e.preventDefault(); choisirRayon(a.dataset.rayon); }
    });
    $('q-burger').addEventListener('click', ouvrirMenu);
    $('q-menu-fermer').addEventListener('click', fermerMenu);
    $('q-menu-fond').addEventListener('click', fermerMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerMenu(); });
  }

  /* ---------------- gamme Holex (assets/data/quincaillerie-holex.json) ----------------
     Fichier volumineux : chargé à la demande (onglet Holex, rayon Usinage, recherche,
     panier ou adresse qui en contient), puis ajouté au catalogue une fois pour toutes. */
  /* Article Holex retiré de la gamme depuis qu'il a été mis au panier : on l'enlève
     (sinon le panier attendrait indéfiniment) et on prévient le client une fois. */
  function purgerHolex() {
    if (!etat.holex) return;
    var avant = etat.panier.length, packs = {};
    /* une ligne d'un pack retirée de la gamme : TOUT le pack sort (jamais un pack incomplet à son prix fixe) */
    etat.panier.forEach(function (l) { if (l.pack && /^HX/.test(l.ref) && !article(l.ref)) packs[l.pack] = 1; });
    etat.panier = etat.panier.filter(function (l) { return !(l.pack && packs[l.pack]) && (!/^HX/.test(l.ref) || article(l.ref)); });
    if (Object.keys(packs).length) etat.packsRetires = Object.keys(packs).length;
    if (etat.panier.length < avant) { etat.holexRetires = avant - etat.panier.length; sauver(); }
  }
  function chargerHolex() {
    if (etat.holexCharge) return etat.holexCharge;
    if ($('q-compte')) $('q-compte').classList.add('q-chargement');
    etat.holexCharge = fetch('/assets/data/quincaillerie-holex.json')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (h) {
        etat.holex = h;
        var sel = $('q-cat');
        (h.categories || []).forEach(function (c) {
          if (etat.catalogue.categories.some(function (x) { return x.slug === c.slug; })) return;
          etat.catalogue.categories.push(c);
          var o = document.createElement('option'); o.value = c.slug; o.textContent = c.nom; sel.appendChild(o);
        });
        h.articles.forEach(function (a) { etat.index[a.ref] = a; });
        etat.catalogue.articles = etat.catalogue.articles.concat(h.articles);
        purgerHolex();
        var catUrl = etat.catDemandee;
        if (!etat.cat && catUrl && h.categories.some(function (c) { return c.slug === catUrl; })) { etat.cat = catUrl; sel.value = catUrl; }
        rendreRayons(); rendre(); rendrePanier();
      })
      .catch(function () { etat.holexCharge = null; etat.holexEchec = true; if (etat.panier.some(function (l) { return /^HX/.test(l.ref); })) rendrePanier(); })
      .then(function () { if ($('q-compte')) $('q-compte').classList.remove('q-chargement'); });
    return etat.holexCharge;
  }
  function holexUtile() {
    var p = new URLSearchParams(location.search);
    return etat.f.m.Holex || etat.cat === 'usinage' || p.get('cat') === 'usinage' || etat.catDemandee === 'usinage' || etat.mots.length
      || etat.panier.some(function (l) { return /^HX/.test(l.ref); });
  }

  /* ---------------- paiement sécurisé ---------------- */
  function verifierPuisPayer(ref) {
    var bouton = document.querySelector('[data-pay="' + ref + '"]') || $('q-payer-cb');
    if (bouton) { bouton.disabled = true; bouton.classList.add('q-verif'); }
    // stock RECHARGÉ au moment du clic (anti-cache) : dernière synchronisation serveur
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        etat.stock = j.stock || etat.stock; etat.stockMaj = j.maj || etat.stockMaj;
        if (statutDe(ref) !== 'disponible' || !etat.liens[ref]) {
          rendre(); rendrePanier();
          alert('Cet article vient de passer indisponible chez le fournisseur.\nUtilisez « Envoyer ma commande » : nous vérifions et vous confirmons le délai avant tout encaissement.');
          return;
        }
        var url = etat.liens[ref];
        var sep = url.indexOf('?') > -1 ? '&' : '?';
        var ts = Date.now();
        /* mémorise l'achat en cours : au retour ?paiement=succes, la
           commande est enregistrée dans l'espace client (option B) */
        var a = article(ref);
        var offert = a && forfaitOffert(a.prix);
        try {
          localStorage.setItem('egc_quinc_commande', JSON.stringify({
            ref: ref, nom: a ? a.nom : '', montant: a ? (offert ? a.prix : a.lien_prix) : 0, ts: ts
          }));
        } catch (e) {}
        window.location.href = url + sep + 'client_reference_id=' + encodeURIComponent('QF-' + ref + '_' + ts)
          + (offert ? '&prefilled_promo_code=' + encodeURIComponent(etat.offre.code) : '');
      })
      .catch(function () { alert('Vérification de disponibilité impossible — réessayez dans un instant.'); })
      .finally(function () { if (bouton) { bouton.disabled = false; bouton.classList.remove('q-verif'); } });
  }

  /* ---------------- paiement par carte du panier (fonction serveur) ----------------
     Le serveur relit prix, stock, poids et offre dans les fichiers publiés : le navigateur
     n'envoie que les références et quantités. */
  function payerPanier() {
    var bp = $('q-payer-panier');
    bp.disabled = true; bp.classList.add('q-verif');
    var t = totalPanier(), ts = Date.now();
    fetch(etat.paiement.fonction, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panier: etat.panier.map(function (l) { return { ref: l.ref, q: l.q }; }), email: ($('q-email').value || '').trim() })
    }).then(function (r) { return r.json().then(function (j) { return { statut: r.status, j: j }; }); })
      .then(function (x) {
        if (x.statut === 200 && x.j.url) {
          /* offre de lancement annoncée au panier mais refusée par Stripe (code épuisé) : on prévient avant de payer */
          if (t.offert && x.j.offert === false && !confirm('L’offre de lancement est épuisée : le forfait d’expédition ('
            + eur(etat.catalogue.forfait_expedition) + ') sera facturé. Continuer vers le paiement ?')) return;
          try {
            localStorage.setItem('egc_quinc_commande', JSON.stringify({
              carton: cartonInfo().n > 0, panier: true, ref: etat.panier.map(function (l) { return l.q + 'x' + l.ref; }).join(','),
              nom: 'panier de ' + etat.panier.reduce(function (s, l) { return s + l.q; }, 0) + ' article(s)',
              montant: t.total + (t.offert && x.j.offert === false ? etat.catalogue.forfait_expedition : 0), ts: ts
            }));
          } catch (e) {}
          window.location.href = x.j.url;
          return;
        }
        if (x.statut === 409 && x.j.erreur === 'panier') {
          alert('Certains articles ne peuvent pas être payés par carte :\n' + x.j.refus.map(function (r) { return '• ' + r.ref + ' : ' + r.motif; }).join('\n')
            + '\nRetirez-les du panier, ou envoyez la commande : nous vous confirmons le délai.');
          return fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
            .then(function (j) {
              /* Holex : sa disponibilité vient de la gamme chargée une fois ; on marque les refus pour ne plus proposer la carte */
              x.j.refus.forEach(function (r) { var a = /^HX/.test(r.ref) && article(r.ref); if (a && /indisponible/.test(r.motif)) a.s = 'rupture'; });
              etat.stock = j.stock || etat.stock; rendre(); rendrePanier();
            });
        }
        if (x.statut === 409 && x.j.erreur === 'carton') {
          alert('Le Carton Atelier n’est pas encore complet. Ajoutez des articles Holex ou retirez-les pour payer le reste.');
          return;
        }
        if (x.statut === 400) {
          alert('Ce panier ne peut pas être payé par carte en ligne (trop de lignes ou quantités inhabituelles). Envoyez la commande par le formulaire : nous vous répondons sous 24 h ouvrées.');
          return;
        }
        if (x.statut === 409 && x.j.erreur === 'cartons') {
          alert('Votre commande Holex est trop lourde pour un paiement en ligne. Envoyez-la par le formulaire : nous vous proposons un devis.');
          return;
        }
        if (x.statut === 409 && x.j.erreur === 'carton_cb') {
          alert('Le paiement par carte du Carton Atelier n’est pas encore ouvert. Envoyez la commande par le formulaire : nous vous recontactons sous 24 h ouvrées.');
          return;
        }
        if (x.statut === 409 && x.j.erreur === 'poids') {
          alert('Votre commande pèse environ ' + x.j.poids + ' kg : au-delà de 30 kg, elle ne tient pas dans un colis. Envoyez-la par le formulaire, nous vous proposons un devis.');
          return;
        }
        throw 0;
      })
      .catch(function () { alert('Paiement par carte momentanément indisponible. Envoyez la commande par le formulaire : nous vous recontactons sous 24 h ouvrées.'); })
      .finally(function () { bp.disabled = false; bp.classList.remove('q-verif'); });
  }

  /* ---------------- retour de paiement Stripe (option B) ----------------
     Les liens de paiement renvoient sur ?paiement=succes : la ligne payée
     sort du panier et, si le client est connecté, la commande est
     enregistrée dans son espace (users/{uid}/orders via le pont). */
  function traiterRetourPaiement() {
    if (new URLSearchParams(location.search).get('paiement') !== 'succes') return;
    var cmd = null;
    try {
      cmd = JSON.parse(localStorage.getItem('egc_quinc_commande') || 'null');
      localStorage.removeItem('egc_quinc_commande');
    } catch (e) {}
    var sid = new URLSearchParams(location.search).get('sid') || '';
    history.replaceState(null, '', location.pathname);
    if (cmd && Date.now() - (cmd.ts || 0) < 2 * 3600 * 1000) {
      /* panier payé : il est vidé ; sinon la ligne payée (mono-article, qté 1) sort du panier */
      etat.panier = cmd.panier ? [] : etat.panier.filter(function (l) { return !(l.ref === cmd.ref && l.q === 1); });
      sauver(); rendre(); rendrePanier();
      cmd.sid = sid;
      if (window.EGCQCompte) {
        window.EGCQCompte.pret.then(function (u) {
          if (u) window.EGCQCompte.enregistrerCommande(cmd);
        });
      }
    }
    var bandeau = document.createElement('div');
    bandeau.setAttribute('role', 'status');
    bandeau.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#17631a;color:#fff;padding:.7rem 1.3rem;border-radius:50px;font-weight:700;font-size:.85rem;z-index:99999;box-shadow:0 10px 28px rgba(0,0,0,.35);';
    bandeau.textContent = cmd && cmd.carton
      ? '✅ Paiement validé — merci ! Carton Atelier : livraison ' + cartonConfig().delai + '.'
      : '✅ Paiement validé — merci ! Article disponible : livraison sous 7 jours ouvrés.';
    document.body.appendChild(bandeau);
    setTimeout(function () { bandeau.remove(); }, 7000);
    if (window.gtag) gtag('event', 'purchase_return', { currency: 'EUR', value: cmd ? cmd.montant : 0 });
  }

  /* ---------------- commande par formulaire ---------------- */
  function envoyerCommande(ev) {
    ev.preventDefault();
    var email = $('q-email').value.trim();
    var tel = $('q-tel').value.trim();
    if (!email) { alert('Indiquez votre email pour recevoir la confirmation.'); return; }
    var ci = cartonInfo();
    if (etat.envoiEnCours) return;
    if (ci.attente) { alert('Vos articles Holex se chargent encore : réessayez dans un instant.'); chargerHolex(); return; }
    if (ci.n && !ci.complet && !ci.lourd) { alert('Le Carton Atelier n’est pas encore complet : encore ' + eur(ci.reste) + ' d’articles Holex, ou retirez-les pour commander le reste.'); return; }
    var t = totalPanier();
    var vusPack = {};
    var lignes = etat.panier.map(function (l) {
      var a = article(l.ref);
      if (l.pack && prixPack(l.pack) !== null) {
        if (vusPack[l.pack]) return null;
        vusPack[l.pack] = 1;
        return '1 × PACK [' + l.pack + '] ' + (l.packTitre || 'Pack') + ' — ' + eur(prixPack(l.pack)) + ' (prix fixe) : '
          + etat.panier.filter(function (x) { return x.pack === l.pack; }).map(function (x) { return x.q + ' × ' + x.ref + (/^HX/.test(x.ref) ? ' (' + statutDe(x.ref) + ')' : ''); }).join(', ');
      }
      if (!a) return null;  /* article retiré du catalogue depuis l'ajout au panier : ignoré, comme dans le panier affiché */
      return (a.pc ? '[CARTON ATELIER] ' : '') + l.q + ' × [' + l.ref + '] ' + a.nom + ' — ' + eur(a.prix * l.q) + ' (' + statutDe(l.ref) + ')';
    }).filter(function (x) { return x; }).join('\n');
    var corps = {
      _subject: 'Commande quincaillerie — ' + eur(t.total),
      email: email, telephone: tel,
      panier: lignes,
      carton_atelier: ci.n ? ci.n + ' article(s), ' + kgTexte(ci.kg) + ' kg, ' + ci.cartons + ' carton(s)' + (ci.lourd ? ' — PLUS DE ' + (ci.c.cartons_max || 1) + ' CARTON(S) : DEVIS' : '') : 'aucun',
      /* note interne : chaque pack à prix fixe inclut le forfait ; avec un super pack et un autre pack, il n'est dû qu'une fois */
      total: (t.inclus ? eur(t.total) + ' — packs à prix fixe, forfait d’expédition inclus' 
           : t.offert ? eur(t.total) + ' — forfait d’expédition OFFERT (offre de lancement, code ' + etat.offre.code + ')'
                      : eur(t.total) + ' dont forfait expédition ' + eur(t.forfait))
        + (Object.keys(vusPack).length > 1 && etat.panier.some(function (x) { return x.pack && /^HX/.test(x.ref); })
          ? ' — ' + Object.keys(vusPack).length + ' packs à prix fixe avec super pack : forfait d’expédition à ne compter qu’une fois, déduire ' + eur(etat.catalogue.forfait_expedition * (Object.keys(vusPack).length - 1)) + ' à la confirmation' : ''),
      _template: 'box'
    };
    var bouton = $('q-envoyer');
    bouton.disabled = true; bouton.textContent = 'Envoi…'; etat.envoiEnCours = true;
    fetch('https://formsubmit.co/ajax/egreencitys@gmail.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corps)
    }).then(function (r) {
      if (!r.ok) throw 0;
      if (window.gtag) gtag('event', 'generate_lead', { currency: 'EUR', value: t.total });
      etat.panier = []; sauver(); majPastille(); rendrePanier();
      $('q-form-zone').innerHTML = '<p class="q-merci">✅ Commande reçue. Nous vérifions chaque article chez le fournisseur et revenons vers vous sous 24 h ouvrées avec la confirmation et le règlement — aucun encaissement avant validation.</p>';
    }).catch(function () {
      etat.envoiEnCours = false; bouton.disabled = false; bouton.textContent = 'Envoyer ma commande';
      alert('Envoi impossible pour le moment. Écrivez-nous : egreencitys@gmail.com');
    });
  }

  /* ---------------- init ---------------- */
  function initEvenements() {
    $('q-recherche').addEventListener('input', function () { etat.recherche = this.value; majMots(); etat.visibles = PAR_PAGE; rendre(); if (etat.mots.length) chargerHolex(); });
    $('q-cat').addEventListener('change', function () { etat.cat = this.value; etat.visibles = PAR_PAGE; rendre(); majRayons(); });
    $('q-dispo').addEventListener('change', function () { etat.dispo = this.checked; etat.visibles = PAR_PAGE; rendre(); });
    $('q-tri').addEventListener('change', function () { etat.tri = this.value; rendre(); });
    $('q-plus').addEventListener('click', function () { etat.visibles += PAR_PAGE; rendre(); });
    $('q-ouvrir-panier').addEventListener('click', function () { rendrePanier(); $('q-tiroir').classList.add('ouvert'); chargerGroupe(); });
    /* formulaire du carton groupé : la saisie survit aux rendus du panier (ajout d'un article, voyant…) */
    document.addEventListener('input', function (e) {
      var c = e.target;
      etat.saisieGroupe = etat.saisieGroupe || {};
      if (c.name === 'qg-avertir') { if (c.checked) etat.saisieGroupe['qg-avertir'] = c.value; return; }
      if (!c.id || c.id.indexOf('qg-') !== 0) return;
      etat.saisieGroupe[c.id] = c.type === 'checkbox' ? c.checked : c.value;
    });
    document.addEventListener('change', function (e) {
      var c = e.target;
      if (c.id === 'qg-cgv') { etat.saisieGroupe = etat.saisieGroupe || {}; etat.saisieGroupe[c.id] = c.checked; }
      if (c.name === 'qg-avertir' && c.checked) { etat.saisieGroupe = etat.saisieGroupe || {}; etat.saisieGroupe['qg-avertir'] = c.value; }
    });
    /* connexion ou déconnexion : le carton groupé propose le formulaire ou le lien de connexion */
    document.addEventListener('egcq-compte', function () { if ($('q-tiroir').classList.contains('ouvert')) rendrePanier(); });
    $('q-fermer-panier').addEventListener('click', function () { $('q-tiroir').classList.remove('ouvert'); });
    $('q-form').addEventListener('submit', envoyerCommande);
    $('q-payer-cb').addEventListener('click', function () { verifierPuisPayer(etat.panier[0].ref); });
    if ($('q-payer-panier')) $('q-payer-panier').addEventListener('click', payerPanier);
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-add],[data-pay],[data-plus],[data-moins],[data-suppr],[data-suppr-pack],[data-holex-recharger],[data-mode-holex],[data-groupe-rejoindre],[data-groupe-verifier]');
      if (!t) return;
      if (t.dataset.modeHolex) { etat.modeHolex = t.dataset.modeHolex; rendrePanier(); majCartonMini(); if (t.dataset.modeHolex === 'groupe') chargerGroupe(true); return; }
      if (t.dataset.groupeRejoindre) { rejoindreGroupe(t); return; }
      if (t.dataset.groupeVerifier) { verifierEmailGroupe(t); return; }
      if (t.dataset.holexRecharger) { etat.holexEchec = false; chargerHolex(); rendrePanier(); return; }
      if (t.dataset.add) ajouter(t.dataset.add);
      if (t.dataset.pay) verifierPuisPayer(t.dataset.pay);
      if (t.dataset.plus) { etat.panier.find(function (x) { return x.ref === t.dataset.plus && !x.pack; }).q += 1; sauver(); rendrePanier(); majPastille(); }
      if (t.dataset.moins) {
        var l = etat.panier.find(function (x) { return x.ref === t.dataset.moins && !x.pack; });
        l.q -= 1; if (l.q <= 0) etat.panier = etat.panier.filter(function (x) { return x !== l; });
        sauver(); rendrePanier(); majPastille();
      }
      if (t.dataset.suppr) { etat.panier = etat.panier.filter(function (x) { return x.pack || x.ref !== t.dataset.suppr; }); sauver(); rendrePanier(); majPastille(); }
      if (t.dataset.supprPack) { etat.panier = etat.panier.filter(function (x) { return x.pack !== t.dataset.supprPack; }); sauver(); rendrePanier(); majPastille(); }
    });
  }

  Promise.all([
    fetch('/assets/data/quincaillerie-catalogue.json').then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-liens.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('/assets/data/quincaillerie-offre.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/assets/data/quincaillerie-paiement.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/assets/data/quincaillerie-facettes.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('/assets/data/quincaillerie-compat.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('/assets/data/quincaillerie-promo.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (res) {
    etat.promo = res[7];
    etat.facettes = res[5] || {};
    etat.compat = res[6] || {};
    etat.catalogue = res[0];
    etat.offre = res[3];
    etat.paiement = res[4];
    etat.stock = res[1].stock || {}; etat.stockMaj = res[1].maj || 0;
    etat.liens = res[2] || {};
    indexer();
    var sel = $('q-cat');
    etat.catalogue.categories.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.slug; o.textContent = c.nom; sel.appendChild(o);
    });
    /* rayon pré-sélectionné : ?cat=slug (liens du menu et de la fiche produit) */
    var catInitiale = new URLSearchParams(location.search).get('cat');
    etat.catDemandee = catInitiale;
    if (catInitiale && etat.catalogue.categories.some(function (c) { return c.slug === catInitiale; })) {
      etat.cat = catInitiale; sel.value = catInitiale;
    }
    lireUrl(); /* ?q= &marque= &v= … : recherche et filtres repris de l'adresse */
    charger(); initEvenements(); initVolet(); construireRayons(); afficherOffre(); afficherPromo(); rendre(); rendrePanier();
    traiterRetourPaiement();
    reconcilierPanierCompte();
    chargerGroupe();
    if (holexUtile()) chargerHolex();
    /* anciens liens #a=REF (modal) : chaque produit a désormais sa page */
    if (location.hash.indexOf('#a=') === 0) {
      var refInitiale = decodeURIComponent(location.hash.slice(3));
      if (article(refInitiale)) { location.replace(ADR.fiche(article(refInitiale))); return; }
    }
    /* retour depuis une fiche produit : #panier rouvre le tiroir */
    if (location.hash === '#panier') {
      rendrePanier(); $('q-tiroir').classList.add('ouvert');
      history.replaceState(null, '', location.pathname + location.search);
    }
  }).catch(function (e) {
    $('q-grille').innerHTML = '<p class="q-vide">Le catalogue ne se charge pas. Rafraîchissez la page ou contactez-nous : egreencitys@gmail.com</p>';
  });
})();
