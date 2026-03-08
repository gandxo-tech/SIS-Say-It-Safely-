/* ============================================================
   firebase-messaging-sw.js  —  Service Worker FCM
   À placer à la racine du projet (même niveau que index.html)
   ============================================================ */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s',
  authDomain:        'chat-anonyme.firebaseapp.com',
  projectId:         'chat-anonyme',
  storageBucket:     'chat-anonyme.firebasestorage.app',
  messagingSenderId: '93366459642',
  appId:             '1:93366459642:web:a2421c9478909b33667d43'
});

var messaging = firebase.messaging();

/* ── Notifications en arrière-plan ── */
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || 'SIS Chat';
  var body  = (payload.notification && payload.notification.body)  || 'Nouveau message';
  var icon  = (payload.notification && payload.notification.icon)  || '/icon-192.png';

  self.registration.showNotification(title, {
    body:  body,
    icon:  icon,
    badge: '/icon-72.png',
    data:  payload.data || {}
  });
});

/* ── Clic sur la notification → ouvre l'onglet ── */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
