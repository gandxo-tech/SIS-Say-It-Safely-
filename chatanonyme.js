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
function renderRooms(rooms) {
  const list   = document.getElementById('roomsList');
  const pinned = document.getElementById('pinnedRooms');
  const pinnedLabel = document.getElementById('pinnedLabel');

  const pinnedRooms = rooms.filter(r => r.pinned);
  const normalRooms = rooms.filter(r => !r.pinned);

  // Pinned
  if (pinnedRooms.length) {
    pinnedLabel.style.display = 'flex';
    pinned.innerHTML = pinnedRooms.map(r => roomRowHTML(r)).join('');
  } else {
    pinnedLabel.style.display = 'none';
    pinned.innerHTML = '';
  }

  // Normal
  if (!normalRooms.length) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>${t('Aucun salon','No rooms')}</span></div>`;
    return;
  }
  list.innerHTML = normalRooms.map(r => roomRowHTML(r)).join('');
}

function roomRowHTML(r) {
  const unread = S.roomMembers[r.id]?.unread || 0;
  return `<div class="room-row${S.currentRoomId===r.id?' active':''}" onclick="openRoom('${r.id}')">
    <div class="room-row-icon">${CAT_EMOJI[r.category]||'💬'}</div>
    <div class="room-row-info">
      <div class="room-row-name">${esc(r.name)}</div>
      <div class="room-row-last">${r.lastMessage ? esc(r.lastMessage) : t('Aucun message','No messages yet')}</div>
    </div>
    <div class="room-row-meta">
      <span class="room-badge badge-${r.type}">${r.type==='public'?t('Public','Public'):t('Privé','Private')}</span>
      ${unread ? `<span class="unread-badge">${unread}</span>` : ''}
    </div>
  </div>`;
}

function filterRooms(q) {
  const filtered = (S.allRooms||[]).filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
  renderRooms(filtered);
}

function filterCat(btn, cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = cat==='all' ? S.allRooms : (S.allRooms||[]).filter(r => r.category===cat);
  renderRooms(filtered);
}

// ── Create Room ───────────────────────────────
function openCreateRoomModal() {
  showOverlay('createRoomOverlay');
}
function togglePwField(radio) {
  document.getElementById('pwField').style.display = radio.value==='private' ? 'block' : 'none';
}
async function createRoom() {
  const name = v('newRoomName').trim();
  const cat  = v('newRoomCat');
  const type = document.querySelector('input[name="rtype"]:checked').value;
  const pw   = v('newRoomPw').trim();
  const max  = parseInt(v('newRoomMax')) || 0;

  if (!name) return toast(t('Donne un nom au salon.','Give the room a name.'), 'error');
  try {
    const ref = await addDoc(collection(db,'rooms'), {
      name, category:cat, type,
      password: type==='private' && pw ? pw : null,
      maxMembers: max, createdBy: S.user.uid,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: null, memberCount: 1,
      pinned: false,
    });
    await setDoc(doc(db,'rooms',ref.id,'members',S.user.uid), {
      uid: S.user.uid, role:'moderator', joinedAt: serverTimestamp()
    });
    closeOverlay('createRoomOverlay');
    document.getElementById('newRoomName').value = '';
    openRoom(ref.id);
    toast(t('Salon créé !','Room created!'), 'success');
  } catch(e) { toast(t('Erreur création.','Creation error.'), 'error'); }
}

// ── Open Room ─────────────────────────────────
let msgUnsub = null;
async function openRoom(roomId) {
  const room = S.allRooms.find(r => r.id===roomId);
  if (!room) return;

  // Password check
  if (room.type==='private' && room.password) {
    const pw = prompt(t('Mot de passe du salon :','Room password:'));
    if (pw !== room.password) return toast(t('Mot de passe incorrect.','Wrong password.'), 'error');
  }

  // Max members
  if (room.maxMembers > 0 && (room.memberCount||0) >= room.maxMembers) {
    return toast(t('Salon plein.','Room is full.'), 'error');
  }

  S.currentRoomId = roomId;
  S.currentRoom   = room;
  cancelReply();

  // UI
  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';
  document.getElementById('chatRoomIcon').textContent = CAT_EMOJI[room.category]||'💬';
  document.getElementById('chatRoomName').textContent = room.name;
  document.getElementById('chatRoomSub').textContent  = `${room.memberCount||0} ${t('membres','members')}`;

  // Highlight sidebar
  document.querySelectorAll('.room-row').forEach(el => el.classList.remove('active'));
  const active = document.querySelector(`.room-row[onclick="openRoom('${roomId}')"]`);
  if (active) active.classList.add('active');

  // Mobile: hide sidebar
  document.getElementById('sidebar').classList.add('hidden');

  // Join
  await setDoc(doc(db,'rooms',roomId,'members',S.user.uid), {
    uid: S.user.uid, role:'member', joinedAt: serverTimestamp()
  }, { merge:true });
  await updateDoc(doc(db,'rooms',roomId), { memberCount: increment(1) }).catch(()=>{});

  // Pinned message
  loadPinnedBanner(roomId);
// Load online members
  loadRoomMembers(roomId);

  // Messages listener
  if (msgUnsub) msgUnsub();
  const q = query(
    collection(db,'rooms',roomId,'messages'),
    orderBy('createdAt','asc'), limit(120)
  );
  msgUnsub = onSnapshot(q, snap => {
    const now = Date.now();
    const msgs = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(m => !m.expiresAt || m.expiresAt.toMillis() > now);
    renderMessages(msgs, 'messagesList', roomId);
    // Clean expired
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.expiresAt && data.expiresAt.toMillis() <= now) deleteDoc(d.ref);
    });
    // Mark as read
    markAllRead(roomId);
  });
}

function loadRoomMembers(roomId) {
  const q = query(collection(db,'users'), where('status','==','online'));
  const unsub = onSnapshot(q, snap => {
    const onlineList = document.getElementById('onlineList');
    const section    = document.getElementById('onlineSection');
    const label      = document.getElementById('onlineLabel');
    const users = snap.docs.map(d => d.data());
    if (label) label.textContent = `${users.length} ${t('en ligne','online')}`;
    section.style.display = users.length ? 'block' : 'none';
    if (onlineList) {
      onlineList.innerHTML = users.slice(0,12).map(u => `
        <div class="online-avatar" title="${esc(u.displayName||'User')}">
          ${u.anonEmoji || (u.displayName||'U')[0].toUpperCase()}
        </div>`).join('');
    }
    S.roomMembers[roomId] = users;
  });
  S.listeners.push(unsub);
}

function markAllRead(roomId) {
  if (S.roomMembers[roomId]) S.roomMembers[roomId].unread = 0;
  renderRooms(S.allRooms);
}

async function loadPinnedBanner(roomId) {
  const q = query(collection(db,'rooms',roomId,'messages'), where('pinned','==',true), limit(1));
  const snap = await getDocs(q);
  const banner = document.getElementById('pinnedBanner');
  if (snap.empty) { banner.style.display='none'; return; }
  const msg = snap.docs[0].data();
  banner.style.display = 'flex';
  document.getElementById('pinnedBannerText').textContent = esc(msg.text||'📎');
}

function closeMobileChat() {
  document.getElementById('chatEmpty').style.display = 'flex';
  document.getElementById('chatActive').style.display = 'none';
  document.getElementById('sidebar').classList.remove('hidden');
  S.currentRoomId = null;
  S.currentRoom   = null;
}

function shareRoom() {
  if (!S.currentRoomId) return;
  const url = `${location.origin}${location.pathname}?room=${S.currentRoomId}`;
  navigator.clipboard.writeText(url).then(() => toast(t('Lien copié !','Link copied!'), 'success'));
}
function openRoomInfo() {
  if (!S.currentRoom) return;
  toast(`${S.currentRoom.name} · ${S.currentRoom.memberCount||0} ${t('membres','members')}`, 'info');
}

function openRoomSearch() {
  const bar = document.getElementById('roomSearchBar');
  bar.style.display = bar.style.display==='none' ? 'flex' : 'none';
  if (bar.style.display==='flex') document.getElementById('roomSearchInput').focus();
}
function closeRoomSearch() {
  document.getElementById('roomSearchBar').style.display = 'none';
  document.getElementById('roomSearchInput').value = '';
}

function searchInRoom(q) {
  if (!q.trim()) { /* reset */ return; }
  const msgs = document.querySelectorAll('#messagesList .msg-row');
  msgs.forEach(el => {
    const text = el.querySelector('.msg-bubble')?.textContent.toLowerCase() || '';
    el.style.opacity = text.includes(q.toLowerCase()) ? '1' : '0.25';
  });
}

function scrollToPinned() {
  const first = document.querySelector('.pinned-msg');
  if (first) first.scrollIntoView({ behavior:'smooth', block:'center' });
}

// ════════════════════════════════════════════
//  MESSAGES
// ════════════════════════════════════════════
async function renderMessages(msgs, listId, roomId) {
  const list = document.getElementById(listId);
  if (!list) return;

  let html   = '';
  let lastDate = '';

  for (const msg of msgs) {
    const isOwn = msg.uid === S.user?.uid;
    const ts    = msg.createdAt?.toMillis();
    const date  = ts ? new Date(ts).toLocaleDateString() : '';
    const time  = ts ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';

    if (date && date !== lastDate) {
      html += `<div class="date-sep"><span>${date}</span></div>`;
      lastDate = date;
    }

    // Announcement
    if (msg.type === 'announcement') {
      html += `<div class="announcement-msg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>${esc(msg.text||'')}</div>`;
      continue;
    }

    // Author info
    const authorName = msg.authorName || 'User';
    const badge      = getBadgeHTML(msg.badge);

    // Avatar
    let avatarHtml = '';
    if (!isOwn) {
      if (msg.anonEmoji) {
        avatarHtml = `<div class="msg-avatar-wrap"><div class="avatar-sm" style="background:${msg.anonColor||'#6c63ff'}">${msg.anonEmoji}</div>${badge ? `<div class="mod-badge">${badgeEmoji(msg.badge)}</div>` : ''}</div>`;
      } else if (msg.authorPhoto) {
        avatarHtml = `<div class="msg-avatar-wrap"><div class="avatar-sm"><img src="${msg.authorPhoto}" alt=""/></div>${badge ? `<div class="mod-badge">${badgeEmoji(msg.badge)}</div>` : ''}</div>`;
      } else {
        avatarHtml = `<div class="msg-avatar-wrap"><div class="avatar-sm">${authorName[0].toUpperCase()}</div>${badge ? `<div class="mod-badge">${badgeEmoji(msg.badge)}</div>` : ''}</div>`;
      }
    }

    // Reply ref
    let replyHTML = '';
    if (msg.replyTo) {
      replyHTML = `<div class="msg-reply-ref"><strong>${esc(msg.replyTo.authorName||'')}</strong><br/>${esc((msg.replyTo.text||'📎').substring(0,60))}</div>`;
    }

// Content
    let contentHTML = '';
    const decrypted = msg.encrypted ? await decryptMsg(msg.text) : (msg.text || '');
    if (msg.type === 'image') {
      contentHTML = `<img src="${msg.url}" class="msg-img" onclick="openLightbox('${msg.url}')" alt="img"/>`;
    } else if (msg.type === 'voice') {
      contentHTML = voiceHTML(msg);
    } else if (msg.type === 'sticker') {
      contentHTML = `<img src="${msg.url}" class="msg-sticker" alt="sticker"/>`;
    } else {
      contentHTML = `<span class="msg-text">${formatMsgText(decrypted)}</span>`;
    }

    // Ephem
    const ephemHTML = msg.expiresAt
      ? `<span class="msg-ephem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${fmtExpiry(msg.expiresAt.toMillis())}</span>`
      : '';

    // Reactions
    const reactHTML = buildReactionsHTML(msg, roomId);

    // Read avatars (vu par)
    let readHTML = '';
    if (isOwn && msg.readBy && msg.readBy.length > 0) {
      readHTML = `<div class="msg-read-avatars">${msg.readBy.slice(0,3).map(uid => `<div class="read-avatar">${uid[0].toUpperCase()}</div>`).join('')}</div>`;
    }

    // Flag
    const flagHTML = msg.flag ? `<span class="msg-flag">${msg.flag}</span>` : '';

    // Edited
    const editedHTML = msg.edited ? `<span class="msg-edited">${t('modifié','edited')}</span>` : '';

    // Actions
    const actionsHTML = `<div class="msg-actions">
      <div class="msg-action" onclick="openEmojiPickerFor(event,'${msg.id}','${roomId||'random'}')" title="Réagir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </div>
      <div class="msg-action" onclick="replyToMsg('${msg.id}','${esc(authorName)}','${(decrypted||'').replace(/'/g,"\\'").substring(0,60)}')" title="Répondre">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
      </div>
      <div class="msg-action" onclick="copyMsg('${esc(decrypted||'').replace(/'/g,"\\'")}')" title="Copier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </div>
      ${isOwn ? `
        <div class="msg-action" onclick="editMsg('${msg.id}','${(decrypted||'').replace(/'/g,"\\'")}')" title="Modifier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
        <div class="msg-action danger" onclick="deleteMsg('${roomId}','${msg.id}')" title="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </div>
        ${S.profile?.role==='admin'||S.profile?.role==='moderator' ? `
          <div class="msg-action" onclick="pinMsg('${roomId}','${msg.id}')" title="Épingler">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>` : ''}
      ` : `
        <div class="msg-action danger" onclick="reportMsg('${msg.id}','${esc(authorName)}')" title="Signaler">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </div>
      `}
    </div>`;
html += `<div class="msg-row${isOwn?' own':''}${msg.pinned?' pinned-msg':''}" id="msg_${msg.id}">
      ${!isOwn ? avatarHtml : ''}
      <div class="msg-content">
        ${!isOwn ? `<div class="msg-meta-top"><span class="msg-author-name">${esc(authorName)}</span>${badge}</div>` : ''}
        <div class="msg-bubble" style="position:relative">
          ${replyHTML}
          ${contentHTML}
          ${actionsHTML}
        </div>
        <div class="msg-footer">
          <span class="msg-time">${time}</span>
          ${flagHTML}
          ${editedHTML}
          ${ephemHTML}
          ${readHTML}
        </div>
        ${reactHTML}
      </div>
      ${isOwn ? avatarHtml : ''}
    </div>`;
  }

  list.innerHTML = html;
  const scroll = list.closest('.messages-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;

  // Mark messages as read by current user
  if (roomId && S.user) {
    msgs.filter(m => !m.readBy?.includes(S.user.uid) && m.uid !== S.user.uid)
      .forEach(m => {
        updateDoc(doc(db,'rooms',roomId,'messages',m.id), {
          readBy: arrayUnion(S.user.uid)
        }).catch(()=>{});
      });
  }
}

function formatMsgText(text) {
  if (!text) return '';
  return esc(text)
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    .replace(/\n/g, '<br/>');
}

function voiceHTML(msg) {
  const bars = Array.from({ length:20 }, (_,i) => {
    const h = 4 + Math.floor(Math.random() * 16);
    return `<div class="voice-bar" style="height:${h}px"></div>`;
  }).join('');
  return `<div class="msg-voice">
    <button class="voice-play-btn" onclick="playVoice('${msg.url}',this)">
      <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
    </button>
    <div class="voice-waveform">${bars}</div>
    <span class="voice-dur">${msg.duration||'0:00'}</span>
  </div>`;
}

function getBadgeHTML(badge) {
  if (!badge) return '';
  const map = { 'warn-1':'🟡', 'warn-2':'🟠', 'warn-3':'🔴' };
  const cls = { 'warn-1':'badge-warn-1', 'warn-2':'badge-warn-2', 'warn-3':'badge-warn-3' };
  return `<span class="msg-author-badge ${cls[badge]||''}">${map[badge]||badge}</span>`;
}
function badgeEmoji(badge) {
  const map = { 'warn-1':'🟡', 'warn-2':'🟠', 'warn-3':'🔴' };
  return map[badge] || '';
}

function buildReactionsHTML(msg, roomId) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return '';
  const grouped = {};
  Object.entries(msg.reactions).forEach(([uid, emoji]) => {
    grouped[emoji] = grouped[emoji] || [];
    grouped[emoji].push(uid);
  });
  return `<div class="msg-reactions">${
    Object.entries(grouped).map(([emoji, uids]) =>
      `<div class="reaction-chip${uids.includes(S.user?.uid)?' mine':''}"
        onclick="toggleReaction('${roomId||'random'}','${msg.id}','${emoji}')">
        ${emoji} <span>${uids.length}</span>
      </div>`
    ).join('')
  }</div>`;
}
function fmtExpiry(ms) {
  const rem = ms - Date.now();
  if (rem <= 0) return t('Expiré','Expired');
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h/24)}j`;
  if (h > 0)  return `${h}h`;
  return `${m}m`;
}

// ── Send Message ──────────────────────────────
async function sendMessage() {
  if (!S.currentRoomId) return;
  if (S.editingMsgId) { await saveEdit(); return; }

  const input = document.getElementById('msgBox');
  const raw   = input.innerText.trim();
  if (!raw) return;

  // Moderation gate
  const ok = await moderateMessage(raw);
  if (!ok) { input.innerText = ''; return; }

  input.innerText = '';
  closeMentionDropdown();

  const encrypted = await encryptMsg(raw);
  const expiresAt = getExpiresAt();
  const flag      = S.countryFlag;

  const data = {
    uid:        S.user.uid,
    authorName: S.profile?.displayName || S.user.displayName || 'User',
    authorPhoto:S.user.photoURL || S.profile?.photoURL || null,
    anonEmoji:  S.user.isAnonymous ? (S.profile?.anonEmoji || S.anonEmoji) : null,
    anonColor:  S.user.isAnonymous ? (S.profile?.anonColor || S.anonColor) : null,
    badge:      S.profile?.badge || null,
    text:       encrypted,
    encrypted:  !!S.cryptoKey,
    type:       'text',
    flag,
    replyTo:    S.replyTo || null,
    createdAt:  serverTimestamp(),
    expiresAt:  expiresAt ? Timestamp.fromDate(expiresAt) : null,
    reactions:  {},
    readBy:     [],
    pinned:     false,
    edited:     false,
  };

  try {
    await addDoc(collection(db,'rooms',S.currentRoomId,'messages'), data);
    await updateDoc(doc(db,'rooms',S.currentRoomId), {
      lastMessage:    raw.substring(0,60),
      lastMessageAt:  serverTimestamp(),
    });
    cancelReply();

    // Notify room members of @mentions
    const mentions = [...raw.matchAll(/@(\w+)/g)].map(m => m[1]);
    if (mentions.length) notifyMentions(mentions, raw, S.currentRoom?.name);

  } catch(e) { toast(t('Erreur envoi.','Send error.'), 'error'); }
}

function notifyMentions(pseudos, text, roomName) {
  pseudos.forEach(pseudo => {
    addNotif({
      title: `@${pseudo} ${t('mentionné','mentioned')} — ${roomName||''}`,
      body:  text.substring(0,80),
      time:  Date.now(),
      unread:true
    });
  });
}

function onMsgKey(e) {
  // Mention navigation
  if (document.getElementById('mentionDropdown').style.display !== 'none') {
    if (e.key === 'ArrowDown') { S.mentionIdx = Math.min(S.mentionIdx+1, S.mentionResults.length-1); renderMentionDropdown(); e.preventDefault(); return; }
    if (e.key === 'ArrowUp')   { S.mentionIdx = Math.max(S.mentionIdx-1, 0); renderMentionDropdown(); e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { selectMention(S.mentionIdx); e.preventDefault(); return; }
    if (e.key === 'Escape') { closeMentionDropdown(); return; }
  }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function onMsgInput(e) {
  const text = document.getElementById('msgBox').innerText;
  const lastWord = text.split(/\s/).pop();
  if (lastWord.startsWith('@') && lastWord.length > 1) {
    S.mentionQuery = lastWord.slice(1).toLowerCase();
    fetchMentionCandidates(S.mentionQuery);
  } else {
    closeMentionDropdown();
  }
}
async function fetchMentionCandidates(q) {
  if (!S.currentRoomId) return;
  const members = Array.isArray(S.roomMembers[S.currentRoomId])
    ? S.roomMembers[S.currentRoomId]
    : Object.values(S.roomMembers[S.currentRoomId] || {});
  S.mentionResults = members.filter(m => (m.displayName||'').toLowerCase().includes(q));
  S.mentionIdx = 0;
  renderMentionDropdown();
}

function renderMentionDropdown() {
  const dd   = document.getElementById('mentionDropdown');
  const list = document.getElementById('mentionList');
  if (!S.mentionResults.length) { dd.style.display='none'; return; }
  dd.style.display = 'block';
  list.innerHTML = S.mentionResults.map((u, i) => `
    <div class="mention-item${i===S.mentionIdx?' selected':''}" onclick="selectMention(${i})">
      <div class="avatar-xs">${(u.displayName||'U')[0].toUpperCase()}</div>
      <span class="mention-name">${esc(u.displayName||'User')}</span>
    </div>`).join('');
}

function selectMention(i) {
  const user = S.mentionResults[i];
  if (!user) return;
  const box = document.getElementById('msgBox');
  const text = box.innerText;
  const lastAt = text.lastIndexOf('@');
  box.innerText = text.substring(0, lastAt) + `@${user.displayName} `;
  closeMentionDropdown();
  // Move cursor to end
  const range = document.createRange();
  const sel   = window.getSelection();
  range.selectNodeContents(box);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function closeMentionDropdown() {
  document.getElementById('mentionDropdown').style.display = 'none';
  S.mentionResults = [];
}

// ── Reply / Edit ──────────────────────────────
function replyToMsg(msgId, authorName, text) {
  S.replyTo = { msgId, authorName, text };
  document.getElementById('replyStrip').style.display   = 'flex';
  document.getElementById('replyWho').textContent        = authorName;
  document.getElementById('replyPreviewText').textContent= text;
  document.getElementById('msgBox').focus();
}
function cancelReply() {
  S.replyTo = null;
  document.getElementById('replyStrip').style.display = 'none';
}

function editMsg(msgId, currentText) {
  S.editingMsgId = msgId;
  const box = document.getElementById('msgBox');
  box.innerText = currentText;
  box.focus();
}
async function saveEdit() {
  const text = document.getElementById('msgBox').innerText.trim();
  if (!text || !S.editingMsgId || !S.currentRoomId) return;
  const ok = await moderateMessage(text);
  if (!ok) { document.getElementById('msgBox').innerText = ''; S.editingMsgId = null; return; }
  const encrypted = await encryptMsg(text);
  await updateDoc(doc(db,'rooms',S.currentRoomId,'messages',S.editingMsgId), {
    text: encrypted, encrypted: true, edited: true
  });
  document.getElementById('msgBox').innerText = '';
  S.editingMsgId = null;
}

async function deleteMsg(roomId, msgId) {
  if (!confirm(t('Supprimer ce message ?','Delete this message?'))) return;
  await deleteDoc(doc(db,'rooms',roomId,'messages',msgId));
}

async function pinMsg(roomId, msgId) {
  const ref = doc(db,'rooms',roomId,'messages',msgId);
  const snap = await getDoc(ref);
  const pinned = !snap.data()?.pinned;
  await updateDoc(ref, { pinned });
  toast(pinned ? t('Message épinglé.','Message pinned.') : t('Désépinglé.','Unpinned.'), 'success');
  loadPinnedBanner(roomId);
}

function copyMsg(text) {
  navigator.clipboard.writeText(text).then(() => toast(t('Copié !','Copied!'), 'success'));
}

// ── Reactions ─────────────────────────────────
const EMOJI_REACTIONS = ['❤️','😂','😮','😢','😡','👍','🔥','💯','🎉','👀'];

function openEmojiPickerFor(e, msgId, roomId) {
  e.stopPropagation();
  const picker = document.getElementById('emojiPicker');
  const row    = document.getElementById('emojiRow');
  row.innerHTML = EMOJI_REACTIONS.map(em =>
    `<button class="emoji-btn-pick" onclick="addReaction('${roomId}','${msgId}','${em}')">${em}</button>`
  ).join('');
  const rect = e.currentTarget.getBoundingClientRect();
  picker.style.top  = (rect.top - 52 + window.scrollY) + 'px';
  picker.style.left = rect.left + 'px';
  picker.style.display = 'block';
  setTimeout(() => document.addEventListener('click', () => picker.style.display='none', { once:true }), 0);
}

async function addReaction(roomId, msgId, emoji) {
  document.getElementById('emojiPicker').style.display = 'none';
  if (roomId === 'random') {
    if (!S.randomId) return;
    await updateDoc(doc(db,'random_sessions',S.randomId,'messages',msgId), { [`reactions.${S.user.uid}`]: emoji });
    return;
  }
  await updateDoc(doc(db,'rooms',roomId,'messages',msgId), { [`reactions.${S.user.uid}`]: emoji });
}

async function toggleReaction(roomId, msgId, emoji) {
  const path = roomId==='random'
    ? doc(db,'random_sessions',S.randomId,'messages',msgId)
    : doc(db,'rooms',roomId,'messages',msgId);
  const snap = await getDoc(path);
  const current = snap.data()?.reactions?.[S.user.uid];
  if (current === emoji) {
    await updateDoc(path, { [`reactions.${S.user.uid}`]: deleteField() });
  } else {
    await updateDoc(path, { [`reactions.${S.user.uid}`]: emoji });
  }
}

// ── Media upload ──────────────────────────────
function triggerImg() { document.getElementById('imgInput').click(); }
async function handleImgUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  e.target.value = '';
  toast(t('Upload...','Uploading...'), 'info');
  try {
    const url = await uploadCloud(file, 'image');
    await sendMedia('image', url);
  } catch { toast(t('Erreur image.','Image error.'), 'error'); }
}
function triggerRandomImg() { document.getElementById('randomImgInput').click(); }
async function handleRandomImg(e) {
  const file = e.target.files[0]; if (!file) return;
  e.target.value = '';
  const url = await uploadCloud(file, 'image');
  await sendRandomMedia('image', url);
}

async function uploadCloud(file, resourceType='image') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CFG.cloudinary.preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CFG.cloudinary.cloud}/${resourceType}/upload`, {
    method:'POST', body:fd
  });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url;
}

async function sendMedia(type, url, extra={}) {
  if (!S.currentRoomId) return;
  const expiresAt = getExpiresAt();
  await addDoc(collection(db,'rooms',S.currentRoomId,'messages'), {
    uid: S.user.uid,
    authorName: S.profile?.displayName || 'User',
    authorPhoto: S.user.photoURL || null,
    anonEmoji: S.user.isAnonymous ? S.anonEmoji : null,
    anonColor: S.user.isAnonymous ? S.anonColor : null,
    badge: S.profile?.badge || null,
    type, url,
    text: type==='image'?'📷':type==='voice'?'🎤':'🎭',
    flag: S.countryFlag,
    replyTo: S.replyTo || null,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    reactions: {}, readBy: [], pinned:false, encrypted:false,
    ...extra
  });
  await updateDoc(doc(db,'rooms',S.currentRoomId), {
    lastMessage: type==='image'?'📷 Image':type==='voice'?'🎤 Vocal':'🎭 Sticker',
    lastMessageAt: serverTimestamp()
  });
  cancelReply();
}
// ── Voice Recording ───────────────────────────
async function toggleVoice() {
  if (S.recording) { await sendVoice(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    S.mediaRec   = new MediaRecorder(stream);
    S.recChunks  = [];
    S.recording  = true;
    S.recSecs    = 0;
    S.mediaRec.ondataavailable = e => S.recChunks.push(e.data);
    S.mediaRec.start();
    document.getElementById('recBar').style.display = 'flex';
    document.getElementById('voiceBtn').classList.add('active');
    S.recTimer = setInterval(() => {
      S.recSecs++;
      const m = Math.floor(S.recSecs/60), s = S.recSecs%60;
      document.getElementById('recTime').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }, 1000);
  } catch { toast(t('Micro refusé.','Mic denied.'), 'error'); }
}

async function sendVoice() {
  if (!S.mediaRec) return;
  clearInterval(S.recTimer);
  S.recording = false;
  document.getElementById('recBar').style.display = 'none';
  document.getElementById('voiceBtn').classList.remove('active');
  return new Promise(resolve => {
    S.mediaRec.onstop = async () => {
      const blob = new Blob(S.recChunks, { type:'audio/webm' });
      const dur  = `${Math.floor(S.recSecs/60)}:${(S.recSecs%60).toString().padStart(2,'0')}`;
      try {
        const url = await uploadCloud(new File([blob],'voice.webm',{type:'audio/webm'}), 'video');
        await sendMedia('voice', url, { duration:dur });
      } catch { toast(t('Erreur vocal.','Voice error.'), 'error'); }
      S.mediaRec.stream.getTracks().forEach(t => t.stop());
      resolve();
    };
    S.mediaRec.stop();
  });
}

function cancelVoice() {
  clearInterval(S.recTimer);
  if (S.mediaRec) S.mediaRec.stream.getTracks().forEach(t => t.stop());
  S.mediaRec = null; S.recording = false; S.recChunks = [];
  document.getElementById('recBar').style.display = 'none';
  document.getElementById('voiceBtn').classList.remove('active');
}

// ── Voice Playback ────────────────────────────
const activeAudio = {};
function playVoice(url, btn) {
  if (activeAudio[url]) {
    activeAudio[url].pause(); delete activeAudio[url];
    btn.querySelector('.play-icon').innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    return;
  }
  const audio = new Audio(url);
  activeAudio[url] = audio;
  btn.querySelector('.play-icon').innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  audio.play();
  audio.onended = () => { delete activeAudio[url]; btn.querySelector('.play-icon').innerHTML = '<polygon points="5,3 19,12 5,21"/>'; };
}

// ── Stickers ──────────────────────────────────
function openStickers()  { document.getElementById('stickerPanel').style.display='block'; }
function closeStickers() { document.getElementById('stickerPanel').style.display='none'; }

function loadStickersUI() {
  const grid = document.getElementById('stickerGrid');
  if (!grid) return;
  grid.innerHTML = S.stickers.map((src,i) =>
    `<img src="${src}" class="sticker-img" onclick="sendSticker('${src}')" alt="sticker ${i}"/>`
  ).join('');
}

async function importStickers(e) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const reader = new FileReader();
    await new Promise(res => {
      reader.onload = ev => { S.stickers.push(ev.target.result); res(); };
      reader.readAsDataURL(file);
    });
  }
  localStorage.setItem('sis_stickers', JSON.stringify(S.stickers));
  loadStickersUI();
  e.target.value = '';
  toast(t(`${files.length} sticker(s) importé(s)`,`${files.length} sticker(s) imported`), 'success');
}

async function sendSticker(src) {
  closeStickers();
  await sendMedia('sticker', src);
}
// ── Lightbox ──────────────────────────────────
function openLightbox(url) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(10px)';
  el.innerHTML = `<img src="${url}" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.8)"/>`;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
}

// ── Report ────────────────────────────────────
let reportTarget = null;
function reportMsg(msgId, authorName) {
  reportTarget = { msgId, authorName, context:'room', roomId: S.currentRoomId };
  document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('reportDetail').value = '';
  showOverlay('reportOverlay');
}
function reportRandom() {
  reportTarget = { sessionId: S.randomId, context:'random' };
  showOverlay('reportOverlay');
}
function pickReason(btn) {
  document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
async function submitReport() {
  const reason = document.querySelector('.reason-btn.active')?.textContent;
  if (!reason) return toast(t('Choisissez une raison.','Select a reason.'), 'error');
  const detail = document.getElementById('reportDetail').value;
  await addDoc(collection(db,'reports'), {
    reportedBy: S.user.uid, reason, detail,
    target: reportTarget, status:'pending',
    needsReview: true, createdAt: serverTimestamp()
  });
  closeOverlay('reportOverlay');
  toast(t('Signalement envoyé !','Report sent!'), 'success');
}

// ════════════════════════════════════════════
//  RANDOM CHAT
// ════════════════════════════════════════════
async function startRandom() {
  document.getElementById('randomIdle').style.display   = 'none';
  document.getElementById('randomSearching').style.display = 'flex';

  // Look for waiting session
  const q = query(
    collection(db,'random_sessions'),
    where('status','==','waiting'),
    where('uid','!=',S.user.uid),
    limit(1)
  );
  const snap = await getDocs(q);
  let sessionRef;

  if (!snap.empty) {
    sessionRef = snap.docs[0].ref;
    S.randomId = snap.docs[0].id;
    await updateDoc(sessionRef, {
      peer: S.user.uid,
      peerName: S.profile?.displayName || 'Anonyme',
      peerPhoto: S.user.photoURL || null,
      peerEmoji: S.user.isAnonymous ? S.anonEmoji : null,
      peerColor: S.user.isAnonymous ? S.anonColor : null,
      status: 'active',
    });
  } else {
    const ref = await addDoc(collection(db,'random_sessions'), {
      uid: S.user.uid,
      userName: S.profile?.displayName || 'Anonyme',
      userPhoto: S.user.photoURL || null,
      userEmoji: S.user.isAnonymous ? S.anonEmoji : null,
      userColor: S.user.isAnonymous ? S.anonColor : null,
      status: 'waiting',
      createdAt: serverTimestamp(),
    });
    sessionRef = ref;
    S.randomId = ref.id;
  }

  // Listen to session
  if (S.randomUnsub) S.randomUnsub();
  S.randomUnsub = onSnapshot(sessionRef, snap => {
    const data = snap.data();
    if (!data) return endRandom(false);
    if (data.status === 'active') showRandomChat(data);
    if (data.status === 'ended') endRandom(false);
  });
}
function showRandomChat(data) {
  const isHost = data.uid === S.user.uid;
  const peerName  = isHost ? data.peerName  : data.userName;
  const peerEmoji = isHost ? data.peerEmoji : data.userEmoji;
  const peerColor = isHost ? data.peerColor : data.userColor;

  document.getElementById('randomSearching').style.display = 'none';
  document.getElementById('randomChatWrap').style.display  = 'flex';
  document.getElementById('randomPeerName').textContent    = peerName || t('Inconnu','Stranger');

  const av = document.getElementById('randomPeerAvatar');
  if (peerEmoji) { av.textContent = peerEmoji; av.style.background = peerColor||'#6c63ff'; }
  else av.textContent = (peerName||'?')[0].toUpperCase();

  S.randomActive = true;
  listenRandomMessages();
}

function listenRandomMessages() {
  if (!S.randomId) return;
  const q = query(
    collection(db,'random_sessions',S.randomId,'messages'),
    orderBy('createdAt','asc')
  );
  const unsub = onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderMessages(msgs, 'randomMsgList', null);
  });
  S.listeners.push(unsub);
}

async function sendRandomMsg() {
  const input = document.getElementById('randomMsgBox');
  const text  = input.innerText.trim();
  if (!text || !S.randomId) return;
  const ok = await moderateMessage(text);
  if (!ok) { input.innerText=''; return; }
  input.innerText = '';
  const encrypted = await encryptMsg(text);
  await addDoc(collection(db,'random_sessions',S.randomId,'messages'), {
    uid: S.user.uid,
    authorName: S.profile?.displayName || 'Moi',
    text: encrypted, encrypted: !!S.cryptoKey,
    type:'text', flag: S.countryFlag,
    createdAt: serverTimestamp(), reactions:{},
  });
}

function onRandomMsgKey(e) {
  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendRandomMsg(); }
}

async function skipRandom() {
  await endRandom(true);
  await startRandom();
}

async function endRandom(update=true) {
  if (S.randomUnsub) { S.randomUnsub(); S.randomUnsub=null; }
  if (update && S.randomId) {
    await updateDoc(doc(db,'random_sessions',S.randomId), { status:'ended' }).catch(()=>{});
  }
  S.randomId = null; S.randomActive = false;
  document.getElementById('randomMsgList').innerHTML = '';
  document.getElementById('randomChatWrap').style.display  = 'none';
  document.getElementById('randomSearching').style.display = 'none';
  document.getElementById('randomIdle').style.display      = 'flex';
}

function cancelRandom() { endRandom(true); }

async function toggleRandomVoice() { /* same as toggleVoice but uses sendRandomMedia */ }
async function sendRandomMedia(type, url) {
  if (!S.randomId) return;
  await addDoc(collection(db,'random_sessions',S.randomId,'messages'), {
    uid:S.user.uid, authorName:S.profile?.displayName||'Moi',
    type, url, text: type==='image'?'📷':'🎤',
    flag: S.countryFlag, createdAt:serverTimestamp(), reactions:{},
  });
}
// ════════════════════════════════════════════
//  GLOBAL SEARCH
// ════════════════════════════════════════════
let searchTimer;
function toggleGlobalSearch() {
  const el = document.getElementById('globalSearch');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
  if (el.style.display==='block') document.getElementById('globalSearchInput').focus();
}

async function globalSearchMessages(q) {
  clearTimeout(searchTimer);
  if (!q.trim()) { document.getElementById('globalSearchResults').innerHTML=''; return; }
  searchTimer = setTimeout(async () => {
    const results = [];
    const rooms = S.allRooms.slice(0, 10);
    for (const room of rooms) {
      const snap = await getDocs(
        query(collection(db,'rooms',room.id,'messages'), orderBy('createdAt','desc'), limit(30))
      );
      snap.docs.forEach(d => {
        const data = d.data();
        const text = data.text || '';
        if (text.toLowerCase().includes(q.toLowerCase())) {
          results.push({ ...data, id:d.id, roomId:room.id, roomName:room.name });
        }
      });
    }
    const html = results.slice(0,20).map(r => `
      <div class="search-result-item" onclick="openRoom('${r.roomId}')">
        <div class="search-result-room">#${esc(r.roomName)}</div>
        <div class="search-result-text">${esc((r.text||'').substring(0,80))}</div>
      </div>`).join('');
    document.getElementById('globalSearchResults').innerHTML = html ||
      `<div class="empty-state"><span>${t('Aucun résultat','No results')}</span></div>`;
  }, 400);
}

// ════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════
function adminTab(tab) {
  const content = document.getElementById('adminContent');
  if (tab==='messages') adminMessages(content);
  else if (tab==='users') adminUsers(content);
  else if (tab==='reports') adminReports(content);
  else if (tab==='badges') adminBadges(content);
  else if (tab==='rooms') adminRooms(content);
}

async function adminMessages(content) {
  content.innerHTML = `<div class="admin-table"><div class="admin-table-head"><span style="flex:1">Auteur</span><span style="flex:2">Message</span><span style="flex:1">Salon</span><span>Actions</span></div><div id="aMsgList"></div></div>`;
  const rooms = S.allRooms.slice(0,20);
  let html = '';
  for (const room of rooms) {
    const snap = await getDocs(query(collection(db,'rooms',room.id,'messages'), orderBy('createdAt','desc'), limit(10)));
    snap.docs.forEach(d => {
      const m = d.data();
      html += `<div class="admin-table-row">
        <span style="flex:1;font-size:.8rem">${esc(m.authorName||'?')}</span>
        <span style="flex:2;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((m.text||m.type||'').substring(0,50))}</span>
        <span style="flex:1;font-size:.78rem;color:var(--t2)">${esc(room.name)}</span>
        <button style="font-size:.75rem;color:var(--error);background:none;border:none;cursor:pointer" onclick="adminDelMsg('${room.id}','${d.id}')">🗑️</button>
      </div>`;
    });
  }
  document.getElementById('aMsgList').innerHTML = html || `<div style="padding:20px;text-align:center;color:var(--t2)">${t('Aucun message','No messages')}</div>`;
  loadAdminStats();
}

async function adminDelMsg(roomId, msgId) {
  if (!confirm(t('Supprimer ?','Delete?'))) return;
  await deleteDoc(doc(db,'rooms',roomId,'messages',msgId));
  toast(t('Supprimé.','Deleted.'), 'success');
}

async function adminUsers(content) {
  const snap = await getDocs(query(collection(db,'users'), limit(50)));
  const html = snap.docs.map(d => {
    const u = d.data();
    return `<div class="admin-table-row">
      <div class="avatar-sm" style="width:28px;height:28px;font-size:.7rem">${(u.displayName||'U')[0].toUpperCase()}</div>
      <span style="flex:1;font-size:.83rem">${esc(u.displayName||'?')}</span>
      <span style="flex:1;font-size:.75rem;color:var(--t2)">${esc(u.email||t('Anonyme','Anonymous'))}</span>
      <span class="room-badge ${u.role==='admin'?'badge-public':'badge-private'}" style="font-size:.68rem">${u.role||'user'}</span>
      <button style="font-size:.75rem;color:var(--error);background:none;border:none;cursor:pointer;margin-left:8px" onclick="adminBan('${d.id}')">🔨</button>
    </div>`;
  }).join('');
  content.innerHTML = `<div class="admin-table"><div class="admin-table-head"><span style="width:28px"></span><span style="flex:1">Nom</span><span style="flex:1">Email</span><span>Rôle</span><span>Ban</span></div><div>${html}</div></div>`;
}

async function adminBan(uid) {
  if (!confirm(t('Bannir cet utilisateur ?','Ban this user?'))) return;
  await setDoc(doc(db,'users',uid), { banned:true, status:'offline' }, { merge:true });
  await setDoc(doc(db,'bans',uid), { uid, bannedAt:serverTimestamp(), bannedBy:S.user.uid });
  toast(t('Utilisateur banni.','User banned.'), 'success');
}

async function adminReports(content) {
  const snap = await getDocs(query(collection(db,'reports'), where('status','==','pending'), limit(50)));
  if (snap.empty) { content.innerHTML = `<div class="empty-state"><span>${t('Aucun signalement','No reports')}</span></div>`; return; }
  const html = snap.docs.map(d => {
    const r = d.data();
    return `<div class="admin-table-row">
      <span style="flex:1;font-size:.8rem">${esc(r.reason||'?')}</span>
      <span style="flex:1;font-size:.75rem;color:var(--t2)">${esc(r.detail||'')}</span>
      <button style="font-size:.75rem;color:var(--success);background:none;border:none;cursor:pointer" onclick="resolveReport('${d.id}')">✅ ${t('Résoudre','Resolve')}</button>
    </div>`;
  }).join('');
  content.innerHTML = `<div class="admin-table"><div class="admin-table-head"><span style="flex:1">Raison</span><span style="flex:1">Détail</span><span>Action</span></div><div>${html}</div></div>`;
}

async function resolveReport(id) {
  await updateDoc(doc(db,'reports',id), { status:'resolved' });
  adminTab('reports');
  toast(t('Résolu.','Resolved.'), 'success');
}
 async function adminBadges(content) {
  const snap = await getDocs(query(collection(db,'users'), limit(50)));
  const html = snap.docs.map(d => {
    const u = d.data();
    return `<div class="admin-table-row">
      <span style="flex:1;font-size:.83rem">${esc(u.displayName||'?')}</span>
      <input type="text" value="${esc(u.badge||'')}" id="badge_${d.id}"
        style="flex:1;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:5px 9px;font-size:.8rem;color:var(--t1);outline:none"
        placeholder="ex: ✨ VIP"/>
      <button style="font-size:.75rem;color:var(--brand-1);background:none;border:none;cursor:pointer;margin-left:8px" onclick="saveBadge('${d.id}')">
        ${t('Enregistrer','Save')}
      </button>
    </div>`;
  }).join('');
  content.innerHTML = `<div class="admin-table"><div class="admin-table-head"><span style="flex:1">Utilisateur</span><span style="flex:1">Badge</span><span>Action</span></div><div>${html}</div></div>`;
}

async function saveBadge(uid) {
  const badge = document.getElementById(`badge_${uid}`)?.value.trim() || null;
  await setDoc(doc(db,'users',uid), { badge }, { merge:true });
  toast(t('Badge mis à jour.','Badge updated.'), 'success');
}

async function adminRooms(content) {
  const html = S.allRooms.map(r => `
    <div class="admin-table-row">
      <span style="font-size:1.1rem">${CAT_EMOJI[r.category]||'💬'}</span>
      <span style="flex:1;font-size:.85rem">${esc(r.name)}</span>
      <span class="room-badge badge-${r.type}" style="font-size:.68rem">${r.type}</span>
      <span style="font-size:.75rem;color:var(--t2)">${r.memberCount||0} 👤</span>
      <button style="font-size:.75rem;background:rgba(239,68,68,.15);color:var(--error);border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:4px 10px;cursor:pointer;margin-left:8px"
        onclick="adminDeleteRoom('${r.id}')">🗑️</button>
    </div>`).join('');
  content.innerHTML = `<div class="admin-table"><div class="admin-table-head"><span>Cat.</span><span style="flex:1">Nom</span><span>Type</span><span>Membres</span><span>Suppr.</span></div><div>${html}</div></div>`;
}

async function adminDeleteRoom(id) {
  if (!confirm(t('Supprimer ce salon ?','Delete this room?'))) return;
  await deleteDoc(doc(db,'rooms',id));
  toast(t('Salon supprimé.','Room deleted.'), 'success');
}
async function adminAnnounce() {
  const text = prompt(t("Texte de l'annonce :","Announcement text:"));
  if (!text?.trim()) return;
  const batch = writeBatch(db);
  for (const room of S.allRooms) {
    const ref = doc(collection(db,'rooms',room.id,'messages'));
    batch.set(ref, {
      uid: S.user.uid, authorName:'🛡️ Admin',
      text: text.trim(), type:'announcement',
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  toast(t('Annonce envoyée !','Announcement sent!'), 'success');
  addNotif({ title:t('Annonce admin','Admin announcement'), body:text.trim(), time:Date.now(), unread:true });
}

async function loadAdminStats() {
  try {
    const [u, r, b, rep] = await Promise.all([
      getDocs(collection(db,'users')),
      getDocs(collection(db,'rooms')),
      getDocs(collection(db,'bans')),
      getDocs(query(collection(db,'reports'), where('status','==','pending'))),
    ]);
    document.getElementById('aSUsers').textContent   = u.size;
    document.getElementById('aSRooms').textContent   = r.size;
    document.getElementById('aSBans').textContent    = b.size;
    document.getElementById('aSReports').textContent = rep.size;
    if (rep.size > 0) {
      const dot = document.getElementById('roomsNotifDot');
      if (dot) dot.style.display = 'block';
    }
  } catch(e) {}
}

// ════════════════════════════════════════════
//  PROFILE
// ════════════════════════════════════════════
function toggleProfileMenu() {
  const panel = document.getElementById('profilePanel');
  if (panel.classList.contains('open')) { closePanel('profilePanel'); return; }
  // Fill profile
  const p = S.profile, u = S.user;
  const av = document.getElementById('profileAvatar');
  renderAvatarEl(av, p, u);
  document.getElementById('profilePseudo').value = p?.displayName || u?.displayName || '';
  setStatusUI(p?.status||'online');
  renderProfileBadges();
  openPanel('profilePanel');
}

function renderProfileBadges() {
  const row = document.getElementById('profileBadgeRow');
  if (!row || !S.profile?.badge) { if(row) row.innerHTML=''; return; }
  row.innerHTML = `<span class="profile-badge" style="background:rgba(123,63,228,.2);color:var(--brand-2)">${esc(S.profile.badge)}</span>`;
}

function setStatusUI(status) {
  document.querySelectorAll('.status-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.status === status);
  });
}

function setStatus(status) {
  setStatusUI(status);
  if (S.user) setDoc(doc(db,'users',S.user.uid), { status }, { merge:true });
  updateStatusRingUI(status);
}

async function uploadAvatar(e) {
  const file = e.target.files[0]; if (!file) return;
  toast(t('Upload...','Uploading...'), 'info');
  try {
    const url = await uploadCloud(file, 'image');
    await updateProfile(S.user, { photoURL: url });
    await setDoc(doc(db,'users',S.user.uid), { photoURL:url }, { merge:true });
    S.profile.photoURL = url;
    const av = document.getElementById('profileAvatar');
    av.innerHTML = `<img src="${url}" alt="av"/>`;
    renderAvatarEl(document.getElementById('topbarAvatar'), S.profile, S.user);
    toast(t('Photo mise à jour !','Photo updated!'), 'success');
  } catch { toast(t('Erreur upload.','Upload error.'), 'error'); }
}
async function saveProfile() {
  const pseudo = document.getElementById('profilePseudo').value.trim();
  if (!pseudo) return toast(t('Pseudo vide.','Empty username.'), 'error');
  try {
    await updateProfile(S.user, { displayName:pseudo });
    await setDoc(doc(db,'users',S.user.uid), { displayName:pseudo }, { merge:true });
    S.profile.displayName = pseudo;
    renderAvatarEl(document.getElementById('topbarAvatar'), S.profile, S.user);
    closePanel('profilePanel');
    toast(t('Profil mis à jour !','Profile updated!'), 'success');
  } catch { toast(t('Erreur.','Error.'), 'error'); }
}

async function deleteAccount() {
  if (!confirm(t('Supprimer votre compte ? Cette action est irréversible.','Delete your account? This cannot be undone.'))) return;
  try {
    await setDoc(doc(db,'users',S.user.uid), { deleted:true, status:'offline' }, { merge:true });
    await deleteUser(S.user);
  } catch(e) {
    if (e.code==='auth/requires-recent-login') {
      toast(t('Reconnectez-vous puis réessayez.','Re-login and try again.'), 'error');
    }
  }
}

// ════════════════════════════════════════════
//  EPHEMERAL
// ════════════════════════════════════════════
function openEphemModal() {
  S.ephemPick = S.ephemHours;
  refreshEphemOpts();
  showOverlay('ephemOverlay');
}
function pickEphem(btn) {
  S.ephemPick = parseInt(btn.dataset.val);
  document.querySelectorAll('.ephem-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
function refreshEphemOpts() {
  document.querySelectorAll('.ephem-opt').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.val)===S.ephemPick);
  });
}
function confirmEphem() {
  S.ephemHours = S.ephemPick;
  localStorage.setItem('sis_ephem', S.ephemHours);
  updateEphemBadges();
  closeOverlay('ephemOverlay');
}
function updateEphemBadges() {
  const labels = {
    0: t('Off','Off'), 1: t('1h','1h'), 6: t('6h','6h'), 24: t('24h','24h'), 168: t('7j','7d')
  };
  const lbl = labels[S.ephemHours] || 'Off';
  ['ephemBadge1','ephemBadge2','ephemBadge3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = lbl;
  });
}
function getExpiresAt() {
  if (!S.ephemHours) return null;
  return new Date(Date.now() + S.ephemHours * 3600000);
}

// ════════════════════════════════════════════
//  THEME & APPEARANCE
// ════════════════════════════════════════════
function openThemePanel()  { openPanel('themePanel'); }
function openNotifPanel()  {
  renderNotifList();
  openPanel('notifPanel');
  S.notifs.forEach(n => n.unread=false);
  localStorage.setItem('sis_notifs', JSON.stringify(S.notifs));
  loadNotifBadge();
}

function setMode(mode) {
  S.theme = mode;
  localStorage.setItem('sis_theme', mode);
  document.documentElement.setAttribute('data-theme', mode);
  document.getElementById('modeDark')?.classList.toggle('active', mode==='dark');
  document.getElementById('modeLight')?.classList.toggle('active', mode==='light');
}
function updateModeUI() {
  document.getElementById('modeDark')?.classList.toggle('active', S.theme==='dark');
  document.getElementById('modeLight')?.classList.toggle('active', S.theme==='light');
}
const BG_MAP = {
  'default':        { color:'var(--chat-bg)',  cls:'' },
  'solid-midnight': { color:'#0a0a14',          cls:'' },
  'solid-navy':     { color:'#0f1929',          cls:'' },
  'solid-forest':   { color:'#0d1f18',          cls:'' },
  'grad-violet':    { color:'linear-gradient(135deg,#1a0533,#0d0d2e)', cls:'' },
  'grad-ocean':     { color:'linear-gradient(135deg,#001b33,#003366)', cls:'' },
  'grad-aurora':    { color:'linear-gradient(135deg,#0d1f18,#1a0533)', cls:'' },
  'grad-sunset':    { color:'linear-gradient(135deg,#1f0d0d,#1a1000)', cls:'' },
  'geo-dots':       { color:'#0d0d1e', cls:'chat-bg-geo-dots' },
  'geo-grid':       { color:'#0d0d1e', cls:'chat-bg-geo-grid' },
  'geo-hex':        { color:'#0d0d1e', cls:'chat-bg-geo-hex'  },
  'geo-diag':       { color:'#0d0d1e', cls:'chat-bg-geo-diag' },
  'bubbles-purple': { color:'#0d0d1e', cls:'chat-bg-bubbles-purple' },
  'bubbles-blue':   { color:'#0a1525', cls:'chat-bg-bubbles-blue'   },
};

function setChatBg(key) {
  S.chatBg = key;
  localStorage.setItem('sis_chatbg', key);
  applyChatBg(key);
  document.querySelectorAll('.bg-thumb').forEach(b => b.classList.toggle('active', b.dataset.bg===key));
}

function applyChatBg(key) {
  const zone = document.getElementById('chatZone');
  if (!zone) return;
  // Remove all bg classes
  zone.classList.remove(...Object.values(BG_MAP).map(v=>v.cls).filter(Boolean));

  if (key === 'custom' && S.customBg) {
    zone.style.background = `url(${S.customBg}) center/cover no-repeat`;
    return;
  }
  const cfg = BG_MAP[key];
  if (!cfg) return;
  zone.style.background = cfg.color;
  if (cfg.cls) zone.classList.add(cfg.cls);
}

async function uploadChatBg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    S.customBg = ev.target.result;
    localStorage.setItem('sis_custombg', S.customBg);
    setChatBg('custom');
  };
  reader.readAsDataURL(file);
  e.target.value='';
}

// ════════════════════════════════════════════
//  LANG
// ════════════════════════════════════════════
function toggleLang() {
  S.lang = S.lang==='fr' ? 'en' : 'fr';
  localStorage.setItem('sis_lang', S.lang);
  document.documentElement.setAttribute('data-lang', S.lang);
  updateLangBtn();
  applyLang();
  updateEphemBadges();
}
function updateLangBtn() {
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = S.lang==='fr' ? 'EN' : 'FR';
}
function applyLang() {
  document.querySelectorAll('[data-fr]').forEach(el => {
    el.textContent = S.lang==='fr' ? el.dataset.fr : el.dataset.en;
  });
}
function t(fr, en) { return S.lang==='fr' ? fr : en; }

// ════════════════════════════════════════════
//  VIEW / PAGE ROUTING
// ════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}