// ================================================================
// SIS LIVE AUDIO - AUTHENTICATION
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
// REGISTER
// ================================================================

registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        showAuthError('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            displayName: name,
            email: email,
            photoURL: photoURL,
            createdAt: Timestamp.now()
        });
        
        showToast('✅ Compte créé avec succès !');
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
        showToast('✅ Connexion réussie !');
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError(error);
    }
});

// ================================================================
// LOGOUT
// ================================================================

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        try {
            await signOut(auth);
            showToast('👋 Déconnecté');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
});

// ================================================================
// AUTH STATE OBSERVER
// ================================================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        state.currentUser = user;
        
        // Check if user profile exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            const name = user.displayName || user.email.split('@')[0];
            const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: name,
                email: user.email,
                photoURL: photoURL,
                createdAt: Timestamp.now()
            });
        }
        
        showSection('exploreSection');
        
        // Trigger lives loading (handled by explore.js)
        window.dispatchEvent(new CustomEvent('userAuthenticated'));
        
        console.log('✅ User authenticated:', user.email);
    } else {
        state.currentUser = null;
        showSection('authSection');
        console.log('❌ User not authenticated');
    }
});

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function showAuthError(message) {
    const errorEl = document.getElementById('authError');
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    
    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 5000);
}

function handleAuthError(error) {
    let message = 'Une erreur est survenue';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Cet email est déjà utilisé';
            break;
        case 'auth/invalid-email':
            message = 'Email invalide';
            break;
        case 'auth/weak-password':
            message = 'Mot de passe trop faible';
            break;
        case 'auth/user-not-found':
            message = 'Aucun compte trouvé avec cet email';
            break;
        case 'auth/wrong-password':
            message = 'Mot de passe incorrect';
            break;
        default:
            message = error.message;
    }
    
    showAuthError(message);
}

console.log('✅ Auth module loaded');
