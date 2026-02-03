// ================================================================
// SIS LIVE AUDIO - NOTIFICATIONS IN-APP
// ================================================================

import { db, rtdb, state, showToast } from './config.js';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet,
    remove as dbRemove,
    onValue
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

let notificationsList = [];
let unreadCount = 0;
let notifUnsubscriber = null;

// ================================================================
// INITIALISER LES NOTIFICATIONS
// ================================================================

export function initializeNotifications() {
    if (!state.currentUser) return;
    
    console.log('📢 Initializing notifications...');
    
    // Écouter les nouvelles notifications
    const notifsRef = collection(db, 'notifications', state.currentUser.uid, 'items');
    const q = query(notifsRef, where('read', '==', false), orderBy('createdAt', 'desc'), limit(50));
    
    notifUnsubscriber = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const notif = { id: change.doc.id, ...change.doc.data() };
                handleNewNotification(notif);
            }
        });
        
        // Mettre à jour le compteur
        unreadCount = snapshot.size;
        updateNotificationBadge();
    });
}

// ================================================================
// AFFICHER UNE NOTIFICATION IN-APP
// ================================================================

function handleNewNotification(notif) {
    console.log('📬 Nouvelle notification:', notif);
    
    notificationsList.unshift(notif);
    
    // Afficher la notification flottante
    showInAppNotification(notif);
    
    // Jouer un son (optionnel)
    playNotificationSound();
}

function showInAppNotification(notif) {
    const container = document.getElementById('inAppNotifications');
    if (!container) return;
    
    const notifEl = document.createElement('div');
    notifEl.className = `in-app-notif ${notif.type}`;
    
    let icon = '🔔';
    let actions = '';
    
    switch (notif.type) {
        case 'hand_raise':
            icon = '✋';
            actions = `
                <div class="notif-actions">
                    <button class="notif-btn accept" onclick="window.acceptHandRaise('${notif.from.uid}', '${notif.liveId}', '${notif.id}')">
                        ✅ Accepter
                    </button>
                    <button class="notif-btn reject" onclick="window.rejectHandRaise('${notif.from.uid}', '${notif.liveId}', '${notif.id}')">
                        ❌ Refuser
                    </button>
                </div>
            `;
            break;
        case 'speaker_accepted':
            icon = '✅';
            break;
        case 'speaker_rejected':
            icon = '❌';
            break;
        case 'milestone':
            icon = '🎉';
            break;
        case 'duration':
            icon = '⏰';
            break;
        case 'new_listener':
            icon = '👋';
            break;
    }
    
    notifEl.innerHTML = `
        <div class="notif-icon">${icon}</div>
        <div class="notif-content">
            <div class="notif-title">${notif.title || 'Notification'}</div>
            <div class="notif-message">${notif.message}</div>
            ${actions}
        </div>
        <button class="notif-close" onclick="this.closest('.in-app-notif').remove()">✕</button>
    `;
    
    container.appendChild(notifEl);
    
    // Auto-remove après 10 secondes (sauf hand_raise)
    if (notif.type !== 'hand_raise') {
        setTimeout(() => notifEl.remove(), 10000);
    }
}

// ================================================================
// ACTIONS SUR LES NOTIFICATIONS
// ================================================================

// Accepter une demande de parole
window.acceptHandRaise = async function(userId, liveId, notifId) {
    try {
        // Promouvoir l'utilisateur en speaker
        await dbSet(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`), {
            role: 'speaker',
            promotedAt: Date.now()
        });
        
        // Retirer la demande
        await dbRemove(dbRef(rtdb, `lives/${liveId}/handRaiseRequests/${userId}`));
        
        // Marquer la notification comme lue
        await updateDoc(doc(db, 'notifications', state.currentUser.uid, 'items', notifId), {
            read: true
        });
        
        // Envoyer une notification à l'utilisateur
        await sendNotification(userId, {
            type: 'speaker_accepted',
            title: '✅ Demande acceptée',
            message: 'Vous êtes maintenant speaker dans ce live !',
            liveId: liveId
        });
        
        showToast('✅ Speaker ajouté');
        document.querySelector(`[data-notif-id="${notifId}"]`)?.remove();
        
    } catch (error) {
        console.error('Accept hand raise error:', error);
        showToast('❌ Erreur');
    }
};

// Refuser une demande de parole
window.rejectHandRaise = async function(userId, liveId, notifId) {
    try {
        // Retirer la demande
        await dbRemove(dbRef(rtdb, `lives/${liveId}/handRaiseRequests/${userId}`));
        
        // Marquer la notification comme lue
        await updateDoc(doc(db, 'notifications', state.currentUser.uid, 'items', notifId), {
            read: true
        });
        
        // Envoyer une notification à l'utilisateur
        await sendNotification(userId, {
            type: 'speaker_rejected',
            title: '❌ Demande refusée',
            message: 'Votre demande de parole a été refusée',
            liveId: liveId
        });
        
        showToast('✅ Demande refusée');
        document.querySelector(`[data-notif-id="${notifId}"]`)?.remove();
        
    } catch (error) {
        console.error('Reject hand raise error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// ENVOYER UNE NOTIFICATION
// ================================================================

export async function sendNotification(toUserId, notifData) {
    try {
        const notifRef = doc(collection(db, 'notifications', toUserId, 'items'));
        
        await setDoc(notifRef, {
            ...notifData,
            from: {
                uid: state.currentUser.uid,
                name: state.currentUser.displayName,
                photo: state.currentUser.photoURL
            },
            read: false,
            createdAt: Timestamp.now()
        });
        
        console.log('📤 Notification envoyée à:', toUserId);
        
    } catch (error) {
        console.error('Send notification error:', error);
    }
}

// ================================================================
// ENVOYER DEMANDE DE PAROLE
// ================================================================

export async function sendHandRaiseRequest(liveId, hostId) {
    try {
        // Enregistrer la demande dans Realtime DB
        await dbSet(dbRef(rtdb, `lives/${liveId}/handRaiseRequests/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL,
            requestedAt: Date.now()
        });
        
        // Envoyer une notification à l'hôte
        await sendNotification(hostId, {
            type: 'hand_raise',
            title: '✋ Demande de parole',
            message: `${state.currentUser.displayName} veut rejoindre en tant que speaker`,
            liveId: liveId
        });
        
        showToast('✋ Demande envoyée à l\'hôte');
        
    } catch (error) {
        console.error('Send hand raise error:', error);
        showToast('❌ Erreur lors de l\'envoi');
    }
}

// ================================================================
// METTRE À JOUR LE BADGE
// ================================================================

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ================================================================
// BOUTON NOTIFICATIONS (Header)
// ================================================================

document.getElementById('notifBtn')?.addEventListener('click', () => {
    showNotificationsPanel();
});

function showNotificationsPanel() {
    // Créer un panneau de notifications
    const panel = document.createElement('div');
    panel.className = 'notifications-panel';
    panel.innerHTML = `
        <div class="panel-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="panel-content">
            <div class="panel-header">
                <h3>🔔 Notifications</h3>
                <button class="panel-close" onclick="this.closest('.notifications-panel').remove()">✕</button>
            </div>
            <div class="panel-body">
                ${notificationsList.length === 0 ? '<p class="empty-notifs">Aucune notification</p>' : ''}
                <div class="notifs-list" id="notifsList"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Afficher les notifications
    const list = panel.querySelector('#notifsList');
    notificationsList.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.innerHTML = `
            <div class="notif-item-icon">${getNotifIcon(notif.type)}</div>
            <div class="notif-item-content">
                <div class="notif-item-title">${notif.title}</div>
                <div class="notif-item-message">${notif.message}</div>
                <div class="notif-item-time">${formatTime(notif.createdAt)}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function getNotifIcon(type) {
    const icons = {
        hand_raise: '✋',
        speaker_accepted: '✅',
        speaker_rejected: '❌',
        milestone: '🎉',
        duration: '⏰',
        new_listener: '👋'
    };
    return icons[type] || '🔔';
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
}

// ================================================================
// SONS DE NOTIFICATION
// ================================================================

function playNotificationSound() {
    // Son simple avec Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Silent fail
    }
}

// ================================================================
// NOTIFICATIONS AUTOMATIQUES POUR MILESTONES
// ================================================================

export function checkAudienceMilestone(liveId, count, hostId) {
    const milestones = [10, 50, 100, 500, 1000];
    
    if (milestones.includes(count)) {
        sendNotification(hostId, {
            type: 'milestone',
            title: '🎉 Félicitations !',
            message: `Votre live a atteint ${count} auditeurs !`,
            liveId: liveId
        });
    }
}

export function checkLiveDuration(liveId, durationMinutes, hostId) {
    const durations = [60, 120, 180]; // 1h, 2h, 3h
    
    if (durations.includes(durationMinutes)) {
        const hours = durationMinutes / 60;
        sendNotification(hostId, {
            type: 'duration',
            title: '⏰ Durée du live',
            message: `Votre live dure depuis ${hours}h. Pensez à conclure bientôt ?`,
            liveId: liveId
        });
    }
}

// ================================================================
// CLEANUP
// ================================================================

export function cleanupNotifications() {
    if (notifUnsubscriber) {
        notifUnsubscriber();
        notifUnsubscriber = null;
    }
    
    notificationsList = [];
    unreadCount = 0;
}

console.log('✅ Notifications module loaded');
