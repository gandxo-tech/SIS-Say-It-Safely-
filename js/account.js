// Comptes : inscription (Google ou email/mot de passe), réservation du pseudo, lecture de sa boîte.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendEmailVerification, signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs,
  writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { normalizePseudo, isValidPseudo } from "./sanitize.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());

// Crée le compte et envoie l'email de vérification.
export async function signUpWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  return cred.user;
}

export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logOut = () => signOut(auth);

// Retourne le pseudo du compte connecté, ou null s'il n'en a pas encore.
export async function getMyPseudo() {
  if (!auth.currentUser) return null;
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  return snap.exists() ? snap.data().pseudo : null;
}

// Réserve le pseudo : users/{uid} et pseudos/{pseudo} sont écrits dans le même lot.
// Un seul pseudo par compte, un pseudo pris ne peut pas être repris (voir firestore.rules).
export async function claimPseudo(rawPseudo) {
  const user = auth.currentUser;
  if (!user) throw new Error("Connecte-toi d'abord.");

  // Rafraîchit le jeton : sinon une vérification d'email toute récente n'est pas vue.
  await user.reload();
  await user.getIdToken(true);
  if (!user.emailVerified) throw new Error("Vérifie ton email avant de choisir un pseudo.");

  const pseudo = normalizePseudo(rawPseudo);
  if (!isValidPseudo(pseudo)) throw new Error("Pseudo invalide (3 à 20 : lettres minuscules, chiffres, _).");

  const batch = writeBatch(db);
  batch.set(doc(db, "pseudos", pseudo), { ownerUid: user.uid, createdAt: serverTimestamp() });
  batch.set(doc(db, "users", user.uid), { pseudo, createdAt: serverTimestamp() });
  try {
    await batch.commit();
  } catch (e) {
    if (e.code === "permission-denied") throw new Error("Pseudo indisponible ou compte déjà associé à un pseudo.");
    throw e;
  }
  return pseudo;
}

// Lien à partager sur les réseaux (le même que celui de la page d'envoi).
export const shareLink = (pseudo) =>
  `${location.origin}/?to=${encodeURIComponent(pseudo)}`;

// Boîte de réception du propriétaire. Pour l'afficher, utilise textContent, jamais innerHTML.
export async function loadMyMessages() {
  const pseudo = await getMyPseudo();
  if (!pseudo) return [];
  const q = query(collection(db, "messages"),
    where("recipient", "==", pseudo), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, body: d.data().body, createdAt: d.data().createdAt }));
}
