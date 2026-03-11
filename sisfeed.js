// ═══════════════════════════════════════════════════════════════════
// SISFEED.JS — Say It Safely · Feed Social Anonyme
// Vanilla JS · Firebase Compat · Pas de mock · Pas de type="module"
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────
// 0. CONSTANTES GLOBALES
// ─────────────────────────────────────────────────────────────────

var SIS_CERTIFIED_EMAIL = 'gbaguidiexauce@gmail.com';
var POSTS_PER_BATCH     = 20;
var READER_TTL_MS       = 30000;   // 30s
var VIBE_REFRESH_MS     = 300000;  // 5 min
var LIVE_REFRESH_MS     = 15000;   // 15s
var STORY_DURATION_MS   = 5000;    // 5s par story

var LEVEL_NAMES = [
  'Inconnu',            // 0
  'Voix du Peuple',     // 1
  'Ombre Parlante',     // 2
  'Murmure Éternel',    // 3
  'Spectre Vocal',      // 4
  'Fantôme Confirmé',   // 5
  'Conscience Libre',   // 6
  'Voix du Peuple',     // 7
  'Fantôme Certifié',   // 8
  'Légende Anonyme',    // 9
  'Gardien des Secrets' // 10
];

var LEVEL_THRESHOLDS = [0,50,150,300,500,800,1200,1800,2600,3600,5000];

// ─────────────────────────────────────────────────────────────────
// 1. ÉTAT GLOBAL
// ─────────────────────────────────────────────────────────────────

var sisState = {
  user:           null,   // firebase user object
  userDoc:        null,   // Firestore /users/{uid}
  ghostMode:      false,
  theme:          'dark',
  currentTab:     'global',
  currentMood:    null,
  currentTag:     null,
  lastPostDoc:    null,   // curseur infinite scroll
  isLoading:      false,
  hasMore:        true,
  posts:          [],     // posts en mémoire
  currentPostType:'csdpm',
  pactePostId:    null,   // post affiché dans Le Pacte
  isPublishing:   false,  // garde anti multi-tap Le Pacte
  pendingPostData:null,   // post en attente après Le Pacte
  echoTargetId:   null,
  menuTargetId:   null,
  storyQueue:     [],
  storyIndex:     0,
  storyTimer:     null,
  notifUnread:    0,
  unsubscribers:  [],     // listeners GLOBAUX (notifs, csdpm...) — survivent aux resets
  feedUnsubs:     [],     // listeners PAR POST (réactions, readers, battles) — nettoyés à chaque resetFeed
  burnIntervals:  {},     // timers Burn — nettoyés à chaque resetFeed
  viewedPosts:    {},     // Set posts déjà comptés (Burn) — évite double comptage
  reactingPosts:  {},     // garde anti-spam réactions {postId-type: true}
  readerInterval: null,
  vibeInterval:   null,
  liveInterval:   null
};

// ─────────────────────────────────────────────────────────────────
// 2. AUTH — OVERLAY 3 COUCHES
// ─────────────────────────────────────────────────────────────────

function initAuth() {
  auth.onAuthStateChanged(function(user) {
    if (user) {
      onUserConnected(user);
    } else {
      showAuthOverlay();
    }
  });

  // Boutons landing
  _on('landSignupBtn',  'click', function() { showAuthScreen('signup'); });
  _on('landLoginBtn',   'click', function() { showAuthScreen('login');  });
  _on('landAnonBtn',    'click', signInAnon);
  _on('authBack',       'click', showLanding);
  _on('authSwitchBtn',  'click', toggleAuthMode);
  _on('authSubmit',     'click', handleAuthSubmit);
  _on('authGoogle',     'click', signInGoogle);
  _on('pwToggle',       'click', togglePasswordVisibility);

  // Déconnexion
  _on('ppLogout', 'click', handleLogout);
}

function showAuthOverlay() {
  var overlay = _el('authOverlay');
  if (overlay) overlay.style.display = 'flex';
  showLanding();
}

function hideAuthOverlay() {
  var overlay = _el('authOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showLanding() {
  _show('landingScreen');
  _hide('authScreen');
}

function showAuthScreen(mode) {
  _hide('landingScreen');
  _show('authScreen');
  setAuthMode(mode || 'signup');
}

function setAuthMode(mode) {
  sisState.authMode = mode;
  var isSignup = mode === 'signup';

  _el('authTitle').textContent       = isSignup ? 'Créer un compte' : 'Bon retour';
  _el('authSub').textContent         = isSignup ? 'Anonyme ou identifié, c\'est toi qui choisis.' : 'Content de te revoir.';
  _el('authSubmitLabel').textContent = isSignup ? 'Créer mon compte' : 'Se connecter';
  _el('authSwitchText').textContent  = isSignup ? 'Déjà un compte ?' : 'Pas encore de compte ?';
  _el('authSwitchBtn').textContent   = isSignup ? 'Se connecter' : 'Créer un compte';

  _setHidden('fieldPseudo', !isSignup);
  clearAuthError();
}

function toggleAuthMode() {
  setAuthMode(sisState.authMode === 'signup' ? 'login' : 'signup');
}

function handleAuthSubmit() {
  var email    = _val('inputEmail').trim();
  var password = _val('inputPassword');
  var isSignup = sisState.authMode === 'signup';

  clearAuthError();

  if (!email || !password) {
    showAuthError('Remplis tous les champs.');
    return;
  }
  if (password.length < 6) {
    showAuthError('Mot de passe trop court (6 caractères min).');
    return;
  }

  setAuthLoading(true);

  if (isSignup) {
    var pseudo = _val('inputPseudo').trim();
    if (!pseudo) { showAuthError('Choisis un pseudo.'); setAuthLoading(false); return; }

    auth.createUserWithEmailAndPassword(email, password)
      .then(function(cred) {
        return cred.user.updateProfile({ displayName: pseudo })
          .then(function() { return cred.user; });
      })
      .then(function(user) {
        return initUserDoc(user);
      })
      .catch(handleAuthError);
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .catch(handleAuthError);
  }
}

function signInAnon() {
  setAuthLoading(true);
  auth.signInAnonymously().catch(handleAuthError);
}

function signInGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(handleAuthError);
}

function handleAuthError(err) {
  setAuthLoading(false);
  var msgs = {
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/invalid-email':        'Email invalide.',
    'auth/wrong-password':       'Mot de passe incorrect.',
    'auth/user-not-found':       'Aucun compte avec cet email.',
    'auth/weak-password':        'Mot de passe trop faible.',
    'auth/too-many-requests':    'Trop de tentatives. Réessaie plus tard.',
    'auth/network-request-failed': 'Problème de connexion.'
  };
  showAuthError(msgs[err.code] || 'Une erreur est survenue.');
}

function showAuthError(msg) {
  var el = _el('authError');
  if (!el) return;
  el.textContent = msg;
  _show('authError');
}

function clearAuthError() {
  _hide('authError');
}

function setAuthLoading(on) {
  _setHidden('authSpinner', !on);
  var btn = _el('authSubmit');
  if (btn) btn.disabled = on;
}

function togglePasswordVisibility() {
  var inp = _el('inputPassword');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function handleLogout() {
  // Nettoyer les listeners
  sisState.unsubscribers.forEach(function(fn) { try { fn(); } catch(e) {} });
  sisState.unsubscribers = [];
  clearInterval(sisState.readerInterval);
  clearInterval(sisState.vibeInterval);
  clearInterval(sisState.liveInterval);

  auth.signOut().then(function() {
    sisState.user    = null;
    sisState.userDoc = null;
    showAuthOverlay();
  });
}

// ─────────────────────────────────────────────────────────────────
// 3. INITIALISATION APRÈS CONNEXION
// ─────────────────────────────────────────────────────────────────

function onUserConnected(user) {
  sisState.user = user;
  hideAuthOverlay();
  setAuthLoading(false);

  // Certification
  sisState.isCertified = !user.isAnonymous && user.email === SIS_CERTIFIED_EMAIL;

  // Charger/créer le doc utilisateur
  loadUserDoc(user).then(function() {
    applyTheme(sisState.theme);
    renderUserUI();

    // Appliquer le filtre tag AVANT initFeed pour que loadPosts() l'utilise dès le premier appel
    checkTagFilter();

    initFeed();
    initStories();
    initWidgets();
    initNotifications();
    initStreak();
    startReaderPing();
    startVibeRefresh();
    startLivePulse();
  });

  // Bouton certification — masqué si déjà certifié
  if (sisState.isCertified) {
    _hide('certCard');
    _show('certifiedOpt');
  }
}

function initUserDoc(user) {
  var pseudo = user.displayName || generateAnonPseudo(user.uid);
  return db.collection('users').doc(user.uid).set({
    displayName:  pseudo,
    isCertified:  !user.isAnonymous && user.email === SIS_CERTIFIED_EMAIL,
    isAnonymous:  user.isAnonymous,
    ghostMode:    false,
    level:        1,
    points:       0,
    streak:       0,
    lastVisit:    todayStr(),
    createdAt:    firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function loadUserDoc(user) {
  return db.collection('users').doc(user.uid).get()
    .then(function(snap) {
      if (!snap.exists) {
        return initUserDoc(user).then(function() { return loadUserDoc(user); });
      }
      sisState.userDoc  = snap.data();
      sisState.ghostMode = sisState.userDoc.ghostMode || false;
      sisState.theme    = localStorage.getItem('sis-theme') || 'dark';
    });
}

// ─────────────────────────────────────────────────────────────────
// 4. RENDU UI UTILISATEUR
// ─────────────────────────────────────────────────────────────────

function renderUserUI() {
  var user   = sisState.user;
  var doc    = sisState.userDoc || {};
  var pseudo = user.isAnonymous
    ? generateAnonPseudo(user.uid)
    : (user.displayName || doc.displayName || 'Anonyme');

  // Topbar avatar
  var topAvatar = _el('topAvatar');
  if (topAvatar) topAvatar.innerHTML = generateAvatarSVG(user.uid, 32);

  // Sidebar user card
  var ucAvatar = _el('ucAvatar');
  if (ucAvatar) ucAvatar.innerHTML = generateAvatarSVG(user.uid, 48);

  setText('ucName',   sisState.isCertified ? pseudo + ' ' + certBadgeSVG() : pseudo);
  setText('ucPseudo', user.isAnonymous ? 'Mode anonyme' : user.email || '');

  // Composer avatar
  var compAvatar = _el('compAvatar');
  if (compAvatar) compAvatar.innerHTML = generateAvatarSVG(user.uid, 36);

  // Level
  renderLevelBar();

  // Ghost Mode
  applyGhostMode(sisState.ghostMode);

  // Panel profil mobile
  var ppAvatar = _el('ppAvatar');
  if (ppAvatar) ppAvatar.innerHTML = generateAvatarSVG(user.uid, 52);
  setText('ppName',   pseudo);
  setText('ppSub',    user.isAnonymous ? 'Mode anonyme' : (user.email || ''));
  renderPPStats();
}

function renderLevelBar() {
  var doc    = sisState.userDoc || {};
  var pts    = doc.points || 0;
  var lvl    = getLevelFromPoints(pts);
  var curMin = LEVEL_THRESHOLDS[lvl]     || 0;
  var nxtMin = LEVEL_THRESHOLDS[lvl + 1] || curMin + 100;
  var pct    = Math.min(100, Math.round(((pts - curMin) / (nxtMin - curMin)) * 100));
  var name   = LEVEL_NAMES[lvl] || 'Niveau ' + lvl;
  var next   = LEVEL_NAMES[lvl + 1] || '???';

  setText('levelName',  'Niveau ' + lvl + ' — ' + name);
  setText('levelPts',   pts + ' pts');
  setText('levelNext',  'Prochain niveau : ' + next);
  setStyle('levelFill', 'width', pct + '%');

  // Panel profil
  setText('ppLevelName', 'Niveau ' + lvl + ' — ' + name);
  setText('ppLevelPts',  pts + ' / ' + nxtMin + ' pts');
  setText('ppLevelNext', 'Prochain niveau : ' + next);
  setStyle('ppLevelFill','width', pct + '%');
  setText('ppLevel', lvl);
}

function renderPPStats() {
  var doc = sisState.userDoc || {};
  setText('ppPosts',     doc.postCount     || 0);
  setText('ppReactions', doc.reactionCount || 0);
  setText('ppEchos',     doc.echoCount     || 0);
  setText('ucPosts',     doc.postCount     || 0);
  setText('ucReactions', doc.reactionCount || 0);
  setText('ucEchos',     doc.echoCount     || 0);
}

// ─────────────────────────────────────────────────────────────────
// 5. THÈME CLAIR / SOMBRE
// ─────────────────────────────────────────────────────────────────

function initTheme() {
  var saved = localStorage.getItem('sis-theme') || 'dark';
  applyTheme(saved);
  _on('themeBtn',     'click', toggleTheme);
  _on('ppThemeToggle','click', toggleTheme);
  _on('ppThemeToggle','keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') toggleTheme();
  });
}

function toggleTheme() {
  applyTheme(sisState.theme === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  sisState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('light', theme === 'light');
  localStorage.setItem('sis-theme', theme);

  // Icône topbar
  var ico = _el('themeIco');
  if (ico) ico.innerHTML = theme === 'dark' ? sunSVG() : moonSVG();

  // Label panel profil
  setText('ppThemeSub', theme === 'dark' ? 'Mode sombre actif' : 'Mode clair actif');
}

function sunSVG() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

function moonSVG() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

// ─────────────────────────────────────────────────────────────────
// 6. GHOST MODE
// ─────────────────────────────────────────────────────────────────

function initGhostMode() {
  _on('ghostToggle',  'click',   toggleGhostMode);
  _on('ghostToggle',  'keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggleGhostMode(); });
  _on('ppGhostToggle','click',   toggleGhostMode);
  _on('ppGhostToggle','keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') toggleGhostMode(); });
}

function toggleGhostMode() {
  applyGhostMode(!sisState.ghostMode);
  if (sisState.user) {
    db.collection('users').doc(sisState.user.uid)
      .update({ ghostMode: sisState.ghostMode })
      .catch(function() {});
  }
}

function applyGhostMode(on) {
  sisState.ghostMode = on;

  // Toggle pills
  var pill1 = _el('ghostPill');
  var pill2 = _el('ppGhostPill');
  if (pill1) pill1.classList.toggle('on', on);
  if (pill2) pill2.classList.toggle('on', on);

  // ARIA
  var gt = _el('ghostToggle');
  var pp = _el('ppGhostToggle');
  if (gt) gt.setAttribute('aria-checked', on ? 'true' : 'false');
  if (pp) pp.setAttribute('aria-checked', on ? 'true' : 'false');

  // Indicateur dans le composer
  _setHidden('ghostIndicator', !on);

  // Classe body pour effets CSS optionnels
  document.body.classList.toggle('ghost-active', on);
}

// ─────────────────────────────────────────────────────────────────
// 7. STREAK
// ─────────────────────────────────────────────────────────────────

function initStreak() {
  if (!sisState.user || sisState.user.isAnonymous) return;
  var uid = sisState.user.uid;
  var doc = sisState.userDoc || {};
  var today = todayStr();
  var last  = doc.lastVisit || '';
  var streak = doc.streak || 0;

  if (last === today) {
    // Déjà visité aujourd'hui
    renderStreak(streak);
    return;
  }

  var yesterday = yesterdayStr();
  var newStreak;

  if (last === yesterday) {
    newStreak = streak + 1;
  } else if (last === '') {
    newStreak = 1;
  } else {
    newStreak = 0;
    if (streak > 0) {
      showToast('Ton streak s\'est éteint.', 'muted');
    }
  }

  db.collection('users').doc(uid).update({
    streak:    newStreak,
    lastVisit: today
  }).catch(function() {});

  sisState.userDoc.streak    = newStreak;
  sisState.userDoc.lastVisit = today;
  renderStreak(newStreak);
}

function renderStreak(n) {
  setText('streakCount', n);
  setText('ppStreak', n > 0 ? '🔥 ' + n + ' jour' + (n > 1 ? 's' : '') + ' de streak' : '');

  // Aura après 5 posts
  var doc = sisState.userDoc || {};
  if ((doc.postCount || 0) >= 5 && !sessionStorage.getItem('sis-aura-shown')) {
    sessionStorage.setItem('sis-aura-shown', '1');
    setTimeout(function() {
      showToast('Ton aura commence à se former. ✦', 'purple');
    }, 3000);
  }
}

// ─────────────────────────────────────────────────────────────────
// 8. FEED — TABS ET NAVIGATION
// ─────────────────────────────────────────────────────────────────

function initFeed() {
  // Tabs
  var tabs = document.querySelectorAll('.ftab');
  tabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('ftab-active'); t.setAttribute('aria-selected','false'); });
      btn.classList.add('ftab-active');
      btn.setAttribute('aria-selected','true');
      sisState.currentTab = btn.dataset.tab;
      resetFeed();
      loadPosts();
    });
  });

  // Sidebar nav
  var snItems = document.querySelectorAll('.sn-item');
  snItems.forEach(function(btn) {
    btn.addEventListener('click', function() {
      snItems.forEach(function(s) { s.classList.remove('sn-active'); });
      btn.classList.add('sn-active');
      sisState.currentTab = btn.dataset.section;
      resetFeed();
      loadPosts();
      // Sync tabs du feed
      tabs.forEach(function(t) {
        t.classList.toggle('ftab-active', t.dataset.tab === btn.dataset.section);
        t.setAttribute('aria-selected', t.dataset.tab === btn.dataset.section ? 'true' : 'false');
      });
    });
  });

  // Mood Pills
  var pills = document.querySelectorAll('.mpill');
  pills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      if (pill.classList.contains('active')) {
        pill.classList.remove('active');
        sisState.currentMood = null;
      } else {
        pills.forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        sisState.currentMood = pill.dataset.mood;
      }
      resetFeed();
      loadPosts();
    });
  });

  // Infinite scroll
  var sentinel = _el('scrollSentinel');
  if (sentinel && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !sisState.isLoading && sisState.hasMore) {
        loadPosts();
      }
    }, { threshold: 0.1 });
    io.observe(sentinel);
  }

  // Charger le premier batch
  loadPosts();
}

function resetFeed() {
  // Nettoyer tous les listeners par-post avant de vider le DOM
  sisState.feedUnsubs.forEach(function(fn) { try { fn(); } catch(e) {} });
  sisState.feedUnsubs = [];

  // Nettoyer tous les timers Burn
  Object.keys(sisState.burnIntervals).forEach(function(id) {
    clearInterval(sisState.burnIntervals[id]);
  });
  sisState.burnIntervals = {};

  sisState.lastPostDoc = null;
  sisState.hasMore     = true;
  sisState.posts       = [];
  var list = _el('postsList');
  if (list) list.innerHTML = '';
  _hide('feedEmpty');
}

function checkTagFilter() {
  var params = new URLSearchParams(window.location.search);
  var tag    = params.get('tag');
  if (tag) {
    sisState.currentTag = tag;
    _show('tagFilterBar');
    setText('tfLabel', '#' + tag);
    // Pas de loadPosts() ici — initFeed() l'appellera avec currentTag déjà défini
  }
  _on('tfClear', 'click', clearTagFilter);
}

function clearTagFilter() {
  sisState.currentTag = null;
  _hide('tagFilterBar');
  history.replaceState(null, '', window.location.pathname);
  resetFeed();
  loadPosts();
}

// ─────────────────────────────────────────────────────────────────
// 9. CHARGEMENT DES POSTS
// ─────────────────────────────────────────────────────────────────

function loadPosts() {
  if (sisState.isLoading || !sisState.hasMore) return;
  sisState.isLoading = true;
  _show('feedLoader');

  var q = buildQuery();

  q.get().then(function(snap) {
    _hide('feedLoader');
    sisState.isLoading = false;

    if (snap.empty) {
      sisState.hasMore = false;
      if (sisState.posts.length === 0) _show('feedEmpty');
      return;
    }

    sisState.lastPostDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < POSTS_PER_BATCH) sisState.hasMore = false;

    // Algorithme Variable Reward — mélanger les types
    var newPosts = snap.docs.map(function(doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });

    // Filtrer les posts expirés côté client
    newPosts = newPosts.filter(function(p) {
      if (p.type === 'burn' && p.isExpired) return false;
      if (p.expiresAt && p.expiresAt.toDate && p.expiresAt.toDate() < new Date()) return false;
      return true;
    });

    newPosts = variableRewardShuffle(newPosts);
    sisState.posts = sisState.posts.concat(newPosts);

    var list = _el('postsList');
    newPosts.forEach(function(post) {
      var el = createPostElement(post);
      if (el) {
        el.classList.add('post-enter');
        list.appendChild(el);
        // Enregistrer la vue si pas Ghost Mode
        if (!sisState.ghostMode) registerView(post.id);
        // Démarrer les timers Burn
        if (post.type === 'burn') startBurnTimer(post);
        // Lancer le listener réactions temps réel
        listenPostReactions(post.id);
        // Lancer le listener lecteurs actifs (Social Proof)
        listenActiveReaders(post.id);
      }
    });

    if (sisState.posts.length === 0) _show('feedEmpty');
    else _hide('feedEmpty');
  }).catch(function(err) {
    _hide('feedLoader');
    sisState.isLoading = false;
    console.error('loadPosts error:', err);
    showToast('Erreur lors du chargement.', 'error');
  });
}

function buildQuery() {
  var col = db.collection('posts');
  var q;

  // Requêtes simplifiées : un seul champ de filtre + orderBy createdAt
  // Évite les index composites Firebase. Le filtre isExpired est fait côté client.
  if (sisState.currentTag) {
    // array-contains + orderBy createdAt : index simple suffit
    q = col.where('hashtags','array-contains', sisState.currentTag)
           .orderBy('createdAt','desc');
  } else if (sisState.currentTab === 'viral') {
    q = col.orderBy('heatScore','desc');
  } else if (sisState.currentTab === 'csdpm') {
    q = col.where('type','==','csdpm').orderBy('createdAt','desc');
  } else if (sisState.currentTab === 'whispers') {
    q = col.where('type','==','whisper').orderBy('createdAt','desc');
  } else if (sisState.currentTab === 'battles') {
    q = col.where('type','==','battle').orderBy('createdAt','desc');
  } else if (sisState.currentMood) {
    q = col.where('topic','==', sisState.currentMood).orderBy('createdAt','desc');
  } else {
    // Global / following : tri simple, aucun index requis
    q = col.orderBy('createdAt','desc');
  }

  q = q.limit(POSTS_PER_BATCH);

  if (sisState.lastPostDoc) {
    q = q.startAfter(sisState.lastPostDoc);
  }

  return q;
}

function variableRewardShuffle(posts) {
  // Garantit qu'on n'a jamais 2 types identiques consécutifs
  if (posts.length <= 1) return posts;
  var result = [];
  var remaining = posts.slice();
  var lastType = '';

  while (remaining.length > 0) {
    var diff = remaining.filter(function(p) { return p.type !== lastType; });
    var pool = diff.length > 0 ? diff : remaining;
    var idx  = Math.floor(Math.random() * pool.length);
    var picked = pool[idx];
    result.push(picked);
    lastType = picked.type;
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// 10. CRÉATION DES ÉLÉMENTS POST
// ─────────────────────────────────────────────────────────────────

function createPostElement(post) {
  var el = document.createElement('article');
  el.className = 'post post-' + post.type;
  el.dataset.id = post.id;

  // Heat Score border
  var heat = post.heatScore || 0;
  if (heat >= 100) el.classList.add('heat-viral');
  else if (heat >= 50) el.classList.add('heat-warm');

  el.innerHTML = buildPostHTML(post);
  attachPostEvents(el, post);
  return el;
}

function buildPostHTML(post) {
  var echoBar = post.echoOf ? buildEchoBar(post) : '';
  var header  = buildPostHeader(post);
  var body    = buildPostBody(post);
  var footer  = buildPostFooter(post);
  return echoBar + header + body + footer;
}

function buildPostHeader(post) {
  var avatarUID  = post.isAnonymous ? post.authorId : post.authorId;
  var avatarHTML = generateAvatarSVG(avatarUID, 36);
  var name       = post.isAnonymous ? 'Anonyme' : (post.authorDisplay || 'Ombre');
  var certHTML   = post.isCertified ? ' ' + certBadgeSVG() : '';
  var anonBadge  = post.isAnonymous ? '<span class="anon-tag">👁️ Anonyme</span>' : '';
  var heatBadge  = (post.heatScore || 0) >= 100 ? '<span class="heat-badge">🔥 En feu</span>' : '';
  var timeStr    = formatTime(post.createdAt);
  var typeLabel  = postTypeLabel(post.type);

  return '<div class="post-header">'
    + '<div class="post-avatar">' + avatarHTML + '</div>'
    + '<div class="post-meta">'
    +   '<div class="post-name">' + escHtml(name) + certHTML + anonBadge + heatBadge + '</div>'
    +   '<div class="post-time-type">'
    +     '<span class="post-time">' + timeStr + '</span>'
    +     '<span class="post-type-tag post-type-' + post.type + '">' + typeLabel + '</span>'
    +   '</div>'
    + '</div>'
    + '<button class="post-menu-btn" data-id="' + post.id + '" aria-label="Options du post">'
    +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
    + '</button>'
    + '</div>';
}

function buildPostBody(post) {
  switch (post.type) {
    case 'confession': return buildConfessionBody(post);
    case 'csdpm':      return buildCSDPMBody(post);
    case 'whisper':    return buildWhisperBody(post);
    case 'battle':     return buildBattleBody(post);
    case 'burn':       return buildBurnBody(post);
    case 'media':      return buildMediaBody(post);
    default:           return buildConfessionBody(post);
  }
}

function buildConfessionBody(post) {
  var text = post.content || '';
  var long  = text.length > 280;
  var shown = long ? text.substring(0, 280) : text;
  return '<div class="post-body">'
    + '<p class="post-text' + (long ? ' truncated' : '') + '" data-full="' + encodeHtml(text) + '">' + escHtml(shown) + (long ? '...' : '') + '</p>'
    + (long ? '<button class="expand-btn" data-id="' + post.id + '">Lire la suite →</button>' : '')
    + buildHashtags(post.hashtags)
    + buildReadersCount(post)
    + '</div>';
}

function buildCSDPMBody(post) {
  return '<div class="post-body csdpm-body">'
    + '<div class="csdpm-label">Ça se dit pas mais...</div>'
    + '<p class="csdpm-text">' + escHtml(post.content || '') + '</p>'
    + buildHashtags(post.hashtags)
    + buildReadersCount(post)
    + '</div>';
}

function buildWhisperBody(post) {
  return '<div class="post-body whisper-body">'
    + '<div class="whisper-wrap" data-id="' + post.id + '">'
    +   '<p class="whisper-text blurred">' + escHtml(post.content || '') + '</p>'
    +   '<div class="whisper-overlay">'
    +     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>'
    +     '<span>Clique pour révéler</span>'
    +   '</div>'
    + '</div>'
    + '<div class="whisper-count" id="wc-' + post.id + '">' + (post.whisperReveals || 0) + ' personnes ont osé lire</div>'
    + buildHashtags(post.hashtags)
    + '</div>';
}

function buildBattleBody(post) {
  var opts    = post.battleOptions || [];
  var total   = opts.reduce(function(s, o) { return s + (o.votes || 0); }, 0);
  var closed  = post.battleEndsAt && post.battleEndsAt.toDate && post.battleEndsAt.toDate() < new Date();
  var html    = '<div class="post-body battle-body">'
    + '<p class="battle-question">' + escHtml(post.content || '') + '</p>'
    + '<div class="battle-options" data-id="' + post.id + '">';

  opts.forEach(function(opt, i) {
    var pct = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
    html += '<button class="battle-opt' + (closed ? ' closed' : '') + '" data-opt="' + i + '" data-id="' + post.id + '">'
      + '<span class="bopt-label">' + escHtml(opt.label || '') + '</span>'
      + '<div class="bopt-bar-wrap"><div class="bopt-bar" style="width:' + pct + '%"></div></div>'
      + '<span class="bopt-pct">' + pct + '% (' + (opt.votes || 0) + ')</span>'
      + '</button>';
  });

  html += '</div>';
  if (closed) html += '<div class="battle-closed-label">Battle terminée</div>';
  else if (post.battleEndsAt && post.battleEndsAt.toDate) {
    html += '<div class="battle-timer" id="bt-' + post.id + '">Fermeture dans ' + timeUntil(post.battleEndsAt.toDate()) + '</div>';
    // Démarrer le timer live
    startBattleTimer(post);
  }
  html += buildHashtags(post.hashtags) + '</div>';
  return html;
}

function startBattleTimer(post) {
  var id = post.id;
  var interval = setInterval(function() {
    var el = _el('bt-' + id);
    if (!el) { clearInterval(interval); return; }
    var endsAt = post.battleEndsAt.toDate ? post.battleEndsAt.toDate() : new Date(post.battleEndsAt);
    var diff   = endsAt - new Date();
    if (diff <= 0) {
      el.textContent = 'Battle terminée';
      clearInterval(interval);
    } else {
      el.textContent = 'Fermeture dans ' + formatCountdown(diff);
    }
  }, 1000);
  sisState.feedUnsubs.push(function() { clearInterval(interval); });
}

function buildBurnBody(post) {
  var maxViews = post.maxViews  || 100;
  var views    = post.viewCount || 0;
  var pct      = Math.min(100, Math.round(views / maxViews * 100));
  var remaining = maxViews - views;

  return '<div class="post-body burn-body">'
    + '<div class="burn-bar-wrap">'
    +   '<div class="burn-bar-fill" id="bb-' + post.id + '" style="width:' + pct + '%"></div>'
    + '</div>'
    + '<div class="burn-meta">'
    +   '<span class="burn-views">' + remaining + ' vues restantes</span>'
    +   '<span class="burn-timer" id="btm-' + post.id + '"></span>'
    + '</div>'
    + '<p class="post-text">' + escHtml(post.content || '') + '</p>'
    + buildHashtags(post.hashtags)
    + '</div>';
}

function buildMediaBody(post) {
  var media = '';
  if (post.mediaUrl) {
    if (post.mediaType === 'gif' || post.mediaUrl.includes('tenor')) {
      media = '<img class="post-media" src="' + post.mediaUrl + '" alt="GIF" loading="lazy"/>';
    } else if (post.mediaType === 'video') {
      media = '<video class="post-media" src="' + post.mediaUrl + '" controls playsinline></video>';
    } else {
      media = '<img class="post-media" src="' + post.mediaUrl + '" alt="Image" loading="lazy"/>';
    }
  }
  return '<div class="post-body media-body">'
    + (post.content ? '<p class="post-text">' + escHtml(post.content) + '</p>' : '')
    + media
    + buildHashtags(post.hashtags)
    + buildReadersCount(post)
    + '</div>';
}

function buildPostFooter(post) {
  var r = post.reactions || {};
  return '<div class="post-footer">'
    + '<div class="post-reactions">'
    +   reactionBtn('fire',       '🔥', r.fire       || 0, post.id)
    +   reactionBtn('heart_fire', '❤️‍🔥', r.heart_fire || 0, post.id)
    +   reactionBtn('skull',      '💀', r.skull      || 0, post.id)
    +   reactionBtn('eye',        '👁️',  r.eye        || 0, post.id)
    + '</div>'
    + '<div class="post-actions">'
    +   '<button class="pa-btn comment-btn" data-id="' + post.id + '">'
    +     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    +     '<span class="pa-count" id="cc-' + post.id + '">' + (post.commentCount || 0) + '</span>'
    +   '</button>'
    + '</div>'
    + '<div class="post-comments-wrap" id="comments-' + post.id + '" hidden></div>'
    + '</div>';
}

function reactionBtn(type, emoji, count, postId) {
  return '<button class="react-btn" data-react="' + type + '" data-id="' + postId + '" aria-label="' + type + '">'
    + '<span class="react-emoji">' + emoji + '</span>'
    + '<span class="react-count" id="rc-' + postId + '-' + type + '">' + formatCount(count) + '</span>'
    + '</button>';
}

function buildHashtags(tags) {
  if (!tags || !tags.length) return '';
  return '<div class="post-hashtags">'
    + tags.map(function(t) {
        return '<button class="hashtag-tag" data-tag="' + escHtml(t) + '">#' + escHtml(t) + '</button>';
      }).join('')
    + '</div>';
}

function buildReadersCount(post) {
  var c = post.activeReaders || 0;
  if (c < 2) return '';
  return '<div class="readers-count" id="rdr-' + post.id + '">'
    + '<span class="rdr-dot"></span>'
    + c + ' personnes lisent ça maintenant'
    + '</div>';
}

function buildEchoBar(post) {
  if (!post.echoOf) return '';
  return '<div class="echo-bar">'
    + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
    + ' Echo d\'une confession anonyme'
    + '</div>';
}

// ─────────────────────────────────────────────────────────────────
// 11. ÉVÉNEMENTS SUR LES POSTS
// ─────────────────────────────────────────────────────────────────

function attachPostEvents(el, post) {
  // Menu 3 points
  var menuBtn = el.querySelector('.post-menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    openPostMenu(post.id, menuBtn);
  });

  // Réactions
  el.querySelectorAll('.react-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      handleReaction(post.id, btn.dataset.react, btn);
    });
  });

  // Expand confession
  var expandBtn = el.querySelector('.expand-btn');
  if (expandBtn) expandBtn.addEventListener('click', function() {
    var textEl = el.querySelector('.post-text');
    if (!textEl) return;
    textEl.textContent = decodeHtml(textEl.dataset.full || '');
    textEl.classList.remove('truncated');
    expandBtn.style.display = 'none';
  });

  // Whisper reveal
  var whisperWrap = el.querySelector('.whisper-wrap');
  if (whisperWrap) whisperWrap.addEventListener('click', function() {
    revealWhisper(post.id, whisperWrap);
  });

  // Battle vote
  el.querySelectorAll('.battle-opt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!btn.classList.contains('closed')) {
        voteBattle(post.id, parseInt(btn.dataset.opt), el);
      }
    });
  });

  // Commentaires
  var commentBtn = el.querySelector('.comment-btn');
  if (commentBtn) commentBtn.addEventListener('click', function() {
    toggleComments(post.id, el);
  });

  // Hashtags
  el.querySelectorAll('.hashtag-tag').forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterByTag(btn.dataset.tag);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// 12. RÉACTIONS
// ─────────────────────────────────────────────────────────────────

function handleReaction(postId, type, btn) {
  if (!sisState.user) return;

  // Garde anti-spam — une réaction par type par post
  var key = postId + '-' + type;
  if (sisState.reactingPosts[key]) return;
  sisState.reactingPosts[key] = true;

  var uid = sisState.user.uid;

  // Animation Storm
  triggerReactionStorm(btn, type);

  // Update optimiste
  var countEl = _el('rc-' + postId + '-' + type);
  if (countEl) {
    var cur = parseInt(countEl.textContent) || 0;
    countEl.textContent = formatCount(cur + 1);
  }
  btn.classList.add('reacted');
  btn.disabled = true;

  // First Reactor
  var postRef = db.collection('posts').doc(postId);
  postRef.get().then(function(snap) {
    if (!snap.exists) return;
    var data   = snap.data();
    var update = {};
    update['reactions.' + type] = firebase.firestore.FieldValue.increment(1);
    if (!data.firstReactor) update.firstReactor = uid;
    return postRef.update(update);
  }).catch(function() {}).finally(function() {
    // Ne jamais débloquer — une réaction par type par post par session
  });

  // Points utilisateur (+1 par réaction donnée)
  addPoints(1);
}

function triggerReactionStorm(btn, type) {
  var tpl = _el('reactionStormTpl');
  if (!tpl) return;
  var storm = tpl.content.cloneNode(true).firstElementChild;
  var rect  = btn.getBoundingClientRect();
  storm.style.position = 'fixed';
  storm.style.left = (rect.left + rect.width  / 2 - 50) + 'px';
  storm.style.top  = (rect.top  + rect.height / 2 - 50) + 'px';
  storm.style.zIndex = '9999';
  storm.style.pointerEvents = 'none';
  document.body.appendChild(storm);
  storm.classList.add('storm-animate');
  setTimeout(function() { storm.remove(); }, 800);
}

function listenPostReactions(postId) {
  var unsub = db.collection('posts').doc(postId)
    .onSnapshot(function(snap) {
      if (!snap.exists) return;
      var data = snap.data();
      var r    = data.reactions || {};
      var types = ['fire','heart_fire','skull','eye'];
      types.forEach(function(t) {
        var el = _el('rc-' + postId + '-' + t);
        if (el) el.textContent = formatCount(r[t] || 0);
      });
      // Heat badge
      var postEl = document.querySelector('[data-id="' + postId + '"]');
      if (postEl) {
        var heat = data.heatScore || 0;
        postEl.classList.toggle('heat-viral', heat >= 100);
        postEl.classList.toggle('heat-warm',  heat >= 50 && heat < 100);
      }
    }, function() {});
  sisState.feedUnsubs.push(unsub);
}

// ─────────────────────────────────────────────────────────────────
// 13. WHISPER REVEAL
// ─────────────────────────────────────────────────────────────────

function revealWhisper(postId, wrap) {
  var textEl = wrap.querySelector('.whisper-text');
  var overlay = wrap.querySelector('.whisper-overlay');
  if (!textEl || textEl.classList.contains('revealed')) return;

  textEl.classList.remove('blurred');
  textEl.classList.add('revealed');
  if (overlay) overlay.style.display = 'none';

  // Incrémenter le compteur
  db.collection('posts').doc(postId)
    .update({ whisperReveals: firebase.firestore.FieldValue.increment(1) })
    .then(function() {
      return db.collection('posts').doc(postId).get();
    })
    .then(function(snap) {
      if (!snap.exists) return;
      var el = _el('wc-' + postId);
      if (el) el.textContent = (snap.data().whisperReveals || 0) + ' personnes ont osé lire';
    })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 14. BATTLE — VOTE
// ─────────────────────────────────────────────────────────────────

function voteBattle(postId, optIdx, postEl) {
  if (!sisState.user) return;
  var uid = sisState.user.uid;

  // Vérifier si l'UID a déjà voté — côté Firestore (résiste à la navigation privée)
  var voteRef = db.collection('posts').doc(postId);
  voteRef.get().then(function(snap) {
    if (!snap.exists) return;
    var data     = snap.data();
    var voted    = data.votedUsers || [];

    if (voted.indexOf(uid) !== -1) {
      showToast('Tu as déjà voté dans cette battle.', 'muted');
      return;
    }

    var update = {};
    update['battleOptions.' + optIdx + '.votes'] = firebase.firestore.FieldValue.increment(1);
    update['votedUsers'] = firebase.firestore.FieldValue.arrayUnion(uid);

    return voteRef.update(update).then(function() {
      return voteRef.get();
    }).then(function(snap2) {
      if (!snap2.exists) return;
      var d2    = snap2.data();
      var opts  = d2.battleOptions || [];
      var total = opts.reduce(function(s,o) { return s + (o.votes||0); }, 0);
      var btns  = postEl.querySelectorAll('.battle-opt');
      btns.forEach(function(btn, i) {
        var pct = total > 0 ? Math.round((opts[i].votes||0)/total*100) : 0;
        var bar = btn.querySelector('.bopt-bar');
        var pctEl = btn.querySelector('.bopt-pct');
        if (bar)   bar.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '% (' + (opts[i].votes||0) + ')';
      });
    });
  }).catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 15. BURN POST — TIMER
// ─────────────────────────────────────────────────────────────────

function startBurnTimer(post) {
  if (!post.expiresAt) return;
  var id = post.id;

  function update() {
    var now      = new Date();
    var expires  = post.expiresAt.toDate ? post.expiresAt.toDate() : new Date(post.expiresAt);
    var diff     = expires - now;
    var timerEl  = _el('btm-' + id);

    if (diff <= 0) {
      if (timerEl) timerEl.textContent = 'Brûlé 🔥';
      burnPost(id);
      clearInterval(sisState.burnIntervals[id]);
      return;
    }

    if (timerEl) timerEl.textContent = formatCountdown(diff);
  }

  update();
  sisState.burnIntervals[id] = setInterval(update, 1000);
  sisState.feedUnsubs.push(function() { clearInterval(sisState.burnIntervals[id]); });
}

function registerView(postId) {
  // Éviter de compter la même vue deux fois dans la même session
  if (sisState.viewedPosts[postId]) return;
  sisState.viewedPosts[postId] = true;

  db.collection('posts').doc(postId).get().then(function(snap) {
    if (!snap.exists) return;
    var data = snap.data();
    if (data.type !== 'burn') return;

    var maxViews = data.maxViews || 100;

    // Utiliser FieldValue.increment pour éviter les conflits d'écriture concurrents
    return db.collection('posts').doc(postId).update({
      viewCount: firebase.firestore.FieldValue.increment(1)
    }).then(function() {
      return db.collection('posts').doc(postId).get();
    }).then(function(snap2) {
      if (!snap2.exists) return;
      var newCount = snap2.data().viewCount || 0;
      var bar = _el('bb-' + postId);
      if (bar) bar.style.width = Math.min(100, Math.round(newCount/maxViews*100)) + '%';
      var viewsEl = document.querySelector('[data-id="' + postId + '"] .burn-views');
      if (viewsEl) viewsEl.textContent = Math.max(0, maxViews - newCount) + ' vues restantes';
      if (newCount >= maxViews) burnPost(postId);
    });
  }).catch(function() {});
}

function burnPost(postId) {
  var postEl = document.querySelector('[data-id="' + postId + '"]');
  if (postEl) {
    postEl.classList.add('burning');
    setTimeout(function() { postEl.remove(); }, 800);
  }
  db.collection('posts').doc(postId).update({ isExpired: true }).catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 16. COMMENTAIRES
// ─────────────────────────────────────────────────────────────────

function toggleComments(postId, postEl) {
  var wrap = _el('comments-' + postId);
  if (!wrap) return;

  if (!wrap.hidden) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  wrap.innerHTML = buildCommentsUI(postId);
  loadComments(postId, wrap);

  // Submit commentaire
  var input  = wrap.querySelector('.comment-input');
  var submit = wrap.querySelector('.comment-submit');
  if (submit && input) {
    submit.addEventListener('click', function() {
      submitComment(postId, input.value.trim(), wrap);
      input.value = '';
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitComment(postId, input.value.trim(), wrap);
        input.value = '';
      }
    });
  }
}

function buildCommentsUI(postId) {
  return '<div class="comments-inner">'
    + '<div class="comments-list" id="cl-' + postId + '"></div>'
    + '<div class="comment-form">'
    +   '<input class="comment-input" type="text" placeholder="Ton commentaire..." maxlength="200"/>'
    +   '<button class="comment-submit">'
    +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
    +   '</button>'
    + '</div>'
    + '</div>';
}

function loadComments(postId, wrap) {
  var list = wrap.querySelector('.comments-list');
  if (!list) return;

  var unsub = db.collection('posts').doc(postId)
    .collection('comments')
    .orderBy('createdAt', 'asc')
    .limit(50)
    .onSnapshot(function(snap) {
      list.innerHTML = '';
      if (snap.empty) {
        list.innerHTML = '<div class="no-comments">Sois le premier à répondre.</div>';
        return;
      }
      snap.forEach(function(doc) {
        var c = doc.data();
        list.innerHTML += buildCommentHTML(doc.id, c, postId);
      });
    }, function() {});

  sisState.unsubscribers.push(unsub);
}

function buildCommentHTML(id, c, postId) {
  var name = c.isAnonymous ? 'Anonyme' : (c.authorDisplay || 'Ombre');
  var first = c.isFirstReactor
    ? '<span class="first-reactor-badge">Premier 👁️</span>'
    : '';
  return '<div class="comment-item">'
    + '<div class="comment-avatar">' + generateAvatarSVG(c.authorId || 'x', 24) + '</div>'
    + '<div class="comment-content">'
    +   '<div class="comment-name">' + escHtml(name) + first + '</div>'
    +   '<div class="comment-text">' + escHtml(c.content || '') + '</div>'
    + '</div>'
    + '</div>';
}

function submitComment(postId, text, wrap) {
  if (!text || !sisState.user) return;
  var uid  = sisState.user.uid;
  var doc  = sisState.userDoc || {};

  // Vérifier first reactor
  db.collection('posts').doc(postId).get().then(function(snap) {
    var isFirst = snap.exists && !snap.data().firstReactor;

    return db.collection('posts').doc(postId)
      .collection('comments')
      .add({
        content:       text,
        authorId:      uid,
        authorDisplay: doc.displayName || 'Ombre',
        isAnonymous:   sisState.user.isAnonymous,
        isFirstReactor:isFirst,
        createdAt:     firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(function() {
        if (isFirst) {
          db.collection('posts').doc(postId).update({ firstReactor: uid });
        }
        db.collection('posts').doc(postId).update({
          commentCount: firebase.firestore.FieldValue.increment(1)
        });
        addPoints(3);
      });
  }).catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 17. POST MENU CONTEXTUEL
// ─────────────────────────────────────────────────────────────────

function initPostMenu() {
  _on('pmdEcho',   'click', function() { openEchoModal(sisState.menuTargetId); closePostMenu(); });
  _on('pmdShare',  'click', function() { sharePost(sisState.menuTargetId);     closePostMenu(); });
  _on('pmdSave',   'click', function() { savePost(sisState.menuTargetId);      closePostMenu(); });
  _on('pmdReport', 'click', function() { openReportModal(sisState.menuTargetId); closePostMenu(); });

  document.addEventListener('click', function(e) {
    var menu = _el('postMenuDropdown');
    if (menu && !menu.contains(e.target)) closePostMenu();
  });
}

function openPostMenu(postId, btn) {
  sisState.menuTargetId = postId;
  var menu = _el('postMenuDropdown');
  if (!menu) return;

  var rect = btn.getBoundingClientRect();
  menu.style.top  = (rect.bottom + 4 + window.scrollY) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
  menu.hidden = false;
}

function closePostMenu() {
  var menu = _el('postMenuDropdown');
  if (menu) menu.hidden = true;
}

function sharePost(postId) {
  var url = 'https://sis-send.vercel.app/index.html?to=' + (sisState.user ? sisState.user.uid : '') + '&post=' + postId;
  if (navigator.share) {
    navigator.share({ url: url }).catch(function() {});
  } else {
    navigator.clipboard.writeText(url).then(function() {
      showToast('Lien copié !', 'success');
    });
  }
}

function savePost(postId) {
  if (!sisState.user) return;
  db.collection('users').doc(sisState.user.uid)
    .collection('saved').doc(postId)
    .set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { showToast('Post sauvegardé.', 'success'); })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 18. ECHO
// ─────────────────────────────────────────────────────────────────

function openEchoModal(postId) {
  sisState.echoTargetId = postId;
  db.collection('posts').doc(postId).get().then(function(snap) {
    if (!snap.exists) return;
    var data = snap.data();
    var preview = _el('echoPreview');
    if (preview) {
      preview.innerHTML = '<div class="echo-orig-text">' + escHtml((data.content || '').substring(0, 120)) + (data.content && data.content.length > 120 ? '...' : '') + '</div>';
    }
    openModal('echoModal');
  });
}

_on('closeEcho',   'click', function() { closeModal('echoModal'); });
_on('submitEcho',  'click', submitEcho);

function submitEcho() {
  if (!sisState.user || !sisState.echoTargetId) return;
  var comment = _val('echoContent').trim();
  var uid     = sisState.user.uid;
  var doc     = sisState.userDoc || {};

  var postData = {
    type:          'confession',
    content:       comment || '',
    echoOf:        sisState.echoTargetId,
    authorId:      uid,
    authorDisplay: doc.displayName || 'Ombre',
    isAnonymous:   true,
    isCertified:   sisState.isCertified,
    reactions:     { fire:0, heart_fire:0, skull:0, eye:0 },
    commentCount:  0,
    viewCount:     0,
    heatScore:     0,
    hashtags:      [],
    isExpired:     false,
    createdAt:     firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('posts').add(postData).then(function() {
    closeModal('echoModal');
    showToast('Echo publié !', 'success');
    _el('echoContent').value = '';
    addPoints(2);
    db.collection('users').doc(uid).update({
      echoCount: firebase.firestore.FieldValue.increment(1)
    }).catch(function() {});
  }).catch(function() {
    showToast('Erreur lors de la publication.', 'error');
  });
}

// ─────────────────────────────────────────────────────────────────
// 19. SIGNALEMENT
// ─────────────────────────────────────────────────────────────────

function openReportModal(postId) {
  var inp = _el('reportPostId');
  if (inp) inp.value = postId;

  document.querySelectorAll('.report-opt').forEach(function(btn) {
    btn.classList.remove('selected');
    btn.addEventListener('click', function() {
      document.querySelectorAll('.report-opt').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });

  openModal('reportModal');
}

_on('closeReport',  'click', function() { closeModal('reportModal'); });
_on('submitReport', 'click', function() {
  var postId  = _val('reportPostId');
  var reason  = document.querySelector('.report-opt.selected');
  var text    = _val('reportText').trim();

  if (!reason) { showToast('Choisis une raison.', 'error'); return; }

  db.collection('reports').add({
    postId:  postId,
    reason:  reason.dataset.reason,
    details: text,
    reportedBy: sisState.user ? sisState.user.uid : 'anon',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    closeModal('reportModal');
    showToast('Signalement envoyé.', 'success');
    _el('reportText').value = '';
  }).catch(function() {});
});

// ─────────────────────────────────────────────────────────────────
// 20. COMPOSER — CRÉER UN POST
// ─────────────────────────────────────────────────────────────────

function initComposer() {
  // Ouvrir composer depuis le feed
  _on('openComposer', 'click', function() { openModal('postModal'); });
  _on('openComposer', 'keydown', function(e) { if (e.key === 'Enter') openModal('postModal'); });

  // Boutons type dans le composer mini
  document.querySelectorAll('.ctype').forEach(function(btn) {
    btn.addEventListener('click', function() {
      openModal('postModal');
      setPostType(btn.dataset.type);
    });
  });

  // Type selector dans la modal
  document.querySelectorAll('.ts-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ts-btn').forEach(function(b) {
        b.classList.remove('ts-active');
        b.setAttribute('aria-selected','false');
      });
      btn.classList.add('ts-active');
      btn.setAttribute('aria-selected','true');
      setPostType(btn.dataset.type);
    });
  });

  // Fermer composer
  _on('closePostModal','click', function() { closeModal('postModal'); });

  // Char counter
  _on('postContent', 'input', function() {
    var len = (_val('postContent') || '').length;
    setText('charCount', len);
  });

  // Options anonymat
  document.querySelectorAll('.aopt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.aopt').forEach(function(b) { b.classList.remove('aopt-active'); });
      btn.classList.add('aopt-active');
      sisState.anonMode = btn.dataset.anon;
    });
  });

  // Battle options
  _on('addBattleOpt', 'click', addBattleOption);

  // Upload zone
  var uploadZone = _el('uploadZone');
  var mediaFile  = _el('mediaFile');
  if (uploadZone && mediaFile) {
    uploadZone.addEventListener('click',  function() { mediaFile.click(); });
    uploadZone.addEventListener('dragover',function(e) { e.preventDefault(); });
    uploadZone.addEventListener('drop',   function(e) {
      e.preventDefault();
      if (e.dataTransfer.files[0]) handleMediaFile(e.dataTransfer.files[0]);
    });
    mediaFile.addEventListener('change', function() {
      if (mediaFile.files[0]) handleMediaFile(mediaFile.files[0]);
    });
  }

  // GIF
  _on('gifBtn', 'click', toggleGifPicker);
  _on('gifSearch','input', function() { searchGifs(_val('gifSearch')); });

  // Bottom nav +
  _on('bnCreate', 'click', function() { openModal('postModal'); });

  // Submit
  _on('submitPost', 'click', handleSubmitPost);

  // Hashtags
  _on('hashtagInput','keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addHashtag(_val('hashtagInput').replace(/\s/g,'').replace(/^#/,''));
      _el('hashtagInput').value = '';
    }
  });
}

function setPostType(type) {
  sisState.currentPostType = type;

  _setHidden('burnOptions',  type !== 'burn');
  _setHidden('battleCreate', type !== 'battle');
  _setHidden('mediaUpload',  type !== 'media');

  var placeholder = {
    csdpm:      'Ça se dit pas mais...',
    confession: 'Dis ce que tu n\'as jamais dit...',
    whisper:    'Murmure quelque chose...',
    media:      'Ajoute une légende (optionnel)...',
    battle:     'La question de la battle...',
    burn:       'Ce post disparaîtra pour toujours...'
  };

  var ta = _el('postContent');
  if (ta) ta.placeholder = placeholder[type] || '...';
}

function addBattleOption() {
  var list = _el('battleOptsList');
  if (!list) return;
  var count = list.querySelectorAll('.battle-opt-input').length;
  if (count >= 4) { showToast('Maximum 4 options.', 'muted'); return; }
  var inp = document.createElement('input');
  inp.className   = 'battle-opt-input';
  inp.type        = 'text';
  inp.dataset.index = count;
  inp.placeholder = 'Option ' + String.fromCharCode(65 + count);
  inp.maxLength   = 80;
  inp.setAttribute('aria-label', 'Option ' + String.fromCharCode(65 + count));
  list.appendChild(inp);
}

function addHashtag(tag) {
  if (!tag) return;
  sisState.pendingHashtags = sisState.pendingHashtags || [];
  if (sisState.pendingHashtags.includes(tag) || sisState.pendingHashtags.length >= 5) return;
  sisState.pendingHashtags.push(tag);

  var list = _el('hashtagList');
  if (list) {
    var chip = document.createElement('span');
    chip.className   = 'hashtag-chip';
    chip.textContent = '#' + tag;
    chip.addEventListener('click', function() {
      sisState.pendingHashtags = (sisState.pendingHashtags||[]).filter(function(t) { return t !== tag; });
      chip.remove();
    });
    list.appendChild(chip);
  }
}

function handleSubmitPost() {
  if (!sisState.user) return;
  var text = _val('postContent').trim();
  var type = sisState.currentPostType;

  if (!text && type !== 'media') {
    showToast('Écris quelque chose.', 'error');
    return;
  }

  // Battle: valider les options
  if (type === 'battle') {
    var opts = Array.from(document.querySelectorAll('.battle-opt-input'))
      .map(function(inp) { return inp.value.trim(); })
      .filter(Boolean);
    if (opts.length < 2) { showToast('Ajoute au moins 2 options.', 'error'); return; }
    sisState.pendingBattleOptions = opts;
  }

  // Préparer les données
  sisState.pendingPostData = buildPostData(type, text);

  // Le Pacte — interstitiel obligatoire
  openPacte();
}

function buildPostData(type, text) {
  var uid    = sisState.user.uid;
  var doc    = sisState.userDoc || {};
  var anon   = sisState.anonMode || 'full';
  var data   = {
    type:          type,
    content:       text,
    authorId:      uid,
    authorDisplay: anon === 'certified' ? (doc.displayName || 'SIS') : (anon === 'pseudo' ? (doc.displayName || 'Ombre') : 'Anonyme'),
    isAnonymous:   anon === 'full',
    isCertified:   anon === 'certified' && sisState.isCertified,
    reactions:     { fire:0, heart_fire:0, skull:0, eye:0 },
    commentCount:  0,
    viewCount:     0,
    heatScore:     0,
    heatUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    hashtags:      sisState.pendingHashtags || [],
    isExpired:     false,
    createdAt:     firebase.firestore.FieldValue.serverTimestamp()
  };

  if (type === 'burn') {
    var maxViewsBtn = document.querySelector('.bb[data-views].bb-active');
    var hoursBtn    = document.querySelector('.bb[data-hours].bb-active');
    data.maxViews = maxViewsBtn ? parseInt(maxViewsBtn.dataset.views) : 100;
    var hours     = hoursBtn    ? parseInt(hoursBtn.dataset.hours)    : 24;
    var exp       = new Date();
    exp.setHours(exp.getHours() + hours);
    data.expiresAt = exp;
  }

  if (type === 'battle') {
    var opts = (sisState.pendingBattleOptions || []).map(function(label) {
      return { label: label, votes: 0 };
    });
    data.battleOptions = opts;
    var dur = parseInt(_val('battleDuration') || '48');
    var end = new Date();
    end.setHours(end.getHours() + dur);
    data.battleEndsAt = end;
  }

  if (sisState.pendingMediaUrl) {
    data.mediaUrl  = sisState.pendingMediaUrl;
    data.mediaType = sisState.pendingMediaType || 'image';
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// 21. LE PACTE — INTERSTITIEL OBLIGATOIRE
// ─────────────────────────────────────────────────────────────────

function openPacte() {
  // Charger un post aléatoire — sans filtre isExpired pour éviter les index composites
  db.collection('posts')
    .orderBy('createdAt','desc')
    .limit(20)
    .get()
    .then(function(snap) {
      // Filtrer les posts expirés côté client
      var validDocs = snap.docs.filter(function(d) { return !d.data().isExpired; });

      if (validDocs.length === 0) {
        publishPost(sisState.pendingPostData);
        closeModal('postModal');
        return;
      }
      var idx  = Math.floor(Math.random() * validDocs.length);
      var doc  = validDocs[idx];
      sisState.pactePostId = doc.id;

      var el = _el('pactePostText');
      if (el) el.textContent = (doc.data().content || '').substring(0, 200);

      closeModal('postModal');
      openModal('pacteModal');

      // Réactions Le Pacte — garde isPublishing pour bloquer le multi-touch
      sisState.isPublishing = false;

      document.querySelectorAll('.pacte-er').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (sisState.isPublishing) return;  // bloquer les taps simultanés
          sisState.isPublishing = true;

          var update = {};
          update['reactions.' + btn.dataset.react] = firebase.firestore.FieldValue.increment(1);
          db.collection('posts').doc(sisState.pactePostId).update(update).catch(function() {});

          closeModal('pacteModal');
          publishPost(sisState.pendingPostData);
        }, { once: true });
      });
    })
    .catch(function() {
      // En cas d'erreur réseau, on ne publie PAS silencieusement
      // On informe l'utilisateur et on lui permet de réessayer
      sisState.isPublishing = false;
      showToast('Erreur de connexion. Réessaie.', 'error');
      openModal('postModal');
    });
}

function publishPost(data) {
  if (!data) return;

  db.collection('posts').add(data)
    .then(function(ref) {
      sisState.isPublishing = false;
      showToast('Publié anonymement ✓', 'success');
      resetComposer();

      // Incrémenter stats user
      db.collection('users').doc(sisState.user.uid).update({
        postCount: firebase.firestore.FieldValue.increment(1)
      }).catch(function() {});

      addPoints(10);
      sisState.pendingPostData = null;
      sisState.pendingHashtags = [];

      // Rafraîchir le feed
      resetFeed();
      loadPosts();
    })
    .catch(function(err) {
      sisState.isPublishing = false;
      showToast('Erreur lors de la publication.', 'error');
      console.error(err);
    });
}

function resetComposer() {
  var ta = _el('postContent');
  if (ta) ta.value = '';
  setText('charCount', 0);
  sisState.pendingHashtags    = [];
  sisState.pendingBattleOptions = [];
  sisState.pendingMediaUrl    = null;
  sisState.pendingMediaType   = null;
  var list = _el('hashtagList');
  if (list) list.innerHTML = '';
}

// ─────────────────────────────────────────────────────────────────
// 22. UPLOAD MÉDIA (CLOUDINARY)
// ─────────────────────────────────────────────────────────────────

var CLOUDINARY_URL    = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/auto/upload';
var CLOUDINARY_PRESET = 'sis_unsigned';

function handleMediaFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Fichier trop lourd (max 10 MB).', 'error');
    return;
  }

  _show('uploadProgress');
  _hide('uploadZone');

  var formData = new FormData();
  formData.append('file',           file);
  formData.append('upload_preset',  CLOUDINARY_PRESET);

  var xhr = new XMLHttpRequest();
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      var pct = Math.round(e.loaded / e.total * 100);
      setStyle('upBar', 'width', pct + '%');
      setText('upPct', pct + '%');
    }
  };
  xhr.onload = function() {
    _hide('uploadProgress');
    if (xhr.status === 200) {
      var res = JSON.parse(xhr.responseText);
      sisState.pendingMediaUrl  = res.secure_url;
      sisState.pendingMediaType = file.type.startsWith('video') ? 'video' : 'image';

      var preview = _el('uploadPreview');
      if (preview) {
        preview.innerHTML = sisState.pendingMediaType === 'video'
          ? '<video src="' + res.secure_url + '" controls style="max-width:100%;border-radius:8px;"></video>'
          : '<img src="' + res.secure_url + '" style="max-width:100%;border-radius:8px;"/>';
        _show('uploadPreview');
      }
      showToast('Média uploadé ✓', 'success');
    } else {
      _show('uploadZone');
      showToast('Erreur d\'upload.', 'error');
    }
  };
  xhr.onerror = function() {
    _hide('uploadProgress');
    _show('uploadZone');
    showToast('Erreur réseau.', 'error');
  };
  xhr.open('POST', CLOUDINARY_URL);
  xhr.send(formData);
}

// ─────────────────────────────────────────────────────────────────
// 23. GIF — TENOR API
// ─────────────────────────────────────────────────────────────────

var TENOR_KEY = 'AIzaSyAyimkuYQYF_y47e9skuyH3yCGG3e1Rg4M';

function toggleGifPicker() {
  var picker = _el('gifPicker');
  if (!picker) return;
  var isHidden = picker.hidden;
  picker.hidden = !isHidden;
  if (isHidden) searchGifs('confession');
}

function searchGifs(query) {
  if (!query) return;
  var url = 'https://tenor.googleapis.com/v2/search?q='
    + encodeURIComponent(query)
    + '&key=' + TENOR_KEY
    + '&limit=12&media_filter=gif';

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var grid = _el('gifGrid');
      if (!grid) return;
      grid.innerHTML = '';
      (data.results || []).forEach(function(item) {
        var url  = item.media_formats && item.media_formats.gif ? item.media_formats.gif.url : '';
        if (!url) return;
        var img  = document.createElement('img');
        img.src  = url;
        img.className = 'gif-item';
        img.loading = 'lazy';
        img.addEventListener('click', function() {
          sisState.pendingMediaUrl  = url;
          sisState.pendingMediaType = 'gif';
          _el('gifPicker').hidden   = true;
          showToast('GIF sélectionné ✓', 'success');
        });
        grid.appendChild(img);
      });
    })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 24. STORIES
// ─────────────────────────────────────────────────────────────────

function initStories() {
  loadStories();
  _on('storyAddBtn', 'click',  openStoryCreator);
  _on('svClose',     'click',  closeStoryViewer);
  _on('svBackdrop',  'click',  closeStoryViewer);
  _on('svTapPrev',   'click',  storyPrev);
  _on('svTapNext',   'click',  storyNext);
}

function loadStories() {
  var now = new Date();
  db.collection('stories')
    .where('expiresAt', '>', now)
    .orderBy('expiresAt', 'asc')
    .limit(30)
    .get()
    .then(function(snap) {
      var bar = _el('storiesBar');
      if (!bar) return;

      // Garder le bouton "Ta story"
      var addBtn = _el('storyAddBtn');
      bar.innerHTML = '';
      if (addBtn) bar.appendChild(addBtn);

      // Grouper par auteur
      var byAuthor = {};
      snap.forEach(function(doc) {
        var d = doc.data();
        if (!byAuthor[d.authorId]) byAuthor[d.authorId] = [];
        byAuthor[d.authorId].push(Object.assign({ id: doc.id }, d));
      });

      Object.keys(byAuthor).forEach(function(uid) {
        var stories = byAuthor[uid];
        var first   = stories[0];
        var seen    = localStorage.getItem('sis-story-seen-' + uid) === first.id;
        var item    = document.createElement('div');
        item.className = 'story-item';
        item.innerHTML = '<div class="story-ring ' + (seen ? 'story-seen' : '') + '">'
          + '<div class="story-ring-inner">'
          + generateAvatarSVG(uid, 44)
          + '</div></div>'
          + '<div class="story-name">' + escHtml(first.authorDisplay || 'Ombre') + '</div>';
        item.addEventListener('click', function() { openStoryViewer(stories, uid); });
        bar.appendChild(item);
      });
    })
    .catch(function() {});
}

function openStoryViewer(stories, uid) {
  sisState.storyQueue = stories;
  sisState.storyIndex = 0;
  _show('storyViewer');
  renderStory(0);
  localStorage.setItem('sis-story-seen-' + uid, stories[0].id);
}

function renderStory(idx) {
  clearTimeout(sisState.storyTimer);
  var story = sisState.storyQueue[idx];
  if (!story) { closeStoryViewer(); return; }

  // Barre de progression
  var prog = _el('svProgress');
  if (prog) {
    var bars = sisState.storyQueue.map(function(_, i) {
      return '<div class="sv-prog-bar"><div class="sv-prog-fill ' + (i < idx ? 'done' : i === idx ? 'active' : '') + '"></div></div>';
    }).join('');
    prog.innerHTML = bars;
  }

  // Header
  setText('svName', story.authorDisplay || 'Ombre');
  setText('svTime', formatTime(story.createdAt));
  var svAvatar = _el('svAvatar');
  if (svAvatar) svAvatar.innerHTML = generateAvatarSVG(story.authorId, 32);

  // Body
  var body = _el('svBody');
  if (body) {
    body.innerHTML = story.mediaUrl
      ? '<img class="sv-img" src="' + story.mediaUrl + '" alt="story"/>'
      : '<div class="sv-text-story">' + escHtml(story.content || '') + '</div>';
  }

  // Auto-avancer après STORY_DURATION_MS
  sisState.storyTimer = setTimeout(function() { storyNext(); }, STORY_DURATION_MS);
}

function storyNext() {
  var next = sisState.storyIndex + 1;
  if (next >= sisState.storyQueue.length) { closeStoryViewer(); return; }
  sisState.storyIndex = next;
  renderStory(next);
}

function storyPrev() {
  var prev = sisState.storyIndex - 1;
  if (prev < 0) return;
  sisState.storyIndex = prev;
  renderStory(prev);
}

function closeStoryViewer() {
  clearTimeout(sisState.storyTimer);
  _hide('storyViewer');
}

function openStoryCreator() {
  showToast('Story : fonctionnalité à venir.', 'muted');
}

// ─────────────────────────────────────────────────────────────────
// 25. CONFESSION ROULETTE
// ─────────────────────────────────────────────────────────────────

function initRoulette() {
  _on('rouletteBtn',     'click', openRoulette);
  _on('closeRoulette',   'click', closeRoulette);
  _on('closeRouletteBtn','click', closeRoulette);
  _on('spinBtn',         'click', spinRoulette);
}

function openRoulette() {
  openModal('rouletteModal');
  spinRoulette();
}

function closeRoulette() {
  closeModal('rouletteModal');
}

function spinRoulette() {
  var container = _el('roulettePost');
  if (container) container.innerHTML = '<div class="spin-loader">...</div>';

  db.collection('posts')
    .where('isExpired','==',false)
    .limit(50)
    .get()
    .then(function(snap) {
      if (snap.empty) { if (container) container.innerHTML = '<p>Aucun post.</p>'; return; }
      var idx  = Math.floor(Math.random() * snap.docs.length);
      var doc  = snap.docs[idx];
      var data = doc.data();
      if (container) {
        container.innerHTML = '<div class="roulette-post-inner">'
          + '<div class="rp-type">' + postTypeLabel(data.type) + '</div>'
          + '<p class="rp-text">' + escHtml((data.content || '').substring(0, 280)) + '</p>'
          + '</div>';
      }
    })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 26. NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

function initNotifications() {
  _on('notifBtn',    'click', toggleNotifPanel);
  _on('markAllRead', 'click', markNotifsRead);

  if (!sisState.user) return;
  listenNotifications();
}

function toggleNotifPanel() {
  var panel = _el('notifPanel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

function listenNotifications() {
  var uid = sisState.user.uid;
  var unsub = db.collection('users').doc(uid)
    .collection('notifications')
    .orderBy('createdAt','desc')
    .limit(30)
    .onSnapshot(function(snap) {
      var unread = 0;
      var list   = _el('notifList');
      if (list) list.innerHTML = '';

      snap.forEach(function(doc) {
        var n = doc.data();
        if (!n.read) unread++;
        if (list) list.innerHTML += buildNotifHTML(doc.id, n);
      });

      sisState.notifUnread = unread;
      var badge = _el('notifBadge');
      if (badge) {
        badge.textContent  = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
        badge.style.display = unread > 0 ? 'flex' : 'none';
      }
    }, function() {});

  sisState.unsubscribers.push(unsub);
}

function buildNotifHTML(id, n) {
  var icons = {
    reaction: '❤️‍🔥',
    comment:  '💬',
    echo:     '↩',
    aura:     '✦',
    streak:   '🔥'
  };
  return '<div class="notif-item ' + (n.read ? '' : 'notif-unread') + '" data-id="' + id + '">'
    + '<div class="notif-ico">' + (icons[n.type] || '📣') + '</div>'
    + '<div class="notif-body">'
    +   '<div class="notif-text">' + escHtml(n.message || '') + '</div>'
    +   '<div class="notif-time">' + formatTime(n.createdAt) + '</div>'
    + '</div>'
    + '</div>';
}

function markNotifsRead() {
  if (!sisState.user) return;
  var uid = sisState.user.uid;
  db.collection('users').doc(uid)
    .collection('notifications')
    .where('read','==',false)
    .get()
    .then(function(snap) {
      var batch = db.batch();
      snap.forEach(function(doc) { batch.update(doc.ref, { read: true }); });
      return batch.commit();
    })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 27. WIDGETS SIDEBAR DROITE
// ─────────────────────────────────────────────────────────────────

function initWidgets() {
  loadCSDPMDuJour();
  loadTrending();
  loadWeeklyBattle();
}

// ── Live Pulse ──
function startLivePulse() {
  function update() {
    if (sisState.user && !sisState.ghostMode) {
      db.collection('liveusers').doc(sisState.user.uid)
        .set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(function() {});
    }

    var cutoff = new Date(Date.now() - 60000); // 1 min
    db.collection('liveusers')
      .where('lastSeen','>', cutoff)
      .get()
      .then(function(snap) {
        setText('liveCount', snap.size);
      })
      .catch(function() {});
  }

  update();
  sisState.liveInterval = setInterval(update, LIVE_REFRESH_MS);
}

// ── Reader Ping ──
// Stratégie : 1 écriture par user toutes les 15s dans /presence/{uid}
// avec la liste des postIds visibles. Ça évite N×writes par ping.
function startReaderPing() {
  function ping() {
    if (!sisState.user || sisState.ghostMode) return;
    var uid      = sisState.user.uid;
    var postIds  = [];

    document.querySelectorAll('.post').forEach(function(el) {
      if (el.dataset.id) postIds.push(el.dataset.id);
    });

    if (postIds.length === 0) return;

    // Une seule écriture : le document de présence de l'utilisateur
    db.collection('presence').doc(uid).set({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      postIds:  postIds.slice(0, 10)  // limiter à 10 max
    }).catch(function() {});
  }

  ping();
  sisState.readerInterval = setInterval(ping, Math.floor(READER_TTL_MS / 2));
}

// ── CSDPM du jour ──
function loadCSDPMDuJour() {
  var today = todayStr();
  db.collection('csdpm_daily')
    .where('date','==',today)
    .limit(1)
    .get()
    .then(function(snap) {
      if (snap.empty) return;
      var data = snap.docs[0].data();
      setText('csdpmQuestion', data.question || '');

      var unsub = db.collection('csdpm_daily').doc(snap.docs[0].id)
        .onSnapshot(function(doc) {
          var d = doc.data() || {};
          setText('csdpmMeta', (d.replyCount || 0) + ' personnes ont répondu');
        });
      sisState.unsubscribers.push(unsub);
    })
    .catch(function() {});
}

// ── Trending Hashtags ──
function loadTrending() {
  db.collection('trending')
    .orderBy('count','desc')
    .limit(8)
    .get()
    .then(function(snap) {
      var list = _el('trendingList');
      if (!list) return;
      list.innerHTML = '';
      snap.forEach(function(doc) {
        var d   = doc.data();
        var btn = document.createElement('button');
        btn.className   = 'trending-tag';
        btn.textContent = '#' + (d.tag || doc.id);
        btn.addEventListener('click', function() { filterByTag(d.tag || doc.id); });
        list.appendChild(btn);
      });
    })
    .catch(function() {});
}

function filterByTag(tag) {
  sisState.currentTag = tag;
  _show('tagFilterBar');
  setText('tfLabel', '#' + tag);
  history.pushState(null,'','?tag=' + encodeURIComponent(tag));
  resetFeed();
  loadPosts();
}

// ── Vibe du moment ──
function startVibeRefresh() {
  updateVibe();
  sisState.vibeInterval = setInterval(updateVibe, VIBE_REFRESH_MS);
}

function updateVibe() {
  var cutoff = new Date(Date.now() - 1800000); // 30 min
  db.collection('posts')
    .where('createdAt','>', cutoff)
    .limit(50)
    .get()
    .then(function(snap) {
      var counts = { fire:0, heart_fire:0, skull:0, eye:0 };
      snap.forEach(function(doc) {
        var r = doc.data().reactions || {};
        counts.fire       += r.fire       || 0;
        counts.heart_fire += r.heart_fire || 0;
        counts.skull      += r.skull      || 0;
        counts.eye        += r.eye        || 0;
      });

      var dominant = Object.keys(counts).reduce(function(a,b) {
        return counts[a] > counts[b] ? a : b;
      });

      var vibeMap = {
        fire:       { emoji:'🔥', text:'Ambiance feu ce soir' },
        heart_fire: { emoji:'❤️‍🔥', text:'Plein d\'amour et d\'intensité' },
        skull:      { emoji:'💀', text:'Humeur lourde ce soir' },
        eye:        { emoji:'👁️',  text:'Les gens observent' }
      };

      var vibe = vibeMap[dominant] || { emoji:'✨', text:'Calme pour l\'instant' };
      setText('vibeEmoji', vibe.emoji);
      setText('vibeText',  vibe.text);
      setText('vibeSub',   'Mis à jour à ' + new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }));
    })
    .catch(function() {});
}

// ── Battle de la semaine ──
function loadWeeklyBattle() {
  db.collection('posts')
    .where('type','==','battle')
    .where('isExpired','==',false)
    .orderBy('reactions.fire','desc')
    .limit(1)
    .get()
    .then(function(snap) {
      var cont = _el('weeklyBattle');
      if (!cont || snap.empty) return;
      var data = snap.docs[0].data();
      var id   = snap.docs[0].id;
      var opts = data.battleOptions || [];
      var total = opts.reduce(function(s,o) { return s+(o.votes||0); },0);

      cont.innerHTML = '<div class="mini-battle">'
        + '<p class="mb-question">' + escHtml(data.content || '') + '</p>'
        + opts.map(function(opt, i) {
            var pct = total > 0 ? Math.round((opt.votes||0)/total*100) : 0;
            return '<button class="mb-opt" data-opt="' + i + '" data-id="' + id + '">'
              + '<span>' + escHtml(opt.label||'') + '</span>'
              + '<div class="mb-bar"><div class="mb-fill" style="width:' + pct + '%"></div></div>'
              + '<span class="mb-pct">' + pct + '%</span>'
              + '</button>';
          }).join('')
        + '</div>';

      cont.querySelectorAll('.mb-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
          voteBattle(id, parseInt(btn.dataset.opt), cont);
        });
      });
    })
    .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// 28. PANEL PROFIL MOBILE
// ─────────────────────────────────────────────────────────────────

function initProfilPanel() {
  _on('bnProfil', 'click', openProfilPanel);

  // Swipe down pour fermer
  var panel = _el('profilPanel');
  var startY = 0;
  if (panel) {
    panel.addEventListener('touchstart', function(e) { startY = e.touches[0].clientY; });
    panel.addEventListener('touchend',   function(e) {
      if (e.changedTouches[0].clientY - startY > 80) closeProfilPanel();
    });
  }
}

function openProfilPanel() {
  var panel = _el('profilPanel');
  if (!panel) return;
  panel.style.display = 'block';
  requestAnimationFrame(function() { panel.classList.add('open'); });
  var btn = _el('bnProfil');
  if (btn) btn.classList.add('bn-active');
}

function closeProfilPanel() {
  var panel = _el('profilPanel');
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(function() { panel.style.display = 'none'; }, 350);
  var btn = _el('bnProfil');
  if (btn) btn.classList.remove('bn-active');
}

// ─────────────────────────────────────────────────────────────────
// 29. LECTEURS ACTIFS PAR POST (Social Proof)
// ─────────────────────────────────────────────────────────────────

function listenActiveReaders(postId) {
  var cutoff = new Date(Date.now() - READER_TTL_MS);
  var unsub  = db.collection('posts').doc(postId)
    .collection('readers')
    .onSnapshot(function(snap) {
      var active = 0;
      snap.forEach(function(doc) {
        var d = doc.data();
        if (d.lastSeen && d.lastSeen.toDate && d.lastSeen.toDate() > cutoff) active++;
      });
      var el = _el('rdr-' + postId);
      if (el) {
        el.style.display = active >= 2 ? 'flex' : 'none';
        if (active >= 2) el.innerHTML = '<span class="rdr-dot"></span>' + active + ' personnes lisent ça maintenant';
      }
    }, function() {});
  sisState.feedUnsubs.push(unsub);
}

// ─────────────────────────────────────────────────────────────────
// 30. SYSTEME DE POINTS ET NIVEAUX
// ─────────────────────────────────────────────────────────────────

function addPoints(n) {
  if (!sisState.user || sisState.user.isAnonymous) return;
  var uid = sisState.user.uid;
  db.collection('users').doc(uid).update({
    points: firebase.firestore.FieldValue.increment(n)
  }).then(function() {
    return db.collection('users').doc(uid).get();
  }).then(function(snap) {
    if (!snap.exists) return;
    sisState.userDoc = snap.data();
    renderLevelBar();
  }).catch(function() {});
}

function getLevelFromPoints(pts) {
  var lvl = 0;
  for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) lvl = i;
    else break;
  }
  return lvl;
}

// ─────────────────────────────────────────────────────────────────
// 31. RECHERCHE
// ─────────────────────────────────────────────────────────────────

function initSearch() {
  var input   = _el('searchInput');
  var results = _el('searchResults');
  var timer   = null;

  if (!input) return;

  input.addEventListener('input', function() {
    clearTimeout(timer);
    var q = input.value.trim();
    if (!q || q.length < 2) { if (results) results.innerHTML = ''; return; }
    timer = setTimeout(function() { searchPosts(q, results); }, 350);
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { if (results) results.innerHTML = ''; }, 200);
  });
}

function searchPosts(q, results) {
  if (!results) return;
  results.innerHTML = '<div class="sr-loading">Recherche...</div>';

  db.collection('posts')
    .where('isExpired','==',false)
    .orderBy('createdAt','desc')
    .limit(30)
    .get()
    .then(function(snap) {
      var ql = q.toLowerCase();
      var matches = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        var text = (d.content || '').toLowerCase();
        var tags = (d.hashtags || []).join(' ').toLowerCase();
        if (text.includes(ql) || tags.includes(ql)) {
          matches.push(Object.assign({ id: doc.id }, d));
        }
      });

      results.innerHTML = '';
      if (matches.length === 0) {
        results.innerHTML = '<div class="sr-empty">Aucun résultat.</div>';
        return;
      }

      matches.slice(0,6).forEach(function(post) {
        var item = document.createElement('div');
        item.className   = 'sr-item';
        item.textContent = (post.content || '').substring(0, 80) + (post.content && post.content.length > 80 ? '...' : '');
        item.addEventListener('click', function() {
          results.innerHTML = '';
          // Scroller vers le post si visible, sinon filtrer
          var postEl = document.querySelector('[data-id="' + post.id + '"]');
          if (postEl) postEl.scrollIntoView({ behavior:'smooth', block:'center' });
        });
        results.appendChild(item);
      });
    })
    .catch(function() { results.innerHTML = ''; });
}

// ─────────────────────────────────────────────────────────────────
// 32. BURN OPTIONS — TOGGLE BOUTONS
// ─────────────────────────────────────────────────────────────────

function initBurnOptions() {
  document.querySelectorAll('.bb[data-views]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.bb[data-views]').forEach(function(b) { b.classList.remove('bb-active'); });
      btn.classList.add('bb-active');
    });
  });
  document.querySelectorAll('.bb[data-hours]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.bb[data-hours]').forEach(function(b) { b.classList.remove('bb-active'); });
      btn.classList.add('bb-active');
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// 33. MODALS — HELPERS
// ─────────────────────────────────────────────────────────────────

function openModal(id) {
  var el = _el(id);
  if (!el) return;
  el.hidden = false;
  el.classList.add('modal-open');
  document.body.classList.add('modal-active');
}

function closeModal(id) {
  var el = _el(id);
  if (!el) return;
  el.classList.remove('modal-open');
  el.hidden = true;
  document.body.classList.remove('modal-active');
}

// Fermer les modals sur clic backdrop — pacteModal EXCLU (obligatoire)
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    var modals = ['postModal','rouletteModal','reportModal','echoModal'];
    modals.forEach(function(id) {
      var m = _el(id);
      if (m && !m.hidden) closeModal(id);
    });
    // pacteModal volontairement absent — Le Pacte ne peut pas être fermé
  }
});

// Fermer sur Escape — pacteModal EXCLU
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    ['postModal','rouletteModal','reportModal','echoModal'].forEach(closeModal);
    closeProfilPanel();
    // pacteModal volontairement absent
  }
});

// ─────────────────────────────────────────────────────────────────
// 34. TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

function showToast(msg, type) {
  var container = _el('toastContainer');
  if (!container) return;

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'default');
  toast.textContent = msg;
  container.appendChild(toast);

  requestAnimationFrame(function() { toast.classList.add('toast-in'); });

  setTimeout(function() {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────
// 35. GÉNÉRATION AVATAR SVG
// ─────────────────────────────────────────────────────────────────

function generateAvatarSVG(uid, size) {
  size = size || 40;
  // Palette de couleurs basée sur l'UID
  var colors = [
    ['#5B8EF4','#8B5CF6'],
    ['#EC4899','#8B5CF6'],
    ['#10B981','#5B8EF4'],
    ['#F59E0B','#EC4899'],
    ['#8B5CF6','#EC4899'],
    ['#EF4444','#F59E0B']
  ];
  var hash   = 0;
  for (var i = 0; i < (uid || 'x').length; i++) {
    hash = ((hash << 5) - hash) + (uid || 'x').charCodeAt(i);
    hash = hash & hash;
  }
  var pair   = colors[Math.abs(hash) % colors.length];
  var shapes = ['circle','ghost','mask'];
  var shape  = shapes[Math.abs(hash >> 3) % shapes.length];
  var id     = 'av-' + Math.abs(hash).toString(36);

  if (shape === 'circle') {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="url(#' + id + ')"/><circle cx="20" cy="15" r="7" fill="rgba(255,255,255,0.3)"/><ellipse cx="20" cy="32" rx="11" ry="8" fill="rgba(255,255,255,0.2)"/><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="' + pair[0] + '"/><stop offset="100%" stop-color="' + pair[1] + '"/></linearGradient></defs></svg>';
  } else if (shape === 'ghost') {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="12" fill="url(#' + id + ')"/><path d="M12 28V16a8 8 0 0 1 16 0v12l-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2L12 28z" fill="rgba(255,255,255,0.3)"/><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="' + pair[0] + '"/><stop offset="100%" stop-color="' + pair[1] + '"/></linearGradient></defs></svg>';
  } else {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="url(#' + id + ')"/><rect x="10" y="14" width="20" height="15" rx="4" fill="rgba(255,255,255,0.3)"/><rect x="14" y="10" width="12" height="8" rx="4" fill="rgba(255,255,255,0.2)"/><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="' + pair[0] + '"/><stop offset="100%" stop-color="' + pair[1] + '"/></linearGradient></defs></svg>';
  }
}

// ─────────────────────────────────────────────────────────────────
// 36. BADGE CERTIFICATION
// ─────────────────────────────────────────────────────────────────

function certBadgeSVG() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="vertical-align:middle;">'
    + '<circle cx="8" cy="8" r="8" fill="url(#cb)"/>'
    + '<polyline points="5,8 7,10 11,6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<defs><linearGradient id="cb" x1="0" y1="0" x2="16" y2="16"><stop offset="0%" stop-color="#5B8EF4"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs>'
    + '</svg>';
}

// ─────────────────────────────────────────────────────────────────
// 37. UTILITAIRES — DOM
// ─────────────────────────────────────────────────────────────────

function _el(id)           { return document.getElementById(id); }
function _val(id)          { var el = _el(id); return el ? el.value : ''; }
function _on(id, ev, fn)   { var el = _el(id); if (el) el.addEventListener(ev, fn); }
function _show(id)         { var el = _el(id); if (el) { el.hidden = false; el.style.display = ''; } }
function _hide(id)         { var el = _el(id); if (el) el.hidden = true; }
function _setHidden(id,v)  { var el = _el(id); if (el) el.hidden = !!v; }
function setText(id, val)  { var el = _el(id); if (el) el.innerHTML = val; }
function setStyle(id,p,v)  { var el = _el(id); if (el) el.style[p] = v; }

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function encodeHtml(str) { return encodeURIComponent(str || ''); }
function decodeHtml(str) { return decodeURIComponent(str || ''); }

// ─────────────────────────────────────────────────────────────────
// 38. UTILITAIRES — DATES ET FORMATS
// ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function formatTime(ts) {
  if (!ts) return '';
  var date = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  var now  = new Date();
  var diff = Math.floor((now - date) / 1000);

  if (diff <  60)  return 'à l\'instant';
  if (diff < 3600) return Math.floor(diff / 60) + 'min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'j';
  return date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

function formatCount(n) {
  n = parseInt(n) || 0;
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

function formatCountdown(ms) {
  var s = Math.floor(ms / 1000);
  var m = Math.floor(s / 60);
  var h = Math.floor(m / 60);
  if (h > 0) return h + 'h ' + (m % 60) + 'min';
  if (m > 0) return m + 'min ' + (s % 60) + 's';
  return s + 's';
}

function timeUntil(date) {
  return formatCountdown(date - new Date());
}

function generateAnonPseudo(uid) {
  var prefixes = ['Ombre','Masque','Voix','Spectre','Fantôme','Murmure'];
  var hash = 0;
  for (var i = 0; i < (uid||'').length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash = hash & hash;
  }
  var prefix = prefixes[Math.abs(hash) % prefixes.length];
  var num    = Math.abs(hash >> 4) % 9000 + 1000;
  return prefix + '#' + num;
}

function postTypeLabel(type) {
  var labels = {
    confession: 'Confession',
    csdpm:      'CSDPM',
    whisper:    'Whisper',
    battle:     'Battle',
    burn:       'Burn',
    media:      'Moment'
  };
  return labels[type] || type;
}

// ─────────────────────────────────────────────────────────────────
// 39. INIT GLOBALE
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initGhostMode();
  initAuth();
  initComposer();
  initPostMenu();
  initRoulette();
  initProfilPanel();
  initSearch();
  initBurnOptions();

  // Char counter echo
  _on('echoContent','input',function() {
    var len = (_val('echoContent')||'').length;
    setText('echoCharCount', len);
  });
});
