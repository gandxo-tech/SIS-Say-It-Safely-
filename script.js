import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqk3L_qkolD41H3yvHEzz4O-Sr15I-Tko",
  authDomain: "gandxoanonymous.firebaseapp.com",
  projectId: "gandxoanonymous",
  storageBucket: "gandxoanonymous.appspot.com",
  messagingSenderId: "836606625364",
  appId: "1:836606625364:web:7150571998131c41c0cfc1",
  measurementId: "G-97TCHJ33KW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let userPseudo = '';
let allMessages = [];
let allPosts = [];
let currentFilter = 'all';
let currentSort = 'recent';
let currentPostIdForComments = null;

// Format date en français
function formatDate(dateObj) {
  if (!dateObj) return '';
  return dateObj.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Format date relative style NGL
function formatRelativeDate(dateObj) {
  if (!dateObj) return '';
  const now = new Date();
  const diff = now - dateObj;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'À l\'instant';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return formatDate(dateObj);
}

// Échapper HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Afficher un toast
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : '✗';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.4s reverse';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Créer ou mettre à jour le document utilisateur dans Firebase
async function ensureUserDocument(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Créer un nouveau document utilisateur avec un pseudo unique
      const displayName = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
      const basePseudo = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let pseudo = basePseudo;
      let counter = 1;
      
      // Vérifier si le pseudo existe déjà
      let pseudoExists = true;
      while (pseudoExists) {
        const q = query(collection(db, 'users'), where('pseudo', '==', pseudo));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          pseudoExists = false;
        } else {
          pseudo = `${basePseudo}${counter}`;
          counter++;
        }
      }
      
      // Créer le document utilisateur
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        pseudo: pseudo,
        createdAt: serverTimestamp(),
        messagesCount: 0,
        postsCount: 0,
        reactionsCount: 0
      });
      
      console.log('Document utilisateur créé avec succès');
      return { displayName, pseudo };
    } else {
      // Le document existe déjà
      const userData = userSnap.data();
      return {
        displayName: userData.displayName || 'Utilisateur',
        pseudo: userData.pseudo || 'user'
      };
    }
  } catch (error) {
    console.error('Erreur lors de la création du document utilisateur:', error);
    // Valeurs par défaut en cas d'erreur
    return {
      displayName: user.displayName || 'Utilisateur',
      pseudo: user.uid.substring(0, 8)
    };
  }
}

// Vérification authentification
onAuthStateChanged(auth, async (user) => {
  const authLoader = document.getElementById('authLoader');
  const mainContainer = document.getElementById('mainContainer');

  if (user) {
    currentUser = user;
    
    // Créer ou récupérer le document utilisateur
    const userData = await ensureUserDocument(user);
    
    authLoader.style.display = 'none';
    mainContainer.style.display = 'block';
    
    await loadUserInfo();
    await loadMessages();
    await loadPosts();
    updateStats();
    initializeEventListeners();
  } else {
    window.location.href = 'https://sis-say-it-safely.vercel.app/';
  }
});

// Charger les informations utilisateur
async function loadUserInfo() {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const displayName = userData.displayName || 'Utilisateur';
      userPseudo = userData.pseudo || 'user';
      
      document.getElementById('userName').textContent = displayName;
      document.getElementById('userPseudo').textContent = `@${userPseudo}`;
      
      const initial = displayName[0].toUpperCase();
      document.getElementById('avatarInitial').textContent = initial;
    } else {
      // Si le document n'existe pas, le créer
      await ensureUserDocument(currentUser);
      await loadUserInfo(); // Rappeler pour charger les nouvelles données
    }
  } catch (error) {
    console.error('Erreur chargement utilisateur:', error);
    showToast('Erreur de chargement des informations', 'error');
  }
}

// Charger les messages
async function loadMessages() {
  try {
    if (!userPseudo) {
      await loadUserInfo();
      if (!userPseudo) return;
    }

    const q = query(
      collection(db, "messages"), 
      where("to", "==", userPseudo),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    allMessages = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      allMessages.push({
        id: docSnap.id,
        type: 'message',
        content: data.message || '',
        date: data.createdAt?.toDate(),
        reactions: data.reactions || {
          '😂': 0, '❤️': 0, '👏': 0, '🔥': 0, '😭': 0
        },
        userReactions: data.userReactions || {}
      });
    });
    
    displayContent();
  } catch (error) {
    console.error('Erreur chargement messages:', error);
    
    // Si l'erreur est due à l'absence d'index, afficher un message mais continuer
    if (error.code === 'failed-precondition') {
      console.log('Index Firebase requis. Les messages seront chargés une fois l\'index créé.');
      allMessages = [];
      displayContent();
    } else {
      showToast('Erreur de chargement des messages', 'error');
    }
  }
}

// Charger les publications
async function loadPosts() {
  try {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    allPosts = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      allPosts.push({
        id: docSnap.id,
        type: 'post',
        content: data.content || '',
        date: data.createdAt?.toDate(),
        reactions: data.reactions || {
          '😂': 0, '❤️': 0, '👏': 0, '🔥': 0, '😭': 0
        },
        userReactions: data.userReactions || {},
        allowComments: data.allowComments !== false,
        commentsCount: data.commentsCount || 0
      });
    });
    
    displayContent();
  } catch (error) {
    console.error('Erreur chargement publications:', error);
    
    // Si l'erreur est due à l'absence d'index, afficher un message mais continuer
    if (error.code === 'failed-precondition') {
      console.log('Index Firebase requis. Les publications seront chargées une fois l\'index créé.');
      allPosts = [];
      displayContent();
    } else {
      showToast('Erreur de chargement des publications', 'error');
    }
  }
}

// Mettre à jour les statistiques
function updateStats() {
  const totalMessages = allMessages.length;
  const totalPosts = allPosts.length;
  
  let totalReactions = 0;
  [...allMessages, ...allPosts].forEach(item => {
    totalReactions += Object.values(item.reactions).reduce((sum, val) => sum + val, 0);
  });
  
  document.getElementById('totalMessages').textContent = totalMessages;
  document.getElementById('totalPosts').textContent = totalPosts;
  document.getElementById('totalReactions').textContent = totalReactions;
  
  // Mettre à jour dans Firebase
  if (currentUser) {
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, {
      messagesCount: totalMessages,
      postsCount: totalPosts,
      reactionsCount: totalReactions
    }).catch(err => console.log('Erreur mise à jour stats:', err));
  }
}

// Afficher le contenu filtré et trié
function displayContent() {
  let content = [];
  
  if (currentFilter === 'all') {
    content = [...allMessages, ...allPosts];
  } else if (currentFilter === 'messages') {
    content = allMessages;
  } else if (currentFilter === 'posts') {
    content = allPosts;
  }
  
  if (currentSort === 'recent') {
    content.sort((a, b) => (b.date || 0) - (a.date || 0));
  } else if (currentSort === 'oldest') {
    content.sort((a, b) => (a.date || 0) - (b.date || 0));
  } else if (currentSort === 'popular') {
    content.sort((a, b) => {
      const totalA = Object.values(a.reactions).reduce((sum, val) => sum + val, 0);
      const totalB = Object.values(b.reactions).reduce((sum, val) => sum + val, 0);
      return totalB - totalA;
    });
  }
  
  const msgList = document.getElementById('msgList');
  const emptyState = document.getElementById('emptyState');
  
  if (content.length === 0) {
    msgList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  msgList.innerHTML = content.map(item => createContentCard(item)).join('');
  
  attachEventListeners();
}

// Créer une carte de contenu style NGL
function createContentCard(item) {
  const isPost = item.type === 'post';
  
  const reactionsHTML = Object.entries(item.reactions).map(([emoji, count]) => {
    const isActive = item.userReactions[currentUser.uid] === emoji;
    return `
      <button class="reaction-btn ${isActive ? 'active' : ''}" 
              data-id="${item.id}" 
              data-type="${item.type}" 
              data-emoji="${emoji}">
        <span>${emoji}</span>
        <span class="reaction-count">${count}</span>
      </button>
    `;
  }).join('');
  
  return `
    <div class="msg-card ${isPost ? 'post-card' : ''}" data-id="${item.id}">
      <div class="msg-header">
        <span class="msg-type">
          ${isPost ? '✨ Publication' : '💌 Message anonyme'}
        </span>
        <span class="msg-date">${formatRelativeDate(item.date)}</span>
      </div>
      <div class="msg-content">${escapeHtml(item.content)}</div>
      <div class="msg-actions">
        ${reactionsHTML}
      </div>
      <div class="action-btns">
        <button class="download-btn" data-id="${item.id}">
          📥 Télécharger
        </button>
        ${isPost && item.allowComments ? `
          <button class="comment-btn" data-id="${item.id}">
            💬 Commentaires (${item.commentsCount || 0})
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Attacher les événements
function attachEventListeners() {
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', handleReaction);
  });
  
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', handleDownload);
  });
  
  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', handleShowComments);
  });
}

// Gérer les réactions
async function handleReaction(e) {
  const btn = e.currentTarget;
  const itemId = btn.dataset.id;
  const itemType = btn.dataset.type;
  const emoji = btn.dataset.emoji;
  
  try {
    const collectionName = itemType === 'post' ? 'posts' : 'messages';
    const docRef = doc(db, collectionName, itemId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast('Élément introuvable', 'error');
      return;
    }
    
    const data = docSnap.data();
    const currentReaction = data.userReactions?.[currentUser.uid];
    const newReactions = { ...data.reactions };
    const newUserReactions = { ...data.userReactions };
    
    if (currentReaction === emoji) {
      // Retirer la réaction
      newReactions[emoji] = Math.max(0, (newReactions[emoji] || 0) - 1);
      delete newUserReactions[currentUser.uid];
    } else if (currentReaction) {
      // Changer de réaction
      newReactions[currentReaction] = Math.max(0, (newReactions[currentReaction] || 0) - 1);
      newReactions[emoji] = (newReactions[emoji] || 0) + 1;
      newUserReactions[currentUser.uid] = emoji;
    } else {
      // Nouvelle réaction
      newReactions[emoji] = (newReactions[emoji] || 0) + 1;
      newUserReactions[currentUser.uid] = emoji;
    }
    
    await updateDoc(docRef, {
      reactions: newReactions,
      userReactions: newUserReactions
    });
    
    // Recharger les données
    if (itemType === 'post') {
      await loadPosts();
    } else {
      await loadMessages();
    }
    
    updateStats();
    
  } catch (error) {
    console.error('Erreur réaction:', error);
    showToast('Erreur lors de la réaction', 'error');
  }
}

// Télécharger un message en image
async function handleDownload(e) {
  const btn = e.currentTarget;
  const itemId = btn.dataset.id;
  const card = document.querySelector(`.msg-card[data-id="${itemId}"]`);
  
  if (!card) return;
  
  btn.style.visibility = 'hidden';
  const actionBtns = card.querySelector('.action-btns');
  actionBtns.style.display = 'none';
  
  try {
    const canvas = await html2canvas(card, {
      backgroundColor: '#1a2332',
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = `SIS-message-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showToast('Image téléchargée avec succès !', 'success');
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    showToast('Erreur lors du téléchargement', 'error');
  } finally {
    btn.style.visibility = 'visible';
    actionBtns.style.display = 'flex';
  }
}

// Afficher les commentaires
async function handleShowComments(e) {
  const btn = e.currentTarget;
  const postId = btn.dataset.id;
  currentPostIdForComments = postId;
  
  const modal = document.getElementById('commentsModal');
  modal.classList.add('active');
  
  await loadComments(postId);
}

// Charger les commentaires
async function loadComments(postId) {
  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = `
    <div class="comments-loading">
      <div class="spinner-small"></div>
      <p>Chargement des commentaires...</p>
    </div>
  `;
  
  try {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      commentsList.innerHTML = `
        <div class="comments-loading">
          <p style="color: var(--text-secondary);">Aucun commentaire pour le moment</p>
        </div>
      `;
      return;
    }
    
    commentsList.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-item';
      commentDiv.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(data.authorName || 'Anonyme')}</span>
          <span class="comment-date">${formatRelativeDate(data.createdAt?.toDate())}</span>
        </div>
        <div class="comment-text">${escapeHtml(data.text || '')}</div>
      `;
      commentsList.appendChild(commentDiv);
    });
    
  } catch (error) {
    console.error('Erreur chargement commentaires:', error);
    commentsList.innerHTML = `
      <div class="comments-loading">
        <p style="color: #ef4444;">Erreur de chargement</p>
      </div>
    `;
  }
}

// Envoyer un commentaire
async function sendComment() {
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  
  if (!text) {
    showToast('Veuillez écrire un commentaire', 'error');
    return;
  }
  
  if (!currentPostIdForComments) {
    showToast('Erreur: Publication introuvable', 'error');
    return;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    
    // Ajouter le commentaire dans la sous-collection
    await addDoc(collection(db, 'posts', currentPostIdForComments, 'comments'), {
      text: text,
      authorId: currentUser.uid,
      authorName: userData?.displayName || 'Anonyme',
      createdAt: serverTimestamp()
    });
    
    // Mettre à jour le compteur de commentaires
    await updateDoc(doc(db, 'posts', currentPostIdForComments), {
      commentsCount: increment(1)
    });
    
    input.value = '';
    await loadComments(currentPostIdForComments);
    await loadPosts();
    updateStats();
    
    showToast('Commentaire ajouté !', 'success');
    
  } catch (error) {
    console.error('Erreur envoi commentaire:', error);
    showToast('Erreur lors de l\'envoi', 'error');
  }
}

// Créer une publication
async function createPost() {
  const content = document.getElementById('postContent').value.trim();
  const allowComments = document.getElementById('allowComments').checked;
  
  if (!content) {
    showToast('Veuillez écrire quelque chose', 'error');
    return;
  }
  
  try {
// Créer la publication
    await addDoc(collection(db, 'posts'), {
      content: content,
      userId: currentUser.uid,
      userPseudo: userPseudo,
      allowComments: allowComments,
      createdAt: serverTimestamp(),
      reactions: {
        '😂': 0, '❤️': 0, '👏': 0, '🔥': 0, '😭': 0
      },
      userReactions: {},
      commentsCount: 0
    });
    
    document.getElementById('postModal').classList.remove('active');
    document.getElementById('postContent').value = '';
    document.getElementById('charCount').textContent = '0';
    
    await loadPosts();
    updateStats();
    
    showToast('Publication créée avec succès !', 'success');
    
  } catch (error) {
    console.error('Erreur création post:', error);
    showToast('Erreur lors de la création', 'error');
  }
}

// Copier le lien SIS
function copyLink() {
  const link = `https://sis-say-it-safely.vercel.app/${userPseudo}`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      showToast('Lien copié dans le presse-papier !', 'success');
    }).catch(err => {
      console.error('Erreur copie:', err);
      fallbackCopyLink(link);
    });
  } else {
    fallbackCopyLink(link);
  }
}

// Méthode alternative de copie
function fallbackCopyLink(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
    showToast('Lien copié dans le presse-papier !', 'success');
  } catch (err) {
    showToast('Erreur lors de la copie', 'error');
  }
  
  document.body.removeChild(textArea);
}

// Déconnexion
async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Déconnexion réussie', 'success');
    setTimeout(() => {
      window.location.href = 'https://sis-say-it-safely.vercel.app/';
    }, 1000);
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    showToast('Erreur lors de la déconnexion', 'error');
  }
}

// Initialiser les événements
function initializeEventListeners() {
  // Menu hamburger
  const menuToggle = document.querySelector('.menu-toggle');
  const menuLinks = document.querySelector('.menu-links');
  const menuOverlay = document.getElementById('menu-overlay');
  
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    menuLinks.classList.toggle('active');
    menuOverlay.classList.toggle('active');
  });
  
  menuOverlay.addEventListener('click', () => {
    menuToggle.classList.remove('active');
    menuLinks.classList.remove('active');
    menuOverlay.classList.remove('active');
  });
  
  // Boutons de partage de lien
  document.getElementById('shareLinkBtn').addEventListener('click', copyLink);
  document.getElementById('shareLink').addEventListener('click', (e) => {
    e.preventDefault();
    copyLink();
  });
  
  const emptyShareBtn = document.getElementById('emptyShareBtn');
  if (emptyShareBtn) {
    emptyShareBtn.addEventListener('click', copyLink);
  }
  
  // Déconnexion
  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
  
  // Bouton créer publication
  document.getElementById('createPostBtn').addEventListener('click', () => {
    document.getElementById('postModal').classList.add('active');
    document.getElementById('postContent').focus();
  });
  
  // Fermer modal publication
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('postModal').classList.remove('active');
  });
  
  document.getElementById('cancelPost').addEventListener('click', () => {
    document.getElementById('postModal').classList.remove('active');
  });
  
  // Publier
  document.getElementById('publishPost').addEventListener('click', createPost);
  
  // Compteur de caractères
  document.getElementById('postContent').addEventListener('input', (e) => {
    const count = e.target.value.length;
    document.getElementById('charCount').textContent = count;
  });
  
  // Entrée pour publier
  document.getElementById('postContent').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      createPost();
    }
  });
  
  // Fermer modal commentaires
  document.getElementById('closeCommentsModal').addEventListener('click', () => {
    document.getElementById('commentsModal').classList.remove('active');
    currentPostIdForComments = null;
  });
  
  // Envoyer commentaire
  document.getElementById('sendCommentBtn').addEventListener('click', sendComment);
  
  document.getElementById('commentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendComment();
    }
  });
  
  // Filtres
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayContent();
    });
  });
  
  // Tri
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    displayContent();
  });
  
  // Fermer modals en cliquant sur le backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
      currentPostIdForComments = null;
    });
  });
  
  // Empêcher la fermeture en cliquant sur le contenu
  document.querySelectorAll('.modal-content').forEach(content => {
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  // Désactiver le clic droit et les raccourcis dev
  document.addEventListener('contextmenu', (e) => {
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || window.innerWidth > 700) {
      e.preventDefault();
      showToast('Fonction désactivée 🚫', 'error');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
      e.preventDefault();
      showToast('Action interdite 🚫', 'error');
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'u' || key === 's' || (e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        showToast('Action interdite 🚫', 'error');
      }
    }
  });
  
  // Bouton scroll to top
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(scrollBtn);
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove