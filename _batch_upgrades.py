"""
Script d'automatisation pour appliquer en lot les ameliorations a toutes les pages.
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = ['index.html', 'produits.html', 'reseau.html', 'investisseurs.html', 'mentions-legales.html']

# ==== CSS WhatsApp (a injecter dans les pages qui ne l'ont pas deja) ====
WHATSAPP_CSS = """
    /* Bouton WhatsApp flottant */
    .whatsapp-float{position:fixed;bottom:24px;right:24px;z-index:9999;width:64px;height:64px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(37,211,102,.45),0 2px 8px rgba(0,0,0,.15);text-decoration:none;transition:.25s;animation:wappulse 2s infinite;}
    .whatsapp-float:hover{transform:scale(1.08);box-shadow:0 12px 32px rgba(37,211,102,.55);}
    .whatsapp-float svg{width:34px;height:34px;fill:#fff;}
    .whatsapp-float::before{content:attr(data-tooltip);position:absolute;right:74px;top:50%;transform:translateY(-50%);background:#222;color:#fff;padding:.5rem .9rem;border-radius:8px;font-size:.82rem;font-weight:500;white-space:nowrap;opacity:0;pointer-events:none;transition:.2s;}
    .whatsapp-float:hover::before{opacity:1;}
    @keyframes wappulse{0%,100%{box-shadow:0 8px 24px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.6);}50%{box-shadow:0 8px 24px rgba(37,211,102,.45),0 0 0 14px rgba(37,211,102,0);}}
    @media(max-width:600px){.whatsapp-float{width:56px;height:56px;bottom:18px;right:18px;}.whatsapp-float svg{width:28px;height:28px;}.whatsapp-float::before{display:none;}}
"""

# ==== HTML WhatsApp (a injecter avant </body>) ====
WHATSAPP_HTML = """
<!-- WhatsApp flottant -->
<a href="https://wa.me/33651141118?text=Bonjour%20EGREENCITY%27S%2C%20je%20vous%20contacte%20depuis%20votre%20site%20web%20pour..." class="whatsapp-float" target="_blank" rel="noopener" aria-label="Contactez-nous sur WhatsApp" data-tooltip="Discutons sur WhatsApp">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>
"""

def add_whatsapp(html):
    # CSS : ajouter avant </style> si pas deja present
    if '.whatsapp-float' not in html:
        html = html.replace('</style>', WHATSAPP_CSS + '  </style>', 1)
    # HTML : ajouter avant </body> si pas deja present
    if 'whatsapp-float' not in html or 'href="https://wa.me' not in html:
        # Check body tag existance
        if 'class="whatsapp-float"' not in html:
            html = html.replace('</body>', WHATSAPP_HTML + '\n</body>', 1)
    return html

# ==== EXECUTION ====
for p in PAGES:
    fp = os.path.join(ROOT, p)
    if not os.path.exists(fp):
        print(f'SKIP (absent): {p}')
        continue
    with open(fp, 'r', encoding='utf-8') as f:
        orig = f.read()
    new = add_whatsapp(orig)
    if new != orig:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(new)
        print(f'OK: {p} (+{len(new)-len(orig)} car)')
    else:
        print(f'DEJA OK: {p}')

print('\n=== WhatsApp applique sur toutes les pages ===')
