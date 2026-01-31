// ================================================================
// SIS LIVE AUDIO - FIREBASE CONFIGURATION
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Configuration Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyBqk3L_qkolD41H3yvHEzz4O-Sr15I-Tko",
      authDomain: "gandxoanonymous.firebaseapp.com",
      projectId: "gandxoanonymous",
      storageBucket: "gandxoanonymous.appspot.com",
      messagingSenderId: "836606625364",
      appId: "1:836606625364:web:7150571998131c41c0cfc1",
      measurementId: "G-97TCHJ33KW",
      databaseURL: "https://gandxoanonymous-default-rtdb.firebaseio.com"
    };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Global state
export const state = {
    currentUser: null,
    currentLiveId: null,
    currentRole: 'listener' // 'host', 'speaker', 'listener'
};

// Utility functions
export function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

export function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

export function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

console.log('🔥 Firebase initialized successfully');
