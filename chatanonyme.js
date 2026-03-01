/* ═══════════════════════════════════════════════
   SIS V3 — chatanonyme.js
   Say It Safely · Full Logic
   Firebase + Cloudinary + ipapi.co + Perspective API
   E2E Encryption · Auto-Moderation · Push Notifications
═══════════════════════════════════════════════ */

// ════════════════════════════════════════════
//  🔧 CONFIG — REMPLACE CES VALEURS
// ════════════════════════════════════════════
const CFG = {
  firebase: {
    apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
    authDomain:        "chat-anonyme.firebaseapp.com",
    databaseURL:       "https://chat-anonyme-default-rtdb.firebaseio.com",
    projectId:         "chat-anonyme",
    storageBucket:     "chat-anonyme.firebasestorage.app",
    messagingSenderId: "93366459642",
    appId:             "1:93366459642:web:a2421c9478909b33667d43",
    measurementId:     "G-MF8RGP29LN",
    vapidKey:          "BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k",
  },
  cloudinary: {
    cloud:  "duddyzckz",
    preset: "ml_defaulte",
  },
  perspective: {
    key: "VOTRE_PERSPECTIVE_API_KEY", // optionnel — https://perspectiveapi.com
  },
};
// ── Firebase imports ─────────────────────────
import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, sendPasswordResetEmail,
  updateProfile, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, arrayUnion, increment, Timestamp,
  deleteField, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Init ──────────────────────────────────────
const fbApp  = initializeApp(CFG.firebase);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);
let messaging;
try { messaging = getMessaging(fbApp); } catch(e) { /* SW not ready */ }

// ── Helper pour sécuriser la lecture du LocalStorage ──
function safeParse(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`[SIS] Erreur lors de la lecture de ${key} dans le cache. Reset appliqué.`);
    return fallback;
  }
}

// ════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════
const S = {
  // Auth
  user:        null,
  profile:     null,

  // Prefs
  lang:        localStorage.getItem('sis_lang')  || 'fr',
  theme:       localStorage.getItem('sis_theme') || 'dark',
  ephemHours:  parseInt(localStorage.getItem('sis_ephem') || '0'),
  ephemPick:   0,
  chatBg:      localStorage.getItem('sis_chatbg') || 'default',

  // Chat
  currentRoomId:   null,
  currentRoom:     null,
  replyTo:         null,
  editingMsgId:    null,
  allRooms:        [],
  roomMembers:     {},

  // Listeners (unsubscribe fns)
  listeners:   [],

  // Recording
  recording:   false,
  mediaRec:    null,
  recChunks:   [],
  recTimer:    null,
  recSecs:     0,

  // Random chat
  randomId:    null,
  randomUnsub: null,
  randomActive:false,

  // Mentions
  mentionQuery:   '',
  mentionResults: [],
  mentionIdx:     0,

  // Moderation
  warnings:    {},  // uid → count

  // Anon identity
  anonName:    '',
  anonColor:   '#6c63ff',
  anonEmoji:   '🎭',

  // Stickers & Notifs sécurisés
  stickers:    safeParse('sis_stickers', []),
  notifs:      safeParse('sis_notifs', []),

  // Country flag cache
  countryFlag: localStorage.getItem('sis_flag') || '',

  // Crypto keys
  cryptoKey:   null,
};
// ════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════
const EMOJIS   = ['❤️','😂','😮','😢','😡','👍','🔥','💯','🎉','👀'];
const CAT_EMOJI= { general:'💬', gaming:'🎮', tech:'💻', music:'🎵', sport:'⚽', education:'📚', manga:'🗾' };

const ANON_ADJ  = ['cosmic','shadow','silent','ghost','crystal','neon','mystic','void','stellar','frozen','burning','echo','cyber','phantom','glitch'];
const ANON_NOUN = ['wave','storm','orbit','drift','pulse','spark','flare','veil','shade','mist','cipher','specter','rogue','flux','nova'];
const ANON_EMOJIS = ['🎭','🦊','🐺','🦝','🦁','🐯','🦋','🌊','🔮','💫','🌙','⚡','🎲','🌀','🧿','🦄','🐉','🌈','🎪','🧬','👾','🤖'];
const ANON_COLORS = ['#6c63ff','#f97316','#06b6d4','#10b981','#f43f5e','#8b5cf6','#eab308','#ec4899','#14b8a6','#3b82f6','#84cc16','#a855f7'];

// Moderation patterns
const MOD_PATTERNS = {
  porn:    [/pornhub/i, /xvideos/i, /xnxx/i, /\.xxx/i, /onlyfans/i, /\bporn\b/i, /\bsex\s*tape/i],
  phishing:[/bit\.ly\/[a-z0-9]+$/i, /tinyurl\.com/i, /free.*bitcoin/i, /click.*here.*win/i, /verify.*account.*now/i, /paypal.*verify/i, /bank.*login/i],
  illegal: [/\bbuy.*drugs?\b/i, /\bweed.*delivery\b/i, /\bweapon.*sell\b/i, /\bfake.*id\b/i, /\bchild.*porn/i, /\bcp\b.*\bsell/i],
  spam:    null, // handled by rate limiting
  harass:  null, // handled by Perspective API
};

// ════════════════════════════════════════════
//  EXPORT GLOBAL (Déplacé ici pour garantir l'accès au HTML)
// ════════════════════════════════════════════
Object.assign(window, {
  acceptCGU, openCGU,
  switchAuthTab, signInEmail, registerEmail, continueAnon, forgotPass, signOutUser,
  generateAnonIdentity,
  openEphemModal, pickEphem, confirmEphem,
  toggleLang, openThemePanel, setMode, setChatBg, uploadChatBg,
  openNotifPanel, markNotifRead, clearNotifs,
  toggleProfileMenu, setStatus, uploadAvatar, saveProfile, deleteAccount,
  switchView, closeAllPanels, closePanel, openPanel,
  openCreateRoomModal, togglePwField, createRoom,
  filterRooms, filterCat, openRoom, closeMobileChat, shareRoom, openRoomInfo,
  openRoomSearch, closeRoomSearch, searchInRoom, scrollToPinned,
  sendMessage, onMsgKey, onMsgInput, selectMention,
  replyToMsg, cancelReply,
  editMsg, deleteMsg, pinMsg, copyMsg,
  openEmojiPickerFor, addReaction, toggleReaction,
  triggerImg, handleImgUpload, triggerRandomImg, handleRandomImg,
  toggleVoice, sendVoice, cancelVoice, playVoice,
  openStickers, closeStickers, importStickers, sendSticker,
  openLightbox,
  reportMsg, reportRandom, pickReason, submitReport,
  startRandom, cancelRandom, skipRandom, endRandom, sendRandomMsg, onRandomMsgKey,
  toggleGlobalSearch, globalSearchMessages,
  adminTab, adminAnnounce, adminDelMsg, adminBan, resolveReport, saveBadge, adminDeleteRoom,
  showOverlay, closeOverlay,
  toggleGlobalSearch,
});
// ════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════
(async function boot() {
  // Apply saved prefs
  document.documentElement.setAttribute('data-theme', S.theme);
  document.documentElement.setAttribute('data-lang', S.lang);
  updateModeUI();
  updateLangBtn();
  applyLang();
  generateAnonIdentity();
  updateEphemBadges();
  applyChatBg(S.chatBg);
  loadStickersUI();
  loadNotifBadge();

  // Noise canvas
  drawNoise();

  // CGU check
  if (!localStorage.getItem('sis_cgu')) {
    document.getElementById('cguOverlay').style.display = 'flex';
    document.getElementById('cguCheckbox').addEventListener('change', e => {
      document.getElementById('cguAcceptBtn').disabled = !e.target.checked;
    });
  }

  // Auth listener
  onAuthStateChanged(auth, async user => {
    if (user) {
      S.user = user;
      S.profile = await ensureProfile(user);
      await initCryptoKey();
      await fetchCountryFlag();
      onAppReady();
    } else {
      S.user = null; S.profile = null;
      showPage('pageAuth');
    }
  });
})();

// ── Noise canvas ──────────────────────────────
function drawNoise() {
  const canvas = document.getElementById('noiseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ════════════════════════════════════════════
//  CGU
// ════════════════════════════════════════════
function acceptCGU() {
  localStorage.setItem('sis_cgu', '1');
  document.getElementById('cguOverlay').style.display = 'none';
}
function openCGU() {
  document.getElementById('cguOverlay').style.display = 'flex';
  document.getElementById('cguCheckbox').checked = false;
  document.getElementById('cguAcceptBtn').disabled = true;
}
// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  document.getElementById('tab' + cap(tab)).classList.add('active');
  document.getElementById('view' + cap(tab)).classList.add('active');
  hideAuthAlert();
}
function cap(s) { return s[0].toUpperCase() + s.slice(1); }

function showAuthAlert(msg, type = 'error') {
  const el = document.getElementById('authAlert');
  document.getElementById('authAlertMsg').textContent = msg;
  el.className = `auth-alert ${type}`;
  el.style.display = 'flex';
}
function hideAuthAlert() {
  document.getElementById('authAlert').style.display = 'none';
}

function setBtnLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const lbl = btn.querySelector('.btn-label');
  const spin = btn.querySelector('.spinner');
  if (lbl)  lbl.style.opacity = on ? '0' : '1';
  if (spin) spin.style.display = on ? 'block' : 'none';
  btn.disabled = on;
}

const AUTH_ERRORS = {
  'auth/invalid-credential':    { fr: 'Email ou mot de passe incorrect.', en: 'Invalid email or password.' },
  'auth/user-not-found':        { fr: 'Aucun compte trouvé.',             en: 'No account found.' },
  'auth/wrong-password':        { fr: 'Mot de passe incorrect.',          en: 'Wrong password.' },
  'auth/email-already-in-use':  { fr: 'Email déjà utilisé.',             en: 'Email already in use.' },
  'auth/weak-password':         { fr: 'Mot de passe trop court (6+ car.)',en: 'Password too short (6+ chars).' },
  'auth/invalid-email':         { fr: 'Email invalide.',                  en: 'Invalid email.' },
  'auth/network-request-failed':{ fr: 'Erreur réseau.',                   en: 'Network error.' },
};
function authErr(code) {
  return AUTH_ERRORS[code]?.[S.lang] || t('Erreur inattendue.', 'Unexpected error.');
}

async function signInEmail() {
  const email = v('loginEmail'), pass = v('loginPass');
  if (!email || !pass) return showAuthAlert(t('Remplis tous les champs.', 'Fill all fields.'));
  setBtnLoading('btnLogin', true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    showAuthAlert(authErr(e.code));
    setBtnLoading('btnLogin', false);
  }
}
async function registerEmail() {
  const pseudo = v('regPseudo'), email = v('regEmail'),
        pass   = v('regPass'),   conf  = v('regPassConfirm');
  if (!pseudo || !email || !pass) return showAuthAlert(t('Remplis tous les champs.', 'Fill all fields.'));
  if (pass !== conf) return showAuthAlert(t('Mots de passe différents.', 'Passwords do not match.'));
  setBtnLoading('btnRegister', true);
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: pseudo });
  } catch(e) {
    showAuthAlert(authErr(e.code));
    setBtnLoading('btnRegister', false);
  }
}

async function continueAnon() {
  setBtnLoading('btnAnon', true);
  try {
    await signInAnonymously(auth);
  } catch(e) {
    showAuthAlert(authErr(e.code));
    setBtnLoading('btnAnon', false);
  }
}

async function forgotPass() {
  const email = v('loginEmail');
  if (!email) return showAuthAlert(t("Entre d'abord ton email.", 'Enter your email first.'));
  try {
    await sendPasswordResetEmail(auth, email);
    showAuthAlert(t('Email envoyé !', 'Email sent!'), 'success');
  } catch(e) { showAuthAlert(authErr(e.code)); }
}

async function signOutUser() {
  if (S.user) {
    await setDoc(doc(db,'users',S.user.uid), { status:'offline', lastSeen: serverTimestamp() }, { merge:true });
  }
  S.listeners.forEach(u => u());
  S.listeners = [];
  await signOut(auth);
  closeAllPanels();
}

// ════════════════════════════════════════════
//  PROFILE / FIRESTORE
// ════════════════════════════════════════════
async function ensureProfile(user) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const p = {
      uid:         user.uid,
      displayName: user.displayName || S.anonName,
      email:       user.email || null,
      photoURL:    user.photoURL || null,
      role:        'user',
      status:      'online',
      isAnonymous: user.isAnonymous,
      anonEmoji:   user.isAnonymous ? S.anonEmoji : null,
      anonColor:   user.isAnonymous ? S.anonColor : null,
      ephemDefault:S.ephemHours,
      warnings:    0,
      badge:       null,
      createdAt:   serverTimestamp(),
      lastSeen:    serverTimestamp(),
    };
    await setDoc(ref, p);
    return p;
  }
  await setDoc(ref, { status:'online', lastSeen: serverTimestamp() }, { merge:true });
  return snap.data();
}
function onAppReady() {
  const p = S.profile, u = S.user;

  // Topbar avatar
  const avEl = document.getElementById('topbarAvatar');
  renderAvatarEl(avEl, p, u);

  // Status ring
  updateStatusRingUI(p?.status || 'online');

  // Admin nav
  if (p?.role === 'admin') {
    document.getElementById('adminNavBtn').style.display = 'flex';
  }

  // Push notifications
  initPushNotifications();

  // Online presence
  setupPresence();

  showPage('pageApp');
  switchView('rooms');
  loadRooms();
}

function renderAvatarEl(el, profile, user) {
  if (!el) return;
  if (user?.photoURL || profile?.photoURL) {
    el.innerHTML = `<img src="${user.photoURL || profile.photoURL}" alt="av"/>`;
    el.style.background = '';
  } else if (user?.isAnonymous && profile?.anonEmoji) {
    el.textContent = profile.anonEmoji;
    el.style.background = profile.anonColor || '#6c63ff';
  } else {
    el.textContent = (profile?.displayName || 'U')[0].toUpperCase();
    el.style.background = '';
  }
}

function updateStatusRingUI(status) {
  const ring = document.getElementById('statusRing');
  if (!ring) return;
  ring.className = `status-ring ${status === 'online' ? '' : status}`;
}

// ════════════════════════════════════════════
//  PRESENCE
// ════════════════════════════════════════════
function setupPresence() {
  if (!S.user) return;
  const ref = doc(db, 'users', S.user.uid);
  const unsub = onSnapshot(doc(db, 'users', S.user.uid), snap => {
    if (snap.data()?.banned) signOutUser();
  });
  S.listeners.push(unsub);

  // Heartbeat
  const hb = setInterval(() => {
    setDoc(ref, { lastSeen: serverTimestamp() }, { merge:true });
  }, 30000);
  S.listeners.push(() => clearInterval(hb));

  window.addEventListener('beforeunload', () => {
    setDoc(ref, { status:'offline', lastSeen: serverTimestamp() }, { merge:true });
  });
}

// ════════════════════════════════════════════
//  ANON IDENTITY
// ════════════════════════════════════════════
function generateAnonIdentity() {
  const adj  = ANON_ADJ[rand(ANON_ADJ.length)];
  const noun = ANON_NOUN[rand(ANON_NOUN.length)];
  const num  = Math.floor(Math.random() * 900) + 100;
  S.anonName  = `${adj}_${noun}_${num}`;
  S.anonColor = ANON_COLORS[rand(ANON_COLORS.length)];
  S.anonEmoji = ANON_EMOJIS[rand(ANON_EMOJIS.length)];

  const avEl = document.getElementById('anonAvatar');
  const nmEl = document.getElementById('anonName');
  if (avEl) { avEl.textContent = S.anonEmoji; avEl.style.background = S.anonColor; }
  if (nmEl) nmEl.textContent = S.anonName;
}

// ════════════════════════════════════════════
//  E2E ENCRYPTION (Web Crypto API)
// ════════════════════════════════════════════
async function initCryptoKey() {
  const stored = localStorage.getItem('sis_crypto');
  if (stored) {
    try {
      const raw = JSON.parse(stored);
      S.cryptoKey = await crypto.subtle.importKey(
        'jwk', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']
      );
      return;
    } catch(e) {}
  }
  S.cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt']
  );
  const exported = await crypto.subtle.exportKey('jwk', S.cryptoKey);
  localStorage.setItem('sis_crypto', JSON.stringify(exported));
}

async function encryptMsg(text) {
  if (!S.cryptoKey) return text;
  try {
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const buf = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, S.cryptoKey, enc.encode(text));
    const combined = new Uint8Array(12 + buf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(buf), 12);
    return btoa(String.fromCharCode(...combined));
  } catch(e) { return text; }
}

async function decryptMsg(cipher) {
  if (!S.cryptoKey || !cipher) return cipher;
  try {
    const bytes = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
    const iv    = bytes.slice(0, 12);
    const data  = bytes.slice(12);
    const dec   = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, S.cryptoKey, data);
    return new TextDecoder().decode(dec);
  } catch(e) { return cipher; }
}

// ════════════════════════════════════════════
//  COUNTRY FLAG (ipapi.co)
// ════════════════════════════════════════════
async function fetchCountryFlag() {
  if (S.countryFlag) return;
  try {
    const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const code = data.country_code || '';
    if (code.length === 2) {
      const flag = code.toUpperCase().replace(/./g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 127397)
      );
      S.countryFlag = flag;
      localStorage.setItem('sis_flag', flag);
    }
  } catch(e) { S.countryFlag = ''; }
}
// ════════════════════════════════════════════
//  PUSH NOTIFICATIONS (FCM)
// ════════════════════════════════════════════
async function initPushNotifications() {
  if (!messaging || !('Notification' in window)) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const token = await getToken(messaging, { vapidKey: CFG.firebase.vapidKey });
    if (token) {
      await setDoc(doc(db,'users',S.user.uid), { fcmToken: token }, { merge:true });
    }
    onMessage(messaging, payload => {
      const { title, body } = payload.notification || {};
      addNotif({ title, body, time: Date.now(), unread: true });
      showToast(body || title, 'info');
    });
  } catch(e) {}
}

function addNotif(notif) {
  S.notifs.unshift(notif);
  if (S.notifs.length > 50) S.notifs.pop();
  localStorage.setItem('sis_notifs', JSON.stringify(S.notifs));
  loadNotifBadge();
  renderNotifList();
}

function loadNotifBadge() {
  const unread = S.notifs.filter(n => n.unread).length;
  const badge  = document.getElementById('notifCount');
  if (!badge) return;
  if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!S.notifs.length) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span>${t('Aucune notification','No notifications')}</span></div>`;
    return;
  }
  list.innerHTML = S.notifs.map((n,i) => `
    <div class="notif-item${n.unread?' unread':''}" onclick="markNotifRead(${i})">
      <div class="notif-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
      <div class="notif-body">
        <div class="notif-title">${esc(n.title||'Notification')}</div>
        <div class="notif-sub">${esc(n.body||'')}</div>
      </div>
      <span class="notif-time">${fmtTime(n.time)}</span>
    </div>
  `).join('');
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

// ════════════════════════════════════════════
//  MODERATION
// ════════════════════════════════════════════

// ── Rate limiting (anti-spam / anti-bot) ─────
const msgTimestamps = [];
function checkRateLimit() {
  const now = Date.now();
  const window5s = msgTimestamps.filter(t => now - t < 5000);
  if (window5s.length >= 5) return false; // max 5 msgs / 5s
  msgTimestamps.push(now);
  if (msgTimestamps.length > 50) msgTimestamps.shift();
  return true;
}

// ── Regex moderation ──────────────────────────
function checkRegexMod(text) {
  for (const [cat, patterns] of Object.entries(MOD_PATTERNS)) {
    if (!patterns) continue;
    for (const re of patterns) {
      if (re.test(text)) return cat;
    }
  }
  return null;
}

// ── Spam detection ────────────────────────────
function checkSpam(text) {
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount >= 3) return true;
  const words = text.trim().split(/\s+/);
  const unique = new Set(words);
  if (words.length > 10 && unique.size / words.length < 0.4) return true;
  return false;
}

// ── Perspective API (toxicity) ────────────────
async function checkPerspective(text) {
  if (!CFG.perspective.key || CFG.perspective.key === 'VOTRE_PERSPECTIVE_API_KEY') return null;
  try {
    const res = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${CFG.perspective.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          languages: ['fr','en'],
          requestedAttributes: { TOXICITY:{}, THREAT:{}, INSULT:{}, IDENTITY_ATTACK:{} }
        }),
        signal: AbortSignal.timeout(4000)
      }
    );
    const data = await res.json();
    const scores = data.attributeScores || {};
    const max = Math.max(
      scores.TOXICITY?.summaryScore?.value || 0,
      scores.THREAT?.summaryScore?.value   || 0,
      scores.INSULT?.summaryScore?.value   || 0,
      scores.IDENTITY_ATTACK?.summaryScore?.value || 0
    );
    return max; // 0-1
  } catch(e) { return null; }
}

// ── Main moderation gate ──────────────────────
async function moderateMessage(text) {
  // 1. Rate limit
  if (!checkRateLimit()) {
    showModWarning(t('Trop de messages ! Ralentis.', 'Too many messages! Slow down.'));
    return false;
  }

  // 2. Spam
  if (checkSpam(text)) {
    await applyWarning(S.user.uid, 'spam');
    return false;
  }

  // 3. Regex patterns
  const regexHit = checkRegexMod(text);
  if (regexHit) {
    await applyWarning(S.user.uid, regexHit);
    return false;
  }

  // 4. Perspective API (async, non-blocking for speed)
  checkPerspective(text).then(async score => {
    if (score !== null && score > 0.75) {
      await applyWarning(S.user.uid, 'harassment');
    }
  });

  return true;
}
// ── Apply warning & badge ─────────────────────
async function applyWarning(uid, reason) {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.data() || {};
  const count = (data.warnings || 0) + 1;

  let badge = null;
  let action = '';

  if (count === 1)      { badge = 'warn-1'; action = 'warn'; }
  else if (count === 2) { badge = 'warn-2'; action = 'warn'; }
  else                  { badge = 'warn-3'; action = 'ban';  }

  await setDoc(ref, { warnings: count, badge }, { merge:true });

  if (action === 'warn') {
    showModWarning(
      count === 1
        ? t(`⚠️ Avertissement 1/3 — Contenu interdit (${reason})`, `⚠️ Warning 1/3 — Forbidden content (${reason})`)
        : t(`🟠 Avertissement 2/3 — Encore un et vous serez banni.`, `🟠 Warning 2/3 — One more and you'll be banned.`)
    );
    addNotif({ title: t('Avertissement reçu','Warning received'), body: t(`Raison: ${reason}`, `Reason: ${reason}`), time: Date.now(), unread:true });
  } else {
    // Auto-ban
    await setDoc(doc(db,'bans',uid), { uid, reason, bannedAt: serverTimestamp(), auto: true });
    showModWarning(t('🔴 Vous avez été banni automatiquement.', '🔴 You have been automatically banned.'));
    // Delete current chat/room if in one
    if (S.currentRoomId) {
      await deleteDoc(doc(db, 'rooms', S.currentRoomId));
    }
    setTimeout(() => signOutUser(), 3000);
  }
}

function showModWarning(msg) {
  const existing = document.querySelector('.mod-warning');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'mod-warning';
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${esc(msg)}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ── Badge auto-expire ─────────────────────────
async function checkBadgeExpiry(uid) {
  const ref  = doc(db,'users',uid);
  const snap = await getDoc(ref);
  const data = snap.data();
  if (!data?.badge) return;

  const warnings = data.warnings || 0;
  const lastWarn = data.lastWarnAt?.toMillis() || 0;
  const now      = Date.now();
  const hours    = (now - lastWarn) / 3600000;

  if (data.badge === 'warn-1' && hours > 24) {
    await setDoc(ref, { badge: null }, { merge:true });
  } else if (data.badge === 'warn-2' && hours > 168) {
    await setDoc(ref, { badge: null }, { merge:true });
  }
  // warn-3 (🔴 Dangereux) = permanent, admin only
}

// ════════════════════════════════════════════
//  ROOMS
// ════════════════════════════════════════════
function loadRooms() {
  const q = query(collection(db,'rooms'), orderBy('lastMessageAt','desc'), limit(60));
  const unsub = onSnapshot(q, snap => {
    S.allRooms = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderRooms(S.allRooms);
  });
  S.listeners.push(unsub);

  // Online count listener
  const onlineQ = query(collection(db,'users'), where('status','==','online'));
  const onlineUnsub = onSnapshot(onlineQ, snap => {
    document.getElementById('randomOnlineCount').textContent = snap.size;
    const lbl = document.getElementById('onlineLabel');
    if (lbl) lbl.textContent = `${snap.size} ${t('en ligne','online')}`;
  });
  S.listeners.push(onlineUnsub);
}