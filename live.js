// ================================================================
// SIS LIVE AUDIO - LIVE ROOM COMPLET
// Menu complet + Lever la main + Indicateurs visuels
// ================================================================

import { db, rtdb, state, showToast, showSection } from './config.js';
import { initializeAudio, toggleMute, cleanupAudio, getAudioState } from './webrtc.js';
import {
    doc,
    updateDoc,
    increment,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet,
    push as dbPush,
    remove as dbRemove,
    onValue,
    onChildAdded
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

let liveTimer = null;
let liveStartTime = null;
let liveUnsubscribers = [];

// ================================================================
// JOIN LIVE EVENT
// ================================================================

window.addEventListener('joinLive', (e) => {
    const { liveId, liveData } = e.detail;
    setupLiveRoom(liveId, liveData);
});

// ================================================================
// SETUP LIVE ROOM
// ================================================================

function setupLiveRoom(liveId, liveData) {
    cleanupLiveRoom();
    
    state.currentLiveId = liveId;
    
    showSection('liveRoomSection');
    document.getElementById('liveRoomTitle').textContent = liveData.title;
    
    // Initialize WebRTC audio
    initializeAudio(liveId, state.currentRole).catch(error => {
        console.error('WebRTC init failed:', error);
        showToast('⚠️ Erreur audio : ' + error.message, 5000);
    });
    
    // Setup speakers listener
    const speakersRef = dbRef(rtdb, `lives/${liveId}/speakers`);
    const speakersUnsub = onValue(speakersRef, (snapshot) => {
        updateStage(snapshot.val() || {});
    });
    liveUnsubscribers.push(() => speakersUnsub());
    
    // Setup listeners count
    const listenersRef = dbRef(rtdb, `lives/${liveId}/listeners`);
    const listenersUnsub = onValue(listenersRef, (snapshot) => {
        const count = snapshot.size || 0;
        document.getElementById('listenerCount').textContent = count;
    });
    liveUnsubscribers.push(() => listenersUnsub());
    
    // Setup chat listener
    const chatRef = dbRef(rtdb, `lives/${liveId}/chat`);
    const chatUnsub = onChildAdded(chatRef, (snapshot) => {
        addChatMessage(snapshot.val());
    });
    liveUnsubscribers.push(() => chatUnsub());
    
    // Setup reactions listener
    const reactionsRef = dbRef(rtdb, `lives/${liveId}/reactions`);
    const reactionsUnsub = onChildAdded(reactionsRef, (snapshot) => {
        const reaction = snapshot.val();
        showFloatingReaction(reaction.emoji);
    });
    liveUnsubscribers.push(() => reactionsUnsub());
    
    // Start timer
    startLiveTimer(liveData.startedAt);
    
    // Show/hide raise hand button
    const raiseHandBtn = document.getElementById('raiseHandBtn');
    if (raiseHandBtn) {
        if (state.currentRole === 'host' || state.currentRole === 'speaker') {
            raiseHandBtn.style.display = 'none';
        } else {
            raiseHandBtn.style.display = 'flex';
        }
    }
}

// ================================================================
// STAGE (SPEAKERS)
// ================================================================

function updateStage(speakers) {
    const stage = document.getElementById('stage');
    if (!stage) return;
    
    if (!speakers || Object.keys(speakers).length === 0) {
        stage.innerHTML = '<div class="stage-empty">En attente de speakers...</div>';
        return;
    }
    
    stage.innerHTML = '';
    
    Object.entries(speakers).forEach(([userId, speaker]) => {
        const speakerEl = document.createElement('div');
        speakerEl.className = 'speaker';
        
        // Classe "speaking" pour activer les ondes
        const avatarClass = speaker.isSpeaking ? 'speaker-avatar speaking' : 'speaker-avatar';
        const roleIcon = speaker.role === 'host' ? '👑' : '🎤';
        const roleText = speaker.role === 'host' ? 'Hôte' : 'Speaker';
        
        // Indicateur mute
        const muteIndicator = speaker.isMuted ? '<div class="mute-indicator">🔇</div>' : '';
        
        speakerEl.innerHTML = `
            <div class="${avatarClass}">
                <img src="${speaker.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(speaker.name)}" 
                     alt="${speaker.name}">
                ${muteIndicator}
            </div>
            <div class="speaker-name">${speaker.name}</div>
            <div class="speaker-role">${roleIcon} ${roleText}</div>
        `;
        
        stage.appendChild(speakerEl);
    });
}

// ================================================================
// TIMER
// ================================================================

function startLiveTimer(startedAt) {
    if (liveTimer) {
        clearInterval(liveTimer);
    }
    
    liveStartTime = startedAt?.seconds ? startedAt.seconds * 1000 : Date.now();
    
    liveTimer = setInterval(() => {
        const elapsed = Date.now() - liveStartTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timerEl = document.getElementById('liveTimer');
        if (timerEl) {
            timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 1000);
}

// ================================================================
// CHAT
// ================================================================

// Tab switching
document.querySelectorAll('.live-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        document.querySelectorAll('.live-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetTab}Pane`)?.classList.add('active');
    });
});

// Send message
document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message || !state.currentLiveId || !state.currentUser) return;
    
    try {
        await dbPush(dbRef(rtdb, `lives/${state.currentLiveId}/chat`), {
            userId: state.currentUser.uid,
            userName: state.currentUser.displayName,
            userPhoto: state.currentUser.photoURL,
            message: message,
            timestamp: Date.now()
        });
        
        // Increment message count
        await updateDoc(doc(db, 'lives', state.currentLiveId), {
            'stats.totalMessages': increment(1)
        });
        
        input.value = '';
    } catch (error) {
        console.error('Send message error:', error);
    }
}

function addChatMessage(msg) {
    const messagesEl = document.getElementById('chatMessages');
    if (!messagesEl) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    
    const timeAgo = Math.floor((Date.now() - msg.timestamp) / 60000);
    const timeText = timeAgo < 1 ? "À l'instant" : timeAgo === 1 ? "Il y a 1 min" : `Il y a ${timeAgo} min`;
    
    messageEl.innerHTML = `
        <img src="${msg.userPhoto}" alt="${msg.userName}" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${msg.userName}</span>
                <span class="message-time">${timeText}</span>
            </div>
            <div class="message-text">${escapeHtml(msg.message)}</div>
        </div>
    `;
    
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ================================================================
// REACTIONS
// ================================================================

document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        sendReaction(emoji);
    });
});

async function sendReaction(emoji) {
    if (!state.currentLiveId || !state.currentUser) return;
    
    try {
        await dbPush(dbRef(rtdb, `lives/${state.currentLiveId}/reactions`), {
            userId: state.currentUser.uid,
            emoji: emoji,
            timestamp: Date.now()
        });
        
        // Increment reaction count
        await updateDoc(doc(db, 'lives', state.currentLiveId), {
            [`stats.totalReactions.${emoji}`]: increment(1)
        });
    } catch (error) {
        console.error('Send reaction error:', error);
    }
}

function showFloatingReaction(emoji) {
    const container = document.getElementById('reactionsContainer');
    if (!container) return;
    
    const reaction = document.createElement('div');
    reaction.className = 'floating-reaction';
    reaction.textContent = emoji;
    reaction.style.left = (Math.random() * 80 + 10) + '%';
    reaction.style.setProperty('--random-x', (Math.random() * 80 - 40) + 'px');
    
    container.appendChild(reaction);
    
    setTimeout(() => reaction.remove(), 3000);
}

// ================================================================
// RAISE HAND (LEVER LA MAIN)
// ================================================================

document.getElementById('raiseHandBtn')?.addEventListener('click', async () => {
    if (!state.currentLiveId || !state.currentUser) return;
    
    try {
        await dbSet(dbRef(rtdb, `lives/${state.currentLiveId}/handRaiseRequests/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL,
            requestedAt: Date.now()
        });
        
        showToast('✋ Demande envoyée à l\'hôte');
        
        const btn = document.getElementById('raiseHandBtn');
        if (btn) {
            btn.innerHTML = '<span>⏳ En attente...</span>';
            btn.disabled = true;
        }
    } catch (error) {
        console.error('Raise hand error:', error);
        showToast('❌ Erreur lors de la demande');
    }
});

// ================================================================
// LEAVE LIVE
// ================================================================

document.getElementById('leaveLiveBtn')?.addEventListener('click', async () => {
    if (!confirm('Voulez-vous vraiment quitter ce live ?')) return;
    await leaveLive();
});

async function leaveLive() {
    try {
        if (liveTimer) {
            clearInterval(liveTimer);
            liveTimer = null;
        }
        
        if (state.currentLiveId && state.currentUser) {
            // Remove from listeners
            await dbRemove(dbRef(rtdb, `lives/${state.currentLiveId}/listeners/${state.currentUser.uid}`));
            
            // Decrement listener count
            await updateDoc(doc(db, 'lives', state.currentLiveId), {
                'stats.currentListeners': increment(-1)
            });
        }
        
        cleanupLiveRoom();
        showSection('exploreSection');
        
        state.currentLiveId = null;
        state.currentRole = 'listener';
    } catch (error) {
        console.error('Leave live error:', error);
    }
}

// ================================================================
// MENU COMPLET FONCTIONNEL
// ================================================================

document.getElementById('liveMenuBtn')?.addEventListener('click', () => {
    showLiveMenu();
});

function showLiveMenu() {
    const audioState = getAudioState();
    const isHost = state.currentRole === 'host';
    const isSpeaker = state.currentRole === 'speaker' || isHost;
    
    const menu = document.createElement('div');
    menu.className = 'live-menu-modal';
    menu.innerHTML = `
        <div class="menu-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="menu-content">
            <div class="menu-header">
                <h3>Menu</h3>
                <button class="menu-close" onclick="this.closest('.live-menu-modal').remove()">✕</button>
            </div>
            <div class="menu-body">
                ${isSpeaker ? `
                    <button class="menu-item" onclick="window.toggleMicrophone()">
                        <span class="menu-icon">${audioState.enabled ? '🔇' : '🎤'}</span>
                        <span class="menu-text">${audioState.enabled ? 'Couper le micro' : 'Activer le micro'}</span>
                    </button>
                ` : ''}
                
                ${!isSpeaker ? `
                    <button class="menu-item" onclick="window.raiseHandFromMenu()">
                        <span class="menu-icon">✋</span>
                        <span class="menu-text">Lever la main</span>
                    </button>
                ` : ''}
                
                <button class="menu-item" onclick="window.showLiveInfo()">
                    <span class="menu-icon">ℹ️</span>
                    <span class="menu-text">Informations du live</span>
                </button>
                
                <button class="menu-item" onclick="window.copyLiveLink()">
                    <span class="menu-icon">🔗</span>
                    <span class="menu-text">Copier le lien</span>
                </button>
                
                ${isHost ? `
                    <button class="menu-item danger" onclick="window.endLive()">
                        <span class="menu-icon">🛑</span>
                        <span class="menu-text">Terminer le live</span>
                    </button>
                ` : ''}
                
                <button class="menu-item danger" onclick="window.leaveLiveFromMenu()">
                    <span class="menu-icon">🚪</span>
                    <span class="menu-text">Quitter le live</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(menu);
}

// Menu actions globales
window.toggleMicrophone = async function() {
    await toggleMute();
    document.querySelector('.live-menu-modal')?.remove();
};

window.raiseHandFromMenu = function() {
    document.querySelector('.live-menu-modal')?.remove();
    document.getElementById('raiseHandBtn')?.click();
};

window.showLiveInfo = function() {
    showToast(`ℹ️ Live ID: ${state.currentLiveId}\nMode: ${getAudioState().mode}`, 5000);
    document.querySelector('.live-menu-modal')?.remove();
};

window.copyLiveLink = function() {
    const link = `${window.location.origin}${window.location.pathname}?live=${state.currentLiveId}`;
    navigator.clipboard.writeText(link);
    showToast('🔗 Lien copié !');
    document.querySelector('.live-menu-modal')?.remove();
};

window.endLive = async function() {
    if (!confirm('⚠️ Voulez-vous vraiment terminer ce live pour tous les participants ?')) {
        return;
    }
    
    try {
        await updateDoc(doc(db, 'lives', state.currentLiveId), {
            status: 'ended',
            endedAt: Timestamp.now()
        });
        
        showToast('✅ Live terminé');
        document.querySelector('.live-menu-modal')?.remove();
        await leaveLive();
    } catch (error) {
        console.error('End live error:', error);
        showToast('❌ Erreur : ' + error.message);
    }
};

window.leaveLiveFromMenu = function() {
    document.querySelector('.live-menu-modal')?.remove();
    document.getElementById('leaveLiveBtn')?.click();
};

// ================================================================
// CLEANUP
// ================================================================

function cleanupLiveRoom() {
    liveUnsubscribers.forEach(unsub => {
        try {
            unsub();
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    });
    liveUnsubscribers = [];
    
    if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
    }
    
    // Cleanup WebRTC
    cleanupAudio();
    
    // Clear chat
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.innerHTML = '';
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ Live module loaded (menu complet + lever la main)');
