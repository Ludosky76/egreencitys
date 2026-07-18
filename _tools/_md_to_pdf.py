"""
EGREENCITY'S — Conversion Markdown -> PDF
==========================================

Convertit tous les .md d'un dossier (ou un fichier specifique) en PDF
avec mise en forme professionnelle EGREENCITY'S (charte verte).

USAGE
-----
    python _tools/_md_to_pdf.py                          # tous les .md du dossier ADVENIR
    python _tools/_md_to_pdf.py _dossiers/ADVENIR        # un dossier specifique
    python _tools/_md_to_pdf.py path/to/file.md          # un fichier
    python _tools/_md_to_pdf.py --all                    # tous les .md du projet

DEPENDANCES
-----------
    pip install markdown xhtml2pdf
"""
from __future__ import annotations
import sys
import base64
import argparse
from pathlib import Path
from datetime import date

import markdown
from xhtml2pdf import pisa

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET = ROOT / "_dossiers" / "ADVENIR"
LOGO_PATH = ROOT / "logo.png"


def logo_data_uri() -> str:
    """Encode le logo en base64 pour embed direct dans le HTML.
    xhtml2pdf gere mal les file:// URIs sur Windows ; le base64 contourne ce
    probleme de maniere universelle."""
    if not LOGO_PATH.exists():
        return ""
    data = LOGO_PATH.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    ext = LOGO_PATH.suffix.lower().lstrip(".")
    mime = "image/png" if ext == "png" else f"image/{ext}"
    return f"data:{mime};base64,{b64}"

# ============================================================
#  CSS — charte EGREENCITY'S
# ============================================================
CSS = """
@page {
    size: A4;
    margin: 2.2cm 2cm 2.4cm 2cm;
    @frame footer {
        -pdf-frame-content: footerContent;
        bottom: 1cm;
        margin-left: 2cm;
        margin-right: 2cm;
        height: 1cm;
    }
}

body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    color: #1a3a00;
    line-height: 1.55;
}

/* Titres */
h1 {
    color: #0a4800;
    font-size: 20pt;
    font-weight: bold;
    margin: 6px 0 14px 0;
    padding: 10px 14px;
    background-color: #f4fff0;
    border-left: 6px solid #33CC00;
    border-bottom: 2px solid #0a4800;
}
h2 {
    color: #0a4800;
    font-size: 14pt;
    font-weight: bold;
    margin: 20px 0 8px 0;
    padding: 0 0 4px 8px;
    border-left: 4px solid #33CC00;
    border-bottom: 1px solid #c8e6c9;
}
h3 {
    color: #0a4800;
    font-size: 12pt;
    font-weight: bold;
    margin: 14px 0 6px 0;
    padding-left: 8px;
    border-left: 3px solid #33CC00;
}
h4 {
    color: #2B4DB5;
    font-size: 11pt;
    font-weight: bold;
    margin: 10px 0 4px 0;
}

/* Paragraphes & listes */
p {
    margin: 0 0 8px 0;
    text-align: justify;
}
ul, ol {
    margin: 4px 0 10px 0;
    padding-left: 22px;
}
li {
    margin-bottom: 3px;
}
strong {
    color: #0a4800;
}
em {
    color: #2B4DB5;
}

/* Tableaux */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 9.5pt;
}
table th {
    background-color: #0a4800;
    color: #ffffff;
    padding: 6px 8px;
    text-align: left;
    font-weight: bold;
    border: 1px solid #0a4800;
}
table td {
    padding: 5px 8px;
    border: 1px solid #cccccc;
    vertical-align: top;
}
table tr:nth-child(even) td {
    background-color: #f4fff0;
}

/* Listes de définition (clé/valeur) — alternative aux tables 2-cols */
dl.kvlist {
    margin: 10px 0 14px 0;
    border: 1px solid #d8e6cc;
    border-radius: 4px;
    padding: 0;
    background-color: #ffffff;
}
dl.kvlist > div.kvrow {
    border-bottom: 1px solid #eef3e9;
    padding: 5px 12px;
}
dl.kvlist > div.kvrow:last-child { border-bottom: none; }
dl.kvlist > div.kvrow:nth-child(even) { background-color: #fafffa; }
dl.kvlist dt {
    font-weight: bold;
    color: #0a4800;
    font-size: 9pt;
    margin: 0 0 2px 0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
dl.kvlist dd {
    margin: 0 0 0 0;
    font-size: 10pt;
    color: #1a3a00;
    padding-left: 4px;
}

/* Champ a remplir (remplace les longues series d'underscores) */
.fillin {
    display: inline-block;
    border-bottom: 1px dotted #9aa3aa;
    min-width: 220px;
    height: 11pt;
    vertical-align: bottom;
    margin: 0 2px 0 0;
}
.fillin-short {
    display: inline-block;
    border-bottom: 1px dotted #9aa3aa;
    min-width: 90px;
    height: 11pt;
    vertical-align: bottom;
    margin: 0 2px 0 0;
}

/* Code & quotes */
code {
    background-color: #f0f4ec;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: Courier, monospace;
    font-size: 9.5pt;
    color: #0a4800;
}
pre {
    background-color: #f4fff0;
    border-left: 4px solid #33CC00;
    padding: 10px 14px;
    margin: 10px 0;
    font-family: Courier, monospace;
    font-size: 9pt;
    color: #1a3a00;
}
blockquote {
    border-left: 4px solid #2B4DB5;
    padding: 6px 12px;
    margin: 10px 0;
    background-color: #f0f3fb;
    color: #1a3a00;
    font-style: italic;
}

/* Liens */
a { color: #0a4800; text-decoration: underline; }

/* Lignes horizontales */
hr {
    border: none;
    border-top: 1px solid #33CC00;
    margin: 18px 0;
}

/* En-tete */
.header {
    border-bottom: 3px solid #33CC00;
    padding-bottom: 8px;
    margin-bottom: 18px;
}
.header table { border: none; margin: 0; width: 100%; }
.header table td { border: none; padding: 0; vertical-align: middle; }
.header img {
    height: 55px;
}
.tag {
    font-size: 8pt;
    color: #2B4DB5;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: right;
}

/* Pied de page */
.footer-text {
    font-size: 8pt;
    color: #888888;
    text-align: center;
    border-top: 1px solid #cccccc;
    padding-top: 4px;
}
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{css}</style>
</head>
<body>

<div class="header">
    <table><tr>
        <td style="width:55%"><img src="{logo_path}" alt="EGREENCITY'S" /></td>
        <td style="width:45%" class="tag">Borne de recharge electrique<br/>Guyane francaise</td>
    </tr></table>
</div>

{content}

<div id="footerContent">
    <div class="footer-text">
        EGREENCITY'S SAS &middot; RCS Cayenne 878 682 854 &middot; egreencitys@gmail.com &middot; +33 6 51 14 11 18 &middot; Page <pdf:pagenumber/>/<pdf:pagecount/>
    </div>
</div>

</body>
</html>
"""


# ============================================================
#  Pretraitement Markdown — caracteres incompatibles xhtml2pdf
# ============================================================
# xhtml2pdf utilise les fonts Helvetica/Times qui n'incluent pas les emojis
# Unicode. On les remplace par des equivalents ASCII lisibles.
CHAR_REPLACE = [
    # Cases a cocher
    ("☐", "[ ]"),
    ("☑", "[X]"),
    ("☒", "[X]"),
    # Validation / status
    ("✅", "[OK]"),
    ("❌", "[KO]"),
    ("✔", "[OK]"),
    ("✗", "[KO]"),
    ("✓", "v"),
    # Pastilles couleur
    ("🟢", "[+]"),
    ("🟡", "[~]"),
    ("🔴", "[!]"),
    ("⚪", "[ ]"),
    ("⚫", "[#]"),
    # Fleches
    ("→", "->"),
    ("←", "<-"),
    ("↔", "<->"),
    ("⇒", "=>"),
    ("➡", "->"),
    # Symboles techniques
    ("≥", ">="),
    ("≤", "<="),
    ("≠", "!="),
    ("≈", "~"),
    # Symboles divers
    ("⚡", "[E]"),
    ("🔌", "[P]"),
    ("📍", "[L]"),
    ("📞", "[T]"),
    ("📧", "[@]"),
    ("✉", "[@]"),
    ("📋", ""),
    ("📁", ""),
    ("📊", ""),
    ("📅", ""),
    ("💰", ""),
    ("💡", ""),
    ("🔍", ""),
    ("🎯", ""),
    ("🌐", "Web :"),
    ("✉️", "Email :"),
    ("✉", "Email :"),
    ("🇫🇷", "FR"),
    ("🇬🇫", "GF"),
    # Indices (subscripts) Unicode -> chiffres normaux (CO2 etc.)
    ("₀", "0"), ("₁", "1"), ("₂", "2"), ("₃", "3"), ("₄", "4"),
    ("₅", "5"), ("₆", "6"), ("₇", "7"), ("₈", "8"), ("₉", "9"),
    # Exposants (superscripts) Unicode -> chiffres normaux (m2, m3, etc.)
    ("⁰", "0"), ("¹", "1"), ("²", "2"), ("³", "3"), ("⁴", "4"),
    ("⁵", "5"), ("⁶", "6"), ("⁷", "7"), ("⁸", "8"), ("⁹", "9"),
    # Lettres en exposant (rangs ordinaux : 1er, 2e, 3e, etc.)
    ("ᵉ", "e"),  # MODIFIER LETTER SMALL E
    ("ʳ", "r"),  # MODIFIER LETTER SMALL R
    ("ⁿ", "n"),  # SUPERSCRIPT LATIN SMALL LETTER N
    ("ᵃ", "a"),  # MODIFIER LETTER SMALL A
    ("ᵒ", "o"),  # MODIFIER LETTER SMALL O
    # Espaces fines / non-secables
    (" ", " "),  # NARROW NO-BREAK SPACE
    (" ", " "),  # NON-BREAKING SPACE
]


import re as _re


def _convert_kv_table_to_dl(md_block: str) -> str:
    """Convertit une table markdown 2-colonnes en liste de définition HTML brute.
    xhtml2pdf rend tres mal les tables 2-cols avec contenu long :
    chaque mot va sur sa propre ligne. Les listes <dl> contournent ce bug.
    """
    lines = [l.rstrip() for l in md_block.strip().split("\n") if l.strip()]
    if len(lines) < 2:
        return md_block

    # Parser chaque ligne | a | b |
    rows = []
    for ln in lines:
        if not ln.startswith("|"):
            continue
        # Skip ligne separateur ---|---
        if _re.match(r"^\|\s*[-:]+\s*\|", ln):
            continue
        # Decoupage des cellules
        cells = [c.strip() for c in ln.split("|")[1:-1]]
        if len(cells) >= 2:
            rows.append(cells)

    if not rows:
        return md_block

    # Cas 1 : header vide "| |" suivi de --- → tous les rows sont des kv
    # Cas 2 : header explicite "| Champ | Valeur |" → 1er row = header (skip)
    has_header = False
    if len(rows) > 1 and rows[0] != ["", ""]:
        # Verifier si le premier row ressemble a un header (mots courts, ex: "Champ" / "Valeur")
        first = rows[0]
        if len(first[0]) <= 20 and len(first[1]) <= 20 and not first[0].startswith("**"):
            has_header = True

    data_rows = rows[1:] if has_header else rows
    # Filtrer les rows vides
    data_rows = [r for r in data_rows if r[0] or r[1]]
    if not data_rows:
        return md_block

    # Construire le HTML <dl class="kvlist">
    parts = ['<dl class="kvlist">']
    for r in data_rows:
        # Convertir markdown bold/italic minimal dans la cle/valeur
        key = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", r[0])
        key = _re.sub(r"\*(.+?)\*", r"<em>\1</em>", key)
        val = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", r[1])
        val = _re.sub(r"\*(.+?)\*", r"<em>\1</em>", val)
        parts.append(f'<div class="kvrow"><dt>{key}</dt><dd>{val}</dd></div>')
    parts.append("</dl>")
    return "\n".join(parts)


def preprocess_md(text: str) -> str:
    """Nettoie le markdown :
    1. Remplace les caracteres non rendus par xhtml2pdf
    2. Convertit les tables 2-colonnes (cle/valeur) en <dl> HTML pour eviter
       le bug d'affichage xhtml2pdf qui empile les caracteres verticalement
    3. Remplace les longues sequences d'underscores par un pointille propre
    4. Remplit les cellules de tableau vides ("| |" ou "||") avec un tiret
       pour eviter le bug reportlab tables.py:440 (None heights)
    """
    for src, dst in CHAR_REPLACE:
        text = text.replace(src, dst)

    # Cellules vides dans les tables -> tiret pour eviter le bug reportlab
    # On boucle car une ligne peut avoir plusieurs cellules vides consecutives
    for _ in range(5):
        new_text = _re.sub(r"(\|)(\s{0,4})(\|)", r"\1 — \3", text)
        if new_text == text:
            break
        text = new_text

    # Remplacer les sequences d'underscores par des pointilles textuels
    # (les <span> dans des cellules de tableau cassent le rendu reportlab)
    text = _re.sub(r"_{12,}", "." * 30, text)
    text = _re.sub(r"_{5,11}", "." * 12, text)

    # Detecter et convertir les tables 2-colonnes
    # Pattern : bloc commencant par | ... | et separateur |---|---|
    table_pattern = _re.compile(
        r"(?:^\|[^\n]*\|\s*\n)+",  # plusieurs lignes commencant et finissant par |
        flags=_re.M,
    )

    def maybe_convert(match):
        block = match.group(0)
        # Verifier que c'est bien une table avec ligne separateur ---|---
        if not _re.search(r"\|\s*-{3,}\s*\|", block):
            return block
        # Compter les colonnes (premier ligne, avant separateur)
        first_line = block.strip().split("\n")[0]
        n_cols = first_line.count("|") - 1
        if n_cols == 2:
            return _convert_kv_table_to_dl(block) + "\n"
        # Tables 3+ colonnes : laisser tel quel
        return block

    text = table_pattern.sub(maybe_convert, text)
    return text


def postprocess_html(html: str) -> str:
    """Pas de postprocess special — le preprocess gere les tables 2-cols."""
    return html


def md_file_to_pdf(md_path: Path, out_path: Path | None = None) -> Path:
    """Convertit un .md en .pdf. Retourne le chemin du PDF cree."""
    if not md_path.exists():
        raise FileNotFoundError(md_path)

    md_text = md_path.read_text(encoding="utf-8")
    md_text = preprocess_md(md_text)

    # Conversion markdown -> HTML
    html_body = markdown.markdown(
        md_text,
        extensions=[
            "tables",
            "fenced_code",
            "attr_list",
            "sane_lists",
            "nl2br",
        ],
        output_format="html5",
    )
    html_body = postprocess_html(html_body)

    # Titre du document = premier H1 du .md ou nom du fichier
    title = md_path.stem
    for line in md_text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break

    full_html = HTML_TEMPLATE.format(
        title=title,
        css=CSS,
        content=html_body,
        logo_path=logo_data_uri(),
    )

    if out_path is None:
        out_path = md_path.with_suffix(".pdf")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("wb") as f:
        result = pisa.CreatePDF(full_html, dest=f, encoding="utf-8")

    if result.err:
        raise RuntimeError(f"Erreurs xhtml2pdf : {result.err} sur {md_path.name}")

    return out_path


def collect_md_files(target: Path) -> list[Path]:
    """Liste les .md a convertir."""
    if target.is_file() and target.suffix.lower() == ".md":
        return [target]
    if target.is_dir():
        return sorted(target.rglob("*.md"))
    return []


def main() -> int:
    ap = argparse.ArgumentParser(description="Convertit des .md en .pdf (charte EGREENCITY'S).")
    ap.add_argument("target", nargs="?", default=str(DEFAULT_TARGET),
                    help="Fichier .md ou dossier (defaut : _dossiers/ADVENIR)")
    ap.add_argument("--all", action="store_true",
                    help="Convertir tous les .md du projet")
    ap.add_argument("-o", "--out", help="Repertoire de sortie (defaut : meme dossier que .md)")
    args = ap.parse_args()

    if args.all:
        md_files = sorted(ROOT.rglob("*.md"))
        # Exclure dossiers techniques
        skip = {".git", "_archive", "__pycache__", "node_modules"}
        md_files = [p for p in md_files if not any(s in p.parts for s in skip)]
    else:
        target = Path(args.target)
        if not target.is_absolute():
            target = ROOT / target
        md_files = collect_md_files(target)

    if not md_files:
        print(f"[ERREUR] Aucun .md trouve.")
        return 1

    out_dir = Path(args.out) if args.out else None
    if out_dir and not out_dir.is_absolute():
        out_dir = ROOT / out_dir

    print(f"=== Conversion {len(md_files)} fichier(s) ===\n")
    ok = errors = 0
    for md in md_files:
        try:
            target_pdf = (out_dir / (md.stem + ".pdf")) if out_dir else md.with_suffix(".pdf")
            md_file_to_pdf(md, target_pdf)
            size_kb = target_pdf.stat().st_size / 1024
            rel = target_pdf.relative_to(ROOT)
            print(f"  [OK]  {rel}  ({size_kb:.0f} KB)")
            ok += 1
        except Exception as e:
            print(f"  [ERR] {md.name}: {e}")
            errors += 1

    print(f"\n=== Termine : {ok} OK, {errors} erreur(s) ===")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
