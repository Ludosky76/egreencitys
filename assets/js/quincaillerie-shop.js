/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — boutique statique
   ==========================================================================
   Catalogue : /assets/data/quincaillerie-catalogue.json  (export de la base)
   Stock     : /assets/data/quincaillerie-stock.json      (rafraîchi toutes les
               heures par GitHub Actions — rotation ~100 fiches fournisseur/h)
   Liens CB  : /assets/data/quincaillerie-liens.json      (liens Stripe par ref)

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
    catalogue: null, stock: {}, stockMaj: 0, liens: {},
    recherche: '', cat: '', dispo: false, tri: 'pertinence',
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
    return (s && s.s) || 'inconnu';
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
    if (statutDe(ref) === 'disponible') {
      return long ? 'livraison sous 7 jours ouvrés' : 'livré sous 7 j ouvrés';
    }
    return long ? 'disponibilité à confirmer — faites une demande' : 'disponibilité sur demande';
  }
  function urlDemande(ref) { return '/pages/demande-produit.html?ref=' + encodeURIComponent(ref); }

  /* ---------------- rendu ---------------- */
  function filtres() {
    var q = etat.recherche.toLowerCase();
    var res = etat.catalogue.articles.filter(function (a) {
      if (etat.cat && a.cat !== etat.cat) return false;
      if (etat.dispo && statutDe(a.ref) !== 'disponible') return false;
      if (q && (a.nom + ' ' + a.marque + ' ' + a.ref).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (etat.tri === 'prix-asc') res.sort(function (x, y) { return x.prix - y.prix; });
    if (etat.tri === 'prix-desc') res.sort(function (x, y) { return y.prix - x.prix; });
    return res;
  }

  function carte(a) {
    var dispo = statutDe(a.ref) === 'disponible';
    var lien = etat.liens[a.ref];
    var fiche = ADR.fiche(a);
    return '<article class="q-card" data-ref="' + esc(a.ref) + '">'
      + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
      + '<div class="q-body">'
      + '<div class="q-ref">Réf. ' + esc(a.ref) + '</div>'
      + (a.marque ? '<div class="q-marque">' + esc(a.marque) + '</div>' : '')
      + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(a.nom) + '</h3></a>'
      + badgeStock(a.ref)
      + (a.devis
          ? '<div class="q-prix q-prix-devis">Prix sur devis</div>'
            + '<div class="q-inclus">Colis de plus de 30 kg : acheminement adapté</div>'
            + '<div class="q-poids">' + a.poids.toLocaleString('fr-FR') + ' kg · délai confirmé avec le devis</div>'
          : '<div class="q-prix">' + eur(a.prix) + '<span class="q-ttc">TTC</span></div>'
            + '<div class="q-inclus">Octroi &amp; livraison inclus*</div>'
            + (a.poids ? '<div class="q-poids">' + a.poids.toLocaleString('fr-FR') + ' kg · ' + delaiTexte(a.ref, a) + '</div>' : ''))
      + '<div class="q-actions">'
      + (a.devis
          ? '<a class="q-pay" href="' + urlDemande(a.ref) + '">📦 Demander un devis<span class="q-pay-sub">plus de 30 kg — réponse sous 24 h ouvrées</span></a>'
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
        rendre(); rendrePanier();
      } else if (etat.panier.length) {
        window.EGCQCompte.sauverPanier({ maj: etat.panierMaj || Date.now(), lignes: etat.panier });
      }
    });
  }
  function article(ref) {
    return etat.catalogue.articles.find(function (a) { return a.ref === ref; });
  }
  function majPastille() {
    var n = etat.panier.reduce(function (s, l) { return s + l.q; }, 0);
    $('q-pastille').textContent = n;
    $('q-pastille').style.display = n ? '' : 'none';
  }
  function ajouter(ref) {
    var l = etat.panier.find(function (x) { return x.ref === ref; });
    if (l) l.q += 1; else etat.panier.push({ ref: ref, q: 1 });
    sauver(); majPastille(); rendrePanier();
    $('q-tiroir').classList.add('ouvert');
  }
  function totalPanier() {
    var t = etat.panier.reduce(function (s, l) {
      var a = article(l.ref); return a ? s + a.prix * l.q : s;
    }, 0);
    var offert = etat.panier.length > 0 && forfaitOffert(t);
    var f = etat.panier.length && !offert ? etat.catalogue.forfait_expedition : 0;
    return { articles: t, forfait: f, offert: offert, total: t + f };
  }
  function rendrePanier() {
    var corps = $('q-tiroir-corps');
    if (!etat.panier.length) { corps.innerHTML = '<p class="q-vide">Votre panier est vide.</p>'; $('q-tiroir-pied').style.display = 'none'; return; }
    $('q-tiroir-pied').style.display = '';
    corps.innerHTML = etat.panier.map(function (l) {
      var a = article(l.ref); if (!a) return '';
      return '<div class="q-ligne">'
        + '<img src="' + esc(a.img) + '" alt="">'
        + '<div class="q-ligne-infos"><div class="q-ligne-nom">' + esc(a.nom) + '</div>'
        + '<div class="q-ligne-prix">' + eur(a.prix) + ' × '
        + '<button type="button" data-moins="' + esc(l.ref) + '">−</button> ' + l.q + ' '
        + '<button type="button" data-plus="' + esc(l.ref) + '">+</button></div></div>'
        + '<button type="button" class="q-suppr" data-suppr="' + esc(l.ref) + '" aria-label="Retirer">×</button>'
        + '</div>';
    }).join('');
    var g = $('q-groupage');
    if (!g) { g = document.createElement('div'); g.id = 'q-groupage'; $('q-tiroir-pied').insertBefore(g, $('q-tiroir-pied').firstChild); }
    g.innerHTML = messageGroupage();
    corps.insertAdjacentHTML('beforeend', blocSuggestions());  // zone défilante : ne réduit pas la liste
    var t = totalPanier();
    $('q-total-articles').textContent = eur(t.articles);
    $('q-total-forfait').textContent = t.offert ? 'offert 🎁' : eur(t.forfait);
    $('q-total').textContent = eur(t.total);
    // paiement CB direct : uniquement UN article, quantité 1, disponible, lien actif
    var cb = $('q-payer-cb');
    var ok = etat.panier.length === 1 && etat.panier[0].q === 1
          && statutDe(etat.panier[0].ref) === 'disponible' && etat.liens[etat.panier[0].ref];
    cb.style.display = ok ? '' : 'none';
    // paiement par carte du PANIER (fonction serveur) : tous les articles disponibles, un seul colis ≤ 30 kg
    var bp = $('q-payer-panier');
    var poidsPanier = etat.panier.reduce(function (s, l) { var a = article(l.ref); return s + (a && a.poids ? a.poids * l.q : 0); }, 0);
    var okPanier = !ok && !!(etat.paiement && etat.paiement.panier_cb && etat.paiement.fonction)
      && etat.panier.every(function (l) { var a = article(l.ref); return a && !a.devis && statutDe(l.ref) === 'disponible'; })
      && poidsPanier <= 30;
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

  /* ---------------- paniers groupés : un seul forfait par commande ----------------
     Le forfait d'expédition est dû une fois par colis : l'afficher comme une économie
     dès le 2e article, et proposer de petits articles disponibles du même rayon. */
  function empreinte(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function suggestions(n) {
    var dans = {}, rayons = {}, cle = '';
    etat.panier.forEach(function (l) { var a = article(l.ref); dans[l.ref] = true; cle += l.ref; if (a) rayons[a.cat] = true; });
    return etat.catalogue.articles.filter(function (a) {
      return !dans[a.ref] && !a.devis && rayons[a.cat] && a.prix <= 30 && statutDe(a.ref) === 'disponible';
    }).sort(function (x, y) { return empreinte(x.ref + cle) - empreinte(y.ref + cle); }).slice(0, n);
  }
  function messageGroupage() {
    var f = etat.catalogue.forfait_expedition;
    var unites = etat.panier.reduce(function (s, l) { return s + l.q; }, 0);
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
    if (s.length) {
      html += '<div class="q-sugg"><div class="q-sugg-titre">À glisser dans le même colis</div>' + s.map(function (a) {
        return '<div class="q-sugg-ligne"><img src="' + esc(a.img) + '" alt="" loading="lazy">'
          + '<a class="q-sugg-nom" href="' + ADR.fiche(a) + '">' + esc(a.nom) + '</a>'
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
      b.classList.toggle('actif', b.dataset.rayon === etat.cat);
    });
    document.querySelectorAll('#q-menu-rayons a').forEach(function (a) {
      a.classList.toggle('actif', a.dataset.rayon === etat.cat);
    });
  }

  function ouvrirMenu() { document.body.classList.add('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'true'); }
  function fermerMenu() { document.body.classList.remove('menu-ouvert'); $('q-burger').setAttribute('aria-expanded', 'false'); }

  function construireRayons() {
    var comptes = {};
    etat.catalogue.articles.forEach(function (a) { comptes[a.cat] = (comptes[a.cat] || 0) + 1; });
    var total = etat.catalogue.articles.length;
    var chips = '<button type="button" data-rayon="">Tous les rayons</button>';
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
    $('q-rayons').addEventListener('click', function (e) {
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
    majRayons();
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
    var t = totalPanier();
    var lignes = etat.panier.map(function (l) {
      var a = article(l.ref);
      return l.q + ' × [' + l.ref + '] ' + a.nom + ' — ' + eur(a.prix * l.q) + ' (' + statutDe(l.ref) + ')';
    }).join('\n');
    var corps = {
      _subject: 'Commande quincaillerie — ' + eur(t.total),
      email: email, telephone: tel,
      panier: lignes,
      total: t.offert ? eur(t.total) + ' — forfait d’expédition OFFERT (offre de lancement, code ' + etat.offre.code + ')'
                      : eur(t.total) + ' dont forfait expédition ' + eur(t.forfait),
      _template: 'box'
    };
    var bouton = $('q-envoyer');
    bouton.disabled = true; bouton.textContent = 'Envoi…';
    fetch('https://formsubmit.co/ajax/egreencitys@gmail.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corps)
    }).then(function (r) {
      if (!r.ok) throw 0;
      if (window.gtag) gtag('event', 'generate_lead', { currency: 'EUR', value: t.total });
      etat.panier = []; sauver(); majPastille(); rendrePanier();
      $('q-form-zone').innerHTML = '<p class="q-merci">✅ Commande reçue. Nous vérifions chaque article chez le fournisseur et revenons vers vous sous 24 h ouvrées avec la confirmation et le règlement — aucun encaissement avant validation.</p>';
    }).catch(function () {
      bouton.disabled = false; bouton.textContent = 'Envoyer ma commande';
      alert('Envoi impossible pour le moment. Écrivez-nous : egreencitys@gmail.com');
    });
  }

  /* ---------------- init ---------------- */
  function initEvenements() {
    $('q-recherche').addEventListener('input', function () { etat.recherche = this.value; etat.visibles = PAR_PAGE; rendre(); });
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
      var t = e.target.closest('[data-add],[data-pay],[data-plus],[data-moins],[data-suppr]');
      if (!t) return;
      if (t.dataset.add) ajouter(t.dataset.add);
      if (t.dataset.pay) verifierPuisPayer(t.dataset.pay);
      if (t.dataset.plus) { etat.panier.find(function (x) { return x.ref === t.dataset.plus; }).q += 1; sauver(); rendrePanier(); majPastille(); }
      if (t.dataset.moins) {
        var l = etat.panier.find(function (x) { return x.ref === t.dataset.moins; });
        l.q -= 1; if (l.q <= 0) etat.panier = etat.panier.filter(function (x) { return x !== l; });
        sauver(); rendrePanier(); majPastille();
      }
      if (t.dataset.suppr) { etat.panier = etat.panier.filter(function (x) { return x.ref !== t.dataset.suppr; }); sauver(); rendrePanier(); majPastille(); }
    });
  }

  Promise.all([
    fetch('/assets/data/quincaillerie-catalogue.json').then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-stock.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }),
    fetch('/assets/data/quincaillerie-liens.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('/assets/data/quincaillerie-offre.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/assets/data/quincaillerie-paiement.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (res) {
    etat.catalogue = res[0];
    etat.offre = res[3];
    etat.paiement = res[4];
    etat.stock = res[1].stock || {}; etat.stockMaj = res[1].maj || 0;
    etat.liens = res[2] || {};
    var sel = $('q-cat');
    etat.catalogue.categories.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.slug; o.textContent = c.nom; sel.appendChild(o);
    });
    /* rayon pré-sélectionné : ?cat=slug (liens du menu et de la fiche produit) */
    var catInitiale = new URLSearchParams(location.search).get('cat');
    if (catInitiale && etat.catalogue.categories.some(function (c) { return c.slug === catInitiale; })) {
      etat.cat = catInitiale; sel.value = catInitiale;
    }
    charger(); initEvenements(); construireRayons(); afficherOffre(); rendre(); rendrePanier();
    traiterRetourPaiement();
    reconcilierPanierCompte();
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
