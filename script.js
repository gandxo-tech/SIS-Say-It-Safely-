import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc, setDoc, getDoc, addDoc, Timestamp, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (selector) => document.getElementById(selector);
const authScreen = $('authScreen');
const mainContainer = $('mainContainer');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const loginBtn = $('loginBtn');
const logoutBtn = $('logoutBtn');
const loadBtn = $('load');
const loading = $('loading');
const messages = $('messages');
const userAvatar = $('userAvatar');
const userName = $('userName');
const userStats = $('userStats');
const totalMessagesEl = $('totalMessages');
const todayMessagesEl = $('todayMessages');
const favMessagesEl = $('favMessages');
const toast = $('toast');
const toastIcon = $('toastIcon');
const toastMessage = $('toastMessage');
const themeToggle = $('themeToggle');
const publishModal = $('publishModal');
const closePublishModal = $('closePublishModal');
const publishPreview = $('publishPreview');
const publishDescription = $('publishDescription');
const confirmPublishBtn = $('confirmPublishBtn');

let currentUser = null;
let userPseudo = '';
let allMessages = [];
let allPublishedPosts = [];
let userFavorites = new Set();
let userArchived = new Set();
let currentFilter = 'all';
let currentPublishMessageId = null;
let currentPublishMessageText = null;

// Dark Mode
const initTheme = () => {
  const savedTheme = localStorage.getItem('sis-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
};

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sis-theme', newTheme);
  showToast(`Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
});

initTheme();

// Toast
const showToast = (message, type = 'success') => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toastIcon.textContent = icons[type] || icons.success;
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// Publish Modal
const openPublishModal = (messageId, messageText) => {
  currentPublishMessageId = messageId;
  currentPublishMessageText = messageText;
  publishPreview.textContent = messageText;
  publishDescription.value = '';
  publishModal.classList.add('active');
};

closePublishModal.addEventListener('click', () => {
  publishModal.classList.remove('active');
  currentPublishMessageId = null;
  currentPublishMessageText = null;
  publishDescription.value = '';
});

publishModal.addEventListener('click', (e) => {
  if (e.target === publishModal) {
    closePublishModal.click();
  }
});

confirmPublishBtn.addEventListener('click', async () => {
  if (!currentPublishMessageId || !currentPublishMessageText) {
    showToast('Erreur: message introuvable', 'error');
    return;
  }

  confirmPublishBtn.disabled = true;
  confirmPublishBtn.textContent = '⏳ Publication...';

  try {
    const description = publishDescription.value.trim();
    
    await addDoc(collection(db, 'publishedPosts'), {
      message: currentPublishMessageText,
      description: description || '',
      authorPseudo: userPseudo,
      authorAvatar: userAvatar.src,
      createdAt: Timestamp.now(),
      reactions: { fire: 0, heart: 0, laugh: 0, shocked: 0 },
      comments: [],
      reactionsCount: 0,
      commentsCount: 0,
      originalMessageId: currentPublishMessageId,
      userReactions: []
    });

    showToast('Message publié avec succès ! 🌍', 'success');
    publishModal.classList.remove('active');
    currentPublishMessageId = null;
    currentPublishMessageText = null;
    publishDescription.value = '';

    if (currentFilter === 'published') {
      await loadPublishedPosts();
    }

  } catch (error) {
    console.error('Erreur lors de la publication:', error);
    showToast('Erreur: ' + error.message, 'error');
  } finally {
    confirmPublishBtn.disabled = false;
    confirmPublishBtn.textContent = 'Publier maintenant 🚀';
  }
});

// Repost Function
const repostPublication = async (postData) => {
  try {
    await addDoc(collection(db, 'publishedPosts'), {
      message: postData.message,
      description: postData.description || '',
      authorPseudo: userPseudo,
      authorAvatar: userAvatar.src,
      createdAt: Timestamp.now(),
      reactions: { fire: 0, heart: 0, laugh: 0, shocked: 0 },
      comments: [],
      reactionsCount: 0,
      commentsCount: 0,
      originalMessageId: postData.originalMessageId || '',
      userReactions: [],
      isRepost: true,
      originalAuthor: postData.authorPseudo
    });

    showToast('Publication repartagée avec succès ! 🔄', 'success');
    
    if (currentFilter === 'published') {
      await loadPublishedPosts();
    }

  } catch (error) {
    console.error('Erreur lors du repartage:', error);
    showToast('Erreur: ' + error.message, 'error');
  }
};

// Filter Tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    
    if (currentFilter === 'published') {
      loadPublishedPosts();
    } else {
      renderMessages();
    }
  });
});

// Connexion
loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showToast('Entre ton email et mot de passe !', 'error');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = '⏳ Connexion...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Connexion réussie ! 🎉', 'success');
  } catch (error) {
    console.error("Erreur de connexion:", error);
    let errorMsg = "Email ou mot de passe incorrect";

    if (error.code === 'auth/user-not-found') {
      errorMsg = "Aucun compte trouvé avec cet email";
    } else if (error.code === 'auth/wrong-password') {
      errorMsg = "Mot de passe incorrect";
    } else if (error.code === 'auth/invalid-credential') {
      errorMsg = "Email ou mot de passe incorrect";
    }

    showToast(errorMsg, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '🔓 Se connecter';
  }
});

[loginEmail, loginPassword].forEach(input => {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    showToast('Déconnecté avec succès', 'info');
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userPseudo = user.displayName || user.email.split('@')[0];

    authScreen.classList.add('hidden');
    mainContainer.classList.remove('hidden');

    const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userPseudo)}&background=0ea5e9&color=ffffff&size=200`;
    userAvatar.src = photoURL;
    userName.textContent = `@${userPseudo}`;

    await loadUserData();
    setTimeout(() => loadMessages(), 500);
  } else {
    currentUser = null;
    authScreen.classList.remove('hidden');
    mainContainer.classList.add('hidden');
  }
});

const setState = (isLoading) => {
  loadBtn.disabled = isLoading;
  loadBtn.textContent = isLoading ? 'Chargement...' : 'Recharger les messages ✨';
  loading.classList.toggle('active', isLoading);
};

const showError = (title, message) => {
  messages.innerHTML = `
    <div class="error-message">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return 'Date inconnue';
  return timestamp.toDate().toLocaleString('fr-FR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp?.toDate) return 'Date inconnue';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const isToday = (timestamp) => {
  if (!timestamp?.toDate) return false;
  const date = timestamp.toDate();
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const loadUserData = async () => {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'userData', currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userFavorites = new Set(data.favorites || []);
      userArchived = new Set(data.archived || []);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
};

const saveUserData = async () => {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'userData', currentUser.uid), {
      favorites: Array.from(userFavorites),
      archived: Array.from(userArchived),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

const toggleFavorite = async (messageId, element) => {
  const isFavorited = userFavorites.has(messageId);
  
  if (isFavorited) {
    userFavorites.delete(messageId);
    element.classList.remove('active');
    element.innerHTML = '⭐ Favori';
    showToast('Retiré des favoris', 'info');
  } else {
    userFavorites.add(messageId);
    element.classList.add('active');
    element.innerHTML = '⭐ Favori ✓';
    showToast('Ajouté aux favoris !', 'success');
  }
  
  await saveUserData();
  updateStats();
};

const toggleArchive = async (messageId, element) => {
  const isArchived = userArchived.has(messageId);
  
  if (isArchived) {
    userArchived.delete(messageId);
    element.innerHTML = '📦 Archiver';
    showToast('Message désarchivé', 'info');
  } else {
    userArchived.add(messageId);
    element.innerHTML = '📤 Désarchiver';
    showToast('Message archivé', 'success');
  }
  
  await saveUserData();
  updateStats();
  renderMessages();
};

// POST REACTIONS
const togglePostReaction = async (postId, reaction, buttonElement) => {
  try {
    const postRef = doc(db, 'publishedPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const data = postDoc.data();
      const reactions = data.reactions || { fire: 0, heart: 0, laugh: 0, shocked: 0 };
      const userReactions = data.userReactions || [];
      
      const userReactionKey = `${currentUser.uid}_${reaction}`;
      const hasReacted = userReactions.includes(userReactionKey);
      
      if (hasReacted) {
        reactions[reaction] = Math.max(0, reactions[reaction] - 1);
        const index = userReactions.indexOf(userReactionKey);
        userReactions.splice(index, 1);
        buttonElement.classList.remove('reacted');
      } else {
        reactions[reaction] = (reactions[reaction] || 0) + 1;
        userReactions.push(userReactionKey);
        buttonElement.classList.add('reacted');
      }
      
      const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
      
      await updateDoc(postRef, { 
        reactions,
        userReactions,
        reactionsCount: totalReactions
      });
      
      // Update UI
      const statsElement = buttonElement.closest('.post').querySelector('.post-reactions-count');
      if (statsElement) {
        const countSpan = statsElement.querySelector('span:last-child');
        if (countSpan) {
          countSpan.textContent = totalReactions > 0 ? totalReactions : '';
        }
      }
      
      // Update button count
      const reactionButtons = buttonElement.closest('.post-actions-bar').querySelectorAll('.post-action');
      const reactionTypes = ['fire', 'heart', 'laugh', 'shocked'];
      reactionButtons.forEach((btn, idx) => {
        const count = reactions[reactionTypes[idx]] || 0;
        const emoji = btn.textContent.trim().split(' ')[0];
        btn.textContent = count > 0 ? `${emoji} ${count}` : emoji;
      });
      
      showToast('Réaction mise à jour !', 'success');
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    showToast('Erreur: ' + error.message, 'error');
  }
};

// ADD COMMENT
const addComment = async (postId, commentText, commentInputElement) => {
  if (!commentText.trim()) return;
  
  try {
    const postRef = doc(db, 'publishedPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const newComment = {
        id: Date.now().toString(),
        author: userPseudo,
        authorAvatar: userAvatar.src,
        text: commentText.trim(),
        createdAt: Timestamp.now(),
        likes: 0
      };
      
      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
        commentsCount: increment(1)
      });
      
      commentInputElement.value = '';
      showToast('Commentaire ajouté ! 💬', 'success');
      
      // Reload the post
      await loadPublishedPosts();
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    showToast('Erreur: ' + error.message, 'error');
  }
};

// CREATE POST ELEMENT
const createPostElement = (data, postId, index) => {
  const postDiv = document.createElement('div');
  postDiv.className = 'post';
  postDiv.style.animationDelay = `${index * 0.1}s`;
  
  const reactions = data.reactions || { fire: 0, heart: 0, laugh: 0, shocked: 0 };
  const comments = data.comments || [];
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  const userReactions = data.userReactions || [];
  
  const reactionEmojis = [];
  if (reactions.fire > 0) reactionEmojis.push('🔥');
  if (reactions.heart > 0) reactionEmojis.push('❤️');
  if (reactions.laugh > 0) reactionEmojis.push('😂');
  if (reactions.shocked > 0) reactionEmojis.push('😱');
  
  const isOwnPost = data.authorPseudo === userPseudo;
  
  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <img src="${data.authorAvatar}" alt="Avatar" class="post-avatar">
        <div class="post-author-info">
          <div class="post-author-name">@${escapeHtml(data.authorPseudo)}</div>
          <div class="post-meta">
            <span class="post-date">${formatRelativeTime(data.createdAt)}</span>
            <span>·</span>
            <span class="post-visibility">🌍 Public</span>
          </div>
        </div>
      </div>
      ${!isOwnPost ? `<button class="post-repost-btn">🔄 Repartager</button>` : ''}
    </div>
    
    ${data.description ? `<div class="post-description">${escapeHtml(data.description)}</div>` : ''}
    
    <div class="post-message-card">
      <div class="post-message-header">
        <span class="post-message-header-text">SIS</span>
      </div>
      <div class="post-message-content">
        <p class="post-message-text">${escapeHtml(data.message)}</p>
      </div>
    </div>
    
    ${totalReactions > 0 || comments.length > 0 ? `
    <div class="post-stats">
      <div class="post-reactions-count">
        ${totalReactions > 0 ? `
          <div class="post-reactions-icons">
            ${reactionEmojis.map(emoji => `<span>${emoji}</span>`).join('')}
          </div>
          <span>${totalReactions}</span>
        ` : ''}
      </div>
      <div class="post-comments-count">
        ${comments.length > 0 ? `${comments.length} commentaire${comments.length > 1 ? 's' : ''}` : ''}
      </div>
    </div>
    ` : ''}
    
    <div class="post-actions-bar">
      <button class="post-action reaction-fire ${userReactions.includes(`${currentUser.uid}_fire`) ? 'reacted' : ''}" data-reaction="fire">
        🔥 ${reactions.fire > 0 ? reactions.fire : ''}
      </button>
      <button class="post-action reaction-heart ${userReactions.includes(`${currentUser.uid}_heart`) ? 'reacted' : ''}" data-reaction="heart">
        ❤️ ${reactions.heart > 0 ? reactions.heart : ''}
      </button>
      <button class="post-action reaction-laugh ${userReactions.includes(`${currentUser.uid}_laugh`) ? 'reacted' : ''}" data-reaction="laugh">
        😂 ${reactions.laugh > 0 ? reactions.laugh : ''}
      </button>
      <button class="post-action reaction-shocked ${userReactions.includes(`${currentUser.uid}_shocked`) ? 'reacted' : ''}" data-reaction="shocked">
        😱 ${reactions.shocked > 0 ? reactions.shocked : ''}
      </button>
    </div>
    
    ${comments.length > 0 ? `
    <div class="post-comments">
      ${comments.slice(0, 3).map(comment => `
        <div class="comment">
          <img src="${comment.authorAvatar}" alt="Avatar" class="comment-avatar">
          <div class="comment-content">
            <div class="comment-author">@${escapeHtml(comment.author)}</div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            <div class="comment-meta">
              <span class="comment-date">${formatRelativeTime(comment.createdAt)}</span>
            </div>
          </div>
        </div>
      `).join('')}
      ${comments.length > 3 ? `<p style="padding: 10px 0; color: var(--text-secondary); font-size: 14px; cursor: pointer;">Voir ${comments.length - 3} autre${comments.length - 3 > 1 ? 's' : ''} commentaire${comments.length - 3 > 1 ? 's' : ''}...</p>` : ''}
    </div>
    ` : ''}
    
    <div class="comment-input-container">
      <img src="${userAvatar.src}" alt="Avatar" class="comment-avatar-small">
      <input type="text" class="comment-input" placeholder="Écris un commentaire..." maxlength="300">
      <button class="comment-send-btn" disabled>➤</button>
    </div>
  `;
  
  // Repost button
  if (!isOwnPost) {
    const repostBtn = postDiv.querySelector('.post-repost-btn');
    repostBtn.addEventListener('click', () => repostPublication(data));
  }
  
  // Reaction buttons
  const reactionButtons = postDiv.querySelectorAll('.post-action');
  reactionButtons.forEach(btn => {btn.addEventListener('click', () => {
      const reaction = btn.dataset.reaction;
      togglePostReaction(postId, reaction, btn);
    });
  });
  
  // Comment input
  const commentInput = postDiv.querySelector('.comment-input');
  const commentSendBtn = postDiv.querySelector('.comment-send-btn');
  
  commentInput.addEventListener('input', () => {
    commentSendBtn.disabled = !commentInput.value.trim();
  });
  
  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && commentInput.value.trim()) {
      addComment(postId, commentInput.value, commentInput);
    }
  });
  
  commentSendBtn.addEventListener('click', () => {
    if (commentInput.value.trim()) {
      addComment(postId, commentInput.value, commentInput);
    }
  });
  
  return postDiv;
};

// LOAD PUBLISHED POSTS
const loadPublishedPosts = async () => {
  setState(true);
  
  try {
    const q = query(collection(db, 'publishedPosts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    allPublishedPosts = [];
    querySnapshot.forEach((doc) => {
      allPublishedPosts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    if (allPublishedPosts.length === 0) {
      messages.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>Aucune publication</h3>
          <p>Sois le premier à publier un message !</p>
        </div>
      `;
    } else {
      messages.innerHTML = '';
      allPublishedPosts.forEach((post, index) => {
        const postElement = createPostElement(post, post.id, index);
        messages.appendChild(postElement);
      });
    }
    
  } catch (error) {
    console.error('Error loading published posts:', error);
    showError('Erreur de chargement', error.message);
  } finally {
    setState(false);
  }
};

// LOAD MESSAGES
const loadMessages = async () => {
  setState(true);

  try {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    allMessages = [];
    querySnapshot.forEach((doc) => {
      allMessages.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (allMessages.length === 0) {
      showError('Aucun message', 'Aucun message trouvé dans la base de données.');
    } else {
      renderMessages();
      updateStats();
    }

  } catch (error) {
    console.error('Erreur lors du chargement des messages:', error);
    showError('Erreur de chargement', error.message);
  } finally {
    setState(false);
  }
};

// RENDER MESSAGES
const renderMessages = () => {
  let filteredMessages = allMessages;
  
  if (currentFilter === 'favorites') {
    filteredMessages = allMessages.filter(msg => userFavorites.has(msg.id));
  } else if (currentFilter === 'archived') {
    filteredMessages = allMessages.filter(msg => userArchived.has(msg.id));
  } else if (currentFilter === 'active') {
    filteredMessages = allMessages.filter(msg => !userArchived.has(msg.id));
  }
  
  if (filteredMessages.length === 0) {
    const emptyMessages = {
      'favorites': { icon: '⭐', title: 'Aucun favori', text: 'Marque tes messages préférés comme favoris' },
      'archived': { icon: '📦', title: 'Aucune archive', text: 'Archive les messages pour les retrouver ici' },
      'active': { icon: '📭', title: 'Aucun message actif', text: 'Tous tes messages sont archivés' }
    };
    
    const empty = emptyMessages[currentFilter] || { icon: '📭', title: 'Aucun message', text: 'Aucun message trouvé' };
    
    messages.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${empty.icon}</div>
        <h3>${empty.title}</h3>
        <p>${empty.text}</p>
      </div>
    `;
    return;
  }
  
  messages.innerHTML = '';
  
  filteredMessages.forEach((msg, index) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-card';
    messageDiv.style.animationDelay = `${index * 0.1}s`;
    
    const isFavorited = userFavorites.has(msg.id);
    const isArchived = userArchived.has(msg.id);
    
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="message-date">${formatDate(msg.timestamp)}</span>
        <div class="message-actions">
          <button class="action-btn favorite-btn ${isFavorited ? 'active' : ''}" data-id="${msg.id}">
            ${isFavorited ? '⭐ Favori ✓' : '⭐ Favori'}
          </button>
          <button class="action-btn archive-btn" data-id="${msg.id}">
            ${isArchived ? '📤 Désarchiver' : '📦 Archiver'}
          </button>
          <button class="action-btn publish-btn" data-id="${msg.id}">
            🌍 Publier
          </button>
        </div>
      </div>
      <div class="message-content">
        <p class="message-text">${escapeHtml(msg.message)}</p>
      </div>
      ${msg.to ? `<div class="message-footer">À: ${escapeHtml(msg.to)}</div>` : ''}
    `;
    
    messages.appendChild(messageDiv);
    
    // Event listeners
    const favoriteBtn = messageDiv.querySelector('.favorite-btn');
    const archiveBtn = messageDiv.querySelector('.archive-btn');
    const publishBtn = messageDiv.querySelector('.publish-btn');
    
    favoriteBtn.addEventListener('click', () => toggleFavorite(msg.id, favoriteBtn));
    archiveBtn.addEventListener('click', () => toggleArchive(msg.id, archiveBtn));
    publishBtn.addEventListener('click', () => openPublishModal(msg.id, msg.message));
  });
};

// UPDATE STATS
const updateStats = () => {
  const total = allMessages.length;
  const today = allMessages.filter(msg => isToday(msg.timestamp)).length;
  const favorites = userFavorites.size;
  
  totalMessagesEl.textContent = total;
  todayMessagesEl.textContent = today;
  favMessagesEl.textContent = favorites;
};

// LOAD BUTTON
loadBtn.addEventListener('click', () => {
  if (currentFilter === 'published') {
    loadPublishedPosts();
  } else {
    loadMessages();
  }
});