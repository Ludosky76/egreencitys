/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — fiche produit (page dédiée)
   ==========================================================================
   Chaque produit a sa propre page web, statique (générée pour Google par
   _tools/quinc_pages_seo.py, <body data-ref="REF">) :
     /quincaillerie-pro/produit/<nom>-<ref>.html
   L'ancienne adresse /pages/produit-quincaillerie.html?ref=REF y renvoie
   (paramètres utm conservés).
   Données : mêmes fichiers que la boutique (catalogue, stock horaire, liens
   CB, tranches de fiches détaillées). Le panier est partagé avec la boutique
   via localStorage : « Ajouter au panier » renvoie au catalogue, tiroir
   ouvert (#panier).
   ========================================================================== */
(function () {
  'use strict';

  var CLE_PANIER = 'egc_quinc_panier';
  var URL_BOUTIQUE = '/pages/boutique-quincaillerie.html';
  /* quincaillerie-url.js ; repli sur les anciennes adresses si une page en cache ne l'a pas chargé */
  var ADR = window.EGCQUrl || {
    fiche: function (a) { return '/pages/produit-quincaillerie.html?ref=' + encodeURIComponent(a.ref); },
    rayon: function (s) { return '/pages/boutique-quincaillerie.html?cat=' + encodeURIComponent(s); }
  };

  var etat = { catalogue: null, stock: {}, liens: {}, compat: {} };

  function eur(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function $(id) { return document.getElementById(id); }

  var LIBELLES = {
    disponible: ['En stock fournisseur', 'qs-ok'],
    faible: ['Stock faible', 'qs-faible'],
    rupture: ['Sur commande', 'qs-cmd'],
    introuvable: ['Indisponible', 'qs-off'],
    inconnu: ['Disponibilité à confirmer', 'qs-cmd']
  };
  function statutDe(ref) {
    var s = etat.stock[ref];
    return (s && s.s) || 'inconnu';
  }
  function badgeStock(ref) {
    var l = LIBELLES[statutDe(ref)] || LIBELLES.inconnu;
    return '<span class="qs ' + l[1] + '">' + l[0] + '</span>';
  }
  function delaiTexte(ref, a) {
    if (statutDe(ref) === 'disponible') return 'livraison sous 7 jours ouvrés';
    return 'disponibilité à confirmer — faites une demande';
  }
  function urlDemande(ref) { return '/pages/demande-produit.html?ref=' + encodeURIComponent(ref); }

  /* ---------------- panier partagé avec la boutique ----------------
     Même format horodaté que quincaillerie-shop.js : { maj, lignes },
     conservé 7 jours sur l'appareil à compter de la dernière activité. */
  var PANIER_RETENTION = 7 * 24 * 3600 * 1000;
  function panier() {
    try {
      var j = JSON.parse(localStorage.getItem(CLE_PANIER) || 'null');
      if (!j) return [];
      if (Array.isArray(j)) return j; /* ancien format */
      return (j.maj && Date.now() - j.maj > PANIER_RETENTION) ? [] : (j.lignes || []);
    } catch (e) { return []; }
  }
  function majPastille() {
    var n = panier().reduce(function (s, l) { return s + l.q; }, 0);
    $('q-pastille').textContent = n;
    $('q-pastille').style.display = n ? '' : 'none';
  }
  /* accessoire compatible : ajouté sans quitter la fiche (on peut prendre l'outil ensuite) */
  function ajouterSurPlace(ref, bouton) {
    var p = panier();
    var l = p.find(function (x) { return x.ref === ref; });
    if (l) l.q += 1; else p.push({ ref: ref, q: 1 });
    var paquet = { maj: Date.now(), lignes: p };
    try { localStorage.setItem(CLE_PANIER, JSON.stringify(paquet)); } catch (e) {}
    if (window.EGCQCompte && window.EGCQCompte.utilisateur()) window.EGCQCompte.sauverPanier(paquet);
    majPastille();
    if (bouton) { bouton.textContent = '✓ Ajouté au panier'; bouton.disabled = true; }
  }

  function ajouterPanier(ref) {
    var p = panier();
    var l = p.find(function (x) { return x.ref === ref; });
    if (l) l.q += 1; else p.push({ ref: ref, q: 1 });
    var paquet = { maj: Date.now(), lignes: p };
    try { localStorage.setItem(CLE_PANIER, JSON.stringify(paquet)); } catch (e) {}
    /* client connecté : pousser aussi sur le compte avant de partir
       (au plus 900 ms d'attente pour ne pas bloquer la navigation) */
    var attente = (window.EGCQCompte && window.EGCQCompte.utilisateur())
      ? Promise.race([window.EGCQCompte.sauverPanier(paquet),
                      new Promise(function (r) { setTimeout(r, 900); })])
      : Promise.resolve();
    attente.then(function () { window.location.href = URL_BOUTIQUE + '#panier'; });
  }

  /* ---------------- paiement sécurisé (stock revérifié) ------------ */
  /* ---------------- offre de lancement (assets/data/quincaillerie-offre.json) ----------------
     Forfait d'expédition offert dès le seuil d'articles, jusqu'à la date de fin. Côté Stripe,
     le code est pré-rempli sur le lien d'un article éligible (même seuil, même date). */
  function offreActive() {
    var o = etat.offre, t = Date.now();
    return !!(o && o.actif && t >= Date.parse(o.debut) && t <= Date.parse(o.fin));
  }
  function forfaitOffert(montantArticles) { return offreActive() && montantArticles >= etat.offre.seuil; }

  function verifierPuisPayer(ref) {
    var bouton = document.querySelector('[data-pay="' + ref + '"]');
    if (bouton) { bouton.disabled = true; bouton.classList.add('q-verif'); }
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        etat.stock = j.stock || etat.stock;
        if (statutDe(ref) !== 'disponible' || !etat.liens[ref]) {
          alert('Cet article vient de passer indisponible chez le fournisseur.\nAjoutez-le au panier et envoyez la commande : nous vérifions et vous confirmons le délai avant tout encaissement.');
          location.reload();
          return;
        }
        var url = etat.liens[ref];
        var sep = url.indexOf('?') > -1 ? '&' : '?';
        var ts = Date.now();
        /* option B : mémorise l'achat, enregistré au retour sur la boutique */
        var art = etat.catalogue.articles.find(function (x) { return x.ref === ref; });
        var offert = art && forfaitOffert(art.prix);
        try {
          localStorage.setItem('egc_quinc_commande', JSON.stringify({
            ref: ref, nom: art ? art.nom : '', montant: art ? (offert ? art.prix : art.lien_prix) : 0, ts: ts
          }));
        } catch (e) {}
        window.location.href = url + sep + 'client_reference_id=' + encodeURIComponent('QF-' + ref + '_' + ts)
          + (offert ? '&prefilled_promo_code=' + encodeURIComponent(etat.offre.code) : '');
      })
      .catch(function () { alert('Vérification de disponibilité impossible — réessayez dans un instant.'); })
      .finally(function () { if (bouton) { bouton.disabled = false; bouton.classList.remove('q-verif'); } });
  }

  /* ---------------- fiche détaillée (tranches) ---------------------- */
  function chargerTranche(ref) {
    var cle = ref.charAt(ref.length - 1).toUpperCase();
    return fetch('/assets/data/fiches/f-' + encodeURIComponent(cle) + '.json')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return {}; });
  }

  /* ---------------- rendu ------------------------------------------- */
  function categorie(slug) {
    return etat.catalogue.categories.find(function (c) { return c.slug === slug; });
  }

  function rendreMenu() {
    var comptes = {};
    etat.catalogue.articles.forEach(function (a) { comptes[a.cat] = (comptes[a.cat] || 0) + 1; });
    var html = '<div class="q-menu-titre">Rayons</div>'
      + '<a href="' + URL_BOUTIQUE + '">Tous les rayons <span class="nb">'
      + etat.catalogue.articles.length.toLocaleString('fr-FR') + '</span></a>';
    etat.catalogue.categories.forEach(function (c) {
      if (!comptes[c.slug]) return; /* rayon vide : rien à montrer */
      html += '<a href="' + URL_BOUTIQUE + '?cat=' + encodeURIComponent(c.slug) + '">' + esc(c.nom)
        + ' <span class="nb">' + comptes[c.slug] + '</span></a>';
    });
    $('q-menu-rayons').innerHTML = html;
  }

  /* marques mal saisies chez le fournisseur : même table que ALIAS_MARQUES dans _tools/quinc_pages_seo.py */
  var MARQUES = { 'FatMax': 'Stanley FatMax', 'LOutil Parfait': 'L\'Outil Parfait', 'Triton Electrical': 'Triton', 'Triton Power Tools': 'Triton' };
  function marqueDe(a) {
    var m = String(a.marque || '').trim();
    return /^(sans marque)?$/i.test(m) ? '' : (MARQUES[m] || m);
  }
  /* caractéristiques propres au fournisseur, sans objet ici (SPRINT 60 min, retrait comptoir…) */
  var CAR_EXCLUES = /^(contact fabricant|adresse du fabr|nom du fabricant|livraison sprint|options de retrait)/i;

  function rendreIntrouvable() {
    var rob = document.querySelector('meta[name="robots"]');
    if (rob) rob.setAttribute('content', 'noindex, follow');
    $('qf-haut').innerHTML = '<p class="q-vide" style="grid-column:1/-1;">Article introuvable dans le catalogue.<br><a href="'
      + URL_BOUTIQUE + '">← Retour au catalogue</a></p>';
  }

  function rendre(ref) {
    var a = etat.catalogue.articles.find(function (x) { return x.ref === ref; });
    if (!a) { rendreIntrouvable(); return; }

    /* page statique : titre, description et canonique sont déjà justes (générés) — on n'y touche pas */
    if (!pageStatique) {
      document.title = a.nom + ' — ' + (a.devis ? 'sur devis' : eur(a.prix)) + ' | EGREENCITY\'S PRO QUINCAILLERIE';
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', a.nom + ' : ' + (a.devis ? 'prix sur devis (colis de plus de 30 kg ou hors format)'
        : eur(a.prix) + ' octroi de mer et transport inclus, + forfait d’expédition unique de ' + eur(etat.catalogue.forfait_expedition) + ' par commande')
        + '. Livré en Guyane. Réf. ' + ref + '.');
      var canon = document.querySelector('link[rel="canonical"]');
      if (canon) canon.setAttribute('href', 'https://egreencitys.com' + ADR.fiche(a));
    }
    var mq = marqueDe(a);

    var cat = categorie(a.cat);
    $('qf-fil').innerHTML = '<a href="' + URL_BOUTIQUE + '">Boutique quincaillerie</a>'
      + (cat ? ' › <a href="' + URL_BOUTIQUE + '?cat=' + encodeURIComponent(cat.slug) + '">' + esc(cat.nom) + '</a>' : '')  /* boutique filtrée : recherche et filtres */
      + ' › <span>Réf. ' + esc(ref) + '</span>';

    var dispo = statutDe(ref) === 'disponible';
    var lien = etat.liens[ref];
    $('qf-haut').innerHTML = ''
      + '<div class="qf-image' + (a.img ? '' : ' q-noimg') + '"><img src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></div>'
      + '<div class="qf-infos">'
      +   (mq ? '<div class="q-marque">' + esc(mq) + '</div>' : '')
      +   '<h1>' + esc(a.nom) + '</h1>'
      +   '<div class="q-ref">Réf. ' + esc(ref) + (a.poids ? ' · ' + a.poids.toLocaleString('fr-FR') + ' kg' : '') + (cat ? ' · ' + esc(cat.nom) : '') + '</div>'
      +   badgeStock(ref)
      +   '<div class="qf-prixbloc">'
      +     (a.devis
      ?       '<div class="qf-prix q-prix-devis">Prix sur devis</div>'
      +       '<div class="q-inclus">Colis de plus de 30&nbsp;kg ou hors format : nous chiffrons un acheminement adapté (fret), octroi de mer compris</div>'
      +       '<div class="qf-livraison"><strong>Délai confirmé avec le devis</strong> · livré à domicile partout en Guyane</div>'
      :       '<div class="qf-prix">' + eur(a.prix) + '<span class="q-ttc">TTC</span></div>'
      +       '<div class="q-inclus">Octroi de mer &amp; transport vers la Guyane inclus*</div>'
      +       '<div class="qf-livraison"><strong>' + delaiTexte(ref, a) + '</strong> · livré à domicile partout en Guyane</div>')
      +     '<div class="qf-boutons">'
      +     (a.devis
      ?       '<a class="q-pay" href="' + urlDemande(ref) + '">📦 Demander un devis<span class="q-pay-sub">article de plus de 30 kg ou hors format — réponse sous 24 h ouvrées, suivi dans votre espace client</span></a>'
      :     dispo
      ?       '<button type="button" class="q-add" data-add="' + esc(ref) + '">🛒 Ajouter au panier</button>'
      +       (lien ? (forfaitOffert(a.prix)
      ?         '<button type="button" class="q-pay" data-pay="' + esc(ref) + '">💳 Payer ' + eur(a.prix) + '<span class="q-pay-sub">🎁 forfait d’expédition offert (offre de lancement) — stock revérifié avant paiement</span></button>'
      :         '<button type="button" class="q-pay" data-pay="' + esc(ref) + '">💳 Payer cet article seul ' + eur(a.lien_prix) + '<span class="q-pay-sub">dont ' + eur(etat.catalogue.forfait_expedition) + ' de forfait d’expédition — stock revérifié avant paiement</span></button>') : '')
      +       (offreActive()
      ?         '<p class="qf-astuce">🎁 <strong>' + esc(etat.offre.titre) + '</strong> : forfait d’expédition (' + eur(etat.offre.forfait) + ') <strong>offert dès ' + eur(etat.offre.seuil).replace(',00', '') + ' d’articles</strong>, jusqu’au ' + esc(etat.offre.fin_texte) + ' (' + etat.offre.max_commandes + ' premières commandes). Groupez vos achats : un seul colis.</p>'
      :         '<p class="qf-astuce">💡 Le forfait d’expédition (' + eur(etat.catalogue.forfait_expedition) + ') est <strong>unique par commande</strong> : ajoutez d’autres articles au panier, ils partent dans le même colis sans frais d’envoi en plus.</p>')
      :       '<a class="q-pay" href="' + urlDemande(ref) + '">✉️ Faire une demande<span class="q-pay-sub">nous confirmons prix et délai sous 24 h ouvrées — suivi dans votre espace client</span></a>'
      +       '<button type="button" class="q-alerte" data-alerte="' + esc(ref) + '">🔔 M’alerter au retour en stock</button>')
      +     '</div>'
      +   '</div>'
      +   '<ul class="qf-reassurance">'
      +     '<li>✔ Paiement par carte sécurisé (Stripe) — aucune donnée bancaire conservée</li>'
      +     '<li>✔ Forfait d’expédition unique de 21,12&nbsp;€ par commande, quel que soit le nombre d’articles</li>'
      +     '<li>✔ Garanties légales de conformité et des vices cachés — <a href="/pages/legal/cgv-quincaillerie.html">conditions de vente</a></li>'
      +     '<li>✔ Plus de 30&nbsp;kg ? <a href="/pages/quincaillerie.html">Demandez un devis</a></li>'
      +   '</ul>'
      + '</div>';

    rendreCompat(a);

    /* page statique : description, caractéristiques et « même rayon » sont déjà dans la page ;
       on ajoute seulement la disponibilité en direct sur les cartes du même rayon */
    if (pageStatique) {
      Array.prototype.forEach.call(document.querySelectorAll('#qf-meme-liste .q-card[data-ref]'), function (c) {
        var nom = c.querySelector('.q-nom');
        if (nom && !c.querySelector('.qs')) nom.parentNode.insertAdjacentHTML('afterend', badgeStock(c.getAttribute('data-ref')));
      });
      return;
    }

    /* description + caractéristiques */
    chargerTranche(ref).then(function (tranche) {
      var f = tranche[ref] || {};
      var html = '';
      var d = f.d || a.desc;
      if (d) html += '<h2>Description</h2><p>' + esc(d).replace(/\n+/g, '</p><p>') + '</p>';
      var car = (f.c || []).filter(function (x) { return !CAR_EXCLUES.test(x); });
      if (car.length) {
        html += '<h2>Caractéristiques</h2><ul>'
          + car.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      if (html) {
        $('qf-detail-boite').innerHTML = html;
        $('qf-detail').hidden = false;
      }
    });

    /* même rayon : jusqu'à 4 autres articles, disponibles d'abord */
    var memes = etat.catalogue.articles.filter(function (x) { return x.cat === a.cat && x.ref !== ref; });
    memes.sort(function (x, y) {
      return (statutDe(y.ref) === 'disponible' ? 1 : 0) - (statutDe(x.ref) === 'disponible' ? 1 : 0);
    });
    memes = memes.slice(0, 4);
    if (memes.length) {
      $('qf-meme-liste').innerHTML = memes.map(function (m) {
        var fiche = ADR.fiche(m);
        return '<article class="q-card">'
          + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(m.img) + '" alt="' + esc(m.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
          + '<div class="q-body">'
          + (marqueDe(m) ? '<div class="q-marque">' + esc(marqueDe(m)) + '</div>' : '')
          + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(m.nom) + '</h3></a>'
          + badgeStock(m.ref)
          + '<div class="q-prix">' + eur(m.prix) + '<span class="q-ttc">TTC</span></div>'
          + '<div class="q-inclus">Octroi &amp; livraison inclus*</div>'
          + '</div></article>';
      }).join('');
      $('qf-meme').hidden = false;
    }
  }

  /* ---------------- accessoires compatibles ---------------------------
     Table contre-vérifiée assets/data/quincaillerie-compat.json (même plateforme de batterie,
     emmanchement, diamètre/alésage, gamme…) : rien n'est proposé sans compatibilité établie. */
  function rendreCompat(a) {
    var liste = (etat.compat[a.ref] || []).map(function (r) {
      return etat.catalogue.articles.find(function (x) { return x.ref === r; });
    }).filter(function (x) { return x && !x.devis; });
    if (!liste.length) return;
    liste.sort(function (x, y) { return (statutDe(y.ref) === 'disponible' ? 1 : 0) - (statutDe(x.ref) === 'disponible' ? 1 : 0); });
    liste = liste.slice(0, 4);
    var s = $('qf-compat');
    if (!s) {
      s = document.createElement('section');
      s.className = 'qf-meme qf-compat'; s.id = 'qf-compat';
      $('qf-detail').parentNode.insertBefore(s, $('qf-detail'));
    }
    s.innerHTML = '<h2>🔧 Accessoires compatibles</h2><div class="liste">' + liste.map(function (m) {
      var fiche = ADR.fiche(m);
      return '<article class="q-card">'
        + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(m.img) + '" alt="' + esc(m.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
        + '<div class="q-body">'
        + (marqueDe(m) ? '<div class="q-marque">' + esc(marqueDe(m)) + '</div>' : '')
        + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(m.nom) + '</h3></a>'
        + badgeStock(m.ref)
        + '<div class="q-prix">' + eur(m.prix) + '<span class="q-ttc">TTC</span></div>'
        + (statutDe(m.ref) === 'disponible' ? '<button type="button" class="q-add" data-ajout="' + esc(m.ref) + '">🛒 Ajouter au panier</button>' : '')
        + '</div></article>';
    }).join('') + '</div>';
  }

  /* ---------------- alertes de disponibilité ------------------------- */
  function majBoutonAlerte(actif) {
    var b = document.querySelector('[data-alerte]');
    if (!b) return;
    b.classList.toggle('actif', !!actif);
    b.innerHTML = actif
      ? '🔕 Alerte active — cliquer pour la retirer'
      : '🔔 M’alerter au retour en stock';
  }

  /* ---------------- init --------------------------------------------- */
  function initEvenements() {
    $('q-ouvrir-panier').addEventListener('click', function () { window.location.href = URL_BOUTIQUE + '#panier'; });
    $('q-burger').addEventListener('click', function () { document.body.classList.add('menu-ouvert'); this.setAttribute('aria-expanded', 'true'); });
    $('q-menu-fermer').addEventListener('click', function () { document.body.classList.remove('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'false'); });
    $('q-menu-fond').addEventListener('click', function () { document.body.classList.remove('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { document.body.classList.remove('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-add],[data-pay],[data-alerte],[data-ajout]');
      if (!t) return;
      if (t.dataset.ajout) { ajouterSurPlace(t.dataset.ajout, t); return; }
      if (t.dataset.add) ajouterPanier(t.dataset.add);
      if (t.dataset.pay) verifierPuisPayer(t.dataset.pay);
      if (t.dataset.alerte) {
        if (!(window.EGCQCompte && window.EGCQCompte.utilisateur())) {
          if (confirm('Les alertes de retour en stock sont liées à votre espace client.\nCréer un compte ou se connecter maintenant ?')) {
            window.location.href = '/pages/compte.html';
          }
          return;
        }
        window.EGCQCompte.basculerAlerte(t.dataset.alerte).then(function (actif) {
          if (actif === null) alert('Enregistrement impossible — réessayez dans un instant.');
          else majBoutonAlerte(actif);
        });
      }
    });
  }

  var refParam = new URLSearchParams(location.search).get('ref');
  var pageStatique = document.body.getAttribute('data-ref');
  var ref = pageStatique || refParam || '';

  var catalogue = fetch('/assets/data/quincaillerie-catalogue.json').then(function (r) { return r.json(); });
  /* ancienne adresse ?ref= : départ vers la page statique dès l'arrivée du catalogue (sans attendre
     stock, liens ni offre), en gardant utm et ancre */
  var redirection = false;
  if (!pageStatique && refParam && window.EGCQUrl) {
    catalogue.then(function (c) {
      var art = c.articles.find(function (x) { return x.ref === refParam; });
      if (!art) return;
      redirection = true;
      var p = new URLSearchParams(location.search); p.delete('ref');
      var q = p.toString();
      location.replace(ADR.fiche(art) + (q ? '?' + q : '') + location.hash);
    }).catch(function () {});
  }

  Promise.all([
    catalogue,
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { stock: {} }; }),
    fetch('/assets/data/quincaillerie-liens.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('/assets/data/quincaillerie-offre.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/assets/data/quincaillerie-compat.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    if (redirection) return;
    etat.compat = res[4] || {};
    etat.catalogue = res[0];
    etat.offre = res[3];
    etat.stock = res[1].stock || {};
    etat.liens = res[2] || {};
    initEvenements(); rendreMenu(); majPastille();
    if (ref) rendre(ref); else rendreIntrouvable();
    /* état du bouton d'alerte une fois le compte connu */
    if (window.EGCQCompte) {
      window.EGCQCompte.pret.then(function (u) {
        if (u && ref) majBoutonAlerte(window.EGCQCompte.alertes().indexOf(ref) > -1);
      });
    }
  }).catch(function () {
    /* page statique : la fiche reste lisible, seule la disponibilité en direct manque */
    if (pageStatique) {
      var b = document.querySelector('.qf-boutons');
      if (b) b.insertAdjacentHTML('beforeend', '<p class="qf-astuce">Disponibilité en direct momentanément indisponible : rafraîchissez la page.</p>');
      return;
    }
    $('qf-haut').innerHTML = '<p class="q-vide" style="grid-column:1/-1;">La fiche ne se charge pas. Rafraîchissez la page ou contactez-nous : egreencitys@gmail.com</p>';
  });
})();
