import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Friendly aliases for messages and sending
app.get(['/voir', '/messages', '/inbox'], (req, res) => {
  res.sendFile(path.join(__dirname, 'voir.html'));
});

app.get('/envoyer', (req, res) => {
  res.sendFile(path.join(__dirname, 'envoyer.html'));
});

// Redirect legacy /sayitfeed.html to /sisfeed.html
app.get('/sayitfeed.html', (req, res) => {
  res.redirect(301, '/sisfeed.html');
});

// Route icon aliases
app.get('/icon/icon-192.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'icon-192.png'));
});
app.get('/icon/icon-512.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'icon-512.png'));
});

// Serve static files from root directory
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SIS Server listening on http://0.0.0.0:${PORT}`);
});
