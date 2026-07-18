"""
Genere les pages physiques de redirection a la racine du site pour les
URLs courtes (sans /pages/communes/).

Probleme identifie via Google Search Console :
  - Google a detecte des URLs comme https://egreencitys.com/borne-recharge-remire-montjoly.html
  - Ces URLs renvoient 404 (le fichier physique n'existe pas)
  - Le 404.html JS redirige mais Google ne suit pas le JS

Solution : creer des pages HTML physiques avec :
  - meta refresh -> redirection client immediate
  - <link rel="canonical"> -> indique la page canonique a Google
  - meta robots noindex -> empeche l'indexation de la page courte
  - Lien JS -> backup pour preserver query string et hash
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Mapping : URL courte -> URL canonique
REDIRECTS = {
    "borne-recharge-cayenne.html":             "/pages/communes/borne-recharge-cayenne.html",
    "borne-recharge-kourou.html":              "/pages/communes/borne-recharge-kourou.html",
    "borne-recharge-macouria.html":            "/pages/communes/borne-recharge-macouria.html",
    "borne-recharge-matoury.html":             "/pages/communes/borne-recharge-matoury.html",
    "borne-recharge-remire-montjoly.html":     "/pages/communes/borne-recharge-remire-montjoly.html",
    "borne-recharge-saint-laurent-du-maroni.html": "/pages/communes/borne-recharge-saint-laurent-du-maroni.html",
    "produits.html":                           "/pages/produits.html",
    "reseau.html":                             "/pages/reseau.html",
    "investisseurs.html":                      "/pages/investisseurs.html",
    "blog.html":                               "/pages/blog.html",
    "faq.html":                                "/pages/faq.html",
    "economies.html":                          "/pages/economies.html",
    "devis.html":                              "/pages/devis.html",
    "boutique-wallbox.html":                   "/pages/boutique-wallbox.html",
    "boutique.html":                           "/pages/boutique-wallbox.html",
    "wallbox.html":                            "/pages/boutique-wallbox.html",
}

TEMPLATE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>Redirection - EGREENCITY'S</title>
<link rel="canonical" href="https://egreencitys.com{target}">
<meta http-equiv="refresh" content="0;url={target}">
<style>
  body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
       background:#0E7A3F;color:#fff;display:flex;align-items:center;
       justify-content:center;min-height:100vh;margin:0;text-align:center;padding:2rem}}
  a{{color:#A7F3D0}}
</style>
</head>
<body>
<script>location.replace("{target}" + location.search + location.hash);</script>
<div>
  <h1>EGREENCITY'S</h1>
  <p>Redirection vers la page actuelle...</p>
  <p><a href="{target}">Cliquez ici si la redirection ne fonctionne pas</a></p>
</div>
</body>
</html>
"""

print(f"=== Generation de {len(REDIRECTS)} pages de redirection ===\n")

for short_url, target in REDIRECTS.items():
    out_path = ROOT / short_url
    out_path.write_text(TEMPLATE.format(target=target), encoding="utf-8")
    print(f"  [OK] /{short_url} -> {target}")

print(f"\n=== Termine : {len(REDIRECTS)} fichiers generes a la racine ===")
print("Ces fichiers servent les URLs courtes avec meta refresh + canonical.")
print("Google verra le canonical et indexera UNIQUEMENT la page canonique.")
