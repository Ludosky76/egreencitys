/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — pont espace client (Firebase)
   ==========================================================================
   Chargé APRÈS les SDK compat (app/auth/firestore) et firebase-config.js
   sur les pages boutique, fiche produit et demande. Expose window.EGCQCompte :
     - pret            : Promise résolue avec l'utilisateur (ou null)
     - utilisateur()   : utilisateur Firebase courant (ou null)
     - lirePanier()    : panier distant { maj, lignes } (ou null)
     - sauverPanier(p) : enregistre le panier sur le compte (fire & forget)
     - basculerAlerte(ref) : ajoute/retire une alerte dispo → Promise<bool actif>
     - alertes()       : liste des refs sous alerte (cache local)
   Toutes les données vivent dans users/{uid} (champs panier_quinc, alertes),
   couverts par la règle « chacun lit/écrit ses propres données ».
   ========================================================================== */
(function () {
  'use strict';

  var etat = { user: null, doc: null };
  var resoudre;
  var pret = new Promise(function (res) { resoudre = res; });

  function db() { return firebase.firestore(); }
  function refDoc() { return db().collection('users').doc(etat.user.uid); }

  try {
    if (!window.FIREBASE_ENABLED) { resoudre(null); }
    else {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      firebase.auth().onAuthStateChanged(function (u) {
        etat.user = u || null;
        if (!u) { etat.doc = null; resoudre(null); document.dispatchEvent(new CustomEvent('egcq-compte', { detail: null })); return; }
        refDoc().get().then(function (snap) {
          etat.doc = snap.exists ? snap.data() : {};
        }).catch(function () { etat.doc = {}; })
          .then(function () {
            resoudre(u);
            document.dispatchEvent(new CustomEvent('egcq-compte', { detail: u }));
          });
      });
    }
  } catch (e) { resoudre(null); }

  window.EGCQCompte = {
    pret: pret,
    utilisateur: function () { return etat.user; },

    lirePanier: function () {
      return (etat.doc && etat.doc.panier_quinc) || null;
    },

    sauverPanier: function (p) {
      if (!etat.user) return Promise.resolve(false);
      if (etat.doc) etat.doc.panier_quinc = p;
      return refDoc().set({ panier_quinc: p, email: etat.user.email || '' }, { merge: true })
        .then(function () { return true; }).catch(function () { return false; });
    },

    alertes: function () {
      return (etat.doc && etat.doc.alertes) || [];
    },

    /* Option B (sans webhook) : commande enregistrée au retour de Stripe
       dans users/{uid}/orders — visible dans compte.html. Déclaratif :
       à recouper avec le tableau de bord Stripe avant préparation. */
    enregistrerCommande: function (cmd) {
      if (!etat.user) return Promise.resolve(false);
      var id = 'QF-' + (cmd.ts || 0);
      return refDoc().collection('orders').doc(id).set({
        id: id,
        date: new Date().toISOString(),
        items: [{ name: 'Quincaillerie — ' + (cmd.nom || ('réf. ' + cmd.ref)) }],
        total: Number(cmd.montant) || 0,
        status: 'paye',
        source: 'retour_stripe',
        ref: cmd.ref || ''
      }, { merge: true }).then(function () { return true; }).catch(function () { return false; });
    },

    basculerAlerte: function (ref) {
      if (!etat.user) return Promise.resolve(null);
      var a = (etat.doc && etat.doc.alertes) ? etat.doc.alertes.slice() : [];
      var i = a.indexOf(ref);
      var actif;
      if (i === -1) { a.push(ref); actif = true; } else { a.splice(i, 1); actif = false; }
      if (etat.doc) etat.doc.alertes = a;
      return refDoc().set({ alertes: a, email: etat.user.email || '' }, { merge: true })
        .then(function () { return actif; }).catch(function () { return null; });
    }
  };
})();
