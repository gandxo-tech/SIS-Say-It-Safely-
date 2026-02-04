// ================================================================
// SIS LIVE AUDIO - AUTHENTICATION COMPLET
// Avec upload photo profil (localStorage)
// ================================================================

import { auth, db, state, showToast, showSection } from './config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
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
