// Copie les fichiers web de SIS dans `www/`, le dossier que Capacitor
// embarque dans l'APK. L'app native ne charge donc pas la version Vercel :
// elle sert exactement les fichiers du dépôt.
//
// Le PWA continue de vivre à la racine du dépôt pour le web ; `www/` est un
// artefact de build, régénéré par `npm run build:www` (et ignoré par Git).
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "www");

// Pages de l'application (on exclut cover.html, outil interne de génération
// des couvertures SEO, inutile dans l'APK).
const PAGES = [
  "index.html",
  "voir.html",
  "envoyer.html",
  "classement.html",
  "compte.html",
  "pays.html",
  "avis.html",
  "conditions.html",
  "politiques.html",
  "propos.html"
];

// Modules JS chargés par les pages, plus le service worker.
const SCRIPTS = [
  "bottom-nav.js",
  "leaderboard-utils.js",
  "leaderboard-sync.js",
  "share-canvas.js",
  "sis-cache.js",
  "firebase-config.js",
  "geo-country.js",
  "theme.js",
  "sw.js"
];

const ASSETS = [
  "manifest.json",
  "glass.css",
  "robots.txt",
  "sitemap.xml",
  "humans.txt",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png"
];

const DIRS = ["covers"];

async function mustExist(absPath) {
  try {
    await fs.access(absPath);
  } catch {
    throw new Error(`Asset introuvable pour le build natif : ${path.relative(root, absPath)}`);
  }
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const file of [...PAGES, ...SCRIPTS, ...ASSETS]) {
    const src = path.join(root, file);
    await mustExist(src);
    await fs.copyFile(src, path.join(outDir, file));
  }

  for (const dir of DIRS) {
    const src = path.join(root, dir);
    await mustExist(src);
    await fs.cp(src, path.join(outDir, dir), { recursive: true });
  }

  const count = [...PAGES, ...SCRIPTS, ...ASSETS].length + DIRS.length;
  console.log(`www/ prêt : ${count} entrées copiées depuis ${root}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
