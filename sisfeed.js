/* ============================================================
   sisfeed.js — SIS Feed Social
   Vanilla JS · Firebase Compat 9.23.0 · No ES6 modules
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. CONFIG FIREBASE
  ══════════════════════════════════════════════════════════ */
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyDxO8aG77RcMHOTrUtfCDk5XYicBfTOAjk',
    authDomain:        'sayitnetwork.firebaseapp.com',
    projectId:         'sayitnetwork',
    storageBucket:     'sayitnetwork.firebasestorage.app',
    messagingSenderId: '12771396184',
    appId:             '1:12771396184:web:081d5a74b57652c657d82d',
    measurementId:     'G-F4WL1YHZFB'
  };

  // Initialisation Firebase (éviter double init)
  var app;
  try {
    app = firebase.app();
  } catch (e) {
    app = firebase.initializeApp(FIREBASE_CONFIG);
  }

  var auth = firebase.auth();
  var db   = firebase.firestore();

  // Paramètres Firestore offline persistence
  db.enablePersistence({ synchronizeTabs: true }).catch(function () {});

  /* ══════════════════════════════════════════════════════════
     2. CONSTANTES & VARIABLES GLOBALES
  ══════════════════════════════════════════════════════════ */
  var SIS_CERTIFIED_EMAIL = 'gbaguidiexauce@gmail.com';
  var CLOUDINARY_CLOUD    = 'dwdlwjdhe';
  var CLOUDINARY_PRESET   = 'sis_preset';
  var TENOR_API_KEY       = 'LIVDSRZULELA'; // clé publique Tenor demo
  var POSTS_PER_BATCH     = 20;

  var AVATAR_PALETTE = [
    '#5B8EF4','#8B5CF6','#EC4899','#10B981',
    '#F59E0B','#EF4444','#06B6D4','#84CC16',
    '#F97316','#A855F7','#14B8A6','#FB7185'
  ];

  var LEVEL_NAMES = [
    'Inconnu','Ombre','Murmure','Voix','Masque',
    'Spectre','Fantôme','Légende','Mythe','Éternel'
  ];

  var MOOD_HASHTAGS = {
    chaud:  ['fire','hot','chaud','flame'],
    lourd:  ['lourd','heavy','dur','painful'],
    drole:  ['lol','drole','funny','haha'],
    drama:  ['drama','clash','fight','tension'],
    deep:   ['deep','profound','silence','ame']
  };

  /* État global */
  var G = {
    user:           null,   // window.sisUser
    feedTab:        'global',
    activeMoods:    [],
    activeTag:      null,
    posts:          [],
    lastVisible:    null,
    loadingMore:    false,
    allLoaded:      false,
    listeners:      [],     // Firestore unsubscribers
    composerType:   'confession',
    composerAnon:   'anon',
    echoAnon:       'anon',
    currentPostForAction: null,
    pacteCallback:  null,
    storyList:      [],
    storyIndex:     0,
    storyTimer:     null,
    burnTimers:     {},
    hiddenPosts:    [],
    newPostsQueue:  0,
    searchQuery:    '',
    gifSelected:    null,
    mediaFileUrl:   null,
    mediaFileBlob:  null,
    battleDuration: 86400,
    burnMaxViews:   50,
    burnTimer:      3600,
    pollDuration:   86400
  };

  /* ══════════════════════════════════════════════════════════
     3. INITIALISATION — DOMContentLoaded
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initAuth();
    initScroll();
    bindTopbar();
    bindSearch();
    bindBottomNav();
    bindComposer();
    bindEcho();
    bindReport();
    bindRoulette();
    bindStories();
    bindProfilPanel();
    bindTagFilter();
    bindMoodPills();
    bindFeedTabs();
  });

  /* ══════════════════════════════════════════════════════════
     4. AUTH — vérification utilisateur
  ══════════════════════════════════════════════════════════ */
  function initAuth() {
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href = 'sisauth.html';
        return;
      }
      setupUser(user);
    });
  }

  function setupUser(user) {
    checkCertification(user);

    window.sisUser = {
      uid:         user.uid,
      displayName: user.displayName || generateAnonName(user.uid),
      email:       user.email || null,
      photoURL:    user.photoURL || null,
      isCertified: false,
      ghostMode:   false,
      isAnonymous: user.isAnonymous
    };
    G.user = window.sisUser;

    // Charger profil Firestore
    db.collection('users').doc(user.uid).get().then(function (doc) {
      if (doc.exists) {
        var d = doc.data();
        G.user.ghostMode   = d.ghostMode   || false;
        G.user.level       = d.level       || 1;
        G.user.points      = d.points      || 0;
        G.user.streak      = d.streak      || 0;
        G.user.postCount   = d.postCount   || 0;
        G.user.photoURL    = d.photoURL    || user.photoURL || null;
        if (d.displayName) G.user.displayName = d.displayName;
      } else {
        // Créer le profil
        db.collection('users').doc(user.uid).set({
          displayName:      G.user.displayName,
          isAnonymousAccount: user.isAnonymous,
          ghostMode:        false,
          level:            1,
          points:           0,
          streak:           0,
          postCount:        0,
          createdAt:        firebase.firestore.FieldValue.serverTimestamp()
        });
        G.user.level  = 1;
        G.user.points = 0;
        G.user.streak = 0;
        G.user.postCount = 0;
      }

      G.user.isCertified = (G.user.email === SIS_CERTIFIED_EMAIL);

      renderProfile();
      computeStreak();
      startLivePulse();
      loadFeed();
      loadStories();
      loadTrending();
      loadCsdpmDuJour();
      startVibeInterval();
      loadTopWeek();
      checkNewPosts();
      loadNotifications();
      loadMoodDuJour();
      hiddenPostsFromStorage();
    });
  }

  function checkCertification(user) {
    if (user.email === SIS_CERTIFIED_EMAIL) {
      db.collection('users').doc(user.uid).set(
        { isCertified: true }, { merge: true }
      );
    }
  }

  function generateAnonName(uid) {
    var prefixes = ['Ombre','Masque','Voix','Spectre','Nuit','Reflet','Zone','Lueur'];
    var hash = 0;
    for (var i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash) + uid.charCodeAt(i);
      hash |= 0;
    }
    var prefix = prefixes[Math.abs(hash) % prefixes.length];
    var num    = Math.abs(hash >> 2) % 9000 + 1000;
    return prefix + '#' + num;
  }

  /* ══════════════════════════════════════════════════════════
     5. THÈME — clair / sombre
  ══════════════════════════════════════════════════════════ */
  function initTheme() {
    var saved = localStorage.getItem('sis-theme');
    if (saved === 'light') applyLight(true);
    else applyDark(true);
  }

  function applyLight(silent) {
    document.body.classList.add('light');
    show('iconSun'); hide('iconMoon');
    var pp = qs('#ppThemePill');
    if (pp) pp.classList.add('on');
    var ppIcon = qs('#ppThemeIcon');
    if (ppIcon) ppIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    if (!silent) { localStorage.setItem('sis-theme','light'); showToast('Mode clair ☀️','info'); }
  }

  function applyDark(silent) {
    document.body.classList.remove('light');
    show('iconMoon'); hide('iconSun');
    var pp = qs('#ppThemePill');
    if (pp) pp.classList.remove('on');
    var ppIcon = qs('#ppThemeIcon');
    if (ppIcon) ppIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    if (!silent) { localStorage.setItem('sis-theme','dark'); showToast('Mode sombre 🌙','info'); }
  }

  function toggleTheme() {
    if (document.body.classList.contains('light')) applyDark();
    else applyLight();
  }

  /* ══════════════════════════════════════════════════════════
     6. GHOST MODE
  ══════════════════════════════════════════════════════════ */
  function setGhostMode(val) {
    G.user.ghostMode = val;
    var pills = qsa('.toggle-pill[data-ghost]');
    // ghost pill sidebar
    var gp  = qs('#ghostPill');
    var ppg = qs('#ppGhostPill');
    if (gp)  val ? gp.classList.add('on')  : gp.classList.remove('on');
    if (ppg) val ? ppg.classList.add('on') : ppg.classList.remove('on');
    // Mettre à jour le mode affiché
    setTextContent('#pcMode', val ? 'Ghost Mode 👻' : 'Mode normal');
    setTextContent('#ppMeta', val ? 'Ghost Mode 👻' : 'Mode normal');
    db.collection('users').doc(G.user.uid).update({ ghostMode: val });
    showToast(val ? 'Ghost Mode activé 👻' : 'Ghost Mode désactivé', 'info');
  }

  /* ══════════════════════════════════════════════════════════
     7. AVATAR GENERATOR
  ══════════════════════════════════════════════════════════ */
  function generateAvatar(uid, size) {
    size = size || 42;
    var hash = 0;
    for (var i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash) + uid.charCodeAt(i);
      hash |= 0;
    }
    var c1 = AVATAR_PALETTE[Math.abs(hash)       % AVATAR_PALETTE.length];
    var c2 = AVATAR_PALETTE[Math.abs(hash >> 4)  % AVATAR_PALETTE.length];
    var gradId = 'av-' + uid.slice(0, 8);
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+(size/2)+'" fill="url(#'+gradId+')"/>'
      + '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="'+size+'" y2="'+size+'">'
      + '<stop offset="0%" stop-color="'+c1+'"/>'
      + '<stop offset="100%" stop-color="'+c2+'"/>'
      + '</linearGradient></defs>'
      + '</svg>';
  }

  function certifiedBadgeSVG() {
    return '<svg class="certified-badge" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="8" cy="8" r="8" fill="url(#grad-badge)"/>'
      + '<polyline points="5,8 7,10 11,6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  /* ══════════════════════════════════════════════════════════
     8. RENDER PROFILE
  ══════════════════════════════════════════════════════════ */
  function renderProfile() {
    if (!G.user) return;

    // Avatar (photo ou SVG)
    var avatarHTML = G.user.photoURL
      ? '<img src="'+G.user.photoURL+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="avatar">'
      : generateAvatar(G.user.uid, 46);

    var ppAvatarHTML = G.user.photoURL
      ? '<img src="'+G.user.photoURL+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="avatar">'
      : generateAvatar(G.user.uid, 60);

    var tbAvatarHTML = G.user.photoURL
      ? '<img src="'+G.user.photoURL+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="avatar">'
      : generateAvatar(G.user.uid, 32);

    setHTML('#pcAvatar', avatarHTML);
    setHTML('#ppAvatar', ppAvatarHTML);
    setHTML('#tbAvatar', tbAvatarHTML);
    setHTML('#commentInputAvatar', generateAvatar(G.user.uid, 32));

    // Nom + badge
    var nameHTML = escHtml(G.user.displayName)
      + (G.user.isCertified ? ' ' + certifiedBadgeSVG() : '');
    setHTML('#pcName', nameHTML);
    setHTML('#ppName', nameHTML);

    // Mode
    setTextContent('#pcMode', G.user.ghostMode ? 'Ghost Mode 👻' : 'Mode normal');
    setTextContent('#ppMeta', G.user.ghostMode ? 'Ghost Mode 👻' : 'Mode normal');

    // Niveau
    var lvl  = G.user.level  || 1;
    var pts  = G.user.points || 0;
    var pct  = Math.min((pts % 100), 100);
    var next = LEVEL_NAMES[Math.min(lvl, LEVEL_NAMES.length - 1)];
    setTextContent('#pcLevel',    'Niveau ' + lvl + ' — ' + (LEVEL_NAMES[lvl-1] || ''));
    setTextContent('#statLevel',  lvl);
    setTextContent('#ppStatLevel', lvl);
    setTextContent('#levelNext',  'Vers ' + next);
    setTextContent('#ppLevelNext','Vers ' + next);
    setStyle('#levelBarFill',   'width', pct + '%');
    setStyle('#ppLevelBarFill', 'width', pct + '%');

    // Stats
    setTextContent('#statPosts',      G.user.postCount  || 0);
    setTextContent('#ppStatPosts',    G.user.postCount  || 0);

    // Ghost pill
    var gp  = qs('#ghostPill');
    var ppg = qs('#ppGhostPill');
    if (gp)  G.user.ghostMode ? gp.classList.add('on')  : gp.classList.remove('on');
    if (ppg) G.user.ghostMode ? ppg.classList.add('on') : ppg.classList.remove('on');

    // Masquer bouton certification si déjà certifié
    var certBtn = qs('#certBtn');
    if (certBtn) certBtn.style.display = G.user.isCertified ? 'none' : '';

    // Aura message
    if ((G.user.postCount || 0) >= 5) {
      show('auraMsg');
    }
  }

  /* ══════════════════════════════════════════════════════════
     9. STREAK
  ══════════════════════════════════════════════════════════ */
  function computeStreak() {
    if (!G.user) return;
    db.collection('users').doc(G.user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data();
      var now       = Date.now();
      var lastVisit = d.lastVisit ? d.lastVisit.toMillis() : 0;
      var diff      = now - lastVisit;
      var streak    = d.streak || 0;
      var ONE_DAY   = 86400000;

      if (diff > ONE_DAY * 2) {
        // Streak cassé
        streak = 1;
        if (lastVisit > 0) showToast('Ton streak s\'est éteint. 🕯️', 'info');
      } else if (diff > ONE_DAY) {
        streak += 1;
      }

      G.user.streak = streak;
      db.collection('users').doc(G.user.uid).update({
        streak: streak,
        lastVisit: firebase.firestore.FieldValue.serverTimestamp()
      });
      setTextContent('#streakCount', streak + ' jour' + (streak > 1 ? 's' : ''));
      setTextContent('#ppStreak',    streak + ' jour' + (streak > 1 ? 's' : ''));
    });
  }

  /* ══════════════════════════════════════════════════════════
     10. LIVE PULSE
  ══════════════════════════════════════════════════════════ */
  function startLivePulse() {
    if (!G.user) return;
    // Écrire présence
    var ref = db.collection('liveusers').doc(G.user.uid);
    ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    setInterval(function () {
      ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    }, 25000);

    // Compter utilisateurs actifs (lastSeen < 2min)
    function countLive() {
      var since = new Date(Date.now() - 120000);
      db.collection('liveusers')
        .where('lastSeen', '>', since)
        .get()
        .then(function (snap) {
          var count = snap.size;
          setTextContent('#liveCount', count);
        });
    }
    countLive();
    setInterval(countLive, 30000);
  }

  /* ══════════════════════════════════════════════════════════
     11. FEED — loadFeed() Firestore
  ══════════════════════════════════════════════════════════ */
  function loadFeed(reset) {
    if (reset) {
      G.posts       = [];
      G.lastVisible = null;
      G.allLoaded   = false;
      clearPosts();
      showSkeletons();
    }

    if (G.allLoaded || G.loadingMore) return;
    G.loadingMore = true;
    show('loadMoreSpinner');

    var query = buildFeedQuery();

    query.get().then(function (snap) {
      hideSkeletons();
      hide('loadMoreSpinner');
      G.loadingMore = false;

      if (snap.empty) {
        G.allLoaded = true;
        show('feedEnd');
        return;
      }

      G.lastVisible = snap.docs[snap.docs.length - 1];

      var rawPosts = [];
      snap.forEach(function (doc) {
        var data = doc.data();
        data.id  = doc.id;
        rawPosts.push(data);
      });

      // Filtrer posts masqués
      rawPosts = rawPosts.filter(function (p) {
        return G.hiddenPosts.indexOf(p.id) === -1;
      });

      // Filtrer par tag si actif
      if (G.activeTag) {
        rawPosts = rawPosts.filter(function (p) {
          return p.hashtags && p.hashtags.indexOf(G.activeTag) !== -1;
        });
      }

      // Filtrer par mood pills
      if (G.activeMoods.length > 0) {
        rawPosts = rawPosts.filter(function (p) {
          return matchesMood(p);
        });
      }

      // Filtrer par recherche
      if (G.searchQuery) {
        var q = G.searchQuery.toLowerCase();
        rawPosts = rawPosts.filter(function (p) {
          return (p.content && p.content.toLowerCase().indexOf(q) !== -1)
            || (p.hashtags && p.hashtags.join(' ').toLowerCase().indexOf(q) !== -1);
        });
      }

      // Variable reward + diversity injection
      rawPosts = variableReward(rawPosts);

      if (rawPosts.length < POSTS_PER_BATCH) G.allLoaded = true;

      rawPosts.forEach(function (post, idx) {
        G.posts.push(post);
        renderPost(post, idx);
      });

      if (rawPosts.length === 0) {
        show('feedEnd');
      }

    }).catch(function (err) {
      G.loadingMore = false;
      hide('loadMoreSpinner');
      hideSkeletons();
      showToast('Erreur de chargement', 'error');
      console.error(err);
    });
  }

  function buildFeedQuery() {
    var col = db.collection('posts');
    var q;
    var thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    if (G.feedTab === 'viral') {
      q = col.where('heatScore','>=', 100)
             .orderBy('heatScore','desc')
             .orderBy('createdAt','desc');
    } else if (G.feedTab === 'csdpm') {
      q = col.where('type','==','csdpm')
             .orderBy('createdAt','desc');
    } else if (G.feedTab === 'whispers') {
      q = col.where('type','==','whisper')
             .orderBy('createdAt','desc');
    } else if (G.feedTab === 'battles') {
      q = col.where('type','==','battle')
             .where('isExpired','==',false)
             .orderBy('createdAt','desc');
    } else if (G.feedTab === 'following') {
      // Fallback global si pas de following
      q = col.where('createdAt','>', thirtyDaysAgo)
             .orderBy('createdAt','desc');
    } else {
      // Global
      q = col.where('createdAt','>', thirtyDaysAgo)
             .where('isExpired','==',false)
             .orderBy('createdAt','desc');
    }

    if (G.lastVisible) q = q.startAfter(G.lastVisible);
    q = q.limit(POSTS_PER_BATCH);
    return q;
  }

  /* ══════════════════════════════════════════════════════════
     12. VARIABLE REWARD + SCORE FRAÎCHEUR + DIVERSITY INJECTION
  ══════════════════════════════════════════════════════════ */
  function variableReward(posts) {
    // Score fraîcheur
    posts.forEach(function (p) {
      var createdMs = p.createdAt ? p.createdAt.toMillis() : Date.now();
      var hours     = (Date.now() - createdMs) / 3600000;
      var total     = ((p.reactions && p.reactions.fire || 0)
                    + (p.reactions && p.reactions.skull || 0)
                    + (p.reactions && p.reactions.cry || 0)
                    + (p.reactions && p.reactions.zap || 0));
      p._score = total * 3 + (p.commentCount || 0) * 5 + (p.viewCount || 0) * 0.5 - hours * 2;
    });

    // Trier par score
    posts.sort(function (a, b) { return b._score - a._score; });

    // Order variable reward: mélange les types
    var typeOrder = ['confession','battle','whisper','csdpm','burn','media','poll','thread'];
    var byType = {};
    typeOrder.forEach(function (t) { byType[t] = []; });
    posts.forEach(function (p) {
      var t = p.type || 'confession';
      if (!byType[t]) byType[t] = [];
      byType[t].push(p);
    });

    var result = [];
    var i = 0;
    while (result.length < posts.length) {
      var type = typeOrder[i % typeOrder.length];
      if (byType[type] && byType[type].length > 0) {
        result.push(byType[type].shift());
      }
      i++;
      if (i > posts.length * 2) break;
    }

    // Diversity injection : Battle ou Whisper toutes les 5 positions
    var extra = byType['battle'].concat(byType['whisper']);
    extra.forEach(function (p, idx) {
      var pos = Math.min((idx + 1) * 5, result.length);
      result.splice(pos, 0, p);
    });

    return result;
  }

  function matchesMood(post) {
    if (G.activeMoods.length === 0) return true;
    var tags = (post.hashtags || []).join(' ').toLowerCase();
    return G.activeMoods.some(function (mood) {
      var keywords = MOOD_HASHTAGS[mood] || [];
      return keywords.some(function (k) { return tags.indexOf(k) !== -1; });
    });
  }

  /* ══════════════════════════════════════════════════════════
     13. HEAT SCORE
  ══════════════════════════════════════════════════════════ */
  function getHeatClass(post) {
    var hs = post.heatScore || 0;
    if (hs >= 100) return 'heat-viral';
    if (hs >= 50)  return 'heat-warm';
    return '';
  }

  function updateHeatScore(postId, post) {
    var total = ((post.reactions && post.reactions.fire || 0)
               + (post.reactions && post.reactions.skull || 0)
               + (post.reactions && post.reactions.cry || 0)
               + (post.reactions && post.reactions.zap || 0));
    var updatedMs = post.heatUpdatedAt ? post.heatUpdatedAt.toMillis() : 0;
    var hoursSince = (Date.now() - updatedMs) / 3600000;
    var heatScore = hoursSince < 1 ? total : 0;
    db.collection('posts').doc(postId).update({
      heatScore:    heatScore,
      heatUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
    return heatScore;
  }

  /* ══════════════════════════════════════════════════════════
     14. RENDER POST — dispatch selon type
  ══════════════════════════════════════════════════════════ */
  function renderPost(post, idx) {
    var el = document.createElement('div');
    el.className = 'post ' + getHeatClass(post);
    el.setAttribute('data-id', post.id);
    el.setAttribute('data-type', post.type || 'confession');
    el.style.animationDelay = Math.min(idx * 0.05, 0.4) + 's';

    // Header du post
    el.innerHTML = renderPostHeader(post) + renderPostBody(post) + renderPostFooter(post);

    qs('#postsList').appendChild(el);

    // Observer pour views + fadeUp
    observePostEntry(el, post);

    // Logique spécifique
    if (post.type === 'burn')   initBurnPost(el, post);
    if (post.type === 'battle') initBattlePost(el, post);
    if (post.type === 'poll')   initPollPost(el, post);

    // Listeners interactions
    bindPostInteractions(el, post);
  }

  function renderPostHeader(post) {
    var avatarHTML = post.authorPhotoURL
      ? '<img src="'+escHtml(post.authorPhotoURL)+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="">'
      : generateAvatar(post.authorId || 'anon', 38);

    var nameHTML = escHtml(post.authorDisplay || 'Anonyme');
    if (post.isCertified && post.authorId === (G.user && G.user.uid)) {
      nameHTML += ' ' + certifiedBadgeSVG();
    }

    var badgeHTML = renderTypeBadge(post);
    var heatBadge = (post.heatScore || 0) >= 100
      ? '<span class="badge badge-viral">🔥 En feu</span>' : '';

    var isOld = post.createdAt && (Date.now() - post.createdAt.toMillis() > 7 * 86400000);
    var oldBadge = isOld ? '<span class="badge badge-old">Vieux</span>' : '';

    var menuItems = renderPostMenuItems(post);

    return '<div class="post-header">'
      + '<div class="post-avatar">' + avatarHTML + '</div>'
      + '<div class="post-meta">'
      +   '<div class="post-author">' + nameHTML + ' ' + badgeHTML + ' ' + heatBadge + ' ' + oldBadge + '</div>'
      +   '<div class="post-time">' + timeAgo(post.createdAt) + '</div>'
      + '</div>'
      + '<div class="post-menu-wrap">'
      +   '<button class="post-menu-btn" data-action="menu">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>'
      +   '</button>'
      +   '<div class="post-menu">' + menuItems + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderTypeBadge(post) {
    var badges = {
      confession: '<span class="badge badge-confession">Confession</span>',
      csdpm:      '<span class="badge badge-csdpm">CSDPM</span>',
      whisper:    '<span class="badge badge-whisper">👁 Whisper</span>',
      battle:     '<span class="badge badge-battle">⚔️ Battle</span>',
      burn:       '<span class="badge badge-burn">🔥 Burn</span>',
      media:      '<span class="badge badge-media">📷 Media</span>',
      poll:       '<span class="badge badge-poll">📊 Poll</span>',
      thread:     '<span class="badge badge-thread">🧵 Thread</span>',
      echo:       '<span class="badge badge-echo">↩ Echo</span>'
    };
    return badges[post.type] || badges['confession'];
  }

  function renderPostMenuItems(post) {
    var isOwner = G.user && post.authorId === G.user.uid;
    var html = ''
      + '<div class="menu-item" data-action="echo">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Echo'
      + '</div>'
      + '<div class="menu-item" data-action="share">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>Partager'
      + '</div>'
      + '<div class="menu-sep"></div>'
      + '<div class="menu-item" data-action="hide">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Masquer'
      + '</div>'
      + '<div class="menu-item menu-item-danger" data-action="report">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>Signaler'
      + '</div>';
    if (isOwner) {
      html += '<div class="menu-sep"></div>'
        + '<div class="menu-item menu-item-danger" data-action="delete">'
        +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Supprimer'
        + '</div>'
        + '<div class="menu-item" data-action="pin">'
        +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>Épingler'
        + '</div>';
    }
    return html;
  }

  function renderPostBody(post) {
    switch (post.type) {
      case 'csdpm':   return renderCsdpm(post);
      case 'whisper': return renderWhisper(post);
      case 'battle':  return renderBattle(post);
      case 'burn':    return renderBurn(post);
      case 'media':   return renderMedia(post);
      case 'poll':    return renderPoll(post);
      case 'thread':  return renderThread(post);
      case 'echo':    return renderEcho(post);
      default:        return renderConfession(post);
    }
  }

  function renderConfession(post) {
    var text   = post.content || '';
    var isLong = text.length > 280;
    var disp   = isLong ? text.slice(0, 280) : text;
    var html   = '<div class="post-readers hidden" data-postid="'+post.id+'"></div>'
      + '<div class="post-text">' + escHtml(disp)
      + (isLong ? '<span class="read-more-ellipsis">...</span>' : '')
      + '</div>';
    if (isLong) {
      html += '<button class="read-more-btn" data-full="'+escAttr(text)+'">Lire la suite →</button>';
    }
    html += renderHashtags(post);
    return html;
  }

  function renderCsdpm(post) {
    var text = post.content || '';
    return '<div class="csdpm-label">Ça Se Dit Pas Mais...</div>'
      + '<div class="post-text csdpm-text">' + escHtml(text) + '</div>'
      + renderHashtags(post);
  }

  function renderWhisper(post) {
    return '<div class="post-text whisper-blur" data-revealed="false">'
      + escHtml(post.content || '')
      + '</div>'
      + '<div class="whisper-hint">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      + '<span class="whisper-count">' + (post.whisperReveals || 0) + ' ont osé lire</span>'
      + ' — Clique pour révéler'
      + '</div>'
      + renderHashtags(post);
  }

  function renderBattle(post) {
    var opts = post.battleOptions || [];
    var total = opts.reduce(function (s, o) { return s + (o.votes || 0); }, 0);
    var html = '<div class="post-text" style="font-weight:700;margin-bottom:12px">' + escHtml(post.content || '') + '</div>'
      + '<div class="battle-opts">';
    opts.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
      html += '<div class="battle-opt" data-optid="'+escAttr(opt.id)+'">'
        + '<div class="battle-progress" style="width:'+pct+'%"></div>'
        + '<div class="battle-opt-content">'
        + '<span class="battle-opt-label">' + escHtml(opt.label) + '</span>'
        + '<span class="battle-opt-pct">' + pct + '%</span>'
        + '</div></div>';
    });
    var endsAt = post.battleEndsAt ? post.battleEndsAt.toMillis() : 0;
    var timeLeft = endsAt > Date.now() ? formatCountdown(endsAt - Date.now()) : 'Terminé';
    html += '</div><div class="battle-footer">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      + total + ' votes · ' + timeLeft
      + '</div>';
    return html;
  }

  function renderBurn(post) {
    var maxViews = post.maxViews || 100;
    var views    = post.viewCount || 0;
    var pct      = Math.max(0, Math.round((maxViews - views) / maxViews * 100));
    var expiresMs = post.expiresAt ? post.expiresAt.toMillis() : Date.now();
    var timeLeft  = expiresMs > Date.now() ? formatCountdown(expiresMs - Date.now()) : 'Expiré';

    return '<div class="burn-timer">'
      + '<div class="burn-info">'
      + '<svg class="burn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
      + 'Ce post brûle'
      + '</div>'
      + '<span class="burn-countdown" data-expires="'+expiresMs+'">' + timeLeft + '</span>'
      + '</div>'
      + '<div class="post-text">' + escHtml(post.content || '') + '</div>'
      + '<div class="burn-progress-bar"><div class="burn-fill" style="width:'+pct+'%"></div></div>'
      + '<div class="burn-views-left">' + Math.max(0, maxViews - views) + ' vues avant destruction</div>'
      + renderHashtags(post);
  }

  function renderMedia(post) {
    var html = '';
    if (post.mediaUrl) {
      html += '<div class="post-media">'
        + '<img src="'+escHtml(post.mediaUrl)+'" class="post-img" loading="lazy" alt="media" '
        + 'onerror="this.style.display=\'none\'">'
        + '</div>';
    }
    if (post.content) {
      html += '<div class="post-text">' + escHtml(post.content) + '</div>';
    }
    html += renderHashtags(post);
    return html;
  }

  function renderPoll(post) {
    var opts  = post.pollOptions || [];
    var total = opts.reduce(function (s, o) { return s + (o.votes || 0); }, 0);
    var html  = '<div class="post-text" style="font-weight:700;margin-bottom:10px">' + escHtml(post.content || '') + '</div>'
      + '<div class="poll-opts">';
    opts.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
      html += '<div class="poll-opt" data-optid="'+escAttr(opt.id)+'">'
        + '<div class="poll-bar" style="width:'+pct+'%"></div>'
        + '<div class="poll-opt-content">'
        + '<span class="poll-label">' + escHtml(opt.label) + '</span>'
        + '<span class="poll-pct">' + pct + '%</span>'
        + '</div></div>';
    });
    var endsAt  = post.pollEndsAt ? post.pollEndsAt.toMillis() : 0;
    var closed  = endsAt > 0 && endsAt < Date.now();
    html += '</div><div class="poll-footer">'
      + total + ' réponses'
      + (closed ? ' · <span class="badge badge-old">Terminé</span>' : '')
      + '</div>';
    return html;
  }

  function renderThread(post) {
    var parts = post.parts || [post.content || ''];
    var html  = '';
    parts.forEach(function (part, i) {
      var visible = i === 0;
      html += '<div class="thread-part ' + (visible ? '' : 'thread-part-hidden') + '">'
        + '<div class="thread-part-n">' + (i+1) + '/' + parts.length + '</div>'
        + '<div class="thread-part-text">' + escHtml(part) + '</div>'
        + '</div>';
    });
    if (parts.length > 1) {
      html += '<button class="thread-more-btn">Lire la suite ' + (parts.length - 1) + ' partie(s) →</button>';
    }
    return html + renderHashtags(post);
  }

  function renderEcho(post) {
    return '<div class="echo-banner">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>'
      + 'Echo d\'une confession anonyme'
      + '</div>'
      + '<div class="echo-preview">' + escHtml(post.echoContent || '') + '</div>'
      + '<div class="post-text">' + escHtml(post.content || '') + '</div>'
      + renderHashtags(post);
  }

  function renderHashtags(post) {
    var tags = post.hashtags || [];
    if (!tags.length) return '';
    return '<div class="post-tags">'
      + tags.map(function (t) {
          return '<span class="tag" data-tag="'+escAttr(t)+'">#'+escHtml(t)+'</span>';
        }).join('')
      + '</div>';
  }

  function renderPostFooter(post) {
    var r = post.reactions || {};
    var myReaction = ''; // Vérification asynchrone post-rendu
    return '<div class="post-reactions">'
      + renderReactionBtn('fire',  '🔥', r.fire  || 0, myReaction === 'fire')
      + renderReactionBtn('skull', '💀', r.skull || 0, myReaction === 'skull')
      + renderReactionBtn('cry',   '😭', r.cry   || 0, myReaction === 'cry')
      + renderReactionBtn('zap',   '⚡', r.zap   || 0, myReaction === 'zap')
      + '<div class="post-actions">'
      +   '<button class="act-btn" data-action="comment" title="Commenter">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      +     '<span class="act-count">' + (post.commentCount || 0) + '</span>'
      +   '</button>'
      +   '<button class="act-btn" data-action="echo" title="Echo">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>'
      +   '</button>'
      +   '<button class="act-btn" data-action="share" title="Partager">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>'
      +   '</button>'
      + '</div>'
      + '</div>';
  }

  function renderReactionBtn(key, emoji, count, active) {
    return '<button class="reaction-btn ' + (active ? 'reaction-active' : '') + '" data-reaction="'+key+'">'
      + emoji + ' <span class="reaction-count">' + count + '</span>'
      + '</button>';
  }

  /* ══════════════════════════════════════════════════════════
     15. CURIOSITY GAP
  ══════════════════════════════════════════════════════════ */
  function bindReadMore(el) {
    var btn = el.querySelector('.read-more-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var full     = btn.getAttribute('data-full');
      var textEl   = el.querySelector('.post-text');
      var ellipsis = el.querySelector('.read-more-ellipsis');
      if (textEl) textEl.textContent = full;
      if (ellipsis) ellipsis.remove();
      btn.remove();
    });
  }

  /* ══════════════════════════════════════════════════════════
     16. SOCIAL PROOF — lecteurs actifs
  ══════════════════════════════════════════════════════════ */
  function observePostEntry(el, post) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          incViewCount(post.id);
          startReaderPresence(post.id, el);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
  }

  function incViewCount(postId) {
    db.collection('posts').doc(postId).update({
      viewCount: firebase.firestore.FieldValue.increment(1)
    }).catch(function () {});
  }

  function startReaderPresence(postId, el) {
    if (!G.user) return;
    var ref = db.collection('posts').doc(postId)
                .collection('readers').doc(G.user.uid);
    ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });

    // Compter lecteurs actifs
    var interval = setInterval(function () {
      if (!document.body.contains(el)) { clearInterval(interval); return; }
      ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
      var since = new Date(Date.now() - 30000);
      db.collection('posts').doc(postId).collection('readers')
        .where('lastSeen', '>', since)
        .get().then(function (snap) {
          var readerEl = el.querySelector('.post-readers');
          if (readerEl && snap.size > 1) {
            readerEl.textContent = snap.size + ' personnes lisent ça maintenant';
            readerEl.classList.remove('hidden');
          } else if (readerEl) {
            readerEl.classList.add('hidden');
          }
        });
    }, 25000);
  }

  /* ══════════════════════════════════════════════════════════
     17. BURN POSTS — countdown + autodestruction
  ══════════════════════════════════════════════════════════ */
  function initBurnPost(el, post) {
    var expiresMs = post.expiresAt ? post.expiresAt.toMillis() : 0;
    var maxViews  = post.maxViews || 100;

    var interval = setInterval(function () {
      if (!document.body.contains(el)) { clearInterval(interval); return; }

      var remaining = expiresMs - Date.now();
      var countdownEl = el.querySelector('.burn-countdown');
      if (countdownEl) {
        countdownEl.textContent = remaining > 0 ? formatCountdown(remaining) : 'Expiré';
      }

      // Vérifier autodestruction
      var views = post.viewCount || 0;
      if (remaining <= 0 || views >= maxViews) {
        clearInterval(interval);
        burnDestroy(el, post.id);
      }
    }, 1000);
  }

  function burnDestroy(el, postId) {
    el.innerHTML = '<div class="burn-destroyed">Ce post a brûlé 🔥</div>';
    el.classList.add('burn-destroyed-card');
    setTimeout(function () {
      el.style.opacity    = '0';
      el.style.height     = '0';
      el.style.padding    = '0';
      el.style.margin     = '0';
      el.style.transition = 'all .5s';
      setTimeout(function () { el.remove(); }, 500);
    }, 3000);
    db.collection('posts').doc(postId).update({ isExpired: true }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     18. WHISPER — reveal + compteur
  ══════════════════════════════════════════════════════════ */
  function bindWhisper(el, post) {
    var blurEl = el.querySelector('.whisper-blur');
    if (!blurEl) return;
    blurEl.addEventListener('click', function () {
      if (blurEl.getAttribute('data-revealed') === 'true') return;
      blurEl.setAttribute('data-revealed', 'true');
      blurEl.classList.add('revealed');
      var countEl = el.querySelector('.whisper-count');
      if (countEl) {
        var n = parseInt(countEl.textContent) + 1;
        countEl.textContent = n + ' ont osé lire';
      }
      db.collection('posts').doc(post.id).update({
        whisperReveals: firebase.firestore.FieldValue.increment(1)
      }).catch(function () {});
      showToast('Whisper révélé 👁', 'info');
    });
  }

  /* ══════════════════════════════════════════════════════════
     19. BATTLE — vote + onSnapshot + fermeture auto
  ══════════════════════════════════════════════════════════ */
  function initBattlePost(el, post) {
    // Vérifier si user a déjà voté
    if (!G.user) return;
    db.collection('posts').doc(post.id)
      .collection('voters').doc(G.user.uid).get()
      .then(function (doc) {
        if (doc.exists) {
          var votedId = doc.data().optionId;
          var opt = el.querySelector('[data-optid="'+votedId+'"]');
          if (opt) opt.classList.add('battle-voted');
        }
      });

    // onSnapshot résultats temps réel
    var unsub = db.collection('posts').doc(post.id).onSnapshot(function (snap) {
      if (!snap.exists) return;
      var d    = snap.data();
      var opts = d.battleOptions || [];
      var total = opts.reduce(function (s, o) { return s + (o.votes || 0); }, 0);
      opts.forEach(function (opt) {
        var pct    = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
        var optEl  = el.querySelector('[data-optid="'+opt.id+'"]');
        if (!optEl) return;
        var progEl = optEl.querySelector('.battle-progress');
        var pctEl  = optEl.querySelector('.battle-opt-pct');
        if (progEl) progEl.style.width = pct + '%';
        if (pctEl)  pctEl.textContent  = pct + '%';
      });
      var footer = el.querySelector('.battle-footer');
      if (footer) {
        var endsAt   = d.battleEndsAt ? d.battleEndsAt.toMillis() : 0;
        var timeLeft = endsAt > Date.now() ? formatCountdown(endsAt - Date.now()) : 'Terminé';
        footer.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'
          + total + ' votes · ' + timeLeft;
      }
    });
    G.listeners.push(unsub);
  }

  function voteBattle(el, post, optionId) {
    if (!G.user) return;
    var voterRef = db.collection('posts').doc(post.id)
                     .collection('voters').doc(G.user.uid);
    voterRef.get().then(function (doc) {
      if (doc.exists) { showToast('Tu as déjà voté','info'); return; }
      if (post.battleEndsAt && post.battleEndsAt.toMillis() < Date.now()) {
        showToast('Ce battle est terminé','info'); return;
      }
      var batch = db.batch();
      var postRef = db.collection('posts').doc(post.id);
      // Trouver l'index de l'option
      var opts    = post.battleOptions || [];
      var optIdx  = opts.findIndex ? opts.findIndex(function (o) { return o.id === optionId; }) : -1;
      if (optIdx === -1) return;
      var updateKey = 'battleOptions.' + optIdx + '.votes';
      var update = {};
      update[updateKey] = firebase.firestore.FieldValue.increment(1);
      batch.update(postRef, update);
      batch.set(voterRef, { optionId: optionId, at: firebase.firestore.FieldValue.serverTimestamp() });
      batch.commit().then(function () {
        el.querySelector('[data-optid="'+optionId+'"]').classList.add('battle-voted');
        showToast('Vote enregistré ✓','success');
        haptic();
      }).catch(function (err) {
        showToast('Erreur lors du vote', 'error');
        console.error(err);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     20. POLL — vote unique + résultats
  ══════════════════════════════════════════════════════════ */
  function initPollPost(el, post) {
    if (!G.user) return;
    db.collection('posts').doc(post.id)
      .collection('voters').doc(G.user.uid).get()
      .then(function (doc) {
        if (doc.exists) markPollVoted(el, doc.data().optionId, post);
      });

    // onSnapshot temps réel
    var unsub = db.collection('posts').doc(post.id).onSnapshot(function (snap) {
      if (!snap.exists) return;
      var d    = snap.data();
      var opts = d.pollOptions || [];
      var total = opts.reduce(function (s, o) { return s + (o.votes || 0); }, 0);
      opts.forEach(function (opt) {
        var pct   = total > 0 ? Math.round((opt.votes || 0) / total * 100) : 0;
        var optEl = el.querySelector('[data-optid="'+opt.id+'"]');
        if (!optEl) return;
        var bar   = optEl.querySelector('.poll-bar');
        var pctEl = optEl.querySelector('.poll-pct');
        if (bar)   bar.style.width     = pct + '%';
        if (pctEl) pctEl.textContent   = pct + '%';
      });
      var footer = el.querySelector('.poll-footer');
      if (footer) footer.textContent = total + ' réponses';
    });
    G.listeners.push(unsub);
  }

  function votePoll(el, post, optionId) {
    if (!G.user) return;
    var voterRef = db.collection('posts').doc(post.id)
                     .collection('voters').doc(G.user.uid);
    voterRef.get().then(function (doc) {
      if (doc.exists) { showToast('Tu as déjà répondu','info'); return; }
      if (post.pollEndsAt && post.pollEndsAt.toMillis() < Date.now()) {
        showToast('Ce poll est terminé','info'); return;
      }
      var opts   = post.pollOptions || [];
      var optIdx = opts.findIndex ? opts.findIndex(function (o) { return o.id === optionId; }) : -1;
      if (optIdx === -1) return;
      var update = {};
      update['pollOptions.'+optIdx+'.votes'] = firebase.firestore.FieldValue.increment(1);
      var batch = db.batch();
      batch.update(db.collection('posts').doc(post.id), update);
      batch.set(voterRef, { optionId: optionId, at: firebase.firestore.FieldValue.serverTimestamp() });
      batch.commit().then(function () {
        markPollVoted(el, optionId, post);
        showToast('Réponse enregistrée ✓','success');
        haptic();
      }).catch(function (err) {
        showToast('Erreur lors du vote', 'error');
        console.error(err);
      });
    });
  }

  function markPollVoted(el, optionId, post) {
    var opts = el.querySelectorAll('.poll-opt');
    opts.forEach(function (o) { o.style.opacity = '0.6'; o.style.pointerEvents = 'none'; });
    var active = el.querySelector('[data-optid="'+optionId+'"]');
    if (active) { active.style.opacity = '1'; active.style.borderColor = 'var(--blue)'; }
  }

  /* ══════════════════════════════════════════════════════════
     21. THREAD — déroulement
  ══════════════════════════════════════════════════════════ */
  function bindThread(el) {
    var btn = el.querySelector('.thread-more-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var hidden = el.querySelectorAll('.thread-part-hidden');
      hidden.forEach(function (p) { p.classList.remove('thread-part-hidden'); });
      btn.remove();
    });
  }

  /* ══════════════════════════════════════════════════════════
     22. RÉACTIONS — Firestore + storm animation
  ══════════════════════════════════════════════════════════ */
  function handleReaction(el, post, reactionKey) {
    if (!G.user) return;
    var reactorRef = db.collection('posts').doc(post.id)
                       .collection('reactors').doc(G.user.uid);

    reactorRef.get().then(function (doc) {
      var prev    = doc.exists ? doc.data().reaction : null;
      var batch   = db.batch();

      var postRef2 = db.collection('posts').doc(post.id);
      if (prev === reactionKey) {
        // Toggle off
        var decOff = {};
        decOff['reactions.' + reactionKey] = firebase.firestore.FieldValue.increment(-1);
        batch.update(postRef2, decOff);
        batch.delete(reactorRef);
      } else {
        if (prev) {
          var decPrev = {};
          decPrev['reactions.' + prev] = firebase.firestore.FieldValue.increment(-1);
          batch.update(postRef2, decPrev);
        }
        var incNew = {};
        incNew['reactions.' + reactionKey] = firebase.firestore.FieldValue.increment(1);
        batch.update(postRef2, incNew);
        batch.set(reactorRef, { reaction: reactionKey, at: firebase.firestore.FieldValue.serverTimestamp() });

        // First reaction badge
        db.collection('posts').doc(post.id).get().then(function (snap) {
          if (snap.exists && !snap.data().firstReactor) {
            db.collection('posts').doc(post.id).update({ firstReactor: G.user.uid });
            showToast('Premier réacteur 👁️','success');
            addNotification({ type: 'first_reactor', msg: 'Tu es le premier réacteur !' });
          }
        });
      }

      batch.commit().then(function () {
        updateReactionUI(el, reactionKey, prev);
        triggerReactionStorm(el.querySelector('[data-reaction="'+reactionKey+'"]'));
        haptic();

        // Notification au propriétaire
        if (post.authorId && post.authorId !== G.user.uid) {
          addRemoteNotification(post.authorId, 'heard', post.id);
        }
      }).catch(function (err) {
        showToast('Erreur de réaction', 'error');
        console.error(err);
      });
    });
  }

  function updateReactionUI(el, newKey, prevKey) {
    var btns = el.querySelectorAll('.reaction-btn');
    btns.forEach(function (btn) {
      var key    = btn.getAttribute('data-reaction');
      var countEl = btn.querySelector('.reaction-count');
      var count  = parseInt(countEl.textContent) || 0;

      if (key === prevKey && prevKey !== newKey) {
        btn.classList.remove('reaction-active');
        countEl.textContent = Math.max(0, count - 1);
      }
      if (key === newKey) {
        if (btn.classList.contains('reaction-active')) {
          btn.classList.remove('reaction-active');
          countEl.textContent = Math.max(0, count - 1);
        } else {
          btn.classList.add('reaction-active');
          countEl.textContent = count + 1;
        }
      }
    });
  }

  function triggerReactionStorm(btn) {
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var cx   = rect.left + rect.width / 2;
    var cy   = rect.top  + rect.height / 2;
    var colors = ['#EC4899','#8B5CF6','#5B8EF4','#F59E0B','#10B981','#EF4444','#FBBF24','#EC4899'];
    for (var i = 0; i < 8; i++) {
      (function (idx) {
        var spark = document.createElement('div');
        var size  = 4 + Math.random() * 4;
        spark.style.cssText = [
          'position:fixed',
          'pointer-events:none',
          'z-index:9999',
          'width:'+size+'px',
          'height:'+size+'px',
          'border-radius:50%',
          'background:'+colors[idx],
          'left:'+cx+'px',
          'top:'+cy+'px',
          'transform:translate(-50%,-50%)',
          'transition:all .6s cubic-bezier(.17,.67,.83,.67)',
          'opacity:1'
        ].join(';');
        document.body.appendChild(spark);
        var angle = (360 / 8) * idx * (Math.PI / 180);
        var dist  = 40 + Math.random() * 30;
        var dx    = Math.cos(angle) * dist;
        var dy    = Math.sin(angle) * dist - 20;
        requestAnimationFrame(function () {
          spark.style.transform = 'translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px)) scale(0)';
          spark.style.opacity   = '0';
        });
        setTimeout(function () { spark.remove(); }, 700);
      })(i);
    }
  }

  /* ══════════════════════════════════════════════════════════
     23. COMMENTAIRES — temps réel
  ══════════════════════════════════════════════════════════ */
  var currentCommentPostId  = null;
  var currentCommentUnsub   = null;

  function openComments(post) {
    currentCommentPostId = post.id;
    show('commentsOverlay');

    // Preview du post
    var preview = qs('#commentPostPreview');
    if (preview) {
      preview.innerHTML = '<div class="comment-post-summary">'
        + escHtml((post.content || '').slice(0, 120))
        + ((post.content || '').length > 120 ? '...' : '')
        + '</div>';
    }

    qs('#commentsList').innerHTML = '';

    // Listener temps réel
    if (currentCommentUnsub) currentCommentUnsub();
    currentCommentUnsub = db.collection('posts').doc(post.id)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(function (snap) {
        qs('#commentsList').innerHTML = '';
        if (snap.empty) {
          qs('#commentsList').innerHTML = '<div class="comments-empty">Sois le premier à commenter</div>';
          return;
        }
        snap.forEach(function (doc) {
          var c = doc.data();
          c.id  = doc.id;
          renderComment(c, post.id);
        });
      });
    G.listeners.push(currentCommentUnsub);
  }

  function renderComment(c, postId) {
    var el    = document.createElement('div');
    el.className = 'comment-item';
    var avHtml = generateAvatar(c.authorId || 'anon', 30);
    var isFirst = c.isFirstReactor;
    el.innerHTML = '<div class="comment-avatar">' + avHtml + '</div>'
      + '<div class="comment-body">'
      +   '<div class="comment-author">'
      +     escHtml(c.authorDisplay || 'Anonyme')
      +     (isFirst ? ' <span class="first-reactor-badge">Premier 👁️</span>' : '')
      +   '</div>'
      +   '<div class="comment-text">' + escHtml(c.content) + '</div>'
      +   '<div class="comment-footer">'
      +     '<span class="comment-time">' + timeAgo(c.createdAt) + '</span>'
      +     '<button class="comment-like" data-id="'+c.id+'" data-postid="'+postId+'">'
      +       '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
      +       ' ' + (c.likes || 0)
      +     '</button>'
      +   '</div>'
      + '</div>';
    qs('#commentsList').appendChild(el);

    // Like commentaire
    el.querySelector('.comment-like').addEventListener('click', function () {
      db.collection('posts').doc(postId).collection('comments').doc(c.id)
        .update({ likes: firebase.firestore.FieldValue.increment(1) })
        .catch(function () {});
    });

    // Scroll to bottom
    qs('#commentsList').scrollTop = qs('#commentsList').scrollHeight;
  }

  function sendComment() {
    var input = qs('#commentInput');
    var text  = input.value.trim();
    if (!text || !currentCommentPostId || !G.user) return;

    var post = G.posts.find(function (p) { return p.id === currentCommentPostId; });
    var isFirstReactor = post && !post.firstReactor;

    var commentData = {
      content:       text,
      authorId:      G.user.uid,
      authorDisplay: G.user.displayName,
      isAnonymous:   G.user.ghostMode,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      likes:         0,
      isFirstReactor: isFirstReactor
    };

    var batch = db.batch();
    var commentRef = db.collection('posts').doc(currentCommentPostId)
                       .collection('comments').doc();
    var postRef    = db.collection('posts').doc(currentCommentPostId);
    batch.set(commentRef, commentData);
    batch.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(1) });
    if (isFirstReactor) {
      batch.update(postRef, { firstReactor: G.user.uid });
    }
    batch.commit().then(function () {
      input.value = '';
      showToast('Commentaire publié', 'success');
    }).catch(function (err) {
      showToast('Erreur de commentaire', 'error');
      console.error(err);
    });
  }

  /* ══════════════════════════════════════════════════════════
     24. LE PACTE — interstitiel skippable 2s
  ══════════════════════════════════════════════════════════ */
  var pacteSkipTimer = null;

  function openPacte(callback) {
    G.pacteCallback = callback;
    show('pacteOverlay');
    hide('pacteSkip');

    // Charger un post aléatoire
    loadRandomPost(function (post) {
      var preview = qs('#pactePostPreview');
      if (preview && post) {
        preview.innerHTML = '<div class="pacte-post-text">'
          + escHtml((post.content || '').slice(0, 200))
          + '</div>'
          + '<div class="pacte-post-author">' + escHtml(post.authorDisplay || 'Anonyme') + ' · ' + timeAgo(post.createdAt) + '</div>';
      }
    });

    // Bouton passer après 2s
    clearTimeout(pacteSkipTimer);
    pacteSkipTimer = setTimeout(function () {
      show('pacteSkip');
    }, 2000);
  }

  function closePacte(reactionKey) {
    hide('pacteOverlay');
    clearTimeout(pacteSkipTimer);
    if (reactionKey && G.currentPostForAction) {
      var pacteUpd = {};
      pacteUpd['reactions.' + reactionKey] = firebase.firestore.FieldValue.increment(1);
      db.collection('posts').doc(G.currentPostForAction).update(pacteUpd).catch(function () {});
    }
    if (G.pacteCallback) {
      G.pacteCallback();
      G.pacteCallback = null;
    }
  }

  function loadRandomPost(cb) {
    db.collection('posts')
      .where('isExpired','==',false)
      .orderBy('createdAt','desc')
      .limit(20).get()
      .then(function (snap) {
        if (snap.empty) { cb(null); return; }
        var docs = [];
        snap.forEach(function (d) {
          var data = d.data();
          data.id  = d.id;
          docs.push(data);
        });
        cb(docs[Math.floor(Math.random() * docs.length)]);
      }).catch(function () { cb(null); });
  }

  /* ══════════════════════════════════════════════════════════
     25. COMPOSER — modal création post
  ══════════════════════════════════════════════════════════ */
  function openComposer(type) {
    show('composerOverlay');
    if (type) setComposerType(type);
    setTimeout(function () {
      var ta = qs('#composerText');
      if (ta) ta.focus();
    }, 300);
  }

  function setComposerType(type) {
    G.composerType = type;
    qsa('.ctype').forEach(function (btn) {
      btn.classList.toggle('ctype-active', btn.getAttribute('data-type') === type);
    });
    // Masquer toutes les options
    qsa('.composer-type-opts').forEach(function (el) { el.classList.add('hidden'); });
    // Afficher les options du type sélectionné
    var optsMap = {
      burn:   'burnOptions',
      battle: 'battleOptions',
      poll:   'pollOptions',
      thread: 'threadOptions',
      media:  'mediaOptions'
    };
    if (optsMap[type]) show(optsMap[type]);
    // Placeholder adapté
    var placeholders = {
      confession: 'Dis ce que tu veux vraiment dire...',
      csdpm:      'Ça Se Dit Pas Mais...',
      whisper:    'Écris ton whisper — il sera flouté par défaut...',
      battle:     'Pose ta question pour le battle...',
      burn:       'Ce post brûlera automatiquement...',
      media:      'Légende de ta photo (optionnel)...',
      poll:       'Pose ta question...',
      thread:     'Partie 1 de ton thread...'
    };
    var ta = qs('#composerText');
    if (ta) ta.placeholder = placeholders[type] || 'Écris...';
  }

  function publishPost() {
    if (!G.user) return;
    var text = qs('#composerText').value.trim();
    if (!text && G.composerType !== 'media') {
      showToast('Écris quelque chose d\'abord', 'info');
      return;
    }

    hide('composerOverlay');
    openPacte(function () {
      doPublishPost(text);
    });
  }

  function doPublishPost(text) {
    var hashtags = extractHashtags(qs('#hashtagInput').value + ' ' + text);
    var identity = resolveIdentity();

    var postData = {
      type:          G.composerType,
      content:       text,
      authorId:      G.user.uid,
      authorDisplay: identity.display,
      authorAnonymity: G.composerAnon,
      authorPhotoURL:  identity.photoURL,
      isAnonymous:   G.composerAnon === 'anon',
      isCertified:   G.user.isCertified,
      hashtags:      hashtags,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      reactions:     { fire: 0, skull: 0, cry: 0, zap: 0 },
      commentCount:  0,
      viewCount:     0,
      heatScore:     0,
      isExpired:     false,
      isPinned:      false
    };

    // Données spécifiques par type
    if (G.composerType === 'burn') {
      postData.maxViews = G.burnMaxViews;
      postData.expiresAt = new Date(Date.now() + G.burnTimer * 1000);
    }
    if (G.composerType === 'battle') {
      var opts = collectBattleOptions();
      if (opts.length < 2) { showToast('Ajoute au moins 2 options', 'info'); return; }
      postData.battleOptions = opts;
      postData.battleEndsAt  = new Date(Date.now() + G.battleDuration * 1000);
    }
    if (G.composerType === 'poll') {
      var popts = collectPollOptions();
      if (popts.length < 2) { showToast('Ajoute au moins 2 options', 'info'); return; }
      postData.pollOptions = popts;
      postData.pollEndsAt  = new Date(Date.now() + G.pollDuration * 1000);
    }
    if (G.composerType === 'thread') {
      var parts = collectThreadParts(text);
      postData.parts = parts;
    }
    if (G.composerType === 'media' && G.mediaFileUrl) {
      postData.mediaUrl = G.mediaFileUrl;
    }

    db.collection('posts').add(postData).then(function (ref) {
      showToast('Post publié 🔥', 'success');
      resetComposer();
      G.user.postCount = (G.user.postCount || 0) + 1;
      db.collection('users').doc(G.user.uid).update({
        postCount: firebase.firestore.FieldValue.increment(1),
        points:    firebase.firestore.FieldValue.increment(10)
      });
      setTextContent('#statPosts',   G.user.postCount);
      setTextContent('#ppStatPosts', G.user.postCount);
      if (G.user.postCount >= 5) show('auraMsg');
      loadFeed(true);
    }).catch(function (err) {
      showToast('Erreur de publication', 'error');
      console.error(err);
    });
  }

  function resolveIdentity() {
    if (G.composerAnon === 'anon') {
      return { display: 'Anonyme', photoURL: null };
    }
    if (G.composerAnon === 'mystery') {
      return { display: G.user.displayName, photoURL: null };
    }
    return { display: G.user.displayName, photoURL: G.user.photoURL };
  }

  function collectBattleOptions() {
    var inputs = qsa('#battleOptsList .battle-opt-input');
    var opts   = [];
    inputs.forEach(function (inp, i) {
      var val = inp.value.trim();
      if (val) opts.push({ id: 'opt'+i, label: val, votes: 0 });
    });
    return opts;
  }

  function collectPollOptions() {
    var inputs = qsa('#pollOptsList .poll-opt-input');
    var opts   = [];
    inputs.forEach(function (inp, i) {
      var val = inp.value.trim();
      if (val) opts.push({ id: 'opt'+i, label: val, votes: 0 });
    });
    return opts;
  }

  function collectThreadParts(firstPart) {
    var parts = [firstPart];
    qsa('#threadPartsList textarea').forEach(function (ta) {
      var v = ta.value.trim();
      if (v) parts.push(v);
    });
    return parts;
  }

  function resetComposer() {
    qs('#composerText').value    = '';
    qs('#hashtagInput').value    = '';
    qs('#composerCharCount').textContent = '0';
    G.mediaFileUrl  = null;
    G.mediaFileBlob = null;
    G.gifSelected   = null;
    hide('mediaPreview');
    show('mediaUploadZone');
    setComposerType('confession');
  }

  /* ══════════════════════════════════════════════════════════
     26. UPLOAD MÉDIA — Cloudinary
  ══════════════════════════════════════════════════════════ */
  function uploadToCloudinary(file, progressId, fillId, labelId, callback) {
    // Compresser l'image côté client
    compressImage(file, 1200, 0.85, function (blob) {
      var fd = new FormData();
      fd.append('file',    blob);
      fd.append('upload_preset', CLOUDINARY_PRESET);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/image/upload');

      xhr.upload.onprogress = function (e) {
        if (!e.lengthComputable) return;
        var pct = Math.round((e.loaded / e.total) * 100);
        show(progressId);
        setStyle('#'+fillId,  'width', pct + '%');
        setTextContent('#'+labelId, pct + '%');
      };

      xhr.onload = function () {
        hide(progressId);
        if (xhr.status === 200) {
          var res = JSON.parse(xhr.responseText);
          callback(null, res.secure_url);
        } else {
          callback(new Error('Upload échoué'), null);
        }
      };

      xhr.onerror = function () {
        hide(progressId);
        callback(new Error('Erreur réseau'), null);
      };

      xhr.send(fd);
    });
  }

  function compressImage(file, maxWidth, quality, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img    = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var ratio  = Math.min(maxWidth / img.width, 1);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(callback, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ══════════════════════════════════════════════════════════
     27. PHOTO PROFIL — Cloudinary
  ══════════════════════════════════════════════════════════ */
  function uploadProfilePhoto(file) {
    show('ppUploadProgress');
    uploadToCloudinary(file, 'ppUploadProgress', 'ppUploadFill', 'ppUploadLabel', function (err, url) {
      hide('ppUploadProgress');
      if (err) { showToast('Erreur upload', 'error'); return; }
      G.user.photoURL = url;
      db.collection('users').doc(G.user.uid).update({ photoURL: url });
      auth.currentUser.updateProfile({ photoURL: url }).catch(function () {});
      renderProfile();
      showToast('Photo mise à jour ✓', 'success');
    });
  }

  /* ══════════════════════════════════════════════════════════
     28. GIF — Tenor API
  ══════════════════════════════════════════════════════════ */
  function searchGif(query) {
    if (!query.trim()) return;
    var url = 'https://tenor.googleapis.com/v2/search?q='
      + encodeURIComponent(query)
      + '&key=' + TENOR_API_KEY
      + '&limit=12&media_filter=gif';

    fetch(url).then(function (r) { return r.json(); })
      .then(function (data) {
        var container = qs('#gifResults');
        container.innerHTML = '';
        show('gifResults');
        (data.results || []).forEach(function (gif) {
          var url   = gif.media_formats && gif.media_formats.tinygif ? gif.media_formats.tinygif.url : '';
          var full  = gif.media_formats && gif.media_formats.gif     ? gif.media_formats.gif.url     : url;
          if (!url) return;
          var img = document.createElement('img');
          img.src = url;
          img.className = 'gif-thumb';
          img.loading   = 'lazy';
          img.addEventListener('click', function () {
            G.gifSelected   = full;
            G.mediaFileUrl  = full;
            var prev = qs('#mediaPreview');
            var pimg = qs('#mediaPreviewImg');
            if (pimg) pimg.src = url;
            show('mediaPreview');
            hide('gifResults');
            hide('mediaUploadZone');
            showToast('GIF sélectionné', 'success');
          });
          container.appendChild(img);
        });
      }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     29. STORIES — chargement + viewer
  ══════════════════════════════════════════════════════════ */
  function loadStories() {
    var since = new Date(Date.now() - 86400000); // 24h
    db.collectionGroup('items')
      .where('expiresAt', '>', firebase.firestore.Timestamp.fromDate(since))
      .orderBy('expiresAt', 'desc')
      .limit(20)
      .get()
      .then(function (snap) {
        // Grouper par uid
        var byUid = {};
        snap.forEach(function (doc) {
          var uid  = doc.ref.parent.parent.id;
          if (!byUid[uid]) byUid[uid] = [];
          var d = doc.data();
          d.id  = doc.id;
          d.uid = uid;
          byUid[uid].push(d);
        });

        var row = qs('#storiesRow');
        // Garder le bouton créer story
        var createBtn = qs('#createStoryBtn');
        row.innerHTML = '';
        row.appendChild(createBtn);

        G.storyList = [];
        Object.keys(byUid).forEach(function (uid) {
          var items = byUid[uid];
          G.storyList.push({ uid: uid, items: items });

          var item     = items[0];
          var storyEl  = document.createElement('div');
          storyEl.className = 'story-item';

          var avHtml = generateAvatar(uid, 46);
          var isMe   = uid === (G.user && G.user.uid);
          var name   = isMe ? 'Moi' : (item.authorDisplay || 'Anonyme');

          storyEl.innerHTML = '<div class="story-ring story-ring-active">'
            + '<div class="story-inner">' + avHtml + '</div>'
            + '</div>'
            + '<span class="story-name">' + escHtml(name) + '</span>';

          var storyIdx = G.storyList.length - 1;
          storyEl.addEventListener('click', function () {
            openStoryViewer(storyIdx);
          });
          row.appendChild(storyEl);
        });
      }).catch(function () {});
  }

  function openStoryViewer(groupIdx) {
    G.storyIndex = groupIdx;
    show('storyViewer');
    renderCurrentStory();
  }

  function renderCurrentStory() {
    var group = G.storyList[G.storyIndex];
    if (!group) { closeStoryViewer(); return; }
    var item = group.items[0];
    if (!item) { closeStoryViewer(); return; }

    // Progress bars
    var barsEl = qs('#storyProgressBars');
    barsEl.innerHTML = '';
    G.storyList.forEach(function (g, idx) {
      var bar = document.createElement('div');
      bar.className = 'story-progress-bar';
      var fill = document.createElement('div');
      fill.className = 'story-progress-fill';
      if (idx < G.storyIndex) fill.style.width = '100%';
      bar.appendChild(fill);
      barsEl.appendChild(bar);
    });

    // Animer la barre courante
    var currentBar = barsEl.children[G.storyIndex];
    var fill = currentBar ? currentBar.querySelector('.story-progress-fill') : null;
    if (fill) {
      fill.style.width = '0%';
      fill.style.transition = 'width 5s linear';
      requestAnimationFrame(function () { fill.style.width = '100%'; });
    }

    // Contenu
    var content = qs('#storyContent');
    if (item.type === 'media' && item.mediaUrl) {
      content.innerHTML = '<img src="'+escHtml(item.mediaUrl)+'" class="story-img" alt="story">';
    } else {
      var bgs = {
        bg1: 'linear-gradient(135deg,#5B8EF4,#8B5CF6)',
        bg2: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
        bg3: 'linear-gradient(135deg,#F59E0B,#EC4899)',
        bg4: 'linear-gradient(135deg,#10B981,#5B8EF4)',
        bg5: 'linear-gradient(135deg,#EF4444,#F59E0B)'
      };
      var bg = bgs[item.bg] || bgs.bg1;
      content.innerHTML = '<div class="story-text-card" style="background:'+bg+'">'
        + '<div class="story-text-content">' + escHtml(item.content || '') + '</div>'
        + '</div>';
    }

    // Header
    setHTML('#storyViewerAvatar', generateAvatar(group.uid, 36));
    setTextContent('#storyViewerName', item.authorDisplay || 'Anonyme');
    setTextContent('#storyViewerTime', timeAgo(item.createdAt));

    // Auto next après 5s
    clearTimeout(G.storyTimer);
    G.storyTimer = setTimeout(function () { storyNext(); }, 5000);
  }

  function storyPrev() {
    clearTimeout(G.storyTimer);
    if (G.storyIndex > 0) { G.storyIndex--; renderCurrentStory(); }
    else closeStoryViewer();
  }

  function storyNext() {
    clearTimeout(G.storyTimer);
    if (G.storyIndex < G.storyList.length - 1) { G.storyIndex++; renderCurrentStory(); }
    else closeStoryViewer();
  }

  function closeStoryViewer() {
    clearTimeout(G.storyTimer);
    hide('storyViewer');
  }

  function publishStory() {
    if (!G.user) return;
    var stype = qs('.story-type-btn.story-type-active');
    var type  = stype ? stype.getAttribute('data-stype') : 'text';
    var text  = qs('#storyText').value.trim();
    var bg    = (qs('.story-bg-opt.story-bg-active') || {}).getAttribute ? qs('.story-bg-opt.story-bg-active').getAttribute('data-bg') : 'bg1';
    var expiresAt = new Date(Date.now() + 86400000);

    if (type === 'text' && !text) { showToast('Écris quelque chose', 'info'); return; }

    var storyData = {
      type:          type,
      content:       text,
      bg:            bg,
      authorId:      G.user.uid,
      authorDisplay: G.user.displayName,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt:     expiresAt
    };

    db.collection('stories').doc(G.user.uid).collection('items').add(storyData)
      .then(function () {
        hide('createStoryOverlay');
        qs('#storyText').value = '';
        loadStories();
        showToast('Story publiée ✓', 'success');
      }).catch(function () { showToast('Erreur', 'error'); });
  }

  /* ══════════════════════════════════════════════════════════
     30. TRENDING — hashtags + filtre feed
  ══════════════════════════════════════════════════════════ */
  function loadTrending() {
    db.collection('trending').orderBy('count','desc').limit(8).get()
      .then(function (snap) {
        var list = qs('#trendingList');
        if (!list) return;
        list.innerHTML = '';
        if (snap.empty) {
          list.innerHTML = '<div class="empty-state">Aucun trend</div>';
          return;
        }
        var maxCount = 1;
        snap.forEach(function (doc) {
          maxCount = Math.max(maxCount, doc.data().count || 1);
        });
        snap.forEach(function (doc) {
          var d    = doc.data();
          var pct  = Math.round((d.count || 0) / maxCount * 100);
          var item = document.createElement('div');
          item.className = 'trend-item';
          item.innerHTML = '<div>'
            + '<div class="trend-tag">#' + escHtml(d.tag || doc.id) + '</div>'
            + '<div class="trend-bar" style="width:'+pct+'%"></div>'
            + '</div>'
            + '<div class="trend-count">' + formatCount(d.count || 0) + '</div>';
          item.addEventListener('click', function () {
            setTagFilter(d.tag || doc.id);
          });
          list.appendChild(item);
        });
      }).catch(function () {});
  }

  function setTagFilter(tag) {
    G.activeTag = tag;
    setTextContent('#tagFilterLabel', '#' + tag);
    show('tagFilterBar');
    loadFeed(true);
    showToast('Filtre : #' + tag, 'info');
  }

  function clearTagFilter() {
    G.activeTag = null;
    hide('tagFilterBar');
    loadFeed(true);
  }

  /* ══════════════════════════════════════════════════════════
     31. CSDPM DU JOUR
  ══════════════════════════════════════════════════════════ */
  function loadCsdpmDuJour() {
    var today = new Date().toISOString().split('T')[0];
    db.collection('csdpm_daily').where('date','==',today).limit(1).get()
      .then(function (snap) {
        if (snap.empty) {
          setTextContent('#csdpmQuestion', 'Aucun CSDPM aujourd\'hui');
          return;
        }
        var d = snap.docs[0].data();
        setTextContent('#csdpmQuestion', d.question || '');
        // Écoute temps réel du compteur
        snap.docs[0].ref.onSnapshot(function (doc) {
          var data = doc.data();
          setTextContent('#csdpmCount', formatCount(data.replyCount || 0));
        });
      }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     32. VIBE DU MOMENT — agrégation réactions 30min
  ══════════════════════════════════════════════════════════ */
  function computeVibe() {
    var since = new Date(Date.now() - 1800000);
    db.collection('posts').where('heatUpdatedAt', '>', since).get()
      .then(function (snap) {
        var counts = { fire: 0, skull: 0, cry: 0, zap: 0 };
        snap.forEach(function (doc) {
          var r = doc.data().reactions || {};
          counts.fire  += r.fire  || 0;
          counts.skull += r.skull || 0;
          counts.cry   += r.cry   || 0;
          counts.zap   += r.zap   || 0;
        });
        var dominant = Object.keys(counts).reduce(function (a, b) {
          return counts[a] >= counts[b] ? a : b;
        });
        var vibeMap = {
          fire:  { emoji: '🔥', text: 'Ambiance feu ce soir' },
          skull: { emoji: '💀', text: 'Ce soir SIS est en mode 💀' },
          cry:   { emoji: '😭', text: 'Soir de confessions lourdes' },
          zap:   { emoji: '⚡', text: 'Drama en cours ce soir' }
        };
        var vibe = vibeMap[dominant] || { emoji: '🌊', text: 'Soirée deep & silencieuse' };
        setTextContent('#vibeEmoji', vibe.emoji);
        setTextContent('#vibeText',  vibe.text);
      }).catch(function () {});
  }

  function startVibeInterval() {
    computeVibe();
    setInterval(computeVibe, 300000); // toutes les 5 min
  }

  /* ══════════════════════════════════════════════════════════
     33. CONFESSION ROULETTE
  ══════════════════════════════════════════════════════════ */
  function openRoulette() {
    show('rouletteOverlay');
    loadNextRoulette();
  }

  function loadNextRoulette() {
    loadRandomPost(function (post) {
      var el = qs('#roulettePost');
      if (!el) return;
      if (!post) {
        el.innerHTML = '<div class="roulette-empty">Aucun post disponible</div>';
        return;
      }
      el.innerHTML = '<div class="roulette-post-card">'
        + '<div class="roulette-post-text">' + escHtml((post.content || '').slice(0, 300)) + '</div>'
        + '<div class="roulette-post-meta">' + escHtml(post.authorDisplay || 'Anonyme') + ' · ' + timeAgo(post.createdAt) + '</div>'
        + '</div>';
    });
  }

  /* ══════════════════════════════════════════════════════════
     34. RECHERCHE
  ══════════════════════════════════════════════════════════ */
  function handleSearch(query) {
    G.searchQuery = query.trim();
    qs('#searchClear').style.display = G.searchQuery ? '' : 'none';
    loadFeed(true);
  }

  /* ══════════════════════════════════════════════════════════
     35. NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */
  var localNotifications = [];

  function addNotification(n) {
    n.id  = Date.now() + Math.random();
    n.at  = new Date();
    localNotifications.unshift(n);
    renderNotifications();
    show('notifBadge');
    show('bnNotifDot');
  }

  function addRemoteNotification(toUid, type, postId) {
    // Écrire dans Firestore pour l'autre utilisateur
    db.collection('users').doc(toUid).collection('notifications').add({
      type:    type,
      postId:  postId,
      fromUid: G.user ? G.user.uid : null,
      read:    false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function () {});
  }

  function loadNotifications() {
    if (!G.user) return;
    db.collection('users').doc(G.user.uid).collection('notifications')
      .where('read','==',false)
      .orderBy('createdAt','desc')
      .limit(20)
      .onSnapshot(function (snap) {
        if (snap.empty) return;
        snap.forEach(function (doc) {
          var d = doc.data();
          d.firestoreId = doc.id;
          var notifMsg = {
            heard:        'Quelqu\'un t\'a entendu.',
            first_reactor:'Tu es le premier réacteur 👁️',
            echo:         'Quelqu\'un a echoed ton post'
          }[d.type] || 'Nouvelle notification';
          localNotifications.unshift({ msg: notifMsg, at: d.createdAt ? d.createdAt.toDate() : new Date() });
        });
        renderNotifications();
        if (localNotifications.length > 0) {
          show('notifBadge');
          show('bnNotifDot');
        }
      });
  }

  function renderNotifications() {
    var list = qs('#notifList');
    if (!list) return;
    if (localNotifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">Aucune notification</div>';
      return;
    }
    list.innerHTML = localNotifications.slice(0, 15).map(function (n) {
      var icons = { heard: '🔥', first_reactor: '👁️', echo: '↩', aura: '✨', streak: '🔥' };
      var icon  = icons[n.type] || '🔔';
      return '<div class="notif-item">'
        + '<div class="notif-icon">' + icon + '</div>'
        + '<div class="notif-body">'
        +   '<div class="notif-msg">' + escHtml(n.msg || '') + '</div>'
        +   '<div class="notif-time">' + timeAgo(n.at) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     36. SIGNALEMENT
  ══════════════════════════════════════════════════════════ */
  var currentReportPostId = null;
  var selectedReason      = null;

  function openReport(postId) {
    currentReportPostId = postId;
    selectedReason      = null;
    qs('#reportSubmitBtn').classList.add('hidden');
    qsa('.report-reason').forEach(function (btn) { btn.classList.remove('report-reason-active'); });
    show('reportOverlay');
  }

  function submitReport() {
    if (!currentReportPostId || !selectedReason || !G.user) return;
    db.collection('reports').add({
      postId:     currentReportPostId,
      reporterId: G.user.uid,
      reason:     selectedReason,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      hide('reportOverlay');
      showToast('Signalement envoyé', 'success');
    }).catch(function () { showToast('Erreur', 'error'); });
  }

  /* ══════════════════════════════════════════════════════════
     37. ECHO — reshare interne
  ══════════════════════════════════════════════════════════ */
  var currentEchoPost = null;

  function openEcho(post) {
    currentEchoPost = post;
    var preview = qs('#echoOriginalPreview');
    if (preview) {
      preview.innerHTML = '<div class="echo-orig-text">'
        + escHtml((post.content || '').slice(0, 150))
        + '</div>';
    }
    qs('#echoText').value = '';
    qs('#echoCharCount').textContent = '0';
    show('echoOverlay');
  }

  function publishEcho() {
    if (!currentEchoPost || !G.user) return;
    var comment = qs('#echoText').value.trim();
    var identity = { display: G.user.displayName };
    if (G.echoAnon === 'anon') identity.display = 'Anonyme';

    var echoData = {
      type:          'echo',
      echoOf:        currentEchoPost.id,
      echoContent:   (currentEchoPost.content || '').slice(0, 150),
      content:       comment,
      authorId:      G.user.uid,
      authorDisplay: identity.display,
      isAnonymous:   G.echoAnon === 'anon',
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      reactions:     { fire: 0, skull: 0, cry: 0, zap: 0 },
      commentCount:  0,
      viewCount:     0,
      heatScore:     0,
      isExpired:     false,
      hashtags:      currentEchoPost.hashtags || []
    };

    db.collection('posts').add(echoData).then(function () {
      hide('echoOverlay');
      showToast('Echo publié ↩', 'success');
      loadFeed(true);
    }).catch(function () { showToast('Erreur', 'error'); });
  }

  /* ══════════════════════════════════════════════════════════
     38. PARTAGE — Web Share API + clipboard
  ══════════════════════════════════════════════════════════ */
  function sharePost(post) {
    var url  = window.location.origin + '/sisfeed.html?postId=' + post.id;
    var text = (post.content || '').slice(0, 100);
    if (navigator.share) {
      navigator.share({ title: 'SISfeed', text: text, url: url })
        .catch(function () {});
    } else {
      copyToClipboard(url);
      showToast('Lien copié 🔗', 'success');
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  /* ══════════════════════════════════════════════════════════
     39. SUPPRIMER / MASQUER / ÉPINGLER
  ══════════════════════════════════════════════════════════ */
  function deletePost(postId) {
    if (!G.user) return;
    if (!confirm('Supprimer ce post définitivement ?')) return;
    db.collection('posts').doc(postId).update({ isExpired: true })
      .then(function () {
        var el = qs('[data-id="'+postId+'"]');
        if (el) {
          el.style.opacity    = '0';
          el.style.height     = '0';
          el.style.margin     = '0';
          el.style.padding    = '0';
          el.style.overflow   = 'hidden';
          el.style.transition = 'all .3s';
          setTimeout(function () { el.remove(); }, 300);
        }
        showToast('Post supprimé', 'success');
      }).catch(function () { showToast('Erreur', 'error'); });
  }

  function hidePost(postId) {
    G.hiddenPosts.push(postId);
    localStorage.setItem('sis-hidden-posts', JSON.stringify(G.hiddenPosts));
    var el = qs('[data-id="'+postId+'"]');
    if (el) {
      el.style.opacity    = '0';
      el.style.height     = '0';
      el.style.margin     = '0';
      el.style.padding    = '0';
      el.style.overflow   = 'hidden';
      el.style.transition = 'all .3s';
      setTimeout(function () { el.remove(); }, 300);
    }
    showToast('Post masqué', 'info');
  }

  function pinPost(postId) {
    db.collection('posts').doc(postId).update({ isPinned: true })
      .then(function () { showToast('Post épinglé 📌', 'success'); })
      .catch(function () {});
  }

  function hiddenPostsFromStorage() {
    var saved = localStorage.getItem('sis-hidden-posts');
    if (saved) {
      try { G.hiddenPosts = JSON.parse(saved); } catch (e) {}
    }
  }

  /* ══════════════════════════════════════════════════════════
     40. INFINITE SCROLL — IntersectionObserver
  ══════════════════════════════════════════════════════════ */
  function initScroll() {
    var sentinel = qs('#scrollSentinel');
    if (!sentinel) return;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !G.allLoaded && !G.loadingMore) {
        loadFeed();
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);

    // Scroll to top button
    window.addEventListener('scroll', function () {
      var btn = qs('#scrollTopBtn');
      if (btn) btn.classList.toggle('hidden', window.scrollY < 300);
    });
  }

  /* ══════════════════════════════════════════════════════════
     41. PULL TO REFRESH (mobile)
  ══════════════════════════════════════════════════════════ */
  var pullStartY    = 0;
  var pullDist      = 0;
  var pullTriggered = false;

  document.addEventListener('touchstart', function (e) {
    if (window.scrollY === 0) pullStartY = e.touches[0].pageY;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!pullStartY) return;
    pullDist = e.touches[0].pageY - pullStartY;
    if (pullDist > 60 && !pullTriggered) {
      pullTriggered = true;
    }
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (pullTriggered) {
      showToast('Actualisation...', 'info');
      loadFeed(true);
    }
    pullStartY    = 0;
    pullDist      = 0;
    pullTriggered = false;
  });

  /* ══════════════════════════════════════════════════════════
     42. NOUVEAUX POSTS disponibles
  ══════════════════════════════════════════════════════════ */
  function checkNewPosts() {
    // Écouter les nouveaux posts en temps réel
    var lastLoad = new Date();
    var unsub = db.collection('posts')
      .where('createdAt', '>', lastLoad)
      .onSnapshot(function (snap) {
        if (snap.empty) return;
        G.newPostsQueue += snap.size;
        var banner = qs('#newPostsBanner');
        if (banner) {
          setTextContent('#newPostsCount', G.newPostsQueue + ' nouveau' + (G.newPostsQueue > 1 ? 'x posts' : ' post'));
          banner.classList.remove('hidden');
          banner.onclick = function () {
            G.newPostsQueue = 0;
            banner.classList.add('hidden');
            loadFeed(true);
          };
        }
      });
    G.listeners.push(unsub);
  }

  /* ══════════════════════════════════════════════════════════
     43. TOP SEMAINE
  ══════════════════════════════════════════════════════════ */
  function loadTopWeek() {
    var since = new Date(Date.now() - 7 * 86400000);
    db.collection('posts')
      .where('createdAt', '>', since)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
      .then(function (snap) {
        var posts = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          d.id  = doc.id;
          var r = d.reactions || {};
          d._total = (r.fire || 0) + (r.skull || 0) + (r.cry || 0) + (r.zap || 0);
          posts.push(d);
        });
        posts.sort(function (a, b) { return b._total - a._total; });
        var top5 = posts.slice(0, 5);

        var list = qs('#topList');
        if (!list) return;
        list.innerHTML = '';
        top5.forEach(function (p, i) {
          var el   = document.createElement('div');
          el.className = 'top-item';
          var r    = p.reactions || {};
          var total = r.fire + r.skull + r.cry + r.zap;
          el.innerHTML = '<div class="top-n' + (i === 0 ? ' top-gold' : '') + '">' + (i+1) + '</div>'
            + '<div>'
            +   '<div class="top-text">' + escHtml((p.content || '').slice(0, 60)) + '...</div>'
            +   '<div class="top-reactions">🔥 ' + formatCount(r.fire||0) + ' · 💀 ' + formatCount(r.skull||0) + ' · ' + total + ' total</div>'
            + '</div>';
          el.addEventListener('click', function () {
            var postEl = qs('[data-id="'+p.id+'"]');
            if (postEl) postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          list.appendChild(el);
        });
      }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     44. MOOD DU JOUR
  ══════════════════════════════════════════════════════════ */
  function loadMoodDuJour() {
    var mots = ['Silence','Trahison','Gloire','Manque','Courage','Fierté','Regret','Espoir'];
    var today = new Date().getDate();
    var mot   = mots[today % mots.length];
    setTextContent('#moodWord', mot);
  }

  /* ══════════════════════════════════════════════════════════
     45. HASHTAG SUGGESTIONS dans le composer
  ══════════════════════════════════════════════════════════ */
  function loadHashtagSuggestions(input) {
    if (!input.trim()) { hide('hashtagSuggestions'); return; }
    db.collection('trending').orderBy('count','desc').limit(6).get()
      .then(function (snap) {
        var suggestions = [];
        snap.forEach(function (doc) {
          var tag = doc.data().tag || doc.id;
          if (tag.toLowerCase().indexOf(input.toLowerCase()) !== -1) {
            suggestions.push(tag);
          }
        });
        var el = qs('#hashtagSuggestions');
        if (!suggestions.length) { hide('hashtagSuggestions'); return; }
        el.innerHTML = suggestions.map(function (s) {
          return '<span class="hashtag-suggest" data-tag="'+escAttr(s)+'">#'+escHtml(s)+'</span>';
        }).join('');
        show('hashtagSuggestions');
        el.querySelectorAll('.hashtag-suggest').forEach(function (s) {
          s.addEventListener('click', function () {
            var current = qs('#hashtagInput').value;
            qs('#hashtagInput').value = current + '#' + s.getAttribute('data-tag') + ' ';
            hide('hashtagSuggestions');
          });
        });
      }).catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     46. INTERACTIONS POST — event delegation
  ══════════════════════════════════════════════════════════ */
  function bindPostInteractions(el, post) {
    bindReadMore(el);
    bindWhisper(el, post);
    bindThread(el);

    // Réactions
    el.querySelectorAll('.reaction-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var key = btn.getAttribute('data-reaction');
        handleReaction(el, post, key);
      });
    });

    // Actions (comment, echo, share)
    el.querySelectorAll('.act-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        if (action === 'comment') openComments(post);
        if (action === 'echo')    openEcho(post);
        if (action === 'share')   sharePost(post);
      });
    });

    // Battle vote
    el.querySelectorAll('.battle-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var id = opt.getAttribute('data-optid');
        voteBattle(el, post, id);
      });
    });

    // Poll vote
    el.querySelectorAll('.poll-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var id = opt.getAttribute('data-optid');
        votePoll(el, post, id);
      });
    });

    // Hashtag click
    el.querySelectorAll('.tag').forEach(function (tag) {
      tag.addEventListener('click', function () {
        setTagFilter(tag.getAttribute('data-tag'));
      });
    });

    // Menu post
    var menuBtn  = el.querySelector('[data-action="menu"]');
    var menuEl   = el.querySelector('.post-menu');
    if (menuBtn && menuEl) {
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = menuEl.classList.contains('post-menu-open');
        document.querySelectorAll('.post-menu.post-menu-open').forEach(function (m) {
          m.classList.remove('post-menu-open');
        });
        if (!isOpen) menuEl.classList.add('post-menu-open');
      });
    }

    // Menu items
    el.querySelectorAll('.menu-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = item.getAttribute('data-action');
        if (menuEl) menuEl.classList.remove('post-menu-open');
        if (action === 'echo')   openEcho(post);
        if (action === 'share')  sharePost(post);
        if (action === 'hide')   hidePost(post.id);
        if (action === 'report') openReport(post.id);
        if (action === 'delete') deletePost(post.id);
        if (action === 'pin')    pinPost(post.id);
      });
    });

    // Vérifier réaction initiale de l'utilisateur
    if (G.user) {
      db.collection('posts').doc(post.id)
        .collection('reactors').doc(G.user.uid).get()
        .then(function (doc) {
          if (!doc.exists) return;
          var reaction = doc.data().reaction;
          var btn = el.querySelector('[data-reaction="'+reaction+'"]');
          if (btn) btn.classList.add('reaction-active');
        }).catch(function () {});
    }
  }

  /* ══════════════════════════════════════════════════════════
     47. BIND — topbar / search / nav / panels / modals
  ══════════════════════════════════════════════════════════ */
  function bindTopbar() {
    on('#themeBtn',    'click', toggleTheme);
    on('#rouletteBtn', 'click', openRoulette);
    on('#notifBtn',    'click', function () {
      qs('#notifPanel').classList.toggle('notif-panel-open');
      hide('notifBadge');
      hide('bnNotifDot');
    });
    on('#notifClear', 'click', function () {
      localNotifications = [];
      renderNotifications();
      hide('notifBadge');
      hide('bnNotifDot');
    });
    on('#fabBtn',     'click', function () { openComposer(); });
    on('#scrollTopBtn', 'click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    // Fermer notif panel en dehors
    document.addEventListener('click', function (e) {
      var np = qs('#notifPanel');
      if (np && !np.contains(e.target) && e.target !== qs('#notifBtn')) {
        np.classList.remove('notif-panel-open');
      }
      // Fermer menus posts
      if (!e.target.closest('.post-menu-wrap')) {
        qsa('.post-menu.post-menu-open').forEach(function (m) { m.classList.remove('post-menu-open'); });
      }
    });
  }

  function bindSearch() {
    var input = qs('#searchInput');
    var clear = qs('#searchClear');
    if (!input) return;
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { handleSearch(input.value); }, 400);
    });
    if (clear) {
      clear.addEventListener('click', function () {
        input.value   = '';
        G.searchQuery = '';
        clear.style.display = 'none';
        loadFeed(true);
      });
    }
  }

  function bindFeedTabs() {
    qsa('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        qsa('.tab').forEach(function (t) { t.classList.remove('tab-active'); });
        tab.classList.add('tab-active');
        G.feedTab = tab.getAttribute('data-tab');
        loadFeed(true);
      });
    });
  }

  function bindMoodPills() {
    qsa('.pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        pill.classList.toggle('pill-active');
        var mood = pill.getAttribute('data-mood');
        var idx  = G.activeMoods.indexOf(mood);
        if (idx === -1) G.activeMoods.push(mood);
        else G.activeMoods.splice(idx, 1);
        loadFeed(true);
      });
    });
  }

  function bindTagFilter() {
    on('#tagFilterClose', 'click', clearTagFilter);
  }

  function bindBottomNav() {
    on('#bnCreateBtn', 'click', function () { openComposer(); });
    on('#bnProfilBtn', 'click', openProfilPanel);

    var notifBnBtn = qs('.bn-notif-btn');
    if (notifBnBtn) {
      notifBnBtn.addEventListener('click', function () {
        qs('#notifPanel').classList.toggle('notif-panel-open');
        hide('notifBadge');
        hide('bnNotifDot');
      });
    }

    qsa('.bn-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.bn-btn').forEach(function (b) { b.classList.remove('bn-active'); });
        btn.classList.add('bn-active');
      });
    });
  }

  function bindComposer() {
    on('#composerClose', 'click', function () { hide('composerOverlay'); });
    on('#composerOverlay', 'click', function (e) {
      if (e.target === qs('#composerOverlay')) hide('composerOverlay');
    });
    on('#publishBtn', 'click', publishPost);
    on('#rouletteBtn2', 'click', openRoulette);
    on('#csdpmReplyBtn', 'click', function () { openComposer('csdpm'); });

    // Tabs type
    qsa('.ctype').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setComposerType(btn.getAttribute('data-type'));
      });
    });

    // Anon opts composer
    qsa('#anonOpts .anon-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('#anonOpts .anon-opt').forEach(function (b) { b.classList.remove('anon-active'); });
        btn.classList.add('anon-active');
        G.composerAnon = btn.getAttribute('data-anon');
      });
    });

    // Char counter
    on('#composerText', 'input', function () {
      setTextContent('#composerCharCount', qs('#composerText').value.length);
    });

    // Chips Burn
    on('#burnViewsChips', 'click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      qsa('#burnViewsChips .chip').forEach(function (c) { c.classList.remove('chip-active'); });
      chip.classList.add('chip-active');
      G.burnMaxViews = parseInt(chip.getAttribute('data-val'));
    });
    on('#burnTimerChips', 'click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      qsa('#burnTimerChips .chip').forEach(function (c) { c.classList.remove('chip-active'); });
      chip.classList.add('chip-active');
      G.burnTimer = parseInt(chip.getAttribute('data-val'));
    });
    on('#battleDurChips', 'click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      qsa('#battleDurChips .chip').forEach(function (c) { c.classList.remove('chip-active'); });
      chip.classList.add('chip-active');
      G.battleDuration = parseInt(chip.getAttribute('data-val'));
    });

    // Battle add option
    on('#addBattleOpt', 'click', function () {
      var rows = qsa('#battleOptsList .battle-opt-input-row');
      if (rows.length >= 4) { showToast('Maximum 4 options', 'info'); return; }
      var labels = ['Option C','Option D'];
      var newRow = document.createElement('div');
      newRow.className = 'battle-opt-input-row';
      newRow.innerHTML = '<input type="text" class="battle-opt-input" placeholder="'+labels[rows.length - 2]+'" maxlength="80">'
        + '<button class="battle-opt-remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
      qs('#battleOptsList').appendChild(newRow);
      newRow.querySelector('.battle-opt-remove').addEventListener('click', function () { newRow.remove(); });
    });

    // Poll add option
    on('#addPollOpt', 'click', function () {
      var rows = qsa('#pollOptsList .poll-opt-input-row');
      if (rows.length >= 4) { showToast('Maximum 4 options', 'info'); return; }
      var labels = ['Option C','Option D'];
      var newRow = document.createElement('div');
      newRow.className = 'poll-opt-input-row';
      newRow.innerHTML = '<input type="text" class="poll-opt-input" placeholder="'+labels[rows.length - 2]+'" maxlength="60">'
        + '<button class="poll-opt-remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
      qs('#pollOptsList').appendChild(newRow);
      newRow.querySelector('.poll-opt-remove').addEventListener('click', function () { newRow.remove(); });
    });

    // Thread add part
    on('#addThreadPart', 'click', function () {
      var ta = document.createElement('textarea');
      ta.className   = 'composer-textarea';
      ta.maxLength   = 500;
      ta.placeholder = 'Partie ' + (qsa('#threadPartsList textarea').length + 2) + '...';
      qs('#threadPartsList').appendChild(ta);
    });

    // Media upload zone
    var uploadZone = qs('#mediaUploadZone');
    if (uploadZone) {
      uploadZone.addEventListener('click', function () { qs('#mediaFileInput').click(); });
      uploadZone.addEventListener('dragover', function (e) { e.preventDefault(); uploadZone.classList.add('drag-over'); });
      uploadZone.addEventListener('dragleave', function () { uploadZone.classList.remove('drag-over'); });
      uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        var file = e.dataTransfer.files[0];
        if (file) handleMediaFile(file);
      });
    }
    on('#mediaFileInput', 'change', function (e) {
      if (e.target.files[0]) handleMediaFile(e.target.files[0]);
    });
    on('#mediaPreviewRemove', 'click', function () {
      G.mediaFileUrl  = null;
      G.mediaFileBlob = null;
      hide('mediaPreview');
      show('mediaUploadZone');
    });

    // GIF search
    on('#gifSearchBtn', 'click', function () {
      searchGif(qs('#gifSearchInput').value);
    });
    on('#gifSearchInput', 'keydown', function (e) {
      if (e.key === 'Enter') searchGif(qs('#gifSearchInput').value);
    });

    // Hashtag suggestions
    on('#hashtagInput', 'input', function () {
      var words  = qs('#hashtagInput').value.split(' ');
      var last   = words[words.length - 1].replace('#', '');
      if (last.length > 1) loadHashtagSuggestions(last);
      else hide('hashtagSuggestions');
    });

    // Pacte
    qsa('.pacte-react-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closePacte(btn.getAttribute('data-reaction'));
      });
    });
    on('#pacteSkip', 'click', function () { closePacte(null); });
  }

  function handleMediaFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var prev = qs('#mediaPreviewImg');
      if (prev) prev.src = e.target.result;
      show('mediaPreview');
      hide('mediaUploadZone');
    };
    reader.readAsDataURL(file);

    uploadToCloudinary(file, 'mediaUploadProgress', 'mediaUploadFill', 'mediaUploadLabel', function (err, url) {
      if (err) { showToast('Erreur upload', 'error'); return; }
      G.mediaFileUrl = url;
      showToast('Photo prête', 'success');
    });
  }

  function bindEcho() {
    on('#echoClose',      'click', function () { hide('echoOverlay'); });
    on('#echoPublishBtn', 'click', publishEcho);
    on('#echoOverlay',    'click', function (e) {
      if (e.target === qs('#echoOverlay')) hide('echoOverlay');
    });
    on('#echoText', 'input', function () {
      setTextContent('#echoCharCount', qs('#echoText').value.length);
    });
    qsa('#echoAnonOpts .anon-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('#echoAnonOpts .anon-opt').forEach(function (b) { b.classList.remove('anon-active'); });
        btn.classList.add('anon-active');
        G.echoAnon = btn.getAttribute('data-anon');
      });
    });
  }

  function bindReport() {
    on('#reportClose',     'click', function () { hide('reportOverlay'); });
    on('#reportSubmitBtn', 'click', submitReport);
    on('#reportOverlay',   'click', function (e) {
      if (e.target === qs('#reportOverlay')) hide('reportOverlay');
    });
    qsa('.report-reason').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.report-reason').forEach(function (b) { b.classList.remove('report-reason-active'); });
        btn.classList.add('report-reason-active');
        selectedReason = btn.getAttribute('data-reason');
        show('reportSubmitBtn');
      });
    });
  }

  function bindRoulette() {
    on('#rouletteClose',   'click', function () { hide('rouletteOverlay'); });
    on('#rouletteNextBtn', 'click', loadNextRoulette);
    on('#rouletteOverlay', 'click', function (e) {
      if (e.target === qs('#rouletteOverlay')) hide('rouletteOverlay');
    });
  }

  function bindStories() {
    on('#createStoryBtn', 'click', function () { show('createStoryOverlay'); });
    on('#createStoryClose','click', function () { hide('createStoryOverlay'); });
    on('#createStoryOverlay','click', function (e) {
      if (e.target === qs('#createStoryOverlay')) hide('createStoryOverlay');
    });
    on('#publishStoryBtn', 'click', publishStory);
    on('#storyViewerClose','click', closeStoryViewer);
    on('#storyTapLeft',    'click', storyPrev);
    on('#storyTapRight',   'click', storyNext);

    // Upload photo story
    var storyZone = qs('#storyUploadZone');
    if (storyZone) storyZone.addEventListener('click', function () { qs('#storyPhotoInput').click(); });
    on('#storyPhotoInput', 'change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      uploadToCloudinary(file, 'ppUploadProgress', 'ppUploadFill', 'ppUploadLabel', function (err, url) {
        if (err) { showToast('Erreur upload', 'error'); return; }
        // Stocker l'url pour la story
        qs('#storyPhotoInput').setAttribute('data-url', url);
        showToast('Photo prête', 'success');
      });
    });

    // Sélection type story
    qsa('.story-type-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.story-type-btn').forEach(function (b) { b.classList.remove('story-type-active'); });
        btn.classList.add('story-type-active');
        var stype = btn.getAttribute('data-stype');
        if (stype === 'text') {
          show('storyBgPicker'); show('storyText'); hide('storyUploadZone');
        } else {
          hide('storyBgPicker'); hide('storyText'); show('storyUploadZone');
        }
      });
    });

    // Fond story
    qsa('.story-bg-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        qsa('.story-bg-opt').forEach(function (o) { o.classList.remove('story-bg-active'); });
        opt.classList.add('story-bg-active');
      });
    });
  }

  function bindProfilPanel() {
    on('#bnProfilBtn',     'click', openProfilPanel);
    on('#profilPanelOverlay','click', closeProfilPanel);
    on('#ppGhostToggle',   'click', function () {
      setGhostMode(!G.user.ghostMode);
    });
    on('#ppThemeToggle',   'click', toggleTheme);
    on('#ppChangePhotoBtn','click', function () { qs('#profilePhotoInput').click(); });
    on('#profilePhotoInput','change', function (e) {
      if (e.target.files[0]) uploadProfilePhoto(e.target.files[0]);
    });
    on('#ppLogoutBtn', 'click', function () {
      if (!confirm('Se déconnecter ?')) return;
      // Nettoyer listeners
      G.listeners.forEach(function (u) { if (typeof u === 'function') u(); });
      auth.signOut().then(function () {
        window.location.href = 'sisauth.html';
      });
    });

    // Sidebar ghost toggle
    on('#ghostToggle', 'click', function () { setGhostMode(!G.user.ghostMode); });

    // Swipe down pour fermer le panel
    var panel     = qs('#profilPanel');
    var swipeStart = 0;
    if (panel) {
      panel.addEventListener('touchstart', function (e) { swipeStart = e.touches[0].clientY; }, { passive: true });
      panel.addEventListener('touchend',   function (e) {
        if (e.changedTouches[0].clientY - swipeStart > 60) closeProfilPanel();
      });
    }

    // Comments
    on('#commentsClose', 'click', function () {
      hide('commentsOverlay');
      if (currentCommentUnsub) { currentCommentUnsub(); currentCommentUnsub = null; }
    });
    on('#commentSendBtn', 'click', sendComment);
    on('#commentInput', 'keydown', function (e) { if (e.key === 'Enter') sendComment(); });
  }

  function openProfilPanel() {
    show('profilPanelOverlay');
    var panel = qs('#profilPanel');
    if (panel) panel.classList.add('profil-panel-open');
  }

  function closeProfilPanel() {
    hide('profilPanelOverlay');
    var panel = qs('#profilPanel');
    if (panel) panel.classList.remove('profil-panel-open');
  }

  /* ══════════════════════════════════════════════════════════
     48. UTILS
  ══════════════════════════════════════════════════════════ */
  function timeAgo(ts) {
    if (!ts) return '';
    var ms  = ts.toMillis ? ts.toMillis() : (ts instanceof Date ? ts.getTime() : ts);
    var sec = Math.floor((Date.now() - ms) / 1000);
    if (sec < 60)   return 'À l\'instant';
    if (sec < 3600) return Math.floor(sec / 60) + ' min';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h';
    if (sec < 604800) return Math.floor(sec / 86400) + 'j';
    return new Date(ms).toLocaleDateString('fr-FR');
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'Expiré';
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sc = s % 60;
    if (h > 0) return h + 'h ' + pad(m) + 'min';
    return pad(m) + ':' + pad(sc);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
    return '' + n;
  }

  function extractHashtags(text) {
    var matches = text.match(/#([a-zA-ZÀ-ÿ0-9_]+)/g) || [];
    return matches.map(function (t) { return t.slice(1).toLowerCase(); }).filter(function (t, i, arr) {
      return arr.indexOf(t) === i;
    });
  }

  function showToast(msg, type) {
    var toast   = qs('#toast');
    var msgEl   = qs('#toastMsg');
    var iconEl  = qs('#toastIcon');
    if (!toast) return;
    var icons = { success: '✓', error: '✗', info: 'ℹ' };
    var classes = { success: 'toast-success', error: 'toast-error', info: 'toast-info' };
    toast.className = 'toast toast-show ' + (classes[type] || 'toast-info');
    if (msgEl)  msgEl.textContent  = msg;
    if (iconEl) iconEl.textContent = icons[type] || '';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.className = 'toast';
    }, 3000);
  }

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function showSkeletons() {
    var list = qs('#postsList');
    if (!list) return;
    for (var i = 0; i < 3; i++) {
      var sk = document.createElement('div');
      sk.className = 'skeleton-post';
      sk.id = 'sk' + i;
      list.appendChild(sk);
    }
  }

  function hideSkeletons() {
    qsa('.skeleton-post').forEach(function (el) { el.remove(); });
  }

  function clearPosts() {
    var list = qs('#postsList');
    if (list) list.innerHTML = '';
    hide('feedEnd');
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Shortcuts DOM ── */
  function qs(sel)     { return document.querySelector(sel); }
  function qsa(sel)    { return document.querySelectorAll(sel); }
  function show(id)    { var el = typeof id === 'string' ? qs('#'+id) : id; if (el) el.classList.remove('hidden'); }
  function hide(id)    { var el = typeof id === 'string' ? qs('#'+id) : id; if (el) el.classList.add('hidden'); }
  function on(sel, ev, fn) { var el = qs(sel); if (el) el.addEventListener(ev, fn); }
  function setHTML(sel, html) { var el = qs(sel); if (el) el.innerHTML = html; }
  function setTextContent(sel, txt) { var el = qs(sel); if (el) el.textContent = txt; }
  function setStyle(sel, prop, val) { var el = qs(sel); if (el) el.style[prop] = val; }

})();
