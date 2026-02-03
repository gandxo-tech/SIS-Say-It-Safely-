// ================================================================
// SIS LIVE AUDIO - MODERATION
// Kick, Ban, Co-hosts, Promouvoir/Rétrograder
// ================================================================

import { db, rtdb, state, showToast } from './config.js';
import { sendNotification } from './notifications.js';
import {
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    getDoc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet,
    remove as dbRemove
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ================================================================
// AFFICHER MENU MODÉRATION
// ================================================================

export function showModerationMenu(userId, userName, userPhoto, liveId, isHost, isCoHost) {
    const menu = document.createElement('div');
    menu.className = 'moderation-menu';
    
    menu.innerHTML = `
        <div class="mod-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="mod-content">
            <div class="mod-header">
                <img src="${userPhoto}" alt="${userName}" class="mod-avatar">
                <div class="mod-user-info">
                    <div class="mod-username">${userName}</div>
                </div>
                <button class="mod-close" onclick="this.closest('.moderation-menu').remove()">✕</button>
            </div>
            <div class="mod-body">
                ${isHost || isCoHost ? `
                    <button class="mod-item" onclick="window.toggleMuteUser('${userId}', '${liveId}')">
                        <span class="mod-icon">🔇</span>
                        <span>Mute / Unmute</span>
                    </button>
                    
                    <button class="mod-item" onclick="window.promoteToSpeaker('${userId}', '${userName}', '${userPhoto}', '${liveId}')">
                        <span class="mod-icon">🗣️</span>
                        <span>Promouvoir Speaker</span>
                    </button>
                    
                    <button class="mod-item" onclick="window.demoteToListener('${userId}', '${liveId}')">
                        <span class="mod-icon">👤</span>
                        <span>Rétrograder Listener</span>
                    </button>
                ` : ''}
                
                ${isHost ? `
                    <button class="mod-item" onclick="window.promoteToCoHost('${userId}', '${userName}', '${liveId}')">
                        <span class="mod-icon">👑</span>
                        <span>Promouvoir Co-Hôte</span>
                    </button>
                    
                    <div class="mod-divider"></div>
                    
                    <button class="mod-item danger" onclick="window.kickUser('${userId}', '${userName}', '${liveId}')">
                        <span class="mod-icon">🚪</span>
                        <span>Kick (Retirer)</span>
                    </button>
                    
                    <button class="mod-item danger" onclick="window.banUser('${userId}', '${userName}', '${liveId}')">
                        <span class="mod-icon">🚫</span>
                        <span>Ban (Bloquer)</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(menu);
}

// ================================================================
// MUTE / UNMUTE
// ================================================================

window.toggleMuteUser = async function(userId, liveId) {
    try {
        const speakerRef = dbRef(rtdb, `lives/${liveId}/speakers/${userId}`);
        const snapshot = await get(speakerRef);
        
        if (snapshot.exists()) {
            const currentMute = snapshot.val().isMuted || false;
            await dbUpdate(speakerRef, {
                isMuted: !currentMute
            });
            
            showToast(currentMute ? '🎤 Micro activé' : '🔇 Micro coupé');
        }
        
        document.querySelector('.moderation-menu')?.remove();
    } catch (error) {
        console.error('Toggle mute error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// PROMOUVOIR SPEAKER
// ================================================================

window.promoteToSpeaker = async function(userId, userName, userPhoto, liveId) {
    try {
        await dbSet(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`), {
            name: userName,
            photo: userPhoto,
            role: 'speaker',
            isMuted: false,
            isSpeaking: false,
            promotedAt: Date.now()
        });
        
        // Retirer des listeners
        await dbRemove(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`));
        
        // Notifier l'utilisateur
        await sendNotification(userId, {
            type: 'speaker_accepted',
            title: '✅ Vous êtes speaker',
            message: 'Vous avez été promu speaker dans ce live',
            liveId: liveId
        });
        
        showToast(`✅ ${userName} est maintenant speaker`);
        document.querySelector('.moderation-menu')?.remove();
        
    } catch (error) {
        console.error('Promote speaker error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// RÉTROGRADER LISTENER
// ================================================================

window.demoteToListener = async function(userId, liveId) {
    try {
        const speakerData = await getDoc(doc(db, `lives/${liveId}/speakers/${userId}`));
        
        if (speakerData.exists()) {
            const data = speakerData.val();
            
            // Ajouter en tant que listener
            await dbSet(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`), {
                name: data.name,
                photo: data.photo,
                demotedAt: Date.now()
            });
            
            // Retirer des speakers
            await dbRemove(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`));
            
            showToast('✅ Rétrogradé en listener');
        }
        
        document.querySelector('.moderation-menu')?.remove();
        
    } catch (error) {
        console.error('Demote listener error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// PROMOUVOIR CO-HÔTE
// ================================================================

window.promoteToCoHost = async function(userId, userName, liveId) {
    if (!confirm(`Promouvoir ${userName} en co-hôte ? Il aura les mêmes pouvoirs que vous.`)) {
        return;
    }
    
    try {
        await dbSet(dbRef(rtdb, `lives/${liveId}/coHosts/${userId}`), {
            name: userName,
            promotedAt: Date.now()
        });
        
        // Notifier
        await sendNotification(userId, {
            type: 'co_host',
            title: '👑 Vous êtes co-hôte',
            message: 'Vous avez été promu co-hôte de ce live',
            liveId: liveId
        });
        
        showToast(`✅ ${userName} est maintenant co-hôte`);
        document.querySelector('.moderation-menu')?.remove();
        
    } catch (error) {
        console.error('Promote co-host error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// KICK (Retirer)
// ================================================================

window.kickUser = async function(userId, userName, liveId) {
    if (!confirm(`Retirer ${userName} de ce live ?`)) {
        return;
    }
    
    try {
        // Retirer de partout
        await dbRemove(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`));
        await dbRemove(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`));
        
        // Enregistrer dans un log
        await setDoc(doc(db, 'moderationLogs', liveId, 'actions', `kick_${userId}_${Date.now()}`), {
            type: 'kick',
            userId: userId,
            userName: userName,
            moderatorId: state.currentUser.uid,
            moderatorName: state.currentUser.displayName,
            timestamp: Timestamp.now()
        });
        
        showToast(`✅ ${userName} a été retiré`);
        document.querySelector('.moderation-menu')?.remove();
        
    } catch (error) {
        console.error('Kick user error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// BAN (Bloquer définitivement)
// ================================================================

window.banUser = async function(userId, userName, liveId) {
    const reason = prompt(`Bannir ${userName} ?\nRaison (optionnelle) :`);
    if (reason === null) return; // Annulé
    
    try {
        // Retirer de partout
        await dbRemove(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`));
        await dbRemove(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`));
        
        // Ajouter à la liste des bannis
        await setDoc(doc(db, 'bannedUsers', liveId, 'users', userId), {
            userId: userId,
            userName: userName,
            bannedBy: state.currentUser.uid,
            bannedByName: state.currentUser.displayName,
            reason: reason || 'Non spécifié',
            bannedAt: Timestamp.now()
        });
        
        // Log
        await setDoc(doc(db, 'moderationLogs', liveId, 'actions', `ban_${userId}_${Date.now()}`), {
            type: 'ban',
            userId: userId,
            userName: userName,
            reason: reason,
            moderatorId: state.currentUser.uid,
            moderatorName: state.currentUser.displayName,
            timestamp: Timestamp.now()
        });
        
        showToast(`🚫 ${userName} a été banni`);
        document.querySelector('.moderation-menu')?.remove();
        
    } catch (error) {
        console.error('Ban user error:', error);
        showToast('❌ Erreur');
    }
};

// ================================================================
// VÉRIFIER SI UN USER EST BANNI
// ================================================================

export async function checkIfBanned(userId, liveId) {
    try {
        const banDoc = await getDoc(doc(db, 'bannedUsers', liveId, 'users', userId));
        return banDoc.exists();
    } catch (error) {
        console.error('Check banned error:', error);
        return false;
    }
}

// ================================================================
// DÉBANNIR UN UTILISATEUR
// ================================================================

export async function unbanUser(userId, liveId) {
    try {
        await deleteDoc(doc(db, 'bannedUsers', liveId, 'users', userId));
        showToast('✅ Utilisateur débanni');
    } catch (error) {
        console.error('Unban error:', error);
        showToast('❌ Erreur');
    }
}

// ================================================================
// AFFICHER LISTE DES BANNIS (Pour l'hôte)
// ================================================================

export async function showBannedList(liveId) {
    const modal = document.createElement('div');
    modal.className = 'banned-list-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚫 Utilisateurs bannis</h3>
                <button class="modal-close" onclick="this.closest('.banned-list-modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div id="bannedListContent">Chargement...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Charger la liste
    // TODO: Implémenter chargement depuis Firestore
}

console.log('✅ Moderation module loaded');
