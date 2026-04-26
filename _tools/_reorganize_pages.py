"""Réorganise les HTML dans pages/ avec sous-dossiers + met à jour
   tous les liens internes, le sitemap, le service worker et le manifest.
   Crée un 404.html racine qui redirige les anciennes URL vers les nouvelles.
"""
import os, re, shutil, subprocess

ROOT = r"C:\projet\Egreencity"

# ===== Mapping ancien -> nouveau chemin (relatif à la racine du site) =====
# Clé = nom de fichier d'origine, valeur = chemin cible relatif
MAP = {
    # Pages principales -> pages/
    "produits.html":      "pages/produits.html",
    "reseau.html":        "pages/reseau.html",
    "investisseurs.html": "pages/investisseurs.html",
    "blog.html":          "pages/blog.html",
    "faq.html":           "pages/faq.html",
    "economies.html":     "pages/economies.html",
    # Légal -> pages/legal/
    "cgv.html":              "pages/legal/cgv.html",
    "mentions-legales.html": "pages/legal/mentions-legales.html",
    # Vidéo -> pages/video/
    "video-presentation.html":      "pages/video/video-presentation.html",
    "video-presentation-9x16.html": "pages/video/video-presentation-9x16.html",
    # Communes SEO -> pages/communes/
    "borne-recharge-cayenne.html":               "pages/communes/borne-recharge-cayenne.html",
    "borne-recharge-kourou.html":                "pages/communes/borne-recharge-kourou.html",
    "borne-recharge-macouria.html":              "pages/communes/borne-recharge-macouria.html",
    "borne-recharge-matoury.html":               "pages/communes/borne-recharge-matoury.html",
    "borne-recharge-remire-montjoly.html":       "pages/communes/borne-recharge-remire-montjoly.html",
    "borne-recharge-saint-laurent-du-maroni.html":"pages/communes/borne-recharge-saint-laurent-du-maroni.html",
}

def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, shell=isinstance(cmd, str), **kw)
    if r.returncode != 0:
        print(f"!! {cmd}\n  STDERR: {r.stderr.strip()}")
    return r

# ====== 1. Création des dossiers cibles ======
for new_path in MAP.values():
    full = os.path.join(ROOT, new_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)

# ====== 2. Déplacement git mv ======
moved = []
for old, new in MAP.items():
    src = os.path.join(ROOT, old)
    dst = os.path.join(ROOT, new)
    if not os.path.exists(src):
        print(f"  (skip — déjà déplacé) {old}")
        continue
    r = run(["git", "mv", old, new.replace("/", os.sep)])
    if r.returncode == 0:
        moved.append((old, new))
        print(f"  OK {old} -> {new}")

# ====== 3. Construction du remplacement de liens =====
# Tous les fichiers HTML du site (incluant blog/* et nouveaux emplacements)
def all_html_files():
    files = []
    for dirpath, dirnames, fnames in os.walk(ROOT):
        # Skip git, _tools, _archive, _dossiers, .claude, __pycache__, node_modules
        if any(seg in dirpath for seg in [".git", "_tools", "_archive", "_dossiers", ".claude", "__pycache__"]):
            continue
        for f in fnames:
            if f.endswith(".html"):
                files.append(os.path.join(dirpath, f))
    return files

# Pour chaque fichier HTML, on remplace les références
# Patterns à reconnaître :
#   href="produits.html"        href="/produits.html"
#   href="./produits.html"      action="produits.html"
# Le remplacement utilise des chemins ABSOLUS (commençant par /) pour éviter
# les bugs liés à la profondeur du fichier (pages/, pages/communes/, etc.)
def update_html(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in MAP.items():
        new_url = "/" + new
        # Patterns à matcher : "old", "/old", "./old"
        # On capture la valeur d'attribut entière (href="...", src="...", action="...", content="...url=...")
        for pattern in [
            (rf'(["\'(])(?:\.\/)?{re.escape(old)}(["\'?#)])', rf'\1{new_url}\2'),
            (rf'(["\'(])\/{re.escape(old)}(["\'?#)])', rf'\1{new_url}\2'),
        ]:
            content = re.sub(pattern[0], pattern[1], content)
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  OK liens mis à jour : {os.path.relpath(path, ROOT)}")

print("\n=== Mise à jour des liens internes (HTML) ===")
for hf in all_html_files():
    update_html(hf)

# ====== 4. Mise à jour de fichiers spéciaux ======
def update_text_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  OK {os.path.relpath(path, ROOT)}")

print("\n=== Sitemap, sw.js, manifest ===")
# Sitemap : remplacer URL absolues
sitemap_repl = []
for old, new in MAP.items():
    sitemap_repl.append((f"/{old}", f"/{new}"))
update_text_file(os.path.join(ROOT, "sitemap.xml"), sitemap_repl)

# Service Worker : remplacer entrées /old.html par /pages/...
sw_repl = []
for old, new in MAP.items():
    sw_repl.append((f"'/{old}'", f"'/{new}'"))
update_text_file(os.path.join(ROOT, "sw.js"), sw_repl)

# ====== 5. Création du 404.html racine ======
print("\n=== Création de 404.html (redirections SEO) ===")
mapping_js = ",\n    ".join(f"'/{old}': '/{new}'" for old, new in MAP.items())
fallback_404 = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Redirection — EGREENCITY'S</title>
<link rel="canonical" href="https://egreencitys.com/">
<style>
  body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
       background:#0E7A3F;color:#fff;display:flex;align-items:center;
       justify-content:center;min-height:100vh;margin:0;text-align:center;padding:2rem}}
  a{{color:#A7F3D0}}
</style>
<script>
(function(){{
  var map = {{
    {mapping_js}
  }};
  var p = location.pathname;
  if (map[p]) {{ location.replace(map[p] + location.search + location.hash); return; }}
}})();
</script>
<meta http-equiv="refresh" content="3;url=/">
</head>
<body>
  <div>
    <h1>EGREENCITY'S</h1>
    <p>Page non trouvée — redirection en cours…</p>
    <p><a href="/">Retour à l'accueil</a></p>
  </div>
</body>
</html>
'''
with open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8") as f:
    f.write(fallback_404)
print("  OK 404.html créé")

print("\n=== Terminé ===")
print(f"Déplacés : {len(moved)} fichiers")
