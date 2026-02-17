// ================================================================
// SIS LIVE AUDIO - SCRIPT COMPLET UNIFIÉ
// Bénin 🇧🇯 - Toutes les fonctionnalités
// Version 2.0 - Nouveau projet Firebase + Connexion Anonyme
// ================================================================

// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, onAuthStateChanged, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, query, where, Timestamp, increment, writeBatch, limit, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase, ref as dbRef, push as dbPush, onValue, set as dbSet, off } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ================================================================
// FIREBASE CONFIG (NOUVEAU PROJET: sisliveaudio)
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyBZoVJaCQlDZQut98gYK-Y85IRudSTNbNg",
    authDomain: "sisliveaudio.firebaseapp.com",
    databaseURL: "https://sisliveaudio-default-rtdb.firebaseio.com",
    projectId: "sisliveaudio",
    storageBucket: "sisliveaudio.firebasestorage.app",
    messagingSenderId: "987019026451",
    appId: "1:987019026451:web:3c1632e417765377b01fe6",
    measurementId: "G-33BE2GRRKP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

console.log('✅ Firebase initialized - Project: sisliveaudio');

    signOut,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
    doc,
    setDoc,
    getDoc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ================================================================
// AUTH TABS
// ================================================================

const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

loginTab?.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

registerTab?.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// ================================================================
// UPLOAD PHOTO PROFIL
// ================================================================

let tempPhotoData = null;

document.getElementById('photoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('❌ Image trop grande (max 2MB)');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast('❌ Fichier non valide');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        tempPhotoData = event.target.result;
        
        const preview = document.getElementById('photoPreview');
        if (preview) {
            preview.innerHTML = `<img src="${tempPhotoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        
        showToast('✅ Photo chargée');
    };
    reader.readAsDataURL(file);
});

// ================================================================
// REGISTER
// ================================================================

registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        showAuthError('Mot de passe trop court (6+ caractères)');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let photoURL = tempPhotoData;
        
        if (!photoURL) {
            photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
        }
        
        if (tempPhotoData) {
            localStorage.setItem(`user_${user.uid}_photo`, tempPhotoData);
        }
        
        await updateProfile(user, { 
            displayName: name,
            photoURL: photoURL
        });
        
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: name,
            email: email,
            photoURL: photoURL,
            hasCustomPhoto: tempPhotoData !== null,
            createdAt: Timestamp.now()
        });
        
        tempPhotoData = null;
        showToast('✅ Compte créé !');
        
    } catch (error) {
        console.error('Register error:', error);
        handleAuthError(error);
    }
});

// ================================================================
// LOGIN
// ================================================================

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('✅ Connecté !');
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);
    }
});

// ================================================================
// LOGOUT
// ================================================================

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Se déconnecter ?')) {
        try {
            await signOut(auth);
            showToast('👋 Déconnecté');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
});

// ================================================================
// AUTH STATE
// ================================================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        state.currentUser = user;
        
        const savedPhoto = localStorage.getItem(`user_${user.uid}_photo`);
        if (savedPhoto) {
            state.currentUser.photoURL = savedPhoto;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            const name = user.displayName || user.email.split('@')[0];
            const photoURL = savedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: name,
                email: user.email,
                photoURL: photoURL,
                hasCustomPhoto: savedPhoto !== null,
                createdAt: Timestamp.now()
            });
        }
        
        showSection('exploreSection');
        window.dispatchEvent(new CustomEvent('userAuthenticated'));
        
        console.log('✅ User authenticated:', user.email);
    } else {
        state.currentUser = null;
        showSection('authSection');
    }
});

// ================================================================
// HELPERS
// ================================================================

function showAuthError(message) {
    const errorEl = document.getElementById('authError');
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function handleAuthError(error) {
    let message = 'Erreur';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Email déjà utilisé';
            break;
        case 'auth/invalid-email':
            message = 'Email invalide';
            break;
        case 'auth/weak-password':
            message = 'Mot de passe trop faible';
            break;
        case 'auth/user-not-found':
            message = 'Compte introuvable';
            break;
        case 'auth/wrong-password':
            message = 'Mot de passe incorrect';
            break;
        case 'auth/invalid-credential':
            message = 'Identifiants invalides';
            break;
        default:
            message = error.message;
    }
    
    showAuthError(message);
}

console.log('✅ Auth module loaded');

// ============================================
// AUDIO
// ============================================
// ================================================================
// SIS LIVE AUDIO - WEBRTC HYBRIDE INTELLIGENT
// 🎯 Mode 1: Agora.io (10,000 min/mois) - Haute qualité
// 🎯 Mode 2: WebRTC natif (illimité) - FALLBACK AUTO si quota dépassé
// ================================================================

    ref as dbRef,
    set as dbSet,
    update as dbUpdate,
    get as dbGet,
    onValue,
    onChildAdded,
    push as dbPush
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
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

const AGORA_APP_ID = "64a6d3b2b6324eaa9991690bf361e4e3"; // ✅ Configuré
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

    return {
        enabled: isAudioEnabled,
        initialized: (localAudioTrack !== null) || (localStream !== null),
        mode: currentMode
    };
}

console.log('✅ Hybrid WebRTC loaded');
console.log('🎯 Agora → WebRTC auto-fallback');

// ============================================
// LIVE
// ============================================
// ================================================================
// SIS LIVE AUDIO - LIVE ROOM COMPLET
// Menu complet + Lever la main + Indicateurs visuels
// ================================================================

    doc,
    updateDoc,
    increment,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
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

// ================================================================
// BLOQUER RÉACTIONS POUR HÔTE (NOUVEAU)
// ================================================================

function updateReactionsVisibility() {
    const reactionsEl = document.getElementById('chatReactions');
    if (!reactionsEl) return;
    
    if (state.currentRole === 'host') {
        reactionsEl.style.display = 'none';
        console.log('🚫 Réactions masquées pour hôte');
    } else {
        reactionsEl.style.display = 'flex';
    }
}

// Appeler au setup
window.addEventListener('joinLive', () => {
    setTimeout(() => updateReactionsVisibility(), 500);
});

console.log('✅ Live module updated - réactions bloquées pour hôte');

// ================================================================
// INTÉGRATION SYSTÈME CADEAUX
// ================================================================


// Bouton cadeaux dans le live
document.getElementById('sendGiftBtn')?.addEventListener('click', () => {
    if (!state.currentLiveId) {
        showToast('❌ Vous devez être dans un live');
        return;
    }
    
    // Récupérer infos de l'hôte depuis le live actuel
    const hostId = document.getElementById('liveRoomTitle')?.dataset.hostId;
    const hostName = document.getElementById('liveRoomTitle')?.dataset.hostName;
    
    if (hostId && hostName) {
        showGiftsPanel(hostId, hostName);
    }
});

// Bouton historique gains (pour l'hôte)
document.getElementById('viewEarningsBtn')?.addEventListener('click', () => {
    showGiftsHistory();
});

console.log('✅ Gifts integration loaded');

// ============================================
// EXPLORE
// ============================================
// ================================================================
// SIS LIVE AUDIO - EXPLORE (4 TABS)
// ================================================================

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

// ================================================================
// GRAPHES STATS (NOUVEAU)
// ================================================================

let evolutionChart = null;
let categoriesChart = null;

async function loadStatsWithCharts() {
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
        
        const livesByMonth = {};
        const livesByCategory = {};
        
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
            
            // Par mois
            if (live.createdAt) {
                const date = new Date(live.createdAt.seconds * 1000);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                livesByMonth[month] = (livesByMonth[month] || 0) + 1;
            }
            
            // Par catégorie
            const cat = live.category || 'other';
            livesByCategory[cat] = (livesByCategory[cat] || 0) + 1;
        });
        
        document.getElementById('statTotalLives').textContent = totalLives;
        document.getElementById('statTotalMinutes').textContent = totalMinutes;
        document.getElementById('statTotalListeners').textContent = totalListeners;
        document.getElementById('statTotalMessages').textContent = totalMessages;
        
        // Créer graphes
        createEvolutionChart(livesByMonth);
        createCategoriesChart(livesByCategory);
        
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

function createEvolutionChart(data) {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;
    
    if (evolutionChart) {
        evolutionChart.destroy();
    }
    
    const labels = Object.keys(data).sort();
    const values = labels.map(l => data[l]);
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lives créés',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function createCategoriesChart(data) {
    const ctx = document.getElementById('categoriesChart');
    if (!ctx) return;
    
    if (categoriesChart) {
        categoriesChart.destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    const categoryLabels = {
        tech: '💻 Tech',
        music: '🎵 Musique',
        discussion: '💬 Discussion',
        qa: '❓ Q&A',
        other: '🎭 Autre'
    };
    
    const displayLabels = labels.map(l => categoryLabels[l] || l);
    
    categoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: displayLabels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Remplacer loadStats par loadStatsWithCharts
window.loadStats = loadStatsWithCharts;

console.log('✅ Stats with charts loaded');

// ============================================
// GIFTS
// ============================================
// ================================================================
// SIS LIVE AUDIO - CADEAUX BÉNIN (AVEC COMMISSION)
// Commission plateforme sur chaque cadeau
// Format Bénin : 01 XX XX XX XX
// ================================================================

    doc,
    setDoc,
    updateDoc,
    increment,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
    ref as dbRef,
    push as dbPush
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ================================================================
// CONFIGURATION COMMISSION
// ================================================================

const PLATFORM_COMMISSION = {
    percentage: 10, // 10% de commission plateforme
    minAmount: 10,  // Minimum 10 FCFA par transaction
    walletId: 'PLATFORM_WALLET' // ID wallet plateforme dans Firestore
};

// ================================================================
// CATALOGUE CADEAUX BÉNIN (AVEC RÉPARTITION)
// ================================================================

    {
        id: 'pain',
        name: 'Pain',
        emoji: '🥖',
        price: 100,
        hostReceives: 90,    // Hôte reçoit 90 FCFA
        commission: 10,      // Plateforme reçoit 10 FCFA
        color: '#D4A574',
        animation: 'bounce'
    },
    {
        id: 'cafe',
        name: 'Café',
        emoji: '☕',
        price: 200,
        hostReceives: 180,   // Hôte reçoit 180 FCFA
        commission: 20,      // Plateforme reçoit 20 FCFA
        color: '#8B4513',
        animation: 'float'
    },
    {
        id: 'biere',
        name: 'Bière',
        emoji: '🍺',
        price: 500,
        hostReceives: 450,   // Hôte reçoit 450 FCFA
        commission: 50,      // Plateforme reçoit 50 FCFA
        color: '#FFD700',
        animation: 'shake'
    },
    {
        id: 'fleur',
        name: 'Fleur',
        emoji: '🌻',
        price: 1000,
        hostReceives: 900,   // Hôte reçoit 900 FCFA
        commission: 100,     // Plateforme reçoit 100 FCFA
        color: '#FF69B4',
        animation: 'spin'
    },
    {
        id: 'diamant',
        name: 'Diamant',
        emoji: '💎',
        price: 5000,
        hostReceives: 4500,  // Hôte reçoit 4,500 FCFA
        commission: 500,     // Plateforme reçoit 500 FCFA
        color: '#00CED1',
        animation: 'sparkle'
    }
];

// ================================================================
// VALIDATION NUMÉRO BÉNIN (AVEC 01)
// ================================================================

function validateBeninNumber(number) {
    // Format complet : 01 XX XX XX XX (10 chiffres)
    const cleaned = number.replace(/\s/g, '');
    
    // Vérifier si commence par 01
    if (!cleaned.startsWith('01')) {
        return { 
            valid: false, 
            error: 'Le numéro doit commencer par 01' 
        };
    }
    
    if (cleaned.length !== 10) {
        return { 
            valid: false, 
            error: 'Le numéro doit contenir 10 chiffres (01 XX XX XX XX)' 
        };
    }
    
    // Extraire les 2 chiffres après 01
    const prefix = cleaned.substring(2, 4);
    
    // Préfixes MTN Bénin : 96, 97, 61, 62, 66, 67
    const mtnPrefixes = ['96', '97', '61', '62', '66', '67'];
    // Préfixes Moov Bénin : 90, 91, 94, 95, 98, 99
    const moovPrefixes = ['90', '91', '94', '95', '98', '99'];
    
    let operator = null;
    if (mtnPrefixes.includes(prefix)) {
        operator = 'MTN';
    } else if (moovPrefixes.includes(prefix)) {
        operator = 'MOOV';
    } else {
        return { 
            valid: false, 
            error: 'Préfixe non reconnu (MTN: 96/97/61/62/66/67, Moov: 90/91/94/95/98/99)' 
        };
    }
    
    return {
        valid: true,
        number: cleaned,
        formatted: `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8, 10)}`,
        operator: operator,
        international: `+229${cleaned}`,
        displayNumber: cleaned.substring(2) // Enlever 01 pour affichage
    };
}

// ================================================================
// AFFICHER PANNEAU CADEAUX
// ================================================================

    const existingPanel = document.getElementById('giftsPanel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'giftsPanel';
    panel.className = 'gifts-panel';
    
    panel.innerHTML = `
        <div class="gifts-header">
            <h3>🎁 Envoyer un cadeau</h3>
            <button class="gifts-close" onclick="this.closest('.gifts-panel').remove()">×</button>
        </div>
        <p class="gifts-subtitle">À ${hostName}</p>
        <div class="gifts-grid">
            ${GIFTS_BENIN.map(gift => `
                <div class="gift-card" data-gift-id="${gift.id}">
                    <div class="gift-emoji" style="background: ${gift.color}20">${gift.emoji}</div>
                    <div class="gift-name">${gift.name}</div>
                    <div class="gift-price">${gift.price} FCFA</div>
                    <div class="gift-commission">L'artiste reçoit ${gift.hostReceives} FCFA</div>
                </div>
            `).join('')}
        </div>
        <div class="gifts-info">
            💳 MTN Momo • Moov Money<br>
            <small>Commission plateforme : 10%</small>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelectorAll('.gift-card').forEach(card => {
        card.addEventListener('click', () => {
            const giftId = card.dataset.giftId;
            const gift = GIFTS_BENIN.find(g => g.id === giftId);
            confirmGiftPurchaseBenin(gift, hostId, hostName);
        });
    });
}

// ================================================================
// CONFIRMER ACHAT
// ================================================================

function confirmGiftPurchaseBenin(gift, hostId, hostName) {
    const modal = document.createElement('div');
    modal.className = 'gift-confirm-modal';
    
    modal.innerHTML = `
        <div class="gift-confirm-content">
            <div class="gift-confirm-icon">${gift.emoji}</div>
            <h3>Envoyer ${gift.name} ?</h3>
            <p class="gift-confirm-price">${gift.price} FCFA</p>
            <p class="gift-confirm-to">à ${hostName}</p>
            
            <div class="commission-breakdown">
                <div class="breakdown-item">
                    <span>Artiste reçoit</span>
                    <strong>${gift.hostReceives} FCFA</strong>
                </div>
                <div class="breakdown-item">
                    <span>Frais plateforme (10%)</span>
                    <strong>${gift.commission} FCFA</strong>
                </div>
            </div>
            
            <div class="momo-input-group">
                <label>Numéro Mobile Money Bénin</label>
                <input type="tel" 
                       id="momoNumber" 
                       class="momo-input" 
                       placeholder="01 XX XX XX XX" 
                       maxlength="14">
                <div class="operator-detected" id="operatorDetected"></div>
            </div>
            
            <div class="gift-confirm-buttons">
                <button class="btn-cancel" onclick="this.closest('.gift-confirm-modal').remove()">Annuler</button>
                <button class="btn-confirm" id="confirmGiftBtn">
                    💳 Payer ${gift.price} FCFA
                </button>
            </div>
            
            <p class="gift-confirm-note">
                ⚡ Code de confirmation par SMS
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('momoNumber');
    
    // Auto-format 01 XX XX XX XX
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.substring(0, 10);
        
        // Auto-ajouter 01 si pas présent
        if (value.length > 0 && !value.startsWith('01')) {
            value = '01' + value;
        }
        
        // Format 01 XX XX XX XX
        if (value.length >= 2) {
            const parts = [
                value.substring(0, 2),  // 01
                value.substring(2, 4),  // XX
                value.substring(4, 6),  // XX
                value.substring(6, 8),  // XX
                value.substring(8, 10)  // XX
            ].filter(p => p);
            value = parts.join(' ');
        }
        
        e.target.value = value;
        
        // Détecter opérateur
        const cleaned = value.replace(/\s/g, '');
        if (cleaned.length >= 4) {
            const prefix = cleaned.substring(2, 4);
            const mtnPrefixes = ['96', '97', '61', '62', '66', '67'];
            const moovPrefixes = ['90', '91', '94', '95', '98', '99'];
            
            let operator = '';
            if (mtnPrefixes.includes(prefix)) {
                operator = '📱 MTN Mobile Money';
            } else if (moovPrefixes.includes(prefix)) {
                operator = '📱 Moov Money';
            }
            
            document.getElementById('operatorDetected').textContent = operator;
        }
    });
    
    setTimeout(() => input.focus(), 100);
    
    document.getElementById('confirmGiftBtn').addEventListener('click', async () => {
        const momoNumber = input.value.replace(/\s/g, '');
        
        const validation = validateBeninNumber(momoNumber);
        
        if (!validation.valid) {
            showToast('❌ ' + validation.error);
            return;
        }
        
        await processBeninPaymentWithCommission(gift, hostId, hostName, validation);
        modal.remove();
        document.getElementById('giftsPanel')?.remove();
    });
}

// ================================================================
// TRAITER PAIEMENT AVEC COMMISSION
// ================================================================

async function processBeninPaymentWithCommission(gift, hostId, hostName, phoneData) {
    try {
        showToast('⏳ Traitement du paiement...');
        
        const transactionId = `GIFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const transactionData = {
            id: transactionId,
            type: 'gift',
            giftId: gift.id,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            
            // Montants
            totalAmount: gift.price,
            hostAmount: gift.hostReceives,
            platformCommission: gift.commission,
            currency: 'XOF',
            
            // Parties
            senderId: state.currentUser.uid,
            senderName: state.currentUser.displayName,
            recipientId: hostId,
            recipientName: hostName,
            
            // Paiement
            phoneNumber: phoneData.international,
            operator: phoneData.operator,
            status: 'pending',
            
            // Contexte
            country: 'BJ',
            liveId: state.currentLiveId,
            createdAt: Timestamp.now()
        };
        
        await setDoc(doc(db, 'transactions', transactionId), transactionData);
        
        // APPEL API BACKEND
        const response = await fetch('https://YOUR_BACKEND.com/api/momo/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.uid}`
            },
            body: JSON.stringify({
                transactionId: transactionId,
                phoneNumber: phoneData.international,
                amount: gift.price,
                operator: phoneData.operator,
                description: `Cadeau ${gift.name} - SIS Live`
            })
        });
        
        if (!response.ok) {
            throw new Error('Paiement refusé');
        }
        
        const result = await response.json();
        
        if (result.status === 'SUCCESS' || result.status === 'PENDING') {
            await updateDoc(doc(db, 'transactions', transactionId), {
                status: result.status === 'SUCCESS' ? 'completed' : 'pending',
                paymentId: result.paymentId,
                updatedAt: Timestamp.now()
            });
            
            if (result.status === 'SUCCESS') {
                await completeGiftTransactionWithCommission(gift, transactionId, hostId);
            }
            
            showToast(`✅ ${gift.emoji} ${gift.name} envoyé !`, 5000);
            
        } else {
            throw new Error(result.message || 'Paiement échoué');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        
        await updateDoc(doc(db, 'transactions', transactionId), {
            status: 'failed',
            error: error.message,
            failedAt: Timestamp.now()
        });
        
        showToast('❌ Paiement échoué: ' + error.message, 5000);
    }
}

// ================================================================
// COMPLÉTER TRANSACTION AVEC COMMISSION
// ================================================================

async function completeGiftTransactionWithCommission(gift, transactionId, hostId) {
    // 1. Mettre à jour earnings de l'hôte (montant net)
    await updateDoc(doc(db, 'users', hostId), {
        totalEarnings: increment(gift.hostReceives),
        [`earnings.${gift.id}`]: increment(1)
    });
    
    // 2. Mettre à jour wallet plateforme (commission)
    await updateDoc(doc(db, 'platform', PLATFORM_COMMISSION.walletId), {
        totalCommissions: increment(gift.commission),
        [`commissions.${gift.id}`]: increment(1),
        lastUpdated: Timestamp.now()
    });
    
    // 3. Mettre à jour stats du live
    if (state.currentLiveId) {
        await updateDoc(doc(db, 'lives', state.currentLiveId), {
            [`stats.gifts.${gift.id}`]: increment(1),
            'stats.totalRevenue': increment(gift.price),
            'stats.hostRevenue': increment(gift.hostReceives),
            'stats.platformRevenue': increment(gift.commission)
        });
        
        // Envoyer en temps réel
        await dbPush(dbRef(rtdb, `lives/${state.currentLiveId}/gifts`), {
            giftId: gift.id,
            emoji: gift.emoji,
            name: gift.name,
            amount: gift.price,
            from: state.currentUser.displayName,
            timestamp: Date.now()
        });
    }
    
    // 4. Animation
    animateGift(gift);
}

// ================================================================
// ANIMATION
// ================================================================

function animateGift(gift) {
    const container = document.getElementById('giftAnimationContainer') || createGiftContainer();
    
    const giftEl = document.createElement('div');
    giftEl.className = `gift-animation gift-${gift.animation}`;
    giftEl.style.left = Math.random() * 80 + 10 + '%';
    giftEl.innerHTML = `
        <div class="gift-emoji-large" style="color: ${gift.color}">${gift.emoji}</div>
        <div class="gift-label">+${gift.hostReceives} FCFA</div>
    `;
    
    container.appendChild(giftEl);
    setTimeout(() => giftEl.remove(), 3000);
}

function createGiftContainer() {
    const container = document.createElement('div');
    container.id = 'giftAnimationContainer';
    container.className = 'gift-animation-container';
    document.body.appendChild(container);
    return container;
}

console.log('✅ Gifts Bénin (Commission 10%) loaded');

// ============================================
// NOTIFICATIONS
// ============================================
// ================================================================
// SIS LIVE AUDIO - NOTIFICATIONS
// ================================================================


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

// ============================================
// MODERATION
// ============================================
// ================================================================
// SIS LIVE AUDIO - MODERATION
// ================================================================


    if (!confirm(`Retirer ${userName} ?`)) return;
    
    try {
        await dbRemove(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`));
        await dbRemove(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`));
        
        await setDoc(doc(db, 'moderationLogs', liveId, 'actions', `kick_${userId}_${Date.now()}`), {
            type: 'kick',
            userId: userId,
            userName: userName,
            moderatorId: state.currentUser.uid,
            moderatorName: state.currentUser.displayName,
            timestamp: Timestamp.now()
        });
        
        showToast(`✅ ${userName} retiré`);
    } catch (error) {
        console.error('Kick error:', error);
        showToast('❌ Erreur');
    }
}

    const reason = prompt(`Bannir ${userName} ?\nRaison :`);
    if (reason === null) return;
    
    try {
        await dbRemove(dbRef(rtdb, `lives/${liveId}/listeners/${userId}`));
        await dbRemove(dbRef(rtdb, `lives/${liveId}/speakers/${userId}`));
        
        await setDoc(doc(db, 'bannedUsers', liveId, 'users', userId), {
            userId: userId,
            userName: userName,
            bannedBy: state.currentUser.uid,
            bannedByName: state.currentUser.displayName,
            reason: reason || 'Non spécifié',
            bannedAt: Timestamp.now()
        });
        
        showToast(`🚫 ${userName} banni`);
    } catch (error) {
        console.error('Ban error:', error);
        showToast('❌ Erreur');
    }
}

console.log('✅ Moderation module loaded');

// ============================================
// STATS
// ============================================
// ================================================================
// SIS LIVE AUDIO - STATS & CHARTS
// ================================================================


let evolutionChart = null;
let giftsChart = null;

// ================================================================
// LOAD STATS
// ================================================================

    if (!state.currentUser) return;
    
    try {
        const q = query(
            collection(db, 'lives'),
            where('hostId', '==', state.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        
        let totalLives = 0;
        let totalMinutes = 0;
        let totalListeners = 0;
        let totalRevenue = 0;
        
        const livesByMonth = {};
        const giftsByType = {};
        
        snapshot.forEach(doc => {
            const live = doc.data();
            totalLives++;
            
            if (live.endedAt && live.startedAt) {
                const duration = (live.endedAt.seconds - live.startedAt.seconds) / 60;
                totalMinutes += Math.floor(duration);
            }
            
            totalListeners += live.stats?.peakListeners || 0;
            totalRevenue += live.stats?.hostRevenue || 0;
            
            // Par mois
            if (live.createdAt) {
                const date = new Date(live.createdAt.seconds * 1000);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                livesByMonth[month] = (livesByMonth[month] || 0) + 1;
            }
            
            // Par type de cadeau
            if (live.stats?.gifts) {
                Object.entries(live.stats.gifts).forEach(([type, count]) => {
                    giftsByType[type] = (giftsByType[type] || 0) + count;
                });
            }
        });
        
        // Update UI
        document.getElementById('statLives').textContent = totalLives;
        document.getElementById('statMinutes').textContent = totalMinutes;
        document.getElementById('statListeners').textContent = totalListeners;
        document.getElementById('statRevenue').textContent = totalRevenue.toLocaleString();
        
        // Create charts
        createEvolutionChart(livesByMonth);
        createGiftsChart(giftsByType);
        
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// ================================================================
// CHARTS
// ================================================================

function createEvolutionChart(data) {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;
    
    if (evolutionChart) evolutionChart.destroy();
    
    const labels = Object.keys(data).sort();
    const values = labels.map(l => data[l]);
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Lives créés',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
}

function createGiftsChart(data) {
    const ctx = document.getElementById('giftsChart');
    if (!ctx) return;
    
    if (giftsChart) giftsChart.destroy();
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    const giftLabels = {
        pain: '🥖 Pain',
        cafe: '☕ Café',
        biere: '🍺 Bière',
        fleur: '🌻 Fleur',
        diamant: '💎 Diamant'
    };
    
    const displayLabels = labels.map(l => giftLabels[l] || l);
    
    giftsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: displayLabels,
            datasets: [{
                data: values,
                backgroundColor: ['#D4A574', '#8B4513', '#FFD700', '#FF69B4', '#00CED1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

console.log('✅ Stats module loaded');

// ============================================
// UI
// ============================================
// ================================================================
// SIS LIVE AUDIO - UI UTILITIES
// ================================================================


// ================================================================
// TABS SWITCHING
// ================================================================

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById(targetTab + 'Form').classList.remove('hidden');
        });
    });
    
    // Main tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
            document.getElementById(targetTab + 'Pane').classList.add('active');
        });
    });
    
    // Chat tabs in live room
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.chat-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(targetTab + 'Pane').classList.add('active');
        });
    });
}

// ================================================================
// MODALS
// ================================================================

    const container = document.getElementById('modalsContainer');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    container.appendChild(modal);
    
    setTimeout(() => modal.classList.add('active'), 10);
    
    return modal;
}

    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
}

// ================================================================
// LOADING
// ================================================================

    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>${message}</p>
    `;
    document.body.appendChild(loading);
    return loading;
}

    loading?.remove();
}

// ================================================================
// FORMAT
// ================================================================

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

console.log('✅ UI utilities loaded');

// ============================================
// SHARE
// ============================================
// ================================================================
// SIS LIVE AUDIO - PARTAGE DE LIVE
// ================================================================


// ================================================================
// PARTAGE DE LIVE
// ================================================================

    const baseUrl = window.location.origin;
    const liveUrl = `${baseUrl}?live=${liveId}`;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content share-modal">
            <div class="modal-header">
                <h3>🔗 Partager ce live</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            
            <div class="share-title">
                <strong>${liveTitle}</strong>
            </div>
            
            <!-- Lien direct -->
            <div class="share-section">
                <label>Lien direct</label>
                <div class="share-link-box">
                    <input type="text" value="${liveUrl}" readonly id="shareLinkInput">
                    <button class="btn-copy" id="copyLinkBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copier
                    </button>
                </div>
            </div>
            
            <!-- QR Code -->
            <div class="share-section">
                <label>QR Code</label>
                <div class="qr-code-container">
                    <canvas id="qrCanvas"></canvas>
                </div>
                <button class="btn-secondary" id="downloadQrBtn">
                    📥 Télécharger QR Code
                </button>
            </div>
            
            <!-- Réseaux sociaux -->
            <div class="share-section">
                <label>Partager sur</label>
                <div class="share-buttons">
                    <button class="share-btn whatsapp" data-platform="whatsapp">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                    </button>
                    
                    <button class="share-btn facebook" data-platform="facebook">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                    </button>
                    
                    <button class="share-btn twitter" data-platform="twitter">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        Twitter
                    </button>
                    
                    <button class="share-btn telegram" data-platform="telegram">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        Telegram
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Générer QR Code
    generateQRCode(liveUrl);
    
    // Copier lien
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
        const input = document.getElementById('shareLinkInput');
        input.select();
        navigator.clipboard.writeText(liveUrl);
        showToast('✅ Lien copié !');
    });
    
    // Download QR
    document.getElementById('downloadQrBtn').addEventListener('click', () => {
        const canvas = document.getElementById('qrCanvas');
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `sis-live-${liveId}-qr.png`;
        a.click();
        showToast('✅ QR Code téléchargé !');
    });
    
    // Partage réseaux sociaux
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            shareToSocial(platform, liveUrl, liveTitle);
        });
    });
}

// ================================================================
// GÉNÉRER QR CODE
// ================================================================

function generateQRCode(url) {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    
    // QR Code simple (pour production, utiliser une vraie librairie QR)
    // Ici je dessine un placeholder
    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR CODE', size/2, size/2 - 10);
    ctx.fillText('(Scan pour rejoindre)', size/2, size/2 + 10);
    
    // TODO: Intégrer une vraie librairie QR comme qrcode.js
    // https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
}

// ================================================================
// PARTAGE RÉSEAUX SOCIAUX
// ================================================================

function shareToSocial(platform, url, title) {
    const text = `Rejoins-moi sur SIS Live Audio : ${title}`;
    let shareUrl = '';
    
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// ================================================================
// REJOINDRE VIA LIEN
// ================================================================

    const params = new URLSearchParams(window.location.search);
    const liveId = params.get('live');
    
    if (liveId) {
        // Auto-join le live
        console.log('Rejoindre le live:', liveId);
        // TODO: Appeler la fonction joinLive(liveId)
    }
}

console.log('✅ Share module loaded');

// ============================================
// BACKGROUND
// ============================================
// ================================================================
// SIS LIVE AUDIO - MODE ARRIÈRE-PLAN (comme Google Meet)
// ================================================================


// ================================================================
// GESTION ARRIÈRE-PLAN
// ================================================================

let isLiveActive = false;
let liveTitle = '';
let audioEnabled = true;

    isLiveActive = true;
    liveTitle = title;
    
    // Wake Lock API - empêcher la mise en veille
    requestWakeLock();
    
    // Page Visibility API - détecter changement d'onglet
    setupVisibilityListener();
    
    // Media Session API - contrôles dans la barre système
    setupMediaSession(title);
    
    // Picture-in-Picture (optionnel)
    // setupPictureInPicture();
    
    // Notification persistante
    showBackgroundNotification(title);
    
    console.log('✅ Mode arrière-plan activé');
}

    isLiveActive = false;
    releaseWakeLock();
    hideBackgroundNotification();
    console.log('✅ Mode arrière-plan désactivé');
}

// ================================================================
// WAKE LOCK - EMPÊCHER MISE EN VEILLE
// ================================================================

let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('✅ Wake Lock activé');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        }
    } catch (err) {
        console.log('Wake Lock non supporté:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// ================================================================
// PAGE VISIBILITY - DÉTECTION CHANGEMENT ONGLET
// ================================================================

function setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 App en arrière-plan');
            // L'audio CONTINUE
            // Afficher notification
            if (isLiveActive) {
                showBackgroundIndicator();
            }
        } else {
            console.log('👁️ App au premier plan');
            hideBackgroundIndicator();
        }
    });
}

// ================================================================
// MEDIA SESSION - CONTRÔLES SYSTÈME
// ================================================================

function setupMediaSession(title) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'SIS Live Audio',
            album: 'Live en cours',
            artwork: [
                { src: '/icon-96.png', sizes: '96x96', type: 'image/png' },
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
        
        // Actions disponibles dans la notification
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('▶️ Play demandé');
            audioEnabled = true;
            // Réactiver l'audio
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('⏸️ Pause demandé');
            audioEnabled = false;
            // Couper l'audio
        });
        
        navigator.mediaSession.setActionHandler('stop', () => {
            console.log('⏹️ Stop demandé');
            // Quitter le live
            disableBackgroundMode();
        });
        
        console.log('✅ Media Session configuré');
    }
}

// ================================================================
// INDICATEUR ARRIÈRE-PLAN
// ================================================================

function showBackgroundIndicator() {
    let indicator = document.getElementById('backgroundIndicator');
    if (indicator) return;
    
    indicator = document.createElement('div');
    indicator.id = 'backgroundIndicator';
    indicator.className = 'background-indicator';
    indicator.innerHTML = `
        <div class="background-indicator-content">
            <div class="pulse-dot"></div>
            <span>🎙️ Live actif en arrière-plan</span>
            <button class="btn-return" id="returnToLiveBtn">Retour</button>
        </div>
    `;
    
    document.body.appendChild(indicator);
    
    document.getElementById('returnToLiveBtn').addEventListener('click', () => {
        // Retourner à la section live
        document.getElementById('liveRoomSection').scrollIntoView({ behavior: 'smooth' });
        hideBackgroundIndicator();
    });
}

function hideBackgroundIndicator() {
    const indicator = document.getElementById('backgroundIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// ================================================================
// NOTIFICATION PERSISTANTE
// ================================================================

function showBackgroundNotification(title) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        createNotification(title);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                createNotification(title);
            }
        });
    }
}

function createNotification(title) {
    const notification = new Notification('🎙️ Live en cours', {
        body: title,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: 'sis-live-active',
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Ouvrir' },
            { action: 'close', title: 'Quitter' }
        ]
    });
    
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
}

function hideBackgroundNotification() {
    // Fermer toutes les notifications avec le tag
    if ('Notification' in window) {
        // Les notifications se ferment automatiquement ou manuellement
    }
}

// ================================================================
// BEFOREUNLOAD - AVERTIR AVANT FERMETURE
// ================================================================

    window.addEventListener('beforeunload', (e) => {
        if (isLiveActive) {
            e.preventDefault();
            e.returnValue = 'Un live est en cours. Voulez-vous vraiment quitter ?';
            return e.returnValue;
        }
    });
}

// ================================================================
// KEEP ALIVE - MAINTENIR LA CONNEXION
// ================================================================

let keepAliveInterval = null;

    // Envoyer un ping toutes les 30 secondes
    keepAliveInterval = setInterval(() => {
        if (isLiveActive) {
            console.log('📡 Keep alive ping');
            // Envoyer ping au serveur ou Firebase
        }
    }, 30000);
}

    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

// ================================================================
// INIT BACKGROUND MODE
// ================================================================

    preventUnload();
    startKeepAlive();
    
    console.log('✅ Background mode initialized');
}

console.log('✅ Background module loaded');

// ============================================
// APP
// ============================================
// ================================================================
// SIS LIVE AUDIO - APP INITIALIZATION
// ================================================================


// ================================================================
// INIT APP
// ================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SIS Live Audio starting...');
    
    // Init UI
    initTabs();
    
    // Auth state observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            state.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: localStorage.getItem(`user_${user.uid}_photo`) || user.photoURL
            };
            
            // Show explore section
            document.getElementById('authSection').classList.remove('active');
            document.getElementById('exploreSection').classList.add('active');
            
            // Update UI
            const avatar = document.getElementById('userAvatar');
            if (avatar) {
                if (state.currentUser.photoURL) {
                    avatar.style.backgroundImage = `url(${state.currentUser.photoURL})`;
                    avatar.style.backgroundSize = 'cover';
                } else {
                    avatar.textContent = state.currentUser.displayName?.charAt(0) || 'U';
                }
            }
            
            console.log('✅ User authenticated:', state.currentUser.email);
        } else {
            state.currentUser = null;
            
            // Show auth section
            document.getElementById('exploreSection').classList.remove('active');
            document.getElementById('liveRoomSection').classList.remove('active');
            document.getElementById('authSection').classList.add('active');
            
            console.log('ℹ️ No user authenticated');
        }
    });
    
    console.log('✅ SIS Live Audio ready!');
});

console.log('✅ App module loaded');
