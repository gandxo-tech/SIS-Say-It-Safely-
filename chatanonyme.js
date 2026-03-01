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
