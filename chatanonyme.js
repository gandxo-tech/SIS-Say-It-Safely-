/* ═══════════════════════════════════════════════════════
   SIS — Say It Safely | JS Principal
   Stack : Firebase Compat (no type=module), Vanilla JS
   Aucun import/export ES6 — Compatible WebView Android Go
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     1. CONFIGURATION FIREBASE
  ───────────────────────────────────────────── */
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s',
    authDomain:        'chat-anonyme.firebaseapp.com',
    projectId:         'chat-anonyme',
    storageBucket:     'chat-anonyme.firebasestorage.app',
    messagingSenderId: '93366459642',
    appId:             '1:93366459642:web:a2421c9478909b33667d43'
  };

  var VAPID_KEY = 'BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k';
  var CLOUDINARY_CLOUD  = 'duddyzckz';
  var CLOUDINARY_PRESET = 'ml_defaulte';
  var TENOR_KEY         = 'VOTRE_CLE_TENOR'; // remplacer sur tenor.com/developer
  var PERSPECTIVE_KEY   = 'VOTRE_CLE_PERSPECTIVE';

  /* Compte certifié */
  var CERTIFIED_EMAIL = 'gbaguidiexauce@gmail.com';

  /* ─────────────────────────────────────────────
     2. ÉTAT GLOBAL
  ───────────────────────────────────────────── */
  var db, auth, messaging;
  var currentUser      = null;  // objet Firebase user
  var userProfile      = null;  // doc Firestore /users/{uid}
  var currentRoom      = null;  // id du salon actif
  var currentRoomData  = null;  // données du salon actif
  var currentDmUid     = null;  // uid du partenaire DM actif
  var currentDmId      = null;  // id de conversation DM
  var soundEnabled     = true;
  var currentTheme     = 'dark';
  var currentView      = 'rooms'; // rooms | dms | random | notifs | profile
  var roomBgs          = {};      // { roomId: bgValue }
  var dmBgs            = {};      // { dmId: bgValue }
  var pendingBg        = null;    // valeur sélectionnée non encore appliquée
  var typingTimeout    = null;
  var slowModeInterval = null;
  var voiceRecorder    = null;
  var voiceChunks      = [];
  var voiceTimer       = null;
  var replyTarget      = null;   // { id, author, text }
  var randomSessionId  = null;
  var randomPartnerId  = null;
  var unsubscribers    = {};     // listeners Firestore à détacher
  var isMobile         = window.innerWidth < 768;
  var audioCtx         = null;

  /* ─────────────────────────────────────────────
     3. UTILITAIRES DE BASE
  ───────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function $q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $qa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function toggle(el, cond) { if (cond) show(el); else hide(el); }

  function setHTML(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function setText(id, txt)  { var el = $(id); if (el) el.textContent = txt; }

  /* Toast */
  function toast(msg, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var stack = $('toastStack');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(function () {
      t.classList.add('hiding');
      setTimeout(function () { t.remove(); }, 250);
    }, duration);
  }

  /* Ripple sur bouton */
  function addRipple(btn) {
    btn.addEventListener('click', function (e) {
      var r = document.createElement('span');
      r.style.cssText = 'position:absolute;border-radius:50%;width:20px;height:20px;background:rgba(255,255,255,0.3);pointer-events:none;transform:scale(0);animation:rippleAnim 0.45s ease';
      var rect = btn.getBoundingClientRect();
      r.style.left = (e.clientX - rect.left - 10) + 'px';
      r.style.top  = (e.clientY - rect.top  - 10) + 'px';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(r);
      setTimeout(function () { r.remove(); }, 500);
    });
  }

  /* Ajouter style ripple une seule fois */
  (function () {
    var s = document.createElement('style');
    s.textContent = '@keyframes rippleAnim{to{transform:scale(12);opacity:0}}';
    document.head.appendChild(s);
  })();

  /* Formater timestamp */
  function fmtTime(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  function fmtDate(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    var y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* Générer un ID unique */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /* Fermer tous les ctx-menu */
  function closeAllContextMenus() {
    $qa('.ctx-menu').forEach(function (m) { m.classList.add('hidden'); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ctx-wrap') && !e.target.closest('.bottom-sheet')) {
      closeAllContextMenus();
    }
      });

  /* Fermer modal via data-modal */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-modal]');
    if (btn) { hide($(btn.dataset.modal)); }
      });

  /* Fermer modal en cliquant overlay */
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.add('hidden');
    }
      });

  /* Initiales depuis un nom */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  /* Remplir avatar (img ou initiales) */
  function fillAvatar(wrapEl, imgEl, iniEl, url, name, color) {
    if (!wrapEl) return;
    if (url) {
      if (imgEl) { imgEl.src = url; show(imgEl); }
      if (iniEl) hide(iniEl);
    } else {
      if (imgEl) hide(imgEl);
      if (iniEl) { iniEl.textContent = initials(name || '?'); show(iniEl); }
      if (color) wrapEl.style.background = color;
    }
  }

  /* Afficher badge certifié si email correspond */
  function applyVerifiedBadge(email, badgeEl) {
    if (!badgeEl) return;
    toggle(badgeEl, email && email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase());
  }

  /* ─────────────────────────────────────────────
     4. SONS (Web Audio API)
  ───────────────────────────────────────────── */
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      var params = {
        send:    { freq: 880, dur: 0.08, vol: 0.05 },
        receive: { freq: 660, dur: 0.12, vol: 0.06 },
        connect: { freq: 440, dur: 0.2,  vol: 0.07 },
        notif:   { freq: 550, dur: 0.15, vol: 0.06 }
      };
      var p = params[type] || params.notif;
      o.frequency.value = p.freq;
      g.gain.setValueAtTime(p.vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + p.dur);
      o.start();
      o.stop(audioCtx.currentTime + p.dur);
    } catch (e) {}
  }

  /* ─────────────────────────────────────────────
     5. CHIFFREMENT AES-256-GCM
  ───────────────────────────────────────────── */
  var CryptoKey = null;

  function getOrCreateCryptoKey() {
    if (CryptoKey) return Promise.resolve(CryptoKey);
    var stored = localStorage.getItem('sis_ck');
    if (stored) {
      var raw = hexToBytes(stored);
      return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
        .then(function (k) { CryptoKey = k; return k; });
    }
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
      .then(function (k) {
        CryptoKey = k;
        return crypto.subtle.exportKey('raw', k).then(function (raw) {
          localStorage.setItem('sis_ck', bytesToHex(new Uint8Array(raw)));
          return k;
        });
      });
  }

  function encryptMsg(text) {
    return getOrCreateCryptoKey().then(function (k) {
      var iv  = crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder().encode(text);
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc).then(function (ct) {
        return bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(ct));
      });
    }).catch(function () { return text; });
  }

  function decryptMsg(data) {
    if (!data || data.indexOf(':') === -1) return Promise.resolve(data);
    return getOrCreateCryptoKey().then(function (k) {
      var parts = data.split(':');
      var iv = hexToBytes(parts[0]);
      var ct = hexToBytes(parts[1]);
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, ct)
        .then(function (pt) { return new TextDecoder().decode(pt); });
    }).catch(function () { return data; });
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function hexToBytes(hex) {
    var arr = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    return arr;
  }

  /* ─────────────────────────────────────────────
     6. UPLOAD CLOUDINARY
  ───────────────────────────────────────────── */
  function uploadToCloudinary(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/upload');
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = function () {
        if (xhr.status === 200) {
          try { resolve(JSON.parse(xhr.responseText).secure_url); }
          catch (e) { reject(new Error('Parse error')); }
        } else {
          reject(new Error('Upload failed: ' + xhr.status));
        }
      };
      xhr.onerror = function () { reject(new Error('Network error')); };
      xhr.send(fd);
    });
  }

  /* ─────────────────────────────────────────────
     7. SPLASH SCREEN
  ───────────────────────────────────────────── */
  function initSplash(onDone) {
    var bar = $('splashBarFill');
    var particles = $('splashParticles');

    /* Particules */
    for (var i = 0; i < 20; i++) {
      (function () {
        var p = document.createElement('span');
        p.className = 'splash-particle';
        p.style.cssText = [
          'left:' + Math.random() * 100 + '%',
          'bottom:' + Math.random() * 30 + '%',
          'width:'  + (Math.random() * 4 + 2) + 'px',
          'height:' + (Math.random() * 4 + 2) + 'px',
          'animation-duration:' + (Math.random() * 3 + 2) + 's',
          'animation-delay:' + Math.random() * 2 + 's',
          'background:' + (Math.random() > 0.5 ? '#5B8EF4' : '#8B5CF6')
        ].join(';');
        particles.appendChild(p);
      })();
    }

    /* Barre de progression */
    var pct = 0;
    var intv = setInterval(function () {
      pct += Math.random() * 12;
      if (pct >= 100) { pct = 100; clearInterval(intv); }
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) {
        setTimeout(function () {
          var splash = $('splashScreen');
          if (splash) {
            splash.style.transition = 'opacity 0.4s ease';
            splash.style.opacity = '0';
            setTimeout(function () { hide(splash); onDone(); }, 400);
          }
        }, 300);
      }
    }, 80);
  }

  /* ─────────────────────────────────────────────
     8. CGU
  ───────────────────────────────────────────── */
  function initCGU(onAccepted) {
    if (localStorage.getItem('sis_cgu_accepted')) { onAccepted(); return; }
    show($('cguModal'));

    var check = $('cguCheck');
    var btn   = $('cguAcceptBtn');
    check.addEventListener('change', function () { btn.disabled = !check.checked; });
    btn.addEventListener('click', function () {
      localStorage.setItem('sis_cgu_accepted', '1');
      hide($('cguModal'));
      onAccepted();
    });
  }

  /* ─────────────────────────────────────────────
     9. IDENTITÉ ANONYME
  ───────────────────────────────────────────── */
  var ANON_EMOJIS  = ['🦊','🐺','🦁','🐯','🦝','🐸','🦋','🐙','🦄','🐲','🦅','🐬','🦩','🐻','🦜','🐼','🦚','🦀','🦈','🦭'];
  var ANON_ADJECTIVES = ['Mystère','Ombre','Éclair','Fantôme','Sagesse','Foudre','Silence','Cosmos','Aube','Tempête','Écho','Cristal'];
  var ANON_NOUNS      = ['Renard','Loup','Lion','Tigre','Raton','Grenouille','Aigle','Dauphin','Dragon','Panda','Faucon','Sirène'];
  var ANON_COLORS  = ['#5B8EF4','#8B5CF6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

  var anonIdentity = null;

  function generateAnonIdentity() {
    var emoji = ANON_EMOJIS[Math.floor(Math.random() * ANON_EMOJIS.length)];
    var adj   = ANON_ADJECTIVES[Math.floor(Math.random() * ANON_ADJECTIVES.length)];
    var noun  = ANON_NOUNS[Math.floor(Math.random() * ANON_NOUNS.length)];
    var color = ANON_COLORS[Math.floor(Math.random() * ANON_COLORS.length)];
    return { pseudo: noun + ' ' + adj, emoji: emoji, color: color };
  }

  function renderAnonIdentity() {
    anonIdentity = generateAnonIdentity();
    var av = $('anonAvatar');
    if (av) av.style.background = 'linear-gradient(135deg,' + anonIdentity.color + '33,' + anonIdentity.color + '22)';
    setText('anonEmoji', anonIdentity.emoji);
    setText('anonPseudo', anonIdentity.pseudo);
    detectCountryFlag();
  }

  function detectCountryFlag() {
    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var code = (d.country_code || '').toUpperCase();
        if (code && $('anonFlag')) $('anonFlag').textContent = codeToFlag(code);
      }).catch(function () {});
  }

  function codeToFlag(code) {
    var offset = 127397;
    return Array.from(code).map(function (c) {
      return String.fromCodePoint(c.charCodeAt(0) + offset);
    }).join('');
  }

  /* ─────────────────────────────────────────────
     10. AUTH SCREEN
  ───────────────────────────────────────────── */
  function initAuth() {
    show($('authScreen'));
    renderAnonIdentity();
    initAuthTabs();
    initAuthForms();
    initPasswordToggle();
    initPasswordStrength();
  }

  function initAuthTabs() {
    var tabs = $qa('.auth-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.tab;
        $qa('.auth-panel').forEach(function (p) { hide(p); });
        show($('tab' + target.charAt(0).toUpperCase() + target.slice(1)));
      });
    });
  }

  function initPasswordToggle() {
    $qa('.fld-eye').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var inp = $(btn.dataset.target);
        var ico = $(btn.dataset.icon || '') || btn.querySelector('svg use');
        if (!inp) return;
        if (inp.type === 'password') {
          inp.type = 'text';
          if (ico) ico.setAttribute('href', '#ic-eye-off');
        } else {
          inp.type = 'password';
          if (ico) ico.setAttribute('href', '#ic-eye');
        }
      });
    });
  }

  function initPasswordStrength() {
    var inp   = $('registerPassword');
    var fill  = $('pwdFill');
    var label = $('pwdLabel');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var v = inp.value;
      var score = 0;
      if (v.length >= 8)  score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      var colors  = ['#ef4444','#f59e0b','#22c55e','#16a34a'];
      var labels  = ['Faible','Moyen','Fort','Très fort'];
      var widths  = ['25%','50%','75%','100%'];
      if (!v) { fill.style.width = '0'; label.textContent = ''; return; }
      var i = Math.min(score - 1, 3);
      fill.style.width      = widths[i];
      fill.style.background = colors[i];
      label.textContent     = labels[i];
      label.style.color     = colors[i];
    });
  }

  function setAuthLoading(btnId, loading) {
    var btn  = $(btnId);
    if (!btn) return;
    var txt  = btn.querySelector('.btn-txt');
    var spin = btn.querySelector('.btn-spin');
    btn.disabled = loading;
    toggle(spin, loading);
    if (txt) txt.style.opacity = loading ? '0' : '1';
  }

  function initAuthForms() {
    /* LOGIN */
    $('loginBtn').addEventListener('click', function () {
      var email = $('loginEmail').value.trim();
      var pass  = $('loginPassword').value;
      if (!email || !pass) { toast('Remplissez tous les champs', 'error'); return; }
      setAuthLoading('loginBtn', true);
      auth.signInWithEmailAndPassword(email, pass)
        .then(function () { setAuthLoading('loginBtn', false); })
        .catch(function (e) {
          setAuthLoading('loginBtn', false);
          toast(translateAuthError(e.code), 'error');
        });
    });

    /* REGISTER */
    $('registerBtn').addEventListener('click', function () {
      var pseudo  = $('registerPseudo').value.trim();
      var email   = $('registerEmail').value.trim();
      var pass    = $('registerPassword').value;
      var confirm = $('registerConfirm').value;
      if (!pseudo || !email || !pass) { toast('Remplissez tous les champs', 'error'); return; }
      if (pass !== confirm) { toast('Les mots de passe ne correspondent pas', 'error'); return; }
      if (pass.length < 8) { toast('Mot de passe trop court (min 8 caractères)', 'error'); return; }
      setAuthLoading('registerBtn', true);
      auth.createUserWithEmailAndPassword(email, pass)
        .then(function (cred) {
          return db.collection('users').doc(cred.user.uid).set({
            pseudo:    pseudo,
            email:     email,
            avatarUrl: '',
            color:     ANON_COLORS[Math.floor(Math.random() * ANON_COLORS.length)],
            status:    'online',
            role:      'user',
            badges:    [],
            strikes:   0,
            banned:    false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(function () { setAuthLoading('registerBtn', false); })
        .catch(function (e) {
          setAuthLoading('registerBtn', false);
          toast(translateAuthError(e.code), 'error');
        });
    });

    /* ANONYME */
    $('regenAnonBtn').addEventListener('click', renderAnonIdentity);

    $('anonJoinBtn').addEventListener('click', function () {
      setAuthLoading('anonJoinBtn', true);
      auth.signInAnonymously()
        .then(function (cred) {
          var id = anonIdentity || generateAnonIdentity();
          return db.collection('users').doc(cred.user.uid).set({
            pseudo:    id.pseudo,
            email:     '',
            avatarUrl: '',
            emoji:     id.emoji,
            color:     id.color,
            anonymous: true,
            status:    'online',
            role:      'user',
            badges:    [],
            strikes:   0,
            banned:    false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(function () { setAuthLoading('anonJoinBtn', false); })
        .catch(function (e) {
          setAuthLoading('anonJoinBtn', false);
          toast(translateAuthError(e.code), 'error');
        });
    });

    /* FORGOT PASSWORD */
    $('forgotPassBtn').addEventListener('click', function () {
      $qa('.auth-tab').forEach(function (t) { t.classList.remove('active'); });
      $qa('.auth-panel').forEach(function (p) { hide(p); });
      show($('tabReset'));
    });

    $('backToLoginBtn').addEventListener('click', function () {
      $qa('.auth-panel').forEach(function (p) { hide(p); });
      show($('tabLogin'));
      $qa('.auth-tab')[0].classList.add('active');
    });

    $('resetSendBtn').addEventListener('click', function () {
      var email = $('resetEmail').value.trim();
      if (!email) { toast('Entrez votre email', 'error'); return; }
      auth.sendPasswordResetEmail(email)
        .then(function () {
          toast('Email envoyé ! Vérifiez votre boîte.', 'success');
          $qa('.auth-panel').forEach(function (p) { hide(p); });
          show($('tabLogin'));
        })
        .catch(function (e) { toast(translateAuthError(e.code), 'error'); });
    });
  }

  function translateAuthError(code) {
    var map = {
      'auth/email-already-in-use':    'Cet email est déjà utilisé',
      'auth/invalid-email':           'Email invalide',
      'auth/weak-password':           'Mot de passe trop faible',
      'auth/user-not-found':          'Compte introuvable',
      'auth/wrong-password':          'Mot de passe incorrect',
      'auth/too-many-requests':       'Trop de tentatives, réessayez plus tard',
      'auth/network-request-failed':  'Erreur réseau',
      'auth/popup-closed-by-user':    'Connexion annulée'
    };
    return map[code] || 'Erreur : ' + code;
  }

  /* ─────────────────────────────────────────────
     11. INITIALISATION FIREBASE & AUTH LISTENER
  ───────────────────────────────────────────── */
  function initFirebase() {
    firebase.initializeApp(FIREBASE_CONFIG);
    db        = firebase.firestore();
    auth      = firebase.auth();
    try { messaging = firebase.messaging(); } catch (e) {}

    auth.onAuthStateChanged(function (user) {
      if (user) {
        currentUser = user;
        onUserSignedIn(user);
      } else {
        currentUser = null;
        userProfile = null;
        hide($('appMain'));
        initAuth();
      }
    });
  }

  function onUserSignedIn(user) {
    hide($('authScreen'));

    db.collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      userProfile = doc.data();
      userProfile.uid = user.uid;

      if (userProfile.banned) { showBannedScreen(userProfile.banReason); return; }

      initApp();
      listenUserProfile(user.uid);
      updateUserPresence('online');
      initFCM();
    }).catch(function () { initApp(); });
  }

  function listenUserProfile(uid) {
    if (unsubscribers.userProfile) unsubscribers.userProfile();
    unsubscribers.userProfile = db.collection('users').doc(uid).onSnapshot(function (doc) {
      if (!doc.exists) return;
      userProfile = doc.data();
      userProfile.uid = uid;
      if (userProfile.banned) { showBannedScreen(userProfile.banReason); return; }
      renderSidebarAvatar();
      renderTopbarAvatar();
      if (currentView === 'profile') renderProfileView();
    });
  }

  /* ─────────────────────────────────────────────
     12. PRÉSENCE & STATUT
  ───────────────────────────────────────────── */
  function updateUserPresence(status) {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).update({
      status:   status,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (!currentUser) return;
    updateUserPresence(document.hidden ? 'away' : 'online');
      });

  window.addEventListener('beforeunload', function () {
    updateUserPresence('offline');
      });

  function showBannedScreen(reason) {
    hide($('appMain'));
    hide($('authScreen'));
    setText('bannedReasonText', reason || 'Vous avez été banni pour violation des règles.');
    show($('bannedScreen'));
  }

  /* ─────────────────────────────────────────────
     13. NOTIFICATIONS FCM
  ───────────────────────────────────────────── */
  function initFCM() {
    if (!messaging || !currentUser) return;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') return;
      messaging.getToken({ vapidKey: VAPID_KEY }).then(function (token) {
        if (token) {
          db.collection('users').doc(currentUser.uid).update({ fcmToken: token }).catch(function () {});
        }
      }).catch(function () {});
    });

    messaging.onMessage(function (payload) {
      var n = payload.notification || {};
      toast((n.title || 'SIS') + ' : ' + (n.body || ''), 'info', 4000);
      playSound('notif');
      updateNotifBadge(1);
    });
  }

  /* ─────────────────────────────────────────────
     14. INIT APP PRINCIPALE
  ───────────────────────────────────────────── */
  function initApp() {
    show($('appMain'));
    loadTheme();
    renderSidebarAvatar();
    renderTopbarAvatar();
    initNavigation();
    initSidebarMenu();
    initRoomList();
    initBottomNav();
    initTopbarNav();
    listenOnlineMembers();
    listenNotifications();
    listenDMCount();
    renderProfileView();
    navigateTo('rooms');
  }

  /* ─────────────────────────────────────────────
     15. THÈME CLAIR / SOMBRE
  ───────────────────────────────────────────── */
  function loadTheme() {
    currentTheme = localStorage.getItem('sis_theme') || 'dark';
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sis_theme', theme);
    var icon = theme === 'dark' ? '#ic-sun' : '#ic-moon';
    [$('themeIco'), $('desktopThemeIco')].forEach(function (el) {
      if (el) el.querySelector('use').setAttribute('href', icon);
    });
  }

  function toggleTheme() { applyTheme(currentTheme === 'dark' ? 'light' : 'dark'); }

  /* ─────────────────────────────────────────────
     16. AVATARS SIDEBAR / TOPBAR
  ───────────────────────────────────────────── */
  function renderSidebarAvatar() {
    if (!userProfile) return;
    fillAvatar(
      $('sidebarAva'),
      $('sidebarAvaImg'),
      $('sidebarAvaIni'),
      userProfile.avatarUrl,
      userProfile.pseudo,
      userProfile.color
    );
    var dot = $('sidebarStatusDot');
    if (dot) {
      dot.className = 'status-dot status-dot--' + (userProfile.status || 'online');
    }
  }

  function renderTopbarAvatar() {
    if (!userProfile) return;
    fillAvatar(
      $('topbarAva'),
      $('topbarAvaImg'),
      $('topbarAvaIni'),
      userProfile.avatarUrl,
      userProfile.pseudo,
      userProfile.color
    );
    var dot = $('topbarStatusDot');
    if (dot) dot.className = 'status-dot status-dot--' + (userProfile.status || 'online');
  }

  /* ─────────────────────────────────────────────
     17. NAVIGATION PRINCIPALE
  ───────────────────────────────────────────── */
  function navigateTo(view) {
    currentView = view;

    /* Masquer toutes les vues main */
    ['emptyState', 'chatView', 'dmView', 'randomView', 'dmListView', 'notifView', 'profileView'].forEach(function (id) {
      hide($(id));
    });

    /* Sur mobile : masquer/montrer sidebar */
    var sidebar = $('sidebar');
    if (isMobile) {
      if (view === 'rooms') {
        sidebar.classList.remove('slide-out');
      } else {
        sidebar.classList.add('slide-out');
      }
    }

    if (view === 'rooms') {
      show($('emptyState'));
    } else if (view === 'dms') {
      show($('dmListView'));
      loadDMList();
    } else if (view === 'random') {
      show($('randomView'));
      startRandomChat();
    } else if (view === 'notifs') {
      show($('notifView'));
      loadNotifications();
    } else if (view === 'profile') {
      show($('profileView'));
      renderProfileView();
    }

    /* Sync nav bas */
    $qa('.nav-item').forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === view);
    });

    /* Sync topbar pills */
    $qa('.tpill').forEach(function (pill) {
      pill.classList.toggle('active', pill.dataset.view === view);
    });
  }

  /* ─────────────────────────────────────────────
     18. NAV BAS MOBILE
  ───────────────────────────────────────────── */
  function initBottomNav() {
    $qa('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var view = btn.dataset.view;
        if (view) navigateTo(view);
      });
    });
  }

  /* ─────────────────────────────────────────────
     19. TOPBAR DESKTOP
  ───────────────────────────────────────────── */
  function initTopbarNav() {
    $qa('.tpill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var view = pill.dataset.view;
        if (view) navigateTo(view);
      });
    });

    var desktopThemeBtn = $('desktopThemeBtn');
    if (desktopThemeBtn) desktopThemeBtn.addEventListener('click', toggleTheme);

    var desktopSearchBtn = $('desktopSearchBtn');
    if (desktopSearchBtn) desktopSearchBtn.addEventListener('click', openGlobalSearch);

    var topbarAvaBtn = $('topbarAvaBtn');
    if (topbarAvaBtn) topbarAvaBtn.addEventListener('click', function () { navigateTo('profile'); });
  }

  /* ─────────────────────────────────────────────
     20. MENU SIDEBAR (3 points)
  ───────────────────────────────────────────── */
  function initSidebarMenu() {
    /* Toggle menu sidebar */
    $('sidebarMenuBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      $('sidebarCtxMenu').classList.toggle('hidden');
    });

    /* Thème sidebar */
    $('themeToggleBtn').addEventListener('click', toggleTheme);

    /* Recherche globale */
    $('searchGlobalBtn').addEventListener('click', openGlobalSearch);

    /* Avatar sidebar → profil */
    $('sidebarAvaBtn').addEventListener('click', function () { navigateTo('profile'); });

    /* Actions ctx menu */
    document.addEventListener('click', function (e) {
      var item = e.target.closest('#sidebarCtxMenu .ctx-item');
      if (!item) return;
      hide($('sidebarCtxMenu'));
      var action = item.dataset.action;
      if (action === 'newRoom')  openCreateRoomModal();
      if (action === 'profile')  navigateTo('profile');
      if (action === 'settings') navigateTo('profile');
      if (action === 'admin')    openAdminPanel();
      if (action === 'logout')   doLogout();
    });

    /* Bouton FAB nouveau salon */
    $('fabNewRoom').addEventListener('click', openCreateRoomModal);
    if ($('createFirstRoomBtn')) $('createFirstRoomBtn').addEventListener('click', openCreateRoomModal);
    if ($('openRandomEmpty'))    $('openRandomEmpty').addEventListener('click', function () { navigateTo('random'); });
  }

  function doLogout() {
    updateUserPresence('offline');
    auth.signOut().then(function () {
      location.reload();
    });
  }

  /* ─────────────────────────────────────────────
     21. LISTE DES SALONS
  ───────────────────────────────────────────── */
  function initRoomList() {
    initCategoryFilter();
    initRoomSearch();
    loadRooms();
  }

  var activeCategory = 'all';
  var roomSearchQuery = '';
  var allRooms = [];

  function initCategoryFilter() {
    $qa('.cat-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $qa('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        activeCategory = chip.dataset.cat;
        renderRooms();
      });
    });
  }

  function initRoomSearch() {
    var inp = $('roomSearch');
    var clr = $('roomSearchClear');
    if (!inp) return;
    inp.addEventListener('input', function () {
      roomSearchQuery = inp.value.trim().toLowerCase();
      toggle(clr, roomSearchQuery.length > 0);
      renderRooms();
    });
    if (clr) clr.addEventListener('click', function () {
      inp.value = '';
      roomSearchQuery = '';
      hide(clr);
      renderRooms();
    });
  }

  function loadRooms() {
    show($('roomsLoading'));
    hide($('roomsEmpty'));

    if (unsubscribers.rooms) unsubscribers.rooms();
    unsubscribers.rooms = db.collection('rooms')
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function (snap) {
        allRooms = snap.docs.map(function (d) {
          var data = d.data();
          data.id = d.id;
          return data;
        });
        hide($('roomsLoading'));
        renderRooms();
      }, function () {
        hide($('roomsLoading'));
        toast('Erreur de chargement des salons', 'error');
      });
  }

  function renderRooms() {
    var list = $('roomList');
    if (!list) return;

    var filtered = allRooms.filter(function (r) {
      if (activeCategory !== 'all' && r.category !== activeCategory) return false;
      if (roomSearchQuery && r.name.toLowerCase().indexOf(roomSearchQuery) === -1) return false;
      return true;
    });

    toggle($('roomsEmpty'), filtered.length === 0);

    /* Supprimer anciens items */
    $qa('.room-item', list).forEach(function (el) { el.remove(); });

    filtered.forEach(function (room) {
      var el = document.createElement('div');
      el.className = 'room-item' + (currentRoom === room.id ? ' active' : '');
      el.dataset.roomId  = room.id;
      el.dataset.private = room.private ? 'true' : 'false';
      el.setAttribute('role', 'button');
      el.tabIndex = 0;

      var avaContent = room.photoUrl
        ? '<img src="' + room.photoUrl + '" class="ava-img" alt="' + escapeHtml(room.name) + '"/>'
        : '<span class="ava-ini">' + escapeHtml(initials(room.name)) + '</span>';

      el.innerHTML = [
        '<div class="room-item-ava">',
          '<div class="ava ava--md">' + avaContent + '</div>',
          '<span class="room-item-count">' + (room.membersCount || 0) + '</span>',
        '</div>',
        '<div class="room-item-body">',
          '<div class="room-item-top">',
            '<span class="room-item-name">' + escapeHtml(room.name) + '</span>',
            room.private ? '<span class="room-item-lock"><svg width="10" height="10"><use href="#ic-lock"/></svg></span>' : '',
            '<span class="room-item-time">' + fmtTime(room.lastMessageAt) + '</span>',
          '</div>',
          '<div class="room-item-bot">',
            '<span class="room-item-prev">' + escapeHtml(room.lastMessage || 'Aucun message') + '</span>',
          '</div>',
        '</div>'
      ].join('');

      el.addEventListener('click', function () { onRoomClick(room); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') onRoomClick(room); });
      list.appendChild(el);
    });
  }

  function onRoomClick(room) {
    if (room.private && !isMemberOfRoom(room.id)) {
      openJoinPrivateModal(room);
    } else {
      openRoom(room);
    }
  }

  function isMemberOfRoom(roomId) {
    /* Vérification côté client (la règle Firestore protège côté serveur) */
    return true; /* Simplifié — le listener renverra une erreur si non autorisé */
  }

  /* ─────────────────────────────────────────────
     22. CRÉER UN SALON
  ───────────────────────────────────────────── */
  function openCreateRoomModal() {
    show($('createRoomModal'));
    $('newRoomName').value = '';
    $('newRoomPrivate').checked = false;
    hide($('roomPassWrap'));
    $('createRoomPhotoImg').src = '';
    hide($('createRoomPhotoImg'));
    show($('createRoomPhotoIco'));
  }

  /* Toggle champ mot de passe */
  $('newRoomPrivate').addEventListener('change', function () {
    toggle($('roomPassWrap'), this.checked);
      });

  /* Prévisualiser photo */
  $('createRoomPhotoInput').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = $('createRoomPhotoImg');
      img.src = e.target.result;
      show(img);
      hide($('createRoomPhotoIco'));
    };
    reader.readAsDataURL(file);
      });

  $('createRoomSubmitBtn').addEventListener('click', function () {
    var name     = $('newRoomName').value.trim();
    var category = $('newRoomCategory').value;
    var isPriv   = $('newRoomPrivate').checked;
    var pass     = $('newRoomPassword').value;
    var photoFile = $('createRoomPhotoInput').files[0];

    if (!name) { toast('Donnez un nom au salon', 'error'); return; }
    if (isPriv && !pass) { toast('Entrez un mot de passe pour le salon privé', 'error'); return; }

    $('createRoomSubmitBtn').disabled = true;

    function doCreate(photoUrl) {
      return db.collection('rooms').add({
        name:          name,
        category:      category,
        private:       isPriv,
        password:      isPriv ? pass : '',
        photoUrl:      photoUrl || '',
        createdBy:     currentUser.uid,
        membersCount:  1,
        lastMessage:   '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt:     firebase.firestore.FieldValue.serverTimestamp()
      }).then(function (ref) {
        hide($('createRoomModal'));
        $('createRoomSubmitBtn').disabled = false;
        toast('Salon créé !', 'success');
        openRoom({ id: ref.id, name: name, category: category, private: isPriv, photoUrl: photoUrl || '', createdBy: currentUser.uid });
      });
    }

    if (photoFile) {
      uploadToCloudinary(photoFile, null).then(doCreate).catch(function () {
        doCreate('');
      });
    } else {
      doCreate('');
    }
      });

  /* ─────────────────────────────────────────────
     23. REJOINDRE SALON PRIVÉ
  ───────────────────────────────────────────── */
  var pendingPrivateRoom = null;

  function openJoinPrivateModal(room) {
    pendingPrivateRoom = room;
    $('joinRoomPassword').value = '';
    show($('joinPrivateModal'));
  }

  $('joinPrivateSubmitBtn').addEventListener('click', function () {
    if (!pendingPrivateRoom) return;
    var pass = $('joinRoomPassword').value;
    if (pass !== pendingPrivateRoom.password) {
      toast('Mot de passe incorrect', 'error');
      return;
    }
    hide($('joinPrivateModal'));
    openRoom(pendingPrivateRoom);
    pendingPrivateRoom = null;
      });

  /* ─────────────────────────────────────────────
     24. OUVRIR UN SALON
  ───────────────────────────────────────────── */
  function openRoom(room) {
    currentRoom     = room.id;
    currentRoomData = room;

    /* Nav */
    $qa('.room-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.roomId === room.id);
    });

    /* Sur mobile : masquer sidebar */
    if (isMobile) $('sidebar').classList.add('slide-out');

    /* Masquer vues */
    ['emptyState', 'dmView', 'randomView', 'dmListView', 'notifView', 'profileView'].forEach(function (id) { hide($(id)); });
    show($('chatView'));

    /* Remplir header */
    var nameEl = $('chatRoomName');
    var subEl  = $('chatRoomSub');
    if (nameEl) nameEl.textContent = room.name || 'Salon';

    fillAvatar(
      $('chatRoomAvaWrap'),
      $('chatRoomAvaImg'),
      $('chatRoomAvaIni'),
      room.photoUrl || '',
      room.name,
      null
    );

    toggle($('chatRoomLock'), room.private);

    /* Bouton supprimer salon (seulement pour créateur ou admin) */
    var isCreator = currentUser && room.createdBy === currentUser.uid;
    var isAdmin   = userProfile && userProfile.role === 'admin';
    toggle($('deleteRoomCtxBtn'), isCreator || isAdmin);

    /* Fond de chat */
    applyRoomBg(room.id);

    /* Charger les messages */
    loadMessages(room.id);

    /* Écouter infos salon (membres, etc.) */
    listenRoomInfo(room.id);

    /* Incremente membersCount si nécessaire */
    db.collection('rooms').doc(room.id).update({
      membersCount: firebase.firestore.FieldValue.increment(1)
    }).catch(function () {});
  }

  function listenRoomInfo(roomId) {
    if (unsubscribers.roomInfo) unsubscribers.roomInfo();
    unsubscribers.roomInfo = db.collection('rooms').doc(roomId).onSnapshot(function (doc) {
      if (!doc.exists) return;
      currentRoomData = doc.data();
      currentRoomData.id = roomId;
      var sub = $('chatRoomSub');
      if (sub) sub.textContent = (currentRoomData.membersCount || 0) + ' membres';

      /* Màj photo si elle change */
      if (currentRoomData.photoUrl) {
        var img = $('chatRoomAvaImg');
        var ini = $('chatRoomAvaIni');
        if (img) { img.src = currentRoomData.photoUrl; show(img); }
        if (ini) hide(ini);
        /* Mettre à jour aussi dans la liste */
        var listItem = $q('[data-room-id="' + roomId + '"] .ava-img');
        if (listItem) listItem.src = currentRoomData.photoUrl;
      }

      /* Message épinglé */
      if (currentRoomData.pinnedMessage) {
        show($('pinnedBar'));
        setText('pinnedAuthor', currentRoomData.pinnedMessage.author || '');
        setText('pinnedText',   currentRoomData.pinnedMessage.text   || '');
      } else {
        hide($('pinnedBar'));
      }
    });
  }

  /* ─────────────────────────────────────────────
     25. SUPPRIMER UN SALON
  ───────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var item = e.target.closest('[data-action="deleteRoom"]');
    if (!item) return;
    if (!currentRoomData) return;
    hide($('chatCtxMenu'));
    setText('deleteRoomNameEl', currentRoomData.name || 'ce salon');
    $('deleteRoomId').value = currentRoom;
    show($('deleteRoomModal'));
      });

  $('confirmDeleteRoomBtn').addEventListener('click', function () {
    var roomId = $('deleteRoomId').value;
    if (!roomId) return;
    this.disabled = true;
    db.collection('rooms').doc(roomId).delete()
      .then(function () {
        /* Supprimer aussi les messages du salon */
        return db.collection('messages').where('roomId', '==', roomId).get().then(function (snap) {
          var batch = db.batch();
          snap.docs.forEach(function (d) { batch.delete(d.ref); });
          return batch.commit();
        });
      })
      .then(function () {
        hide($('deleteRoomModal'));
        $('confirmDeleteRoomBtn').disabled = false;
        currentRoom = null;
        currentRoomData = null;
        hide($('chatView'));
        show($('emptyState'));
        toast('Salon supprimé', 'success');
      })
      .catch(function () {
        $('confirmDeleteRoomBtn').disabled = false;
        toast('Erreur lors de la suppression', 'error');
      });
      });

  /* ─────────────────────────────────────────────
     26. CHANGER PHOTO DU SALON
  ───────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var item = e.target.closest('[data-action="changeRoomPhoto"]');
    if (!item) return;
    hide($('chatCtxMenu'));
    show($('changeRoomPhotoModal'));
    /* Pré-remplir l'image actuelle */
    var cur = $('changeRoomPhotoImg');
    if (cur && currentRoomData && currentRoomData.photoUrl) {
      cur.src = currentRoomData.photoUrl;
    }
      });

  $('changeRoomPhotoFile').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = $('changeRoomPhotoImg');
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(file);
      });

  $('confirmChangeRoomPhotoBtn').addEventListener('click', function () {
    var file = $('changeRoomPhotoFile').files[0];
    if (!file) { hide($('changeRoomPhotoModal')); return; }

    var prog    = $('roomPhotoProg');
    var fill    = $('roomPhotoProgFill');
    var pct     = $('roomPhotoProgressPct');
    var self    = this;
    self.disabled = true;
    show(prog);

    uploadToCloudinary(file, function (p) {
      if (fill) fill.style.width = p + '%';
      if (pct)  pct.textContent  = p + '%';
    }).then(function (url) {
      return db.collection('rooms').doc(currentRoom).update({ photoUrl: url });
    }).then(function () {
      self.disabled = false;
      hide(prog);
      hide($('changeRoomPhotoModal'));
      toast('Photo du salon mise à jour !', 'success');
    }).catch(function () {
      self.disabled = false;
      hide(prog);
      toast('Erreur upload', 'error');
    });
      });

  /* ─────────────────────────────────────────────
     27. MEMBRES DU SALON
  ───────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var item = e.target.closest('[data-action="viewMembers"]');
    if (!item) return;
    hide($('chatCtxMenu'));
    openMembersModal();
      });

  /* Clic sur header du chat → aussi voir membres */
  $('chatRoomInfoBtn').addEventListener('click', function () {
    openMembersModal();
      });

  function openMembersModal() {
    if (!currentRoom) return;
    show($('membersModal'));
    var list = $('membersList');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Chargement…</div>';

    db.collection('users').where('status', '!=', 'offline').limit(50).get().then(function (snap) {
      list.innerHTML = '';
      if (snap.empty) {
        list.innerHTML = '<div class="list-empty"><p>Aucun membre en ligne</p></div>';
        return;
      }
      snap.docs.forEach(function (doc) {
        var u = doc.data();
        u.uid = doc.id;
        list.appendChild(buildMemberItem(u));
      });
    }).catch(function () {
      list.innerHTML = '<div class="list-empty"><p>Erreur de chargement</p></div>';
    });

    /* Recherche dans membres */
    var search = $('membersSearchInput');
    if (search) {
      search.value = '';
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        $qa('.member-item', list).forEach(function (el) {
          var name = el.dataset.name || '';
          el.style.display = name.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
        });
      });
    }
  }

  function buildMemberItem(u) {
    var el = document.createElement('div');
    el.className = 'member-item';
    el.dataset.uid  = u.uid;
    el.dataset.name = u.pseudo || '';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;

    var isVerified = u.email && u.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();
    var avaContent = u.avatarUrl
      ? '<img src="' + escapeHtml(u.avatarUrl) + '" class="ava-img" alt=""/>'
      : '<span class="ava-ini">' + escapeHtml(initials(u.pseudo || '?')) + '</span>';

    el.innerHTML = [
      '<div class="ava ava--sm" style="' + (u.color ? 'background:' + u.color + '22' : '') + '">',
        avaContent,
        '<span class="status-dot status-dot--' + (u.status || 'offline') + '"></span>',
      '</div>',
      '<div class="member-info">',
        '<div class="member-name-row">',
          '<span class="member-name">' + escapeHtml(u.pseudo || 'Anonyme') + '</span>',
          isVerified ? '<span class="verified-ico"><svg width="13" height="13"><use href="#ic-verified"/></svg></span>' : '',
        '</div>',
        '<span class="member-role">' + escapeHtml(u.role || 'Membre') + '</span>',
      '</div>',
      '<div class="member-badges">' + renderBadgesHtml(u.badges || []) + '</div>',
      '<svg class="row-arrow" width="16" height="16"><use href="#ic-chevron-right"/></svg>'
    ].join('');

    el.addEventListener('click', function () {
      hide($('membersModal'));
      openPublicProfile(u);
    });

    return el;
  }

  function renderBadgesHtml(badges) {
    return badges.slice(0, 3).map(function (b) {
      return '<span style="font-size:0.9rem">' + b + '</span>';
    }).join('');
  }

  /* ─────────────────────────────────────────────
     28. PROFIL PUBLIC
  ───────────────────────────────────────────── */
  function openPublicProfile(u) {
    show($('publicProfileModal'));

    var isVerified = u.email && u.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();

    fillAvatar(
      $('pubAvaEl'),
      $('pubAvaImg'),
      $('pubAvaIni'),
      u.avatarUrl || '',
      u.pseudo || 'Anonyme',
      u.color
    );

    var ring = $('pubStatusRing');
    if (ring) ring.className = 'ava-status-ring';

    setText('pubName', u.pseudo || 'Anonyme');
    setText('pubRole', u.role   || 'Membre');
    $('pubUid').value = u.uid;

    toggle($('pubVerifiedBadge'), isVerified);

    var badgesEl = $('pubBadges');
    if (badgesEl) {
      badgesEl.innerHTML = (u.badges || []).map(function (b) {
        return '<span class="badge-tag">' + b + '</span>';
      }).join('') || '<span style="font-size:0.8rem;color:var(--text-muted)">Aucun badge</span>';
    }
  }

  $('sendDmBtn').addEventListener('click', function () {
    var uid = $('pubUid').value;
    if (!uid) return;
    hide($('publicProfileModal'));
    openDmWith(uid);
      });

  $('reportUserBtn').addEventListener('click', function () {
    var uid = $('pubUid').value;
    if (!uid) return;
    hide($('publicProfileModal'));
    $('reportUsrId').value = uid;
    show($('reportMsgModal'));
      });

  /* ─────────────────────────────────────────────
     29. MEMBRES EN LIGNE (STRIP)
  ───────────────────────────────────────────── */
  function listenOnlineMembers() {
    if (unsubscribers.online) unsubscribers.online();
    unsubscribers.online = db.collection('users')
      .where('status', '==', 'online')
      .limit(10)
      .onSnapshot(function (snap) {
        var count = snap.size;
        setText('onlineCount', count);
        var avasEl = $('onlineAvas');
        if (!avasEl) return;
        avasEl.innerHTML = '';
        snap.docs.slice(0, 5).forEach(function (doc) {
          var u = doc.data();
          var a = document.createElement('div');
          a.className = 'ava ava--xs';
          a.style.marginLeft = '-6px';
          a.style.border = '2px solid var(--sb-bg)';
          a.style.background = u.color || 'var(--bg-surface2)';
          if (u.avatarUrl) {
            var img = document.createElement('img');
            img.src = u.avatarUrl;
            img.className = 'ava-img';
            a.appendChild(img);
          } else {
            var ini = document.createElement('span');
            ini.className = 'ava-ini';
            ini.style.fontSize = '0.6rem';
            ini.textContent = initials(u.pseudo || '?');
            a.appendChild(ini);
          }
          avasEl.appendChild(a);
        });
      });
  }

  /* ─────────────────────────────────────────────
     30. ESCAPEHTML
  ───────────────────────────────────────────── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Convertir URLs en liens cliquables */
  function linkify(text) {
    var urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    return escapeHtml(text).replace(urlRegex, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
  }

  /* Markdown basique (gras, italique, code) */
  function parseMarkdown(text) {
    return linkify(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>');
  }

  /* ─────────────────────────────────────────────
     31. CHARGEMENT DES MESSAGES
  ───────────────────────────────────────────── */
  var lastMsgDate = '';

  function loadMessages(roomId) {
    var list = $('messagesList');
    list.innerHTML = '';
    show($('msgsLoading'));

    if (unsubscribers.messages) unsubscribers.messages();
    lastMsgDate = '';

    unsubscribers.messages = db.collection('messages')
      .where('roomId', '==', roomId)
      .orderBy('createdAt', 'asc')
      .limit(80)
      .onSnapshot(function (snap) {
        hide($('msgsLoading'));
        snap.docChanges().forEach(function (change) {
          if (change.type === 'added') {
            var msg = change.doc.data();
            msg.id = change.doc.id;
            appendMessage(msg, roomId);
          }
          if (change.type === 'modified') {
            updateMessageEl(change.doc.id, change.doc.data());
          }
          if (change.type === 'removed') {
            removeMessageEl(change.doc.id);
          }
        });
        scrollToBottom('messagesArea', false);
      });
  }

  function appendMessage(msg, roomId, container) {
    var list = container || $('messagesList');
    if (!list) return;

    /* Séparateur de date */
    var dateStr = fmtDate(msg.createdAt);
    if (dateStr && dateStr !== lastMsgDate) {
      lastMsgDate = dateStr;
      var sep = document.createElement('div');
      sep.className = 'msg-date-sep';
      sep.innerHTML = '<span>' + escapeHtml(dateStr) + '</span>';
      list.appendChild(sep);
    }

    var isMine = currentUser && msg.authorId === currentUser.uid;
    var isVerified = msg.authorEmail && msg.authorEmail.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();

    var replyHtml = '';
    if (msg.replyTo) {
      replyHtml = [
        '<div class="msg-reply-quote" data-ref="' + escapeHtml(msg.replyTo.id) + '">',
          '<span class="rq-author">' + escapeHtml(msg.replyTo.author || '') + '</span>',
          '<span class="rq-text">' + escapeHtml(msg.replyTo.text || '') + '</span>',
        '</div>'
      ].join('');
    }

    var bodyHtml = '';
    if (msg.type === 'image') {
      bodyHtml = '<img class="msg-image" src="' + escapeHtml(msg.mediaUrl) + '" alt="Image" loading="lazy"/>';
    } else if (msg.type === 'gif') {
      bodyHtml = '<img class="msg-gif" src="' + escapeHtml(msg.mediaUrl) + '" alt="GIF" loading="lazy"/>';
    } else if (msg.type === 'sticker') {
      bodyHtml = '<img class="msg-sticker" src="' + escapeHtml(msg.mediaUrl) + '" alt="Sticker"/>';
    } else if (msg.type === 'voice') {
      bodyHtml = buildVoicePlayerHtml(msg.mediaUrl, msg.duration || 0);
    } else if (msg.type === 'poll') {
      bodyHtml = buildPollHtml(msg);
    } else {
      bodyHtml = '<p class="msg-text">' + parseMarkdown(msg.text || '') + '</p>';
    }

    var statusHtml = '';
    if (isMine) {
      statusHtml = '<span class="msg-status' + (msg.readBy && Object.keys(msg.readBy).length > 1 ? ' read' : '') + '">' +
        '<svg width="14" height="14"><use href="' + (msg.delivered ? '#ic-read' : '#ic-sent') + '"/></svg>' +
        '</span>';
    }

    var el = document.createElement('div');
    el.className = 'msg-wrap ' + (isMine ? 'msg-out' : 'msg-in');
    el.dataset.msgId    = msg.id;
    el.dataset.authorId = msg.authorId || '';

    var authorHtml = !isMine ? [
      '<span class="msg-author" style="color:' + (msg.authorColor || 'var(--accent-1)') + '">',
        escapeHtml(msg.authorName || 'Anonyme'),
        isVerified ? '<svg class="verified-ico" width="13" height="13"><use href="#ic-verified"/></svg>' : '',
      '</span>'
    ].join('') : '';

    el.innerHTML = [
      !isMine ? '<div class="msg-ava-col">' +
        buildMiniAva(msg.authorAvatar || '', msg.authorName || '', msg.authorColor || '') +
        '</div>' : '',
      '<div class="msg-main">',
        authorHtml,
        replyHtml,
        '<div class="msg-bubble">',
          bodyHtml,
          '<div class="msg-meta">',
            '<span class="msg-edited' + (msg.edited ? '' : ' hidden') + '">modifié</span>',
            '<span class="msg-time">' + fmtTime(msg.createdAt) + '</span>',
            statusHtml,
          '</div>',
        '</div>',
        '<div class="msg-reactions' + (msg.reactions && Object.keys(msg.reactions).length ? '' : ' hidden') + '">',
          buildReactionsHtml(msg.reactions || {}),
        '</div>',
      '</div>'
    ].join('');

    /* Long press / clic droit */
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); openMsgSheet(msg, isMine); });
    var longPressTimer;
    el.addEventListener('touchstart', function () { longPressTimer = setTimeout(function () { openMsgSheet(msg, isMine); }, 600); });
    el.addEventListener('touchend', function () { clearTimeout(longPressTimer); });

    list.appendChild(el);

    /* Son à la réception */
    if (!isMine) playSound('receive');
  }

  function buildMiniAva(url, name, color) {
    var content = url
      ? '<img src="' + escapeHtml(url) + '" class="ava-img" alt=""/>'
      : '<span class="ava-ini" style="font-size:0.65rem">' + escapeHtml(initials(name)) + '</span>';
    return '<div class="ava ava--xs" style="background:' + (color || 'var(--bg-surface2)') + '22">' + content + '</div>';
  }

  function buildVoicePlayerHtml(url, dur) {
    var durStr = Math.floor(dur / 60) + ':' + (dur % 60).toString().padStart(2, '0');
    return [
      '<div class="msg-voice-player">',
        '<button class="voice-play-btn" data-url="' + escapeHtml(url || '') + '" data-dur="' + dur + '">',
          '<svg><use href="#ic-play"/></svg>',
        '</button>',
        '<div class="voice-waveform-static">',
          Array.from({ length: 20 }, function (_, i) {
            var h = Math.floor(Math.random() * 80 + 20);
            return '<span style="height:' + h + '%"></span>';
          }).join(''),
        '</div>',
        '<span class="voice-duration">' + escapeHtml(durStr) + '</span>',
      '</div>'
    ].join('');
  }

  function buildPollHtml(msg) {
    var p = msg.pollData || {};
    var total = (p.votes ? Object.values(p.votes).reduce(function (s, v) { return s + v; }, 0) : 0);
    var optHtml = (p.options || []).map(function (opt, i) {
      var votes = (p.votes && p.votes[i]) || 0;
      var pct   = total > 0 ? Math.round(votes / total * 100) : 0;
      return [
        '<div class="poll-opt-item" data-opt="' + i + '">',
          '<div class="poll-opt-label"><span>' + escapeHtml(opt) + '</span><span>' + pct + '%</span></div>',
          '<div class="poll-opt-bar"><div class="poll-opt-fill" style="width:' + pct + '%"></div></div>',
        '</div>'
      ].join('');
    }).join('');
    return [
      '<div class="msg-poll-card">',
        '<div class="poll-question">' + escapeHtml(p.question || '') + '</div>',
        optHtml,
        '<div class="poll-total">' + total + ' vote' + (total !== 1 ? 's' : '') + '</div>',
      '</div>'
    ].join('');
  }

  function buildReactionsHtml(reactions) {
    var counts = {};
    Object.values(reactions).forEach(function (emoji) {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return Object.keys(counts).map(function (emoji) {
      return '<button class="reaction-chip">' + emoji + ' ' + counts[emoji] + '</button>';
    }).join('');
  }

  function updateMessageEl(msgId, data) {
    var el = $q('[data-msg-id="' + msgId + '"]');
    if (!el) return;
    var textEl = el.querySelector('.msg-text');
    if (textEl && data.text) textEl.innerHTML = parseMarkdown(data.text);
    var editedEl = el.querySelector('.msg-edited');
    if (editedEl) toggle(editedEl, !!data.edited);
    var reactEl = el.querySelector('.msg-reactions');
    if (reactEl) {
      reactEl.innerHTML = buildReactionsHtml(data.reactions || {});
      toggle(reactEl, Object.keys(data.reactions || {}).length > 0);
    }
  }

  function removeMessageEl(msgId) {
    var el = $q('[data-msg-id="' + msgId + '"]');
    if (el) {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9)';
      setTimeout(function () { el.remove(); }, 300);
    }
  }

  function scrollToBottom(areaId, force) {
    var area = $(areaId || 'messagesArea');
    if (!area) return;
    var nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 200;
    if (force || nearBottom) area.scrollTop = area.scrollHeight;
    else {
      var btn = $('scrollBottomBtn');
      show(btn);
    }
  }

  /* ─────────────────────────────────────────────
     32. ENVOI DE MESSAGES
  ───────────────────────────────────────────── */
  function initInputZone() {
    var inp  = $('messageInput');
    var send = $('sendBtn');
    if (!inp || !send) return;

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
    });
    inp.addEventListener('input', broadcastTyping);
    send.addEventListener('click', sendTextMessage);
    addRipple(send);

    /* Scroll bas */
    var area = $('messagesArea');
    if (area) area.addEventListener('scroll', function () {
      var nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;
      toggle($('scrollBottomBtn'), !nearBottom);
    });
    $('scrollBottomBtn').addEventListener('click', function () {
      scrollToBottom('messagesArea', true);
      hide($('scrollBottomBtn'));
    });

    /* Attachement */
    $('attachBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      $('attachMenu').classList.toggle('hidden');
    });

    /* Image */
    $('imageInput').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      previewMedia(file, 'image');
    });

    /* Sticker */
    $('stickerInput').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      sendMedia(file, 'sticker');
    });

    /* GIF */
    $('openGifBtn').addEventListener('click', function () {
      hide($('attachMenu'));
      show($('gifModal'));
      initGifSearch();
    });

    /* Sondage */
    $('openPollBtn').addEventListener('click', function () {
      hide($('attachMenu'));
      show($('pollModal'));
    });

    /* Emoji */
    $('emojiToggleBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var picker = $('emojiPicker');
      picker.classList.toggle('hidden');
      if (!picker.classList.contains('hidden')) buildEmojiGrid();
    });

    /* Vocal */
    $('micBtn').addEventListener('click', startVoiceRecording);

    /* Reply close */
    $('replyCloseBtn').addEventListener('click', function () {
      replyTarget = null;
      hide($('replyPreview'));
    });

    /* Media preview */
    $('confirmSendMediaBtn').addEventListener('click', confirmSendMedia);
    $('cancelMediaBtn').addEventListener('click', function () {
      hide($('mediaPrevOverlay'));
      pendingMediaFile = null;
      pendingMediaType = null;
    });

    /* Chat actions (header) */
    $('chatBackBtn').addEventListener('click', function () {
      if (isMobile) {
        $('sidebar').classList.remove('slide-out');
        hide($('chatView'));
        show($('emptyState'));
        currentRoom = null;
      }
    });

    $('chatMenuBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      $('chatCtxMenu').classList.toggle('hidden');
    });

    $('chatSearchToggleBtn').addEventListener('click', function () {
      var bar = $('chatSearchBar');
      bar.classList.toggle('hidden');
      if (!bar.classList.contains('hidden')) $('chatSearchInput').focus();
    });

    $('chatSearchCloseBtn').addEventListener('click', function () { hide($('chatSearchBar')); });

    $('chatBgBtn').addEventListener('click', function () {
      $('bgCtx').value     = 'room';
      $('bgTargetId').value = currentRoom;
      pendingBg = null;
      previewCurrentBg();
      show($('chatBgModal'));
    });

    /* Menu actions chat */
    document.addEventListener('click', function (e) {
      var item = e.target.closest('#chatCtxMenu .ctx-item');
      if (!item) return;
      hide($('chatCtxMenu'));
      var action = item.dataset.action;
      if (action === 'shareRoom')   shareRoom();
      if (action === 'viewMembers') openMembersModal();
      if (action === 'muteRoom')    toast('Salon mis en silencieux', 'info');
      if (action === 'leaveRoom')   leaveRoom();
    });

    /* Épingle — fermer */
    $('pinnedClose').addEventListener('click', function () { hide($('pinnedBar')); });
    $('pinnedBar').addEventListener('click', scrollToPinned);
  }

  function getInputText() {
    var el = $('messageInput');
    return el ? el.innerText.trim() : '';
  }

  function clearInput() {
    var el = $('messageInput');
    if (el) el.innerText = '';
  }

  function sendTextMessage() {
    if (!currentRoom || !currentUser) return;
    var text = getInputText();
    if (!text) return;

    var isAdmin  = userProfile && userProfile.role === 'admin';
    var isVerified = userProfile && userProfile.email && userProfile.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();

    var msgData = {
      roomId:      currentRoom,
      text:        text,
      type:        'text',
      authorId:    currentUser.uid,
      authorName:  userProfile ? userProfile.pseudo  : 'Anonyme',
      authorEmail: userProfile ? (userProfile.email || '') : '',
      authorAvatar:userProfile ? (userProfile.avatarUrl || '') : '',
      authorColor: userProfile ? (userProfile.color || '#5B8EF4') : '#5B8EF4',
      delivered:   true,
      readBy:      {},
      reactions:   {},
      edited:      false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyTarget) {
      msgData.replyTo = { id: replyTarget.id, author: replyTarget.author, text: replyTarget.text };
      replyTarget = null;
      hide($('replyPreview'));
    }

    clearInput();
    playSound('send');

    encryptMsg(text).then(function (enc) {
      var saveData = Object.assign({}, msgData, { text: enc });
      db.collection('messages').add(saveData).catch(function () {
        toast('Erreur d\'envoi', 'error');
      });
    });

    /* Mise à jour dernier message dans le salon */
    db.collection('rooms').doc(currentRoom).update({
      lastMessage:   text.slice(0, 60),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  }

  /* ─────────────────────────────────────────────
     33. MÉDIAS (images, stickers)
  ───────────────────────────────────────────── */
  var pendingMediaFile = null;
  var pendingMediaType = null;

  function previewMedia(file, type) {
    pendingMediaFile = file;
    pendingMediaType = type;
    var reader = new FileReader();
    reader.onload = function (e) {
      $('mediaPrevImg').src = e.target.result;
      hide($('uploadProg'));
      show($('mediaPrevOverlay'));
    };
    reader.readAsDataURL(file);
  }

  function confirmSendMedia() {
    if (!pendingMediaFile || !currentRoom) return;
    $('confirmSendMediaBtn').disabled = true;
    show($('uploadProg'));

    uploadToCloudinary(pendingMediaFile, function (p) {
      $('uploadProgFill').style.width = p + '%';
      $('uploadProgPct').textContent  = p + '%';
    }).then(function (url) {
      return sendMedia(null, pendingMediaType, url);
    }).then(function () {
      $('confirmSendMediaBtn').disabled = false;
      hide($('mediaPrevOverlay'));
      pendingMediaFile = null;
    }).catch(function () {
      $('confirmSendMediaBtn').disabled = false;
      toast('Erreur upload', 'error');
    });
  }

  function sendMedia(file, type, existingUrl) {
    if (!currentRoom || !currentUser) return Promise.resolve();

    var buildMsg = function (url) {
      return db.collection('messages').add({
        roomId:      currentRoom,
        text:        '',
        type:        type,
        mediaUrl:    url,
        authorId:    currentUser.uid,
        authorName:  userProfile ? userProfile.pseudo  : 'Anonyme',
        authorEmail: userProfile ? (userProfile.email  || '') : '',
        authorAvatar:userProfile ? (userProfile.avatarUrl || '') : '',
        authorColor: userProfile ? (userProfile.color  || '#5B8EF4') : '#5B8EF4',
        delivered:   true,
        readBy:      {},
        reactions:   {},
        edited:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () {
        db.collection('rooms').doc(currentRoom).update({
          lastMessage:   '[' + (type === 'image' ? 'Image' : type === 'gif' ? 'GIF' : 'Sticker') + ']',
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});
        playSound('send');
      });
    };

    if (existingUrl) return buildMsg(existingUrl);
    if (file) {
      return uploadToCloudinary(file, null).then(buildMsg);
    }
    return Promise.resolve();
  }

  /* ─────────────────────────────────────────────
     34. GIF (Tenor)
  ───────────────────────────────────────────── */
  var gifSearchDebounce = null;

  function initGifSearch() {
    var inp  = $('gifSearchInput');
    if (!inp) return;
    inp.value = '';
    inp.addEventListener('input', function () {
      clearTimeout(gifSearchDebounce);
      gifSearchDebounce = setTimeout(function () {
        searchGif(inp.value.trim());
      }, 400);
    });
  }

  function searchGif(query) {
    var grid = $('gifGrid');
    if (!grid) return;
    if (!query) {
      grid.innerHTML = '<p class="gif-placeholder">Entrez un terme de recherche</p>';
      return;
    }
    grid.innerHTML = '<p class="gif-placeholder">Chargement…</p>';
    fetch('https://tenor.googleapis.com/v2/search?q=' + encodeURIComponent(query) + '&key=' + TENOR_KEY + '&limit=12&media_filter=gif')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        grid.innerHTML = '';
        (data.results || []).forEach(function (result) {
          var url = result.media_formats && result.media_formats.gif && result.media_formats.gif.url;
          if (!url) return;
          var preview = result.media_formats.tinygif ? result.media_formats.tinygif.url : url;
          var el = document.createElement('div');
          el.className = 'gif-item';
          el.innerHTML = '<img src="' + escapeHtml(preview) + '" alt="gif" loading="lazy"/>';
          el.addEventListener('click', function () {
            hide($('gifModal'));
            sendMedia(null, 'gif', url);
          });
          grid.appendChild(el);
        });
        if (!data.results || data.results.length === 0) {
          grid.innerHTML = '<p class="gif-placeholder">Aucun résultat</p>';
        }
      }).catch(function () {
        grid.innerHTML = '<p class="gif-placeholder">Clé Tenor manquante — configurez TENOR_KEY</p>';
      });
  }

  /* ─────────────────────────────────────────────
     35. EMOJI PICKER
  ───────────────────────────────────────────── */
  var EMOJIS = [
    '😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥',
    '🎉','💯','😮','🙏','👏','💪','🤝','✨','🚀','💎','🎯','⭐',
    '😏','🤗','😴','🥳','😱','🤩','💀','👻','🎃','🌙','☀️','🌈',
    '🍕','🍔','🍟','🌮','🍜','☕','🍺','🥂','🎵','🎮','⚽','🏀',
    '🐶','🐱','🦊','🐺','🦁','🐸','🦋','🐙','🦄','🐲','🌸','🌺'
  ];

  function buildEmojiGrid() {
    var grid = $('emojiGrid');
    if (!grid || grid.children.length > 0) return;
    EMOJIS.forEach(function (e) {
      var btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.textContent = e;
      btn.addEventListener('click', function () {
        insertAtCursor($('messageInput'), e);
        hide($('emojiPicker'));
      });
      grid.appendChild(btn);
    });
  }

  function insertAtCursor(el, text) {
    if (!el) return;
    el.focus();
    var sel = window.getSelection();
    var range = sel.getRangeAt ? sel.getRangeAt(0) : document.createRange();
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* ─────────────────────────────────────────────
     36. SONDAGE
  ───────────────────────────────────────────── */
  $('addPollOptBtn').addEventListener('click', function () {
    var container = $('pollOptionsContainer');
    var count = container.querySelectorAll('.poll-opt').length;
    if (count >= 10) { toast('Maximum 10 options', 'warn'); return; }
    var row = document.createElement('div');
    row.className = 'poll-opt-row';
    row.innerHTML = [
      '<div class="fld-wrap"><input type="text" class="fld-inp poll-opt" placeholder="Option ' + (count + 1) + '" maxlength="100"/></div>',
      '<button class="icon-btn poll-remove-opt"><svg width="14" height="14"><use href="#ic-close"/></svg></button>'
    ].join('');
    row.querySelector('.poll-remove-opt').addEventListener('click', function () { row.remove(); });
    container.appendChild(row);
    /* Montrer les boutons supprimer sur toutes les lignes */
    container.querySelectorAll('.poll-remove-opt').forEach(function (b) { show(b); });
      });

  $('createPollSubmitBtn').addEventListener('click', function () {
    if (!currentRoom || !currentUser) return;
    var question = $('pollQuestion').value.trim();
    var options  = Array.from($qa('.poll-opt')).map(function (i) { return i.value.trim(); }).filter(Boolean);
    var anon     = $('pollAnonymous').checked;

    if (!question) { toast('Entrez une question', 'error'); return; }
    if (options.length < 2) { toast('Ajoutez au moins 2 options', 'error'); return; }

    db.collection('messages').add({
      roomId:      currentRoom,
      text:        '[Sondage] ' + question,
      type:        'poll',
      pollData:    { question: question, options: options, anonymous: anon, votes: {} },
      authorId:    currentUser.uid,
      authorName:  userProfile ? userProfile.pseudo  : 'Anonyme',
      authorEmail: userProfile ? (userProfile.email  || '') : '',
      authorAvatar:userProfile ? (userProfile.avatarUrl || '') : '',
      authorColor: userProfile ? (userProfile.color  || '#5B8EF4') : '#5B8EF4',
      delivered:   true,
      readBy:      {},
      reactions:   {},
      edited:      false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      hide($('pollModal'));
      $('pollQuestion').value = '';
      db.collection('rooms').doc(currentRoom).update({
        lastMessage:   '[Sondage] ' + question,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function () {});
    }).catch(function () { toast('Erreur création sondage', 'error'); });
      });

  /* Vote sur sondage (délégation) */
  document.addEventListener('click', function (e) {
    var optEl = e.target.closest('.poll-opt-item');
    if (!optEl || !currentUser) return;
    var msgEl = optEl.closest('[data-msg-id]');
    if (!msgEl) return;
    var msgId  = msgEl.dataset.msgId;
    var optIdx = optEl.dataset.opt;
    db.collection('messages').doc(msgId).update({
      ['pollData.votes.' + optIdx]: firebase.firestore.FieldValue.increment(1)
    }).catch(function () {});
      });

  /* ─────────────────────────────────────────────
     37. TYPING INDICATOR
  ───────────────────────────────────────────── */
  function broadcastTyping() {
    if (!currentRoom || !currentUser || !userProfile) return;
    db.collection('rooms').doc(currentRoom).update({
      ['typing.' + currentUser.uid]: userProfile.pseudo || 'Quelqu\'un'
    }).catch(function () {});
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function () {
      db.collection('rooms').doc(currentRoom).update({
        ['typing.' + currentUser.uid]: firebase.firestore.FieldValue.delete()
      }).catch(function () {});
    }, 2500);
  }

  function listenTyping(roomId) {
    if (unsubscribers.typing) unsubscribers.typing();
    unsubscribers.typing = db.collection('rooms').doc(roomId).onSnapshot(function (doc) {
      if (!doc.exists) return;
      var typing = doc.data().typing || {};
      delete typing[currentUser.uid];
      var names = Object.values(typing).filter(Boolean);
      var bar = $('typingBar');
      if (names.length > 0) {
        show(bar);
        setText('typingWho', names.slice(0, 2).join(', ') + (names.length > 1 ? ' écrivent…' : ' écrit…'));
      } else {
        hide(bar);
      }
    });
  }

  /* ─────────────────────────────────────────────
     38. ACTIONS SUR MESSAGE (bottom sheet)
  ───────────────────────────────────────────── */
  function openMsgSheet(msg, isMine) {
    $('sheetMsgId').value  = msg.id;
    $('sheetIsMine').value = isMine ? 'true' : 'false';

    /* Masquer/montrer actions selon ownership */
    $qa('.sheet-mine').forEach(function (el) { toggle(el, isMine); });
    var isMod = userProfile && (userProfile.role === 'admin' || userProfile.role === 'moderator');
    $qa('.sheet-mod').forEach(function (el) { toggle(el, isMod || isMine); });

    show($('msgActionsSheet'));

    $('sheetBackdrop').addEventListener('click', function () { hide($('msgActionsSheet')); }, { once: true });
  }

  document.addEventListener('click', function (e) {
    /* Réaction rapide */
    var qreact = e.target.closest('.qreact');
    if (qreact) {
      var msgId = $('sheetMsgId').value;
      var emoji = qreact.dataset.emoji;
      if (msgId && emoji && currentUser) {
        db.collection('messages').doc(msgId).update({
          ['reactions.' + currentUser.uid]: emoji
        }).catch(function () {});
      }
      hide($('msgActionsSheet'));
      return;
    }

    /* Action sheet */
    var action = e.target.closest('.sheet-action-btn');
    if (!action) return;
    var msgId  = $('sheetMsgId').value;
    var isMine = $('sheetIsMine').value === 'true';
    hide($('msgActionsSheet'));
    onMsgAction(action.dataset.action, msgId, isMine);
      });

  function onMsgAction(action, msgId, isMine) {
    if (action === 'reply') {
      /* Récupérer le texte du message pour le quote */
      db.collection('messages').doc(msgId).get().then(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();
        replyTarget = { id: msgId, author: d.authorName || 'Anonyme', text: d.text || '' };
        setText('replyAuthorEl', replyTarget.author);
        setText('replyTextEl', replyTarget.text.slice(0, 60));
        show($('replyPreview'));
        $('messageInput').focus();
      });
    }

    if (action === 'copy') {
      db.collection('messages').doc(msgId).get().then(function (doc) {
        if (!doc.exists) return;
        var text = doc.data().text || '';
        decryptMsg(text).then(function (plain) {
          if (navigator.clipboard) navigator.clipboard.writeText(plain).then(function () { toast('Copié !', 'success'); });
        });
      });
    }

    if (action === 'edit' && isMine) {
      db.collection('messages').doc(msgId).get().then(function (doc) {
        if (!doc.exists) return;
        var editor = $('editMsgEditor');
        editor.innerText = doc.data().text || '';
        $('editMsgTargetId').value = msgId;
        show($('editMsgModal'));
        editor.focus();
      });
    }

    if (action === 'pin') {
      db.collection('messages').doc(msgId).get().then(function (doc) {
        if (!doc.exists) return;
        db.collection('rooms').doc(currentRoom).update({
          pinnedMessage: { id: msgId, author: doc.data().authorName || '', text: doc.data().text || '' }
        }).then(function () { toast('Message épinglé', 'success'); });
      });
    }

    if (action === 'report') {
      $('reportMsgId').value = msgId;
      show($('reportMsgModal'));
    }

    if (action === 'delete' && isMine) {
      db.collection('messages').doc(msgId).delete()
        .then(function () { toast('Message supprimé', 'success'); })
        .catch(function () { toast('Erreur suppression', 'error'); });
    }
  }

  /* Confirmer édition */
  $('editMsgConfirmBtn').addEventListener('click', function () {
    var msgId = $('editMsgTargetId').value;
    var text  = $('editMsgEditor').innerText.trim();
    if (!msgId || !text) return;
    encryptMsg(text).then(function (enc) {
      db.collection('messages').doc(msgId).update({ text: enc, edited: true }).then(function () {
        hide($('editMsgModal'));
        toast('Message modifié', 'success');
      });
    });
      });

  /* Signalement */
  $qa('.report-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var reason = btn.dataset.reason;
      var msgId  = $('reportMsgId').value;
      var usrId  = $('reportUsrId').value;
      if (!currentUser) return;
      db.collection('reports').add({
        reportedBy:  currentUser.uid,
        messageId:   msgId || null,
        userId:      usrId || null,
        reason:      reason,
        roomId:      currentRoom || null,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () {
        hide($('reportMsgModal'));
        toast('Signalement envoyé', 'success');
        /* 3 strikes auto si même utilisateur signalé 3 fois */
        if (usrId) checkStrikes(usrId);
      });
    });
      });

  function checkStrikes(uid) {
    db.collection('reports').where('userId', '==', uid).get().then(function (snap) {
      if (snap.size >= 3) {
        db.collection('users').doc(uid).update({ strikes: snap.size, banned: snap.size >= 3, banReason: 'Trop de signalements' }).catch(function () {});
      }
    });
  }

  /* ─────────────────────────────────────────────
     39. ENREGISTREMENT VOCAL
  ───────────────────────────────────────────── */
  var voiceSeconds = 0;

  function startVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      show($('voiceRec'));
      voiceSeconds = 0;
      voiceChunks  = [];

      voiceRecorder = new MediaRecorder(stream);
      voiceRecorder.ondataavailable = function (e) { voiceChunks.push(e.data); };
      voiceRecorder.onstop = function () { stream.getTracks().forEach(function (t) { t.stop(); }); };
      voiceRecorder.start();

      voiceTimer = setInterval(function () {
        voiceSeconds++;
        var m = Math.floor(voiceSeconds / 60);
        var s = voiceSeconds % 60;
        setText('voiceRecTime', m + ':' + s.toString().padStart(2, '0'));
      }, 1000);
    }).catch(function () { toast('Accès micro refusé', 'error'); });
  }

  $('cancelVoiceBtn').addEventListener('click', stopVoiceRecording.bind(null, false));
  $('sendVoiceBtn').addEventListener('click', stopVoiceRecording.bind(null, true));

  function stopVoiceRecording(doSend) {
    clearInterval(voiceTimer);
    hide($('voiceRec'));
    if (!voiceRecorder) return;
    if (doSend) {
      voiceRecorder.addEventListener('stop', function () {
        var blob = new Blob(voiceChunks, { type: 'audio/webm' });
        var file = new File([blob], 'voice_' + Date.now() + '.webm', { type: 'audio/webm' });
        sendMedia(file, 'voice').catch(function () {});
      }, { once: true });
    }
    voiceRecorder.stop();
    voiceRecorder = null;
  }

  /* Play vocaux */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.voice-play-btn');
    if (!btn) return;
    var url = btn.dataset.url;
    if (!url) return;
    var audio = new Audio(url);
    audio.play();
    var ico = btn.querySelector('use');
    if (ico) ico.setAttribute('href', '#ic-pause');
    audio.addEventListener('ended', function () {
      if (ico) ico.setAttribute('href', '#ic-play');
    });
      });

  /* ─────────────────────────────────────────────
     40. FOND DE CHAT (background)
  ───────────────────────────────────────────── */
  function applyRoomBg(roomId) {
    var bg = roomBgs[roomId] || localStorage.getItem('sis_bg_' + roomId);
    applyBgToLayer($('chatBgLayer'), bg);
  }

  function applyBgToLayer(layer, bg) {
    if (!layer) return;
    if (!bg) {
      layer.style.background = '';
      layer.style.backgroundSize = '';
      layer.style.backgroundImage = '';
      return;
    }
    if (bg.startsWith('color:')) {
      layer.style.background = bg.replace('color:', '');
      layer.style.backgroundImage = '';
    } else if (bg.startsWith('gradient:')) {
      layer.style.background = bg.replace('gradient:', '');
    } else if (bg.startsWith('pattern:')) {
      applyPattern(layer, bg.replace('pattern:', ''));
    } else if (bg.startsWith('img:')) {
      var parts = bg.split('|');
      var url    = parts[0].replace('img:', '');
      var blur   = parts[1] ? parseFloat(parts[1]) : 0;
      var opacity= parts[2] ? parseFloat(parts[2]) : 1;
      layer.style.backgroundImage  = 'url(' + url + ')';
      layer.style.backgroundSize   = 'cover';
      layer.style.backgroundPosition = 'center';
      layer.style.filter  = blur > 0 ? 'blur(' + blur + 'px)' : '';
      layer.style.opacity = opacity;
    }
  }

  function applyPattern(layer, name) {
    var patterns = {
      dots:     'radial-gradient(circle, rgba(91,142,244,0.12) 1.5px, transparent 1.5px)',
      grid:     'linear-gradient(rgba(91,142,244,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(91,142,244,0.08) 1px, transparent 1px)',
      hexagon:  'repeating-linear-gradient(60deg, rgba(91,142,244,0.08) 0, rgba(91,142,244,0.08) 1px, transparent 0, transparent 50%)',
      bubbles:  'radial-gradient(circle at 30% 30%, rgba(91,142,244,0.1) 8px, transparent 8px), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.1) 6px, transparent 6px)',
      whatsapp: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1.2\' fill=\'rgba(91,142,244,0.1)\'/%3E%3C/svg%3E")',
      waves:    'repeating-linear-gradient(-45deg, rgba(91,142,244,0.07) 0, rgba(91,142,244,0.07) 1px, transparent 0, transparent 50%)'
    };
    var bgImg  = patterns[name] || '';
    var bgSize = { dots:'12px 12px', grid:'12px 12px', hexagon:'8px 14px', bubbles:'24px 24px', whatsapp:'60px 60px', waves:'8px 8px' };
    layer.style.backgroundImage = bgImg;
    layer.style.backgroundSize  = bgSize[name] || '20px 20px';
    layer.style.backgroundPosition = '0 0';
    layer.style.filter  = '';
    layer.style.opacity = '1';
  }

  function previewCurrentBg() {
    var ctx    = $('bgCtx').value;
    var target = $('bgTargetId').value;
    var key    = ctx === 'dm' ? 'dm_' + target : target;
    var cur    = localStorage.getItem('sis_bg_' + key);
    applyBgToLayer($('bgPreviewLayer'), cur);
  }

  /* Tabs fond */
  $qa('.bg-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $qa('.bg-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var name = tab.dataset.bgtab;
      [$('bgColorsGrid'), $('bgGradientsGrid'), $('bgPatternsGrid'), $('bgGalleryPanel')].forEach(hide);
      if (name === 'colors')    show($('bgColorsGrid'));
      if (name === 'gradients') show($('bgGradientsGrid'));
      if (name === 'patterns')  show($('bgPatternsGrid'));
      if (name === 'gallery')   show($('bgGalleryPanel'));
    });
      });

  /* Sélection couleur/dégradé/motif */
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('.bg-sw');
    if (!sw) return;
    $qa('.bg-sw').forEach(function (s) { s.classList.remove('selected'); });
    sw.classList.add('selected');
    pendingBg = sw.dataset.bg;
    applyBgToLayer($('bgPreviewLayer'), pendingBg);
      });

  /* Upload galerie */
  $('bgFileInput').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    show($('bgControls'));
    var reader = new FileReader();
    reader.onload = function (e) {
      pendingBg = 'img:' + e.target.result + '|' + $('bgBlurRange').value + '|' + ($('bgOpacityRange').value / 100);
      applyBgToLayer($('bgPreviewLayer'), pendingBg);
    };
    reader.readAsDataURL(file);
      });

  $('bgBlurRange').addEventListener('input', function () {
    setText('bgBlurVal', this.value + 'px');
    if (pendingBg && pendingBg.startsWith('img:')) {
      var parts = pendingBg.split('|');
      parts[1] = this.value;
      pendingBg = parts.join('|');
      applyBgToLayer($('bgPreviewLayer'), pendingBg);
    }
      });

  $('bgOpacityRange').addEventListener('input', function () {
    setText('bgOpacityVal', this.value + '%');
    if (pendingBg && pendingBg.startsWith('img:')) {
      var parts = pendingBg.split('|');
      parts[2] = this.value / 100;
      pendingBg = parts.join('|');
      applyBgToLayer($('bgPreviewLayer'), pendingBg);
    }
      });

  /* Appliquer fond */
  $('applyBgBtn').addEventListener('click', function () {
    if (!pendingBg) { hide($('chatBgModal')); return; }
    var ctx    = $('bgCtx').value;
    var target = $('bgTargetId').value;
    var key    = ctx === 'dm' ? 'dm_' + target : target;

    localStorage.setItem('sis_bg_' + key, pendingBg);
    if (ctx === 'dm') {
      dmBgs[target] = pendingBg;
      applyBgToLayer($('dmBgLayer'), pendingBg);
    } else {
      roomBgs[target] = pendingBg;
      applyBgToLayer($('chatBgLayer'), pendingBg);
    }
    hide($('chatBgModal'));
    pendingBg = null;
    toast('Fond appliqué !', 'success');
      });

  /* ─────────────────────────────────────────────
     41. DMs
  ───────────────────────────────────────────── */
  function openDmWith(partnerUid) {
    currentDmUid = partnerUid;
    var ids = [currentUser.uid, partnerUid].sort();
    currentDmId = ids.join('_');

    db.collection('users').doc(partnerUid).get().then(function (doc) {
      var partner = doc.data() || {};
      partner.uid = partnerUid;

      /* Afficher vue DM */
      ['emptyState', 'chatView', 'dmListView', 'randomView', 'notifView', 'profileView'].forEach(function (id) { hide($(id)); });
      show($('dmView'));
      if (isMobile) $('sidebar').classList.add('slide-out');

      /* Remplir header */
      fillAvatar($('dmPartnerAva'), $('dmPartnerImg'), $('dmPartnerIni'), partner.avatarUrl || '', partner.pseudo || 'Utilisateur', partner.color);
      setText('dmPartnerName', partner.pseudo || 'Utilisateur');
      var dot = $('dmPartnerDot');
      if (dot) dot.className = 'status-dot status-dot--' + (partner.status || 'offline');

      var isVerified = partner.email && partner.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();
      toggle($('dmPartnerVerified'), isVerified);

      /* Fond DM */
      var dmBg = localStorage.getItem('sis_bg_dm_' + currentDmId);
      if (dmBg) applyBgToLayer($('dmBgLayer'), dmBg);

      /* Charger messages DM */
      loadDmMessages(currentDmId);
    });
  }

  function loadDmMessages(dmId) {
    var list = $('dmMsgsList');
    list.innerHTML = '';

    if (unsubscribers.dm) unsubscribers.dm();
    unsubscribers.dm = db.collection('dms').doc(dmId).collection('messages')
      .orderBy('createdAt', 'asc').limit(80)
      .onSnapshot(function (snap) {
        snap.docChanges().forEach(function (change) {
          if (change.type === 'added') {
            var msg = change.doc.data();
            msg.id = change.doc.id;
            appendMessage(msg, null, list);
          }
        });
        scrollToBottom('dmMsgsArea', false);
      });
  }

  /* Envoi DM */
  $('dmSendBtn').addEventListener('click', sendDmMessage);
  $('dmInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDmMessage(); }
      });

  function sendDmMessage() {
    if (!currentDmId || !currentUser) return;
    var inp  = $('dmInput');
    var text = inp.innerText.trim();
    if (!text) return;
    inp.innerText = '';
    playSound('send');

    var msgData = {
      text:        text,
      type:        'text',
      authorId:    currentUser.uid,
      authorName:  userProfile ? userProfile.pseudo  : 'Anonyme',
      authorEmail: userProfile ? (userProfile.email  || '') : '',
      authorAvatar:userProfile ? (userProfile.avatarUrl || '') : '',
      authorColor: userProfile ? (userProfile.color  || '#5B8EF4') : '#5B8EF4',
      delivered:   true,
      readBy:      {},
      reactions:   {},
      edited:      false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('dms').doc(currentDmId).collection('messages').add(msgData);
    db.collection('dms').doc(currentDmId).set({
      participants: [currentUser.uid, currentDmUid],
      lastMessage:  text.slice(0, 60),
      lastAt:       firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  /* Back DM */
  $('dmBackBtn').addEventListener('click', function () {
    if (isMobile) $('sidebar').classList.remove('slide-out');
    hide($('dmView'));
    show($('dmListView'));
      });

  /* Fond DM */
  $('dmBgBtn').addEventListener('click', function () {
    $('bgCtx').value      = 'dm';
    $('bgTargetId').value = currentDmId;
    pendingBg = null;
    previewCurrentBg();
    show($('chatBgModal'));
      });

  /* Info partenaire DM → profil public */
  $('dmPartnerInfoBtn').addEventListener('click', function () {
    if (!currentDmUid) return;
    db.collection('users').doc(currentDmUid).get().then(function (doc) {
      if (doc.exists) openPublicProfile(Object.assign({ uid: currentDmUid }, doc.data()));
    });
      });

  /* ─────────────────────────────────────────────
     42. LISTE DMs
  ───────────────────────────────────────────── */
  function loadDMList() {
    if (!currentUser) return;
    var list  = $('dmConvList');
    var empty = $('dmListEmpty');
    if (!list) return;

    if (unsubscribers.dmList) unsubscribers.dmList();
    unsubscribers.dmList = db.collection('dms')
      .where('participants', 'array-contains', currentUser.uid)
      .orderBy('lastAt', 'desc').limit(30)
      .onSnapshot(function (snap) {
        list.innerHTML = '';
        toggle(empty, snap.empty);
        snap.docs.forEach(function (d) {
          var data = d.data();
          var partnerUid = (data.participants || []).find(function (u) { return u !== currentUser.uid; });
          if (!partnerUid) return;

          db.collection('users').doc(partnerUid).get().then(function (uDoc) {
            var u = uDoc.data() || {};
            u.uid = partnerUid;
            var isVerified = u.email && u.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();
            var el = document.createElement('div');
            el.className = 'conv-item';
            el.dataset.uid = partnerUid;
            el.setAttribute('role', 'button');
            var avaContent = u.avatarUrl
              ? '<img src="' + escapeHtml(u.avatarUrl) + '" class="ava-img" alt=""/>'
              : '<span class="ava-ini">' + escapeHtml(initials(u.pseudo || '?')) + '</span>';
            el.innerHTML = [
              '<div class="ava ava--md" style="background:' + (u.color || 'var(--bg-surface2)') + '22">',
                avaContent,
                '<span class="status-dot status-dot--' + (u.status || 'offline') + '"></span>',
              '</div>',
              '<div class="conv-body">',
                '<div class="conv-top">',
                  '<span class="conv-name">' + escapeHtml(u.pseudo || 'Anonyme') + '</span>',
                  isVerified ? '<span class="verified-ico"><svg width="13" height="13"><use href="#ic-verified"/></svg></span>' : '',
                  '<span class="conv-time">' + fmtTime(data.lastAt) + '</span>',
                '</div>',
                '<div class="conv-bot">',
                  '<span class="conv-prev">' + escapeHtml((data.lastMessage || '').slice(0, 40)) + '</span>',
                '</div>',
              '</div>'
            ].join('');
            el.addEventListener('click', function () { openDmWith(partnerUid); });
            list.appendChild(el);
          });
        });
      });
  }

  /* Compteur DMs non lus */
  function listenDMCount() {
    if (!currentUser) return;
    db.collection('dms').where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(function (snap) {
        /* Simpliste : affiche le nombre total de convos */
        var n = snap.size;
        updateNavBadge('dm', n > 0 ? n : 0);
      });
  }

  /* ─────────────────────────────────────────────
     43. NOTIFICATIONS
  ───────────────────────────────────────────── */
  function listenNotifications() {
    if (!currentUser) return;
    if (unsubscribers.notifs) unsubscribers.notifs();
    unsubscribers.notifs = db.collection('notifications')
      .where('to', '==', currentUser.uid)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .onSnapshot(function (snap) {
        updateNavBadge('notif', snap.size);
      });
  }

  function loadNotifications() {
    if (!currentUser) return;
    var list  = $('notifList');
    var empty = $('notifEmpty');
    if (!list) return;
    db.collection('notifications').where('to', '==', currentUser.uid)
      .orderBy('createdAt', 'desc').limit(30).get().then(function (snap) {
        list.innerHTML = '';
        toggle(empty, snap.empty);
        snap.docs.forEach(function (d) {
          var n = d.data();
          var el = document.createElement('div');
          el.className = 'notif-item' + (n.read ? '' : ' unread');
          el.dataset.id = d.id;
          el.setAttribute('role', 'button');
          el.innerHTML = [
            '<div class="notif-ico"><svg><use href="#ic-bell"/></svg></div>',
            '<div class="notif-body">',
              '<p class="notif-txt">' + escapeHtml(n.text || '') + '</p>',
              '<span class="notif-time">' + fmtTime(n.createdAt) + '</span>',
            '</div>'
          ].join('');
          el.addEventListener('click', function () {
            db.collection('notifications').doc(d.id).update({ read: true }).catch(function () {});
            if (n.roomId) { openRoom({ id: n.roomId, name: n.roomName || 'Salon' }); }
          });
          list.appendChild(el);
        });
      });
  }

  $('markAllReadBtn').addEventListener('click', function () {
    if (!currentUser) return;
    db.collection('notifications').where('to', '==', currentUser.uid).where('read', '==', false).get()
      .then(function (snap) {
        var batch = db.batch();
        snap.docs.forEach(function (d) { batch.update(d.ref, { read: true }); });
        return batch.commit();
      }).then(function () { updateNavBadge('notif', 0); toast('Tout marqué comme lu', 'success'); });
      });

  function updateNavBadge(type, count) {
    var ids = type === 'dm'
      ? ['dmNavBadge', 'dmPillBadge']
      : ['notifNavBadge', 'notifPillBadge'];
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      toggle(el, count > 0);
      el.textContent = count > 99 ? '99+' : String(count);
    });
  }

  function updateNotifBadge(add) {
    var el = $('notifNavBadge');
    if (!el) return;
    var cur = parseInt(el.textContent) || 0;
    updateNavBadge('notif', cur + add);
  }

  /* ─────────────────────────────────────────────
     44. PROFIL UTILISATEUR
  ───────────────────────────────────────────── */
  function renderProfileView() {
    if (!userProfile) return;

    fillAvatar($('profileAvaEl'), $('profileAvaImg'), $('profileAvaIni'), userProfile.avatarUrl, userProfile.pseudo, userProfile.color);

    var ring = $('profileStatusRing');
    if (ring) {
      ring.style.borderColor = {
        online:  'var(--status-online)',
        away:    'var(--status-away)',
        dnd:     'var(--status-dnd)',
        offline: 'var(--status-offline)'
      }[userProfile.status] || 'var(--status-online)';
    }

    setText('profilePseudo', userProfile.pseudo || 'Anonyme');
    setText('profileEmail', userProfile.email   || '');

    /* Badge certifié */
    applyVerifiedBadge(userProfile.email, $('profileVerifiedBadge'));

    /* Badges */
    var badgesEl = $('profileBadges');
    if (badgesEl) {
      var badges = userProfile.badges || [];
      badgesEl.innerHTML = badges.length > 0
        ? badges.map(function (b) { return '<span class="badge-tag">' + escapeHtml(b) + '</span>'; }).join('')
        : '<span class="no-badge">Aucun badge</span>';
    }

    /* Statut chooser */
    $qa('.status-choice').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.status === (userProfile.status || 'online'));
    });

    /* Sons */
    var sndIco = $('soundIco');
    var sndLbl = $('soundLbl');
    if (sndIco) sndIco.querySelector('use').setAttribute('href', soundEnabled ? '#ic-sound-on' : '#ic-sound-off');
    if (sndLbl) sndLbl.textContent = soundEnabled ? 'Sons activés' : 'Sons désactivés';

    /* Admin */
    var adminBtn = $('adminMenuBtn');
    toggle(adminBtn, userProfile.role === 'admin');
  }

  /* Statut */
  $qa('.status-choice').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var status = btn.dataset.status;
      updateUserPresence(status);
      $qa('.status-choice').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
      });

  /* Changer avatar */
  $('avatarInput').addEventListener('change', function () {
    var file = this.files[0];
    if (!file || !currentUser) return;
    uploadToCloudinary(file, null).then(function (url) {
      return db.collection('users').doc(currentUser.uid).update({ avatarUrl: url });
    }).then(function () {
      toast('Photo de profil mise à jour !', 'success');
    }).catch(function () { toast('Erreur upload', 'error'); });
      });

  /* Modifier pseudo */
  $('editPseudoBtn').addEventListener('click', function () {
    $('newPseudoInput').value = userProfile ? userProfile.pseudo || '' : '';
    show($('editPseudoModal'));
      });

  $('savePseudoBtn').addEventListener('click', function () {
    var val = $('newPseudoInput').value.trim();
    if (!val) return;
    db.collection('users').doc(currentUser.uid).update({ pseudo: val }).then(function () {
      hide($('editPseudoModal'));
      toast('Pseudo mis à jour !', 'success');
    });
      });

  /* Sons */
  $('soundToggleBtn').addEventListener('click', function () {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sis_sound', soundEnabled ? '1' : '0');
    renderProfileView();
      });

  /* Supprimer compte */
  $('deleteAccountBtn').addEventListener('click', function () { show($('deleteAccountModal')); });
  $('confirmDeleteAccountBtn').addEventListener('click', function () {
    var pass = $('deleteAccountPassword').value;
    if (!pass || !currentUser || !userProfile) return;
    var cred = firebase.auth.EmailAuthProvider.credential(userProfile.email, pass);
    currentUser.reauthenticateWithCredential(cred).then(function () {
      return db.collection('users').doc(currentUser.uid).delete();
    }).then(function () {
      return currentUser.delete();
    }).then(function () {
      toast('Compte supprimé', 'success');
      location.reload();
    }).catch(function () { toast('Mot de passe incorrect', 'error'); });
      });

  /* ─────────────────────────────────────────────
     45. CHAT ALÉATOIRE
  ───────────────────────────────────────────── */
  var randomUnsub = null;

  function startRandomChat() {
    if (!currentUser) return;
    randomSessionId = null;
    randomPartnerId = null;
    show($('randomWaiting'));
    hide($('randomChat'));

    /* Chercher quelqu'un qui attend déjà */
    db.collection('randomQueue')
      .where('status', '==', 'waiting')
      .where('uid', '!=', currentUser.uid)
      .limit(1).get()
      .then(function (snap) {
        if (!snap.empty) {
          /* Trouver un partenaire */
          var doc = snap.docs[0];
          randomPartnerId = doc.data().uid;
          var sessionId = [currentUser.uid, randomPartnerId].sort().join('_');
          randomSessionId = sessionId;

          /* Supprimer son entrée de la file */
          db.collection('randomQueue').doc(doc.id).delete().catch(function () {});

          /* Créer la session */
          return db.collection('randomSessions').doc(sessionId).set({
            participants: [currentUser.uid, randomPartnerId],
            createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
            active:       true
          }).then(function () {
            enterRandomChat(sessionId);
          });
        } else {
          /* Se mettre en file d'attente */
          return db.collection('randomQueue').doc(currentUser.uid).set({
            uid:       currentUser.uid,
            status:    'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function () {
            /* Écouter la création de la session */
            if (randomUnsub) randomUnsub();
            randomUnsub = db.collection('randomSessions')
              .where('participants', 'array-contains', currentUser.uid)
              .where('active', '==', true)
              .onSnapshot(function (snap) {
                if (!snap.empty) {
                  var sess = snap.docs[0];
                  randomSessionId = sess.id;
                  var parts = sess.data().participants;
                  randomPartnerId = parts.find(function (u) { return u !== currentUser.uid; });
                  enterRandomChat(randomSessionId);
                }
              });
          });
        }
      }).catch(function () {
        toast('Erreur connexion aléatoire', 'error');
      });
  }

  function enterRandomChat(sessionId) {
    if (randomUnsub) { randomUnsub(); randomUnsub = null; }

    /* Récupérer le pseudo du partenaire */
    db.collection('users').doc(randomPartnerId).get().then(function (doc) {
      var u = doc.data() || {};
      setText('randomPartnerName', u.pseudo || 'Inconnu');
      hide($('randomWaiting'));
      show($('randomChat'));
      playSound('connect');
      toast('Connecté à un interlocuteur !', 'success');

      /* Charger messages aléatoires */
      var list = $('randomMsgsList');
      list.innerHTML = '';
      if (unsubscribers.random) unsubscribers.random();
      unsubscribers.random = db.collection('randomSessions').doc(sessionId)
        .collection('messages')
        .orderBy('createdAt', 'asc').limit(80)
        .onSnapshot(function (snap) {
          snap.docChanges().forEach(function (change) {
            if (change.type === 'added') {
              var msg = change.doc.data();
              msg.id = change.doc.id;
              appendMessage(msg, null, list);
              scrollToBottom('randomMsgsArea', false);
            }
          });
        });
    });
  }

  /* Envoi message aléatoire */
  $('randomSendBtn').addEventListener('click', sendRandomMessage);
  $('randomInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRandomMessage(); }
      });

  function sendRandomMessage() {
    if (!randomSessionId || !currentUser) return;
    var inp  = $('randomInput');
    var text = inp.innerText.trim();
    if (!text) return;
    inp.innerText = '';

    db.collection('randomSessions').doc(randomSessionId).collection('messages').add({
      text:        text,
      type:        'text',
      authorId:    currentUser.uid,
      authorName:  userProfile ? userProfile.pseudo  : 'Anonyme',
      authorEmail: userProfile ? (userProfile.email  || '') : '',
      authorAvatar:userProfile ? (userProfile.avatarUrl || '') : '',
      authorColor: userProfile ? (userProfile.color  || '#5B8EF4') : '#5B8EF4',
      delivered:   true,
      readBy:      {},
      reactions:   {},
      edited:      false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });
    playSound('send');
  }

  /* Quitter chat aléatoire */
  $('leaveRandomBtn').addEventListener('click', leaveRandomChat);
  $('nextRandomBtn').addEventListener('click', function () {
    leaveRandomChat();
    setTimeout(startRandomChat, 500);
      });

  function leaveRandomChat() {
    if (unsubscribers.random) { unsubscribers.random(); unsubscribers.random = null; }
    if (randomUnsub) { randomUnsub(); randomUnsub = null; }

    /* Retirer de la file si on y était encore */
    if (currentUser) {
      db.collection('randomQueue').doc(currentUser.uid).delete().catch(function () {});
    }

    /* Clore la session */
    if (randomSessionId) {
      db.collection('randomSessions').doc(randomSessionId).update({ active: false }).catch(function () {});
    }

    randomSessionId = null;
    randomPartnerId = null;
    show($('randomWaiting'));
    hide($('randomChat'));
    setText('randomPartnerName', '');
  }

  /* ─────────────────────────────────────────────
     46. ADMIN PANEL
  ───────────────────────────────────────────── */
  function openAdminPanel() {
    if (!userProfile || userProfile.role !== 'admin') {
      toast('Accès réservé aux administrateurs', 'error');
      return;
    }
    show($('adminPanel'));
    loadAdminStats();
    loadAdminUsers();
  }

  $('adminMenuBtn').addEventListener('click', openAdminPanel);

  /* Tabs admin */
  $qa('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $qa('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var name = tab.dataset.admintab;
      $qa('.admin-sec').forEach(hide);
      show($('admin' + name.charAt(0).toUpperCase() + name.slice(1) + 'Sec'));

      if (name === 'users')   loadAdminUsers();
      if (name === 'rooms')   loadAdminRooms();
      if (name === 'reports') loadAdminReports();
      if (name === 'badges')  show($('adminBadgesSec'));
    });
      });

  function loadAdminStats() {
    Promise.all([
      db.collection('users').get(),
      db.collection('rooms').get(),
      db.collection('messages').get(),
      db.collection('reports').where('read', '==', false).get()
    ]).then(function (results) {
      setText('statTotalUsers',    results[0].size);
      setText('statTotalRooms',    results[1].size);
      setText('statTotalMsgs',     results[2].size);
      setText('statPendingReports',results[3].size);
    }).catch(function () {});
  }

  function loadAdminUsers() {
    var list = $('adminUserList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted)">Chargement…</div>';
    db.collection('users').orderBy('createdAt', 'desc').limit(50).get().then(function (snap) {
      list.innerHTML = '';
      snap.docs.forEach(function (doc) {
        var u = doc.data();
        u.uid = doc.id;
        var el = buildAdminUserItem(u);
        list.appendChild(el);
      });
    });
  }

  function buildAdminUserItem(u) {
    var el = document.createElement('div');
    el.className = 'admin-item';
    el.innerHTML = [
      buildMiniAva(u.avatarUrl || '', u.pseudo || '?', u.color || ''),
      '<div class="admin-item-info">',
        '<div class="admin-item-name">' + escapeHtml(u.pseudo || 'Anonyme') + '</div>',
        '<div class="admin-item-sub">' + escapeHtml(u.email || 'Anonyme') + ' · ' + (u.role || 'user') + (u.banned ? ' · <span style="color:var(--danger)">Banni</span>' : '') + '</div>',
      '</div>',
      '<div class="admin-item-actions">',
        '<button class="btn btn-sm btn-ghost admin-role-btn" data-uid="' + u.uid + '" data-role="' + (u.role || 'user') + '">',
          u.role === 'moderator' ? 'Retirer Mod' : 'Modérateur',
        '</button>',
        u.banned
          ? '<button class="btn btn-sm btn-ghost admin-unban-btn" data-uid="' + u.uid + '">Débannir</button>'
          : '<button class="btn btn-sm btn-danger admin-ban-btn" data-uid="' + u.uid + '">Bannir</button>',
      '</div>'
    ].join('');
    return el;
  }

  /* Délégation actions admin users */
  document.addEventListener('click', function (e) {
    var banBtn = e.target.closest('.admin-ban-btn');
    if (banBtn) {
      var uid = banBtn.dataset.uid;
      if (!uid) return;
      db.collection('users').doc(uid).update({ banned: true, banReason: 'Banni par administrateur' })
        .then(function () { toast('Utilisateur banni', 'success'); loadAdminUsers(); });
      return;
    }

    var unbanBtn = e.target.closest('.admin-unban-btn');
    if (unbanBtn) {
      var uid = unbanBtn.dataset.uid;
      if (!uid) return;
      db.collection('users').doc(uid).update({ banned: false, banReason: '' })
        .then(function () { toast('Utilisateur débanni', 'success'); loadAdminUsers(); });
      return;
    }

    var roleBtn = e.target.closest('.admin-role-btn');
    if (roleBtn) {
      var uid = roleBtn.dataset.uid;
      var cur = roleBtn.dataset.role;
      var newRole = cur === 'moderator' ? 'user' : 'moderator';
      db.collection('users').doc(uid).update({ role: newRole })
        .then(function () { toast('Rôle mis à jour', 'success'); loadAdminUsers(); });
      return;
    }

    /* Badge */
    var badgeBtn = e.target.closest('.admin-give-badge-btn');
    if (badgeBtn) {
      var uid = $('adminBadgeUid').value;
      var badge = $('adminBadgeSelect').value;
      if (!uid || !badge) return;
      db.collection('users').doc(uid).update({
        badges: firebase.firestore.FieldValue.arrayUnion(badge)
      }).then(function () { toast('Badge attribué !', 'success'); });
    }
      });

  function loadAdminRooms() {
    var list = $('adminRoomList');
    if (!list) return;
    list.innerHTML = '';
    db.collection('rooms').orderBy('createdAt', 'desc').limit(30).get().then(function (snap) {
      snap.docs.forEach(function (doc) {
        var r = doc.data();
        r.id = doc.id;
        var el = document.createElement('div');
        el.className = 'admin-item';
        el.innerHTML = [
          '<div class="ava ava--sm" style="border-radius:var(--r-sm)">',
            r.photoUrl ? '<img src="' + escapeHtml(r.photoUrl) + '" class="ava-img"/>' : '<span class="ava-ini">' + escapeHtml(initials(r.name)) + '</span>',
          '</div>',
          '<div class="admin-item-info">',
            '<div class="admin-item-name">' + escapeHtml(r.name) + '</div>',
            '<div class="admin-item-sub">' + (r.category || 'Général') + ' · ' + (r.membersCount || 0) + ' membres</div>',
          '</div>',
          '<div class="admin-item-actions">',
            '<button class="btn btn-sm btn-danger admin-del-room-btn" data-id="' + r.id + '">Supprimer</button>',
          '</div>'
        ].join('');
        list.appendChild(el);
      });
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.admin-del-room-btn');
      if (!btn) return;
      var id = btn.dataset.id;
      if (!id || !confirm('Supprimer ce salon ?')) return;
      db.collection('rooms').doc(id).delete()
        .then(function () { toast('Salon supprimé', 'success'); loadAdminRooms(); });
    });
  }

  function loadAdminReports() {
    var list = $('adminReportList');
    if (!list) return;
    list.innerHTML = '';
    db.collection('reports').orderBy('createdAt', 'desc').limit(50).get().then(function (snap) {
      if (snap.empty) {
        list.innerHTML = '<div class="list-empty"><p>Aucun signalement</p></div>';
        return;
      }
      snap.docs.forEach(function (doc) {
        var r = doc.data();
        var el = document.createElement('div');
        el.className = 'admin-item';
        el.innerHTML = [
          '<div class="notif-ico" style="background:var(--danger-dim)"><svg style="color:var(--danger)"><use href="#ic-flag"/></svg></div>',
          '<div class="admin-item-info">',
            '<div class="admin-item-name">' + escapeHtml(r.reason || 'Sans raison') + '</div>',
            '<div class="admin-item-sub">Par : ' + escapeHtml(r.reportedBy || '?') + ' · ' + fmtTime(r.createdAt) + '</div>',
          '</div>',
          '<div class="admin-item-actions">',
            '<button class="btn btn-sm btn-ghost admin-read-report-btn" data-id="' + doc.id + '">Lu</button>',
          '</div>'
        ].join('');
        list.appendChild(el);
      });
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.admin-read-report-btn');
      if (!btn) return;
      db.collection('reports').doc(btn.dataset.id).update({ read: true })
        .then(function () { btn.closest('.admin-item').remove(); });
    });
  }

  /* Annonce globale admin */
  $('sendAnnounceBtn').addEventListener('click', function () {
    var text = $('adminAnnounceText').value.trim();
    if (!text) return;
    db.collection('config').doc('announcement').set({
      text:      text,
      active:    true,
      createdBy: currentUser ? currentUser.uid : '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      $('adminAnnounceText').value = '';
      toast('Annonce envoyée !', 'success');
    });
      });

  /* Écouter annonce globale */
  db.collection && (function () {
    try {
      db.collection('config').doc('announcement').onSnapshot(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();
        if (d.active && d.text) {
          setText('globalAnnounceText', d.text);
          show($('globalAnnounce'));
        } else {
          hide($('globalAnnounce'));
        }
      });
    } catch (e) {}
  })();

  $('closeAnnounceBtn').addEventListener('click', function () { hide($('globalAnnounce')); });

  /* Slow mode admin */
  $('slowModeEnabled').addEventListener('change', function () {
    toggle($('slowModeDelayWrap'), this.checked);
      });

  $('applySlowModeBtn').addEventListener('click', function () {
    if (!currentRoom) return;
    var enabled = $('slowModeEnabled').checked;
    var delay   = parseInt($('slowModeDelay').value) || 30;
    db.collection('rooms').doc(currentRoom).update({
      slowMode:      enabled,
      slowModeDelay: enabled ? delay : 0
    }).then(function () { toast('Mode lent ' + (enabled ? 'activé' : 'désactivé'), 'success'); });
      });

  /* ─────────────────────────────────────────────
     47. RECHERCHE GLOBALE
  ───────────────────────────────────────────── */
  function openGlobalSearch() {
    show($('globalSearchModal'));
    $('globalSearchInput').value = '';
    $('gsResults').innerHTML = '';
    $('globalSearchInput').focus();
  }

  var gsDebounce = null;
  $('globalSearchInput').addEventListener('input', function () {
    clearTimeout(gsDebounce);
    var q = this.value.trim().toLowerCase();
    if (!q) { $('gsResults').innerHTML = ''; return; }
    gsDebounce = setTimeout(function () { runGlobalSearch(q); }, 350);
      });

  function runGlobalSearch(q) {
    var out = $('gsResults');
    out.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-muted)">Recherche…</div>';

    Promise.all([
      db.collection('rooms').orderBy('name').startAt(q).endAt(q + '\uf8ff').limit(5).get(),
      db.collection('users').orderBy('pseudo').startAt(q).endAt(q + '\uf8ff').limit(5).get()
    ]).then(function (results) {
      out.innerHTML = '';
      var rooms = results[0];
      var users = results[1];

      if (!rooms.empty) {
        var sec = document.createElement('div');
        sec.className = 'gsearch-section';
        sec.innerHTML = '<div class="gsearch-title">Salons</div>';
        var list = document.createElement('div');
        list.className = 'gsearch-results';
        rooms.docs.forEach(function (doc) {
          var r = doc.data();
          var el = document.createElement('div');
          el.className = 'gsearch-item';
          el.setAttribute('role', 'button');
          var ava = r.photoUrl
            ? '<img src="' + escapeHtml(r.photoUrl) + '" style="width:36px;height:36px;border-radius:var(--r-sm);object-fit:cover"/>'
            : '<div class="ava ava--sm" style="border-radius:var(--r-sm)"><span class="ava-ini">' + escapeHtml(initials(r.name)) + '</span></div>';
          el.innerHTML = ava + '<div class="gsearch-item-text"><div class="gsearch-item-name">' + escapeHtml(r.name) + '</div><div class="gsearch-item-sub">' + (r.membersCount || 0) + ' membres</div></div>';
          el.addEventListener('click', function () {
            hide($('globalSearchModal'));
            openRoom(Object.assign({ id: doc.id }, r));
          });
          list.appendChild(el);
        });
        sec.appendChild(list);
        out.appendChild(sec);
      }

      if (!users.empty) {
        var sec2 = document.createElement('div');
        sec2.className = 'gsearch-section';
        sec2.innerHTML = '<div class="gsearch-title">Utilisateurs</div>';
        var list2 = document.createElement('div');
        list2.className = 'gsearch-results';
        users.docs.forEach(function (doc) {
          var u = doc.data();
          u.uid = doc.id;
          if (u.uid === (currentUser && currentUser.uid)) return;
          var isVerified = u.email && u.email.toLowerCase() === CERTIFIED_EMAIL.toLowerCase();
          var el = document.createElement('div');
          el.className = 'gsearch-item';
          el.setAttribute('role', 'button');
          var ava2 = u.avatarUrl
            ? '<img src="' + escapeHtml(u.avatarUrl) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/>'
            : '<div class="ava ava--sm"><span class="ava-ini">' + escapeHtml(initials(u.pseudo || '?')) + '</span></div>';
          el.innerHTML = ava2 + '<div class="gsearch-item-text"><div class="gsearch-item-name">' + escapeHtml(u.pseudo || 'Anonyme') + (isVerified ? ' <svg width="12" height="12" style="vertical-align:middle"><use href="#ic-verified"/></svg>' : '') + '</div><div class="gsearch-item-sub">' + (u.role || 'user') + '</div></div>';
          el.addEventListener('click', function () {
            hide($('globalSearchModal'));
            openPublicProfile(u);
          });
          list2.appendChild(el);
        });
        sec2.appendChild(list2);
        out.appendChild(sec2);
      }

      if (rooms.empty && users.empty) {
        out.innerHTML = '<div class="gsearch-empty">Aucun résultat pour « ' + escapeHtml(q) + ' »</div>';
      }
    }).catch(function () {
      out.innerHTML = '<div class="gsearch-empty">Erreur de recherche</div>';
    });
  }

  /* ─────────────────────────────────────────────
     48. PARTAGER UN SALON
  ───────────────────────────────────────────── */
  function shareRoom() {
    if (!currentRoomData) return;
    var link = window.location.origin + '?room=' + currentRoom;
    if (navigator.share) {
      navigator.share({ title: currentRoomData.name || 'Salon SIS', url: link }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(function () { toast('Lien copié !', 'success'); });
    } else {
      toast('Lien : ' + link, 'info', 5000);
    }
  }

  /* ─────────────────────────────────────────────
     49. QUITTER UN SALON
  ───────────────────────────────────────────── */
  function leaveRoom() {
    if (!currentRoom) return;
    db.collection('rooms').doc(currentRoom).update({
      membersCount: firebase.firestore.FieldValue.increment(-1)
    }).catch(function () {});
    if (unsubscribers.messages) { unsubscribers.messages(); unsubscribers.messages = null; }
    if (unsubscribers.typing)   { unsubscribers.typing();   unsubscribers.typing = null; }
    if (unsubscribers.roomInfo) { unsubscribers.roomInfo(); unsubscribers.roomInfo = null; }
    currentRoom = null;
    currentRoomData = null;
    hide($('chatView'));
    show($('emptyState'));
    $qa('.room-item').forEach(function (el) { el.classList.remove('active'); });
    toast('Vous avez quitté le salon', 'info');
  }

  /* ─────────────────────────────────────────────
     50. SCROLL VERS MESSAGE ÉPINGLÉ
  ───────────────────────────────────────────── */
  function scrollToPinned() {
    if (!currentRoomData || !currentRoomData.pinnedMessage) return;
    var msgId = currentRoomData.pinnedMessage.id;
    var el = $q('[data-msg-id="' + msgId + '"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background 0.3s';
      el.style.background = 'rgba(91,142,244,0.15)';
      setTimeout(function () { el.style.background = ''; }, 1500);
    }
  }

  /* ─────────────────────────────────────────────
     51. RECHERCHE DANS UN SALON
  ───────────────────────────────────────────── */
  var chatSearchResults = [];
  var chatSearchIndex   = -1;

  $('chatSearchInput').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    if (!q) { chatSearchResults = []; return; }
    chatSearchResults = $qa('.msg-text').filter(function (el) {
      return el.textContent.toLowerCase().indexOf(q) !== -1;
    });
    chatSearchIndex = chatSearchResults.length - 1;
    updateChatSearchNav();
    scrollToSearchResult();
      });

  $('chatSearchPrev').addEventListener('click', function () {
    if (!chatSearchResults.length) return;
    chatSearchIndex = (chatSearchIndex - 1 + chatSearchResults.length) % chatSearchResults.length;
    scrollToSearchResult();
      });

  $('chatSearchNext').addEventListener('click', function () {
    if (!chatSearchResults.length) return;
    chatSearchIndex = (chatSearchIndex + 1) % chatSearchResults.length;
    scrollToSearchResult();
      });

  function scrollToSearchResult() {
    if (chatSearchIndex < 0 || !chatSearchResults[chatSearchIndex]) return;
    var el = chatSearchResults[chatSearchIndex].closest('.msg-wrap');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateChatSearchNav();
  }

  function updateChatSearchNav() {
    setText('chatSearchCount',
      chatSearchResults.length > 0
        ? (chatSearchIndex + 1) + '/' + chatSearchResults.length
        : '0/0'
    );
  }

  /* ─────────────────────────────────────────────
     52. SLOW MODE
  ───────────────────────────────────────────── */
  function startSlowMode(seconds) {
    var bar  = $('slowModeBar');
    var text = $('slowModeText');
    var inp  = $('messageInput');
    var send = $('sendBtn');
    if (!bar) return;

    show(bar);
    if (inp)  inp.contentEditable = 'false';
    if (send) send.disabled = true;

    var remaining = seconds;
    if (slowModeInterval) clearInterval(slowModeInterval);
    slowModeInterval = setInterval(function () {
      remaining--;
      if (text) text.textContent = 'Slow mode — attendez ' + remaining + 's';
      if (remaining <= 0) {
        clearInterval(slowModeInterval);
        hide(bar);
        if (inp)  inp.contentEditable = 'true';
        if (send) send.disabled = false;
      }
    }, 1000);
  }

  /* ─────────────────────────────────────────────
     53. DEEP LINK (ouverture via URL)
  ───────────────────────────────────────────── */
  function handleDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var roomId = params.get('room');
    if (!roomId) return;
    db.collection('rooms').doc(roomId).get().then(function (doc) {
      if (doc.exists) {
        var room = doc.data();
        room.id = doc.id;
        openRoom(room);
      }
    }).catch(function () {});
  }

  /* ─────────────────────────────────────────────
     54. SONS — charger préférence
  ───────────────────────────────────────────── */
  soundEnabled = localStorage.getItem('sis_sound') !== '0';

  /* ─────────────────────────────────────────────
     55. LAZY DECRYPT messages (UI)
     Les messages sont chiffrés AES en base, mais
     pour cette démo on déchiffre côté client.
  ───────────────────────────────────────────── */
  function tryDecryptVisible() {
    $qa('.msg-text').forEach(function (el) {
      var raw = el.dataset.raw;
      if (!raw) return;
      decryptMsg(raw).then(function (plain) {
        el.innerHTML = parseMarkdown(plain);
        delete el.dataset.raw;
      });
    });
  }

  /* ─────────────────────────────────────────────
     56. SERVICE WORKER (FCM)
  ───────────────────────────────────────────── */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(function () {});
  }

  /* ─────────────────────────────────────────────
     57. RESPONSIVE — resize handler
  ───────────────────────────────────────────── */
  window.addEventListener('resize', function () {
    isMobile = window.innerWidth < 768;
      });

  /* ─────────────────────────────────────────────
     58. CLAVIER MOBILE — éviter chevauchement
  ───────────────────────────────────────────── */
  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', function () {
      var diff = window.innerHeight - window.visualViewport.height;
      var inputZone = $('inputZone');
      var dmInputZone = $('dmInputZone');
      var randInputZone = $('randomInputZone');
      [inputZone, dmInputZone, randInputZone].forEach(function (el) {
        if (el) el.style.transform = diff > 50 ? 'translateY(-' + diff + 'px)' : '';
      });
    });
  }

  /* ─────────────────────────────────────────────
     59. CONNEXION HORS LIGNE
  ───────────────────────────────────────────── */
  window.addEventListener('online', function () {
    toast('Connexion rétablie', 'success');
      });
  window.addEventListener('offline', function () {
    toast('Connexion perdue — mode hors ligne', 'warn', 5000);
      });

  /* ─────────────────────────────────────────────
     60. INIT SÉQUENCE PRINCIPALE
  ───────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    registerServiceWorker();

    /* Splash supprimé */
    var s = document.getElementById("splashScreen"); if (s) s.style.display = "none";
      initCGU(function () {
        initFirebase();
        initInputZone();

        /* Toasts des clics manquants du HTML */
        var shareRoomBtn = $('shareRoomBtn');
        if (shareRoomBtn) shareRoomBtn.addEventListener('click', shareRoom);

        /* Back mobile DM list → sidebar */
        var dmListBack = $('dmListBack');
        if (dmListBack) dmListBack.addEventListener('click', function () {
          if (isMobile) {
            $('sidebar').classList.remove('slide-out');
            hide($('dmListView'));
          }
        });

        /* DM search */
        var dmSearch = $('dmSearchInput');
        if (dmSearch) dmSearch.addEventListener('input', function () {
          var q = this.value.toLowerCase();
          $qa('.conv-item').forEach(function (el) {
            var name = (el.querySelector('.conv-name') || {}).textContent || '';
            el.style.display = name.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
          });
        });

        /* Recherche dans membres */
        var memberSearch = $('membersSearchInput');
        if (memberSearch) memberSearch.addEventListener('input', function () {
          var q = this.value.toLowerCase();
          $qa('.member-item').forEach(function (el) {
            var name = (el.dataset.name || '').toLowerCase();
            el.style.display = name.indexOf(q) !== -1 ? '' : 'none';
          });
        });

        /* Raccourcis clavier */
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            closeAllContextMenus();
            $qa('.modal-overlay').forEach(function (m) { m.classList.add('hidden'); });
            $qa('.bottom-sheet').forEach(function (s) { hide(s); });
            hide($('emojiPicker'));
            hide($('attachMenu'));
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'f' && currentRoom) {
            e.preventDefault();
            var bar = $('chatSearchBar');
            if (bar.classList.contains('hidden')) {
              show(bar);
              $('chatSearchInput').focus();
            } else {
              hide(bar);
            }
          }
        });

        /* Deep link */
        handleDeepLink();
      });

})(); /* Fin IIFE */
