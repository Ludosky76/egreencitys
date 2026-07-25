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
  apiKey: "AIzaSyA9NmTJ_826aOjD12XjLKI4Eny9OQtZGbc",
  authDomain: "egreencitys-93e0b.firebaseapp.com",
  projectId: "egreencitys-93e0b",
  storageBucket: "egreencitys-93e0b.firebasestorage.app",
  messagingSenderId: "979890591344",
  appId: "1:979890591344:web:c875b286ec76ecbb9a06b5",
  measurementId: "G-MPRFT15BDP"
};

/* Actif seulement si la config a ete remplie (sinon fallback localStorage). */
window.FIREBASE_ENABLED = (
  window.FIREBASE_CONFIG.apiKey &&
  window.FIREBASE_CONFIG.apiKey.indexOf("A_REMPLIR") === -1
);
