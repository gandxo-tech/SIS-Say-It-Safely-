/* ═══════════════════════════════════════════════════════════════
   SIS V4 — chatanonyme.js
   Say It Safely · Firebase COMPAT · Zéro module · Zéro import
   Chargé APRÈS les 3 scripts Firebase compat dans le HTML
═══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
var CFG = {
  firebase: {
    apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
    authDomain:        "chat-anonyme.firebaseapp.com",
    projectId:         "chat-anonyme",
    storageBucket:     "chat-anonyme.firebasestorage.app",
    messagingSenderId: "93366459642",
    appId:             "1:93366459642:web:a2421c9478909b33667d43",
  },
  cloudinary: { cloud: "duddyzckz", preset: "ml_defaulte" },
  perspective: { apiKey: "VOTRE_CLE_PERSPECTIVE" }, // → console.cloud.google.com → Perspective Comment Analyzer API
};

// ─────────────────────────────────────────────
//  FIREBASE INIT (compat — synchrone)
// ─────────────────────────────────────────────
var fbApp = firebase.initializeApp(CFG.firebase);
var auth  = firebase.auth();
var db    = firebase.firestore();

// ─────────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────────
var EMOJIS_REACT = ['❤️','😂','😮','😢','😡','👍','🔥','💯','🎉','👀','✨','🥶'];
var CAT_EMOJI    = { general:'💬', gaming:'🎮', tech:'💻', music:'🎵', sport:'⚽', education:'📚', manga:'🗾', art:'🎨', news:'📰' };

var ANON_ADJ   = ['cosmic','shadow','silent','ghost','crystal','neon','mystic','void','stellar','frozen','burning','echo','cyber','phantom','glitch','aurora','prism','rogue','nova','binary'];
var ANON_NOUN  = ['wave','storm','orbit','drift','pulse','spark','flare','veil','shade','mist','cipher','specter','flux','nova','quasar','pixel','vector','nexus','byte','signal'];
var ANON_EMOJIS= ['🎭','🦊','🐺','🦝','🦁','🐯','🦋','🌊','🔮','💫','🌙','⚡','🎲','🌀','🧿','🦄','🐉','🌈','🎪','🧬','👾','🤖','🦅','🐬','🌸'];
var ANON_COLORS= ['#6c63ff','#f97316','#06b6d4','#10b981','#f43f5e','#8b5cf6','#eab308','#ec4899','#14b8a6','#3b82f6','#84cc16','#a855f7','#0ea5e9','#22d3ee','#fb7185'];

var MOD_PATTERNS = [
  /pornhub/i, /xvideos/i, /xnxx/i, /onlyfans/i, /\bporn\b/i, /\bsex\s*tape/i,
  /bit\.ly\/[a-z0-9]+$/i, /free.*bitcoin/i, /click.*here.*win/i, /paypal.*verify/i,
  /\bbuy.*drugs?\b/i, /\bweed.*delivery\b/i, /\bchild.*porn/i,
];

var BG_MAP = {
  'default':     'var(--chat-bg)',
  'midnight':    '#08080f',
  'navy':        '#0a1220',
  'forest':      '#081510',
  'violet':      'linear-gradient(145deg,#120828,#0a0a1e)',
  'ocean':       'linear-gradient(145deg,#020f1e,#001a3a)',
  'aurora':      'linear-gradient(145deg,#060f0a,#120828)',
  'rose':        'linear-gradient(145deg,#1a0810,#0a0510)',
  'paper':       '#f8f7f2',
};

// Badges modération
var BADGE_MAP = {
  'warn-1': { label: '⚠️ Avert. 1', cls: 'badge-warn1', color: '#eab308' },
  'warn-2': { label: '🟠 Avert. 2', cls: 'badge-warn2', color: '#f97316' },
  'warn-3': { label: '🔴 Banni',    cls: 'badge-warn3', color: '#ef4444' },
};

var AUTH_ERRORS = {
  'auth/invalid-credential':    'Email ou mot de passe incorrect.',
  'auth/user-not-found':        'Aucun compte trouvé.',
  'auth/wrong-password':        'Mot de passe incorrect.',
  'auth/email-already-in-use':  'Email déjà utilisé.',
  'auth/weak-password':         'Mot de passe trop court (6+ caractères).',
  'auth/invalid-email':         'Email invalide.',
  'auth/network-request-failed':'Erreur réseau. Vérifie ta connexion.',
  'auth/operation-not-allowed': 'Connexion anonyme non activée dans Firebase.',
};

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
var S = {
  user: null, profile: null,
  theme:       localStorage.getItem('sis_theme') || 'dark',
  lang:        localStorage.getItem('sis_lang')  || 'fr',
  chatBg:      localStorage.getItem('sis_chatbg') || 'default',
  ephemHours:  parseInt(localStorage.getItem('sis_ephem') || '0'),
  ephemPick:   0,
  currentRoomId: null, currentRoom: null,
  replyTo: null, editingMsgId: null,
  allRooms: [],
  roomMembers: {},
  listeners: [],
  recording: false, mediaRec: null, recChunks: [], recTimer: null, recSecs: 0,
  randomId: null, randomUnsub: null, randomActive: false,
  mentionResults: [], mentionIdx: 0,
  anonName: '', anonColor: '#6c63ff', anonEmoji: '🎭',
  stickers: JSON.parse(localStorage.getItem('sis_stickers') || '[]'),
  notifs:   JSON.parse(localStorage.getItem('sis_notifs')   || '[]'),
  countryFlag: localStorage.getItem('sis_flag') || '',
  cryptoKey: null,
  customBg: localStorage.getItem('sis_custombg') || null,
};

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
(function boot() {
  document.documentElement.setAttribute('data-theme', S.theme);
  updateModeUI();
  generateAnonIdentity();
  updateEphemBadges();
  applyChatBg(S.chatBg);
  loadStickersUI();
  loadNotifBadge();
  drawNoise();

  if (!localStorage.getItem('sis_cgu')) {
    document.getElementById('cguOverlay').style.display = 'flex';
  }

  initCryptoKey().then(function() {
    auth.onAuthStateChanged(function(user) {
      if (user) {
        S.user = user;
        ensureProfile(user).then(function(p) {
          S.profile = p;
          fetchCountryFlag();
          onAppReady();
        });
      } else {
        S.user = null; S.profile = null;
        showPage('pageAuth');
      }
    });
  });
})();

// ─────────────────────────────────────────────
//  NOISE CANVAS
// ─────────────────────────────────────────────
function drawNoise() {
  var canvas = document.getElementById('noiseCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  var img = ctx.createImageData(canvas.width, canvas.height);
  for (var i = 0; i < img.data.length; i += 4) {
    var v = Math.random() * 40;
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
window.addEventListener('resize', drawNoise);

// ─────────────────────────────────────────────
//  CGU
// ─────────────────────────────────────────────
function acceptCGU() {
  localStorage.setItem('sis_cgu', '1');
  document.getElementById('cguOverlay').style.display = 'none';
}

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.auth-view').forEach(function(v) { v.classList.remove('active'); });
  document.getElementById('tab' + cap(tab)).classList.add('active');
  document.getElementById('view' + cap(tab)).classList.add('active');
  hideAuthAlert();
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }

function showAuthAlert(msg, type) {
  var el = document.getElementById('authAlert');
  el.querySelector('.auth-alert-msg').textContent = msg;
  el.className = 'auth-alert ' + (type || 'error');
  el.style.display = 'flex';
}
function hideAuthAlert() {
  document.getElementById('authAlert').style.display = 'none';
}

function setBtnLoading(id, on) {
  var btn = document.getElementById(id);
  if (!btn) return;
  var lbl  = btn.querySelector('.btn-label');
  var spin = btn.querySelector('.spinner');
  if (lbl)  lbl.style.opacity = on ? '0' : '1';
  if (spin) spin.style.display = on ? 'block' : 'none';
  btn.disabled = on;
}

function authErr(code) {
  return AUTH_ERRORS[code] || 'Erreur inattendue (' + code + ').';
}

function signInEmail() {
  var email = val('loginEmail'), pass = val('loginPass');
  if (!email || !pass) return showAuthAlert('Remplis tous les champs.');
  setBtnLoading('btnLogin', true);
  auth.signInWithEmailAndPassword(email, pass)
    .catch(function(e) { showAuthAlert(authErr(e.code)); setBtnLoading('btnLogin', false); });
}

function registerEmail() {
  var pseudo = val('regPseudo'), email = val('regEmail'),
      pass   = val('regPass'),   conf  = val('regPassConfirm');
  if (!pseudo || !email || !pass) return showAuthAlert('Remplis tous les champs.');
  if (pass !== conf) return showAuthAlert('Les mots de passe ne correspondent pas.');
  setBtnLoading('btnRegister', true);
  auth.createUserWithEmailAndPassword(email, pass)
    .then(function(r) { return r.user.updateProfile({ displayName: pseudo }); })
    .catch(function(e) { showAuthAlert(authErr(e.code)); setBtnLoading('btnRegister', false); });
}

function continueAnon() {
  setBtnLoading('btnAnon', true);
  auth.signInAnonymously()
    .catch(function(e) { showAuthAlert(authErr(e.code)); setBtnLoading('btnAnon', false); });
}

function forgotPass() {
  var email = val('loginEmail');
  if (!email) return showAuthAlert("Entre d'abord ton email.");
  auth.sendPasswordResetEmail(email)
    .then(function() { showAuthAlert('Email de réinitialisation envoyé !', 'success'); })
    .catch(function(e) { showAuthAlert(authErr(e.code)); });
}

function signOutUser() {
  if (S.user) {
    db.collection('users').doc(S.user.uid)
      .set({ status: 'offline', lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .catch(function(){});
  }
  S.listeners.forEach(function(u) { u(); });
  S.listeners = [];
  auth.signOut();
  closeAllPanels();
}

// ─────────────────────────────────────────────
//  PROFILE / FIRESTORE
// ─────────────────────────────────────────────
function ensureProfile(user) {
  var ref = db.collection('users').doc(user.uid);
  return ref.get().then(function(snap) {
    if (!snap.exists) {
      var p = {
        uid:         user.uid,
        displayName: user.displayName || S.anonName,
        email:       user.email || null,
        photoURL:    user.photoURL || null,
        role:        'user',
        status:      'online',
        isAnonymous: user.isAnonymous,
        anonEmoji:   user.isAnonymous ? S.anonEmoji : null,
        anonColor:   user.isAnonymous ? S.anonColor : null,
        warnings:    0,
        badge:       null,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen:    firebase.firestore.FieldValue.serverTimestamp(),
      };
      return ref.set(p).then(function() { return p; });
    }
    ref.set({ status: 'online', lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return snap.data();
  });
}

function onAppReady() {
  var p = S.profile, u = S.user;
  renderAvatarEl(document.getElementById('topbarAvatar'), p, u);
  updateStatusRingUI(p && p.status || 'online');
  if (p && (p.role === 'admin' || p.role === 'moderator')) {
    var adminBtn = document.getElementById('adminNavBtn');
    if (adminBtn) adminBtn.style.display = 'flex';
  }
  setupPresence();
  showPage('pageApp');
  switchView('rooms');
  loadRooms();
  requestNotifPermission();
  setTimeout(listenRandomWaiting, 2000);
}

function renderAvatarEl(el, profile, user) {
  if (!el) return;
  if ((user && user.photoURL) || (profile && profile.photoURL)) {
    el.innerHTML = '<img src="' + (user && user.photoURL || profile && profile.photoURL) + '" alt="av" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
    el.style.background = 'none';
  } else if (user && user.isAnonymous && profile && profile.anonEmoji) {
    el.innerHTML = profile.anonEmoji;
    el.style.background = profile.anonColor || '#6c63ff';
  } else {
    el.innerHTML = ((profile && profile.displayName) || 'U')[0].toUpperCase();
    el.style.background = 'var(--grad)';
  }
}

function updateStatusRingUI(status) {
  var ring = document.getElementById('statusRing');
  if (!ring) return;
  ring.className = 'status-ring' + (status !== 'online' ? ' ' + status : '');
}

// ─────────────────────────────────────────────
//  PRÉSENCE
// ─────────────────────────────────────────────
function setupPresence() {
  if (!S.user) return;
  var ref = db.collection('users').doc(S.user.uid);

  // Watch for ban
  var unsub = ref.onSnapshot(function(snap) {
    if (snap.data() && snap.data().banned) signOutUser();
  });
  S.listeners.push(unsub);

  // Heartbeat
  var hb = setInterval(function() {
    ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }, 30000);
  S.listeners.push(function() { clearInterval(hb); });

  window.addEventListener('beforeunload', function() {
    ref.set({ status: 'offline', lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
}

// ─────────────────────────────────────────────
//  IDENTITÉ ANONYME
// ─────────────────────────────────────────────
function generateAnonIdentity() {
  S.anonName  = ANON_ADJ[rnd(ANON_ADJ.length)] + '_' + ANON_NOUN[rnd(ANON_NOUN.length)] + '_' + (Math.floor(Math.random() * 900) + 100);
  S.anonColor = ANON_COLORS[rnd(ANON_COLORS.length)];
  S.anonEmoji = ANON_EMOJIS[rnd(ANON_EMOJIS.length)];
  var avEl = document.getElementById('anonAvatar');
  var nmEl = document.getElementById('anonNameLabel');
  if (avEl) { avEl.textContent = S.anonEmoji; avEl.style.background = S.anonColor; }
  if (nmEl) nmEl.textContent = S.anonName;
}

// ─────────────────────────────────────────────
//  CHIFFREMENT (Web Crypto AES-GCM)
// ─────────────────────────────────────────────
function initCryptoKey() {
  var stored = localStorage.getItem('sis_crypto');
  if (stored) {
    try {
      var raw = JSON.parse(stored);
      return crypto.subtle.importKey('jwk', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt'])
        .then(function(k) { S.cryptoKey = k; })
        .catch(function() { return genNewKey(); });
    } catch(e) { return genNewKey(); }
  }
  return genNewKey();
}

function genNewKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt'])
    .then(function(k) {
      S.cryptoKey = k;
      return crypto.subtle.exportKey('jwk', k);
    }).then(function(exported) {
      localStorage.setItem('sis_crypto', JSON.stringify(exported));
    });
}

function encryptMsg(text) {
  if (!S.cryptoKey) return Promise.resolve(text);
  var iv  = crypto.getRandomValues(new Uint8Array(12));
  var enc = new TextEncoder();
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, S.cryptoKey, enc.encode(text))
    .then(function(buf) {
      var combined = new Uint8Array(12 + buf.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(buf), 12);
      return btoa(String.fromCharCode.apply(null, combined));
    }).catch(function() { return text; });
}

function decryptMsg(cipher) {
  if (!S.cryptoKey || !cipher) return Promise.resolve(cipher);
  try {
    var bytes = Uint8Array.from(atob(cipher), function(c) { return c.charCodeAt(0); });
    var iv    = bytes.slice(0, 12);
    var data  = bytes.slice(12);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, S.cryptoKey, data)
      .then(function(dec) { return new TextDecoder().decode(dec); })
      .catch(function() { return cipher; });
  } catch(e) { return Promise.resolve(cipher); }
}

// ─────────────────────────────────────────────
//  PAYS / DRAPEAU
// ─────────────────────────────────────────────
function fetchCountryFlag() {
  if (S.countryFlag) return;
  fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var code = data.country_code || '';
      if (code.length === 2) {
        S.countryFlag = code.toUpperCase().replace(/./g, function(c) {
          return String.fromCodePoint(c.charCodeAt(0) + 127397);
        });
        localStorage.setItem('sis_flag', S.countryFlag);
      }
    }).catch(function() {});
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
function addNotif(notif) {
  S.notifs.unshift(notif);
  if (S.notifs.length > 50) S.notifs.pop();
  localStorage.setItem('sis_notifs', JSON.stringify(S.notifs));
  loadNotifBadge();
  if (typeof playSfx === 'function') playSfx('notification');
}

function loadNotifBadge() {
  var unread = S.notifs.filter(function(n) { return n.unread; }).length;
  var badge  = document.getElementById('notifCount');
  if (!badge) return;
  if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

function renderNotifList() {
  var list = document.getElementById('notifList');
  if (!list) return;
  if (!S.notifs.length) {
    list.innerHTML = '<div class="empty-state">' + SVG.bell + '<span>Aucune notification</span></div>';
    return;
  }
  list.innerHTML = S.notifs.map(function(n, i) {
    return '<div class="notif-item' + (n.unread ? ' unread' : '') + '" onclick="markNotifRead(' + i + ')">' +
      '<div class="notif-icon">' + SVG.bell + '</div>' +
      '<div class="notif-body"><div class="notif-title">' + esc(n.title || 'Notification') + '</div>' +
      '<div class="notif-sub">' + esc(n.body || '') + '</div></div>' +
      '<span class="notif-time">' + fmtTime(n.time) + '</span></div>';
  }).join('');
}

function markNotifRead(i) {
  S.notifs[i].unread = false;
  localStorage.setItem('sis_notifs', JSON.stringify(S.notifs));
  loadNotifBadge();
  renderNotifList();
}

function clearNotifs() {
  S.notifs = [];
  localStorage.setItem('sis_notifs', '[]');
  loadNotifBadge();
  renderNotifList();
}

function openNotifPanel() {
  renderNotifList();
  openPanel('notifPanel');
  S.notifs.forEach(function(n) { n.unread = false; });
  localStorage.setItem('sis_notifs', JSON.stringify(S.notifs));
  loadNotifBadge();
}

// ─────────────────────────────────────────────
//  MODÉRATION
// ─────────────────────────────────────────────
var msgTimestamps = [];
// ─────────────────────────────────────────────
//  MODÉRATION — Rate limit + Regex + Perspective
// ─────────────────────────────────────────────

// Attributs Perspective à analyser
var PERSPECTIVE_ATTRS = {
  TOXICITY:        {},
  SEVERE_TOXICITY: {},
  SPAM:            {},
  THREAT:          {},
  INSULT:          {},
  PROFANITY:       {},
  IDENTITY_ATTACK: {},
};
var PERSPECTIVE_THRESHOLD = 0.80; // seuil de blocage

// Labels lisibles pour l'utilisateur
var PERSPECTIVE_LABELS = {
  TOXICITY:        'contenu toxique',
  SEVERE_TOXICITY: 'contenu très toxique',
  SPAM:            'spam',
  THREAT:          'menace',
  INSULT:          'insulte',
  PROFANITY:       'langage offensant',
  IDENTITY_ATTACK: 'attaque identitaire',
};

function checkRateLimit() {
  var now = Date.now();
  msgTimestamps = msgTimestamps.filter(function(t) { return now - t < 5000; });
  if (msgTimestamps.length >= 5) return false;
  msgTimestamps.push(now);
  return true;
}

function checkRegexMod(text) {
  for (var i = 0; i < MOD_PATTERNS.length; i++) {
    if (MOD_PATTERNS[i].test(text)) return true;
  }
  return false;
}

function checkSpam(text) {
  var urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount >= 3) return true;
  var words = text.trim().split(/\s+/);
  var unique = {};
  words.forEach(function(w) { unique[w] = true; });
  if (words.length > 10 && Object.keys(unique).length / words.length < 0.4) return true;
  return false;
}

// Appel API Perspective Google
function callPerspective(text) {
  var key = CFG.perspective && CFG.perspective.apiKey;
  if (!key || key === 'VOTRE_CLE_PERSPECTIVE') {
    // Pas de clé configurée — skip l'analyse IA
    return Promise.resolve(null);
  }
  var url = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' + key;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment: { text: text },
      languages: ['fr', 'en'],
      requestedAttributes: PERSPECTIVE_ATTRS,
      doNotStore: true, // on ne stocke pas le texte chez Google
    }),
  }).then(function(r) {
    if (!r.ok) return null; // erreur réseau / quota → on laisse passer
    return r.json();
  }).catch(function() {
    return null; // toujours laisser passer en cas d'erreur
  });
}

// Parse la réponse Perspective et renvoie la raison si flagué
function parsePerspective(data) {
  if (!data || !data.attributeScores) return null;
  var scores = data.attributeScores;
  var flagged = null;
  var maxScore = 0;

  Object.keys(scores).forEach(function(attr) {
    var score = scores[attr].summaryScore.value;
    if (score >= PERSPECTIVE_THRESHOLD && score > maxScore) {
      maxScore = score;
      flagged = attr;
    }
  });

  if (!flagged) return null;
  return {
    attr: flagged,
    score: maxScore,
    label: PERSPECTIVE_LABELS[flagged] || flagged.toLowerCase(),
    pct: Math.round(maxScore * 100),
  };
}

// Pipeline de modération complet
function moderateMessage(text) {
  // 1. Rate limit (synchrone)
  if (!checkRateLimit()) {
    showModWarning('⏳ Trop de messages ! Ralentis.');
    return Promise.resolve(false);
  }

  // 2. Regex fraud/spam (synchrone)
  if (checkSpam(text)) {
    return applyWarning(S.user.uid, 'spam').then(function() { return false; });
  }
  if (checkRegexMod(text)) {
    return applyWarning(S.user.uid, 'contenu interdit').then(function() { return false; });
  }

  // 3. Perspective API (asynchrone — ML)
  return callPerspective(text).then(function(data) {
    var result = parsePerspective(data);
    if (!result) return true; // pas flagué ou API indisponible → OK

    // Logguer dans Firestore pour l'admin
    db.collection('mod_logs').add({
      uid:       S.user.uid,
      text:      text.substring(0, 200),
      attr:      result.attr,
      score:     result.score,
      roomId:    S.currentRoomId || null,
      randomId:  S.randomId || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      action:    'blocked',
    }).catch(function(){});

    // Appliquer le warning
    var reason = result.label + ' (score ' + result.pct + '%)';
    return applyWarning(S.user.uid, reason).then(function() { return false; });
  });
}

function applyWarning(uid, reason) {
  var ref = db.collection('users').doc(uid);
  return ref.get().then(function(snap) {
    var data  = snap.data() || {};
    var count = (data.warnings || 0) + 1;
    var badge = count === 1 ? 'warn-1' : count === 2 ? 'warn-2' : 'warn-3';

    return ref.set({
      warnings:   count,
      badge:      badge,
      lastWarnAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastReason: reason,
    }, { merge: true }).then(function() {
      if (count < 3) {
        showModWarning('⚠️ Avertissement ' + count + '/3 — ' + reason + '. Encore ' + (3 - count) + ' et tu seras banni.');
        addNotif({ title: 'Avertissement ' + count + '/3', body: 'Raison : ' + reason, time: Date.now(), unread: true });
      } else {
        return db.collection('bans').doc(uid).set({
          uid:      uid,
          reason:   reason,
          bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
          auto:     true,
        }).then(function() {
          db.collection('users').doc(uid).set({ banned: true, status: 'offline' }, { merge: true });
          showModWarning('🔴 Tu as été banni automatiquement pour : ' + reason);
          setTimeout(signOutUser, 3000);
        });
      }
    });
  });
}

function showModWarning(msg) {
  var existing = document.querySelector('.mod-warning');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.className = 'mod-warning';
  el.innerHTML = SVG.alert + '<span>' + esc(msg) + '</span>';
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 7000);
}

// ─────────────────────────────────────────────
//  SALONS
// ─────────────────────────────────────────────
function loadRooms() {
  var q    = db.collection('rooms').orderBy('lastMessageAt', 'desc').limit(60);
  var unsub = q.onSnapshot(function(snap) {
    S.allRooms = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    renderRooms(S.allRooms);
  });
  S.listeners.push(unsub);

  // Compteur en ligne
  var onlineUnsub = db.collection('users').where('status', '==', 'online').onSnapshot(function(snap) {
    var el = document.getElementById('randomOnlineCount');
    if (el) el.textContent = snap.size;
    var lbl = document.getElementById('onlineLabel');
    if (lbl) lbl.textContent = snap.size + ' en ligne';
  });
  S.listeners.push(onlineUnsub);
}

function renderRooms(rooms) {
  var list    = document.getElementById('roomsList');
  var pinned  = document.getElementById('pinnedRooms');
  var pLabel  = document.getElementById('pinnedLabel');
  if (!list) return;

  var pinnedRooms = rooms.filter(function(r) { return r.pinned; });
  var normalRooms = rooms.filter(function(r) { return !r.pinned; });

  if (pinnedRooms.length) {
    pLabel.style.display = 'flex';
    pinned.innerHTML = pinnedRooms.map(roomRowHTML).join('');
  } else {
    pLabel.style.display = 'none';
    pinned.innerHTML = '';
  }

  if (!normalRooms.length) {
    list.innerHTML = '<div class="empty-state">' + SVG.chat + '<span>Aucun salon — crées-en un !</span></div>';
    return;
  }
  list.innerHTML = normalRooms.map(roomRowHTML).join('');
}

function roomRowHTML(r) {
  var iconContent = r.photoURL
    ? '<img src="' + r.photoURL + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9px"/>'
    : (CAT_EMOJI[r.category] || '💬');
  return '<div class="room-row' + (S.currentRoomId === r.id ? ' active' : '') + '" onclick="openRoom(\'' + r.id + '\')">' +
    '<div class="room-row-icon">' + iconContent + '</div>' +
    '<div class="room-row-info">' +
      '<div class="room-row-name">' + esc(r.name) + '</div>' +
      '<div class="room-row-last">' + (r.lastMessage ? esc(r.lastMessage.substring(0, 45)) : 'Aucun message') + '</div>' +
    '</div>' +
    '<div class="room-row-meta">' +
      '<span class="room-type-badge ' + (r.type === 'public' ? 'pub' : 'priv') + '">' + (r.type === 'public' ? 'Public' : 'Privé') + '</span>' +
    '</div></div>';
}

function filterRooms(q) {
  renderRooms((S.allRooms || []).filter(function(r) { return r.name.toLowerCase().includes(q.toLowerCase()); }));
}
function filterCat(btn, cat) {
  document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderRooms(cat === 'all' ? S.allRooms : (S.allRooms || []).filter(function(r) { return r.category === cat; }));
}

// ─── Créer salon ─────────────────────────────
function openCreateRoomModal() { showOverlay('createRoomOverlay'); }
function togglePwField(radio) {
  document.getElementById('pwField').style.display = radio.value === 'private' ? 'block' : 'none';
}

function createRoom() {
  var name = val('newRoomName').trim();
  var cat  = val('newRoomCat');
  var type = document.querySelector('input[name="rtype"]:checked').value;
  var pw   = val('newRoomPw').trim();

  if (!name) return toast('Donne un nom au salon.', 'error');
  db.collection('rooms').add({
    name: name, category: cat, type: type,
    password: type === 'private' && pw ? pw : null,
    createdBy: S.user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessage: null, memberCount: 1, pinned: false,
  }).then(function(ref) {
    return db.collection('rooms').doc(ref.id).collection('members').doc(S.user.uid).set({
      uid: S.user.uid, role: 'moderator', joinedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() { return ref.id; });
  }).then(function(id) {
    closeOverlay('createRoomOverlay');
    document.getElementById('newRoomName').value = '';
    openRoom(id);
    toast('Salon créé ! 🎉', 'success');
  }).catch(function() { toast('Erreur création.', 'error'); });
}

// ─── Ouvrir salon ─────────────────────────────
var msgUnsub = null;

function openRoom(roomId) {
  var room = S.allRooms.find(function(r) { return r.id === roomId; });
  if (!room) return;

  if (room.type === 'private' && room.password) {
    var pw = prompt('🔒 Mot de passe du salon :');
    if (pw !== room.password) return toast('Mot de passe incorrect.', 'error');
  }

  S.currentRoomId = roomId;
  S.currentRoom   = room;
  S.currentRoomData = room;
  cancelReply();

  document.getElementById('chatEmpty').style.display  = 'none';
  document.getElementById('chatActive').style.display = 'flex';
  var iconEl = document.getElementById('chatRoomIcon');
  if (iconEl) iconEl.textContent = CAT_EMOJI[room.category] || '💬';
  document.getElementById('chatRoomName').textContent = room.name;
  document.getElementById('chatRoomSub').textContent  = (room.memberCount || 0) + ' membres';

  // Room photo
  var photoEl = document.getElementById('chatRoomPhoto');
  if (photoEl) {
    if (room.photoURL) {
      photoEl.innerHTML = '<img src="' + room.photoURL + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
      photoEl.style.background = 'none';
      photoEl.textContent = '';
    } else {
      photoEl.innerHTML = '';
      photoEl.style.background = '';
      photoEl.textContent = CAT_EMOJI[room.category] || '💬';
    }
  }

  document.querySelectorAll('.room-row').forEach(function(el) { el.classList.remove('active'); });
  var activeEl = document.querySelector('.room-row[onclick*="' + roomId + '"]');
  if (activeEl) activeEl.classList.add('active');

  if (window.innerWidth <= 768) {
    if (window.innerWidth <= 768) { document.getElementById('sidebar').classList.remove('mobile-open'); var bd=document.getElementById('sidebarBackdrop'); if(bd) bd.classList.remove('visible'); }
    document.getElementById('backBtn') && (document.getElementById('backBtn').style.display = 'flex');
  }

  db.collection('rooms').doc(roomId).collection('members').doc(S.user.uid)
    .set({ uid: S.user.uid, role: 'member', joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Update memberCount with real count from members subcollection
  db.collection('rooms').doc(roomId).collection('members').get()
    .then(function(snap) {
      db.collection('rooms').doc(roomId).update({ memberCount: snap.size }).catch(function(){});
    }).catch(function(){});

  // Room photo edit — visible pour mods/admins
  var canMod2 = S.profile && (S.profile.role === 'admin' || S.profile.role === 'moderator');
  var editHint = document.querySelector('.ch-photo-edit');
  if (editHint) editHint.style.display = canMod2 ? 'flex' : 'none';

  loadPinnedBanner(roomId);
  loadRoomMembers(roomId);

  if (msgUnsub) msgUnsub();
  msgUnsub = db.collection('rooms').doc(roomId).collection('messages')
    .orderBy('createdAt', 'asc').limitToLast(100)
    .onSnapshot(function(snap) {
      var now  = Date.now();
      var msgs = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); })
        .filter(function(m) { return !m.expiresAt || m.expiresAt.toMillis() > now; });
      renderMessages(msgs, 'messagesList', roomId);
      snap.docs.forEach(function(d) {
        if (d.data().expiresAt && d.data().expiresAt.toMillis() <= now) d.ref.delete();
      });
    });

  // Typing indicator + scroll button
  listenTyping(roomId);
  setTimeout(setupScrollBtn, 400);
}

function loadRoomMembers(roomId) {
  var unsub = db.collection('users').where('status', '==', 'online').onSnapshot(function(snap) {
    var users = snap.docs.map(function(d) { return d.data(); });
    S.roomMembers[roomId] = users;
    var lbl = document.getElementById('onlineLabel');
    if (lbl) lbl.textContent = users.length + ' en ligne';
    var ol = document.getElementById('onlineList');
    if (ol) {
      ol.innerHTML = users.slice(0, 8).map(function(u) {
        return '<div class="online-avatar" title="' + esc(u.displayName || 'User') + '" style="' + (u.anonColor ? 'background:' + u.anonColor : '') + '">' +
          (u.anonEmoji || (u.displayName || 'U')[0].toUpperCase()) + '</div>';
      }).join('');
    }
  });
  S.listeners.push(unsub);
}

function loadPinnedBanner(roomId) {
  db.collection('rooms').doc(roomId).collection('messages').where('pinned', '==', true).limit(1).get()
    .then(function(snap) {
      var banner = document.getElementById('pinnedBanner');
      if (!banner) return;
      if (snap.empty) { banner.style.display = 'none'; return; }
      banner.style.display = 'flex';
      document.getElementById('pinnedBannerText').textContent = snap.docs[0].data().text || '📎';
    });
}

function closeMobileChat() {
  document.getElementById('chatEmpty').style.display  = 'flex';
  document.getElementById('chatActive').style.display = 'none';
  if (window.innerWidth <= 768) { /* sidebar stays closed on mobile until toggled */ }
  if (document.getElementById('backBtn')) document.getElementById('backBtn').style.display = 'none';
  S.currentRoomId = null; S.currentRoom = null; S.currentRoomData = null;
}

function shareRoom() {
  if (!S.currentRoomId) return;
  var url  = location.origin + location.pathname + '?room=' + S.currentRoomId;
  var name = S.currentRoom && S.currentRoom.name || 'Salon SIS';

  // Web Share API (mobile natif iOS/Android)
  if (navigator.share) {
    navigator.share({ title: name + ' — SIS', text: 'Rejoins le salon ' + name + ' sur SIS !', url: url })
      .catch(function() {}); // user cancelled
    return;
  }

  // Fallback clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(function() { toast('Lien copié ! 🔗', 'success'); })
      .catch(function() { fallbackCopy(url); });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try {
    document.execCommand('copy');
    toast('Lien copié ! 🔗', 'success');
  } catch(e) {
    // Dernier recours: montrer le lien
    showLinkOverlay(text);
  }
  document.body.removeChild(ta);
}

function showLinkOverlay(url) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
  el.innerHTML = '<div style="background:var(--s);border:1px solid var(--bd2);border-radius:14px;padding:24px;max-width:380px;width:100%">' +
    '<div style="font-weight:600;margin-bottom:12px">🔗 Lien du salon</div>' +
    '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:10px;font-size:.82rem;word-break:break-all;color:var(--t2);margin-bottom:14px">' + url + '</div>' +
    '<button onclick="this.closest(\'div[style]\').remove()" style="width:100%;padding:10px;background:var(--grad);border:none;border-radius:8px;color:#fff;font-size:.9rem;cursor:pointer">Fermer</button>' +
    '</div>';
  el.onclick = function(e) { if (e.target === el) el.remove(); };
  document.body.appendChild(el);
}

function scrollToPinned() {
  var el = document.querySelector('.pinned-msg');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openRoomSearch() {
  var bar = document.getElementById('roomSearchBar');
  bar.style.display = bar.style.display === 'none' || !bar.style.display ? 'flex' : 'none';
  if (bar.style.display === 'flex') document.getElementById('roomSearchInput').focus();
}

function searchInRoom(q) {
  if (!q.trim()) { document.querySelectorAll('.msg-row').forEach(function(el) { el.style.opacity = '1'; }); return; }
  document.querySelectorAll('.msg-row').forEach(function(el) {
    var text = (el.querySelector('.msg-text') || el.querySelector('.msg-bubble') || {}).textContent || '';
    el.style.opacity = text.toLowerCase().includes(q.toLowerCase()) ? '1' : '0.2';
  });
}

// ─────────────────────────────────────────────
//  RENDU MESSAGES
// ─────────────────────────────────────────────
function renderMessages(msgs, listId, roomId) {
  var list = document.getElementById(listId);
  if (!list) return;
  var promises = msgs.map(function(msg) {
    var isEncrypted = msg.encrypted && msg.text;
    if (isEncrypted) {
      return decryptMsg(msg.text).then(function(decrypted) {
        return Object.assign({}, msg, { _decrypted: decrypted });
      });
    }
    return Promise.resolve(Object.assign({}, msg, { _decrypted: msg.text || '' }));
  });

  Promise.all(promises).then(function(decryptedMsgs) {
    var html = '';
    var lastDate = '';

    decryptedMsgs.forEach(function(msg) {
      var isOwn = msg.uid === (S.user && S.user.uid);
      var ts   = msg.createdAt && msg.createdAt.toMillis ? msg.createdAt.toMillis() : 0;
      var date = ts ? new Date(ts).toLocaleDateString('fr-FR') : '';
      var time = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      if (date && date !== lastDate) {
        html += '<div class="date-sep"><span>' + date + '</span></div>';
        lastDate = date;
      }

      if (msg.type === 'announcement') {
        html += '<div class="announcement-msg">' + SVG.announce + esc(msg.text || '') + '</div>';
        return;
      }

      var authorName = msg.authorName || 'User';
      var badgeHtml  = buildBadgeHTML(msg.badge);

      // Avatar
      var avatarHtml = '';
      if (!isOwn) {
        var avStyle = msg.anonColor ? 'style="background:' + msg.anonColor + '"' : '';
        var avContent = msg.anonEmoji
          ? msg.anonEmoji
          : msg.authorPhoto
            ? '<img src="' + msg.authorPhoto + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
            : authorName[0].toUpperCase();
        avatarHtml = '<div class="msg-avatar-wrap"><div class="avatar-sm" ' + avStyle + '>' + avContent + '</div>' + badgeHtml + '</div>';
      }

      // Reply
      var replyHtml = '';
      if (msg.replyTo) {
        replyHtml = '<div class="msg-reply-ref">' + SVG.reply + '<div><strong>' + esc(msg.replyTo.authorName || '') + '</strong><span>' + esc((msg.replyTo.text || '').substring(0, 60)) + '</span></div></div>';
      }

      // Contenu
      var contentHtml = '';
      var decrypted = msg._decrypted || '';
      if (msg.type === 'image') {
        contentHtml = '<img src="' + msg.url + '" class="msg-img" onclick="openLightbox(\'' + msg.url + '\')" alt="img"/>';
      } else if (msg.type === 'voice') {
        contentHtml = buildVoiceHTML(msg);
      } else if (msg.type === 'sticker') {
        contentHtml = '<img src="' + msg.url + '" class="msg-sticker" alt="sticker"/>';
      } else if (msg.type === 'gif') {
        contentHtml = '<div class="msg-gif-wrap"><img src="' + msg.url + '" alt="gif" loading="lazy" style="max-width:200px;max-height:180px;border-radius:10px;cursor:zoom-in" onclick="openLightbox(\'' + msg.url + '\')"/></div>';
      } else if (msg.type === 'poll') {
        contentHtml = buildPollHTML(msg, roomId, isOwn);
      } else {
        contentHtml = '<span class="msg-text">' + formatMsgText(decrypted) + '</span>';
      }

      // Éphémère
      var ephemHtml = msg.expiresAt
        ? '<span class="msg-ephem">' + SVG.clock + fmtExpiry(msg.expiresAt.toMillis()) + '</span>'
        : '';

      // Édité
      var editedHtml = msg.edited ? '<span class="msg-edited">modifié</span>' : '';

      // Flag
      var flagHtml = msg.flag ? '<span class="msg-flag">' + msg.flag + '</span>' : '';

      // Lock (chiffré)
      var lockHtml = msg.encrypted ? '<span class="msg-lock">' + SVG.lock + '</span>' : '';

      // Réactions
      var reactsHtml = buildReactionsHTML(msg, roomId);

      // Actions
      var actionsHtml = buildActionsHTML(msg, roomId, isOwn, authorName, decrypted);

      // Build avatar for non-own messages with click handler
      var avatarClickHtml = '';
      if (!isOwn) {
        var avStyle2 = msg.anonColor ? 'background:' + msg.anonColor : '';
        var avInner = msg.anonEmoji
          ? msg.anonEmoji
          : msg.authorPhoto
            ? '<img src="' + msg.authorPhoto + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
            : (authorName[0] || 'U').toUpperCase();
        avatarClickHtml = '<div class="msg-avatar-wrap" onclick="openPublicProfile(\'' + msg.uid + '\')" title="Voir le profil" style="cursor:pointer">' +
          '<div class="avatar-sm"' + (avStyle2 ? ' style="' + avStyle2 + '"' : '') + '>' + avInner + '</div>' +
          badgeHtml +
          '</div>';
      }

      html += '<div class="msg-row' + (isOwn ? ' own' : '') + (msg.pinned ? ' pinned-msg' : '') + '" id="msg_' + msg.id + '">' +
        (!isOwn ? avatarClickHtml : avatarHtml) +
        '<div class="msg-content">' +
          (!isOwn ? '<div class="msg-meta-top"><span class="msg-author-name" onclick="openPublicProfile(\'' + msg.uid + '\')">' + esc(authorName) + '</span></div>' : '') +
          '<div class="msg-bubble">' + replyHtml + contentHtml + actionsHtml + '</div>' +
          '<div class="msg-footer"><span class="msg-time">' + time + '</span>' + flagHtml + editedHtml + lockHtml + ephemHtml + '</div>' +
          reactsHtml +
        '</div>' +
        (isOwn ? avatarHtml : '') +
        '</div>';
    });

    list.innerHTML = html;
    var scroll = list.closest('.messages-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;

    // OG previews (inline, no mutation observer needed)
    if (typeof extractUrls === 'function') {
      list.querySelectorAll('.msg-row:not([data-og])').forEach(function(row) {
        row.setAttribute('data-og','1');
        var textEl = row.querySelector('.msg-text');
        if (!textEl) return;
        var urls = extractUrls(textEl.textContent);
        if (!urls.length) return;
        if (typeof injectOgPreview === 'function') injectOgPreview(row, textEl.textContent, row.classList.contains('own'));
      });
    }

    // Mark read
    if (roomId && S.user) {
      decryptedMsgs.filter(function(m) { return m.uid !== S.user.uid && !(m.readBy && m.readBy.includes(S.user.uid)); })
        .forEach(function(m) {
          db.collection('rooms').doc(roomId).collection('messages').doc(m.id)
            .update({ readBy: firebase.firestore.FieldValue.arrayUnion(S.user.uid) }).catch(function(){});
        });
    }
  });
}

function buildBadgeHTML(badge) {
  if (!badge || !BADGE_MAP[badge]) return '';
  var b = BADGE_MAP[badge];
  return '<div class="mod-badge" style="color:' + b.color + '" title="' + b.label + '">' + b.label[0] + '</div>';
}

function buildVoiceHTML(msg) {
  var bars = Array.from({ length: 22 }, function() {
    return '<div class="voice-bar" style="height:' + (3 + Math.floor(Math.random() * 18)) + 'px"></div>';
  }).join('');
  return '<div class="msg-voice">' +
    '<button class="voice-play-btn" onclick="playVoice(\'' + msg.url + '\',this)">' +
      '<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>' +
    '</button>' +
    '<div class="voice-waveform">' + bars + '</div>' +
    '<span class="voice-dur">' + (msg.duration || '0:00') + '</span>' +
  '</div>';
}

function buildReactionsHTML(msg, roomId) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return '';
  var grouped = {};
  Object.entries(msg.reactions).forEach(function(entry) {
    var uid = entry[0], emoji = entry[1];
    grouped[emoji] = grouped[emoji] || [];
    grouped[emoji].push(uid);
  });
  var rid = (roomId || 'random');
  return '<div class="msg-reactions">' +
    Object.entries(grouped).map(function(entry) {
      var emoji = entry[0], uids = entry[1];
      var mine = S.user && uids.includes(S.user.uid) ? ' mine' : '';
      return '<div class="reaction-chip' + mine + '" data-rid="' + rid + '" data-mid="' + msg.id + '" data-emoji="' + emoji + '" onclick="onReactionChipClick(this)">' + emoji + ' <span>' + uids.length + '</span></div>';
    }).join('') + '</div>';
}

function buildActionsHTML(msg, roomId, isOwn, authorName, decrypted) {
  var canMod = S.profile && (S.profile.role === 'admin' || S.profile.role === 'moderator');
  var rid = roomId || 'random';
  // Use data-* attributes to avoid escaping issues with Firestore IDs and text content
  return '<div class="msg-actions"' +
    ' data-rid="' + rid + '"' +
    ' data-mid="' + msg.id + '"' +
    ' data-own="' + (isOwn ? '1' : '0') + '"' +
    ' data-mod="' + (canMod ? '1' : '0') + '">' +
    '<button class="msg-action" data-action="react" title="Réagir">' + SVG.smile + '</button>' +
    '<button class="msg-action" data-action="reply" title="Répondre">' + SVG.reply + '</button>' +
    '<button class="msg-action" data-action="copy" title="Copier">' + SVG.copy + '</button>' +
    (isOwn
      ? '<button class="msg-action" data-action="edit" title="Modifier">' + SVG.edit + '</button>' +
        '<button class="msg-action danger" data-action="delete" title="Supprimer">' + SVG.trash + '</button>' +
        (canMod ? '<button class="msg-action" data-action="pin" title="Épingler">' + SVG.pin + '</button>' : '')
      : '<button class="msg-action danger" data-action="report" title="Signaler">' + SVG.flag + '</button>'
    ) +
    '</div>';
}

function formatMsgText(text) {
  if (!text) return '';
  // Use renderMarkdown if available (defined in V4.1 section below)
  if (typeof renderMarkdown === 'function') return renderMarkdown(text);
  return esc(text)
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    .replace(/\n/g, '<br/>');
}

function fmtExpiry(ms) {
  var rem = ms - Date.now();
  if (rem <= 0) return 'Expiré';
  var h = Math.floor(rem / 3600000);
  var m = Math.floor((rem % 3600000) / 60000);
  if (h > 24) return Math.floor(h / 24) + 'j';
  if (h > 0)  return h + 'h';
  return m + 'm';
}

// ─────────────────────────────────────────────
//  ENVOI MESSAGE
// ─────────────────────────────────────────────
function sendMessage() {
  if (!S.currentRoomId) return;
  if (S.editingMsgId) { saveEdit(); return; }

  var input = document.getElementById('msgBox');
  var raw   = input.innerText.trim();
  if (!raw) return;

  // Slow mode check (intégré directement, pas de patch)
  if (typeof checkSlowMode === 'function' && !checkSlowMode(S.currentRoomId)) return;

  moderateMessage(raw).then(function(ok) {
    if (!ok) { input.innerText = ''; return; }
    input.innerText = '';
    closeMentionDropdown();

    encryptMsg(raw).then(function(encrypted) {
      var expiresAt = getExpiresAt();
      var senderName = (S.profile && S.profile.displayName) || (S.user && S.user.displayName) || 'User';
      var data = {
        uid:         S.user.uid,
        authorName:  senderName,
        authorPhoto: (S.user && S.user.photoURL) || null,
        anonEmoji:   S.user.isAnonymous ? (S.profile && S.profile.anonEmoji || S.anonEmoji) : null,
        anonColor:   S.user.isAnonymous ? (S.profile && S.profile.anonColor || S.anonColor) : null,
        badge:       S.profile && S.profile.badge || null,
        text:        encrypted,
        encrypted:   !!S.cryptoKey,
        type:        'text',
        flag:        S.countryFlag,
        replyTo:     S.replyTo || null,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt:   expiresAt ? firebase.firestore.Timestamp.fromDate(expiresAt) : null,
        reactions:   {}, readBy: [], pinned: false, edited: false,
      };

      db.collection('rooms').doc(S.currentRoomId).collection('messages').add(data)
        .then(function() {
          return db.collection('rooms').doc(S.currentRoomId).update({
            lastMessage: raw.substring(0, 60),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }).then(function() {
          cancelReply();
          // Son (intégré directement)
          if (typeof playSfx === 'function') playSfx('message');
          // FCM notify (intégré directement)
          if (typeof notifyRoomMembers === 'function') notifyRoomMembers(S.currentRoomId, senderName, raw);
          // Mentions
          var mentions = [];
          var re = /@(\w+)/g, m;
          while ((m = re.exec(raw)) !== null) mentions.push(m[1]);
          if (mentions.length) notifyMentions(mentions, raw);
        }).catch(function() { toast('Erreur envoi.', 'error'); });
    });
  });
}

function notifyMentions(pseudos, text) {
  pseudos.forEach(function(pseudo) {
    addNotif({ title: '@' + pseudo + ' mentionné — ' + (S.currentRoom && S.currentRoom.name || ''), body: text.substring(0, 80), time: Date.now(), unread: true });
  });
}

function onMsgKey(e) {
  var dd = document.getElementById('mentionDropdown');
  if (dd && dd.style.display === 'block') {
    if (e.key === 'ArrowDown') { S.mentionIdx = Math.min(S.mentionIdx + 1, S.mentionResults.length - 1); renderMentionDropdown(); e.preventDefault(); return; }
    if (e.key === 'ArrowUp')   { S.mentionIdx = Math.max(S.mentionIdx - 1, 0); renderMentionDropdown(); e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { selectMention(S.mentionIdx); e.preventDefault(); return; }
    if (e.key === 'Escape') { closeMentionDropdown(); return; }
  }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function onMsgInput() {
  var text = document.getElementById('msgBox').innerText;
  var lastWord = text.split(/\s/).pop();
  if (lastWord.startsWith('@') && lastWord.length > 1) {
    fetchMentionCandidates(lastWord.slice(1).toLowerCase());
  } else {
    closeMentionDropdown();
  }
}

function fetchMentionCandidates(q) {
  var members = Array.isArray(S.roomMembers[S.currentRoomId]) ? S.roomMembers[S.currentRoomId] : [];
  S.mentionResults = members.filter(function(m) { return (m.displayName || '').toLowerCase().includes(q); });
  S.mentionIdx = 0;
  renderMentionDropdown();
}

function renderMentionDropdown() {
  var dd   = document.getElementById('mentionDropdown');
  var list = document.getElementById('mentionList');
  if (!S.mentionResults.length) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  list.innerHTML = S.mentionResults.map(function(u, i) {
    return '<div class="mention-item' + (i === S.mentionIdx ? ' selected' : '') + '" onclick="selectMention(' + i + ')">' +
      '<div class="avatar-xs">' + (u.displayName || 'U')[0].toUpperCase() + '</div>' +
      '<span>' + esc(u.displayName || 'User') + '</span></div>';
  }).join('');
}

function selectMention(i) {
  var user = S.mentionResults[i]; if (!user) return;
  var box  = document.getElementById('msgBox');
  var text = box.innerText;
  var lastAt = text.lastIndexOf('@');
  box.innerText = text.substring(0, lastAt) + '@' + user.displayName + ' ';
  closeMentionDropdown();
  var range = document.createRange(), sel = window.getSelection();
  range.selectNodeContents(box); range.collapse(false);
  sel.removeAllRanges(); sel.addRange(range);
}

function closeMentionDropdown() {
  var dd = document.getElementById('mentionDropdown');
  if (dd) dd.style.display = 'none';
  S.mentionResults = [];
}

// ─────────────────────────────────────────────
//  REPLY / EDIT / DELETE / PIN
// ─────────────────────────────────────────────
function replyToMsg(msgId, authorName, text) {
  S.replyTo = { msgId: msgId, authorName: authorName, text: text };
  document.getElementById('replyStrip').style.display    = 'flex';
  document.getElementById('replyWho').textContent         = authorName;
  document.getElementById('replyPreviewText').textContent = text;
  document.getElementById('msgBox').focus();
}

function cancelReply() {
  S.replyTo = null;
  var rs = document.getElementById('replyStrip');
  if (rs) rs.style.display = 'none';
}

function editMsg(msgId, currentText) {
  S.editingMsgId = msgId;
  var box = document.getElementById('msgBox');
  box.innerText = currentText; box.focus();
}

function saveEdit() {
  var text = document.getElementById('msgBox').innerText.trim();
  if (!text || !S.editingMsgId || !S.currentRoomId) return;
  moderateMessage(text).then(function(ok) {
    if (!ok) { document.getElementById('msgBox').innerText = ''; S.editingMsgId = null; return; }
    encryptMsg(text).then(function(encrypted) {
      db.collection('rooms').doc(S.currentRoomId).collection('messages').doc(S.editingMsgId)
        .update({ text: encrypted, encrypted: true, edited: true })
        .then(function() { document.getElementById('msgBox').innerText = ''; S.editingMsgId = null; });
    });
  });
}

function deleteMsg(roomId, msgId) {
  if (!confirm('Supprimer ce message ?')) return;
  db.collection('rooms').doc(roomId).collection('messages').doc(msgId).delete();
}

function pinMsg(roomId, msgId) {
  var ref = db.collection('rooms').doc(roomId).collection('messages').doc(msgId);
  ref.get().then(function(snap) {
    var pinned = !snap.data().pinned;
    ref.update({ pinned: pinned }).then(function() {
      toast(pinned ? '📌 Message épinglé.' : 'Désépinglé.', 'success');
      loadPinnedBanner(roomId);
    });
  });
}

function copyMsg(text) {
  navigator.clipboard.writeText(text).then(function() { toast('Copié ! 📋', 'success'); });
}

// ─────────────────────────────────────────────
//  RÉACTIONS
// ─────────────────────────────────────────────
function openEmojiPickerFor(e, msgId, roomId) {
  if (e && e.stopPropagation) e.stopPropagation();
  var picker = document.getElementById('emojiPicker');
  var row    = document.getElementById('emojiRow');
  picker.dataset.msgId  = msgId;
  picker.dataset.roomId = roomId || 'random';

  // Remplir les emojis
  row.innerHTML = EMOJIS_REACT.map(function(em) {
    return '<button class="emoji-btn-pick" data-emoji="' + em + '" onclick="onEmojiPickClick(this)">' + em + '</button>';
  }).join('');

  // Afficher temporairement pour mesurer la largeur réelle
  picker.style.visibility = 'hidden';
  picker.style.display = 'flex';
  var pickerW = picker.offsetWidth || 320;
  var pickerH = picker.offsetHeight || 56;
  picker.style.visibility = '';

  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var x = 12, y = vh / 2;

  // Trouver l'élément déclencheur (bouton action ou chip réaction)
  var trigger = e && (e.currentTarget || e.target);
  if (trigger) {
    var rect = trigger.getBoundingClientRect();
    // Centrer horizontalement sur le bouton, rester dans l'écran
    x = Math.max(8, Math.min(rect.left + rect.width / 2 - pickerW / 2, vw - pickerW - 8));
    // Apparaître au-dessus si assez de place, sinon en dessous
    if (rect.top > pickerH + 12) {
      y = rect.top - pickerH - 8;
    } else {
      y = rect.bottom + 8;
    }
    // Garantir visible verticalement
    y = Math.max(8, Math.min(y, vh - pickerH - 8));
  }

  picker.style.left = x + 'px';
  picker.style.top  = y + 'px';

  // Fermer au prochain clic ailleurs
  setTimeout(function() {
    document.addEventListener('click', function closePicker(ev) {
      if (!picker.contains(ev.target)) {
        picker.style.display = 'none';
        document.removeEventListener('click', closePicker);
      }
    });
  }, 50);
}

function onEmojiPickClick(btn) {
  var picker = document.getElementById('emojiPicker');
  var emoji  = btn.dataset.emoji;
  var msgId  = picker.dataset.msgId;
  var roomId = picker.dataset.roomId;
  picker.style.display = 'none';
  addReaction(roomId, msgId, emoji);
}

function onReactionChipClick(el) {
  toggleReaction(el.dataset.rid, el.dataset.mid, el.dataset.emoji);
}

function getDocRef(roomId, msgId) {
  if (roomId === 'random') return S.randomId ? db.collection('random_sessions').doc(S.randomId).collection('messages').doc(msgId) : null;
  return db.collection('rooms').doc(roomId).collection('messages').doc(msgId);
}

function addReaction(roomId, msgId, emoji) {
  document.getElementById('emojiPicker').style.display = 'none';
  var ref = getDocRef(roomId, msgId); if (!ref) return;
  var update = {};
  update['reactions.' + S.user.uid] = emoji;
  ref.update(update);
}

function toggleReaction(roomId, msgId, emoji) {
  var ref = getDocRef(roomId, msgId); if (!ref) return;
  ref.get().then(function(snap) {
    var current = snap.data() && snap.data().reactions && snap.data().reactions[S.user.uid];
    var update = {};
    if (current === emoji) {
      update['reactions.' + S.user.uid] = firebase.firestore.FieldValue.delete();
    } else {
      update['reactions.' + S.user.uid] = emoji;
    }
    ref.update(update);
  });
}

// ─────────────────────────────────────────────
//  MÉDIAS & UPLOAD
// ─────────────────────────────────────────────
function triggerImg()       { document.getElementById('imgInput').click(); }
function triggerRandomImg() { document.getElementById('randomImgInput').click(); }

function handleImgUpload(e) {
  var file = e.target.files[0]; if (!file) return; e.target.value = '';
  toast('Upload en cours...', 'info');
  uploadCloud(file, 'image').then(function(url) { sendMedia('image', url); })
    .catch(function() { toast('Erreur image.', 'error'); });
}

function handleRandomImg(e) {
  var file = e.target.files[0]; if (!file) return; e.target.value = '';
  uploadCloud(file, 'image').then(function(url) { sendRandomMedia('image', url); });
}

function uploadCloud(file, resourceType) {
  var fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CFG.cloudinary.preset);
  return fetch('https://api.cloudinary.com/v1_1/' + CFG.cloudinary.cloud + '/' + (resourceType || 'image') + '/upload', {
    method: 'POST', body: fd
  }).then(function(r) {
    if (!r.ok) throw new Error('Upload failed');
    return r.json();
  }).then(function(d) { return d.secure_url; });
}

function sendMedia(type, url, extra) {
  if (!S.currentRoomId) return Promise.resolve();
  var expiresAt = getExpiresAt();
  var data = Object.assign({
    uid: S.user.uid,
    authorName: (S.profile && S.profile.displayName) || 'User',
    authorPhoto: (S.user && S.user.photoURL) || null,
    anonEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji || S.anonEmoji) : null,
    anonColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor || S.anonColor) : null,
    badge: S.profile && S.profile.badge || null,
    type: type, url: url,
    text: type === 'image' ? '📷 Image' : type === 'voice' ? '🎤 Vocal' : '🎭 Sticker',
    flag: S.countryFlag,
    replyTo: S.replyTo || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: expiresAt ? firebase.firestore.Timestamp.fromDate(expiresAt) : null,
    reactions: {}, readBy: [], pinned: false, encrypted: false,
  }, extra || {});

  return db.collection('rooms').doc(S.currentRoomId).collection('messages').add(data)
    .then(function() {
      return db.collection('rooms').doc(S.currentRoomId).update({
        lastMessage: data.text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }).then(function() { cancelReply(); });
}

// ─────────────────────────────────────────────
//  VOCAL
// ─────────────────────────────────────────────
function toggleVoice() {
  if (S.recording) { sendVoice(); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    S.mediaRec  = new MediaRecorder(stream);
    S.recChunks = []; S.recording = true; S.recSecs = 0;
    S.mediaRec.ondataavailable = function(e) { S.recChunks.push(e.data); };
    S.mediaRec.start();
    document.getElementById('recBar').style.display = 'flex';
    document.getElementById('voiceBtn') && document.getElementById('voiceBtn').classList.add('recording');
    S.recTimer = setInterval(function() {
      S.recSecs++;
      var m = Math.floor(S.recSecs / 60), s = S.recSecs % 60;
      document.getElementById('recTime').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }).catch(function() { toast('Micro refusé.', 'error'); });
}

function sendVoice() {
  if (!S.mediaRec) return;
  clearInterval(S.recTimer); S.recording = false;
  document.getElementById('recBar').style.display = 'none';
  document.getElementById('voiceBtn') && document.getElementById('voiceBtn').classList.remove('recording');
  var secs = S.recSecs;
  S.mediaRec.onstop = function() {
    var blob = new Blob(S.recChunks, { type: 'audio/webm' });
    var dur  = Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + secs % 60;
    uploadCloud(new File([blob], 'voice.webm', { type: 'audio/webm' }), 'video')
      .then(function(url) { sendMedia('voice', url, { duration: dur }); })
      .catch(function() { toast('Erreur vocal.', 'error'); });
    S.mediaRec.stream.getTracks().forEach(function(t) { t.stop(); });
  };
  S.mediaRec.stop();
}

function cancelVoice() {
  clearInterval(S.recTimer);
  if (S.mediaRec) S.mediaRec.stream.getTracks().forEach(function(t) { t.stop(); });
  S.mediaRec = null; S.recording = false; S.recChunks = [];
  document.getElementById('recBar').style.display = 'none';
  document.getElementById('voiceBtn') && document.getElementById('voiceBtn').classList.remove('recording');
}

var activeAudio = {};
function playVoice(url, btn) {
  var wrap = btn.closest ? btn.closest('.msg-voice') : null;
  // Si déjà en lecture → pause
  if (activeAudio[url] && !activeAudio[url].paused) {
    activeAudio[url].pause();
    btn.querySelector('.play-icon').innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    if (wrap) wrap.querySelectorAll('.voice-bar').forEach(function(b) { b.classList.remove('playing'); });
    return;
  }
  // Arrêter tous les autres audios en cours
  Object.keys(activeAudio).forEach(function(k) {
    if (activeAudio[k] && !activeAudio[k].paused) { activeAudio[k].pause(); }
  });
  document.querySelectorAll('.voice-play-btn .play-icon').forEach(function(el) {
    el.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
  });
  document.querySelectorAll('.voice-bar').forEach(function(b) { b.classList.remove('playing'); });
  // Lancer l'audio
  var audio = activeAudio[url] || new Audio(url);
  activeAudio[url] = audio;
  btn.querySelector('.play-icon').innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  if (wrap) wrap.querySelectorAll('.voice-bar').forEach(function(b) { b.classList.add('playing'); });
  audio.play().catch(function() {});
  audio.onended = function() {
    delete activeAudio[url];
    btn.querySelector('.play-icon').innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    if (wrap) wrap.querySelectorAll('.voice-bar').forEach(function(b) { b.classList.remove('playing'); });
  };
}

// ─────────────────────────────────────────────
//  STICKERS
// ─────────────────────────────────────────────
function openStickers()  { document.getElementById('stickerPanel').style.display = 'block'; }
function closeStickers() { document.getElementById('stickerPanel').style.display = 'none'; }

function loadStickersUI() {
  var grid = document.getElementById('stickerGrid');
  if (!grid) return;
  grid.innerHTML = S.stickers.map(function(src, i) {
    return '<img src="' + src + '" class="sticker-img" onclick="sendSticker(\'' + i + '\')" alt="sticker"/>';
  }).join('');
}

function importStickers(e) {
  var files = Array.from(e.target.files);
  var done  = 0;
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      S.stickers.push(ev.target.result);
      done++;
      if (done === files.length) {
        localStorage.setItem('sis_stickers', JSON.stringify(S.stickers));
        loadStickersUI();
        e.target.value = '';
        toast(files.length + ' sticker(s) importé(s) 🎭', 'success');
      }
    };
    reader.readAsDataURL(file);
  });
}

function sendSticker(i) {
  closeStickers();
  sendMedia('sticker', S.stickers[i]);
}

// ─────────────────────────────────────────────
//  LIGHTBOX
// ─────────────────────────────────────────────
function openLightbox(url) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(12px);animation:fadeIn .2s ease';
  el.innerHTML = '<img src="' + url + '" style="max-width:90vw;max-height:90vh;border-radius:14px;object-fit:contain;box-shadow:0 30px 80px rgba(0,0,0,.8)"/>';
  el.onclick = function() { el.remove(); };
  document.body.appendChild(el);
}

// ─────────────────────────────────────────────
//  SIGNALEMENT
// ─────────────────────────────────────────────
var reportTarget = null;
function reportMsg(msgId, authorName) {
  reportTarget = { msgId: msgId, authorName: authorName, context: 'room', roomId: S.currentRoomId };
  document.querySelectorAll('.reason-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('reportDetail').value = '';
  showOverlay('reportOverlay');
}
function reportRandom() {
  reportTarget = { sessionId: S.randomId, context: 'random' };
  showOverlay('reportOverlay');
}
function pickReason(btn) {
  document.querySelectorAll('.reason-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}
function submitReport() {
  var reason = document.querySelector('.reason-btn.active');
  if (!reason) return toast('Choisis une raison.', 'error');
  var detail = document.getElementById('reportDetail').value;
  db.collection('reports').add({
    reportedBy: S.user.uid, reason: reason.textContent, detail: detail,
    target: reportTarget, status: 'pending', needsReview: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }).then(function() {
    closeOverlay('reportOverlay');
    toast('Signalement envoyé ! 🚩', 'success');
  });
}

// ─────────────────────────────────────────────
//  CHAT ALÉATOIRE
// ─────────────────────────────────────────────
function startRandom() {
  document.getElementById('randomIdle').style.display      = 'none';
  document.getElementById('randomSearching').style.display = 'flex';

  db.collection('random_sessions')
    .where('status', '==', 'waiting')
    .where('uid', '!=', S.user.uid)
    .limit(1).get()
    .then(function(snap) {
      var sessionRef;
      if (!snap.empty) {
        sessionRef = snap.docs[0].ref;
        S.randomId = snap.docs[0].id;
        return sessionRef.update({
          peer:      S.user.uid,
          peerName:  (S.profile && S.profile.displayName) || 'Anonyme',
          peerPhoto: (S.user && S.user.photoURL) || null,
          peerEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji || S.anonEmoji) : null,
          peerColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor || S.anonColor) : null,
          status: 'active',
        }).then(function() { return sessionRef; });
      } else {
        return db.collection('random_sessions').add({
          uid:       S.user.uid,
          userName:  (S.profile && S.profile.displayName) || 'Anonyme',
          userPhoto: (S.user && S.user.photoURL) || null,
          userEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji || S.anonEmoji) : null,
          userColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor || S.anonColor) : null,
          status: 'waiting',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }).then(function(ref) { S.randomId = ref.id; return ref; });
      }
    }).then(function(ref) {
      if (S.randomUnsub) S.randomUnsub();
      S.randomUnsub = ref.onSnapshot(function(snap) {
        var data = snap.data();
        if (!data) return endRandom(false);
        if (data.status === 'active') showRandomChat(data);
        if (data.status === 'ended') endRandom(false);
      });
    });
}

function showRandomChat(data) {
  var isHost    = data.uid === (S.user && S.user.uid);
  var peerName  = isHost ? data.peerName  : data.userName;
  var peerEmoji = isHost ? data.peerEmoji : data.userEmoji;
  var peerColor = isHost ? data.peerColor : data.userColor;

  document.getElementById('randomSearching').style.display = 'none';
  document.getElementById('randomChatWrap').style.display  = 'flex';
  document.getElementById('randomPeerName').textContent    = peerName || 'Inconnu';

  var av = document.getElementById('randomPeerAvatar');
  if (peerEmoji) { av.textContent = peerEmoji; av.style.background = peerColor || '#6c63ff'; }
  else av.textContent = (peerName || '?')[0].toUpperCase();

  S.randomActive = true;

  // Messages aléatoires
  if (S.randomUnsub) { S.randomUnsub(); S.randomUnsub = null; }
  var unsub = db.collection('random_sessions').doc(S.randomId).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(function(snap) {
      var msgs = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      renderMessages(msgs, 'randomMsgList', null);
    });
  S.listeners.push(unsub);
}

function sendRandomMsg() {
  var input = document.getElementById('randomMsgBox');
  var text  = input.innerText.trim();
  if (!text || !S.randomId) return;

  moderateMessage(text).then(function(ok) {
    if (!ok) { input.innerText = ''; return; }
    input.innerText = '';
    encryptMsg(text).then(function(encrypted) {
      db.collection('random_sessions').doc(S.randomId).collection('messages').add({
        uid: S.user.uid,
        authorName: (S.profile && S.profile.displayName) || 'Moi',
        text: encrypted, encrypted: !!S.cryptoKey,
        type: 'text', flag: S.countryFlag,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), reactions: {},
      });
    });
  });
}

function onRandomMsgKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRandomMsg(); }
}

function skipRandom() {
  endRandom(true).then(function() { startRandom(); });
}

function endRandom(update) {
  if (S.randomUnsub) { S.randomUnsub(); S.randomUnsub = null; }
  var p = (update !== false && S.randomId)
    ? db.collection('random_sessions').doc(S.randomId).update({ status: 'ended' }).catch(function(){})
    : Promise.resolve();
  S.randomId = null; S.randomActive = false;
  var ml = document.getElementById('randomMsgList'); if (ml) ml.innerHTML = '';
  document.getElementById('randomChatWrap').style.display  = 'none';
  document.getElementById('randomSearching').style.display = 'none';
  document.getElementById('randomIdle').style.display      = 'flex';
  return p;
}

function cancelRandom() { endRandom(true); }

function sendRandomMedia(type, url) {
  if (!S.randomId) return;
  db.collection('random_sessions').doc(S.randomId).collection('messages').add({
    uid: S.user.uid, authorName: (S.profile && S.profile.displayName) || 'Moi',
    type: type, url: url, text: type === 'image' ? '📷' : '🎤',
    flag: S.countryFlag, createdAt: firebase.firestore.FieldValue.serverTimestamp(), reactions: {},
  });
}

// ─────────────────────────────────────────────
//  RECHERCHE GLOBALE
// ─────────────────────────────────────────────
var searchTimer;
function toggleGlobalSearch() {
  var el = document.getElementById('globalSearch');
  el.style.display = el.style.display === 'none' || !el.style.display ? 'block' : 'none';
  if (el.style.display === 'block') document.getElementById('globalSearchInput').focus();
}

function globalSearchMessages(q) {
  clearTimeout(searchTimer);
  if (!q.trim()) { document.getElementById('globalSearchResults').innerHTML = ''; return; }
  searchTimer = setTimeout(function() {
    var results = [];
    var rooms   = S.allRooms.slice(0, 10);
    var promises = rooms.map(function(room) {
      return db.collection('rooms').doc(room.id).collection('messages')
        .orderBy('createdAt', 'desc').limit(30).get()
        .then(function(snap) {
          snap.docs.forEach(function(d) {
            var data = d.data();
            if ((data.text || '').toLowerCase().includes(q.toLowerCase())) {
              results.push(Object.assign({}, data, { id: d.id, roomId: room.id, roomName: room.name }));
            }
          });
        });
    });
    Promise.all(promises).then(function() {
      var html = results.slice(0, 20).map(function(r) {
        return '<div class="search-result-item" onclick="openRoom(\'' + r.roomId + '\')">' +
          '<div class="search-result-room">#' + esc(r.roomName) + '</div>' +
          '<div class="search-result-text">' + esc((r.text || '').substring(0, 80)) + '</div>' +
        '</div>';
      }).join('');
      document.getElementById('globalSearchResults').innerHTML = html || '<div class="empty-state"><span>Aucun résultat</span></div>';
    });
  }, 400);
}

// ─────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────
function adminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  var content = document.getElementById('adminContent');
  if (!content) return;
  if      (tab === 'messages') adminMessages(content);
  else if (tab === 'users')    adminUsers(content);
  else if (tab === 'reports')  adminReports(content);
  else if (tab === 'badges')   adminBadges(content);
  else if (tab === 'rooms')    adminRooms(content);
  else if (tab === 'modlogs')  adminModLogs(content);
  else if (tab === 'stats')    { if (typeof adminStats === 'function') adminStats(content); }
}

function adminMessages(content) {
  content.innerHTML = '<div class="admin-loading">' + SVG.spin + '</div>';
  var html  = '';
  var rooms = S.allRooms.slice(0, 20);
  var ps    = rooms.map(function(room) {
    return db.collection('rooms').doc(room.id).collection('messages')
      .orderBy('createdAt', 'desc').limit(8).get()
      .then(function(snap) {
        snap.docs.forEach(function(d) {
          var m = d.data();
          html += '<div class="admin-row">' +
            '<span class="ar-author">' + esc(m.authorName || '?') + '</span>' +
            '<span class="ar-text">' + esc((m.text || m.type || '').substring(0, 55)) + '</span>' +
            '<span class="ar-room">#' + esc(room.name) + '</span>' +
            '<button class="ar-del" onclick="adminDelMsg(\'' + room.id + '\',\'' + d.id + '\')">' + SVG.trash + '</button>' +
          '</div>';
        });
      });
  });
  Promise.all(ps).then(function() {
    content.innerHTML = html || '<div class="empty-state"><span>Aucun message</span></div>';
    loadAdminStats();
  });
}

function adminDelMsg(roomId, msgId) {
  if (!confirm('Supprimer ?')) return;
  db.collection('rooms').doc(roomId).collection('messages').doc(msgId).delete()
    .then(function() { toast('Supprimé.', 'success'); adminTab('messages'); });
}

// adminUsers remplacé par la version avancée plus bas


function adminBan(uid) {
  if (!confirm('Bannir cet utilisateur ?')) return;
  db.collection('users').doc(uid).set({ banned: true, status: 'offline' }, { merge: true })
    .then(function() { return db.collection('bans').doc(uid).set({ uid: uid, bannedAt: firebase.firestore.FieldValue.serverTimestamp(), bannedBy: S.user.uid }); })
    .then(function() { toast('Utilisateur banni. 🔨', 'success'); adminTab('users'); });
}

function adminReports(content) {
  db.collection('reports').where('status', '==', 'pending').limit(50).get().then(function(snap) {
    if (snap.empty) { content.innerHTML = '<div class="empty-state"><span>Aucun signalement en attente ✅</span></div>'; return; }
    content.innerHTML = snap.docs.map(function(d) {
      var r = d.data();
      return '<div class="admin-row">' +
        '<span class="ar-author">' + esc(r.reason || '?') + '</span>' +
        '<span class="ar-text">' + esc(r.detail || '') + '</span>' +
        '<button class="ar-ok" onclick="resolveReport(\'' + d.id + '\')">✅ Résoudre</button>' +
      '</div>';
    }).join('');
  });
}

function resolveReport(id) {
  db.collection('reports').doc(id).update({ status: 'resolved' })
    .then(function() { toast('Résolu. ✅', 'success'); adminTab('reports'); });
}

function adminBadges(content) {
  db.collection('users').limit(50).get().then(function(snap) {
    content.innerHTML = snap.docs.map(function(d) {
      var u = d.data();
      return '<div class="admin-row">' +
        '<span class="ar-author">' + esc(u.displayName || '?') + '</span>' +
        '<input type="text" id="badge_' + d.id + '" value="' + esc(u.badge || '') + '" placeholder="ex: ✨ VIP" class="ar-input"/>' +
        '<button class="ar-ok" onclick="saveBadge(\'' + d.id + '\')">Enregistrer</button>' +
      '</div>';
    }).join('');
  });
}

function saveBadge(uid) {
  var badge = (document.getElementById('badge_' + uid) && document.getElementById('badge_' + uid).value.trim()) || null;
  db.collection('users').doc(uid).set({ badge: badge }, { merge: true })
    .then(function() { toast('Badge mis à jour. ✨', 'success'); });
}

function adminRooms(content) {
  content.innerHTML = S.allRooms.map(function(r) {
    return '<div class="admin-row">' +
      '<span style="font-size:1.1rem">' + (CAT_EMOJI[r.category] || '💬') + '</span>' +
      '<span class="ar-author">' + esc(r.name) + '</span>' +
      '<span class="ar-badge ' + (r.type === 'public' ? 'pub' : 'priv') + '">' + r.type + '</span>' +
      '<span class="ar-text">' + (r.memberCount || 0) + ' 👤</span>' +
      '<button class="ar-del" onclick="adminDeleteRoom(\'' + r.id + '\')">' + SVG.trash + '</button>' +
    '</div>';
  }).join('');
}

function adminDeleteRoom(id) {
  if (!confirm('Supprimer ce salon ?')) return;
  db.collection('rooms').doc(id).delete()
    .then(function() { toast('Salon supprimé.', 'success'); });
}

// ─── Logs Perspective ─────────────────────────
function adminModLogs(content) {
  content.innerHTML = '<div class="admin-loading">' + SVG.spin + '</div>';
  db.collection('mod_logs').orderBy('createdAt', 'desc').limit(80).get()
    .then(function(snap) {
      if (snap.empty) {
        content.innerHTML = '<div class="empty-state"><span>✅ Aucun contenu flagué pour l\'instant</span></div>';
        return;
      }
      var ATTR_COLORS = {
        TOXICITY: '#ef4444', SEVERE_TOXICITY: '#b91c1c',
        SPAM: '#f59e0b', THREAT: '#dc2626',
        INSULT: '#f97316', PROFANITY: '#8b5cf6',
        IDENTITY_ATTACK: '#ec4899',
      };
      var html = snap.docs.map(function(d) {
        var m = d.data();
        var ts = m.createdAt && m.createdAt.toMillis ? new Date(m.createdAt.toMillis()).toLocaleString('fr-FR') : '';
        var pct = m.score ? Math.round(m.score * 100) : '?';
        var color = ATTR_COLORS[m.attr] || '#6b7280';
        var label = m.attr ? m.attr.replace(/_/g,' ') : '?';
        return '<div class="admin-row">' +
          '<div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">' +
              '<span style="font-size:.76rem;font-weight:600;color:' + color + ';background:' + color + '18;padding:2px 8px;border-radius:12px;border:1px solid ' + color + '44">' +
                label + ' · ' + pct + '%' +
              '</span>' +
              '<span style="font-size:.7rem;color:var(--t3)">' + esc(ts) + '</span>' +
            '</div>' +
            '<div style="font-size:.8rem;color:var(--t2);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
              esc((m.text || '').substring(0, 90)) +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:5px;flex-shrink:0">' +
            (m.uid ? '<button class="ar-del" title="Bannir" onclick="adminBan(\'' + m.uid + '\')">' + SVG.ban + '</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');
      content.innerHTML = html;
    }).catch(function() {
      content.innerHTML = '<div class="empty-state"><span>Erreur chargement des logs</span></div>';
    });
}

function adminAnnounce() {
  var text = prompt("Texte de l'annonce :");
  if (!text || !text.trim()) return;
  var batch = db.batch();
  S.allRooms.forEach(function(room) {
    var ref = db.collection('rooms').doc(room.id).collection('messages').doc();
    batch.set(ref, {
      uid: S.user.uid, authorName: '🛡️ Admin',
      text: text.trim(), type: 'announcement',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
  batch.commit().then(function() { toast('Annonce envoyée ! 📢', 'success'); });
}

function loadAdminStats() {
  Promise.all([
    db.collection('users').get(),
    db.collection('rooms').get(),
    db.collection('bans').get(),
    db.collection('reports').where('status', '==', 'pending').get(),
  ]).then(function(results) {
    var setEl = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('aSUsers',   results[0].size);
    setEl('aSRooms',   results[1].size);
    setEl('aSBans',    results[2].size);
    setEl('aSReports', results[3].size);
  }).catch(function(){});
}

// ─────────────────────────────────────────────
//  PROFIL
// ─────────────────────────────────────────────
function toggleProfileMenu() {
  var panel = document.getElementById('profilePanel');
  if (panel.classList.contains('open')) { closePanel('profilePanel'); return; }
  var p = S.profile, u = S.user;
  renderAvatarEl(document.getElementById('profileAvatar'), p, u);
  var pp = document.getElementById('profilePseudo');
  if (pp) pp.value = (p && p.displayName) || (u && u.displayName) || '';
  setStatusUI((p && p.status) || 'online');
  openPanel('profilePanel');
}

function setStatusUI(status) {
  document.querySelectorAll('.status-opt').forEach(function(b) {
    b.classList.toggle('active', b.dataset.status === status);
  });
}

function setStatus(status) {
  setStatusUI(status);
  if (S.user) {
    db.collection('users').doc(S.user.uid).set({ status: status }, { merge: true });
    updateStatusRingUI(status);
  }
}

function uploadAvatar(e) {
  var file = e.target.files[0]; if (!file) return;
  toast('Upload...', 'info');
  uploadCloud(file, 'image').then(function(url) {
    return S.user.updateProfile({ photoURL: url })
      .then(function() { return db.collection('users').doc(S.user.uid).set({ photoURL: url }, { merge: true }); })
      .then(function() {
        S.profile.photoURL = url;
        renderAvatarEl(document.getElementById('profileAvatar'), S.profile, S.user);
        renderAvatarEl(document.getElementById('topbarAvatar'), S.profile, S.user);
        toast('Photo mise à jour ! 📸', 'success');
      });
  }).catch(function() { toast('Erreur upload.', 'error'); });
}

function saveProfile() {
  var pseudo = val('profilePseudo');
  if (!pseudo) return toast('Pseudo vide.', 'error');
  S.user.updateProfile({ displayName: pseudo })
    .then(function() { return db.collection('users').doc(S.user.uid).set({ displayName: pseudo }, { merge: true }); })
    .then(function() {
      S.profile.displayName = pseudo;
      renderAvatarEl(document.getElementById('topbarAvatar'), S.profile, S.user);
      closePanel('profilePanel');
      toast('Profil mis à jour ! ✅', 'success');
    }).catch(function() { toast('Erreur.', 'error'); });
}

function deleteAccount() {
  if (!confirm('Supprimer ton compte ? Action irréversible.')) return;
  db.collection('users').doc(S.user.uid).set({ deleted: true, status: 'offline' }, { merge: true })
    .then(function() { return S.user.delete(); })
    .catch(function(e) {
      if (e.code === 'auth/requires-recent-login') toast('Reconnecte-toi puis réessaie.', 'error');
    });
}

// ─────────────────────────────────────────────
//  ÉPHÉMÈRES
// ─────────────────────────────────────────────
function openEphemModal() {
  S.ephemPick = S.ephemHours;
  refreshEphemOpts();
  showOverlay('ephemOverlay');
}
function pickEphem(btn) {
  S.ephemPick = parseInt(btn.dataset.val);
  document.querySelectorAll('.ephem-opt').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
}
function refreshEphemOpts() {
  document.querySelectorAll('.ephem-opt').forEach(function(b) {
    b.classList.toggle('selected', parseInt(b.dataset.val) === S.ephemPick);
  });
}
function confirmEphem() {
  S.ephemHours = S.ephemPick;
  localStorage.setItem('sis_ephem', S.ephemHours);
  updateEphemBadges();
  closeOverlay('ephemOverlay');
  toast('Messages éphémères : ' + (S.ephemHours ? S.ephemHours + 'h' : 'Off'), 'success');
}
function updateEphemBadges() {
  var labels = { 0: 'Off', 1: '1h', 6: '6h', 24: '24h', 168: '7j' };
  var lbl = labels[S.ephemHours] || 'Off';
  ['ephemBadge1','ephemBadge2','ephemBadge3'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = lbl;
  });
}
function getExpiresAt() {
  if (!S.ephemHours) return null;
  return new Date(Date.now() + S.ephemHours * 3600000);
}

// ─────────────────────────────────────────────
//  THÈME & APPARENCE
// ─────────────────────────────────────────────
function openThemePanel() { openPanel('themePanel'); }

function setMode(mode) {
  S.theme = mode;
  localStorage.setItem('sis_theme', mode);
  document.documentElement.setAttribute('data-theme', mode);
  updateModeUI();
}
function updateModeUI() {
  var modeDark  = document.getElementById('modeDark');
  var modeLight = document.getElementById('modeLight');
  if (modeDark)  modeDark.classList.toggle('active',  S.theme === 'dark');
  if (modeLight) modeLight.classList.toggle('active', S.theme === 'light');
}

function setChatBg(key) {
  S.chatBg = key;
  localStorage.setItem('sis_chatbg', key);
  applyChatBg(key);
  document.querySelectorAll('.bg-thumb').forEach(function(b) { b.classList.toggle('active', b.dataset.bg === key); });
}

function applyChatBg(key) {
  var zone = document.getElementById('chatZone');
  if (!zone) return;
  // Use data-bg attribute — CSS handles all backgrounds
  zone.removeAttribute('style');
  zone.dataset.bg = key || 'default';
  if (key === 'custom' && S.customBg) {
    zone.style.backgroundImage = 'url(' + S.customBg + ')';
    zone.style.backgroundSize = 'cover';
    zone.style.backgroundPosition = 'center';
  }
}

function uploadChatBg(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    S.customBg = ev.target.result;
    localStorage.setItem('sis_custombg', S.customBg);
    setChatBg('custom');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// ─────────────────────────────────────────────
//  ROUTING
// ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.querySelectorAll('.nav-pill').forEach(function(b) { b.classList.remove('active'); });
  var view = document.getElementById('view' + cap(name));
  if (view) view.classList.add('active');
  var btn = document.querySelector('.nav-pill[data-view="' + name + '"]');
  if (btn) btn.classList.add('active');
  if (name === 'admin') loadAdminStats();
}

// ─────────────────────────────────────────────
//  PANELS & OVERLAYS
// ─────────────────────────────────────────────
function openPanel(id) {
  closeAllPanels();
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
  var bd = document.getElementById('panelBackdrop');
  if (bd) bd.style.display = 'block';
}
function closePanel(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
  var bd = document.getElementById('panelBackdrop');
  if (bd) bd.style.display = 'none';
}
function closeAllPanels() {
  document.querySelectorAll('.side-panel').forEach(function(p) { p.classList.remove('open'); });
  var bd = document.getElementById('panelBackdrop');
  if (bd) bd.style.display = 'none';
}
function showOverlay(id) { var el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeOverlay(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }

// ─────────────────────────────────────────────
//  TOASTS
// ─────────────────────────────────────────────
var TOAST_SVG = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

function toast(msg, type) {
  var wrap = document.getElementById('toastContainer');
  if (!wrap) return;
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.innerHTML = (TOAST_SVG[type || 'info'] || TOAST_SVG.info) + '<span>' + esc(msg) + '</span>';
  wrap.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; el.style.transition = '.35s ease';
    setTimeout(function() { el.remove(); }, 380);
  }, 3500);
}

// ─────────────────────────────────────────────
//  SVG ICONS LIBRARY
// ─────────────────────────────────────────────
var SVG = {
  smile:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  reply:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  copy:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  edit:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  pin:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  flag:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  lock:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  clock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  bell:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  chat:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  announce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>',
  alert:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  ban:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  spin:     '<div style="width:28px;height:28px;border:3px solid var(--bd);border-top-color:var(--br);border-radius:50%;animation:spin .7s linear infinite;margin:20px auto"></div>',
  send:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  mic:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>',
  img:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  search:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  share:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  sun:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>',
  moon:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  plus:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chevL:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
};

// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function val(id)  { return (document.getElementById(id) && document.getElementById(id).value) || ''; }
function rnd(n)   { return Math.floor(Math.random() * n); }
function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────
//  DEEP LINK
// ─────────────────────────────────────────────
var urlParam = new URLSearchParams(location.search).get('room');
if (urlParam) {
  auth.onAuthStateChanged(function(user) {
    if (user) setTimeout(function() { openRoom(urlParam); }, 1200);
  });
}

// ─────────────────────────────────────────────
//  MESSAGE ACTIONS — EVENT DELEGATION
// ─────────────────────────────────────────────
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var actions = btn.closest('.msg-actions');
  if (!actions) return;
  var rid  = actions.dataset.rid;
  var mid  = actions.dataset.mid;
  var row  = document.getElementById('msg_' + mid);
  var action = btn.dataset.action;
  e.stopPropagation();
  if (action === 'react') { openEmojiPickerFor(e, mid, rid); return; }
  var textEl = row && (row.querySelector('.msg-text') || row.querySelector('.msg-bubble'));
  var text   = textEl ? textEl.innerText.trim() : '';
  var authorEl = row && row.querySelector('.msg-author-name');
  var author   = authorEl ? authorEl.textContent.trim() : 'User';
  if (action === 'reply')  replyToMsg(mid, author, text.substring(0, 60));
  if (action === 'copy')   copyMsg(text);
  if (action === 'edit')   editMsg(mid, text);
  if (action === 'delete') deleteMsg(rid, mid);
  if (action === 'pin')    pinMsg(rid, mid);
  if (action === 'report') reportMsg(mid, author);
});

// ─────────────────────────────────────────────
//  LONG PRESS mobile — show actions
// ─────────────────────────────────────────────
var longPressTimer = null;
document.addEventListener('touchstart', function(e) {
  var bubble = e.target.closest('.msg-bubble');
  if (!bubble) return;
  longPressTimer = setTimeout(function() {
    var actions = bubble.querySelector('.msg-actions');
    if (!actions) return;
    // Close any open
    document.querySelectorAll('.msg-actions.touch-open').forEach(function(a) {
      a.classList.remove('touch-open');
    });
    actions.classList.add('touch-open');
    if (navigator.vibrate) navigator.vibrate(30);
  }, 480);
}, { passive: true });
document.addEventListener('touchend', function() { clearTimeout(longPressTimer); }, { passive: true });
document.addEventListener('touchmove', function() { clearTimeout(longPressTimer); }, { passive: true });
// Dismiss on tap outside
document.addEventListener('touchstart', function(e) {
  if (!e.target.closest('.msg-actions') && !e.target.closest('.msg-bubble')) {
    document.querySelectorAll('.msg-actions.touch-open').forEach(function(a) {
      a.classList.remove('touch-open');
    });
  }
}, { passive: true });

// ─────────────────────────────────────────────
//  TYPING INDICATOR
// ─────────────────────────────────────────────
var typingTimer = null, isTyping = false;

function updateTyping() {
  onMsgInput();
  if (!S.user || !S.currentRoomId) return;
  if (!isTyping) {
    isTyping = true;
    db.collection('rooms').doc(S.currentRoomId).collection('typing').doc(S.user.uid)
      .set({ name: (S.profile && S.profile.displayName) || 'User', ts: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(function(){});
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(function() {
    isTyping = false;
    if (S.currentRoomId && S.user) {
      db.collection('rooms').doc(S.currentRoomId).collection('typing').doc(S.user.uid).delete().catch(function(){});
    }
  }, 2500);
}

function listenTyping(roomId) {
  var unsub = db.collection('rooms').doc(roomId).collection('typing')
    .onSnapshot(function(snap) {
      var others = snap.docs.filter(function(d) { return d.id !== (S.user && S.user.uid); });
      var el = document.getElementById('typingBar');
      if (!el) return;
      if (!others.length) { el.style.display = 'none'; return; }
      var names = others.slice(0, 2).map(function(d) { return d.data().name || 'User'; }).join(', ');
      el.style.display = 'flex';
      el.querySelector('.typing-text').textContent = names + (others.length === 1 ? ' écrit...' : ' écrivent...');
    });
  S.listeners.push(unsub);
}

// ─────────────────────────────────────────────
//  SCROLL TO BOTTOM
// ─────────────────────────────────────────────
function scrollToBottom() {
  var scroller = document.getElementById('messagesList');
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

function setupScrollBtn() {
  var scroller = document.getElementById('messagesList');
  var btn = document.getElementById('scrollBottomBtn');
  if (!scroller || !btn) return;
  scroller.addEventListener('scroll', function() {
    var atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100;
    btn.style.opacity = atBottom ? '0' : '1';
    btn.style.pointerEvents = atBottom ? 'none' : 'all';
  });
}

// ─────────────────────────────────────────────
//  SIDEBAR SWIPE (mobile)
// ─────────────────────────────────────────────
var swipeStartX = 0, swipeStartY = 0;
document.addEventListener('touchstart', function(e) {
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', function(e) {
  if (window.innerWidth > 768) return;
  var dx = e.changedTouches[0].clientX - swipeStartX;
  var dy = Math.abs(e.changedTouches[0].clientY - swipeStartY);
  if (dy > 40) return; // vertical scroll, ignore
  var sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (swipeStartX < 32 && dx > 55) { sidebar.classList.add('mobile-open'); var bd=document.getElementById('sidebarBackdrop'); if(bd) bd.classList.add('visible'); }
  if (dx < -55 && sidebar.classList.contains('mobile-open')) { sidebar.classList.remove('mobile-open'); var bd=document.getElementById('sidebarBackdrop'); if(bd) bd.classList.remove('visible'); }
}, { passive: true });

// ─────────────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAllPanels();
    ['ephemOverlay','reportOverlay','createRoomOverlay'].forEach(function(id) { closeOverlay(id); });
    closeStickers();
    var ep = document.getElementById('emojiPicker'); if (ep) ep.style.display = 'none';
    var gs = document.getElementById('globalSearch'); if (gs) gs.style.display = 'none';
  }
});

// ─────────────────────────────────────────────
//  WINDOW EXPORTS (inline onclick handlers)
// ─────────────────────────────────────────────
// EXPORTS: see unified exports block at end of file

// ─────────────────────────────────────────────
//  SIDEBAR TOGGLE (desktop + mobile)
// ─────────────────────────────────────────────
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 768) {
    var isOpen = sidebar.classList.toggle('mobile-open');
    var bd = document.getElementById('sidebarBackdrop');
    if (bd) bd.classList.toggle('visible', isOpen);
  } else {
    sidebar.classList.toggle('desktop-hidden');
  }
}

function closeSidebarMobile() {
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
  var bd = document.getElementById('sidebarBackdrop');
  if (bd) bd.classList.remove('visible');
}

// ─────────────────────────────────────────────
//  PUSH NOTIFICATIONS BROWSER
// ─────────────────────────────────────────────
function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function pushNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body: body, tag: 'sis-notif' }); } catch(e) {}
}

// Écouter les sessions random en attente → notifier
function listenRandomWaiting() {
  if (!S.user) return;
  var first = true;
  var unsub = db.collection('random_sessions').where('status', '==', 'waiting')
    .onSnapshot(function(snap) {
      if (first) { first = false; return; } // skip initial load
      snap.docChanges().forEach(function(change) {
        if (change.type !== 'added') return;
        var data = change.doc.data();
        if (data.uid === S.user.uid) return; // pas soi-même
        var viewRandom = document.getElementById('viewRandom');
        var isOnRandom = viewRandom && viewRandom.classList.contains('active');
        if (!isOnRandom) {
          addNotif({ title: '🎲 Chat Aléatoire', body: 'Quelqu\'un cherche un correspondant !', time: Date.now(), unread: true });
          pushNotif('🎲 SIS', 'Quelqu\'un cherche un chat aléatoire maintenant !');
        }
      });
    });
  S.listeners.push(unsub);
}

// ─────────────────────────────────────────────
//  PHOTO DE PROFIL SALON
// ─────────────────────────────────────────────
function uploadRoomPhoto(e) {
  if (!S.currentRoomId) return;
  var file = e.target.files[0]; if (!file) return; e.target.value = '';
  var canMod = S.profile && (S.profile.role === 'admin' || S.profile.role === 'moderator');
  if (!canMod) return toast('Permission refusée.', 'error');
  toast('Upload photo salon...', 'info');
  uploadCloud(file, 'image').then(function(url) {
    return db.collection('rooms').doc(S.currentRoomId).update({ photoURL: url })
      .then(function() {
        // Update local + UI
        if (S.currentRoom) S.currentRoom.photoURL = url;
        var el = document.getElementById('chatRoomPhoto');
        if (el) { el.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'; }
        toast('Photo du salon mise à jour ! 📸', 'success');
      });
  }).catch(function() { toast('Erreur upload.', 'error'); });
}

// ─────────────────────────────────────────────
//  ADMIN ÉTENDU — Modérateurs
// ─────────────────────────────────────────────
function adminSetRole(uid, role) {
  db.collection('users').doc(uid).set({ role: role }, { merge: true })
    .then(function() { toast('Rôle mis à jour : ' + role, 'success'); adminTab('users'); })
    .catch(function() { toast('Erreur.', 'error'); });
}

function adminUsers(content) {
  db.collection('users').orderBy('displayName').limit(60).get().then(function(snap) {
    var html = snap.docs.map(function(d) {
      var u = d.data();
      var avStyle = u.anonColor ? 'background:' + u.anonColor : 'background:var(--grad)';
      var avContent = u.photoURL
        ? '<img src="' + u.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
        : (u.anonEmoji || (u.displayName || 'U')[0].toUpperCase());
      return '<div class="admin-row">' +
        '<div class="ar-avatar" style="' + avStyle + '">' + avContent + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.displayName || '?') + '</div>' +
          '<div style="font-size:.72rem;color:var(--t2)">' + esc(u.email || 'Anonyme') + '</div>' +
        '</div>' +
        '<select class="ar-input" style="width:100px" onchange="adminSetRole(\'' + d.id + '\',this.value)">' +
          '<option value="user"' + (u.role === 'user' || !u.role ? ' selected' : '') + '>User</option>' +
          '<option value="moderator"' + (u.role === 'moderator' ? ' selected' : '') + '>Modérateur</option>' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option>' +
        '</select>' +
        '<button class="ar-del" title="Bannir" onclick="adminBan(\'' + d.id + '\')">' + SVG.ban + '</button>' +
      '</div>';
    }).join('');
    content.innerHTML = html || '<div class="empty-state"><span>Aucun utilisateur</span></div>';
  });
}

// ─────────────────────────────────────────────
//  EXPORT CHAT
// ─────────────────────────────────────────────
function exportChat() {
  if (!S.currentRoomId) return;
  db.collection('rooms').doc(S.currentRoomId).collection('messages')
    .orderBy('createdAt', 'asc').limit(500).get()
    .then(function(snap) {
      var lines = ['=== Export SIS — ' + (S.currentRoom && S.currentRoom.name || 'Salon') + ' ===', ''];
      snap.docs.forEach(function(d) {
        var m = d.data();
        var ts = m.createdAt && m.createdAt.toMillis ? new Date(m.createdAt.toMillis()).toLocaleString() : '';
        var author = m.authorName || 'User';
        var text = m.type === 'text' ? (m.text || '') : '[' + (m.type || 'media') + ']';
        lines.push('[' + ts + '] ' + author + ': ' + text);
      });
      var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sis-export-' + Date.now() + '.txt';
      a.click();
      toast('Export téléchargé ! 📄', 'success');
    });
}

// ─────────────────────────────────────────────
//  WINDOW EXPORTS — nouveaux
// ─────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════
//  NOUVELLES FONCTIONNALITÉS — SIS V4.1
//  1. Markdown  2. Open Graph  3. GIFs Tenor  4. Sondages
//  5. Slow mode  6. Messages Privés (DM)  7. Profil public
//  8. Stats admin graphiques  9. Sons de notification
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  1. FORMATAGE MARKDOWN
// ─────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  var t = esc(text);
  // Bloc code (```code```)
  t = t.replace(/```([\s\S]*?)```/g, '<pre class="md-pre"><code>$1</code></pre>');
  // Code inline (`code`)
  t = t.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // Gras (**text**)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italique (*text*)
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Barré (~~text~~)
  t = t.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Souligné (__text__)
  t = t.replace(/__(.+?)__/g, '<u>$1</u>');
  // Spoiler ||text||
  t = t.replace(/\|\|(.+?)\|\|/g, '<span class="md-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
  // Lien [texte](url)
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
  // @mentions
  t = t.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  // Sauts de ligne
  t = t.replace(/\n/g, '<br/>');
  return t;
}


// ─────────────────────────────────────────────
//  2. APERÇU OPEN GRAPH (prévisualisation liens)
// ─────────────────────────────────────────────
var ogCache = {}; // cache mémoire URL → metadata

function extractUrls(text) {
  var re = /https?:\/\/[^\s<>"]+/g;
  return (text || '').match(re) || [];
}

function fetchOgData(url) {
  if (ogCache[url] !== undefined) return Promise.resolve(ogCache[url]);
  // On utilise l'API allorigins.win comme proxy CORS gratuit
  var proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
  return fetch(proxy, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var html = data.contents || '';
      var meta = parseOgMeta(html, url);
      ogCache[url] = meta;
      return meta;
    })
    .catch(function() { ogCache[url] = null; return null; });
}

function parseOgMeta(html, url) {
  var get = function(prop) {
    var re = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]+content=["\'](.*?)["\']', 'i');
    var m2 = html.match(re);
    if (m2) return m2[1];
    // Inverse attribute order
    re = new RegExp('<meta[^>]+content=["\'](.*?)["\'][^>]+(?:property|name)=["\']' + prop + '["\']', 'i');
    m2 = html.match(re);
    return m2 ? m2[1] : null;
  };
  var title = get('og:title') || get('twitter:title') || (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || null;
  var desc  = get('og:description') || get('description') || null;
  var img   = get('og:image') || get('twitter:image') || null;
  var site  = get('og:site_name') || null;
  if (!title && !img) return null;
  // Extraire le domaine
  var domainMatch = url.match(/^https?:\/\/([^\/]+)/);
  var domain = domainMatch ? domainMatch[1].replace('www.', '') : url;
  return { title: title, desc: desc, img: img, site: site || domain, url: url };
}

function buildOgPreviewHTML(meta, isOwn) {
  if (!meta) return '';
  var cls = 'og-preview' + (isOwn ? ' own' : '');
  return '<a href="' + meta.url + '" target="_blank" rel="noopener noreferrer" class="' + cls + '">' +
    (meta.img ? '<div class="og-img"><img src="' + meta.img + '" alt="" loading="lazy" onerror="this.parentElement.style.display=\'none\'"/></div>' : '') +
    '<div class="og-info">' +
      '<div class="og-site">' + esc(meta.site) + '</div>' +
      (meta.title ? '<div class="og-title">' + esc(meta.title.substring(0, 100)) + '</div>' : '') +
      (meta.desc  ? '<div class="og-desc">'  + esc(meta.desc.substring(0, 120))  + '</div>' : '') +
    '</div>' +
  '</a>';
}

// Injecter le preview OG dans une bulle après rendu
function injectOgPreview(msgEl, text, isOwn) {
  var urls = extractUrls(text);
  if (!urls.length) return;
  var url = urls[0]; // premier lien seulement
  fetchOgData(url).then(function(meta) {
    if (!meta) return;
    var bubble = msgEl.querySelector('.msg-bubble');
    if (!bubble || bubble.querySelector('.og-preview')) return;
    var div = document.createElement('div');
    div.innerHTML = buildOgPreviewHTML(meta, isOwn);
    bubble.insertBefore(div.firstChild, bubble.querySelector('.msg-actions'));
  });
}

// ─────────────────────────────────────────────
//  3. GIFs TENOR
// ─────────────────────────────────────────────
var TENOR_KEY = 'VOTRE_CLE_TENOR'; // → tenor.com/developer
var gifState = { open: false, results: [], query: '' };

function openGifPanel() {
  gifState.open = !gifState.open;
  var panel = document.getElementById('gifPanel');
  if (!panel) return;
  if (gifState.open) {
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    var gs=document.getElementById('gifSearch'); if(gs){gs.value='';setTimeout(function(){gs.focus();},50);}
    if(TENOR_KEY&&TENOR_KEY!=='VOTRE_CLE_TENOR'){searchGifs('fun');}else{var gg=document.getElementById('gifGrid');if(gg)gg.innerHTML='<div style="padding:16px;text-align:center;color:var(--t2);font-size:.82rem;width:100%">Configure TENOR_KEY pour les GIFs</div>';}
  } else {
    panel.style.display = 'none';
  }
}
function closeGifPanel() {
  gifState.open = false;
  var panel = document.getElementById('gifPanel');
  if (panel) panel.style.display = 'none';
}

function searchGifs(q) {
  var key = TENOR_KEY;
  var url = 'https://tenor.googleapis.com/v2/search?q=' + encodeURIComponent(q) +
    '&key=' + key + '&limit=20&media_filter=gif';
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      gifState.results = data.results || [];
      renderGifGrid();
    })
    .catch(function() {
      // Fallback: montrer message d'erreur
      var grid = document.getElementById('gifGrid');
      if (grid) grid.innerHTML = '<div class="empty-state"><span>Clé Tenor requise. Ajoute TENOR_KEY dans CFG.</span></div>';
    });
}

function onGifSearch(e) {
  var q = e.target.value.trim();
  if (!q) { searchGifs('trending'); return; }
  clearTimeout(gifState._t);
  gifState._t = setTimeout(function() { searchGifs(q); }, 400);
}

function renderGifGrid() {
  var grid = document.getElementById('gifGrid');
  if (!grid) return;
  grid.innerHTML = gifState.results.map(function(r) {
    var url = r.media_formats && r.media_formats.tinygif ? r.media_formats.tinygif.url : '';
    if (!url) return '';
    return '<img class="gif-item" src="' + url + '" alt="gif" loading="lazy" onclick="sendGif(\'' + url + '\')" />';
  }).join('');
}

function sendGif(url) {
  if (!S.currentRoomId && !S.randomActive) return;
  closeGifPanel();
  var data = {
    uid: S.user.uid,
    authorName: (S.profile && S.profile.displayName) || 'User',
    authorPhoto: (S.user && S.user.photoURL) || null,
    anonEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji) : null,
    anonColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor) : null,
    badge: S.profile && S.profile.badge || null,
    type: 'gif',
    url: url,
    flag: S.countryFlag,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    reactions: {}, readBy: [], pinned: false,
  };
  if (S.randomActive && S.randomId) {
    db.collection('random_sessions').doc(S.randomId).collection('messages').add(data);
  } else {
    db.collection('rooms').doc(S.currentRoomId).collection('messages').add(data);
  }
  toast('GIF envoyé ! 🎬', 'success');
}

// ─────────────────────────────────────────────
//  4. SONDAGES
// ─────────────────────────────────────────────
function openPollModal() {
  showOverlay('pollModal');
}

function addPollOption() {
  var list = document.getElementById('pollOptionsList');
  if (!list) return;
  var count = list.querySelectorAll('.poll-opt-input').length;
  if (count >= 8) { toast('Maximum 8 options.', 'warning'); return; }
  var div = document.createElement('div');
  div.className = 'poll-opt-row';
  div.innerHTML = '<input type="text" class="poll-opt-input input-wrap" placeholder="Option ' + (count + 1) + '" style="flex:1;padding:8px 12px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r2);color:var(--t1);font-size:.85rem;outline:none"/>' +
    '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--er);cursor:pointer;padding:4px;display:flex">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>';
  list.appendChild(div);
}

function createPoll() {
  if (!S.currentRoomId) return;
  var question = (document.getElementById('pollQuestion') || {}).value.trim();
  if (!question) { toast('Écris une question.', 'warning'); return; }
  var inputs = document.querySelectorAll('.poll-opt-input');
  var options = Array.from(inputs).map(function(i) { return i.value.trim(); }).filter(Boolean);
  if (options.length < 2) { toast('Minimum 2 options.', 'warning'); return; }

  var pollData = {
    uid: S.user.uid,
    authorName: (S.profile && S.profile.displayName) || 'User',
    type: 'poll',
    question: question,
    options: options,
    votes: {}, // { uid: optionIndex }
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    reactions: {}, readBy: [], pinned: false,
    flag: S.countryFlag,
    anonEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji) : null,
    anonColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor) : null,
    badge: S.profile && S.profile.badge || null,
  };

  db.collection('rooms').doc(S.currentRoomId).collection('messages').add(pollData)
    .then(function() {
      closeOverlay('pollModal');
      toast('Sondage créé ! 📊', 'success');
      // Reset form
      if (document.getElementById('pollQuestion')) document.getElementById('pollQuestion').value = '';
      var list = document.getElementById('pollOptionsList');
      if (list) list.innerHTML = '<div class="poll-opt-row"><input type="text" class="poll-opt-input" placeholder="Option 1" style="flex:1;padding:8px 12px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r2);color:var(--t1);font-size:.85rem;outline:none"/></div><div class="poll-opt-row"><input type="text" class="poll-opt-input" placeholder="Option 2" style="flex:1;padding:8px 12px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r2);color:var(--t1);font-size:.85rem;outline:none"/></div>';
    });
}

function votePoll(roomId, msgId, optionIdx) {
  if (!S.user) return;
  var ref = db.collection('rooms').doc(roomId).collection('messages').doc(msgId);
  var update = {};
  update['votes.' + S.user.uid] = optionIdx;
  ref.update(update)
    .then(function() { toast('Vote enregistré ! ✅', 'success'); })
    .catch(function() { toast('Erreur vote.', 'error'); });
}

function buildPollHTML(msg, roomId, isOwn) {
  if (!msg.options) return '<div>[Sondage invalide]</div>';
  var totalVotes = Object.keys(msg.votes || {}).length;
  var myVote = msg.votes && S.user ? msg.votes[S.user.uid] : undefined;
  var optionsHtml = msg.options.map(function(opt, i) {
    var count = Object.values(msg.votes || {}).filter(function(v) { return v === i; }).length;
    var pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    var voted = myVote === i;
    return '<div class="poll-opt' + (voted ? ' voted' : '') + '" onclick="votePoll(\'' + roomId + '\',\'' + msg.id + '\',' + i + ')">' +
      '<div class="poll-opt-bar" style="width:' + pct + '%"></div>' +
      '<div class="poll-opt-content">' +
        '<span class="poll-opt-text">' + esc(opt) + (voted ? ' ✓' : '') + '</span>' +
        '<span class="poll-opt-pct">' + pct + '% · ' + count + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="poll-bubble">' +
    '<div class="poll-question">📊 ' + esc(msg.question) + '</div>' +
    '<div class="poll-options">' + optionsHtml + '</div>' +
    '<div class="poll-footer">' + totalVotes + ' vote' + (totalVotes !== 1 ? 's' : '') + ' · ' + (myVote !== undefined ? 'Vous avez voté' : 'Tapez pour voter') + '</div>' +
  '</div>';
}

// ─────────────────────────────────────────────
//  5. SLOW MODE
// ─────────────────────────────────────────────
var slowModeTimers = {}; // roomId → lastSentAt

function checkSlowMode(roomId) {
  var room = S.allRooms.find(function(r) { return r.id === roomId; });
  if (!room || !room.slowMode || room.slowMode === 0) return true;
  var lastSent = slowModeTimers[roomId] || 0;
  var now = Date.now();
  var diff = now - lastSent;
  if (diff < room.slowMode * 1000) {
    var wait = Math.ceil((room.slowMode * 1000 - diff) / 1000);
    showModWarning('🐢 Slow mode — attends encore ' + wait + 's');
    return false;
  }
  slowModeTimers[roomId] = now;
  return true;
}

function setSlowMode(roomId, seconds) {
  if (!roomId) return;
  db.collection('rooms').doc(roomId).update({ slowMode: seconds })
    .then(function() {
      toast(seconds ? ('🐢 Slow mode : ' + seconds + 's') : 'Slow mode désactivé.', 'success');
    });
}

function openSlowModeModal() {
  if (!S.currentRoomId) return;
  var room = S.allRooms.find(function(r) { return r.id === S.currentRoomId; });
  var canMod = S.profile && (S.profile.role === 'admin' || S.profile.role === 'moderator');
  if (!canMod) { toast('Réservé aux modérateurs.', 'error'); return; }
  showOverlay('slowModeModal');
  var cur = room && room.slowMode ? room.slowMode : 0;
  document.querySelectorAll('.slowmode-opt').forEach(function(b) {
    b.classList.toggle('selected', parseInt(b.dataset.s) === cur);
  });
}

// ─────────────────────────────────────────────
//  6. MESSAGES PRIVÉS (DM)
// ─────────────────────────────────────────────
function getDmId(uid1, uid2) {
  // ID déterministe : tri alphabétique pour unicité
  return [uid1, uid2].sort().join('_');
}

function openDm(targetUid, targetName, targetPhoto) {
  if (!S.user) return;
  if (targetUid === S.user.uid) { toast('Tu ne peux pas te DM toi-même 😄', 'warning'); return; }
  var dmId = getDmId(S.user.uid, targetUid);
  S.activeDmId = dmId;
  S.activeDmTarget = { uid: targetUid, name: targetName, photo: targetPhoto };

  // Créer/mettre à jour la conversation DM dans Firestore
  db.collection('dms').doc(dmId).set({
    participants: [S.user.uid, targetUid],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Afficher le panel DM
  var panel = document.getElementById('dmPanel');
  if (!panel) return;
  var av = document.getElementById('dmTargetAv');
  var name = document.getElementById('dmTargetName');
  if (av) {
    if (targetPhoto) {
      av.innerHTML = '<img src="' + targetPhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
    } else {
      av.textContent = (targetName || 'U')[0].toUpperCase();
    }
  }
  if (name) name.textContent = targetName || 'Utilisateur';
  openPanel('dmPanel');
  loadDmMessages(dmId);
  toast('💬 DM avec ' + (targetName || 'cet utilisateur'), 'info');
}

function loadDmMessages(dmId) {
  var list = document.getElementById('dmMessages');
  if (!list) return;
  if (S.dmUnsub) S.dmUnsub();
  S.dmUnsub = db.collection('dms').doc(dmId).collection('messages')
    .orderBy('createdAt', 'asc').limit(100)
    .onSnapshot(function(snap) {
      var msgs = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      list.innerHTML = msgs.map(function(m) {
        var isOwn = m.uid === S.user.uid;
        var time = m.createdAt && m.createdAt.toMillis ? new Date(m.createdAt.toMillis()).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : '';
        return '<div class="msg-row' + (isOwn ? ' own' : '') + '">' +
          '<div class="msg-content">' +
            '<div class="msg-bubble"><div class="msg-text">' + renderMarkdown(m.text || '') + '</div></div>' +
            '<div class="msg-footer"><span class="msg-time">' + time + '</span></div>' +
          '</div>' +
        '</div>';
      }).join('');
      list.scrollTop = list.scrollHeight;
      // Marquer comme lu
      snap.docs.forEach(function(d) {
        var m = d.data();
        if (m.uid !== S.user.uid && !(m.readBy || []).includes(S.user.uid)) {
          d.ref.update({ readBy: firebase.firestore.FieldValue.arrayUnion(S.user.uid) }).catch(function(){});
        }
      });
    });
}

function sendDm() {
  if (!S.user || !S.activeDmId) return;
  var input = document.getElementById('dmInput');
  var text = input ? input.value.trim() : '';
  if (!text) return;
  input.value = '';
  moderateMessage(text).then(function(ok) {
    if (!ok) return;
    db.collection('dms').doc(S.activeDmId).collection('messages').add({
      uid: S.user.uid,
      authorName: (S.profile && S.profile.displayName) || 'User',
      text: text,
      type: 'text',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      readBy: [],
    });
    db.collection('dms').doc(S.activeDmId).update({
      lastMessage: text.substring(0, 60),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Notification — uniquement vers le destinataire via FCM
    if (S.activeDmTarget && S.activeDmTarget.uid) {
      notifyDmTarget(S.activeDmTarget.uid, (S.profile && S.profile.displayName) || 'Quelqu\'un', text);
    }
  });
}

function onDmKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDm(); }
}

function closeDmPanel() {
  closePanel('dmPanel');
  if (S.dmUnsub) { S.dmUnsub(); S.dmUnsub = null; }
  S.activeDmId = null;
}

// ─────────────────────────────────────────────
//  7. PROFIL PUBLIC CLIQUABLE
// ─────────────────────────────────────────────
function openPublicProfile(uid) {
  if (!uid) return;
  var panel = document.getElementById('publicProfilePanel');
  if (!panel) return;

  // Reset
  var av = document.getElementById('ppAvatar');
  var name = document.getElementById('ppName');
  var role = document.getElementById('ppRole');
  var badge = document.getElementById('ppBadge');
  var status = document.getElementById('ppStatus');
  var dmBtn = document.getElementById('ppDmBtn');

  if (av) av.textContent = '…';
  if (name) name.textContent = 'Chargement…';
  if (role) role.textContent = '';
  if (badge) badge.textContent = '';

  openPanel('publicProfilePanel');

  db.collection('users').doc(uid).get().then(function(snap) {
    if (!snap.exists) { if (name) name.textContent = 'Utilisateur introuvable'; return; }
    var u = snap.data();

    // Avatar
    if (av) {
      if (u.photoURL) {
        av.innerHTML = '<img src="' + u.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
        av.style.background = 'none';
        av.style.fontSize = '0';
      } else if (u.anonEmoji) {
        av.textContent = u.anonEmoji;
        av.style.background = u.anonColor || 'var(--grad)';
      } else {
        av.textContent = (u.displayName || 'U')[0].toUpperCase();
        av.style.background = 'var(--grad)';
      }
    }

    if (name) name.textContent = u.displayName || 'Anonyme';
    if (role) {
      role.textContent = u.role === 'admin' ? '👑 Admin' : u.role === 'moderator' ? '🛡️ Modérateur' : '👤 Membre';
      role.className = 'pp-role ' + (u.role === 'admin' ? 'role-admin' : u.role === 'moderator' ? 'role-mod' : '');
    }
    if (badge && u.badge) badge.textContent = u.badge;
    if (status) {
      var st = u.status || 'offline';
      status.innerHTML = '<span class="sdot ' + st + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px"></span>' +
        (st === 'online' ? 'En ligne' : st === 'away' ? 'Absent' : st === 'dnd' ? 'Ne pas déranger' : 'Hors ligne');
    }
    // Bouton DM
    if (dmBtn && uid !== S.user.uid) {
      dmBtn.style.display = 'flex';
      dmBtn.onclick = function() {
        closePanel('publicProfilePanel');
        openDm(uid, u.displayName, u.photoURL);
      };
    } else if (dmBtn) {
      dmBtn.style.display = 'none';
    }
  });
}

// ─────────────────────────────────────────────
//  8. STATS ADMIN — GRAPHIQUES CANVAS
// ─────────────────────────────────────────────
function adminStats(content) {
  content.innerHTML = '<div id="statsContainer" style="display:flex;flex-direction:column;gap:20px;padding:8px">' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">' +
      '<div class="stat-card" id="scOnline"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div><div class="stat-num" id="scOnlineVal">…</div><div class="stat-lbl">En ligne</div></div>' +
      '<div class="stat-card" id="scMsg24h"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="stat-num" id="scMsg24hVal">…</div><div class="stat-lbl">Messages / 24h</div></div>' +
      '<div class="stat-card" id="scRooms"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div><div class="stat-num" id="scRoomsVal">…</div><div class="stat-lbl">Salons actifs</div></div>' +
      '<div class="stat-card" id="scBans"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div><div class="stat-num" id="scBansVal">…</div><div class="stat-lbl">Bannis</div></div>' +
    '</div>' +
    '<div style="background:var(--s);border:1px solid var(--bd);border-radius:var(--r2);padding:16px">' +
      '<div style="font-size:.82rem;font-weight:600;margin-bottom:12px">📊 Messages par salon (top 8)</div>' +
      '<canvas id="msgChart" height="180"></canvas>' +
    '</div>' +
    '<div style="background:var(--s);border:1px solid var(--bd);border-radius:var(--r2);padding:16px">' +
      '<div style="font-size:.82rem;font-weight:600;margin-bottom:12px">🤖 Attributs flagués par Perspective</div>' +
      '<canvas id="modChart" height="160"></canvas>' +
    '</div>' +
  '</div>';

  loadStatsData();
}

function loadStatsData() {
  var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };

  Promise.all([
    db.collection('users').where('status', '==', 'online').get(),
    db.collection('bans').get(),
    db.collection('rooms').where('memberCount', '>', 0).get(),
  ]).then(function(results) {
    set('scOnlineVal',  results[0].size);
    set('scBansVal',    results[1].size);
    set('scRoomsVal',   results[2].size);
  });

  // Messages 24h
  var since = new Date(Date.now() - 86400000);
  var roomsToCheck = S.allRooms.slice(0, 12);
  var total24h = 0;
  var roomCounts = {};
  var ps = roomsToCheck.map(function(room) {
    return db.collection('rooms').doc(room.id).collection('messages')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(since))
      .get()
      .then(function(snap) {
        total24h += snap.size;
        roomCounts[room.name] = snap.size;
      });
  });

  Promise.all(ps).then(function() {
    set('scMsg24hVal', total24h);
    drawMsgChart(roomCounts);
  });

  // Modération IA — attributs
  db.collection('mod_logs').orderBy('createdAt', 'desc').limit(200).get()
    .then(function(snap) {
      var attrs = {};
      snap.docs.forEach(function(d) {
        var a = d.data().attr;
        if (a) attrs[a] = (attrs[a] || 0) + 1;
      });
      drawModChart(attrs);
    });
}

function drawMsgChart(roomCounts) {
  var canvas = document.getElementById('msgChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var entries = Object.entries(roomCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8);
  if (!entries.length) { ctx.fillStyle = 'var(--t3)'; ctx.font = '13px Inter'; ctx.fillText('Aucune donnée', 20, 60); return; }

  canvas.width = canvas.offsetWidth || 400;
  var W = canvas.width, H = 180;
  var max = Math.max.apply(null, entries.map(function(e) { return e[1]; })) || 1;
  var barW = Math.floor((W - 40) / entries.length) - 8;
  ctx.clearRect(0, 0, W, H);

  entries.forEach(function(entry, i) {
    var name = entry[0], count = entry[1];
    var x = 20 + i * (barW + 8);
    var barH = Math.max(4, Math.floor(((count / max) * (H - 50))));
    var y = H - 30 - barH;

    // Dégradé violet/bleu
    var grad = ctx.createLinearGradient(x, y, x, y + barH);
    grad.addColorStop(0, '#8B5CF6');
    grad.addColorStop(1, '#4F8EF7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 4) : ctx.fillRect(x, y, barW, barH);
    ctx.fill();

    // Label nombre
    ctx.fillStyle = '#f0f0ff';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(count, x + barW / 2, y - 5);

    // Label nom (tronqué)
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter';
    var label = name.length > 6 ? name.substring(0, 6) + '…' : name;
    ctx.fillText(label, x + barW / 2, H - 10);
  });
}

function drawModChart(attrs) {
  var canvas = document.getElementById('modChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var entries = Object.entries(attrs).sort(function(a, b) { return b[1] - a[1]; });
  if (!entries.length) {
    ctx.fillStyle = '#8888aa'; ctx.font = '13px Inter';
    ctx.fillText('✅ Aucun contenu flagué', 20, 60); return;
  }

  canvas.width = canvas.offsetWidth || 400;
  var W = canvas.width, H = 160;
  var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
  var COLORS = ['#ef4444','#f97316','#eab308','#8b5cf6','#ec4899','#3b82f6','#10b981','#06b6d4'];
  var x = 0, cx = Math.min(W * 0.35, 80), cy = H / 2, r = Math.min(cx - 10, 65);

  ctx.clearRect(0, 0, W, H);
  var angle = -Math.PI / 2;
  entries.forEach(function(entry, i) {
    var slice = (entry[1] / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    angle += slice;
  });

  // Légende
  var legendX = cx * 2 + 20;
  entries.forEach(function(entry, i) {
    var ly = 18 + i * 20;
    if (ly > H - 10) return;
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(legendX, ly - 7, 10, 10, 2) : ctx.fillRect(legendX, ly - 7, 10, 10);
    ctx.fill();
    ctx.fillStyle = '#f0f0ff';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    var label = entry[0].replace(/_/g, ' ').toLowerCase();
    ctx.fillText(label + ' (' + entry[1] + ')', legendX + 14, ly + 2);
  });
}

// ─────────────────────────────────────────────
//  9. SONS DE NOTIFICATION
// ─────────────────────────────────────────────
var SFX = {
  _ctx: null,
  _enabled: JSON.parse(localStorage.getItem('sis_sfx') !== null ? localStorage.getItem('sis_sfx') : 'true'),
};

function getSfxCtx() {
  if (!SFX._ctx) SFX._ctx = new (window.AudioContext || window.webkitAudioContext)();
  return SFX._ctx;
}

function playSfx(type) {
  if (!SFX._enabled) return;
  try {
    var ctx = getSfxCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'message') {
      // Ding doux montant
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.type = 'sine';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'notification') {
      // Double ding
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.type = 'sine';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'join') {
      // Accord montant court
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.type = 'triangle';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.type = 'sawtooth';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch(e) {}
}

function toggleSfx() {
  SFX._enabled = !SFX._enabled;
  localStorage.setItem('sis_sfx', JSON.stringify(SFX._enabled));
  var btn = document.getElementById('sfxToggleBtn');
  if (btn) {
    btn.title = SFX._enabled ? 'Sons activés' : 'Sons désactivés';
    btn.style.color = SFX._enabled ? 'var(--br)' : 'var(--t3)';
  }
  toast(SFX._enabled ? '🔊 Sons activés' : '🔇 Sons désactivés', 'info');
}

// ─────────────────────────────────────────────
//  INTÉGRATION — hooks dans les fonctions existantes
// ─────────────────────────────────────────────




// OG preview après rendu des messages
var _origBuildContentHTML = null;



// ─────────────────────────────────────────────
//  EXPORTS WINDOW
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
//  FIREBASE CLOUD MESSAGING (FCM) — Notifications Push
//  VAPID : BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k
// ═══════════════════════════════════════════════════════════════

var VAPID_KEY = 'BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k';
var fcmMessaging = null;
var fcmToken = null;

// ─── 1. Initialiser FCM ──────────────────────────────────────
function initFCM() {
  if (!('serviceWorker' in navigator) || !firebase.messaging) return;

  // Enregistrer le service worker
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(function(reg) {
      fcmMessaging = firebase.messaging();

      // Lier le SW à FCM
      fcmMessaging.useServiceWorker && fcmMessaging.useServiceWorker(reg);

      // Obtenir le token VAPID
      return fcmMessaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    })
    .then(function(token) {
      if (!token) return;
      fcmToken = token;
      console.log('[FCM] Token obtenu');
      // Sauvegarder le token dans Firestore lié à l'utilisateur
      saveFcmToken(token);
    })
    .catch(function(err) {
      console.warn('[FCM] Erreur init:', err.message);
    });

  // Écouter les messages en premier plan
  if (fcmMessaging) {
    fcmMessaging.onMessage(function(payload) {
      var data  = payload.data || {};
      var notif = payload.notification || {};
      var title = notif.title || data.title || '💬 SIS';
      var body  = notif.body  || data.body  || 'Nouveau message';

      // Afficher dans l'UI (toast + notif interne)
      addNotif({ title: title, body: body, time: Date.now(), unread: true });
      toast(title + ' — ' + body.substring(0, 60), 'info');
      playSfx('notification');
    });
  }

  // Recevoir les messages du SW (clic notif → ouvrir salon)
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'OPEN_ROOM' && event.data.roomId) {
      openRoom(event.data.roomId);
    }
  });
}

// ─── 2. Sauvegarder le token FCM ────────────────────────────
function saveFcmToken(token) {
  if (!S.user || !token) return;
  db.collection('users').doc(S.user.uid).set({
    fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
    fcmUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ─── 3. Supprimer le token FCM (déconnexion) ─────────────────
function removeFcmToken() {
  if (!S.user || !fcmToken) return;
  db.collection('users').doc(S.user.uid).update({
    fcmTokens: firebase.firestore.FieldValue.arrayRemove(fcmToken),
  }).catch(function(){});
  if (fcmMessaging) fcmMessaging.deleteToken().catch(function(){});
  fcmToken = null;
}

// ─── 4. Demander la permission + init ───────────────────────
function requestFcmPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    initFCM();
    return;
  }
  if (Notification.permission === 'denied') return;
  Notification.requestPermission().then(function(perm) {
    if (perm === 'granted') {
      initFCM();
      toast('🔔 Notifications activées !', 'success');
    }
  });
}

// ─── 5. Envoyer une notification FCM via Firestore trigger ───
// (Le vrai envoi se fait côté serveur via Cloud Functions.
//  Ici on écrit dans la collection `fcm_queue` que ta Cloud Function lit.)
function sendFcmNotif(targetUid, title, body, roomId) {
  if (!targetUid || targetUid === (S.user && S.user.uid)) return;
  db.collection('fcm_queue').add({
    targetUid:   targetUid,
    title:       title,
    body:        body,
    roomId:      roomId || null,
    clickAction: '/',
    icon:        '/icon-192.png',
    createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    sent:        false,
  }).catch(function(){});
}

// ─── 6. Notifier les membres d'un salon (nouveau message) ────
function notifyRoomMembers(roomId, senderName, msgText) {
  if (!roomId) return;
  db.collection('rooms').doc(roomId).collection('members').get()
    .then(function(snap) {
      snap.docs.forEach(function(d) {
        var uid = d.id;
        if (uid === S.user.uid) return; // pas soi-même
        sendFcmNotif(
          uid,
          '💬 ' + senderName + ' dans ' + ((S.currentRoom && S.currentRoom.name) || 'le salon'),
          msgText.substring(0, 100),
          roomId
        );
      });
    })
    .catch(function(){});
}

// ─── 7. Notifier pour les DM ─────────────────────────────────
function notifyDmTarget(targetUid, senderName, msgText) {
  sendFcmNotif(
    targetUid,
    '💬 Message privé de ' + senderName,
    msgText.substring(0, 100),
    null
  );
}

// ─── 8. Notifier pour le chat aléatoire ──────────────────────
function notifyRandomWaiting() {
  // Notifier tous les users online qui ne sont pas en random
  db.collection('users').where('status', '==', 'online').limit(20).get()
    .then(function(snap) {
      snap.docs.forEach(function(d) {
        if (d.id === S.user.uid) return;
        sendFcmNotif(
          d.id,
          '🎲 Chat Aléatoire — SIS',
          'Quelqu\'un cherche un correspondant maintenant !',
          null
        );
      });
    }).catch(function(){});
}


// ─────────────────────────────────────────────
//  PANEL MEMBRES DU SALON (style Facebook)
// ─────────────────────────────────────────────
var membersUnsub = null;

function openMembersPanel() {
  if (!S.currentRoomId) return;
  listenRoomMembersPanel(S.currentRoomId);
  openPanel('membersPanel');
}

function closeMembersPanel() {
  closePanel('membersPanel');
  if (membersUnsub) { membersUnsub(); membersUnsub = null; }
}

function listenRoomMembersPanel(roomId) {
  if (membersUnsub) membersUnsub();
  var list = document.getElementById('membersList');
  if (list) list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t2)">Chargement…</div>';

  membersUnsub = db.collection('rooms').doc(roomId).collection('members')
    .onSnapshot(function(snap) {
      var uids = snap.docs.map(function(d) { return { uid: d.id, role: d.data().role || 'member' }; });
      if (!uids.length) {
        if (list) list.innerHTML = '<div class="empty-state"><span>Aucun membre</span></div>';
        return;
      }
      // Fetch user profiles for each member
      var promises = uids.map(function(m) {
        return db.collection('users').doc(m.uid).get().then(function(snap2) {
          if (!snap2.exists) return null;
          return Object.assign({}, snap2.data(), { uid: m.uid, memberRole: m.role });
        });
      });
      Promise.all(promises).then(function(members) {
        members = members.filter(Boolean);
        // Sort: admins first, then mods, then members
        var roleOrder = { admin: 0, moderator: 1, member: 2 };
        members.sort(function(a, b) {
          var ra = roleOrder[a.memberRole] !== undefined ? roleOrder[a.memberRole] : 3;
          var rb = roleOrder[b.memberRole] !== undefined ? roleOrder[b.memberRole] : 3;
          return ra - rb;
        });
        renderMembersPanel(members, roomId);
        // Update subtitle count
        var sub = document.getElementById('chatRoomSub');
        if (sub) sub.textContent = members.length + ' membres';
      });
    });
}

function renderMembersPanel(members, roomId) {
  var list = document.getElementById('membersList');
  if (!list) return;
  var html = members.map(function(u) { return memberItemHTML(u, roomId); }).join('');
  list.innerHTML = html || '<div class="empty-state"><span>Aucun membre</span></div>';
}

function memberItemHTML(u, roomId) {
  var isMe = S.user && u.uid === S.user.uid;
  var statusColor = { online: '#10b981', away: '#f59e0b', dnd: '#ef4444', offline: '#6b7280' };
  var st = u.status || 'offline';
  var dotColor = statusColor[st] || statusColor.offline;
  var roleIcon = u.memberRole === 'admin' ? '👑' : u.memberRole === 'moderator' ? '🛡️' : '';
  var roleLabel = u.memberRole === 'admin' ? 'Admin' : u.memberRole === 'moderator' ? 'Modérateur' : '';
  var statusLabel = st === 'online' ? 'En ligne' : st === 'away' ? 'Absent' : st === 'dnd' ? 'Ne pas déranger' : 'Hors ligne';
  var avStyle = u.anonColor ? 'background:' + u.anonColor : '';
  var avInner = u.photoURL
    ? '<img src="' + u.photoURL + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
    : (u.anonEmoji || (u.displayName || 'U')[0].toUpperCase());
  var safeUid = u.uid;
  var safeName = (u.displayName || 'User').replace(/'/g, "\\'");
  var safePhoto = (u.photoURL || '').replace(/'/g, "\\'");
  var dmBtn = (!isMe)
    ? '<button class="member-dm-btn" onclick="event.stopPropagation();closePanel(\'membersPanel\');openDm(\'' + safeUid + '\',\'' + safeName + '\',\'' + safePhoto + '\')" title="DM">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> DM' +
      '</button>'
    : '';
  return '<div class="member-item" onclick="openPublicProfile(\'' + safeUid + '\')">' +
    '<div class="member-avatar">' +
      '<div class="member-av"' + (avStyle ? ' style="' + avStyle + '"' : '') + '>' + avInner + '</div>' +
      '<div class="member-status-dot" style="background:' + dotColor + '"></div>' +
    '</div>' +
    '<div class="member-info">' +
      '<div class="member-name">' +
        '<span>' + esc(u.displayName || 'Anonyme') + '</span>' +
        (isMe ? '<span class="member-you">Vous</span>' : '') +
        (roleIcon ? '<span class="member-role-icon" title="' + roleLabel + '">' + roleIcon + '</span>' : '') +
      '</div>' +
      '<div class="member-sub">' + esc(roleLabel || statusLabel) + '</div>' +
    '</div>' +
    dmBtn +
  '</div>';
}


// ═══════════════════════════════════════════════════════════════
//  EXPORTS UNIFIÉS — Toutes les fonctions exposées au HTML
// ═══════════════════════════════════════════════════════════════
Object.assign(window, {
  // CGU
  acceptCGU,
  // Auth
  switchAuthTab, signInEmail, registerEmail, continueAnon, forgotPass, signOutUser,
  generateAnonIdentity,
  // App
  switchView, showPage,
  // Panels
  openPanel, closePanel, closeAllPanels, showOverlay, closeOverlay,
  toggleProfileMenu, openNotifPanel, openThemePanel,
  // Profil
  setStatus, uploadAvatar, saveProfile, deleteAccount,
  markNotifRead, clearNotifs,
  // Thème
  setMode, setChatBg, uploadChatBg,
  // Rooms
  openCreateRoomModal, togglePwField, createRoom,
  filterRooms, filterCat, openRoom, closeMobileChat, shareRoom, scrollToPinned,
  openRoomSearch, searchInRoom,
  // Messages
  sendMessage, onMsgKey, onMsgInput, selectMention,
  replyToMsg, cancelReply, editMsg, deleteMsg, pinMsg, copyMsg,
  openEmojiPickerFor, addReaction, toggleReaction,
  onEmojiPickClick, onReactionChipClick,
  // Media
  triggerImg, handleImgUpload, triggerRandomImg, handleRandomImg,
  // Vocal
  toggleVoice, sendVoice, cancelVoice, playVoice,
  // Stickers
  openStickers, closeStickers, importStickers, sendSticker,
  // Lightbox
  openLightbox,
  // Report
  reportMsg, reportRandom, pickReason, submitReport,
  // Random
  startRandom, cancelRandom, skipRandom, endRandom, sendRandomMsg, onRandomMsgKey,
  // Recherche
  toggleGlobalSearch, globalSearchMessages,
  // Ephem
  openEphemModal, pickEphem, confirmEphem,
  // Admin
  adminTab, adminAnnounce, adminDelMsg, adminBan, resolveReport, saveBadge, adminDeleteRoom,
  adminModLogs, adminSetRole, loadAdminStats,
  // Utils
  scrollToBottom, updateTyping, fallbackCopy, showLinkOverlay, toggleSidebar,
  uploadRoomPhoto, exportChat,
  listenRandomWaiting, pushNotif, requestNotifPermission,
  // V4.1
  renderMarkdown,
  fetchOgData, injectOgPreview,
  openGifPanel, closeGifPanel, searchGifs, onGifSearch, sendGif,
  openPollModal, addPollOption, createPoll, votePoll,
  openSlowModeModal, setSlowMode, checkSlowMode,
  openDm, sendDm, onDmKey, closeDmPanel,
  openPublicProfile,
  adminStats, loadStatsData, drawMsgChart, drawModChart,
  playSfx, toggleSfx,
  // FCM
  initFCM, requestFcmPermission, removeFcmToken,
  sendFcmNotif, notifyRoomMembers, notifyDmTarget,
  // Membres panel
  openMembersPanel, closeMembersPanel,
  closeSidebarMobile,
});
