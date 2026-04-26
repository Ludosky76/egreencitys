"""
Script one-shot : extrait les sections Produits / Reseau / Investisseurs
d'index.html vers des pages dediees, met a jour index.html et le sitemap.
"""
import re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'index.html')

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

# ==== 1) EXTRACTION DES BLOCS COMMUNS ====
# Head complet (1-405) avec <style>
m_head_end = html.find('</head>') + len('</head>')
head_full = html[:m_head_end]

# Body open (ligne 406)
body_open = '\n<body>\n'

# Navigation
m_nav = re.search(r'<!-- ═+ NAVIGATION ═+ -->\s*<nav id="nav">.*?</nav>', html, re.DOTALL)
nav_block = m_nav.group(0)

# Footer + toast + script
m_footer = re.search(r'<!-- ═+ FOOTER ═+ -->.*?</html>', html, re.DOTALL)
footer_and_tail = m_footer.group(0)

# ==== 2) EXTRACTION DES SECTIONS ====
def extract_section(section_id):
    pattern = rf'<!-- ═+ [^-]* ═+ -->\s*<section[^>]+id="{section_id}"[^>]*>.*?</section>'
    m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
    if not m:
        # fallback sans commentaire
        pattern2 = rf'<section[^>]+id="{section_id}"[^>]*>.*?</section>'
        m = re.search(pattern2, html, re.DOTALL)
    return m.group(0) if m else None

produits_html = extract_section('produits')
reseau_html = extract_section('reseau')
invest_html = extract_section('investisseurs')

print(f'Produits extrait : {len(produits_html) if produits_html else 0} car')
print(f'Reseau extrait   : {len(reseau_html) if reseau_html else 0} car')
print(f'Invest extrait   : {len(invest_html) if invest_html else 0} car')

# ==== 3) NAV ADAPTEE AUX SOUS-PAGES ====
# Les ancres locales (#mission, #economie, #contact) deviennent /#mission etc.
# Les pages dediees sont des URLs absolues
nav_subpage = """<!-- Navigation -->
<nav id="nav">
  <a href="/" class="nav-logo">
    <img src="/logo.png" alt="EGREENCITY'S" style="height:44px;width:auto;object-fit:contain;">
  </a>
  <ul class="nav-links">
    <li><a href="/#mission">Mission</a></li>
    <li><a href="/produits.html">Produits</a></li>
    <li><a href="/#economie">Économies</a></li>
    <li><a href="/reseau.html">Réseau</a></li>
    <li><a href="/investisseurs.html">Investisseurs</a></li>
    <li><a href="/#contact" class="btn-nav">Nous contacter</a></li>
  </ul>
</nav>
"""

# ==== 4) FOOTER ADAPTE AUX SOUS-PAGES ====
# Links pointent vers les nouvelles pages
footer_subpage = """<!-- Footer -->
<footer>
  <div class="foot-inner">
    <div class="foot-top">
      <div class="fbrand">
        <div class="logo-name">EGREENCITY'S</div>
        <span class="logo-tag">Borne De Recharge Électrique · Guyane</span>
        <p>Projet de réseau de bornes de recharge en Guyane. Fourniture, installation et maintenance pour particuliers, entreprises et collectivités. Dossier ADVENIR en préparation.</p>
      </div>
      <div class="fcol">
        <h4>Navigation</h4>
        <ul>
          <li><a href="/#mission">Notre Mission</a></li>
          <li><a href="/produits.html">Produits</a></li>
          <li><a href="/#economie">Économies</a></li>
          <li><a href="/reseau.html">Le Réseau</a></li>
          <li><a href="/investisseurs.html">Investisseurs</a></li>
        </ul>
      </div>
      <div class="fcol">
        <h4>Produits</h4>
        <ul>
          <li><a href="/produits.html">WallBox Particuliers</a></li>
          <li><a href="/produits.html">City Borne Entreprises</a></li>
          <li><a href="/produits.html">Borne Voirie Publique</a></li>
          <li><a href="/produits.html">Quickcharger 50 kW</a></li>
          <li><a href="/produits.html">Maintenance ADVENIR</a></li>
        </ul>
      </div>
      <div class="fcol">
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:egreencitys@gmail.com">egreencitys@gmail.com</a></li>
          <li><a href="tel:0651141118">06 51 14 11 18</a></li>
          <li><a href="/investisseurs.html">Investisseurs</a></li>
          <li><a href="/#contact">Nous écrire</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 EGREENCITY'S — Tous droits réservés</span>
      <span class="foot-rcs">SAS · RCS Cayenne 878 682 854 · Capital 250 € · 97355 Macouria-Tonate, Guyane</span>
      <span class="foot-legal" style="display:flex;gap:1rem;flex-wrap:wrap;">
        <a href="/mentions-legales.html" style="color:inherit;opacity:.85;">Mentions légales</a>
        <a href="/mentions-legales.html#confidentialite" style="color:inherit;opacity:.85;">Politique de confidentialité</a>
        <a href="/mentions-legales.html#cookies" style="color:inherit;opacity:.85;">Cookies</a>
      </span>
    </div>
  </div>
</footer>

<script>
  // Navbar scroll shadow
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 60), {passive:true});

  // Product tabs (pour page produits uniquement)
  function switchTab(id, btn) {
    document.querySelectorAll('.tcontent').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
    const target = document.getElementById('t-' + id);
    if (target) target.classList.add('on');
    btn.classList.add('on');
  }

  // Scroll reveal
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, {threshold: 0.1});
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
</script>

</body>
</html>
"""

# ==== 5) FONCTION DE GENERATION DE PAGE ====
def build_page(title, description, canonical, section_html, extra_meta=''):
    # Recuperer le <head> complet puis remplacer title, description, canonical, og
    page_head = head_full
    # Remplacer title
    page_head = re.sub(r'<title>.*?</title>',
                       f'<title>{title}</title>', page_head, count=1)
    # Remplacer description
    page_head = re.sub(r'(<meta name="description" content=")[^"]*(">)',
                       rf'\g<1>{description}\g<2>', page_head, count=1)
    # Remplacer canonical
    page_head = re.sub(r'(<link rel="canonical" href=")[^"]*(">)',
                       rf'\g<1>{canonical}\g<2>', page_head, count=1)
    # Remplacer og:title
    page_head = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
                       rf'\g<1>{title}\g<2>', page_head, count=1)
    # Remplacer og:description
    page_head = re.sub(r'(<meta property="og:description" content=")[^"]*(">)',
                       rf'\g<1>{description}\g<2>', page_head, count=1)
    # Remplacer og:url
    page_head = re.sub(r'(<meta property="og:url" content=")[^"]*(">)',
                       rf'\g<1>{canonical}\g<2>', page_head, count=1)
    # Remplacer twitter:title/description
    page_head = re.sub(r'(<meta name="twitter:title" content=")[^"]*(">)',
                       rf'\g<1>{title}\g<2>', page_head, count=1)
    page_head = re.sub(r'(<meta name="twitter:description" content=")[^"]*(">)',
                       rf'\g<1>{description}\g<2>', page_head, count=1)

    # Bloc "Retour" + fil d'Ariane
    bread = f'''
<!-- Fil d'Ariane -->
<div style="max-width:1200px;margin:0 auto;padding:6rem 2rem 1rem;font-size:.85rem;">
  <a href="/" style="color:var(--green-deep);text-decoration:none;font-weight:500;">← Accueil</a>
  <span style="opacity:.5;margin:0 .5rem;">/</span>
  <span style="color:var(--text-soft);">{title.split('—')[0].strip() if '—' in title else title}</span>
</div>
'''

    # CTA "Retour accueil" en bas de page
    cta_back = '''
<div style="background:var(--gray-bg);padding:3rem 2rem;text-align:center;">
  <h3 style="color:var(--green-deep);margin-bottom:1rem;">Une question ? Un projet ?</h3>
  <p style="margin-bottom:1.5rem;color:var(--text-soft);">Notre équipe répond sous 48 h aux particuliers, entreprises et collectivités de Guyane.</p>
  <a href="/#contact" style="display:inline-block;background:linear-gradient(135deg,var(--green-deep),var(--green));color:#fff;padding:.9rem 2rem;border-radius:50px;font-weight:700;text-decoration:none;">Nous contacter →</a>
</div>
'''

    return page_head + body_open + nav_subpage + bread + section_html + cta_back + footer_subpage

# ==== 6) GENERER LES 3 PAGES ====
produits_page = build_page(
    title="Produits — Bornes de recharge E-TOTEM en Guyane | EGREENCITY'S",
    description="Gamme complète de bornes de recharge E-TOTEM en Guyane : WallBox particuliers, City Borne entreprises, bornes voirie publique, Quickcharger 50 kW et maintenance ADVENIR.",
    canonical="https://egreencitys.com/produits.html",
    section_html=produits_html,
)

reseau_page = build_page(
    title="Le Réseau — Maillage de bornes en Guyane | EGREENCITY'S",
    description="Découvrez le projet de réseau de bornes de recharge inter-communal en Guyane française : 20 points de charge en Phase 1, du littoral à l'Oyapock.",
    canonical="https://egreencitys.com/reseau.html",
    section_html=reseau_html,
)

invest_page = build_page(
    title="Investisseurs — Rejoindre le projet EGREENCITY'S en Guyane",
    description="Investir dans le développement du réseau de bornes de recharge électrique en Guyane. Plan d'investissement, rentabilité et partenariat ADVENIR.",
    canonical="https://egreencitys.com/investisseurs.html",
    section_html=invest_html,
)

# ==== 7) ECRIRE LES FICHIERS ====
with open(os.path.join(ROOT, 'produits.html'), 'w', encoding='utf-8') as f:
    f.write(produits_page)
with open(os.path.join(ROOT, 'reseau.html'), 'w', encoding='utf-8') as f:
    f.write(reseau_page)
with open(os.path.join(ROOT, 'investisseurs.html'), 'w', encoding='utf-8') as f:
    f.write(invest_page)

print('\n=== Fichiers crees ===')
for fn in ('produits.html', 'reseau.html', 'investisseurs.html'):
    size = os.path.getsize(os.path.join(ROOT, fn))
    print(f'  {fn}: {size:,} octets')

# ==== 8) MODIFIER INDEX.HTML ====
# Retirer les 3 sections
new_html = html
for sec_name, sec_html in [('produits', produits_html), ('reseau', reseau_html), ('investisseurs', invest_html)]:
    if sec_html:
        # Retirer le commentaire juste avant la section + la section
        pattern = rf'\s*<!-- ═+ [^-]*? ═+ -->\s*{re.escape(sec_html)}'
        m = re.search(pattern, new_html, re.DOTALL)
        if m:
            new_html = new_html.replace(m.group(0), '')
            print(f'  Retire {sec_name} avec commentaire ({len(m.group(0))} car)')
        else:
            new_html = new_html.replace(sec_html, '')
            print(f'  Retire {sec_name} sans commentaire ({len(sec_html)} car)')

# Mettre a jour les liens de navigation dans index.html
# #produits -> /produits.html, #reseau -> /reseau.html, #investisseurs -> /investisseurs.html
# MAIS seulement dans les liens, pas dans les id de sections (qui sont supprimees)
replacements = [
    ('href="#produits"', 'href="/produits.html"'),
    ('href="#reseau"', 'href="/reseau.html"'),
    ('href="#investisseurs"', 'href="/investisseurs.html"'),
]
for old, new in replacements:
    count = new_html.count(old)
    new_html = new_html.replace(old, new)
    print(f'  Remplace {old} -> {new} : {count} occurrences')

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f'\nindex.html : {len(html):,} -> {len(new_html):,} octets ({len(html)-len(new_html):,} de moins)')

# ==== 9) METTRE A JOUR sitemap.xml ====
sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://egreencitys.com/</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/produits.html</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/reseau.html</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/investisseurs.html</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/#mission</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/#economie</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/#contact</loc>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://egreencitys.com/mentions-legales.html</loc>
    <lastmod>2026-04-22</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
"""

with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write(sitemap)
print('\nsitemap.xml mis a jour avec 8 URLs')

print('\n=== TERMINE ===')
