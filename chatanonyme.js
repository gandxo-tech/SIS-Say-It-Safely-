// ════════════════════════════════════════════
//  SIS V3 — chatanonyme.js
//  Firebase COMPAT uniquement (pas de modules)
//  Ce fichier est chargé APRÈS les scripts Firebase dans le HTML
// ════════════════════════════════════════════

// CONFIG FIREBASE
var fb = firebase.initializeApp({
  apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
  authDomain:        "chat-anonyme.firebaseapp.com",
  projectId:         "chat-anonyme",
  storageBucket:     "chat-anonyme.firebasestorage.app",
  messagingSenderId: "93366459642",
  appId:             "1:93366459642:web:a2421c9478909b33667d43"
});
var auth = firebase.auth();
var db   = firebase.firestore();

// CLOUDINARY
var CLOUD = { n: "duddyzckz", p: "ml_defaulte" };

// CONSTANTES
var CAT    = { general:"💬", gaming:"🎮", tech:"💻", music:"🎵", sport:"⚽", education:"📚" };
var EMOJIS = ["❤️","😂","😮","😢","😡","👍","🔥","💯","🎉","👀"];
var ADJ    = ["cosmic","shadow","silent","ghost","crystal","neon","mystic","void","stellar","frozen"];
var NOUN   = ["wave","storm","orbit","drift","pulse","spark","flare","veil","shade","cipher"];
var EMO    = ["🎭","🦊","🐺","🦝","🦁","🐯","🦋","🌊","🔮","💫","🌙","⚡","🎲","🌀","🧿"];
var COL    = ["#6c63ff","#f97316","#06b6d4","#10b981","#f43f5e","#8b5cf6","#eab308","#ec4899"];
var MOD    = [/pornhub/i,/xvideos/i,/xnxx/i,/\.xxx/i,/\bporn\b/i,/free.*bitcoin/i,/\bbuy.*drugs?\b/i];
var BGS    = { default:"var(--bg)", mid:"#0a0a14", navy:"#0f1929", forest:"#0d1f18", violet:"linear-gradient(135deg,#1a0533,#0d0d2e)", ocean:"linear-gradient(135deg,#001b33,#003366)", aurora:"linear-gradient(135deg,#0d1f18,#1a0533)", sunset:"linear-gradient(135deg,#1f0d0d,#1a1000)" };
var ERRS   = { "auth/invalid-credential":"Email ou mot de passe incorrect.", "auth/user-not-found":"Aucun compte trouvé.", "auth/wrong-password":"Mot de passe incorrect.", "auth/email-already-in-use":"Email déjà utilisé.", "auth/weak-password":"Mot de passe trop court (6+ caractères).", "auth/invalid-email":"Email invalide.", "auth/operation-not-allowed":"Connexion anonyme non activée." };

// ÉTAT GLOBAL
var S = {
  user: null, profile: null,
  theme: localStorage.getItem("sis_th") || "dark",
  ephH: +(localStorage.getItem("sis_eph") || 0), ephP: 0,
  curRoomId: null, curRoom: null,
  replyTo: null, editId: null,
  rooms: [],
  rec: false, mr: null, rc: [], rt: null, rs: 0,
  randId: null, randUnsub: null,
  mRes: [], mIdx: 0,
  stk: JSON.parse(localStorage.getItem("sis_stk") || "[]"),
  notifs: JSON.parse(localStorage.getItem("sis_notifs") || "[]"),
  flag: localStorage.getItem("sis_flag") || "",
  anonN: "", anonC: "#6c63ff", anonE: "🎭",
  ls: [],
};

// ── INIT ──────────────────────────────────────
document.documentElement.setAttribute("data-theme", S.theme);
genAnon();
updEphBadge();
loadStk();
loadNBadge();
fetchFlag();

if (!localStorage.getItem("sis_cgu")) {
  document.getElementById("cguOv").style.display = "flex";
}

auth.onAuthStateChanged(function(user) {
  if (user) {
    S.user = user;
    ensureProf(user).then(function(p) {
      S.profile = p;
      setupUI();
      setupPresence();
      loadRooms();
      showPage("pgApp");
    });
  } else {
    S.user = null;
    S.profile = null;
    showPage("pgAuth");
  }
});

// ── CGU ───────────────────────────────────────
function acceptCGU() {
  localStorage.setItem("sis_cgu", "1");
  document.getElementById("cguOv").style.display = "none";
}

// ── AUTH ──────────────────────────────────────
function switchTab(t) {
  var names = ["login","register","anon"];
  var ids   = ["vwLogin","vwRegister","vwAnon"];
  document.querySelectorAll(".tab").forEach(function(b, i) { b.classList.toggle("on", names[i] === t); });
  ids.forEach(function(id, i) { document.getElementById(id).classList.toggle("on", names[i] === t); });
  document.getElementById("authAl").style.display = "none";
}

function showAl(msg, type) {
  var el = document.getElementById("authAl");
  el.textContent = msg;
  el.className = "al " + (type || "err");
  el.style.display = "block";
}

function setLoad(id, on) {
  var btn = document.getElementById(id);
  if (!btn) return;
  btn.querySelector(".lbl").style.opacity = on ? "0" : "1";
  btn.querySelector(".spin").style.display = on ? "block" : "none";
  btn.disabled = on;
}

function ae(code) { return ERRS[code] || "Erreur: " + code; }

function signInEmail() {
  var email = gv("lgEmail"), pass = gv("lgPass");
  if (!email || !pass) return showAl("Remplis tous les champs.");
  setLoad("btnLogin", true);
  auth.signInWithEmailAndPassword(email, pass)
    .catch(function(e) { showAl(ae(e.code)); setLoad("btnLogin", false); });
}

function registerEmail() {
  var pseudo = gv("rgPseudo"), email = gv("rgEmail"), pass = gv("rgPass"), conf = gv("rgConf");
  if (!pseudo || !email || !pass) return showAl("Remplis tous les champs.");
  if (pass !== conf) return showAl("Mots de passe différents.");
  setLoad("btnReg", true);
  auth.createUserWithEmailAndPassword(email, pass)
    .then(function(r) { return r.user.updateProfile({ displayName: pseudo }); })
    .catch(function(e) { showAl(ae(e.code)); setLoad("btnReg", false); });
}

function doAnon() {
  setLoad("btnAnon", true);
  auth.signInAnonymously()
    .catch(function(e) { showAl(ae(e.code)); setLoad("btnAnon", false); });
}

function forgotPass() {
  var email = gv("lgEmail");
  if (!email) return showAl("Entre d'abord ton email.");
  auth.sendPasswordResetEmail(email)
    .then(function() { showAl("Email envoyé !", "ok"); })
    .catch(function(e) { showAl(ae(e.code)); });
}

function signOutUser() {
  if (S.user) db.collection("users").doc(S.user.uid).update({ status: "offline" }).catch(function(){});
  S.ls.forEach(function(u) { u(); }); S.ls = [];
  auth.signOut(); closePanels();
}

// ── PROFIL ────────────────────────────────────
function ensureProf(user) {
  var ref = db.collection("users").doc(user.uid);
  return ref.get().then(function(snap) {
    if (!snap.exists) {
      var p = { uid: user.uid, displayName: user.displayName || S.anonN, email: user.email || null, photoURL: user.photoURL || null, role: "user", status: "online", isAnonymous: user.isAnonymous, anonEmoji: user.isAnonymous ? S.anonE : null, anonColor: user.isAnonymous ? S.anonC : null, warnings: 0, badge: null, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      return ref.set(p).then(function() { return p; });
    }
    ref.update({ status: "online", lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    return snap.data();
  });
}

function setupUI() {
  renderAv(document.getElementById("topAv"), S.profile, S.user);
  if (S.profile && S.profile.role === "admin") document.getElementById("adminNav").style.display = "block";
}

function renderAv(el, p, u) {
  if (!el) return;
  if ((u && u.photoURL) || (p && p.photoURL)) {
    el.innerHTML = "<img src='" + (u && u.photoURL || p && p.photoURL) + "' alt=''/>";
  } else if (u && u.isAnonymous && p && p.anonEmoji) {
    el.textContent = p.anonEmoji; el.style.background = p.anonColor || "#6c63ff";
  } else {
    el.textContent = ((p && p.displayName) || (u && u.displayName) || "U")[0].toUpperCase();
  }
}

function setupPresence() {
  if (!S.user) return;
  var ref = db.collection("users").doc(S.user.uid);
  S.ls.push(ref.onSnapshot(function(snap) { if (snap.data() && snap.data().banned) signOutUser(); }));
  var hb = setInterval(function() { ref.update({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }); }, 30000);
  S.ls.push(function() { clearInterval(hb); });
  window.addEventListener("beforeunload", function() { ref.update({ status: "offline" }).catch(function(){}); });
}

function openProfile() {
  renderAv(document.getElementById("profAv"), S.profile, S.user);
  document.getElementById("profName").textContent = (S.profile && S.profile.displayName) || (S.user && S.user.displayName) || "";
  document.getElementById("profEmail").textContent = (S.user && S.user.email) || "Anonyme";
  document.getElementById("profPseudo").value = (S.profile && S.profile.displayName) || (S.user && S.user.displayName) || "";
  setStatusUI((S.profile && S.profile.status) || "online");
  openPanel("profilePanel");
}

function setStatusUI(s) { document.querySelectorAll(".sopt").forEach(function(b) { b.classList.toggle("on", b.dataset.s === s); }); }
function setStatus(s) { setStatusUI(s); if (S.user) db.collection("users").doc(S.user.uid).update({ status: s }).catch(function(){}); }

function uploadAv(e) {
  var file = e.target.files[0]; if (!file) return;
  toast("Upload...", "info");
  uploadCloud(file, "image").then(function(url) {
    return S.user.updateProfile({ photoURL: url }).then(function() {
      return db.collection("users").doc(S.user.uid).update({ photoURL: url });
    }).then(function() {
      S.profile.photoURL = url;
      renderAv(document.getElementById("profAv"), S.profile, S.user);
      renderAv(document.getElementById("topAv"), S.profile, S.user);
      toast("Photo mise à jour !", "success");
    });
  }).catch(function() { toast("Erreur upload.", "error"); });
}

function saveProf() {
  var pseudo = document.getElementById("profPseudo").value.trim();
  if (!pseudo) return toast("Pseudo vide.", "error");
  S.user.updateProfile({ displayName: pseudo }).then(function() {
    return db.collection("users").doc(S.user.uid).update({ displayName: pseudo });
  }).then(function() {
    S.profile.displayName = pseudo;
    renderAv(document.getElementById("topAv"), S.profile, S.user);
    closePanels(); toast("Profil mis à jour !", "success");
  }).catch(function() { toast("Erreur.", "error"); });
}

function delAccount() {
  if (!confirm("Supprimer ton compte ? Action irréversible.")) return;
  db.collection("users").doc(S.user.uid).update({ deleted: true, status: "offline" })
    .then(function() { return S.user.delete(); })
    .catch(function(e) { if (e.code === "auth/requires-recent-login") toast("Reconnecte-toi puis réessaie.", "error"); });
}

// ── IDENTITÉ ANONYME ──────────────────────────
function genAnon() {
  S.anonN = ADJ[rnd(ADJ.length)] + "_" + NOUN[rnd(NOUN.length)] + "_" + (Math.floor(Math.random() * 900) + 100);
  S.anonC = COL[rnd(COL.length)];
  S.anonE = EMO[rnd(EMO.length)];
  var av = document.getElementById("anonAv"), nm = document.getElementById("anonName");
  if (av) { av.textContent = S.anonE; av.style.background = S.anonC; }
  if (nm) nm.textContent = S.anonN;
}

function fetchFlag() {
  if (S.flag) return;
  fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.country_code && d.country_code.length === 2) {
        S.flag = d.country_code.toUpperCase().replace(/./g, function(c) { return String.fromCodePoint(c.charCodeAt(0) + 127397); });
        localStorage.setItem("sis_flag", S.flag);
      }
    }).catch(function(){});
}

// ── SALONS ────────────────────────────────────
function loadRooms() {
  var unsub = db.collection("rooms").orderBy("lastMessageAt","desc").limit(60)
    .onSnapshot(function(snap) {
      S.rooms = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      renderRooms(S.rooms);
    });
  S.ls.push(unsub);
  db.collection("users").where("status","==","online").onSnapshot(function(snap) {
    var el = document.getElementById("onlineCnt"); if (el) el.textContent = snap.size;
  });
}

function renderRooms(rooms) {
  var list = document.getElementById("rlist");
  if (!rooms.length) { list.innerHTML = "<div class='empty'><span>Aucun salon</span></div>"; return; }
  list.innerHTML = rooms.map(function(r) {
    return "<div class='rr" + (S.curRoomId === r.id ? " on" : "") + "' onclick='openRoom(\"" + r.id + "\")'>" +
      "<div class='ri'>" + (CAT[r.category] || "💬") + "</div>" +
      "<div class='rif'><div class='rn'>" + esc(r.name) + "</div><div class='rl2'>" + (r.lastMessage ? esc(r.lastMessage) : "Aucun message") + "</div></div>" +
      "<span class='rtp " + (r.type === "public" ? "tp" : "tpr") + "'>" + (r.type === "public" ? "Public" : "Privé") + "</span>" +
      "</div>";
  }).join("");
}

function filterRooms(q) { renderRooms(S.rooms.filter(function(r) { return r.name.toLowerCase().includes(q.toLowerCase()); })); }
function filterCat(btn, cat) {
  document.querySelectorAll(".cb").forEach(function(b) { b.classList.remove("on"); }); btn.classList.add("on");
  renderRooms(cat === "all" ? S.rooms : S.rooms.filter(function(r) { return r.category === cat; }));
}

function openCreateRoom() { openOv("ovCreateRoom"); }
var rType = "public";
function selType(t) {
  rType = t;
  document.getElementById("tpub").classList.toggle("on", t === "public");
  document.getElementById("tpriv").classList.toggle("on", t === "private");
  document.getElementById("pwDiv").style.display = t === "private" ? "block" : "none";
}
function createRoom() {
  var name = gv("rName").trim(), cat = gv("rCat");
  if (!name) return toast("Donne un nom au salon.", "error");
  db.collection("rooms").add({ name: name, category: cat, type: rType, password: rType === "private" ? gv("rPw") : null, createdBy: S.user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessage: null, memberCount: 1, pinned: false })
    .then(function(ref) { closeOv("ovCreateRoom"); openRoom(ref.id); toast("Salon créé !", "success"); })
    .catch(function() { toast("Erreur.", "error"); });
}

var msgUnsub = null;
function openRoom(roomId) {
  var room = S.rooms.find(function(r) { return r.id === roomId; }); if (!room) return;
  if (room.type === "private" && room.password) {
    var pw = prompt("Mot de passe du salon :"); if (pw !== room.password) return toast("Mot de passe incorrect.", "error");
  }
  S.curRoomId = roomId; S.curRoom = room; cancelReply();
  document.getElementById("chatEmpty").style.display = "none";
  document.getElementById("chatActive").style.display = "flex";
  document.getElementById("chatIco").textContent = CAT[room.category] || "💬";
  document.getElementById("chatName").textContent = room.name;
  document.getElementById("chatSub").textContent = (room.memberCount || 0) + " membres";
  document.querySelectorAll(".rr").forEach(function(el) { el.classList.remove("on"); });
  if (window.innerWidth <= 768) { document.getElementById("backBtn").style.display = "block"; document.getElementById("sidebar").classList.remove("on"); }
  db.collection("rooms").doc(roomId).collection("members").doc(S.user.uid).set({ uid: S.user.uid, joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  loadPinned(roomId);
  if (msgUnsub) msgUnsub();
  msgUnsub = db.collection("rooms").doc(roomId).collection("messages").orderBy("createdAt","asc").limit(100)
    .onSnapshot(function(snap) {
      var now = Date.now();
      var msgs = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); })
        .filter(function(m) { return !m.expiresAt || m.expiresAt.toMillis() > now; });
      renderMsgs(msgs, "msgList", roomId);
      snap.docs.forEach(function(d) { if (d.data().expiresAt && d.data().expiresAt.toMillis() <= now) d.ref.delete(); });
    });
}

function loadPinned(rid) {
  db.collection("rooms").doc(rid).collection("messages").where("pinned","==",true).limit(1).get()
    .then(function(snap) {
      var b = document.getElementById("pban");
      if (snap.empty) { b.style.display = "none"; return; }
      b.style.display = "flex"; document.getElementById("pbanTxt").textContent = snap.docs[0].data().text || "📎";
    });
}

function closeChat() {
  document.getElementById("chatEmpty").style.display = "flex";
  document.getElementById("chatActive").style.display = "none";
  document.getElementById("backBtn").style.display = "none";
  S.curRoomId = null; S.curRoom = null;
  if (window.innerWidth <= 768) document.getElementById("sidebar").classList.add("on");
}

function shareRoom() {
  if (!S.curRoomId) return;
  navigator.clipboard.writeText(location.origin + location.pathname + "?room=" + S.curRoomId)
    .then(function() { toast("Lien copié !", "success"); });
}

function scrollToPinned() { var el = document.querySelector(".pinned"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }

// ── RENDU MESSAGES ────────────────────────────
function renderMsgs(msgs, listId, roomId) {
  var list = document.getElementById(listId); if (!list) return;
  var html = "", lastDate = "";
  msgs.forEach(function(msg) {
    var isOwn = msg.uid === S.user.uid;
    var ts = msg.createdAt && msg.createdAt.toMillis ? msg.createdAt.toMillis() : 0;
    var date = ts ? new Date(ts).toLocaleDateString() : "";
    var time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    if (date && date !== lastDate) { html += "<div class='dsep'><span>" + date + "</span></div>"; lastDate = date; }
    if (msg.type === "announcement") { html += "<div class='ann'>" + esc(msg.text || "") + "</div>"; return; }
    var name = msg.authorName || "User";
    var avH = "";
    if (!isOwn) {
      if (msg.anonEmoji) avH = "<div class='mav' style='background:" + (msg.anonColor || "#6c63ff") + "'>" + msg.anonEmoji + "</div>";
      else if (msg.authorPhoto) avH = "<div class='mav'><img src='" + msg.authorPhoto + "' alt=''/></div>";
      else avH = "<div class='mav'>" + name[0].toUpperCase() + "</div>";
    }
    var replyH = msg.replyTo ? "<div class='mreply'><strong>" + esc(msg.replyTo.name || "") + "</strong> — " + esc((msg.replyTo.text || "").substring(0, 50)) + "</div>" : "";
    var txt = msg.text || "";
    var content = "";
    if (msg.type === "image") content = "<img src='" + msg.url + "' class='mimg' onclick='openLB(\"" + msg.url + "\")' alt='img'/>";
    else if (msg.type === "voice") content = vHtml(msg);
    else if (msg.type === "sticker") content = "<img src='" + msg.url + "' class='vstk' alt=''/>";
    else content = "<span>" + fmtTxt(txt) + "</span>";
    var eph = msg.expiresAt ? "<span style='font-size:.63rem;color:var(--t3)'>⏱" + fmtExp(msg.expiresAt.toMillis()) + "</span>" : "";
    var flag = msg.flag ? "<span>" + msg.flag + "</span>" : "";
    var reacts = bldReacts(msg, roomId || "rand");
    var del = isOwn
      ? "<button class='ma' onclick='delMsg(\"" + roomId + "\",\"" + msg.id + "\")' style='color:var(--er)'>🗑</button>"
      : "<button class='ma' onclick='repMsg(\"" + msg.id + "\",\"" + esc(name) + "\")' style='color:var(--er)'>🚩</button>";
    var acts = "<div class='mas'>" +
      "<button class='ma' onclick='openEPick(event,\"" + msg.id + "\",\"" + (roomId || "rand") + "\")'>😊</button>" +
      "<button class='ma' onclick='doReply(\"" + msg.id + "\",\"" + esc(name) + "\",\"" + txt.replace(/"/g,"&quot;").substring(0,50) + "\")'>↩</button>" +
      "<button class='ma' onclick='copyTxt(\"" + txt.replace(/"/g,"&quot;") + "\")'>📋</button>" +
      del + "</div>";
    html += "<div class='mr" + (isOwn ? " own" : "") + (msg.pinned ? " pinned" : "") + "' id='m" + msg.id + "'>" +
      (!isOwn ? avH : "") +
      "<div class='mc'>" + (!isOwn ? "<div class='mau'>" + esc(name) + "</div>" : "") +
      "<div class='mb'>" + replyH + content + acts + "</div>" +
      "<div class='mf'><span class='mt'>" + time + "</span>" + flag + eph + "</div>" + reacts + "</div>" +
      (isOwn ? avH : "") + "</div>";
  });
  list.innerHTML = html;
  var sc = list.closest(".mscroll"); if (sc) sc.scrollTop = 99999;
}

function fmtTxt(t) {
  if (!t) return "";
  return esc(t).replace(/@(\w+)/g, "<span class='mention'>@$1</span>").replace(/\n/g, "<br/>");
}
function vHtml(m) {
  return "<div class='mvoi'><button class='vp' onclick='playV(\"" + m.url + "\",this)'><svg class='pi' viewBox='0 0 24 24' fill='currentColor'><polygon points='5,3 19,12 5,21'/></svg></button><div class='vbs'>" +
    Array.from({length:14}, function() { return "<div class='vb' style='height:" + (4 + Math.floor(Math.random()*12)) + "px'></div>"; }).join("") +
    "</div><span class='mt'>" + (m.duration || "0:00") + "</span></div>";
}
function bldReacts(msg, rid) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return "";
  var g = {};
  Object.entries(msg.reactions).forEach(function(e) { g[e[1]] = g[e[1]] || []; g[e[1]].push(e[0]); });
  return "<div class='rts'>" + Object.entries(g).map(function(e) {
    return "<span class='rc2" + (e[1].includes(S.user && S.user.uid) ? " me" : "") + "' onclick='togReact(\"" + rid + "\",\"" + msg.id + "\",\"" + e[0] + "\")'>" + e[0] + " " + e[1].length + "</span>";
  }).join("") + "</div>";
}
function fmtExp(ms) { var r = ms - Date.now(); if (r <= 0) return "Exp"; var h = Math.floor(r/3600000), m = Math.floor((r%3600000)/60000); return h > 0 ? h + "h" : m + "m"; }

// ── ENVOI MESSAGE ─────────────────────────────
var rateTs = [];
function rateOk() { var n = Date.now(), w = rateTs.filter(function(t) { return n-t < 5000; }); if (w.length >= 5) return false; rateTs.push(n); return true; }
function modOk(t) { for (var i = 0; i < MOD.length; i++) if (MOD[i].test(t)) return false; return true; }

function sendMsg() {
  if (S.editId) { saveEdit(); return; }
  if (!S.curRoomId) return;
  var box = document.getElementById("mbox"), raw = box.innerText.trim(); if (!raw) return;
  if (!rateOk()) return modWarn("Trop de messages !");
  if (!modOk(raw)) return modWarn("Contenu interdit.");
  box.innerText = ""; closeMDD();
  var exp = getExp();
  db.collection("rooms").doc(S.curRoomId).collection("messages").add({
    uid: S.user.uid,
    authorName: (S.profile && S.profile.displayName) || (S.user && S.user.displayName) || "User",
    authorPhoto: (S.user && S.user.photoURL) || null,
    anonEmoji: S.user.isAnonymous ? (S.profile && S.profile.anonEmoji || S.anonE) : null,
    anonColor: S.user.isAnonymous ? (S.profile && S.profile.anonColor || S.anonC) : null,
    text: raw, type: "text", flag: S.flag,
    replyTo: S.replyTo || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: exp ? firebase.firestore.Timestamp.fromDate(exp) : null,
    reactions: {}, readBy: [], pinned: false, edited: false,
  }).then(function() {
    return db.collection("rooms").doc(S.curRoomId).update({ lastMessage: raw.substring(0,60), lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() });
  }).then(function() { cancelReply(); })
    .catch(function() { toast("Erreur envoi.", "error"); });
}

function onKey(e) {
  if (document.getElementById("mdd").style.display === "block") {
    if (e.key === "ArrowDown") { S.mIdx = Math.min(S.mIdx+1, S.mRes.length-1); renderMDD(); e.preventDefault(); return; }
    if (e.key === "ArrowUp")   { S.mIdx = Math.max(S.mIdx-1, 0); renderMDD(); e.preventDefault(); return; }
    if (e.key === "Enter" || e.key === "Tab") { pickMDD(S.mIdx); e.preventDefault(); return; }
    if (e.key === "Escape") { closeMDD(); return; }
  }
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
}

function onInp() { var t = document.getElementById("mbox").innerText, w = t.split(/\s/).pop(); if (w.startsWith("@") && w.length > 1) fetchMDD(w.slice(1)); else closeMDD(); }

function fetchMDD(q) {
  db.collection("users").where("status","==","online").limit(8).get().then(function(snap) {
    S.mRes = snap.docs.map(function(d) { return d.data(); }).filter(function(u) { return (u.displayName || "").toLowerCase().includes(q.toLowerCase()); });
    S.mIdx = 0; renderMDD();
  });
}
function renderMDD() {
  var dd = document.getElementById("mdd"), list = document.getElementById("mdlist");
  if (!S.mRes.length) { dd.style.display = "none"; return; }
  dd.style.display = "block";
  list.innerHTML = S.mRes.map(function(u, i) {
    return "<div class='mdi" + (i === S.mIdx ? " sel" : "") + "' onclick='pickMDD(" + i + ")'><div class='mdav'>" + (u.displayName || "U")[0] + "</div><span>" + esc(u.displayName || "") + "</span></div>";
  }).join("");
}
function pickMDD(i) {
  var u = S.mRes[i]; if (!u) return;
  var box = document.getElementById("mbox"), t = box.innerText, at = t.lastIndexOf("@");
  box.innerText = t.substring(0, at) + "@" + u.displayName + " ";
  closeMDD();
  var r = document.createRange(), sel = window.getSelection(); r.selectNodeContents(box); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
}
function closeMDD() { document.getElementById("mdd").style.display = "none"; S.mRes = []; }
function doReply(id, name, text) { S.replyTo = { msgId: id, name: name, text: text }; document.getElementById("rstrip").style.display = "flex"; document.getElementById("rswho").textContent = name; document.getElementById("rstxt").textContent = text; document.getElementById("mbox").focus(); }
function cancelReply() { S.replyTo = null; document.getElementById("rstrip").style.display = "none"; }
function saveEdit() { var t = document.getElementById("mbox").innerText.trim(); if (!t || !S.editId || !S.curRoomId) return; db.collection("rooms").doc(S.curRoomId).collection("messages").doc(S.editId).update({ text: t, edited: true }).then(function() { document.getElementById("mbox").innerText = ""; S.editId = null; }); }
function delMsg(rid, mid) { if (!confirm("Supprimer ?")) return; db.collection("rooms").doc(rid).collection("messages").doc(mid).delete(); }
function copyTxt(t) { navigator.clipboard.writeText(t).then(function() { toast("Copié !", "success"); }); }

// ── RÉACTIONS ─────────────────────────────────
function openEPick(e, msgId, rid) {
  e.stopPropagation();
  var pk = document.getElementById("epick"), row = document.getElementById("epkrow");
  row.innerHTML = EMOJIS.map(function(em) { return "<button class='epb' onclick='addReact(\"" + rid + "\",\"" + msgId + "\",\"" + em + "\")'>" + em + "</button>"; }).join("");
  var rect = e.currentTarget.getBoundingClientRect();
  pk.style.top = (rect.top - 44 + window.scrollY) + "px"; pk.style.left = rect.left + "px"; pk.style.display = "block";
  setTimeout(function() { document.addEventListener("click", function() { pk.style.display = "none"; }, { once: true }); }, 0);
}
function getCol(rid) { return rid === "rand" ? db.collection("random_sessions").doc(S.randId).collection("messages") : db.collection("rooms").doc(rid).collection("messages"); }
function addReact(rid, mid, em) { document.getElementById("epick").style.display = "none"; getCol(rid).doc(mid).update({ ["reactions." + S.user.uid]: em }); }
function togReact(rid, mid, em) {
  getCol(rid).doc(mid).get().then(function(snap) {
    var cur = snap.data() && snap.data().reactions && snap.data().reactions[S.user.uid];
    if (cur === em) getCol(rid).doc(mid).update({ ["reactions." + S.user.uid]: firebase.firestore.FieldValue.delete() });
    else getCol(rid).doc(mid).update({ ["reactions." + S.user.uid]: em });
  });
}

// ── SIGNALEMENT ───────────────────────────────
var repTgt = null;
function repMsg(id, name) { repTgt = { id: id, name: name, ctx: "room", rid: S.curRoomId }; document.querySelectorAll(".rbtn2").forEach(function(b) { b.classList.remove("on"); }); document.getElementById("repDetail").value = ""; openOv("ovReport"); }
function pickReason(btn) { document.querySelectorAll(".rbtn2").forEach(function(b) { b.classList.remove("on"); }); btn.classList.add("on"); }
function submitRep() {
  var r = document.querySelector(".rbtn2.on"); if (!r) return toast("Choisis une raison.", "error");
  db.collection("reports").add({ reportedBy: S.user.uid, reason: r.textContent, detail: document.getElementById("repDetail").value, target: repTgt, status: "pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { closeOv("ovReport"); toast("Signalement envoyé !", "success"); });
}

// ── MÉDIAS ────────────────────────────────────
function handleImg(e) { var file = e.target.files[0]; if (!file) return; e.target.value = ""; toast("Upload...", "info"); uploadCloud(file, "image").then(function(url) { sendMedia("image", url); }).catch(function() { toast("Erreur image.", "error"); }); }
function handleRandImg(e) { var file = e.target.files[0]; if (!file) return; e.target.value = ""; uploadCloud(file, "image").then(function(url) { sendRandMedia("image", url); }); }
function uploadCloud(file, type) {
  var fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUD.p);
  return fetch("https://api.cloudinary.com/v1_1/" + CLOUD.n + "/" + type + "/upload", { method: "POST", body: fd })
    .then(function(r) { if (!r.ok) throw new Error("fail"); return r.json(); })
    .then(function(d) { return d.secure_url; });
}
function sendMedia(type, url, extra) {
  if (!S.curRoomId) return;
  var exp = getExp();
  db.collection("rooms").doc(S.curRoomId).collection("messages").add(Object.assign({
    uid: S.user.uid, authorName: (S.profile && S.profile.displayName) || "User", authorPhoto: (S.user && S.user.photoURL) || null,
    anonEmoji: S.user.isAnonymous ? S.anonE : null, anonColor: S.user.isAnonymous ? S.anonC : null,
    type: type, url: url, text: type === "image" ? "📷" : "🎤", flag: S.flag,
    replyTo: S.replyTo || null, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: exp ? firebase.firestore.Timestamp.fromDate(exp) : null,
    reactions: {}, readBy: [], pinned: false,
  }, extra || {})).then(function() {
    return db.collection("rooms").doc(S.curRoomId).update({ lastMessage: type === "image" ? "📷 Image" : "🎤 Vocal", lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() });
  }).then(function() { cancelReply(); });
}

// ── VOCAL ─────────────────────────────────────
function toggleVoice() {
  if (S.rec) { sendVoice(); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    S.mr = new MediaRecorder(stream); S.rc = []; S.rec = true; S.rs = 0;
    S.mr.ondataavailable = function(e) { S.rc.push(e.data); };
    S.mr.start(); document.getElementById("recBar").style.display = "flex";
    S.rt = setInterval(function() { S.rs++; var m = Math.floor(S.rs/60), s = S.rs%60; document.getElementById("recTime").textContent = m + ":" + (s < 10 ? "0" : "") + s; }, 1000);
  }).catch(function() { toast("Micro refusé.", "error"); });
}
function sendVoice() {
  if (!S.mr) return; clearInterval(S.rt); S.rec = false; document.getElementById("recBar").style.display = "none";
  S.mr.onstop = function() {
    var blob = new Blob(S.rc, { type: "audio/webm" });
    var dur = Math.floor(S.rs/60) + ":" + (S.rs%60 < 10 ? "0" : "") + S.rs%60;
    uploadCloud(new File([blob], "v.webm", { type: "audio/webm" }), "video")
      .then(function(url) { sendMedia("voice", url, { duration: dur }); })
      .catch(function() { toast("Erreur vocal.", "error"); });
    S.mr.stream.getTracks().forEach(function(t) { t.stop(); });
  };
  S.mr.stop();
}
function cancelRec() { clearInterval(S.rt); if (S.mr) S.mr.stream.getTracks().forEach(function(t) { t.stop(); }); S.mr = null; S.rec = false; document.getElementById("recBar").style.display = "none"; }
var audios = {};
function playV(url, btn) {
  if (audios[url]) { audios[url].pause(); delete audios[url]; btn.querySelector(".pi").innerHTML = "<polygon points='5,3 19,12 5,21'/>"; return; }
  var a = new Audio(url); audios[url] = a;
  btn.querySelector(".pi").innerHTML = "<rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/>";
  a.play(); a.onended = function() { delete audios[url]; btn.querySelector(".pi").innerHTML = "<polygon points='5,3 19,12 5,21'/>"; };
}

// ── STICKERS ──────────────────────────────────
function toggleStk() { var p = document.getElementById("stkPanel"); p.style.display = p.style.display === "block" ? "none" : "block"; }
function loadStk() { var g = document.getElementById("stkGrid"); if (!g) return; g.innerHTML = S.stk.map(function(s, i) { return "<img src='" + s + "' class='stk-i' onclick='sendStk(" + i + ")' alt='stk'/>"; }).join(""); }
function importStk(e) {
  var files = Array.from(e.target.files), done = 0;
  files.forEach(function(f) { var r = new FileReader(); r.onload = function(ev) { S.stk.push(ev.target.result); done++; if (done === files.length) { localStorage.setItem("sis_stk", JSON.stringify(S.stk)); loadStk(); e.target.value = ""; toast("Stickers importés !", "success"); } }; r.readAsDataURL(f); });
}
function sendStk(i) { document.getElementById("stkPanel").style.display = "none"; sendMedia("sticker", S.stk[i]); }
function openLB(url) { document.getElementById("lbImg").src = url; document.getElementById("lightbox").classList.add("on"); }

// ── ÉPHÉMÈRES ─────────────────────────────────
function openEphem() { openOv("ovEphem"); document.querySelectorAll(".eopt").forEach(function(b) { b.classList.toggle("on", +b.dataset.v === S.ephH); }); }
function pickEph(btn) { document.querySelectorAll(".eopt").forEach(function(b) { b.classList.remove("on"); }); btn.classList.add("on"); S.ephP = +btn.dataset.v; }
function confEph() { S.ephH = S.ephP; localStorage.setItem("sis_eph", S.ephH); updEphBadge(); closeOv("ovEphem"); }
function updEphBadge() { var l = {0:"Off",1:"1h",6:"6h",24:"24h",168:"7j"}; var el = document.getElementById("ephBadge"); if (el) el.textContent = l[S.ephH] || "Off"; }
function getExp() { return S.ephH ? new Date(Date.now() + S.ephH * 3600000) : null; }
function modWarn(msg) { var el = document.createElement("div"); el.className = "mod-warn"; el.textContent = msg; document.body.appendChild(el); setTimeout(function() { el.remove(); }, 4000); }

// ── CHAT ALÉATOIRE ────────────────────────────
function startRand() {
  document.getElementById("randIdle").style.display = "none";
  document.getElementById("randSearch").style.display = "flex";
  db.collection("random_sessions").where("status","==","waiting").where("uid","!=",S.user.uid).limit(1).get()
    .then(function(snap) {
      var ref;
      if (!snap.empty) {
        ref = snap.docs[0].ref; S.randId = snap.docs[0].id;
        return ref.update({ peer: S.user.uid, peerName: (S.profile && S.profile.displayName) || "Anonyme", peerEmoji: S.user.isAnonymous ? S.anonE : null, peerColor: S.user.isAnonymous ? S.anonC : null, status: "active" }).then(function() { return ref; });
      } else {
        return db.collection("random_sessions").add({ uid: S.user.uid, userName: (S.profile && S.profile.displayName) || "Anonyme", userEmoji: S.user.isAnonymous ? S.anonE : null, userColor: S.user.isAnonymous ? S.anonC : null, status: "waiting", createdAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(function(r) { S.randId = r.id; return r; });
      }
    }).then(function(ref) {
      if (S.randUnsub) S.randUnsub();
      S.randUnsub = ref.onSnapshot(function(snap) {
        var d = snap.data(); if (!d) return endRand(false);
        if (d.status === "active") showRandChat(d);
        if (d.status === "ended") endRand(false);
      });
    });
}
function showRandChat(data) {
  var isHost = data.uid === S.user.uid;
  var name = isHost ? data.peerName : data.userName, emoji = isHost ? data.peerEmoji : data.userEmoji, color = isHost ? data.peerColor : data.userColor;
  document.getElementById("randSearch").style.display = "none";
  document.getElementById("randChat").style.display = "flex";
  document.getElementById("randName").textContent = name || "Inconnu";
  var av = document.getElementById("randAv");
  if (emoji) { av.textContent = emoji; av.style.background = color || "#6c63ff"; } else av.textContent = (name || "?")[0].toUpperCase();
  if (S.randUnsub) { S.randUnsub(); S.randUnsub = null; }
  var unsub = db.collection("random_sessions").doc(S.randId).collection("messages").orderBy("createdAt","asc")
    .onSnapshot(function(snap) { renderMsgs(snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }), "randMsgs", null); });
  S.ls.push(unsub);
}
function sendRandMsg() {
  var box = document.getElementById("randBox"), t = box.innerText.trim(); if (!t || !S.randId) return;
  if (!rateOk()) return modWarn("Trop de messages !");
  if (!modOk(t)) { modWarn("Contenu interdit."); box.innerText = ""; return; }
  box.innerText = "";
  db.collection("random_sessions").doc(S.randId).collection("messages").add({ uid: S.user.uid, authorName: (S.profile && S.profile.displayName) || "Moi", text: t, type: "text", flag: S.flag, createdAt: firebase.firestore.FieldValue.serverTimestamp(), reactions: {} });
}
function onRandKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRandMsg(); } }
function skipRand() { endRand(true).then(function() { startRand(); }); }
function endRand(upd) {
  if (S.randUnsub) { S.randUnsub(); S.randUnsub = null; }
  var p = (upd && S.randId) ? db.collection("random_sessions").doc(S.randId).update({ status: "ended" }).catch(function(){}) : Promise.resolve();
  S.randId = null;
  document.getElementById("randMsgs").innerHTML = "";
  document.getElementById("randChat").style.display = "none";
  document.getElementById("randSearch").style.display = "none";
  document.getElementById("randIdle").style.display = "flex";
  return p;
}
function cancelRand() { endRand(true); }
function sendRandMedia(type, url) {
  if (!S.randId) return;
  db.collection("random_sessions").doc(S.randId).collection("messages").add({ uid: S.user.uid, authorName: (S.profile && S.profile.displayName) || "Moi", type: type, url: url, text: type === "image" ? "📷" : "🎤", flag: S.flag, createdAt: firebase.firestore.FieldValue.serverTimestamp(), reactions: {} });
}

// ── RECHERCHE ─────────────────────────────────
var sTimer = null;
function toggleSearch() { var el = document.getElementById("gSearch"); el.style.display = el.style.display === "block" ? "none" : "block"; if (el.style.display === "block") el.querySelector("input").focus(); }
function doSearch(q) {
  clearTimeout(sTimer); if (!q.trim()) { document.getElementById("gResults").innerHTML = ""; return; }
  sTimer = setTimeout(function() {
    var html = "";
    var p = S.rooms.slice(0,6).map(function(room) {
      return db.collection("rooms").doc(room.id).collection("messages").orderBy("createdAt","desc").limit(15).get()
        .then(function(snap) { snap.docs.forEach(function(d) { var t = (d.data().text || ""); if (t.toLowerCase().includes(q.toLowerCase())) html += "<div style='padding:7px;cursor:pointer;border-bottom:1px solid var(--bd);font-size:.8rem' onclick='openRoom(\"" + room.id + "\");toggleSearch()'><div style='font-size:.69rem;color:var(--t2)'>#" + esc(room.name) + "</div>" + esc(t.substring(0,75)) + "</div>"; }); });
    });
    Promise.all(p).then(function() { document.getElementById("gResults").innerHTML = html || "<div class='empty'><span>Aucun résultat</span></div>"; });
  }, 400);
}

// ── ADMIN ─────────────────────────────────────
function admTab(tab) {
  var c = document.getElementById("adminContent");
  if (tab === "msgs") {
    c.innerHTML = "<div class='empty'><span>Chargement...</span></div>";
    var html = "";
    var p = S.rooms.slice(0,10).map(function(room) {
      return db.collection("rooms").doc(room.id).collection("messages").orderBy("createdAt","desc").limit(5).get()
        .then(function(snap) { snap.docs.forEach(function(d) { var m = d.data(); html += "<div class='arow'><span style='flex:1'>" + esc(m.authorName||"?") + "</span><span style='flex:2;overflow:hidden;white-space:nowrap;text-overflow:ellipsis'>" + esc((m.text||"").substring(0,50)) + "</span><span style='color:var(--t2);font-size:.71rem'>" + esc(room.name) + "</span><button onclick='db.collection(\"rooms\").doc(\"" + room.id + "\").collection(\"messages\").doc(\"" + d.id + "\").delete()' style='background:none;border:none;color:var(--er);cursor:pointer'>🗑</button></div>"; }); });
    });
    Promise.all(p).then(function() { c.innerHTML = html || "<div class='empty'><span>Aucun message</span></div>"; });
  } else if (tab === "users") {
    db.collection("users").limit(50).get().then(function(snap) {
      c.innerHTML = snap.docs.map(function(d) { var u = d.data(); return "<div class='arow'><span style='flex:1'>" + esc(u.displayName||"?") + "</span><span style='flex:1;color:var(--t2);font-size:.76rem'>" + esc(u.email||"Anonyme") + "</span><span style='font-size:.7rem;padding:2px 6px;background:var(--s2);border-radius:9px'>" + (u.role||"user") + "</span><button onclick='banUser(\"" + d.id + "\")' style='background:none;border:none;color:var(--er);cursor:pointer'>🔨</button></div>"; }).join("");
    });
  } else if (tab === "reports") {
    db.collection("reports").where("status","==","pending").limit(30).get().then(function(snap) {
      if (snap.empty) { c.innerHTML = "<div class='empty'><span>Aucun signalement</span></div>"; return; }
      c.innerHTML = snap.docs.map(function(d) { var r = d.data(); return "<div class='arow'><span style='flex:1'>" + esc(r.reason||"?") + "</span><span style='flex:1;color:var(--t2)'>" + esc(r.detail||"") + "</span><button onclick='db.collection(\"reports\").doc(\"" + d.id + "\").update({status:\"resolved\"})' style='background:none;border:none;color:var(--ok);cursor:pointer'>✅</button></div>"; }).join("");
    });
  } else if (tab === "rooms") {
    c.innerHTML = S.rooms.map(function(r) { return "<div class='arow'><span>" + (CAT[r.category]||"💬") + "</span><span style='flex:1'>" + esc(r.name) + "</span><span style='color:var(--t2);font-size:.73rem'>" + (r.memberCount||0) + " 👤</span><button onclick='if(confirm(\"Supprimer ?\"))db.collection(\"rooms\").doc(\"" + r.id + "\").delete()' style='background:none;border:none;color:var(--er);cursor:pointer'>🗑</button></div>"; }).join("");
  }
}
function banUser(uid) {
  if (!confirm("Bannir cet utilisateur ?")) return;
  db.collection("users").doc(uid).update({ banned: true, status: "offline" })
    .then(function() { return db.collection("bans").doc(uid).set({ uid: uid, bannedAt: firebase.firestore.FieldValue.serverTimestamp(), bannedBy: S.user.uid }); })
    .then(function() { toast("Utilisateur banni.", "success"); admTab("users"); });
}
function admAnnounce() {
  var text = prompt("Texte de l'annonce :"); if (!text || !text.trim()) return;
  var batch = db.batch();
  S.rooms.forEach(function(room) { var ref = db.collection("rooms").doc(room.id).collection("messages").doc(); batch.set(ref, { uid: S.user.uid, authorName: "🛡️ Admin", text: text.trim(), type: "announcement", createdAt: firebase.firestore.FieldValue.serverTimestamp() }); });
  batch.commit().then(function() { toast("Annonce envoyée !", "success"); });
}
function loadAdminStats() {
  db.collection("users").get().then(function(s) { document.getElementById("sUsers").textContent = s.size; });
  db.collection("rooms").get().then(function(s) { document.getElementById("sRooms").textContent = s.size; });
  db.collection("bans").get().then(function(s) { document.getElementById("sBans").textContent = s.size; });
  db.collection("reports").where("status","==","pending").get().then(function(s) { document.getElementById("sReports").textContent = s.size; });
}

// ── NOTIFICATIONS ─────────────────────────────
function loadNBadge() { var u = S.notifs.filter(function(n) { return n.unread; }).length, b = document.getElementById("nbadge"); if (b) { if (u > 0) { b.textContent = u > 9 ? "9+" : u; b.style.display = "block"; } else b.style.display = "none"; } }
function openNotifs() {
  var list = document.getElementById("notifList");
  list.innerHTML = S.notifs.length ? S.notifs.map(function(n, i) {
    return "<div style='display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer' onclick='S.notifs[" + i + "].unread=false;localStorage.setItem(\"sis_notifs\",JSON.stringify(S.notifs));loadNBadge()'><div style='flex:1'><div style='font-size:.81rem;font-weight:500'>" + esc(n.title||"Notification") + "</div><div style='font-size:.73rem;color:var(--t2)'>" + esc(n.body||"") + "</div></div><span style='font-size:.68rem;color:var(--t3)'>" + new Date(n.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) + "</span></div>";
  }).join("") : "<div class='empty'><span>Aucune notification</span></div>";
  openPanel("notifPanel");
  S.notifs.forEach(function(n) { n.unread = false; }); localStorage.setItem("sis_notifs", JSON.stringify(S.notifs)); loadNBadge();
}
function clearNotifs() { S.notifs = []; localStorage.setItem("sis_notifs", "[]"); loadNBadge(); document.getElementById("notifList").innerHTML = "<div class='empty'><span>Aucune notification</span></div>"; }

// ── THÈME ─────────────────────────────────────
function openTheme() { openPanel("themePanel"); }
function setMode(m) { S.theme = m; localStorage.setItem("sis_th", m); document.documentElement.setAttribute("data-theme", m); document.getElementById("mDark").classList.toggle("on", m === "dark"); document.getElementById("mLight").classList.toggle("on", m === "light"); }
function setBg(key) { var zone = document.querySelector(".cz"); if (zone) zone.style.background = BGS[key] || "var(--bg)"; document.querySelectorAll(".bgth").forEach(function(b) { b.classList.toggle("on", b.dataset.bg === key); }); localStorage.setItem("sis_chatbg", key); }

// ── UI HELPERS ────────────────────────────────
function showPage(id) { document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); }); var el = document.getElementById(id); if (el) el.classList.add("active"); }
function gotoView(name) {
  document.querySelectorAll(".view").forEach(function(v) { v.classList.remove("on"); });
  document.querySelectorAll(".np").forEach(function(b) { b.classList.remove("on"); });
  var v = document.getElementById("vw" + name); if (v) v.classList.add("on");
  var b = document.querySelector(".np[data-v='" + name + "']"); if (b) b.classList.add("on");
  if (name === "Admin") loadAdminStats();
}
function openPanel(id) { closePanels(); var p = document.getElementById(id); if (p) p.classList.add("on"); document.getElementById("bd").style.display = "block"; }
function closePanels() { document.querySelectorAll(".panel").forEach(function(p) { p.classList.remove("on"); }); document.getElementById("bd").style.display = "none"; }
function openOv(id) { document.getElementById(id).style.display = "flex"; }
function closeOv(id) { document.getElementById(id).style.display = "none"; }
function toast(msg, type) { var w = document.getElementById("toasts"), el = document.createElement("div"); el.className = "toast " + (type || "info"); el.textContent = msg; w.appendChild(el); setTimeout(function() { el.style.opacity = "0"; el.style.transition = ".3s"; setTimeout(function() { el.remove(); }, 300); }, 2800); }

// UTILS
function esc(s) { if (!s) return ""; var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function gv(id) { return (document.getElementById(id) && document.getElementById(id).value) || ""; }
function rnd(n) { return Math.floor(Math.random() * n); }

// DEEP LINK
var rp = new URLSearchParams(location.search).get("room");
if (rp) auth.onAuthStateChanged(function(u) { if (u) setTimeout(function() { openRoom(rp); }, 1000); });

// ESC KEY
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closePanels();
    ["ovCreateRoom","ovEphem","ovReport"].forEach(function(id) { closeOv(id); });
    document.getElementById("stkPanel").style.display = "none";
    document.getElementById("gSearch").style.display = "none";
    document.getElementById("epick").style.display = "none";
  }
});
