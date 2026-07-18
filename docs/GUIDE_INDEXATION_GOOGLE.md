# Guide — Résolution des problèmes d'indexation Google Search Console
## EGREENCITY'S — egreencitys.com

---

## Diagnostic du 07/05/2026

| Problème | Pages | Gravité | Cause |
|---|---:|---|---|
| **Page avec redirection** | 3 | Normal | Canonicalisation HTTPS sans www (souhaité) |
| **Introuvable (404)** | 1 | Corrigé | URL courte sans `/pages/communes/` |
| **Détectée, actuellement non indexée** | 16 | Patience | Site neuf, Google découvre progressivement |

---

## Corrections appliquées (07/05/2026)

### 1. Sitemap nettoyé

**Avant** : 21 URLs dont 3 anchors (`#mission`, `#economie`, `#contact`)
**Après** : 17 URLs, anchors retirés (Google ne les indexe pas comme pages séparées)

### 2. Pages physiques de redirection créées à la racine

13 fichiers HTML générés à la racine du site (URL courtes vers URL canoniques) :

```
/borne-recharge-cayenne.html             -> /pages/communes/borne-recharge-cayenne.html
/borne-recharge-kourou.html              -> /pages/communes/borne-recharge-kourou.html
/borne-recharge-macouria.html            -> /pages/communes/borne-recharge-macouria.html
/borne-recharge-matoury.html             -> /pages/communes/borne-recharge-matoury.html
/borne-recharge-remire-montjoly.html     -> /pages/communes/borne-recharge-remire-montjoly.html
/borne-recharge-saint-laurent-du-maroni.html -> /pages/communes/borne-recharge-saint-laurent-du-maroni.html
/produits.html       -> /pages/produits.html
/reseau.html         -> /pages/reseau.html
/investisseurs.html  -> /pages/investisseurs.html
/blog.html           -> /pages/blog.html
/faq.html            -> /pages/faq.html
/economies.html      -> /pages/economies.html
/devis.html          -> /pages/devis.html
```

Chaque page contient :
- `<link rel="canonical">` vers l'URL canonique
- `<meta name="robots" content="noindex,follow">` pour empêcher l'indexation de l'URL courte
- `<meta http-equiv="refresh" content="0;url=...">` redirection immédiate
- Script JS `location.replace(...)` qui préserve query string et hash

> **Effet** : Google verra le canonical, suivra le lien et indexera UNIQUEMENT la page canonique.

---

## Actions à faire dans Google Search Console

### Étape 1 — Pousser le nouveau sitemap

1. Aller dans **Indexation > Sitemaps** : https://search.google.com/search-console
2. Soumettre à nouveau : `https://egreencitys.com/sitemap.xml`
3. Vérifier le statut « Réussite »

### Étape 2 — Forcer l'inspection des URLs

Pour chacune des **17 URLs** du sitemap, dans Google Search Console :

1. Coller l'URL dans la barre de recherche en haut (« Inspecter une URL »)
2. Cliquer sur **Demander une indexation**
3. Attendre la confirmation « URL ajoutée à une file d'attente prioritaire »

> **Limite GSC** : ~10-15 demandes d'indexation par jour. Étalez sur 2-3 jours en priorisant : page d'accueil > pages communes > pages secondaires.

**Ordre recommandé jour 1** :
1. https://egreencitys.com/
2. https://egreencitys.com/pages/produits.html
3. https://egreencitys.com/pages/reseau.html
4. https://egreencitys.com/pages/investisseurs.html
5. https://egreencitys.com/pages/devis.html
6. https://egreencitys.com/pages/communes/borne-recharge-cayenne.html
7. https://egreencitys.com/pages/communes/borne-recharge-kourou.html
8. https://egreencitys.com/pages/communes/borne-recharge-macouria.html
9. https://egreencitys.com/pages/communes/borne-recharge-matoury.html
10. https://egreencitys.com/pages/communes/borne-recharge-remire-montjoly.html

**Jour 2** :
11. https://egreencitys.com/pages/communes/borne-recharge-saint-laurent-du-maroni.html
12. https://egreencitys.com/pages/economies.html
13. https://egreencitys.com/pages/faq.html
14. https://egreencitys.com/pages/blog.html
15. https://egreencitys.com/blog/guide-advenir-2026.html
16. https://egreencitys.com/pages/legal/cgv.html
17. https://egreencitys.com/pages/legal/mentions-legales.html

### Étape 3 — Valider la correction du 404

Dans la rubrique **Indexation > Pages > Introuvable (404)** :

1. Cliquer sur la page rouge
2. Cliquer sur **VALIDER LA CORRECTION**
3. Google vérifiera dans 1 à 7 jours

### Étape 4 — Validation des pages avec redirection

Dans **Indexation > Pages > Page avec redirection** :

- Les 3 pages détectées sont normales (canonicalisation HTTPS sans www)
- **Cliquer sur VALIDER LA CORRECTION** — Google les classera correctement comme « avec redirection (intentionnelle) »

---

## Bonnes pratiques d'accélération de l'indexation

### Lien depuis sites externes

Plus une page reçoit de **backlinks** (liens externes), plus Google la priorise :

1. **Réseaux sociaux** : poster les pages communes sur Facebook EGREENCITY'S, LinkedIn, Instagram
2. **Annuaires locaux** :
   - Annuaire de la CCI Guyane
   - Pages Jaunes Guyane
   - Annuaire des entreprises de Guyane
   - Avere-France (annuaire opérateurs)
3. **Presse locale** : Guyane 1ère, France-Antilles, Une Saison en Guyane
4. **Partenaires** : demander à E-TOTEM, BPI Guyane, mairies partenaires d'inclure un lien vers egreencitys.com

### Liens internes

Vérifier que **chaque page** est liée depuis au moins 2-3 autres pages du site :

- Footer commun avec liens vers toutes les pages clés
- Menu de navigation principal
- Liens contextuels dans le contenu

### Contenu unique et de qualité

Google indexe en priorité le contenu **utile et unique** :

- Chaque page commune doit avoir au moins 500 mots de contenu unique
- Témoignages clients, photos locales, statistiques précises
- Mises à jour régulières (date de dernière modification visible)

### Performance technique

- **Core Web Vitals** : score > 90 sur PageSpeed Insights (https://pagespeed.web.dev/)
- **Images optimisées** : WebP, lazy loading
- **HTTPS partout** : déjà OK
- **Mobile-friendly** : déjà OK

### Pinger les moteurs

Après chaque mise à jour majeure, soumettre le sitemap à :

- Google Search Console (déjà fait)
- Bing Webmaster Tools : https://www.bing.com/webmasters/
- Yandex Webmaster : https://webmaster.yandex.com/

---

## Délais réalistes

| Action | Délai d'indexation |
|---|---|
| Demande d'indexation manuelle GSC | 1 à 7 jours |
| Soumission sitemap | 7 à 21 jours |
| Découverte naturelle (sans action) | 30 à 90 jours |
| Première position significative dans les SERP | 3 à 6 mois |

> **Patience** : un site neuf prend 3-6 mois pour atteindre son potentiel d'indexation. Les actions techniques ci-dessus accélèrent fortement le processus.

---

## Suivi mensuel recommandé

Tous les **1er du mois**, vérifier dans Google Search Console :

- [ ] Nombre de pages indexées (objectif : 17/17)
- [ ] Erreurs d'indexation résolues
- [ ] Top 10 des requêtes qui amènent du trafic
- [ ] Pages les plus performantes
- [ ] Erreurs Core Web Vitals
- [ ] Backlinks reçus (rubrique Liens)

---

## Liens utiles

- Search Console : https://search.google.com/search-console
- PageSpeed Insights : https://pagespeed.web.dev/
- Test mobile-friendly : https://search.google.com/test/mobile-friendly
- Test sitemap : https://www.xml-sitemaps.com/validate-xml-sitemap.html
- Rich Results Test : https://search.google.com/test/rich-results
- Bing Webmaster : https://www.bing.com/webmasters/

---

*Guide mis à jour le 07/05/2026 — EGREENCITY'S SAS*
