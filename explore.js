// ================================================================
// SIS LIVE AUDIO V2 - EXPLORE (4 TABS)
// Lives en cours / Mes Lives / Privé / Statistiques
// ================================================================

import { db, rtdb, state, showToast, showSection } from './config.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    increment,
    onSnapshot,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

let unsubscribers = [];

// ================================================================
// INITIALISATION
// ================================================================

window.addEventListener('userAuthenticated', () => {
    console.log('🔥 User authenticated, loading explore...');
    initializeExploreTabs();
    loadLiveLives();
    updateUserProfile();
});

// ================================================================
// NAVIGATION TABS
// ================================================================

function initializeExploreTabs() {
    document.querySelectorAll('.explore-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-explore-tab');
            switchExploreTab(targetTab);
        });
    });
    
    // Auto-navigation code privé
    setupPrivateCodeInputs();
}

function switchExploreTab(tabName) {
    // Update tabs
    document.querySelectorAll('.explore-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-explore-tab="${tabName}"]`)?.classList.add('active');
    
    // Update panes
    document.querySelectorAll('.explore-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabName}Pane`)?.classList.add('active');
    
    // Load content
    switch(tabName) {
        case 'live':
            loadLiveLives();
            break;
        case 'myLives':
            loadMyLives();
            break;
        case 'private':
            document.getElementById('privateCode1')?.focus();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

// ================================================================
// TAB 1: LIVES EN COURS
// ================================================================

function loadLiveLives() {
    console.log('📡 Loading live lives...');
    
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    
    const liveQuery = query(
        collection(db, 'lives'),
        where('status', '==', 'live')
    );
    
    const unsubLive = onSnapshot(liveQuery, (snapshot) => {
        console.log(`✅ Lives en direct: ${snapshot.size}`);
        
        const grid = document.getElementById('liveLivesGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎙️</div>
                    <p>Aucun live en cours</p>
                    <small>Créez le premier live !</small>
                </div>
            `;
        } else {
            snapshot.forEach(docSnap => {
                const card = createLiveCard(docSnap.id, docSnap.data());
                grid.appendChild(card);
            });
        }
    }, (error) => {
        console.error('❌ Load lives error:', error);
        showToast('❌ Erreur: ' + error.message, 5000);
    });
    
    unsubscribers.push(unsubLive);
}

function createLiveCard(liveId, liveData) {
    const card = document.createElement('div');
    card.className = 'live-card';
    card.onclick = () => handleJoinLive(liveId, liveData);
    
    const listeners = liveData.stats?.currentListeners || 0;
    const privateBadge = !liveData.isPublic ? '<span class="badge-private">🔒</span>' : '';
    
    card.innerHTML = `
        <div class="card-header">
            <img src="${liveData.hostPhoto}" class="card-avatar" alt="${liveData.hostName}">
            <div class="card-info">
                <div class="card-host">${liveData.hostName}</div>
                <div class="card-category">${getCategoryLabel(liveData.category)}</div>
            </div>
        </div>
        <h3 class="card-title">${liveData.title}</h3>
        <p class="card-desc">${liveData.description || 'Aucune description'}</p>
        <div class="card-footer">
            <div class="card-stats">👥 ${listeners}</div>
            <div style="display:flex;gap:8px;">
                <span class="badge-live"><span class="live-dot"></span>EN DIRECT</span>
                ${privateBadge}
            </div>
        </div>
    `;
    
    return card;
}

function handleJoinLive(liveId, liveData) {
    if (!liveData.isPublic) {
        state.pendingLiveId = liveId;
        switchExploreTab('private');
    } else {
        joinLive(liveId, liveData);
    }
}

async function joinLive(liveId, liveData) {
    try {
        // Déterminer le rôle
        if (liveData.hostId === state.currentUser.uid) {
            state.currentRole = 'host';
        } else {
            state.currentRole = 'listener';
        }
        
        state.currentLiveId = liveId;
        
        // Ajouter comme listener
        await dbSet(dbRef(rtdb, `lives/${liveId}/listeners/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName)}`,
            joinedAt: Date.now()
        });
        
        // Incrémenter compteur
        await updateDoc(doc(db, 'lives', liveId), {
            'stats.currentListeners': increment(1),
            'stats.peakListeners': increment(1)
        });
        
        // Trigger live room
        window.dispatchEvent(new CustomEvent('joinLive', {
            detail: { liveId, liveData }
        }));
        
        showToast('✅ Live rejoint !');
    } catch (error) {
        console.error('Join live error:', error);
        showToast('❌ Erreur: ' + error.message);
    }
}

// ================================================================
// TAB 2: MES LIVES (Historique)
// ================================================================

async function loadMyLives() {
    console.log('📝 Loading my lives...');
    
    const list = document.getElementById('myLivesList');
    if (!list) return;
    
    list.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        // Charger tous les lives de l'utilisateur
        const q = query(
            collection(db, 'lives'),
            where('hostId', '==', state.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>Vous n'avez créé aucun live</p>
                    <small>Créez votre premier live audio !</small>
                </div>
            `;
            return;
        }
        
        list.innerHTML = '';
        
        const lives = [];
        snapshot.forEach(doc => {
            lives.push({ id: doc.id, ...doc.data() });
        });
        
        // Trier par date (plus récent d'abord)
        lives.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
        });
        
        lives.forEach(live => {
            const item = createMyLiveItem(live);
            list.appendChild(item);
        });
        
    } catch (error) {
        console.error('Load my lives error:', error);
        list.innerHTML = '<div class="error-state">❌ Erreur de chargement</div>';
    }
}

function createMyLiveItem(live) {
    const item = document.createElement('div');
    item.className = 'my-live-item';
    
    // Calculer la durée
    let duration = 'Non terminé';
    if (live.endedAt && live.startedAt) {
        const start = live.startedAt.seconds * 1000;
        const end = live.endedAt.seconds * 1000;
        const diff = end - start;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }
    
    // Date
    const date = live.createdAt?.seconds 
        ? new Date(live.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'Date inconnue';
    
    // Stats
    const peakListeners = live.stats?.peakListeners || 0;
    const totalMessages = live.stats?.totalMessages || 0;
    const totalReactions = Object.values(live.stats?.totalReactions || {}).reduce((a, b) => a + b, 0);
    
    // Status
    let statusBadge = '';
    if (live.status === 'live') {
        statusBadge = '<span class="status-badge live">🔴 En direct</span>';
    } else if (live.status === 'ended') {
        statusBadge = '<span class="status-badge ended">✅ Terminé</span>';
    } else {
        statusBadge = '<span class="status-badge scheduled">📅 Programmé</span>';
    }
    
    item.innerHTML = `
        <div class="my-live-icon">🎙️</div>
        <div class="my-live-info">
            <div class="my-live-header">
                <h4 class="my-live-title">${live.title}</h4>
                ${statusBadge}
            </div>
            <div class="my-live-date">📅 ${date} • ⏱️ ${duration}</div>
            <div class="my-live-stats">
                <span class="my-live-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                    </svg>
                    ${peakListeners} participants
                </span>
                <span class="my-live-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    ${totalMessages} messages
                </span>
                <span class="my-live-stat">❤️ ${totalReactions} réactions</span>
            </div>
        </div>
    `;
    
    return item;
}

// ================================================================
// TAB 3: PRIVÉ (Rejoindre avec code)
// ================================================================

function setupPrivateCodeInputs() {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`privateCode${i}`);
        if (!input) continue;
        
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            if (e.target.value && i < 6) {
                document.getElementById(`privateCode${i + 1}`)?.focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 1) {
                document.getElementById(`privateCode${i - 1}`)?.focus();
            }
        });
    }
}

document.getElementById('joinPrivateBtn')?.addEventListener('click', async () => {
    const code = Array.from({length: 6}, (_, i) => 
        document.getElementById(`privateCode${i + 1}`)?.value || ''
    ).join('').toUpperCase();
    
    if (code.length !== 6) {
        showPrivateError('❌ Code incomplet (6 caractères requis)');
        return;
    }
    
    try {
        // Chercher le live avec ce code
        const q = query(
            collection(db, 'lives'),
            where('accessCode', '==', code),
            where('status', '==', 'live')
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showPrivateError('❌ Code invalide ou live terminé');
            return;
        }
        
        const liveDoc = snapshot.docs[0];
        const liveData = liveDoc.data();
        
        // Rejoindre
        await joinLive(liveDoc.id, liveData);
        
    } catch (error) {
        console.error('Join private error:', error);
        showPrivateError('❌ Erreur: ' + error.message);
    }
});

function showPrivateError(message) {
    const errorEl = document.getElementById('privateError');
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

// ================================================================
// TAB 4: STATISTIQUES
// ================================================================

async function loadStats() {
    console.log('📊 Loading stats...');
    
    try {
        // Charger tous les lives de l'utilisateur
        const q = query(
            collection(db, 'lives'),
            where('hostId', '==', state.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        
        let totalLives = 0;
        let totalMinutes = 0;
        let totalListeners = 0;
        let totalMessages = 0;
        
        snapshot.forEach(doc => {
            const live = doc.data();
            totalLives++;
            
            // Calculer minutes
            if (live.endedAt && live.startedAt) {
                const start = live.startedAt.seconds * 1000;
                const end = live.endedAt.seconds * 1000;
                totalMinutes += Math.floor((end - start) / 60000);
            }
            
            totalListeners += live.stats?.peakListeners || 0;
            totalMessages += live.stats?.totalMessages || 0;
        });
        
        // Afficher les stats
        document.getElementById('statTotalLives').textContent = totalLives;
        document.getElementById('statTotalMinutes').textContent = totalMinutes;
        document.getElementById('statTotalListeners').textContent = totalListeners.toLocaleString();
        document.getElementById('statTotalMessages').textContent = totalMessages.toLocaleString();
        
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// ================================================================
// REFRESH
// ================================================================

document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadLiveLives();
    showToast('🔄 Actualisation...');
});

// ================================================================
// USER PROFILE (Header)
// ================================================================

function updateUserProfile() {
    const profilePhoto = document.getElementById('userProfilePhoto');
    if (!profilePhoto || !state.currentUser) return;
    
    // Charger la photo depuis localStorage
    const savedPhoto = localStorage.getItem(`user_${state.currentUser.uid}_photo`);
    
    if (savedPhoto) {
        profilePhoto.src = savedPhoto;
    } else {
        profilePhoto.src = state.currentUser.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName)}&background=667eea&color=fff`;
    }
}

// ================================================================
// HELPERS
// ================================================================

function getCategoryLabel(category) {
    const labels = {
        tech: '💻 Technologie',
        education: '📚 Éducation',
        music: '🎵 Musique',
        discussion: '💬 Discussion',
        qa: '❓ Q&A',
        news: '📰 Actualités',
        art: '🎨 Art',
        gaming: '🎮 Gaming',
        other: '🎭 Autre'
    };
    return labels[category] || category;
}

console.log('✅ Explore V2 module loaded (4 tabs)');
