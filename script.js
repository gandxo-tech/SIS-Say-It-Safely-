
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
  initializeAuthList