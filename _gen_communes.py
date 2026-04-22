"""
Generateur des 6 pages communes pour le SEO local Guyane.
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

COMMUNES = [
    {
        "slug": "cayenne",
        "name": "Cayenne",
        "prefecture": True,
        "habitants": "63 900",
        "description": "préfecture de la Guyane française et centre économique du département",
        "quartiers": ["Centre-ville", "Cabassou", "Mirza", "Montabo", "Montjoly (extension)", "Zone industrielle"],
        "cibles": "administrations, hôtels, restaurants, commerces du centre-ville et parkings publics",
        "specif": "Forte demande en bornes 22 kW AC pour les flottes administratives et les hôtels. Contraintes d'alimentation en centre-ville nécessitent souvent du triphasé renforcé.",
        "geo_lat": 4.9378, "geo_lng": -52.3258,
    },
    {
        "slug": "kourou",
        "name": "Kourou",
        "prefecture": False,
        "habitants": "25 400",
        "description": "commune spatiale emblématique, siège du Centre Spatial Guyanais (CNES)",
        "quartiers": ["Centre-ville", "Bois Diable", "Pariacabo", "Les Roches", "Zone du Centre Spatial"],
        "cibles": "entreprises du spatial (CNES, Arianespace, Ariane Group), hôtels, résidences collectives",
        "specif": "Forte concentration de cadres expatriés et d'entreprises tech attirés par les véhicules électriques haut de gamme. Infrastructure électrique robuste (proximité des installations CSG).",
        "geo_lat": 5.1586, "geo_lng": -52.6458,
    },
    {
        "slug": "macouria",
        "name": "Macouria",
        "prefecture": False,
        "habitants": "15 100",
        "description": "commune de l'île de Cayenne en pleine croissance démographique",
        "quartiers": ["Tonate", "Soula", "La Rougerie", "Maillard", "Saint-Antoine"],
        "cibles": "particuliers en maison individuelle, lotissements résidentiels, zones commerciales",
        "specif": "Siège social d'EGREENCITY'S à La Rougerie. Tissu pavillonnaire idéal pour les WallBox 7-11 kW. Nouveaux lotissements intègrent systématiquement la mobilité électrique.",
        "geo_lat": 4.9362, "geo_lng": -52.3545,
    },
    {
        "slug": "matoury",
        "name": "Matoury",
        "prefecture": False,
        "habitants": "32 800",
        "description": "commune aéroportuaire (aéroport Félix-Éboué) et pôle logistique de la Guyane",
        "quartiers": ["Balata", "Cogneau-Lamirande", "Concorde", "Stade", "Aéroport"],
        "cibles": "flottes logistiques, loueurs de véhicules, hôtels aéroportuaires, entreprises Balata",
        "specif": "Zone idéale pour hub de recharge rapide DC 50 kW : proximité aéroport + nationale 1 + Zone industrielle de Balata. Demande forte des loueurs de voitures (Hertz, Europcar, Sixt).",
        "geo_lat": 4.8500, "geo_lng": -52.3333,
    },
    {
        "slug": "remire-montjoly",
        "name": "Rémire-Montjoly",
        "prefecture": False,
        "habitants": "24 500",
        "description": "commune résidentielle prisée, limitrophe de Cayenne avec plages de Montjoly",
        "quartiers": ["Montjoly", "Rémire-Centre", "Mont Mahury", "Zéphyr"],
        "cibles": "particuliers en villas, résidences haut de gamme, plages touristiques, hôtels",
        "specif": "Commune au pouvoir d'achat élevé avec forte pénétration des véhicules électriques premium (Tesla, Audi e-tron). Potentiel important pour les installations résidentielles 22 kW.",
        "geo_lat": 4.9167, "geo_lng": -52.2833,
    },
    {
        "slug": "saint-laurent-du-maroni",
        "name": "Saint-Laurent-du-Maroni",
        "prefecture": False,
        "habitants": "48 500",
        "description": "sous-préfecture de l'Ouest guyanais, frontière avec le Suriname",
        "quartiers": ["Centre-ville historique", "Village Chinois", "Saint-Maurice", "Charbonnière"],
        "cibles": "sous-préfecture, hôpital, collectivités, commerces frontaliers, hôtels",
        "specif": "Commune en très forte croissance démographique. Enjeu majeur de désenclavement via la RN1. Partenariats prioritaires avec la Communauté de Communes de l'Ouest Guyanais (CCOG).",
        "geo_lat": 5.5031, "geo_lng": -54.0283,
    },
]

def build_commune_page(c):
    title = f"Borne de recharge {c['name']} — Installation & maintenance | EGREENCITY'S"
    desc = f"Installation de bornes de recharge pour véhicules électriques à {c['name']} ({c['habitants']} habitants). Particuliers, entreprises, collectivités. Subvention ADVENIR, maintenance 36 mois."
    canonical = f"https://egreencitys.com/borne-recharge-{c['slug']}.html"

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{canonical}">
  <meta name="geo.region" content="FR-GF">
  <meta name="geo.placename" content="{c['name']}, Guyane française">
  <meta name="geo.position" content="{c['geo_lat']};{c['geo_lng']}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://egreencitys.com/logo.png">
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{{--green:#33CC00;--green-dark:#28a800;--green-deep:#0a4800;--blue:#2B4DB5;--off:#f4fff0;--dark:#081a00;--text:#1a3a00;--muted:#4a6a40;}}
    *{{margin:0;padding:0;box-sizing:border-box;}}
    html{{scroll-behavior:smooth;}}
    body{{font-family:'Poppins',system-ui,sans-serif;color:var(--dark);background:#fff;line-height:1.6;}}
    a{{color:var(--green-deep);text-decoration:none;transition:.2s;}}
    a:hover{{color:var(--green);}}
    .topbar{{background:linear-gradient(135deg,var(--green-deep),var(--green));color:#fff;padding:1rem 0;position:sticky;top:0;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,.1);}}
    .topbar-inner{{max-width:1100px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}}
    .brand{{display:flex;align-items:center;gap:.75rem;color:#fff;}}
    .brand img{{width:44px;height:44px;background:#fff;border-radius:8px;padding:4px;object-fit:contain;}}
    .brand-name{{font-weight:800;letter-spacing:.5px;}}
    .brand-tag{{font-size:.7rem;opacity:.9;display:block;}}
    .back-btn{{background:#fff;color:var(--green-deep);padding:.55rem 1.1rem;border-radius:50px;font-weight:700;font-size:.82rem;}}
    .breadcrumb{{max-width:1100px;margin:0 auto;padding:1.5rem 1.5rem 0;font-size:.85rem;}}
    .breadcrumb a{{color:var(--green-deep);font-weight:500;}}
    .breadcrumb span{{opacity:.5;margin:0 .5rem;}}
    .hero-local{{max-width:1100px;margin:0 auto;padding:2rem 1.5rem 3rem;}}
    .badge-local{{display:inline-block;padding:.35rem .9rem;background:rgba(51,204,0,.12);color:var(--green-deep);border-radius:50px;font-size:.72rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:1rem;}}
    h1{{color:var(--green-deep);font-size:2.4rem;font-weight:800;line-height:1.2;margin-bottom:1rem;}}
    h1 em{{color:var(--green);font-style:normal;}}
    .lead{{font-size:1.05rem;color:var(--muted);max-width:800px;margin-bottom:2rem;}}
    .stats-row{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.2rem;margin-bottom:2.5rem;}}
    .stat-card{{background:var(--off);padding:1.3rem;border-radius:12px;border-left:4px solid var(--green);}}
    .stat-num{{font-size:1.6rem;font-weight:800;color:var(--green-deep);line-height:1;}}
    .stat-lbl{{font-size:.8rem;color:var(--muted);margin-top:.3rem;}}
    .section{{background:var(--off);border-radius:14px;padding:2rem;margin-bottom:1.5rem;}}
    .section h2{{color:var(--green-deep);font-size:1.5rem;font-weight:700;margin-bottom:1rem;border-bottom:2px solid var(--green);padding-bottom:.5rem;display:inline-block;}}
    .section p{{margin-bottom:1rem;}}
    .section ul{{padding-left:1.3rem;}}
    .section li{{margin-bottom:.5rem;}}
    .cta-block{{background:linear-gradient(135deg,var(--green-deep),var(--green));color:#fff;padding:2.5rem 2rem;border-radius:16px;text-align:center;margin-bottom:2rem;}}
    .cta-block h2{{color:#fff !important;border:none !important;display:inline-block;font-size:1.5rem;margin-bottom:.8rem;}}
    .cta-block p{{opacity:.95;margin-bottom:1.5rem;}}
    .cta-btns{{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;}}
    .btn-w{{background:#fff;color:var(--green-deep);padding:.85rem 1.8rem;border-radius:50px;font-weight:700;font-size:.88rem;}}
    .btn-o{{background:transparent;color:#fff;border:2px solid #fff;padding:.85rem 1.8rem;border-radius:50px;font-weight:700;font-size:.88rem;}}
    footer{{background:var(--green-deep);color:#fff;padding:2rem 1.5rem;text-align:center;font-size:.85rem;}}
    footer a{{color:#a8e68a;}}
    /* WhatsApp */
    .whatsapp-float{{position:fixed;bottom:24px;right:24px;z-index:9999;width:64px;height:64px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(37,211,102,.45),0 2px 8px rgba(0,0,0,.15);animation:wappulse 2s infinite;}}
    .whatsapp-float:hover{{transform:scale(1.08);}}
    .whatsapp-float svg{{width:34px;height:34px;fill:#fff;}}
    @keyframes wappulse{{0%,100%{{box-shadow:0 8px 24px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.6);}}50%{{box-shadow:0 8px 24px rgba(37,211,102,.45),0 0 0 14px rgba(37,211,102,0);}}}}
    @media(max-width:700px){{.whatsapp-float{{width:56px;height:56px;bottom:18px;right:18px;}}.whatsapp-float svg{{width:28px;height:28px;}}h1{{font-size:1.8rem;}}}}
  </style>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Installation de bornes de recharge à {c['name']}",
    "provider": {{"@type":"LocalBusiness","name":"EGREENCITY'S","url":"https://egreencitys.com/","telephone":"+33651141118"}},
    "areaServed": {{"@type":"City","name":"{c['name']}","addressRegion":"Guyane","addressCountry":"GF"}},
    "description": "{desc}",
    "serviceType": "Installation de bornes IRVE"
  }}
  </script>
</head>
<body>

<header class="topbar">
  <div class="topbar-inner">
    <a href="/" class="brand">
      <img src="/logo.png" alt="Logo EGREENCITY'S">
      <div>
        <span class="brand-name">EGREENCITY'S</span>
        <span class="brand-tag">Bornes de recharge · Guyane</span>
      </div>
    </a>
    <a href="/" class="back-btn">← Retour au site</a>
  </div>
</header>

<div class="breadcrumb">
  <a href="/">Accueil</a>
  <span>/</span>
  <a href="/reseau.html">Réseau Guyane</a>
  <span>/</span>
  <span style="color:var(--muted);">Bornes {c['name']}</span>
</div>

<main class="hero-local">
  <div class="badge-local">Borne de recharge · {c['name']}</div>
  <h1>Installation de bornes de recharge<br><em>à {c['name']}</em></h1>
  <p class="lead">EGREENCITY'S équipe {c['name']}, {c['description']}, en bornes de recharge pour véhicules électriques. Particuliers, entreprises, collectivités : nous assurons fourniture, installation et maintenance 36 mois conformément au programme ADVENIR.</p>

  <div class="stats-row">
    <div class="stat-card"><div class="stat-num">{c['habitants']}</div><div class="stat-lbl">habitants</div></div>
    <div class="stat-card"><div class="stat-num">50 %</div><div class="stat-lbl">subvention ADVENIR max.</div></div>
    <div class="stat-card"><div class="stat-num">36 mois</div><div class="stat-lbl">maintenance garantie</div></div>
    <div class="stat-card"><div class="stat-num">48 h</div><div class="stat-lbl">délai de réponse devis</div></div>
  </div>

  <div class="section">
    <h2>Pourquoi choisir EGREENCITY'S à {c['name']} ?</h2>
    <p>Basée en Guyane française, à Macouria-Tonate, EGREENCITY'S est le spécialiste local de l'installation de bornes de recharge pour véhicules électriques. Nous intervenons sur l'ensemble des quartiers de {c['name']} :</p>
    <ul>
{''.join(f'      <li><strong>{q}</strong></li>' + chr(10) for q in c['quartiers'])}    </ul>
    <p style="margin-top:1rem;"><strong>Spécificité {c['name']} :</strong> {c['specif']}</p>
  </div>

  <div class="section">
    <h2>Nos clients types à {c['name']}</h2>
    <p>Nous accompagnons à {c['name']} principalement : {c['cibles']}.</p>
    <p>Qu'il s'agisse d'une <strong>WallBox particulière 7 kW</strong>, d'une <strong>e-City 22 kW entreprise</strong>, d'une <strong>borne voirie e-Twin 2×22 kW</strong> ou d'un <strong>Quickcharger DC 50 kW</strong>, nous dimensionnons chaque installation selon vos besoins réels (flotte, usage, puissance du tableau électrique).</p>
  </div>

  <div class="section">
    <h2>Programme ADVENIR à {c['name']}</h2>
    <p>Le programme <strong>ADVENIR 2024-2027</strong>, piloté par l'AVERE-France, couvre jusqu'à 50 % du coût des installations de bornes de recharge sur l'ensemble du territoire guyanais, y compris {c['name']}.</p>
    <ul>
      <li><strong>Copropriétés</strong> : 50 % plafonné à 960 € HT par point de charge</li>
      <li><strong>Flottes entreprises</strong> : 25 à 50 % selon usage (ouvert au public ou non)</li>
      <li><strong>Voirie publique</strong> : jusqu'à 9 000 € HT par point de charge</li>
      <li><strong>Hôtels, restaurants, commerces</strong> : 30 % plafonné à 1 500 € HT</li>
    </ul>
    <p>Nous montons l'intégralité de votre dossier ADVENIR.</p>
  </div>

  <div class="cta-block">
    <h2>Un projet de borne à {c['name']} ?</h2>
    <p>Devis gratuit sous 48 h · Visite technique incluse · Sans engagement</p>
    <div class="cta-btns">
      <a href="/#contact" class="btn-w">📧 Demander un devis</a>
      <a href="tel:0651141118" class="btn-o">📞 06 51 14 11 18</a>
    </div>
  </div>

  <p style="text-align:center;margin-top:2rem;">
    <a href="/reseau.html" style="color:var(--green-deep);font-weight:600;">← Voir le réseau complet en Guyane</a>
  </p>
</main>

<footer>
  <p>© 2026 EGREENCITY'S — SAS · RCS Cayenne 878 682 854 · 97355 Macouria-Tonate, Guyane française</p>
  <p style="margin-top:.5rem;"><a href="/">egreencitys.com</a> · <a href="mailto:egreencitys@gmail.com">egreencitys@gmail.com</a> · <a href="tel:0651141118">06 51 14 11 18</a></p>
  <p style="margin-top:.8rem;font-size:.75rem;opacity:.85;">
    <a href="/mentions-legales.html">Mentions légales</a> ·
    <a href="/mentions-legales.html#confidentialite">Confidentialité</a> ·
    <a href="/reseau.html">Réseau</a> ·
    <a href="/produits.html">Produits</a>
  </p>
</footer>

<!-- WhatsApp flottant -->
<a href="https://wa.me/33651141118?text=Bonjour%20EGREENCITY%27S%2C%20je%20souhaite%20un%20devis%20pour%20une%20borne%20a%20{c['name']}..." class="whatsapp-float" target="_blank" rel="noopener" aria-label="WhatsApp">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>

</body>
</html>
"""

for c in COMMUNES:
    page = build_commune_page(c)
    fn = f"borne-recharge-{c['slug']}.html"
    with open(os.path.join(ROOT, fn), 'w', encoding='utf-8') as f:
        f.write(page)
    print(f"Cree: {fn} ({len(page):,} car)")

print(f"\n{len(COMMUNES)} pages communes generees")
