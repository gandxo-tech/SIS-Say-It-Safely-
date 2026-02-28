importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
  authDomain:        "chat-anonyme.firebaseapp.com",
  projectId:         "chat-anonyme",
  messagingSenderId: "93366459642",
  appId:             "1:93366459642:web:a2421c9478909b33667d43"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'SIS', {
    body:  body  || 'Nouveau message',
    icon:  icon  || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
  });
});
