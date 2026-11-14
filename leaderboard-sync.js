import {
  collection, query, where, getCountFromServer, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { isValidPseudo, normalizePseudo, safePhotoUrl } from "./leaderboard-utils.js";

/**
 * Répare automatiquement le compteur public leaderboard/{pseudo}.
 *
 * Le compteur est normalement tenu par increment(1) à chaque envoi. Il peut
 * néanmoins dériver : messages reçus avant l'existence du classement, envoi
 * dont l'incrément a échoué, ou écriture concurrente perdue.
 *
 * Le recomptage utilise l'agrégation count() : Firestore ne renvoie que le
 * total et ne lit pas les documents (facturé ~1 lecture pour 1000 messages,
 * contre une lecture par message pour un comptage classique).
 *
 * Rien n'est écrit si le compteur et la photo sont déjà à jour.
 *
 * @returns {Promise<{username: string, count: number, photoURL: string, wrote: boolean}|null>}
 */
export async function reconcileLeaderboard(
  db,
  pseudo,
  { photoURL = "", currentCount = null, currentPhotoURL = "" } = {}
) {
  const username = normalizePseudo(pseudo);
  if (!isValidPseudo(username)) return null;

  const snapshot = await getCountFromServer(
    query(collection(db, "messages"), where("to", "==", username))
  );
  const count = snapshot.data().count;

  const photo = safePhotoUrl(photoURL);
  const storedPhoto = safePhotoUrl(currentPhotoURL);

  const countDrifted = currentCount === null
    || !Number.isFinite(Number(currentCount))
    || Math.floor(Number(currentCount)) !== count;
  const photoDrifted = Boolean(photo) && photo !== storedPhoto;
  const wrote = countDrifted || photoDrifted;

  if (wrote) {
    await setDoc(doc(db, "leaderboard", username), {
      username,
      messageCount: count,
      updatedAt: new Date().toISOString(),
      ...(photo ? { photoURL: photo } : {})
    }, { merge: true });
  }

  return { username, count, photoURL: photo || storedPhoto, wrote };
}
