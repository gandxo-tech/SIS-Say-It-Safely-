// ================================================================
// SIS LIVE AUDIO - WEBRTC HYBRIDE INTELLIGENT
// 🎯 Mode 1: Agora.io (10,000 min/mois) - Haute qualité
// 🎯 Mode 2: WebRTC natif (illimité) - FALLBACK AUTO si quota dépassé
// ================================================================

import { state, showToast } from './config.js';
import { rtdb, db } from './config.js';
import {
    ref as dbRef,
    set as dbSet,
    update as dbUpdate,
    get as dbGet,
    onValue,
    onChildAdded,
    push as dbPush
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ================================================================
// CONFIGURATION
// ================================================================

const AGORA_APP_ID = "64a6d3b2b6324eaa9991690bf361e4e3"; // ⚠️ À REMPLACER
const AGORA_MONTHLY_QUOTA = 10000; // Minutes gratuites
const AGORA_WARNING_THRESHOLD = 9000; // Alerte à 90%

let currentMode = null; // 'agora' ou 'webrtc'
let agoraClient = null;
let localAudioTrack = null;
let isAudioEnabled = true;
let volumeInterval = null;
let localStream = null;
let peerConnections = {};
let minuteTrackingInterval = null;

// ================================================================
// VÉRIFIER LE QUOTA AGORA
// ================================================================

async function checkAgoraQuota() {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const statsDoc = await getDoc(doc(db, 'agoraStats', monthKey));
        
        if (!statsDoc.exists()) {
            await setDoc(doc(db, 'agoraStats', monthKey), {
                minutesUsed: 0,
                lastUpdate: Timestamp.now()
            });
            return { minutesUsed: 0, hasQuota: true };
        }
        
        const minutesUsed = statsDoc.data().minutesUsed || 0;
        const hasQuota = minutesUsed < AGORA_MONTHLY_QUOTA;
        
        console.log(`📊 Agora: ${minutesUsed}/${AGORA_MONTHLY_QUOTA} min`);
        
        if (minutesUsed >= AGORA_WARNING_THRESHOLD && hasQuota) {
            showToast(`⚠️ Agora: ${AGORA_MONTHLY_QUOTA - minutesUsed} min restantes`, 5000);
        }
        
        return { minutesUsed, hasQuota };
        
    } catch (error) {
        console.error('Quota check error:', error);
        return { minutesUsed: 0, hasQuota: true };
    }
}

// ================================================================
// INITIALISER (CHOIX AUTO DU MODE)
// ================================================================

export async function initializeAudio(liveId, role) {
    try {
        console.log('🎤 Initializing audio...');
        
        const { hasQuota } = await checkAgoraQuota();
        
        if (hasQuota && AGORA_APP_ID !== "YOUR_AGORA_APP_ID") {
            currentMode = 'agora';
            console.log('✅ Mode: AGORA (Pro)');
            showToast('🎤 Audio Pro (Agora.io)');
            await initializeAgora(liveId, role);
            startMinuteTracking(liveId);
        } else {
            currentMode = 'webrtc';
            console.log('✅ Mode: WebRTC (Gratuit)');
            showToast(hasQuota ? '🎤 WebRTC activé' : '📊 Quota dépassé → WebRTC gratuit', 5000);
            await initializeWebRTC(liveId, role);
        }
        
    } catch (error) {
        console.error('Init error:', error);
        if (currentMode !== 'webrtc') {
            currentMode = 'webrtc';
            await initializeWebRTC(liveId, role);
        }
    }
}

// ================================================================
// AGORA.IO
// ================================================================

async function initializeAgora(liveId, role) {
    const AgoraRTC = await import("https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js");
    
    agoraClient = AgoraRTC.default.createClient({ mode: "live", codec: "vp8" });
    
    await agoraClient.setClientRole(role === 'host' || role === 'speaker' ? "host" : "audience");
    await agoraClient.join(AGORA_APP_ID, liveId, null, state.currentUser.uid);
    
    console.log('✅ Joined Agora:', liveId);
    
    if (role === 'host' || role === 'speaker') {
        localAudioTrack = await AgoraRTC.default.createMicrophoneAudioTrack({
            encoderConfig: "music_standard",
            AEC: true, ANS: true, AGC: true
        });
        
        await agoraClient.publish([localAudioTrack]);
        
        volumeInterval = setInterval(() => {
            const vol = localAudioTrack.getVolumeLevel();
            updateSpeakingIndicator(state.currentUser.uid, vol > 0.1);
        }, 200);
    }
    
    agoraClient.on("user-published", async (user, mediaType) => {
        if (mediaType === "audio") {
            await agoraClient.subscribe(user, mediaType);
            user.audioTrack.play();
            updateSpeakingIndicator(user.uid, true);
        }
    });
    
    agoraClient.on("user-unpublished", (user) => {
        updateSpeakingIndicator(user.uid, false);
    });
}

// ================================================================
// WEBRTC NATIF
// ================================================================

async function initializeWebRTC(liveId, role) {
    if (role === 'host' || role === 'speaker') {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
        });
        
        setupWebRTCSignaling(liveId);
        enableWebRTCVoiceDetection();
    } else {
        setupWebRTCListener(liveId);
    }
}

function setupWebRTCSignaling(liveId) {
    onChildAdded(dbRef(rtdb, `lives/${liveId}/webrtc/requests`), async (snapshot) => {
        await createPeerConnection(liveId, snapshot.key, true);
    });
}

function setupWebRTCListener(liveId) {
    onValue(dbRef(rtdb, `lives/${liveId}/speakers`), async (snapshot) => {
        const speakers = snapshot.val() || {};
        for (const speakerId of Object.keys(speakers)) {
            if (!peerConnections[speakerId]) {
                await dbSet(dbRef(rtdb, `lives/${liveId}/webrtc/requests/${state.currentUser.uid}`), {
                    from: state.currentUser.uid,
                    to: speakerId,
                    timestamp: Date.now()
                });
                await createPeerConnection(liveId, speakerId, false);
            }
        }
    });
}

async function createPeerConnection(liveId, peerId, isInitiator) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });
    
    peerConnections[peerId] = pc;
    
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
    
    pc.ontrack = (event) => {
        let audio = document.getElementById(`audio-${peerId}`);
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = `audio-${peerId}`;
            audio.autoplay = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
        }
        audio.srcObject = event.streams[0];
    };
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            dbPush(dbRef(rtdb, `lives/${liveId}/webrtc/candidates/${state.currentUser.uid}_to_${peerId}`), {
                candidate: event.candidate.toJSON()
            });
        }
    };
    
    if (isInitiator && localStream) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await dbSet(dbRef(rtdb, `lives/${liveId}/webrtc/offers/${state.currentUser.uid}_to_${peerId}`), {
            offer: { type: offer.type, sdp: offer.sdp }
        });
    }
    
    // Signaling
    onValue(dbRef(rtdb, `lives/${liveId}/webrtc/offers/${peerId}_to_${state.currentUser.uid}`), async (snap) => {
        const data = snap.val();
        if (data && data.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await dbSet(dbRef(rtdb, `lives/${liveId}/webrtc/answers/${state.currentUser.uid}_to_${peerId}`), {
                answer: { type: answer.type, sdp: answer.sdp }
            });
        }
    });
    
    onValue(dbRef(rtdb, `lives/${liveId}/webrtc/answers/${peerId}_to_${state.currentUser.uid}`), async (snap) => {
        const data = snap.val();
        if (data && data.answer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });
    
    onChildAdded(dbRef(rtdb, `lives/${liveId}/webrtc/candidates/${peerId}_to_${state.currentUser.uid}`), async (snap) => {
        const data = snap.val();
        if (data && data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => {});
        }
    });
}

function enableWebRTCVoiceDetection() {
    if (!localStream) return;
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(localStream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    function detect() {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        updateSpeakingIndicator(state.currentUser.uid, avg > 20);
        requestAnimationFrame(detect);
    }
    detect();
}

// ================================================================
// TRACKING MINUTES & AUTO-SWITCH
// ================================================================

function startMinuteTracking(liveId) {
    minuteTrackingInterval = setInterval(async () => {
        try {
            const snapshot = await dbGet(dbRef(rtdb, `lives/${liveId}/listeners`));
            const count = snapshot.size || 0;
            const minutesToAdd = count + 1;
            
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            await updateDoc(doc(db, 'agoraStats', monthKey), {
                minutesUsed: increment(minutesToAdd),
                lastUpdate: Timestamp.now()
            });
            
            const statsDoc = await getDoc(doc(db, 'agoraStats', monthKey));
            const minutesUsed = statsDoc.data().minutesUsed;
            
            if (minutesUsed >= AGORA_MONTHLY_QUOTA) {
                console.log('🚨 Quota atteint! Switch vers WebRTC...');
                await switchToWebRTC(liveId);
            }
        } catch (error) {
            console.error('Tracking error:', error);
        }
    }, 60000);
}

async function switchToWebRTC(liveId) {
    showToast('📊 Quota Agora atteint → WebRTC gratuit activé', 8000);
    
    if (volumeInterval) clearInterval(volumeInterval);
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
    }
    if (agoraClient) await agoraClient.leave();
    
    currentMode = 'webrtc';
    await initializeWebRTC(liveId, state.currentRole);
}

// ================================================================
// TOGGLE MUTE
// ================================================================

export async function toggleMute() {
    if (currentMode === 'agora') {
        if (!localAudioTrack) return;
        await localAudioTrack.setEnabled(!isAudioEnabled);
        isAudioEnabled = !isAudioEnabled;
    } else {
        if (!localStream) return;
        const track = localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        isAudioEnabled = track.enabled;
    }
    
    showToast(isAudioEnabled ? '🎤 Micro activé' : '🔇 Micro coupé');
    await updateMuteStatus(!isAudioEnabled);
}

// ================================================================
// UTILS
// ================================================================

async function updateSpeakingIndicator(userId, isSpeaking) {
    if (!state.currentLiveId) return;
    await dbUpdate(dbRef(rtdb, `lives/${state.currentLiveId}/speakers/${userId}`), {
        isSpeaking
    }).catch(() => {});
}

async function updateMuteStatus(isMuted) {
    if (!state.currentLiveId) return;
    await dbUpdate(dbRef(rtdb, `lives/${state.currentLiveId}/speakers/${state.currentUser.uid}`), {
        isMuted
    }).catch(() => {});
}

// ================================================================
// CLEANUP
// ================================================================

export async function cleanupAudio() {
    if (minuteTrackingInterval) clearInterval(minuteTrackingInterval);
    if (volumeInterval) clearInterval(volumeInterval);
    
    if (currentMode === 'agora') {
        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack.close();
        }
        if (agoraClient) await agoraClient.leave();
    } else {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};
        document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());
    }
}

export function getAudioState() {
    return {
        enabled: isAudioEnabled,
        initialized: (localAudioTrack !== null) || (localStream !== null),
        mode: currentMode
    };
}

console.log('✅ Hybrid WebRTC loaded');
console.log('🎯 Agora → WebRTC auto-fallback');
