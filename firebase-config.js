/**
 * Configuration Firebase du projet SIS — **source unique**.
 *
 * Ces identifiants sont publics par nature (ils partent dans le navigateur) :
 * ce ne sont pas des secrets. Ce qui protège le projet, ce sont les règles
 * Firestore (firestore.rules), pas la confidentialité de ces valeurs.
 *
 * Pourquoi une seule copie : la configuration était recopiée à l'identique
 * dans index.html, voir.html, envoyer.html et classement.html. Une rotation de
 * clé ou un changement de projet demandait quatre modifications synchronisées.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBqk3L_qkolD41H3yvHEzz4O-Sr15I-Tko",
  authDomain: "gandxoanonymous.firebaseapp.com",
  projectId: "gandxoanonymous",
  storageBucket: "gandxoanonymous.appspot.com",
  messagingSenderId: "836606625364",
  appId: "1:836606625364:web:7150571998131c41c0cfc1",
  measurementId: "G-97TCHJ33KW"
};

/** Preset Cloudinary non signé utilisé pour les photos de profil. */
export const CLOUDINARY_CLOUD_NAME = "duddyzckz";
export const CLOUDINARY_UPLOAD_PRESET = "ml_defaulte";
