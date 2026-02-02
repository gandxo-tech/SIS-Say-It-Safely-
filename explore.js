// ================================================================
// SIS LIVE AUDIO - EXPLORER (avec section code privé)
// ================================================================

import { db, rtdb, state, showToast } from './config.js';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    increment
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet,
    remove as dbRemove
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

let unsubscribers = [];

// ================================================================
// LOAD LIVES ON AUTH
// ================================================================

window.addEventListener('userAuthenticated', () => {
    console.log('🔥 User authenticated, loading lives...');
    loadLives();
});

// ================================================================
// REFRESH BUTTON
// ================================================================

document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadLives();
    showToast('🔄 Actualisation...');
});

// ================================================================
// BOUTON "REJOINDRE LIVE PRIVÉ"
// ================================================================

document.getElementById('showCodeInputBtn')?.addEventListener('click', () => {
    showCodeModal();
});

// ================================================================
// LOAD LIVES
// ================================================================

function loadLives() {
    console.log('📡 Loading lives from Firestore...');
    
    // Cleanup previous listeners
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    
    // Load LIVE lives (SANS orderBy pour éviter le problème d'index)
    const liveQuery = query(
        collection(db, 'lives'),
        where('status', '==', 'live')
    );
    
    const unsubLive = onSnapshot(liveQuery, (snapshot) => {
        console.log(`✅ Lives en direct trouvés: ${snapshot.size}`);
        
        const grid = document.getElementById('liveLivesGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        document.getElementById('liveCount').textContent = snapshot.size;
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎙️</div>
                    <p>Aucun live en cours</p>
                    <small>Créez le premier live ou revenez plus tard</small>
                </div>
            `;
        } else {
            snapshot.forEach(docSnap => {
                console.log('📺 Live:', docSnap.id, docSnap.data());
                const card = createLiveCard(docSnap.id, docSnap.data(), true);
                grid.appendChild(card);
            });
        }
    }, (error) => {
        console.error('❌ Erreur chargement lives:', error);
        showToast('❌ Erreur: ' + error.message, 5000);
    });
    
    unsubscribers.push(unsubLive);
    
    // Load SCHEDULED lives (SANS orderBy)
    const scheduledQuery = query(
        collection(db, 'lives'),
        where('status', '==', 'scheduled')
    );
    
    const unsubScheduled = onSnapshot(scheduledQuery, (snapshot) => {
        console.log(`✅ Lives programmés trouvés: ${snapshot.size}`);
        
        const grid = document.getElementById('scheduledLivesGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        document.getElementById('scheduledCount').textContent = snapshot.size;
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>Aucun live programmé</p>
                    <small>Programmez votre premier live audio</small>
                </div>
            `;
        } else {
            snapshot.forEach(docSnap => {
                console.log('📅 Live programmé:', docSnap.id, docSnap.data());
                const card = createLiveCard(docSnap.id, docSnap.data(), false);
                grid.appendChild(card);
            });
        }
    }, (error) => {
        console.error('❌ Erreur chargement lives programmés:', error);
        showToast('❌ Erreur: ' + error.message, 5000);
    });
    
    unsubscribers.push(unsubScheduled);
}

// ================================================================
// CREATE LIVE CARD
// ================================================================

function createLiveCard(liveId, liveData, isLive) {
    const card = document.createElement('div');
    card.className = 'live-card';
    card.onclick = () => handleJoinLive(liveId, liveData);
    
    const listeners = liveData.stats?.currentListeners || 0;
    const messages = liveData.stats?.totalMessages || 0;
    const reactions = liveData.stats?.totalReactions || {};
    
    // Generate reactions HTML
    let reactionsHTML = '';
    const reactionsArray = Object.entries(reactions);
    if (reactionsArray.length > 0) {
        reactionsHTML = '<div class="card-reactions">';
        reactionsArray.forEach(([emoji, count]) => {
            if (count > 0) {
                reactionsHTML += `<span class="reaction-count">${emoji} ${count}</span>`;
            }
        });
        reactionsHTML += '</div>';
    }
    
    // Status badge
    const statusBadge = isLive
        ? '<span class="badge-live"><span class="live-dot"></span>EN DIRECT</span>'
        : `<span class="badge-scheduled">📅 ${formatDate(liveData.scheduledAt)}</span>`;
    
    // Private badge
    const privateBadge = !liveData.isPublic ? '<span class="badge-private">🔒</span>' : '';
    
    // Category
    const category = getCategoryLabel(liveData.category);
    
    card.innerHTML = `
        <div class="card-header">
            <img src="${liveData.hostPhoto}" class="card-avatar" alt="${liveData.hostName}">
            <div class="card-info">
                <div class="card-host">${liveData.hostName}</div>
                <div class="card-category">${category}</div>
            </div>
        </div>
        <h3 class="card-title">${liveData.title}</h3>
        <p class="card-desc">${liveData.description || 'Aucune description'}</p>
        <div class="card-footer">
            <div class="card-stats">
                ${isLive ? `👥 ${listeners}` : ''}
                ${isLive && messages > 0 ? `&nbsp;&nbsp;💬 ${messages}` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                ${statusBadge}
                ${privateBadge}
            </div>
        </div>
        ${reactionsHTML}
    `;
    
    return card;
}

// ================================================================
// HANDLE JOIN LIVE
// ================================================================

function handleJoinLive(liveId, liveData) {
    console.log('🎯 Tentative de rejoindre:', liveId);
    
    if (!liveData.isPublic) {
        state.pendingLiveId = liveId;
        showCodeModal();
    } else {
        joinLive(liveId);
    }
}

// ================================================================
// CODE MODAL
// ================================================================

function showCodeModal() {
    const modal = document.getElementById('codeModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('code1')?.focus();
}

function closeCodeModal() {
    const modal = document.getElementById('codeModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.getElementById('codeError')?.classList.add('hidden');
    
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`code${i}`);
        if (input) input.value = '';
    }
    
    state.pendingLiveId = null;
}

document.getElementById('closeCodeModal')?.addEventListener('click', closeCodeModal);
document.getElementById('cancelCodeModal')?.addEventListener('click', closeCodeModal);

// Code inputs auto-navigation
for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`code${i}`);
    if (!input) continue;
    
    input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
        if (input.value && i < 6) {
            document.getElementById(`code${i + 1}`)?.focus();
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && i > 1) {
            document.getElementById(`code${i - 1}`)?.focus();
        }
    });
}

// Submit code
document.getElementById('submitCodeBtn')?.addEventListener('click', async () => {
    const code = Array.from({length: 6}, (_, i) => 
        document.getElementById(`code${i + 1}`)?.value || ''
    ).join('').toUpperCase();
    
    if (code.length !== 6) {
        showCodeError('❌ Veuillez saisir les 6 caractères');
        return;
    }
    
    try {
        const liveDoc = await getDoc(doc(db, 'lives', state.pendingLiveId));
        
        if (liveDoc.exists()) {
            const liveData = liveDoc.data();
            if (liveData.accessCode === code) {
                closeCodeModal();
                joinLive(state.pendingLiveId);
            } else {
                showCodeError('❌ Code incorrect');
            }
        } else {
            showCodeError('❌ Live introuvable');
        }
    } catch (error) {
        console.error('Code verification error:', error);
        showCodeError('❌ Erreur de vérification');
    }
});

function showCodeError(message) {
    const errorEl = document.getElementById('codeError');
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// ================================================================
// JOIN LIVE
// ================================================================

async function joinLive(liveId) {
    if (!state.currentUser) {
        showToast('❌ Vous devez être connecté');
        return;
    }
    
    try {
        console.log('🚀 Rejoindre live:', liveId);
        
        const liveDoc = await getDoc(doc(db, 'lives', liveId));
        if (!liveDoc.exists()) {
            showToast('❌ Live introuvable');
            return;
        }
        
        const liveData = liveDoc.data();
        
        // Determine role
        if (liveData.hostId === state.currentUser.uid) {
            state.currentRole = 'host';
        } else {
            state.currentRole = 'listener';
        }
        
        state.currentLiveId = liveId;
        
        // Add as listener in Realtime Database
        await dbSet(dbRef(rtdb, `lives/${liveId}/listeners/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL,
            joinedAt: Date.now()
        });
        
        // Increment listener count in Firestore
        await updateDoc(doc(db, 'lives', liveId), {
            'stats.currentListeners': increment(1),
            'stats.peakListeners': increment(1)
        });
        
        // Trigger live room setup
        window.dispatchEvent(new CustomEvent('joinLive', {
            detail: { liveId, liveData }
        }));
        
        showToast('✅ Vous avez rejoint le live !');
    } catch (error) {
        console.error('Join live error:', error);
        showToast('❌ Erreur: ' + error.message, 5000);
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryLabel(category) {
    const labels = {
        tech: '💻 Technologie',
        education: '📚 Éducation',
        music: '🎵 Musique',
        discussion: '💬 Discussion',
        qa: '❓ Q&A',
        news: '📰 Actualités',
        art: '🎨 Art & Créativité',
        gaming: '🎮 Gaming',
        other: '🎭 Autre'
    };
    return labels[category] || category;
}

console.log('✅ Explore module loaded');