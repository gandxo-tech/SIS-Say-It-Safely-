/* ═══════════════════════════════════════════════
   SIS V3 — chatanonyme.js
   Say It Safely · Full Logic
   Firebase + Cloudinary + ipapi.co + Perspective API
   E2E Encryption · Auto-Moderation · Push Notifications
═══════════════════════════════════════════════ */

// ════════════════════════════════════════════
//  🔧 CONFIG — REMPLACE CES VALEURS
// ════════════════════════════════════════════
const CFG = {
  firebase: {
    apiKey:            "AIzaSyDUf-Rf6fhQXBmtJJ4R9K1IXBFdTl34Z5s",
    authDomain:        "chat-anonyme.firebaseapp.com",
    databaseURL:       "https://chat-anonyme-default-rtdb.firebaseio.com",
    projectId:         "chat-anonyme",
    storageBucket:     "chat-anonyme.firebasestorage.app",
    messagingSenderId: "93366459642",
    appId:             "1:93366459642:web:a2421c9478909b33667d43",
    measurementId:     "G-MF8RGP29LN",
    vapidKey:          "BEt2EsfC1Ln_TyIjICtS34n9A9WaxJDkKNksxUvlTi1rcItVU5SX_SCGhFE4qAkoeLyKQTersTYAqGCcd3dSU5k",
  },
  cloudinary: {
    cloud:  "duddyzckz",
    preset: "ml_defaulte",
  },
  perspective: {
    key: "VOTRE_PERSPECTIVE_API_KEY", // optionnel — https://perspectiveapi.com
  },
};
