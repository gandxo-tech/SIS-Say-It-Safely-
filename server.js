import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const AVIS_FILE = path.join(__dirname, '.sis-avis.json');

app.use(express.json());

const memoryAvis = [];

async function readAvis() {
  try {
    const raw = await fs.readFile(AVIS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.avis)) return parsed.avis;
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      console.warn('Lecture avis locale ignorée:', err.message);
    }
  }
  return [...memoryAvis];
}

async function writeAvis(avis) {
  memoryAvis.length = 0;
  memoryAvis.push(...avis);
  try {
    await fs.writeFile(AVIS_FILE, JSON.stringify({ avis }, null, 2), 'utf8');
  } catch (err) {
    console.warn('Sauvegarde avis locale en mémoire uniquement:', err.message);
  }
}

app.get('/api/avis', async (req, res) => {
  const avis = await readAvis();
  return res.json({ avis });
});

app.post('/api/avis', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'Veuillez écrire un avis.' });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Avis trop long (1000 caractères maximum).' });
  }

  const avis = await readAvis();
  avis.push(message);
  await writeAvis(avis);
  return res.json({ avis });
});

// When visiting root or /index.html with ?to=[pseudo], redirect directly to envoyer.html
app.get(['/', '/index.html'], (req, res, next) => {
  const to = req.query.to || req.query.user || req.query.pseudo;
  if (to) {
    return res.redirect(`/envoyer.html?to=${encodeURIComponent(to)}`);
  }
  next();
});

// Direct friendly routes for sending anonymous messages
app.get('/to/:pseudo', (req, res) => {
  res.redirect(`/envoyer.html?to=${encodeURIComponent(req.params.pseudo)}`);
});

app.get('/u/:pseudo', (req, res) => {
  res.redirect(`/envoyer.html?to=${encodeURIComponent(req.params.pseudo)}`);
});

// Friendly aliases for messages, sending, and leaderboard
app.get(['/voir', '/messages', '/inbox'], (req, res) => {
  res.sendFile(path.join(__dirname, 'voir.html'));
});

app.get('/envoyer', (req, res) => {
  res.sendFile(path.join(__dirname, 'envoyer.html'));
});

app.get(['/classement', '/leaderboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'classement.html'));
});

// Route icon aliases
app.get('/icon/icon-192.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'icon-192.png'));
});
app.get('/icon/icon-512.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'icon-512.png'));
});

// Fichiers internes (code serveur, config, règles, tests) : jamais servis au public
app.use((req, res, next) => {
  if (/^\/(server\.js|package(-lock)?\.json|firebase\.json|firebase-applet-config\.json|firestore\.(rules|indexes\.json)|rules\.test\.mjs|leaderboard-utils\.test\.mjs|share-canvas\.test\.mjs|\.sis-avis\.json|metadata\.json|node_modules|\.git|\.env)/i.test(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

// Serve static files from root directory
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  dotfiles: 'deny'
}));

// Fallback to index.html (uniquement pour les pages, pas pour les fichiers inconnus)
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SIS Server listening on http://0.0.0.0:${PORT}`);
});
