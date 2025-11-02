// Config Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
    authDomain: "chat-anonyme.firebaseapp.com",
    databaseURL: "https://chat-anonyme-default-rtdb.firebaseio.com",
    projectId: "chat-anonyme",
    storageBucket: "chat-anonyme.appspot.com",
    messagingSenderId: "93366459642",
    appId: "1:93366459642:web:a2421c9478909b33667d43",
    measurementId: "G-MF8RGP29LN"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
let userId = null;
let avatarURL = null;
let roomRef = null;
let roomId = null;
let partnerLeft = false;
let matchmakingTimeout = null;
let typingTimeout = null;
let replyToMessageId = null;
let joinedRooms = [];
let currentUser = null;
let roomCreator = null;
let userCountry = 'FR';

// Function to get country from IP
async function getCountryFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'FR'; // Fallback to FR if unknown
  } catch (error) {
    console.error('Error fetching IP country:', error);
    return 'FR';
  }
}

// DOM
const authSection = document.getElementById("authSection");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const authStatus = document.getElementById("authStatus");
const onlineUsersDiv = document.getElementById("onlineUsers");
const statusMessage = document.getElementById("statusMessage");
const discuterBtn = document.getElementById("discuterBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const quitBtn = document.getElementById("quitBtn");
const chatSection = document.getElementById("chatSection");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingStatus = document.getElementById("typingStatus");
const avatarInput = document.getElementById("avatarInput");
const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
const avatarPreview = document.getElementById("avatarPreview");
const replyPreview = document.getElementById("replyPreview");
const replySender = document.getElementById("replySender");
const replyText = document.getElementById("replyText");
const cancelReply = document.getElementById("cancelReply");
const imageBtn = document.getElementById("imageBtn");
const imageInput = document.getElementById("imageInput");
const roomListSection = document.getElementById("roomListSection");
const genreSelect = document.getElementById("genreSelect");
const roomList = document.getElementById("roomList");
const roomHistory = document.getElementById("roomHistory");
const roomManagement = document.getElementById("roomManagement");
const userList = document.getElementById("userList");
const banBtn = document.getElementById("banBtn");
const announcementInput = document.getElementById("announcementInput");
const sendAnnouncementBtn = document.getElementById("sendAnnouncementBtn");
const activeMembers = document.getElementById("activeMembers");
const activeUserList = document.getElementById("activeUserList");

// Auth
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        userId = user.uid;
        authSection.style.display = "none";
        uploadAvatarBtn.style.display = "block";
        discuterBtn.style.display = "block";
        createRoomBtn.style.display = "block";
        roomListSection.style.display = "block";
        activeMembers.style.display = "block";
        const userRef = db.ref("onlineUsers").child(userId);
        userRef.set(true);
        userRef.onDisconnect().remove();
        db.ref("avatars/" + userId).once("value").then(snap => {
            if (snap.exists()) {
                avatarURL = snap.val();
                avatarPreview.src = avatarURL;
                avatarPreview.style.display = "block";
            } else {
                avatarURL = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=${Math.floor(Math.random() * 16777215).toString(16)}&color=ffffff`;
                db.ref("avatars/" + userId).set(avatarURL);
                avatarPreview.src = avatarURL;
                avatarPreview.style.display = "block";
            }
        });
        userCountry = await getCountryFromIP();
        loadRoomList();
        loadHistory();
    } else {
        authSection.style.display = "block";
        uploadAvatarBtn.style.display = "none";
        discuterBtn.style.display = "none";
        createRoomBtn.style.display = "none";
        roomListSection.style.display = "none";
        chatSection.style.display = "none";
        roomManagement.style.display = "none";
        activeMembers.style.display = "none";
    }
});

registerBtn.addEventListener("click", () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.createUserWithEmailAndPassword(email, password).then(() => {
        authStatus.textContent = "Inscription réussie !";
    }).catch(err => {
        authStatus.textContent = err.message;
    });
});

loginBtn.addEventListener("click", () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password).then(() => {
        authStatus.textContent = "Connexion réussie !";
    }).catch(err => {
        authStatus.textContent = err.message;
    });
});

// Avatar upload
uploadAvatarBtn.addEventListener("click", () => {
    const file = avatarInput.files[0];
    if (!file) return alert("Veuillez choisir une image");
    if (!["image/jpeg", "image/png"].includes(file.type)) return alert("Seuls JPEG/PNG acceptés");
    if (file.size > 2 * 1024 * 1024) return alert("Image <2Mo");
    const reader = new FileReader();
    reader.onload = function (e) {
        avatarURL = e.target.result;
        db.ref("avatars/" + userId).set(avatarURL);
        avatarPreview.src = avatarURL;
        avatarPreview.style.display = "block";
    }
    reader.readAsDataURL(file);
});

// Online users
db.ref("onlineUsers").on("value", snap => {
    onlineUsersDiv.textContent = "En ligne : " + Object.keys(snap.val() || {}).length;
});

// Matchmaking for random chat
discuterBtn.addEventListener("click", () => {
    discuterBtn.disabled = true;
    statusMessage.innerHTML = 'Recherche en cours<span>...</span>';
    joinQueue();
    matchmakingTimeout = setTimeout(() => {
        statusMessage.textContent = "Aucun partenaire trouvé.";
        discuterBtn.disabled = false;
        db.ref("queue/" + userId).remove();
    }, 20000);
});

function joinQueue() {
    const q = db.ref("queue");
    q.once("value").then(s => {
        const queue = s.val() || {};
        const partnerKey = Object.keys(queue).find(id => id !== userId);
        if (partnerKey) {
            clearTimeout(matchmakingTimeout);
            roomId = db.ref("rooms").push().key;
            const rData = { users: { [userId]: true, [partnerKey]: true }, lastActive: Date.now(), type: 'private', genre: 'random', creator: userId, badges: { [userId]: 'admin' } };
            db.ref("rooms/" + roomId).set(rData);
            db.ref("queue/" + partnerKey).remove();
            db.ref("rooms/" + roomId + "/joined/" + userId).set(true);
            db.ref("rooms/" + roomId + "/joined/" + partnerKey).set(true);
            openChat(roomId);
            addToHistory(roomId, 'Chat aléatoire');
        } else {
            db.ref("queue/" + userId).set(true);
            statusMessage.innerHTML = 'En attente d’un partenaire<span>...</span>';
            db.ref("rooms").on("child_added", snap => {
                const room = snap.val();
                if (room.users && room.users[userId] && !room.joined?.[userId]) {
                    db.ref("rooms/" + snap.key + "/joined/" + userId).set(true);
                    roomId = snap.key;
                    openChat(roomId);
                    addToHistory(roomId, 'Chat aléatoire');
                }
            });
        }
    });
}

// Create public/private room
createRoomBtn.addEventListener("click", () => {
    const type = prompt("Type de salon (public/privé) :");
    if (!type || !['public', 'privé'].includes(type)) return alert("Type invalide");
    const genre = prompt("Genre (Tech, Sport, Mangas, Culture, Nature) :");
    if (!genre || !['Tech', 'Sport', 'Mangas', 'Culture', 'Nature'].includes(genre)) return alert("Genre invalide");
    roomId = db.ref("rooms").push().key;
    const rData = { users: { [userId]: true }, lastActive: Date.now(), type: type === 'privé' ? 'private' : 'public', genre, creator: userId, badges: { [userId]: 'admin' } };
    db.ref("rooms/" + roomId).set(rData);
    db.ref("rooms/" + roomId + "/joined/" + userId).set(true);
    openChat(roomId);
    addToHistory(roomId, `${genre} - ${type}`);
    const link = `${window.location.origin}?room=${roomId}`;
    prompt("Lien du salon :", link);
});

// Load public rooms
function loadRoomList() {
    db.ref("rooms").on("value", snap => {
        roomList.innerHTML = "";
        const rooms = snap.val() || {};
        const selectedGenre = genreSelect.value;
        Object.entries(rooms).forEach(([rid, room]) => {
            if (room.type === 'public' && (!selectedGenre || room.genre === selectedGenre)) {
                const li = document.createElement("li");
                li.textContent = `${room.genre} - Salon ${rid.slice(0, 5)}... (Utilisateurs: ${Object.keys(room.users || {}).length})`;
                li.addEventListener("click", () => {
                    db.ref("rooms/" + rid + "/banned/" + userId).once("value").then(banSnap => {
                        if (banSnap.exists()) {
                            alert("Vous êtes banni de ce salon.");
                        } else {
                            db.ref("rooms/" + rid + "/users/" + userId).set(true);
                            db.ref("rooms/" + rid + "/joined/" + userId).set(true);
                            openChat(rid);
                            addToHistory(rid, `${room.genre} - public`);
                        }
                    });
                });
                roomList.appendChild(li);
            }
        });
    });
}

genreSelect.addEventListener("change", loadRoomList);

// Join room from link
const urlParams = new URLSearchParams(window.location.search);
const joinRoomId = urlParams.get('room');
if (joinRoomId && currentUser) {
    db.ref("rooms/" + joinRoomId).once("value").then(snap => {
        if (snap.exists()) {
            const room = snap.val();
            db.ref("rooms/" + joinRoomId + "/banned/" + userId).once("value").then(banSnap => {
                if (banSnap.exists()) {
                    alert("Vous êtes banni de ce salon.");
                } else {
                    if (room.type === 'public' || confirm("Ce salon est privé. Demander l'accès ?")) {
                        db.ref("rooms/" + joinRoomId + "/users/" + userId).set(true);
                        db.ref("rooms/" + joinRoomId + "/joined/" + userId).set(true);
                        openChat(joinRoomId);
                        addToHistory(joinRoomId, `${room.genre} - ${room.type}`);
                    }
                }
            });
        } else {
            alert("Salon introuvable");
        }
    });
}

// Open chat
function openChat(rid) {
    statusMessage.textContent = "";
    discuterBtn.style.display = "none";
    createRoomBtn.style.display = "none";
    quitBtn.style.display = "inline-block";
    chatSection.style.display = "flex";
    roomRef = db.ref("rooms/" + rid + "/messages");
    addSystemMessage("BIENVENUE, VOUS POUVEZ DISCUTER");
    roomRef.on("child_added", snap => {
        const d = snap.val();
        if (d.announcement) {
            addAnnouncement(d.text, d.sender, d.time);
        } else if (d.image) {
            addImageMessage(d.image, d.sender === userId ? 'me' : 'other', d.sender, d.time, d.seen || false);
        } else {
            addMessage(d.text, d.sender === userId ? 'me' : 'other', d.sender, d.time, d.seen || false, d.replyTo || null, d.country || "FR");
        }
        if (d.sender !== userId && !d.seen) {
            roomRef.child(snap.key).update({ seen: true });
        }
    });
    monitorTyping(rid);
    db.ref("rooms/" + rid + "/users").on("child_removed", snap => {
        if (snap.key !== userId && !partnerLeft) {
            partnerLeft = true;
            addSystemMessage("Un participant a quitté la discussion.");
        }
    });
    checkIfCreator(rid);
    loadActiveMembers(rid);
    window.addEventListener("beforeunload", () => { quitRoom(); });
}

// Check if user is creator and show management
function checkIfCreator(rid) {
    db.ref("rooms/" + rid + "/creator").once("value").then(snap => {
        if (snap.val() === userId) {
            roomManagement.style.display = "block";
            loadUserList(rid);
        } else {
            roomManagement.style.display = "none";
        }
    });
}

function loadUserList(rid) {
    db.ref("rooms/" + rid + "/users").on("value", snap => {
        userList.innerHTML = "";
        const users = snap.val() || {};
        db.ref("rooms/" + rid + "/badges").once("value").then(badgeSnap => {
            const badges = badgeSnap.val() || {};
            Object.keys(users).forEach(uid => {
                if (uid !== userId) {
                    const li = document.createElement("li");
                    li.textContent = `Utilisateur ${uid.slice(0, 5)}...`;
                    const badgeSelect = document.createElement("select");
                    ['member', 'moderator', 'admin'].forEach(b => {
                        const opt = document.createElement("option");
                        opt.value = b;
                        opt.textContent = b.charAt(0).toUpperCase() + b.slice(1);
                        if (badges[uid] === b) opt.selected = true;
                        badgeSelect.appendChild(opt);
                    });
                    badgeSelect.addEventListener("change", () => {
                        const newBadge = badgeSelect.value;
                        db.ref("rooms/" + rid + "/badges/" + uid).set(newBadge);
                        addSystemMessage(`Badge de l'utilisateur ${uid.slice(0, 5)}... mis à jour en ${newBadge}.`);
                    });
                    li.appendChild(badgeSelect);
                    const banButton = document.createElement("button");
                    banButton.textContent = "Bannir";
                    banButton.addEventListener("click", () => {
                        if (confirm(`Bannir cet utilisateur ?`)) {
                            db.ref("rooms/" + rid + "/users/" + uid).remove();
                            db.ref("rooms/" + rid + "/banned/" + uid).set(true);
                            addSystemMessage(`Utilisateur ${uid.slice(0, 5)}... a été banni.`);
                        }
                    });
                    li.appendChild(banButton);
                    userList.appendChild(li);
                }
            });
        });
    });
}

// Load active members
function loadActiveMembers(rid) {
    db.ref("rooms/" + rid + "/users").on("value", snap => {
        activeUserList.innerHTML = "";
        const users = snap.val() || {};
        db.ref("rooms/" + rid + "/badges").once("value").then(badgeSnap => {
            const badges = badgeSnap.val() || {};
            Object.keys(users).forEach(uid => {
                const li = document.createElement("li");
                li.textContent = `Utilisateur ${uid.slice(0, 5)}...`;
                const badgeSpan = document.createElement("span");
                badgeSpan.classList.add("badge", `badge-${badges[uid] || 'member'}`);
                badgeSpan.textContent = badges[uid] || 'Membre';
                li.appendChild(badgeSpan);
                activeUserList.appendChild(li);
            });
        });
    });
}

// Send announcement
sendAnnouncementBtn.addEventListener("click", () => {
    const text = announcementInput.value.trim();
    if (text !== "" && roomRef) {
        const msgData = { sender: userId, text, time: Date.now(), announcement: true };
        roomRef.push(msgData);
        announcementInput.value = "";
    }
});

// Messages
function addMessage(text, type, senderId, time, seen, replyId, country) {
    const c = document.createElement("div");
    c.classList.add("message-container", type);
    c.addEventListener("click", () => {
        replyToMessageId = time;
        replySender.textContent = type === 'me' ? "Vous" : "Partenaire";
        replyText.textContent = text;
        replyPreview.style.display = "block";
    });
    const a = document.createElement("img");
    db.ref("avatars/" + senderId).once("value").then(s => {
        a.src = s.exists() ? s.val() : "";
        a.onerror = () => { a.src = `https://ui-avatars.com/api/?name=U&background=random`; };
    });
    const t = document.createElement("div");
    t.classList.add("message-text");
    if (replyId) {
        const r = document.createElement("div");
        r.style.fontSize = "12px";
        r.style.background = "#f0f0f0";
        r.style.padding = "4px 8px";
        r.style.borderLeft = "3px solid #004d99";
        r.style.marginBottom = "4px";
        r.textContent = "Réponse à ce message";
        t.appendChild(r);
    }
    t.appendChild(document.createTextNode(text));
    if (time) {
        const tm = document.createElement("div");
        tm.classList.add("message-time");
        const d = new Date(time);
        tm.textContent = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
        if (type === 'me' && seen) {
            const s = document.createElement("span");
            s.classList.add("seen");
            s.textContent = " vu ✔";
            tm.appendChild(s);
        }
        if (country) {
            const f = document.createElement("span");
            f.style.marginRight = "6px";
            f.textContent = countryEmoji(country);
            tm.prepend(f);
        }
        t.appendChild(tm);
    }
    c.appendChild(a);
    c.appendChild(t);
    messagesDiv.appendChild(c);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addImageMessage(imageUrl, type, senderId, time, seen) {
    const c = document.createElement("div");
    c.classList.add("message-container", type);
    const a = document.createElement("img");
    db.ref("avatars/" + senderId).once("value").then(s => {
        a.src = s.exists() ? s.val() : "";
    });
    const img = document.createElement("img");
    img.src = imageUrl;
    img.style.maxWidth = "200px";
    img.style.borderRadius = "10px";
    const t = document.createElement("div");
    t.classList.add("message-text");
    t.appendChild(img);
    if (time) {
        const tm = document.createElement("div");
        tm.classList.add("message-time");
        const d = new Date(time);
        tm.textContent = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
        if (type === 'me' && seen) {
            const s = document.createElement("span");
            s.classList.add("seen");
            s.textContent = " vu ✔";
            tm.appendChild(s);
        }
        t.appendChild(tm);
    }
    c.appendChild(a);
    c.appendChild(t);
    messagesDiv.appendChild(c);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addAnnouncement(text, senderId, time) {
    const d = document.createElement("div");
    d.classList.add("announcement");
    d.textContent = text;
    if (time) {
        const tm = document.createElement("div");
        tm.style.fontSize = "10px";
        tm.style.color = "#004d99";
        const date = new Date(time);
        tm.textContent = `Annonce par Utilisateur ${senderId.slice(0, 5)}... à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        d.appendChild(tm);
    }
    messagesDiv.appendChild(d);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
    const d = document.createElement("div");
    d.classList.add("system");
    d.textContent = text;
    messagesDiv.appendChild(d);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Sending message
sendBtn.addEventListener("click", sendMessage);
function sendMessage() {
    const text = messageInput.value.trim();
    if (text !== "" && roomRef) {
        const msgData = { sender: userId, text, time: Date.now(), seen: false, replyTo: replyToMessageId, country: userCountry };
        roomRef.push(msgData);
        db.ref("rooms/" + roomId).child("lastActive").set(Date.now());
        messageInput.value = "";
        messageInput.style.height = "auto";
        typingStatus.textContent = "";
        replyToMessageId = null;
        replyPreview.style.display = "none";
    }
}

// Sending image
imageBtn.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
        const storageRef = storage.ref("images/" + Date.now() + "_" + file.name);
        storageRef.put(file).then(snapshot => {
            snapshot.ref.getDownloadURL().then(url => {
                const msgData = { sender: userId, image: url, time: Date.now(), seen: false };
                roomRef.push(msgData);
            });
        });
    }
});

// Reply cancel
cancelReply.addEventListener("click", () => {
    replyToMessageId = null;
    replyPreview.style.display = "none";
});

// Typing
messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
    sendTypingStatus();
});

function sendTypingStatus() {
    if (!roomId) return;
    const t = db.ref("rooms/" + roomId + "/typing/" + userId);
    t.set(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { t.set(false); }, 1000);
}

function monitorTyping(rid) {
    db.ref("rooms/" + rid + "/typing").on("value", snap => {
        const d = snap.val() || {};
        typingStatus.textContent = Object.keys(d).filter(id => id !== userId && d[id]).length ? "Quelqu'un est en train d'écrire..." : "";
    });
}

// Quit
quitBtn.addEventListener("click", quitRoom);
function quitRoom() {
    if (roomId) {
        db.ref("rooms/" + roomId + "/users/" + userId).remove();
        roomRef.off();
        chatSection.style.display = "none";
        discuterBtn.style.display = "inline-block";
        createRoomBtn.style.display = "inline-block";
        quitBtn.style.display = "none";
        messagesDiv.innerHTML = "";
        statusMessage.textContent = "";
        roomId = null;
        partnerLeft = false;
        roomManagement.style.display = "none";
        activeMembers.style.display = "none";
    }
}

// History
function addToHistory(rid, name) {
    if (!joinedRooms.includes(rid)) {
        joinedRooms.push(rid);
        db.ref("users/" + userId + "/history/" + rid).set(name);
        loadHistory();
    }
}

function loadHistory() {
    db.ref("users/" + userId + "/history").once("value").then(snap => {
        const history = snap.val() || {};
        roomHistory.innerHTML = "<h3>Historique des Salons</h3><ul></ul>";
        const ul = roomHistory.querySelector("ul");
        Object.entries(history).forEach(([rid, name]) => {
            const li = document.createElement("li");
            li.textContent = name;
            li.addEventListener("click", () => {
                openChat(rid);
            });
            ul.appendChild(li);
        });
        roomHistory.style.display = Object.keys(history).length ? "block" : "none";
    });
}

function countryEmoji(code) {
    return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}