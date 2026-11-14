import {
  collection, query, where, getCountFromServer, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { isValidPseudo, normalizePseudo, safePhotoUrl, leaderboardRepair } from "./leaderboard-utils.js";

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
 * La décision d'écrire (et ce qu'il faut écrire) est déléguée à
 * `leaderboardRepair`, testée dans leaderboard-utils.test.mjs.
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

  const repair = leaderboardRepair({ count, currentCount, photoURL, currentPhotoURL });

  if (repair) {
    await setDoc(doc(db, "leaderboard", username), {
      username,
      ...repair,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  return {
    username,
    count,
    photoURL: safePhotoUrl(photoURL) || safePhotoUrl(currentPhotoURL),
    wrote: Boolean(repair)
  };
}
