/* ==========================================================================
   EGREENCITY'S — Configuration Firebase
   ==========================================================================
   Ces valeurs sont PUBLIQUES par nature (cle API cote client Firebase).
   La securite vient des regles Firestore + de l'authentification, PAS du
   secret de ces cles.

   COMMENT REMPLIR (voir GUIDE_ACTIVATION_FIREBASE.md) :
     1. Creer un projet sur https://console.firebase.google.com
     2. Ajouter une application Web (</>) -> copier la config affichee
     3. Coller les valeurs ci-dessous
     4. Activer Authentication > Sign-in method > "E-mail/Mot de passe"
     5. Activer Firestore Database (mode production)
     6. Ajouter votre domaine egreencitys.com dans
        Authentication > Settings > Domaines autorises
   ========================================================================== */

window.FIREBASE_CONFIG = {
  apiKey: "A_REMPLIR",
  authDomain: "egreencitys.firebaseapp.com",
  projectId: "egreencitys",
  storageBucket: "egreencitys.appspot.com",
  messagingSenderId: "A_REMPLIR",
  appId: "A_REMPLIR"
};

/* Actif seulement si la config a ete remplie (sinon fallback localStorage). */
window.FIREBASE_ENABLED = (
  window.FIREBASE_CONFIG.apiKey &&
  window.FIREBASE_CONFIG.apiKey.indexOf("A_REMPLIR") === -1
);
