# Guide — Ajuster les prix de la boutique
## EGREENCITY'S — 2 façons de le faire

Il y a **deux cas** différents, gérés de deux manières :

---

## 🎟️ Cas 1 — Une PROMOTION (remise ponctuelle)
### → Codes promo Stripe, sans rien toucher au site

Pour une remise temporaire (soldes, code parrainage, opération commerciale) :

1. Allez sur le **dashboard Stripe** → **Produits** → **Coupons**
   (https://dashboard.stripe.com/coupons)
2. **Créer un coupon** :
   - Type : pourcentage (ex : −15 %) ou montant fixe (ex : −200 €)
   - Durée / date de fin si besoin
3. Stripe génère un **code promo** (ex : `RENTREE25`)
4. Communiquez ce code à vos clients (email, réseaux…)
5. Au moment de payer, le client saisit le code → **remise appliquée automatiquement**

✅ **Aucune modification du site, aucune republication.** Vous êtes 100 % autonome.
Les codes promo sont déjà activés sur tous les liens de paiement.

> Pour arrêter une promo : supprimez ou désactivez le coupon dans Stripe.

---

## 💶 Cas 2 — Un CHANGEMENT DE PRIX PERMANENT
### (le fournisseur augmente, ou vous changez votre marge)

Ici il faut régénérer les liens de paiement. **Deux options** :

### Option A — Vous le faites vous-même (double-clic)

1. **Ouvrez** le fichier `assets\js\catalog.js` dans le Bloc-notes
2. Changez ce que vous voulez :
   - **La marge globale** : la ligne `COEF_MARGE: 1.35,`
     (1.35 = +35 %. Mettez 1.40 pour +40 %, etc.)
   - **Le prix d'un seul produit** : trouvez le produit et changez son
     nombre **`ht:`** (c'est le prix d'achat HT chez le fournisseur).
     Exemple : `ht: 715,` → `ht: 750,`
3. **Enregistrez** le fichier
4. **Double-cliquez** sur **`Mettre à jour les prix.bat`** (à la racine du projet)
5. Une fenêtre s'ouvre :
   - Elle **lit les prix** dans catalog.js
   - **Désactive** les anciens liens (les anciens prix ne sont plus payables)
   - **Crée** les nouveaux liens Stripe
   - **Publie** le site en ligne
6. Quand vous voyez « TERMINE ! », c'est bon — en ligne sous 1-2 min.

> ⚠️ La fenêtre vous demandera de taper **`oui`** pour confirmer (sécurité,
> car ce sont de vraies transactions). Tapez `oui` puis Entrée.

**Comment est calculé le prix affiché au client (tout compris) :**
```
Prix client = (prix d'achat HT × COEF_MARGE)   ← votre bénéfice
            + octroi de mer 20 %                ← reversé à la douane
            + livraison Chronopost DOM          ← reversé au transporteur
```
Le client paie **tout en une fois**, rien à la livraison.

### Option B — Vous me demandez
Dites-moi simplement, par exemple :
> « Passe la e-WallBox Murale 7 kW à 780 € HT »
> ou « Mets la marge à 40 % »

Je fais la modification + la régénération + la mise en ligne en ~2 min.

---

## Bon à savoir
- **Une seule source de prix** : tout part de `catalog.js`. Le prix affiché sur
  le site **et** le montant facturé par Stripe sont toujours cohérents.
- **Quantité** : le client peut déjà commander plusieurs bornes sur un même lien.
- **Anciens liens** : ils sont automatiquement désactivés à chaque mise à jour,
  donc personne ne peut payer un ancien prix via un vieux lien.

---

*Guide ajustement des prix — EGREENCITY'S SAS — v1.0*
