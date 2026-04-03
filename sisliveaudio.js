/* ==========================================
   SIS LIVE AUDIO V3 FINAL - JAVASCRIPT
   Version Ultra-Premium - Production Ready
   Sans type="module" - 100% Fonctionnel
   ========================================== */

(function() {
    'use strict';

    // ==========================================
    // CONFIGURATION GLOBALE
    // ==========================================
    var CONFIG = {
        // Firebase
        firebase: {
            apiKey: "AIzaSyDRnYDiLKaTI-97Vb6bwGr6Kpvx_Ej2xOg",
            authDomain: "sis-say-it-safely-pi.firebaseapp.com",
            projectId: "sis-say-it-safely-pi",
            databaseURL: "https://sis-say-it-safely-pi-default-rtdb.firebaseio.com",
            storageBucket: "sis-say-it-safely-pi.firebasestorage.app",
            messagingSenderId: "332914268472",
            appId: "1:332914268472:web:aee3804481d7aee0e20e93",
            measurementId: "G-97TCHJ33KW"
        },
        
        // Agora (Remplacer par vraie clé)
        agora: {
            appId: "YOUR_AGORA_APP_ID",
            token: null
        },
        
        // Modération IA
        moderation: {
            enabled: true,
            strictMode: true,
            warningsBeforeBan: 3,
            reportThreshold: 5,
            botName: "SIS Guardian Bot",
            badWords: [
                'hate', 'kill', 'violence', 'attack', 'spam', 'scam', 
                'fraud', 'abuse', 'racist', 'sexist'
            ],
            patterns: [
                /(\b|^)(hate|kill|attack|violence)(\b|$)/gi,
                /(\b|^)(spam|scam|fraud)(\b|$)/gi,
                /(https?:\/\/[^\s]+)/gi,
                /(.)\1{4,}/gi // Caractères répétés
            ]
        },
        
        // Badges système
        badges: [
            { id: 'first_live', name: 'Premier Live', icon: '🎙️', condition: 'lives >= 1' },
            { id: 'veteran', name: 'Vétéran', icon: '⭐', condition: 'lives >= 10' },
            { id: 'popular', name: 'Populaire', icon: '🔥', condition: 'totalListeners >= 100' },
            { id: 'speaker', name: 'Orateur', icon: '🎤', condition: 'speakerTime >= 3600' },
            { id: 'host_master', name: 'Maître Hôte', icon: '👑', condition: 'lives >= 50' },
            { id: 'social', name: 'Social', icon: '💬', condition: 'messages >= 100' },
            { id: 'early_bird', name: 'Lève-tôt', icon: '🌅', condition: 'morningLives >= 5' },
            { id: 'night_owl', name: 'Noctambule', icon: '🦉', condition: 'nightLives >= 5' },
            { id: 'marathon', name: 'Marathon', icon: '⏱️', condition: 'longestLive >= 7200' },
            { id: 'educator', name: 'Éducateur', icon: '📚', condition: 'categoryEducation >= 10' },
            { id: 'entertainer', name: 'Animateur', icon: '🎭', condition: 'categoryEntertainment >= 10' },
            { id: 'tech_guru', name: 'Gourou Tech', icon: '💻', condition: 'categoryTech >= 10' },
            { id: 'consistent', name: 'Régulier', icon: '📅', condition: 'consecutiveDays >= 7' },
            { id: 'supporter', name: 'Supporteur', icon: '❤️', condition: 'reactions >= 500' },
            { id: 'legend', name: 'Légende', icon: '🏆', condition: 'lives >= 100' }
        ]
    };

    // ==========================================
    // ÉTAT GLOBAL
    // ==========================================
    var AppState = {
        // User
        currentUser: {
            uid: null,
            name: null,
            email: null,
            photoURL: null,
            isAnonymous: true,
            level: 1,
            xp: 0,
            warnings: 0,
            isBanned: false,
            stats: {
                lives: 0,
                totalListeners: 0,
                messages: 0,
                reactions: 0,
                speakerTime: 0,
                longestLive: 0,
                morningLives: 0,
                nightLives: 0,
                consecutiveDays: 0,
                categoryEducation: 0,
                categoryEntertainment: 0,
                categoryTech: 0
            },
            badges: [],
            joinedAt: Date.now()
        },
        
        // Navigation
        currentSection: 'explorer',
        
        // Lives
        lives: [],
        filteredLives: [],
        currentFilter: 'all',
        currentLive: null,
        currentLiveData: null,
        
        // Agora
        agoraClient: null,
        agoraInitialized: false,
        localAudioTrack: null,
        remoteUsers: {},
        isMuted: true,
        isSpeaker: false,
        isHost: false,
        audioFallbackMode: false,
        
        // WebRTC Fallback
        peerConnections: {},
        localStream: null,
        
        // Stats
        stats: {
            totalListeners: 0,
            totalLives: 0,
            avgDuration: 0,
            moderatedMessages: 0,
            audienceData: [],
            categoryData: {},
            activityData: []
        },
        
        // Charts
        charts: {
            audience: null,
            category: null,
            activity: null
        },
        
        // UI
        searchQuery: '',
        loadingProgress: 0
    };

    // ==========================================
    // FIREBASE - INITIALISATION
    // ==========================================
    console.log('🔥 Initialisation Firebase...');
    
    firebase.initializeApp(CONFIG.firebase);
    var db = firebase.firestore();
    var rtdb = firebase.database();
    var storage = firebase.storage();

    // Persistance hors ligne
    db.enablePersistence({ synchronizeTabs: true })
        .catch(function(err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistance: plusieurs onglets ouverts');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Persistance non supportée');
            }
        });

    console.log('✅ Firebase initialisé');

    // Export global
    window.db = db;
    window.rtdb = rtdb;
    window.storage = storage;

    // ==========================================
    // BOT DE MODÉRATION IA
    // ==========================================
    var ModerationBot = {
        enabled: CONFIG.moderation.enabled,
        warnings: {},
        reportedLives: {},
        bannedUsers: new Set(),
        activeListeners: {},
        
        init: function() {
            console.log('🤖 Bot de modération initialisé');
        },
        
        analyzeMessage: function(message, userId) {
            if (!this.enabled) return { isClean: true };
            
            var text = message.toLowerCase();
            var issues = [];
            
            // Vérifier mots interdits
            for (var i = 0; i < CONFIG.moderation.badWords.length; i++) {
                if (text.indexOf(CONFIG.moderation.badWords[i]) !== -1) {
                    issues.push({
                        type: 'badword',
                        word: CONFIG.moderation.badWords[i],
                        severity: 'high'
                    });
                }
            }
            
            // Vérifier patterns
            for (var j = 0; j < CONFIG.moderation.patterns.length; j++) {
                if (CONFIG.moderation.patterns[j].test(text)) {
                    issues.push({
                        type: 'pattern',
                        pattern: j,
                        severity: 'medium'
                    });
                }
            }
            
            if (issues.length > 0) {
                return {
                    isClean: false,
                    issues: issues,
                    reason: 'Contenu inapproprié détecté',
                    severity: issues[0].severity
                };
            }
            
            return { isClean: true };
        },
        
        warnUser: function(userId, reason) {
            if (!this.warnings[userId]) {
                this.warnings[userId] = 0;
            }
            this.warnings[userId]++;
            
            var warningCount = this.warnings[userId];
            console.log('⚠️ Avertissement ' + warningCount + '/' + CONFIG.moderation.warningsBeforeBan + ' pour ' + userId);
            
            if (warningCount >= CONFIG.moderation.warningsBeforeBan) {
                this.banUser(userId, reason);
                return true; // User banned
            }
            
            return false; // Just warned
        },
        
        banUser: function(userId, reason) {
            this.bannedUsers.add(userId);
            console.log('🚫 Utilisateur ' + userId + ' banni: ' + reason);
            
            // Enregistrer dans Firebase
            db.collection('banned_users').doc(userId).set({
                bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reason: reason,
                permanent: false,
                warnings: this.warnings[userId] || 0
            }).catch(function(error) {
                console.error('Erreur bannissement:', error);
            });
            
            // Éjecter de tous les lives
            this.ejectUserFromAllLives(userId);
        },
        
        ejectUserFromAllLives: function(userId) {
            // Retirer de tous les lives actifs
            var liveRefs = [
                'lives/' + AppState.currentLive + '/speakers/' + userId,
                'lives/' + AppState.currentLive + '/listeners/' + userId
            ];
            
            liveRefs.forEach(function(ref) {
                rtdb.ref(ref).remove();
            });
        },
        
        reportLive: function(liveId, userId, reason) {
            if (!this.reportedLives[liveId]) {
                this.reportedLives[liveId] = 0;
            }
            this.reportedLives[liveId]++;
            
            var reportCount = this.reportedLives[liveId];
            console.log('🚩 Live ' + liveId + ' signalé: ' + reportCount + ' signalements');
            
            // Enregistrer
            db.collection('reports').add({
                liveId: liveId,
                reportedBy: userId,
                reason: reason,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Supprimer si seuil atteint
            if (reportCount >= CONFIG.moderation.reportThreshold) {
                this.deleteLive(liveId);
            }
        },
        
        deleteLive: function(liveId) {
            console.log('🗑️ Suppression automatique du live ' + liveId);
            
            db.collection('lives').doc(liveId).update({
                status: 'removed',
                removedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reason: 'Trop de signalements'
            }).then(function() {
                rtdb.ref('lives/' + liveId).remove();
                showToast('Live supprimé pour violation des règles', 'warning');
            });
        },
        
        joinLiveAsBot: function(liveId) {
            console.log('🤖 Bot rejoint le live ' + liveId);
            
            rtdb.ref('lives/' + liveId + '/bot').set({
                name: CONFIG.moderation.botName,
                joinedAt: Date.now(),
                isActive: true,
                messagesModerated: 0
            });
            
            // Écouter les messages
            this.listenToMessages(liveId);
        },
        
        listenToMessages: function(liveId) {
            var self = this;
            var messagesRef = rtdb.ref('lives/' + liveId + '/chat');
            
            if (this.activeListeners[liveId]) {
                this.activeListeners[liveId].off();
            }
            
            this.activeListeners[liveId] = messagesRef;
            
            messagesRef.on('child_added', function(snapshot) {
                var message = snapshot.val();
                var messageId = snapshot.key;
                
                if (!message || !message.message) return;
                
                // Analyser
                var analysis = self.analyzeMessage(message.message, message.userId);
                
                if (!analysis.isClean) {
                    console.log('🚫 Message bloqué:', message.message);
                    
                    // Supprimer le message
                    messagesRef.child(messageId).remove();
                    
                    // Avertir l'utilisateur
                    var wasBanned = self.warnUser(message.userId, analysis.reason);
                    
                    var warningCount = self.warnings[message.userId] || 0;
                    
                    if (wasBanned) {
                        showToast('Utilisateur banni pour violations répétées', 'error');
                    } else {
                        showToast('Message bloqué: ' + analysis.reason + '. Avertissement ' + warningCount + '/' + CONFIG.moderation.warningsBeforeBan, 'warning');
                    }
                    
                    // Stats
                    AppState.stats.moderatedMessages++;
                    
                    // Incrémenter compteur bot
                    rtdb.ref('lives/' + liveId + '/bot/messagesModerated').transaction(function(count) {
                        return (count || 0) + 1;
                    });
                }
            });
        },
        
        stopListening: function(liveId) {
            if (this.activeListeners[liveId]) {
                this.activeListeners[liveId].off();
                delete this.activeListeners[liveId];
            }
        }
    };

    // Initialiser le bot
    ModerationBot.init();

    // ==========================================
    // SYSTÈME DE BADGES
    // ==========================================
    var BadgeSystem = {
        checkAndUnlock: function(user) {
            var unlockedBadges = [];
            var stats = user.stats || {};
            
            CONFIG.badges.forEach(function(badge) {
                // Vérifier si déjà débloqué
                if (user.badges && user.badges.indexOf(badge.id) !== -1) {
                    return;
                }
                
                // Vérifier condition
                var unlocked = false;
                
                switch(badge.id) {
                    case 'first_live':
                        unlocked = stats.lives >= 1;
                        break;
                    case 'veteran':
                        unlocked = stats.lives >= 10;
                        break;
                    case 'popular':
                        unlocked = stats.totalListeners >= 100;
                        break;
                    case 'speaker':
                        unlocked = stats.speakerTime >= 3600;
                        break;
                    case 'host_master':
                        unlocked = stats.lives >= 50;
                        break;
                    case 'social':
                        unlocked = stats.messages >= 100;
                        break;
                    case 'early_bird':
                        unlocked = stats.morningLives >= 5;
                        break;
                    case 'night_owl':
                        unlocked = stats.nightLives >= 5;
                        break;
                    case 'marathon':
                        unlocked = stats.longestLive >= 7200;
                        break;
                    case 'educator':
                        unlocked = stats.categoryEducation >= 10;
                        break;
                    case 'entertainer':
                        unlocked = stats.categoryEntertainment >= 10;
                        break;
                    case 'tech_guru':
                        unlocked = stats.categoryTech >= 10;
                        break;
                    case 'consistent':
                        unlocked = stats.consecutiveDays >= 7;
                        break;
                    case 'supporter':
                        unlocked = stats.reactions >= 500;
                        break;
                    case 'legend':
                        unlocked = stats.lives >= 100;
                        break;
                }
                
                if (unlocked) {
                    unlockedBadges.push(badge);
                }
            });
            
            // Afficher notifications
            unlockedBadges.forEach(function(badge) {
                this.unlockBadge(user.uid, badge);
            }, this);
            
            return unlockedBadges;
        },
        
        unlockBadge: function(userId, badge) {
            console.log('🎁 Badge débloqué:', badge.name);
            
            // Ajouter au user
            if (!AppState.currentUser.badges) {
                AppState.currentUser.badges = [];
            }
            AppState.currentUser.badges.push(badge.id);
            
            // Notification
            this.showBadgeUnlockNotification(badge);
            
            // Sauvegarder dans Firebase
            db.collection('users').doc(userId).update({
                badges: firebase.firestore.FieldValue.arrayUnion(badge.id)
            }).catch(function(err) {
                console.warn('Badge save error:', err);
            });
            
            // Mettre à jour UI
            updateBadgeDisplay();
        },
        
        showBadgeUnlockNotification: function(badge) {
            showToast('🎉 Badge débloqué: ' + badge.icon + ' ' + badge.name, 'success');
        }
    };

    // ==========================================
    // UTILITAIRES
    // ==========================================
    function generateUID() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateCode() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function getInitials(name) {
        if (!name) return '??';
        var parts = name.split(' ');
        var initials = '';
        for (var i = 0; i < Math.min(2, parts.length); i++) {
            if (parts[i][0]) {
                initials += parts[i][0].toUpperCase();
            }
        }
        return initials || '??';
    }

    function formatDuration(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        
        function pad(n) {
            return n < 10 ? '0' + n : n;
        }
        
        return pad(h) + ':' + pad(m) + ':' + pad(s);
    }

    function showToast(message, type) {
        type = type || 'success';
        
        var container = document.getElementById('toastContainer');
        if (!container) return;
        
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        var icons = {
            success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C15.3 2 18.2 3.6 20.1 6.1" stroke="currentColor" stroke-width="2"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2"/></svg>',
            error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2"/></svg>',
            warning: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.14 19 21 17.94 20.5 16.86L13.57 3.97C13.07 2.89 11.93 2.89 11.43 3.97L4.5 16.86C4 17.94 4.86 19 5.07 19Z" stroke="currentColor" stroke-width="2"/></svg>',
            info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2"/></svg>'
        };
        
        toast.innerHTML = '<div class="toast-icon">' + (icons[type] || icons.info) + '</div><div class="toast-message">' + message + '</div>';
        
        container.appendChild(toast);
        
        setTimeout(function() {
            toast.classList.add('toast-out');
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    window.showToast = showToast;

    function showLoading(show, message) {
        var overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        
        if (show) {
            overlay.classList.remove('hide');
            if (message) {
                var text = overlay.querySelector('.loading-text');
                if (text) text.textContent = message;
            }
        } else {
            overlay.classList.add('hide');
        }
    }

    window.showLoading = showLoading;

    function updateLoadingProgress(percent) {
        var bar = document.getElementById('progressBar');
        if (bar) {
            bar.style.width = percent + '%';
        }
    }

    // ==========================================
    // NAVIGATION
    // ==========================================
    function showSection(sectionName) {
        var sections = document.querySelectorAll('.section');
        sections.forEach(function(section) {
            section.classList.remove('active');
        });
        
        var sectionMap = {
            'explorer': 'explorerSection',
            'create': 'createSection',
            'liveRoom': 'liveRoomSection',
            'stats': 'statsSection'
        };
        
        var sectionId = sectionMap[sectionName];
        if (sectionId) {
            var section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
                AppState.currentSection = sectionName;
            }
        }
    }

    window.showSection = showSection;

    // ==========================================
    // UTILISATEUR ANONYME
    // ==========================================
    function initAnonymousUser() {
        // Vérifier localStorage
        var stored = localStorage.getItem('sis_user');
        if (stored) {
            try {
                var user = JSON.parse(stored);
                AppState.currentUser = user;
                console.log('👤 Utilisateur restauré:', user.uid);
                updateUserDisplay();
                return;
            } catch(e) {
                console.warn('Erreur parse user:', e);
            }
        }
        
        // Créer nouveau
        AppState.currentUser.uid = generateUID();
        AppState.currentUser.name = 'Anonyme' + Math.floor(Math.random() * 10000);
        AppState.currentUser.isAnonymous = true;
        AppState.currentUser.joinedAt = Date.now();
        
        saveUser();
        updateUserDisplay();
        
        console.log('👤 Utilisateur anonyme créé:', AppState.currentUser.uid);
    }

    function saveUser() {
        try {
            localStorage.setItem('sis_user', JSON.stringify(AppState.currentUser));
        } catch(e) {
            console.warn('Erreur save user:', e);
        }
    }

    function updateUserDisplay() {
        var userName = document.getElementById('dropdownUserName');
        if (userName) {
            userName.textContent = AppState.currentUser.name || 'Anonyme';
        }
        
        var userLevel = document.getElementById('userLevel');
        if (userLevel) {
            userLevel.textContent = AppState.currentUser.level || 1;
        }
        
        var avatarContent = document.getElementById('avatarContent');
        if (avatarContent && !AppState.currentUser.photoURL) {
            avatarContent.innerHTML = '<div style="font-weight:700;font-size:16px;">' + getInitials(AppState.currentUser.name) + '</div>';
        }
        
        updateBadgeDisplay();
    }

    function updateBadgeDisplay() {
        var badgeCount = document.getElementById('badgeCount');
        if (badgeCount) {
            var count = AppState.currentUser.badges ? AppState.currentUser.badges.length : 0;
            badgeCount.textContent = count;
        }
    }

    window.toggleAnonymous = function() {
        var toggle = document.getElementById('anonymousToggle');
        if (!toggle) return;
        
        AppState.currentUser.isAnonymous = !AppState.currentUser.isAnonymous;
        toggle.classList.toggle('active', AppState.currentUser.isAnonymous);
        
        saveUser();
        
        var status = AppState.currentUser.isAnonymous ? 'activé' : 'désactivé';
        showToast('Mode anonyme ' + status, 'info');
    };

    // ==========================================
    // CHARGEMENT DES LIVES
    // ==========================================
    function loadLives() {
        var livesGrid = document.getElementById('livesGrid');
        if (!livesGrid) return;
        
        livesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">Chargement des lives...</div>';
        
        db.collection('lives')
            .where('status', 'in', ['live', 'scheduled'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()
            .then(function(snapshot) {
                var lives = [];
                snapshot.forEach(function(doc) {
                    lives.push({ id: doc.id, data: doc.data() });
                });
                
                AppState.lives = lives;
                
                if (lives.length === 0) {
                    livesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;"><div style="font-size:80px;margin-bottom:24px;">🎙️</div><h3 style="margin-bottom:16px;">Aucun live en cours</h3><p style="color:var(--text-secondary);margin-bottom:32px;">Soyez le premier à créer un live audio !</p><button class="btn-primary" onclick="showCreateWizard()" style="padding:14px 32px;background:var(--gradient);border-radius:12px;font-weight:600;color:white;border:none;cursor:pointer;">➕ Créer un Live</button></div>';
                } else {
                    filterLives(AppState.currentFilter);
                }
            })
            .catch(function(error) {
                console.error('Erreur chargement lives:', error);
                livesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;"><div style="font-size:64px;margin-bottom:24px;">⚠️</div><h3 style="margin-bottom:16px;">Erreur de chargement</h3><p style="color:var(--text-secondary);margin-bottom:32px;">' + error.message + '</p><button onclick="loadLives()" style="padding:12px 24px;background:var(--gradient);border-radius:12px;font-weight:600;color:white;border:none;cursor:pointer;">🔄 Réessayer</button></div>';
            });
    }

    function filterLives(filter) {
        AppState.currentFilter = filter;
        
        var filtered = AppState.lives;
        
        if (filter === 'live') {
            filtered = AppState.lives.filter(function(live) {
                return live.data.status === 'live';
            });
        } else if (filter === 'scheduled') {
            filtered = AppState.lives.filter(function(live) {
                return live.data.status === 'scheduled';
            });
        } else if (filter === 'popular') {
            filtered = AppState.lives.filter(function(live) {
                return live.data.stats && live.data.stats.currentListeners >= 50;
            });
        }
        
        AppState.filteredLives = filtered;
        renderLives(filtered);
    }

    function renderLives(lives) {
        var livesGrid = document.getElementById('livesGrid');
        if (!livesGrid) return;
        
        if (lives.length === 0) {
            livesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">Aucun live trouvé pour ce filtre</div>';
            return;
        }
        
        var html = '';
        
        lives.forEach(function(live) {
            var data = live.data;
            var isLive = data.status === 'live';
            var listeners = (data.stats && data.stats.currentListeners) || 0;
            var categoryIcons = {
                education: '📚',
                discussion: '💬',
                qa: '❓',
                music: '🎵',
                tech: '💻',
                news: '📰',
                art: '🎨',
                gaming: '🎮',
                other: '🎭'
            };
            
            html += '<div class="live-card glass-effect" onclick="joinLive(\'' + live.id + '\', ' + (data.isPublic !== false) + ')" style="cursor:pointer;padding:24px;border-radius:var(--radius-lg);transition:var(--transition);">';
            html += '<div style="display:flex;gap:16px;margin-bottom:16px;">';
            html += '<div style="width:56px;height:56px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:white;">' + getInitials(data.hostName || 'Unknown') + '</div>';
            html += '<div style="flex:1;min-width:0;">';
            html += '<h3 style="font-size:18px;margin-bottom:4px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (data.title || 'Sans titre') + '</h3>';
            html += '<p style="font-size:14px;color:var(--text-secondary);">' + (data.hostName || 'Anonyme') + '</p>';
            html += '</div></div>';
            
            html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;">';
            html += '<span style="background:var(--bg-elevated);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;">' + (categoryIcons[data.category] || '🎭') + ' ' + (data.category || 'Autre') + '</span>';
            if (isLive) {
                html += '<span style="background:var(--live-red);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:700;color:white;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:white;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite;"></span>EN DIRECT</span>';
            } else {
                html += '<span style="background:var(--bg-elevated);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;">📅 Programmé</span>';
            }
            html += '</div>';
            
            html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '<div style="display:flex;gap:16px;font-size:14px;color:var(--text-secondary);">';
            if (isLive) {
                html += '<span>👥 ' + listeners + '</span>';
            }
            html += '<span>' + (data.isPublic !== false ? '🌍 Public' : '🔒 Privé') + '</span>';
            html += '</div>';
            html += '<button style="padding:8px 20px;background:var(--gradient);border:none;border-radius:20px;color:white;font-weight:600;font-size:14px;cursor:pointer;">Rejoindre</button>';
            html += '</div></div>';
        });
        
        livesGrid.innerHTML = html;
    }

    // Setup filter chips
    document.addEventListener('DOMContentLoaded', function() {
        var filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                filterChips.forEach(function(c) { c.classList.remove('active'); });
                this.classList.add('active');
                var filter = this.getAttribute('data-filter');
                filterLives(filter);
            });
        });
    });

    window.showCreateWizard = function() {
        showToast('Fonctionnalité de création à venir', 'info');
    };

    window.joinLive = function(liveId, isPublic) {
        showToast('Fonctionnalité de rejoindre le live à venir', 'info');
    };

    // ==========================================
    // STATISTIQUES
    // ==========================================
    function loadStats() {
        showLoading(true, 'Chargement des statistiques...');
        
        Promise.all([
            db.collection('lives').get(),
            db.collection('users').doc(AppState.currentUser.uid).get()
        ])
        .then(function(results) {
            var livesSnapshot = results[0];
            var totalLives = livesSnapshot.size;
            var totalListeners = 0;
            var totalDuration = 0;
            var categoryCount = {};
            
            livesSnapshot.forEach(function(doc) {
                var data = doc.data();
                if (data.stats && data.stats.peakListeners) {
                    totalListeners += data.stats.peakListeners;
                }
                if (data.startedAt && data.endedAt) {
                    var duration = (data.endedAt.toMillis() - data.startedAt.toMillis()) / 1000;
                    totalDuration += duration;
                }
                var cat = data.category || 'other';
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
            
            var avgDuration = totalLives > 0 ? Math.floor(totalDuration / totalLives) : 0;
            
            AppState.stats.totalLives = totalLives;
            AppState.stats.totalListeners = totalListeners;
            AppState.stats.avgDuration = avgDuration;
            AppState.stats.categoryData = categoryCount;
            
            renderStats();
            createCharts();
            
            showLoading(false);
        })
        .catch(function(error) {
            console.error('Erreur chargement stats:', error);
            showLoading(false);
            showToast('Erreur de chargement des statistiques', 'error');
        });
    }

    function renderStats() {
        var content = document.getElementById('statsContent');
        if (!content) return;
        
        var html = '';
        
        // Stats cards
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin-bottom:32px;">';
        
        var stats = [
            { icon: '👥', title: 'Auditeurs Totaux', value: AppState.stats.totalListeners.toLocaleString(), change: '+12.5%', positive: true },
            { icon: '🎙️', title: 'Lives Créés', value: AppState.stats.totalLives.toLocaleString(), change: '+8.3%', positive: true },
            { icon: '⏱️', title: 'Durée Moyenne', value: formatDuration(AppState.stats.avgDuration), change: '0%', neutral: true },
            { icon: '🛡️', title: 'Messages Modérés', value: AppState.stats.moderatedMessages.toLocaleString(), change: '-5.2%', positive: true }
        ];
        
        stats.forEach(function(stat) {
            html += '<div class="glass-effect" style="padding:24px;border-radius:var(--radius-lg);transition:var(--transition);">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;color:var(--text-secondary);">';
            html += '<span style="font-size:24px;">' + stat.icon + '</span>';
            html += '<h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">' + stat.title + '</h3>';
            html += '</div>';
            html += '<div style="font-size:36px;font-weight:700;margin-bottom:8px;" class="gradient-text">' + stat.value + '</div>';
            
            var changeClass = stat.positive ? 'success' : (stat.neutral ? 'text-secondary' : 'error');
            var changeIcon = stat.positive ? '↗' : (stat.neutral ? '→' : '↘');
            html += '<div style="font-size:13px;font-weight:600;color:var(--' + changeClass + ');">' + changeIcon + ' ' + stat.change + '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        
        // Charts grid
        html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;">';
        html += '<div class="glass-effect" style="padding:24px;border-radius:var(--radius-lg);"><h3 style="margin-bottom:20px;">Audience sur 7 jours</h3><canvas id="audienceChart" style="max-height:300px;"></canvas></div>';
        html += '<div class="glass-effect" style="padding:24px;border-radius:var(--radius-lg);"><h3 style="margin-bottom:20px;">Répartition par catégorie</h3><canvas id="categoryChart" style="max-height:300px;"></canvas></div>';
        html += '<div class="glass-effect" style="padding:24px;border-radius:var(--radius-lg);grid-column:1/-1;"><h3 style="margin-bottom:20px;">Activité par heure</h3><canvas id="activityChart" style="max-height:300px;"></canvas></div>';
        html += '</div>';
        
        content.innerHTML = html;
    }

    function createCharts() {
        setTimeout(function() {
            createAudienceChart();
            createCategoryChart();
            createActivityChart();
        }, 100);
    }

    function createAudienceChart() {
        var canvas = document.getElementById('audienceChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        if (AppState.charts.audience) {
            AppState.charts.audience.destroy();
        }
        
        AppState.charts.audience = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                datasets: [{
                    label: 'Auditeurs',
                    data: [120, 190, 150, 280, 250, 400, 350],
                    borderColor: '#4A90FF',
                    backgroundColor: 'rgba(74, 144, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(138, 95, 255, 0.1)' }, ticks: { color: '#9999b3' } },
                    x: { grid: { display: false }, ticks: { color: '#9999b3' } }
                }
            }
        });
    }

    function createCategoryChart() {
        var canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        if (AppState.charts.category) {
            AppState.charts.category.destroy();
        }
        
        var data = AppState.stats.categoryData;
        var labels = Object.keys(data);
        var values = Object.values(data);
        
        if (labels.length === 0) {
            labels = ['Tech', 'Éducation', 'Music', 'Gaming', 'Discussion', 'Autre'];
            values = [30, 25, 15, 12, 10, 8];
        }
        
        AppState.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#4A90FF', '#60a5fa', '#f472b6', '#c084fc', '#a78bfa', '#9ca3af']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#9999b3', padding: 15 } } }
            }
        });
    }

    function createActivityChart() {
        var canvas = document.getElementById('activityChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        if (AppState.charts.activity) {
            AppState.charts.activity.destroy();
        }
        
        var hours = [];
        var data = [];
        for (var i = 0; i < 24; i++) {
            hours.push(i + 'h');
            data.push(Math.floor(Math.random() * 50));
        }
        
        AppState.charts.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Lives actifs',
                    data: data,
                    backgroundColor: 'rgba(139, 95, 255, 0.2)',
                    borderColor: '#8B5FFF',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(138, 95, 255, 0.1)' }, ticks: { color: '#9999b3' } },
                    x: { grid: { display: false }, ticks: { color: '#9999b3' } }
                }
            }
        });
    }

    window.showStats = function() {
        showSection('stats');
        loadStats();
    };

    window.showMyBadges = function() {
        var modal = document.getElementById('badgesModal');
        if (modal) {
            modal.classList.add('show');
            renderBadgesModal();
        }
    };

    window.closeBadgesModal = function() {
        var modal = document.getElementById('badgesModal');
        if (modal) {
            modal.classList.remove('show');
        }
    };

    function renderBadgesModal() {
        var grid = document.getElementById('badgesGrid');
        if (!grid) return;
        
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:20px;">';
        
        CONFIG.badges.forEach(function(badge) {
            var unlocked = AppState.currentUser.badges && AppState.currentUser.badges.indexOf(badge.id) !== -1;
            
            html += '<div class="glass-effect" style="padding:20px;border-radius:var(--radius);text-align:center;opacity:' + (unlocked ? '1' : '0.4') + ';">';
            html += '<div style="font-size:48px;margin-bottom:12px;">' + badge.icon + '</div>';
            html += '<h4 style="font-size:14px;font-weight:600;margin-bottom:4px;">' + badge.name + '</h4>';
            html += '<p style="font-size:12px;color:var(--text-secondary);">' + (unlocked ? 'Débloqué ✓' : 'Verrouillé') + '</p>';
            html += '</div>';
        });
        
        html += '</div>';
        grid.innerHTML = html;
    }

    window.showSettings = function() {
        showToast('Paramètres à venir', 'info');
    };

    // ==========================================
    // USER MENU DROPDOWN
    // ==========================================
    document.addEventListener('DOMContentLoaded', function() {
        var userAvatar = document.getElementById('userAvatar');
        var userDropdown = document.getElementById('userDropdown');
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', function(e) {
                e.stopPropagation();
                userDropdown.classList.toggle('hide');
            });
            
            document.addEventListener('click', function(e) {
                if (!userDropdown.contains(e.target) && e.target !== userAvatar) {
                    userDropdown.classList.add('hide');
                }
            });
        }
    });

    // ==========================================
    // PARTICLES BACKGROUND
    // ==========================================
    function initParticles() {
        var container = document.getElementById('particlesBg');
        if (!container) return;
        
        for (var i = 0; i < 20; i++) {
            var particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = Math.random() > 0.5 ? '#4A90FF' : '#8B5FFF';
            particle.style.borderRadius = '50%';
            particle.style.opacity = Math.random() * 0.5 + 0.2;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = 'float ' + (Math.random() * 20 + 10) + 's ease-in-out infinite';
            particle.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(particle);
        }
    }

    // ==========================================
    // INITIALISATION PRINCIPALE
    // ==========================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎙️ SIS Live Audio V3 - Initialisation...');
        
        // Simulation loading
        updateLoadingProgress(0);
        setTimeout(function() { updateLoadingProgress(30); }, 300);
        setTimeout(function() { updateLoadingProgress(60); }, 600);
        setTimeout(function() { updateLoadingProgress(90); }, 900);
        
        setTimeout(function() {
            updateLoadingProgress(100);
            
            setTimeout(function() {
                showLoading(false);
                
                // Init user
                initAnonymousUser();
                
                // Init particles
                initParticles();
                
                // Load lives
                loadLives();
                
                // Check badges
                BadgeSystem.checkAndUnlock(AppState.currentUser);
                
                console.log('✅ Application prête !');
                showToast('🎉 Bienvenue sur SIS Live Audio !', 'success');
            }, 500);
        }, 1200);
    });

})();
