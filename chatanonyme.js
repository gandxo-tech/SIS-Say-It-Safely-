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
