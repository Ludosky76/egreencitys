/* ==========================================================================
   EGREENCITY'S — PRO QUINCAILLERIE — vérification horaire des disponibilités
   ==========================================================================
   Lancé toutes les heures par GitHub Actions (.github/workflows/stock-quincaillerie.yml).

   À chaque passage, ~95 fiches fournisseur sont relues (rotation polie —
   jamais le catalogue entier d'un coup) :
     - 70 articles vendables (disponible/faible), les plus anciens d'abord
       -> un article vendable est revérifié environ toutes les 13 h ;
     - 25 articles en rupture/introuvable -> détection des retours en stock,
       catalogue entier couvert en quelques jours.

   Effets :
     1. assets/data/quincaillerie-stock.json mis à jour (la page boutique le
        recharge au moment du clic « Payer » : pas d'encaissement sur un
        article que la dernière lecture fournisseur donne indisponible) ;
     2. liens Stripe activés/désactivés selon le stock (si la clé est fournie) ;
     3. assets/data/quincaillerie-liens.json régénéré (liens actifs seulement) ;
     4. produit disparu de chez le fournisseur -> alerte (issue GitHub + email).

   Politesse envers le site fournisseur : requêtes séquentielles espacées de
   1,3 s, arrêt du passage après 3 refus consécutifs (403/429/503).
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { request as httpsRequest } from "node:https";

const RACINE = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const F_STOCK = RACINE + "/assets/data/quincaillerie-stock.json";
const F_LIENS = RACINE + "/assets/data/quincaillerie-liens.json";
const F_SOURCES = RACINE + "/.github/stock/sources.json";
const F_MAP = RACINE + "/.github/stock/stripe-links-map.json";

const COMPTOIR = "56"; // Screwfix Dieppe
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PAUSE_MS = 1300;
const LOT_VENDABLES = parseInt(process.env.LOT_VENDABLES || "70", 10);
const LOT_AUTRES = parseInt(process.env.LOT_AUTRES || "25", 10);

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const EMAIL_ALERTE = "egreencitys@gmail.com";

const lire = (p, defaut) => { try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return defaut; } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- telechargement : node:https, car le fournisseur envoie des en-tetes
   enormes qui depassent la limite du fetch natif (16 Ko). Meme parade que
   l'application d'origine : maxHeaderSize releve a 256 Ko. ---- */
function telecharger(url) {
  return new Promise((resoudre) => {
    let req;
    try {
      req = httpsRequest(url, {
        method: "GET",
        maxHeaderSize: 256 * 1024,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        timeout: 20000,
      }, (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location || "";
        if (status >= 300 && status < 400) { res.resume(); return resoudre({ status, location, html: "" }); }
        let corps = "";
        res.setEncoding("utf-8");
        res.on("data", (c) => { if (corps.length < 3_000_000) corps += c; });
        res.on("end", () => resoudre({ status, location: "", html: corps }));
      });
    } catch { return resoudre({ status: 0, location: "", html: "" }); }
    req.on("timeout", () => { req.destroy(); resoudre({ status: 0, location: "", html: "" }); });
    req.on("error", () => resoudre({ status: 0, location: "", html: "" }));
    req.end();
  });
}

/* ---- lecture d'une fiche fournisseur -> statut ---- */
function statutDepuisHtml(html) {
  const balises = html.match(/<li[^>]*data-stock-qty="[^"]*"[^>]*>/gi) ?? [];
  const balise = balises.find((t) => t.indexOf('data-store-location-id="' + COMPTOIR + '"') !== -1);
  if (!balise) return "inconnu";
  const brut = balise.match(/data-stock-qty="(-?\d+(?:\.\d+)?)"/)?.[1];
  const qty = brut != null ? Math.max(0, Math.floor(parseFloat(brut))) : null;
  const classes = balise.match(/class="([^"]*)"/)?.[1] ?? "";
  if (/(out_of_stock|unavailable)/.test(classes) || qty === 0) return "rupture";
  if (/low_of_stock/.test(classes)) return "faible";
  if (/available/.test(classes) || (qty != null && qty > 0)) return "disponible";
  return "inconnu";
}

async function verifierFiche(url) {
  let r = await telecharger(url);
  if ([403, 429, 503].includes(r.status)) return { statut: null, bloque: true };
  if (r.status === 404 || r.status === 410) return { statut: "introuvable", bloque: false };
  if (r.status >= 300 && r.status < 400) {
    // redirection vers une categorie ou l'accueil = fiche retiree du site
    if (!/\.html(\?|$)/.test(r.location)) return { statut: "introuvable", bloque: false };
    r = await telecharger(new URL(r.location, url).href);
    if ([403, 429, 503].includes(r.status)) return { statut: null, bloque: true };
    if (r.status !== 200) return { statut: "introuvable", bloque: false };
  }
  if (r.status !== 200) return { statut: null, bloque: false };
  return { statut: statutDepuisHtml(r.html), bloque: false };
}

/* ---- bascule d'un lien Stripe ---- */
async function basculerLien(id, actif) {
  const res = await fetch("https://api.stripe.com/v1/payment_links/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: "active=" + (actif ? "true" : "false"),
  });
  if (!res.ok) console.log("  stripe KO", id, res.status);
  return res.ok;
}

/* ---- alerte : issue GitHub + email ---- */
async function alerter(disparus) {
  const corps = "Produits retirés du site fournisseur (liens de paiement désactivés) :\n\n"
    + disparus.map((d) => `- [${d.ref}] ${d.url}`).join("\n")
    + "\n\nÀ faire : retirer ou remplacer ces références dans le catalogue.";
  const jeton = process.env.GITHUB_TOKEN, depot = process.env.GITHUB_REPOSITORY;
  if (jeton && depot) {
    await fetch(`https://api.github.com/repos/${depot}/issues`, {
      method: "POST",
      headers: { Authorization: "Bearer " + jeton, Accept: "application/vnd.github+json" },
      body: JSON.stringify({ title: `⚠ Quincaillerie : ${disparus.length} produit(s) disparu(s) chez le fournisseur`, body: corps, labels: ["stock"] }),
    }).catch(() => {});
  }
  await fetch("https://formsubmit.co/ajax/" + EMAIL_ALERTE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ _subject: "⚠ Quincaillerie : produit(s) disparu(s) chez le fournisseur", message: corps }),
  }).catch(() => {});
}

/* ---- passage principal ---- */
const sources = lire(F_SOURCES, {});
const donneesStock = lire(F_STOCK, { maj: 0, stock: {} });
const stock = donneesStock.stock;
const carte = lire(F_MAP, {}); // ref -> { link, url }

const maintenant = Math.floor(Date.now() / 1000);
const anciennete = (ref) => (stock[ref]?.t || 0);
const vendable = (ref) => ["disponible", "faible"].includes(stock[ref]?.s);
const refs = Object.keys(sources);
const lot = [
  ...refs.filter(vendable).sort((a, b) => anciennete(a) - anciennete(b)).slice(0, LOT_VENDABLES),
  ...refs.filter((r) => !vendable(r)).sort((a, b) => anciennete(a) - anciennete(b)).slice(0, LOT_AUTRES),
];
console.log(`passage : ${lot.length} fiches (${refs.length} au catalogue)`);

let refusConsecutifs = 0, changements = 0;
const disparus = [], bascules = [];
for (const ref of lot) {
  const { statut, bloque } = await verifierFiche(sources[ref]);
  if (bloque) {
    refusConsecutifs += 1;
    if (refusConsecutifs >= 3) { console.log("fournisseur sature — arrêt du passage"); break; }
    await dormir(10000); continue;
  }
  refusConsecutifs = 0;
  const avant = stock[ref]?.s;
  if (statut) {
    stock[ref] = { s: statut, t: maintenant };
    if (statut !== avant) {
      changements += 1;
      console.log(`  ${ref} : ${avant || "?"} -> ${statut}`);
      if (statut === "introuvable") disparus.push({ ref, url: sources[ref] });
      const lien = carte[ref];
      if (lien?.link) bascules.push({ id: lien.link, actif: statut === "disponible" });
    }
  } else if (stock[ref]) {
    stock[ref].t = maintenant; // injoignable : on date la tentative, sans changer l'état
  }
  await dormir(PAUSE_MS);
}

/* écrit l'état + la liste publique des liens actifs */
donneesStock.maj = maintenant;
writeFileSync(F_STOCK, JSON.stringify(donneesStock), "utf-8");
const liensActifs = {};
for (const [ref, l] of Object.entries(carte)) {
  if (l?.url && stock[ref]?.s === "disponible") liensActifs[ref] = l.url;
}
if (Object.keys(carte).length) writeFileSync(F_LIENS, JSON.stringify(liensActifs), "utf-8");

if (STRIPE_KEY) {
  for (const b of bascules) { await basculerLien(b.id, b.actif); await dormir(150); }
} else if (bascules.length) {
  console.log("STRIPE_SECRET_KEY absent : bascules de liens non appliquées (la page masque déjà le bouton).");
}
if (disparus.length) await alerter(disparus);
console.log(`terminé : ${changements} changement(s), ${disparus.length} disparu(s), ${bascules.length} bascule(s) de lien`);
