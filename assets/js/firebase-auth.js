/* ==========================================================================
   EGREENCITY'S — Authentification Firebase (comptes securises + email reset)
   ==========================================================================
   Charge le SDK Firebase (compat) UNIQUEMENT si FIREBASE_ENABLED.
   Remplace window.EGCCustomer par une version Firebase :
     - Comptes securises cote Google (email + mot de passe hashe cote serveur)
     - Email de reinitialisation REEL (sendPasswordResetEmail)
     - Email de verification a l'inscription
     - Modification email avec lien de confirmation (verifyBeforeUpdateEmail)
     - Profil + commandes stockes dans Firestore (cloud, multi-appareils)

   L'etat de session est mis en cache dans localStorage (egc_customer) pour
   que session-nav.js / mobile-nav.js (synchrones) continuent de fonctionner.

   Si Firebase n'est pas configure -> ne fait rien, le systeme localStorage
   (customer-account.js) reste en place.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.FIREBASE_ENABLED) {
    // Firebase non configure : on garde le systeme localStorage existant.
    window.EGC_AUTH_BACKEND = 'local';
    return;
  }
  window.EGC_AUTH_BACKEND = 'firebase';

  var SDK_VERSION = '10.12.2';
  var CACHE_KEY = 'egc_customer';

  // ---- Chargement dynamique du SDK Firebase compat ----------------------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var ready = (async function init() {
    var base = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');

    firebase.initializeApp(window.FIREBASE_CONFIG);
    var auth = firebase.auth();
    var db = firebase.firestore();
    auth.useDeviceLanguage(); // emails en francais

    // Synchronise l'etat d'auth -> cache localStorage
    auth.onAuthStateChanged(async function (user) {
      if (user) {
        var profile = await loadProfile(db, user);
        profile.sessionActive = true;
        localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(CACHE_KEY);
      }
      document.dispatchEvent(new CustomEvent('egc-auth-changed'));
    });

    return { auth: auth, db: db };
  })();

  async function loadProfile(db, user) {
    var base = {
      email: user.email,
      emailVerified: user.emailVerified,
      uid: user.uid,
      prenom: '', nom: '', telephone: '',
      adresse: '', code_postal: '', commune: '',
      createdAt: user.metadata && user.metadata.creationTime
        ? new Date(user.metadata.creationTime).toISOString()
        : new Date().toISOString()
    };
    try {
      var doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) Object.assign(base, doc.data());
    } catch (e) { /* offline ou regles : on garde base */ }
    base.email = user.email;
    base.uid = user.uid;
    base.emailVerified = user.emailVerified;
    return base;
  }

  // ======================================================================
  //  API publique — remplace window.EGCCustomer (meme surface + extras)
  // ======================================================================
  window.EGCCustomer = {

    backend: 'firebase',

    current: function () {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    isLoggedIn: function () {
      var c = this.current();
      return !!(c && c.email && c.sessionActive);
    },

    // Inscription : cree le compte + envoie l'email de verification
    signUp: async function (data) {
      var req = ['prenom', 'nom', 'email', 'password'];
      for (var i = 0; i < req.length; i++) {
        if (!data[req[i]]) throw new Error('Champ requis manquant : ' + req[i]);
      }
      var fb = await ready;
      var cred = await fb.auth.createUserWithEmailAndPassword(
        data.email.trim(), data.password
      );
      var profile = {
        prenom: data.prenom, nom: data.nom,
        telephone: data.telephone || '', adresse: data.adresse || '',
        code_postal: data.code_postal || '', commune: data.commune || '',
        createdAt: new Date().toISOString()
      };
      await fb.db.collection('users').doc(cred.user.uid).set(profile, { merge: true });
      // Email de verification (le client recoit un lien)
      try {
        await cred.user.sendEmailVerification({
          url: 'https://egreencitys.com/pages/compte.html'
        });
      } catch (e) { /* non bloquant */ }
      return Object.assign({ email: cred.user.email, uid: cred.user.uid }, profile);
    },

    // Connexion
    signIn: async function (email, password) {
      var fb = await ready;
      var cred = await fb.auth.signInWithEmailAndPassword(email.trim(), password);
      return await loadProfile(fb.db, cred.user);
    },

    signOut: async function () {
      var fb = await ready;
      await fb.auth.signOut();
      localStorage.removeItem(CACHE_KEY);
    },

    // ⭐ Email de reinitialisation du mot de passe (LE VRAI LIEN)
    sendPasswordReset: async function (email) {
      var fb = await ready;
      await fb.auth.sendPasswordResetEmail(email.trim(), {
        url: 'https://egreencitys.com/pages/compte.html'
      });
      return true;
    },

    // Renvoyer l'email de verification
    resendVerification: async function () {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) throw new Error('Non connecte');
      await u.sendEmailVerification({ url: 'https://egreencitys.com/pages/compte.html' });
      return true;
    },

    // Modifier l'email — envoie un lien de confirmation au NOUVEL email
    changeEmail: async function (newEmail) {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) throw new Error('Non connecte');
      await u.verifyBeforeUpdateEmail(newEmail.trim(), {
        url: 'https://egreencitys.com/pages/compte.html'
      });
      return true;
    },

    // Mettre a jour le profil (Firestore)
    updateProfile: async function (updates) {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) throw new Error('Non connecte');
      await fb.db.collection('users').doc(u.uid).set(updates, { merge: true });
      var c = this.current() || {};
      Object.assign(c, updates);
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
      return c;
    },

    // Historique commandes (Firestore users/{uid}/orders)
    getOrders: async function () {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) return [];
      var snap = await fb.db.collection('users').doc(u.uid)
        .collection('orders').orderBy('date', 'desc').limit(50).get();
      return snap.docs.map(function (d) { return d.data(); });
    },

    addOrder: async function (order) {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) return;
      var doc = {
        id: 'EGC-' + Date.now(),
        date: new Date().toISOString(),
        items: order.items || [], total: order.total || 0,
        status: order.status || 'en_attente'
      };
      await fb.db.collection('users').doc(u.uid)
        .collection('orders').doc(doc.id).set(doc);
    },

    // Export RGPD
    exportData: async function () {
      var c = this.current();
      if (!c) throw new Error('Non connecte');
      var orders = await this.getOrders();
      return {
        exportedAt: new Date().toISOString(),
        profile: c, orders: orders,
        note: 'Donnees generees a votre demande (RGPD).'
      };
    },

    // Suppression du compte (Firebase Auth + Firestore)
    deleteAccount: async function () {
      var fb = await ready;
      var u = fb.auth.currentUser;
      if (!u) return;
      try { await fb.db.collection('users').doc(u.uid).delete(); } catch (e) {}
      await u.delete(); // peut exiger une reconnexion recente
      localStorage.removeItem(CACHE_KEY);
    },

    // Compat API localStorage (non utilises avec Firebase)
    getSecurityQuestion: function () { return { hasQuestion: false, question: '' }; },
    listEmails: function () { var c = this.current(); return c ? [c.email] : []; }
  };

})();
