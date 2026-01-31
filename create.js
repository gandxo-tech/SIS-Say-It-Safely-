// ================================================================
// SIS LIVE AUDIO - CREATE LIVE WIZARD
// ================================================================

import { db, rtdb, state, showToast, showSection, generateAccessCode } from './config.js';
import {
    doc,
    setDoc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref as dbRef,
    set as dbSet
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Wizard state
const wizardState = {
    currentStep: 1,
    data: {
        title: '',
        description: '',
        category: 'tech',
        timing: 'now',
        scheduledTime: null,
        duration: 3600,
        isPublic: true,
        accessCode: '',
        settings: {
            chatEnabled: true,
            qaMode: false,
            allowHandRaise: true,
            showListenerCount: true
        }
    }
};

// ================================================================
// OPEN WIZARD
// ================================================================

document.getElementById('createLiveBtn')?.addEventListener('click', () => {
    showSection('createSection');
    resetWizard();
});

// ================================================================
// WIZARD NAVIGATION
// ================================================================

document.getElementById('wizardBackBtn')?.addEventListener('click', () => {
    if (wizardState.currentStep === 1) {
        showSection('exploreSection');
    } else {
        goToStep(wizardState.currentStep - 1);
    }
});

function goToStep(step) {
    wizardState.currentStep = step;
    
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`)?.classList.add('active');
    
    // Update progress
    document.querySelectorAll('.progress-step').forEach((s, i) => {
        if (i < step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${(step / 4) * 100}%`;
    }
    
    // Update summary if step 4
    if (step === 4) {
        updateSummary();
    }
}

function resetWizard() {
    wizardState.currentStep = 1;
    wizardState.data = {
        title: '',
        description: '',
        category: 'tech',
        timing: 'now',
        scheduledTime: null,
        duration: 3600,
        isPublic: true,
        accessCode: generateAccessCode(),
        settings: {
            chatEnabled: true,
            qaMode: false,
            allowHandRaise: true,
            showListenerCount: true
        }
    };
    
    // Reset form inputs
    const titleInput = document.getElementById('liveTitle');
    const descInput = document.getElementById('liveDesc');
    const categorySelect = document.getElementById('liveCategory');
    
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (categorySelect) categorySelect.value = 'tech';
    
    document.getElementById('titleCounter').textContent = '0';
    document.getElementById('descCounter').textContent = '0';
    
    goToStep(1);
}

// ================================================================
// STEP 1: INFORMATIONS
// ================================================================

// Character counters
document.getElementById('liveTitle')?.addEventListener('input', (e) => {
    document.getElementById('titleCounter').textContent = e.target.value.length;
});

document.getElementById('liveDesc')?.addEventListener('input', (e) => {
    document.getElementById('descCounter').textContent = e.target.value.length;
});

// Next button
document.getElementById('step1Next')?.addEventListener('click', () => {
    const title = document.getElementById('liveTitle')?.value.trim() || '';
    
    if (!title || title.length < 3) {
        showToast('❌ Le titre doit faire au moins 3 caractères');
        return;
    }
    
    wizardState.data.title = title;
    wizardState.data.description = document.getElementById('liveDesc')?.value.trim() || '';
    wizardState.data.category = document.getElementById('liveCategory')?.value || 'tech';
    
    goToStep(2);
});

// ================================================================
// STEP 2: PLANIFICATION
// ================================================================

// Timing cards
document.getElementById('timingNow')?.addEventListener('click', () => {
    wizardState.data.timing = 'now';
    document.querySelectorAll('.timing-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('timingNow')?.classList.add('selected');
    document.getElementById('scheduleForm')?.classList.add('hidden');
    document.getElementById('calendarSection')?.classList.add('hidden');
});

document.getElementById('timingLater')?.addEventListener('click', () => {
    wizardState.data.timing = 'scheduled';
    document.querySelectorAll('.timing-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('timingLater')?.classList.add('selected');
    document.getElementById('scheduleForm')?.classList.remove('hidden');
    document.getElementById('calendarSection')?.classList.remove('hidden');
    
    // Set minimum date (now + 30 minutes)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const scheduleTime = document.getElementById('scheduleTime');
    if (scheduleTime) {
        scheduleTime.min = new Date().toISOString().slice(0, 16);
        scheduleTime.value = now.toISOString().slice(0, 16);
    }
});

// Navigation
document.getElementById('step2Back')?.addEventListener('click', () => goToStep(1));

document.getElementById('step2Next')?.addEventListener('click', () => {
    if (wizardState.data.timing === 'scheduled') {
        const scheduleTime = document.getElementById('scheduleTime')?.value;
        if (!scheduleTime) {
            showToast('❌ Veuillez choisir une date et heure');
            return;
        }
        
        const scheduledDate = new Date(scheduleTime);
        if (scheduledDate < new Date()) {
            showToast('❌ La date doit être dans le futur');
            return;
        }
        
        wizardState.data.scheduledTime = scheduledDate;
        wizardState.data.duration = parseInt(document.getElementById('scheduleDuration')?.value || 3600);
    }
    
    goToStep(3);
});

// ================================================================
// STEP 3: CONFIDENTIALITÉ
// ================================================================

// Privacy cards
document.getElementById('privacyPublic')?.addEventListener('click', () => {
    wizardState.data.isPublic = true;
    document.querySelectorAll('.privacy-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('privacyPublic')?.classList.add('selected');
    document.getElementById('accessCodeSection')?.classList.add('hidden');
});

document.getElementById('privacyPrivate')?.addEventListener('click', () => {
    wizardState.data.isPublic = false;
    wizardState.data.accessCode = generateAccessCode();
    document.querySelectorAll('.privacy-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('privacyPrivate')?.classList.add('selected');
    document.getElementById('accessCodeSection')?.classList.remove('hidden');
    const codeDisplay = document.getElementById('accessCodeDisplay');
    if (codeDisplay) codeDisplay.textContent = wizardState.data.accessCode;
});

// Regenerate code
document.getElementById('regenerateCode')?.addEventListener('click', () => {
    wizardState.data.accessCode = generateAccessCode();
    const codeDisplay = document.getElementById('accessCodeDisplay');
    if (codeDisplay) codeDisplay.textContent = wizardState.data.accessCode;
    showToast('🔄 Code régénéré');
});

// Copy code
document.getElementById('copyCode')?.addEventListener('click', () => {
    navigator.clipboard.writeText(wizardState.data.accessCode);
    showToast('📋 Code copié !');
});

// Settings toggles
document.getElementById('settingChat')?.addEventListener('change', (e) => {
    wizardState.data.settings.chatEnabled = e.target.checked;
});

document.getElementById('settingQA')?.addEventListener('change', (e) => {
    wizardState.data.settings.qaMode = e.target.checked;
});

document.getElementById('settingHandRaise')?.addEventListener('change', (e) => {
    wizardState.data.settings.allowHandRaise = e.target.checked;
});

document.getElementById('settingCounter')?.addEventListener('change', (e) => {
    wizardState.data.settings.showListenerCount = e.target.checked;
});

// Calendar button
document.getElementById('addToCalendarBtn')?.addEventListener('click', () => {
    if (!wizardState.data.scheduledTime) {
        showToast('❌ Veuillez d\'abord programmer le live');
        return;
    }
    generateICSFile();
});

// Navigation
document.getElementById('step3Back')?.addEventListener('click', () => goToStep(2));
document.getElementById('step3Next')?.addEventListener('click', () => goToStep(4));

// ================================================================
// STEP 4: CONFIRMATION
// ================================================================

document.getElementById('step4Back')?.addEventListener('click', () => goToStep(3));

function updateSummary() {
    document.getElementById('summaryTitle').textContent = wizardState.data.title;
    document.getElementById('summaryDesc').textContent = wizardState.data.description || 'Aucune description';
    
    document.getElementById('summaryCategory').textContent = getCategoryLabel(wizardState.data.category);
    
    if (wizardState.data.timing === 'now') {
        document.getElementById('summaryTimingIcon').textContent = '🔴';
        document.getElementById('summaryTiming').textContent = 'Démarre immédiatement';
    } else {
        document.getElementById('summaryTimingIcon').textContent = '📅';
        document.getElementById('summaryTiming').textContent = formatDate(wizardState.data.scheduledTime);
    }
    
    if (wizardState.data.isPublic) {
        document.getElementById('summaryPrivacyIcon').textContent = '🌍';
        document.getElementById('summaryPrivacy').textContent = 'Public';
    } else {
        document.getElementById('summaryPrivacyIcon').textContent = '🔒';
        document.getElementById('summaryPrivacy').textContent = `Privé (Code: ${wizardState.data.accessCode})`;
    }
    
    // Active settings
    const settingsEl = document.getElementById('summarySettings');
    if (settingsEl) {
        settingsEl.innerHTML = '';
        if (wizardState.data.settings.chatEnabled) settingsEl.innerHTML += '<span>💬 Chat</span>';
        if (wizardState.data.settings.qaMode) settingsEl.innerHTML += '<span>❓ Mode Q&A</span>';
        if (wizardState.data.settings.allowHandRaise) settingsEl.innerHTML += '<span>✋ Demandes de parole</span>';
        if (wizardState.data.settings.showListenerCount) settingsEl.innerHTML += '<span>👥 Compteur visible</span>';
    }
}

// ================================================================
// CREATE LIVE
// ================================================================

document.getElementById('createFinalBtn')?.addEventListener('click', async () => {
    if (!state.currentUser) {
        showToast('❌ Vous devez être connecté');
        return;
    }
    
    try {
        showToast('⏳ Création du live...');
        
        const liveId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const liveData = {
            liveId,
            hostId: state.currentUser.uid,
            hostName: state.currentUser.displayName,
            hostPhoto: state.currentUser.photoURL,
            title: wizardState.data.title,
            description: wizardState.data.description,
            category: wizardState.data.category,
            isPublic: wizardState.data.isPublic,
            accessCode: wizardState.data.isPublic ? null : wizardState.data.accessCode,
            status: wizardState.data.timing === 'now' ? 'live' : 'scheduled',
            scheduledAt: wizardState.data.timing === 'scheduled' ? Timestamp.fromDate(wizardState.data.scheduledTime) : null,
            startedAt: wizardState.data.timing === 'now' ? Timestamp.now() : null,
            settings: wizardState.data.settings,
            stats: {
                currentListeners: 0,
                peakListeners: 0,
                totalMessages: 0,
                totalReactions: {}
            },
            createdAt: Timestamp.now()
        };
        
        await setDoc(doc(db, 'lives', liveId), liveData);
        
        if (wizardState.data.timing === 'now') {
            // Add host as speaker
            await dbSet(dbRef(rtdb, `lives/${liveId}/speakers/${state.currentUser.uid}`), {
                role: 'host',
                name: state.currentUser.displayName,
                photo: state.currentUser.photoURL,
                isMuted: false,
                isSpeaking: false,
                joinedAt: Date.now()
            });
            
            showToast('✅ Live créé ! Démarrage...');
            
            // Trigger join live (handled by explore.js)
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('joinLive', {
                    detail: { liveId, liveData }
                }));
            }, 1000);
        } else {
            showToast('✅ Live programmé avec succès !');
            showSection('exploreSection');
        }
    } catch (error) {
        console.error('Create live error:', error);
        showToast('❌ Erreur lors de la création');
    }
});

// ================================================================
// GENERATE .ICS FILE
// ================================================================

function generateICSFile() {
    const startDate = wizardState.data.scheduledTime;
    const endDate = new Date(startDate.getTime() + (wizardState.data.duration * 1000));
    
    const formatICSDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const liveUrl = `https://sis-say-it-safely-pi.vercel.app/sisliveaudio.html`;
    let description = wizardState.data.description;
    description += `\\n\\nRejoindre: ${liveUrl}`;
    if (!wizardState.data.isPublic) {
        description += `\\nCode d'accès: ${wizardState.data.accessCode}`;
    }
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SIS//Live Audio//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@sis-live-audio.com
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${wizardState.data.title}
DESCRIPTION:${description}
LOCATION:SIS Live Audio
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Le live commence dans 15 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Le live commence dans 1 heure
END:VALARM
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wizardState.data.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📅 Événement ajouté au calendrier !');
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryLabel(category) {
    const labels = {
        tech: '💻 Technologie',
        education: '📚 Éducation',
        music: '🎵 Musique',
        discussion: '💬 Discussion',
        qa: '❓ Q&A',
        news: '📰 Actualités',
        art: '🎨 Art & Créativité',
        gaming: '🎮 Gaming',
        other: '🎭 Autre'
    };
    return labels[category] || category;
}

console.log('✅ Create module loaded');
