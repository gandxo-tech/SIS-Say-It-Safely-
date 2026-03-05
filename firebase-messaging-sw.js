/* ═══════════════════════════════════════════════════════════
   SIS — firebase-messaging-sw.js
   Service Worker pour les notifications Firebase Cloud Messaging
   Ce fichier DOIT être à la racine du site (même niveau que le HTML)
═══════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ── Config Firebase (identique à chatanonyme.js) ──────────
firebase.initializeApp({
  apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
  authDomain:        "chat-anonyme.firebaseapp.com",
  projectId:         "chat-anonyme",
  storageBucket:     "chat-anonyme.firebasestorage.app",
  messagingSenderId: "93366459642",
  appId:             "1:93366459642:web:a2421c9478909b33667d43",
});

const messaging = firebase.messaging();

// ── Notification en arrière-plan ───────────────────────────
messaging.onBackgroundMessage(function(payload) {
  var notif = payload.notification || {};
  var data  = payload.data || {};

  var title = notif.title || data.title || '💬 SIS';
  var body  = notif.body  || data.body  || 'Nouveau message';
  var icon  = notif.icon  || '/icon-192.png';
  var roomId = data.roomId || null;

  var options = {
    body:  body,
    icon:  icon,
    badge: icon,
    data:  { roomId: roomId },
    vibrate: [200, 100, 200],
    tag: 'sis-notif',
    renotify: true,
  };

  return self.registration.showNotification(title, options);
});

// ── Clic sur la notification → ouvrir le salon ─────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var roomId = event.notification.data && event.notification.data.roomId;
  var url    = roomId
    ? 'https://sis-say-it-safely-pi.vercel.app/chatanonyme.html?room=' + roomId
    : 'https://sis-say-it-safely-pi.vercel.app/chatanonyme.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Si l'app est déjà ouverte → focus + message
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes('chatanonyme') && 'focus' in client) {
            client.focus();
            if (roomId) client.postMessage({ type: 'OPEN_ROOM', roomId: roomId });
            return;
          }
        }
        // Sinon → ouvrir un nouvel onglet
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ── Activation immédiate du SW ─────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
