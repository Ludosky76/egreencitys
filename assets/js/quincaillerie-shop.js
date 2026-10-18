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
  /* Chaque produit a sa propre page web (fiche) : */
  var URL_FICHE = '/pages/produit-quincaillerie.html?ref=';

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
     7 jours ouvrés ; sinon, délai indicatif (approvisionnement + acheminement). */
  function delaiTexte(ref, a, long) {
    if (statutDe(ref) === 'disponible') {
      return long ? 'livraison sous 7 jours ouvrés' : 'livré sous 7 j ouvrés';
    }
    return long ? 'livraison sous ~' + (a.delai + 14) + ' jours' : 'livré sous ~' + (a.delai + 14) + ' j';
  }

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
    var fiche = URL_FICHE + encodeURIComponent(a.ref);
    return '<article class="q-card" data-ref="' + esc(a.ref) + '">'
      + '<a class="q-lien q-img" href="' + fiche + '"><img loading="lazy" src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" onerror="this.parentNode.classList.add(\'q-noimg\')"></a>'
      + '<div class="q-body">'
      + '<div class="q-ref">Réf. ' + esc(a.ref) + '</div>'
      + (a.marque ? '<div class="q-marque">' + esc(a.marque) + '</div>' : '')
      + '<a class="q-lien" href="' + fiche + '"><h3 class="q-nom">' + esc(a.nom) + '</h3></a>'
      + badgeStock(a.ref)
      + '<div class="q-prix">' + eur(a.prix) + '<span class="q-ttc">TTC</span></div>'
      + '<div class="q-inclus">Octroi &amp; livraison inclus*</div>'
      + (a.poids ? '<div class="q-poids">' + a.poids.toLocaleString('fr-FR') + ' kg · ' + delaiTexte(a.ref, a) + '</div>' : '')
      + '<div class="q-actions">'
      + '<button type="button" class="q-add" data-add="' + esc(a.ref) + '">🛒 Ajouter au panier</button>'
      + ((dispo && lien) ? '<button type="button" class="q-pay" data-pay="' + esc(a.ref) + '">💳 Payer ' + eur(a.lien_prix) + '<span class="q-pay-sub">forfait expédition inclus</span></button>' : '')
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
  function sauver() {
    try { localStorage.setItem(CLE_PANIER, JSON.stringify({ maj: Date.now(), lignes: etat.panier })); } catch (e) {}
  }
  function charger() {
    try {
      var j = JSON.parse(localStorage.getItem(CLE_PANIER) || 'null');
      if (!j) { etat.panier = []; return; }
      if (Array.isArray(j)) { etat.panier = j; sauver(); return; } /* ancien format, migré */
      etat.panier = (j.maj && Date.now() - j.maj > PANIER_RETENTION) ? [] : (j.lignes || []);
    } catch (e) { etat.panier = []; }
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
    return { articles: t, forfait: etat.panier.length ? etat.catalogue.forfait_expedition : 0,
             total: t + (etat.panier.length ? etat.catalogue.forfait_expedition : 0) };
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
    var t = totalPanier();
    $('q-total-articles').textContent = eur(t.articles);
    $('q-total-forfait').textContent = eur(t.forfait);
    $('q-total').textContent = eur(t.total);
    // paiement CB direct : uniquement UN article, quantité 1, disponible, lien actif
    var cb = $('q-payer-cb');
    var ok = etat.panier.length === 1 && etat.panier[0].q === 1
          && statutDe(etat.panier[0].ref) === 'disponible' && etat.liens[etat.panier[0].ref];
    cb.style.display = ok ? '' : 'none';
    $('q-cb-indice').style.display = ok ? 'none' : '';
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
        window.location.href = url + sep + 'client_reference_id=' + encodeURIComponent('QF-' + ref + '_' + Date.now());
      })
      .catch(function () { alert('Vérification de disponibilité impossible — réessayez dans un instant.'); })
      .finally(function () { if (bouton) { bouton.disabled = false; bouton.classList.remove('q-verif'); } });
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
      total: eur(t.total) + ' dont forfait expédition ' + eur(t.forfait),
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
    fetch('/assets/data/quincaillerie-liens.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    etat.catalogue = res[0];
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
    charger(); initEvenements(); construireRayons(); rendre(); rendrePanier();
    /* anciens liens #a=REF (modal) : chaque produit a désormais sa page */
    if (location.hash.indexOf('#a=') === 0) {
      var refInitiale = decodeURIComponent(location.hash.slice(3));
      if (article(refInitiale)) { location.replace(URL_FICHE + encodeURIComponent(refInitiale)); return; }
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
