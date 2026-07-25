# Guide — Activation Firebase (comptes clients sécurisés + email de réinitialisation)
## EGREENCITY'S — Espace client

---

## Pourquoi Firebase ?

Le site est **100 % statique** (GitHub Pages, pas de serveur). Sans backend,
impossible d'envoyer un vrai email de réinitialisation de mot de passe.
**Firebase Authentication** (Google) résout ça sans serveur :

- ✅ Comptes sécurisés côté Google (mots de passe **jamais** stockés en clair)
- ✅ **Vrai email de réinitialisation** envoyé au client (lien cliquable)
- ✅ Email de vérification à l'inscription
- ✅ Changement d'email avec lien de confirmation
- ✅ Profil + historique de commandes stockés dans le cloud (Firestore),
  synchronisés **entre tous les appareils** du client
- ✅ Gratuit jusqu'à ~50 000 connexions/mois (largement suffisant)

> **Sans Firebase configuré, le site continue de fonctionner** avec le système
> de secours `localStorage` (comptes stockés dans le navigateur, récupération
> par question de sécurité). Firebase prend le relais **dès que la config est remplie**.

---

## Ce qui est déjà en place dans le code

| Élément | Statut |
|---|---|
| `assets/js/firebase-config.js` (config publique à remplir) | ✅ Créé — valeurs `A_REMPLIR` |
| `assets/js/firebase-auth.js` (logique auth + Firestore) | ✅ Créé |
| Scripts injectés dans les 20 pages | ✅ Fait |
| CSP (Content-Security-Policy) autorisant les domaines Firebase | ✅ Fait |
| Page `compte.html` adaptée (email reset réel, vérification) | ✅ Fait |
| Bascule automatique Firebase ⇄ localStorage | ✅ `FIREBASE_ENABLED` |

**Il ne reste qu'à créer le projet Firebase et coller 3 valeurs.**

---

## Étape 1 — Créer le projet Firebase (5 min)

1. Aller sur **https://console.firebase.google.com** (connexion avec le compte
   Google `egreencitys@gmail.com`)
2. **Ajouter un projet** → nom : `egreencitys`
   - (Le `projectId` sera `egreencitys` ; s'il est déjà pris, Google propose
     `egreencitys-xxxx` — notez-le, il faudra l'ajuster à l'étape 3.)
3. Google Analytics : **facultatif** (vous pouvez désactiver)
4. Attendre la création (~30 s)

---

## Étape 2 — Ajouter une application Web

1. Dans le projet → icône **`</>`** (Ajouter une app Web)
2. Surnom de l'app : `egreencitys-web` → **Enregistrer l'app**
3. Firebase affiche un bloc `firebaseConfig` du type :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD.......",
  authDomain: "egreencitys.firebaseapp.com",
  projectId: "egreencitys",
  storageBucket: "egreencitys.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

4. **Copier ces valeurs** (on les colle à l'étape 3).

---

## Étape 3 — Coller la config dans le site

Éditer **`assets/js/firebase-config.js`** et remplacer les `A_REMPLIR` :

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyD.....",                 // <-- coller
  authDomain: "egreencitys.firebaseapp.com",
  projectId: "egreencitys",               // <-- ajuster si différent
  storageBucket: "egreencitys.appspot.com",
  messagingSenderId: "123456789012",      // <-- coller
  appId: "1:123456789012:web:abcdef123456" // <-- coller
};
```

> Dès que `apiKey` ne contient plus `A_REMPLIR`, `FIREBASE_ENABLED` passe à `true`
> et le site utilise Firebase automatiquement.

⚠️ **Si `projectId` / `authDomain` diffèrent** de `egreencitys.firebaseapp.com`,
il faut aussi mettre à jour le domaine dans le CSP des pages. Relancer alors :
```bash
python _tools/_csp_firebase.py
```
après avoir corrigé le domaine dans `_tools/_csp_firebase.py` (variable `ADD`).

---

## Étape 4 — Activer l'authentification par email

1. Console Firebase → **Authentication** → **Commencer**
2. Onglet **Sign-in method** → **Ajouter un fournisseur** → **E-mail/Mot de passe**
3. **Activer** le premier interrupteur → **Enregistrer**

### Personnaliser les emails en français
Authentication → **Templates** (Modèles) :
- Modèle **Réinitialisation du mot de passe** → langue **Français**
- Modèle **Vérification de l'adresse e-mail** → langue **Français**
- (Optionnel) Personnaliser l'expéditeur / le nom d'affichage EGREENCITY'S

---

## Étape 5 — Activer Firestore (profils + commandes)

1. Console Firebase → **Firestore Database** → **Créer une base de données**
2. Mode : **Production**
3. Emplacement : `eur3 (europe-west)` (proche de la Guyane côté réseau Europe)
4. **Règles de sécurité** — remplacer par (chaque client accède seulement à ses données) :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /orders/{orderId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```
→ **Publier**.

---

## Étape 6 — Autoriser le domaine du site

Authentication → **Settings** (Paramètres) → **Domaines autorisés** → **Ajouter un domaine** :
- `egreencitys.com`
- `www.egreencitys.com`

(`localhost` est déjà autorisé pour vos tests.)

---

## Étape 7 — Commit + push

```bash
git add assets/js/firebase-config.js
git commit -m "feat: activation Firebase (comptes sécurisés + email reset)"
git push
```

→ Après le déploiement GitHub Pages (~1 min), les comptes sont sécurisés par Firebase.

---

## Comment tester

1. Aller sur https://egreencitys.com/pages/compte.html
2. **Créer un compte** avec une vraie adresse email → vous recevez un **email de vérification**
3. Se déconnecter → **« Mot de passe oublié ? »** → saisir l'email
4. Vous recevez un **vrai email** avec un lien → cliquer → définir un nouveau mot de passe
5. Se reconnecter avec le nouveau mot de passe ✅

> Si l'email n'arrive pas : vérifier les spams, et que le domaine est bien
> autorisé (Étape 6). Les emails Firebase partent de `noreply@egreencitys.firebaseapp.com`.

---

## Bascule Firebase ⇄ localStorage (comment ça marche)

- `firebase-config.js` définit `FIREBASE_ENABLED` = `true` **uniquement si** la clé
  API est remplie.
- `firebase-auth.js` :
  - si **désactivé** → ne fait rien, le système `customer-account.js` (localStorage)
    reste actif (récupération par question de sécurité) ;
  - si **activé** → remplace `window.EGCCustomer` par la version Firebase et met en
    cache l'état de session dans `localStorage` pour que la navigation reste fluide.
- La page compte masque automatiquement la « question de sécurité » quand Firebase
  est actif (inutile : le reset se fait par email).

---

## Coûts

Plan **Spark (gratuit)** de Firebase, largement suffisant pour EGREENCITY'S :
- Authentication : gratuit (jusqu'à ~50 000 utilisateurs actifs/mois)
- Firestore : 1 Gio stockage + 50 000 lectures/jour gratuits

Aucune carte bancaire requise pour le plan gratuit.

---

## Sécurité — rappels

- ✅ Les valeurs de `firebase-config.js` sont **publiques par nature** (clé client) —
  aucun risque à les versionner. La sécurité vient des **règles Firestore** (Étape 5)
  et de l'authentification.
- ✅ Les mots de passe sont hashés/salés côté Google, jamais visibles.
- ✅ Chaque client ne peut lire/écrire que **ses propres** données (règles Firestore).

---

*Guide activation Firebase — EGREENCITY'S SAS — v1.0*
