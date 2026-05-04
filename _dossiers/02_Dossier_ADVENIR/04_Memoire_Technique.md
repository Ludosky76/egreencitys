# MÉMOIRE TECHNIQUE — EGREENCITY'S
## Architecture technique et supervision OCPP — 20 PDC Guyane

---

## 1. Architecture générale du système

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE TECHNIQUE                           │
│                                                                     │
│  ┌──────────────┐    OCPP 1.6J    ┌───────────────────────────┐    │
│  │  Borne AC    │◄──────────────►│                           │    │
│  │ e-Premium AC │   (4G / TLS)   │   PLATEFORME OCPP         │    │
│  │  2 × 22 kW   │                │   (Back-office CSMS)      │    │
│  └──────────────┘                │                           │    │
│         ×10                      │  • Supervision temps réel │    │
│  (10 stations — 20 PDC)          │  • Gestion transactions   │    │
│                                  │  • Facturation / RFID     │    │
│                                  │  • Alertes / incidents    │    │
│                                  │  • Données itinérance     │    │
│                                  └───────────┬───────────────┘    │
│                                              │                     │
│                              ┌───────────────▼───────────────┐    │
│                              │   APPLICATION MOBILE          │    │
│                              │   iOS + Android               │    │
│                              │   (marque blanche EGREENCITY'S│    │
│                              │    + portail eMSP national)   │    │
│                              └───────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Équipement de charge déployé

### 2.1 Borne AC — e-Premium AC Pied 2×22 kW (×10)

*Source : Fiche technique constructeur 2026 + Devis E-TOTEM DEV26000037 du 30/04/2026.*

| Caractéristique | Valeur |
|----------------|--------|
| **Fabricant** | E-TOTEM SAS (siège : Saint-Étienne 42, Loire, France) |
| **Site de fabrication** | Aytré (Charente-Maritime 17), France |
| Modèle | e-Premium AC — Pied 2×22 kW |
| Quantité | **10 unités** |
| **Tension nominale** | 400 VAC ±10% / 3P+N+PE / 50-60 Hz ±1% |
| **Courant nominal** | 32 A par PDC |
| **Puissance par PDC** | 22 kW AC (jusqu'à 25 kW évolutif) |
| **Puissance par borne** | 44 kW (2 PDC simultanés) |
| **Puissance totale installée** | **440 kW AC** |
| **Régime de neutre** | TT et TN (compatible réseau EDF SEI Guyane) |
| Connecteurs Mode 3 (AC) | 2 × Type 2 (T2S NF EN 62196-2) avec obturateurs |
| Connecteurs Mode 2 (AC) | 2 × Prise E/F domestique 2,3 kW / 10 A *(option)* |
| Section raccordement max | 16 mm² souple (avec embout) / 25 mm² rigide |
| **Structure** | Coffret aluminium moulé peinture époxy + structure **Inox 304** + plastron en verre |
| Couleur de base | RAL 7043 grain cuir brillant |
| Traitement surface | Anti-graffiti *(option)* + peinture double couche zone humide *(retenue, climat tropical)* |
| **Comptage** | 2 × compteurs **MID certifiés** par PDC (Directive 2014/32/UE) |
| **Protections électriques** | Disjoncteur + Différentiel 30 mA **type B** par PDC + Parafoudre Type 2 (IEC 61643) — Icc 10 kA |
| **Communication** | Liaison Ethernet filaire + Modem **3G/4G** LTE en option (sans carte SIM) |
| **Protocole** | **OCPP 1.6J** natif et direct (JSON over WebSocket, TLS 1.2) — compatible OCPP 1.5 |
| **Authentification** | Lecteur **RFID** (ISO 14443/15693) + CB sans contact (TPE option) + QR code |
| Interface usager (IHM) | Écran tactile couleur 10" multilingue (FR/EN/ES/PT/NL) *(option retenue)* + LED de signalisation visibles à distance |
| Indice de protection | **IP55 / IK10** — usage intensif extérieur |
| Température de service | -30°C à +50°C, hygrométrie 5 à 95% |
| Bruit | < 65 dB à 1 m |
| **Conformité** | CE — IEC 61851-1 — IEC 61851-22 — IEC 62196-2 |
| **Accessibilité PMR** | Oui (conforme normes accessibilité voirie publique) |
| Smart Charging | Borne maître pour gestion jusqu'à 16 PDC + délestage entre les 2 PDC d'une même borne |
| Dimensions (H × L × P) | ~165 × 60 × 40 cm (avec pied) |
| Installation préconisée | Parking, voirie intérieure / extérieure, privée ou publique |
| **Garantie** | 2 ans à compter de l'enlèvement usine (CGV E-TOTEM) |

### 2.2 Justification du choix 100 % AC

Le déploiement exclusivement en AC 22 kW est motivé par :

| Critère | AC 22 kW retenu | DC rapide (écarté) |
|---------|----------------|--------------------|
| Coût unitaire HT | 5 802 € | ~36 334 € |
| Installation | Simple — BT | Complexe — HTA |
| Raccordement EDF | 50 kVA / borne | 160 kVA / station |
| Maintenance | Standard | Spécialisée |
| Temps de recharge | 45–60 min (pause naturelle) | 20–30 min |
| Taux couverture ADVENIR | **64,1 %** | ~43 % |
| Adaptation usage Guyane | Optimal (trajets courts–moyens) | Overkill pour maillage urbain |

> À Iracoubo (relais RN1), 2 bornes AC 22 kW (4 PDC) assurent la même
> fonction de relay qu'une station DC, avec 4× moins d'investissement
> et sans contrainte HTA.

---

## 3. Protocole OCPP 1.6J — Conformité ADVENIR

### 3.1 Exigence ADVENIR

Le programme ADVENIR impose que **toutes les bornes soient conformes OCPP 1.6 ou supérieur**, permettant :
- L'interopérabilité avec les systèmes tiers (eMSP nationaux)
- La remontée de données de session (énergie, durée, identifiant)
- La gestion à distance (reset, diagnostic, firmware update)

### 3.2 Messages OCPP 1.6J implémentés

| Message | Direction | Fonction |
|---------|-----------|----------|
| `BootNotification` | CP → CS | Déclaration borne au démarrage |
| `Heartbeat` | CP → CS | Signal de vie (toutes les 60 s) |
| `StartTransaction` | CP → CS | Début de session de charge |
| `StopTransaction` | CP → CS | Fin de session + données énergie |
| `Authorize` | CP → CS | Validation badge RFID |
| `MeterValues` | CP → CS | Données compteur MID en temps réel |
| `StatusNotification` | CP → CS | État borne (Available / Charging / Faulted) |
| `RemoteStartTransaction` | CS → CP | Démarrage à distance (app mobile) |
| `RemoteStopTransaction` | CS → CP | Arrêt à distance |
| `ChangeConfiguration` | CS → CP | Modification paramètres |
| `GetDiagnostics` | CS → CP | Export logs de diagnostic |
| `UpdateFirmware` | CS → CP | Mise à jour firmware à distance |
| `Reset` | CS → CP | Redémarrage logiciel / matériel |

### 3.3 Sécurité des communications

- Chiffrement **TLS 1.2** obligatoire sur toutes les connexions
- Authentification borne par **certificat X.509**
- Token RFID : **hachage SHA-256** côté CSMS
- Conformité RGPD : données de session anonymisées après 90 jours

---

## 3.bis Architecture de supervision & smart charging

### 3.bis.1 Composants déployés (catalogue installateurs E-TOTEM 2026)

| Composant | Réf. | Quantité | Rôle |
|-----------|------|---------:|------|
| **e-power FM** (étude + paramétrage consigne fixe multi-stations) | 913012 | 1 | Solution de pilotage IRVE pour les 10 stations |
| **e-Powerbox** (boîtier e-Master + configuration) | 913018 | 1 | Boîtier de gestion smart charging multi-stations |
| **Modem 4G e-Powerbox** (avec carte SIM 100 Mo/mois + config) | 913019 | 1 | Liaison du boîtier au CSMS |
| **Switch 8 ports** | 339097 | 2 | Interconnexion réseau locale (Cayenne + Iracoubo) |
| **e-Allow CP** (allocation puissance avec priorité PDC) | 913015 | 1 | Priorisation des sites stratégiques |
| **E-meter 400 A** (centrale de mesure C4 Tarif Jaune) | 723323 | 1 | Mesure dynamique pour Iracoubo Aire RN1 |

### 3.bis.2 Plateforme CSMS (Charging Station Management System)

EGREENCITY'S déploie une plateforme de supervision OCPP 1.6J multi-tenant intégrant :

- **Supervision temps réel** des 20 PDC : statuts (Available / Charging / Faulted), incidents, taux de disponibilité
- **Gestion des transactions** : authentification (RFID, app, CB), démarrage/arrêt à distance, facturation
- **Reporting AVERE-France** : export annuel des données de session, taux de disponibilité, énergie délivrée
- **Connexion GIREVE** : interopérabilité avec les eMSP nationaux (Chargemap, Plugsurfing, etc.)
- **Téléopération** vers DATA.GOUV.fr : enregistrement des données statiques par PDC
- **Application mobile** marque blanche EGREENCITY'S (iOS + Android)
- **Hotline opérateur niveau 2** disponible 24/7 via partenaire E-TOTEM

### 3.bis.3 Algorithmie smart charging (cohérence Avere ZNI)

Le système e-power FM avec e-Allow CP applique en temps réel les consignes suivantes :

1. **Consigne fixe par station** : limitation de la puissance totale appelée à 36 kVA (TJ Cayenne) ou C5 Tarif Bleu (autres communes), évitant tout dépassement contractuel EDF SEI ;
2. **Délestage entre les 2 PDC d'une même borne** : si 2 véhicules chargent simultanément sur la même borne, la puissance est partagée (2×11 kW au lieu de 2×22 kW lorsque la limite est atteinte) ;
3. **Priorité par PDC** (e-Allow CP) : sur Iracoubo (relais RN1), priorité aux PDC accueillant les véhicules en transit (temps de pause limité) plutôt qu'aux PDC en stationnement long ;
4. **Évolution phase 2 (e-Power DYM)** : passage à un pilotage dynamique avec mesure instantanée via E-meter — la station IRVE adapte sa consommation en fonction de la consommation totale du site (Mairie d'Iracoubo = bâtiment communal partagé).

> **Conformité Avere Outre-mer (avril 2026)** : ce dispositif répond intégralement à la
> recommandation n° 1 « Systématiser le pilotage intelligent de la recharge dans les zones non
> interconnectées, afin de limiter les appels de puissance en période de pointe ».

### 3.bis.4 Schéma logique

```
                ┌─────────────────────────────────────────────┐
                │            PLATEFORME CSMS OCPP 1.6J        │
                │  (Supervision + Reporting + Interop GIREVE) │
                └─────────────────────────────────────────────┘
                          ▲                       ▲
                          │ OCPP 1.6J            │ API REST
                          │ (TLS 1.2)            │
                          │                       │
        ┌─────────────────┼─────────────────┐    ▼
        │                 │                 │   ┌───────────────┐
        │                 │                 │   │  GIREVE       │
        │     Modem 4G    │                 │   │  (eMSP)       │
        │                 │                 │   └───────────────┘
        │  ┌──────────────▼──────────────┐  │
        │  │    e-Powerbox (e-Master)    │  │
        │  │   Smart Charging Controller │  │
        │  └─────────────┬───────────────┘  │
        │                │                   │
        │   ┌────────────┼────────────┐     │
        │   │            │            │     │
        │   ▼            ▼            ▼     │
        │ Borne 1     Borne 2 ...  Borne 10 │
        │ (2 PDC)    (2 PDC)      (2 PDC)   │
        └───────────────────────────────────┘
              Réseau local (switches × 2)
```

---

## 4. Connectivité en Guyane

### 4.1 Modem 4G intégré

Toutes les bornes sont équipées d'un **modem 4G LTE intégré** (aucun câble réseau nécessaire). Le déploiement en Guyane impose cette architecture en raison :
- De l'absence de fibre optique sur de nombreux sites de voirie
- Des coûts prohibitifs d'un câblage dédié sur 10 sites dispersés
- De la couverture 4G Bouygues/Orange couvrant les 8 communes cibles

### 4.2 Couverture opérateurs (sites vérifiés)

| Site | Opérateur 4G | Signal estimé |
|------|-------------|---------------|
| Cayenne (×2) | Orange + Bouygues | Excellent |
| Matoury | Orange + Bouygues | Excellent |
| Rémire-Montjoly | Orange + Bouygues | Très bon |
| Macouria-Tonate | Orange | Bon |
| Kourou | Orange + Bouygues | Excellent |
| Iracoubo (×2) | Orange | Bon (SIM haute priorité) |
| Saint-Laurent-du-Maroni | Orange + Bouygues | Bon |
| Mana | Orange | Acceptable (SIM haute priorité) |

> **Note** : Pour les sites à signal limité (Iracoubo, Mana), les bornes
> sont configurées en mode **file locale** : les transactions sont stockées
> localement en cas de déconnexion et synchronisées au retour de la 4G.

---

## 5. Supervision 24/7

### 5.1 Plateforme CSMS (Charge Point Management System)

- **Opérateur** : E-TOTEM (partenaire technique EGREENCITY'S)
- **Niveau de service** : supervision 24/7/365
- **Hotline niveau 2** : équipe technique E-TOTEM dédiée
- **Délai d'intervention** : < 4 h pour diagnostic à distance, < 72 h pour intervention physique

### 5.2 Tableau de bord opérateur

EGREENCITY'S dispose d'un **accès back-office** permettant :

| Fonctionnalité | Description |
|---------------|-------------|
| Cartographie temps réel | Statut de chaque PDC (disponible / en charge / hors service) |
| Sessions actives | Visualisation des sessions en cours (PDC, véhicule, énergie) |
| Historique complet | Export des sessions (CSV/Excel) pour reporting ADVENIR |
| Alertes automatiques | SMS + email en cas de panne, déconnexion ou erreur OCPP |
| Gestion tarifaire | Paramétrage des tarifs (€/kWh, €/min) par borne |
| Gestion RFID | Ajout/révocation de badges, gestion badge ADVENIR |
| Rapports | Énergie délivrée, disponibilité (uptime), CA mensuel |

### 5.3 Disponibilité garantie (SLA)

| Indicateur | Engagement |
|-----------|-----------|
| Disponibilité minimale (uptime) | ≥ 95 % / mois |
| Délai de résolution panne logicielle | < 4 h (à distance) |
| Délai de résolution panne matérielle | < 5 jours ouvrés |
| Délai de remplacement pièce critique | < 15 jours (fret métropole) |

---

## 6. Accès public et modes de paiement

### 6.1 Tri-modalité d'accès

Conformément aux exigences ADVENIR, **aucune restriction d'accès** n'est imposée aux usagers :

| Mode | Dispositif | Détail |
|------|-----------|--------|
| Badge RFID | NFC ISO 14443/15693 | Badge EGREENCITY'S + badge ADVENIR + tout badge eMSP |
| Application mobile | iOS + Android | App marque blanche EGREENCITY'S + portails nationaux (Chargemap, etc.) |
| CB sans contact | NFC intégré | Visa, Mastercard, CB — sans inscription préalable |

### 6.2 Itinérance (roaming)

- **Protocole OCPI** (Open Charge Point Interface) v2.2 — connexion aux agrégateurs nationaux
- Badge ADVENIR accepté sur toutes les 20 bornes dès la mise en service
- Interopérabilité avec les réseaux nationaux : Chargemap, Freshmile, ChargePoint

### 6.3 Tarification

| Type | Tarif initial | Base de calcul |
|------|--------------|----------------|
| AC — e-Premium 22 kW | 0,35 €/kWh | Énergie (kWh MID certifié) |
| Temps de connexion (après session) | 0,05 €/min (après 30 min) | Anti-saturation |

---

## 7. Raccordement électrique

### 7.1 Puissances souscrites EDF SEI

| Station | Puissance borne | Puissance souscrite EDF | Tarif |
|---------|----------------|------------------------|-------|
| 10 × AC e-Premium 2×22 kW | 44 kW / borne | 50 kVA / borne | BT professionnelle |

> Avantage majeur : toutes les bornes se raccordent en **Basse Tension** (BT),
> sans nécessité de poste HTA. Procédure EDF SEI plus rapide et moins coûteuse.

### 7.2 Procédure raccordement

1. **Pré-étude EDF SEI Guyane** — Demande de raccordement (DR) par site
2. **Proposition technique et financière (PTF)** — EDF SEI sous 3 mois
3. **Acceptation PTF + paiement quote-part** — EGREENCITY'S
4. **Réalisation raccordement** — EDF SEI (délai estimé : 3 à 6 mois en Guyane)
5. **Mise en service** — Consuel + attestation EDF

> ⚠️ **Point critique Guyane** : Les délais EDF SEI sont plus longs qu'en métropole.
> La pré-étude doit être lancée simultanément au dépôt du dossier ADVENIR.

---

## 8. Signalétique ADVENIR (exigence)

Conformément au cahier des charges ADVENIR, chaque borne subventionnée devra comporter :

- **Logo ADVENIR** en sérigraphie ou autocollant haute durabilité (UV résistant)
- **Mention** : « Station cofinancée par le programme ADVENIR »
- **Dimensions minimales** : logo 10 × 5 cm, mention lisible à 2 mètres
- **Positionnement** : face avant de la borne, au-dessus de l'interface usager
- **Durée** : pendant toute la durée d'engagement (5 ans minimum)

> Fichiers vectoriels ADVENIR à demander à AVERE-France lors de la validation du dossier.

---

## 9. Certifications et normes

| Norme | Objet | Applicable à |
|-------|-------|-------------|
| IEC 61851-1 | Systèmes de charge AC | e-Premium AC |
| IEC 61851-22 | Charge AC mode 3 | e-Premium AC |
| IEC 62196-2 | Connecteur Type 2 | e-Premium AC |
| EN 55014 | Compatibilité électromagnétique | Toutes bornes |
| Directive 2014/32/UE | Mesure MID (comptage énergie) | Toutes bornes |
| RGPD (UE 2016/679) | Protection données personnelles | Plateforme CSMS |
| OCPP 1.6J | Protocole communication IRVE | Toutes bornes |
| NF EN 61851-1 | (marquage NF — France) | Toutes bornes |

---

## 10. Partenaire technique — E-TOTEM

| | |
|---|---|
| **Raison sociale** | E-TOTEM SAS |
| **Siège** | Saint-Étienne (Loire, 42) |
| **Activité** | Fabricant et opérateur de bornes IRVE |
| **Agrément ADVENIR** | Fournisseur agréé ADVENIR |
| **Contact commercial** | Aurore Comte — aurore.comte@e-totem.eu |
| **Référence devis** | DEV17000172-6 (2025) |
| **Support technique** | Hotline 24/7 — niveau 2 CSMS |
| **Garantie matériel** | 2 ans constructeur + option extension 5 ans |
