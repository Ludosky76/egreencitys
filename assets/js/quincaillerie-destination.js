/* Destination de livraison de la boutique quincaillerie : Guyane (par défaut), Guadeloupe,
   Martinique, France métropolitaine.

   - La destination est proposée d'après le fuseau horaire de l'appareil (aucune donnée envoyée),
     puis mémorisée ; le client la change à tout moment dans la barre « Livraison ».
   - Guyane : rien ne change (prix, liens de paiement, offres, cartons du catalogue publié).
   - Autres destinations : les prix viennent de /assets/data/quincaillerie-prix-destinations.json,
     le forfait d'expédition de /assets/data/quincaillerie-destinations.json ; chaque destination
     a son propre panier. Paiement par carte, offres, packs, cartons et gamme Holex : Guyane seulement
     tant qu'ils ne sont pas chiffrés pour la destination. */
(function () {
  'use strict';
  var CLE = 'egc_quinc_dest';
  var CODES = ['gf', 'gp', 'mq', 'fr'];
  var NOMS = { gf: 'Guyane', gp: 'Guadeloupe', mq: 'Martinique', fr: 'France métropolitaine' };
  var FUSEAUX = { 'America/Cayenne': 'gf', 'America/Guadeloupe': 'gp', 'America/Martinique': 'mq', 'Europe/Paris': 'fr' };

  function memorisee() {
    try { var d = localStorage.getItem(CLE); return CODES.indexOf(d) > -1 ? d : ''; } catch (e) { return ''; }
  }
  function devinee() {
    try { return FUSEAUX[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'gf'; } catch (e) { return 'gf'; }
  }
  var choisie = memorisee();           /* '' : première visite, destination proposée d'après le fuseau */
  var code = choisie || devinee();
  var cfg = null, prix = null, colonne = -1;

  function estGuyane() { return code === 'gf'; }
  function info() { return (cfg && cfg.destinations[code]) || { nom: NOMS[code], en: '' }; }
  function changer(c) {
    if (CODES.indexOf(c) < 0) return;
    try { localStorage.setItem(CLE, c); } catch (e) {}
    if (c !== code || !choisie) location.reload();
  }

  var pret = fetch('/assets/data/quincaillerie-destinations.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) {
      cfg = j;
      if (estGuyane()) return null;
      return fetch('/assets/data/quincaillerie-prix-destinations.json', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (p) { prix = p.prix || {}; colonne = (p.colonnes || []).indexOf(code); });
    })
    .catch(function () {
      /* réglages ou prix illisibles : on ne montre jamais un prix Guyane pour une autre destination */
      code = 'gf'; cfg = cfg || null; prix = null;
    })
    .then(function () { monterBarre(); textes(); return code; });

  /* etat de la boutique ou de la fiche (catalogue, liens, offre, paiement, promo) : mis à la destination */
  function appliquer(etat) {
    if (estGuyane() || !etat || !etat.catalogue) return;
    var d = info();
    etat.catalogue.forfait_expedition = d.forfait;
    etat.catalogue.articles = etat.catalogue.articles.filter(function (a) {
      var p = prix && prix[a.ref];
      if (!p || !(p[colonne] > 0)) return false;       /* article non chiffré pour la destination (Holex…) */
      a.prix = p[colonne];
      a.lien_prix = Math.round((a.prix + d.forfait) * 100) / 100;
      return true;
    });
    etat.catalogue.categories = etat.catalogue.categories.filter(function (c) {
      return etat.catalogue.articles.some(function (a) { return a.cat === c.slug; });
    });
    etat.liens = {};        /* liens de paiement « un article » : au prix Guyane */
    etat.offre = null;      /* offre de lancement : Guyane */
    etat.paiement = null;   /* paiement du panier par carte et carton groupé : pas encore ouverts ici */
    etat.promo = null;      /* packs à prix fixe : prix Guyane */
    /* le panier du compte client est celui de la Guyane : on ne l'écrase pas */
    if (window.EGCQCompte) window.EGCQCompte.sauverPanier = function () { return Promise.resolve(); };
  }

  function monterBarre() {
    if (!cfg || document.getElementById('q-dest')) return;
    var ancre = document.querySelector('header.qtop') || document.querySelector('header');
    if (!ancre) return;
    var b = document.createElement('div');
    b.id = 'q-dest';
    b.setAttribute('style', 'background:' + (choisie ? '#eef3ff' : '#fff6dd') + ';color:#1b2460;border-bottom:1px solid #cfd8f5;'
      + 'padding:.5rem 1rem;font-size:.9rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:center;text-align:center');
    var options = cfg.ordre.map(function (c) {
      return '<option value="' + c + '"' + (c === code ? ' selected' : '') + '>' + cfg.destinations[c].nom + '</option>';
    }).join('');
    b.innerHTML = '<label for="q-dest-choix"><strong>📍 Livraison :</strong></label>'
      + '<select id="q-dest-choix" style="font:inherit;padding:.3rem .5rem;border-radius:8px;border:1px solid #9aa8dd;background:#fff;color:inherit;max-width:100%">' + options + '</select>'
      + (choisie ? '' : '<button type="button" id="q-dest-ok" style="font:inherit;font-weight:700;padding:.3rem .8rem;border-radius:8px;border:0;background:#2A39C0;color:#fff;cursor:pointer">Confirmer</button>'
        + '<span style="flex-basis:100%">Nous livrons en Guyane, en Guadeloupe, en Martinique et en France métropolitaine : les prix affichés sont ceux de votre destination.</span>')
      + (!estGuyane() && cfg.prototype ? '<span style="flex-basis:100%;font-size:.8rem;color:#8a5a00">Prix indicatifs pour cette destination — commande confirmée par notre équipe avant tout règlement.</span>' : '');
    ancre.parentNode.insertBefore(b, ancre.nextSibling);
    var sel = document.getElementById('q-dest-choix');
    sel.addEventListener('change', function () { changer(sel.value); });
    var ok = document.getElementById('q-dest-ok');
    if (ok) ok.addEventListener('click', function () { changer(sel.value); });
  }

  /* textes fixes des pages (titre, mentions, note du panier) pour une destination autre que la Guyane */
  function textes() {
    if (estGuyane() || !cfg) return;
    var d = info();
    if (/Guyane/.test(document.title) && document.querySelector('.q-hero')) document.title = 'Quincaillerie Pro — outillage livré ' + d.en + " | EGREENCITY'S";
    /* page statique d'un article : titre et texte d'introduction rédigés au prix Guyane */
    document.title = document.title.replace(/ — [\d\s.,  ]+€ \| Guyane$/, ' | Livraison ' + d.en);
    document.querySelectorAll('.qf-intro').forEach(function (p) { p.style.display = 'none'; });
    var h1 = document.querySelector('.q-hero h1');
    if (h1) h1.textContent = 'Quincaillerie & outillage livrés ' + d.en;
    var intro = document.querySelector('.q-hero-inner p');
    if (intro) intro.innerHTML = Object.keys(prix || {}).length.toLocaleString('fr-FR') + ' références professionnelles au prix tout compris : <span class="inclus">'
      + String(d.inclus || '').replace(/ inclus\*$/, ' inclus').replace(/^./, function (c) { return c.toLowerCase(); }) + '</span>. Un forfait d’expédition unique de '
      + d.forfait.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + '&nbsp;€ s’ajoute une fois par commande.';
    document.querySelectorAll('.q-mentions').forEach(function (m) {
      m.textContent = d.mentions + ' Toute commande est vérifiée article par article avant encaissement. ';
      var a = document.createElement('a'); a.href = '/pages/legal/cgv-quincaillerie.html'; a.textContent = 'Conditions de vente'; m.appendChild(a);
    });
    var note = document.querySelector('.q-note-forfait');
    if (note) note.innerHTML = 'Livraison à domicile ' + d.en + ', incluse dans les prix. Votre panier est conservé <strong>7 jours</strong> sur cet appareil.';
    var cb = document.getElementById('q-cb-indice');
    if (cb) cb.textContent = 'Envoyez votre commande : nous vérifions chaque référence et vous adressons le règlement sécurisé — aucun encaissement avant validation.';
    /* entrées réservées à la Guyane (packs à prix fixe, cartons) */
    document.querySelectorAll('a[href^="/packs-pro"], a[href^="/carton-"], a[href^="/quincaillerie-pro/holex"]').forEach(function (a) { a.style.display = 'none'; });
  }

  window.EGCQDest = {
    code: function () { return code; },
    estGuyane: estGuyane,
    info: info,
    pret: pret,
    appliquer: appliquer,
    changer: changer,
    clePanier: function (base) { return estGuyane() ? base : base + '_' + code; }
  };
})();
