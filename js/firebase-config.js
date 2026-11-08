// Configuration unique du système d'envoi anonyme : projet "gandxoanonymous".
// La clé apiKey Firebase n'est PAS un secret : elle identifie le projet.
// La sécurité repose sur firestore.rules, pas sur le fait de cacher cette clé.
// Dans Google Cloud Console, restreins la clé aux domaines de ton site (HTTP referrers).
export const firebaseConfig = {
  apiKey: "AIzaSyBqk3L_qkolD41H3yvHEzz4O-Sr15I-Tko",
  authDomain: "gandxoanonymous.firebaseapp.com",
  projectId: "gandxoanonymous",
  storageBucket: "gandxoanonymous.appspot.com",
  messagingSenderId: "836606625364",
  appId: "1:836606625364:web:7150571998131c41c0cfc1"
};
