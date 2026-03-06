/* ═══════════════════════════════════════════════════════════════════════════
   SIS — Say It Safely · chatanonyme.js
   Stack : Vanilla JS + Firebase (Auth/Firestore/FCM) · No type="module"
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════
     1. CONFIGURATION
  ════════════════════════════════════════════════════════════════ */
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s',
    authDomain:        'chat-anonyme.firebaseapp.com',
    projectId:         'chat-anonyme',
    storageBucket:     'chat-anonyme.firebasestorage.app',
    messagingSenderId: '93366459642',
    appId:             '1:93366459642:web:a2421c9478909b33667d43'
  };
  var VAPID_KEY        = 'BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k';
  var CLOUDINARY_NAME  = 'duddyzckz';
  var CLOUDINARY_PRESET= 'ml_defaulte';
  var TENOR_KEY        = 'VOTRE_CLE_TENOR';
  var PERSPECTIVE_KEY  = 'VOTRE_CLE_PERSPECTIVE';
  var CRYPTO_KEY_NAME  = 'sis_aes_key';
  var MAX_MSG_LEN      = 2000;
  var SPAM_INTERVAL_MS = 800;
  var BAD_WORDS        = [/\bputain\b/gi, /\bmerde\b/gi, /\bconnard\b/gi, /\bsalope\b/gi];

  /* ════════════════════════════════════════════════════════════════
     2. GLOBAL STATE
  ════════════════════════════════════════════════════════════════ */
  var db, auth, messaging;
  var currentUser        = null;
  var currentUserData    = null;
  var currentRoom        = null;
  var currentRoomData    = null;
  var activeView         = 'rooms';
  var messagesListener   = null;
  var roomsListener      = null;
  var typingTimeout      = null;
  var typingListener     = null;
  var presenceInterval   = null;
  var slowmodeTimer      = null;
  var ephemeralDuration  = 0;
  var replyTo            = null;
  var pendingUpload      = null;
  var voiceMediaRecorder = null;
  var voiceStream        = null;
  var voiceChunks        = [];
  var voiceTimerInterval = null;
  var voiceSeconds       = 0;
  var ctxTargetMsg       = null;
  var ctxTargetMsgId     = null;
  var reportTargetMsgId  = null;
  var soundEnabled       = true;
  var audioCtx           = null;
  var cryptoKey          = null;
  var onlineCountListeners = {};
  var dmListeners        = {};
  var randomSessionId    = null;
  var randomPartnerUid   = null;
  var randomMsgsListener = null;
  var statsCharts        = {};
  var notifList          = [];
  var unreadDMs          = 0;
  var unreadNotifs       = 0;
  var lastMsgTimestamp   = 0;
  var pinnedMessages     = [];
  var bgSettings         = {};
  var adminStatsLoaded   = false;
  var gifSearchTimeout   = null;
  var globalSearchTimeout= null;
  var roomPhotoPendingFile= null;

  /* ════════════════════════════════════════════════════════════════
     3. IDENTITY DATA
  ════════════════════════════════════════════════════════════════ */
  var ANIMALS = ['Lynx','Panda','Jaguar','Aigle','Loup','Renard','Tigre','Ours','Dauphin','Faucon','Bison','Cobra','Varan','Lynx','Puma','Oryx','Bongo','Okapi','Tapir','Narval'];
  var ADJECTIVES = ['Crypté','Masqué','Fantôme','Furtif','Libre','Sombre','Rapide','Vif','Sage','Vaillant','Brave','Discret','Futé','Éclairé','Serein'];
  var EMOJIS = ['🦊','🐺','🦁','🐯','🦅','🐻','🦄','🦋','🐬','🦈','🦉','🐲','🦓','🦏','🐘','🦒','🦩','🦚','🦜','🐙'];
  var COLORS = ['#5B8EF4','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#6366F1','#14B8A6','#F97316'];
  var FLAGS = {
    FR:'🇫🇷',BE:'🇧🇪',CH:'🇨🇭',CA:'🇨🇦',MA:'🇲🇦',SN:'🇸🇳',DZ:'🇩🇿',TN:'🇹🇳',CI:'🇨🇮',
    US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',ES:'🇪🇸',IT:'🇮🇹',BR:'🇧🇷',JP:'🇯🇵',CN:'🇨🇳',MX:'🇲🇽',
    RU:'🇷🇺',IN:'🇮🇳'
  };
  var userFlag = '🌍';

  /* ════════════════════════════════════════════════════════════════
     4. HELPERS DOM
  ════════════════════════════════════════════════════════════════ */
  function $id(id){ return document.getElementById(id); }
  function $qs(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $qsa(sel, ctx){ return (ctx||document).querySelectorAll(sel); }

  function showEl(el){ if(el){ el.classList.remove('hidden'); } }
  function hideEl(el){ if(el){ el.classList.add('hidden'); } }
  function toggleEl(el){ if(el){ el.classList.toggle('hidden'); } }

  function setText(id, val){
    var el = $id(id);
    if(el) el.textContent = val;
  }

  function setHtml(id, val){
    var el = $id(id);
    if(el) el.innerHTML = val;
  }

  function addCls(el, c){ if(el) el.classList.add(c); }
  function remCls(el, c){ if(el) el.classList.remove(c); }

  /* ════════════════════════════════════════════════════════════════
     5. TOAST
  ════════════════════════════════════════════════════════════════ */
  function toast(msg, type, duration){
    var container = $id('toast-container');
    if(!container) return;
    type = type || 'info';
    duration = duration || 3500;
    var icons = { success:'check-circle', error:'alert-circle', info:'info', warn:'alert-triangle' };
    var div = document.createElement('div');
    div.className = 'toast toast--' + type;
    div.innerHTML = '<i data-lucide="' + (icons[type]||'info') + '"></i><span>' + escapeHtml(msg) + '</span>';
    container.appendChild(div);
    if(window.lucide) lucide.createIcons({ icons: lucide.icons, attrs: {}, el: div });
    setTimeout(function(){ div.classList.add('toast--out'); setTimeout(function(){ div.remove(); }, 400); }, duration);
  }

  /* ════════════════════════════════════════════════════════════════
     6. UTILS
  ════════════════════════════════════════════════════════════════ */
  function escapeHtml(str){
    if(typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function formatTime(ts){
    if(!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
  }

  function formatDateLabel(ts){
    if(!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var now = new Date();
    var yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    if(sameDay(d, now)) return "Aujourd'hui";
    if(sameDay(d, yesterday)) return 'Hier';
    return d.toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
  }

  function sameDay(a, b){
    return a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear();
  }

  function formatNumber(n){
    if(n === undefined || n === null) return '—';
    if(n >= 1000000) return (n/1000000).toFixed(1)+'M';
    if(n >= 1000) return (n/1000).toFixed(1)+'k';
    return n.toString();
  }

  function timeAgo(ts){
    if(!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if(diff < 60) return 'à l\'instant';
    if(diff < 3600) return Math.floor(diff/60)+'min';
    if(diff < 86400) return Math.floor(diff/3600)+'h';
    return Math.floor(diff/86400)+'j';
  }

  function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function generateId(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
  }

  function hasBadWords(text){
    for(var i=0; i<BAD_WORDS.length; i++){
      if(BAD_WORDS[i].test(text)) return true;
      BAD_WORDS[i].lastIndex = 0;
    }
    return false;
  }

  function parseMarkdown(text){
    if(!text) return '';
    var s = escapeHtml(text);
    // bold
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // italic
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // inline code
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    // links
    s = s.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // bare URLs
    s = s.replace(/(^|\s)(https?:\/\/[^\s]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    // line breaks
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  /* ════════════════════════════════════════════════════════════════
     7. AUDIO
  ════════════════════════════════════════════════════════════════ */
  function initAudio(){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  }

  function playTone(freq, dur, type){
    if(!soundEnabled || !audioCtx) return;
    try{
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch(e){}
  }

  function playMsgSound(){ playTone(880, 0.12, 'sine'); }
  function playSendSound(){ playTone(660, 0.08, 'triangle'); }
  function playNotifSound(){ playTone(1000, 0.15); setTimeout(function(){ playTone(1200, 0.15); }, 120); }
  function playConnectSound(){ playTone(440, 0.1); setTimeout(function(){ playTone(660, 0.15); }, 100); }

  /* ════════════════════════════════════════════════════════════════
     8. AES-256-GCM CRYPTO
  ════════════════════════════════════════════════════════════════ */
  function initCrypto(){
    var stored = localStorage.getItem(CRYPTO_KEY_NAME);
    if(stored){
      importCryptoKey(stored);
    } else {
      window.crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt'])
        .then(function(key){
          cryptoKey = key;
          return window.crypto.subtle.exportKey('jwk', key);
        }).then(function(jwk){
          localStorage.setItem(CRYPTO_KEY_NAME, JSON.stringify(jwk));
        }).catch(function(){ cryptoKey = null; });
    }
  }

  function importCryptoKey(stored){
    try{
      var jwk = JSON.parse(stored);
      window.crypto.subtle.importKey('jwk', jwk, { name:'AES-GCM' }, true, ['encrypt','decrypt'])
        .then(function(key){ cryptoKey = key; })
        .catch(function(){ cryptoKey = null; });
    } catch(e){ cryptoKey = null; }
  }

  function encryptMessage(plaintext){
    return new Promise(function(resolve){
      if(!cryptoKey || !plaintext){
        resolve(plaintext || '');
        return;
      }
      var iv = window.crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder();
      window.crypto.subtle.encrypt({ name:'AES-GCM', iv: iv }, cryptoKey, enc.encode(plaintext))
        .then(function(buf){
          var ivHex = Array.from(iv).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
          var ctHex = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
          resolve(ivHex + ':' + ctHex);
        }).catch(function(){ resolve(plaintext); });
    });
  }

  function decryptMessage(ciphertext){
    return new Promise(function(resolve){
      if(!cryptoKey || !ciphertext || ciphertext.indexOf(':') === -1){
        resolve(ciphertext || '');
        return;
      }
      try{
        var parts = ciphertext.split(':');
        var ivArr = new Uint8Array(parts[0].match(/.{2}/g).map(function(h){ return parseInt(h,16); }));
        var ctArr = new Uint8Array(parts[1].match(/.{2}/g).map(function(h){ return parseInt(h,16); }));
        window.crypto.subtle.decrypt({ name:'AES-GCM', iv: ivArr }, cryptoKey, ctArr)
          .then(function(buf){
            resolve(new TextDecoder().decode(buf));
          }).catch(function(){ resolve(ciphertext); });
      } catch(e){ resolve(ciphertext); }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     9. FIREBASE INIT
  ════════════════════════════════════════════════════════════════ */
  function initFirebase(){
    firebase.initializeApp(FIREBASE_CONFIG);
    db        = firebase.firestore();
    auth      = firebase.auth();
    try{ messaging = firebase.messaging(); } catch(e){ messaging = null; }
    auth.onAuthStateChanged(onAuthStateChanged);
  }

  function onAuthStateChanged(user){
    if(user){
      currentUser = user;
      loadUserData(user.uid);
    } else {
      currentUser = null;
      currentUserData = null;
      showScreen('landing-screen');
    }
  }

  /* ════════════════════════════════════════════════════════════════
     10. SCREEN NAVIGATION
  ════════════════════════════════════════════════════════════════ */
  function showScreen(id){
    $qsa('.screen').forEach(function(s){ remCls(s,'active'); hideEl(s); });
    var el = $id(id);
    if(el){ showEl(el); addCls(el,'active'); }
    if(window.lucide) lucide.createIcons();
  }

  /* ════════════════════════════════════════════════════════════════
     11. LANDING
  ════════════════════════════════════════════════════════════════ */
  function initLanding(){
    // Nav scroll effect
    var nav = $id('landing-nav');
    window.addEventListener('scroll', function(){
      if(window.scrollY > 40) addCls(nav,'scrolled'); else remCls(nav,'scrolled');
    });

    // Animated online count
    animateOnlineCount();
    setInterval(animateOnlineCount, 7000);

    // Load platform stats
    loadLandingStats();

    // CTA buttons
    var btnIds = ['landing-login-btn','hero-login-cta'];
    btnIds.forEach(function(id){
      var btn = $id(id);
      if(btn) btn.addEventListener('click', function(){ openAuthModal('login'); });
    });

    var anonIds = ['landing-anon-btn','hero-anon-cta','final-anon-cta'];
    anonIds.forEach(function(id){
      var btn = $id(id);
      if(btn) btn.addEventListener('click', function(){ openAuthModal('anon'); });
    });

    // Demo regen button on landing
    var demoRegen = $qs('.anon-demo-regen');
    if(demoRegen) demoRegen.addEventListener('click', function(){
      var nameEl = $qs('.anon-demo-name');
      if(nameEl) nameEl.textContent = generatePseudo();
    });
  }

  function animateOnlineCount(){
    var el = $id('hero-online-count');
    if(!el) return;
    var base = 200 + Math.floor(Math.random() * 100);
    var current = parseInt(el.textContent) || base;
    var target = base + Math.floor(Math.random() * 50);
    var step = (target - current) / 20;
    var i = 0;
    var iv = setInterval(function(){
      current += step;
      el.textContent = Math.round(current);
      if(++i >= 20){ clearInterval(iv); el.textContent = target; }
    }, 50);
  }

  function loadLandingStats(){
    db.collection('stats').doc('global').get().then(function(snap){
      var d = snap.data() || {};
      setText('stat-total-users', formatNumber(d.totalUsers || 0));
      setText('stat-total-msgs',  formatNumber(d.totalMessages || 0));
      setText('stat-total-rooms', formatNumber(d.totalRooms || 0));
    }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     12. IDENTITY GENERATION
  ════════════════════════════════════════════════════════════════ */
  function generatePseudo(){
    return rand(ANIMALS) + rand(ADJECTIVES) + '_' + (Math.floor(Math.random()*9000)+1000);
  }

  function generateIdentity(){
    return {
      pseudo: generatePseudo(),
      emoji:  rand(EMOJIS),
      color:  rand(COLORS),
      flag:   userFlag
    };
  }

  function detectCountryFlag(){
    fetch('https://ipapi.co/json/')
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.country_code && FLAGS[d.country_code]){
          userFlag = FLAGS[d.country_code];
        }
        updateAnonDisplay();
      }).catch(function(){});
  }

  var currentIdentity = null;

  function updateAnonDisplay(){
    if(!currentIdentity) currentIdentity = generateIdentity();
    var av = $id('anon-avatar-display');
    var ps = $id('anon-pseudo-display');
    var fl = $id('anon-flag-display');
    if(av) av.textContent = currentIdentity.emoji;
    if(ps) ps.textContent = currentIdentity.pseudo;
    if(fl) fl.textContent = currentIdentity.flag || userFlag;
  }

  /* ════════════════════════════════════════════════════════════════
     13. AUTH MODAL
  ════════════════════════════════════════════════════════════════ */
  function openAuthModal(tab){
    currentIdentity = generateIdentity();
    updateAnonDisplay();
    switchAuthTab(tab || 'login');
    var modal = $id('auth-modal');
    showEl(modal);
    setTimeout(function(){ addCls(modal, 'modal-in'); }, 10);
    if(window.lucide) lucide.createIcons();
  }

  function closeAuthModal(){
    var modal = $id('auth-modal');
    remCls(modal, 'modal-in');
    setTimeout(function(){ hideEl(modal); }, 300);
    hideAuthError();
  }

  function switchAuthTab(tab){
    $qsa('.auth-tab').forEach(function(b){ remCls(b,'active'); });
    $qsa('.auth-panel').forEach(function(p){ remCls(p,'active'); addCls(p,'hidden'); });
    var btn = $qs('.auth-tab[data-tab="'+tab+'"]');
    var panel = $id('tab-'+tab);
    if(btn){ addCls(btn,'active'); }
    if(panel){ remCls(panel,'hidden'); addCls(panel,'active'); }
  }

  function showAuthError(msg){
    var box = $id('auth-error-box');
    var txt = $id('auth-error-text');
    if(txt) txt.textContent = msg;
    showEl(box);
  }

  function hideAuthError(){
    hideEl($id('auth-error-box'));
  }

  function setAuthLoading(loader, state){
    var btn = loader ? loader.closest ? loader.closest('button') : null : null;
    if(loader) { if(state) showEl(loader); else hideEl(loader); }
  }

  function initAuthModal(){
    // Close
    var closeBtn = $id('auth-close-btn');
    if(closeBtn) closeBtn.addEventListener('click', closeAuthModal);

    // Tab switching
    $qsa('.auth-tab').forEach(function(btn){
      btn.addEventListener('click', function(){ switchAuthTab(btn.dataset.tab); });
    });

    // Password eye toggles
    $qsa('.input-eye-btn[data-target]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var inp = $id(btn.dataset.target);
        if(inp){ inp.type = inp.type === 'password' ? 'text' : 'password'; }
        var ico = btn.querySelector('[data-lucide]');
        if(ico) ico.setAttribute('data-lucide', inp && inp.type === 'text' ? 'eye-off' : 'eye');
        if(window.lucide) lucide.createIcons({ el: btn });
      });
    });

    // Password strength
    var regPass = $id('reg-pass');
    if(regPass) regPass.addEventListener('input', function(){
      updatePwStrength(regPass.value);
    });

    // Forgot password
    var forgotBtn = $id('forgot-pw-btn');
    if(forgotBtn) forgotBtn.addEventListener('click', function(){
      var email = ($id('login-email')||{}).value;
      if(!email){ showAuthError('Entrez votre email d\'abord.'); return; }
      auth.sendPasswordResetEmail(email).then(function(){
        toast('Email de réinitialisation envoyé !', 'success');
      }).catch(function(e){ showAuthError(e.message); });
    });

    // Login
    var loginBtn = $id('login-submit-btn');
    if(loginBtn) loginBtn.addEventListener('click', doLogin);

    // Register
    var regBtn = $id('register-submit-btn');
    if(regBtn) regBtn.addEventListener('click', doRegister);

    // Anon identity regen
    var regenBtn = $id('regen-identity-btn');
    if(regenBtn) regenBtn.addEventListener('click', function(){
      currentIdentity = generateIdentity();
      updateAnonDisplay();
    });

    // Anon submit
    var anonBtn = $id('anon-submit-btn');
    if(anonBtn) anonBtn.addEventListener('click', doAnonLogin);

    // Enter key in login fields
    [$id('login-email'), $id('login-pass')].forEach(function(inp){
      if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
    });
  }

  function updatePwStrength(pw){
    var bar = $id('pw-strength-bar');
    var lbl = $id('pw-strength-lbl');
    if(!bar || !lbl) return;
    var score = 0;
    if(pw.length >= 6) score++;
    if(pw.length >= 10) score++;
    if(/[A-Z]/.test(pw)) score++;
    if(/[0-9]/.test(pw)) score++;
    if(/[^A-Za-z0-9]/.test(pw)) score++;
    var labels = ['','Faible','Moyen','Bon','Fort','Excellent'];
    var colors = ['','#EF4444','#F59E0B','#10B981','#5B8EF4','#8B5CF6'];
    bar.style.width = (score * 20) + '%';
    bar.style.background = colors[score] || '#6B7280';
    lbl.textContent = labels[score] || '';
  }

  function doLogin(){
    hideAuthError();
    var email = ($id('login-email')||{}).value || '';
    var pass  = ($id('login-pass')||{}).value || '';
    if(!email || !pass){ showAuthError('Remplissez tous les champs.'); return; }
    var loader = $id('login-loader');
    showEl(loader);
    auth.signInWithEmailAndPassword(email, pass)
      .then(function(){ closeAuthModal(); })
      .catch(function(e){ hideEl(loader); showAuthError(translateFirebaseError(e.code)); });
  }

  function doRegister(){
    hideAuthError();
    var email  = ($id('reg-email')||{}).value || '';
    var pass   = ($id('reg-pass')||{}).value || '';
    var pseudo = ($id('reg-pseudo')||{}).value || '';
    var cgu    = ($id('reg-cgu')||{}).checked;
    if(!email || !pass){ showAuthError('Remplissez tous les champs.'); return; }
    if(!cgu){ showAuthError('Vous devez accepter les CGU.'); return; }
    if(pass.length < 6){ showAuthError('Mot de passe trop court (min 6 car.).'); return; }
    var loader = $id('reg-loader');
    showEl(loader);
    auth.createUserWithEmailAndPassword(email, pass)
      .then(function(uc){
        var uid = uc.user.uid;
        var id = generateIdentity();
        var finalPseudo = pseudo || id.pseudo;
        return db.collection('users').doc(uid).set({
          uid: uid, pseudo: finalPseudo, emoji: id.emoji, color: id.color, flag: id.flag,
          role: 'user', status: 'online', badges: [], totalMessages: 0, totalReactions: 0,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(), isAnon: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function(){ closeAuthModal(); })
      .catch(function(e){ hideEl(loader); showAuthError(translateFirebaseError(e.code)); });
  }

  function doAnonLogin(){
    hideAuthError();
    var cgu = ($id('anon-cgu')||{}).checked;
    if(!cgu){ showAuthError('Vous devez accepter les CGU.'); return; }
    var loader = $id('anon-loader');
    showEl(loader);
    auth.signInAnonymously()
      .then(function(uc){
        var uid = uc.user.uid;
        var id = currentIdentity || generateIdentity();
        return db.collection('users').doc(uid).set({
          uid: uid, pseudo: id.pseudo, emoji: id.emoji, color: id.color, flag: id.flag,
          role: 'user', status: 'online', badges: [], totalMessages: 0, totalReactions: 0,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(), isAnon: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function(){ closeAuthModal(); })
      .catch(function(e){ hideEl(loader); showAuthError(translateFirebaseError(e.code)); });
  }

  function translateFirebaseError(code){
    var map = {
      'auth/user-not-found':'Utilisateur introuvable.',
      'auth/wrong-password':'Mot de passe incorrect.',
      'auth/email-already-in-use':'Email déjà utilisé.',
      'auth/invalid-email':'Email invalide.',
      'auth/weak-password':'Mot de passe trop faible.',
      'auth/too-many-requests':'Trop de tentatives. Réessayez plus tard.',
      'auth/network-request-failed':'Erreur réseau.'
    };
    return map[code] || 'Une erreur est survenue.';
  }

  /* ════════════════════════════════════════════════════════════════
     14. USER DATA LOAD & APP INIT
  ════════════════════════════════════════════════════════════════ */
  function loadUserData(uid){
    db.collection('users').doc(uid).get().then(function(snap){
      if(!snap.exists){
        // Anonymous user whose doc may not exist yet — create it
        var id = currentIdentity || generateIdentity();
        return db.collection('users').doc(uid).set({
          uid: uid, pseudo: id.pseudo, emoji: id.emoji, color: id.color, flag: id.flag,
          role: 'user', status: 'online', badges: [], totalMessages: 0, totalReactions: 0,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(), isAnon: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){ return db.collection('users').doc(uid).get(); });
      }
      return snap;
    }).then(function(snap){
      currentUserData = snap.data ? snap.data() : snap;
      initApp();
    }).catch(function(e){ console.error('loadUserData', e); });
  }

  function initApp(){
    showScreen('app-screen');
    updateTopbar();
    initPresence();
    initFCM();
    initCrypto();
    playConnectSound();
    loadRooms();
    listenDMs();
    listenOnlineUsers();
    // Show admin nav if admin
    if(currentUserData && (currentUserData.role === 'admin' || currentUserData.role === 'mod')){
      showEl($id('admin-nav-btn'));
    }
    // Init lucide icons
    if(window.lucide) lucide.createIcons();
    // Detect country for next anon session
    detectCountryFlag();
    // Restore theme
    applyTheme(localStorage.getItem('sis_theme') || 'dark');
    soundEnabled = localStorage.getItem('sis_sound') !== 'off';
    updateSoundIcon();
    // Load background settings
    try{ bgSettings = JSON.parse(localStorage.getItem('sis_bg') || '{}'); } catch(e){}
  }

  /* ════════════════════════════════════════════════════════════════
     15. TOPBAR / USER PILL
  ════════════════════════════════════════════════════════════════ */
  function updateTopbar(){
    if(!currentUserData) return;
    setText('topbar-user-name', currentUserData.pseudo || '...');
    var emojiEl = $id('topbar-user-emoji');
    if(emojiEl) emojiEl.textContent = currentUserData.emoji || '👤';
    updateStatusRing($id('topbar-status-ring'), currentUserData.status || 'online');
  }

  function updateStatusRing(el, status){
    if(!el) return;
    el.className = 'user-status-ring status--' + (status||'online');
  }

  /* ════════════════════════════════════════════════════════════════
     16. PRESENCE
  ════════════════════════════════════════════════════════════════ */
  function initPresence(){
    if(!currentUser) return;
    updatePresence('online');
    document.addEventListener('visibilitychange', function(){
      updatePresence(document.hidden ? 'away' : 'online');
    });
    window.addEventListener('beforeunload', function(){
      updatePresence('offline');
    });
    presenceInterval = setInterval(function(){ updatePresence('online'); }, 60000);
  }

  function updatePresence(status){
    if(!currentUser) return;
    db.collection('users').doc(currentUser.uid).update({
      status: status,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     17. THEME & SOUND
  ════════════════════════════════════════════════════════════════ */
  function initTheme(){
    var btn = $id('theme-toggle-btn');
    if(btn) btn.addEventListener('click', function(){
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('sis_theme', next);
    });
  }

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    var ico = $id('theme-icon');
    if(ico){ ico.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon'); if(window.lucide) lucide.createIcons({ el: $id('theme-toggle-btn') }); }
  }

  function initSoundToggle(){
    var btn = $id('sound-toggle-btn');
    if(btn) btn.addEventListener('click', function(){
      soundEnabled = !soundEnabled;
      localStorage.setItem('sis_sound', soundEnabled ? 'on' : 'off');
      updateSoundIcon();
      if(!audioCtx) initAudio();
      toast(soundEnabled ? 'Sons activés' : 'Sons désactivés', 'info');
    });
  }

  function updateSoundIcon(){
    var ico = $id('sound-icon');
    if(ico){ ico.setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x'); if(window.lucide) lucide.createIcons({ el: $id('sound-toggle-btn') }); }
  }

  /* ════════════════════════════════════════════════════════════════
     18. VIEW NAVIGATION
  ════════════════════════════════════════════════════════════════ */
  function initNavigation(){
    // Topbar nav
    $qsa('.topbar-nav-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ switchView(btn.dataset.view); });
    });
    // Bottom nav
    $qsa('.bottom-nav-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ switchView(btn.dataset.view); });
    });
  }

  function switchView(view){
    if(!view) return;
    activeView = view;
    // Update active state in nav
    $qsa('.topbar-nav-btn, .bottom-nav-btn').forEach(function(b){
      if(b.dataset.view === view) addCls(b,'active'); else remCls(b,'active');
    });
    // Hide all app views
    $qsa('.app-view').forEach(function(v){ remCls(v,'active'); addCls(v,'hidden'); });
    var viewEl = $id('view-'+view);
    if(viewEl){ remCls(viewEl,'hidden'); addCls(viewEl,'active'); }

    // Special handling
    if(view === 'stats') loadStats();
    if(view === 'admin') loadAdmin();
    if(view === 'dms') loadDmList();
    if(window.lucide) lucide.createIcons();
  }

  /* ════════════════════════════════════════════════════════════════
     19. ROOMS LIST
  ════════════════════════════════════════════════════════════════ */
  function loadRooms(){
    if(roomsListener) roomsListener();
    roomsListener = db.collection('rooms').orderBy('memberCount','desc')
      .onSnapshot(function(snap){
        var rooms = [];
        snap.forEach(function(doc){ rooms.push(Object.assign({ id: doc.id }, doc.data())); });
        renderRoomsList(rooms);
      }, function(e){ console.error('loadRooms', e); });
  }

  function renderRoomsList(rooms){
    var container = $id('rooms-list');
    if(!container) return;
    var search = ($id('room-search-input')||{}).value || '';
    var cat    = (($qs('.cat-btn.active')||{}).dataset || {}).cat || 'all';
    var filtered = rooms.filter(function(r){
      var matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
      var matchCat    = cat === 'all' || r.category === cat;
      return matchSearch && matchCat;
    });
    if(filtered.length === 0){
      container.innerHTML = '<div class="sidebar-empty-state"><i data-lucide="hash"></i><p>Aucun salon trouvé</p></div>';
      if(window.lucide) lucide.createIcons({ el: container });
      return;
    }
    container.innerHTML = filtered.map(function(r){ return renderRoomItem(r); }).join('');
    container.querySelectorAll('.room-item').forEach(function(el){
      el.addEventListener('click', function(){ joinRoom(el.dataset.roomId); });
    });
    if(window.lucide) lucide.createIcons({ el: container });
  }

  function renderRoomItem(r){
    var isActive = currentRoom === r.id ? 'room-item--active' : '';
    var lock = r.isPrivate ? '<i data-lucide="lock" class="room-lock-ico"></i>' : '';
    var photo = r.photoUrl
      ? '<img src="'+escapeHtml(r.photoUrl)+'" class="room-av-img" alt="" />'
      : '<span class="room-av-emoji">' + escapeHtml(r.emoji||'#') + '</span>';
    return '<div class="room-item '+isActive+'" data-room-id="'+escapeHtml(r.id)+'" role="listitem">'
      + '<div class="room-av" style="background:'+(r.color||'#5B8EF4')+'">'+photo+'</div>'
      + '<div class="room-item-body">'
      +   '<div class="room-item-name">'+escapeHtml(r.name||'Salon')+lock+'</div>'
      +   '<div class="room-item-meta"><span class="room-cat-chip">'+escapeHtml(r.category||'général')+'</span>'
      +   '<span class="room-online-chip"><i data-lucide="circle" class="dot-ico"></i>'+(r.memberCount||0)+'</span>'
      + '</div></div></div>';
  }

  function joinRoom(roomId){
    if(!roomId) return;
    db.collection('rooms').doc(roomId).get().then(function(snap){
      if(!snap.exists){ toast('Salon introuvable','error'); return; }
      var data = snap.data();
      if(data.isPrivate && !data._memberIds){
        // Ask for password
        var pw = prompt('Ce salon est privé. Entrez le mot de passe :');
        if(pw !== data.password){ toast('Mot de passe incorrect','error'); return; }
      }
      openRoom(roomId, data);
    });
  }

  function openRoom(roomId, data){
    currentRoom     = roomId;
    currentRoomData = data;
    // UI
    hideEl($id('chat-empty-state'));
    showEl($id('chat-active-state'));
    // Header
    var av = $id('chat-room-av');
    if(av){
      if(data.photoUrl) av.innerHTML = '<img src="'+escapeHtml(data.photoUrl)+'" class="room-av-img" alt="" />';
      else av.innerHTML = escapeHtml(data.emoji||'#');
    }
    setText('chat-room-title', data.name || 'Salon');
    var catChip = $id('chat-room-cat-chip');
    if(catChip){ catChip.textContent = data.category || ''; showEl(catChip); }
    // Apply background
    applyChatBackground(roomId);
    // Listen messages
    listenMessages(roomId);
    listenTyping(roomId);
    listenPinnedMessages(roomId);
    listenRoomOnlineCount(roomId);
    // Mark active in sidebar
    $qsa('.room-item').forEach(function(el){
      if(el.dataset.roomId === roomId) addCls(el,'room-item--active'); else remCls(el,'room-item--active');
    });
    // Slowmode
    if(data.slowmode > 0) showSlowmode(data.slowmode);
    else hideEl($id('slowmode-bar'));
    // Mobile: switch to chat section
    if(window.innerWidth <= 768){
      addCls($id('rooms-sidebar'), 'sidebar-hidden');
      remCls($id('chat-section'), 'chat-section-hidden');
    }
    if(window.lucide) lucide.createIcons();
  }

  /* ════════════════════════════════════════════════════════════════
     20. ROOM SEARCH & CATEGORY FILTER
  ════════════════════════════════════════════════════════════════ */
  function initRoomSearch(){
    var inp = $id('room-search-input');
    var clearBtn = $id('room-search-clear');
    if(inp){
      inp.addEventListener('input', function(){
        if(inp.value) showEl(clearBtn); else hideEl(clearBtn);
        loadRooms();
      });
    }
    if(clearBtn) clearBtn.addEventListener('click', function(){
      inp.value = ''; hideEl(clearBtn); loadRooms();
    });

    $qsa('.cat-btn', $id('sidebar-cats')).forEach(function(btn){
      btn.addEventListener('click', function(){
        $qsa('.cat-btn').forEach(function(b){ remCls(b,'active'); });
        addCls(btn,'active');
        loadRooms();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════
     21. CREATE ROOM MODAL
  ════════════════════════════════════════════════════════════════ */
  function initCreateRoom(){
    var createBtn = $id('create-room-btn');
    if(createBtn) createBtn.addEventListener('click', function(){ openModal('modal-create-room'); });

    // Private toggle
    $qsa('input[name="room-vis"]').forEach(function(r){
      r.addEventListener('change', function(){
        var pwField = $id('room-pw-field');
        if(r.value === 'private' && r.checked) showEl(pwField);
        else hideEl(pwField);
      });
    });

    // Room name counter
    var nameInp = $id('new-room-name');
    var counter = $id('room-name-counter');
    if(nameInp && counter) nameInp.addEventListener('input', function(){
      counter.textContent = nameInp.value.length + '/50';
    });

    // Room photo upload
    var photoInput = $id('room-photo-file');
    var photoPreview = $id('room-photo-preview-img');
    var photoArea = $id('room-photo-upload-area');
    if(photoInput){
      photoInput.addEventListener('change', function(){
        var file = photoInput.files[0];
        if(!file) return;
        roomPhotoPendingFile = file;
        var reader = new FileReader();
        reader.onload = function(e){
          if(photoPreview){ photoPreview.src = e.target.result; showEl(photoPreview); }
          if(photoArea) hideEl(photoArea);
        };
        reader.readAsDataURL(file);
      });
    }

    var confirmBtn = $id('create-room-confirm-btn');
    if(confirmBtn) confirmBtn.addEventListener('click', doCreateRoom);
  }

  function doCreateRoom(){
    var name = ($id('new-room-name')||{}).value || '';
    if(!name.trim()){ toast('Entrez un nom de salon','error'); return; }
    if(hasBadWords(name)){ toast('Nom inappropriate','error'); return; }
    var cat    = ($id('new-room-cat')||{}).value || 'general';
    var vis    = (($qs('input[name="room-vis"]:checked')||{}).value) || 'public';
    var pw     = ($id('new-room-pw')||{}).value || '';
    var isPrivate = vis === 'private';
    if(isPrivate && !pw){ toast('Entrez un mot de passe','error'); return; }
    var loader = $id('create-room-loader');
    showEl(loader);
    var createFn = function(photoUrl){
      var docRef = db.collection('rooms').doc();
      return docRef.set({
        id: docRef.id, name: name.trim(), category: cat, isPrivate: isPrivate,
        password: isPrivate ? pw : '', emoji: rand(['#','🔥','💬','🎮','🎵','📚','🎨','🏆']),
        color: rand(COLORS), photoUrl: photoUrl || '',
        memberCount: 0, messageCount: 0,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        slowmode: 0, aiModeration: false
      });
    };
    var p = roomPhotoPendingFile
      ? uploadToCloudinary(roomPhotoPendingFile).then(function(url){ return createFn(url); })
      : createFn('');
    p.then(function(){
      closeModal('modal-create-room');
      hideEl(loader);
      roomPhotoPendingFile = null;
      $id('new-room-name').value = '';
      toast('Salon créé !','success');
    }).catch(function(e){ hideEl(loader); toast('Erreur: '+e.message,'error'); });
  }

  /* ════════════════════════════════════════════════════════════════
     22. MESSAGES — LISTEN
  ════════════════════════════════════════════════════════════════ */
  function listenMessages(roomId){
    if(messagesListener) messagesListener();
    var list = $id('messages-list');
    if(list) list.innerHTML = '';
    var lastDate = null;
    messagesListener = db.collection('rooms').doc(roomId)
      .collection('messages').orderBy('createdAt','asc').limitToLast(100)
      .onSnapshot(function(snap){
        snap.docChanges().forEach(function(change){
          if(change.type === 'added'){
            var msg = Object.assign({ id: change.doc.id }, change.doc.data());
            appendMessage(msg, lastDate, function(newLastDate){ lastDate = newLastDate; });
          } else if(change.type === 'modified'){
            updateMessageEl(change.doc.id, change.doc.data());
          } else if(change.type === 'removed'){
            removeMessageEl(change.doc.id);
          }
        });
        scrollToBottom(false);
        // Check ephemeral
        checkEphemeralMessages(roomId);
      }, function(e){ console.error('listenMessages', e); });
  }

  function appendMessage(msg, lastDate, updateDate){
    var list = $id('messages-list');
    if(!list) return;

    // Date separator
    if(msg.createdAt){
      var dateLabel = formatDateLabel(msg.createdAt);
      if(dateLabel !== lastDate){
        updateDate(dateLabel);
        var sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = '<span>'+escapeHtml(dateLabel)+'</span>';
        list.appendChild(sep);
      }
    }

    var el = buildMessageEl(msg);
    list.appendChild(el);
    if(window.lucide) lucide.createIcons({ el: el });

    // Play sound for new messages from others
    if(msg.authorId !== (currentUser||{}).uid){
      playMsgSound();
      if(!document.hasFocus()) addNotification('Nouveau message de ' + (msg.authorPseudo||'Quelqu\'un'), 'message-circle');
    }
  }

  function buildMessageEl(msg){
    var isMe = msg.authorId === (currentUser||{}).uid;
    var div  = document.createElement('div');
    div.className = 'msg-row' + (isMe ? ' msg-row--me' : ' msg-row--other');
    div.dataset.msgId = msg.id;

    decryptMessage(msg.text || '').then(function(text){
      var content = buildMessageContent(msg, text, isMe);
      div.innerHTML = content;
      if(window.lucide) lucide.createIcons({ el: div });
      setupMsgContextTrigger(div, msg);
    });

    return div;
  }

  function buildMessageContent(msg, text, isMe){
    var ts = formatTime(msg.createdAt);
    var edited = msg.edited ? '<span class="msg-edited">(modifié)</span>' : '';
    var ephemeralBadge = msg.ephemeralDuration > 0 ? '<span class="msg-ephemeral-badge"><i data-lucide="timer"></i></span>' : '';
    var replyHtml = '';
    if(msg.replyTo){
      replyHtml = '<div class="msg-reply-preview"><div class="reply-prev-bar"></div>'
        + '<span class="reply-prev-author">'+escapeHtml(msg.replyTo.pseudo||'')+'</span>'
        + '<span class="reply-prev-text">'+escapeHtml((msg.replyTo.text||'').substring(0,80))+'</span></div>';
    }
    var avatarHtml = !isMe
      ? '<div class="msg-av" style="background:'+escapeHtml(msg.authorColor||'#5B8EF4')+'" title="'+escapeHtml(msg.authorPseudo||'')+'">'+escapeHtml(msg.authorEmoji||'👤')+'</div>'
      : '';
    var pseudoHtml = !isMe
      ? '<span class="msg-pseudo">'+escapeHtml(msg.authorPseudo||'Anonyme')+'<span class="msg-flag">'+escapeHtml(msg.authorFlag||'')+'</span></span>'
      : '';
    var msgBody = '';
    if(msg.type === 'image'){
      msgBody = '<img class="msg-image" src="'+escapeHtml(msg.mediaUrl||'')+'" alt="Image" loading="lazy" />';
    } else if(msg.type === 'gif'){
      msgBody = '<img class="msg-gif" src="'+escapeHtml(msg.mediaUrl||'')+'" alt="GIF" loading="lazy" />';
    } else if(msg.type === 'voice'){
      msgBody = buildVoicePlayer(msg);
    } else if(msg.type === 'poll'){
      msgBody = buildPollHtml(msg);
    } else if(msg.type === 'sticker'){
      msgBody = '<img class="msg-sticker" src="'+escapeHtml(msg.mediaUrl||'')+'" alt="Sticker" />';
    } else {
      msgBody = '<p class="msg-text">'+parseMarkdown(text)+'</p>';
    }

    var reactionsHtml = buildReactionsHtml(msg.reactions || {});
    var checksHtml = isMe ? '<span class="msg-checks">✓✓</span>' : '';

    return avatarHtml
      + '<div class="msg-bubble-wrap">'
      + pseudoHtml
      + '<div class="msg-bubble">'
      + ephemeralBadge + replyHtml + msgBody
      + '<div class="msg-meta">'+edited+'<span class="msg-ts">'+ts+'</span>'+checksHtml+'</div>'
      + '</div>'
      + reactionsHtml
      + '</div>';
  }

  function buildVoicePlayer(msg){
    var url = escapeHtml(msg.mediaUrl||'');
    var dur = msg.voiceDuration ? formatVoiceDur(msg.voiceDuration) : '—';
    return '<div class="voice-msg-player" data-src="'+url+'">'
      + '<button class="voice-play-btn"><i data-lucide="play"></i></button>'
      + '<div class="voice-msg-waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>'
      + '<span class="voice-msg-dur">'+dur+'</span>'
      + '</div>';
  }

  function formatVoiceDur(sec){
    var m = Math.floor(sec/60), s = sec%60;
    return m+':'+(s<10?'0':'')+s;
  }

  function buildPollHtml(msg){
    if(!msg.poll) return '';
    var p = msg.poll;
    var total = Object.values(p.votes||{}).reduce(function(a,b){ return a+b; },0);
    var opts = (p.options||[]).map(function(opt,i){
      var votes = (p.votes||{})[i] || 0;
      var pct = total > 0 ? Math.round(votes/total*100) : 0;
      var voted = ((p.voters||{})[i]||[]).includes((currentUser||{}).uid);
      return '<div class="poll-opt" data-poll-opt="'+i+'" data-msg-id="'+escapeHtml(msg.id)+'">'
        + '<div class="poll-opt-fill" style="width:'+pct+'%"></div>'
        + '<span class="poll-opt-label">'+escapeHtml(opt)+'</span>'
        + '<span class="poll-opt-pct">'+pct+'%</span>'
        + (voted ? '<i data-lucide="check-circle" class="poll-voted-ico"></i>' : '')
        + '</div>';
    }).join('');
    return '<div class="poll-card">'
      + '<div class="poll-card-head"><i data-lucide="bar-chart-2"></i><span>'+escapeHtml(p.question)+'</span></div>'
      + opts
      + '<div class="poll-card-foot">'+total+' vote'+(total!==1?'s':'')+'</div>'
      + '</div>';
  }

  function buildReactionsHtml(reactions){
    if(!reactions || !Object.keys(reactions).length) return '';
    var html = '<div class="msg-reactions">';
    Object.keys(reactions).forEach(function(emoji){
      var count = reactions[emoji];
      if(count > 0) html += '<button class="msg-reaction-chip">'+emoji+' '+count+'</button>';
    });
    return html + '</div>';
  }

  function updateMessageEl(msgId, data){
    var el = $qs('[data-msg-id="'+msgId+'"]');
    if(!el) return;
    decryptMessage(data.text||'').then(function(text){
      var isMe = data.authorId === (currentUser||{}).uid;
      el.innerHTML = buildMessageContent(data, text, isMe);
      if(window.lucide) lucide.createIcons({ el: el });
      setupMsgContextTrigger(el, Object.assign({ id: msgId }, data));
    });
  }

  function removeMessageEl(msgId){
    var el = $qs('[data-msg-id="'+msgId+'"]');
    if(el){ addCls(el,'msg-removing'); setTimeout(function(){ el.remove(); }, 300); }
  }

  /* ════════════════════════════════════════════════════════════════
     23. SEND MESSAGE
  ════════════════════════════════════════════════════════════════ */
  function initMessageInput(){
    var textarea = $id('message-textarea');
    var sendBtn  = $id('msg-send-btn');
    var charCount= $id('char-count');

    if(textarea){
      textarea.addEventListener('input', function(){
        // Auto resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
        // Char count
        var len = textarea.value.length;
        if(charCount){ charCount.textContent = len+'/'+MAX_MSG_LEN; if(len > 0) showEl(charCount); else hideEl(charCount); }
        // Enable send button
        if(sendBtn) sendBtn.disabled = len === 0 && !pendingUpload;
        // Typing indicator
        sendTypingIndicator();
      });

      textarea.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
      });
    }

    if(sendBtn) sendBtn.addEventListener('click', sendMessage);

    // Reply cancel
    var replyCancel = $id('reply-cancel-btn');
    if(replyCancel) replyCancel.addEventListener('click', function(){ cancelReply(); });

    // Upload cancel
    var uploadCancel = $id('upload-cancel-btn');
    if(uploadCancel) uploadCancel.addEventListener('click', function(){ cancelUpload(); });

    // Scroll bottom button
    var scrollBtn = $id('scroll-bottom-btn');
    if(scrollBtn) scrollBtn.addEventListener('click', function(){ scrollToBottom(true); });

    // Messages scroll event
    var msgScroll = $id('messages-scroll');
    if(msgScroll) msgScroll.addEventListener('scroll', onMessagesScroll);
  }

  function sendMessage(){
    if(!currentRoom || !currentUser) return;
    var textarea = $id('message-textarea');
    var text = textarea ? textarea.value.trim() : '';
    if(!text && !pendingUpload) return;
    if(text.length > MAX_MSG_LEN) return;
    if(hasBadWords(text)){ toast('Message contient des mots interdits','warn'); return; }
    // Slowmode check
    if(currentRoomData && currentRoomData.slowmode > 0){
      var now = Date.now();
      if(now - lastMsgTimestamp < currentRoomData.slowmode * 1000){
        toast('Slow mode actif','warn'); return;
      }
    }
    // Spam check
    if(Date.now() - lastMsgTimestamp < SPAM_INTERVAL_MS){ return; }
    lastMsgTimestamp = Date.now();

    var d = currentUserData || {};
    var baseDoc = {
      authorId:     currentUser.uid,
      authorPseudo: d.pseudo || 'Anonyme',
      authorEmoji:  d.emoji  || '👤',
      authorColor:  d.color  || '#5B8EF4',
      authorFlag:   d.flag   || '',
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      reactions:    {},
      edited:       false,
      ephemeralDuration: ephemeralDuration || 0
    };

    if(replyTo){
      baseDoc.replyTo = {
        id:     replyTo.id,
        pseudo: replyTo.authorPseudo,
        text:   (replyTo.text||'').substring(0,100)
      };
    }

    var sendPromise;
    if(pendingUpload){
      var type = pendingUpload.type;
      baseDoc.type     = type;
      baseDoc.mediaUrl = pendingUpload.url;
      baseDoc.text     = '';
      sendPromise = Promise.resolve(baseDoc);
    } else {
      sendPromise = encryptMessage(text).then(function(enc){
        baseDoc.type = 'text';
        baseDoc.text = enc;
        return baseDoc;
      });
    }

    sendPromise.then(function(doc){
      // Perspective API toxicity check (fire and forget)
      if(text) checkToxicity(text, doc);
      else doSendMessage(doc);
    });

    // Reset
    if(textarea){ textarea.value = ''; textarea.style.height = 'auto'; }
    hideEl($id('char-count'));
    var sendBtn = $id('msg-send-btn');
    if(sendBtn) sendBtn.disabled = true;
    cancelReply();
    cancelUpload();
    playSendSound();
  }

  function doSendMessage(doc){
    db.collection('rooms').doc(currentRoom).collection('messages').add(doc)
      .then(function(){
        // Update room message count
        db.collection('rooms').doc(currentRoom).update({
          messageCount: firebase.firestore.FieldValue.increment(1),
          lastMessage: doc.text || '[média]',
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Update user stats
        db.collection('users').doc(currentUser.uid).update({
          totalMessages: firebase.firestore.FieldValue.increment(1)
        });
        // Update global stats
        db.collection('stats').doc('global').update({
          totalMessages: firebase.firestore.FieldValue.increment(1)
        }).catch(function(){});
      }).catch(function(e){ toast('Erreur envoi: '+e.message,'error'); });
  }

  /* ════════════════════════════════════════════════════════════════
     24. TYPING INDICATOR
  ════════════════════════════════════════════════════════════════ */
  function sendTypingIndicator(){
    if(!currentRoom || !currentUser || !currentUserData) return;
    db.collection('rooms').doc(currentRoom).collection('typing')
      .doc(currentUser.uid).set({ pseudo: currentUserData.pseudo, ts: firebase.firestore.FieldValue.serverTimestamp() });
    if(typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(clearTypingIndicator, 3000);
  }

  function clearTypingIndicator(){
    if(!currentRoom || !currentUser) return;
    db.collection('rooms').doc(currentRoom).collection('typing')
      .doc(currentUser.uid).delete().catch(function(){});
  }

  function listenTyping(roomId){
    if(typingListener) typingListener();
    typingListener = db.collection('rooms').doc(roomId).collection('typing')
      .onSnapshot(function(snap){
        var typers = [];
        snap.forEach(function(d){
          if(d.id !== (currentUser||{}).uid) typers.push(d.data().pseudo || 'Quelqu\'un');
        });
        var indicator = $id('typing-indicator');
        var txt = $id('typing-text');
        if(typers.length > 0){
          if(txt) txt.textContent = typers.join(', ') + (typers.length===1?' écrit...':', écrivent...');
          showEl(indicator);
        } else {
          hideEl(indicator);
        }
      });
  }

  /* ════════════════════════════════════════════════════════════════
     25. REPLY
  ════════════════════════════════════════════════════════════════ */
  function setReply(msgData){
    replyTo = msgData;
    var bar = $id('reply-preview-bar');
    var author = $id('reply-bar-author');
    var text = $id('reply-bar-text');
    if(author) author.textContent = msgData.authorPseudo || 'Quelqu\'un';
    if(text) text.textContent = (msgData.text||'[média]').substring(0,80);
    showEl(bar);
    var ta = $id('message-textarea');
    if(ta) ta.focus();
  }

  function cancelReply(){
    replyTo = null;
    hideEl($id('reply-preview-bar'));
  }

  /* ════════════════════════════════════════════════════════════════
     26. UPLOAD (Image / Sticker)
  ════════════════════════════════════════════════════════════════ */
  function initMediaButtons(){
    // Image
    var attachBtn = $id('attach-image-btn');
    var imageInput = $id('image-file-input');
    if(attachBtn) attachBtn.addEventListener('click', function(){ if(imageInput) imageInput.click(); });
    if(imageInput) imageInput.addEventListener('change', function(){
      var file = imageInput.files[0];
      if(file) previewAndUpload(file, 'image');
      imageInput.value = '';
    });

    // Sticker
    var stickerBtn = $id('open-sticker-btn');
    var stickerInput = $id('sticker-file-input');
    if(stickerBtn) stickerBtn.addEventListener('click', function(){ if(stickerInput) stickerInput.click(); });
    if(stickerInput) stickerInput.addEventListener('change', function(){
      var file = stickerInput.files[0];
      if(file) previewAndUpload(file, 'sticker');
      stickerInput.value = '';
    });

    // GIF
    var gifBtn = $id('open-gif-btn');
    if(gifBtn) gifBtn.addEventListener('click', function(){ openModal('modal-gif'); loadGifs(''); });

    // Ephemeral
    var epheBtn = $id('ephemeral-btn');
    if(epheBtn) epheBtn.addEventListener('click', function(){ openModal('modal-ephemeral'); });

    // Ephemeral options
    $qsa('.ephemeral-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        ephemeralDuration = parseInt(btn.dataset.duration) || 0;
        closeModal('modal-ephemeral');
        var epheIco = $qs('#ephemeral-btn i');
        if(epheIco) epheIco.style.color = ephemeralDuration > 0 ? '#5B8EF4' : '';
        toast(ephemeralDuration > 0 ? 'Message éphémère: '+btn.textContent.trim() : 'Mode standard', 'info');
      });
    });
  }

  function previewAndUpload(file, type){
    if(file.size > 10*1024*1024){ toast('Fichier trop lourd (max 10MB)','error'); return; }
    var bar  = $id('upload-preview-bar');
    var img  = $id('upload-preview-img');
    var name = $id('upload-preview-name');
    var reader = new FileReader();
    reader.onload = function(e){
      if(img){ img.src = e.target.result; showEl(img); }
      if(name) name.textContent = file.name;
      showEl(bar);
    };
    reader.readAsDataURL(file);
    uploadToCloudinary(file).then(function(url){
      pendingUpload = { type: type, url: url };
      var sendBtn = $id('msg-send-btn');
      if(sendBtn) sendBtn.disabled = false;
    }).catch(function(e){ toast('Erreur upload: '+e.message,'error'); cancelUpload(); });
  }

  function cancelUpload(){
    pendingUpload = null;
    hideEl($id('upload-preview-bar'));
    var sendBtn = $id('msg-send-btn');
    if(sendBtn) sendBtn.disabled = true;
  }

  function uploadToCloudinary(file){
    return new Promise(function(resolve, reject){
      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      fd.append('cloud_name', CLOUDINARY_NAME);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/'+CLOUDINARY_NAME+'/auto/upload');
      xhr.onload = function(){
        if(xhr.status === 200){
          var res = JSON.parse(xhr.responseText);
          resolve(res.secure_url);
        } else { reject(new Error('Upload failed')); }
      };
      xhr.onerror = function(){ reject(new Error('Network error')); };
      xhr.send(fd);
    });
  }

  /* ════════════════════════════════════════════════════════════════
     27. GIF PICKER
  ════════════════════════════════════════════════════════════════ */
  function loadGifs(query){
    var grid = $id('gif-grid');
    var trendLabel = $id('gif-trending-label');
    if(!grid) return;
    grid.innerHTML = '<div class="gif-loading"><i data-lucide="loader-2" class="spin"></i><span>Chargement...</span></div>';
    if(window.lucide) lucide.createIcons({ el: grid });
    var endpoint = query
      ? 'https://tenor.googleapis.com/v2/search?q='+encodeURIComponent(query)+'&key='+TENOR_KEY+'&limit=20&media_filter=gif'
      : 'https://tenor.googleapis.com/v2/featured?key='+TENOR_KEY+'&limit=20&media_filter=gif';
    if(trendLabel) trendLabel.style.display = query ? 'none' : '';
    fetch(endpoint).then(function(r){ return r.json(); }).then(function(data){
      var results = data.results || [];
      if(results.length === 0){ grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Aucun résultat</p>'; return; }
      grid.innerHTML = results.map(function(r){
        var url = ((r.media_formats||{}).gif||{}).url || ((r.media_formats||{}).tinygif||{}).url || '';
        return '<img class="gif-item" src="'+escapeHtml(url)+'" alt="" data-url="'+escapeHtml(url)+'" loading="lazy" />';
      }).join('');
      grid.querySelectorAll('.gif-item').forEach(function(img){
        img.addEventListener('click', function(){
          pendingUpload = { type: 'gif', url: img.dataset.url };
          var sendBtn = $id('msg-send-btn');
          if(sendBtn) sendBtn.disabled = false;
          closeModal('modal-gif');
          toast('GIF prêt à envoyer','info');
          var bar = $id('upload-preview-bar');
          var prev = $id('upload-preview-img');
          if(prev){ prev.src = img.dataset.url; showEl(prev); }
          showEl(bar);
        });
      });
    }).catch(function(){ grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Erreur de chargement</p>'; });
  }

  function initGifSearch(){
    var input = $id('gif-search-input');
    var clear = $id('gif-search-clear');
    if(input){
      input.addEventListener('input', function(){
        if(input.value) showEl(clear); else hideEl(clear);
        if(gifSearchTimeout) clearTimeout(gifSearchTimeout);
        gifSearchTimeout = setTimeout(function(){ loadGifs(input.value); }, 400);
      });
    }
    if(clear) clear.addEventListener('click', function(){ input.value=''; hideEl(clear); loadGifs(''); });
  }

  /* ════════════════════════════════════════════════════════════════
     28. VOICE RECORDING
  ════════════════════════════════════════════════════════════════ */
  function initVoiceRecording(){
    var voiceBtn = $id('voice-record-btn');
    if(voiceBtn) voiceBtn.addEventListener('click', startVoiceRecording);

    var cancelBtn = $id('voice-cancel-btn');
    if(cancelBtn) cancelBtn.addEventListener('click', cancelVoiceRecording);

    var sendBtn = $id('voice-send-btn');
    if(sendBtn) sendBtn.addEventListener('click', sendVoiceMessage);
  }

  function startVoiceRecording(){
    if(!navigator.mediaDevices){ toast('Micro non disponible','error'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
      voiceStream  = stream;
      voiceChunks  = [];
      voiceSeconds = 0;
      voiceMediaRecorder = new MediaRecorder(stream);
      voiceMediaRecorder.ondataavailable = function(e){ if(e.data.size>0) voiceChunks.push(e.data); };
      voiceMediaRecorder.start();
      showEl($id('voice-record-ui'));
      hideEl($id('msg-input-area'));
      voiceTimerInterval = setInterval(function(){
        voiceSeconds++;
        var m = Math.floor(voiceSeconds/60), s = voiceSeconds%60;
        setText('voice-record-timer', m+':'+(s<10?'0':'')+s);
        animateVoiceWaveform();
      }, 1000);
    }).catch(function(){ toast('Accès micro refusé','error'); });
  }

  function cancelVoiceRecording(){
    if(voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') voiceMediaRecorder.stop();
    if(voiceStream) voiceStream.getTracks().forEach(function(t){ t.stop(); });
    clearInterval(voiceTimerInterval);
    hideEl($id('voice-record-ui'));
    showEl($id('msg-input-area'));
  }

  function sendVoiceMessage(){
    if(!voiceMediaRecorder) return;
    voiceMediaRecorder.stop();
    voiceMediaRecorder.onstop = function(){
      var blob = new Blob(voiceChunks, { type:'audio/webm' });
      var file = new File([blob], 'voice_'+Date.now()+'.webm', { type:'audio/webm' });
      cancelVoiceRecording();
      uploadToCloudinary(file).then(function(url){
        var d = currentUserData || {};
        db.collection('rooms').doc(currentRoom).collection('messages').add({
          type: 'voice', mediaUrl: url, text: '',
          voiceDuration: voiceSeconds,
          authorId: currentUser.uid, authorPseudo: d.pseudo||'Anonyme',
          authorEmoji: d.emoji||'👤', authorColor: d.color||'#5B8EF4', authorFlag: d.flag||'',
          reactions: {}, edited: false, ephemeralDuration: ephemeralDuration,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).catch(function(e){ toast('Erreur upload vocal: '+e.message,'error'); });
    };
  }

  function animateVoiceWaveform(){
    var bars = $qsa('#voice-waveform-display span');
    bars.forEach(function(bar){
      bar.style.height = (20 + Math.random()*60)+'%';
    });
  }

  /* Voice message player */
  document.addEventListener('click', function(e){
    var playBtn = e.target.closest('.voice-play-btn');
    if(!playBtn) return;
    var player = playBtn.closest('.voice-msg-player');
    if(!player) return;
    var src = player.dataset.src;
    if(!src) return;
    var audio = player._audio;
    if(!audio){
      audio = new Audio(src);
      player._audio = audio;
      audio.onended = function(){ playBtn.innerHTML = '<i data-lucide="play"></i>'; if(window.lucide) lucide.createIcons({ el: playBtn }); };
    }
    if(audio.paused){ audio.play(); playBtn.innerHTML = '<i data-lucide="pause"></i>'; }
    else { audio.pause(); playBtn.innerHTML = '<i data-lucide="play"></i>'; }
    if(window.lucide) lucide.createIcons({ el: playBtn });
  });

  /* ════════════════════════════════════════════════════════════════
     29. CONTEXT MENU
  ════════════════════════════════════════════════════════════════ */
  function setupMsgContextTrigger(el, msg){
    el.addEventListener('contextmenu', function(e){
      e.preventDefault(); openContextMenu(e.clientX, e.clientY, msg);
    });
    el.addEventListener('touchstart', function(){
      var longPress = setTimeout(function(){ openContextMenu(0, 0, msg); }, 600);
      el.addEventListener('touchend', function(){ clearTimeout(longPress); }, { once: true });
    });
  }

  function openContextMenu(x, y, msg){
    ctxTargetMsg   = msg;
    ctxTargetMsgId = msg.id;
    var menu = $id('msg-context-menu');
    if(!menu) return;
    var isMe = msg.authorId === (currentUser||{}).uid;
    var isAdmin = currentUserData && (currentUserData.role==='admin'||currentUserData.role==='mod');
    // Show/hide actions
    var editBtn   = $id('ctx-edit-btn');
    var deleteBtn = $id('ctx-delete-btn');
    var pinBtn    = $id('ctx-pin-btn');
    var unpinBtn  = $id('ctx-unpin-btn');
    if(editBtn)   { if(isMe && msg.type==='text') showEl(editBtn); else hideEl(editBtn); }
    if(deleteBtn) { if(isMe||isAdmin) showEl(deleteBtn); else hideEl(deleteBtn); }
    if(pinBtn)    { if(isAdmin && !msg.pinned) showEl(pinBtn); else hideEl(pinBtn); }
    if(unpinBtn)  { if(isAdmin && msg.pinned)  showEl(unpinBtn); else hideEl(unpinBtn); }
    // Position
    showEl(menu);
    remCls(menu,'hidden');
    if(x && y){
      var vw = window.innerWidth, vh = window.innerHeight;
      var mw = menu.offsetWidth, mh = menu.offsetHeight;
      menu.style.left = Math.min(x, vw-mw-8) + 'px';
      menu.style.top  = Math.min(y, vh-mh-8) + 'px';
    } else {
      menu.style.left = '50%';
      menu.style.top  = '50%';
      menu.style.transform = 'translate(-50%,-50%)';
    }
    if(window.lucide) lucide.createIcons({ el: menu });
    // Backdrop
    showEl($id('global-backdrop'));
  }

  function closeContextMenu(){
    hideEl($id('msg-context-menu'));
    hideEl($id('global-backdrop'));
    ctxTargetMsg = null; ctxTargetMsgId = null;
  }

  function initContextMenu(){
    var backdrop = $id('global-backdrop');
    if(backdrop) backdrop.addEventListener('click', closeContextMenu);

    // Reactions
    $qsa('.ctx-reaction-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        addReaction(ctxTargetMsgId, btn.dataset.emoji);
        closeContextMenu();
      });
    });

    var replyBtn  = $id('ctx-reply-btn');
    var copyBtn   = $id('ctx-copy-btn');
    var editBtn   = $id('ctx-edit-btn');
    var pinBtn    = $id('ctx-pin-btn');
    var unpinBtn  = $id('ctx-unpin-btn');
    var deleteBtn = $id('ctx-delete-btn');
    var reportBtn = $id('ctx-report-btn');

    if(replyBtn) replyBtn.addEventListener('click', function(){ if(ctxTargetMsg) setReply(ctxTargetMsg); closeContextMenu(); });
    if(copyBtn)  copyBtn.addEventListener('click', function(){
      if(ctxTargetMsg){ decryptMessage(ctxTargetMsg.text||'').then(function(t){ navigator.clipboard&&navigator.clipboard.writeText(t); toast('Copié','success'); }); }
      closeContextMenu();
    });
    if(editBtn) editBtn.addEventListener('click', function(){ if(ctxTargetMsg) startEditMessage(ctxTargetMsg); closeContextMenu(); });
    if(pinBtn)  pinBtn.addEventListener('click', function(){ if(ctxTargetMsgId) pinMessage(ctxTargetMsgId, true); closeContextMenu(); });
    if(unpinBtn) unpinBtn.addEventListener('click', function(){ if(ctxTargetMsgId) pinMessage(ctxTargetMsgId, false); closeContextMenu(); });
    if(deleteBtn) deleteBtn.addEventListener('click', function(){ if(ctxTargetMsgId) deleteMessage(ctxTargetMsgId); closeContextMenu(); });
    if(reportBtn) reportBtn.addEventListener('click', function(){ if(ctxTargetMsgId) openReportModal(ctxTargetMsgId); closeContextMenu(); });
  }

  function addReaction(msgId, emoji){
    if(!msgId||!currentRoom) return;
    var ref = db.collection('rooms').doc(currentRoom).collection('messages').doc(msgId);
    ref.update({
      ['reactions.'+emoji]: firebase.firestore.FieldValue.increment(1)
    }).catch(function(){});
    db.collection('users').doc(currentUser.uid).update({
      totalReactions: firebase.firestore.FieldValue.increment(1)
    }).catch(function(){});
  }

  function deleteMessage(msgId){
    if(!msgId || !currentRoom) return;
    if(!confirm('Supprimer ce message ?')) return;
    db.collection('rooms').doc(currentRoom).collection('messages').doc(msgId).delete()
      .then(function(){ toast('Message supprimé','success'); })
      .catch(function(e){ toast('Erreur: '+e.message,'error'); });
  }

  function startEditMessage(msg){
    decryptMessage(msg.text||'').then(function(text){
      var ta = $id('message-textarea');
      if(ta){ ta.value = text; ta.focus(); ta.dataset.editId = msg.id; }
      var sendBtn = $id('msg-send-btn');
      if(sendBtn){ sendBtn.disabled = false; sendBtn.dataset.mode = 'edit'; }
    });
  }

  function pinMessage(msgId, pin){
    if(!currentRoom) return;
    db.collection('rooms').doc(currentRoom).collection('messages').doc(msgId).update({ pinned: pin })
      .then(function(){ toast(pin ? 'Message épinglé' : 'Message désépinglé', 'success'); })
      .catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     30. PINNED MESSAGES
  ════════════════════════════════════════════════════════════════ */
  function listenPinnedMessages(roomId){
    db.collection('rooms').doc(roomId).collection('messages')
      .where('pinned', '==', true).onSnapshot(function(snap){
        pinnedMessages = [];
        snap.forEach(function(d){ pinnedMessages.push(Object.assign({ id: d.id }, d.data())); });
        updatePinnedBar();
      });
  }

  function updatePinnedBar(){
    var bar   = $id('pinned-bar');
    var badge = $id('pin-count-badge');
    var text  = $id('pinned-bar-text');
    if(pinnedMessages.length > 0){
      showEl(bar);
      if(badge){ badge.textContent = pinnedMessages.length; showEl(badge); }
      var last = pinnedMessages[pinnedMessages.length-1];
      decryptMessage(last.text||'[média]').then(function(t){
        if(text) text.textContent = t.substring(0,80);
      });
    } else {
      hideEl(bar);
      if(badge) hideEl(badge);
    }
    // Update panel list
    var list = $id('pinned-panel-list');
    if(list){
      if(pinnedMessages.length === 0){
        list.innerHTML = '<div class="pinned-empty-state"><i data-lucide="pin-off"></i><p>Aucun message épinglé</p></div>';
      } else {
        list.innerHTML = pinnedMessages.map(function(m){
          return '<div class="pinned-panel-item"><span class="pinned-item-author">'+escapeHtml(m.authorPseudo||'')+'</span>'
            + '<span class="pinned-item-text">'+(m.text||'[média]').substring(0,100)+'</span></div>';
        }).join('');
      }
      if(window.lucide) lucide.createIcons({ el: list });
    }
  }

  function initPinnedBar(){
    var expandBtn = $id('pinned-bar-expand');
    var closeBtn  = $id('pinned-bar-close');
    var panelClose= $id('pinned-panel-close');
    var toggleBtn = $id('pinned-toggle-btn');
    if(expandBtn) expandBtn.addEventListener('click', function(){
      toggleEl($id('pinned-panel'));
    });
    if(closeBtn) closeBtn.addEventListener('click', function(){ hideEl($id('pinned-bar')); });
    if(panelClose) panelClose.addEventListener('click', function(){ hideEl($id('pinned-panel')); });
    if(toggleBtn) toggleBtn.addEventListener('click', function(){ toggleEl($id('pinned-panel')); });
  }

  /* ════════════════════════════════════════════════════════════════
     31. SCROLL TO BOTTOM
  ════════════════════════════════════════════════════════════════ */
  function scrollToBottom(smooth){
    var container = $id('messages-scroll');
    if(!container) return;
    if(smooth) container.scrollTo({ top: container.scrollHeight, behavior:'smooth' });
    else container.scrollTop = container.scrollHeight;
    hideScrollBadge();
  }

  function onMessagesScroll(){
    var container = $id('messages-scroll');
    var btn       = $id('scroll-bottom-btn');
    if(!container || !btn) return;
    var nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if(nearBottom){ hideEl(btn); hideScrollBadge(); }
    else showEl(btn);
  }

  function hideScrollBadge(){
    var badge = $id('scroll-new-badge');
    if(badge){ badge.textContent = '0'; hideEl(badge); }
  }

  /* ════════════════════════════════════════════════════════════════
     32. ONLINE MEMBERS
  ════════════════════════════════════════════════════════════════ */
  function listenRoomOnlineCount(roomId){
    if(onlineCountListeners[roomId]) onlineCountListeners[roomId]();
    onlineCountListeners[roomId] = db.collection('users')
      .where('status','in',['online','away'])
      .onSnapshot(function(snap){
        setText('chat-online-count', snap.size);
        setText('global-online-count', snap.size);
      });
  }

  function listenOnlineUsers(){
    db.collection('users').where('status','in',['online','away'])
      .onSnapshot(function(snap){
        var row = $id('online-members-row');
        if(!row) return;
        row.innerHTML = '';
        var shown = 0;
        snap.forEach(function(doc){
          if(shown >= 15) return;
          var d = doc.data();
          var div = document.createElement('div');
          div.className = 'online-member-av';
          div.title = d.pseudo || 'Anonyme';
          div.style.background = d.color || '#5B8EF4';
          div.textContent = d.emoji || '👤';
          row.appendChild(div);
          shown++;
        });
      });
  }

  /* ════════════════════════════════════════════════════════════════
     33. SLOWMODE
  ════════════════════════════════════════════════════════════════ */
  function showSlowmode(seconds){
    var bar = $id('slowmode-bar');
    var sec = $id('slowmode-sec');
    if(sec) sec.textContent = seconds;
    showEl(bar);
  }

  /* ════════════════════════════════════════════════════════════════
     34. EPHEMERAL MESSAGES
  ════════════════════════════════════════════════════════════════ */
  function checkEphemeralMessages(roomId){
    var now = Math.floor(Date.now()/1000);
    db.collection('rooms').doc(roomId).collection('messages')
      .where('ephemeralDuration','>',0).get().then(function(snap){
        snap.forEach(function(doc){
          var d = doc.data();
          if(!d.createdAt) return;
          var created = d.createdAt.seconds || 0;
          if(now - created >= d.ephemeralDuration){
            doc.ref.delete();
          }
        });
      }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     35. POLLS
  ════════════════════════════════════════════════════════════════ */
  function initPolls(){
    var openBtn = $id('poll-open-btn');
    if(openBtn) openBtn.addEventListener('click', function(){
      if(!currentRoom){ toast('Sélectionnez un salon','warn'); return; }
      openModal('modal-create-poll');
    });

    var addOpt = $id('add-poll-option-btn');
    if(addOpt) addOpt.addEventListener('click', addPollOption);

    var confirmBtn = $id('create-poll-confirm-btn');
    if(confirmBtn) confirmBtn.addEventListener('click', doCreatePoll);

    // Poll vote delegation
    document.addEventListener('click', function(e){
      var opt = e.target.closest('.poll-opt');
      if(!opt) return;
      var msgId  = opt.dataset.msgId;
      var optIdx = parseInt(opt.dataset.pollOpt);
      if(!isNaN(optIdx) && msgId) votePoll(msgId, optIdx);
    });
  }

  function addPollOption(){
    var container = $id('poll-options-container');
    if(!container) return;
    var count = container.querySelectorAll('.poll-option-row').length;
    if(count >= 8){ toast('Maximum 8 options','warn'); return; }
    var idx = count + 1;
    var row = document.createElement('div');
    row.className = 'poll-option-row';
    row.innerHTML = '<div class="poll-option-drag"><i data-lucide="grip-vertical"></i></div>'
      + '<div class="input-wrap"><input type="text" class="form-input poll-option-input" placeholder="Option '+idx+'" maxlength="100" /></div>'
      + '<button class="poll-option-remove"><i data-lucide="minus-circle"></i></button>';
    row.querySelector('.poll-option-remove').addEventListener('click', function(){ row.remove(); });
    container.appendChild(row);
    if(window.lucide) lucide.createIcons({ el: row });
  }

  function doCreatePoll(){
    var question = ($id('poll-question-input')||{}).value || '';
    if(!question.trim()){ toast('Entrez une question','error'); return; }
    var opts = [];
    $qsa('.poll-option-input').forEach(function(inp){ if(inp.value.trim()) opts.push(inp.value.trim()); });
    if(opts.length < 2){ toast('Minimum 2 options','error'); return; }
    var allowMulti = ($id('poll-allow-multi')||{}).checked;
    var anonVotes  = ($id('poll-anon-votes')||{}).checked;
    var duration   = parseInt(($id('poll-duration-select')||{}).value) || 0;
    var loader     = $id('create-poll-loader');
    showEl(loader);
    var votes = {}; opts.forEach(function(_,i){ votes[i] = 0; });
    var d = currentUserData || {};
    db.collection('rooms').doc(currentRoom).collection('messages').add({
      type: 'poll', text: '',
      poll: { question: question, options: opts, votes: votes, voters: {}, allowMulti: allowMulti, anonVotes: anonVotes, duration: duration, createdAt: firebase.firestore.FieldValue.serverTimestamp() },
      authorId: currentUser.uid, authorPseudo: d.pseudo||'Anonyme',
      authorEmoji: d.emoji||'👤', authorColor: d.color||'#5B8EF4', authorFlag: d.flag||'',
      reactions: {}, edited: false, ephemeralDuration: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      hideEl(loader);
      closeModal('modal-create-poll');
      $id('poll-question-input').value = '';
      toast('Sondage créé !','success');
    }).catch(function(e){ hideEl(loader); toast('Erreur: '+e.message,'error'); });
  }

  function votePoll(msgId, optIdx){
    if(!currentRoom || !currentUser) return;
    var ref = db.collection('rooms').doc(currentRoom).collection('messages').doc(msgId);
    ref.get().then(function(snap){
      if(!snap.exists) return;
      var data = snap.data();
      var poll = data.poll;
      if(!poll) return;
      var voters = poll.voters || {};
      voters[optIdx] = voters[optIdx] || [];
      if(voters[optIdx].includes(currentUser.uid)){ toast('Déjà voté','info'); return; }
      voters[optIdx].push(currentUser.uid);
      var votes = poll.votes || {};
      votes[optIdx] = (votes[optIdx]||0) + 1;
      ref.update({ 'poll.votes': votes, 'poll.voters': voters });
    });
  }

  /* ════════════════════════════════════════════════════════════════
     36. REPORT MODAL
  ════════════════════════════════════════════════════════════════ */
  function openReportModal(msgId){
    reportTargetMsgId = msgId;
    openModal('modal-report');
  }

  function initReport(){
    var submitBtn = $id('submit-report-btn');
    if(submitBtn) submitBtn.addEventListener('click', function(){
      var reason = ($qs('input[name="report-reason"]:checked')||{}).value;
      if(!reason){ toast('Choisissez une raison','warn'); return; }
      db.collection('reports').add({
        msgId: reportTargetMsgId, roomId: currentRoom,
        reportedBy: (currentUser||{}).uid, reason: reason,
        status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){
        closeModal('modal-report');
        toast('Signalement envoyé','success');
        reportTargetMsgId = null;
      }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
    });
  }

  /* ════════════════════════════════════════════════════════════════
     37. CHAT HEADER ACTIONS
  ════════════════════════════════════════════════════════════════ */
  function initChatHeader(){
    var backBtn = $id('chat-back-btn');
    if(backBtn) backBtn.addEventListener('click', function(){
      remCls($id('rooms-sidebar'), 'sidebar-hidden');
      addCls($id('chat-section'), 'chat-section-hidden');
    });

    var shareBtn = $id('share-room-btn');
    if(shareBtn) shareBtn.addEventListener('click', function(){
      if(!currentRoom) return;
      var url = window.location.origin + window.location.pathname + '?room=' + currentRoom;
      if(navigator.share){ navigator.share({ title: 'Rejoindre le salon SIS', url: url }); }
      else { navigator.clipboard&&navigator.clipboard.writeText(url); toast('Lien copié !','success'); }
    });

    var infoBtn = $id('room-info-btn');
    if(infoBtn) infoBtn.addEventListener('click', function(){
      if(!currentRoomData) return;
      var body = $id('room-info-body');
      if(body) body.innerHTML = '<div class="room-info-detail">'
        + '<p><strong>Nom:</strong> '+escapeHtml(currentRoomData.name||'')+'</p>'
        + '<p><strong>Catégorie:</strong> '+escapeHtml(currentRoomData.category||'')+'</p>'
        + '<p><strong>Type:</strong> '+(currentRoomData.isPrivate?'Privé':'Public')+'</p>'
        + '<p><strong>Messages:</strong> '+(currentRoomData.messageCount||0)+'</p>'
        + '<p><strong>Membres:</strong> '+(currentRoomData.memberCount||0)+'</p>'
        + '</div>';
      openModal('modal-room-info');
    });

    var bgBtn = $id('chat-bg-btn');
    if(bgBtn) bgBtn.addEventListener('click', function(){ openModal('modal-bg'); initBgPanel(); });

    var membersBtn = $id('room-members-btn');
    if(membersBtn) membersBtn.addEventListener('click', function(){
      // Could open a members panel — show a toast for now
      toast('Membres: voir la barre latérale','info');
    });

    var browseBtn = $id('browse-rooms-btn');
    if(browseBtn) browseBtn.addEventListener('click', function(){
      $id('room-search-input').focus();
    });
  }

  /* ════════════════════════════════════════════════════════════════
     38. CHAT BACKGROUND
  ════════════════════════════════════════════════════════════════ */
  var BG_COLORS = ['#1a1a2e','#0f3460','#1a1a2e','#0d0d14','#16213e','#0a0a0a','#1e1b4b','#064e3b','#431407'];
  var BG_GRADS  = [
    'linear-gradient(135deg,#1a1a2e,#16213e)',
    'linear-gradient(135deg,#0f0c29,#302b63)',
    'linear-gradient(135deg,#0d0d14,#1e1b4b)',
    'linear-gradient(135deg,#064e3b,#065f46)',
    'linear-gradient(135deg,#431407,#7c2d12)'
  ];
  var BG_PATTERNS = [
    'radial-gradient(circle, rgba(91,142,244,.08) 1px, transparent 1px) 0 0 / 24px 24px',
    'repeating-linear-gradient(45deg, rgba(91,142,244,.05) 0 1px, transparent 0 16px)',
    'repeating-linear-gradient(0deg, rgba(139,92,246,.06) 0 1px, transparent 0 24px)'
  ];

  function initBgPanel(){
    var colors   = $id('bg-panel-colors');
    var gradients= $id('bg-panel-gradients');
    var patterns = $id('bg-panel-patterns');

    if(colors && !colors.dataset.rendered){
      colors.innerHTML = BG_COLORS.map(function(c,i){
        return '<button class="bg-swatch" style="background:'+c+'" data-bg="color" data-val="'+c+'" title="Couleur '+(i+1)+'"></button>';
      }).join('');
      colors.dataset.rendered = '1';
      colors.querySelectorAll('.bg-swatch').forEach(function(btn){
        btn.addEventListener('click', function(){ previewBg(btn.style.background); });
      });
    }
    if(gradients && !gradients.dataset.rendered){
      gradients.innerHTML = BG_GRADS.map(function(g,i){
        return '<button class="bg-swatch" style="background:'+g+'" data-val="'+escapeHtml(g)+'" title="Dégradé '+(i+1)+'"></button>';
      }).join('');
      gradients.dataset.rendered = '1';
      gradients.querySelectorAll('.bg-swatch').forEach(function(btn){
        btn.addEventListener('click', function(){ previewBg(btn.dataset.val); });
      });
    }
    if(patterns && !patterns.dataset.rendered){
      patterns.innerHTML = BG_PATTERNS.map(function(p,i){
        return '<button class="bg-swatch bg-pattern-swatch" style="background:'+p+'" data-val="'+escapeHtml(p)+'" title="Motif '+(i+1)+'"></button>';
      }).join('');
      patterns.dataset.rendered = '1';
      patterns.querySelectorAll('.bg-swatch').forEach(function(btn){
        btn.addEventListener('click', function(){ previewBg(btn.dataset.val); });
      });
    }

    // Custom file
    var customFile = $id('bg-custom-file');
    if(customFile) customFile.addEventListener('change', function(){
      var file = customFile.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(e){
        previewBg('url("'+e.target.result+'")');
        showEl($id('bg-custom-controls'));
      };
      reader.readAsDataURL(file);
    });

    // Sliders
    var opacitySlider = $id('bg-opacity-slider');
    var blurSlider    = $id('bg-blur-slider');
    if(opacitySlider) opacitySlider.addEventListener('input', function(){
      setText('bg-opacity-val', opacitySlider.value+'%');
      applyCurrentBgToMessages();
    });
    if(blurSlider) blurSlider.addEventListener('input', function(){
      setText('bg-blur-val', blurSlider.value+'px');
      applyCurrentBgToMessages();
    });

    // Tabs
    $qsa('.bg-tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        $qsa('.bg-tab-btn').forEach(function(b){ remCls(b,'active'); });
        addCls(btn,'active');
        $qsa('.bg-panel-content').forEach(function(p){ remCls(p,'active'); addCls(p,'hidden'); });
        var panel = $id('bg-panel-'+btn.dataset.bgtab);
        if(panel){ remCls(panel,'hidden'); addCls(panel,'active'); }
      });
    });

    // Apply & Reset
    var applyBtn = $id('bg-apply-btn');
    var resetBtn = $id('bg-reset-btn');
    if(applyBtn) applyBtn.addEventListener('click', function(){
      if(currentRoom) bgSettings[currentRoom] = currentPreviewBg;
      try{ localStorage.setItem('sis_bg', JSON.stringify(bgSettings)); } catch(e){}
      applyChatBackground(currentRoom);
      closeModal('modal-bg');
      toast('Arrière-plan appliqué','success');
    });
    if(resetBtn) resetBtn.addEventListener('click', function(){
      if(currentRoom) delete bgSettings[currentRoom];
      try{ localStorage.setItem('sis_bg', JSON.stringify(bgSettings)); } catch(e){}
      applyChatBackground(currentRoom);
      closeModal('modal-bg');
    });
  }

  var currentPreviewBg = '';
  function previewBg(val){
    currentPreviewBg = val;
    applyCurrentBgToMessages();
  }

  function applyCurrentBgToMessages(){
    var el = $id('messages-scroll');
    if(!el) return;
    var opacity = (($id('bg-opacity-slider')||{}).value || 70) / 100;
    var blur    = ($id('bg-blur-slider')||{}).value || 0;
    el.style.background = currentPreviewBg;
    el.style.opacity    = opacity;
    el.style.filter     = blur > 0 ? 'blur('+blur+'px)' : '';
  }

  function applyChatBackground(roomId){
    var el = $id('messages-scroll');
    if(!el) return;
    var bg = bgSettings[roomId] || '';
    el.style.background = bg;
    el.style.opacity    = '';
    el.style.filter     = '';
  }

  /* ════════════════════════════════════════════════════════════════
     39. MODALS SYSTEM
  ════════════════════════════════════════════════════════════════ */
  function openModal(id){
    var el = $id(id);
    if(!el) return;
    showEl(el);
    setTimeout(function(){ addCls(el,'modal-in'); }, 10);
    if(window.lucide) lucide.createIcons({ el: el });
  }

  function closeModal(id){
    var el = $id(id);
    if(!el) return;
    remCls(el,'modal-in');
    setTimeout(function(){ hideEl(el); }, 300);
  }

  function initModals(){
    // Generic close buttons [data-modal]
    document.addEventListener('click', function(e){
      var btn = e.target.closest('[data-modal]');
      if(btn) closeModal(btn.dataset.modal);
      // Click outside modal box
      if(e.target.classList.contains('modal-overlay') && !e.target.classList.contains('auth-box')){
        closeModal(e.target.id);
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     40. GLOBAL SEARCH
  ════════════════════════════════════════════════════════════════ */
  function initGlobalSearch(){
    var openBtn = $id('global-search-btn');
    if(openBtn) openBtn.addEventListener('click', function(){ openModal('modal-global-search'); $id('global-search-input').focus(); });

    var inp = $id('global-search-input');
    if(inp){
      inp.addEventListener('input', function(){
        if(globalSearchTimeout) clearTimeout(globalSearchTimeout);
        globalSearchTimeout = setTimeout(function(){ doGlobalSearch(inp.value); }, 400);
      });
    }
  }

  function doGlobalSearch(query){
    var results = $id('global-search-results');
    if(!results) return;
    if(!query.trim()){ results.innerHTML = '<div class="global-search-empty"><i data-lucide="search"></i><p>Saisissez votre recherche...</p></div>'; if(window.lucide) lucide.createIcons({ el: results }); return; }
    results.innerHTML = '<div class="global-search-empty"><i data-lucide="loader-2" class="spin"></i><p>Recherche...</p></div>';
    if(window.lucide) lucide.createIcons({ el: results });
    // Search rooms
    db.collection('rooms').where('name','>=',query).where('name','<=',query+'\uf8ff').limit(5).get()
      .then(function(snap){
        var html = '';
        if(!snap.empty){
          html += '<div class="search-group-title"><i data-lucide="hash"></i> Salons</div>';
          snap.forEach(function(doc){
            var d = doc.data();
            html += '<div class="search-result-item" data-room-id="'+doc.id+'"><span class="sr-icon">'+escapeHtml(d.emoji||'#')+'</span><span class="sr-title">'+escapeHtml(d.name)+'</span><span class="sr-meta">'+escapeHtml(d.category||'')+'</span></div>';
          });
        }
        results.innerHTML = html || '<div class="global-search-empty"><i data-lucide="search-x"></i><p>Aucun résultat</p></div>';
        results.querySelectorAll('.search-result-item[data-room-id]').forEach(function(el){
          el.addEventListener('click', function(){
            joinRoom(el.dataset.roomId);
            closeModal('modal-global-search');
          });
        });
        if(window.lucide) lucide.createIcons({ el: results });
      }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     41. NOTIFICATIONS PANEL
  ════════════════════════════════════════════════════════════════ */
  function initNotifications(){
    var openBtn  = $id('notif-open-btn');
    var closeBtn = $id('close-notif-panel');
    var markAll  = $id('mark-all-notif-read');
    var panel    = $id('notif-side-panel');

    if(openBtn) openBtn.addEventListener('click', function(){
      toggleEl(panel);
      unreadNotifs = 0;
      updateNotifBadge();
      renderNotifList();
    });
    if(closeBtn) closeBtn.addEventListener('click', function(){ hideEl(panel); });
    if(markAll) markAll.addEventListener('click', function(){ notifList = []; renderNotifList(); unreadNotifs=0; updateNotifBadge(); });
  }

  function addNotification(message, icon){
    notifList.unshift({ message: message, icon: icon||'bell', ts: new Date() });
    if(notifList.length > 50) notifList.pop();
    unreadNotifs++;
    updateNotifBadge();
    playNotifSound();
  }

  function updateNotifBadge(){
    var dot = $id('notif-dot');
    if(dot){ if(unreadNotifs > 0) showEl(dot); else hideEl(dot); }
  }

  function renderNotifList(){
    var list = $id('notif-panel-list');
    if(!list) return;
    if(notifList.length === 0){
      list.innerHTML = '<div class="notif-empty-state"><i data-lucide="bell-off"></i><p>Aucune notification</p></div>';
    } else {
      list.innerHTML = notifList.map(function(n){
        return '<div class="notif-item"><i data-lucide="'+escapeHtml(n.icon||'bell')+'"></i><div class="notif-body"><p>'+escapeHtml(n.message)+'</p><small>'+timeAgo(n.ts)+'</small></div></div>';
      }).join('');
    }
    if(window.lucide) lucide.createIcons({ el: list });
  }

  /* ════════════════════════════════════════════════════════════════
     42. FCM — PUSH NOTIFICATIONS
  ════════════════════════════════════════════════════════════════ */
  function initFCM(){
    if(!messaging) return;
    Notification.requestPermission().then(function(perm){
      if(perm !== 'granted') return;
      return messaging.getToken({ vapidKey: VAPID_KEY });
    }).then(function(token){
      if(token && currentUser){
        db.collection('users').doc(currentUser.uid).update({ fcmToken: token }).catch(function(){});
      }
    }).catch(function(){});

    messaging.onMessage(function(payload){
      var n = payload.notification || {};
      addNotification(n.title || 'Nouveau message', 'bell');
      playNotifSound();
    });
  }

  /* ════════════════════════════════════════════════════════════════
     43. DMs
  ════════════════════════════════════════════════════════════════ */
  function listenDMs(){
    if(!currentUser) return;
    db.collection('dms').where('participants','array-contains',currentUser.uid)
      .orderBy('lastMessageAt','desc')
      .onSnapshot(function(snap){
        unreadDMs = 0;
        snap.forEach(function(doc){
          var d = doc.data();
          if(d.unread && d.unread[currentUser.uid]) unreadDMs += d.unread[currentUser.uid];
        });
        updateDMBadge();
        if(activeView === 'dms') loadDmList();
      }, function(){});
  }

  function loadDmList(){
    if(!currentUser) return;
    db.collection('dms').where('participants','array-contains',currentUser.uid)
      .orderBy('lastMessageAt','desc').limit(30).get().then(function(snap){
        var list = $id('dm-list');
        if(!list) return;
        if(snap.empty){
          list.innerHTML = '<div class="sidebar-empty-state"><i data-lucide="message-square-off"></i><p>Aucune conversation</p><small>Initiez un DM depuis le profil d\'un membre</small></div>';
          if(window.lucide) lucide.createIcons({ el: list }); return;
        }
        var html = '';
        snap.forEach(function(doc){
          var d = doc.data();
          var otherId = (d.participants||[]).find(function(p){ return p !== currentUser.uid; });
          var other = d.participantData && d.participantData[otherId] || {};
          var unread = (d.unread||{})[currentUser.uid] || 0;
          html += '<div class="room-item" data-dm-id="'+doc.id+'" data-other-uid="'+(otherId||'')+'">'
            + '<div class="room-av" style="background:'+(other.color||'#5B8EF4')+'">'+(other.emoji||'👤')+'</div>'
            + '<div class="room-item-body">'
            +   '<div class="room-item-name">'+escapeHtml(other.pseudo||'Anonyme')+'</div>'
            +   '<div class="room-item-meta"><span class="room-cat-chip">'+(d.lastMessage||'').substring(0,30)+'</span>'
            +   (unread>0?'<span class="dm-unread-badge">'+unread+'</span>':'')+'</div>'
            + '</div></div>';
        });
        list.innerHTML = html;
        list.querySelectorAll('.room-item[data-dm-id]').forEach(function(el){
          el.addEventListener('click', function(){ openDMConversation(el.dataset.dmId, el.dataset.otherUid); });
        });
        if(window.lucide) lucide.createIcons({ el: list });
      }).catch(function(){});
  }

  function updateDMBadge(){
    [$id('dm-topbar-badge'), $id('dm-mobile-badge')].forEach(function(el){
      if(!el) return;
      if(unreadDMs > 0){ el.textContent = unreadDMs; showEl(el); } else hideEl(el);
    });
  }

  function openDMConversation(dmId, otherUid){
    var section = $id('dm-chat-section');
    if(!section) return;
    section.innerHTML = '<div class="chat-active-state" style="display:flex;flex-direction:column;height:100%">'
      + '<div class="chat-header"><h3 style="padding:16px">Chargement...</h3></div>'
      + '<div id="dm-messages-list" class="messages-scroll" role="log" style="flex:1;overflow-y:auto"></div>'
      + '<div class="msg-input-area"><div class="input-field-wrap"><textarea id="dm-textarea" class="msg-textarea" placeholder="Votre message..." rows="1" maxlength="1000"></textarea></div>'
      + '<div class="input-right-btns"><button id="dm-send-btn" class="msg-send-btn"><i data-lucide="send"></i></button></div></div></div>';

    if(window.lucide) lucide.createIcons({ el: section });

    // Load other user data
    db.collection('users').doc(otherUid).get().then(function(snap){
      var other = snap.data() || {};
      var header = section.querySelector('.chat-header h3');
      if(header) header.textContent = (other.emoji||'👤')+' '+escapeHtml(other.pseudo||'Anonyme');
    });

    // Listen DM messages
    if(dmListeners[dmId]) dmListeners[dmId]();
    dmListeners[dmId] = db.collection('dms').doc(dmId).collection('messages')
      .orderBy('createdAt','asc').limitToLast(50)
      .onSnapshot(function(snap){
        var list = $id('dm-messages-list');
        if(!list) return;
        snap.docChanges().forEach(function(change){
          if(change.type === 'added'){
            var msg = Object.assign({ id: change.doc.id }, change.doc.data());
            var isMe = msg.authorId === currentUser.uid;
            var div = document.createElement('div');
            div.className = 'msg-row' + (isMe?' msg-row--me':' msg-row--other');
            decryptMessage(msg.text||'').then(function(text){
              div.innerHTML = '<div class="msg-bubble-wrap"><div class="msg-bubble"><p class="msg-text">'+parseMarkdown(text)+'</p>'
                + '<div class="msg-meta"><span class="msg-ts">'+formatTime(msg.createdAt)+'</span></div></div></div>';
            });
            list.appendChild(div);
            list.scrollTop = list.scrollHeight;
          }
        });
        // Mark read
        db.collection('dms').doc(dmId).update({ ['unread.'+currentUser.uid]: 0 }).catch(function(){});
      });

    // Send DM
    var sendBtn = $id('dm-send-btn');
    var ta = $id('dm-textarea');
    function sendDM(){
      if(!ta || !ta.value.trim()) return;
      var text = ta.value.trim();
      ta.value = '';
      var d = currentUserData || {};
      encryptMessage(text).then(function(enc){
        db.collection('dms').doc(dmId).collection('messages').add({
          text: enc, type: 'text',
          authorId: currentUser.uid, authorPseudo: d.pseudo||'Anonyme',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        db.collection('dms').doc(dmId).update({
          lastMessage: text.substring(0,50),
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          ['unread.'+otherUid]: firebase.firestore.FieldValue.increment(1)
        }).catch(function(){});
      });
    }
    if(sendBtn) sendBtn.addEventListener('click', sendDM);
    if(ta) ta.addEventListener('keydown', function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendDM(); } });
  }

  /* ════════════════════════════════════════════════════════════════
     44. RANDOM CHAT
  ════════════════════════════════════════════════════════════════ */
  function initRandomChat(){
    var startBtn  = $id('random-start-btn');
    var cancelBtn = $id('random-cancel-btn');
    var skipBtn   = $id('random-skip-btn');
    var quitBtn   = $id('random-quit-btn');
    var sendBtn   = $id('random-send-btn');
    var inp       = $id('random-msg-input');

    if(startBtn)  startBtn.addEventListener('click', startRandomSearch);
    if(cancelBtn) cancelBtn.addEventListener('click', cancelRandomSearch);
    if(skipBtn)   skipBtn.addEventListener('click', skipRandom);
    if(quitBtn)   quitBtn.addEventListener('click', quitRandom);
    if(sendBtn)   sendBtn.addEventListener('click', sendRandomMessage);
    if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter') sendRandomMessage(); });
  }

  function startRandomSearch(){
    if(!currentUser) return;
    showRandomState('random-searching');
    var d = currentUserData || {};
    db.collection('random-queue').doc(currentUser.uid).set({
      uid: currentUser.uid, pseudo: d.pseudo||'Anonyme', emoji: d.emoji||'👤',
      color: d.color||'#5B8EF4', status: 'waiting',
      joinedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      // Try to match
      db.collection('random-queue').where('status','==','waiting')
        .where('uid','!=',currentUser.uid).limit(1).get().then(function(snap){
          if(!snap.empty){
            var partner = snap.docs[0];
            var sessionId = [currentUser.uid, partner.id].sort().join('_');
            var partnerData = partner.data();
            // Create session
            var batch = db.batch();
            batch.set(db.collection('random-sessions').doc(sessionId), {
              participants: [currentUser.uid, partner.id],
              createdAt: firebase.firestore.FieldValue.serverTimestamp(), active: true
            });
            batch.delete(db.collection('random-queue').doc(currentUser.uid));
            batch.delete(partner.ref);
            batch.commit().then(function(){
              openRandomChat(sessionId, partnerData);
            });
          }
          // Otherwise wait for listener
          listenRandomQueue(currentUser.uid);
        });
    });
  }

  function listenRandomQueue(uid){
    var unsub = db.collection('random-queue').doc(uid).onSnapshot(function(snap){
      if(!snap.exists) return;
      var d = snap.data();
      if(d.matchedWith){
        unsub();
        var partnerUid = d.matchedWith;
        db.collection('users').doc(partnerUid).get().then(function(uSnap){
          var sessionId = [uid, partnerUid].sort().join('_');
          openRandomChat(sessionId, uSnap.data()||{});
        });
      }
    });
  }

  function openRandomChat(sessionId, partnerData){
    randomSessionId   = sessionId;
    randomPartnerUid  = partnerData.uid;
    showRandomState('random-chat');
    setText('random-partner-name', partnerData.pseudo||'Inconnu');
    var avEl = $id('random-partner-av');
    if(avEl){ avEl.textContent = partnerData.emoji||'👤'; avEl.style.background = partnerData.color||'#5B8EF4'; }
    // Listen messages
    if(randomMsgsListener) randomMsgsListener();
    randomMsgsListener = db.collection('random-sessions').doc(sessionId).collection('messages')
      .orderBy('createdAt','asc').onSnapshot(function(snap){
        var area = $id('random-msgs-area');
        if(!area) return;
        snap.docChanges().forEach(function(change){
          if(change.type !== 'added') return;
          var msg = change.doc.data();
          var isMe = msg.authorId === currentUser.uid;
          var div  = document.createElement('div');
          div.className = 'msg-row'+(isMe?' msg-row--me':' msg-row--other');
          div.innerHTML = '<div class="msg-bubble-wrap"><div class="msg-bubble"><p class="msg-text">'+parseMarkdown(escapeHtml(msg.text||''))+'</p><div class="msg-meta"><span class="msg-ts">'+formatTime(msg.createdAt)+'</span></div></div></div>';
          area.appendChild(div);
          area.scrollTop = area.scrollHeight;
        });
      });
  }

  function sendRandomMessage(){
    if(!randomSessionId || !currentUser) return;
    var inp = $id('random-msg-input');
    if(!inp || !inp.value.trim()) return;
    var text = inp.value.trim();
    inp.value = '';
    db.collection('random-sessions').doc(randomSessionId).collection('messages').add({
      text: text, authorId: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function skipRandom(){ quitRandom(); startRandomSearch(); }

  function quitRandom(){
    if(randomSessionId) db.collection('random-sessions').doc(randomSessionId).update({ active: false }).catch(function(){});
    if(randomMsgsListener){ randomMsgsListener(); randomMsgsListener=null; }
    db.collection('random-queue').doc(currentUser.uid).delete().catch(function(){});
    randomSessionId = null;
    randomPartnerUid = null;
    showRandomState('random-idle');
    var area = $id('random-msgs-area');
    if(area) area.innerHTML = '';
  }

  function cancelRandomSearch(){
    db.collection('random-queue').doc(currentUser.uid).delete().catch(function(){});
    showRandomState('random-idle');
  }

  function showRandomState(id){
    $qsa('.random-state').forEach(function(s){ remCls(s,'active'); addCls(s,'hidden'); });
    var el = $id(id);
    if(el){ remCls(el,'hidden'); addCls(el,'active'); }
  }

  /* ════════════════════════════════════════════════════════════════
     45. STATS VIEW
  ════════════════════════════════════════════════════════════════ */
  function loadStats(){
    db.collection('stats').doc('global').get().then(function(snap){
      var d = snap.data() || {};
      setText('kpi-active-users', formatNumber(d.activeUsers||d.totalUsers||0));
      setText('kpi-total-msgs',   formatNumber(d.totalMessages||0));
      setText('kpi-active-rooms', formatNumber(d.totalRooms||0));
      setText('kpi-polls-count',  formatNumber(d.totalPolls||0));
      setText('kpi-voice-msgs',   formatNumber(d.voiceMessages||0));
      setText('kpi-reports-count',formatNumber(d.reports||0));
      setText('kpi-media-sent',   formatNumber(d.mediaSent||0));
      setText('kpi-random-chats', formatNumber(d.randomChats||0));
    }).catch(function(){});

    loadTopRooms();
    loadTopUsers();
    loadRecentPolls();
    loadReactionsStats();
    initStatCharts();
    listenRealtimeFeed();
  }

  function loadTopRooms(){
    db.collection('rooms').orderBy('messageCount','desc').limit(10).get().then(function(snap){
      var tbody = $id('top-rooms-tbody');
      if(!tbody) return;
      if(snap.empty){ tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucun salon</td></tr>'; return; }
      var html = '';
      var i=0;
      snap.forEach(function(doc){
        i++;
        var d = doc.data();
        html += '<tr><td>'+i+'</td><td><span class="tr-name">'+escapeHtml(d.name||'')+'</span></td>'
          + '<td><span class="cat-chip-sm">'+escapeHtml(d.category||'')+'</span></td>'
          + '<td>'+formatNumber(d.messageCount||0)+'</td>'
          + '<td>'+formatNumber(d.memberCount||0)+'</td>'
          + '<td><span class="trend-arrow trend-up">↑</span></td></tr>';
      });
      tbody.innerHTML = html;
    }).catch(function(){});
  }

  function loadTopUsers(){
    db.collection('users').orderBy('totalMessages','desc').limit(10).get().then(function(snap){
      var tbody = $id('top-users-tbody');
      if(!tbody) return;
      var html = '';
      var i=0;
      snap.forEach(function(doc){
        i++;
        var d = doc.data();
        html += '<tr><td>'+i+'</td><td><span class="tr-user">'+escapeHtml(d.emoji||'👤')+' '+escapeHtml(d.pseudo||'Anonyme')+'</span></td>'
          + '<td>'+formatNumber(d.totalMessages||0)+'</td>'
          + '<td>'+formatNumber(d.totalReactions||0)+'</td>'
          + '<td>'+(d.joinedAt?formatDateLabel(d.joinedAt):'—')+'</td>'
          + '<td><span class="rank-badge">#'+i+'</span></td></tr>';
      });
      tbody.innerHTML = html || '<tr><td colspan="6" class="table-empty">Aucun utilisateur</td></tr>';
    }).catch(function(){});
  }

  function loadRecentPolls(){
    var grid = $id('polls-stats-grid');
    if(!grid) return;
    // Search across rooms — lightweight approach: stored in a global polls collection
    db.collection('stats').doc('polls').get().then(function(snap){
      var polls = (snap.data()||{}).recent || [];
      if(!polls.length){ grid.innerHTML = '<div class="polls-empty-state"><i data-lucide="bar-chart-2"></i><p>Aucun sondage</p></div>'; if(window.lucide) lucide.createIcons({ el: grid }); return; }
      grid.innerHTML = polls.map(function(p){
        return '<div class="poll-stat-card"><div class="poll-stat-q">'+escapeHtml(p.question||'')+'</div>'
          + '<div class="poll-stat-total">'+formatNumber(p.totalVotes||0)+' votes</div></div>';
      }).join('');
    }).catch(function(){ grid.innerHTML = '<div class="polls-empty-state"><i data-lucide="bar-chart-2"></i><p>Aucun sondage</p></div>'; if(window.lucide) lucide.createIcons({ el: grid }); });
  }

  function loadReactionsStats(){
    var wrap = $id('reactions-stats-wrap');
    if(!wrap) return;
    db.collection('stats').doc('reactions').get().then(function(snap){
      var d = snap.data() || {};
      var emojis = Object.keys(d).sort(function(a,b){ return (d[b]||0)-(d[a]||0); }).slice(0,12);
      if(!emojis.length){ wrap.innerHTML=''; return; }
      var max = d[emojis[0]] || 1;
      wrap.innerHTML = emojis.map(function(emoji){
        var pct = Math.round((d[emoji]||0)/max*100);
        return '<div class="reaction-stat-item"><span class="reaction-stat-emoji">'+emoji+'</span>'
          + '<div class="reaction-stat-bar-wrap"><div class="reaction-stat-bar" style="width:'+pct+'%"></div></div>'
          + '<span class="reaction-stat-count">'+formatNumber(d[emoji]||0)+'</span></div>';
      }).join('');
    }).catch(function(){});
  }

  function initStatCharts(){
    var actCanvas = $id('chart-activity');
    var catCanvas = $id('chart-categories');
    var hrsCanvas = $id('chart-hours');
    var modCanvas = $id('chart-moderation');
    if(!window.Chart) return;

    var chartDefaults = {
      plugins: { legend: { labels: { color:'rgba(255,255,255,.7)', font:{ size:11 } } } },
      scales: { x:{ ticks:{ color:'rgba(255,255,255,.5)' }, grid:{ color:'rgba(255,255,255,.05)' } },
                y:{ ticks:{ color:'rgba(255,255,255,.5)' }, grid:{ color:'rgba(255,255,255,.05)' } } }
    };

    if(actCanvas && !statsCharts['activity']){
      statsCharts['activity'] = new Chart(actCanvas, {
        type:'line', data:{
          labels:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
          datasets:[
            { label:'Messages', data:[0,0,0,0,0,0,0], borderColor:'#5B8EF4', backgroundColor:'rgba(91,142,244,.1)', tension:.4, fill:true },
            { label:'Utilisateurs', data:[0,0,0,0,0,0,0], borderColor:'#8B5CF6', backgroundColor:'rgba(139,92,246,.1)', tension:.4, fill:true }
          ]
        }, options: Object.assign({}, chartDefaults, { responsive:true, maintainAspectRatio:false })
      });
    }

    if(catCanvas && !statsCharts['categories']){
      statsCharts['categories'] = new Chart(catCanvas, {
        type:'doughnut', data:{
          labels:['Général','Gaming','Tech','Musique','Sport','Éducation','Manga','Art'],
          datasets:[{ data:[0,0,0,0,0,0,0,0], backgroundColor:['#5B8EF4','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#6366F1'] }]
        }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'rgba(255,255,255,.7)', font:{ size:11 } } } } }
      });
    }

    if(hrsCanvas && !statsCharts['hours']){
      statsCharts['hours'] = new Chart(hrsCanvas, {
        type:'bar',
        data:{ labels:['0h','3h','6h','9h','12h','15h','18h','21h'], datasets:[{ label:'Messages/heure', data:[0,0,0,0,0,0,0,0], backgroundColor:'rgba(91,142,244,.6)', borderColor:'#5B8EF4', borderWidth:1 }] },
        options:Object.assign({},chartDefaults,{ responsive:true, maintainAspectRatio:false })
      });
    }

    if(modCanvas && !statsCharts['moderation']){
      statsCharts['moderation'] = new Chart(modCanvas, {
        type:'line',
        data:{ labels:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'], datasets:[{ label:'Score toxicité moyen', data:[0,0,0,0,0,0,0], borderColor:'#EF4444', backgroundColor:'rgba(239,68,68,.1)', tension:.4, fill:true }] },
        options:Object.assign({},chartDefaults,{ responsive:true, maintainAspectRatio:false })
      });
    }

    // Load real data from stats
    db.collection('stats').doc('charts').get().then(function(snap){
      var d = snap.data() || {};
      if(d.activity && statsCharts['activity']){
        statsCharts['activity'].data.datasets[0].data = d.activity.messages || [0,0,0,0,0,0,0];
        statsCharts['activity'].data.datasets[1].data = d.activity.users    || [0,0,0,0,0,0,0];
        statsCharts['activity'].update();
      }
      if(d.categories && statsCharts['categories']){
        statsCharts['categories'].data.datasets[0].data = d.categories || [0,0,0,0,0,0,0,0];
        statsCharts['categories'].update();
      }
      if(d.hours && statsCharts['hours']){
        statsCharts['hours'].data.datasets[0].data = d.hours || [0,0,0,0,0,0,0,0];
        statsCharts['hours'].update();
      }
    }).catch(function(){});

    // Sparklines
    ['spark-users','spark-msgs','spark-rooms','spark-polls','spark-voice','spark-reports'].forEach(function(id){
      var canvas = $id(id);
      if(!canvas || canvas._chart) return;
      canvas._chart = new Chart(canvas, {
        type:'line', data:{ labels:[1,2,3,4,5,6,7], datasets:[{ data:[0,0,0,0,0,0,0], borderColor:'rgba(91,142,244,.8)', borderWidth:1.5, fill:false, tension:.4, pointRadius:0 }] },
        options:{ responsive:false, plugins:{ legend:{ display:false } }, scales:{ x:{ display:false }, y:{ display:false } }, animation:false }
      });
    });
  }

  function listenRealtimeFeed(){
    var feed = $id('realtime-feed-list');
    if(!feed) return;
    db.collection('rooms').orderBy('lastMessageAt','desc').limit(1)
      .onSnapshot(function(snap){
        snap.docChanges().forEach(function(change){
          if(change.type === 'modified'){
            var d = change.doc.data();
            var item = document.createElement('div');
            item.className = 'realtime-feed-item';
            item.innerHTML = '<i data-lucide="message-circle"></i><span>Nouveau message dans <strong>'+escapeHtml(d.name||'')+'</strong></span><small>'+timeAgo(d.lastMessageAt)+'</small>';
            feed.insertBefore(item, feed.firstChild);
            if(feed.children.length > 20) feed.lastChild.remove();
            if(window.lucide) lucide.createIcons({ el: item });
          }
        });
      });
  }

  function initStatsPeriod(){
    $qsa('.period-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        $qsa('.period-btn').forEach(function(b){ remCls(b,'active'); });
        addCls(btn,'active');
        // Reload stats for period
        loadStats();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════
     46. ADMIN PANEL
  ════════════════════════════════════════════════════════════════ */
  function loadAdmin(){
    if(!(currentUserData && (currentUserData.role==='admin'||currentUserData.role==='mod'))){
      toast('Accès refusé','error'); switchView('rooms'); return;
    }
    loadAdminKPIs();
    loadAdminUsers();
    loadAdminRooms();
    loadAdminReports();
    loadAdminBanned();
  }

  function loadAdminKPIs(){
    db.collection('stats').doc('global').get().then(function(snap){
      var d = snap.data() || {};
      setText('adm-kpi-users',   formatNumber(d.totalUsers||0));
      setText('adm-kpi-msgs',    formatNumber(d.totalMessages||0));
      setText('adm-kpi-rooms',   formatNumber(d.totalRooms||0));
      setText('adm-kpi-reports', formatNumber(d.reports||0));
      setText('adm-kpi-banned',  formatNumber(d.banned||0));
    }).catch(function(){});
  }

  function loadAdminUsers(){
    var tbody = $id('admin-users-tbody');
    if(!tbody) return;
    db.collection('users').orderBy('totalMessages','desc').limit(50).get().then(function(snap){
      if(snap.empty){ tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucun utilisateur</td></tr>'; return; }
      var html = '';
      snap.forEach(function(doc){
        var d = doc.data();
        var roleBadge = '<span class="role-badge role-'+escapeHtml(d.role||'user')+'">'+escapeHtml(d.role||'user')+'</span>';
        html += '<tr><td>'+escapeHtml(d.emoji||'👤')+' '+escapeHtml(d.pseudo||'Anonyme')+'</td>'
          + '<td>'+roleBadge+'</td>'
          + '<td>'+formatNumber(d.totalMessages||0)+'</td>'
          + '<td>'+(d.joinedAt ? new Date((d.joinedAt.seconds||0)*1000).toLocaleDateString('fr-FR') : '—')+'</td>'
          + '<td><span class="status-dot status-'+escapeHtml(d.status||'offline')+'"></span>'+escapeHtml(d.status||'offline')+'</td>'
          + '<td class="admin-actions-cell">'
          + '<button class="admin-action-sm" data-action="promote" data-uid="'+doc.id+'">Promouvoir</button>'
          + '<button class="admin-action-sm admin-action-sm--danger" data-action="ban" data-uid="'+doc.id+'">Bannir</button>'
          + '</td></tr>';
      });
      tbody.innerHTML = html;
      tbody.querySelectorAll('[data-action]').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(btn.dataset.action === 'ban') banUser(btn.dataset.uid);
          if(btn.dataset.action === 'promote') promoteUser(btn.dataset.uid);
        });
      });
    }).catch(function(){});
  }

  function loadAdminRooms(){
    var tbody = $id('admin-rooms-tbody');
    if(!tbody) return;
    db.collection('rooms').orderBy('messageCount','desc').limit(30).get().then(function(snap){
      var html = '';
      snap.forEach(function(doc){
        var d = doc.data();
        html += '<tr><td>'+escapeHtml(d.name||'')+'</td>'
          + '<td>'+escapeHtml(d.category||'')+'</td>'
          + '<td>'+(d.isPrivate?'Privé':'Public')+'</td>'
          + '<td>'+formatNumber(d.messageCount||0)+'</td>'
          + '<td>'+formatNumber(d.memberCount||0)+'</td>'
          + '<td>'+(d.createdAt ? new Date((d.createdAt.seconds||0)*1000).toLocaleDateString('fr-FR') : '—')+'</td>'
          + '<td><button class="admin-action-sm admin-action-sm--danger" data-action="delete-room" data-rid="'+doc.id+'">Supprimer</button></td></tr>';
      });
      tbody.innerHTML = html || '<tr><td colspan="7" class="table-empty">Aucun salon</td></tr>';
      tbody.querySelectorAll('[data-action="delete-room"]').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(confirm('Supprimer ce salon ?')) deleteRoom(btn.dataset.rid);
        });
      });
    }).catch(function(){});
  }

  function loadAdminReports(){
    var list = $id('admin-reports-list');
    if(!list) return;
    db.collection('reports').where('status','==','pending').limit(20).get().then(function(snap){
      if(snap.empty){ list.innerHTML = '<div class="admin-empty-state"><i data-lucide="check-circle"></i><h3>Aucun signalement actif</h3><p>La communauté est au calme !</p></div>'; if(window.lucide) lucide.createIcons({ el: list }); return; }
      var html = '';
      snap.forEach(function(doc){
        var d = doc.data();
        html += '<div class="admin-report-card">'
          + '<div class="report-info"><span class="report-reason">'+escapeHtml(d.reason||'')+'</span><span class="report-room">Salon: '+escapeHtml(d.roomId||'')+'</span></div>'
          + '<div class="report-actions">'
          + '<button class="admin-action-sm" data-action="dismiss-report" data-rid="'+doc.id+'">Ignorer</button>'
          + '<button class="admin-action-sm admin-action-sm--danger" data-action="delete-report-msg" data-rid="'+doc.id+'" data-msgid="'+escapeHtml(d.msgId||'')+'" data-roomid="'+escapeHtml(d.roomId||'')+'">Supprimer msg</button>'
          + '</div></div>';
      });
      list.innerHTML = html;
      list.querySelectorAll('[data-action]').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(btn.dataset.action === 'dismiss-report'){
            db.collection('reports').doc(btn.dataset.rid).update({ status:'dismissed' }).then(function(){ loadAdminReports(); });
          }
          if(btn.dataset.action === 'delete-report-msg'){
            db.collection('rooms').doc(btn.dataset.roomid).collection('messages').doc(btn.dataset.msgid).delete();
            db.collection('reports').doc(btn.dataset.rid).update({ status:'resolved' }).then(function(){ loadAdminReports(); });
          }
        });
      });
      // Update count badge
      var countBadge = $id('reports-admin-count');
      if(countBadge){ countBadge.textContent = snap.size; showEl(countBadge); }
      if(window.lucide) lucide.createIcons({ el: list });
    }).catch(function(){});
  }

  function loadAdminBanned(){
    var tbody = $id('admin-banned-tbody');
    if(!tbody) return;
    db.collection('bans').where('active','==',true).limit(30).get().then(function(snap){
      var html = '';
      snap.forEach(function(doc){
        var d = doc.data();
        html += '<tr><td>'+escapeHtml(d.pseudo||d.uid||'')+'</td>'
          + '<td>'+escapeHtml(d.reason||'')+'</td>'
          + '<td>'+(d.bannedAt ? new Date((d.bannedAt.seconds||0)*1000).toLocaleDateString('fr-FR') : '—')+'</td>'
          + '<td>'+(d.duration||'Permanent')+'</td>'
          + '<td><button class="admin-action-sm" data-action="unban" data-uid="'+escapeHtml(d.uid||'')+'" data-banid="'+doc.id+'">Débannir</button></td></tr>';
      });
      tbody.innerHTML = html || '<tr><td colspan="5" class="table-empty">Aucun banni</td></tr>';
      tbody.querySelectorAll('[data-action="unban"]').forEach(function(btn){
        btn.addEventListener('click', function(){ unbanUser(btn.dataset.uid, btn.dataset.banid); });
      });
    }).catch(function(){});
  }

  function banUser(uid){
    var reason = prompt('Raison du bannissement :');
    if(!reason) return;
    db.collection('bans').add({
      uid: uid, reason: reason, active: true, duration: 'Permanent',
      bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
      bannedBy: currentUser.uid
    }).then(function(){
      return db.collection('users').doc(uid).update({ role: 'banned', banned: true });
    }).then(function(){
      toast('Utilisateur banni','success');
      loadAdminUsers();
    }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
  }

  function unbanUser(uid, banId){
    db.collection('bans').doc(banId).update({ active: false }).then(function(){
      return db.collection('users').doc(uid).update({ role: 'user', banned: false });
    }).then(function(){
      toast('Utilisateur débanni','success');
      loadAdminBanned();
    }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
  }

  function promoteUser(uid){
    var role = prompt('Nouveau rôle (mod / admin / user) :');
    if(!role) return;
    db.collection('users').doc(uid).update({ role: role }).then(function(){
      toast('Rôle mis à jour','success');
      loadAdminUsers();
    }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
  }

  function deleteRoom(roomId){
    db.collection('rooms').doc(roomId).delete().then(function(){
      toast('Salon supprimé','success');
      loadAdminRooms();
    }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
  }

  function initAdminTabs(){
    $qsa('.admin-tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        $qsa('.admin-tab-btn').forEach(function(b){ remCls(b,'active'); });
        addCls(btn,'active');
        $qsa('.admin-panel').forEach(function(p){ remCls(p,'active'); addCls(p,'hidden'); });
        var panel = $id('admin-panel-'+btn.dataset.admintab);
        if(panel){ remCls(panel,'active'); remCls(panel,'hidden'); addCls(panel,'active'); }
        // Lazy load
        if(btn.dataset.admintab === 'users') loadAdminUsers();
        if(btn.dataset.admintab === 'rooms') loadAdminRooms();
        if(btn.dataset.admintab === 'reports') loadAdminReports();
        if(btn.dataset.admintab === 'banned') loadAdminBanned();
      });
    });

    // Announce
    var announceText = $id('admin-announce-text');
    var announceCount= $id('admin-announce-count');
    var sendAnnounce = $id('send-announce-btn');
    if(announceText && announceCount){
      announceText.addEventListener('input', function(){
        announceCount.textContent = announceText.value.length+'/500';
      });
    }
    if(sendAnnounce) sendAnnounce.addEventListener('click', function(){
      var text = (announceText||{}).value || '';
      if(!text.trim()){ toast('Rédigez une annonce','warn'); return; }
      db.collection('announcements').add({
        text: text, authorId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), active: true
      }).then(function(){
        toast('Annonce diffusée !','success');
        if(announceText) announceText.value = '';
        if(announceCount) announceCount.textContent = '0/500';
      }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
    });

    // Refresh top rooms button
    var refreshBtn = $id('refresh-top-rooms');
    if(refreshBtn) refreshBtn.addEventListener('click', loadTopRooms);

    // Admin user search
    var adminSearch = $id('admin-user-search');
    if(adminSearch) adminSearch.addEventListener('input', function(){
      var q = adminSearch.value.toLowerCase();
      $qsa('#admin-users-tbody tr').forEach(function(row){
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Admin filter btns
    $qsa('.admin-filter-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        $qsa('.admin-filter-btn').forEach(function(b){ remCls(b,'active'); });
        addCls(btn,'active');
        var filter = btn.dataset.filter;
        $qsa('#admin-users-tbody tr').forEach(function(row){
          if(filter === 'all') row.style.display = '';
          else row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
      });
    });

    // Assign badge
    var assignBadgeBtn = $id('assign-badge-btn');
    if(assignBadgeBtn) assignBadgeBtn.addEventListener('click', function(){
      var badgeType = ($qs('input[name="badge-type"]:checked')||{}).value;
      var userSearch= ($id('badge-user-search')||{}).value || '';
      if(!badgeType){ toast('Choisissez un badge','warn'); return; }
      if(!userSearch){ toast('Entrez un pseudo','warn'); return; }
      db.collection('users').where('pseudo','==',userSearch).limit(1).get().then(function(snap){
        if(snap.empty){ toast('Utilisateur introuvable','error'); return; }
        var doc = snap.docs[0];
        return doc.ref.update({ badges: firebase.firestore.FieldValue.arrayUnion(badgeType) });
      }).then(function(){ toast('Badge attribué !','success'); }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
    });

    // Load AI moderation toggles
    loadAIModToggles();
  }

  function loadAIModToggles(){
    var container = $id('ai-moderation-toggles');
    if(!container) return;
    db.collection('rooms').limit(20).get().then(function(snap){
      var html = '';
      snap.forEach(function(doc){
        var d = doc.data();
        html += '<div class="ai-toggle-row">'
          + '<span class="ai-toggle-room-name">'+escapeHtml(d.name||'')+'</span>'
          + '<label class="toggle-switch"><input type="checkbox" class="ai-mod-toggle" data-rid="'+doc.id+'" '+(d.aiModeration?'checked':'')+' /><span class="toggle-knob"></span></label>'
          + '</div>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.ai-mod-toggle').forEach(function(inp){
        inp.addEventListener('change', function(){
          db.collection('rooms').doc(inp.dataset.rid).update({ aiModeration: inp.checked }).catch(function(){});
        });
      });
    }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     47. PROFILE MODAL
  ════════════════════════════════════════════════════════════════ */
  function initProfile(){
    var openBtn = $id('profile-open-btn');
    if(openBtn) openBtn.addEventListener('click', function(){ openProfileModal(); });

    // Bottom nav profile
    var profileNavBtn = $qs('.bottom-nav-btn[data-view="profile"]');
    if(profileNavBtn) profileNavBtn.addEventListener('click', function(){ openProfileModal(); });

    // Status select
    var statusSel = $id('profile-status-select');
    if(statusSel) statusSel.addEventListener('change', function(){
      updatePresence(statusSel.value);
      if(currentUserData) currentUserData.status = statusSel.value;
      updateTopbar();
    });

    // Save pseudo
    var savePseudo = $id('save-pseudo-btn');
    if(savePseudo) savePseudo.addEventListener('click', function(){
      var inp = $id('profile-pseudo-input');
      if(!inp || !inp.value.trim()) return;
      db.collection('users').doc(currentUser.uid).update({ pseudo: inp.value.trim() }).then(function(){
        currentUserData.pseudo = inp.value.trim();
        updateTopbar();
        toast('Pseudo mis à jour','success');
      }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
    });

    // Profile photo upload
    var photoInput = $id('profile-photo-input');
    if(photoInput) photoInput.addEventListener('change', function(){
      var file = photoInput.files[0];
      if(!file) return;
      uploadToCloudinary(file).then(function(url){
        db.collection('users').doc(currentUser.uid).update({ photoUrl: url }).then(function(){
          if(currentUserData) currentUserData.photoUrl = url;
          var display = $id('profile-photo-display');
          var emojiDisplay = $id('profile-emoji-display');
          if(display){ display.src=url; showEl(display); }
          if(emojiDisplay) hideEl(emojiDisplay);
          toast('Photo mise à jour','success');
        });
      }).catch(function(e){ toast('Erreur upload: '+e.message,'error'); });
    });

    // Logout
    var logoutBtn = $id('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', function(){
      if(!confirm('Se déconnecter ?')) return;
      updatePresence('offline');
      auth.signOut().then(function(){ closeModal('modal-profile'); });
    });

    // Delete account
    var deleteBtn = $id('delete-account-btn');
    if(deleteBtn) deleteBtn.addEventListener('click', function(){
      if(!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return;
      db.collection('users').doc(currentUser.uid).delete().then(function(){
        return currentUser.delete();
      }).then(function(){ toast('Compte supprimé','success'); }).catch(function(e){ toast('Erreur: '+e.message,'error'); });
    });
  }

  function openProfileModal(){
    if(!currentUserData) return;
    var d = currentUserData;
    // Fill fields
    var pseudoInp = $id('profile-pseudo-input');
    if(pseudoInp) pseudoInp.value = d.pseudo || '';
    var statusSel = $id('profile-status-select');
    if(statusSel) statusSel.value = d.status || 'online';
    var emojiDisp = $id('profile-emoji-display');
    if(emojiDisp) emojiDisp.textContent = d.emoji || '👤';
    var photoDisp = $id('profile-photo-display');
    if(photoDisp){ if(d.photoUrl){ photoDisp.src=d.photoUrl; showEl(photoDisp); if(emojiDisp) hideEl(emojiDisp); } else { hideEl(photoDisp); if(emojiDisp) showEl(emojiDisp); } }
    var ring = $id('profile-status-ring');
    if(ring) updateStatusRing(ring, d.status||'online');
    // Stats
    setText('my-total-msgs', formatNumber(d.totalMessages||0));
    setText('my-total-reactions', formatNumber(d.totalReactions||0));
    setText('my-total-rooms', '—');
    var joinDate = $id('my-join-date');
    if(joinDate) joinDate.textContent = d.joinedAt ? formatDateLabel(d.joinedAt) : '—';
    // Badges
    var badgesRow = $id('profile-badges-row');
    if(badgesRow){
      var badgeIcons = { verified:'badge-check', mod:'shield', vip:'star', og:'flame', artist:'palette', dev:'code-2' };
      badgesRow.innerHTML = (d.badges||[]).map(function(b){ return '<div class="profile-badge" title="'+escapeHtml(b)+'"><i data-lucide="'+escapeHtml(badgeIcons[b]||'award')+'"></i></div>'; }).join('');
      if(window.lucide) lucide.createIcons({ el: badgesRow });
    }
    openModal('modal-profile');
  }

  /* ════════════════════════════════════════════════════════════════
     48. TOXICITY CHECK (Perspective API)
  ════════════════════════════════════════════════════════════════ */
  function checkToxicity(text, doc){
    if(PERSPECTIVE_KEY === 'VOTRE_CLE_PERSPECTIVE'){ doSendMessage(doc); return; }
    fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key='+PERSPECTIVE_KEY, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ comment:{ text: text }, languages:['fr','en'], requestedAttributes:{ TOXICITY:{} } })
    }).then(function(r){ return r.json(); })
    .then(function(res){
      var score = ((res.attributeScores||{}).TOXICITY||{}).summaryScore||{};
      var toxScore = score.value || 0;
      if(toxScore > 0.85){
        toast('Message potentiellement toxique détecté','warn');
        // Strike system
        applyStrike(currentUser.uid);
      } else {
        doSendMessage(doc);
      }
    }).catch(function(){ doSendMessage(doc); });
  }

  function applyStrike(uid){
    db.collection('users').doc(uid).get().then(function(snap){
      var d = snap.data() || {};
      var strikes = (d.strikes || 0) + 1;
      if(strikes >= 3){
        db.collection('users').doc(uid).update({ strikes: strikes, banned: true, role: 'banned' });
        db.collection('bans').add({ uid: uid, reason: 'Contenu toxique (3 strikes)', active: true, bannedAt: firebase.firestore.FieldValue.serverTimestamp(), duration: '24h', bannedBy: 'system' });
        toast('Compte suspendu pour 24h (3 strikes)','error');
        auth.signOut();
      } else {
        db.collection('users').doc(uid).update({ strikes: strikes });
        toast('Avertissement : contenu toxique ('+(3-strikes)+' strike(s) restant)','warn');
      }
    }).catch(function(){});
  }

  /* ════════════════════════════════════════════════════════════════
     49. ANNOUNCEMENTS LISTENER
  ════════════════════════════════════════════════════════════════ */
  function listenAnnouncements(){
    db.collection('announcements').where('active','==',true)
      .orderBy('createdAt','desc').limit(1)
      .onSnapshot(function(snap){
        snap.docChanges().forEach(function(change){
          if(change.type === 'added'){
            var d = change.doc.data();
            toast('📢 ' + (d.text||'Annonce'), 'info', 8000);
            addNotification('Annonce: ' + (d.text||'').substring(0,60), 'megaphone');
          }
        });
      });
  }

  /* ════════════════════════════════════════════════════════════════
     50. REFRESH BUTTONS & MISC
  ════════════════════════════════════════════════════════════════ */
  function initMiscButtons(){
    // Poll see all
    var pollsSeeAll = $id('polls-see-all');
    if(pollsSeeAll) pollsSeeAll.addEventListener('click', function(){ toast('Fonctionnalité à venir','info'); });

    // Room info close
    var closeRoomInfo = $qsa('[data-modal="modal-room-info"]');
    closeRoomInfo.forEach(function(btn){ btn.addEventListener('click', function(){ closeModal('modal-room-info'); }); });
  }

  /* ════════════════════════════════════════════════════════════════
     51. URL DEEP LINK (room query param)
  ════════════════════════════════════════════════════════════════ */
  function handleUrlParams(){
    var params = new URLSearchParams(window.location.search);
    var roomId = params.get('room');
    if(roomId && currentUser){
      setTimeout(function(){ joinRoom(roomId); }, 1000);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     52. LUCIDE ICONS REFRESH ON VIEW CHANGE
  ════════════════════════════════════════════════════════════════ */
  function scheduleIconRefresh(){
    setInterval(function(){
      if(window.lucide) lucide.createIcons();
    }, 3000);
  }

  /* ════════════════════════════════════════════════════════════════
     53. KEYBOARD SHORTCUTS
  ════════════════════════════════════════════════════════════════ */
  function initKeyboardShortcuts(){
    document.addEventListener('keydown', function(e){
      // Escape: close modals / context menu
      if(e.key === 'Escape'){
        closeContextMenu();
        $qsa('.modal-overlay:not(.hidden)').forEach(function(m){ closeModal(m.id); });
        hideEl($id('notif-side-panel'));
        hideEl($id('auth-modal'));
      }
      // Ctrl+K: global search
      if((e.ctrlKey||e.metaKey) && e.key === 'k'){
        e.preventDefault();
        openModal('modal-global-search');
        setTimeout(function(){ var inp=$id('global-search-input'); if(inp) inp.focus(); }, 100);
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     54. MAIN INIT
  ════════════════════════════════════════════════════════════════ */
  function init(){
    initFirebase();
    initAudio();
    initCrypto();
    initLanding();
    initAuthModal();
    initModals();
    initTheme();
    initSoundToggle();
    initNavigation();
    initRoomSearch();
    initCreateRoom();
    initMessageInput();
    initMediaButtons();
    initGifSearch();
    initVoiceRecording();
    initContextMenu();
    initPolls();
    initReport();
    initChatHeader();
    initPinnedBar();
    initGlobalSearch();
    initNotifications();
    initRandomChat();
    initStatsPeriod();
    initAdminTabs();
    initProfile();
    initMiscButtons();
    initKeyboardShortcuts();
    scheduleIconRefresh();
    // Init lucide icons
    if(window.lucide) lucide.createIcons();
  }

  /* Start after DOM ready */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
