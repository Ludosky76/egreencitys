"""
Ajoute les domaines Firebase aux directives CSP des pages qui ont a la fois :
  - une meta Content-Security-Policy
  - les scripts Firebase injectes (voir _inject_session.py)
Idempotent : ne rajoute pas un token deja present.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Pages avec CSP ET scripts Firebase injectes
FILES = [
    "index.html",
    "pages/produits.html", "pages/reseau.html", "pages/investisseurs.html",
    "pages/economies.html", "pages/faq.html", "pages/blog.html", "pages/devis.html",
    "pages/legal/cgv.html", "pages/legal/mentions-legales.html",
]

# Tokens a garantir par directive
ADD = {
    "script-src":  ["https://www.gstatic.com"],
    "connect-src": [
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com",
        "https://egreencitys.firebaseapp.com",
    ],
    "frame-src":   ["https://egreencitys.firebaseapp.com"],
}


def patch_csp(csp: str) -> str:
    # Decoupe en directives {nom: [sources...]}
    parts = [d.strip() for d in csp.split(";") if d.strip()]
    directives = []  # liste de (nom, [tokens])
    for d in parts:
        toks = d.split()
        directives.append([toks[0], toks[1:]])

    names = [d[0] for d in directives]

    for name, additions in ADD.items():
        if name in names:
            entry = directives[names.index(name)]
            for tok in additions:
                if tok not in entry[1]:
                    entry[1].append(tok)
        else:
            # frame-src absent -> on l'insere juste avant frame-ancestors si possible
            new_entry = [name, list(additions)]
            if "frame-ancestors" in names:
                directives.insert(names.index("frame-ancestors"), new_entry)
            else:
                directives.append(new_entry)
            names = [d[0] for d in directives]

    return "; ".join(n + " " + " ".join(t) for n, t in directives) + ";"


def main():
    n = 0
    for rel in FILES:
        p = ROOT / rel
        if not p.exists():
            print(f"  [SKIP] {rel} (absent)")
            continue
        html = p.read_text(encoding="utf-8")
        m = re.search(
            r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(">)',
            html,
        )
        if not m:
            print(f"  [SKIP] {rel} (pas de CSP)")
            continue
        new_csp = patch_csp(m.group(2))
        if new_csp == m.group(2).rstrip():
            print(f"  [==]  {rel} (deja OK)")
            continue
        html = html[:m.start()] + m.group(1) + new_csp + m.group(3) + html[m.end():]
        p.write_text(html, encoding="utf-8")
        print(f"  [OK]  {rel}")
        n += 1
    print(f"\n=== CSP Firebase : {n} mise(s) a jour ===")


if __name__ == "__main__":
    main()
