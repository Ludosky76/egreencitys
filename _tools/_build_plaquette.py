"""Génération de la plaquette EGREENCITY'S — version 2026."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, Image, PageBreak, KeepTogether, NextPageTemplate
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ===== Brand =====
GREEN_DARK   = HexColor("#0E7A3F")
GREEN        = HexColor("#16A34A")
GREEN_LIGHT  = HexColor("#22C55E")
GREEN_BG     = HexColor("#ECFDF5")
GREEN_BORDER = HexColor("#86EFAC")
DARK         = HexColor("#0A1F1A")
GREY_TXT     = HexColor("#3F4A45")
GREY_LIGHT   = HexColor("#E5E7EB")
GOLD         = HexColor("#D4AF37")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

OUT = r"C:\projet\Egreencity\plaquette-egreencitys-2026.pdf"
LOGO = r"C:\projet\Egreencity\logo.png"

# ============== Styles ==============
styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=26, leading=30,
    textColor=GREEN_DARK, spaceAfter=8, spaceBefore=0)
H2 = ParagraphStyle("H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=16, leading=20,
    textColor=GREEN_DARK, spaceAfter=6, spaceBefore=10)
H3 = ParagraphStyle("H3", parent=styles["Heading3"],
    fontName="Helvetica-Bold", fontSize=12, leading=15,
    textColor=DARK, spaceAfter=4, spaceBefore=4)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=GREY_TXT, spaceAfter=4, alignment=TA_JUSTIFY)
BODY_W = ParagraphStyle("BODYW", parent=BODY, textColor=white)
BULLET = ParagraphStyle("BULLET", parent=BODY,
    leftIndent=10, bulletIndent=0, spaceAfter=2)
SMALL = ParagraphStyle("SMALL", parent=BODY, fontSize=8.5, leading=11)
SMALL_W = ParagraphStyle("SMALLW", parent=SMALL, textColor=white)
CENTER = ParagraphStyle("CENTER", parent=BODY, alignment=TA_CENTER)
TAGLINE = ParagraphStyle("TAGLINE", parent=BODY,
    fontName="Helvetica-Oblique", fontSize=14, leading=18,
    textColor=white, alignment=TA_CENTER)

# ============== Decorative page background ==============
def cover_bg(canv, doc):
    canv.saveState()
    # Full-page green gradient feel: deep green at top → near-black bottom
    canv.setFillColor(GREEN_DARK)
    canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Layered shapes
    canv.setFillColor(GREEN)
    canv.setFillAlpha(0.55)
    p = canv.beginPath()
    p.moveTo(0, PAGE_H * 0.65)
    p.curveTo(PAGE_W*0.3, PAGE_H*0.78, PAGE_W*0.6, PAGE_H*0.55, PAGE_W, PAGE_H*0.7)
    p.lineTo(PAGE_W, PAGE_H); p.lineTo(0, PAGE_H); p.close()
    canv.drawPath(p, fill=1, stroke=0)
    canv.setFillColor(GREEN_LIGHT); canv.setFillAlpha(0.35)
    p2 = canv.beginPath()
    p2.moveTo(0, PAGE_H * 0.3)
    p2.curveTo(PAGE_W*0.4, PAGE_H*0.45, PAGE_W*0.7, PAGE_H*0.18, PAGE_W, PAGE_H*0.32)
    p2.lineTo(PAGE_W, 0); p2.lineTo(0, 0); p2.close()
    canv.drawPath(p2, fill=1, stroke=0)
    canv.setFillAlpha(1)
    # Decorative leaf/circle motifs
    canv.setFillColor(GOLD); canv.setFillAlpha(0.18)
    canv.circle(PAGE_W*0.85, PAGE_H*0.85, 60*mm, fill=1, stroke=0)
    canv.setFillAlpha(1)
    canv.restoreState()

def std_bg(canv, doc):
    canv.saveState()
    # Header band
    canv.setFillColor(GREEN_DARK)
    canv.rect(0, PAGE_H - 14*mm, PAGE_W, 14*mm, fill=1, stroke=0)
    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 10)
    canv.drawString(MARGIN, PAGE_H - 9*mm, "EGREENCITY'S")
    canv.setFont("Helvetica", 9)
    canv.drawRightString(PAGE_W - MARGIN, PAGE_H - 9*mm,
        "Plaquette de présentation — Édition 2026")
    # Accent stripe
    canv.setFillColor(GREEN_LIGHT)
    canv.rect(0, PAGE_H - 14.8*mm, PAGE_W, 0.8*mm, fill=1, stroke=0)
    # Footer band
    canv.setFillColor(GREEN_DARK)
    canv.rect(0, 0, PAGE_W, 12*mm, fill=1, stroke=0)
    canv.setFillColor(GREEN_LIGHT)
    canv.rect(0, 12*mm, PAGE_W, 0.6*mm, fill=1, stroke=0)
    canv.setFillColor(white)
    canv.setFont("Helvetica", 8.5)
    canv.drawString(MARGIN, 7*mm, "egreencitys.com  |  egreencitys@gmail.com  |  +33 (0)6 51 14 11 18")
    canv.drawRightString(PAGE_W - MARGIN, 7*mm, "Macouria — Guyane française")
    canv.setFont("Helvetica", 7.5)
    canv.drawRightString(PAGE_W - MARGIN, 3.2*mm, f"— Page {doc.page} —")
    canv.restoreState()

def back_bg(canv, doc):
    canv.saveState()
    canv.setFillColor(DARK)
    canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canv.setFillColor(GREEN_DARK); canv.setFillAlpha(0.7)
    canv.rect(0, PAGE_H*0.62, PAGE_W, PAGE_H*0.38, fill=1, stroke=0)
    canv.setFillColor(GREEN); canv.setFillAlpha(0.4)
    p = canv.beginPath()
    p.moveTo(0, PAGE_H*0.55); p.curveTo(PAGE_W*0.4, PAGE_H*0.7, PAGE_W*0.6, PAGE_H*0.45, PAGE_W, PAGE_H*0.6)
    p.lineTo(PAGE_W, PAGE_H*0.62); p.lineTo(0, PAGE_H*0.62); p.close()
    canv.drawPath(p, fill=1, stroke=0)
    canv.setFillAlpha(1)
    canv.restoreState()

# ============== Build doc ==============
doc = BaseDocTemplate(OUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=20*mm, bottomMargin=18*mm,
    title="EGREENCITY'S — Plaquette 2026",
    author="EGREENCITY'S",
    subject="Bornes de recharge pour véhicules électriques en Guyane",
    keywords="EGREENCITY'S, IRVE, borne recharge, Guyane, ADVENIR, mobilité électrique")

frame_cover = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=MARGIN, rightPadding=MARGIN,
                    topPadding=30*mm, bottomPadding=25*mm, id="cover")
frame_std = Frame(MARGIN, 14*mm, PAGE_W - 2*MARGIN, PAGE_H - 32*mm,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="std")
frame_back = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=MARGIN, rightPadding=MARGIN,
                   topPadding=30*mm, bottomPadding=20*mm, id="back")

doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame_cover], onPage=cover_bg),
    PageTemplate(id="std", frames=[frame_std], onPage=std_bg),
    PageTemplate(id="back", frames=[frame_back], onPage=back_bg),
])

story = []

# ===================== COVER =====================
# Logo blanc-friendly: place le logo couleur sur fond vert; il a un canal alpha
story.append(Spacer(1, 8*mm))
story.append(Image(LOGO, width=110*mm, height=110*mm * 127/460, hAlign="CENTER"))
story.append(Spacer(1, 8*mm))
story.append(Paragraph(
    '<font color="#FFFFFF" size="32"><b>La mobilité électrique<br/>en Guyane</b></font>',
    ParagraphStyle("CV", alignment=TA_CENTER, fontName="Helvetica-Bold",
                   fontSize=32, leading=38, textColor=white)))
story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    "Bornes de recharge IRVE • Installation • Supervision • Maintenance",
    TAGLINE))
story.append(Spacer(1, 4*mm))
story.append(Paragraph(
    '<font color="#FFFFFF">— ÉDITION 2026 —</font>',
    ParagraphStyle("EDC", alignment=TA_CENTER, fontName="Helvetica-Bold",
                   fontSize=11, leading=14, textColor=white)))
# Push contact to bottom of cover
story.append(Spacer(1, 22*mm))
story.append(Paragraph(
    '<font color="#D4AF37" size="10"><b>VOTRE CONTACT</b></font><br/>'
    '<font color="#FFFFFF" size="14"><b>LUDOSKY Loïc</b></font><br/>'
    '<font color="#A7F3D0" size="9">Président — Fondateur</font>',
    ParagraphStyle("CTC", alignment=TA_CENTER, fontSize=10, leading=15)))
story.append(Spacer(1, 8*mm))
contact_tbl = Table([[
    Paragraph('<font color="#FFFFFF" size="10"><b>egreencitys.com</b></font>', CENTER),
    Paragraph('<font color="#FFFFFF" size="10"><b>egreencitys@gmail.com</b></font>', CENTER),
    Paragraph('<font color="#FFFFFF" size="10"><b>+33 (0)6 51 14 11 18</b></font>', CENTER),
]], colWidths=[(PAGE_W - 2*MARGIN)/3]*3)
contact_tbl.setStyle(TableStyle([
    ("ALIGN", (0,0), (-1,-1), "CENTER"),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("LINEABOVE", (0,0), (-1,0), 0.7, white),
    ("TOPPADDING", (0,0), (-1,-1), 8),
]))
story.append(contact_tbl)

story.append(NextPageTemplate("std"))
story.append(PageBreak())

# ===================== PAGE — L'ENTREPRISE =====================
story.append(Paragraph("L'entreprise EGREENCITY'S", H1))
story.append(Paragraph(
    "Acteur engagé de la transition énergétique en Guyane française, "
    "<b>EGREENCITY'S</b> conçoit, installe, exploite et maintient des "
    "infrastructures de recharge pour véhicules électriques (IRVE) "
    "destinées aux particuliers, copropriétés, entreprises, hôtels, "
    "centres commerciaux et collectivités.",
    BODY))
story.append(Paragraph(
    "Implantée à Macouria, l'entreprise a vocation à couvrir l'ensemble "
    "du littoral guyanais — de Saint-Laurent-du-Maroni à Saint-Georges "
    "de l'Oyapock — avec un maillage dense de stations publiques et privées, "
    "afin de permettre à chaque utilisateur de circuler en toute sérénité.",
    BODY))
story.append(Spacer(1, 4*mm))

# Three KPI cards
def kpi(num, label, sub):
    cell = Table([
        [Paragraph(f'<font color="#FFFFFF" size="22"><b>{num}</b></font>',
                   ParagraphStyle("k", alignment=TA_CENTER))],
        [Paragraph(f'<font color="#FFFFFF" size="9"><b>{label}</b></font>',
                   ParagraphStyle("k2", alignment=TA_CENTER))],
        [Paragraph(f'<font color="#D1FAE5" size="7.5">{sub}</font>',
                   ParagraphStyle("k3", alignment=TA_CENTER))],
    ], colWidths=[(PAGE_W - 2*MARGIN - 16) / 3])
    cell.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), GREEN_DARK),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("ROUNDEDCORNERS", [4,4,4,4]),
    ]))
    return cell

kpis = Table([[
    kpi("100%", "ÉLECTRIQUE", "Zéro émission directe"),
    kpi("7+", "COMMUNES VISÉES", "Couverture littoral 2026-2027"),
    kpi("24/7", "SUPERVISION", "Plateforme connectée OCPP 1.6/2.0"),
]], colWidths=[(PAGE_W - 2*MARGIN)/3]*3)
kpis.setStyle(TableStyle([
    ("LEFTPADDING", (0,0), (-1,-1), 3),
    ("RIGHTPADDING", (0,0), (-1,-1), 3),
]))
story.append(kpis)
story.append(Spacer(1, 6*mm))

story.append(Paragraph("Notre mission", H2))
story.append(Paragraph(
    "Permettre à tous — particuliers, collectivités et entreprises — "
    "de s'inscrire dans une démarche de <b>développement durable</b> "
    "et de responsabilité sociale en utilisant des énergies alternatives, "
    "moins polluantes et plus économiques.",
    BODY))

story.append(Paragraph("Nos engagements", H2))
engagements = [
    ("⚡ <b>Qualité &amp; conformité</b>",
     "Matériel certifié EV Ready / OCPP, pose par techniciens IRVE qualifiés."),
    ("🌱 <b>Impact environnemental</b>",
     "Développement de la mobilité bas-carbone sur le territoire guyanais."),
    ("🛠 <b>Service de proximité</b>",
     "Stock local, maintenance préventive et corrective sous 48 h ouvrées."),
    ("🔒 <b>Souveraineté données</b>",
     "Hébergement européen, conformité RGPD, supervision sécurisée."),
]
for t, d in engagements:
    story.append(Paragraph(f"{t} — {d}", BULLET, bulletText="•"))

story.append(PageBreak())

# ===================== PAGE — POURQUOI L'ÉLECTRIQUE =====================
story.append(Paragraph("Pourquoi passer à l'électrique ?", H1))
story.append(Paragraph(
    "La mobilité électrique n'est plus une promesse : c'est une réalité "
    "technique, économique et réglementaire. La Guyane, territoire "
    "stratégique aux ressources renouvelables abondantes, est idéalement "
    "placée pour devenir l'un des laboratoires de cette transition.",
    BODY))
story.append(Spacer(1, 3*mm))

# Table des avantages — cellules en Paragraph pour wrap + sous-scripts XML
def _td(txt, bold=False, color=GREY_TXT):
    f = "Helvetica-Bold" if bold else "Helvetica"
    col = color.hexval()[2:]
    return Paragraph(f'<font name="{f}" size="9" color="#{col}">{txt}</font>',
                     ParagraphStyle("td", alignment=TA_LEFT, leading=12))

def _th(txt):
    return Paragraph(f'<font name="Helvetica-Bold" size="9.5" color="#FFFFFF">{txt}</font>',
                     ParagraphStyle("th", alignment=TA_LEFT, leading=12))

data = [
    [_th("AXE"), _th("BÉNÉFICE"), _th("IMPACT")],
    [_td("Environnement", bold=True, color=GREEN_DARK),
     _td("Aucune émission directe de CO<sub>2</sub>, NOx ou particules fines"),
     _td("Air plus sain en zones urbaines")],
    [_td("Économie", bold=True, color=GREEN_DARK),
     _td("Coût d'usage divisé par 3 à 5 vs essence/diesel"),
     _td("Économies sur le carburant et l'entretien")],
    [_td("Confort", bold=True, color=GREEN_DARK),
     _td("Silence, accélérations linéaires, conduite apaisée"),
     _td("Expérience utilisateur supérieure")],
    [_td("Énergie", bold=True, color=GREEN_DARK),
     _td("Compatible production photovoltaïque locale"),
     _td("Souveraineté énergétique")],
    [_td("Réglementation", bold=True, color=GREEN_DARK),
     _td("AFIR, LOM, ZFE, décret tertiaire"),
     _td("Conformité obligatoire 2025-2030")],
]
t = Table(data, colWidths=[35*mm, 70*mm, 65*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GREEN_DARK),
    ("TEXTCOLOR", (0,0), (-1,0), white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,0), 9.5),
    ("FONTNAME", (0,1), (-1,-1), "Helvetica"),
    ("FONTSIZE", (0,1), (-1,-1), 9),
    ("TEXTCOLOR", (0,1), (-1,-1), GREY_TXT),
    ("ALIGN", (0,0), (-1,-1), "LEFT"),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GREEN_BG]),
    ("LINEBELOW", (0,0), (-1,0), 0.6, GREEN_LIGHT),
    ("BOX", (0,0), (-1,-1), 0.4, GREY_LIGHT),
    ("INNERGRID", (0,1), (-1,-1), 0.3, GREY_LIGHT),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
    ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
    ("TEXTCOLOR", (0,1), (0,-1), GREEN_DARK),
]))
story.append(t)
story.append(Spacer(1, 6*mm))

story.append(Paragraph("Un coût d'usage maîtrisé", H2))
story.append(Paragraph(
    "Pour <b>30 000 km/an</b>, la recharge d'un véhicule électrique revient "
    "à environ <b>900 € d'énergie</b>, contre <b>2 100 € en gazole</b> et "
    "<b>2 700 € en essence</b>. À cela s'ajoutent un entretien réduit "
    "(absence de boîte, d'embrayage, de filtres, freinage régénératif) "
    "et une assurance souvent plus avantageuse.",
    BODY))

story.append(PageBreak())

# ===================== PAGE — NOTRE GAMME (sommaire) =====================
story.append(Paragraph("Notre gamme de solutions IRVE", H1))
story.append(Paragraph(
    "EGREENCITY'S vous accompagne quel que soit votre besoin : "
    "du domicile individuel à la station ultra-rapide pour autoroutes "
    "et grands axes. Toutes nos bornes sont communicantes, supervisées "
    "et conformes aux référentiels en vigueur.",
    BODY))
story.append(Spacer(1, 4*mm))

gammes = [
    ("E-WALLBOX", "RÉSIDENTIEL & COPROPRIÉTÉ",
     "3,7 / 7 / 11 / 22 kW AC", "1 point de charge",
     "Maison individuelle, copropriété, place réservée."),
    ("E-SMART 7", "ENTREPRISES & ZONES COMMERCIALES",
     "1×7 ou 2×7 kW AC", "Murale ou sur pied",
     "Parkings d'entreprises, hôtels, restaurants, commerces."),
    ("E-SMART 22", "ENTREPRISES & ZONES COMMERCIALES",
     "1×22 ou 2×22 kW AC", "Murale ou sur pied",
     "Sites avec rotation rapide, recharge en moins de 2 h."),
    ("E-TWIN 2×22", "PARKINGS PUBLICS & PRIVÉS",
     "2 points de charge 22 kW AC", "Sur pied + écran",
     "Sites recevant du public, gestion d'énergie dynamique."),
    ("E-PREMIUM AC", "COLLECTIVITÉS & SYNDICATS",
     "2×22 kW AC", "Inox 304, parafoudre, anti-graffiti",
     "Voirie publique, places communales, conforme ADVENIR."),
    ("E-DUTY AC/DC", "RECHARGE RAPIDE MIXTE",
     "22 kW AC + 25 ou 50 kW DC", "Combo CCS / CHAdeMO",
     "Stations relais, axes routiers, flottes professionnelles."),
    ("E-PREMIUM AC/DC", "RECHARGE ULTRA-RAPIDE",
     "22 kW AC + 25 / 50 / 100 kW DC", "Écran 10\", paiement CB",
     "Centres commerciaux premium, stations littorales."),
    ("E-DC FAST", "STATION HUB",
     "2×50 kW DC ou 1×100 kW DC", "Allocation dynamique de puissance",
     "Hub multi-véhicules, longues distances."),
]

for nom, segment, puiss, conf, usage in gammes:
    card_data = [[
        Paragraph(f'<font color="#0E7A3F" size="13"><b>{nom}</b></font><br/>'
                  f'<font color="#16A34A" size="8"><b>{segment}</b></font>',
                  ParagraphStyle("nm", alignment=TA_LEFT)),
        Paragraph(f'<font color="#0A1F1A" size="9"><b>Puissance</b></font><br/>'
                  f'<font color="#3F4A45" size="9">{puiss}</font>',
                  ParagraphStyle("p", alignment=TA_LEFT)),
        Paragraph(f'<font color="#0A1F1A" size="9"><b>Configuration</b></font><br/>'
                  f'<font color="#3F4A45" size="9">{conf}</font>',
                  ParagraphStyle("c", alignment=TA_LEFT)),
        Paragraph(f'<font color="#0A1F1A" size="9"><b>Usage type</b></font><br/>'
                  f'<font color="#3F4A45" size="9">{usage}</font>',
                  ParagraphStyle("u", alignment=TA_LEFT)),
    ]]
    card = Table(card_data, colWidths=[42*mm, 36*mm, 42*mm, 50*mm])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), GREEN_BG),
        ("BACKGROUND", (1,0), (-1,-1), white),
        ("BOX", (0,0), (-1,-1), 0.5, GREEN_BORDER),
        ("LINEAFTER", (0,0), (0,0), 1.5, GREEN_DARK),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    story.append(card)
    story.append(Spacer(1, 2.5*mm))

story.append(PageBreak())

# ===================== PAGE — E-WALLBOX (résidentiel) =====================
story.append(Paragraph("E-WALLBOX — Résidentiel & copropriété", H1))
story.append(Paragraph(
    "<b>Disponible</b> — Borne murale ou sur pied, idéale pour le domicile, "
    "les copropriétés et les places réservées en entreprise.",
    BODY))
story.append(Spacer(1, 3*mm))

caract_wb = [
    ["Puissances disponibles", "3,7 — 7 — 11 — 22 kW (mono ou triphasé)"],
    ["Points de charge", "1 prise T2S ou câble T2 attaché (5 m)"],
    ["Boîtier", "Aluminium + technopolymère, version sur pied disponible"],
    ["Indice protection", "IP54 / IK10 — Intérieur ou extérieur"],
    ["Identification", "Lecteur RFID/NFC inclus"],
    ["Protections", "Différentielle 30 mA déportée (à la charge de l'installateur)"],
    ["Communication", "Compatible OCPP 1.6 / 2.0.1, modem 4G en option"],
    ["Supervision", "Plateforme web sécurisée, mises à jour à distance"],
    ["Conformité", "EV Ready 1.4 — Mode 3 — IEC 61851"],
    ["Garantie", "12 mois pièces et main-d'œuvre (extensible)"],
]
t = Table(caract_wb, colWidths=[55*mm, 117*mm])
t.setStyle(TableStyle([
    ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ("FONTNAME", (1,0), (1,-1), "Helvetica"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("TEXTCOLOR", (0,0), (0,-1), GREEN_DARK),
    ("TEXTCOLOR", (1,0), (1,-1), GREY_TXT),
    ("ROWBACKGROUNDS", (0,0), (-1,-1), [white, GREEN_BG]),
    ("BOX", (0,0), (-1,-1), 0.4, GREY_LIGHT),
    ("INNERGRID", (0,0), (-1,-1), 0.3, GREY_LIGHT),
    ("LEFTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t)

story.append(Spacer(1, 4*mm))
story.append(Paragraph("Pour qui ?", H2))
for x in [
    "<b>Particuliers</b> — recharge nocturne sur place réservée, éligible crédit d'impôt CITE / TVA réduite (sous conditions).",
    "<b>Copropriétés</b> — solution individuelle ou collective avec sous-comptage, conforme au droit à la prise (décret n° 2020-1720).",
    "<b>Entreprises</b> — places conducteurs réservées, refacturation par badge.",
    "<b>Hôtels &amp; gîtes</b> — service additionnel à la clientèle, intégration tarifaire.",
]:
    story.append(Paragraph(x, BULLET, bulletText="▸"))

story.append(PageBreak())

# ===================== PAGE — E-SMART / E-TWIN (AC commerce) =====================
story.append(Paragraph("E-SMART & E-TWIN — Entreprises & ERP", H1))
story.append(Paragraph(
    "<b>Disponible</b> — Bornes AC murales ou sur pied, configurables 1 ou 2 points "
    "de charge, conçues pour parkings d'entreprises, ERP, hôtels-restaurants, "
    "centres commerciaux et zones d'activité.",
    BODY))
story.append(Spacer(1, 3*mm))

# Two columns: Smart vs Twin
def gamme_card(title, lines):
    rows = [[Paragraph(f'<font color="#FFFFFF" size="12"><b>{title}</b></font>',
                       ParagraphStyle("t", alignment=TA_LEFT))]]
    for l in lines:
        rows.append([Paragraph(f'<font color="#3F4A45" size="9">{l}</font>',
                               ParagraphStyle("l", alignment=TA_LEFT))])
    tt = Table(rows, colWidths=[83*mm])
    tt.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), GREEN_DARK),
        ("BACKGROUND", (0,1), (-1,-1), white),
        ("BOX", (0,0), (-1,-1), 0.5, GREEN_BORDER),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    return tt

smart = gamme_card("E-SMART 7 / 22 kW", [
    "▸ Capot fonderie aluminium, IP55 / IK10",
    "▸ 1 ou 2 prises T2S — RFID intégré",
    "▸ Compteurs MID certifiés (refacturation)",
    "▸ Protection différentielle intégrée",
    "▸ Versions murale ou sur pied (PDL)",
    "▸ Compatible OCPP 1.6 / 2.0.1",
    "▸ Modem 4G, écran et TPE en option",
    "▸ Personnalisation RAL et logo",
])
twin = gamme_card("E-TWIN 2×22 kW", [
    "▸ 2 véhicules sur 2 places de stationnement",
    "▸ 4 connecteurs en 2 points de charge",
    "▸ Anti-corrosion / anti-graffiti (option)",
    "▸ Accessibilité PMR conforme",
    "▸ Écran 10\" tactile communicant (option)",
    "▸ Gestion dynamique d'énergie (load-balancing)",
    "▸ Évolutivité après installation",
    "▸ Couleur au choix et personnalisation",
])
story.append(Table([[smart, twin]], colWidths=[85*mm, 85*mm],
    style=TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"),
                      ("LEFTPADDING", (0,0), (-1,-1), 0),
                      ("RIGHTPADDING", (0,0), (-1,-1), 2)])))
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Options communes", H2))
opts = [
    "Borne maître pour gérer jusqu'à <b>10 points de charge</b> (load-balancing statique)",
    "Module de pilotage <b>e-Power TIC</b> (consigne via télé-info compteur)",
    "Module dynamique <b>e-Power DYS</b> (mesure instantanée + kit e-Meter 200 A)",
    "Coffret de pilotage multi-stations (gestion énergétique avancée)",
    "Configuration <b>smart-charging</b> sur mesure (étude amont incluse)",
    "Prise type E (recharge vélo / trottinette / scooter électrique)",
    "Modem 4G, routeur déporté, terminal de paiement bancaire (TPE sans contact)",
]
for o in opts:
    story.append(Paragraph(o, BULLET, bulletText="•"))

story.append(PageBreak())

# ===================== PAGE — E-PREMIUM AC (collectivités) =====================
story.append(Paragraph("E-PREMIUM AC — Collectivités & syndicats", H1))
story.append(Paragraph(
    "<b>Disponible</b> — Borne haut de gamme en <b>inox 304</b> conçue pour la "
    "voirie publique et les places communales. Conforme aux exigences "
    "ADVENIR voirie et aux référentiels collectivités.",
    BODY))
story.append(Spacer(1, 3*mm))

prem = [
    ["Format", "Sur pied — inox 304 — robuste IK10"],
    ["Points de charge", "2 prises T2 + 2 prises domestiques type E"],
    ["Puissance", "2 × 22 kW AC simultanés"],
    ["Identification", "Lecteur RFID intégré (carte régionale, badge mairie…)"],
    ["Protections", "Différentielles intégrées + parafoudre type 2"],
    ["Mesure", "Compteurs MID certifiés par point de charge"],
    ["Communication", "Modem 4G, OCPP 1.6 / 2.0.1, GIREVE / itinérance"],
    ["Options", "Écran tactile 10\" multilingue, TPE bancaire, anti-graffiti, RAL personnalisé"],
    ["Pied", "Possibilité d'intégrer le coffret CIBE de raccordement"],
    ["Conformité", "ADVENIR voirie, AFIR, IRVE collectivités, accessibilité PMR"],
]
t = Table(prem, colWidths=[40*mm, 132*mm])
t.setStyle(TableStyle([
    ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ("FONTNAME", (1,0), (1,-1), "Helvetica"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("TEXTCOLOR", (0,0), (0,-1), GREEN_DARK),
    ("TEXTCOLOR", (1,0), (1,-1), GREY_TXT),
    ("ROWBACKGROUNDS", (0,0), (-1,-1), [white, GREEN_BG]),
    ("BOX", (0,0), (-1,-1), 0.4, GREY_LIGHT),
    ("INNERGRID", (0,0), (-1,-1), 0.3, GREY_LIGHT),
    ("LEFTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t)
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Évolutivité — Kit upgrade AC/DC", H2))
story.append(Paragraph(
    "La E-Premium AC peut être <b>évoluée vers une borne mixte AC/DC</b> "
    "par installation d'un module 25 kW DC complémentaire, sans remplacement "
    "complet de l'infrastructure. Idéal pour les communes souhaitant déployer "
    "progressivement la recharge rapide.",
    BODY))
story.append(Paragraph(
    "Disponible également : kits de stickers (sol, totem, signalisation), "
    "RAL double couche pour zone humide, peinture anti-corrosion renforcée "
    "pour environnement tropical.",
    BODY))

story.append(PageBreak())

# ===================== PAGE — E-DUTY / E-PREMIUM AC-DC (rapide) =====================
story.append(Paragraph("Recharge rapide AC/DC — E-DUTY & E-PREMIUM AC/DC", H1))
story.append(Paragraph(
    "<b>Disponible</b> — Bornes mixtes alternatif/continu pour stations relais, "
    "axes routiers, flottes professionnelles, centres commerciaux premium et "
    "hubs de mobilité. Recharge possible en <b>15 à 40 minutes</b> selon le véhicule.",
    BODY))
story.append(Spacer(1, 3*mm))

# Comparison table
data = [
    ["MODÈLE", "AC", "DC", "CONNECTEURS", "ÉCRAN"],
    ["E-Duty 22/25", "22 kW", "25 kW",  "T2S + Combo CCS (CHAdeMO option)", "10 pouces"],
    ["E-Duty 22/50", "22 kW", "50 kW",  "T2S + Combo CCS (CHAdeMO option)", "10 pouces"],
    ["E-Duty 2×25 DC", "—",   "2 × 25 kW", "2 × Combo CCS — 1×50 kW dynamique", "10 pouces"],
    ["E-Premium 22/25", "22 kW", "25 kW", "T2 + Combo CCS + prise E", "10 pouces"],
    ["E-Premium 22/50", "22 kW", "50 kW", "Câble T2 + Combo CCS + prise E", "10 pouces"],
    ["E-Premium 22/100", "22 kW", "100 kW", "Câble T2 + Combo CCS + prise E", "10 pouces"],
    ["E-Premium 2×50 DC", "—", "2 × 50 kW", "2 × Combo CCS", "10 pouces"],
]
t = Table(data, colWidths=[37*mm, 20*mm, 25*mm, 60*mm, 30*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GREEN_DARK),
    ("TEXTCOLOR", (0,0), (-1,0), white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
    ("TEXTCOLOR", (0,1), (0,-1), GREEN_DARK),
    ("TEXTCOLOR", (1,1), (-1,-1), GREY_TXT),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GREEN_BG]),
    ("BOX", (0,0), (-1,-1), 0.4, GREY_LIGHT),
    ("INNERGRID", (0,0), (-1,-1), 0.3, GREY_LIGHT),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (1,0), (-1,-1), "CENTER"),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("RIGHTPADDING", (0,0), (-1,-1), 5),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story.append(t)

story.append(Spacer(1, 4*mm))
story.append(Paragraph("Caractéristiques communes", H2))
for x in [
    "Borne en <b>inox 304</b> robuste, parafoudre intégré, bouton d'arrêt d'urgence",
    "Lecteur <b>RFID/NFC</b>, possibilité de <b>scanner code-barres</b> ou QR code",
    "Protections différentielles intégrées + compteurs <b>MID certifiés</b>",
    "<b>OCPP 1.6 / 2.0.1</b>, modem 4G, supervision temps réel",
    "Possibilité de paiement par <b>carte bancaire sans contact</b> (TPE sur borne)",
    "Allocation dynamique de puissance pour les stations multi-points DC",
    "Câbles <b>Combo CCS</b> 5 m, option 2ᵉ câble <b>CHAdeMO</b>",
    "Conformité <b>AFIR</b> (Règlement UE 2023/1804) — paiement ad hoc obligatoire dès 50 kW",
]:
    story.append(Paragraph(x, BULLET, bulletText="•"))

story.append(PageBreak())

# ===================== PAGE — INFRASTRUCTURE / ARMOIRES =====================
story.append(Paragraph("Infrastructures multi-bornes", H1))
story.append(Paragraph(
    "Pour les <b>parcs de stationnement</b>, <b>copropriétés à grande échelle</b>, "
    "<b>flottes d'entreprise</b> et <b>centres commerciaux</b>, EGREENCITY'S "
    "déploie des armoires précâblées extensibles permettant de gérer jusqu'à "
    "12 points de charge simultanés.",
    BODY))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("Armoire précâblée — disponible en deux versions", H2))
arm = [
    ["VERSION", "DÉPARTS", "EXTENSIBLE À", "CARACTÉRISTIQUES"],
    ["Armoire 7 kW",  "6 × 7 kW",  "12 × 7 kW",
     "Structure aluminium, boîtier maître intégré, option PDL, départs par le haut"],
    ["Armoire 22 kW", "5 × 22 kW", "10 × 22 kW",
     "Structure aluminium, boîtier maître intégré, option PDL, départs par le haut"],
]
t = Table(arm, colWidths=[34*mm, 28*mm, 28*mm, 82*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GREEN_DARK),
    ("TEXTCOLOR", (0,0), (-1,0), white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GREEN_BG]),
    ("BOX", (0,0), (-1,-1), 0.4, GREY_LIGHT),
    ("INNERGRID", (0,0), (-1,-1), 0.3, GREY_LIGHT),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (1,0), (2,-1), "CENTER"),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
    ("TEXTCOLOR", (0,1), (0,-1), GREEN_DARK),
    ("TEXTCOLOR", (1,1), (-1,-1), GREY_TXT),
]))
story.append(t)

story.append(Spacer(1, 5*mm))
story.append(Paragraph("Options de raccordement & sécurité", H2))
for x in [
    "<b>Sectionneur général 4 × 160 A</b> intégré (en remplacement option PDL)",
    "<b>Sectionneur général 4 × 400 A</b> pour fortes puissances",
    "Écran 10 pouces tactile en façade d'armoire",
    "Terminal de paiement bancaire (TPE) intégré à l'armoire",
    "Prise type E pour micro-mobilité (vélo, trottinette, scooter)",
    "Modem 4G + routeur déporté pour zones à faible couverture",
    "Pilotage énergétique multi-stations (e-Powerbox)",
]:
    story.append(Paragraph(x, BULLET, bulletText="•"))

story.append(Spacer(1, 4*mm))
story.append(Paragraph("Délais de mise en œuvre", H2))
story.append(Paragraph(
    "Pour une installation type E-Twin 2 × 22 ou borne publique : "
    "<b>4 mois maximum</b> après réception de la commande, dont études, "
    "raccordement EDF, génie civil, pose du compteur (par organisme agréé) "
    "et mise en service par technicien IRVE qualifié. Délai compressible "
    "selon disponibilité du fournisseur d'électricité.",
    BODY))

story.append(PageBreak())

# ===================== PAGE — RÉGLEMENTATIONS À JOUR =====================
story.append(Paragraph("Réglementations & conformité 2025-2026", H1))
story.append(Paragraph(
    "EGREENCITY'S installe et exploite ses infrastructures dans le respect "
    "strict des réglementations européenne, française et locale en vigueur "
    "à la date de l'édition de cette plaquette.",
    BODY))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("Cadre européen — Règlement AFIR", H2))
story.append(Paragraph(
    "Le <b>Règlement (UE) 2023/1804</b> du 13 septembre 2023 — dit "
    "<b>AFIR (Alternative Fuels Infrastructure Regulation)</b> — entré en "
    "application le <b>13 avril 2024</b>, impose un déploiement minimal de "
    "stations de recharge rapide tous les 60 km le long du réseau RTE-T, "
    "ainsi que des obligations strictes de paiement (carte bancaire sans "
    "contact obligatoire dès 50 kW), de transparence tarifaire et "
    "d'interopérabilité.",
    BODY))

story.append(Paragraph("Cadre français — IRVE & qualifications installateurs", H2))
for x in [
    "<b>Décret n° 2017-26</b> modifié relatif aux infrastructures de recharge — "
    "interopérabilité, accessibilité, signalétique.",
    "<b>Arrêté du 12 janvier 2017</b> modifié sur la qualification des installateurs IRVE — "
    "obligation de qualification mention <b>IRVE-P1, P2 ou P3</b> selon la puissance.",
    "<b>Loi LOM</b> (24 décembre 2019) — pré-équipement obligatoire des parkings "
    "neufs (résidentiels et tertiaires) et droit à la prise renforcé.",
    "<b>Décret n° 2020-1720</b> — droit à la prise en copropriété, délai de réponse "
    "du syndicat encadré.",
    "<b>Décret tertiaire</b> (Éco Énergie Tertiaire) — réduction de 40 % de la "
    "consommation énergétique à 2030, intégrant la recharge VE.",
]:
    story.append(Paragraph(x, BULLET, bulletText="▸"))

story.append(Paragraph("Programme ADVENIR (édition en cours)", H2))
story.append(Paragraph(
    "Le programme <b>ADVENIR</b>, financé par les Certificats d'Économies "
    "d'Énergie (CEE), subventionne le déploiement de bornes pour "
    "particuliers en copropriété, entreprises, collectivités, parkings "
    "publics et flottes. EGREENCITY'S est <b>partenaire ADVENIR</b> et "
    "accompagne ses clients dans le montage du dossier de prime.",
    BODY))

story.append(Paragraph("Conditions techniques (voirie & ERP)", H3))
for x in [
    "Puissance 3,7–22 kW/PdC : socle T2 ou T2S NF EN 62196-2 obligatoire dès le 1ᵉʳ point.",
    "Puissance &gt; 22 kW/PdC : connecteur <b>type 2 EN 62196-2</b> en AC + <b>Combo CCS</b> en DC, CHAdeMO en option.",
    "Signalisation des places de stationnement équipées (panneaux, marquage au sol).",
    "Système d'identification de l'usager (RFID, badge, QR, application).",
    "Contrat de maintenance avec inspection annuelle minimum sur 36 mois.",
    "Document attestant de la qualification IRVE de l'installateur.",
    "Système de pilotage et de supervision énergétique obligatoires.",
    "Connexion à la plateforme <b>GIREVE</b> pour l'interopérabilité — itinérance.",
    "Enregistrement des données statiques sur <b>data.gouv.fr</b>.",
    "Conformité <b>RGPD</b> pour les données personnelles utilisateurs.",
]:
    story.append(Paragraph(x, BULLET, bulletText="•"))

story.append(PageBreak())

# ===================== PAGE — INSTALLATION & SAV =====================
story.append(Paragraph("Installation, maintenance & SAV", H1))
story.append(Paragraph(
    "EGREENCITY'S vous accompagne sur l'intégralité du cycle de vie de votre "
    "infrastructure de recharge — de l'étude de faisabilité jusqu'à la "
    "supervision quotidienne et la maintenance corrective.",
    BODY))

story.append(Spacer(1, 3*mm))
story.append(Paragraph("Notre processus en 6 étapes", H2))

steps = [
    ("1", "AUDIT", "Visite technique du site, mesure de la puissance disponible, "
                   "diagnostic du tableau électrique, identification des contraintes."),
    ("2", "ÉTUDE", "Dimensionnement, choix du modèle, plans d'implantation, "
                   "calculs de section de câble, plan de signalisation."),
    ("3", "DEVIS", "Proposition technique et financière détaillée, montage du "
                   "dossier ADVENIR / CEE / aides locales le cas échéant."),
    ("4", "RACCORDEMENT", "Coordination avec EDF / GRD pour la pose du compteur, "
                          "génie civil si nécessaire, certificats."),
    ("5", "INSTALLATION", "Pose par technicien qualifié IRVE, paramétrage OCPP, "
                          "test de mise en service, formation utilisateur."),
    ("6", "SUPERVISION", "Mise sous supervision 24/7, contrat de maintenance, "
                         "rapports mensuels, intervention sous 48 h ouvrées."),
]
for n, t_, desc in steps:
    cell = Table([[
        Paragraph(f'<font color="#FFFFFF" size="20"><b>{n}</b></font>',
                  ParagraphStyle("n", alignment=TA_CENTER)),
        Paragraph(f'<font color="#0E7A3F" size="11"><b>{t_}</b></font><br/>'
                  f'<font color="#3F4A45" size="9.5">{desc}</font>',
                  ParagraphStyle("d", alignment=TA_LEFT)),
    ]], colWidths=[14*mm, 158*mm])
    cell.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), GREEN_DARK),
        ("BACKGROUND", (1,0), (1,0), GREEN_BG),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(cell)
    story.append(Spacer(1, 1.5*mm))

story.append(Spacer(1, 3*mm))
story.append(Paragraph("Garantie & SAV", H2))
for x in [
    "<b>Achat matériel</b> : garantie constructeur 12 mois, extensible jusqu'à 36 mois.",
    "<b>Location matériel</b> : garantie équivalente à la durée du contrat, "
    "remplacement systématique en cas de panne.",
    "<b>Stock local</b> en Guyane pour intervention rapide — pièces critiques toujours disponibles.",
    "<b>Contrat de maintenance 36 mois</b> obligatoire ADVENIR : 1 inspection préventive/an minimum.",
    "<b>Formation</b> assurée par organismes Qualifelec et AFNOR (mention IRVE).",
]:
    story.append(Paragraph(x, BULLET, bulletText="✓"))

story.append(PageBreak())

# ===================== PAGE — RÉSEAU GUYANE =====================
story.append(Paragraph("Notre déploiement en Guyane", H1))
story.append(Paragraph(
    "EGREENCITY'S construit le premier réseau guyanais de bornes de recharge "
    "publiques, conçu pour permettre les déplacements longue distance sur "
    "l'ensemble du littoral, de Saint-Laurent-du-Maroni à Saint-Georges de "
    "l'Oyapock.",
    BODY))
story.append(Spacer(1, 3*mm))

# Carte stylisée
def map_canvas():
    from reportlab.platypus import Flowable
    class Map(Flowable):
        def __init__(self, w, h):
            self.w, self.h = w, h
        def wrap(self, *a): return self.w, self.h
        def draw(self):
            c = self.canv
            # Background ocean
            c.setFillColor(HexColor("#CFE9F8"))
            c.rect(0, 0, self.w, self.h, fill=1, stroke=0)
            # Land mass approximation (Guyane littoral)
            c.setFillColor(HexColor("#A7F3D0"))
            p = c.beginPath()
            p.moveTo(self.w*0.05, self.h*0.20)
            p.curveTo(self.w*0.20, self.h*0.55, self.w*0.55, self.h*0.65, self.w*0.95, self.h*0.55)
            p.lineTo(self.w*0.95, self.h*0.05); p.lineTo(self.w*0.05, self.h*0.05)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            # Coastline
            c.setStrokeColor(GREEN_DARK)
            c.setLineWidth(1.5)
            p2 = c.beginPath()
            p2.moveTo(self.w*0.05, self.h*0.20)
            p2.curveTo(self.w*0.20, self.h*0.55, self.w*0.55, self.h*0.65, self.w*0.95, self.h*0.55)
            c.drawPath(p2, fill=0, stroke=1)
            # Communes
            communes = [
                ("Saint-Laurent",  0.10, 0.32),
                ("Iracoubo",       0.30, 0.50),
                ("Sinnamary",      0.42, 0.55),
                ("Kourou",         0.52, 0.58),
                ("Macouria",       0.62, 0.55),
                ("Cayenne",        0.72, 0.52),
                ("Rémire-M.",      0.78, 0.46),
                ("Matoury",        0.74, 0.42),
                ("Saint-Georges",  0.92, 0.28),
            ]
            c.setFont("Helvetica-Bold", 7.5)
            for name, x, y in communes:
                px, py = x*self.w, y*self.h
                # Pin
                c.setFillColor(GREEN_DARK)
                c.circle(px, py, 2.5, fill=1, stroke=0)
                c.setFillColor(GOLD)
                c.circle(px, py, 1.2, fill=1, stroke=0)
                # Label
                c.setFillColor(DARK)
                c.drawCentredString(px, py + 4, name)
            # Title
            c.setFillColor(GREEN_DARK)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(8, self.h - 14, "Littoral guyanais — réseau EGREENCITY'S")
            # Border
            c.setStrokeColor(GREEN_BORDER)
            c.setLineWidth(0.6)
            c.rect(0, 0, self.w, self.h, fill=0, stroke=1)
    return Map(PAGE_W - 2*MARGIN, 70*mm)

story.append(map_canvas())
story.append(Spacer(1, 5*mm))

story.append(Paragraph("Communes desservies — phase 1 (2026-2027)", H2))
story.append(Paragraph(
    "<b>Saint-Laurent-du-Maroni</b> • <b>Iracoubo</b> • <b>Sinnamary</b> • "
    "<b>Kourou</b> • <b>Macouria</b> • <b>Cayenne</b> • <b>Rémire-Montjoly</b> • "
    "<b>Matoury</b> — couverture étendue à <b>Saint-Georges-de-l'Oyapock</b> "
    "et aux communes de l'intérieur en phase 2.",
    BODY))

story.append(Spacer(1, 3*mm))
story.append(Paragraph("Cibles d'implantation", H2))
for x in [
    "<b>Mairies &amp; bâtiments publics</b> — démarches de cession effectuées auprès des collectivités.",
    "<b>Administrations, écoles publiques, équipements de santé</b> (hôpitaux, EHPAD).",
    "<b>Centres commerciaux, supermarchés, épiceries</b> avec parkings clientèle.",
    "<b>Hôtels, restaurants, gîtes touristiques</b> — services additionnels.",
    "<b>Stations-service du littoral</b> (RN1, RN2) — recharge rapide DC.",
    "<b>Concessionnaires automobiles</b> partenaires des constructeurs VE.",
]:
    story.append(Paragraph(x, BULLET, bulletText="📍"))

# ===================== PAGE — CONTACT (back) =====================
story.append(NextPageTemplate("back"))
story.append(PageBreak())

story.append(Spacer(1, 22*mm))
story.append(Paragraph(
    '<font color="#FFFFFF" size="32"><b>Travaillons ensemble</b></font>',
    ParagraphStyle("c1", alignment=TA_CENTER, fontSize=32, leading=36, textColor=white)))
story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    '<font color="#A7F3D0" size="13">Étude personnalisée gratuite, devis détaillé et accompagnement ADVENIR sur tous nos projets.</font>',
    ParagraphStyle("c2", alignment=TA_CENTER, fontSize=13, leading=18, textColor=HexColor("#A7F3D0"))))
story.append(Spacer(1, 14*mm))

contact_block = Table([
    [Paragraph('<font color="#FFFFFF" size="11"><b>CONTACT</b></font>', CENTER),
     Paragraph('<font color="#FFFFFF" size="14"><b>LUDOSKY Loïc</b></font>'
               '<br/><font color="#A7F3D0" size="9">Président — Fondateur</font>', CENTER)],
    [Paragraph('<font color="#FFFFFF" size="11"><b>WEB</b></font>', CENTER),
     Paragraph('<font color="#FFFFFF" size="14"><b>egreencitys.com</b></font>', CENTER)],
    [Paragraph('<font color="#FFFFFF" size="11"><b>E-MAIL</b></font>', CENTER),
     Paragraph('<font color="#FFFFFF" size="14"><b>egreencitys@gmail.com</b></font>', CENTER)],
    [Paragraph('<font color="#FFFFFF" size="11"><b>TÉLÉPHONE</b></font>', CENTER),
     Paragraph('<font color="#FFFFFF" size="14"><b>+33 (0)6 51 14 11 18</b></font>', CENTER)],
    [Paragraph('<font color="#FFFFFF" size="11"><b>SIÈGE</b></font>', CENTER),
     Paragraph('<font color="#FFFFFF" size="14"><b>Macouria — Guyane française (973)</b></font>', CENTER)],
], colWidths=[40*mm, 120*mm], hAlign="CENTER")
contact_block.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,-1), GREEN_DARK),
    ("BOX", (0,0), (-1,-1), 0.5, white),
    ("INNERGRID", (0,0), (-1,-1), 0.5, white),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (0,0), (-1,-1), "CENTER"),
    ("TOPPADDING", (0,0), (-1,-1), 12),
    ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ("LEFTPADDING", (0,0), (-1,-1), 14),
    ("RIGHTPADDING", (0,0), (-1,-1), 14),
]))
story.append(contact_block)

story.append(Spacer(1, 14*mm))
story.append(Paragraph(
    '<font color="#86EFAC" size="9">SIRET 878 682 854 — Société française basée à Macouria, Guyane.<br/>'
    'EGREENCITY\'S — Tous droits réservés. Édition 2026.<br/><br/>'
    '<b>Cette plaquette présente notre offre commerciale 2026.</b><br/>'
    'Caractéristiques techniques susceptibles d\'évolution. Documents à valeur informative.</font>',
    ParagraphStyle("foot", alignment=TA_CENTER, fontSize=9, leading=13, textColor=HexColor("#86EFAC"))))

# Build
doc.build(story)
print(f"OK -> {OUT}")
print(f"Size: {os.path.getsize(OUT)/1024:.1f} KB")
