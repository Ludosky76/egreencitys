/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — fiche produit (page dédiée)
   ==========================================================================
   Chaque produit a sa propre page web :
     /pages/produit-quincaillerie.html?ref=REF
   Données : mêmes fichiers que la boutique (catalogue, stock horaire, liens
   CB, tranches de fiches détaillées). Le panier est partagé avec la boutique
   via localStorage : « Ajouter au panier » renvoie au catalogue, tiroir
   ouvert (#panier).
   ========================================================================== */
(function () {
  'use strict';

  var CLE_PANIER = 'egc_quinc_panier';
  var URL_BOUTIQUE = '/pages/boutique-quincaillerie.html';
  var URL_FICHE = '/pages/produit-quincaillerie.html?ref=';

  var etat = { catalogue: null, stock: {}, liens: {} };

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
        try {
          var art = etat.catalogue.articles.find(function (x) { return x.ref === ref; });
          localStorage.setItem('egc_quinc_commande', JSON.stringify({
            ref: ref, nom: art ? art.nom : '', montant: art ? art.lien_prix : 0, ts: ts
          }));
        } catch (e) {}
        window.location.href = url + sep + 'client_reference_id=' + encodeURIComponent('QF-' + ref + '_' + ts);
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

  function rendreIntrouvable() {
    $('qf-haut').innerHTML = '<p class="q-vide" style="grid-column:1/-1;">Article introuvable dans le catalogue.<br><a href="'
      + URL_BOUTIQUE + '">← Retour au catalogue</a></p>';
  }

  function rendre(ref) {
    var a = etat.catalogue.articles.find(function (x) { return x.ref === ref; });
    if (!a) { rendreIntrouvable(); return; }

    document.title = a.nom + ' — ' + eur(a.prix) + ' tout compris | EGREENCITY\'S PRO QUINCAILLERIE';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', a.nom + ' — ' + eur(a.prix) + ' tout compris (octroi de mer et transport inclus), livré en Guyane. Réf. ' + ref + '.');
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', 'https://egreencitys.com' + URL_FICHE + encodeURIComponent(ref));

    var cat = categorie(a.cat);
    $('qf-fil').innerHTML = '<a href="' + URL_BOUTIQUE + '">Boutique quincaillerie</a>'
      + (cat ? ' › <a href="' + URL_BOUTIQUE + '?cat=' + encodeURIComponent(cat.slug) + '">' + esc(cat.nom) + '</a>' : '')
      + ' › <span>Réf. ' + esc(ref) + '</span>';

    var dispo = statutDe(ref) === 'disponible';
    var lien = etat.liens[ref];
    $('qf-haut').innerHTML = ''
      + '<div class="qf-image' + (a.img ? '' : ' q-noimg') + '"><img src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></div>'
      + '<div class="qf-infos">'
      +   (a.marque ? '<div class="q-marque">' + esc(a.marque) + '</div>' : '')
      +   '<h1>' + esc(a.nom) + '</h1>'
      +   '<div class="q-ref">Réf. ' + esc(ref) + (a.poids ? ' · ' + a.poids.toLocaleString('fr-FR') + ' kg' : '') + (cat ? ' · ' + esc(cat.nom) : '') + '</div>'
      +   badgeStock(ref)
      +   '<div class="qf-prixbloc">'
      +     '<div class="qf-prix">' + eur(a.prix) + '<span class="q-ttc">TTC</span></div>'
      +     '<div class="q-inclus">Octroi de mer &amp; transport vers la Guyane inclus*</div>'
      +     '<div class="qf-livraison"><strong>' + delaiTexte(ref, a) + '</strong> · livré à domicile partout en Guyane</div>'
      +     '<div class="qf-boutons">'
      +     (dispo
      ?       '<button type="button" class="q-add" data-add="' + esc(ref) + '">🛒 Ajouter au panier</button>'
      +       (lien ? '<button type="button" class="q-pay" data-pay="' + esc(ref) + '">💳 Payer ' + eur(a.lien_prix) + '<span class="q-pay-sub">forfait expédition inclus — stock revérifié avant paiement</span></button>' : '')
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

    /* description + caractéristiques */
    chargerTranche(ref).then(function (tranche) {
      var f = tranche[ref] || {};
      var html = '';
      var d = f.d || a.desc;
      if (d) html += '<h2>Description</h2><p>' + esc(d).replace(/\n+/g, '</p><p>') + '</p>';
      if (f.c && f.c.length) {
        html += '<h2>Caractéristiques</h2><ul>'
          + f.c.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
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
        var fiche = URL_FICHE + encodeURIComponent(m.ref);
        return '<article class="q-card">'
          + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(m.img) + '" alt="' + esc(m.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
          + '<div class="q-body">'
          + (m.marque ? '<div class="q-marque">' + esc(m.marque) + '</div>' : '')
          + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(m.nom) + '</h3></a>'
          + badgeStock(m.ref)
          + '<div class="q-prix">' + eur(m.prix) + '<span class="q-ttc">TTC</span></div>'
          + '<div class="q-inclus">Octroi &amp; livraison inclus*</div>'
          + '</div></article>';
      }).join('');
      $('qf-meme').hidden = false;
    }
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
      var t = e.target.closest('[data-add],[data-pay],[data-alerte]');
      if (!t) return;
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

  var ref = new URLSearchParams(location.search).get('ref') || '';

  Promise.all([
    fetch('/assets/data/quincaillerie-catalogue.json').then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-liens.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    etat.catalogue = res[0];
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
    $('qf-haut').innerHTML = '<p class="q-vide" style="grid-column:1/-1;">La fiche ne se charge pas. Rafraîchissez la page ou contactez-nous : egreencitys@gmail.com</p>';
  });
})();
