/**
 * SIS LIVE AUDIO - Main Application Script
 * Professional audio live streaming platform
 * Version: 2.0.0
 */

'use strict';

// ========== CONFIGURATION ==========
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyBZoVJaCQlDZQut98gYK-Y85IRudSTNbNg",
    authDomain: "sisliveaudio.firebaseapp.com",
    databaseURL: "https://sisliveaudio-default-rtdb.firebaseio.com",
    projectId: "sisliveaudio",
    storageBucket: "sisliveaudio.firebasestorage.app",
    messagingSenderId: "987019026451",
    appId: "1:987019026451:web:3c1632e417765377b01fe6"
  },
  
  agora: {
    appId: "64a6d3b2b6324eaa9991690bf361e4e3"
  },
  
  moderation: {
    maxWarnings: 3,
    cooldownMs: 1000,
    badWords: [
      'spam', 'scam', 'fraud', 'fake', 'phishing',
      'hack', 'malware', 'virus', 'porn', 'xxx'
    ],
    suspiciousPatterns: [
      /https?:\/\/bit\.ly/i,
      /https?:\/\/tinyurl/i,
      /\b(viagra|casino|lottery|prize|winner|click here)\b/i,
      /free\s+(money|cash|bitcoin|crypto)/i
    ]
  },
  
  gifts: {
    pain: { emoji: '🥖', name: 'Pain', price: 100 },
    cafe: { emoji: '☕', name: 'Café', price: 200 },
    biere: { emoji: '🍺', name: 'Bière', price: 500 },
    fleur: { emoji: '🌻', name: 'Fleur', price: 1000 },
    diamant: { emoji: '💎', name: 'Diamant', price: 5000 }
  },
  
  platform: {
    commission: 0.10,
    phone: '+22901969273222'
  }
};

// ========== GLOBAL STATE ==========
const State = {
  user: null,
  liveId: null,
  role: null,
  liveStart: null,
  timer: null,
  darkMode: localStorage.getItem('darkMode') === 'true',
  warnings: {},
  bannedUsers: new Set(),
  muteState: false,
  isRecording: false,
  agoraClient: null,
  localTrack: null
};

// Firebase instances
let app, auth, db, rtdb, storage;

// ========== INITIALIZATION ==========
function initializeApp() {
  console.log('🔥 SIS Live Audio initializing...');
  
  // Initialize Firebase
  app = firebase.initializeApp(CONFIG.firebase);
  auth = firebase.auth();
  db = firebase.firestore();
  rtdb = firebase.database();
  storage = firebase.storage();
  
  console.log('✅ Firebase initialized');
  
  // Apply dark mode if enabled
  if (State.darkMode) {
    document.body.classList.add('dark-theme');
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup auth state listener
  auth.onAuthStateChanged(handleAuthStateChange);
  
  console.log('✅ App initialized');
}

// Wait for DOM and Firebase SDKs to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeApp, 100);
  });
} else {
  setTimeout(initializeApp, 100);
}

// ========== UTILITIES ==========
const $ = id => document.getElementById(id);

function toast(message, duration = 3000) {
  const container = $('toastContainer');
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = message;
  
  container.appendChild(toastEl);
  
  setTimeout(() => {
    toastEl.classList.add('removing');
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

function showModal(modalId) {
  $(modalId).classList.add('active');
}

function hideModal(modalId) {
  $(modalId).classList.remove('active');
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetTab = tab.dataset.tab;
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      $(`${targetTab}Form`).classList.add('active');
    });
  });
  
  // Login form
  $('loginForm').addEventListener('submit', handleLogin);
  
  // Register form
  $('registerForm').addEventListener('submit', handleRegister);
  
  // Guest login
  $('guestLoginBtn').addEventListener('click', handleGuestLogin);
  
  // Theme toggle
  $('themeToggleBtn').addEventListener('click', toggleTheme);
  
  // Create live button
  $('createLiveBtn').addEventListener('click', () => showModal('createLiveModal'));
  
  // Create live form
  $('createLiveForm').addEventListener('submit', handleCreateLive);
  
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const view = tab.dataset.view;
      document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
      $(`${view}View`).classList.add('active');
      
      loadViewContent(view);
    });
  });
  
  // User menu
  $('userMenuBtn').addEventListener('click', () => showModal('userMenuModal'));
  
  // Logout
  $('logoutBtn').addEventListener('click', handleLogout);
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      hideModal(modal.id);
    });
  });
  
  // Modal overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      hideModal(modal.id);
    });
  });
  
  // Room controls
  $('leaveRoomBtn').addEventListener('click', handleLeaveRoom);
  $('micBtn').addEventListener('click', toggleMic);
  $('shareBtn').addEventListener('click', shareRoom);
  $('roomMenuBtn').addEventListener('click', () => showModal('roomMenuModal'));
  
  // Chat form
  $('chatForm').addEventListener('submit', handleSendMessage);
}

// ========== AUTHENTICATION ==========
async function handleLogin(e) {
  e.preventDefault();
  
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    toast('✅ Connexion réussie');
  } catch (error) {
    console.error('Login error:', error);
    const messages = {
      'auth/user-not-found': 'Aucun compte avec cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/invalid-email': 'Email invalide',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.'
    };
    toast(messages[error.code] || 'Erreur de connexion');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const name = $('registerName').value.trim();
  const email = $('registerEmail').value.trim();
  const password = $('registerPassword').value;
  
  if (password.length < 6) {
    return toast('Le mot de passe doit contenir au moins 6 caractères');
  }
  
  try {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName: name });
    
    await db.collection('users').doc(credential.user.uid).set({
      displayName: name,
      email,
      isAnonymous: false,
      totalEarnings: 0,
      totalLives: 0,
      createdAt: firebase.firestore.Timestamp.now()
    });
    
    toast('✅ Compte créé avec succès');
  } catch (error) {
    console.error('Register error:', error);
    const messages = {
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/invalid-email': 'Email invalide',
      'auth/weak-password': 'Mot de passe trop faible'
    };
    toast(messages[error.code] || 'Erreur lors de l\'inscription');
  }
}

async function handleGuestLogin() {
  try {
    const credential = await auth.signInAnonymously();
    const guestName = `Invité${Math.floor(Math.random() * 10000)}`;
    
    await db.collection('users').doc(credential.user.uid).set({
      displayName: guestName,
      isAnonymous: true,
      createdAt: firebase.firestore.Timestamp.now()
    });
    
    toast(`✅ Connecté en tant que ${guestName}`);
  } catch (error) {
    console.error('Guest login error:', error);
    toast('Erreur lors de la connexion invité');
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    toast('✅ Déconnexion réussie');
  } catch (error) {
    console.error('Logout error:', error);
    toast('Erreur lors de la déconnexion');
  }
}

async function handleAuthStateChange(user) {
  if (user) {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    State.user = {
      uid: user.uid,
      name: userData.displayName,
      email: user.email,
      isAnonymous: userData.isAnonymous
    };
    
    updateUserUI();
    showScreen('mainScreen');
    loadViewContent('explore');
    
    // Request notification permission
    requestNotificationPermission();
    
    // Listen for new lives
    listenForNewLives();
  } else {
    State.user = null;
    showScreen('authScreen');
  }
}

function updateUserUI() {
  const avatar = State.user.name.charAt(0).toUpperCase();
  $('headerAvatar').textContent = avatar;
  
  if ($('profileName')) {
    $('profileName').textContent = State.user.name;
    $('profileEmail').textContent = State.user.email || 'Invité';
  }
}

// ========== THEME ==========
function toggleTheme() {
  State.darkMode = !State.darkMode;
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('darkMode', State.darkMode);
  
  toast(State.darkMode ? '🌙 Mode sombre activé' : '☀️ Mode clair activé');
}

// ========== NOTIFICATIONS ==========
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/badge.png',
      tag: 'sis-live'
    });
  }
}

function listenForNewLives() {
  let isFirstLoad = true;
  
  db.collection('lives')
    .where('status', '==', 'active')
    .onSnapshot(snapshot => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }
      
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const live = change.doc.data();
          if (live.hostId !== State.user.uid) {
            showNotification(
              '🎙️ Nouveau live !',
              `${live.hostName} : ${live.title}`
            );
          }
        }
      });
    });
}

// ========== MODERATION BOT ==========
const ModerationBot = {
  checkMessage(userId, message) {
    // Check for bad words
    const lowerMessage = message.toLowerCase();
    for (const word of CONFIG.moderation.badWords) {
      if (lowerMessage.includes(word)) {
        this.warnUser(userId, 'langage inapproprié');
        return false;
      }
    }
    
    // Check for suspicious patterns (links, scams)
    for (const pattern of CONFIG.moderation.suspiciousPatterns) {
      if (pattern.test(message)) {
        this.warnUser(userId, 'contenu suspect détecté');
        return false;
      }
    }
    
    return true;
  },
  
  warnUser(userId, reason) {
    if (!State.warnings[userId]) {
      State.warnings[userId] = 0;
    }
    
    State.warnings[userId]++;
    
    const warningCount = State.warnings[userId];
    
    if (warningCount >= CONFIG.moderation.maxWarnings) {
      this.banUser(userId);
    } else {
      this.sendWarning(userId, warningCount, reason);
    }
  },
  
  sendWarning(userId, count, reason) {
    const remainingWarnings = CONFIG.moderation.maxWarnings - count;
    
    // Send warning message to chat
    const botMessage = {
      userId: 'bot',
      userName: '🤖 Modération SIS',
      message: `⚠️ Avertissement ${count}/${CONFIG.moderation.maxWarnings} pour ${reason}. ${remainingWarnings} avertissement(s) restant(s) avant bannissement.`,
      timestamp: Date.now(),
      isBot: true
    };
    
    // Add to chat
    if (State.liveId) {
      rtdb.ref(`lives/${State.liveId}/messages`).push(botMessage);
    }
  },
  
  async banUser(userId) {
    State.bannedUsers.add(userId);
    
    // Remove from live
    if (State.liveId) {
      await rtdb.ref(`lives/${State.liveId}/participants/${userId}`).remove();
    }
    
    // Send ban message
    const botMessage = {
      userId: 'bot',
      userName: '🤖 Modération SIS',
      message: `🚫 Un utilisateur a été banni pour violations répétées des règles.`,
      timestamp: Date.now(),
      isBot: true
    };
    
    if (State.liveId) {
      rtdb.ref(`lives/${State.liveId}/messages`).push(botMessage);
    }
    
    // Save ban to database
    await db.collection('bans').add({
      userId,
      liveId: State.liveId,
      reason: 'Violations répétées des règles',
      timestamp: firebase.firestore.Timestamp.now()
    });
    
    toast('🚫 Utilisateur banni pour violations');
  },
  
  isUserBanned(userId) {
    return State.bannedUsers.has(userId);
  }
};

// ========== CONTENT LOADING ==========
async function loadViewContent(view) {
  switch(view) {
    case 'explore':
      await loadExploreLives();
      break;
    case 'following':
      await loadFollowingLives();
      break;
    case 'trending':
      await loadTrendingLives();
      break;
    case 'history':
      await loadHistoryLives();
      break;
  }
}

async function loadExploreLives() {
  const grid = $('livesGrid');
  grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Chargement...</p>';
  
  try {
    const snapshot = await db.collection('lives')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    if (snapshot.empty) {
      grid.innerHTML = `
        <div style="text-align:center;padding:var(--space-3xl);color:var(--text-secondary)">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto var(--space-md)">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
          <p>Aucun live en cours</p>
          <p style="font-size:0.9rem;margin-top:var(--space-sm)">Soyez le premier à lancer un live !</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = '';
    
    snapshot.forEach(doc => {
      const live = doc.data();
      const card = createLiveCard(doc.id, live);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading lives:', error);
    grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Erreur de chargement</p>';
  }
}

function createLiveCard(liveId, liveData) {
  const card = document.createElement('div');
  card.className = 'live-card';
  
  const duration = liveData.createdAt ? 
    Math.floor((Date.now() - liveData.createdAt.toMillis()) / 1000) : 0;
  
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md)">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:var(--border-radius-full);display:flex;align-items:center;justify-content:center;color:white;font-weight:700">
        ${liveData.hostName.charAt(0)}
      </div>
      <div style="flex:1">
        <h4 style="font-size:1rem;margin-bottom:var(--space-xs)">${liveData.title}</h4>
        <p style="font-size:0.85rem;color:var(--text-secondary)">${liveData.hostName}</p>
      </div>
    </div>
    <div style="display:flex;gap:var(--space-md);font-size:0.85rem;color:var(--text-secondary)">
      <span style="display:flex;align-items:center;gap:var(--space-xs)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        ${liveData.listenerCount || 0}
      </span>
      <span>${formatTime(duration)}</span>
      ${liveData.isPrivate ? '<span>🔒 Privé</span>' : ''}
    </div>
  `;
  
  card.addEventListener('click', () => joinLive(liveId, liveData));
  
  return card;
}

async function loadFollowingLives() {
  // TODO: Implement following functionality
  $('followingGrid').innerHTML = '<p style="text-align:center;padding:var(--space-3xl);color:var(--text-secondary)">Fonctionnalité bientôt disponible</p>';
}

async function loadTrendingLives() {
  const grid = $('trendingGrid');
  
  try {
    const snapshot = await db.collection('lives')
      .where('status', '==', 'active')
      .orderBy('listenerCount', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      grid.innerHTML = '<p style="text-align:center;padding:var(--space-3xl);color:var(--text-secondary)">Aucun live tendance pour le moment</p>';
      return;
    }
    
    grid.innerHTML = '';
    
    snapshot.forEach(doc => {
      const live = doc.data();
      const card = createLiveCard(doc.id, live);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading trending:', error);
  }
}

async function loadHistoryLives() {
  // TODO: Implement history functionality
  $('historyList').innerHTML = '<p style="text-align:center;padding:var(--space-3xl);color:var(--text-secondary)">Historique vide</p>';
}

// ========== CREATE LIVE ==========
async function handleCreateLive(e) {
  e.preventDefault();
  
  if (!State.user) {
    return toast('Vous devez être connecté');
  }
  
  if (State.user.isAnonymous) {
    return toast('Créez un compte pour lancer un live');
  }
  
  const title = $('liveTitle').value.trim();
  const description = $('liveDescription').value.trim();
  const isPrivate = $('isPrivate').checked;
  
  const accessCode = isPrivate ? generateCode() : null;
  
  try {
    const liveRef = await db.collection('lives').add({
      title,
      description,
      hostId: State.user.uid,
      hostName: State.user.name,
      status: 'active',
      isPrivate,
      accessCode,
      listenerCount: 0,
      peakListeners: 0,
      totalRevenue: 0,
      createdAt: firebase.firestore.Timestamp.now()
    });
    
    if (isPrivate && accessCode) {
      await navigator.clipboard.writeText(accessCode);
      toast(`Live créé ! Code: ${accessCode} (copié)`);
    } else {
      toast('Live créé avec succès !');
    }
    
    hideModal('createLiveModal');
    enterLive(liveRef.id, 'host', { title, hostName: State.user.name });
    
  } catch (error) {
    console.error('Error creating live:', error);
    toast('Erreur lors de la création du live');
  }
}

// ========== JOIN LIVE ==========
async function joinLive(liveId, liveData) {
  if (!State.user) {
    return toast('Vous devez être connecté');
  }
  
  try {
    // Check if private
    if (liveData.isPrivate && liveData.hostId !== State.user.uid) {
      const code = prompt('Code d\'accès du live privé:');
      if (!code || code.toUpperCase() !== liveData.accessCode) {
        return toast('Code incorrect');
      }
    }
    
    const role = liveData.hostId === State.user.uid ? 'host' : 'listener';
    await enterLive(liveId, role, liveData);
    
  } catch (error) {
    console.error('Error joining live:', error);
    toast('Erreur lors de la connexion au live');
  }
}

async function enterLive(liveId, role, liveData) {
  State.liveId = liveId;
  State.role = role;
  State.liveStart = Date.now();
  
  // Update UI
  $('roomTitle').textContent = liveData.title;
  $('hostName').textContent = liveData.hostName;
  $('hostBio').textContent = liveData.description || 'Bienvenue sur mon live !';
  
  // Start timer
  State.timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - State.liveStart) / 1000);
    $('roomDuration').textContent = formatTime(elapsed);
  }, 1000);
  
  // Add to participants
  await rtdb.ref(`lives/${liveId}/participants/${State.user.uid}`).set({
    name: State.user.name,
    role,
    joinedAt: Date.now()
  });
  
  // Update listener count
  if (role === 'listener') {
    await db.collection('lives').doc(liveId).update({
      listenerCount: firebase.firestore.FieldValue.increment(1)
    });
  }
  
  // Listen to chat
  listenToChat(liveId);
  
  // Listen to participants
  listenToParticipants(liveId);
  
  // Initialize audio if host
  if (role === 'host') {
    await initializeAudio(liveId);
  }
  
  showScreen('roomScreen');
  toast('✅ Live rejoint');
}

// ========== LEAVE LIVE ==========
async function handleLeaveRoom() {
  if (!State.liveId) return;
  
  clearInterval(State.timer);
  
  // Remove from participants
  await rtdb.ref(`lives/${State.liveId}/participants/${State.user.uid}`).remove();
  
  // Update listener count
  if (State.role === 'listener') {
    await db.collection('lives').doc(State.liveId).update({
      listenerCount: firebase.firestore.FieldValue.increment(-1)
    });
  }
  
  // End live if host
  if (State.role === 'host') {
    await db.collection('lives').doc(State.liveId).update({
      status: 'ended',
      endedAt: firebase.firestore.Timestamp.now()
    });
  }
  
  // Cleanup audio
  if (State.agoraClient) {
    await State.agoraClient.leave();
    if (State.localTrack) {
      State.localTrack.close();
    }
    State.agoraClient = null;
    State.localTrack = null;
  }
  
  State.liveId = null;
  State.role = null;
  
  showScreen('mainScreen');
  loadViewContent('explore');
  
  toast('Live quitté');
}

// ========== CHAT ==========
function listenToChat(liveId) {
  const messagesRef = rtdb.ref(`lives/${liveId}/messages`);
  
  messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    displayMessage(message);
  });
}

function displayMessage(message) {
  const container = $('chatMessages');
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'margin-bottom:var(--space-md);animation:slideUp 0.3s var(--transition-base)';
  
  const isBot = message.isBot;
  const bgColor = isBot ? 'var(--accent)' : 'var(--bg-secondary)';
  const textColor = isBot ? 'var(--text-primary)' : 'inherit';
  
  msgEl.innerHTML = `
    <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-xs)">
      ${message.userName}
    </div>
    <div style="background:${bgColor};color:${textColor};padding:var(--space-sm) var(--space-md);border-radius:var(--border-radius-md)">
      ${message.message}
    </div>
  `;
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

async function handleSendMessage(e) {
  e.preventDefault();
  
  const input = $('chatInput');
  const message = input.value.trim();
  
  if (!message || !State.liveId) return;
  
  // Check if user is banned
  if (ModerationBot.isUserBanned(State.user.uid)) {
    return toast('🚫 Vous êtes banni de ce live');
  }
  
  // Check message with moderation bot
  if (!ModerationBot.checkMessage(State.user.uid, message)) {
    input.value = '';
    return;
  }
  
  try {
    await rtdb.ref(`lives/${State.liveId}/messages`).push({
      userId: State.user.uid,
      userName: State.user.name,
      message,
      timestamp: Date.now(),
      isBot: false
    });
    
    input.value = '';
  } catch (error) {
    console.error('Error sending message:', error);
    toast('Erreur lors de l\'envoi');
  }
}

function listenToParticipants(liveId) {
  rtdb.ref(`lives/${liveId}/participants`).on('value', (snapshot) => {
    const count = snapshot.numChildren();
    $('roomListeners').querySelector('span').textContent = count;
  });
}

// ========== AUDIO ==========
async function initializeAudio(liveId) {
  if (typeof AgoraRTC === 'undefined') {
    console.warn('Agora not available');
    return;
  }
  
  try {
    State.agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    
    const uid = parseInt(State.user.uid.slice(-8), 36);
    await State.agoraClient.join(CONFIG.agora.appId, liveId, null, uid);
    
    State.localTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: {
        sampleRate: 48000,
        stereo: true,
        bitrate: 128
      },
      ANS: true,
      AEC: true,
      AGC: true
    });
    
    await State.agoraClient.publish([State.localTrack]);
    
    State.agoraClient.on('user-published', async (user, mediaType) => {
      await State.agoraClient.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    });
    
    console.log('✅ Audio initialized');
    toast('🎙️ Audio connecté');
    
  } catch (error) {
    console.error('Audio init error:', error);
    toast('Erreur audio');
  }
}

async function toggleMic() {
  if (!State.localTrack) return;
  
  State.muteState = !State.muteState;
  await State.localTrack.setMuted(State.muteState);
  
  const btn = $('micBtn');
  if (State.muteState) {
    btn.style.background = 'var(--primary)';
    btn.style.color = 'white';
    toast('🔇 Micro coupé');
  } else {
    btn.style.background = '';
    btn.style.color = '';
    toast('🎙️ Micro actif');
  }
}

// ========== SHARE ==========
function shareRoom() {
  if (!State.liveId) return;
  
  const url = `${window.location.origin}${window.location.pathname}?live=${State.liveId}`;
  
  if (navigator.share) {
    navigator.share({
      title: $('roomTitle').textContent,
      url
    });
  } else {
    navigator.clipboard.writeText(url);
    toast('✅ Lien copié');
  }
}

// ========== AUTO JOIN FROM URL ==========
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const liveId = params.get('live');
  
  if (liveId && State.user) {
    setTimeout(async () => {
      const liveDoc = await db.collection('lives').doc(liveId).get();
      if (liveDoc.exists) {
        await joinLive(liveId, liveDoc.data());
      }
    }, 1000);
  }
});

console.log('✅ SIS Live Audio loaded successfully');
