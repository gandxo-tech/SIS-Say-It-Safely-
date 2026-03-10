/* ============================================================
   SIS FEED — sisfeed.js
   Vanilla JS · IIFE · Firebase 9 compat · Production-grade
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. CONFIGURATION FIREBASE
  ══════════════════════════════════════════════════════════ */

  var FIREBASE_CONFIG = {
    apiKey:            "AIzaSyBZoVJaCQlDZQut98gYK-Y85IRudSTNbNg",
    authDomain:        "sisliveaudio.firebaseapp.com",
    databaseURL:       "https://sisliveaudio-default-rtdb.firebaseio.com",
    projectId:         "sisliveaudio",
    storageBucket:     "sisliveaudio.firebasestorage.app",
    messagingSenderId: "987019026451",
    appId:             "1:987019026451:web:3c1632e417765377b01fe6"
  };

  var CLOUDINARY_CLOUD  = "sisliveaudio";
  var CLOUDINARY_PRESET = "sis_unsigned";

  /* ══════════════════════════════════════════════════════════
     2. CONSTANTES & VARIABLES GLOBALES
  ══════════════════════════════════════════════════════════ */

  var db, auth;
  var sisUser       = null;
  var currentTab    = 'global';
  var feedLastDoc   = null;
  var feedLoading   = false;
  var feedExhausted = false;
  var PAGE_SIZE     = 12;

  /* Modal / UI state */
  var currentPostType   = 'csdpm';
  var currentAnonMode   = 'full';
  var currentBurnViews  = 50;
  var currentBurnHours  = null;
  var battleDuration    = 24;
  var activeHashtags    = [];
  var mediaUploadUrl    = null;
  var contextMenuPostId = null;
  var reactPickerPostId = null;
  var commentsPostId    = null;

  /* Realtime listeners */
  var commentsUnsubscribe = null;
  var liveUnsubscribe     = null;
  var trendingUnsubscribe = null;
  var csdpmUnsubscribe    = null;
  var weeklyBattleUnsub   = null;
  var presenceInterval    = null;
  var burnTimers          = {};

  /* Ghost mode */
  var ghostMode = false;

  /* Palette avatars */
  var AVATAR_PALETTES = [
    ['#5B8EF4','#8B5CF6'], ['#EC4899','#8B5CF6'],
    ['#10B981','#5B8EF4'], ['#F59E0B','#EC4899'],
    ['#EF4444','#8B5CF6'], ['#10B981','#8B5CF6'],
    ['#F59E0B','#5B8EF4'], ['#06B6D4','#8B5CF6'],
    ['#84CC16','#10B981'], ['#F97316','#EF4444']
  ];

  /* Métadonnées types de posts */
  var POST_META = {
    csdpm:      { label: 'Ça se dit pas',  icon: 'theater',    color: 'purple' },
    confession: { label: 'Confession',     icon: 'lock',       color: 'blue'   },
    whisper:    { label: 'Whisper',        icon: 'wind',       color: 'muted'  },
    media:      { label: 'Moment',         icon: 'image',      color: 'pink'   },
    battle:     { label: 'Battle',         icon: 'swords',     color: 'orange' },
    burn:       { label: 'Burn Post',      icon: 'flame',      color: 'orange' }
  };

  /* Réactions disponibles */
  var REACTIONS = {
    fire:       '🔥',
    heart_fire: '❤️‍🔥',
    skull:      '💀',
    eye:        '👁️',
    sob:        '😭',
    joy:        '😂',
    ok:         '🤙🏾',
    salute:     '🫡'
  };

  /* XP par niveau */
  var XP_THRESHOLDS = [0, 100, 500, 1500, 5000, Infinity];
  var LEVEL_NAMES   = ['', 'Murmure', 'Observateur', 'Confesseur', 'Fantôme', 'Légende SIS'];

  /* ══════════════════════════════════════════════════════════
     3. INITIALISATION AU CHARGEMENT
  ══════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {
    /* Init Firebase si pas déjà initialisé */
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
    } catch (e) {
      console.error('Firebase init error:', e);
    }

    db   = firebase.firestore();
    auth = firebase.auth();

    /* Appliquer thème sauvegardé */
    applyTheme(localStorage.getItem('sis-theme') || 'dark');

    /* Init UI */
    initModalListeners();
    initSearchListeners();
    initClickOutsideListeners();
    initUploadDropzone();
    initKeyboardShortcuts();
    initInfiniteScroll();

    /* Auth */
    initAuth();

    /* Render icons Lucide */
    setTimeout(function () { lucide.createIcons(); }, 50);
  });

  /* ══════════════════════════════════════════════════════════
     4. AUTH — VÉRIFICATION UTILISATEUR
  ══════════════════════════════════════════════════════════ */

  function initAuth() {
    auth.onAuthStateChanged(function (firebaseUser) {
      if (!firebaseUser) {
        /* Aucune session → connexion anonyme automatique */
        auth.signInAnonymously().catch(function (err) {
          console.error('Erreur signInAnonymously:', err);
          /* Même en cas d'échec on lance le feed en lecture */
          bootFeed();
        });
        return;
      }

      /* ── Utilisateur présent (anonyme ou lié) ── */
      var isAnonymousUser = firebaseUser.isAnonymous;

      db.collection('users').doc(firebaseUser.uid)
        .get()
        .then(function (snap) {
          var data = snap.exists ? snap.data() : {};

          /* Générer un pseudo aléatoire persistant pour les anonymes */
          var savedPseudo = localStorage.getItem('sis-pseudo');
          if (!savedPseudo) {
            savedPseudo = generatePseudo();
            localStorage.setItem('sis-pseudo', savedPseudo);
          }

          var displayName = data.displayName
            || (isAnonymousUser ? savedPseudo : ('Fantôme_' + firebaseUser.uid.slice(0, 5)));

          sisUser = {
            uid:          firebaseUser.uid,
            email:        firebaseUser.email || '',
            displayName:  displayName,
            isCertified:  !!data.isCertified,
            ghostMode:    data.ghostMode !== undefined ? !!data.ghostMode : true,
            level:        data.level    || 1,
            points:       data.points   || 0,
            postCount:    data.postCount || 0,
            isAnonymous:  isAnonymousUser
          };

          window.sisUser = sisUser;
          ghostMode = sisUser.ghostMode;

          /* Créer/màj le profil Firestore si nouveau */
          if (!snap.exists) {
            db.collection('users').doc(firebaseUser.uid).set({
              displayName:  displayName,
              isAnonymous:  isAnonymousUser,
              isCertified:  false,
              ghostMode:    true,
              level:        1,
              points:       0,
              postCount:    0,
              createdAt:    firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function () {});
          }

          renderUserSidebar();
          renderTopbarAvatar();
          applyGhostMode(ghostMode, false);
          initLivePulse();
          if (!isAnonymousUser) listenUnreadMessages();
        })
        .catch(function (err) {
          console.error('Erreur profil:', err);
        })
        .finally(function () {
          bootFeed();
        });
    });
  }

  /* Lance le feed + composants sidebar droite */
  function bootFeed() {
    initFeed();
    initTrending();
    initCsdpmDuJour();
    initWeeklyBattle();
    loadStories();
  }

  /* Générer un pseudo court mémorable */
  function generatePseudo() {
    var adj = ['Noir','Libre','Vrai','Sombre','Sauvage','Doux','Fier','Calme',
                'Vif','Sage','Fort','Rare','Beau','Clair','Grand','Loin'];
    var noun = ['Fantôme','Masque','Voix','Ombre','Feu','Murmure','Secret',
                 'Écho','Silence','Rêve','Cri','Vague','Lumière','Nuit'];
    var num = Math.floor(Math.random() * 900) + 100;
    return adj[Math.floor(Math.random() * adj.length)] +
           noun[Math.floor(Math.random() * noun.length)] + num;
  }

  /* ── Render sidebar gauche ── */
  function renderUserSidebar() {
    if (!sisUser) return;

    /* Avatar */
    var inner = document.getElementById('ucAvatarInner');
    if (inner) inner.innerHTML = generateAvatar(sisUser.uid, 44);

    /* Nom */
    var nameEl = document.getElementById('ucDisplayName');
    if (nameEl) nameEl.textContent = sisUser.displayName;

    /* Badge certifié */
    var certBadge = document.getElementById('ucCertBadge');
    if (certBadge) certBadge.style.display = sisUser.isCertified ? 'inline-flex' : 'none';

    /* Handle */
    var handle = document.getElementById('ucHandle');
    if (handle) handle.textContent = '@' + sisUser.displayName.toLowerCase().replace(/\s+/g, '_');

    /* Stats */
    setHtml('ucPosts',  formatNum(sisUser.postCount));
    setHtml('ucPoints', formatNum(sisUser.points));
    setHtml('ucLevel',  sisUser.level);

    /* Barre XP */
    renderXpBar();

    /* Ghost switch */
    var gs = document.getElementById('ghostSwitch');
    if (gs) {
      gs.classList.toggle('on', ghostMode);
      gs.setAttribute('aria-checked', ghostMode ? 'true' : 'false');
    }

    /* Ghost dot */
    var dot = document.getElementById('ucGhostDot');
    if (dot) dot.style.display = ghostMode ? 'flex' : 'none';

    /* Carte certification */
    var certCard = document.getElementById('certCard');
    if (certCard) certCard.style.display = sisUser.isCertified ? 'none' : 'flex';

    /* Stories: mon avatar */
    var storyMine = document.getElementById('storyMyAvatar');
    if (storyMine) storyMine.innerHTML = generateAvatar(sisUser.uid, 52);

    /* Composer avatar */
    var compAv = document.getElementById('compAvatar');
    if (compAv) compAv.innerHTML = generateAvatar(sisUser.uid, 38);
  }

  function renderXpBar() {
    if (!sisUser) return;
    var lvl  = Math.min(sisUser.level, 5);
    var xpMin = XP_THRESHOLDS[lvl - 1] || 0;
    var xpMax = XP_THRESHOLDS[lvl] || 100;
    var pct   = xpMax === Infinity ? 100 : Math.min(100, Math.round(((sisUser.points - xpMin) / (xpMax - xpMin)) * 100));

    var fill = document.getElementById('xpBarFill');
    if (fill) fill.style.width = pct + '%';

    var name = document.getElementById('xpLevelName');
    if (name) name.textContent = LEVEL_NAMES[lvl] || 'Murmure';

    var txt = document.getElementById('xpProgressTxt');
    if (txt) txt.textContent = formatNum(sisUser.points) + ' / ' + (xpMax === Infinity ? '∞' : formatNum(xpMax)) + ' XP';

    /* Highlight niveau dans sidebar droite */
    document.querySelectorAll('.level-row').forEach(function (row) {
      var rowLevel = parseInt(row.dataset.level, 10);
      row.classList.toggle('current-level', rowLevel === lvl);
    });
  }

  /* ── Render topbar avatar + dropdown ── */
  function renderTopbarAvatar() {
    if (!sisUser) return;

    var topAv = document.getElementById('topAvatar');
    if (topAv) topAv.innerHTML = generateAvatar(sisUser.uid, 32);

    var ddAv = document.getElementById('ddAvatar');
    if (ddAv) ddAv.innerHTML = generateAvatar(sisUser.uid, 40);

    setHtml('ddName',  sisUser.displayName);
    setHtml('ddLevel', 'Niveau ' + sisUser.level + ' · ' + (LEVEL_NAMES[sisUser.level] || ''));

    var ddCert = document.getElementById('ddCertifiedBadge');
    if (ddCert) ddCert.style.display = sisUser.isCertified ? 'inline-flex' : 'none';

    /* Mini switch ghost dans dropdown */
    var dgs = document.getElementById('ddGhostSwitch');
    if (dgs) dgs.classList.toggle('on', ghostMode);
  }

  /* ══════════════════════════════════════════════════════════
     5. THÈME CLAIR / SOMBRE
  ══════════════════════════════════════════════════════════ */

  function toggleTheme() {
    var cur  = localStorage.getItem('sis-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(next === 'light' ? '☀️ Mode clair activé' : '🌙 Mode sombre activé', 'info');
  }
  window.toggleTheme = toggleTheme;

  function applyTheme(theme) {
    localStorage.setItem('sis-theme', theme);
    document.body.classList.toggle('light', theme === 'light');

    var moon = document.getElementById('themeIconMoon');
    var sun  = document.getElementById('themeIconSun');
    if (moon) moon.style.display = theme === 'dark'  ? '' : 'none';
    if (sun)  sun.style.display  = theme === 'light' ? '' : 'none';
  }

  /* ══════════════════════════════════════════════════════════
     6. GHOST MODE
  ══════════════════════════════════════════════════════════ */

  function toggleGhostMode() {
    ghostMode = !ghostMode;
    applyGhostMode(ghostMode, true);
    if (sisUser) {
      sisUser.ghostMode = ghostMode;
      db.collection('users').doc(sisUser.uid)
        .update({ ghostMode: ghostMode })
        .catch(function () {});
    }
  }
  window.toggleGhostMode = toggleGhostMode;

  function applyGhostMode(active, showFeedback) {
    /* Switch sidebar */
    var gs = document.getElementById('ghostSwitch');
    if (gs) {
      gs.classList.toggle('on', active);
      gs.setAttribute('aria-checked', active ? 'true' : 'false');
    }
    /* Mini switch dropdown */
    var dgs = document.getElementById('ddGhostSwitch');
    if (dgs) dgs.classList.toggle('on', active);

    /* Label */
    setHtml('ghostLabel', active ? 'Désactiver Ghost Mode' : 'Activer Ghost Mode');
    var sub = document.getElementById('ghostSubLabel');
    if (sub) sub.textContent = active ? 'Actif — postera anonymement' : 'Inactif';

    /* Indicateur dans composer */
    var ind = document.getElementById('ghostIndicator');
    if (ind) ind.style.display = active ? 'flex' : 'none';

    /* Ghost dot avatar */
    var dot = document.getElementById('ucGhostDot');
    if (dot) dot.style.display = active ? 'flex' : 'none';

    /* Ghost ring opacity */
    var ring = document.getElementById('ghostRingSvg');
    if (ring) ring.style.opacity = active ? '1' : '0.35';

    /* Feedback toast */
    if (showFeedback) {
      showToast(active ? '👻 Ghost Mode activé — tu postes dans l\'ombre' : 'Ghost Mode désactivé', 'info');
    }
  }

  /* ══════════════════════════════════════════════════════════
     7. GÉNÉRATEUR D'AVATARS SVG
  ══════════════════════════════════════════════════════════ */

  function generateAvatar(uid, size) {
    size = size || 42;
    var hash = hashString(uid);
    var pair  = AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
    var c1 = pair[0], c2 = pair[1];
    var shapeType = Math.abs(hash >> 4) % 5;
    var gid = 'av-' + uid.slice(0, 8).replace(/[^a-zA-Z0-9]/g, 'x');
    var half = size / 2;

    var shape = '';
    if (shapeType === 0) {
      /* Triangle */
      var pts = [half + ',' + (size * 0.2), (size * 0.8) + ',' + (size * 0.78), (size * 0.2) + ',' + (size * 0.78)];
      shape = '<polygon points="' + pts.join(' ') + '" fill="rgba(255,255,255,0.22)"/>';
    } else if (shapeType === 1) {
      /* Carré arrondi */
      var q = size * 0.25, s = size * 0.5;
      shape = '<rect x="' + q + '" y="' + q + '" width="' + s + '" height="' + s + '" rx="' + (s * 0.2) + '" fill="rgba(255,255,255,0.22)"/>';
    } else if (shapeType === 2) {
      /* Cercle */
      shape = '<circle cx="' + half + '" cy="' + half + '" r="' + (size * 0.2) + '" fill="rgba(255,255,255,0.22)"/>';
    } else if (shapeType === 3) {
      /* Ellipse */
      shape = '<ellipse cx="' + half + '" cy="' + half + '" rx="' + (size * 0.28) + '" ry="' + (size * 0.17) + '" fill="rgba(255,255,255,0.22)"/>';
    } else {
      /* Losange */
      var d = size * 0.22;
      var dp = [half + ',' + (half - d), (half + d) + ',' + half, half + ',' + (half + d), (half - d) + ',' + half];
      shape = '<polygon points="' + dp.join(' ') + '" fill="rgba(255,255,255,0.22)"/>';
    }

    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="' + half + '" cy="' + half + '" r="' + half + '" fill="url(#' + gid + ')"/>' +
      shape +
      '<defs>' +
        '<linearGradient id="' + gid + '" x1="0" y1="0" x2="' + size + '" y2="' + size + '" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0%" stop-color="' + c1 + '"/>' +
          '<stop offset="100%" stop-color="' + c2 + '"/>' +
        '</linearGradient>' +
      '</defs>' +
      '</svg>';
  }

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h;
  }

  /* Badge certifié SVG */
  function badgeSvg(sz) {
    sz = sz || 16;
    var uid = 'bc' + sz;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 20 20" fill="none" class="sis-badge" title="Certifié SIS">' +
      '<circle cx="10" cy="10" r="10" fill="url(#' + uid + ')"/>' +
      '<polyline points="6,10.5 8.5,13 14,7.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="20" y2="20">' +
        '<stop offset="0%" stop-color="#5B8EF4"/><stop offset="100%" stop-color="#8B5CF6"/>' +
      '</linearGradient></defs></svg>';
  }

  /* ══════════════════════════════════════════════════════════
     8. FEED — CHARGEMENT POSTS FIRESTORE
  ══════════════════════════════════════════════════════════ */

  function initFeed() {
    loadFeed(true);
  }

  function switchTab(tab) {
    if (tab === currentTab && !feedExhausted) return;
    currentTab    = tab;
    feedLastDoc   = null;
    feedExhausted = false;
    feedLoading   = false;

    /* Mettre à jour les boutons */
    document.querySelectorAll('.ft').forEach(function (btn) {
      var active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === tab || (tab === 'global' && btn.dataset.page === 'feed'));
    });

    /* Vider et recharger */
    var container = document.getElementById('feedPosts');
    if (container) {
      container.innerHTML = '';
      showSkeletons();
    }
    hideEl('feedEnd');
    hideEl('feedLoadMore');
    loadFeed(true);
  }
  window.switchTab = switchTab;

  function buildFeedQuery(tab, startAfter) {
    var q;
    switch (tab) {
      case 'trending':
        q = db.collection('posts').orderBy('viewCount', 'desc').orderBy('createdAt', 'desc');
        break;
      case 'csdpm':
        q = db.collection('posts').where('type', '==', 'csdpm').orderBy('createdAt', 'desc');
        break;
      case 'battle':
        q = db.collection('posts').where('type', '==', 'battle').orderBy('createdAt', 'desc');
        break;
      case 'burn':
        q = db.collection('posts').where('type', '==', 'burn').orderBy('createdAt', 'desc');
        break;
      case 'whisper':
        q = db.collection('posts').where('type', '==', 'whisper').orderBy('createdAt', 'desc');
        break;
      default:
        q = db.collection('posts').orderBy('createdAt', 'desc');
    }
    q = q.limit(PAGE_SIZE);
    if (startAfter) q = q.startAfter(startAfter);
    return q;
  }

  function loadFeed(reset) {
    if (feedLoading || feedExhausted) return;
    feedLoading = true;

    if (reset) {
      feedLastDoc = null;
      showSkeletons();
    } else {
      showEl('feedLoadMore');
    }

    var q = buildFeedQuery(currentTab, reset ? null : feedLastDoc);

    q.get()
      .then(function (snap) {
        feedLoading = false;
        hideSkeletons();
        hideEl('feedLoadMore');
        hideEl('feedLoading');

        var container = document.getElementById('feedPosts');
        if (!container) return;

        if (snap.empty) {
          if (reset) {
            container.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">🎭</div><p>Aucun post pour le moment</p><span>Sois le premier à briser le silence</span><button onclick="openPostModal()" class="feed-empty-btn"><i data-lucide="pen-square"></i> Créer un post</button></div>';
            lucide.createIcons();
          } else {
            feedExhausted = true;
            showEl('feedEnd');
          }
          return;
        }

        snap.docs.forEach(function (doc) {
          var el = buildPostElement(doc.id, doc.data());
          if (el) {
            if (reset) {
              container.appendChild(el);
            } else {
              container.appendChild(el);
            }
          }
        });

        feedLastDoc = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < PAGE_SIZE) {
          feedExhausted = true;
          showEl('feedEnd');
        }

        /* Lucide + visibility observer */
        lucide.createIcons();
        observePostsVisibility();

        /* Démarrer les timers burn/battle */
        snap.docs.forEach(function (doc) {
          var d = doc.data();
          if (d.type === 'burn')   initBurnPost(doc.id, d);
          if (d.type === 'battle') initBattleTimer(doc.id, d);
        });
      })
      .catch(function (err) {
        feedLoading = false;
        hideSkeletons();
        hideEl('feedLoadMore');
        console.error('Erreur chargement feed:', err);
        showToast('Erreur de chargement', 'error');
      });
  }

  /* ══════════════════════════════════════════════════════════
     9. INFINITE SCROLL
  ══════════════════════════════════════════════════════════ */

  function initInfiniteScroll() {
    var sentinel = document.getElementById('scrollSentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !feedLoading && !feedExhausted) {
        loadFeed(false);
      }
    }, { rootMargin: '300px' });

    observer.observe(sentinel);
  }

  function observePostsVisibility() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.post:not(.visible)').forEach(function (p) {
        p.classList.add('visible');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });

    document.querySelectorAll('.post:not(.visible)').forEach(function (p) {
      io.observe(p);
    });
  }

  /* ══════════════════════════════════════════════════════════
     10. RENDU HTML DES POSTS
  ══════════════════════════════════════════════════════════ */

  function buildPostElement(id, data) {
    var type = data.type || 'confession';
    var meta = POST_META[type] || POST_META.confession;

    var el = document.createElement('article');
    el.className = 'post post-type-' + type;
    el.dataset.id   = id;
    el.dataset.type = type;

    var html = '';

    /* ── TYPE BAR ── */
    html += '<div class="post-type-bar">';
    html += '<span class="ptag ptag-' + type + '">';
    if (type === 'burn') {
      html += burnIconSvg(11);
    } else {
      html += '<i data-lucide="' + meta.icon + '"></i>';
    }
    html += ' ' + meta.label + '</span>';

    /* Timer burn/battle */
    if (type === 'burn' || type === 'battle') {
      html += '<span class="post-countdown" id="cd-' + id + '">...</span>';
    }

    /* Vues pour burn */
    if (type === 'burn') {
      html += '<span class="post-view-count" id="vc-' + id + '">';
      html += '<i data-lucide="eye"></i> ' + formatNum(data.viewCount || 0);
      html += '</span>';
    }

    html += '<button class="post-menu-btn" onclick="openPostMenu(\'' + id + '\',event)" aria-label="Options"><i data-lucide="more-horizontal"></i></button>';
    html += '</div>';

    /* ── HEADER AUTEUR ── */
    var authorId = data.authorId || 'anon';
    var dispName = resolveDisplayName(data);
    var avatarSeed = (data.isAnonymous || data.anonMode === 'full') ? ('anon-' + id) : authorId;

    html += '<div class="post-header">';
    html += '<div class="post-avatar-wrap">';
    html += '<div class="post-avatar">' + generateAvatar(avatarSeed, 44) + '</div>';
    if (data.isCertified && !data.isAnonymous) {
      html += '<div class="post-cert-badge">' + badgeSvg(14) + '</div>';
    }
    html += '</div>';
    html += '<div class="post-meta">';
    html += '<div class="post-author-name">' + escHtml(dispName);
    if (data.isCertified && !data.isAnonymous) html += ' ' + badgeSvg(13);
    html += '</div>';
    html += '<div class="post-time-row">';
    html += '<span class="post-time">' + timeAgo(data.createdAt) + '</span>';
    html += '<span class="post-dot">·</span>';
    if (type === 'burn') {
      html += '<span class="post-visibility burn-vis"><span>' + burnIconSvg(10) + '</span> Autodestruction</span>';
    } else if (type === 'whisper') {
      html += '<span class="post-visibility whisper-vis"><i data-lucide="wind"></i> Chuchoté</span>';
    } else {
      html += '<span class="post-visibility"><i data-lucide="globe"></i> Public</span>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

    /* ── CORPS DU POST selon type ── */
    switch (type) {
      case 'csdpm':
        html += renderCSDPMBody(id, data);
        break;
      case 'whisper':
        html += renderWhisperBody(id, data);
        break;
      case 'media':
        html += renderMediaBody(id, data);
        break;
      case 'battle':
        html += renderBattleBody(id, data);
        break;
      case 'burn':
        html += renderBurnBody(id, data);
        break;
      default:
        html += renderConfessionBody(id, data);
    }

    /* ── HASHTAGS ── */
    if (data.hashtags && data.hashtags.length) {
      html += '<div class="post-hashtags">';
      data.hashtags.slice(0, 5).forEach(function (tag) {
        html += '<span class="post-tag" onclick="filterByTag(\'' + escAttr(tag) + '\')">#' + escHtml(tag) + '</span>';
      });
      html += '</div>';
    }

    /* ── RÉACTIONS ── */
    html += renderReactionsBar(id, data);

    /* ── SECTION COMMENTAIRES (dépliable) ── */
    html += '<div class="post-comments-section" id="cs-' + id + '" data-open="false">';
    html += '<div class="post-comments-list" id="cl-' + id + '"></div>';
    html += '<div class="post-comment-input">';
    html += '<div class="pci-avatar" id="pci-av-' + id + '">' + (sisUser ? generateAvatar(sisUser.uid, 28) : '') + '</div>';
    html += '<input type="text" class="pci-input" id="pci-' + id + '" placeholder="Répondre anonymement..." maxlength="300">';
    html += '<button class="pci-send" onclick="submitInlineComment(\'' + id + '\')" aria-label="Envoyer"><i data-lucide="send"></i></button>';
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
    return el;
  }

  /* ── Corps confession ── */
  function renderConfessionBody(id, data) {
    return '<div class="post-body">' +
      '<p class="post-text">' + formatText(data.content || '') + '</p>' +
      '</div>';
  }

  /* ── Corps CSDPM ── */
  function renderCSDPMBody(id, data) {
    var html = '';
    html += '<div class="post-csdpm-frame">';
    html += '<div class="csdpm-frame-label">🎭 Ça se dit pas mais...</div>';
    html += '<p class="csdpm-frame-text">' + formatText(data.content || '') + '</p>';
    html += '</div>';

    /* Lien vers chat anonyme */
    if (data.topic) {
      html += '<div class="post-chat-cta" onclick="goToChat(\'' + escAttr(data.topic) + '\')">';
      html += '<div class="pcc-left"><i data-lucide="message-circle"></i><div><div class="pcc-title">Débattre dans le Chat Anonyme</div><div class="pcc-sub">Rejoindre la discussion #' + escHtml(data.topic) + '</div></div></div>';
      html += '<i data-lucide="chevron-right" class="pcc-arrow"></i>';
      html += '</div>';
    }
    return html;
  }

  /* ── Corps Whisper ── */
  function renderWhisperBody(id, data) {
    return '<div class="post-whisper-wrap" id="whisper-' + id + '">' +
      '<div class="whisper-blur-text" onclick="revealWhisper(\'' + id + '\')" title="Cliquer pour révéler">' +
        '<p class="post-text whisper-blurred">' + formatText(data.content || '') + '</p>' +
        '<div class="whisper-reveal-hint">' +
          '<i data-lucide="eye"></i>' +
          '<span>Clique pour révéler</span>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  /* ── Corps Media ── */
  function renderMediaBody(id, data) {
    var html = '';
    if (data.content) {
      html += '<div class="post-body"><p class="post-text">' + formatText(data.content) + '</p></div>';
    }
    if (data.mediaUrl) {
      var isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(data.mediaUrl);
      html += '<div class="post-media-wrap">';
      if (isVideo) {
        html += '<video class="post-media-video" src="' + escAttr(data.mediaUrl) + '" controls playsinline preload="metadata"></video>';
      } else {
        html += '<img class="post-media-img" src="' + escAttr(data.mediaUrl) + '" alt="Média" loading="lazy" onclick="openLightbox(\'' + escAttr(data.mediaUrl) + '\')">';
      }
      html += '</div>';
    }
    return html;
  }

  /* ── Corps Battle ── */
  function renderBattleBody(id, data) {
    var opts   = data.battleOptions || ['Option A', 'Option B'];
    var votes  = data.battleVotes || {};
    var vA     = votes[opts[0]] || 0;
    var vB     = votes[opts[1]] || 0;
    var total  = vA + vB;
    var pA     = total ? Math.round((vA / total) * 100) : 50;
    var pB     = 100 - pA;
    var voted  = localStorage.getItem('battle-voted-' + id);

    var html = '';
    if (data.content) {
      html += '<div class="post-body"><p class="post-text">' + formatText(data.content) + '</p></div>';
    }
    html += '<div class="post-battle" id="battle-' + id + '">';
    html += '<div class="battle-options">';
    html += '<button class="battle-opt' + (voted === '0' ? ' voted' : '') + '" onclick="castVote(\'' + id + '\',0)" data-battle-opt="0">';
    html += '<span class="bo-letter">A</span><span class="bo-text">' + escHtml(opts[0] || 'Option A') + '</span>';
    if (voted) html += '<span class="bo-pct">' + pA + '%</span>';
    html += '</button>';
    html += '<div class="battle-vs-badge">VS</div>';
    html += '<button class="battle-opt' + (voted === '1' ? ' voted' : '') + '" onclick="castVote(\'' + id + '\',1)" data-battle-opt="1">';
    html += '<span class="bo-letter">B</span><span class="bo-text">' + escHtml(opts[1] || 'Option B') + '</span>';
    if (voted) html += '<span class="bo-pct">' + pB + '%</span>';
    html += '</button>';
    html += '</div>';

    /* Barres de votes si déjà voté */
    if (voted && total > 0) {
      html += '<div class="battle-results" id="bres-' + id + '">';
      html += '<div class="br-row"><span class="br-label">' + escHtml(opts[0]) + '</span><div class="br-track"><div class="br-fill br-fill-a" style="width:' + pA + '%"></div></div><span class="br-pct">' + pA + '%</span></div>';
      html += '<div class="br-row"><span class="br-label">' + escHtml(opts[1]) + '</span><div class="br-track"><div class="br-fill br-fill-b" style="width:' + pB + '%"></div></div><span class="br-pct">' + pB + '%</span></div>';
      html += '<div class="br-total">' + formatNum(total) + ' vote' + (total > 1 ? 's' : '') + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ── Corps Burn Post ── */
  function renderBurnBody(id, data) {
    var maxV    = data.maxViews  || 0;
    var currV   = data.viewCount || 0;
    var pct     = maxV ? Math.max(0, Math.round(((maxV - currV) / maxV) * 100)) : 100;

    var html = '<div class="post-body"><p class="post-text">' + formatText(data.content || '') + '</p></div>';
    html += '<div class="post-burn-bar" id="burnbar-' + id + '">';
    html += '<div class="burn-bar-header">';
    html += '<div class="burn-bar-title">' + burnIconSvg(13) + ' Burn Post</div>';
    html += '<div class="burn-bar-status" id="burnstatus-' + id + '">';
    if (maxV) {
      html += '<span>' + currV + ' / ' + maxV + ' vues</span>';
    }
    html += '</div>';
    html += '</div>';
    html += '<div class="burn-track"><div class="burn-fill" id="burnfill-' + id + '" style="width:' + pct + '%"></div></div>';
    html += '</div>';
    return html;
  }

  /* ── Barre de réactions ── */
  function renderReactionsBar(id, data) {
    var r = data.reactions || {};
    var html = '<div class="post-reactions">';

    /* Réactions principales */
    html += '<div class="reactions-left">';
    ['fire','heart_fire','skull','eye'].forEach(function (key) {
      var count = r[key] || 0;
      html += '<button class="react-btn" data-key="' + key + '" onclick="react(\'' + id + '\',\'' + key + '\')" id="rb-' + id + '-' + key + '" aria-label="' + key + '">';
      html += REACTIONS[key] || '👍';
      if (count > 0) html += '<span class="rb-count">' + formatNum(count) + '</span>';
      html += '</button>';
    });
    html += '<button class="react-btn react-more" onclick="openReactPicker(\'' + id + '\',event)" aria-label="Plus de réactions"><i data-lucide="plus"></i></button>';
    html += '</div>';

    /* Actions droite */
    html += '<div class="reactions-right">';
    html += '<button class="action-btn" onclick="toggleComments(\'' + id + '\')" aria-label="Commentaires">';
    html += '<i data-lucide="message-circle"></i>';
    var cc = data.commentCount || 0;
    if (cc > 0) html += '<span>' + formatNum(cc) + '</span>';
    html += '</button>';
    html += '<button class="action-btn" onclick="boostPost(\'' + id + '\')" aria-label="Booster"><i data-lucide="repeat-2"></i></button>';
    html += '<button class="action-btn" onclick="sharePost(\'' + id + '\')" aria-label="Partager"><i data-lucide="share-2"></i></button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ── Helper icône flamme ── */
  function burnIconSvg(sz) {
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' +
      '</svg>';
  }

  /* ── Résoudre le nom d'affichage selon le mode anon ── */
  function resolveDisplayName(data) {
    if (data.anonMode === 'full'  || data.isAnonymous === true) return 'Anonyme';
    if (data.anonMode === 'pseudo') return 'Mystère_' + (data.authorId || 'XXXXX').slice(0, 5).toUpperCase();
    return data.authorDisplay || 'Anonyme';
  }

  /* ══════════════════════════════════════════════════════════
     11. BURN POSTS — COUNTDOWN & AUTODESTRUCTION
  ══════════════════════════════════════════════════════════ */

  function initBurnPost(id, data) {
    /* Incrémenter vues */
    incrementViews(id);

    var maxV  = data.maxViews;
    var expAt = data.expiresAt;

    /* Countdown par temps */
    if (expAt) {
      var tick = function () {
        var now  = Date.now();
        var exp  = expAt.toMillis ? expAt.toMillis() : expAt * 1000;
        var diff = exp - now;
        var el   = document.getElementById('cd-' + id);
        if (diff <= 0) {
          clearInterval(burnTimers[id]);
          destroyBurnPost(id);
          return;
        }
        if (el) el.textContent = formatCountdown(diff);
      };
      tick();
      burnTimers[id] = setInterval(tick, 1000);
    }

    /* Écouter les vues en temps réel */
    if (maxV) {
      db.collection('posts').doc(id).onSnapshot(function (snap) {
        if (!snap.exists) { destroyBurnPost(id); return; }
        var d    = snap.data();
        var curr = d.viewCount || 0;
        var pct  = Math.max(0, Math.round(((maxV - curr) / maxV) * 100));

        var fill   = document.getElementById('burnfill-' + id);
        var status = document.getElementById('burnstatus-' + id);
        var vc     = document.getElementById('vc-' + id);
        if (fill)   fill.style.width = pct + '%';
        if (status) status.innerHTML = '<span>' + curr + ' / ' + maxV + ' vues</span>';
        if (vc)     vc.innerHTML = '<i data-lucide="eye"></i> ' + formatNum(curr);

        if (curr >= maxV) destroyBurnPost(id);
      });
    }
  }

  function incrementViews(postId) {
    db.collection('posts').doc(postId)
      .update({ viewCount: firebase.firestore.FieldValue.increment(1) })
      .catch(function () {});
  }

  function destroyBurnPost(id) {
    clearInterval(burnTimers[id]);
    var el = document.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    el.classList.add('post-destroying');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 600);
    db.collection('posts').doc(id).delete().catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     12. BATTLE — TIMER & VOTE
  ══════════════════════════════════════════════════════════ */

  function initBattleTimer(id, data) {
    if (!data.expiresAt) return;
    var tick = function () {
      var now  = Date.now();
      var exp  = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt * 1000;
      var diff = exp - now;
      var el   = document.getElementById('cd-' + id);
      if (diff <= 0) {
        clearInterval(burnTimers['b-' + id]);
        if (el) el.textContent = 'Terminé';
        /* Désactiver les boutons de vote */
        var battleEl = document.getElementById('battle-' + id);
        if (battleEl) battleEl.querySelectorAll('.battle-opt').forEach(function (b) { b.disabled = true; });
        return;
      }
      if (el) el.textContent = formatCountdown(diff);
    };
    tick();
    burnTimers['b-' + id] = setInterval(tick, 1000);
  }

  function castVote(postId, optIdx) {
    if (!sisUser) { showToast('Connecte-toi pour voter', 'error'); return; }
    var key = 'battle-voted-' + postId;
    if (localStorage.getItem(key) !== null) {
      showToast('Tu as déjà voté pour ce Battle', 'info');
      return;
    }

    db.collection('posts').doc(postId).get().then(function (snap) {
      if (!snap.exists) return;
      var d    = snap.data();
      var opts = d.battleOptions || ['Option A', 'Option B'];
      var opt  = opts[optIdx];
      var upd  = {};
      upd['battleVotes.' + opt] = firebase.firestore.FieldValue.increment(1);
      return db.collection('posts').doc(postId).update(upd);
    }).then(function () {
      localStorage.setItem(key, String(optIdx));
      showToast('Vote enregistré ! 🗳️', 'success');

      /* Mettre à jour l'UI */
      var battleEl = document.querySelector('[data-id="' + postId + '"] .post-battle');
      if (battleEl) {
        battleEl.querySelectorAll('.battle-opt').forEach(function (btn) {
          btn.classList.toggle('voted', btn.dataset.battleOpt == optIdx);
        });
      }
    }).catch(function (err) {
      console.error('Erreur vote:', err);
      showToast('Erreur lors du vote', 'error');
    });
  }
  window.castVote = castVote;

  /* ══════════════════════════════════════════════════════════
     13. RÉACTIONS — TEMPS RÉEL
  ══════════════════════════════════════════════════════════ */

  function react(postId, emojiKey) {
    if (!sisUser) { showToast('Connecte-toi pour réagir', 'error'); return; }
    var storageKey = 'react-' + postId + '-' + emojiKey;
    var hasReacted = !!localStorage.getItem(storageKey);
    var delta      = hasReacted ? -1 : 1;

    var upd = {};
    upd['reactions.' + emojiKey] = firebase.firestore.FieldValue.increment(delta);

    db.collection('posts').doc(postId).update(upd).then(function () {
      if (hasReacted) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, '1');
        triggerReactionStorm(postId, emojiKey);
      }

      /* Mettre à jour le bouton */
      var btn = document.getElementById('rb-' + postId + '-' + emojiKey);
      if (btn) {
        btn.classList.toggle('reacted', !hasReacted);
        var countEl = btn.querySelector('.rb-count');
        var curr = countEl ? parseInt(countEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0;
        var next = curr + delta;
        if (next <= 0) {
          if (countEl) countEl.remove();
        } else {
          if (countEl) {
            countEl.textContent = formatNum(next);
          } else {
            var span = document.createElement('span');
            span.className = 'rb-count';
            span.textContent = formatNum(next);
            btn.appendChild(span);
          }
        }

        /* Animation scale */
        btn.style.transform = 'scale(1.35)';
        setTimeout(function () { btn.style.transform = ''; }, 200);
      }
    }).catch(function (err) {
      console.error('Erreur réaction:', err);
    });
  }
  window.react = react;

  function openReactPicker(postId, event) {
    reactPickerPostId = postId;
    var picker = document.getElementById('reactPicker');
    if (!picker) return;
    event.stopPropagation();

    var rect = event.currentTarget.getBoundingClientRect();
    picker.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    picker.style.top  = (rect.bottom + 6) + 'px';
    picker.classList.add('open');
  }
  window.openReactPicker = openReactPicker;

  function reactFromPicker(key) {
    if (reactPickerPostId) react(reactPickerPostId, key);
    var picker = document.getElementById('reactPicker');
    if (picker) picker.classList.remove('open');
    reactPickerPostId = null;
  }
  window.reactFromPicker = reactFromPicker;

  /* ── Reaction Storm Animation ── */
  function triggerReactionStorm(postId, key) {
    var emoji    = REACTIONS[key] || '✨';
    var postEl   = document.querySelector('[data-id="' + postId + '"]');
    var container = document.getElementById('reactionStormContainer');
    if (!postEl || !container) return;

    var rect = postEl.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;

    for (var i = 0; i < 7; i++) {
      (function (idx) {
        var spark = document.createElement('div');
        spark.className = 'storm-spark';
        spark.textContent = emoji;
        spark.style.cssText = [
          'left:' + cx + 'px',
          'top:'  + cy + 'px',
          '--dx:' + ((Math.random() - 0.5) * 120) + 'px',
          '--dy:' + (-(Math.random() * 100 + 30))  + 'px',
          'animation-delay:' + (idx * 60) + 'ms'
        ].join(';');
        container.appendChild(spark);
        setTimeout(function () {
          if (spark.parentNode) spark.parentNode.removeChild(spark);
        }, 900);
      })(i);
    }
  }

  /* ══════════════════════════════════════════════════════════
     14. COMMENTAIRES — TEMPS RÉEL
  ══════════════════════════════════════════════════════════ */

  function toggleComments(postId) {
    var section = document.getElementById('cs-' + postId);
    if (!section) return;
    var isOpen = section.dataset.open === 'true';
    if (isOpen) {
      section.dataset.open = 'false';
      section.style.display = 'none';
      /* Stopper listener */
      if (commentsPostId === postId && commentsUnsubscribe) {
        commentsUnsubscribe();
        commentsUnsubscribe = null;
      }
    } else {
      section.dataset.open = 'true';
      section.style.display = 'block';
      commentsPostId = postId;
      loadInlineComments(postId);
    }
    lucide.createIcons();
  }
  window.toggleComments = toggleComments;

  function loadInlineComments(postId) {
    var list = document.getElementById('cl-' + postId);
    if (!list) return;
    list.innerHTML = '<div class="comments-loading-sm"><div class="loading-spinner sm"></div></div>';

    if (commentsUnsubscribe) commentsUnsubscribe();

    commentsUnsubscribe = db.collection('posts').doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(20)
      .onSnapshot(function (snap) {
        list.innerHTML = '';
        if (snap.empty) {
          list.innerHTML = '<p class="no-comments">Aucun commentaire. Sois le premier !</p>';
          return;
        }
        snap.docs.forEach(function (doc) {
          var d  = doc.data();
          var el = buildCommentElement(doc.id, d);
          list.appendChild(el);
        });
        lucide.createIcons();
        list.scrollTop = list.scrollHeight;
      }, function () {});
  }

  function buildCommentElement(id, data) {
    var authorId = data.isAnonymous ? ('anon-c-' + id) : (data.authorId || 'anon');
    var name     = resolveDisplayName(data);
    var el       = document.createElement('div');
    el.className = 'comment-item';
    el.innerHTML = '<div class="ci-avatar">' + generateAvatar(authorId, 26) + '</div>' +
      '<div class="ci-bubble">' +
        '<div class="ci-name">' + escHtml(name) + (data.isCertified && !data.isAnonymous ? ' ' + badgeSvg(11) : '') + '</div>' +
        '<div class="ci-text">' + escHtml(data.content || '') + '</div>' +
        '<div class="ci-time">' + timeAgo(data.createdAt) + '</div>' +
      '</div>';
    return el;
  }

  function submitInlineComment(postId) {
    if (!sisUser) { showToast('Connecte-toi pour commenter', 'error'); return; }
    var input = document.getElementById('pci-' + postId);
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var comment = {
      content:       text,
      authorId:      sisUser.uid,
      authorDisplay: ghostMode ? 'Anonyme' : sisUser.displayName,
      isAnonymous:   ghostMode,
      anonMode:      ghostMode ? 'full' : 'named',
      isCertified:   sisUser.isCertified && !ghostMode,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      likes:         0
    };

    db.collection('posts').doc(postId).collection('comments').add(comment).then(function () {
      input.value = '';
      db.collection('posts').doc(postId).update({
        commentCount: firebase.firestore.FieldValue.increment(1)
      }).catch(function () {});
    }).catch(function (err) {
      console.error('Erreur commentaire:', err);
      showToast('Erreur lors de l\'envoi', 'error');
    });
  }
  window.submitInlineComment = submitInlineComment;

  /* ── Modal commentaires ── */
  function openComments(postId) {
    commentsPostId = postId;
    var modal = document.getElementById('commentsModal');
    if (!modal) return;
    modal.classList.add('open');

    var av = document.getElementById('commentAvatar');
    if (av && sisUser) av.innerHTML = generateAvatar(sisUser.uid, 32);

    var list = document.getElementById('commentsListContent');
    if (list) list.innerHTML = '<div class="comments-loading"><div class="loading-spinner sm"></div> Chargement...</div>';

    if (commentsUnsubscribe) commentsUnsubscribe();

    commentsUnsubscribe = db.collection('posts').doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(function (snap) {
        if (!list) return;
        list.innerHTML = '';
        if (snap.empty) {
          list.innerHTML = '<div class="comments-empty"><div class="ce-icon">💬</div><p>Aucun commentaire</p><span>Sois le premier à répondre !</span></div>';
          return;
        }
        snap.docs.forEach(function (doc) {
          var el = buildCommentElement(doc.id, doc.data());
          list.appendChild(el);
        });
        lucide.createIcons();
        list.scrollTop = list.scrollHeight;
      }, function () {});
  }
  window.openComments = openComments;

  function closeCommentsModal() {
    var modal = document.getElementById('commentsModal');
    if (modal) modal.classList.remove('open');
    if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
    commentsPostId = null;
  }
  window.closeCommentsModal = closeCommentsModal;

  function submitComment() {
    if (!sisUser || !commentsPostId) return;
    var input = document.getElementById('commentInput');
    var text  = input ? input.value.trim() : '';
    if (!text) return;

    var comment = {
      content:       text,
      authorId:      sisUser.uid,
      authorDisplay: ghostMode ? 'Anonyme' : sisUser.displayName,
      isAnonymous:   ghostMode,
      anonMode:      ghostMode ? 'full' : 'named',
      isCertified:   sisUser.isCertified && !ghostMode,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      likes:         0
    };

    var btn = document.querySelector('.comment-send-btn');
    if (btn) btn.disabled = true;

    db.collection('posts').doc(commentsPostId).collection('comments').add(comment).then(function () {
      if (input) input.value = '';
      db.collection('posts').doc(commentsPostId).update({
        commentCount: firebase.firestore.FieldValue.increment(1)
      }).catch(function () {});
    }).catch(function (err) {
      showToast('Erreur lors de l\'envoi', 'error');
    }).finally(function () {
      if (btn) btn.disabled = false;
    });
  }
  window.submitComment = submitComment;

  /* ══════════════════════════════════════════════════════════
     15. COMPOSER / MODAL POST
  ══════════════════════════════════════════════════════════ */

  function initModalListeners() {
    /* Type selector */
    var ts = document.getElementById('typeSelector');
    if (ts) {
      ts.addEventListener('click', function (e) {
        var btn = e.target.closest('.ts-btn');
        if (!btn) return;
        ts.querySelectorAll('.ts-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        setPostType(btn.dataset.type);
      });
    }

    /* Anon options */
    document.addEventListener('click', function (e) {
      var opt = e.target.closest('.anon-opt');
      if (!opt) return;
      document.querySelectorAll('.anon-opt').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      opt.classList.add('active');
      opt.setAttribute('aria-pressed', 'true');
      currentAnonMode = opt.dataset.anon;
    });

    /* Burn options */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.burn-opt-btn');
      if (!btn) return;
      document.querySelectorAll('.burn-opt-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentBurnViews = btn.dataset.views ? parseInt(btn.dataset.views) : null;
      currentBurnHours = btn.dataset.hours ? parseInt(btn.dataset.hours) : null;
    });

    /* Battle duration */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.bdu-btn');
      if (!btn) return;
      document.querySelectorAll('.bdu-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      battleDuration = parseInt(btn.dataset.hours) || 24;
    });

    /* Textarea auto-grow + char count */
    var textarea = document.getElementById('postContent');
    if (textarea) {
      textarea.addEventListener('input', function () {
        updateCharCount(textarea.value.length, 500);
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 240) + 'px';
      });
    }

    /* Comment textarea auto-grow */
    var commentTa = document.getElementById('commentInput');
    if (commentTa) {
      commentTa.addEventListener('input', function () {
        commentTa.style.height = 'auto';
        commentTa.style.height = Math.min(commentTa.scrollHeight, 120) + 'px';
      });
      commentTa.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitComment();
        }
      });
    }

    /* Hashtag input */
    var hashInput = document.getElementById('hashtagInput');
    if (hashInput) {
      hashInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addHashtagFromInput();
        }
      });
    }

    /* Close modals on backdrop click */
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          if (overlay.id === 'commentsModal') closeCommentsModal();
          if (overlay.id === 'postModal')     closePostModal();
          if (overlay.id === 'reportModal')   closeReportModal();
        }
      });
    });
  }

  function openPostModal(type) {
    currentPostType  = type || 'csdpm';
    currentAnonMode  = ghostMode ? 'full' : 'full';
    currentBurnViews = 50;
    currentBurnHours = null;
    activeHashtags   = [];
    mediaUploadUrl   = null;
    battleDuration   = 24;

    /* Reset textarea */
    var ta = document.getElementById('postContent');
    if (ta) { ta.value = ''; ta.style.height = 'auto'; }
    updateCharCount(0, 500);

    /* Reset hashtags */
    renderHashtagList();

    /* Reset upload */
    var preview = document.getElementById('uploadPreview');
    if (preview) preview.innerHTML = '';
    var progBar = document.getElementById('uploadProgressBar');
    if (progBar) progBar.style.display = 'none';

    /* Reset battle */
    var b1 = document.getElementById('battleOpt1');
    var b2 = document.getElementById('battleOpt2');
    if (b1) b1.value = '';
    if (b2) b2.value = '';

    /* Sélectionner le bon type */
    setPostType(currentPostType);
    document.querySelectorAll('.ts-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.type === currentPostType);
    });

    /* Avatar */
    var av = document.getElementById('modalAvatar');
    if (av && sisUser) av.innerHTML = generateAvatar(sisUser.uid, 36);

    /* Ouvrir */
    var modal = document.getElementById('postModal');
    if (modal) modal.classList.add('open');

    lucide.createIcons();
    setTimeout(function () {
      var ta2 = document.getElementById('postContent');
      if (ta2) ta2.focus();
    }, 150);
  }
  window.openPostModal = openPostModal;

  function closePostModal() {
    var modal = document.getElementById('postModal');
    if (modal) modal.classList.remove('open');
  }
  window.closePostModal = closePostModal;

  function setPostType(type) {
    currentPostType = type;

    /* Visibilité des sections conditionnelles */
    var sections = {
      burnOptions:           type === 'burn',
      mediaUploadSection:    type === 'media',
      battleOptionsSection:  type === 'battle'
    };
    Object.keys(sections).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = sections[id] ? 'block' : 'none';
    });

    /* Placeholder textarea */
    var placeholders = {
      csdpm:      'Ça se dit pas mais... 🎭',
      confession: 'Je confesse que...',
      whisper:    'Murmure ton secret...',
      media:      'Décris ce moment...',
      battle:     'Pose ta question du Battle...',
      burn:       'Ce post s\'autodétruira… 🔥'
    };
    var ta = document.getElementById('postContent');
    if (ta) ta.placeholder = placeholders[type] || 'Ça se dit pas mais...';

    /* Titre */
    var titles = {
      csdpm:      '🎭 Ça se dit pas mais...',
      confession: '🤫 Confession anonyme',
      whisper:    '🌫️ Whisper',
      media:      '📸 Partager un moment',
      battle:     '⚔️ Créer un Battle',
      burn:       '🔥 Burn Post'
    };
    var subtitles = {
      csdpm:      'Exprime ce que tu ne peux pas dire ailleurs',
      confession: 'Confesse sans être jugé·e',
      whisper:    'Murmure — révélé au hover',
      media:      'Photo ou vidéo anonyme',
      battle:     'Opposer deux options · Vote limité',
      burn:       'Post éphémère — s\'autodétruira'
    };
    setHtml('modalTitle',    titles[type]    || 'Nouveau post');
    setHtml('modalSubtitle', subtitles[type] || 'SIS Feed · Anonyme');
  }

  /* ── Char count avec SVG circle ── */
  function updateCharCount(len, max) {
    setHtml('charCount', len);
    var circle  = document.getElementById('charCountCircle');
    var total   = 88; /* circonférence approximative r=14 */
    var used    = Math.min(len / max, 1);
    if (circle) {
      circle.style.strokeDashoffset = total - (total * used);
      circle.style.stroke = len > max * 0.9 ? 'var(--red)' : (len > max * 0.7 ? 'var(--orange)' : 'var(--blue)');
    }
  }

  /* ══════════════════════════════════════════════════════════
     16. HASHTAGS
  ══════════════════════════════════════════════════════════ */

  function addHashtagFromInput() {
    var input = document.getElementById('hashtagInput');
    if (!input) return;
    var raw = input.value.replace(/^#+/, '').trim().toLowerCase().replace(/\s+/g, '_');
    if (raw && activeHashtags.indexOf(raw) === -1 && activeHashtags.length < 5) {
      activeHashtags.push(raw);
      renderHashtagList();
    }
    input.value = '';
  }
  window.addHashtagFromInput = addHashtagFromInput;

  function quickAddTag(tag) {
    tag = tag.replace(/^#+/, '').toLowerCase();
    if (activeHashtags.indexOf(tag) === -1 && activeHashtags.length < 5) {
      activeHashtags.push(tag);
      renderHashtagList();
    }
  }
  window.quickAddTag = quickAddTag;

  function removeHashtag(tag) {
    activeHashtags = activeHashtags.filter(function (t) { return t !== tag; });
    renderHashtagList();
  }
  window.removeHashtag = removeHashtag;

  function renderHashtagList() {
    var list = document.getElementById('hashtagActiveList');
    if (!list) return;
    list.innerHTML = activeHashtags.map(function (tag) {
      return '<span class="hashtag-active-tag">#' + escHtml(tag) +
        '<button onclick="removeHashtag(\'' + escAttr(tag) + '\')" aria-label="Retirer">&times;</button></span>';
    }).join('');
  }

  function extractHashtags(text) {
    var m = text.match(/#([a-zA-ZÀ-ÿ0-9_]+)/g) || [];
    return m.map(function (t) { return t.slice(1).toLowerCase(); });
  }

  /* ══════════════════════════════════════════════════════════
     17. PUBLICATION D'UN POST
  ══════════════════════════════════════════════════════════ */

  function submitPost() {
    if (!sisUser) { showToast('Tu n\'es pas connecté', 'error'); return; }

    var ta      = document.getElementById('postContent');
    var content = ta ? ta.value.trim() : '';

    /* Validations */
    if (currentPostType !== 'media' && !content) {
      showToast('Le contenu est vide', 'error');
      if (ta) ta.focus();
      return;
    }
    if (currentPostType === 'battle') {
      var b1 = document.getElementById('battleOpt1');
      var b2 = document.getElementById('battleOpt2');
      if (!b1 || !b1.value.trim() || !b2 || !b2.value.trim()) {
        showToast('Remplis les deux options du Battle', 'error');
        return;
      }
    }
    if (currentPostType === 'media' && !content && !mediaUploadUrl) {
      showToast('Ajoute du texte ou un média', 'error');
      return;
    }

    /* Désactiver bouton */
    var btn   = document.getElementById('submitPostBtn');
    var label = document.getElementById('submitPostBtnLabel');
    if (btn)   btn.disabled = true;
    if (label) label.textContent = 'Publication...';

    /* Construire le post */
    var allTags  = activeHashtags.concat(extractHashtags(content));
    var uniqTags = allTags.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 8);

    var isAnon  = currentAnonMode === 'full' || ghostMode;
    var isPseudo = currentAnonMode === 'pseudo' && !ghostMode;

    var post = {
      type:          currentPostType,
      content:       content,
      authorId:      sisUser.uid,
      authorDisplay: isAnon ? 'Anonyme' : (isPseudo ? 'Mystère_' + sisUser.uid.slice(0, 5).toUpperCase() : sisUser.displayName),
      isAnonymous:   isAnon,
      anonMode:      currentAnonMode,
      isCertified:   sisUser.isCertified && !isAnon,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      reactions:     { fire: 0, heart_fire: 0, skull: 0, eye: 0, sob: 0, joy: 0, ok: 0, salute: 0 },
      commentCount:  0,
      viewCount:     0,
      hashtags:      uniqTags
    };

    /* Options spécifiques */
    if (currentPostType === 'burn') {
      if (currentBurnViews)  post.maxViews  = currentBurnViews;
      if (currentBurnHours) {
        post.expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + currentBurnHours * 3600000);
      }
    }
    if (currentPostType === 'battle') {
      var opt1 = document.getElementById('battleOpt1').value.trim();
      var opt2 = document.getElementById('battleOpt2').value.trim();
      post.battleOptions = [opt1, opt2];
      post.battleVotes   = {};
      post.battleVotes[opt1] = 0;
      post.battleVotes[opt2] = 0;
      post.expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + battleDuration * 3600000);
    }
    if (currentPostType === 'media' && mediaUploadUrl) {
      post.mediaUrl = mediaUploadUrl;
    }

    /* Publier */
    db.collection('posts').add(post)
      .then(function () {
        closePostModal();
        showToast('Post publié 🎉', 'success');

        /* Créditer XP */
        db.collection('users').doc(sisUser.uid).update({
          postCount: firebase.firestore.FieldValue.increment(1),
          points:    firebase.firestore.FieldValue.increment(10)
        }).catch(function () {});

        /* Mettre à jour trending */
        uniqTags.forEach(function (tag) {
          db.collection('trending').doc(tag).set({
            tag:       tag,
            count:     firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(function () {});
        });

        /* Refresh feed */
        switchTab(currentTab);
      })
      .catch(function (err) {
        console.error('Erreur publication:', err);
        showToast('Erreur lors de la publication', 'error');
      })
      .finally(function () {
        if (btn)   btn.disabled = false;
        if (label) label.textContent = 'Publier anonymement';
      });
  }
  window.submitPost = submitPost;

  /* ══════════════════════════════════════════════════════════
     18. UPLOAD CLOUDINARY
  ══════════════════════════════════════════════════════════ */

  function initUploadDropzone() {
    var zone  = document.getElementById('uploadDropzone');
    var input = document.getElementById('mediaFileInput');
    if (!zone || !input) return;

    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file) processUpload(file);
    });

    input.addEventListener('change', function () {
      if (input.files[0]) processUpload(input.files[0]);
    });
  }

  function processUpload(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('Fichier trop lourd (max 10MB)', 'error');
      return;
    }
    var allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (allowed.indexOf(file.type) === -1) {
      showToast('Format non supporté', 'error');
      return;
    }
    uploadToCloudinary(file);
  }

  function uploadToCloudinary(file) {
    var progBar  = document.getElementById('uploadProgressBar');
    var fill     = document.getElementById('uploadProgressFill');
    var pct      = document.getElementById('uploadProgressPct');
    var preview  = document.getElementById('uploadPreview');

    if (progBar) { progBar.style.display = 'flex'; }
    if (preview) preview.innerHTML = '';

    var fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/auto/upload');

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        var p = Math.round((e.loaded / e.total) * 100);
        if (fill) fill.style.width = p + '%';
        if (pct)  pct.textContent  = p + '%';
      }
    };

    xhr.onload = function () {
      if (progBar) progBar.style.display = 'none';
      if (xhr.status === 200) {
        var res = JSON.parse(xhr.responseText);
        mediaUploadUrl = res.secure_url;
        if (preview) {
          var isVid = /video/.test(file.type);
          preview.innerHTML = isVid
            ? '<video src="' + mediaUploadUrl + '" controls class="upload-preview-media"></video>'
            : '<img src="' + mediaUploadUrl + '" class="upload-preview-media" alt="Aperçu">';
        }
        showToast('Média uploadé ✓', 'success');
      } else {
        showToast('Erreur d\'upload (Cloudinary)', 'error');
      }
    };

    xhr.onerror = function () {
      if (progBar) progBar.style.display = 'none';
      showToast('Erreur réseau lors de l\'upload', 'error');
    };

    xhr.send(fd);
  }

  /* ══════════════════════════════════════════════════════════
     19. LIVE PULSE — PRÉSENCE EN TEMPS RÉEL
  ══════════════════════════════════════════════════════════ */

  function initLivePulse() {
    if (!sisUser) return;
    updatePresence();
    presenceInterval = setInterval(updatePresence, 25000);

    /* Écouter les utilisateurs actifs (lastSeen < 90s) */
    var threshold = firebase.firestore.Timestamp.fromMillis(Date.now() - 90000);
    liveUnsubscribe = db.collection('liveusers')
      .where('lastSeen', '>', threshold)
      .onSnapshot(function (snap) {
        setHtml('liveCount', formatNum(snap.size));
      }, function () {});
  }

  function updatePresence() {
    if (!sisUser) return;
    db.collection('liveusers').doc(sisUser.uid).set({
      uid:      sisUser.uid,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     20. TRENDING — HASHTAGS DEPUIS FIRESTORE
  ══════════════════════════════════════════════════════════ */

  function initTrending() {
    trendingUnsubscribe = db.collection('trending')
      .orderBy('count', 'desc')
      .limit(8)
      .onSnapshot(function (snap) {
        var list = document.getElementById('trendingList');
        if (!list) return;

        if (snap.empty) {
          list.innerHTML = '<p class="rcard-empty">Aucun trending pour le moment</p>';
          return;
        }

        list.innerHTML = '';
        snap.docs.forEach(function (doc, idx) {
          var d   = doc.data();
          var row = document.createElement('div');
          row.className = 'trending-row';
          row.innerHTML = '<span class="tr-rank">' + (idx + 1) + '</span>' +
            '<div class="tr-info">' +
              '<span class="tr-tag" onclick="filterByTag(\'' + escAttr(d.tag) + '\')">#' + escHtml(d.tag) + '</span>' +
              '<span class="tr-count">' + formatNum(d.count) + ' posts</span>' +
            '</div>' +
            '<div class="tr-bar-mini"><div class="tr-bar-fill-mini" style="width:' + Math.min(100, Math.round((d.count / (snap.docs[0].data().count || 1)) * 100)) + '%"></div></div>';
          list.appendChild(row);
        });
      }, function () {});
  }

  function filterByTag(tag) {
    /* Future: filter feed */
    showToast('#' + tag, 'info');
  }
  window.filterByTag = filterByTag;

  /* ══════════════════════════════════════════════════════════
     21. CSDPM DU JOUR
  ══════════════════════════════════════════════════════════ */

  function initCsdpmDuJour() {
    var today = new Date().toISOString().slice(0, 10);

    csdpmUnsubscribe = db.collection('csdpm_daily')
      .where('date', '==', today)
      .limit(1)
      .onSnapshot(function (snap) {
        if (snap.empty) return;
        var d = snap.docs[0].data();

        setHtml('csdpmQuestion',       escHtml(d.question || ''));
        setHtml('csdpmBannerQuestion', escHtml(d.question || ''));

        var count = d.replyCount || 0;
        setHtml('csdpmReplyCount',  count + ' réponse' + (count > 1 ? 's' : '') + ' anonyme' + (count > 1 ? 's' : ''));
        setHtml('csdpmBannerCount', count + ' réponse' + (count > 1 ? 's' : ''));
        setHtml('csdpmMeta', count + ' réponses');
      }, function () {});
  }

  function replyToCsdpm() {
    openPostModal('csdpm');
  }
  window.replyToCsdpm = replyToCsdpm;

  /* ══════════════════════════════════════════════════════════
     22. BATTLE DE LA SEMAINE
  ══════════════════════════════════════════════════════════ */

  function initWeeklyBattle() {
    weeklyBattleUnsub = db.collection('posts')
      .where('type', '==', 'battle')
      .orderBy('viewCount', 'desc')
      .limit(1)
      .onSnapshot(function (snap) {
        var el = document.getElementById('weeklyBattleContent');
        if (!el) return;

        if (snap.empty) {
          el.innerHTML = '<p class="rcard-empty">Aucun battle actif</p>';
          return;
        }

        var doc   = snap.docs[0];
        var d     = doc.data();
        var opts  = d.battleOptions || ['Option A', 'Option B'];
        var votes = d.battleVotes   || {};
        var vA    = votes[opts[0]] || 0;
        var vB    = votes[opts[1]] || 0;
        var total = vA + vB;
        var pA    = total ? Math.round((vA / total) * 100) : 50;
        var pB    = 100 - pA;
        var voted = localStorage.getItem('battle-voted-' + doc.id);

        el.innerHTML = '<div class="wb-question">' + escHtml(d.content || '') + '</div>' +
          '<div class="wb-options">' +
            '<button class="wb-opt wb-opt-a' + (voted === '0' ? ' voted' : '') + '" onclick="castVote(\'' + doc.id + '\',0)">' +
              '<span class="wbo-label">' + escHtml(opts[0]) + '</span>' +
              '<div class="wbo-bar"><div class="wbo-fill" style="width:' + pA + '%"></div></div>' +
              '<span class="wbo-pct">' + pA + '%</span>' +
            '</button>' +
            '<button class="wb-opt wb-opt-b' + (voted === '1' ? ' voted' : '') + '" onclick="castVote(\'' + doc.id + '\',1)">' +
              '<span class="wbo-label">' + escHtml(opts[1]) + '</span>' +
              '<div class="wbo-bar"><div class="wbo-fill" style="width:' + pB + '%"></div></div>' +
              '<span class="wbo-pct">' + pB + '%</span>' +
            '</button>' +
          '</div>' +
          '<div class="wb-total">' + formatNum(total) + ' vote' + (total > 1 ? 's' : '') + '</div>';

        /* Timer */
        if (d.expiresAt) {
          var timerEl = document.getElementById('weeklyBattleTimer');
          var tick = function () {
            var diff = (d.expiresAt.toMillis ? d.expiresAt.toMillis() : d.expiresAt * 1000) - Date.now();
            if (timerEl) timerEl.textContent = diff > 0 ? formatCountdown(diff) : 'Terminé';
          };
          tick();
          setInterval(tick, 1000);
        }
      }, function () {});
  }

  /* ══════════════════════════════════════════════════════════
     23. STORIES
  ══════════════════════════════════════════════════════════ */

  function loadStories() {
    db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get()
      .then(function (snap) {
        var container = document.getElementById('storiesDynamic');
        if (!container || snap.empty) return;
        container.innerHTML = '';

        snap.docs.forEach(function (doc) {
          var d       = doc.data();
          var seed    = d.isAnonymous ? 'anon-' + doc.id : (d.authorId || doc.id);
          var name    = resolveDisplayName(d);
          if (name.length > 9) name = name.slice(0, 8) + '…';

          var item = document.createElement('div');
          item.className = 'story-item';
          item.setAttribute('role', 'button');
          item.setAttribute('tabindex', '0');
          item.setAttribute('aria-label', 'Story de ' + name);

          item.innerHTML = '<div class="story-ring story-ring-' + (d.type || 'confession') + '">' +
            '<div class="story-avatar">' + generateAvatar(seed, 48) + '</div>' +
            '</div>' +
            '<span class="story-name">' + escHtml(name) + '</span>';

          item.addEventListener('click', function () { toggleComments(doc.id); });
          item.addEventListener('keydown', function (e) { if (e.key === 'Enter') toggleComments(doc.id); });
          container.appendChild(item);
        });
      })
      .catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     24. RECHERCHE
  ══════════════════════════════════════════════════════════ */

  function initSearchListeners() {
    var input    = document.getElementById('searchInput');
    var dropdown = document.getElementById('searchDropdown');
    var clearBtn = document.getElementById('searchClear');
    if (!input) return;

    var debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      var q = input.value.trim();
      if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
      if (!q) { if (dropdown) dropdown.classList.remove('open'); return; }
      debounce = setTimeout(function () { runSearch(q); }, 320);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim() && dropdown) dropdown.classList.add('open');
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearSearch(); }
    });
  }

  function clearSearch() {
    var input    = document.getElementById('searchInput');
    var dropdown = document.getElementById('searchDropdown');
    var clearBtn = document.getElementById('searchClear');
    if (input)    input.value = '';
    if (dropdown) dropdown.classList.remove('open');
    if (clearBtn) clearBtn.style.display = 'none';
  }
  window.clearSearch = clearSearch;

  function runSearch(query) {
    var dropdown    = document.getElementById('searchDropdown');
    var postResults = document.getElementById('searchPostResults');
    var tagResults  = document.getElementById('searchTagResults');
    if (!dropdown) return;
    dropdown.classList.add('open');

    var q = query.toLowerCase();

    /* Recherche posts */
    if (postResults) postResults.innerHTML = '<div class="sr-loading"><div class="loading-spinner sm"></div></div>';
    db.collection('posts').orderBy('createdAt', 'desc').limit(30).get().then(function (snap) {
      var matches = snap.docs.filter(function (doc) {
        var d = doc.data();
        return (d.content || '').toLowerCase().includes(q) ||
               (d.hashtags || []).some(function (t) { return t.includes(q); });
      }).slice(0, 5);

      if (!postResults) return;
      postResults.innerHTML = '';
      if (!matches.length) {
        postResults.innerHTML = '<p class="sr-none">Aucun post trouvé</p>';
        return;
      }
      matches.forEach(function (doc) {
        var d     = doc.data();
        var snip  = (d.content || '').slice(0, 55) + ((d.content || '').length > 55 ? '…' : '');
        var item  = document.createElement('div');
        item.className = 'sr-item';
        item.innerHTML = '<div class="sri-avatar">' + generateAvatar(d.authorId || doc.id, 28) + '</div>' +
          '<div class="sri-text"><span class="sri-snip">' + escHtml(snip) + '</span><span class="sri-time">' + timeAgo(d.createdAt) + '</span></div>';
        item.addEventListener('click', function () {
          scrollToPost(doc.id);
          clearSearch();
        });
        postResults.appendChild(item);
      });
    }).catch(function () {});

    /* Recherche hashtags */
    if (tagResults) tagResults.innerHTML = '';
    db.collection('trending').orderBy('count', 'desc').limit(15).get().then(function (snap) {
      if (!tagResults) return;
      var matches = snap.docs.filter(function (doc) {
        return doc.data().tag.includes(q);
      }).slice(0, 4);
      if (!matches.length) return;
      matches.forEach(function (doc) {
        var d    = doc.data();
        var item = document.createElement('div');
        item.className = 'sr-tag-item';
        item.innerHTML = '<i data-lucide="hash"></i> <span>' + escHtml(d.tag) + '</span><span class="sri-cnt">' + formatNum(d.count) + '</span>';
        item.addEventListener('click', function () { filterByTag(d.tag); clearSearch(); });
        tagResults.appendChild(item);
      });
      lucide.createIcons();
    }).catch(function () {});
  }

  function scrollToPost(postId) {
    var el = document.querySelector('[data-id="' + postId + '"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('post-highlight');
      setTimeout(function () { el.classList.remove('post-highlight'); }, 2500);
    } else {
      /* Post pas encore chargé, switcher sur global */
      switchTab('global');
    }
  }
  window.scrollToPost = scrollToPost;

  /* ══════════════════════════════════════════════════════════
     25. SIGNALEMENT
  ══════════════════════════════════════════════════════════ */

  function openReportModal(postId) {
    var modal = document.getElementById('reportModal');
    var hiddenInput = document.getElementById('reportPostId');
    if (!modal || !hiddenInput) return;
    hiddenInput.value = postId;
    document.querySelectorAll('.report-opt').forEach(function (b) { b.classList.remove('active'); });
    modal.classList.add('open');
    lucide.createIcons();
  }
  window.openReportModal = openReportModal;

  function closeReportModal() {
    var modal = document.getElementById('reportModal');
    if (modal) modal.classList.remove('open');
  }
  window.closeReportModal = closeReportModal;

  /* Sélection raison de signalement */
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.report-opt');
    if (!opt) return;
    document.querySelectorAll('.report-opt').forEach(function (b) { b.classList.remove('active'); });
    opt.classList.add('active');
  });

  function confirmReport() {
    var postId   = document.getElementById('reportPostId') ? document.getElementById('reportPostId').value : '';
    var selected = document.querySelector('.report-opt.active');
    if (!selected) { showToast('Sélectionne une raison', 'error'); return; }
    var reason = selected.dataset.reason;
    if (!sisUser || !postId) return;

    db.collection('reports').add({
      postId:     postId,
      reason:     reason,
      reportedBy: sisUser.uid,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      showToast('Signalement envoyé — merci !', 'success');
      closeReportModal();
    }).catch(function () {
      showToast('Erreur lors du signalement', 'error');
    });
  }
  window.confirmReport = confirmReport;

  /* ══════════════════════════════════════════════════════════
     26. PARTAGE
  ══════════════════════════════════════════════════════════ */

  function sharePost(postId) {
    var url   = window.location.origin + window.location.pathname + '?post=' + postId;
    var title = 'Post anonyme sur SIS';
    if (navigator.share) {
      navigator.share({ title: title, url: url, text: 'Découvre ce post sur SIS — Say It Safely' })
        .catch(function () {});
    } else {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Lien copié dans le presse-papier 📋', 'success');
      }).catch(function () {
        showToast('Impossible de copier le lien', 'error');
      });
    }
  }
  window.sharePost = sharePost;

  function boostPost(postId) {
    db.collection('posts').doc(postId).update({
      viewCount: firebase.firestore.FieldValue.increment(1)
    }).catch(function () {});
    showToast('Post boosté ↑', 'info');
  }
  window.boostPost = boostPost;

  /* ══════════════════════════════════════════════════════════
     27. CONTEXT MENU POST
  ══════════════════════════════════════════════════════════ */

  function openPostMenu(postId, event) {
    contextMenuPostId = postId;
    var menu     = document.getElementById('postContextMenu');
    var backdrop = document.getElementById('pcmBackdrop');
    if (!menu) return;
    event.stopPropagation();

    /* Afficher/masquer "Supprimer" */
    var deleteBtn = document.getElementById('pcmDeleteBtn');
    if (deleteBtn && sisUser) {
      db.collection('posts').doc(postId).get().then(function (snap) {
        deleteBtn.style.display = (snap.exists && snap.data().authorId === sisUser.uid) ? 'flex' : 'none';
      }).catch(function () { deleteBtn.style.display = 'none'; });
    }

    var x = event.clientX, y = event.clientY;
    var w = 180, h = 220;
    menu.style.left = Math.min(x, window.innerWidth  - w - 10) + 'px';
    menu.style.top  = Math.min(y, window.innerHeight - h - 10) + 'px';
    menu.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }
  window.openPostMenu = openPostMenu;

  function closeContextMenu() {
    var menu     = document.getElementById('postContextMenu');
    var backdrop = document.getElementById('pcmBackdrop');
    if (menu)     menu.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    contextMenuPostId = null;
  }
  window.closeContextMenu = closeContextMenu;

  function shareFromMenu()  { closeContextMenu(); if (contextMenuPostId) sharePost(contextMenuPostId); }
  function reportFromMenu() { closeContextMenu(); if (contextMenuPostId) openReportModal(contextMenuPostId); }
  window.shareFromMenu  = shareFromMenu;
  window.reportFromMenu = reportFromMenu;

  function copyPostLink() {
    closeContextMenu();
    if (!contextMenuPostId) return;
    var url = window.location.origin + window.location.pathname + '?post=' + contextMenuPostId;
    navigator.clipboard.writeText(url).then(function () {
      showToast('Lien copié 📋', 'success');
    }).catch(function () {
      showToast('Impossible de copier', 'error');
    });
  }
  window.copyPostLink = copyPostLink;

  function bookmarkPost() {
    closeContextMenu();
    showToast('Enregistré — bientôt disponible', 'info');
  }
  window.bookmarkPost = bookmarkPost;

  function deletePost() {
    closeContextMenu();
    if (!contextMenuPostId || !sisUser) return;
    if (!confirm('Supprimer ce post définitivement ?')) return;

    db.collection('posts').doc(contextMenuPostId).get().then(function (snap) {
      if (!snap.exists || snap.data().authorId !== sisUser.uid) {
        showToast('Tu ne peux pas supprimer ce post', 'error');
        return;
      }
      return db.collection('posts').doc(contextMenuPostId).delete();
    }).then(function () {
      var el = document.querySelector('[data-id="' + contextMenuPostId + '"]');
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)';
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
      }
      showToast('Post supprimé', 'success');
    }).catch(function (err) {
      console.error('Erreur suppression:', err);
      showToast('Erreur lors de la suppression', 'error');
    });
  }
  window.deletePost = deletePost;

  /* ══════════════════════════════════════════════════════════
     28. WHISPER REVEAL
  ══════════════════════════════════════════════════════════ */

  function revealWhisper(postId) {
    var wrap  = document.getElementById('whisper-' + postId);
    var blurEl = wrap ? wrap.querySelector('.whisper-blurred') : null;
    var hint   = wrap ? wrap.querySelector('.whisper-reveal-hint') : null;
    if (blurEl) blurEl.classList.add('revealed');
    if (hint)   hint.style.display = 'none';
  }
  window.revealWhisper = revealWhisper;

  /* ══════════════════════════════════════════════════════════
     29. NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */

  function toggleNotifPanel() {
    var panel    = document.getElementById('notifPanel');
    var backdrop = document.getElementById('notifBackdrop');
    var btn      = document.getElementById('notifBtn');
    if (!panel) return;
    var open = panel.classList.contains('open');
    panel.classList.toggle('open', !open);
    if (backdrop) backdrop.classList.toggle('open', !open);
    if (btn) btn.setAttribute('aria-expanded', (!open).toString());
  }
  window.toggleNotifPanel = toggleNotifPanel;

  function switchNotifTab(tab) {
    document.querySelectorAll('.notif-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.ntab === tab);
    });
  }
  window.switchNotifTab = switchNotifTab;

  function markAllNotifsRead() {
    var badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
    showToast('Notifications marquées comme lues', 'success');
  }
  window.markAllNotifsRead = markAllNotifsRead;

  /* ══════════════════════════════════════════════════════════
     30. USER MENU (DROPDOWN)
  ══════════════════════════════════════════════════════════ */

  function toggleUserMenu() {
    var dd  = document.getElementById('userDropdown');
    var btn = document.getElementById('topAvatar');
    if (!dd) return;
    var open = dd.classList.contains('open');
    dd.classList.toggle('open', !open);
    if (btn) btn.setAttribute('aria-expanded', (!open).toString());
  }
  window.toggleUserMenu = toggleUserMenu;

  /* ══════════════════════════════════════════════════════════
     31. MESSAGES NON LUS
  ══════════════════════════════════════════════════════════ */

  function listenUnreadMessages() {
    if (!sisUser) return;
    db.collection('messages')
      .where('to', '==', sisUser.uid)
      .where('read', '==', false)
      .onSnapshot(function (snap) {
        var count = snap.size;
        var badges = ['msgCount', 'sidebarMsgBadge', 'ddMsgBadge'];
        badges.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          if (count > 0) {
            el.textContent = count > 99 ? '99+' : count;
            el.style.display = 'inline-flex';
          } else {
            el.style.display = 'none';
          }
        });
      }, function () {});
  }

  /* ══════════════════════════════════════════════════════════
     32. NAVIGATION
  ══════════════════════════════════════════════════════════ */

  function goTo(page)    { window.location.href = page; }
  function signOut()     { auth.signOut().then(function () { window.location.href = 'index.html'; }); }
  function goToChat(topic) { window.location.href = 'chatanonyme.html?salon=' + encodeURIComponent(topic); }
  function goToLive(room)  { window.location.href = 'sis.liveaudio.html?room=' + encodeURIComponent(room); }
  function scrollToTop()   { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  window.goTo      = goTo;
  window.signOut   = signOut;
  window.goToChat  = goToChat;
  window.goToLive  = goToLive;
  window.scrollToTop = scrollToTop;

  /* Copier lien d'invitation */
  function copyInviteLink() {
    var link = 'https://sis-send.vercel.app/?ref=' + (sisUser ? sisUser.uid.slice(0, 8) : 'sis');
    navigator.clipboard.writeText(link).then(function () {
      showToast('Lien d\'invitation copié ! 🔗', 'success');
    }).catch(function () {});
  }
  window.copyInviteLink = copyInviteLink;

  /* Lightbox image */
  function openLightbox(url) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:95vw;max-height:92vh;object-fit:contain;border-radius:12px';
    overlay.appendChild(img);
    overlay.addEventListener('click', function () { document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }
  window.openLightbox = openLightbox;

  /* Extra stubs */
  function openGifPicker()  { showToast('GIF — bientôt disponible', 'info'); }
  function openPollCreator(){ showToast('Sondage — bientôt disponible', 'info'); }
  function addLocation()    { showToast('Localisation — bientôt disponible', 'info'); }
  function addMood()        { showToast('Humeur — bientôt disponible', 'info'); }
  window.openGifPicker   = openGifPicker;
  window.openPollCreator = openPollCreator;
  window.addLocation     = addLocation;
  window.addMood         = addMood;

  /* ══════════════════════════════════════════════════════════
     33. CLICK OUTSIDE & KEYBOARD
  ══════════════════════════════════════════════════════════ */

  function initClickOutsideListeners() {
    document.addEventListener('click', function (e) {
      /* Fermer dropdown utilisateur */
      var dd  = document.getElementById('userDropdown');
      var btn = document.getElementById('topAvatar');
      if (dd && dd.classList.contains('open') && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.remove('open');
      }

      /* Fermer react picker */
      var picker = document.getElementById('reactPicker');
      if (picker && picker.classList.contains('open') && !picker.contains(e.target)) {
        picker.classList.remove('open');
        reactPickerPostId = null;
      }

      /* Fermer search dropdown */
      var sd  = document.getElementById('searchDropdown');
      var si  = document.getElementById('searchBar');
      if (sd && sd.classList.contains('open') && si && !si.contains(e.target)) {
        sd.classList.remove('open');
      }
    });
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      /* Escape = fermer tout */
      if (e.key === 'Escape') {
        closePostModal();
        closeCommentsModal();
        closeReportModal();
        closeContextMenu();
        var picker = document.getElementById('reactPicker');
        if (picker) picker.classList.remove('open');
        var np = document.getElementById('notifPanel');
        if (np) np.classList.remove('open');
        clearSearch();
      }
      /* N = nouveau post (si pas en saisie) */
      if (e.key === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        openPostModal();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     34. TOAST NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */

  function showToast(message, type, duration) {
    type     = type     || 'info';
    duration = duration || 3000;
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icon = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }[type] || 'ℹ';
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + escHtml(message) + '</span>';

    container.appendChild(toast);

    /* Animer l'entrée */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('toast-in');
      });
    });

    /* Auto-dismiss */
    var removeTimer = setTimeout(function () {
      removeToast(toast);
    }, duration);

    /* Clic pour fermer */
    toast.addEventListener('click', function () {
      clearTimeout(removeTimer);
      removeToast(toast);
    });
  }

  function removeToast(toast) {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  /* ══════════════════════════════════════════════════════════
     35. SKELETON LOADING
  ══════════════════════════════════════════════════════════ */

  function showSkeletons() {
    var sk = document.getElementById('skeletonFeed');
    if (sk) sk.style.display = 'block';
  }

  function hideSkeletons() {
    var sk = document.getElementById('skeletonFeed');
    if (sk) sk.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════════════
     36. NOUVEAUX POSTS (pill notification)
  ══════════════════════════════════════════════════════════ */

  (function watchNewPosts() {
    var initialized = false;
    var newCount    = 0;

    setTimeout(function () {
      if (!db) return;
      db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot(function (snap) {
          if (!initialized) { initialized = true; return; }
          if (!snap.empty) {
            var lastId = snap.docs[0].id;
            var existing = document.querySelector('[data-id="' + lastId + '"]');
            if (!existing) {
              newCount++;
              var pill = document.getElementById('newPostsPill');
              var cnt  = document.getElementById('newPostsCount');
              if (pill) pill.style.display = 'flex';
              if (cnt)  cnt.textContent = newCount + ' nouveau' + (newCount > 1 ? 'x' : '') + ' post' + (newCount > 1 ? 's' : '');
            }
          }
        }, function () {});
    }, 3000);
  })();

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var pill = document.getElementById('newPostsPill');
    if (pill) {
      setTimeout(function () {
        pill.style.display = 'none';
        switchTab(currentTab);
      }, 400);
    }
  }

  /* ══════════════════════════════════════════════════════════
     37. UTILS
  ══════════════════════════════════════════════════════════ */

  function timeAgo(ts) {
    if (!ts) return '';
    var now  = Date.now();
    var then = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : now);
    var diff = Math.floor((now - then) / 1000);
    if (diff < 5)      return 'à l\'instant';
    if (diff < 60)     return diff + 's';
    if (diff < 3600)   return Math.floor(diff / 60) + ' min';
    if (diff < 86400)  return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'j';
    return new Date(then).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function formatText(text) {
    return escHtml(text)
      .replace(/(#[a-zA-ZÀ-ÿ0-9_]+)/g, '<span class="inline-hashtag" onclick="filterByTag(\'$1\'.slice(1))">$1</span>')
      .replace(/\n{2,}/g, '</p><p class="post-text">')
      .replace(/\n/g, '<br>');
  }

  function formatNum(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }

  function formatCountdown(ms) {
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    if (d > 0) return d + 'j ' + pad(h) + 'h';
    if (h > 0) return h + 'h ' + pad(m) + 'm';
    return pad(m) + ':' + pad(s);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(str) {
    return String(str || '').replace(/'/g, '\\\'').replace(/"/g, '&quot;');
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function showEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function hideEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════════════
     38. GESTION URL PARAMS (accès direct à un post)
  ══════════════════════════════════════════════════════════ */

  (function handleUrlParams() {
    var params  = new URLSearchParams(window.location.search);
    var postId  = params.get('post');
    var tagParam = params.get('tag');

    if (postId) {
      /* Attendre le chargement puis scroller */
      var tries = 0;
      var interval = setInterval(function () {
        tries++;
        var el = document.querySelector('[data-id="' + postId + '"]');
        if (el) {
          clearInterval(interval);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('post-highlight');
        } else if (tries > 20) {
          clearInterval(interval);
        }
      }, 500);
    }

    if (tagParam) {
      filterByTag(tagParam);
    }
  })();

})();
/* ── FIN sisfeed.js ────────────────────────────────────────── */
