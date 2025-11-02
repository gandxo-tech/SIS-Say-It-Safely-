
// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
  authDomain: "chat-anonyme.firebaseapp.com",
  databaseURL: "https://chat-anonyme-default-rtdb.firebaseio.com",
  projectId: "chat-anonyme",
  storageBucket: "chat-anonyme.firebasestorage.app",
  messagingSenderId: "93366459642",
  appId: "1:93366459642:web:a2421c9478909b33667d43"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

const ADMIN_EMAIL = "gbaguidiexauce@gmail.com";

let currentUser = null;
let currentRoom = null;
let currentCategory = 'all';
let replyingTo = null;
let typingTimeout = null;
let messagesRef = null;
let usersRef = null;
let roomsRef = null;
let onlineRef = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingInterval = null;
let selectedImage = null;

const categoryEmojis = {
  'general': '💬', 'gaming': '🎮', 'tech': '💻',
  'music': '🎵', 'sport': '⚽', 'education': '📚', 'other': '🗾'
};

document.addEventListener('DOMContentLoaded', () => {
  initializeAuthListeners();
  initializeUIListeners();
  initializeMediaListeners();
  
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadUserProfile();
      showDashboard();
      setupPresence();
      loadRooms();
    } else {
      currentUser = null;
      showAuth();
    }
  });
});

// ===== AUTH FUNCTIONS =====

function initializeAuthListeners() {
  document.getElementById('showRegister').addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authTitle').textContent = 'Inscription';
    clearAuthMessages();
  });

  document.getElementById('showLogin').addEventListener('click', () => {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('authTitle').textContent = 'Connexion';
    clearAuthMessages();
  });

  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  document.getElementById('registerPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAuthError('Veuillez remplir tous les champs');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Connexion...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showAuthSuccess('Connexion réussie !');
  } catch (error) {
    console.error('Erreur login:', error);
    showAuthError(getErrorMessage(error.code));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

async function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!username || !email || !password) {
    showAuthError('Veuillez remplir tous les champs');
    return;
  }

  if (username.length < 3) {
    showAuthError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    return;
  }

  if (password.length < 6) {
    showAuthError('Le mot de passe doit contenir au moins 6 caractères');
    return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Création...';

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.ref('users/' + user.uid).set({
      uid: user.uid,
      username: username,
      email: email,
      avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username) + '&background=2563eb&color=fff',
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      isAdmin: email === ADMIN_EMAIL,
      badges: email === ADMIN_EMAIL ? ['admin'] : ['new']
    });

    showAuthSuccess('Compte créé avec succès !');
  } catch (error) {
    console.error('Erreur register:', error);
    showAuthError(getErrorMessage(error.code));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Créer un compte';
  }
}

async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  const btn = document.getElementById('googleLoginBtn');
  btn.disabled = true;
  btn.textContent = 'Connexion...';

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userSnapshot = await db.ref('users/' + user.uid).once('value');
    
    if (!userSnapshot.exists()) {
      await db.ref('users/' + user.uid).set({
        uid: user.uid,
        username: user.displayName || 'Utilisateur',
        email: user.email,
        avatar: user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName) + '&background=2563eb&color=fff',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        isAdmin: user.email === ADMIN_EMAIL,
        badges: user.email === ADMIN_EMAIL ? ['admin'] : ['new']
      });
    }

    showAuthSuccess('Connexion réussie !');
  } catch (error) {
    console.error('Erreur Google login:', error);
    showAuthError('Erreur lors de la connexion avec Google');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continuer avec Google';
  }
}

async function handleLogout() {
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
    try {
      if (currentUser) {
        await db.ref('presence/' + currentUser.uid).remove();
      }
      await auth.signOut();
    } catch (error) {
      console.error('Erreur logout:', error);
    }
  }
}

function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Cet email est déjà utilisé',
    'auth/invalid-email': 'Email invalide',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/weak-password': 'Mot de passe trop faible',
    'auth/network-request-failed': 'Erreur de connexion réseau',
    'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard'
  };
  return messages[code] || 'Une erreur est survenue';
}

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function showAuthSuccess(message) {
  const successDiv = document.getElementById('authSuccess');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  setTimeout(() => successDiv.style.display = 'none', 3000);
}

function clearAuthMessages() {
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authSuccess').style.display = 'none';
}

// ===== UI FUNCTIONS =====

function initializeUIListeners() {
  setupModal('createRoomModal', 'createRoomBtn', 'closeCreateRoom');
  setupModal('editProfileModal', 'editProfileBtn', 'closeEditProfile');
  setupModal('shareRoomModal', null, 'closeShareRoom');
  setupModal('announcementModal', 'sendAnnouncementBtn', 'closeAnnouncement');
  setupModal('manageUsersModal', 'manageUsersBtn', 'closeManageUsers');
  setupModal('manageBadgesModal', 'manageBadgesBtn', 'closeManageBadges');
  setupModal('allMessagesModal', 'viewAllMessagesBtn', 'closeAllMessages');

  document.getElementById('confirmCreateRoom').addEventListener('click', createRoom);
  document.getElementById('randomChatBtn').addEventListener('click', joinRandomChat);
  document.getElementById('joinRoomBtn').addEventListener('click', joinRoomByCode);

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', handleMessageInput);
  document.getElementById('messageInput').addEventListener('input', handleTyping);
  document.getElementById('backBtn').addEventListener('click', leaveRoom);
  document.getElementById('shareRoomBtn').addEventListener('click', showShareRoom);
  document.getElementById('lockRoomBtn').addEventListener('click', toggleRoomLock);
  document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
  document.getElementById('cancelReply').addEventListener('click', cancelReply);

  document.getElementById('confirmEditProfile').addEventListener('click', updateProfile);
  document.getElementById('avatarFileInput').addEventListener('change', handleAvatarUpload);

  document.getElementById('adminPanelBtn').addEventListener('click', toggleAdminPanel);
  document.getElementById('confirmAnnouncement').addEventListener('click', sendAnnouncement);
  document.getElementById('badgeType').addEventListener('change', (e) => {
    document.getElementById('customBadgeGroup').style.display = 
      e.target.value === 'custom' ? 'block' : 'none';
  });
  document.getElementById('confirmBadge').addEventListener('click', assignBadge);

  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      loadRooms();
    });
  });

  document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
}

function setupModal(modalId, openBtnId, closeBtnId) {
  const modal = document.getElementById(modalId);
  if (openBtnId) {
    const openBtn = document.getElementById(openBtnId);
    if (openBtn) {
      openBtn.addEventListener('click', () => modal.style.display = 'block');
    }
  }
  
  const closeBtn = document.getElementById(closeBtnId);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

function showAuth() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('chatSection').style.display = 'none';
}

function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('chatSection').style.display = 'none';
}

function showChat() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('chatSection').style.display = 'flex';
}

// ===== MEDIA FUNCTIONS =====

function initializeMediaListeners() {
  document.getElementById('imageBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });

  document.getElementById('imageInput').addEventListener('change', handleImageSelect);
  document.getElementById('cancelMediaPreview').addEventListener('click', cancelMediaPreview);

  const audioBtn = document.getElementById('audioBtn');
  
  audioBtn.addEventListener('mousedown', startRecording);
  audioBtn.addEventListener('mouseup', stopRecording);
  audioBtn.addEventListener('mouseleave', stopRecording);

  audioBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
  });
  audioBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
  });

  document.getElementById('closeImageModal').addEventListener('click', closeImageModal);
  document.getElementById('imageModal').addEventListener('click', (e) => {
    if (e.target.id === 'imageModal') closeImageModal();
  });
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Veuillez sélectionner une image');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('L\'image ne doit pas dépasser 10 Mo');
    return;
  }

  selectedImage = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('imagePreview').src = e.target.result;
    document.getElementById('mediaPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);

  e.target.value = '';
}

function cancelMediaPreview() {
  selectedImage = null;
  document.getElementById('mediaPreview').style.display = 'none';
}

async function uploadImage(file) {
  if (!file || !currentRoom) return null;

  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    const storageRef = firebase.storage().ref(`images/${currentRoom.id}/${fileName}`);

    const uploadTask = storageRef.put(file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          updateUploadProgress(progress);
        },
        (error) => {
          console.error('Erreur upload:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Erreur upload image:', error);
    throw error;
  }
}

function updateUploadProgress(progress) {
  document.getElementById('uploadProgress').style.display = 'block';
  document.getElementById('uploadProgressFill').style.width = progress + '%';
  
  if (progress >= 100) {
    setTimeout(() => {
      document.getElementById('uploadProgress').style.display = 'none';
    }, 1000);
  }
}

async function startRecording() {
  if (!currentRoom) {
    alert('Vous devez être dans un salon pour enregistrer');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = handleRecordingStop;

    mediaRecorder.start();
    
    document.getElementById('audioBtn').classList.add('recording');
    document.getElementById('recordingIndicator').style.display = 'block';
    
    recordingStartTime = Date.now();
    recordingInterval = setInterval(updateRecordingTimer, 100);

  } catch (error) {
    console.error('Erreur accès micro:', error);
    alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    document.getElementById('audioBtn').classList.remove('recording');
    document.getElementById('recordingIndicator').style.display = 'none';
    clearInterval(recordingInterval);
  }
}

function updateRecordingTimer() {
  const elapsed = Date.now() - recordingStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const ms = Math.floor((elapsed % 1000) / 100);
  document.getElementById('recordingTimer').textContent = ` ${seconds}:${ms}`;
}

async function handleRecordingStop() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  
  const duration = Date.now() - recordingStartTime;
  if (duration < 1000) {
    alert('L\'enregistrement doit durer au moins 1 seconde');
    return;
  }

  try {
    const audioUrl = await uploadAudio(audioBlob, duration);
    if (audioUrl) {
      await sendMediaMessage('audio', audioUrl, Math.floor(duration / 1000));
    }
  } catch (error) {
    console.error('Erreur envoi audio:', error);
    alert('Erreur lors de l\'envoi de l\'audio');
  }
}

async function uploadAudio(blob, duration) {
  if (!blob || !currentRoom) return null;

  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
    const storageRef = firebase.storage().ref(`audios/${currentRoom.id}/${fileName}`);

    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadProgressFill').style.width = '0%';

    const uploadTask = storageRef.put(blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          updateUploadProgress(progress);
        },
        (error) => {
          console.error('Erreur upload audio:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Erreur upload audio:', error);
    throw error;
  }
}

async function sendMediaMessage(type, url, duration = null) {
  if (!currentRoom || !url) return;

  try {
    const messageId = db.ref('messages/' + currentRoom.id).push().key;
    
    const messageData = {
      id: messageId,
      type: type,
      mediaUrl: url,
      userId: currentUser.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      seen: false
    };

    if (type === 'audio' && duration) {
      messageData.duration = duration;
    }

    if (replyingTo) {
      messageData.replyTo = {
        messageId: replyingTo.id,
        userId: replyingTo.userId,
        text: replyingTo.text
      };
      cancelReply();
    }

    await db.ref('messages/' + currentRoom.id + '/' + messageId).set(messageData);

    await db.ref('rooms/' + currentRoom.id).update({
      lastMessage: type === 'image' ? '📷 Image' : '🎤 Audio',
      lastMessageTime: firebase.database.ServerValue.TIMESTAMP
    });

  } catch (error) {
    console.error('Erreur envoi média:', error);
    alert('Erreur lors de l\'envoi du média');
  }
}

function openImageModal(imageUrl) {
  document.getElementById('modalImage').src = imageUrl;
  document.getElementById('imageModal').style.display = 'block';
}

function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
}

function createAudioPlayer(audioUrl, duration) {
  const playerDiv = document.createElement('div');
  playerDiv.className = 'audio-player';

  const playBtn = document.createElement('button');
  playBtn.className = 'audio-play-btn';
  playBtn.textContent = '▶️';

  const waveform = document.createElement('div');
  waveform.className = 'audio-waveform';

  const progress = document.createElement('div');
  progress.className = 'audio-progress';
  waveform.appendChild(progress);

  const durationSpan = document.createElement('span');
  durationSpan.className = 'audio-duration';
  durationSpan.textContent = formatDuration(duration);

  const audio = new Audio(audioUrl);
  let isPlaying = false;

  playBtn.onclick = () => {
    if (isPlaying) {
      audio.pause();
      playBtn.textContent = '▶️';
    } else {
      audio.play();
      playBtn.textContent = '⏸️';
    }
    isPlaying = !isPlaying;
  };

  audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = percent + '%';
    durationSpan.textContent = formatDuration(Math.floor(audio.duration - audio.currentTime));
  });

  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶️';
    isPlaying = false;
    progress.style.width = '0%';
    durationSpan.textContent = formatDuration(duration);
  });

  playerDiv.appendChild(playBtn);
  playerDiv.appendChild(waveform);
  playerDiv.appendChild(durationSpan);

  return playerDiv;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== USER PROFILE =====

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const snapshot = await db.ref('users/' + currentUser.uid).once('value');
    const userData = snapshot.val();

    if (userData) {
      document.getElementById('userName').textContent = userData.username;
      document.getElementById('userEmail').textContent = userData.email;
      document.getElementById('userAvatar').src = userData.avatar;
const badgesContainer = document.getElementById('userBadges');
      badgesContainer.innerHTML = '';
      
      if (userData.badges && userData.badges.length > 0) {
        userData.badges.forEach(badge => {
          const badgeEl = document.createElement('span');
          badgeEl.className = 'user-badge';
          
          switch(badge) {
            case 'admin':
              badgeEl.className += ' admin-badge';
              badgeEl.textContent = '👑 Admin';
              break;
            case 'veteran':
              badgeEl.className += ' veteran-badge';
              badgeEl.textContent = '🏆 Vétéran';
              break;
            case 'active':
              badgeEl.className += ' active-badge';
              badgeEl.textContent = '⚡ Actif';
              break;
            case 'new':
              badgeEl.className += ' new-badge';
              badgeEl.textContent = '🆕 Nouveau';
              break;
            default:
              if (badge.startsWith('custom:')) {
                const customData = badge.split(':');
                badgeEl.textContent = customData[1] || '🎨';
                badgeEl.style.background = customData[2] || '#2563eb';
              }
          }
          
          badgesContainer.appendChild(badgeEl);
        });
      }

      if (userData.isAdmin) {
        document.getElementById('adminPanelBtn').style.display = 'block';
        loadAdminStats();
      }
    }
  } catch (error) {
    console.error('Erreur chargement profil:', error);
  }
}

async function updateProfile() {
  const newUsername = document.getElementById('editUsername').value.trim();
  
  if (!newUsername || newUsername.length < 3) {
    alert('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    return;
  }

  const btn = document.getElementById('confirmEditProfile');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  try {
    const updates = {
      username: newUsername
    };

    await db.ref('users/' + currentUser.uid).update(updates);
    
    document.getElementById('editProfileModal').style.display = 'none';
    loadUserProfile();
    alert('Profil mis à jour !');
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    alert('Erreur lors de la mise à jour');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Veuillez sélectionner une image');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('L\'image ne doit pas dépasser 5 Mo');
    return;
  }

  try {
    const storageRef = storage.ref('avatars/' + currentUser.uid);
    await storageRef.put(file);
    const downloadURL = await storageRef.getDownloadURL();

    await db.ref('users/' + currentUser.uid).update({
      avatar: downloadURL
    });

    document.getElementById('editAvatarPreview').src = downloadURL;
    document.getElementById('userAvatar').src = downloadURL;
    
    alert('Avatar mis à jour !');
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    alert('Erreur lors du téléchargement de l\'image');
  }
}

document.getElementById('editProfileBtn')?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  try {
    const snapshot = await db.ref('users/' + currentUser.uid).once('value');
    const userData = snapshot.val();
    
    if (userData) {
      document.getElementById('editUsername').value = userData.username;
      document.getElementById('editAvatarPreview').src = userData.avatar;
    }
  } catch (error) {
    console.error('Erreur chargement profil:', error);
  }
});

// ===== PRESENCE =====

function setupPresence() {
  if (!currentUser) return;

  const presenceRef = db.ref('presence/' + currentUser.uid);
  const connectedRef = db.ref('.info/connected');

  connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === true) {
      presenceRef.onDisconnect().remove();
      presenceRef.set({
        online: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });

  db.ref('presence').on('value', (snapshot) => {
    const count = snapshot.numChildren();
    document.getElementById('onlineUsers').textContent = count;
  });
}

// (Continuez dans le prochain message pour la partie 2/2)
 