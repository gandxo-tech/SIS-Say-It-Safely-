// ================================================================
// SIS LIVE AUDIO - NOTIFICATIONS
// ================================================================

import { db, state, showToast } from './config.js';
import { collection, doc, setDoc, updateDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref as dbRef, set as dbSet, remove as dbRemove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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
        
        console.log('📤 Notification envoyée');
    } catch (error) {
        console.error('Send notification error:', error);
    }
}

export async function sendHandRaiseRequest(liveId, hostId) {
    try {
        await dbSet(dbRef(rtdb, `lives/${liveId}/handRaiseRequests/${state.currentUser.uid}`), {
            name: state.currentUser.displayName,
            photo: state.currentUser.photoURL,
            requestedAt: Date.now()
        });
        
        await sendNotification(hostId, {
            type: 'hand_raise',
            title: '✋ Demande de parole',
            message: `${state.currentUser.displayName} veut rejoindre`,
            liveId: liveId
        });
        
        showToast('✋ Demande envoyée');
    } catch (error) {
        console.error('Hand raise error:', error);
        showToast('❌ Erreur');
    }
}

console.log('✅ Notifications module loaded');
