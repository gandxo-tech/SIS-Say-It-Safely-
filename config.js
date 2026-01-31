// ================================================================
// SIS LIVE AUDIO - FIREBASE CONFIGURATION
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDRnYDiLKaTI-97Vb6bwGr6Kpvx_Ej2xOg",
    authDomain: "sis-say-it-safely-pi.firebaseapp.com",
    projectId: "sis-say-it-safely-pi",
    databaseURL: "https://sis-say-it-safely-pi-default-rtdb.firebaseio.com",
    storageBucket: "sis-say-it-safely-pi.firebasestorage.app",
    messagingSenderId: "332914268472",
    appId: "1:332914268472:web:aee3804481d7aee0e20e93"
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
