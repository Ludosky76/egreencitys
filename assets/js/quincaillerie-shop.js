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
        + '<br>📦 Ces articles partent ensemble dans le <strong>' + esc(c.nom) + '</strong> : commande possible <strong>à partir d’environ '
        + eur(c.minimum_affiche).replace(',00', '') + ' d’articles Holex</strong>, livraison ' + esc(c.delai) + '. Le voyant du panier vous dit en direct ce qu’il reste.'
        + '<div id="q-carton-direct" class="q-carton-direct"></div></div>' : '')
      + (dewalt ? '<div class="q-bandeau-dewalt"><strong>DeWalt</strong> : outils filaires et sans fil, batteries 18 V XR et 54 V FlexVolt, accessoires — '
        + 'prix tout compris livrés en Guyane. <a href="/quincaillerie-pro/marque/dewalt.html">Toute la gamme DeWalt</a></div>' : '')
      + (puces.length ? '<div class="qv-puces">' + puces.join('') + '<button type="button" class="qv-puce qv-tout" data-effacer="1">Tout effacer</button></div>' : '');
  }
  /* état des filtres dans l'adresse : partageable, et conservé au retour depuis une fiche */
  function syncUrl() {
    var p = new URLSearchParams();
    if (etat.recherche) p.set('q', etat.recherche);
    if (etat.cat) p.set('cat', etat.cat);
    GROUPES.forEach(function (G) { var v = Object.keys(etat.f[G.cle]); if (v.length) p.set(G.cle === 'm' ? 'marque' : G.cle, v.join(',')); });
    if (etat.f.pmin !== '') p.set('pmin', etat.f.pmin);
    if (etat.f.pmax !== '') p.set('pmax', etat.f.pmax);
    if (etat.dispo) p.set('dispo', '1');
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
    return (etat.holex && etat.holex.carton) || { nom: 'Carton Atelier', seuil_points: 100, eur_par_point: 7.8, minimum_affiche: 780, poids_max: 10, cartons_max: 5, prix_carton: 150, dims: [30, 40, 40], delai: 'environ 2 semaines après l’envoi du carton' };
  }
  function cartonInfo() {
    var c = cartonConfig(), pts = 0, montant = 0, kg = 0, n = 0, unites = [];
    etat.panier.forEach(function (l) {
      var a = article(l.ref);
      if (!a || !a.pc) return;
      var p = a.poids || 0.5;  /* poids inconnu : 0,5 kg, jamais 0 */
      pts += a.pc * l.q; montant += a.prix * l.q; kg += p * l.q; n += l.q;
      for (var i = 0; i < l.q && unites.length < 400; i++) unites.push(p);
    });
    /* lignes Holex dont la gamme n'est pas (encore) chargée : rien ne part tant qu'on ne les connaît pas */
    var attente = !etat.holex && etat.panier.some(function (l) { return /^HX/.test(l.ref) && !article(l.ref); });
    var pct = Math.min(100, Math.floor(pts / c.seuil_points * 100));
    var parPoint = pts > 0 ? montant / pts : c.eur_par_point;
    return {
      c: c, n: n, kg: kg, pct: Math.floor(pct / 5) * 5, montant: montant, attente: attente,
      complet: pts >= c.seuil_points,
      reste: pts >= c.seuil_points ? 0 : Math.ceil((c.seuil_points - pts) * parPoint / 5) * 5,
      feu: pts >= c.seuil_points ? 'vert' : pct >= 50 ? 'jaune' : 'rouge',
      cartons: nbCartons(unites, c.poids_max),
      lourd: nbCartons(unites, c.poids_max) > (c.cartons_max || 5)
    };
  }
  /* La commande peut partir en plusieurs cartons de poids_max kg (le transport est compté au kilo
     dans chaque prix) : rangement « plus lourd d'abord » dans le premier carton où il reste de la place. */
  function nbCartons(unites, max) {
    var cartons = [];
    unites.slice().sort(function (a, b) { return b - a; }).forEach(function (p) {
      for (var i = 0; i < cartons.length; i++) if (cartons[i] + p <= max) { cartons[i] += p; return; }
      cartons.push(p);
    });
    return Math.max(1, cartons.length);
  }
  function poidsTexte(ci) {
    return kgTexte(ci.kg) + ' kg' + (ci.cartons > 1 ? ' · ' + ci.cartons + ' cartons' : ' / ' + ci.c.poids_max + ' kg');
  }
  function kgTexte(x) { return x.toLocaleString('fr-FR', { maximumFractionDigits: x < 10 ? 2 : 1 }); }
  function blocCarton(ci) {
    var c = ci.c, d = (c.dims || []).join(' × ');
    var msg = ci.lourd
      ? '⚠️ Votre commande pèse environ <strong>' + kgTexte(ci.kg) + ' kg</strong>, soit plus de ' + (c.cartons_max || 5) + ' cartons. Envoyez la commande, nous vous proposons un devis.'
      : ci.complet
      ? '✅ <strong>Carton complet : il peut partir !</strong> Livraison ' + esc(c.delai) + '.'
        + (ci.cartons > 1 ? ' Votre commande dépasse ' + c.poids_max + ' kg : ' + (ci.cartons - 1) + ' carton' + (ci.cartons > 2 ? 's' : '') + ' en plus, ' + eur((ci.cartons - 1) * (c.prix_carton || 150)).replace(',00', '') + ' (le premier est compris dans les prix).' : '')
      : 'Encore <strong>' + eur(ci.reste).replace(',00', '') + '</strong> d’articles Holex pour déclencher l’envoi du carton (ce montant dépend des articles choisis). Les articles Holex partent ensemble, dès que le carton est complet.';
    return '<div class="q-carton q-feu-' + ci.feu + (ci.lourd ? ' q-carton-lourd' : '') + '" role="status">'
      + '<div class="q-carton-tete"><span class="q-feu" aria-hidden="true"></span><strong>📦 ' + esc(c.nom) + '</strong>'
      + '<span class="q-carton-pct">' + (ci.complet ? 'prêt' : ci.feu === 'jaune' ? 'presque' : 'à compléter') + '</span></div>'
      + '<div class="q-jauge" aria-hidden="true"><span style="width:' + ci.pct + '%"></span></div>'
      + '<p class="q-carton-msg">' + msg + '</p>'
      + '<div class="q-carton-poids"><span>⚖️ ' + poidsTexte(ci) + '</span>'
      + '<span class="q-jauge q-jauge-kg"><span style="width:' + Math.min(100, Math.round(ci.kg / (c.poids_max * ci.cartons) * 100)) + '%"></span></span>'
      + (d ? '<span>' + (ci.cartons > 1 ? ci.cartons + ' cartons ' : 'Carton ') + d + ' cm, ' + c.poids_max + ' kg max chacun</span>' : '') + '</div>'
      + '</div>';
  }
  /* repère permanent : pastille du panier + bandeau de l'onglet Holex, mis à jour à chaque ajout */
  function majCartonMini() {
    var ci = cartonInfo(), b = $('q-ouvrir-panier');
    if (b) {
      var f = $('q-feu-mini');
      if (!f) { f = document.createElement('span'); f.id = 'q-feu-mini'; f.className = 'q-feu'; b.appendChild(f); }
      f.className = 'q-feu q-feu-' + ci.feu;
      f.style.display = ci.n ? '' : 'none';
      f.title = ci.n ? (ci.complet ? 'Carton Atelier complet' : 'Carton Atelier : encore ' + eur(ci.reste)) : '';
    }
    var z = $('q-carton-direct');
    if (z) z.innerHTML = ci.n
      ? '<span class="q-feu q-feu-' + ci.feu + '"></span> Votre carton : ' + (ci.complet ? '<strong>complet, il peut partir</strong>' : 'encore <strong>' + eur(ci.reste).replace(',00', '') + '</strong> pour déclencher l’envoi') + ' · ' + poidsTexte(ci)
      : '<span class="q-feu q-feu-rouge"></span> Votre carton est vide : ajoutez des articles Holex, le voyant passe au vert quand il peut partir.';
  }
  function majPastille() {
    majCartonMini();
    /* un carton (lignes « pack ») compte pour 1 */
    var packs = {};
    var n = etat.panier.reduce(function (s, l) { if (l.pack) { if (packs[l.pack]) return s; packs[l.pack] = 1; return s + 1; } return s + l.q; }, 0);
    $('q-pastille').textContent = n;
    $('q-pastille').style.display = n ? '' : 'none';
  }
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
  function totalPanier() {
    var vus = {};
    var t = etat.panier.reduce(function (s, l) {
      if (l.pack && prixPack(l.pack) !== null) { if (vus[l.pack]) return s; vus[l.pack] = 1; return s + prixPack(l.pack); }
      var a = article(l.ref); return a ? s + a.prix * l.q : s;
    }, 0);
    /* packs pro à prix fixe : prix annoncé « tout compris, livré » = prix final, forfait inclus (seuls au panier) */
    var inclus = etat.panier.length > 0 && etat.panier.every(function (l) { return l.pack && prixPack(l.pack) !== null; });
    var offert = !inclus && etat.panier.length > 0 && forfaitOffert(t);
    var f = etat.panier.length && !offert && !inclus ? etat.catalogue.forfait_expedition : 0;
    /* Carton Atelier : le 1er carton est compris dans le prix des articles Holex, chaque carton en plus est facturé */
    var ci = cartonInfo(), sup = ci.n && !ci.lourd ? (ci.cartons - 1) * (ci.c.prix_carton || 150) : 0;
    return { articles: t, forfait: f, offert: offert, inclus: inclus, cartonsSup: sup, nCartonsSup: sup ? ci.cartons - 1 : 0, total: t + f + sup };
  }
  function rendrePanier() {
    var corps = $('q-tiroir-corps');
    if (!etat.panier.length) { corps.innerHTML = '<p class="q-vide">Votre panier est vide.</p>'; $('q-tiroir-pied').style.display = 'none'; return; }
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
        return '<div class="q-ligne q-ligne-pack">'
          + '<img src="' + esc(a.img) + '" alt="">'
          + '<div class="q-ligne-infos"><div class="q-ligne-nom"><span class="q-pack-promo">' + (prixPack(l.pack) !== null ? 'Pack pro' : 'Offre spéciale') + '</span> ' + esc(l.packTitre || 'Pack') + '</div>'
          + '<div class="q-ligne-prix"><strong>' + eur(tp) + '</strong> · ' + lp.length + ' articles, 1 colis</div>'
          + '<details class="q-pack-detail"><summary>Voir le détail des articles</summary><ul>'
          + lp.map(function (x) { return '<li>' + (x.q > 1 ? x.q + ' × ' : '') + esc(article(x.ref).nom) + '</li>'; }).join('')
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
    } else if (ci.n) corps.insertAdjacentHTML('afterbegin', blocCarton(ci));
    if (etat.holexRetires) corps.insertAdjacentHTML('afterbegin', '<p class="q-carton-note" role="status">ℹ️ '
      + (etat.holexRetires > 1 ? etat.holexRetires + ' articles Holex de votre panier ne sont plus proposés : ils ont été retirés.' : 'Un article Holex de votre panier n’est plus proposé : il a été retiré.') + '</p>');
    var g = $('q-groupage');
    if (!g) { g = document.createElement('div'); g.id = 'q-groupage'; $('q-tiroir-pied').insertBefore(g, $('q-tiroir-pied').firstChild); }
    g.innerHTML = messageGroupage();
    /* tant que le Carton Atelier n'est pas complet, la commande ne peut pas partir */
    var bloque = ci.attente || (ci.n > 0 && !ci.complet);
    if ($('q-envoyer')) $('q-envoyer').disabled = bloque || !!etat.envoiEnCours;
    var nb = $('q-carton-bloque');
    if (!nb && $('q-form')) { nb = document.createElement('p'); nb.id = 'q-carton-bloque'; nb.className = 'q-carton-note'; $('q-form').appendChild(nb); }
    if (nb) nb.innerHTML = ci.attente ? '⏳ Vos articles Holex se chargent : la commande sera possible dans un instant.' : bloque ? '🔴 Complétez le Carton Atelier (encore ' + eur(ci.reste).replace(',00', '') + ') ou retirez ses articles Holex pour commander le reste.' : '';
    corps.insertAdjacentHTML('beforeend', blocSuggestions());  // zone défilante : ne réduit pas la liste
    var t = totalPanier();
    $('q-total-articles').textContent = eur(t.articles);
    $('q-total-forfait').textContent = t.inclus ? 'inclus dans le prix du pack' : t.offert ? 'offert 🎁' : eur(t.forfait);
    var lc = $('q-total-cartons');
    if (!lc) { lc = document.createElement('div'); lc.className = 'q-total-ligne'; lc.id = 'q-total-cartons'; $('q-total').parentNode.parentNode.insertBefore(lc, $('q-total').parentNode); }
    lc.style.display = t.cartonsSup ? '' : 'none';
    lc.innerHTML = t.cartonsSup ? '<span>Carton' + (t.nCartonsSup > 1 ? 's' : '') + ' Atelier supplémentaire' + (t.nCartonsSup > 1 ? 's' : '') + ' (' + t.nCartonsSup + ')</span><span>' + eur(t.cartonsSup) + '</span>' : '';
    $('q-total').textContent = eur(t.total);
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
      /* Carton Atelier : paiement par carte seulement quand le serveur le gère (réglage carton_cb) et carton complet */
      && !ci.attente && (!ci.n || (etat.paiement.carton_cb && ci.complet && !ci.lourd))
      /* prix fixe de pack inconnu du serveur de paiement : ces packs passent par le formulaire */
      && !etat.panier.some(function (l) { return l.pack && typeof l.packPrix === 'number'; });
    if (bp) {
      bp.style.display = okPanier ? '' : 'none';
      bp.textContent = '💳 Payer le panier par carte — ' + eur(t.total);
    }
    $('q-cb-indice').style.display = (ok || okPanier) ? 'none' : '';
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
    var avant = $('q-rayons');
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
  function packsPro() {
    var p = etat.promo;
    return ((p && p.packs_pro) || []).map(function (pk) {
      var L = (pk.articles || []).map(function (x) { return { a: article(x.ref), nom: x.nom }; });
      return L.length && L.every(function (x) { return x.a && !x.a.devis; }) ? { pack: pk, L: L } : null;
    }).filter(Boolean);
  }
  function vignettes(L) {
    return '<div class="q-pack-vign">' + L.slice(0, 6).map(function (x) {
      return '<a href="' + esc(ADR.fiche(x.a)) + '" title="' + esc(x.nom) + '"><img src="' + esc(x.a.img) + '" alt="' + esc(x.nom) + '" loading="lazy"></a>';
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
      + vignettes(pp.L)
      + '<div class="q-pack-pied"><div><div class="q-promo-prix">' + eur(p.prix) + '</div>'
      + '<div class="q-promo-inclus">' + esc(p.prix_txt || 'le pack complet') + ', livré, octroi de mer compris · <a href="/packs-pro/">détails</a></div></div>'
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
    if (pros.length) onglets.push({ cle: 'pro', titre: '⚡ Packs pro machines', cartes: pros.map(cartePackPro) });
    var d = document.createElement('div');  /* pas <section> : refonte.css force un padding !important sur les sections en mobile */
    d.id = 'q-promo'; d.className = 'q-op'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Packs');
    d.innerHTML = '<div class="q-op-tabs" role="tablist">' + onglets.map(function (o) {
        return '<button type="button" role="tab" id="q-op-t-' + o.cle + '" aria-controls="q-op-' + o.cle + '" data-onglet="' + o.cle + '">'
          + o.titre + ' <span>' + o.cartes.length + '</span></button>';
      }).join('') + '<a class="q-op-tout" href="/packs-pro/">Tous les packs →</a></div>'
      + onglets.map(function (o) { return panneauPacks(o.cle, o.cartes); }).join('');
    var avant = $('q-rayons');
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
        p.articles.forEach(function (x) { etat.panier.push({ ref: x.ref, q: 1, pack: p.id, packTitre: p.titre, packPrix: p.prix }); });
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
    var f = etat.catalogue.forfait_expedition;
    var vusU = {}, unites = etat.panier.reduce(function (s, l) {
      if (l.pack) { if (vusU[l.pack]) return s; vusU[l.pack] = 1; return s + 1; }
      return s + l.q;
    }, 0);
    if (totalPanier().inclus) return '<p class="q-groupe q-groupe-ok">✅ Prix fixe du pack : <strong>transport et forfait d’expédition inclus</strong>.</p>';
    if (offreActive()) {
      var manque = etat.offre.seuil - totalPanier().articles;
      return manque > 0
        ? '<p class="q-groupe">🎁 Plus que <strong>' + eur(manque) + '</strong> d’articles et le forfait d’expédition (' + eur(f) + ') vous est offert — offre de lancement jusqu’au ' + esc(etat.offre.fin_texte) + '.</p>'
        : '<p class="q-groupe q-groupe-ok">🎁 <strong>Forfait d’expédition offert</strong> sur cette commande — offre de lancement.</p>';
    }
    return unites >= 2
      ? '<p class="q-groupe q-groupe-ok">✅ Un seul forfait d’expédition pour vos ' + unites + ' articles : <strong>' + eur(f * (unites - 1)) + ' économisés</strong> par rapport à des commandes séparées.</p>'
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

  /* chips et menu des rayons : reconstruits quand la gamme Holex arrive */
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
      chips += '<button type="button" data-rayon="' + esc(c.slug) + '">' + esc(c.nom) + '</button>';
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
    var avant = etat.panier.length;
    etat.panier = etat.panier.filter(function (l) { return !/^HX/.test(l.ref) || article(l.ref); });
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
          try {
            localStorage.setItem('egc_quinc_commande', JSON.stringify({
              panier: true, ref: etat.panier.map(function (l) { return l.q + 'x' + l.ref; }).join(','),
              nom: 'panier de ' + etat.panier.reduce(function (s, l) { return s + l.q; }, 0) + ' article(s)', montant: t.total, ts: ts
            }));
          } catch (e) {}
          window.location.href = x.j.url;
          return;
        }
        if (x.statut === 409 && x.j.erreur === 'panier') {
          alert('Certains articles ne sont plus disponibles :\n' + x.j.refus.map(function (r) { return '• ' + r.ref + ' : ' + r.motif; }).join('\n')
            + '\nRetirez-les du panier, ou envoyez la commande : nous vous confirmons le délai.');
          return fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
            .then(function (j) { etat.stock = j.stock || etat.stock; rendre(); rendrePanier(); });
        }
        if (x.statut === 409 && x.j.erreur === 'carton') {
          alert('Le Carton Atelier n’est pas encore complet. Ajoutez des articles Holex ou retirez-les pour payer le reste.');
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
    history.replaceState(null, '', location.pathname);
    if (cmd && Date.now() - (cmd.ts || 0) < 2 * 3600 * 1000) {
      /* panier payé : il est vidé ; sinon la ligne payée (mono-article, qté 1) sort du panier */
      etat.panier = cmd.panier ? [] : etat.panier.filter(function (l) { return !(l.ref === cmd.ref && l.q === 1); });
      sauver(); rendre(); rendrePanier();
      if (window.EGCQCompte) {
        window.EGCQCompte.pret.then(function (u) {
          if (u) window.EGCQCompte.enregistrerCommande(cmd);
        });
      }
    }
    var bandeau = document.createElement('div');
    bandeau.setAttribute('role', 'status');
    bandeau.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#17631a;color:#fff;padding:.7rem 1.3rem;border-radius:50px;font-weight:700;font-size:.85rem;z-index:99999;box-shadow:0 10px 28px rgba(0,0,0,.35);';
    bandeau.textContent = '✅ Paiement validé — merci ! Article disponible : livraison sous 7 jours ouvrés.';
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
    if (ci.n && !ci.complet) { alert('Le Carton Atelier n’est pas encore complet : encore ' + eur(ci.reste) + ' d’articles Holex, ou retirez-les pour commander le reste.'); return; }
    var t = totalPanier();
    var vusPack = {};
    var lignes = etat.panier.map(function (l) {
      var a = article(l.ref);
      if (l.pack && prixPack(l.pack) !== null) {
        if (vusPack[l.pack]) return null;
        vusPack[l.pack] = 1;
        return '1 × PACK [' + l.pack + '] ' + (l.packTitre || 'Pack') + ' — ' + eur(prixPack(l.pack)) + ' (prix fixe) : '
          + etat.panier.filter(function (x) { return x.pack === l.pack; }).map(function (x) { return x.q + ' × ' + x.ref; }).join(', ');
      }
      if (!a) return null;  /* article retiré du catalogue depuis l'ajout au panier : ignoré, comme dans le panier affiché */
      return (a.pc ? '[CARTON ATELIER] ' : '') + l.q + ' × [' + l.ref + '] ' + a.nom + ' — ' + eur(a.prix * l.q) + ' (' + statutDe(l.ref) + ')';
    }).filter(function (x) { return x; }).join('\n');
    var corps = {
      _subject: 'Commande quincaillerie — ' + eur(t.total),
      email: email, telephone: tel,
      panier: lignes,
      carton_atelier: ci.n ? ci.n + ' article(s), ' + kgTexte(ci.kg) + ' kg, ' + ci.cartons + ' carton(s)' + (ci.lourd ? ' — PLUS DE ' + (ci.c.cartons_max || 5) + ' CARTONS : DEVIS' : '') : 'aucun',
      total: t.inclus ? eur(t.total) + ' — packs à prix fixe, forfait d’expédition inclus'
           : t.offert ? eur(t.total) + ' — forfait d’expédition OFFERT (offre de lancement, code ' + etat.offre.code + ')'
                      : eur(t.total) + ' dont forfait expédition ' + eur(t.forfait),
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
    $('q-ouvrir-panier').addEventListener('click', function () { rendrePanier(); $('q-tiroir').classList.add('ouvert'); });
    $('q-fermer-panier').addEventListener('click', function () { $('q-tiroir').classList.remove('ouvert'); });
    $('q-form').addEventListener('submit', envoyerCommande);
    $('q-payer-cb').addEventListener('click', function () { verifierPuisPayer(etat.panier[0].ref); });
    if ($('q-payer-panier')) $('q-payer-panier').addEventListener('click', payerPanier);
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-add],[data-pay],[data-plus],[data-moins],[data-suppr],[data-suppr-pack],[data-holex-recharger]');
      if (!t) return;
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
