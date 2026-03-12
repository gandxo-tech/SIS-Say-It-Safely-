/* ═══════════════════════════════════════════════════════════════════
   CHAT ANONYME · SIS — Say It Safely
   JS Complet — IIFE · Vanilla · Firebase Compat · Android Go Safe
   JAMAIS type="module" · JAMAIS import/export · JAMAIS backdrop-filter
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     1. CONFIGURATION
  ══════════════════════════════════════════════════════════════ */
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s',
    authDomain:        'chat-anonyme.firebaseapp.com',
    projectId:         'chat-anonyme',
    storageBucket:     'chat-anonyme.firebasestorage.app',
    messagingSenderId: '93366459642',
    appId:             '1:93366459642:web:a2421c9478909b33667d43'
  };
  var VAPID_KEY       = 'BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k';
  var CLOUDINARY_NAME = 'dwdlwjdhe';
  var CLOUDINARY_PRESET = 'sis_preset';
  var TENOR_KEY       = 'VOTRE_CLE_TENOR';
  var CERTIFIED_EMAIL = 'gbaguidiexauce@gmail.com';

  var EMOJIS_QUICK = ['👍','❤️','😂','😮','😢','😡','🔥','🙏','💯','👀','🎉','💪',
    '😍','🤔','👏','✅','❌','🆒','🤣','😭','🥳','😎','🤯','💀',
    '⭐','🌟','💡','🎯','🚀','💬','🤝','😏'];

  var BG_COLORS = [
    '#0D0D14','#1A1A2E','#16213E','#0F3460','#1B1B2F',
    '#2D1B69','#1a0533','#003049','#0a3d62','#1e272e',
    '#F0F2F5','#EAE0D5','#DDE8C9','#D5E8D4','#DAE8FC'
  ];
  var BG_GRADIENTS = [
    'linear-gradient(135deg,#0D0D14,#1A1A2E)',
    'linear-gradient(135deg,#5B8EF4,#8B5CF6)',
    'linear-gradient(135deg,#1a0533,#0D0D14)',
    'linear-gradient(135deg,#003049,#1a0533)',
    'linear-gradient(135deg,#16213E,#0F3460)',
    'linear-gradient(135deg,#2D1B69,#5B8EF4)',
    'linear-gradient(135deg,#0a3d62,#1e272e)',
    'linear-gradient(135deg,#1B1B2F,#8B5CF6)'
  ];
  var BG_PATTERNS = [
    { label: 'Hexagones',  css: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.04) 1px,transparent 0) 0 0/24px 24px' },
    { label: 'Vagues',     css: 'repeating-linear-gradient(45deg,rgba(91,142,244,0.04) 0,rgba(91,142,244,0.04) 2px,transparent 2px,transparent 20px)' },
    { label: 'Grille',     css: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px) 0 0/30px 30px' },
    { label: 'Points',     css: 'radial-gradient(circle,rgba(91,142,244,0.12) 1.5px,transparent 1.5px) 0 0/20px 20px' },
    { label: 'Diagonal',   css: 'repeating-linear-gradient(-45deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 8px)' },
    { label: 'Tirets',     css: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(91,142,244,0.06) 10px,rgba(91,142,244,0.06) 11px)' }
  ];

  var ANON_PSEUDOS = [
    'ShadowFox','NightOwl','CryptoWolf','StarGazer','NeonPulse',
    'GhostWave','IronClad','SilentStorm','DarkMatter','FrostByte',
    'PixelDrift','VoidWalker','NebulaCat','EchoBlast','TurboZone',
    'QuantumBee','MysticCrow','LaserShark','NovaRider','CodeBreaker',
    'CosmicDust','ThunderFist','SteelMind','GlitchHawk','BlueMoon'
  ];
  var ANON_EMOJIS   = ['🦊','🦁','🐺','🦋','🐉','🦅','🐼','🦄','🐯','🦝','🐸','🦩','🐨','🦊','🦇','🦉','🐙','🦈'];

  /* ══════════════════════════════════════════════════════════════
     2. ÉTAT GLOBAL
  ══════════════════════════════════════════════════════════════ */
  var db, auth, messaging;
  var currentUser      = null;
  var currentUserData  = {};
  var currentRoomId    = null;
  var currentRoomData  = {};
  var currentRoomMods  = {};  /* { uid: true } — mods du salon actuel */
  var roomModsListenerOff = null;
  var currentDmId      = null;
  var currentDmUser    = {};
  var currentDmOtherUid  = null;
  var dmMessagesListener = null;
  var dmTypingListener   = null;
  var dmTypingTimeout    = null;
  var dmInputBound       = false;
  var dmIsRecording      = false;
  var dmMediaRecorder    = null;
  var dmAudioChunks      = [];
  var dmVoiceTimer       = null;
  var dmVoiceSecs        = 0;
  var dmActionMsgId      = null;
  var dmActionData       = null;
  var currentView      = 'rooms';
  var currentCategory  = 'all';
  var encryptionKey    = null;
  var isRecording      = false;
  var mediaRecorder    = null;
  var audioChunks      = [];
  var voiceTimer       = null;
  var voiceSeconds     = 0;
  var soundEnabled     = true;
  var typingTimeout    = null;
  var typingListenerOff = null;
  var messagesListenerOff = null;
  var roomsListenerOff    = null;
  var dmsListenerOff      = null;
  var randomListenerOff   = null;
  var randomQueueListenerOff = null; /* séparé du listener de session */
  var randomSessionId  = null;
  var randomPartnerId  = null;
  var isRandomSearching = false;
  var selectedBgType   = 'none';
  var selectedBgValue  = '';
  var actionMsgId      = null;
  var actionMsgData    = null;
  var replyToMsg       = null;
  var dmReplyToMsg     = null;
  var slowModeDelay    = 0;
  var lastMsgTime      = 0;
  var audioCtx         = null;
  var isLowEnd         = false;
  var onlineUsers      = {};
  var unreadCounts     = {};

  /* ══════════════════════════════════════════════════════════════
     3. UTILITAIRES
  ══════════════════════════════════════════════════════════════ */
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }
  function showFlex(el) { if (el) el.style.display = 'flex'; }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours().toString().padStart(2,'0');
    var m = d.getMinutes().toString().padStart(2,'0');
    return h + ':' + m;
  }
  function fmtDate(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) return "Aujourd'hui";
    if (diff < 172800000) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  }
  function fmtRelTime(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return Math.floor(diff/60000) + ' min';
    if (diff < 86400000) return fmtTime(ts);
    return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function parseMarkdown(text) {
    if (!text) return '';
    var t = escapeHtml(text);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/`(.+?)`/g, '<code>$1</code>');
    t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return t;
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function rippleEffect(btn) {
    btn.classList.add('rippling');
    setTimeout(function() { btn.classList.remove('rippling'); }, 600);
  }

  /* ── Toasts ── */
  function showToast(msg, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var container = $('toastContainer');
    if (!container) return;
    var icons = {
      success: '<svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="7" stroke="#22C55E" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:   '<svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="7" stroke="#EF4444" stroke-width="1.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/></svg>',
      info:    '<svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="7" stroke="#5B8EF4" stroke-width="1.5"/><path d="M8 7v5M8 5v.5" stroke="#5B8EF4" stroke-width="1.5" stroke-linecap="round"/></svg>',
      warning: '<svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M8 2L1 14h14L8 2z" stroke="#F59E0B" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6v4M8 12v.3" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round"/></svg>'
    };
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = (icons[type]||'') + escapeHtml(msg);
    container.appendChild(t);
    setTimeout(function() {
      t.classList.add('removing');
      setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, duration);
  }

  /* ── Sons (Web Audio API) ── */
  function initAudio() {
    if (audioCtx) return; /* Déjà initialisé */
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
      }
    } catch(e) {}
  }

  function ensureAudio() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function(){});
    }
  }
  function playTone(freq, dur, vol) {
    if (!soundEnabled) return;
    ensureAudio();
    if (!audioCtx) return;
    try {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.value = freq || 440;
      o.type = 'sine';
      g.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.15));
      o.start(audioCtx.currentTime);
      o.stop(audioCtx.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function playSendSound()    { playTone(880, 0.1, 0.06); }
  function playReceiveSound() { playTone(660, 0.12, 0.05); setTimeout(function(){ playTone(880, 0.08, 0.03); }, 60); }
  function playNotifSound()   { playTone(528, 0.2, 0.07); setTimeout(function(){ playTone(660, 0.15, 0.05); }, 100); }
  function playConnectSound() { playTone(440, 0.1, 0.04); setTimeout(function(){ playTone(660, 0.1, 0.04); }, 120); setTimeout(function(){ playTone(880, 0.15, 0.06); }, 240); }

  /* ── Détection low-end ── */
  function detectLowEnd() {
    var nav = navigator;
    if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) { isLowEnd = true; }
    if (nav.deviceMemory && nav.deviceMemory <= 1) { isLowEnd = true; }
    if (isLowEnd) document.body.classList.add('low-end-device');
  }

  /* ── Canvas Particles Auth ── */
  function initAuthParticles() {
    var canvas = $('authCanvas');
    if (!canvas || isLowEnd) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    for (var i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        speedY: -(Math.random() * 0.4 + 0.1),
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '91,142,244' : '139,92,246'
      });
    }
    var rafId;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ',' + p.opacity + ')';
        ctx.fill();
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(rafId); };
  }

  /* ── Génération d'avatar emoji ── */
  function makeAvatarEl(pseudo, emoji, color, size, avatarUrl) {
    var div = document.createElement('div');
    size = size || 40;
    div.style.cssText = 'width:'+size+'px;height:'+size+'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:'+(size*0.45)+'px;background:'+(color||'#5B8EF4')+';flex-shrink:0;overflow:hidden;';
    if (avatarUrl) {
      var img = document.createElement('img');
      img.src = avatarUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      img.onerror = function() {
        div.removeChild(img);
        div.textContent = emoji || (pseudo || '?').charAt(0).toUpperCase();
        if (!emoji) div.style.color = '#fff';
      };
      div.appendChild(img);
    } else if (emoji) {
      div.textContent = emoji;
    } else {
      div.textContent = (pseudo || '?').charAt(0).toUpperCase();
      div.style.color = '#fff';
    }
    return div;
  }

  function avatarHtml(pseudo, emoji, color, size, avatarUrl) {
    size = size || 40;
    var fs = Math.round(size * 0.45);
    var bg = color || '#5B8EF4';
    var base = 'width:'+size+'px;height:'+size+'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:'+fs+'px;background:'+bg+';flex-shrink:0;overflow:hidden;';
    if (avatarUrl) {
      var fallback = escapeHtml(emoji || (pseudo || '?').charAt(0).toUpperCase());
      return '<div style="'+base+'">' +
        '<img src="'+escapeHtml(avatarUrl)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" ' +
        'onerror="this.style.display=&quot;none&quot;;this.parentNode.textContent=&quot;'+fallback+'&quot;">' +
        '</div>';
    }
    var char = emoji || (pseudo || '?').charAt(0).toUpperCase();
    return '<div style="'+base+'">' + escapeHtml(char) + '</div>';
  }

  function certBadgeHtml() {
    /* Gradient inline évite les conflits d'ID SVG dans les listes */
    return '<span class="badge-certified" title="Compte officiel SIS · gbaguidiexauce@gmail.com">' +
      '<svg viewBox="0 0 20 20" width="14" height="14" style="vertical-align:middle;">' +
      '<defs>' +
        '<linearGradient id="certGBadge" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#5B8EF4"/>' +
          '<stop offset="100%" stop-color="#8B5CF6"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<circle cx="10" cy="10" r="10" fill="url(#certGBadge)"/>' +
      '<polyline points="5,10 8.5,13.5 15,7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></span>';
  }


  /* ══════════════════════════════════════════════════════════════
     4. CHIFFREMENT AES-256-GCM
  ══════════════════════════════════════════════════════════════ */
  function initEncryption(roomId) {
    if (!window.crypto || !window.crypto.subtle) return;
    var stored = null;
    try { stored = localStorage.getItem('sis_key_' + roomId); } catch(e){}
    if (stored) {
      try {
        var raw = hexToBytes(stored);
        window.crypto.subtle.importKey('raw', raw, { name:'AES-GCM' }, false, ['encrypt','decrypt'])
          .then(function(k){ encryptionKey = k; }).catch(function(){});
        return;
      } catch(e){}
    }
    window.crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt'])
      .then(function(key) {
        encryptionKey = key;
        return window.crypto.subtle.exportKey('raw', key);
      })
      .then(function(raw) {
        try { localStorage.setItem('sis_key_' + roomId, bytesToHex(new Uint8Array(raw))); } catch(e){}
      }).catch(function(){});
  }

  function hexToBytes(hex) {
    var arr = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) arr[i/2] = parseInt(hex.substr(i,2),16);
    return arr.buffer;
  }
  function bytesToHex(bytes) {
    return Array.from(bytes).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
  }

  function encryptMsg(text, cb) {
    if (!encryptionKey || !window.crypto || !window.crypto.subtle) { cb(null, text); return; }
    try {
      var iv = window.crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder();
      window.crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, encryptionKey, enc.encode(text))
        .then(function(ct) {
          var combined = new Uint8Array(iv.length + ct.byteLength);
          combined.set(iv);
          combined.set(new Uint8Array(ct), iv.length);
          cb(null, btoa(String.fromCharCode.apply(null, combined)));
        }).catch(function(){ cb(null, text); });
    } catch(e){ cb(null, text); }
  }

  function decryptMsg(encoded, cb) {
    if (!encryptionKey || !window.crypto || !window.crypto.subtle) { cb(null, encoded); return; }
    try {
      var bytes = Uint8Array.from(atob(encoded), function(c){ return c.charCodeAt(0); });
      var iv = bytes.slice(0,12);
      var ct = bytes.slice(12);
      window.crypto.subtle.decrypt({ name:'AES-GCM', iv:iv }, encryptionKey, ct)
        .then(function(pt) {
          cb(null, new TextDecoder().decode(pt));
        }).catch(function(){ cb(null, encoded); });
    } catch(e){ cb(null, encoded); }
  }

  /* ══════════════════════════════════════════════════════════════
     5. INIT FIREBASE — DÉMARRAGE IMMÉDIAT (pas d'écran noir)
  ══════════════════════════════════════════════════════════════ */
  function initFirebase() {
    firebase.initializeApp(FIREBASE_CONFIG);
    db        = firebase.firestore();
    auth      = firebase.auth();

    /* Afficher authScreen IMMÉDIATEMENT → jamais d'écran noir */
    show($('authScreen'));
    initAuth();

    auth.onAuthStateChanged(function(user) {
      if (user) {
        onUserSignedIn(user);
      } else {
        show($('authScreen'));
        hide($('appMain'));
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     6. CGU
  ══════════════════════════════════════════════════════════════ */
  function initCGU(cb) {
    var accepted = false;
    try { accepted = localStorage.getItem('sis_cgu') === '1'; } catch(e){}
    if (accepted) { cb(); return; }
    var modal   = $('cguModal');
    var check   = $('cguCheck');
    var btnAcc  = $('btnAcceptCGU');
    show(modal);
    check.addEventListener('change', function() {
      btnAcc.disabled = !check.checked;
    });
    btnAcc.addEventListener('click', function() {
      if (!check.checked) return;
      try { localStorage.setItem('sis_cgu','1'); } catch(e){}
      hide(modal);
      cb();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     7. AUTHENTIFICATION
  ══════════════════════════════════════════════════════════════ */
  function initAuth() {
    /* Tabs */
    qsa('.auth-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        qsa('.auth-tab').forEach(function(t){ t.classList.remove('active'); });
        qsa('.auth-panel').forEach(function(p){ p.classList.remove('active'); });
        tab.classList.add('active');
        var panelId = 'panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
        var panel = $(panelId);
        if (panel) panel.classList.add('active');
        if (tab.dataset.tab === 'anonymous') generateAnonIdentity();
        hideAuthError();
      });
    });

    /* Oeil mot de passe */
    qsa('.btn-eye').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var input = $(btn.dataset.target);
        if (!input) return;
        var show = btn.querySelector('.eye-show');
        var hide = btn.querySelector('.eye-hide');
        if (input.type === 'password') {
          input.type = 'text';
          if (show) show.style.display = 'none';
          if (hide) hide.style.display = 'block';
        } else {
          input.type = 'password';
          if (show) show.style.display = 'block';
          if (hide) hide.style.display = 'none';
        }
      });
    });

    /* Compteur pseudo */
    var regPseudo = $('regPseudo');
    if (regPseudo) {
      regPseudo.addEventListener('input', function() {
        var count = $('regPseudoCount');
        if (count) count.textContent = regPseudo.value.length + '/24';
      });
    }

    /* Force mot de passe */
    var regPwd = $('regPassword');
    if (regPwd) {
      regPwd.addEventListener('input', function() {
        var val = regPwd.value;
        var bar = $('pwdStrength'); var fill = $('pwdBar'); var lbl = $('pwdLabel');
        if (!bar) return;
        if (!val) { hide(bar); return; }
        show(bar);
        var score = 0;
        if (val.length >= 6)  score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        var levels = ['','weak','fair','good','strong','strong'];
        var labels = ['','Faible','Moyen','Bon','Fort','Très fort'];
        var cls = levels[score] || 'weak';
        fill.className = 'pwd-bar-fill ' + cls;
        lbl.className  = 'pwd-label ' + cls;
        lbl.textContent = labels[score] || '';
      });
    }

    /* LOGIN */
    var btnLogin = $('btnLogin');
    if (btnLogin) {
      btnLogin.addEventListener('click', function() {
        var email = $('loginEmail').value.trim();
        var pwd   = $('loginPassword').value;
        if (!email || !pwd) { showAuthError('Remplis tous les champs.'); return; }
        setAuthLoading(btnLogin, true);
        auth.signInWithEmailAndPassword(email, pwd)
          .then(function() { setAuthLoading(btnLogin, false); })
          .catch(function(err) {
            setAuthLoading(btnLogin, false);
            showAuthError(translateFirebaseError(err.code));
          });
      });
    }

    /* REGISTER */
    var btnRegister = $('btnRegister');
    if (btnRegister) {
      btnRegister.addEventListener('click', function() {
        var pseudo = $('regPseudo').value.trim();
        var email  = $('regEmail').value.trim();
        var pwd    = $('regPassword').value;
        if (!pseudo || !email || !pwd) { showAuthError('Remplis tous les champs.'); return; }
        if (pwd.length < 6) { showAuthError('Mot de passe trop court (min. 6 caractères).'); return; }
        setAuthLoading(btnRegister, true);
        auth.createUserWithEmailAndPassword(email, pwd)
          .then(function(cred) {
            var geo = window.SIS_GEO || {};
            return db.collection('users').doc(cred.user.uid).set({
              pseudo:    pseudo,
              email:     email,
              certified: email === CERTIFIED_EMAIL,
              role:      email === CERTIFIED_EMAIL ? 'admin' : 'user',
              status:    'online',
              emoji:     '',
              color:     '#5B8EF4',
              flag:      geo.flag || '🌍',
              country:   geo.country || '',
              countryCode: geo.countryCode || '',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastSeen:  firebase.firestore.FieldValue.serverTimestamp(),
              strikes:   0,
              banned:    false
            });
          })
          .then(function() { setAuthLoading(btnRegister, false); })
          .catch(function(err) {
            setAuthLoading(btnRegister, false);
            showAuthError(translateFirebaseError(err.code));
          });
      });
    }

    /* ANONYME */
    var btnJoinAnon = $('btnJoinAnon');
    if (btnJoinAnon) {
      btnJoinAnon.addEventListener('click', function() {
        setAuthLoading(btnJoinAnon, true);
        auth.signInAnonymously()
          .then(function(cred) {
            var geo = window.SIS_GEO || {};
            var pseudo = $('anonPseudo') ? ($('anonPseudo').textContent || 'Anonyme') : 'Anonyme';
            var emoji  = $('anonAvatar') ? ($('anonAvatar').textContent || '🦊') : '🦊';
            var color  = $('anonAvatar') ? ($('anonAvatar').style.background || '#5B8EF4') : '#5B8EF4';
            return db.collection('users').doc(cred.user.uid).set({
              pseudo:    pseudo,
              email:     '',
              certified: false,
              role:      'user',
              status:    'online',
              emoji:     emoji,
              color:     color,
              flag:      geo.flag || '🌍',
              country:   geo.country || '',
              countryCode: geo.countryCode || '',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastSeen:  firebase.firestore.FieldValue.serverTimestamp(),
              strikes:   0,
              banned:    false,
              isAnon:    true
            });
          })
          .then(function() { setAuthLoading(btnJoinAnon, false); })
          .catch(function(err) {
            setAuthLoading(btnJoinAnon, false);
            showAuthError(translateFirebaseError(err.code));
          });
      });
    }

    /* RÉGÉNÉRER IDENTITÉ */
    var btnRegen = $('btnRegenAnon');
    if (btnRegen) {
      btnRegen.addEventListener('click', function() {
        generateAnonIdentity();
        btnRegen.style.transform = 'rotate(360deg)';
        setTimeout(function(){ btnRegen.style.transform = ''; }, 300);
      });
    }

    /* MOT DE PASSE OUBLIÉ */
    var btnForgot = $('btnForgotPwd');
    if (btnForgot) {
      btnForgot.addEventListener('click', function() {
        var email = $('loginEmail').value.trim();
        if (email) $('forgotPwdEmail').value = email;
        show($('modalForgotPwd'));
      });
    }
    var btnSendReset = $('btnSendResetEmail');
    if (btnSendReset) {
      btnSendReset.addEventListener('click', function() {
        var email = $('forgotPwdEmail').value.trim();
        if (!email) { showToast('Entre ton email.','warning'); return; }
        auth.sendPasswordResetEmail(email)
          .then(function() {
            showToast('Email envoyé ! Vérifie ta boîte.','success');
            hide($('modalForgotPwd'));
          })
          .catch(function(err){ showToast(translateFirebaseError(err.code),'error'); });
      });
    }

    /* Écouter l'event ipapi */
    document.addEventListener('sis:geo:ready', function(e) {
      var geo = e.detail || {};
      var flag = $('anonFlag'), country = $('anonCountry');
      if (flag) flag.textContent = geo.flag || '🌍';
      if (country) country.textContent = (geo.country || '') + (geo.city ? ' · '+geo.city : '');
    });

    generateAnonIdentity();
    initAuthParticles();
  }

  function generateAnonIdentity() {
    var pseudo = ANON_PSEUDOS[Math.floor(Math.random()*ANON_PSEUDOS.length)] +
                 Math.floor(Math.random()*999+1).toString();
    var emoji  = ANON_EMOJIS[Math.floor(Math.random()*ANON_EMOJIS.length)];
    var colors = ['#5B8EF4','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#14B8A6','#F97316'];
    var color  = colors[Math.floor(Math.random()*colors.length)];
    var el = $('anonAvatar');
    if (el) {
      el.textContent = emoji;
      el.style.background = color;
      el.style.width  = '56px';
      el.style.height = '56px';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '1.6rem';
    }
    var pEl = $('anonPseudo');
    if (pEl) pEl.textContent = pseudo;
    el && (el.dataset.emoji = emoji);
    el && (el.dataset.color = color);
  }

  function setAuthLoading(btn, loading) {
    var span = btn.querySelector('span:not(.btn-loader)');
    var loader = btn.querySelector('.btn-loader');
    if (loading) {
      if (span) span.style.display = 'none';
      if (loader) loader.style.display = 'flex';
      btn.disabled = true;
    } else {
      if (span) span.style.display = '';
      if (loader) loader.style.display = 'none';
      btn.disabled = false;
    }
  }
  function showAuthError(msg) {
    var el = $('authError'), msgEl = $('authErrorMsg');
    if (!el) return;
    if (msgEl) msgEl.textContent = msg;
    show(el);
  }
  function hideAuthError() { hide($('authError')); }

  function translateFirebaseError(code) {
    var map = {
      'auth/user-not-found':     'Aucun compte avec cet email.',
      'auth/wrong-password':     'Mot de passe incorrect.',
      'auth/email-already-in-use': 'Cet email est déjà utilisé.',
      'auth/invalid-email':      'Email invalide.',
      'auth/weak-password':      'Mot de passe trop faible.',
      'auth/too-many-requests':  'Trop de tentatives. Réessaie plus tard.',
      'auth/network-request-failed': 'Erreur réseau.',
      'auth/operation-not-allowed': 'Connexion anonyme désactivée.',
      'permission-denied':       'Accès refusé.'
    };
    return map[code] || 'Une erreur est survenue (' + code + ')';
  }


  /* ══════════════════════════════════════════════════════════════
     8. CONNEXION UTILISATEUR — onUserSignedIn
  ══════════════════════════════════════════════════════════════ */
  function onUserSignedIn(user) {
    currentUser = user;
    hide($('authScreen'));
    show($('appMain'));
    playConnectSound();

    /* Charger/créer le profil Firestore */
    db.collection('users').doc(user.uid).get()
      .then(function(doc) {
        if (doc.exists) {
          currentUserData = doc.data();
        } else {
          /* Profil inexistant (edge case) */
          currentUserData = {
            pseudo: user.displayName || 'Utilisateur',
            email:  user.email || '',
            emoji:  '👤',
            color:  '#5B8EF4',
            flag:   (window.SIS_GEO||{}).flag || '🌍',
            country: (window.SIS_GEO||{}).country || '',
            role:   'user',
            status: 'online',
            certified: user.email === CERTIFIED_EMAIL,
            strikes: 0,
            banned: false
          };
          db.collection('users').doc(user.uid).set(currentUserData);
        }

        /* Vérifier bannissement */
        if (currentUserData.banned) {
          showToast('Votre compte est banni.','error',8000);
          auth.signOut();
          return;
        }

        /* ── Certification forcée : si l'email correspond, on garantit certified:true ── */
        var isCertified = (user.email === CERTIFIED_EMAIL);
        if (isCertified && !currentUserData.certified) {
          currentUserData.certified = true;
          db.collection('users').doc(user.uid).update({ certified: true, role: 'admin' })
            .catch(function(){});
        }
        /* Synchroniser role admin pour le compte certifié */
        if (isCertified && currentUserData.role !== 'admin') {
          currentUserData.role = 'admin';
        }

        /* Mettre à jour le statut en ligne + géo */
        var geo = window.SIS_GEO || {};
        var update = {
          status:   'online',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (geo.flag)    update.flag    = geo.flag;
        if (geo.country) update.country = geo.country;
        db.collection('users').doc(user.uid).update(update).catch(function(){});

        /* Mettre à jour UI */
        renderUserUI();
        initApp();
        initFCM();
        trackPresence();
        listenAnnouncements();
        listenNotifications();
        checkAdmin();

        /* ── Écouter le bannissement en temps réel ── */
        db.collection('users').doc(user.uid).onSnapshot(function(snap) {
          if (!snap.exists) return;
          var fresh = snap.data();
          currentUserData = fresh;
          /* Si le rôle vient de changer (nommé admin ou rétrogradé), mettre à jour l'UI */
          checkAdmin();
          if (fresh.banned) {
            showToast('Votre compte a été banni par un administrateur.', 'error', 8000);
            /* Nettoyer tous les listeners */
            if (messagesListenerOff)    { messagesListenerOff(); messagesListenerOff = null; }
            if (roomsListenerOff)       { roomsListenerOff(); roomsListenerOff = null; }
            if (dmsListenerOff)         { dmsListenerOff(); dmsListenerOff = null; }
            if (roomModsListenerOff)    { roomModsListenerOff(); roomModsListenerOff = null; }
            if (dmMessagesListener)     { dmMessagesListener(); dmMessagesListener = null; }
            if (typingListenerOff)      { typingListenerOff(); typingListenerOff = null; }
            if (randomListenerOff)      { randomListenerOff(); randomListenerOff = null; }
            if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
            auth.signOut().catch(function(){});
          }
        }, function(){});
      })
      .catch(function(err) {
        console.error('Firestore user load:', err);
        showToast('Erreur de chargement.','error');
      });
  }

  function renderUserUI() {
    var d = currentUserData;
    var pseudo    = d.pseudo    || 'Utilisateur';
    var emoji     = d.emoji     || '';
    var color     = d.color     || '#5B8EF4';
    var avatarUrl = d.avatarUrl || '';

    /* Topbar avatar */
    var tba = $('topbarAvatar');
    if (tba) {
      tba.innerHTML = '';
      tba.appendChild(makeAvatarEl(pseudo, emoji, color, 32, avatarUrl));
    }

    /* Topbar status dot */
    var tbs = $('topbarStatus');
    if (tbs) tbs.style.background = statusColor(d.status);

    /* Bottom nav avatar */
    var bna = $('bnavAvatar');
    if (bna) {
      bna.innerHTML = '';
      bna.appendChild(makeAvatarEl(pseudo, emoji, color, 28, avatarUrl));
    }

    /* Profil */
    var profAv = $('profileAvatar');
    if (profAv) {
      profAv.innerHTML = '';
      profAv.appendChild(makeAvatarEl(pseudo, emoji, color, 72, avatarUrl));
    }
    var profName = $('profileName');
    if (profName) profName.textContent = pseudo;
    var profCert = $('profileCertBadge');
    if (profCert) { profCert.style.display = d.certified ? 'inline-flex' : 'none'; }
    var profRole = $('profileRole');
    if (profRole) { profRole.textContent = d.role === 'admin' ? '⭐ Administrateur' : d.role === 'mod' ? '🛡️ Modérateur' : ''; profRole.className = 'profile-role ' + (d.role||''); }
    var profFlag = $('profileFlag');
    if (profFlag) profFlag.textContent = d.flag || '🌍';
    var profCtry = $('profileCountryName');
    if (profCtry) profCtry.textContent = d.country || '';
    var profInput = $('profilePseudoInput');
    if (profInput) profInput.value = pseudo;

    /* Thème */
    try {
      var theme = localStorage.getItem('sis_theme');
      if (theme === 'light') document.body.classList.add('light-theme');
    } catch(e){}

    /* Sons */
    try {
      var snd = localStorage.getItem('sis_sounds');
      soundEnabled = snd !== '0';
      var soundToggle = $('soundToggle');
      if (soundToggle) soundToggle.checked = soundEnabled;
    } catch(e){}

    /* Side menu */
    var smAv = $('sideMenuAvatar');
    if (smAv) { smAv.innerHTML = ''; smAv.appendChild(makeAvatarEl(pseudo, emoji, color, 46, avatarUrl)); }
    var smName = $('sideMenuName');
    if (smName) smName.textContent = pseudo;
  }

  function statusColor(s) {
    var map = { online:'#22C55E', away:'#F59E0B', dnd:'#EF4444', offline:'#6B7280' };
    return map[s||'online'] || '#22C55E';
  }

  function trackPresence() {
    if (!currentUser) return;
    var uid = currentUser.uid;
    /* Mettre hors ligne à la fermeture + nettoyages critiques */
    window.addEventListener('beforeunload', function() {
      /* Statut offline */
      db.collection('users').doc(uid).update({
        status: 'offline',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function(){});
      /* Retirer de la queue aléatoire si en attente */
      db.collection('randomQueue').doc(uid).delete().catch(function(){});
      /* Décrémenter membersOnline si dans un salon */
      if (currentRoomId) {
        db.collection('rooms').doc(currentRoomId).update({
          membersOnline: firebase.firestore.FieldValue.increment(-1)
        }).catch(function(){});
        /* Retirer l'indicateur de frappe */
        var typUpd = {};
        typUpd['typing.' + uid] = firebase.firestore.FieldValue.delete();
        db.collection('rooms').doc(currentRoomId).update(typUpd).catch(function(){});
      }
      /* Retirer typing DM */
      if (currentDmId) {
        var dmTypUpd = {};
        dmTypUpd['typing.' + uid] = firebase.firestore.FieldValue.delete();
        db.collection('dms').doc(currentDmId).update(dmTypUpd).catch(function(){});
      }
    });
    /* Visibilité de l'onglet */
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        db.collection('users').doc(uid).update({ status: 'away' }).catch(function(){});
      } else {
        db.collection('users').doc(uid).update({ status: currentUserData.status || 'online' }).catch(function(){});
      }
    });
  }

  function checkAdmin() {
    if (currentUserData.role === 'admin') {
      var sideAdmin = $('sideMenuAdmin');
      if (sideAdmin) show(sideAdmin);
      var adminSection = $('adminProfileSection');
      if (adminSection) show(adminSection);
      var btnAdminProfile = $('btnOpenAdminFromProfile');
      if (btnAdminProfile && !btnAdminProfile._bound) {
        btnAdminProfile._bound = true;
        btnAdminProfile.addEventListener('click', function(){ openAdminPanel(); });
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     9. NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function initApp() {
    initNavigation();
    initRoomsView();
    initDmsView();
    initRandomView();
    initProfileView();
    initModals();
    initInputBar();
    initThemeToggle();
    initSideMenu();
    showView('rooms');
  }

  function initNavigation() {
    /* Bottom nav */
    qsa('.bnav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var view = btn.dataset.view;
        if (!view) return;
        qsa('.bnav-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        showView(view);
        /* Topbar sync */
        qsa('.topbar-nav-btn').forEach(function(b){ b.classList.remove('active'); });
        var tbBtn = qs('.topbar-nav-btn[data-view="'+view+'"]');
        if (tbBtn) tbBtn.classList.add('active');
      });
    });
    /* Topbar nav */
    qsa('.topbar-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var view = btn.dataset.view;
        if (!view) return;
        qsa('.topbar-nav-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        showView(view);
        /* Bottom nav sync */
        qsa('.bnav-btn').forEach(function(b){ b.classList.remove('active'); });
        var bnBtn = qs('.bnav-btn[data-view="'+view+'"]');
        if (bnBtn) bnBtn.classList.add('active');
      });
    });
    /* Topbar avatar → side menu */
    var topbarAv = $('topbarAvatarBtn');
    if (topbarAv) topbarAv.addEventListener('click', function(){ show($('sideMenu')); show($('sideMenuOverlay')); });
    /* Bouton theme topbar */
    var btnTheme = $('btnThemeToggle');
    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);
  }

  function showView(name) {
    /* Fermer proprement le salon si on quitte la vue rooms */
    if (currentView === 'rooms' && name !== 'rooms' && currentRoomId) {
      closeRoom();
    }
    /* Arrêter les listeners DM si on quitte la vue dms */
    if (currentView === 'dms' && name !== 'dms') {
      stopDmTyping();
      if (dmMessagesListener) { dmMessagesListener(); dmMessagesListener = null; }
      if (dmTypingListener)   { dmTypingListener();   dmTypingListener   = null; }
    }
    currentView = name;
    qsa('.view').forEach(function(v){ v.classList.remove('active'); });
    var v = $('view' + name.charAt(0).toUpperCase() + name.slice(1));
    if (v) v.classList.add('active');
    if (name === 'notifications') markNotifsRead();
    if (name === 'dms' && currentUser) loadDmList();
  }

  function initSideMenu() {
    var overlay = $('sideMenuOverlay');
    if (overlay) overlay.addEventListener('click', function(){ hide($('sideMenu')); hide(overlay); });
    var sideProfile = $('sideMenuProfile');
    if (sideProfile) sideProfile.addEventListener('click', function(){ hide($('sideMenu')); hide($('sideMenuOverlay')); showView('profile'); syncNavBtns('profile'); });
    var sideSearch = $('sideMenuSearch');
    if (sideSearch) sideSearch.addEventListener('click', function(){ hide($('sideMenu')); hide($('sideMenuOverlay')); show($('modalSearch')); setTimeout(function(){ $('globalSearch') && $('globalSearch').focus(); }, 100); });
    var sideAdmin = $('sideMenuAdmin');
    if (sideAdmin) sideAdmin.addEventListener('click', function(){ hide($('sideMenu')); hide($('sideMenuOverlay')); openAdminPanel(); });
    var sideLogout = $('sideMenuLogout');
    if (sideLogout) sideLogout.addEventListener('click', doLogout);
  }

  function syncNavBtns(view) {
    qsa('.bnav-btn, .topbar-nav-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.view === view);
    });
  }

  function initThemeToggle() {
    /* Applique le thème sauvegardé */
    try {
      if (localStorage.getItem('sis_theme') === 'light') {
        document.body.classList.add('light-theme');
        var thToggle = $('themeToggle');
        if (thToggle) thToggle.checked = true;
        var iconD = $('iconDark'), iconL = $('iconLight');
        if (iconD) iconD.style.display = 'none';
        if (iconL) iconL.style.display = '';
      }
    } catch(e){}
  }

  function toggleTheme() {
    document.body.classList.toggle('light-theme');
    var isLight = document.body.classList.contains('light-theme');
    try { localStorage.setItem('sis_theme', isLight ? 'light' : 'dark'); } catch(e){}
    var iconD = $('iconDark'), iconL = $('iconLight');
    if (iconD && iconL) { iconD.style.display = isLight ? 'none' : ''; iconL.style.display = isLight ? '' : 'none'; }
    var thToggle = $('themeToggle');
    if (thToggle) thToggle.checked = isLight;
  }

  /* Fermeture de modales */
  function initModals() {
    /* Boutons de fermeture .modal-close */
    qsa('.modal-close').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var modalId = btn.dataset.modal;
        if (modalId) {
          hide($(modalId));
        } else {
          /* Fermer la modale parente */
          var parent = btn.closest('.overlay');
          if (parent) hide(parent);
        }
      });
    });

    /* Click sur l'overlay en dehors de la modal-box → fermer */
    qsa('.overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) hide(overlay);
      });
    });

    /* ImagePreview fermeture */
    var btnCloseImg = $('btnCloseImagePreview');
    if (btnCloseImg) btnCloseImg.addEventListener('click', function(){ hide($('modalImagePreview')); });

    /* Search fermeture */
    var btnCloseSearch = $('btnCloseSearch');
    if (btnCloseSearch) btnCloseSearch.addEventListener('click', function(){ hide($('modalSearch')); });

    /* Fermer modales avec Escape */
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var openOverlays = qsa('.overlay:not([style*="display: none"])');
      if (openOverlays.length) {
        hide(openOverlays[openOverlays.length - 1]);
      }
    });
  }


  /* ══════════════════════════════════════════════════════════════
     10. VUE SALONS
  ══════════════════════════════════════════════════════════════ */
  function initRoomsView() {
    loadRooms();

    /* Recherche */
    var roomSearch = $('roomSearch');
    if (roomSearch) {
      roomSearch.addEventListener('input', function() {
        filterRooms(roomSearch.value.trim(), currentCategory);
      });
    }

    /* Filtres catégories */
    qsa('.chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        qsa('.chip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
        currentCategory = chip.dataset.cat || 'all';
        filterRooms(roomSearch ? roomSearch.value.trim() : '', currentCategory);
      });
    });

    /* Créer salon */
    var btnCreate = $('btnCreateRoom');
    var btnCreateEmpty = $('btnCreateRoomEmpty');
    if (btnCreate) btnCreate.addEventListener('click', function(){ show($('modalCreateRoom')); updateCharCounter('newRoomDescription','roomDescCounter',200); });
    if (btnCreateEmpty) btnCreateEmpty.addEventListener('click', function(){ show($('modalCreateRoom')); updateCharCounter('newRoomDescription','roomDescCounter',200); });

    initCreateRoomModal();
    initChatHeader();
  }

  function loadRooms() {
    if (roomsListenerOff) roomsListenerOff();
    var list = $('roomsList');
    if (!list) return;

    roomsListenerOff = db.collection('rooms')
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function(snap) {
        hide($('roomsLoading'));
        var rooms = [];
        snap.forEach(function(doc) {
          rooms.push({ id: doc.id, data: doc.data() });
        });
        renderRoomsList(rooms);
      }, function(err) {
        console.error('Rooms listener:', err);
      });
  }

  function renderRoomsList(rooms) {
    var list = $('roomsList');
    if (!list) return;
    var skeleton = qs('.loading-state', list);
    if (skeleton) hide(skeleton);

    qsa('.room-item', list).forEach(function(el){ el.parentNode.removeChild(el); });

    /* Séparer salons et canaux */
    var normalRooms = rooms.filter(function(r){ return r.data.type !== 'channel'; });
    var channels    = rooms.filter(function(r){ return r.data.type === 'channel'; });

    /* Mettre à jour la liste des canaux */
    renderChannelsList(channels);

    if (!normalRooms.length) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'empty-dms';
      emptyEl.innerHTML = '<p>Aucun salon pour l\'instant</p><span>Crée le premier !</span>';
      list.appendChild(emptyEl);
      return;
    }

    normalRooms.forEach(function(room) {
      var d = room.data;
      var item = document.createElement('div');
      item.className = 'room-item' + (room.id === currentRoomId ? ' active' : '');
      item.dataset.roomId = room.id;
      item.dataset.category = (d.category || 'general').toLowerCase();
      var unread = unreadCounts[room.id] || 0;
      var timeStr = d.lastMessageAt ? fmtRelTime(d.lastMessageAt) : '';
      var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
      var roomEmoji = d.photo ? '' : (catEmoji[d.category] || '💬');
      item.innerHTML =
        '<div class="room-avatar" style="background:' + (d.color||'#1A1A2E') + '">' +
          (d.photo ? '<img src="'+escapeHtml(d.photo)+'" style="width:100%;height:100%;object-fit:cover;">' : escapeHtml(roomEmoji)) +
        '</div>' +
        '<div class="room-item-info">' +
          '<div class="room-item-top">' +
            '<span class="room-item-name">' + escapeHtml(d.name||'Salon') + '</span>' +
            '<span class="room-item-time">' + escapeHtml(timeStr) + '</span>' +
          '</div>' +
          '<div class="room-item-bottom">' +
            '<span class="room-item-preview">' + (d.lastMessage ? escapeHtml(d.lastMessage.substr(0,40)) : 'Aucun message') + '</span>' +
            '<div class="room-item-right">' +
              (unread > 0 ? '<span class="room-unread-badge">'+unread+'</span>' : '') +
              '<span class="room-members-count"><div class="online-dot"></div> '+((d.membersOnline||0)+'')+'</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      item.addEventListener('click', function() {
        var pwd = d.password;
        if (d.type === 'private' && pwd) {
          pendingRoomId = room.id;
          pendingRoomData = d;
          show($('modalRoomPassword'));
          setTimeout(function(){ $('roomPasswordInput') && $('roomPasswordInput').focus(); }, 100);
        } else {
          openRoom(room.id, d);
        }
      });
      /* Tap long → infos */
      var holdTimer;
      item.addEventListener('touchstart', function(){ holdTimer = setTimeout(function(){ openRoomInfo(room.id, d); }, 600); });
      item.addEventListener('touchend', function(){ clearTimeout(holdTimer); });
      list.appendChild(item);
    });

    /* Membres en ligne */
    updateOnlineFooter();
  }

  var pendingRoomId = null, pendingRoomData = null;

  function filterRooms(search, cat) {
    qsa('.room-item').forEach(function(item) {
      var name = (item.querySelector('.room-item-name')||{textContent:''}).textContent.toLowerCase();
      var matchSearch = !search || name.includes(search.toLowerCase());
      var matchCat = cat === 'all' || item.dataset.category === cat;
      item.style.display = (matchSearch && matchCat) ? '' : 'none';
    });
  }

  function updateOnlineFooter() {
    var count = Object.keys(onlineUsers).length;
    var countEl = $('onlineCount');
    if (countEl) countEl.textContent = count + ' en ligne';
    var row = $('onlineAvatarsRow');
    if (!row) return;
    row.innerHTML = '';
    var keys = Object.keys(onlineUsers).slice(0,8);
    keys.forEach(function(uid) {
      var u = onlineUsers[uid];
      var av = document.createElement('div');
      av.className = 'online-avatar-item';
      av.title = u.pseudo || 'Utilisateur';
      av.innerHTML = avatarHtml(u.pseudo, u.emoji, u.color, 28, u.avatarUrl);
      av.addEventListener('click', function(e){ e.stopPropagation(); openMemberProfile(uid, u); });
      row.appendChild(av);
    });
  }

  /* ── Créer salon ── */
  function initCreateRoomModal() {
    /* Type toggle */
    qsa('.type-opt').forEach(function(opt) {
      opt.addEventListener('click', function() {
        qsa('.type-opt').forEach(function(o){ o.classList.remove('active'); });
        opt.classList.add('active');
        var pwdField = $('roomPasswordField');
        if (pwdField) pwdField.style.display = opt.dataset.type === 'private' ? '' : 'none';
        var channelInfo = $('channelTypeInfo');
        if (channelInfo) channelInfo.style.display = opt.dataset.type === 'channel' ? '' : 'none';
        /* Adapter label bouton */
        var btnConfirm = $('btnConfirmCreateRoom');
        if (btnConfirm) btnConfirm.childNodes[btnConfirm.childNodes.length-1].textContent =
          opt.dataset.type === 'channel' ? ' Créer le canal' : ' Créer le salon';
      });
    });

    /* Photo salon */
    var btnPhoto = $('btnRoomPhotoUpload');
    var filePhoto = $('fileRoomPhoto');
    if (btnPhoto && filePhoto) {
      btnPhoto.addEventListener('click', function(){ filePhoto.click(); });
      filePhoto.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Image trop lourde (max 5 Mo)','error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          var prev = $('roomPhotoPreview');
          if (prev) { prev.style.backgroundImage = 'url('+ev.target.result+')'; prev.innerHTML = ''; }
        };
        reader.readAsDataURL(file);
      });
    }

    /* Confirmer création */
    var btnConfirm = $('btnConfirmCreateRoom');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', function() {
        var name = ($('newRoomName')||{value:''}).value.trim();
        if (!name) { showToast('Entre un nom de salon','warning'); return; }
        var cat  = ($('newRoomCategory')||{value:'general'}).value;
        var desc = ($('newRoomDescription')||{value:''}).value.trim();
        var type = (qs('.type-opt.active')||{dataset:{type:'public'}}).dataset.type;
        var pwd  = ($('newRoomPassword')||{value:''}).value;
        var photoPreview = $('roomPhotoPreview');
        var photoUrl = '';
        if (photoPreview && photoPreview.style.backgroundImage) {
          photoUrl = photoPreview.style.backgroundImage.replace(/^url\(["']?/,'').replace(/["']?\)$/,'');
        }
        var colors = ['#1A1A2E','#16213E','#0F3460','#2D1B69','#003049'];
        var color = colors[Math.floor(Math.random()*colors.length)];
        btnConfirm.disabled = true;
        if (photoUrl && photoUrl.startsWith('data:')) {
          uploadToCloudinary(photoUrl, function(url) {
            createRoom(name, cat, type, type==='private'?pwd:'', url||'', color, desc);
          });
        } else {
          createRoom(name, cat, type, type==='private'?pwd:'', photoUrl, color, desc);
        }
      });
    }

    /* Mot de passe salon privé */
    var btnJoinPrivate = $('btnJoinPrivateRoom');
    if (btnJoinPrivate) {
      btnJoinPrivate.addEventListener('click', function() {
        var input = $('roomPasswordInput');
        if (!input || !pendingRoomId) return;
        if (input.value === (pendingRoomData||{}).password) {
          hide($('modalRoomPassword'));
          openRoom(pendingRoomId, pendingRoomData);
          input.value = '';
        } else {
          showToast('Mot de passe incorrect','error');
          input.value = '';
          input.focus();
        }
      });
    }
  }

  function createRoom(name, cat, type, pwd, photo, color, desc) {
    db.collection('rooms').add({
      name:          name,
      category:      cat,
      type:          type,
      password:      pwd,
      photo:         photo,
      color:         color,
      description:   desc || '',
      createdBy:     currentUser.uid,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage:   '',
      membersOnline: 0,
      totalMembers:  1
    }).then(function(ref) {
      /* Le créateur est d'office modérateur de son salon */
      db.collection('rooms').doc(ref.id).collection('mods').doc(currentUser.uid).set({
        grantedBy: currentUser.uid,
        at: firebase.firestore.FieldValue.serverTimestamp(),
        isCreator: true
      }).catch(function(){});
      /* Message épinglé de bienvenue automatique */
      var _welcomeText = '👋 Bienvenue dans ' + name + ' ! ' + (desc ? desc : 'Salon créé par la communauté SIS. Soyez respectueux et amusez-vous 🎉');
      db.collection('rooms').doc(ref.id).update({
        pinnedMsg: { id: 'welcome', text: _welcomeText.substr(0,150), author: '📌 SIS' }
      }).catch(function(){});
      /* Post de bienvenue automatique dans les canaux */
      if (type === 'channel') {
        var _hooks = [
          '\uD83D\uDD25 Tu viens de d\u00E9couvrir quelque chose de puissant\u2026',
          '\u2728 Psst \u2014 ce canal a un secret que peu de gens connaissent.',
          '\uD83D\uDE80 Bienvenue dans l\u2019\u00E9quipage. Voici ce que tu peux faire ici\u00A0:',
          '\uD83D\uDC40 Attends, t\u2019as vu les commandes cach\u00E9es de SIS\u00A0?',
          '\uD83D\uDCA1 Fun fact\u00A0: 90% des membres ignorent \u00E7a. Toi, maintenant tu sais.'
        ];
        var _hook = _hooks[Math.floor(Math.random() * _hooks.length)];
        var _lines = [
          _hook, '',
          '\uD83E\uDD16 SIS Bot est int\u00E9gr\u00E9 dans tous les salons. Tape simplement :', '',
          '\uD83D\uDCFA  /anime [titre]   \u2192 fiche compl\u00E8te (score, genres, synopsis)',
          '\uD83D\uDCD6  /manga [titre]   \u2192 manga MyAnimeList',
          '\uD83C\uDDEB\uD83C\uDDF7  /webtoon [titre] \u2192 webtoon dispo en fran\u00E7ais',
          '\uD83E\uDD17  /hug \u00B7 /pat \u00B7 /kiss \u00B7 /cry \u00B7 /wave  \u2192 GIFs anim\u00E9',
          '\uD83C\uDFAD  /waifu           \u2192 image waifu al\u00E9atoire',
          '\uD83D\uDCAA  /chuck           \u2192 blague Chuck Norris',
          '\uD83E\uDD2F  /fact            \u2192 fait insolite du jour',
          '\uD83D\uDE02  /meme            \u2192 m\u00E8me Imgflip random',
          '\uD83C\uDF7D\uFE0F  /recette [plat]  \u2192 recette avec photo & vid\u00E9o',
          '\u2753  /aide            \u2192 toutes les commandes', '',
          '\u2192 Tape / dans le chat pour voir les suggestions en live.'
        ];
        db.collection('rooms').doc(ref.id).collection('messages').add({
          type: 'text',
          text: _lines.join('\n'),
          authorId: 'sis-bot',
          authorPseudo: 'SIS Bot',
          authorEmoji: '\uD83E\uDD16',
          authorColor: '#5B8EF4',
          authorAvatarUrl: '',
          roomId: ref.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isBot: true
        }).catch(function(){});
      }

            hide($('modalCreateRoom'));
      var btnConfirm = $('btnConfirmCreateRoom');
      if (btnConfirm) btnConfirm.disabled = false;
      showToast('Salon créé !','success');
      openRoom(ref.id, { name:name, category:cat, type:type, photo:photo, color:color, description:desc||'' });
    }).catch(function(err) {
      console.error(err);
      showToast('Erreur création salon','error');
      var btnConfirm = $('btnConfirmCreateRoom');
      if (btnConfirm) btnConfirm.disabled = false;
    });
  }


  /* ══════════════════════════════════════════════════════════════
     11. OUVERTURE D'UN SALON
  ══════════════════════════════════════════════════════════════ */
  function openRoom(roomId, roomData) {
    /* Si c'est un canal, ouvrir la vue canal */
    if ((roomData||{}).type === 'channel') { openChannel(roomId, roomData); return; }

    currentRoomId   = roomId;
    currentRoomData = roomData || {};
    currentRoomMods = {};
    replyToMsg      = null;

    /* Réinitialiser le badge non-lu immédiatement */
    unreadCounts[roomId] = 0;
    var badgeEl = qs('.room-item[data-room-id="'+roomId+'"] .room-unread-badge');
    if (badgeEl) badgeEl.style.display = 'none';

    /* Charger les modérateurs du salon en temps réel */
    if (roomModsListenerOff) { roomModsListenerOff(); roomModsListenerOff = null; }
    roomModsListenerOff = db.collection('rooms').doc(roomId)
      .collection('mods').onSnapshot(function(snap) {
        currentRoomMods = {};
        snap.forEach(function(d) { currentRoomMods[d.id] = true; });
      }, function(){});

    /* Marquer salon actif dans la liste */
    qsa('.room-item').forEach(function(el) {
      el.classList.toggle('active', el.dataset.roomId === roomId);
    });

    /* Mobile : afficher la zone de chat */
    var layout = $('viewRooms') && qs('.rooms-layout');
    if (layout) layout.classList.add('chat-open');

    /* Cacher l'état vide, montrer le chat */
    hide($('chatEmptyState'));
    show($('chatHeader'));
    show($('inputBar'));
    hide($('attachMenu'));
    hide($('emojiPicker'));
    /* Réinitialiser l'état du bouton send/voice */
    var _btnS = $('btnSend'), _btnV = $('btnVoice'), _msgI = $('msgInput');
    if (_btnS)  _btnS.style.display  = 'none';
    if (_btnV)  _btnV.style.display  = '';
    if (_msgI)  _msgI.textContent    = '';

    /* Header */
    var rName  = $('chatRoomName');
    var rAvatar = $('chatRoomAvatar');
    if (rName)  rName.textContent  = roomData.name || 'Salon';
    if (rAvatar) {
      var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
      if (roomData.photo) {
        rAvatar.style.backgroundImage = 'url('+roomData.photo+')';
        rAvatar.style.backgroundSize = 'cover';
        rAvatar.style.backgroundPosition = 'center';
        rAvatar.innerHTML = '';
      } else {
        rAvatar.style.backgroundImage = '';
        rAvatar.innerHTML = catEmoji[roomData.category] || '💬';
        rAvatar.style.fontSize = '1.4rem';
        rAvatar.style.background = roomData.color || '#1A1A2E';
      }
    }
    var rTypeBadge = $('chatRoomTypeBadge');
    if (rTypeBadge) {
      rTypeBadge.innerHTML = roomData.type === 'private'
        ? '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><rect x="1.5" y="5.5" width="9" height="6" rx="1" fill="#F59E0B"/><path d="M3.5 5.5V4a2.5 2.5 0 015 0v1.5" stroke="#F59E0B" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>'
        : '';
      rTypeBadge.style.background = roomData.type === 'private' ? 'var(--bg-surface)' : 'transparent';
    }

    /* Charger l'arrière-plan */
    loadChatBackground(roomId);

    /* Init chiffrement pour ce salon */
    initEncryption(roomId);

    /* Charger les messages */
    loadMessages(roomId);

    /* Écouter les membres en ligne */
    listenRoomMembers(roomId);

    /* Charger message épinglé */
    loadPinnedMessage(roomId);

    /* Mettre à jour slow mode */
    slowModeDelay = roomData.slowMode || 0;

    /* Incrémenter membersOnline + tracker totalMembers si première visite */
    var roomRef = db.collection('rooms').doc(roomId);
    roomRef.update({
      membersOnline: firebase.firestore.FieldValue.increment(1)
    }).catch(function(){});
    /* Tracker l'utilisateur dans la sous-collection pour compter les membres uniques */
    db.collection('rooms').doc(roomId).collection('members').doc(currentUser.uid).set({
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      pseudo: currentUserData.pseudo || 'Anonyme'
    }, { merge: true }).then(function() {
      /* Mettre à jour totalMembers depuis le count de la sous-collection */
      db.collection('rooms').doc(roomId).collection('members').get().then(function(snap) {
        roomRef.update({ totalMembers: snap.size }).catch(function(){});
      }).catch(function(){});
    }).catch(function(){});
  }

  function closeRoom() {
    if (currentRoomId) {
      db.collection('rooms').doc(currentRoomId).update({
        membersOnline: firebase.firestore.FieldValue.increment(-1)
      }).catch(function(){});
      /* Retirer typing */
      stopTypingIndicator();
    }
    currentRoomId = null;
    var layout = qs('.rooms-layout');
    if (layout) layout.classList.remove('chat-open');
    hide($('chatHeader'));
    hide($('inputBar'));
    show($('chatEmptyState'));
    if (messagesListenerOff) { messagesListenerOff(); messagesListenerOff = null; }
  }

  function initChatHeader() {
    /* Retour */
    var btnBack = $('btnBackRooms');
    if (btnBack) btnBack.addEventListener('click', closeRoom);

    /* Infos salon */
    var btnInfo = $('btnRoomInfo');
    if (btnInfo) btnInfo.addEventListener('click', function(){
      if (currentRoomId) openRoomInfo(currentRoomId, currentRoomData);
    });

    /* Membres */
    var btnMembers = $('btnRoomMembers');
    if (btnMembers) btnMembers.addEventListener('click', function(){
      if (currentRoomId) openRoomMembers(currentRoomId);
    });

    /* Arrière-plan */
    var btnBg = $('btnRoomBg');
    if (btnBg) btnBg.addEventListener('click', function(){
      show($('modalChatBg'));
      initBgPanel();
    });

    /* Épinglé */
    var btnClosePinned = $('btnClosePinned');
    if (btnClosePinned) btnClosePinned.addEventListener('click', function(){ hide($('pinnedBar')); });

    /* Click sur header → infos salon */
    var headerRoom = $('chatHeaderRoom');
    if (headerRoom) headerRoom.addEventListener('click', function(){
      if (currentRoomId) openRoomInfo(currentRoomId, currentRoomData);
    });

    /* Messages épinglés */
    var btnPinnedMsg = $('btnPinnedMsg');
    if (btnPinnedMsg) {
      btnPinnedMsg.addEventListener('click', function(){
        var bar = $('pinnedBar');
        if (bar && currentRoomId) {
          bar.style.display = bar.style.display === 'none' ? '' : 'none';
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     12. MESSAGES — CHARGEMENT & RENDU
  ══════════════════════════════════════════════════════════════ */
  function loadMessages(roomId) {
    if (messagesListenerOff) { messagesListenerOff(); messagesListenerOff = null; }
    var container = $('messagesContainer');
    if (container) container.innerHTML = '';
    var lastDate = '';
    var lastAuthorId = '';
    var isFirstLoad = true;

    messagesListenerOff = db.collection('rooms').doc(roomId).collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(80)
      .onSnapshot(function(snap) {
        snap.docChanges().forEach(function(change) {
          var doc = change.doc;
          var data = doc.data();
          /* Ignorer les messages supprimés côté client (évite index Firestore composite) */
          if (change.type === 'removed') {
            removeMessageEl(doc.id);
            return;
          }
          if (change.type === 'modified') {
            updateMessageEl(doc.id, data);
            return;
          }
          if (change.type === 'added') {
            /* Sauter les messages supprimés */
            if (data.deleted) return;
            var dateStr = fmtDate(data.createdAt);
            if (dateStr !== lastDate) {
              appendDateSeparator(dateStr);
              lastDate = dateStr;
            }
            var compact = (lastAuthorId === data.authorId);
            appendMessage(doc.id, data, compact);
            lastAuthorId = data.authorId;
            /* Son de réception seulement pour les nouveaux messages en temps réel */
            if (!isFirstLoad && data.authorId !== currentUser.uid) {
              playReceiveSound();
              incrementUnread(roomId);
            }
            /* Scroll vers le bas si proche du bas */
            if (!isFirstLoad) {
              var c = $('messagesContainer');
              if (c) {
                var threshold = 200;
                var nearBottom = (c.scrollHeight - c.scrollTop - c.clientHeight) < threshold;
                if (nearBottom || data.authorId === currentUser.uid) {
                  scrollToBottom();
                }
              }
            }
          }
        });
        if (isFirstLoad) {
          isFirstLoad = false;
          scrollToBottom();
        }
        checkScrollBottom();
      }, function(err) { console.error('Messages listener:', err); });

    /* Bouton scroll to bottom */
    var btnScroll = $('btnScrollBottom');
    if (btnScroll) {
      btnScroll.addEventListener('click', scrollToBottom);
    }
    var msgContainer = $('messagesContainer');
    if (msgContainer) {
      msgContainer.addEventListener('scroll', checkScrollBottom);
    }
  }

  function appendDateSeparator(dateStr) {
    var c = $('messagesContainer');
    if (!c || !dateStr) return;
    var sep = document.createElement('div');
    sep.className = 'date-separator';
    sep.innerHTML = '<span>' + escapeHtml(dateStr) + '</span>';
    c.appendChild(sep);
  }

  function appendMessage(msgId, data, compact) {
    var c = $('messagesContainer');
    if (!c) return;
    var isOut = data.authorId === currentUser.uid;
    var wrap  = document.createElement('div');
    wrap.className = 'msg-wrap ' + (isOut ? 'out' : 'in') + (compact ? ' compact' : '');
    wrap.dataset.msgId = msgId;
    wrap.innerHTML = buildMessageHtml(msgId, data, isOut, compact);
    c.appendChild(wrap);
    /* Tap long → actions */
    wrap.addEventListener('contextmenu', function(e){ e.preventDefault(); openMsgActions(msgId, data, isOut); });
    var bubble = wrap.querySelector('.bubble');
    if (bubble) {
      var holdTimer;
      bubble.addEventListener('touchstart', function(){ holdTimer = setTimeout(function(){ openMsgActions(msgId, data, isOut); }, 600); }, { passive:true });
      bubble.addEventListener('touchend',   function(){ clearTimeout(holdTimer); }, { passive:true });
      bubble.addEventListener('touchmove',  function(){ clearTimeout(holdTimer); }, { passive:true });
    }
    /* Swipe gauche → répondre (mobile) */
    if (bubble) {
      var startX;
      bubble.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, { passive:true });
      bubble.addEventListener('touchend', function(e) {
        var dx = startX - e.changedTouches[0].clientX;
        if (dx > 70) { setReply(msgId, data); }
      }, { passive:true });
    }
    /* Réactions existantes */
    bindReactionChips(wrap, msgId);
    /* Click image */
    var img = wrap.querySelector('.bubble-image');
    if (img) {
      img.addEventListener('click', function(){ openImagePreview(img.src); });
    }
  }

  function buildMessageHtml(msgId, data, isOut, compact) {
    /* Message supprimé */
    if (data.deleted) {
      return '<div class="bubble-text" style="font-style:italic;opacity:0.5;">🗑️ Message supprimé</div>';
    }
    var author    = data.authorPseudo    || 'Inconnu';
    var emoji     = data.authorEmoji     || '';
    var color     = data.authorColor     || '#5B8EF4';
    var avatarUrl = data.authorAvatarUrl || '';
    var cert      = data.authorCertified ? certBadgeHtml() : '';
    /* Badge modérateur du salon */
    var isAuthorMod = currentRoomMods && data.authorId && currentRoomMods[data.authorId];
    var isAuthorCreator = currentRoomData && data.authorId && currentRoomData.createdBy === data.authorId;
    if (isAuthorMod) cert += '<span style="font-size:0.7rem;margin-left:3px;" title="Modérateur">🛡️</span>';
    else if (isAuthorCreator && !data.authorCertified) cert += '<span style="font-size:0.7rem;margin-left:3px;" title="Créateur du salon">👑</span>';
    var timeStr = fmtTime(data.createdAt);
    var content = '';

    if (data.type === 'image') {
      content = '<img class="bubble-image" src="'+escapeHtml(data.imageUrl||'')+'" alt="image" loading="lazy">';
      if (data.text) content += '<div class="bubble-text">'+parseMarkdown(data.text)+'</div>';
    } else if (data.type === 'voice') {
      content = buildVoiceHtml(msgId, data);
    } else if (data.type === 'poll') {
      return buildPollHtml(msgId, data);
    } else if (data.type === 'sticker') {
      content = '<img src="'+escapeHtml(data.stickerUrl||'')+'" style="max-width:120px;max-height:120px;border-radius:12px;" alt="sticker">';
    } else if (data.type === 'bot-card') {
      content = buildBotCardHtml(data);
    } else {
      /* Anciens messages chiffrés: détecter base64 → afficher placeholder */
      var rawText = data.text || '';
      if (data.encrypted && rawText && /^[A-Za-z0-9+/]{20,}={0,2}$/.test(rawText)) {
        content = '<div class="bubble-text bubble-encrypted"><svg viewBox="0 0 16 16" fill="none" width="13" height="13"><rect x="2" y="7" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg> Message chiffré (ancienne session)</div>';
      } else {
        content = '<div class="bubble-text">'+parseMarkdown(rawText)+'</div>';
      }
    }

    /* Répondre à */
    var replyHtml = '';
    if (data.replyTo) {
      replyHtml = '<div class="bubble-reply"><div class="bubble-reply-author">'+escapeHtml(data.replyTo.authorPseudo||'')+'</div><div class="bubble-reply-text">'+escapeHtml((data.replyTo.text||'').substr(0,80))+'</div></div>';
    }

    /* Meta */
    var editedHtml = data.edited ? '<span class="bubble-edited">modifié</span>' : '';
    var tickHtml = '';
    if (isOut) {
      var readCount = data.readBy ? Object.keys(data.readBy).length : 0;
      var readTitle = readCount > 0 ? 'Vu par ' + readCount + ' personne'+(readCount>1?'s':'') : 'Envoyé';
      tickHtml = '<span class="tick-double' + (data.readBy ? ' tick-read' : '') + '" data-msg-tick="'+escapeHtml(msgId)+'" title="'+readTitle+'" style="cursor:'+(readCount>0?'pointer':'default')+'">' +
        '<svg viewBox="0 0 16 8" fill="none" width="16" height="8"><path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    }
    var metaHtml = '<div class="bubble-meta">'+editedHtml+'<span>'+escapeHtml(timeStr)+'</span>'+tickHtml+'</div>';

    /* Réactions */
    var reactions = data.reactions || {};
    var reactionHtml = '';
    var reactionKeys = Object.keys(reactions);
    if (reactionKeys.length) {
      reactionHtml = '<div class="bubble-reactions">';
      var counts = {};
      reactionKeys.forEach(function(uid) { var emoji = reactions[uid]; counts[emoji] = (counts[emoji]||0)+1; });
      Object.keys(counts).forEach(function(emoji) {
        var isMine = reactions[currentUser.uid] === emoji;
        reactionHtml += '<button class="reaction-chip'+(isMine?' mine':'')+'" data-emoji="'+escapeHtml(emoji)+'" data-msgid="'+escapeHtml(msgId)+'">'+escapeHtml(emoji)+' <span>'+counts[emoji]+'</span></button>';
      });
      reactionHtml += '</div>';
    }

    var avatarHtmlStr = compact ? '<div class="msg-avatar"></div>' :
      '<div class="msg-avatar" data-uid="'+escapeHtml(data.authorId||'')+'">'+avatarHtml(author, emoji, color, 28, avatarUrl)+'</div>';
    var authorHtml = compact ? '' : '<div class="msg-author">'+escapeHtml(author)+cert+'</div>';

    return (isOut ? '' : authorHtml) +
      '<div class="msg-row">' +
        (isOut ? '' : avatarHtmlStr) +
        '<div class="bubble">' + replyHtml + content + metaHtml + '</div>' +
        (isOut ? avatarHtmlStr : '') +
      '</div>' +
      reactionHtml;
  }

  function buildVoiceHtml(msgId, data) {
    var dur = data.duration ? formatDuration(data.duration) : '0:00';
    var bars = '';
    var barCount = 20;
    for (var i = 0; i < barCount; i++) {
      var h = 8 + Math.floor(Math.random()*20);
      bars += '<span style="height:'+h+'px;"></span>';
    }
    return '<div class="bubble-voice">' +
      '<button class="voice-play-btn" data-msgid="'+escapeHtml(msgId)+'" data-url="'+escapeHtml(data.voiceUrl||'')+'">' +
        '<svg viewBox="0 0 16 16" fill="none" width="14" height="14" class="play-icon"><path d="M4 3l9 5-9 5V3z" fill="white"/></svg>' +
        '<svg viewBox="0 0 16 16" fill="none" width="14" height="14" class="pause-icon" style="display:none"><rect x="3" y="3" width="3.5" height="10" rx="1" fill="white"/><rect x="9.5" y="3" width="3.5" height="10" rx="1" fill="white"/></svg>' +
      '</button>' +
      '<div class="voice-waveform-display">'+bars+'</div>' +
      '<span class="voice-duration">'+escapeHtml(dur)+'</span>' +
    '</div>';
  }

  function buildPollHtml(msgId, data) {
    var uid = currentUser.uid;
    var votes = data.votes || {};
    var myVote = typeof votes[uid] !== 'undefined' ? votes[uid] : -1;
    var total  = Object.keys(votes).length;
    var opts   = (data.options||[]);
    var isCreator = data.createdBy === uid;
    var isRoomCreator = currentRoomData && currentRoomData.createdBy === currentUser.uid;
    var isRoomMod = currentRoomMods && currentRoomMods[currentUser.uid];
    var isAdmin = currentUserData.role === 'admin' || isRoomCreator || isRoomMod;
    var optHtml = '';
    opts.forEach(function(opt, i) {
      var count = 0;
      Object.values(votes).forEach(function(v){ if (v===i) count++; });
      var pct = total > 0 ? Math.round((count/total)*100) : 0;
      var voted = myVote === i;
      optHtml += '<div class="poll-option'+(voted?' voted':'')+(data.closed?' closed':'') +'" data-optidx="'+i+'" data-msgid="'+escapeHtml(msgId)+'">' +
        '<div class="poll-option-bar" style="width:'+pct+'%"></div>' +
        '<span class="poll-option-label">'+escapeHtml(opt)+'</span>' +
        '<span class="poll-option-pct">'+pct+'% · '+count+' vote'+(count>1?'s':'')+'</span>' +
      '</div>';
    });
    var closeBtn = (isCreator || isAdmin) && !data.closed ? '<button class="poll-close-btn" data-msgid="'+escapeHtml(msgId)+'">🔒 Clôturer le sondage</button>' : '';
    var anonTag = data.anonymous ? '<span style="font-size:0.72rem;color:var(--text-muted)">🔒 Anonyme</span>' : '';
    var closedTag = data.closed ? '<span style="font-size:0.72rem;color:#EF4444">● Clôturé</span>' : '';
    return '<div class="msg-wrap '+(data.createdBy===uid?'out':'in')+'"><div class="poll-card">' +
      '<div class="poll-header"><svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="2" y="10" width="3" height="4" rx="1" stroke="#5B8EF4" stroke-width="1.4"/><rect x="6.5" y="6" width="3" height="8" rx="1" stroke="#8B5CF6" stroke-width="1.4"/><rect x="11" y="2" width="3" height="12" rx="1" stroke="#5B8EF4" stroke-width="1.4"/></svg>' +
        '<div class="poll-question">'+escapeHtml(data.question||'Sondage')+'</div>' +
      '</div>' +
      optHtml +
      '<div class="poll-total">' + anonTag + closedTag + total + ' vote'+(total>1?'s':'') + '</div>' +
      closeBtn +
    '</div></div>';
  }

  function updateMessageEl(msgId, data) {
    var el = qs('[data-msg-id="'+msgId+'"]');
    if (!el) { el = qs('.msg-wrap[data-msg-id="'+msgId+'"]'); }
    if (!el) return;
    if (data.deleted) {
      /* Remplacer le contenu par un placeholder supprimé */
      var bubble = el.querySelector('.bubble');
      if (bubble) bubble.innerHTML = '<div class="bubble-text" style="font-style:italic;opacity:0.5;">🗑️ Message supprimé</div>';
      /* Cacher les actions */
      var actions = el.querySelector('.msg-actions');
      if (actions) actions.style.display = 'none';
      return;
    }
    var isOut = data.authorId === currentUser.uid;
    el.innerHTML = buildMessageHtml(msgId, data, isOut, el.classList.contains('compact'));
    bindReactionChips(el, msgId);
  }
  function removeMessageEl(msgId) {
    var el = qs('.msg-wrap[data-msg-id="'+msgId+'"]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function scrollToBottom() {
    var c = $('messagesContainer');
    if (c) c.scrollTop = c.scrollHeight;
    hide($('btnScrollBottom'));
  }
  function checkScrollBottom() {
    var c = $('messagesContainer');
    var btn = $('btnScrollBottom');
    if (!c || !btn) return;
    var atBottom = (c.scrollHeight - c.scrollTop - c.clientHeight) < 100;
    btn.style.display = atBottom ? 'none' : '';
  }
  function formatDuration(secs) {
    var m = Math.floor(secs/60), s = secs%60;
    return m + ':' + (s<10?'0':'')+s;
  }

  function bindReactionChips(wrap, msgId) {
    qsa('.reaction-chip', wrap).forEach(function(chip) {
      chip.addEventListener('click', function() {
        var emoji = chip.dataset.emoji;
        toggleReaction(chip.dataset.msgid || msgId, emoji);
      });
    });
    /* Tick ✓✓ → voir qui a lu */
    var tickEl = wrap.querySelector('[data-msg-tick]');
    if (tickEl && tickEl.classList.contains('tick-read')) {
      tickEl.addEventListener('click', function(e) {
        e.stopPropagation();
        openReadByModal(tickEl.dataset.msgTick);
      });
    }
    /* Vote sondage */
    qsa('.poll-option:not(.closed)', wrap).forEach(function(opt) {
      opt.addEventListener('click', function() {
        var idx = parseInt(opt.dataset.optidx, 10);
        var mid = opt.dataset.msgid || msgId;
        voteOnPoll(mid, idx);
      });
    });
    /* Clôturer sondage */
    var closeBtn = wrap.querySelector('.poll-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        closePoll(closeBtn.dataset.msgid || msgId);
      });
    }
    /* Avatar → profil */
    qsa('.msg-avatar[data-uid]', wrap).forEach(function(av) {
      var uid = av.dataset.uid;
      if (uid && uid !== currentUser.uid) {
        av.addEventListener('click', function(e) {
          e.stopPropagation();
          db.collection('users').doc(uid).get().then(function(doc) {
            if (doc.exists) openMemberProfile(uid, doc.data());
          });
        });
      }
    });
    /* Voix play — guard anti-doublon d'écouteur */
    var playBtn = wrap.querySelector('.voice-play-btn');
    if (playBtn && !playBtn.dataset.bound) {
      playBtn.dataset.bound = '1';
      var voiceAudio = null;
      playBtn.addEventListener('click', function() {
        var url = playBtn.dataset.url;
        if (!url) return;
        var playI  = playBtn.querySelector('.play-icon');
        var pauseI = playBtn.querySelector('.pause-icon');
        /* Si déjà en lecture → pause */
        if (voiceAudio && !voiceAudio.paused) {
          voiceAudio.pause();
          if (playI)  playI.style.display  = '';
          if (pauseI) pauseI.style.display = 'none';
          return;
        }
        /* Nouvelle lecture */
        voiceAudio = new Audio(url);
        ensureAudio();
        if (playI)  playI.style.display  = 'none';
        if (pauseI) pauseI.style.display = '';
        voiceAudio.play().catch(function() {
          if (playI)  playI.style.display  = '';
          if (pauseI) pauseI.style.display = 'none';
        });
        voiceAudio.addEventListener('ended', function() {
          if (playI)  playI.style.display  = '';
          if (pauseI) pauseI.style.display = 'none';
          voiceAudio = null;
        });
      });
    }
  }

  function openImagePreview(src) {
    var img = $('previewImage');
    if (img) img.src = src;
    show($('modalImagePreview'));
  }


  /* ══════════════════════════════════════════════════════════════
     13. ENVOI DE MESSAGES
  ══════════════════════════════════════════════════════════════ */
  function initInputBar() {
    var msgInput = $('msgInput');
    var btnSend  = $('btnSend');
    var btnVoice = $('btnVoice');
    var btnEmoji = $('btnEmojiPicker');
    var btnAttach = $('btnAttachMenu');
    var attachMenu = $('attachMenu');
    var emojiPicker = $('emojiPicker');

    if (!msgInput) return;

    /* Toggle send/voice */
    msgInput.addEventListener('input', function() {
      var hasText = msgInput.textContent.trim().length > 0;
      if (btnSend)  btnSend.style.display  = hasText ? '' : 'none';
      if (btnVoice) btnVoice.style.display = hasText ? 'none' : '';
      updateTyping(hasText);
      showBotCmdHints(msgInput.textContent.trim());
    });
    msgInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSendText();
      }
    });

    if (btnSend)  btnSend.addEventListener('click',  doSendText);
    if (btnVoice) btnVoice.addEventListener('click', startVoiceRecording);

    /* Emoji picker */
    if (btnEmoji) {
      btnEmoji.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (attachMenu) hide(attachMenu);
        if (!emojiPicker) return;
        var isOpen = emojiPicker.style.display !== 'none';
        if (isOpen) {
          hide(emojiPicker);
        } else {
          buildEmojiGrid($('emojiGrid'), msgInput);
          show(emojiPicker);
        }
      });
    }

    /* Attach menu (trombonne) */
    if (btnAttach) {
      btnAttach.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (emojiPicker) hide(emojiPicker);
        if (!attachMenu) return;
        var isOpen = attachMenu.style.display !== 'none';
        if (isOpen) { hide(attachMenu); } else { show(attachMenu); }
      });
    }

    /* Fermer en cliquant ailleurs — vérifier contains() pour gérer les SVG enfants */
    document.addEventListener('click', function(e) {
      if (attachMenu && attachMenu.style.display !== 'none') {
        if (!attachMenu.contains(e.target) && !btnAttach.contains(e.target)) {
          hide(attachMenu);
        }
      }
      if (emojiPicker && emojiPicker.style.display !== 'none') {
        if (!emojiPicker.contains(e.target) && !btnEmoji.contains(e.target)) {
          hide(emojiPicker);
        }
      }
    });

    /* Image */
    var btnImg = $('btnSendImage');
    var fileImg = $('fileImageInput');
    if (btnImg && fileImg) {
      btnImg.addEventListener('click', function(){ hide(attachMenu); fileImg.click(); });
      fileImg.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Image trop lourde (max 5 Mo)','error'); return; }
        hide(attachMenu);
        uploadToCloudinary(file, function(url) {
          if (url) sendMessage({ type:'image', imageUrl:url });
        });
        e.target.value = '';
      });
    }

    /* GIF */
    var btnGif = $('btnSendGif');
    if (btnGif) {
      btnGif.addEventListener('click', function(){ hide(attachMenu); show($('modalGif')); initGifSearch(); });
    }

    /* Sticker */
    var btnSticker = $('btnSendSticker');
    var fileSticker = $('fileStickerInput');
    if (btnSticker && fileSticker) {
      btnSticker.addEventListener('click', function(){ hide(attachMenu); fileSticker.click(); });
      fileSticker.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 3*1024*1024) { showToast('Sticker trop lourd (max 3 Mo)','error'); e.target.value=''; return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          uploadToCloudinary(ev.target.result, function(url) {
            if (url) sendMessage({ type:'sticker', stickerUrl:url });
          });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
    }

    /* Sondage */
    var btnPoll = $('btnCreatePoll');
    if (btnPoll) {
      btnPoll.addEventListener('click', function(){ hide(attachMenu); show($('modalCreatePoll')); initPollModal(); });
    }

    /* Annuler réponse */
    var btnCancelReply = $('btnCancelReply');
    if (btnCancelReply) {
      btnCancelReply.addEventListener('click', function(){ replyToMsg = null; hide($('replyBar')); });
    }

    /* Enregistrement vocal */
    initVoiceRecorder();
  }

  function doSendText() {
    if (!currentRoomId || !currentUser) return;
    var msgInput = $('msgInput');
    if (!msgInput) return;
    var text = msgInput.textContent.trim();
    if (!text) return;

    /* Rate limiting */
    if (!checkSlowMode()) return;

    /* Anti-spam */
    if (isSpam(text)) { showToast('Stop le spam !','warning'); return; }

    msgInput.textContent = '';
    var btnSend  = $('btnSend');
    var btnVoice = $('btnVoice');
    if (btnSend)  btnSend.style.display  = 'none';
    if (btnVoice) btnVoice.style.display = '';

    /* ── SIS Bot : commandes slash ── */
    if (text.charAt(0) === '/') {
      stopTyping();
      handleBotCommand(text);
      return;
    }

    sendMessage({ type:'text', text:text });
    stopTyping();
  }

  function sendMessage(payload) {
    if (!currentRoomId || !currentUser) return;
    var d = currentUserData;
    var msg = Object.assign({
      roomId:          currentRoomId,
      authorId:        currentUser.uid,
      authorPseudo:    d.pseudo    || 'Anonyme',
      authorEmoji:     d.emoji     || '',
      authorColor:     d.color     || '#5B8EF4',
      authorAvatarUrl: d.avatarUrl || '',
      authorCertified: !!d.certified,
      flag:            d.flag || '🌍',
      createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      edited:          false,
      deleted:         false,
      reactions:       {},
      replyTo:         replyToMsg ? {
        msgId:       replyToMsg.id,
        text:        (replyToMsg.data.text||'').substr(0,80),
        authorPseudo: replyToMsg.data.authorPseudo||''
      } : null
    }, payload);

    /* Chiffrement désactivé — clé AES locale non partagée entre utilisateurs */
    msg.encrypted = false;
    saveMessage(msg);
    replyToMsg = null;
    hide($('replyBar'));
  }

  function saveMessage(msg) {
    db.collection('rooms').doc(currentRoomId).collection('messages').add(msg)
      .then(function() {
        playSendSound();
        /* Mettre à jour dernierMessage du salon */
        var preview = msg.type === 'text' ? (msg.text||'').substr(0,60)
                    : msg.type === 'image' ? '📷 Image'
                    : msg.type === 'voice' ? '🎤 Vocal'
                    : msg.type === 'gif'   ? '🎬 GIF'
                    : msg.type === 'sticker' ? '🏷️ Sticker'
                    : msg.type === 'bot-card' ? '🤖 ' + (msg.cardLabel||'Commande bot')
                    : '📎 Fichier';
        db.collection('rooms').doc(currentRoomId).update({
          lastMessage:   preview,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
      })
      .catch(function(err){ console.error('Send msg:', err); showToast('Erreur envoi','error'); });
  }

  /* ── Slow mode ── */
  function checkSlowMode() {
    if (!slowModeDelay) return true;
    var now = Date.now();
    if (now - lastMsgTime < slowModeDelay * 1000) {
      var remaining = Math.ceil(slowModeDelay - (now - lastMsgTime)/1000);
      showToast('Slow mode : attends '+remaining+'s','warning');
      return false;
    }
    lastMsgTime = now;
    return true;
  }

  /* ── Anti-spam ── */
  var lastMsgText = '';
  var repeatCount = 0;
  function isSpam(text) {
    if (text === lastMsgText) {
      repeatCount++;
      if (repeatCount >= 3) return true;
    } else {
      lastMsgText = text; repeatCount = 0;
    }
    return false;
  }

  /* ── Typing indicator ── */
  function updateTyping(isTyping) {
    if (!currentRoomId || !currentUser) return;
    clearTimeout(typingTimeout);
    if (isTyping) {
      sendTyping(true);
      typingTimeout = setTimeout(function(){ sendTyping(false); }, 3000);
    } else {
      sendTyping(false);
    }
  }
  function sendTyping(val) {
    var update = {};
    update['typing.' + currentUser.uid] = val ? (currentUserData.pseudo || 'Quelqu\'un') : firebase.firestore.FieldValue.delete();
    db.collection('rooms').doc(currentRoomId).update(update).catch(function(){});
  }
  function stopTyping() { clearTimeout(typingTimeout); sendTyping(false); }
  function stopTypingIndicator() {
    if (!currentRoomId || !currentUser) return;
    var update = {};
    update['typing.' + currentUser.uid] = firebase.firestore.FieldValue.delete();
    db.collection('rooms').doc(currentRoomId).update(update).catch(function(){});
    if (typingListenerOff) { typingListenerOff(); typingListenerOff = null; }
  }

  function listenRoomMembers(roomId) {
    if (typingListenerOff) { typingListenerOff(); typingListenerOff = null; }
    typingListenerOff = db.collection('rooms').doc(roomId).onSnapshot(function(doc) {
      if (!doc.exists) return;
      var d = doc.data();
      /* Membres en ligne */
      var membersCount = $('chatRoomMembersCount');
      if (membersCount) membersCount.textContent = (d.membersOnline||0) + ' membre'+(d.membersOnline>1?'s':'')+' en ligne';
      /* Typing */
      var typing = d.typing || {};
      var typers = Object.keys(typing).filter(function(uid){ return uid !== currentUser.uid && typing[uid]; });
      var typerNames = typers.map(function(uid){ return typing[uid]; });
      var tyInd = $('typingIndicator');
      var tyText = $('typingText');
      if (tyInd && tyText) {
        if (typerNames.length > 0) {
          tyText.textContent = typerNames[0] + (typerNames.length > 1 ? ' et '+(typerNames.length-1)+' autre(s)' : '') + ' écrit…';
          show(tyInd);
        } else {
          hide(tyInd);
        }
      }
      /* Slow mode */
      slowModeDelay = d.slowMode || 0;
      var smBar = $('slowModeBar');
      if (smBar) smBar.style.display = slowModeDelay > 0 ? '' : 'none';

      /* Message épinglé — mise à jour temps réel */
      var pinned = d.pinnedMsg;
      var pinnedBar = $('pinnedBar');
      var pinnedText = $('pinnedText');
      if (pinnedBar && pinnedText) {
        if (pinned && pinned.text) {
          pinnedText.textContent = (pinned.author ? pinned.author + ' : ' : '') + pinned.text;
          pinnedBar.style.display = '';
        } else {
          pinnedBar.style.display = 'none';
        }
      }
    }, function(){});
  }


  /* ══════════════════════════════════════════════════════════════
     14. ACTIONS SUR MESSAGE (tap long)
  ══════════════════════════════════════════════════════════════ */
  function openMsgActions(msgId, data, isOut) {
    actionMsgId   = msgId;
    actionMsgData = data;
    var isAdmin   = currentUserData.role === 'admin';
    var isRoomMod = !!(currentRoomMods && currentUser && currentRoomMods[currentUser.uid]);
    /* L'auteur peut modifier ET supprimer son message.
       Les admins peuvent supprimer n'importe quel message mais pas modifier. */
    var canEdit   = isOut && data.type !== 'image' && data.type !== 'voice' && !data.deleted;
    var canDelete = isOut || isAdmin || isRoomMod;
    var canPin    = isAdmin || isRoomMod;
    var actionEdit   = $('actionEdit');
    var actionDelete = $('actionDelete');
    var actionPin    = $('actionPin');
    if (actionEdit)   actionEdit.style.display   = canEdit   ? '' : 'none';
    if (actionDelete) actionDelete.style.display = canDelete ? '' : 'none';
    if (actionPin)    actionPin.style.display     = canPin   ? '' : 'none';
    show($('modalMsgActions'));
    /* Reactions */
    qsa('.reaction-btn').forEach(function(btn) {
      btn.onclick = function() {
        toggleReaction(msgId, btn.dataset.emoji);
        hide($('modalMsgActions'));
      };
    });
    /* Actions */
    $('actionReply').onclick  = function() { setReply(msgId, data); hide($('modalMsgActions')); };
    $('actionCopy').onclick   = function() {
      try { navigator.clipboard.writeText(data.text||''); } catch(e){}
      showToast('Copié !','success',1500);
      hide($('modalMsgActions'));
    };
    if (actionEdit) actionEdit.onclick = function() { startEditMessage(msgId, data); hide($('modalMsgActions')); };
    if (actionDelete) actionDelete.onclick = function() { deleteMessage(msgId, isOut || isAdmin || isRoomMod); hide($('modalMsgActions')); };
    if (actionPin) actionPin.onclick = function() { pinMessage(msgId, data); hide($('modalMsgActions')); };
    $('actionReport').onclick = function() { hide($('modalMsgActions')); show($('modalReport')); initReportModal(msgId, data); };
    $('actionCancel').onclick = function() { hide($('modalMsgActions')); };
  }

  function setReply(msgId, data) {
    replyToMsg = { id: msgId, data: data };
    var bar = $('replyBar');
    var author = $('replyBarAuthor');
    var msg    = $('replyBarMsg');
    if (author) author.textContent = data.authorPseudo || 'Inconnu';
    if (msg)    msg.textContent    = (data.text||'Media').substr(0,60);
    show(bar);
    var input = $('msgInput');
    if (input) input.focus();
  }

  function toggleReaction(msgId, emoji) {
    var uid = currentUser.uid;
    var update = {};
    update['reactions.' + uid] = firebase.firestore.FieldValue.delete();
    /* Si on clique sur la même réaction, on la retire ; sinon on l'ajoute */
    db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).get().then(function(doc) {
      if (!doc.exists) return;
      var reactions = doc.data().reactions || {};
      if (reactions[uid] === emoji) {
        /* Retirer */
        db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).update(update).catch(function(){});
      } else {
        /* Ajouter */
        var add = {};
        add['reactions.' + uid] = emoji;
        db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).update(add).catch(function(){});
      }
    });
  }

  function deleteMessage(msgId, allowed) {
    if (!allowed) return;
    db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).update({ deleted: true })
      .then(function(){ showToast('Message supprimé','info',1500); })
      .catch(function(err){ showToast('Erreur suppression','error'); });
  }

  function startEditMessage(msgId, data) {
    var input = $('msgInput');
    if (!input) return;
    input.textContent = data.text || '';
    input.focus();
    var btnSend = $('btnSend');
    if (btnSend) {
      btnSend.style.display = '';
      var btnVoice = $('btnVoice');
      if (btnVoice) btnVoice.style.display = 'none';

      function cancelEdit() {
        input.textContent = '';
        btnSend.style.display = 'none';
        if (btnVoice) btnVoice.style.display = '';
        btnSend.onclick = null;
        input.removeEventListener('keydown', onKey);
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      }
      input.addEventListener('keydown', onKey);

      btnSend.onclick = function() {
        var newText = input.textContent.trim();
        if (!newText) return;
        db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId)
          .update({ text: newText, edited: true })
          .then(function(){ showToast('Modifié','success',1500); }).catch(function(){});
        cancelEdit();
      };
    }
  }

  function pinMessage(msgId, data) {
    if (!currentRoomId) return;
    db.collection('rooms').doc(currentRoomId).update({ pinnedMsg: { id:msgId, text: (data.text||'').substr(0,100), author: data.authorPseudo||'' } })
      .then(function() {
        loadPinnedMessage(currentRoomId);
        showToast('Message épinglé','success');
      });
  }

  function loadPinnedMessage(roomId) {
    db.collection('rooms').doc(roomId).get().then(function(doc) {
      if (!doc.exists) return;
      var pinned = doc.data().pinnedMsg;
      var bar = $('pinnedBar'), txt = $('pinnedText');
      if (pinned && pinned.text) {
        if (txt) txt.textContent = pinned.author + ': ' + pinned.text;
        show(bar);
      } else {
        hide(bar);
      }
    });
  }

  /* ── Signalement ── */
  function initReportModal(msgId, data) {
    var selectedReason = '';
    qsa('.report-opt').forEach(function(opt) {
      opt.classList.remove('selected');
      opt.addEventListener('click', function() {
        qsa('.report-opt').forEach(function(o){ o.classList.remove('selected'); });
        opt.classList.add('selected');
        selectedReason = opt.dataset.reason;
      });
    });
    var btnConfirm = $('btnConfirmReport');
    if (btnConfirm) {
      btnConfirm.onclick = function() {
        if (!selectedReason) { showToast('Choisis une raison','warning'); return; }
        db.collection('reports').add({
          msgId:       msgId,
          msgText:     (data.text||'').substr(0,100),
          reportedUid: data.authorId || '',
          reporterUid: currentUser.uid,
          reason:      selectedReason,
          roomId:      currentRoomId,
          createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
          status:      'pending'
        }).then(function() {
          showToast('Signalement envoyé','success');
          hide($('modalReport'));
        }).catch(function(){ showToast('Erreur signalement','error'); });
      };
    }
  }

  /* ══════════════════════════════════════════════════════════════
     15. VOCAL — ENREGISTREMENT
  ══════════════════════════════════════════════════════════════ */
  function initVoiceRecorder() {
    var btnCancelVoice = $('btnCancelVoice');
    var btnStopVoice   = $('btnStopVoice');
    if (btnCancelVoice) btnCancelVoice.addEventListener('click', cancelVoiceRecording);
    if (btnStopVoice)   btnStopVoice.addEventListener('click', stopAndSendVoice);
  }

  function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Micro non disponible','error'); return;
    }
    navigator.mediaDevices.getUserMedia({ audio:true }).then(function(stream) {
      isRecording = true;
      audioChunks = [];
      voiceSeconds = 0;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = function(e) { if (e.data.size>0) audioChunks.push(e.data); };
      mediaRecorder.start(100);
      /* Afficher interface recorder */
      hide($('inputBar'));
      show($('voiceRecorder'));
      /* Timer */
      voiceTimer = setInterval(function() {
        voiceSeconds++;
        var t = $('voiceTimer');
        if (t) t.textContent = formatDuration(voiceSeconds);
        animateVoiceWaveform();
        if (voiceSeconds >= 120) stopAndSendVoice();
      }, 1000);
    }).catch(function(){ showToast('Accès micro refusé','error'); });
  }

  function animateVoiceWaveform() {
    var wf = $('voiceWaveform');
    if (!wf) return;
    wf.innerHTML = '';
    for (var i = 0; i < 24; i++) {
      var span = document.createElement('span');
      var h = 6 + Math.floor(Math.random()*26);
      span.style.height = h + 'px';
      span.style.animationDelay = (i*0.04) + 's';
      wf.appendChild(span);
    }
  }

  function stopAndSendVoice() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    clearInterval(voiceTimer);
    mediaRecorder.stop();
    var duration = voiceSeconds;
    mediaRecorder.onstop = function() {
      var blob = new Blob(audioChunks, { type:'audio/webm' });
      /* Upload vers Cloudinary */
      var reader = new FileReader();
      reader.onload = function(e) {
        var base64 = e.target.result;
        uploadVoiceToCloudinary(base64, function(url) {
          if (url) {
            sendMessage({ type:'voice', voiceUrl:url, duration:duration });
          }
        });
      };
      reader.readAsDataURL(blob);
      /* Arrêter les tracks micro */
      mediaRecorder.stream.getTracks().forEach(function(t){ t.stop(); });
    };
    hide($('voiceRecorder'));
    show($('inputBar'));
  }

  function cancelVoiceRecording() {
    if (mediaRecorder) {
      try { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
    }
    isRecording = false;
    clearInterval(voiceTimer);
    hide($('voiceRecorder'));
    show($('inputBar'));
  }

  function uploadVoiceToCloudinary(dataUrl, cb) {
    uploadToCloudinary(dataUrl, cb, 'auto');
  }

  /* ══════════════════════════════════════════════════════════════
     16. UPLOAD CLOUDINARY
  ══════════════════════════════════════════════════════════════ */
  function uploadToCloudinary(input, cb, resourceType) {
    resourceType = resourceType || 'image';
    var fd = new FormData();
    fd.append('upload_preset', CLOUDINARY_PRESET);

    /* Accepte File/Blob direct OU dataUrl base64 (converti en Blob) */
    if (input instanceof File || input instanceof Blob) {
      fd.append('file', input);
      _doCloudinaryUpload(fd, resourceType, cb);
    } else if (typeof input === 'string' && input.startsWith('data:')) {
      try {
        var parts = input.split(',');
        var mime  = parts[0].match(/:(.*?);/)[1];
        var raw   = atob(parts[1]);
        var buf   = new Uint8Array(raw.length);
        for (var k = 0; k < raw.length; k++) buf[k] = raw.charCodeAt(k);
        var blob  = new Blob([buf], { type: mime });
        var ext   = (mime.split('/')[1] || 'bin').split(';')[0];
        fd.append('file', blob, 'upload.' + ext);
      } catch(e) {
        fd.append('file', input); /* fallback brut */
      }
      _doCloudinaryUpload(fd, resourceType, cb);
    } else {
      fd.append('file', input);
      _doCloudinaryUpload(fd, resourceType, cb);
    }
  }

  function _doCloudinaryUpload(fd, resourceType, cb) {
    showToast('Envoi en cours…','info',15000);
    /* Toujours utiliser 'auto' pour laisser Cloudinary détecter le type */
    var url = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_NAME + '/auto/upload';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var res = JSON.parse(xhr.responseText);
          showToast('Envoyé !','success',1500);
          cb(res.secure_url || res.url || null);
        } catch(e){ cb(null); showToast('Erreur upload','error'); }
      } else {
        cb(null);
        try {
          var errJson = JSON.parse(xhr.responseText);
          var errMsg = (errJson.error && errJson.error.message) || '';
          console.error('Cloudinary error', xhr.status, errMsg);
          if (errMsg.toLowerCase().indexOf('unsigned') !== -1 || errMsg.toLowerCase().indexOf('preset') !== -1) {
            showToast('⚠️ Cloudinary : ton preset "'+CLOUDINARY_PRESET+'" doit être UNSIGNED (dashboard Cloudinary → Settings → Upload presets)','error', 9000);
          } else {
            showToast('Erreur upload ('+xhr.status+'): '+errMsg,'error',6000);
          }
        } catch(e2){
          showToast('Erreur upload ('+xhr.status+')','error');
        }
      }
    };
    xhr.onerror = function(){ cb(null); showToast('Erreur réseau','error'); };
    xhr.send(fd);
  }

  /* ══════════════════════════════════════════════════════════════
     17. RECHERCHE GIF — TENOR
  ══════════════════════════════════════════════════════════════ */
  var gifSearchTimer;
  function initGifSearch() {
    var gifSearch = $('gifSearch');
    if (!gifSearch) return;
    gifSearch.value = '';
    gifSearch.focus();
    searchGifs('trending');
    gifSearch.addEventListener('input', function() {
      clearTimeout(gifSearchTimer);
      gifSearchTimer = setTimeout(function() {
        searchGifs(gifSearch.value.trim() || 'trending');
      }, 400);
    });
  }

  function searchGifs(query) {
    var grid = $('gifGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="gif-empty"><p>Chargement…</p></div>';
    if (TENOR_KEY === 'VOTRE_CLE_TENOR') {
      grid.innerHTML = '<div class="gif-empty"><p>Configure ta clé Tenor dans le code</p></div>';
      return;
    }
    var url = 'https://tenor.googleapis.com/v2/search?q='+encodeURIComponent(query)+'&key='+TENOR_KEY+'&limit=20&media_filter=gif';
    fetch(url).then(function(r){ return r.json(); }).then(function(data) {
      grid.innerHTML = '';
      var results = (data.results||[]);
      if (!results.length) { grid.innerHTML = '<div class="gif-empty"><p>Aucun GIF trouvé</p></div>'; return; }
      results.forEach(function(gif) {
        var url = (((gif.media_formats||{}).gif||{}).url) || (((gif.media_formats||{}).tinygif||{}).url) || '';
        if (!url) return;
        var item = document.createElement('div');
        item.className = 'gif-item';
        item.innerHTML = '<img src="'+escapeHtml(url)+'" alt="gif" loading="lazy">';
        item.addEventListener('click', function() {
          sendMessage({ type:'gif', gifUrl:url });
          hide($('modalGif'));
        });
        grid.appendChild(item);
      });
    }).catch(function(){ grid.innerHTML = '<div class="gif-empty"><p>Erreur de chargement</p></div>'; });
  }

  /* ══════════════════════════════════════════════════════════════
     18. SONDAGES
  ══════════════════════════════════════════════════════════════ */
  function initPollModal() {
    /* Ajouter option */
    var btnAdd = $('btnAddPollOption');
    var optsCont = $('pollOptions');
    if (btnAdd && optsCont) {
      btnAdd.onclick = function() {
        var count = qsa('.poll-opt-input', optsCont).length;
        if (count >= 10) { showToast('Max 10 options','warning'); return; }
        var row = document.createElement('div');
        row.className = 'poll-option-row';
        row.innerHTML = '<input type="text" class="field-input poll-opt-input" placeholder="Option '+(count+1)+'" maxlength="80">'+
          '<button class="icon-btn poll-remove-opt"><svg viewBox="0 0 14 14" fill="none" width="14" height="14"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
        row.querySelector('.poll-remove-opt').addEventListener('click', function(){ row.parentNode.removeChild(row); });
        optsCont.appendChild(row);
      };
    }
    /* Boutons de suppression initiaux */
    qsa('.poll-remove-opt').forEach(function(btn) {
      btn.addEventListener('click', function(){
        var row = btn.closest('.poll-option-row');
        if (row && qsa('.poll-option-row').length > 2) row.parentNode.removeChild(row);
      });
    });
    /* Soumettre */
    var btnSubmit = $('btnSubmitPoll');
    if (btnSubmit) {
      btnSubmit.onclick = function() {
        var question = ($('pollQuestion')||{value:''}).value.trim();
        if (!question) { showToast('Entre une question','warning'); return; }
        var opts = [];
        qsa('.poll-opt-input').forEach(function(input) { var v = input.value.trim(); if (v) opts.push(v); });
        if (opts.length < 2) { showToast('Au moins 2 options','warning'); return; }
        var anonymous = ($('pollAnonymous')||{checked:false}).checked;
        sendMessage({
          type: 'poll',
          question: question,
          options: opts,
          votes: {},
          anonymous: anonymous,
          closed: false
        });
        hide($('modalCreatePoll'));
        if ($('pollQuestion')) $('pollQuestion').value = '';
        if ($('pollAnonymous')) $('pollAnonymous').checked = false;
      };
    }
  }

  function voteOnPoll(msgId, optIndex) {
    if (!currentUser) return;
    db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).get().then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data();
      if (data.closed) { showToast('Sondage clôturé','warning'); return; }
      var votes = data.votes || {};
      var update = {};
      update['votes.' + currentUser.uid] = optIndex;
      db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).update(update).catch(function(){});
    });
  }

  function closePoll(msgId) {
    db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).update({ closed: true })
      .then(function(){ showToast('Sondage clôturé','info'); }).catch(function(){});
  }

  /* ══════════════════════════════════════════════════════════════
     19. ARRIÈRE-PLAN DU CHAT
  ══════════════════════════════════════════════════════════════ */
  function loadChatBackground(roomId) {
    try {
      var type = localStorage.getItem('sis_bg_type_'+roomId);
      var val  = localStorage.getItem('sis_bg_'+roomId);
      applyChatBackground(type, val, roomId);
    } catch(e){}
  }

  function applyChatBackground(type, value, roomId) {
    var bg = $('chatBackground');
    if (!bg) return;
    bg.style.backgroundImage = '';
    bg.style.background = '';
    if (!type || type === 'default') return;
    if (type === 'color') {
      bg.style.background = value;
    } else if (type === 'gradient') {
      bg.style.background = value;
    } else if (type === 'pattern') {
      bg.style.background = value;
    } else if (type === 'custom') {
      bg.style.backgroundImage = 'url('+value+')';
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
      try {
        var opacity = localStorage.getItem('sis_bg_opacity_'+roomId) || 100;
        var blur    = localStorage.getItem('sis_bg_blur_'+roomId) || 0;
        bg.style.opacity = opacity/100;
        bg.style.filter  = 'blur('+blur+'px)';
      } catch(e){}
    }
  }

  function initBgPanel() {
    /* Tabs */
    qsa('.bg-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        qsa('.bg-tab').forEach(function(t){ t.classList.remove('active'); });
        qsa('.bg-panel').forEach(function(p){ p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = $('bgPanel' + tab.dataset.bgtab.charAt(0).toUpperCase() + tab.dataset.bgtab.slice(1));
        if (panel) panel.classList.add('active');
      });
    });

    /* Couleurs */
    var colorGrid = $('bgColorGrid');
    if (colorGrid && !colorGrid.innerHTML) {
      BG_COLORS.forEach(function(c) {
        var sw = document.createElement('div');
        sw.className = 'bg-swatch';
        sw.style.background = c;
        sw.addEventListener('click', function() {
          qsa('.bg-swatch').forEach(function(s){ s.classList.remove('selected'); });
          sw.classList.add('selected');
          selectedBgType = 'color'; selectedBgValue = c;
          var prev = $('bgPreview');
          if (prev) prev.style.background = c;
        });
        colorGrid.appendChild(sw);
      });
    }

    /* Dégradés */
    var gradGrid = $('bgGradientGrid');
    if (gradGrid && !gradGrid.innerHTML) {
      BG_GRADIENTS.forEach(function(g) {
        var sw = document.createElement('div');
        sw.className = 'bg-swatch';
        sw.style.background = g;
        sw.addEventListener('click', function() {
          qsa('.bg-swatch').forEach(function(s){ s.classList.remove('selected'); });
          sw.classList.add('selected');
          selectedBgType = 'gradient'; selectedBgValue = g;
          var prev = $('bgPreview');
          if (prev) prev.style.background = g;
        });
        gradGrid.appendChild(sw);
      });
    }

    /* Motifs */
    var patternGrid = $('bgPatternGrid');
    if (patternGrid && !patternGrid.innerHTML) {
      BG_PATTERNS.forEach(function(pat) {
        var sw = document.createElement('div');
        sw.className = 'bg-swatch';
        sw.style.background = '#1A1A2E';
        sw.style.backgroundImage = pat.css.split(',')[0];
        sw.title = pat.label;
        sw.addEventListener('click', function() {
          qsa('.bg-swatch').forEach(function(s){ s.classList.remove('selected'); });
          sw.classList.add('selected');
          selectedBgType = 'pattern'; selectedBgValue = pat.css;
          var prev = $('bgPreview');
          if (prev) { prev.style.background = '#1A1A2E'; prev.style.backgroundImage = pat.css; }
        });
        patternGrid.appendChild(sw);
      });
    }

    /* Galerie import */
    var btnGallery = $('btnBgGallery');
    var fileInput  = $('bgFileInput');
    var controls   = $('bgCustomControls');
    if (btnGallery && fileInput) {
      btnGallery.addEventListener('click', function(){ fileInput.click(); });
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Image trop lourde (max 5 Mo)','error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          var dataUrl = ev.target.result;
          var prev = $('bgPreview');
          if (prev) { prev.style.backgroundImage = 'url('+dataUrl+')'; prev.style.backgroundSize = 'cover'; }
          selectedBgType = 'custom'; selectedBgValue = dataUrl;
          show(controls);
          try {
            localStorage.setItem('sis_bg_custom_'+currentRoomId, dataUrl);
            localStorage.setItem('sis_bg_type_'+currentRoomId, 'custom');
          } catch(e){ showToast('Stockage insuffisant','error'); }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
    }

    /* Sliders */
    var opacitySlider = $('bgOpacitySlider');
    var blurSlider    = $('bgBlurSlider');
    var opacityVal    = $('bgOpacityVal');
    var blurVal       = $('bgBlurVal');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', function() {
        if (opacityVal) opacityVal.textContent = opacitySlider.value+'%';
        try { localStorage.setItem('sis_bg_opacity_'+currentRoomId, opacitySlider.value); } catch(e){}
      });
    }
    if (blurSlider) {
      blurSlider.addEventListener('input', function() {
        if (blurVal) blurVal.textContent = blurSlider.value+'px';
        try { localStorage.setItem('sis_bg_blur_'+currentRoomId, blurSlider.value); } catch(e){}
      });
    }

    /* Supprimer custom */
    var btnRemoveBg = $('btnRemoveBgCustom');
    if (btnRemoveBg) {
      btnRemoveBg.addEventListener('click', function() {
        selectedBgType = 'default'; selectedBgValue = '';
        var prev = $('bgPreview');
        if (prev) { prev.style.backgroundImage = ''; prev.style.background = ''; }
        hide(controls);
        try {
          localStorage.removeItem('sis_bg_custom_'+currentRoomId);
          localStorage.removeItem('sis_bg_type_'+currentRoomId);
          localStorage.removeItem('sis_bg_'+currentRoomId);
        } catch(e){}
        applyChatBackground('default', '', currentRoomId);
      });
    }

    /* Appliquer */
    var btnApplyBg = $('btnApplyBg');
    if (btnApplyBg) {
      btnApplyBg.onclick = function() {
        if (!selectedBgType || selectedBgType === 'default') {
          try { localStorage.removeItem('sis_bg_type_'+currentRoomId); localStorage.removeItem('sis_bg_'+currentRoomId); } catch(e){}
          applyChatBackground('default', '', currentRoomId);
        } else {
          try {
            localStorage.setItem('sis_bg_type_'+currentRoomId, selectedBgType);
            if (selectedBgType !== 'custom') localStorage.setItem('sis_bg_'+currentRoomId, selectedBgValue);
          } catch(e){}
          applyChatBackground(selectedBgType, selectedBgValue, currentRoomId);
        }
        hide($('modalChatBg'));
        showToast('Fond appliqué','success',1500);
      };
    }
  }


  /* ══════════════════════════════════════════════════════════════
     20. INFOS SALON & MEMBRES
  ══════════════════════════════════════════════════════════════ */
  function openRoomInfo(roomId, roomData) {
    /* Toujours récupérer les données fraîches depuis Firestore */
    db.collection('rooms').doc(roomId).get().then(function(snap) {
      var d = snap.exists ? snap.data() : (roomData || {});

      var rName  = $('roomInfoName');
      var rAvatar = $('roomInfoAvatar');
      if (rName)   rName.textContent  = d.name || 'Salon';
      if (rAvatar) {
        var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
        if (d.photo) {
          rAvatar.style.backgroundImage = 'url('+d.photo+')';
          rAvatar.style.backgroundSize  = 'cover';
          rAvatar.innerHTML = '';
        } else {
          rAvatar.innerHTML = catEmoji[d.category] || '💬';
          rAvatar.style.backgroundImage = '';
          rAvatar.style.background = d.color || '#1A1A2E';
          rAvatar.style.fontSize = '2rem';
        }
      }

      var rCat  = $('roomInfoCategory');
      var rType = $('roomInfoType');
      var rMbrs = $('roomInfoMembers');
      if (rCat)  rCat.textContent  = '📁 ' + (d.category || 'general');
      if (rType) rType.textContent = d.type === 'private' ? '🔒 Privé' : '🌐 Public';
      /* Membres en ligne + total */
      var totalM = d.totalMembers || d.membersOnline || 0;
      var onlineM = d.membersOnline || 0;
      if (rMbrs) rMbrs.textContent = '👥 ' + totalM + ' membre' + (totalM>1?'s':'') + ' · ' + onlineM + ' en ligne';

      /* Description */
      var descEl = $('roomInfoDescription');
      var btnEditDesc = $('btnEditRoomDesc');
      if (descEl) {
        if (d.description) {
          descEl.textContent = d.description;
          descEl.style.display = '';
        } else {
          descEl.style.display = 'none';
        }
      }
      var canEdit = currentUserData.role === 'admin' || d.createdBy === currentUser.uid;
      if (btnEditDesc) {
        btnEditDesc.style.display = canEdit ? '' : 'none';
        btnEditDesc.onclick = function() {
          hide($('modalRoomInfo'));
          var inp = $('editRoomDescInput');
          if (inp) { inp.value = d.description || ''; updateCharCounter('editRoomDescInput','editDescCounter',200); }
          var btnSave = $('btnSaveRoomDesc');
          if (btnSave) {
            btnSave.onclick = function() {
              var newDesc = (inp ? inp.value.trim() : '');
              db.collection('rooms').doc(roomId).update({ description: newDesc })
                .then(function() {
                  showToast('Description mise à jour ✅','success');
                  hide($('modalEditRoomDesc'));
                  /* Rafraîchir */
                  currentRoomData.description = newDesc;
                  openRoomInfo(roomId, currentRoomData);
                }).catch(function(){ showToast('Erreur','error'); });
            };
          }
          show($('modalEditRoomDesc'));
        };
      }

      /* Médias */
      var mediaGrid = $('roomMediaGrid');
      if (mediaGrid) {
        mediaGrid.innerHTML = '';
        db.collection('rooms').doc(roomId).collection('messages').where('type','==','image').orderBy('createdAt','desc').limit(12).get()
          .then(function(snap) {
            if (snap.empty) { mediaGrid.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;">Aucun média</span>'; return; }
            snap.forEach(function(doc) {
              var imgUrl = doc.data().imageUrl;
              if (!imgUrl) return;
              var item = document.createElement('div');
              item.className = 'room-media-item';
              item.innerHTML = '<img src="'+escapeHtml(imgUrl)+'" alt="media" loading="lazy">';
              item.addEventListener('click', function(){ openImagePreview(imgUrl); });
              mediaGrid.appendChild(item);
            });
          }).catch(function(){});
      }

      /* Partage stylisé */
      var btnShare = $('btnShareRoom');
      if (btnShare) {
        btnShare.onclick = function() {
          hide($('modalRoomInfo'));
          openShareModal(roomId, d);
        };
      }

      /* Slow mode */
      var slowCtrl = $('slowModeControl');
      if (slowCtrl) {
        var isAdm = currentUserData.role === 'admin' || currentUserData.role === 'mod' || d.createdBy === currentUser.uid;
        slowCtrl.style.display = isAdm ? '' : 'none';
        if (isAdm) {
          var smSelect = $('slowModeSelect');
          var btnApplySM = $('btnApplySlowMode');
          if (smSelect) smSelect.value = String(d.slowMode || 0);
          if (btnApplySM) {
            btnApplySM.onclick = function() {
              var val = smSelect ? parseInt(smSelect.value, 10) : 0;
              db.collection('rooms').doc(roomId).update({ slowMode: val })
                .then(function(){ showToast('Slow mode mis à jour', 'success'); })
                .catch(function(){ showToast('Erreur slow mode', 'error'); });
            };
          }
        }
      }

      show($('modalRoomInfo'));
    }).catch(function(){ show($('modalRoomInfo')); });
  }

  /* ── Partage stylisé ── */
  function openShareModal(roomId, d) {
    var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
    var link = 'https://sis-say-it-safely-pi.vercel.app/chatanonyme.html?room='+roomId;

    /* Remplir la carte */
    var avatar = $('shareCardAvatar');
    if (avatar) {
      if (d.photo) {
        avatar.style.backgroundImage = 'url('+d.photo+')';
        avatar.style.backgroundSize = 'cover';
        avatar.innerHTML = '';
      } else {
        avatar.style.backgroundImage = '';
        avatar.style.background = d.color || '#1A1A2E';
        avatar.textContent = catEmoji[d.category] || '💬';
      }
    }
    var nameEl = $('shareCardName');
    if (nameEl) nameEl.textContent = d.name || 'Salon';
    var metaEl = $('shareCardMeta');
    if (metaEl) metaEl.textContent = (catEmoji[d.category]||'📁')+' '+(d.category||'général')+' · '+(d.type==='private'?'🔒 Privé':'🌐 Public')+' · '+(d.membersOnline||0)+' en ligne';
    var descEl2 = $('shareCardDesc');
    if (descEl2) {
      descEl2.textContent = d.description || 'Rejoins ce salon sur SIS !';
      descEl2.style.display = '';
    }
    var linkInput = $('shareLinkInput');
    if (linkInput) linkInput.value = link;

    /* Copier */
    var btnCopy = $('btnCopyShareLink');
    if (btnCopy) {
      btnCopy.onclick = function() {
        try { navigator.clipboard.writeText(link); showToast('Lien copié !','success'); } catch(e){}
      };
    }

    /* Partager natif (mobile) */
    var btnNative = $('btnNativeShare');
    if (btnNative) {
      if (navigator.share) {
        btnNative.style.display = '';
        btnNative.onclick = function() {
          navigator.share({
            title: d.name || 'Salon SIS',
            text: (d.description || 'Rejoins ce salon sur SIS !'),
            url: link
          }).catch(function(){});
        };
      } else {
        btnNative.style.display = 'none';
      }
    }

    show($('modalShareRoom'));
  }

  /* ── Qui a lu ── */
  function openReadByModal(msgId) {
    if (!currentRoomId || !msgId) return;
    var listEl = $('readByList');
    if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Chargement…</div>';
    show($('modalReadBy'));
    db.collection('rooms').doc(currentRoomId).collection('messages').doc(msgId).get()
      .then(function(snap) {
        if (!snap.exists || !listEl) return;
        var readBy = snap.data().readBy || {};
        var uids = Object.keys(readBy);
        if (!uids.length) {
          listEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Personne n\'a encore lu ce message</div>';
          return;
        }
        listEl.innerHTML = '';
        Promise.all(uids.map(function(uid){ return db.collection('users').doc(uid).get(); }))
          .then(function(docs) {
            listEl.innerHTML = '';
            docs.forEach(function(doc) {
              if (!doc.exists) return;
              var u = doc.data();
              var item = document.createElement('div');
              item.className = 'read-by-item';
              item.innerHTML =
                '<div class="read-by-avatar">'+avatarHtml(u.pseudo, u.emoji, u.color, 36, u.avatarUrl)+'</div>'+
                '<div class="read-by-name">'+escapeHtml(u.pseudo||'Anonyme')+(u.certified?certBadgeHtml():'')+'</div>'+
                '<div class="read-by-flag">'+(u.flag||'🌍')+'</div>';
              listEl.appendChild(item);
            });
          });
      }).catch(function(){
        if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Erreur</div>';
      });
  }

  /* ── Compteur caractères textarea ── */
  function updateCharCounter(inputId, counterId, max) {
    var inp = $(inputId);
    var ctr = $(counterId);
    if (!inp || !ctr) return;
    ctr.textContent = inp.value.length + '/' + max;
    inp.addEventListener('input', function() { ctr.textContent = inp.value.length + '/' + max; });
  }

  function openRoomMembers(roomId) {
    var list = $('membersList');
    var title = $('membersModalTitle');
    if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Chargement…</div>';
    show($('modalMembers'));

    /* Récupérer le total depuis le doc du salon */
    db.collection('rooms').doc(roomId).get().then(function(roomSnap) {
      var roomD = roomSnap.exists ? roomSnap.data() : {};
      var totalM = roomD.totalMembers || roomD.membersOnline || 0;
      var onlineM = roomD.membersOnline || 0;
      if (title) title.textContent = 'Membres · ' + totalM + ' (' + onlineM + ' en ligne)';
    }).catch(function(){});

    db.collection('users').where('status','in',['online','away']).limit(50).get().then(function(snap) {
      if (!list) return;
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Aucun membre</div>'; return; }
      snap.forEach(function(doc) {
        var u = doc.data();
        var uid = doc.id;
        var item = document.createElement('div');
        item.className = 'member-item';
        var certBadge = u.certified ? certBadgeHtml() : '';
        var roleLabel = u.role === 'admin' ? '⭐ Admin' : u.role === 'mod' ? '🛡️ Mod' : '';
        item.innerHTML =
          '<div class="member-avatar">' + avatarHtml(u.pseudo, u.emoji, u.color, 40, u.avatarUrl) + '</div>' +
          '<div class="member-info">' +
            '<div class="member-name">' + escapeHtml(u.pseudo||'Anonyme') + certBadge + '</div>' +
            '<div class="member-role">' + (u.flag||'🌍') + ' ' + (u.country||'') + (roleLabel ? ' · '+roleLabel : '') + '</div>' +
          '</div>' +
          '<div class="online-dot" style="background:'+statusColor(u.status)+'"></div>';
        item.addEventListener('click', function(){ openMemberProfile(uid, u); });
        list.appendChild(item);
      });
    }).catch(function(){ if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Erreur de chargement</div>'; });

    /* Recherche membres */
    var memberSearch = $('memberSearch');
    if (memberSearch) {
      memberSearch.addEventListener('input', function() {
        var q = memberSearch.value.toLowerCase();
        qsa('.member-item', list).forEach(function(item) {
          var name = (item.querySelector('.member-name')||{textContent:''}).textContent.toLowerCase();
          item.style.display = name.includes(q) ? '' : 'none';
        });
      });
    }
  }

  function openMemberProfile(uid, userData) {
    var u = userData || {};
    var av = $('memberProfileAvatar');
    if (av) { av.innerHTML = ''; av.appendChild(makeAvatarEl(u.pseudo, u.emoji, u.color, 64, u.avatarUrl)); }
    var nameEl = $('memberProfileName');
    if (nameEl) {
      nameEl.innerHTML = escapeHtml(u.pseudo||'Anonyme') + (u.certified ? certBadgeHtml() : '');
    }
    /* memberProfileCert intégré dans nameEl — pas d'élément séparé */
    var roleEl = $('memberProfileRole');
    if (roleEl) roleEl.textContent = u.role === 'admin' ? '⭐ Administrateur' : u.role === 'mod' ? '🛡️ Modérateur' : '';
    var statusEl = $('memberProfileStatus');
    if (statusEl) {
      var statLabels = { online:'En ligne', away:'Absent', dnd:'Ne pas déranger', offline:'Hors ligne' };
      statusEl.innerHTML = '<div style="width:7px;height:7px;border-radius:50%;background:'+statusColor(u.status)+';flex-shrink:0;"></div>' + escapeHtml(statLabels[u.status]||'');
    }
    var countryEl = $('memberProfileCountry');
    if (countryEl) countryEl.textContent = (u.flag||'🌍') + ' ' + (u.country||'');

    /* DM */
    var btnDm = $('btnSendDmToMember');
    if (btnDm) {
      btnDm.onclick = function() {
        hide($('modalMemberProfile'));
        /* Naviguer vers l'onglet DM avant d'ouvrir la conversation */
        showView('dms');
        syncNavBtns('dms');
        openDm(uid, u);
      };
    }
    /* Signaler */
    var btnReport = $('btnReportMember');
    if (btnReport) {
      btnReport.onclick = function() {
        hide($('modalMemberProfile'));
        show($('modalReport'));
        initReportModal('user_'+uid, { authorId:uid, authorPseudo:u.pseudo, text:'Profil utilisateur' });
      };
    }
    /* Badge certifié */
    var certEl = $('memberProfileCert');
    if (certEl) certEl.style.display = u.certified ? 'inline-flex' : 'none';

    /* ── Bouton modérateur de salon ── */
    var _oldModBtn = $('btnMakeRoomMod');
    if (_oldModBtn && _oldModBtn.parentNode) _oldModBtn.parentNode.removeChild(_oldModBtn);
    var _isRoomCreator = currentRoomId && currentRoomData && currentRoomData.createdBy === currentUser.uid;
    var _isGlobalAdmin = currentUserData.role === 'admin';
    if ((_isRoomCreator || _isGlobalAdmin) && uid !== currentUser.uid && currentRoomId) {
      var _isMod = !!(currentRoomMods && currentRoomMods[uid]);
      var _modBtn = document.createElement('button');
      _modBtn.id = 'btnMakeRoomMod';
      _modBtn.style.cssText = 'margin-top:10px;width:100%;padding:10px 16px;border-radius:999px;font-weight:600;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border:none;transition:opacity 0.2s;';
      if (_isMod) {
        _modBtn.style.background = 'rgba(239,68,68,0.15)';
        _modBtn.style.color = '#EF4444';
        _modBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10 4.9 11.5l.6-3.5L3 5.5 6.5 5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Retirer le statut modérateur';
      } else {
        _modBtn.style.background = 'linear-gradient(135deg,#5B8EF4,#8B5CF6)';
        _modBtn.style.color = '#fff';
        _modBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10 4.9 11.5l.6-3.5L3 5.5 6.5 5z" fill="currentColor"/></svg>Nommer modérateur 🛡️';
      }
      _modBtn.onclick = function() {
        _modBtn.disabled = true;
        var _modsRef = db.collection('rooms').doc(currentRoomId).collection('mods');
        var _p = _isMod ? _modsRef.doc(uid).delete()
          : _modsRef.doc(uid).set({ grantedBy: currentUser.uid, at: firebase.firestore.FieldValue.serverTimestamp() });
        _p.then(function() {
          var _msg = _isMod
            ? (u.pseudo||'Membre') + " n'est plus modérateur"
            : (u.pseudo||'Membre') + ' est maintenant modérateur 🛡️';
          showToast(_msg, 'success');
          hide($('modalMemberProfile'));
        }).catch(function(err){ console.error(err); showToast('Erreur', 'error'); _modBtn.disabled = false; });
      };
      var _actDiv = $('btnReportMember') && $('btnReportMember').parentNode;
      if (_actDiv) _actDiv.appendChild(_modBtn);
    }

    /* setTimeout évite que le document click ferme la modal au même tick */
    setTimeout(function() { show($('modalMemberProfile')); }, 10);
  }

  /* ══════════════════════════════════════════════════════════════
     21. MESSAGES PRIVÉS (DM)
  ══════════════════════════════════════════════════════════════ */
  function initDmsView() {
    /* Recherche dans la liste DM */
    var dmSearchInput = $('dmSearch');
    if (dmSearchInput) {
      dmSearchInput.addEventListener('input', function() {
        var q = dmSearchInput.value.toLowerCase();
        qsa('.dm-item').forEach(function(item) {
          var name = (item.querySelector('.dm-item-name')||{textContent:''}).textContent.toLowerCase();
          item.style.display = name.includes(q) ? '' : 'none';
        });
      });
    }
    loadDmList();
  }

  /* ─── Listener temps réel de la liste DM ─── */
  function loadDmList() {
    if (dmsListenerOff) { dmsListenerOff(); dmsListenerOff = null; }
    var list   = $('dmsList');
    var emptyEl = $('emptyDms');
    if (!list) return;

    dmsListenerOff = db.collection('dms')
      .where('members', 'array-contains', currentUser.uid)
      .onSnapshot(function(snap) {
        /* Supprimer uniquement les items existants, pas l'élément empty */
        qsa('.dm-item', list).forEach(function(el){ el.parentNode.removeChild(el); });

        if (snap.empty) {
          if (emptyEl) show(emptyEl);
          return;
        }
        if (emptyEl) hide(emptyEl);

        /* Trier côté client par lastMessageAt desc (évite index composite Firestore) */
        var docs = [];
        snap.forEach(function(doc){ docs.push(doc); });
        docs.sort(function(a, b) {
          var ta = (a.data().lastMessageAt && a.data().lastMessageAt.toMillis) ? a.data().lastMessageAt.toMillis() : 0;
          var tb = (b.data().lastMessageAt && b.data().lastMessageAt.toMillis) ? b.data().lastMessageAt.toMillis() : 0;
          return tb - ta;
        });
        /* Étape 1: créer les placeholders DANS L'ORDRE avant toute requête async */
        var dmPlaceholders = {};
        docs.forEach(function(doc) {
          var d = doc.data();
          var otherUid = (d.members||[]).find(function(m){ return m !== currentUser.uid; });
          if (!otherUid) return;
          var item = document.createElement('div');
          item.className = 'dm-item';
          item.dataset.dmId = doc.id;
          item.innerHTML = '<div class="dm-item-avatar"><div class="dm-item-avatar-img" style="opacity:0.3"></div></div>' +
            '<div class="dm-item-info"><div class="dm-item-top"><span class="dm-item-name" style="opacity:0.3">…</span></div></div>';
          list.appendChild(item);
          dmPlaceholders[doc.id] = { item: item, doc: doc, d: d, otherUid: otherUid };
        });

        /* Étape 2: remplir chaque item avec les données utilisateur */
        Object.keys(dmPlaceholders).forEach(function(dmId) {
          var entry = dmPlaceholders[dmId];
          var item = entry.item, doc = entry.doc, d = entry.d, otherUid = entry.otherUid;
          db.collection('users').doc(otherUid).get().then(function(uDoc) {
            var u = uDoc.exists ? uDoc.data() : { pseudo:'Inconnu', emoji:'👤', color:'#5B8EF4' };
            var unread = (d.unread && d.unread[currentUser.uid]) || 0;
            item.classList.toggle('active', dmId === currentDmId);
            item.innerHTML =
              '<div class="dm-item-avatar">' +
                '<div class="dm-item-avatar-img">'+avatarHtml(u.pseudo, u.emoji, u.color, 48, u.avatarUrl)+'</div>' +
                '<div class="dm-item-status" style="background:'+statusColor(u.status)+'"></div>' +
              '</div>' +
              '<div class="dm-item-info">' +
                '<div class="dm-item-top">' +
                  '<span class="dm-item-name">'+escapeHtml(u.pseudo||'Anonyme')+'</span>' +
                  '<span class="dm-item-time">'+escapeHtml(fmtRelTime(d.lastMessageAt))+'</span>' +
                '</div>' +
                '<div class="dm-item-bottom">' +
                  '<span class="dm-item-preview">'+escapeHtml((d.lastMessage||'Démarrer la conversation').substr(0,40))+'</span>' +
                  (unread > 0 ? '<span class="dm-unread">'+unread+'</span>' : '') +
                '</div>' +
              '</div>';
            item.onclick = function() {
              qsa('.dm-item').forEach(function(i){ i.classList.remove('active'); });
              item.classList.add('active');
              openDm(otherUid, u, dmId);
            };
          }).catch(function(){ item.parentNode && item.parentNode.removeChild(item); });
        });
      }, function(err){ console.error('DM list:', err); });
  }

  /* ─── Ouvrir une conversation DM ─── */
  function openDm(otherUid, otherUser, existingDmId) {
    if (dmMessagesListener) { dmMessagesListener(); dmMessagesListener = null; }
    if (dmTypingListener)   { dmTypingListener();   dmTypingListener   = null; }
    stopDmTyping();

    currentDmUser     = otherUser || {};
    currentDmOtherUid = otherUid;
    dmReplyToMsg      = null;
    /* Permettre de re-binder les boutons pour chaque nouvelle conversation */
    dmInputBound      = false;

    /* Layout mobile → chat ouvert */
    var layout = qs('.dms-layout');
    if (layout) layout.classList.add('dm-open');

    /* Afficher les zones cachées */
    show($('dmChatHeader'));
    show($('dmMessages'));
    show($('dmInputBar'));
    /* S'assurer que la barre texte est visible et le recorder caché */
    var _dmTxtBar = $('dmTextBar');
    var _dmVocRec = $('dmVoiceRecorder');
    if (_dmTxtBar) show(_dmTxtBar);
    if (_dmVocRec) hide(_dmVocRec);
    hide($('dmEmptyState'));
    hide($('dmReplyBar'));
    hide($('dmTypingIndicator'));

    /* Header */
    var dmAv   = $('dmHeaderAvatar');
    var dmName = $('dmHeaderName');
    var dmStat = $('dmHeaderStatus');
    if (dmAv)   { dmAv.innerHTML = ''; dmAv.appendChild(makeAvatarEl(otherUser.pseudo, otherUser.emoji, otherUser.color, 38, otherUser.avatarUrl)); }
    if (dmName) dmName.textContent = otherUser.pseudo || 'Anonyme';
    if (dmStat) renderDmStatus(otherUser.status);

    /* Vider les messages */
    var msgBox = $('dmMessages');
    if (msgBox) msgBox.innerHTML = '';

    /* Trouver ou créer la conversation */
    if (existingDmId) {
      currentDmId = existingDmId;
      startDmSession(existingDmId);
    } else {
      db.collection('dms')
        .where('members', 'array-contains', currentUser.uid)
        .get().then(function(snap) {
          var found = null;
          snap.forEach(function(doc) {
            if ((doc.data().members||[]).includes(otherUid)) found = doc;
          });
          if (found) {
            currentDmId = found.id;
            startDmSession(found.id);
          } else {
            db.collection('dms').add({
              members:       [currentUser.uid, otherUid],
              lastMessage:   '',
              lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
              unread:        {}
            }).then(function(ref) {
              currentDmId = ref.id;
              startDmSession(ref.id);
            }).catch(function(){ showToast('Erreur création DM','error'); });
          }
        }).catch(function(){ showToast('Erreur DM','error'); });
    }

    /* Bindings (une seule fois par ouverture) */
    bindDmInputBar();
    bindDmHeader(otherUid, otherUser);
  }

  function renderDmStatus(status) {
    var dmStat = $('dmHeaderStatus');
    if (!dmStat) return;
    var labels = { online:'En ligne', away:'Absent', dnd:'Ne pas déranger', offline:'Hors ligne' };
    dmStat.innerHTML =
      '<div style="width:7px;height:7px;border-radius:50%;background:'+statusColor(status)+';flex-shrink:0;"></div>' +
      '<span>'+escapeHtml(labels[status]||'Hors ligne')+'</span>';
  }

  /* ─── Session DM : messages + typing ─── */
  function startDmSession(dmId) {
    /* Messages */
    loadDmMessages(dmId);
    /* Typing indicator */
    dmTypingListener = db.collection('dms').doc(dmId).onSnapshot(function(doc) {
      if (!doc.exists) return;
      var d = doc.data();
      var typing = d.typing || {};
      var typers = Object.keys(typing).filter(function(uid){ return uid !== currentUser.uid && typing[uid]; });
      var tyInd  = $('dmTypingIndicator');
      var tyTxt  = $('dmTypingText');
      var tyAv   = $('dmTypingAvatar');
      if (tyInd) {
        if (typers.length > 0) {
          if (tyTxt) tyTxt.textContent = (currentDmUser.pseudo || 'Quelqu\'un') + ' écrit…';
          if (tyAv)  tyAv.innerHTML = avatarHtml(currentDmUser.pseudo, currentDmUser.emoji, currentDmUser.color, 24, currentDmUser.avatarUrl);
          show(tyInd);
        } else {
          hide(tyInd);
        }
      }
      /* Statut de l'interlocuteur en temps réel */
      var otherStatus = (d.memberStatuses||{})[currentDmOtherUid];
      if (otherStatus) renderDmStatus(otherStatus);
    }, function(){});
    /* Marquer comme lu + réinitialiser badge */
    var unreadUpdate = {};
    unreadUpdate['unread.' + currentUser.uid] = 0;
    db.collection('dms').doc(dmId).update(unreadUpdate).catch(function(){});
    var dmBadgeN = $('dmBadgeNav'), dmBadgeT = $('dmBadgeTop');
    if (dmBadgeN) { dmBadgeN.textContent = ''; dmBadgeN.style.display = 'none'; }
    if (dmBadgeT) { dmBadgeT.textContent = ''; dmBadgeT.style.display = 'none'; }
    /* Read receipts uniquement si l'onglet DM est actif */
    if (currentView === 'dms') markDmMessagesRead(dmId);
  }

  /* ─── Chargement des messages DM ─── */
  function loadDmMessages(dmId) {
    if (dmMessagesListener) { dmMessagesListener(); dmMessagesListener = null; }
    var container = $('dmMessages');
    if (container) container.innerHTML = '<div class="msgs-loading"><span></span><span></span><span></span></div>';

    var isFirstLoad  = true;
    var lastDate     = '';
    var lastSenderId = '';

    dmMessagesListener = db.collection('dms').doc(dmId).collection('messages')
      .orderBy('createdAt', 'asc').limitToLast(60)
      .onSnapshot(function(snap) {
        var c = $('dmMessages');
        if (!c) return;

        snap.docChanges().forEach(function(change) {
          var doc  = change.doc;
          var data = doc.data();

          if (change.type === 'added') {
            if (isFirstLoad) {
              /* Vider le skeleton au premier lot */
              var skeleton = c.querySelector('.msgs-loading');
              if (skeleton) c.removeChild(skeleton);
            }
            /* Séparateur de date */
            var dateStr = fmtDate(data.createdAt);
            if (dateStr && dateStr !== lastDate) {
              var sep = document.createElement('div');
              sep.className = 'date-separator';
              sep.innerHTML = '<span>' + escapeHtml(dateStr) + '</span>';
              c.appendChild(sep);
              lastDate = dateStr;
            }
            var compact = (lastSenderId === data.senderId);
            appendDmMessage(doc.id, data, compact);
            lastSenderId = data.senderId;

            if (!isFirstLoad && data.senderId !== currentUser.uid) {
              playReceiveSound();
              /* Incrémenter badge DM */
              var dmBadgeN = $('dmBadgeNav');
              var dmBadgeT = $('dmBadgeTop');
              if (currentView !== 'dms' || currentDmId !== dmId) {
                if (dmBadgeN) { dmBadgeN.textContent = (parseInt(dmBadgeN.textContent)||0)+1; dmBadgeN.style.display = ''; }
                if (dmBadgeT) { dmBadgeT.textContent = (parseInt(dmBadgeT.textContent)||0)+1; dmBadgeT.style.display = ''; }
              }
            }
            if (!isFirstLoad) {
              var near = (c.scrollHeight - c.scrollTop - c.clientHeight) < 200;
              if (near || data.senderId === currentUser.uid) c.scrollTop = c.scrollHeight;
            }
          } else if (change.type === 'modified') {
            updateDmMessageEl(doc.id, data);
          } else if (change.type === 'removed') {
            var el = c.querySelector('[data-dm-msg-id="' + doc.id + '"]');
            if (el && el.parentNode) el.parentNode.removeChild(el);
          }
        });

        if (isFirstLoad) {
          isFirstLoad = false;
          c.scrollTop = c.scrollHeight;
        }
      }, function(err){ console.error('DM messages:', err); });
  }

  /* ─── Construire et ajouter un message DM ─── */
  function appendDmMessage(msgId, data, compact) {
    var c = $('dmMessages');
    if (!c) return;
    var isOut = data.senderId === currentUser.uid;
    var wrap  = document.createElement('div');
    wrap.className = 'msg-wrap ' + (isOut ? 'out' : 'in') + (compact ? ' compact' : '');
    wrap.dataset.dmMsgId = msgId;
    wrap.innerHTML = buildDmMessageHtml(msgId, data, isOut, compact);
    c.appendChild(wrap);
    bindDmMsgEvents(wrap, msgId, data, isOut);
  }

  function buildDmMessageHtml(msgId, data, isOut, compact) {
    var pseudo     = data.senderPseudo    || 'Anonyme';
    var emoji      = data.senderEmoji     || '';
    var color      = data.senderColor     || '#5B8EF4';
    var avatarUrl  = data.senderAvatarUrl || '';
    var timeStr    = fmtTime(data.createdAt);
    var content    = '';

    if (data.deleted) {
      content = '<div class="bubble-text bubble-deleted"><em>Message supprimé</em></div>';
    } else if (data.type === 'image') {
      content = '<img class="bubble-image" src="'+escapeHtml(data.imageUrl||'')+'" alt="image" loading="lazy">';
      if (data.text) content += '<div class="bubble-text">'+parseMarkdown(data.text)+'</div>';
    } else if (data.type === 'voice') {
      content = buildVoiceHtml(msgId, data);
    } else if (data.type === 'gif') {
      content = '<img class="bubble-image" src="'+escapeHtml(data.gifUrl||'')+'" style="max-width:200px;" alt="gif" loading="lazy">';
    } else if (data.type === 'sticker') {
      content = '<img src="'+escapeHtml(data.stickerUrl||'')+'" style="max-width:120px;max-height:120px;border-radius:12px;" alt="sticker">';
    } else {
      content = '<div class="bubble-text">'+parseMarkdown(data.text||'')+'</div>';
    }

    /* Répondre à */
    var replyHtml = '';
    if (data.replyTo) {
      replyHtml = '<div class="bubble-reply"><div class="bubble-reply-author">'+escapeHtml(data.replyTo.pseudo||'')+'</div>' +
        '<div class="bubble-reply-text">'+escapeHtml((data.replyTo.text||'Média').substr(0,60))+'</div></div>';
    }

    /* Double coche */
    var tickHtml = '';
    if (isOut && !data.deleted) {
      var read = data.read || false;
      tickHtml = '<span class="tick-double' + (read ? ' tick-read' : '') + '">' +
        '<svg viewBox="0 0 16 8" fill="none" width="16" height="8"><path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    }

    /* Édité */
    var editedHtml = data.edited ? '<span class="bubble-edited">modifié</span>' : '';

    /* Réactions */
    var reactions = data.reactions || {};
    var reactionHtml = '';
    var counts = {};
    Object.values(reactions).forEach(function(e){ counts[e] = (counts[e]||0)+1; });
    var emojiKeys = Object.keys(counts);
    if (emojiKeys.length) {
      reactionHtml = '<div class="bubble-reactions">';
      emojiKeys.forEach(function(em) {
        var mine = reactions[currentUser.uid] === em;
        reactionHtml += '<button class="reaction-chip' + (mine ? ' mine' : '') + '" data-emoji="'+escapeHtml(em)+'" data-dm-msg-id="'+escapeHtml(msgId)+'">'+escapeHtml(em)+' <span>'+counts[em]+'</span></button>';
      });
      reactionHtml += '</div>';
    }

    var avHtml = compact ? '<div class="msg-avatar"></div>' :
      '<div class="msg-avatar" data-uid="'+escapeHtml(data.senderId||'')+'">'+avatarHtml(pseudo, emoji, color, 28, avatarUrl)+'</div>';
    var authorHtml = (compact || isOut) ? '' : '<div class="msg-author">'+escapeHtml(pseudo)+'</div>';

    return authorHtml +
      '<div class="msg-row">' +
        (isOut ? '' : avHtml) +
        '<div class="bubble">' + replyHtml + content +
          '<div class="bubble-meta">'+editedHtml+'<span>'+escapeHtml(timeStr)+'</span>'+tickHtml+'</div>' +
        '</div>' +
        (isOut ? avHtml : '') +
      '</div>' +
      reactionHtml;
  }

  function updateDmMessageEl(msgId, data) {
    var el = qs('[data-dm-msg-id="' + msgId + '"]');
    if (!el) return;
    var isOut = data.senderId === currentUser.uid;
    el.innerHTML = buildDmMessageHtml(msgId, data, isOut, el.classList.contains('compact'));
    bindDmMsgEvents(el, msgId, data, isOut);
  }

  /* ─── Écouteurs sur chaque message DM ─── */
  function bindDmMsgEvents(wrap, msgId, data, isOut) {
    /* Tap long → actions */
    var bubble = wrap.querySelector('.bubble');
    if (bubble) {
      var holdTimer;
      bubble.addEventListener('touchstart', function(){ holdTimer = setTimeout(function(){ openDmMsgActions(msgId, data, isOut); }, 600); }, { passive:true });
      bubble.addEventListener('touchend',   function(){ clearTimeout(holdTimer); }, { passive:true });
      bubble.addEventListener('touchmove',  function(){ clearTimeout(holdTimer); }, { passive:true });
      bubble.addEventListener('contextmenu', function(e){ e.preventDefault(); openDmMsgActions(msgId, data, isOut); });
      /* Swipe gauche → répondre */
      var sx;
      bubble.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, { passive:true });
      bubble.addEventListener('touchend', function(e) {
        if (sx - e.changedTouches[0].clientX > 70) setDmReply(msgId, data);
      }, { passive:true });
    }
    /* Réactions */
    qsa('.reaction-chip[data-dm-msg-id]', wrap).forEach(function(chip) {
      chip.addEventListener('click', function(){
        toggleDmReaction(chip.dataset.dmMsgId || msgId, chip.dataset.emoji);
      });
    });
    /* Image → preview */
    var img = wrap.querySelector('.bubble-image');
    if (img) img.addEventListener('click', function(){ openImagePreview(img.src); });
    /* Avatar → profil */
    var av = wrap.querySelector('.msg-avatar[data-uid]');
    if (av && av.dataset.uid && av.dataset.uid !== currentUser.uid) {
      av.addEventListener('click', function(){
        db.collection('users').doc(av.dataset.uid).get().then(function(d){ if (d.exists) openMemberProfile(av.dataset.uid, d.data()); });
      });
    }
    /* Vocal */
    var playBtn = wrap.querySelector('.voice-play-btn');
    if (playBtn && !playBtn.dataset.bound) {
      playBtn.dataset.bound = '1';
      var voiceAudio = null;
      playBtn.addEventListener('click', function() {
        var url = playBtn.dataset.url;
        if (!url) return;
        var playI = playBtn.querySelector('.play-icon'), pauseI = playBtn.querySelector('.pause-icon');
        if (voiceAudio && !voiceAudio.paused) { voiceAudio.pause(); if (playI) playI.style.display=''; if (pauseI) pauseI.style.display='none'; return; }
        voiceAudio = new Audio(url);
        ensureAudio();
        if (playI) playI.style.display='none'; if (pauseI) pauseI.style.display='';
        voiceAudio.play().catch(function(){ if (playI) playI.style.display=''; if (pauseI) pauseI.style.display='none'; });
        voiceAudio.addEventListener('ended', function(){ if (playI) playI.style.display=''; if (pauseI) pauseI.style.display='none'; voiceAudio=null; });
      });
    }
  }

  /* ─── Actions sur message DM ─── */
  function openDmMsgActions(msgId, data, isOut) {
    dmActionMsgId  = msgId;
    dmActionData   = data;
    /* Seul l'auteur peut modifier ou supprimer son propre message en DM */
    var canDelete  = isOut;
    var canEdit    = isOut && data.type !== 'image' && data.type !== 'voice' && !data.deleted;

    /* Réutiliser la modal d'actions du salon (même structure) */
    var modal = $('modalMsgActions');
    if (!modal) return;
    var actionEdit   = $('actionEdit');
    var actionDelete = $('actionDelete');
    var actionPin    = $('actionPin');
    if (actionEdit)   actionEdit.style.display   = canEdit   ? '' : 'none';
    if (actionDelete) actionDelete.style.display = canDelete ? '' : 'none';
    if (actionPin)    actionPin.style.display     = 'none'; /* pas de pin en DM */

    /* Réactions rapides */
    qsa('.reaction-btn', modal).forEach(function(btn) {
      btn.onclick = function() {
        toggleDmReaction(msgId, btn.dataset.emoji);
        hide(modal);
      };
    });
    $('actionReply').onclick  = function(){ setDmReply(msgId, data); hide(modal); };
    $('actionCopy').onclick   = function(){
      try { navigator.clipboard.writeText(data.text||'(média)'); } catch(e){}
      showToast('Copié','success',1500);
      hide(modal);
    };
    if (actionEdit) actionEdit.onclick = function(){ startDmEditMessage(msgId, data); hide(modal); };
    if (actionDelete) actionDelete.onclick = function(){
      db.collection('dms').doc(currentDmId).collection('messages').doc(msgId)
        .update({ deleted:true }).then(function(){ showToast('Message supprimé','info',1500); });
      hide(modal);
    };
    $('actionReport').onclick = function(){ hide(modal); show($('modalReport')); initReportModal('dm_'+msgId, data); };
    $('actionCancel').onclick = function(){ hide(modal); };
    show(modal);
  }

  function setDmReply(msgId, data) {
    dmReplyToMsg = { id: msgId, data: data };
    var bar   = $('dmReplyBar');
    var auth  = $('dmReplyAuthor');
    var msg   = $('dmReplyMsg');
    if (auth) auth.textContent = data.senderPseudo || 'Anonyme';
    if (msg)  msg.textContent  = (data.text||'Média').substr(0,60);
    show(bar);
    var inp = $('dmMsgInput');
    if (inp) inp.focus();
  }

  function startDmEditMessage(msgId, data) {
    var input = $('dmMsgInput');
    if (!input) return;
    input.textContent = data.text || '';
    input.focus();
    var btnSend = $('btnDmSend');
    var btnVoice = qs('#dmInputBar .btn-voice');
    if (btnSend) {
      var originalOnClick = btnSend.onclick;
      btnSend.onclick = function() {
        var newText = input.textContent.trim();
        if (!newText) return;
        db.collection('dms').doc(currentDmId).collection('messages').doc(msgId)
          .update({ text: newText, edited: true })
          .then(function(){ showToast('Modifié','success',1500); });
        input.textContent = '';
        btnSend.onclick = originalOnClick;
      };
    }
  }

  function toggleDmReaction(msgId, emoji) {
    if (!currentDmId) return;
    var uid = currentUser.uid;
    db.collection('dms').doc(currentDmId).collection('messages').doc(msgId).get()
      .then(function(doc) {
        if (!doc.exists) return;
        var reactions = doc.data().reactions || {};
        var update = {};
        if (reactions[uid] === emoji) {
          update['reactions.' + uid] = firebase.firestore.FieldValue.delete();
        } else {
          update['reactions.' + uid] = emoji;
        }
        doc.ref.update(update).catch(function(){});
      });
  }

  /* ─── Input bar DM ─── */
  function bindDmInputBar() {
    if (dmInputBound) return;
    dmInputBound = true;

    var msgInput = $('dmMsgInput');
    var btnSend  = $('btnDmSend');
    var btnEmoji = $('btnDmEmoji');
    var btnImage = $('btnDmImage');
    var btnVoice = $('btnDmVoice');
    var fileInput = $('fileDmImageInput');

    if (!msgInput || !btnSend) return;

    /* ── Envoi texte ── */
    btnSend.onclick = function() { dmSendText(); };
    msgInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dmSendText(); }
    });

    /* ── Bouton send visible/caché selon contenu ── */
    msgInput.addEventListener('input', function() {
      var hasText = msgInput.textContent.trim().length > 0;
      if (btnSend)  btnSend.style.display  = hasText ? '' : 'none';
      if (btnVoice) btnVoice.style.display = hasText ? 'none' : '';
      updateDmTyping(hasText);
    });
    /* État initial */
    if (btnSend)  btnSend.style.display  = 'none';
    if (btnVoice) btnVoice.style.display = '';

    /* ── Emoji DM ── */
    if (btnEmoji) {
      btnEmoji.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        var picker = $('emojiPicker');
        if (!picker) return;
        var isOpen = picker.style.display !== 'none' && picker.style.display !== '';
        if (isOpen) {
          hide(picker);
        } else {
          /* Reconstruire avec le bon targetInput DM */
          buildEmojiGrid($('emojiGrid'), msgInput);
          /* Positionner le picker près de la barre DM */
          var bar = $('dmInputBar');
          if (bar) {
            var rect = bar.getBoundingClientRect();
            picker.style.position = 'fixed';
            picker.style.bottom   = (window.innerHeight - rect.top + 8) + 'px';
            picker.style.left     = '12px';
            picker.style.right    = '12px';
            picker.style.zIndex   = '2000';
          }
          show(picker);
        }
      };
    }

    /* ── Image ── */
    if (btnImage && fileInput) {
      btnImage.onclick = function() { fileInput.click(); };
      fileInput.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5 Mo', 'error'); return; }
        uploadToCloudinary(file, function(url) {
          if (url) dmSendMessage({ type: 'image', imageUrl: url });
          else showToast('Échec upload', 'error');
        });
        fileInput.value = '';
      };
    }

    /* ── Vocal ── */
    if (btnVoice) {
      btnVoice.onclick = function() { startDmVoiceRecording(); };
    }

    /* ── Annuler réponse ── */
    var btnCancelReply = $('btnCancelDmReply');
    if (btnCancelReply) {
      btnCancelReply.onclick = function() { dmReplyToMsg = null; hide($('dmReplyBar')); };
    }
  }
  function dmSendText() {
    if (!currentDmId) return;
    var input = $('dmMsgInput');
    if (!input) return;
    var text = input.textContent.trim();
    if (!text) return;
    input.textContent = '';
    dmSendMessage({ type:'text', text:text });
    stopDmTyping();
  }

  /* ─── Envoi message DM (générique) ─── */
  function dmSendMessage(payload) {
    if (!currentDmId || !currentUser) return;
    var d = currentUserData;
    var msg = Object.assign({
      senderId:        currentUser.uid,
      senderPseudo:    d.pseudo    || 'Anonyme',
      senderEmoji:     d.emoji     || '',
      senderColor:     d.color     || '#5B8EF4',
      senderAvatarUrl: d.avatarUrl || '',
      createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      read:            false,
      deleted:         false,
      edited:          false,
      reactions:       {},
      replyTo: dmReplyToMsg ? {
        msgId:  dmReplyToMsg.id,
        text:   (dmReplyToMsg.data.text || 'Média').substr(0,80),
        pseudo: dmReplyToMsg.data.senderPseudo || ''
      } : null
    }, payload);

    dmReplyToMsg = null;
    hide($('dmReplyBar'));

    db.collection('dms').doc(currentDmId).collection('messages').add(msg)
      .then(function() {
        playSendSound();
        var preview = payload.type === 'text' ? (payload.text||'...').substr(0,60)
                    : payload.type === 'image' ? '📷 Image'
                    : payload.type === 'voice' ? '🎤 Vocal'
                    : payload.type === 'gif'   ? '🎬 GIF'
                    : '📎 Fichier';
        /* Maj lastMessage + incrémenter unread pour l'autre */
        var unreadKey = 'unread.' + currentDmOtherUid;
        var upd = {
          lastMessage:   preview,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        upd[unreadKey] = firebase.firestore.FieldValue.increment(1);
        db.collection('dms').doc(currentDmId).update(upd).catch(function(){});
        /* Pas de document notifications séparé pour les DMs : le badge unread suffit */
      })
      .catch(function(err){ console.error('DM send:', err); showToast('Erreur envoi','error'); });
  }

  /* ─── Typing DM ─── */
  function updateDmTyping(isTyping) {
    if (!currentDmId || !currentUser) return;
    clearTimeout(dmTypingTimeout);
    if (isTyping) {
      sendDmTyping(true);
      dmTypingTimeout = setTimeout(function(){ sendDmTyping(false); }, 3000);
    } else {
      sendDmTyping(false);
    }
  }
  function sendDmTyping(val) {
    if (!currentDmId) return;
    var upd = {};
    upd['typing.' + currentUser.uid] = val ? true : firebase.firestore.FieldValue.delete();
    db.collection('dms').doc(currentDmId).update(upd).catch(function(){});
  }
  function stopDmTyping() { clearTimeout(dmTypingTimeout); sendDmTyping(false); }

  /* ─── Vocal DM ─── */

  function startDmVoiceRecording() {
    if (!navigator.mediaDevices) { showToast('Micro non disponible', 'error'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      dmIsRecording  = true;
      dmAudioChunks  = [];
      dmVoiceSecs    = 0;
      dmMediaRecorder = new MediaRecorder(stream);
      dmMediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) dmAudioChunks.push(e.data); };
      dmMediaRecorder.start(100);

      /* Afficher le recorder, masquer la barre texte */
      show($('dmVoiceRecorder'));
      hide($('dmTextBar'));

      /* Boutons du recorder */
      var btnCancel = $('btnDmCancelVoice');
      var btnStop   = $('btnDmStopVoice');
      if (btnCancel) btnCancel.onclick = cancelDmVoice;
      if (btnStop)   btnStop.onclick   = stopDmVoice;

      /* Timer */
      clearInterval(dmVoiceTimer);
      dmVoiceTimer = setInterval(function() {
        dmVoiceSecs++;
        var t = $('dmVoiceTimer');
        if (t) t.textContent = formatDuration(dmVoiceSecs);
        animateDmWaveform();
        if (dmVoiceSecs >= 120) stopDmVoice();
      }, 1000);
    }).catch(function() { showToast('Accès micro refusé', 'error'); });
  }

  function animateDmWaveform() {
    var wf = $('dmVoiceWaveform');
    if (!wf) return;
    wf.innerHTML = '';
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('span');
      s.style.cssText = 'display:inline-block;width:3px;border-radius:2px;background:var(--accent-1,#5B8EF4);height:' + (4 + Math.floor(Math.random() * 18)) + 'px;margin:0 1px;vertical-align:middle;transition:height 0.1s;';
      wf.appendChild(s);
    }
  }

  function cancelDmVoice() {
    dmIsRecording = false;
    clearInterval(dmVoiceTimer);
    if (dmMediaRecorder) {
      try { dmMediaRecorder.stop(); dmMediaRecorder.stream.getTracks().forEach(function(t) { t.stop(); }); } catch(e){}
      dmMediaRecorder = null;
    }
    restoreDmInputBar();
  }

  function stopDmVoice() {
    if (!dmIsRecording || !dmMediaRecorder) return;
    dmIsRecording = false;
    clearInterval(dmVoiceTimer);
    var dur = dmVoiceSecs;
    dmMediaRecorder.onstop = function() {
      var blob = new Blob(dmAudioChunks, { type: 'audio/webm' });
      var reader = new FileReader();
      reader.onload = function(e) {
        showToast('Upload vocal…', 'info', 10000);
        uploadVoiceToCloudinary(e.target.result, function(url) {
          if (url) dmSendMessage({ type: 'voice', voiceUrl: url, duration: dur });
          else showToast('Échec upload vocal', 'error');
        });
      };
      reader.readAsDataURL(blob);
      dmMediaRecorder.stream.getTracks().forEach(function(t) { t.stop(); });
      dmMediaRecorder = null;
    };
    dmMediaRecorder.stop();
    restoreDmInputBar();
  }

  function restoreDmInputBar() {
    hide($('dmVoiceRecorder'));
    show($('dmTextBar'));
    var t = $('dmVoiceTimer');
    if (t) t.textContent = '0:00';
    var wf = $('dmVoiceWaveform');
    if (wf) wf.innerHTML = '';
  }
  /* ─── Read receipts : marquer les messages entrants comme lus ─── */
  function markDmMessagesRead(dmId) {
    if (!dmId || !currentUser) return;
    db.collection('dms').doc(dmId).collection('messages')
      .where('senderId', '!=', currentUser.uid)
      .where('read', '==', false)
      .get().then(function(snap) {
        var batch = db.batch();
        snap.forEach(function(doc){ batch.update(doc.ref, { read:true }); });
        batch.commit().catch(function(){});
      }).catch(function(){});
    /* Reset unread counter */
    var upd = {};
    upd['unread.' + currentUser.uid] = 0;
    db.collection('dms').doc(dmId).update(upd).catch(function(){});
  }

  /* ─── Header DM bindings ─── */
  function bindDmHeader(otherUid, otherUser) {
    /* Retour */
    var btnBack = $('btnBackDms');
    if (btnBack) {
      btnBack.onclick = function() {
        stopDmTyping();
        if (dmMessagesListener) { dmMessagesListener(); dmMessagesListener = null; }
        if (dmTypingListener)   { dmTypingListener();   dmTypingListener   = null; }
        var lyt = qs('.dms-layout');
        if (lyt) lyt.classList.remove('dm-open');
        currentDmId = null;
        dmInputBound = false;
        hide($('dmChatHeader'));
        hide($('dmMessages'));
        hide($('dmInputBar'));
        hide($('dmReplyBar'));
        show($('dmEmptyState'));
        /* Réinitialiser badge */
        var dmBadgeN = $('dmBadgeNav'), dmBadgeT = $('dmBadgeTop');
        if (dmBadgeN) { dmBadgeN.textContent = ''; dmBadgeN.style.display = 'none'; }
        if (dmBadgeT) { dmBadgeT.textContent = ''; dmBadgeT.style.display = 'none'; }
      };
    }
    /* Clic sur header → profil */
    var hdr = $('dmChatHeader');
    if (hdr) {
      var nameArea = hdr.querySelector('.dm-header-user');
      if (nameArea) {
        nameArea.style.cursor = 'pointer';
        nameArea.onclick = function() { openMemberProfile(otherUid, otherUser); };
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════
     22. CHAT ALÉATOIRE
  ══════════════════════════════════════════════════════════════ */
  function initRandomView() {
    var btnStart = $('btnStartRandom');
    if (btnStart) btnStart.addEventListener('click', startRandomSearch);
    /* btnCancelRandom = bouton "Annuler" dans l'état searching */
    var btnCancelRandom = $('btnCancelRandom');
    if (btnCancelRandom) btnCancelRandom.addEventListener('click', cancelRandomSearch);
    var btnSkip  = $('btnSkipRandom');
    if (btnSkip)  btnSkip.addEventListener('click', skipRandom);
    var btnLeave = $('btnQuitRandom');
    if (btnLeave) btnLeave.addEventListener('click', leaveRandom);

    /* Input aléatoire */
    var randInput = $('randomMsgInput');
    var btnRandSend = $('btnRandomSend');
    if (randInput && btnRandSend) {
      btnRandSend.onclick = function() {
        var text = randInput.textContent.trim();
        if (!text || !randomSessionId) return;
        randInput.textContent = '';
        db.collection('randomSessions').doc(randomSessionId).collection('messages').add({
          text:      text,
          senderId:  currentUser.uid,
          senderPseudo: currentUserData.pseudo || 'Anonyme',
          senderEmoji:  currentUserData.emoji || '',
          senderColor:  currentUserData.color || '#5B8EF4',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){ playSendSound(); }).catch(function(){});
      };
      randInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btnRandSend.click(); }
      });
    }
  }

  var randomSearchTimer = null; /* timeout 30s */

  function startRandomSearch() {
    hide($('randomIdle'));
    show($('randomSearching'));

    /* Timeout 30 secondes si aucun partenaire */
    if (randomSearchTimer) clearTimeout(randomSearchTimer);
    randomSearchTimer = setTimeout(function() {
      if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
      db.collection('randomQueue').doc(currentUser.uid).delete().catch(function(){});
      hide($('randomSearching'));
      show($('randomIdle'));
      showToast('Aucun utilisateur trouvé, réessaie plus tard 😕', 'info', 4000);
    }, 30000);

    /* Chercher quelqu'un qui attend — simple equality query, pas besoin d'index composite */
    db.collection('randomQueue')
      .where('status','==','waiting')
      .limit(10).get()
      .then(function(snap) {
        /* Filtrer soi-même côté client */
        var others = snap.docs.filter(function(d){ return d.data().uid !== currentUser.uid; });
        if (others.length > 0) {
          var partnerDoc = others[0];
          var partnerId  = partnerDoc.data().uid;
          var sessionId  = genId();
          /* Créer session */
          db.collection('randomSessions').doc(sessionId).set({
            users:     [currentUser.uid, partnerId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            active:    true
          }).then(function() {
            /* Supprimer l'autre de la queue */
            partnerDoc.ref.delete();
            randomSessionId  = sessionId;
            randomPartnerId  = partnerId;
            db.collection('users').doc(partnerId).get().then(function(uDoc) {
              var u = uDoc.exists ? uDoc.data() : { pseudo:'Inconnu', emoji:'🌍', flag:'🌍' };
              showRandomChat(partnerId, u, sessionId);
            });
          });
        } else {
          /* S'ajouter à la queue */
          db.collection('randomQueue').doc(currentUser.uid).set({
            uid:       currentUser.uid,
            status:    'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          /* Écouter quand une session est créée avec nous */
          if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
          randomQueueListenerOff = db.collection('randomSessions')
            .where('users','array-contains', currentUser.uid)
            .where('active','==',true)
            .onSnapshot(function(snap) {
              if (snap.empty) return;
              var doc = snap.docs[0];
              var d = doc.data();
              var partnerId = d.users.find(function(u){ return u !== currentUser.uid; });
              if (!partnerId) return;
              randomSessionId = doc.id;
              randomPartnerId = partnerId;
              db.collection('randomQueue').doc(currentUser.uid).delete().catch(function(){});
              db.collection('users').doc(partnerId).get().then(function(uDoc) {
                var u = uDoc.exists ? uDoc.data() : { pseudo:'Inconnu', emoji:'🌍', flag:'🌍' };
                showRandomChat(partnerId, u, doc.id);
              });
              if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
              if (randomSearchTimer) { clearTimeout(randomSearchTimer); randomSearchTimer = null; }
            }, function(){});
        }
      }).catch(function(err) {
        console.error('Random search:', err);
        if (randomSearchTimer) { clearTimeout(randomSearchTimer); randomSearchTimer = null; }
        if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
        hide($('randomSearching'));
        show($('randomIdle'));
        showToast('Erreur de connexion','error');
      });
  }

  function showRandomChat(partnerId, partnerData, sessionId) {
    hide($('randomSearching'));
    show($('randomChatActive'));
    playConnectSound();
    showToast('Connecté à ' + (partnerData.pseudo||'Inconnu') + ' !','success');

    var av   = $('randomPartnerAvatar');
    var name = $('randomPartnerName');
    var flag = $('randomPartnerFlag');
    if (av)   { av.innerHTML = ''; av.appendChild(makeAvatarEl(partnerData.pseudo, partnerData.emoji, partnerData.color || '#5B8EF4', 44, partnerData.avatarUrl)); }
    if (name) name.textContent = partnerData.pseudo || 'Anonyme';
    if (flag) flag.textContent = (partnerData.flag||'🌍') + ' ' + (partnerData.country||'');

    /* Charger messages */
    var rMsgs = $('randomMessages');
    if (rMsgs) rMsgs.innerHTML = '';
    if (randomListenerOff) { randomListenerOff(); randomListenerOff = null; }
    randomListenerOff = db.collection('randomSessions').doc(sessionId).collection('messages')
      .orderBy('createdAt','asc').limitToLast(100)
      .onSnapshot(function(snap) {
        var c = $('randomMessages');
        if (!c) return;
        c.innerHTML = '';
        snap.forEach(function(doc) {
          var d = doc.data();
          var isOut = d.senderId === currentUser.uid;
          var wrap = document.createElement('div');
          wrap.className = 'msg-wrap ' + (isOut ? 'out' : 'in');
          var timeStr = fmtTime(d.createdAt);
          wrap.innerHTML =
            '<div class="msg-row">' +
              (isOut ? '' : '<div class="msg-avatar">'+avatarHtml(d.senderPseudo,d.senderEmoji,d.senderColor,28,d.senderAvatarUrl)+'</div>') +
              '<div class="bubble"><div class="bubble-text">'+parseMarkdown(d.text||'')+'</div>' +
              '<div class="bubble-meta"><span>'+escapeHtml(timeStr)+'</span></div></div>' +
              (isOut ? '<div class="msg-avatar"></div>' : '') +
            '</div>';
          c.appendChild(wrap);
          c.scrollTop = c.scrollHeight;
          if (!isOut) playReceiveSound();
        });
      }, function(){});
  }

  function cancelRandomSearch() {
    isRandomSearching = false;
    db.collection('randomQueue').doc(currentUser.uid).delete().catch(function(){});
    if (randomListenerOff) { randomListenerOff(); randomListenerOff = null; }
    hide($('randomSearching'));
    show($('randomIdle'));
    randomSessionId = null;
  }

  function skipRandom() {
    leaveRandom();
    setTimeout(startRandomSearch, 300);
  }

  function leaveRandom() {
    isRandomSearching = false;
    if (randomSessionId) {
      db.collection('randomSessions').doc(randomSessionId).update({ active:false }).catch(function(){});
    }
    db.collection('randomQueue').doc(currentUser.uid).delete().catch(function(){});
    if (randomListenerOff) { randomListenerOff(); randomListenerOff = null; }
    randomSessionId = null;
    randomPartnerId = null;
    hide($('randomChatActive'));
    show($('randomIdle'));
  }


  /* ══════════════════════════════════════════════════════════════
     23. NOTIFICATIONS
  ══════════════════════════════════════════════════════════════ */
  function listenNotifications() {
    if (!currentUser) return;
    db.collection('notifications')
      .where('toUid','==', currentUser.uid)
      .orderBy('createdAt','desc')
      .limit(30)
      .onSnapshot(function(snap) {
        var list = $('notifList');
        var emptyEl = $('emptyNotif');
        if (!list) return;
        list.innerHTML = '';
        var unread = 0;
        if (snap.empty) {
          show(emptyEl);
          updateNotifBadge(0);
          return;
        }
        hide(emptyEl);
        snap.forEach(function(doc) {
          var d = doc.data();
          if (!d.read) unread++;
          var item = document.createElement('div');
          item.className = 'notif-item' + (!d.read ? ' unread' : '');
          var icons = {
            msg:     '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M10 2C5.58 2 2 5.13 2 9c0 1.8.68 3.45 1.8 4.72L2.5 18l4.5-1.5A8.3 8.3 0 0010 17c4.42 0 8-3.13 8-7S14.42 2 10 2z" stroke="#5B8EF4" stroke-width="1.4" fill="none"/></svg>',
            mention: '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="10" r="8" stroke="#8B5CF6" stroke-width="1.4" fill="none"/><path d="M10 7v4M10 13v.5" stroke="#8B5CF6" stroke-width="1.5" stroke-linecap="round"/></svg>',
            dm:      '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M7 10h6M7 13h4" stroke="#22C55E" stroke-width="1.3" stroke-linecap="round"/><path d="M2 4h16v12H2z" stroke="#22C55E" stroke-width="1.4" rx="2" fill="none"/></svg>',
            system:  '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><circle cx="10" cy="10" r="8" stroke="#F59E0B" stroke-width="1.4" fill="none"/><path d="M10 6v5l3 1.5" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round"/></svg>'
          };
          item.innerHTML =
            '<div class="notif-item-icon">' + (icons[d.type]||icons.system) + '</div>' +
            '<div class="notif-item-body">' +
              '<div class="notif-item-text">' + escapeHtml(d.text||'') + '</div>' +
              '<div class="notif-item-time">' + escapeHtml(fmtRelTime(d.createdAt)) + '</div>' +
            '</div>' +
            (!d.read ? '<div class="notif-unread-dot"></div>' : '');
          item.addEventListener('click', function() {
            doc.ref.update({ read:true }).catch(function(){});
            if (d.roomId) { openRoom(d.roomId, {}); showView('rooms'); syncNavBtns('rooms'); }
          });
          list.appendChild(item);
        });
        updateNotifBadge(unread);
      }, function(err){ console.error('Notif listener:', err); });
  }

  function updateNotifBadge(count) {
    var bnavBadge = $('notifBadgeNav');
    var topBadge  = $('notifBadgeTop');
    if (bnavBadge) { bnavBadge.textContent = count; bnavBadge.style.display = count > 0 ? '' : 'none'; }
    if (topBadge)  { topBadge.textContent  = count; topBadge.style.display  = count > 0 ? '' : 'none'; }
  }

  function markNotifsRead() {
    if (!currentUser) return;
    /* Bouton "Tout marquer comme lu" */
    var btnMarkAll = $('btnMarkAllRead');
    if (btnMarkAll && !btnMarkAll.dataset.bound) {
      btnMarkAll.dataset.bound = '1';
      btnMarkAll.addEventListener('click', function() {
        markNotifsRead();
        showToast('Tout marqué comme lu', 'success', 1500);
      });
    }
    db.collection('notifications').where('toUid','==', currentUser.uid).where('read','==',false)
      .get().then(function(snap) {
        var batch = db.batch();
        snap.forEach(function(doc){ batch.update(doc.ref, { read:true }); });
        batch.commit().catch(function(){});
      }).catch(function(){});
  }

  function incrementUnread(roomId) {
    if (currentView === 'rooms' && currentRoomId === roomId) return;
    unreadCounts[roomId] = (unreadCounts[roomId]||0) + 1;
    /* Son de notif uniquement si l'utilisateur n'est pas dans ce salon */
    playNotifSound();
    /* Mettre à jour le badge de la liste */
    var item = qs('.room-item[data-room-id="'+roomId+'"]');
    if (item) {
      var right = item.querySelector('.room-item-right');
      if (right) {
        var badge = right.querySelector('.room-unread-badge');
        if (badge) {
          badge.textContent = unreadCounts[roomId];
        } else {
          var b = document.createElement('span');
          b.className = 'room-unread-badge';
          b.textContent = unreadCounts[roomId];
          right.insertBefore(b, right.firstChild);
        }
      }
    }
    /* Badge bnav salons */
    var bnavBadgeRooms = $('roomBadgeNav');
    var total = Object.values(unreadCounts).reduce(function(a,b){ return a+b; },0);
    if (bnavBadgeRooms) { bnavBadgeRooms.textContent = total; bnavBadgeRooms.style.display = total>0 ? '' : 'none'; }
  }

  function listenAnnouncements() {
    db.collection('announcements')
      .orderBy('createdAt','desc').limit(1)
      .onSnapshot(function(snap) {
        snap.docChanges().forEach(function(change) {
          if (change.type !== 'added') return;
          var d = change.doc.data();
          var key = 'sis_ann_' + change.doc.id;
          try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch(e){}

          /* 1. Banner flottant en haut de l'écran */
          var existing = $('announceBanner');
          if (existing) existing.parentNode.removeChild(existing);
          var banner = document.createElement('div');
          banner.id = 'announceBanner';
          banner.className = 'announce-banner';
          banner.innerHTML =
            '<svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M3 7h14v6H3z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 7V5a3 3 0 016 0v2M10 13v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '<span class="announce-banner-text">' + escapeHtml(d.text||'Annonce') + '</span>' +
            '<button class="announce-banner-close" id="btnCloseBanner">✕</button>';
          document.body.appendChild(banner);
          setTimeout(function(){ banner.classList.add('announce-banner--visible'); }, 50);
          var btnClose = $('btnCloseBanner');
          if (btnClose) btnClose.addEventListener('click', function(){
            banner.classList.remove('announce-banner--visible');
            setTimeout(function(){ if (banner.parentNode) banner.parentNode.removeChild(banner); }, 350);
          });
          /* Auto-hide après 12s */
          setTimeout(function(){
            banner.classList.remove('announce-banner--visible');
            setTimeout(function(){ if (banner.parentNode) banner.parentNode.removeChild(banner); }, 350);
          }, 12000);

          /* 2. Carte dans le chat actif */
          var container = $('messagesContainer');
          if (container) {
            var card = document.createElement('div');
            card.className = 'announce-chat-card';
            card.innerHTML =
              '<div class="announce-chat-icon">📢</div>' +
              '<div class="announce-chat-body">' +
                '<div class="announce-chat-label">Annonce officielle</div>' +
                '<div class="announce-chat-text">' + escapeHtml(d.text||'') + '</div>' +
              '</div>';
            container.appendChild(card);
            container.scrollTop = container.scrollHeight;
          }
        });
      }, function(){});
  }

  /* ══════════════════════════════════════════════════════════════
     24. PROFIL
  ══════════════════════════════════════════════════════════════ */
  function initProfileView() {
    /* Changer pseudo — aussi avec Enter */
    var pseudoInputEl = $('profilePseudoInput');
    if (pseudoInputEl) {
      pseudoInputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); var b = $('btnSavePseudo'); if (b) b.click(); }
      });
    }
    var btnSavePseudo = $('btnSavePseudo');
    if (btnSavePseudo) {
      btnSavePseudo.addEventListener('click', function() {
        var input = $('profilePseudoInput');
        if (!input) return;
        var newPseudo = input.value.trim();
        if (!newPseudo) { showToast('Le pseudo ne peut pas être vide','warning'); return; }
        if (newPseudo.length > 24) { showToast('Max 24 caractères','warning'); return; }
        db.collection('users').doc(currentUser.uid).update({ pseudo: newPseudo })
          .then(function() {
            currentUserData.pseudo = newPseudo;
            renderUserUI();
            showToast('Pseudo mis à jour','success');
          }).catch(function(){ showToast('Erreur mise à jour','error'); });
      });
    }

    /* Avatar */
    var btnAvatarEdit = $('btnChangeAvatar');
    var fileAvatar = $('fileAvatarInput');
    if (btnAvatarEdit && fileAvatar) {
      btnAvatarEdit.addEventListener('click', function(){ fileAvatar.click(); });
      fileAvatar.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 2*1024*1024) { showToast('Image trop lourde (max 2 Mo)','error'); return; }
        var reader = new FileReader();
        /* Prévisualisation locale instantanée */
        var previewReader = new FileReader();
        previewReader.onload = function(pev) {
          var av = $('profileAvatar');
          if (av) {
            av.innerHTML = '';
            var img = document.createElement('img');
            img.src = pev.target.result;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
            av.appendChild(img);
          }
        };
        previewReader.readAsDataURL(file);

        /* Passer le File directement à Cloudinary — plus rapide, pas d'erreur 400 */
        uploadToCloudinary(file, function(url) {
          if (!url) { showToast('Échec upload photo', 'error'); return; }
          db.collection('users').doc(currentUser.uid).update({ avatarUrl: url })
            .then(function() {
              currentUserData.avatarUrl = url;
              renderUserUI();
              showToast('Photo de profil mise à jour ✓', 'success');
            })
            .catch(function(err) {
              console.error('avatarUrl update:', err);
              showToast('Erreur sauvegarde photo', 'error');
            });
        });
        e.target.value = '';
      });
    }

    /* Statut */
    qsa('.status-opt').forEach(function(btn) {
      btn.addEventListener('click', function() {
        qsa('.status-opt').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var status = btn.dataset.status;
        db.collection('users').doc(currentUser.uid).update({ status:status })
          .then(function() {
            currentUserData.status = status;
            var tbs = $('topbarStatus');
            if (tbs) tbs.style.background = statusColor(status);
          }).catch(function(){});
      });
      /* Marquer actif si correspond au statut courant */
      if (btn.dataset.status === currentUserData.status) btn.classList.add('active');
    });

    /* Sons */
    var soundToggle = $('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', function() {
        soundEnabled = soundToggle.checked;
        try { localStorage.setItem('sis_sounds', soundEnabled ? '1' : '0'); } catch(e){}
        showToast(soundEnabled ? 'Sons activés' : 'Sons désactivés','info',1500);
      });
    }

    /* Thème */
    var themeToggle = $('themeToggle');
    if (themeToggle) {
      themeToggle.checked = document.body.classList.contains('light-theme');
      themeToggle.addEventListener('change', toggleTheme);
    }

    /* Déconnexion */
    var btnLogout = $('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', doLogout);

    /* Supprimer compte */
    var btnDeleteAccount = $('btnDeleteAccount');
    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener('click', function(){ show($('modalDeleteAccount')); });
    }
    var btnConfirmDelete = $('btnConfirmDeleteAccount');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', function() {
        var pwdInput = $('deleteAccountPwd');
        if (!pwdInput || !pwdInput.value) { showToast('Entre ton mot de passe','warning'); return; }
        var email = currentUserData.email;
        if (!email) {
          /* Compte anonyme */
          deleteCurrentAccount();
          return;
        }
        var cred = firebase.auth.EmailAuthProvider.credential(email, pwdInput.value);
        currentUser.reauthenticateWithCredential(cred)
          .then(function(){ deleteCurrentAccount(); })
          .catch(function(){ showToast('Mot de passe incorrect','error'); });
      });
    }
  }

  function doLogout() {
    /* Nettoyer tous les listeners avant déconnexion */
    if (messagesListenerOff)    { messagesListenerOff(); messagesListenerOff = null; }
    if (roomsListenerOff)       { roomsListenerOff(); roomsListenerOff = null; }
    if (dmsListenerOff)         { dmsListenerOff(); dmsListenerOff = null; }
    if (roomModsListenerOff)    { roomModsListenerOff(); roomModsListenerOff = null; }
    if (dmMessagesListener)     { dmMessagesListener(); dmMessagesListener = null; }
    if (dmTypingListener)       { dmTypingListener(); dmTypingListener = null; }
    if (typingListenerOff)      { typingListenerOff(); typingListenerOff = null; }
    if (randomListenerOff)      { randomListenerOff(); randomListenerOff = null; }
    if (randomQueueListenerOff) { randomQueueListenerOff(); randomQueueListenerOff = null; }
    if (randomSearchTimer)      { clearTimeout(randomSearchTimer); randomSearchTimer = null; }

    db.collection('users').doc(currentUser.uid).update({ status:'offline', lastSeen: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(function(){})
      .finally(function() {
        auth.signOut().then(function() {
          currentUser = null;
          currentUserData = {};
          currentRoomId = null;
          currentDmId = null;
          hide($('appMain'));
          show($('authScreen'));
        }).catch(function(){});
      });
  }

  function deleteCurrentAccount() {
    var uid = currentUser.uid;
    var batch = db.batch();
    batch.delete(db.collection('users').doc(uid));
    batch.commit().then(function() {
      currentUser.delete().then(function() {
        hide($('modalDeleteAccount'));
        hide($('appMain'));
        show($('authScreen'));
        showToast('Compte supprimé','info',4000);
      }).catch(function(err){ showToast('Erreur : '+err.message,'error'); });
    }).catch(function(){ showToast('Erreur suppression compte','error'); });
  }

  /* ══════════════════════════════════════════════════════════════
     25. PANEL ADMIN
  ══════════════════════════════════════════════════════════════ */
  function openAdminPanel() {
    var modal = $('modalAdmin');
    if (modal) {
      var box = modal.querySelector('.modal-box');
      if (box) {
        box.style.maxWidth  = 'min(560px, calc(100vw - 24px))';
        box.style.width     = '100%';
        box.style.maxHeight = '88vh';
        box.style.overflowY = 'auto';
      }
    }
    show(modal);
    loadAdminStats();
    initAdminTabs();
  }

  function loadAdminStats() {
    /* Users */
    db.collection('users').get().then(function(snap) {
      var el = $('adminStatUsers');
      if (el) el.textContent = snap.size;
    }).catch(function(){});
    db.collection('rooms').get().then(function(snap) {
      var el = $('adminStatMsgs');
      if (el) el.textContent = snap.size + ' salons';
    }).catch(function(){});
    /* Reports */
    db.collection('reports').where('status','==','pending').get().then(function(snap) {
      var el = $('adminStatReports');
      if (el) el.textContent = snap.size;
    }).catch(function(){});
    /* Bannis */
    db.collection('users').where('banned','==',true).get().then(function(snap) {
      var el = $('adminStatBanned');
      if (el) el.textContent = snap.size;
    }).catch(function(){});
  }

  function initAdminTabs() {
    qsa('.admin-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        qsa('.admin-tab').forEach(function(t){ t.classList.remove('active'); });
        qsa('.admin-panel').forEach(function(p){ p.classList.remove('active'); });
        tab.classList.add('active');
        var tabKey = tab.dataset.atab || '';
        var panel = $('adminPanel' + tabKey.charAt(0).toUpperCase() + tabKey.slice(1));
        if (panel) { panel.classList.add('active'); loadAdminTab(tabKey); }
      });
    });

    /* Annonce globale */
    var btnAnnounce = $('btnSendAnnouncement');
    if (btnAnnounce) {
      btnAnnounce.onclick = function() {
        var input = $('globalAnnouncement');
        if (!input || !input.value.trim()) { showToast('Entre une annonce','warning'); return; }
        db.collection('announcements').add({
          text: input.value.trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: currentUser.uid
        }).then(function() {
          showToast('Annonce envoyée','success');
          input.value = '';
        }).catch(function(){ showToast('Erreur','error'); });
      };
    }
  }

  function loadAdminTab(tab) {
    if (tab === 'users') {
      var list = $('adminUsersList');
      if (!list) return;
      list.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Chargement…</div>';
      db.collection('users').orderBy('createdAt','desc').limit(30).get().then(function(snap) {
        list.innerHTML = '';
        snap.forEach(function(doc) {
          var u = doc.data();
          var uid = doc.id;
          var item = document.createElement('div');
          item.className = 'admin-user-item';
          var isAlreadyAdmin = u.role === 'admin';
          item.innerHTML =
            '<div class="admin-user-avatar">' + avatarHtml(u.pseudo, u.emoji, u.color, 36, u.avatarUrl) + '</div>' +
            '<div class="admin-user-info"><div class="admin-user-name">' + escapeHtml(u.pseudo||'Anonyme') + (u.banned ? ' 🚫' : '') + (isAlreadyAdmin ? ' ⭐' : '') + '</div><div class="admin-user-role">' + (u.role||'user') + ' · ' + (u.email||'anon') + '</div></div>' +
            '<div class="admin-actions">' +
              /* Bannir / Débannir */
              '<button class="icon-btn icon-btn-sm" title="' + (u.banned ? 'Débannir' : 'Bannir') + '" data-action="ban" data-uid="'+uid+'" data-banned="'+(u.banned?'1':'0')+'">' +
                (u.banned
                  ? '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M7 2a5 5 0 100 10A5 5 0 007 2z" stroke="#22C55E" stroke-width="1.3" fill="none"/><path d="M4 7h6" stroke="#22C55E" stroke-width="1.3" stroke-linecap="round"/></svg>'
                  : '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><circle cx="7" cy="7" r="5" stroke="#EF4444" stroke-width="1.3" fill="none"/><line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="#EF4444" stroke-width="1.3" stroke-linecap="round"/></svg>') +
              '</button>' +
              /* Nommer Admin / Rétrograder — pas sur soi-même */
              (uid !== currentUser.uid
                ? '<button class="icon-btn icon-btn-sm" title="' + (isAlreadyAdmin ? 'Rétrograder' : 'Nommer Admin') + '" data-action="toggleAdmin" data-uid="'+uid+'" data-is-admin="'+(isAlreadyAdmin?'1':'0')+'" style="color:'+(isAlreadyAdmin?'#F59E0B':'#8B5CF6')+'">' +
                    (isAlreadyAdmin
                      ? '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M7 2l1.2 2.4L11 4.9l-2 1.9.5 2.7L7 8.3l-2.5 1.2.5-2.7L3 4.9l2.8-.5z" stroke="#F59E0B" stroke-width="1.2" stroke-linejoin="round"/></svg>'
                      : '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M7 2l1.2 2.4L11 4.9l-2 1.9.5 2.7L7 8.3l-2.5 1.2.5-2.7L3 4.9l2.8-.5z" stroke="#8B5CF6" stroke-width="1.2" stroke-linejoin="round" fill="#8B5CF6" opacity="0.3"/></svg>') +
                  '</button>'
                : '') +
            '</div>';
          /* Bannir */
          var banBtn = item.querySelector('[data-action="ban"]');
          if (banBtn) {
            banBtn.addEventListener('click', function() {
              var isBanned = banBtn.dataset.banned === '1';
              db.collection('users').doc(uid).update({ banned: !isBanned })
                .then(function() {
                  showToast(isBanned ? 'Utilisateur débanni' : 'Utilisateur banni', isBanned ? 'success' : 'warning');
                  loadAdminTab('users');
                  loadAdminStats();
                }).catch(function(){ showToast('Erreur','error'); });
            });
          }
          /* Nommer / Rétrograder Admin */
          var adminBtn = item.querySelector('[data-action="toggleAdmin"]');
          if (adminBtn) {
            adminBtn.addEventListener('click', function() {
              var making = adminBtn.dataset.isAdmin !== '1';
              var newRole = making ? 'admin' : 'user';
              db.collection('users').doc(uid).update({ role: newRole })
                .then(function() {
                  showToast(making ? (u.pseudo||'Utilisateur') + ' est maintenant Admin ⭐' : 'Admin retiré', making ? 'success' : 'info');
                  loadAdminTab('users');
                }).catch(function(){ showToast('Erreur','error'); });
            });
          }
          list.appendChild(item);
        });
      }).catch(function(){
        if (list) list.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Erreur de chargement</div>';
      });
    } else if (tab === 'reports') {
      var rlist = $('adminReportsList');
      if (!rlist) return;
      rlist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Chargement…</div>';
      db.collection('reports').where('status','==','pending').orderBy('createdAt','desc').limit(20).get().then(function(snap) {
        rlist.innerHTML = '';
        if (snap.empty) { rlist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Aucun signalement</div>'; return; }
        snap.forEach(function(doc) {
          var d = doc.data();
          var item = document.createElement('div');
          item.className = 'admin-report-item';
          item.style.cssText = 'flex-direction:column;align-items:flex-start;gap:6px;';
          item.innerHTML =
            '<div style="font-size:0.85rem;font-weight:600;">'+escapeHtml(d.reason||'')+'</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);">'+escapeHtml((d.msgText||'').substr(0,60))+'</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button class="btn-primary btn-sm" data-action="resolve" data-id="'+doc.id+'">Résoudre</button>' +
              '<button class="btn-danger btn-sm" data-action="ban" data-uid="'+(d.reportedUid||'')+'" data-id="'+doc.id+'">Bannir</button>' +
            '</div>';
          item.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function() {
              if (btn.dataset.action === 'resolve') {
                doc.ref.update({ status:'resolved' }).then(function(){ showToast('Résolu','success'); loadAdminTab('reports'); loadAdminStats(); });
              } else if (btn.dataset.action === 'ban') {
                var reportedUid = btn.dataset.uid;
                if (reportedUid) {
                  db.collection('users').doc(reportedUid).update({ banned:true }).catch(function(){});
                }
                doc.ref.update({ status:'resolved' }).then(function(){ showToast('Banni et résolu','warning'); loadAdminTab('reports'); loadAdminStats(); });
              }
            });
          });
          rlist.appendChild(item);
        });
      }).catch(function(){
        if (rlist) rlist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Erreur de chargement</div>';
      });
    } else if (tab === 'banned') {
      var blist = $('adminBannedList');
      if (!blist) return;
      blist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Chargement…</div>';
      db.collection('users').where('banned','==',true).get().then(function(snap) {
        blist.innerHTML = '';
        if (snap.empty) { blist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Aucun compte banni</div>'; return; }
        snap.forEach(function(doc) {
          var u = doc.data();
          var item = document.createElement('div');
          item.className = 'admin-user-item';
          item.innerHTML =
            '<div class="admin-user-avatar">' + avatarHtml(u.pseudo, u.emoji, u.color, 36, u.avatarUrl) + '</div>' +
            '<div class="admin-user-info"><div class="admin-user-name">'+escapeHtml(u.pseudo||'Anonyme')+'</div><div class="admin-user-role">'+escapeHtml(u.email||'anon')+'</div></div>' +
            '<button class="btn-primary btn-sm" data-uid="'+doc.id+'">Débannir</button>';
          item.querySelector('button').addEventListener('click', function() {
            db.collection('users').doc(doc.id).update({ banned:false })
              .then(function(){ showToast('Débanni','success'); loadAdminTab('banned'); loadAdminStats(); });
          });
          blist.appendChild(item);
        });
      }).catch(function(){
        if (blist) blist.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Erreur</div>';
      });
    } else if (tab === 'rooms') {
      var rlst = $('adminRoomsList');
      if (!rlst) return;
      rlst.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Chargement…</div>';
      db.collection('rooms').orderBy('lastMessageAt','desc').limit(20).get().then(function(snap) {
        rlst.innerHTML = '';
        snap.forEach(function(doc) {
          var r = doc.data();
          var item = document.createElement('div');
          item.className = 'admin-room-item';
          item.innerHTML =
            '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.9rem;">'+escapeHtml(r.name||'Salon')+'</div><div style="font-size:0.75rem;color:var(--text-muted);">'+escapeHtml(r.category||'')+'</div></div>' +
            '<button class="btn-danger btn-sm" data-id="'+doc.id+'">Supprimer</button>';
          item.querySelector('button').addEventListener('click', function() {
            if (!confirm('Supprimer le salon "'+r.name+'" ?')) return;
            doc.ref.delete().then(function(){ showToast('Salon supprimé','info'); loadAdminTab('rooms'); });
          });
          rlst.appendChild(item);
        });
      }).catch(function(){
        if (rlst) rlst.innerHTML = '<div style="padding:12px;color:var(--text-muted);">Erreur</div>';
      });
    }
  }


  /* ══════════════════════════════════════════════════════════════
     26. RECHERCHE GLOBALE
  ══════════════════════════════════════════════════════════════ */
  var globalSearchTimer;
  function initGlobalSearch() {
    var input = $('globalSearch');
    if (!input) return;
    input.addEventListener('input', function() {
      clearTimeout(globalSearchTimer);
      var q = input.value.trim();
      if (!q) { renderSearchEmpty(); return; }
      globalSearchTimer = setTimeout(function(){ runGlobalSearch(q); }, 350);
    });
  }

  function runGlobalSearch(q) {
    var results = $('searchResults');
    if (!results) return;
    results.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Recherche…</div>';
    var qLow = q.toLowerCase();

    /* Recherche salons + users en parallèle */
    var roomsPromise = db.collection('rooms').orderBy('name').startAt(q).endAt(q+'\uf8ff').limit(5).get();
    var usersPromise = db.collection('users').orderBy('pseudo').startAt(q).endAt(q+'\uf8ff').limit(5).get();

    Promise.all([roomsPromise, usersPromise]).then(function(values) {
      var roomSnap = values[0], userSnap = values[1];
      results.innerHTML = '';

      /* Salons */
      if (!roomSnap.empty) {
        var title = document.createElement('div');
        title.className = 'search-section-title';
        title.textContent = 'Salons';
        results.appendChild(title);
        roomSnap.forEach(function(doc) {
          var d = doc.data();
          var item = document.createElement('div');
          item.className = 'search-result-item';
          var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
          item.innerHTML =
            '<div style="width:36px;height:36px;border-radius:50%;background:'+(d.color||'#1A1A2E')+';display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">'+(catEmoji[d.category]||'💬')+'</div>' +
            '<div><div style="font-weight:600;font-size:0.9rem;">'+escapeHtml(d.name||'Salon')+'</div><div style="font-size:0.75rem;color:var(--text-muted);">'+escapeHtml(d.category||'')+' · '+(d.membersOnline||0)+' membre(s)</div></div>';
          item.addEventListener('click', function() {
            hide($('modalSearch'));
            openRoom(doc.id, d);
            showView('rooms');
            syncNavBtns('rooms');
          });
          results.appendChild(item);
        });
      }

      /* Utilisateurs */
      if (!userSnap.empty) {
        var title2 = document.createElement('div');
        title2.className = 'search-section-title';
        title2.textContent = 'Personnes';
        results.appendChild(title2);
        userSnap.forEach(function(doc) {
          var u = doc.data();
          var item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML =
            avatarHtml(u.pseudo, u.emoji, u.color, 36, u.avatarUrl) +
            '<div><div style="font-weight:600;font-size:0.9rem;">'+escapeHtml(u.pseudo||'Anonyme')+(u.certified?certBadgeHtml():'')+'</div><div style="font-size:0.75rem;color:var(--text-muted);">'+(u.flag||'🌍')+' '+(u.country||'')+'</div></div>';
          item.addEventListener('click', function() {
            openMemberProfile(doc.id, u);
          });
          results.appendChild(item);
        });
      }

      if (roomSnap.empty && userSnap.empty) {
        renderSearchEmpty(q);
      }
    }).catch(function() {
      results.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Erreur de recherche</div>';
    });
  }

  function renderSearchEmpty(q) {
    var results = $('searchResults');
    if (!results) return;
    results.innerHTML =
      '<div class="search-empty">' +
        '<svg viewBox="0 0 32 32" fill="none" width="32" height="32"><circle cx="14" cy="14" r="10" stroke="var(--text-muted)" stroke-width="1.5" fill="none"/><path d="M21 21l7 7" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '<p>' + (q ? 'Aucun résultat pour "'+escapeHtml(q)+'"' : 'Tape pour chercher') + '</p>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════
     27. EMOJI GRID
  ══════════════════════════════════════════════════════════════ */
  function buildEmojiGrid(grid, targetInput) {
    if (!grid) return;
    /* Reconstruire à chaque appel pour mettre à jour targetInput */
    grid.innerHTML = '';
    EMOJIS_QUICK.forEach(function(emoji) {
      var btn = document.createElement('button');
      btn.textContent = emoji;
      btn.setAttribute('aria-label', emoji);
      btn.style.cssText = 'width:36px;height:36px;font-size:1.3rem;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background 0.1s,transform 0.15s;';
      btn.addEventListener('click', function() {
        if (targetInput) {
          targetInput.focus();
          var sel = window.getSelection();
          var range;
          /* Insertion à la position du curseur si elle est dans l'élément */
          if (sel && sel.rangeCount > 0) {
            range = sel.getRangeAt(0);
            var container = range.commonAncestorContainer;
            var inTarget = container === targetInput || targetInput.contains(container);
            if (!inTarget) {
              /* Curseur ailleurs → aller à la fin */
              range = document.createRange();
              range.selectNodeContents(targetInput);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } else {
            range = document.createRange();
            range.selectNodeContents(targetInput);
            range.collapse(false);
            if (sel) { sel.removeAllRanges(); sel.addRange(range); }
          }
          /* Insérer l'emoji via execCommand (compatible mobile) */
          if (!document.execCommand('insertText', false, emoji)) {
            /* Fallback: injection manuelle */
            var textNode = document.createTextNode(emoji);
            if (range) {
              range.deleteContents();
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.collapse(true);
              if (sel) { sel.removeAllRanges(); sel.addRange(range); }
            }
          }
        }
        var hasText = targetInput && targetInput.textContent.trim().length > 0;
        var btnSend = $('btnSend'), btnVoice = $('btnVoice');
        if (btnSend)  btnSend.style.display  = hasText ? '' : 'none';
        if (btnVoice) btnVoice.style.display = hasText ? 'none' : '';
      });
      grid.appendChild(btn);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     28. FCM — PUSH NOTIFICATIONS
  ══════════════════════════════════════════════════════════════ */
  function initFCM() {
    if (!('serviceWorker' in navigator)) return;
    if (!firebase.messaging) return;
    try {
      messaging = firebase.messaging();
    } catch(e){ return; }

    /* Enregistrer le SW d'abord, puis demander la permission et récupérer le token */
    navigator.serviceWorker.register('firebase-messaging-sw.js')
      .then(function(registration) {
        messaging.useServiceWorker(registration);
        return Notification.requestPermission();
      })
      .then(function(permission) {
        if (permission !== 'granted') return;
        return messaging.getToken({ vapidKey: VAPID_KEY });
      })
      .then(function(token) {
        if (token && currentUser) {
          db.collection('users').doc(currentUser.uid).update({ fcmToken: token }).catch(function(){});
        }
      })
      .catch(function(){});

    /* Notifications en avant-plan */
    messaging.onMessage(function(payload) {
      var notif = payload.notification || {};
      playNotifSound();
      showToast((notif.title||'SIS') + ': ' + (notif.body||''), 'info', 5000);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     29. PRÉSENCE EN LIGNE — ÉCOUTER LES USERS
  ══════════════════════════════════════════════════════════════ */
  function listenOnlineUsers() {
    db.collection('users')
      .where('status','in',['online','away'])
      .limit(50)
      .onSnapshot(function(snap) {
        onlineUsers = {};
        snap.forEach(function(doc) {
          onlineUsers[doc.id] = doc.data();
        });
        updateOnlineFooter();
      }, function(){});
  }

  /* ══════════════════════════════════════════════════════════════
     30. INITIALISATION — POINT D'ENTRÉE
  ══════════════════════════════════════════════════════════════ */
  function boot() {
    detectLowEnd();
    /* AudioContext initialisé à la première interaction utilisateur (politique navigateur) */

    /* Récupérer la géo en cache si disponible */
    try {
      var cached = sessionStorage.getItem('sis_geo');
      if (cached) window.SIS_GEO = JSON.parse(cached);
    } catch(e){}

    /* Sidebar mobile — Escape */
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var sideMenu = $('sideMenu');
      if (sideMenu && sideMenu.style.display !== 'none') {
        hide(sideMenu); hide($('sideMenuOverlay'));
      }
    });

    /* Écouter recherche globale dans modal */
    var modalSearch = $('modalSearch');
    if (modalSearch) {
      
      var observer = new MutationObserver(function() {
        if (modalSearch.style.display !== 'none') {
          initGlobalSearch();
        }
      });
      observer.observe(modalSearch, { attributes:true, attributeFilter:['style'] });
    }

    /* Déclencher AudioContext sur première interaction utilisateur */
    document.addEventListener('click', function onFirstClick() {
      initAudio();
      document.removeEventListener('click', onFirstClick);
    }, { once: true });
    document.addEventListener('touchstart', function onFirstTouch() {
      initAudio();
      document.removeEventListener('touchstart', onFirstTouch);
    }, { once: true, passive: true });

    /* CGU puis Firebase */
    initCGU(function() {
      initFirebase();
      listenOnlineUsers();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ██  CANAUX (CHANNELS) — style WhatsApp
  ══════════════════════════════════════════════════════════════ */

  var currentChannelId   = null;
  var currentChannelData = {};
  var channelPostsListenerOff = null;
  var SIS_OFFICIAL_ID = 'sis-official-channel';

  function initSidebarTabs() {
    qsa('.sidebar-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        qsa('.sidebar-tab').forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
        var stab = tab.dataset.stab;
        if (stab === 'channels') {
          hide($('roomsList'));
          show($('channelsList'));
          hide($('categoryChips'));
          ensureSisOfficialChannel();
        } else {
          show($('roomsList'));
          hide($('channelsList'));
          show($('categoryChips'));
        }
      });
    });

    /* Click sur SIS Officiel statique */
    var sisEl = $('channelSisOfficial');
    if (sisEl) sisEl.addEventListener('click', function(){
      openChannel(SIS_OFFICIAL_ID, { name:'SIS Officiel', official:true, type:'channel' });
    });
  }

  function ensureSisOfficialChannel() {
    if (currentUserData.role !== 'admin') return;
    db.collection('rooms').doc(SIS_OFFICIAL_ID).get().then(function(snap) {
      if (!snap.exists) {
        db.collection('rooms').doc(SIS_OFFICIAL_ID).set({
          name:          'SIS Officiel',
          type:          'channel',
          category:      'general',
          description:   'Retrouve ici les nouveautés, mises à jour et annonces officielles de SIS.',
          official:      true,
          color:         '#5B8EF4',
          createdBy:     currentUser.uid,
          createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage:   '',
          subscribersCount: 0,
          membersOnline: 0
        }).catch(function(){});
      }
    });
  }

  function renderChannelsList(channels) {
    var otherList = $('otherChannelsList');
    if (!otherList) return;
    otherList.innerHTML = '';

    /* Mettre à jour preview SIS Officiel depuis Firestore */
    db.collection('rooms').doc(SIS_OFFICIAL_ID).collection('messages')
      .orderBy('createdAt','desc').limit(1).get()
      .then(function(snap) {
        if (!snap.empty) {
          var d = snap.docs[0].data();
          var prev = $('sisOfficialPreview');
          if (prev) prev.textContent = (d.text||'').substr(0,50) || 'Nouvelle publication';
          var t = $('sisOfficialTime');
          if (t) t.textContent = fmtRelTime(d.createdAt);
        }
      }).catch(function(){});

    /* Autres canaux */
    channels.filter(function(c){ return c.id !== SIS_OFFICIAL_ID; }).forEach(function(ch) {
      var d = ch.data;
      var item = document.createElement('div');
      item.className = 'channel-item';
      item.innerHTML =
        '<div class="channel-avatar" style="background:'+(d.color||'#1A1A2E')+'">' +
          (d.photo ? '<img src="'+escapeHtml(d.photo)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : '📢') +
        '</div>' +
        '<div class="channel-info">' +
          '<div class="channel-name-row"><span class="channel-name">'+escapeHtml(d.name||'Canal')+'</span></div>' +
          '<div class="channel-preview">'+(d.lastMessage||d.description||'Canal').substr(0,40)+'</div>' +
        '</div>' +
        '<div class="channel-meta"><span class="channel-time">'+fmtRelTime(d.lastMessageAt)+'</span></div>';
      item.addEventListener('click', function(){ openChannel(ch.id, d); });
      otherList.appendChild(item);
    });
  }

  function openChannel(channelId, channelData) {
    currentChannelId   = channelId;
    currentChannelData = channelData || {};

    /* Mobile : afficher zone chat */
    var layout = qs('.rooms-layout');
    if (layout) layout.classList.add('chat-open');

    hide($('chatEmptyState'));
    hide($('chatHeader'));
    hide($('inputBar'));
    show($('channelView'));

    /* Header */
    var catEmoji = { general:'💬',gaming:'🎮',tech:'💻',music:'🎵',sport:'⚽',education:'📚',manga:'📺',art:'🎨' };
    var av = $('channelViewAvatar');
    if (av) {
      if (channelData.official) {
        av.innerHTML = '<svg viewBox="0 0 36 36" width="36" height="36" fill="none"><defs><linearGradient id="chAvG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5B8EF4"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs><circle cx="18" cy="18" r="18" fill="url(#chAvG)"/><path d="M10 14h8M10 18h12M10 22h6" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';
      } else if (channelData.photo) {
        av.style.backgroundImage = 'url('+channelData.photo+')';
        av.style.backgroundSize  = 'cover';
        av.innerHTML = '';
      } else {
        av.textContent = '📢';
        av.style.background = channelData.color || '#1A1A2E';
      }
    }
    var nameEl = $('channelViewName');
    if (nameEl) nameEl.textContent = channelData.name || 'Canal';

    /* Nb abonnés */
    db.collection('rooms').doc(channelId).get().then(function(snap) {
      var d = snap.exists ? snap.data() : {};
      var subs = $('channelViewSubs');
      if (subs) subs.textContent = (d.subscribersCount||0) + ' abonné' + ((d.subscribersCount||0)>1?'s':'');
      var descEl = $('channelViewDesc');
      if (descEl && d.description) { descEl.textContent = d.description; descEl.style.display = ''; }
      else if (descEl) descEl.style.display = 'none';
    }).catch(function(){});

    /* Bouton retour */
    var btnBack = $('btnBackChannel');
    if (btnBack) {
      btnBack.onclick = function() {
        hide($('channelView'));
        show($('chatEmptyState'));
        if (layout) layout.classList.remove('chat-open');
        if (channelPostsListenerOff) { channelPostsListenerOff(); channelPostsListenerOff = null; }
        currentChannelId = null;
      };
    }

    /* Bouton suivre */
    var btnSub = $('btnSubscribeChannel');
    if (btnSub) {
      /* Vérifier si déjà abonné */
      db.collection('rooms').doc(channelId).collection('subscribers').doc(currentUser.uid).get()
        .then(function(snap) {
          if (snap.exists) {
            btnSub.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg> Abonné';
            btnSub.classList.add('subscribed');
          } else {
            btnSub.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M8 2v9M4 7l4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 14h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg> Suivre';
            btnSub.classList.remove('subscribed');
          }
        }).catch(function(){});
      btnSub.onclick = function() {
        var subRef = db.collection('rooms').doc(channelId).collection('subscribers').doc(currentUser.uid);
        var isSubbed = btnSub.classList.contains('subscribed');
        if (isSubbed) {
          subRef.delete().then(function() {
            db.collection('rooms').doc(channelId).update({ subscribersCount: firebase.firestore.FieldValue.increment(-1) }).catch(function(){});
            btnSub.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M8 2v9M4 7l4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 14h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg> Suivre';
            btnSub.classList.remove('subscribed');
          }).catch(function(){});
        } else {
          subRef.set({ uid: currentUser.uid, at: firebase.firestore.FieldValue.serverTimestamp() }).then(function() {
            db.collection('rooms').doc(channelId).update({ subscribersCount: firebase.firestore.FieldValue.increment(1) }).catch(function(){});
            btnSub.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg> Abonné';
            btnSub.classList.add('subscribed');
            showToast('Tu suis ce canal 🔔','success');
          }).catch(function(){});
        }
      };
    }

    /* Barre de post — visible seulement pour admin/créateur */
    var postBar = $('channelPostBar');
    var canPost = currentUserData.role === 'admin' || (currentChannelData.createdBy === currentUser.uid);
    if (postBar) postBar.style.display = canPost ? '' : 'none';
    if (canPost) initChannelPostBar(channelId);

    /* Charger les posts */
    loadChannelPosts(channelId);
  }

  function initChannelPostBar(channelId) {
    var input  = $('channelPostInput');
    var btnImg = $('btnChannelPostImage');
    var btnPost = $('btnChannelPost');
    if (!btnPost || !input) return;
    btnPost.onclick = function() {
      var text = input.textContent.trim();
      if (!text) return;
      input.textContent = '';
      db.collection('rooms').doc(channelId).collection('messages').add({
        text:            text,
        type:            'text',
        authorId:        currentUser.uid,
        authorPseudo:    currentUserData.pseudo || 'SIS',
        authorCertified: true,
        createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
        reactions:       {},
        views:           0
      }).then(function() {
        db.collection('rooms').doc(channelId).update({
          lastMessage:   text.substr(0,60),
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
      }).catch(function(){ showToast('Erreur envoi','error'); });
    };
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btnPost.click(); }
    });
    /* Image dans canal */
    if (btnImg) {
      var fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      btnImg.onclick = function(){ fileInput.click(); };
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0]; if (!file) return;
        if (file.size > 5*1024*1024) { showToast('Image trop lourde (max 5 Mo)','error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          uploadToCloudinary(ev.target.result, function(url) {
            if (!url) { showToast('Erreur upload','error'); return; }
            db.collection('rooms').doc(channelId).collection('messages').add({
              type:'image', imageUrl:url, text:'',
              authorId: currentUser.uid, authorPseudo: currentUserData.pseudo||'SIS',
              authorCertified: true,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              reactions: {}, views: 0
            }).then(function() {
              db.collection('rooms').doc(channelId).update({ lastMessage:'📷 Photo', lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function(){});
            });
          });
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
      });
    }
  }

  function loadChannelPosts(channelId) {
    var container = $('channelPosts');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">Chargement…</div>';
    if (channelPostsListenerOff) { channelPostsListenerOff(); channelPostsListenerOff = null; }
    channelPostsListenerOff = db.collection('rooms').doc(channelId).collection('messages')
      .orderBy('createdAt','desc').limit(30)
      .onSnapshot(function(snap) {
        container.innerHTML = '';
        if (snap.empty) {
          container.innerHTML = '<div class="channel-empty"><span>📭</span><p>Aucune publication pour l\'instant</p></div>';
          return;
        }
        snap.forEach(function(doc) {
          var d = doc.data();
          var card = buildChannelPostCard(doc.id, d, channelId);
          container.appendChild(card);
        });
      }, function(){});
  }

  function buildChannelPostCard(postId, d, channelId) {
    var card = document.createElement('div');
    card.className = 'channel-post-card' + (d.isBot ? ' channel-post-bot' : '');
    card.dataset.postId = postId;

    var timeStr = fmtTime(d.createdAt);
    var reactions = d.reactions || {};
    var totalReacts = Object.values(reactions).reduce(function(acc, arr){ return acc + (arr ? arr.length : 0); }, 0);

    /* Compter mes réactions */
    var myReact = null;
    Object.keys(reactions).forEach(function(emoji) {
      if (Array.isArray(reactions[emoji]) && reactions[emoji].indexOf(currentUser.uid) !== -1) myReact = emoji;
    });

    /* Résumé des réactions */
    var reactSummary = '';
    var reactCounts = {};
    Object.keys(reactions).forEach(function(emoji) {
      var arr = reactions[emoji];
      if (arr && arr.length) reactCounts[emoji] = arr.length;
    });
    if (Object.keys(reactCounts).length) {
      reactSummary = '<div class="channel-post-reacts">';
      Object.keys(reactCounts).forEach(function(emoji) {
        var isMine = myReact === emoji;
        reactSummary += '<button class="channel-react-chip'+(isMine?' mine':'')+'" data-emoji="'+escapeHtml(emoji)+'">'+escapeHtml(emoji)+' <span>'+reactCounts[emoji]+'</span></button>';
      });
      reactSummary += '</div>';
    }

    card.innerHTML =
      '<div class="channel-post-header">' +
        '<div class="channel-post-author">' +
          '<div class="channel-post-avatar">'+avatarHtml(d.authorPseudo||'SIS','','#5B8EF4',32,d.authorAvatarUrl)+'</div>' +
          '<div>' +
            '<span class="channel-post-name">'+escapeHtml(d.authorPseudo||'SIS')+'</span>'+certBadgeHtml() +
            '<span class="channel-post-time">'+escapeHtml(timeStr)+'</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (d.type==='image' ? '<div class="channel-post-image"><img src="'+escapeHtml(d.imageUrl||'')+'" loading="lazy" style="width:100%;border-radius:12px;max-height:320px;object-fit:cover;cursor:pointer"></div>' : '') +
      (d.text ? '<div class="channel-post-text">'+parseMarkdown(escapeHtml(d.text))+'</div>' : '') +
      '<div class="channel-post-footer">' +
        reactSummary +
        '<div class="channel-post-actions">' +
          '<button class="channel-action-btn channel-react-trigger" data-post-id="'+postId+'" title="Réagir">'+
            (myReact ? myReact : '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M7 11.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7.5" cy="8.5" r="1" fill="currentColor"/><circle cx="12.5" cy="8.5" r="1" fill="currentColor"/></svg>') +
          '</button>' +
          '<span class="channel-view-count"><svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 8C3 4.5 8 2 8 2s5 2.5 6.5 6C13 11.5 8 14 8 14S3 11.5 1.5 8z" stroke="currentColor" stroke-width="1.4"/></svg> '+(d.views||0)+'</span>' +
        '</div>' +
      '</div>';

    /* Incrémenter vues — une seule fois par utilisateur */
    if (currentUser) {
      var _postRef = db.collection('rooms').doc(channelId).collection('messages').doc(postId);
      var _viewedBy = d.viewedBy || {};
      if (!_viewedBy[currentUser.uid]) {
        var _upd = { views: firebase.firestore.FieldValue.increment(1) };
        _upd['viewedBy.' + currentUser.uid] = true;
        _postRef.update(_upd).catch(function(){});
      }
    }

    /* Clic sur image */
    var img = card.querySelector('img');
    if (img) img.addEventListener('click', function(){ openImagePreview(d.imageUrl); });

    /* Réaction rapide via chip existante */
    qsa('.channel-react-chip', card).forEach(function(chip) {
      chip.addEventListener('click', function() { toggleChannelReaction(channelId, postId, chip.dataset.emoji); });
    });

    /* Ouvrir modal réaction */
    var reactTrigger = card.querySelector('.channel-react-trigger');
    if (reactTrigger) {
      reactTrigger.addEventListener('click', function() {
        openChannelReactModal(channelId, postId);
      });
    }

    return card;
  }

  function openChannelReactModal(channelId, postId) {
    var modal = $('modalChannelReact');
    if (!modal) return;
    qsa('.channel-react-btn', modal).forEach(function(btn) {
      btn.onclick = function() {
        toggleChannelReaction(channelId, postId, btn.dataset.emoji);
        hide(modal);
      };
    });
    show(modal);
  }

  function toggleChannelReaction(channelId, postId, emoji) {
    var ref = db.collection('rooms').doc(channelId).collection('messages').doc(postId);
    ref.get().then(function(snap) {
      if (!snap.exists) return;
      var reactions = snap.data().reactions || {};
      var arr = reactions[emoji] || [];
      var idx = arr.indexOf(currentUser.uid);
      if (idx === -1) {
        /* Retirer ancienne réaction si besoin */
        Object.keys(reactions).forEach(function(e) {
          if (e !== emoji) {
            var i = (reactions[e]||[]).indexOf(currentUser.uid);
            if (i !== -1) reactions[e].splice(i,1);
          }
        });
        arr.push(currentUser.uid);
      } else {
        arr.splice(idx,1);
      }
      reactions[emoji] = arr;
      /* Envoyer floating emoji */
      spawnFloatingEmoji(emoji);
      ref.update({ reactions: reactions }).catch(function(){});
    });
  }

  /* Spawn emoji flottant (hook psychologique) */
  function spawnFloatingEmoji(emoji) {
    var container = $('floatingEmojis');
    if (!container) return;
    for (var i = 0; i < 5; i++) {
      (function(i) {
        setTimeout(function() {
          var el = document.createElement('div');
          el.className = 'floating-emoji';
          el.textContent = emoji;
          el.style.left = (20 + Math.random() * 60) + '%';
          el.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
          el.style.fontSize = (1.2 + Math.random() * 0.8) + 'rem';
          container.appendChild(el);
          setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
        }, i * 120);
      })(i);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ██  RANDOM CHAT — Hooks psychologiques (TikTok / Instagram)
  ══════════════════════════════════════════════════════════════ */

  var randomSearchIntervalId = null;

  function getStreakKey() { return 'sis_rand_streak_' + (currentUser ? currentUser.uid : 'anon'); }

  function initRandomHooks() {
    /* Stats FOMO */
    db.collection('users').where('status','==','online').get().then(function(snap) {
      var el = $('randomOnlineCount');
      if (el) el.textContent = snap.size;
    }).catch(function(){});

    db.collection('randomSessions').where('createdAt','>=', new firebase.firestore.Timestamp(Math.floor(Date.now()/1000)-86400, 0)).get().then(function(snap) {
      var el = $('randomTodayCount');
      if (el) el.textContent = snap.size + '+';
    }).catch(function(){});

    db.collection('randomQueue').where('status','==','waiting').get().then(function(snap) {
      var el = $('randomWaitCount');
      if (el) el.textContent = snap.size;
      var badge = $('randomQueueBadge'), num = $('randomQueueNum');
      if (badge && snap.size > 0) { badge.style.display=''; if (num) num.textContent = snap.size; }
    }).catch(function(){});

    /* Streak */
    renderStreak();

    /* Social proof — avatars des derniers utilisateurs online */
    db.collection('users').where('status','==','online').limit(5).get().then(function(snap) {
      var row = $('randomProofAvatars');
      var txt = $('randomProofText');
      if (!row) return;
      row.innerHTML = '';
      var count = 0;
      snap.forEach(function(doc) {
        if (doc.id === currentUser.uid) return;
        var u = doc.data();
        var a = document.createElement('div');
        a.className = 'proof-avatar';
        a.appendChild(makeAvatarEl(u.pseudo,u.emoji,u.color,28,u.avatarUrl));
        row.appendChild(a);
        count++;
      });
      if (txt && count > 0) txt.textContent = count + ' personne'+(count>1?'s sont':' est')+' là maintenant';
    }).catch(function(){});
  }

  function renderStreak() {
    var bar  = $('randomStreakBar');
    var cnt  = $('randomStreakCount');
    var plur = $('randomStreakPlural');
    if (!bar || !cnt) return;
    var streak = getStreak();
    if (streak > 0) {
      cnt.textContent  = streak;
      if (plur) plur.textContent = streak > 1 ? 's' : '';
      bar.style.display = '';
    } else {
      bar.style.display = 'none';
    }
  }

  function getStreak() {
    try {
      var data = JSON.parse(localStorage.getItem(getStreakKey()) || '{}');
      var today = new Date().toDateString();
      var last  = data.lastDay;
      var streak = data.streak || 0;
      if (last === today) return streak;
      var yesterday = new Date(Date.now()-86400000).toDateString();
      if (last === yesterday) return streak; /* streak actif, pas encore incrementé aujourd'hui */
      return 0;
    } catch(e){ return 0; }
  }

  function bumpStreak() {
    try {
      var data  = JSON.parse(localStorage.getItem(getStreakKey()) || '{}');
      var today = new Date().toDateString();
      var yesterday = new Date(Date.now()-86400000).toDateString();
      if (data.lastDay === today) return;
      if (data.lastDay === yesterday) {
        data.streak = (data.streak||0)+1;
      } else {
        data.streak = 1;
      }
      data.lastDay = today;
      localStorage.setItem(getStreakKey(), JSON.stringify(data));
      /* Toast streak */
      var streak = data.streak;
      if (streak >= 2) {
        var t = $('streakToast');
        var txt = $('streakToastText');
        if (t && txt) {
          txt.textContent = streak + ' jours de suite ! Continue comme ça 🔥';
          t.style.display = '';
          setTimeout(function(){ t.style.display='none'; }, 4000);
        }
      }
      renderStreak();
    } catch(e){}
  }

  /* Timer dans la vue searching */
  function startSearchTimer() {
    var timerEl = $('searchingTimer');
    var hintEl  = $('searchingHint');
    var hints = [
      'Des centaines de personnes sont connectées',
      'Quelqu\'un cherche aussi une connexion…',
      'La meilleure conversation t\'attend',
      'Chaque seconde rapproche du match parfait ⚡'
    ];
    var hintIdx = 0;
    var secs = 0;
    if (randomSearchIntervalId) clearInterval(randomSearchIntervalId);
    randomSearchIntervalId = setInterval(function() {
      secs++;
      if (timerEl) timerEl.textContent = secs + 's';
      if (hintEl && secs % 7 === 0) {
        hintIdx = (hintIdx+1) % hints.length;
        hintEl.style.opacity = '0';
        setTimeout(function(){ hintEl.textContent = hints[hintIdx]; hintEl.style.opacity='1'; }, 300);
      }
    }, 1000);
  }

  function stopSearchTimer() {
    if (randomSearchIntervalId) { clearInterval(randomSearchIntervalId); randomSearchIntervalId = null; }
    var timerEl = $('searchingTimer');
    if (timerEl) timerEl.textContent = '0s';
  }

  /* Score de compatibilité — aléatoire mais psychologiquement engageant */
  function showCompatScore() {
    var badge = $('randomCompatBadge');
    var score = $('randomCompatScore');
    if (!badge || !score) return;
    /* Score entre 72–99 pour que ça soit toujours "élevé" */
    var val = 72 + Math.floor(Math.random()*28);
    score.textContent = '0%';
    badge.style.display = '';
    /* Animation compteur */
    var current = 0;
    var step = Math.ceil(val/20);
    var anim = setInterval(function() {
      current = Math.min(current + step, val);
      score.textContent = current + '%';
      if (current >= val) clearInterval(anim);
    }, 50);
  }

  /* Réactions rapides flottantes pendant le random chat */
  function initRandomQuickReactions() {
    qsa('.quick-react-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var emoji = btn.dataset.emoji;
        spawnFloatingEmoji(emoji);
        /* Envoyer emoji comme message court */
        if (randomSessionId) {
          db.collection('randomSessions').doc(randomSessionId).collection('messages').add({
            text:         emoji,
            senderId:     currentUser.uid,
            senderPseudo: currentUserData.pseudo||'Anonyme',
            senderEmoji:  currentUserData.emoji||'',
            senderColor:  currentUserData.color||'#5B8EF4',
            isReaction:   true,
            createdAt:    firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function(){});
        }
        /* Animation bounce sur le bouton */
        btn.style.transform = 'scale(1.4)';
        setTimeout(function(){ btn.style.transform=''; }, 200);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ██  OVERRIDE : patch initRandomView avec les hooks
  ══════════════════════════════════════════════════════════════ */
  var _origInitRandomView = initRandomView;

  /* Patch startRandomSearch pour injecter timer et streak */
  var _origStartRandom = startRandomSearch;
  startRandomSearch = function() {
    startSearchTimer();
    bumpStreak();
    _origStartRandom.apply(this, arguments);
  };

  var _origCancelRandom = cancelRandomSearch;
  cancelRandomSearch = function() {
    stopSearchTimer();
    _origCancelRandom.apply(this, arguments);
  };

  var _origShowRandomChat = showRandomChat;
  showRandomChat = function(partnerId, partnerData, sessionId) {
    stopSearchTimer();
    _origShowRandomChat.apply(this, arguments);
    showCompatScore();
    initRandomQuickReactions();
  };

  var _origLeaveRandom = leaveRandom;
  leaveRandom = function() {
    stopSearchTimer();
    _origLeaveRandom.apply(this, arguments);
    /* Relancer les hooks */
    setTimeout(initRandomHooks, 300);
  };

  /* ══════════════════════════════════════════════════════════════
     ██  BOOTSTRAP : injecter initSidebarTabs + initRandomHooks
  ══════════════════════════════════════════════════════════════ */
  var _origInitApp = initApp;
  initApp = function() {
    _origInitApp.apply(this, arguments);
    initSidebarTabs();
    initRandomHooks();
  };


  /* ══════════════════════════════════════════════════════════════
     SIS BOT — Commandes slash + rendu des cartes
     APIs : Jikan · MangaDex · NekosBest · Waifu.im
            Chuck Norris · Useless Facts · Imgflip · TheMealDB
  ══════════════════════════════════════════════════════════════ */

  /* ── Injection CSS bot-cards ── */
  (function injectBotStyles() {
    if (document.getElementById('sis-bot-styles')) return;
    var s = document.createElement('style');
    s.id = 'sis-bot-styles';
    s.textContent = [
      '.bot-card{background:var(--bg-elevated,#1A1A2E);border:1px solid rgba(91,142,244,0.22);border-radius:16px;overflow:hidden;max-width:300px;width:100%;margin:2px 0}',
      '.bot-card .bc-stripe{height:3px}',
      '.bot-card .bc-body{padding:14px}',
      '.bc-cmd{font-family:monospace;font-size:10px;color:var(--text-muted,#5C5C80);margin-bottom:8px;letter-spacing:.3px}',
      /* pokemon */
      '.bc-poke-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      '.bc-poke-id{font-family:monospace;font-size:11px;color:var(--text-muted,#5C5C80)}',
      '.bc-poke-name{font-size:15px;font-weight:800;text-transform:capitalize;color:var(--text-primary,#F0F0FA);flex:1}',
      '.bc-types{display:flex;gap:4px;flex-wrap:wrap}',
      '.bc-type{border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:capitalize}',
      '.bc-poke-img{width:100%;height:130px;object-fit:contain;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:10px}',
      '.bc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}',
      '.bc-stat{background:rgba(0,0,0,0.25);border-radius:8px;padding:6px 8px;text-align:center}',
      '.bc-stat-l{font-size:10px;color:var(--text-muted,#5C5C80)}',
      '.bc-stat-v{font-size:15px;font-weight:800;color:#F59E0B}',
      '.bc-poke-meta{font-size:11px;color:var(--text-secondary,#9898C0);display:flex;gap:10px}',
      /* anime / manga */
      '.bc-anime-inner{display:flex;gap:10px}',
      '.bc-anime-cover{width:70px;height:95px;object-fit:cover;border-radius:8px;flex-shrink:0}',
      '.bc-anime-info{flex:1;min-width:0}',
      '.bc-anime-title{font-size:13px;font-weight:800;color:var(--text-primary,#F0F0FA);margin-bottom:4px;line-height:1.3}',
      '.bc-anime-score{font-size:12px;color:#F59E0B;margin-bottom:4px}',
      '.bc-tags{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}',
      '.bc-tag{font-size:10px;color:#8B5CF6;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:4px;padding:1px 6px}',
      '.bc-anime-synopsis{font-size:11px;color:var(--text-secondary,#9898C0);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.bc-anime-footer{display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);align-items:center;flex-wrap:wrap}',
      '.bc-anime-footer span{font-size:11px;color:var(--text-muted,#5C5C80)}',
      '.bc-anime-footer a{font-size:11px;color:#5B8EF4;text-decoration:none;margin-left:auto}',
      /* gif neko / waifu */
      '.bc-gif-img{width:100%;border-radius:10px;max-height:220px;object-fit:cover}',
      '.bc-gif-label{font-size:11px;font-weight:600;margin-top:7px;text-align:center}',
      /* fact / chuck */
      '.bc-fact-ico{font-size:26px;margin-bottom:7px}',
      '.bc-fact-txt{font-size:13px;color:var(--text-primary,#F0F0FA);line-height:1.7;font-style:italic}',
      '.bc-chuck-inner{display:flex;gap:10px;align-items:flex-start}',
      '.bc-chuck-ico{width:38px;height:38px;border-radius:8px;flex-shrink:0;object-fit:cover}',
      /* meme */
      '.bc-meme-img{width:100%;border-radius:8px;max-height:220px;object-fit:cover}',
      '.bc-meme-name{font-size:10px;color:var(--text-muted,#5C5C80);margin-top:6px}',
      /* meal */
      '.bc-meal-img{width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:10px}',
      '.bc-meal-title{font-size:14px;font-weight:800;color:var(--text-primary,#F0F0FA);margin-bottom:4px}',
      '.bc-meal-meta{display:flex;gap:8px;margin-bottom:6px}',
      '.bc-meal-meta span{font-size:11px;color:var(--text-secondary,#9898C0)}',
      '.bc-meal-txt{font-size:11px;color:var(--text-muted,#5C5C80);line-height:1.6}',
      /* quiz */
      '.bc-quiz-cat{font-size:10px;color:var(--text-muted,#5C5C80);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}',
      '.bc-quiz-q{font-size:13px;font-weight:700;color:var(--text-primary,#F0F0FA);margin-bottom:12px;line-height:1.6}',
      '.bc-quiz-opts{display:flex;flex-direction:column;gap:6px}',
      '.bc-quiz-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;color:var(--text-primary,#F0F0FA);font-size:12px;text-align:left;cursor:pointer;transition:all .2s;font-family:inherit;font-weight:500;width:100%}',
      '.bc-quiz-btn:hover{border-color:#5B8EF4;background:rgba(91,142,244,0.1)}',
      '.bc-quiz-btn.bc-correct{background:rgba(34,197,94,0.15)!important;border-color:#22C55E!important;color:#22C55E!important;font-weight:700}',
      '.bc-quiz-btn.bc-wrong{background:rgba(239,68,68,0.15)!important;border-color:#EF4444!important;color:#EF4444!important}',
      '.bc-quiz-result{margin-top:10px;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;text-align:center}',
      '.bc-quiz-result.bc-win{background:rgba(34,197,94,0.15);color:#22C55E}',
      '.bc-quiz-result.bc-lose{background:rgba(239,68,68,0.15);color:#EF4444}',
      /* loading spinner */
      '.bc-loading{display:flex;gap:6px;align-items:center;padding:4px 0}',
      '.bc-loading span{width:7px;height:7px;border-radius:50%;background:#5B8EF4;animation:bcBounce 1.1s infinite}',
      '.bc-loading span:nth-child(2){animation-delay:.15s;background:#8B5CF6}',
      '.bc-loading span:nth-child(3){animation-delay:.3s}',
      '@keyframes bcBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}',
      /* bot channel post */
      '.channel-post-bot{background:linear-gradient(135deg,rgba(91,142,244,0.08),rgba(139,92,246,0.08)) !important;border:1px solid rgba(91,142,244,0.3) !important;position:relative;overflow:hidden}',
      '.channel-post-bot::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#5B8EF4,#8B5CF6)}',
      '.channel-post-bot .channel-post-text{white-space:pre-line;line-height:1.7;font-size:13.5px}',
      '.channel-post-bot .channel-post-name{background:linear-gradient(90deg,#5B8EF4,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      /* cmd popup */
      '#sis-cmd-popup{position:fixed;bottom:72px;left:12px;right:12px;background:#1A1A2E;border:1px solid rgba(91,142,244,0.25);border-radius:14px;overflow:hidden;z-index:9999;box-shadow:0 -4px 24px rgba(0,0,0,0.4);max-height:260px;overflow-y:auto}',
      '.sis-cmd-item{display:flex;align-items:baseline;gap:8px;padding:10px 14px;cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(255,255,255,0.04)}',
      '.sis-cmd-item:last-child{border-bottom:none}',
      '.sis-cmd-item:hover,.sis-cmd-item:active{background:rgba(91,142,244,0.12)}',
      '.sis-cmd-name{font-family:monospace;font-size:13px;font-weight:700;color:#5B8EF4;flex-shrink:0}',
      '.sis-cmd-args{font-family:monospace;font-size:12px;color:#8B5CF6;flex-shrink:0}',
      '.sis-cmd-desc{font-size:12px;color:rgba(255,255,255,0.5);margin-left:auto;text-align:right}'
    ].join('');
    document.head.appendChild(s);
  })();

  /* ── TYPE_COLORS Pokémon ── */
  var BC_TYPE_COLORS = {
    fire:'#EF4444',water:'#3B82F6',grass:'#22C55E',electric:'#F59E0B',
    psychic:'#EC4899',ice:'#67E8F9',dragon:'#7C3AED',dark:'#9CA3AF',
    fairy:'#F9A8D4',normal:'#9CA3AF',fighting:'#B45309',poison:'#A855F7',
    ground:'#D97706',flying:'#60A5FA',bug:'#65A30D',rock:'#78716C',
    ghost:'#6D28D9',steel:'#6B7280'
  };

  /* ── Decode HTML entities ── */
  function bcDecode(s) {
    return (s||'').replace(/&quot;/g,'"').replace(/&#039;/g,"'")
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&eacute;/g,'é').replace(/&egrave;/g,'è')
      .replace(/&agrave;/g,'à').replace(/&ocirc;/g,'ô')
      .replace(/&ccedil;/g,'ç').replace(/&iuml;/g,'ï');
  }

  /* ══════════════════════════════════════════════════════════════
     HANDLER PRINCIPAL — handleBotCommand(text)
  ══════════════════════════════════════════════════════════════ */
  function handleBotCommand(text) {
    if (!currentRoomId || !currentUser) return;
    var cmd = text.trim().toLowerCase();
    var args = text.trim().split(/\s+/).slice(1).join(' ');

    /* Afficher loading immédiatement côté local */
    var loadId = 'bc-load-' + Date.now();
    showBotLoading(loadId);

    var p;
    /* ─ Anime / Manga ─ */
    var q;
    if (cmd.startsWith('/anime') || cmd.startsWith('/animé') || cmd.startsWith('/manga')) {
      q = args || 'solo leveling';
      p = bcFetchAnime(q);
    }
    /* ─ Webtoon (MangaDex FR) ─ */
    else if (cmd.startsWith('/webtoon')) {
      q = args || 'tower of god';
      p = bcFetchWebtoon(q);
    }
    /* ─ GIF Hug / Pat / Cry etc ─ */
    else if (cmd.startsWith('/hug'))   { p = bcFetchNeko('hug'); }
    else if (cmd.startsWith('/pat'))   { p = bcFetchNeko('pat'); }
    else if (cmd.startsWith('/kiss'))  { p = bcFetchNeko('kiss'); }
    else if (cmd.startsWith('/cry'))   { p = bcFetchNeko('cry'); }
    else if (cmd.startsWith('/wave'))  { p = bcFetchNeko('wave'); }
    else if (cmd.startsWith('/waifu')) { p = bcFetchWaifu(); }
    /* ─ Fun ─ */
    else if (cmd.startsWith('/chuck'))  { p = bcFetchChuck(); }
    else if (cmd.startsWith('/fact'))   { p = bcFetchFact(); }
    else if (cmd.startsWith('/meme'))   { p = bcFetchMeme(); }
    /* ─ Recette ─ */
    else if (cmd.startsWith('/recette') || cmd.startsWith('/food') || cmd.startsWith('/repas')) {
      p = bcFetchMeal(args);
    }
    /* ─ Aide ─ */
    else if (cmd.startsWith('/bot') || cmd.startsWith('/help') || cmd.startsWith('/aide')) {
      hideBotLoading(loadId);
      sendMessage({
        type: 'text',
        text: '🤖 Commandes SIS Bot :\n/anime [titre] · /webtoon [titre] · /hug · /pat · /kiss · /cry · /wave · /waifu · /chuck · /fact · /meme · /recette'
      });
      return;
    }
    else {
      hideBotLoading(loadId);
      showToast('Commande inconnue. Tape /aide pour la liste.', 'warning');
      return;
    }

    p.then(function(cardData) {
      hideBotLoading(loadId);
      sendMessage({
        type:      'bot-card',
        cardType:  cardData.cardType,
        cardData:  cardData,
        cardLabel: cardData.label || text,
        text:      text
      });
    }).catch(function(err) {
      hideBotLoading(loadId);
      showToast('Erreur API : ' + (err.message || 'Réessaie'), 'error');
    });
  }

  /* ── Popup suggestions commandes slash ── */
  var BOT_CMDS = [
    { cmd: '/anime',   args: '[titre]',   desc: 'Fiche animé (score, genres, synopsis)' },
    { cmd: '/manga',   args: '[titre]',   desc: 'Fiche manga MyAnimeList' },
    { cmd: '/webtoon', args: '[titre]',   desc: 'Webtoon MangaDex 🇫🇷' },
    { cmd: '/hug',     args: '',          desc: 'GIF hug animé 🤗' },
    { cmd: '/pat',     args: '',          desc: 'GIF pat animé 🥺' },
    { cmd: '/kiss',    args: '',          desc: 'GIF kiss animé 💋' },
    { cmd: '/cry',     args: '',          desc: 'GIF cry animé 😢' },
    { cmd: '/wave',    args: '',          desc: 'GIF wave animé 👋' },
    { cmd: '/waifu',   args: '',          desc: 'Image waifu aléatoire' },
    { cmd: '/chuck',   args: '',          desc: 'Blague Chuck Norris 💪' },
    { cmd: '/fact',    args: '',          desc: 'Fait insolite du jour' },
    { cmd: '/meme',    args: '',          desc: 'Mème Imgflip aléatoire 😂' },
    { cmd: '/recette', args: '[plat]',    desc: 'Recette avec photo 🍽️' },
    { cmd: '/aide',    args: '',          desc: 'Afficher toutes les commandes' }
  ];

  function showBotCmdHints(text) {
    var existing = document.getElementById('sis-cmd-popup');
    if (!text.startsWith('/')) {
      if (existing) existing.remove();
      return;
    }
    var typed = text.toLowerCase();
    var matches = BOT_CMDS.filter(function(c) { return c.cmd.startsWith(typed); });
    if (!matches.length) { if (existing) existing.remove(); return; }

    var popup = existing || document.createElement('div');
    popup.id = 'sis-cmd-popup';
    popup.innerHTML = matches.map(function(c) {
      return '<div class="sis-cmd-item" data-cmd="' + c.cmd + '">' +
        '<span class="sis-cmd-name">' + c.cmd + '</span>' +
        (c.args ? '<span class="sis-cmd-args"> ' + c.args + '</span>' : '') +
        '<span class="sis-cmd-desc">' + c.desc + '</span>' +
      '</div>';
    }).join('');

    if (!existing) {
      var inputBar = document.getElementById('inputBar');
      if (inputBar) inputBar.insertAdjacentElement('beforebegin', popup);
      /* Clic sur suggestion */
      popup.addEventListener('click', function(e) {
        var item = e.target.closest('.sis-cmd-item');
        if (!item) return;
        var msgInput = document.getElementById('msgInput');
        if (msgInput) {
          msgInput.textContent = item.dataset.cmd + (item.dataset.cmd.match(/anime|manga|webtoon|recette/) ? ' ' : '');
          /* placer curseur à la fin */
          var range = document.createRange();
          var sel = window.getSelection();
          range.selectNodeContents(msgInput);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          msgInput.focus();
        }
        popup.remove();
      });
    }
  }

  /* Fermer popup au clic dehors */
  document.addEventListener('click', function(e) {
    var popup = document.getElementById('sis-cmd-popup');
    if (popup && !popup.contains(e.target) && e.target.id !== 'msgInput') popup.remove();
  });

  /* ── Loading local ── */
  function showBotLoading(id) {
    /* On injecte un faux message temporaire dans #chatMessages */
    var box = document.getElementById('chatMessages');
    if (!box) return;
    var el = document.createElement('div');
    el.id = id;
    el.className = 'msg-wrap';
    el.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:2px 12px;';
    el.innerHTML = '<div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#5B8EF4,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">🤖</div>' +
      '<div style="background:var(--bg-card,#1E1E35);border:1px solid rgba(91,142,244,0.2);border-radius:14px;padding:12px 16px;">' +
        '<div class="bc-loading"><span></span><span></span><span></span></div>' +
      '</div>';
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }
  function hideBotLoading(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  /* ══════════════════════════════════════════════════════════════
     FETCHERS API
  ══════════════════════════════════════════════════════════════ */

  function bcFetchAnime(q) {
    return fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(q) + '&limit=1')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (!d.data || !d.data[0]) throw new Error('Animé introuvable : ' + q);
        var a = d.data[0];
        var synopsis = (a.synopsis||'').replace(/\[Written.*?\]/g,'').substring(0,140);
        if (synopsis.length === 140) synopsis += '…';
        return {
          cardType: 'anime',
          label: '📖 ' + (a.title_french||a.title),
          title: a.title_french || a.title,
          titleEn: a.title,
          image: a.images && a.images.jpg ? a.images.jpg.large_image_url : '',
          score: a.score,
          episodes: a.episodes,
          status: a.status,
          synopsis: synopsis,
          genres: (a.genres||[]).slice(0,3).map(function(g){return g.name;}),
          year: a.year,
          url: a.url,
          type: a.type
        };
      });
  }

  function bcFetchWebtoon(q) {
    return fetch('https://api.mangadex.org/manga?title=' + encodeURIComponent(q) +
      '&availableTranslatedLanguage[]=fr&limit=1&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (!d.data || !d.data[0]) {
          /* Fallback sans filtre FR */
          return fetch('https://api.mangadex.org/manga?title=' + encodeURIComponent(q) +
            '&limit=1&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art')
            .then(function(r2){ return r2.json(); });
        }
        return d;
      })
      .then(function(d) {
        if (!d.data || !d.data[0]) throw new Error('Webtoon introuvable : ' + q);
        var m = d.data[0];
        var attr = m.attributes;
        var title = (attr.title && (attr.title.fr || attr.title.en || attr.title['ja-ro'] || Object.values(attr.title)[0])) || q;
        var synopsis = '';
        if (attr.description) {
          synopsis = (attr.description.fr || attr.description.en || Object.values(attr.description)[0] || '').substring(0,140);
          if (synopsis.length === 140) synopsis += '…';
        }
        /* Cover */
        var cover = '';
        var rel = m.relationships || [];
        for (var i=0;i<rel.length;i++) {
          if (rel[i].type === 'cover_art' && rel[i].attributes) {
            cover = 'https://uploads.mangadex.org/covers/' + m.id + '/' + rel[i].attributes.fileName + '.256.jpg';
            break;
          }
        }
        var tags = (attr.tags||[]).slice(0,3).map(function(t){ return t.attributes && t.attributes.name ? (t.attributes.name.fr||t.attributes.name.en||'') : ''; }).filter(Boolean);
        return {
          cardType: 'webtoon',
          label: '📱 ' + title,
          title: title,
          image: cover,
          synopsis: synopsis,
          tags: tags,
          status: attr.status,
          year: attr.year,
          url: 'https://mangadex.org/title/' + m.id,
          hasFr: !!(attr.availableTranslatedLanguages && attr.availableTranslatedLanguages.indexOf('fr') !== -1)
        };
      });
  }

  function bcFetchNeko(action) {
    return fetch('https://nekos.best/api/v2/' + action)
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (!d.results || !d.results[0]) throw new Error('GIF introuvable');
        return {
          cardType: 'neko',
          label: '🎭 ' + action,
          action: action,
          image: d.results[0].url,
          anime: d.results[0].anime_name || ''
        };
      });
  }

  function bcFetchWaifu() {
    return fetch('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (!d.images || !d.images[0]) throw new Error('Waifu introuvable');
        var img = d.images[0];
        return {
          cardType: 'waifu',
          label: '🌸 Waifu',
          image: img.url,
          source: img.source || '',
          tags: (img.tags||[]).slice(0,2).map(function(t){return t.name;})
        };
      });
  }

  function bcFetchChuck() {
    return fetch('https://api.chucknorris.io/jokes/random')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        return {
          cardType: 'chuck',
          label: '💪 Chuck Norris',
          text: d.value,
          icon: d.icon_url
        };
      });
  }

  function bcFetchFact() {
    return fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        return {
          cardType: 'fact',
          label: '💡 Fait insolite',
          text: d.text
        };
      });
  }

  function bcFetchMeme() {
    return fetch('https://api.imgflip.com/get_memes')
      .then(function(r){ return r.json(); })
      .then(function(d) {
        var memes = d.data.memes;
        var m = memes[Math.floor(Math.random()*30)];
        return {
          cardType: 'meme',
          label: '😂 Mème',
          name: m.name,
          image: m.url
        };
      });
  }

  function bcFetchMeal(q) {
    var url = q
      ? 'https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q)
      : 'https://www.themealdb.com/api/json/v1/1/random.php';
    return fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(d) {
        var m = d.meals && d.meals[0];
        if (!m) return fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(function(r2){return r2.json();}).then(function(d2){return d2.meals[0];});
        return m;
      })
      .then(function(m) {
        var instructions = (m.strInstructions||'').substring(0,130) + '…';
        return {
          cardType: 'meal',
          label: '🍽️ ' + m.strMeal,
          name: m.strMeal,
          image: m.strMealThumb,
          category: m.strCategory,
          area: m.strArea,
          instructions: instructions,
          url: m.strYoutube || ''
        };
      });
  }

  /* ══════════════════════════════════════════════════════════════
     RENDERER — buildBotCardHtml(data)
  ══════════════════════════════════════════════════════════════ */
  function buildBotCardHtml(data) {
    var cd = data.cardData || {};
    var ct = data.cardType || cd.cardType || '';
    var cmd = escapeHtml(data.text || '');
    var cmdLine = '<div class="bc-cmd">🤖 ' + cmd + '</div>';

    if (ct === 'anime') {
      var statusTxt = cd.status === 'Finished Airing' ? '✅ Terminé' : cd.status === 'Currently Airing' ? '🔴 En cours' : (cd.status||'');
      var tags = (cd.genres||[]).map(function(g){ return '<span class="bc-tag">'+escapeHtml(g)+'</span>'; }).join('');
      var imgHtml = cd.image ? '<img class="bc-anime-cover" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="cover">' : '';
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#8B5CF6,#5B8EF4);height:3px"></div><div class="bc-body">' +
        cmdLine +
        '<div class="bc-anime-inner">' + imgHtml +
          '<div class="bc-anime-info">' +
            '<div class="bc-anime-title">'+escapeHtml(cd.title||'')+'</div>' +
            (cd.score ? '<div class="bc-anime-score">⭐ '+cd.score+'/10</div>' : '') +
            '<div class="bc-tags">'+tags+'</div>' +
            '<div class="bc-anime-synopsis">'+escapeHtml(cd.synopsis||'')+'</div>' +
          '</div>' +
        '</div>' +
        '<div class="bc-anime-footer">' +
          (cd.episodes ? '<span>📺 '+cd.episodes+' ep.</span>' : '') +
          '<span>'+statusTxt+'</span>' +
          (cd.url ? '<a href="'+escapeHtml(cd.url)+'" target="_blank" rel="noopener">MAL →</a>' : '') +
        '</div>' +
      '</div></div>';
    }

    if (ct === 'webtoon') {
      var statusTxt = cd.status === 'completed' ? '✅ Terminé' : cd.status === 'ongoing' ? '🔴 En cours' : (cd.status||'');
      var tags = (cd.tags||[]).map(function(g){ return '<span class="bc-tag">'+escapeHtml(g)+'</span>'; }).join('');
      var imgHtml = cd.image ? '<img class="bc-anime-cover" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="cover">' : '';
      var frBadge = cd.hasFr ? '<span class="bc-tag" style="color:#22C55E;background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.3)">🇫🇷 FR</span>' : '';
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#EC4899,#8B5CF6);height:3px"></div><div class="bc-body">' +
        cmdLine +
        '<div class="bc-anime-inner">' + imgHtml +
          '<div class="bc-anime-info">' +
            '<div class="bc-anime-title">'+escapeHtml(cd.title||'')+'</div>' +
            '<div class="bc-tags">'+frBadge+tags+'</div>' +
            '<div class="bc-anime-synopsis">'+escapeHtml(cd.synopsis||'')+'</div>' +
          '</div>' +
        '</div>' +
        '<div class="bc-anime-footer">' +
          '<span>'+statusTxt+'</span>' +
          (cd.year ? '<span>📅 '+cd.year+'</span>' : '') +
          (cd.url ? '<a href="'+escapeHtml(cd.url)+'" target="_blank" rel="noopener">MangaDex →</a>' : '') +
        '</div>' +
      '</div></div>';
    }

    if (ct === 'neko') {
      var actions = { hug:'🤗 Câlin !', pat:'✋ Pat pat !', kiss:'💋 Bisou !', cry:'😢 Tu pleures...', wave:'👋 Coucou !', baka:'😤 Baka !' };
      var label = actions[cd.action] || ('🎭 ' + (cd.action||''));
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#EC4899,#F97316);height:3px"></div><div class="bc-body">' +
        cmdLine +
        (cd.image ? '<img class="bc-gif-img" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="'+escapeHtml(cd.action||'')+'">': '') +
        '<div class="bc-gif-label" style="color:#EC4899">'+label+(cd.anime?' · <em style="color:var(--text-muted,#5C5C80);font-size:10px">'+escapeHtml(cd.anime)+'</em>':'')+'</div>' +
      '</div></div>';
    }

    if (ct === 'waifu') {
      var tags = (cd.tags||[]).map(function(t){ return '<span class="bc-tag">'+escapeHtml(t)+'</span>'; }).join('');
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#F472B6,#8B5CF6);height:3px"></div><div class="bc-body">' +
        cmdLine +
        (cd.image ? '<img class="bc-gif-img" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="waifu">' : '') +
        '<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">'+tags+'</div>' +
      '</div></div>';
    }

    if (ct === 'chuck') {
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#6366F1,#5B8EF4);height:3px"></div><div class="bc-body">' +
        cmdLine +
        '<div class="bc-chuck-inner">' +
          (cd.icon ? '<img class="bc-chuck-ico" src="'+escapeHtml(cd.icon)+'" alt="Chuck">' : '') +
          '<div class="bc-fact-txt">'+escapeHtml(cd.text||'')+'</div>' +
        '</div>' +
      '</div></div>';
    }

    if (ct === 'fact') {
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#5B8EF4,#22C55E);height:3px"></div><div class="bc-body">' +
        cmdLine +
        '<div class="bc-fact-ico">💡</div>' +
        '<div class="bc-fact-txt">'+escapeHtml(cd.text||'')+'</div>' +
      '</div></div>';
    }

    if (ct === 'meme') {
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#EF4444,#F97316);height:3px"></div><div class="bc-body">' +
        cmdLine +
        (cd.image ? '<img class="bc-meme-img" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="meme">' : '') +
        '<div class="bc-meme-name">'+escapeHtml(cd.name||'')+'</div>' +
      '</div></div>';
    }

    if (ct === 'meal') {
      return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#F97316,#F59E0B);height:3px"></div><div class="bc-body">' +
        cmdLine +
        (cd.image ? '<img class="bc-meal-img" src="'+escapeHtml(cd.image)+'" loading="lazy" alt="meal">' : '') +
        '<div class="bc-meal-title">'+escapeHtml(cd.name||'')+'</div>' +
        '<div class="bc-meal-meta">' +
          (cd.category ? '<span>🍽️ '+escapeHtml(cd.category)+'</span>' : '') +
          (cd.area ? '<span>🌍 '+escapeHtml(cd.area)+'</span>' : '') +
        '</div>' +
        '<div class="bc-meal-txt">'+escapeHtml(cd.instructions||'')+'</div>' +
        (cd.url ? '<a href="'+escapeHtml(cd.url)+'" target="_blank" rel="noopener" style="font-size:11px;color:#5B8EF4;display:inline-block;margin-top:8px">▶ Voir sur YouTube</a>' : '') +
      '</div></div>';
    }

    /* Fallback */
    return '<div class="bot-card"><div class="bc-stripe" style="background:linear-gradient(90deg,#5B8EF4,#8B5CF6);height:3px"></div><div class="bc-body">' +
      cmdLine + '<div class="bc-fact-txt">'+escapeHtml(JSON.stringify(cd).substring(0,200))+'</div>' +
    '</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════
     FIN MODULE SIS BOT
  ══════════════════════════════════════════════════════════════ */

  /* Lancer au chargement du DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(); /* Fin IIFE */
