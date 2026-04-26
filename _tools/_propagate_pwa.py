"""Inject PWA manifest link + SW registration into all HTML pages."""
import os, re, glob

ROOT = os.path.dirname(os.path.abspath(__file__))

MANIFEST_LINE = '  <link rel="manifest" href="/manifest.webmanifest">\n  <meta name="theme-color" content="#0a4800">'
SW_SCRIPT = """
<!-- PWA Service Worker -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW failed',e);});
    });
  }
</script>
"""

TARGETS = [p for p in glob.glob(os.path.join(ROOT, '*.html'))]
# Also blog article
TARGETS += glob.glob(os.path.join(ROOT, 'blog', '*.html'))

for fp in TARGETS:
    name = os.path.relpath(fp, ROOT)
    with open(fp, 'r', encoding='utf-8') as f:
        html = f.read()
    orig = html
    # 1. Add manifest link after favicon icon (if not already)
    if 'rel="manifest"' not in html:
        # Look for favicon pattern
        m = re.search(r'(<link rel="icon"[^>]*>)', html)
        if m:
            html = html.replace(m.group(1), m.group(1) + '\n' + MANIFEST_LINE, 1)
    # 2. Add SW registration before </body> if not present
    if '/sw.js' not in html:
        if '</body>' in html:
            html = html.replace('</body>', SW_SCRIPT + '\n</body>', 1)
    if html != orig:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'OK: {name} (+{len(html)-len(orig)})')
    else:
        print(f'DEJA: {name}')
print('\nPropagation PWA terminee.')
