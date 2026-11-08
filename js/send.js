// Envoi d'un message anonyme. Import depuis la page d'envoi (type="module").
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { normalizePseudo, isValidPseudo, cleanBody } from "./sanitize.js";

const db = getFirestore(initializeApp(firebaseConfig));

export async function sendAnonymousMessage(rawPseudo, rawBody) {
  const recipient = normalizePseudo(rawPseudo);
  if (!isValidPseudo(recipient)) throw new Error("Pseudo invalide.");

  const body = cleanBody(rawBody);
  if (body === null) throw new Error("Message vide ou trop long (5000 caractères max).");

  // Confort : vérification avant envoi. La règle serveur fait foi.
  const exists = await getDoc(doc(db, "pseudos", recipient));
  if (!exists.exists()) throw new Error("Ce pseudo n'existe pas.");

  // Aucun identifiant d'expéditeur n'est envoyé.
  await addDoc(collection(db, "messages"), {
    recipient,
    body,
    createdAt: serverTimestamp()
  });
}
