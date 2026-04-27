# Guide — Obtenir les tokens API Facebook + LinkedIn

> Une fois les tokens récupérés, le script `_tools/_social_publisher.py` publie automatiquement.
> **Temps total : ~15 à 20 minutes.**

---

## Étape 0 — Pré-requis

```bat
pip install requests python-dotenv
```

Vérifier Python ≥ 3.9 :
```bat
python --version
```

Copier le modèle de configuration :
```bat
copy .env.example .env
```

---

## Étape 1 — Facebook Page Token (longue durée, ~60 jours)

> Pré-requis : avoir créé une **Page Facebook Pro** (pas un profil perso).

### 1.1 Créer une App Facebook Developer

1. Aller sur **https://developers.facebook.com/apps/**
2. Cliquer **Créer une App** > **Autre** > **Suivant**
3. Type : **Business** > Suivant
4. Nom de l'App : `EGREENCITY'S Publisher`
5. Email de contact : `egreencitys@gmail.com`
6. Créer

### 1.2 Récupérer le PAGE_ID

1. Aller sur la Page Facebook publique
2. Onglet **À propos** > section **Plus d'infos** > copier l'**ID de la Page**
3. Reporter dans `.env` :
   ```
   FACEBOOK_PAGE_ID=123456789012345
   ```

### 1.3 Générer le PAGE_TOKEN longue durée

1. Ouvrir **https://developers.facebook.com/tools/explorer**
2. Sélectionner votre App `EGREENCITY'S Publisher` (haut droit)
3. Cliquer **Get Token** > **Get User Access Token**
4. Cocher les permissions :
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `publish_to_groups` *(optionnel)*
5. **Generate Access Token** > confirmer la connexion Facebook
6. Copier le token (commence par `EAA...`)

**Le token User dure 1 h. Il faut maintenant l'échanger contre un token Page longue durée.**

7. Aller sur **https://developers.facebook.com/tools/debug/accesstoken/**
8. Coller le token User → **Debug**
9. Cliquer **Extend Access Token** → confirmer le mot de passe Facebook
   → Token User longue durée (60 jours)
10. Retourner sur Graph API Explorer, coller ce token User long
11. Endpoint : `me/accounts` → **Submit**
12. Dans la réponse JSON, repérer votre Page → champ `access_token`
    **C'est votre PAGE_TOKEN longue durée (60 jours).**
13. Reporter dans `.env` :
    ```
    FACEBOOK_PAGE_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```

### 1.4 Tester

```bat
python _tools\_social_publisher.py --dry-run
```
Doit afficher `FB ok id=...` ou `DRY-RUN`.

> **Renouvellement** : les tokens Page longue durée n'expirent pas en pratique tant que vous publiez régulièrement. Sinon, refaire l'étape 1.3 tous les 60 jours.

---

## Étape 2 — LinkedIn Company Page Access Token

> Pré-requis : avoir créé une **Page LinkedIn Company** et en être **Super Admin**.

### 2.1 Créer une App LinkedIn Developer

1. **https://www.linkedin.com/developers/apps/new**
2. App name : `EGREENCITY'S Publisher`
3. Company : sélectionner **EGREENCITY'S** (votre Page Company)
4. Privacy URL : `https://egreencitys.com/pages/legal/mentions-legales.html#confidentialite`
5. Logo : uploader `logo.png`
6. **Create app**

### 2.2 Demander les permissions

1. Onglet **Products** de l'App
2. Demander **Share on LinkedIn** *(approbation immédiate)*
3. Demander **Marketing Developer Platform** ou **Community Management API**
   - Approbation manuelle par LinkedIn (peut prendre 1 à 5 jours)
   - Sans cette permission, vous ne pouvez poster qu'au nom du **profil personnel**, pas de la Page Company.

> **Astuce** : pendant l'attente, vous pouvez tester en publiant sur votre profil perso (`urn:li:person:VOTRE_ID`).

### 2.3 OAuth → Access Token

1. Onglet **Auth** de l'App
2. Ajouter une Redirect URL : `http://localhost:8000/callback` *(arbitraire)*
3. Noter votre **Client ID** et **Client Secret**

4. **Méthode rapide** : utiliser l'outil officiel
   **https://www.linkedin.com/developers/tools/oauth/token-generator**
   - Sélectionner votre App
   - Cocher les scopes :
     - `r_liteprofile`
     - `r_organization_social`
     - `w_organization_social` ← critique
     - `w_member_social`
   - **Generate Token** → copier le token (commence par `AQV...`)

5. Reporter dans `.env` :
   ```
   LINKEDIN_ACCESS_TOKEN=AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 2.4 Trouver l'URN de votre Page Company

1. Aller sur **https://www.linkedin.com/company/egreencitys/admin/**
2. Dans l'URL apparaît un nombre : `linkedin.com/company/12345678/`
3. Reporter dans `.env` :
   ```
   LINKEDIN_ORG_URN=urn:li:organization:12345678
   ```

### 2.5 Tester

```bat
python _tools\_social_publisher.py --dry-run
```

> **Durée du token** : 60 jours. À régénérer via l'outil OAuth.

---

## Étape 3 — Premier vrai test

```bat
python _tools\_social_publisher.py
```

Le script :
1. Lit `_dossiers/posts-calendar.json`
2. Identifie les posts `status: pending` avec `publish_at` dépassé
3. Publie sur la(les) plateforme(s) demandée(s)
4. Met à jour le calendrier (`status: published`)
5. Logue dans `_dossiers/_social_publisher.log`

---

## Étape 4 — Automatiser (optionnel)

### Windows — Planificateur de tâches

1. **Win+R** → `taskschd.msc`
2. **Action > Créer une tâche…**
3. Onglet **Général** : nom = "EGREENCITY Social Publisher"
4. Onglet **Déclencheurs** : Tous les jours à 09:00
5. Onglet **Actions** :
   - Programme : `cmd.exe`
   - Arguments : `/c "C:\projet\Egreencity\PUBLIER_POSTS.bat"`
6. **OK** → demande le mot de passe Windows

> Le script ne publiera que les posts dont `publish_at` est dépassé, donc tourner tous les jours à 9h est sans risque (rien à publier = rien ne se passe).

### Alternative cloud (GitHub Actions)

Possibilité de planifier via `.github/workflows/social.yml`. À mettre en place plus tard si besoin (les tokens iront en *Secrets* GitHub).

---

## Sécurité — résumé

| Fichier | Doit-il être commité ? |
|---|---|
| `.env` | ❌ JAMAIS (déjà dans `.gitignore`) |
| `.env.example` | ✅ Oui (modèle vide) |
| `_tools/_social_publisher.py` | ✅ Oui |
| `_dossiers/posts-calendar.json` | ✅ Oui (pas de tokens dedans) |
| `_dossiers/_social_publisher.log` | ❌ Non (peut contenir des IDs sensibles) |

---

## Dépannage

| Erreur | Cause probable | Solution |
|---|---|---|
| `Tokens Facebook absents (.env)` | `.env` non lu | Vérifier qu'il est à la racine du projet |
| `FB HTTP 190` | Token expiré | Régénérer (étape 1.3) |
| `FB HTTP 200 OAuthException` | Permissions manquantes | Recocher `pages_manage_posts` |
| `LI HTTP 401` | Token expiré ou scope insuffisant | Régénérer (étape 2.3) |
| `LI HTTP 403 ACCESS_DENIED` | Permission Company API non accordée | Attendre validation LinkedIn |
| `LI image upload failed` | Asset upload bloqué | Le post part sans image (non bloquant) |

Pour debug détaillé :
```bat
python _tools\_social_publisher.py --dry-run
```
