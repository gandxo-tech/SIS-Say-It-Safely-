// ================================================================
// SIS LIVE AUDIO - EXPLORE (4 TABS)
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
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

let unsubscribers = [];

window.addEventListener('userAuthenticated', () => {
    console.log('✅ User authenticated');
    initializeExploreTabs();
    loadLiveLives();
    updateUserProfile();
});

// ================================================================
// TABS NAVIGATION
// ================================================================

function initializeExploreTabs() {
    document.querySelectorAll('.explore-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-explore-tab');
            switchExploreTab(targetTab);
        });
    });
    
    setupPrivateCodeInputs();
}

function switchExploreTab(tabName) {
    document.querySelectorAll('.explore-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-explore-tab="${tabName}"]`)?.classList.add('active');
    
    document.querySelectorAll('.explore-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabName}Pane`)?.classList.add('active');
    
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
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    
    const liveQuery = query(
        collection(db, 'lives'),
        where('status', '==', 'live')
    );
    
    const unsubLive = onSnapshot(liveQuery, (snapshot) => {
        const grid = document.getElementById('liveLivesGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎙️</div><p>Aucun live en cours</p></div>';
        } else {
            snapshot.forEach(docSnap => {
                const card = createLiveCard(docSnap.id, docSnap.data());
                grid.appendChild(card);
            });
        }
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
            <img src="${liveData.hostPhoto}" class="card-avatar">
            <div class="card-info">
                <div class="card-host">${liveData.hostName}</div>
            </div>
        </div>
        <h3 class="card-title">${liveData.title}</h3>
        <p class="card-desc">${liveData.description || ''}</p>
        <div class="card-footer">
            <span>👥 ${listeners}</span>
            <div>
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
        if (liveData.hostId === state.currentUser.uid) {
            state.currentRole = 'host';
        } else {
            state.currentRole = 'listener';
        }
        
        state.currentLiveId = liveId;
        
        await dbSet(dbRef(rtdb, `lives/${liveId}/listeners/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL,
            joinedAt: Date.now()
        });
        
        await updateDoc(doc(db, 'lives', liveId), {
            'stats.currentListeners': increment(1),
            'stats.peakListeners': increment(1)
        });
        
        window.dispatchEvent(new CustomEvent('joinLive', {
            detail: { liveId, liveData }
        }));
        
        showToast('✅ Live rejoint !');
    } catch (error) {
        console.error('Join error:', error);
        showToast('❌ Erreur: ' + error.message);
    }
}

// ================================================================
// TAB 2: MES LIVES
// ================================================================

async function loadMyLives() {
    const list = document.getElementById('myLivesList');
    if (!list) return;
    
    list.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const q = query(
            collection(db, 'lives'),
            where('hostId', '==', state.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>Aucun live créé</p></div>';
            return;
        }
        
        list.innerHTML = '';
        
        const lives = [];
        snapshot.forEach(doc => {
            lives.push({ id: doc.id, ...doc.data() });
        });
        
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
        list.innerHTML = '<div class="error">❌ Erreur</div>';
    }
}

function createMyLiveItem(live) {
    const item = document.createElement('div');
    item.className = 'my-live-item';
    
    let duration = 'En cours';
    if (live.endedAt && live.startedAt) {
        const start = live.startedAt.seconds * 1000;
        const end = live.endedAt.seconds * 1000;
        const diff = end - start;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }
    
    const date = live.createdAt?.seconds 
        ? new Date(live.createdAt.seconds * 1000).toLocaleDateString('fr-FR')
        : '';
    
    const peakListeners = live.stats?.peakListeners || 0;
    const totalMessages = live.stats?.totalMessages || 0;
    
    const statusBadge = live.status === 'live' 
        ? '<span class="badge-live">🔴 En direct</span>'
        : '<span class="badge-ended">✅ Terminé</span>';
    
    item.innerHTML = `
        <div class="my-live-icon">🎙️</div>
        <div class="my-live-info">
            <div class="my-live-header">
                <h4>${live.title}</h4>
                ${statusBadge}
            </div>
            <div class="my-live-date">📅 ${date} • ⏱️ ${duration}</div>
            <div class="my-live-stats">
                <span>👥 ${peakListeners}</span>
                <span>💬 ${totalMessages}</span>
            </div>
        </div>
    `;
    
    return item;
}

// ================================================================
// TAB 3: PRIVÉ
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
        showPrivateError('❌ Code incomplet');
        return;
    }
    
    try {
        const q = query(
            collection(db, 'lives'),
            where('accessCode', '==', code),
            where('status', '==', 'live')
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showPrivateError('❌ Code invalide');
            return;
        }
        
        const liveDoc = snapshot.docs[0];
        await joinLive(liveDoc.id, liveDoc.data());
        
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
// TAB 4: STATS
// ================================================================

async function loadStats() {
    try {
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
            
            if (live.endedAt && live.startedAt) {
                const start = live.startedAt.seconds * 1000;
                const end = live.endedAt.seconds * 1000;
                totalMinutes += Math.floor((end - start) / 60000);
            }
            
            totalListeners += live.stats?.peakListeners || 0;
            totalMessages += live.stats?.totalMessages || 0;
        });
        
        document.getElementById('statTotalLives').textContent = totalLives;
        document.getElementById('statTotalMinutes').textContent = totalMinutes;
        document.getElementById('statTotalListeners').textContent = totalListeners;
        document.getElementById('statTotalMessages').textContent = totalMessages;
        
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
// USER PROFILE
// ================================================================

function updateUserProfile() {
    const profilePhoto = document.getElementById('userProfilePhoto');
    if (!profilePhoto || !state.currentUser) return;
    
    const savedPhoto = localStorage.getItem(`user_${state.currentUser.uid}_photo`);
    
    if (savedPhoto) {
        profilePhoto.src = savedPhoto;
    } else {
        profilePhoto.src = state.currentUser.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName)}`;
    }
}

console.log('✅ Explore module loaded');
