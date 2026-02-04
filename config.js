// ================================================================
// SIS LIVE AUDIO - FIREBASE CONFIGURATION (GANDXO)
// + MODE CLAIR/SOMBRE
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ================================================================
// CONFIGURATION FIREBASE (GANDXO ANALYTICS)
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDHCqPBzhWNnXuBrLvfa4NqCFeOdIRy6UI",
    authDomain: "gandxo-analytics.firebaseapp.com",
    projectId: "gandxo-analytics",
    storageBucket: "gandxo-analytics.firebasestorage.app",
    messagingSenderId: "660347922907",
    appId: "1:660347922907:web:9c336121d876f015561ffe",
    measurementId: "G-ZBMZ1L7V80",
    databaseURL: "https://gandxo-analytics-default-rtdb.firebaseio.com"  // ⚠️ AJOUTE SI PAS DÉJÀ FAIT
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
    currentRole: 'listener', // 'host', 'speaker', 'listener'
    theme: 'auto' // 'light', 'dark', 'auto'
};

// ================================================================
// THEME CLAIR/SOMBRE
// ================================================================

// Détecter le thème système
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// Appliquer le thème
export function setTheme(theme) {
    state.theme = theme;
    
    let appliedTheme = theme;
    if (theme === 'auto') {
        appliedTheme = detectSystemTheme();
    }
    
    document.documentElement.setAttribute('data-theme', appliedTheme);
    localStorage.setItem('sis-theme', theme);
    
    console.log('🎨 Theme:', appliedTheme);
}

// Toggle entre clair/sombre
export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(`🎨 Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
}

// Initialiser le thème au chargement
const savedTheme = localStorage.getItem('sis-theme') || 'auto';
setTheme(savedTheme);

// Écouter les changements de thème système
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (state.theme === 'auto') {
            setTheme('auto');
        }
    });
}

// Bouton toggle thème
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
});

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

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

console.log('🔥 Firebase initialized (GANDXO Analytics)');
console.log('🎨 Theme:', state.theme);
