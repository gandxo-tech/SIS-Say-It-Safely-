// Tests des règles Firestore. Lancer : npm run test:rules   (Java requis pour l'émulateur)
import { readFileSync } from "node:fs";
import { before, after, beforeEach, describe, it } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection,
  query, where, orderBy, limit, writeBatch, serverTimestamp, Timestamp, increment
} from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sis",
    firestore: {
      rules: readFileSync(new URL("./firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8080
    }
  });
});
after(async () => { await env.cleanup(); });

const PHOTO = "https://res.cloudinary.com/duddyzckz/image/upload/c_fill,w_256,h_256/v1/avatar.jpg";
const iso = () => new Date().toISOString();

// État de départ : "alice" possède "gandxo_1" et a reçu un message ;
// "legacy" est un ancien compte avec profil mais sans entrée dans l'annuaire.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "usernames/gandxo_1"), { uid: "alice", createdAt: iso() });
    await setDoc(doc(db, "users/alice"), {
      uid: "alice", username: "gandxo_1", email: "alice@test.dev", createdAt: iso(), updatedAt: iso(),
      link: "x", messageCount: 0, viewCount: 0, hasCompletedSetup: true
    });
    await setDoc(doc(db, "leaderboard/gandxo_1"), {
      username: "gandxo_1", photoURL: "", messageCount: 1, updatedAt: iso()
    });
    await setDoc(doc(db, "messages/m1"), { to: "gandxo_1", message: "Salut", createdAt: Timestamp.now() });
    await setDoc(doc(db, "users/legacy"), { uid: "legacy", username: "legacy_1", email: "legacy@test.dev" });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid) => env.authenticatedContext(uid, { email: `${uid}@test.dev` }).firestore();
const msg = (over = {}) => ({ to: "gandxo_1", message: "Bonjour", createdAt: serverTimestamp(), ...over });
const profile = (uid, username) => ({
  uid, username, email: `${uid}@test.dev`, photoURL: "", createdAt: iso(), updatedAt: iso(),
  link: "x", messageCount: 0, viewCount: 0, hasCompletedSetup: true
});

// Inscription telle que l'app la fait : pseudo + profil dans un seul lot.
function claim(db, uid, pseudo, photoURL) {
  const dir = { uid, createdAt: iso() };
  if (photoURL) dir.photoURL = photoURL;
  const b = writeBatch(db);
  b.set(doc(db, "usernames", pseudo), dir);
  b.set(doc(db, "users", uid), profile(uid, pseudo));
  return b.commit();
}

describe("Envoi anonyme", () => {
  it("1. message valide vers un pseudo existant : accepté", async () => {
    await assertSucceeds(addDoc(collection(anon(), "messages"), msg()));
  });
  it("2. pseudo inexistant : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ to: "inconnu" })));
  });
  it("3. pseudo piégé : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ to: "a'; drop" })));
  });
  it("4. champ ajouté (faux expéditeur) : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ sender: "gandxo" })));
  });
  it("5. message de 5001 caractères : refusé, 5000 : accepté", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ message: "x".repeat(5001) })));
    await assertSucceeds(addDoc(collection(anon(), "messages"), msg({ message: "x".repeat(5000) })));
  });
  it("6. message vide ou qui n'est pas du texte : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ message: "" })));
    await assertFails(addDoc(collection(anon(), "messages"), msg({ message: { $gt: "" } })));
  });
  it("7. horodatage fabriqué : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ createdAt: Timestamp.fromDate(new Date("2000-01-01")) })));
  });
  it("8. pseudo avec majuscules : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ to: "Gandxo_1" })));
  });
});

describe("Lecture des messages", () => {
  it("9. visiteur anonyme lit la boîte : refusé", async () => {
    await assertFails(getDocs(query(collection(anon(), "messages"), where("to", "==", "gandxo_1"))));
  });
  it("10. le propriétaire lit sa boîte (requête de la page) : accepté", async () => {
    await assertSucceeds(getDocs(query(collection(user("alice"), "messages"), where("to", "==", "gandxo_1"), orderBy("createdAt", "desc"))));
  });
  it("11. un autre compte lit cette boîte : refusé", async () => {
    await assertFails(getDocs(query(collection(user("mallory"), "messages"), where("to", "==", "gandxo_1"))));
  });
  it("12. lecture sans filtre sur le destinataire : refusée", async () => {
    await assertFails(getDocs(collection(user("alice"), "messages")));
  });
  it("13. le propriétaire supprime un message reçu : accepté, un autre compte : refusé", async () => {
    await assertFails(deleteDoc(doc(user("mallory"), "messages/m1")));
    await assertSucceeds(deleteDoc(doc(user("alice"), "messages/m1")));
  });
  it("14. modifier un message (anonyme ou propriétaire) : refusé", async () => {
    await assertFails(updateDoc(doc(anon(), "messages/m1"), { message: "insulte" }));
    await assertFails(updateDoc(doc(user("alice"), "messages/m1"), { message: "réécrit" }));
  });
});

describe("Annuaire des pseudos (usernames)", () => {
  it("15. lire un pseudo précis : accepté, lister tous : refusé", async () => {
    await assertSucceeds(getDoc(doc(anon(), "usernames/gandxo_1")));
    await assertFails(getDocs(collection(anon(), "usernames")));
  });
  it("16. visiteur sans compte réserve un pseudo : refusé", async () => {
    await assertFails(claim(anon(), "x", "visiteur_1"));
  });
  it("17. compte connecté réserve un pseudo libre (lot atomique) : accepté", async () => {
    await assertSucceeds(claim(user("bob"), "bob", "bob_1"));
  });
  it("18. pseudo déjà pris par un autre compte : refusé", async () => {
    await assertFails(claim(user("mallory"), "mallory", "gandxo_1"));
  });
  it("19. réserver un pseudo au nom d'un autre uid : refusé", async () => {
    const db = user("mallory");
    const b = writeBatch(db);
    b.set(doc(db, "usernames", "vol_1"), { uid: "alice", createdAt: iso() });
    b.set(doc(db, "users", "mallory"), profile("mallory", "vol_1"));
    await assertFails(b.commit());
  });
  it("20. même compte, deuxième pseudo : refusé", async () => {
    await assertFails(claim(user("alice"), "alice", "alice_2"));
    await assertFails(setDoc(doc(user("alice"), "usernames/alice_2"), { uid: "alice", createdAt: iso() }));
  });
  it("21. modifier le propriétaire ou supprimer un pseudo : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "usernames/gandxo_1"), { uid: "mallory" }));
    await assertFails(deleteDoc(doc(user("alice"), "usernames/gandxo_1")));
  });
  it("22. pseudo au mauvais format (majuscules, espace, trop court) : refusé", async () => {
    await assertFails(claim(user("bob"), "bob", "Bob 1"));
    await assertFails(claim(user("bob"), "bob", "ab"));
  });
  it("23. champ en trop dans un pseudo : refusé", async () => {
    const db = user("bob");
    const b = writeBatch(db);
    b.set(doc(db, "usernames", "bob_1"), { uid: "bob", createdAt: iso(), admin: true });
    b.set(doc(db, "users", "bob"), profile("bob", "bob_1"));
    await assertFails(b.commit());
  });
  it("24. pseudo réservé : refusé", async () => {
    await assertFails(claim(user("mallory"), "mallory", "admin"));
  });
});

describe("Inscription", () => {
  it("25. pseudo sans profil associé (écriture non atomique) : refusé", async () => {
    await assertFails(setDoc(doc(user("bob"), "usernames/bob_1"), { uid: "bob", createdAt: iso() }));
  });
  it("26. profil seul, sans pseudo réservé : refusé", async () => {
    await assertFails(setDoc(doc(user("bob"), "users/bob"), profile("bob", "bob_1")));
  });
  it("27. profil avec le pseudo réservé par quelqu'un d'autre : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "users/mallory"), profile("mallory", "gandxo_1")));
  });
  it("28. ancien compte : son pseudo est ajouté à l'annuaire : accepté", async () => {
    await assertSucceeds(setDoc(doc(user("legacy"), "usernames/legacy_1"), { uid: "legacy", createdAt: iso() }));
  });
  it("29. ancien compte : un autre pseudo que le sien : refusé", async () => {
    await assertFails(setDoc(doc(user("legacy"), "usernames/autre_nom"), { uid: "legacy", createdAt: iso() }));
  });
});

describe("Photos de profil", () => {
  it("30. inscription avec une photo Cloudinary de SIS : accepté", async () => {
    await assertSucceeds(claim(user("bob"), "bob", "bob_1", PHOTO));
  });
  it("31. inscription avec une photo hébergée ailleurs : refusé", async () => {
    await assertFails(claim(user("bob"), "bob", "bob_1", "https://evil.example/pixel.png"));
    await assertFails(claim(user("bob"), "bob", "bob_1", "https://res.cloudinary.com/autre_compte/image/upload/x.jpg"));
  });
  it("32. le propriétaire change sa photo : accepté", async () => {
    await assertSucceeds(updateDoc(doc(user("alice"), "usernames/gandxo_1"), { photoURL: PHOTO }));
  });
  it("33. le propriétaire met une photo non autorisée : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "usernames/gandxo_1"), { photoURL: "https://evil.example/x.png" }));
  });
  it("34. un autre compte change la photo : refusé", async () => {
    await assertFails(updateDoc(doc(user("mallory"), "usernames/gandxo_1"), { photoURL: PHOTO }));
  });
  it("35. changer la photo en même temps que le propriétaire : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "usernames/gandxo_1"), { photoURL: PHOTO, uid: "mallory" }));
  });
});

describe("Profils (users)", () => {
  it("36. lire son propre profil : accepté, celui d'un autre ou anonyme : refusé", async () => {
    await assertSucceeds(getDoc(doc(user("alice"), "users/alice")));
    await assertFails(getDoc(doc(user("mallory"), "users/alice")));
    await assertFails(getDoc(doc(anon(), "users/alice")));
  });
  it("37. lister les profils : refusé", async () => {
    await assertFails(getDocs(collection(user("alice"), "users")));
  });
  it("38. créer le profil d'un autre uid : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "users/bob"), profile("bob", "bob_1")));
  });
  it("39. modifier la photo : accepté ; changer le pseudo ou l'uid : refusé", async () => {
    await assertSucceeds(updateDoc(doc(user("alice"), "users/alice"), { photoURL: PHOTO, updatedAt: iso() }));
    await assertFails(updateDoc(doc(user("alice"), "users/alice"), { username: "autre_nom" }));
    await assertFails(updateDoc(doc(user("alice"), "users/alice"), { uid: "mallory" }));
  });
  it("40. supprimer un profil : refusé", async () => {
    await assertFails(deleteDoc(doc(user("alice"), "users/alice")));
  });
});

describe("Classement (leaderboard)", () => {
  it("41. lister le classement en lecture publique : accepté", async () => {
    await assertSucceeds(getDocs(query(collection(anon(), "leaderboard"), orderBy("messageCount", "desc"), limit(50))));
  });
  it("42. le propriétaire synchronise son compteur : accepté", async () => {
    await assertSucceeds(setDoc(doc(user("alice"), "leaderboard/gandxo_1"), {
      username: "gandxo_1", photoURL: PHOTO, messageCount: 5, updatedAt: iso()
    }, { merge: true }));
  });
  it("43. incrément anonyme +1 après envoi : accepté, +10 par un tiers : refusé", async () => {
    await assertSucceeds(setDoc(doc(anon(), "leaderboard/gandxo_1"), {
      username: "gandxo_1", messageCount: increment(1), updatedAt: iso()
    }, { merge: true }));
    await assertFails(setDoc(doc(anon(), "leaderboard/gandxo_1"), {
      username: "gandxo_1", messageCount: increment(10), updatedAt: iso()
    }, { merge: true }));
  });
  it("44. supprimer une entrée du classement : refusé", async () => {
    await assertFails(deleteDoc(doc(user("alice"), "leaderboard/gandxo_1")));
  });
});
