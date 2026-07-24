/* ==========================================================================
   EGREENCITY'S — Module compte client (localStorage)
   ==========================================================================
   Systeme minimaliste :
   - Compte cree localement (localStorage du navigateur)
   - Pas de backend requis (compatible GitHub Pages)
   - Historique de commandes conserve sur l'appareil
   - Guest checkout toujours possible
   - Export des donnees en JSON (RGPD)
   - Suppression complete du compte (RGPD)

   LIMITATION : les donnees restent sur l'appareil ou le compte a ete cree.
   Pour un compte cloud multi-appareils, migrer vers Firebase Auth
   (cf GUIDE_MIGRATION_FIREBASE.md).
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'egc_customer';
  var ORDERS_KEY  = 'egc_orders';

  // ---- Hash simple (SHA-256 via Web Crypto) -----------------------------
  async function hashPassword(password) {
    var enc = new TextEncoder();
    var data = enc.encode(password + '_egc_salt_v1');
    var hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  // ---- API publique -----------------------------------------------------
  window.EGCCustomer = {

    // Recuperer le compte courant (ou null si non connecte)
    current: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    isLoggedIn: function () {
      var c = this.current();
      return !!(c && c.email && c.sessionActive);
    },

    // Creer un compte (inscription)
    signUp: async function (data) {
      var required = ['prenom', 'nom', 'email', 'password'];
      for (var i = 0; i < required.length; i++) {
        if (!data[required[i]]) {
          throw new Error('Champ requis manquant : ' + required[i]);
        }
      }
      // Verifier email non deja utilise (sur cet appareil)
      var existing = this.getAllAccounts();
      if (existing[data.email.toLowerCase()]) {
        throw new Error('Un compte existe deja pour cet email sur cet appareil.');
      }
      var hash = await hashPassword(data.password);
      // Question de securite (pour recuperation du mot de passe)
      var secQuestion = data.securityQuestion || '';
      var secAnswerHash = data.securityAnswer
        ? await hashPassword(data.securityAnswer.trim().toLowerCase())
        : '';
      var account = {
        email: data.email.toLowerCase(),
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone || '',
        adresse: data.adresse || '',
        code_postal: data.code_postal || '',
        commune: data.commune || '',
        passwordHash: hash,
        securityQuestion: secQuestion,
        createdAt: new Date().toISOString(),
        sessionActive: true
      };
      // Sauvegarde dans le registre des comptes + compte courant
      existing[data.email.toLowerCase()] = {
        hash: hash,
        secQuestion: secQuestion,
        secAnswerHash: secAnswerHash,
        profile: account
      };
      localStorage.setItem('egc_accounts', JSON.stringify(existing));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      return account;
    },

    // Recuperation — question de securite associee a un email
    getSecurityQuestion: function (email) {
      var acc = this.getAllAccounts()[(email || '').toLowerCase()];
      if (!acc) return null;                       // compte inexistant
      return { hasQuestion: !!acc.secQuestion, question: acc.secQuestion || '' };
    },

    // Recuperation — reinitialise le mot de passe
    // Si le compte a une question de securite, `securityAnswer` doit correspondre.
    // Sinon (ancien compte), reset direct autorise (donnees locales a l'appareil).
    resetPassword: async function (email, newPassword, securityAnswer) {
      var accounts = this.getAllAccounts();
      var key = (email || '').toLowerCase();
      var acc = accounts[key];
      if (!acc) throw new Error('Aucun compte trouve pour cet email sur cet appareil.');
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Le nouveau mot de passe doit faire au moins 8 caracteres.');
      }
      if (acc.secAnswerHash) {
        var ansHash = await hashPassword((securityAnswer || '').trim().toLowerCase());
        if (ansHash !== acc.secAnswerHash) {
          throw new Error('Reponse a la question de securite incorrecte.');
        }
      }
      var newHash = await hashPassword(newPassword);
      acc.hash = newHash;
      acc.profile.passwordHash = newHash;
      accounts[key] = acc;
      localStorage.setItem('egc_accounts', JSON.stringify(accounts));
      return true;
    },

    // Rappel identifiant — liste les emails des comptes sur cet appareil
    listEmails: function () {
      return Object.keys(this.getAllAccounts());
    },

    // Connexion
    signIn: async function (email, password) {
      var accounts = this.getAllAccounts();
      var key = email.toLowerCase();
      var acc = accounts[key];
      if (!acc) throw new Error('Aucun compte trouve pour cet email sur cet appareil.');
      var hash = await hashPassword(password);
      if (acc.hash !== hash) throw new Error('Mot de passe incorrect.');
      var profile = Object.assign({}, acc.profile, { sessionActive: true });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return profile;
    },

    // Deconnexion
    signOut: function () {
      var c = this.current();
      if (c) {
        c.sessionActive = false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      }
      localStorage.removeItem(STORAGE_KEY);
    },

    // Mettre a jour le profil
    updateProfile: function (updates) {
      var c = this.current();
      if (!c) throw new Error('Non connecte');
      Object.assign(c, updates);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      // Synchro dans le registre
      var accounts = this.getAllAccounts();
      if (accounts[c.email]) {
        accounts[c.email].profile = c;
        localStorage.setItem('egc_accounts', JSON.stringify(accounts));
      }
      return c;
    },

    // Historique commandes du compte connecte
    getOrders: function () {
      var c = this.current();
      if (!c) return [];
      try {
        var raw = localStorage.getItem(ORDERS_KEY + '_' + c.email);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },

    // Ajouter une commande a l'historique
    addOrder: function (order) {
      var c = this.current();
      if (!c) return; // guest = pas d'historique
      var orders = this.getOrders();
      orders.unshift({
        id: 'EGC-' + Date.now(),
        date: new Date().toISOString(),
        items: order.items || [],
        total: order.total || 0,
        status: order.status || 'en_attente',
        stripeSession: order.stripeSession || null
      });
      // Garder max 50 dernieres
      if (orders.length > 50) orders.length = 50;
      localStorage.setItem(ORDERS_KEY + '_' + c.email, JSON.stringify(orders));
    },

    // Export RGPD : recupere toutes les donnees du client
    exportData: function () {
      var c = this.current();
      if (!c) throw new Error('Non connecte');
      var data = {
        exportedAt: new Date().toISOString(),
        profile: c,
        orders: this.getOrders(),
        note: "Ces donnees ont ete generees a votre demande en application du RGPD. Les stocker et effacer localement selon vos besoins."
      };
      // Retire le hash mdp de l'export
      delete data.profile.passwordHash;
      return data;
    },

    // Suppression totale RGPD
    deleteAccount: function () {
      var c = this.current();
      if (!c) return;
      var accounts = this.getAllAccounts();
      delete accounts[c.email];
      localStorage.setItem('egc_accounts', JSON.stringify(accounts));
      localStorage.removeItem(ORDERS_KEY + '_' + c.email);
      localStorage.removeItem(STORAGE_KEY);
    },

    // Registre interne (tous comptes crees sur cet appareil)
    getAllAccounts: function () {
      try {
        var raw = localStorage.getItem('egc_accounts');
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    }
  };

  // ---- Auto-remplissage des formulaires si connecte --------------------
  document.addEventListener('DOMContentLoaded', function () {
    var c = window.EGCCustomer.current();
    if (!c || !c.sessionActive) return;

    var mapping = {
      'prenom': c.prenom, 'nom': c.nom,
      'email': c.email, 'tel': c.telephone,
      'adresse': c.adresse, 'cp': c.code_postal, 'commune': c.commune
    };
    Object.keys(mapping).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.value) el.value = mapping[id] || '';
    });
  });

})();
