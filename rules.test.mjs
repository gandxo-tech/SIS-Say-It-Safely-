// Tests des règles Firestore. Lancer : npm run test:rules   (Java requis pour l'émulateur)
import { readFileSync } from "node:fs";
import { before, after, beforeEach, describe, it } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection,
  query, where, orderBy, serverTimestamp, Timestamp
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

// État de départ : le compte "alice" possède le pseudo "gandxo_1" et a reçu un message.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const iso = new Date().toISOString();
    await setDoc(doc(db, "usernames/gandxo_1"), { uid: "alice", createdAt: iso });
    await setDoc(doc(db, "users/alice"), {
      uid: "alice", username: "gandxo_1", email: "alice@test.dev", createdAt: iso, updatedAt: iso,
      link: "x", messageCount: 0, viewCount: 0, hasCompletedSetup: false
    });
    await setDoc(doc(db, "messages/m1"), { to: "gandxo_1", message: "Salut", createdAt: Timestamp.now() });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid) => env.authenticatedContext(uid, { email: `${uid}@test.dev` }).firestore();
const msg = (over = {}) => ({ to: "gandxo_1", message: "Bonjour", createdAt: serverTimestamp(), ...over });
const profile = (uid, username) => {
  const iso = new Date().toISOString();
  return { uid, username, email: `${uid}@test.dev`, createdAt: iso, updatedAt: iso, link: "x", messageCount: 0, viewCount: 0, hasCompletedSetup: false };
};

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
    await assertFails(setDoc(doc(anon(), "usernames/hacker"), { uid: "x", createdAt: new Date().toISOString() }));
  });
  it("17. compte connecté réserve un pseudo libre : accepté", async () => {
    await assertSucceeds(setDoc(doc(user("bob"), "usernames/bob_1"), { uid: "bob", createdAt: new Date().toISOString() }));
  });
  it("18. pseudo déjà pris par un autre compte : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "usernames/gandxo_1"), { uid: "mallory", createdAt: new Date().toISOString() }));
  });
  it("19. réserver un pseudo au nom d'un autre uid : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "usernames/vol_1"), { uid: "alice", createdAt: new Date().toISOString() }));
  });
  it("20. même compte, deuxième pseudo : refusé", async () => {
    await assertFails(setDoc(doc(user("alice"), "usernames/alice_2"), { uid: "alice", createdAt: new Date().toISOString() }));
  });
  it("21. modifier ou supprimer un pseudo existant : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "usernames/gandxo_1"), { uid: "mallory" }));
    await assertFails(deleteDoc(doc(user("alice"), "usernames/gandxo_1")));
  });
  it("22. pseudo au mauvais format (majuscules, espace, trop court) : refusé", async () => {
    await assertFails(setDoc(doc(user("bob"), "usernames/Bob 1"), { uid: "bob", createdAt: new Date().toISOString() }));
    await assertFails(setDoc(doc(user("bob"), "usernames/ab"), { uid: "bob", createdAt: new Date().toISOString() }));
  });
  it("23. champ en trop dans un pseudo : refusé", async () => {
    await assertFails(setDoc(doc(user("bob"), "usernames/bob_1"), { uid: "bob", createdAt: new Date().toISOString(), admin: true }));
  });
});

describe("Inscription (ordre des écritures du client actuel)", () => {
  it("24. profil puis pseudo : accepté", async () => {
    const db = user("bob");
    await assertSucceeds(setDoc(doc(db, "users/bob"), profile("bob", "bob_1")));
    await assertSucceeds(setDoc(doc(db, "usernames/bob_1"), { uid: "bob", createdAt: new Date().toISOString() }));
  });
  it("25. pseudo puis profil : accepté", async () => {
    const db = user("bob");
    await assertSucceeds(setDoc(doc(db, "usernames/bob_1"), { uid: "bob", createdAt: new Date().toISOString() }));
    await assertSucceeds(setDoc(doc(db, "users/bob"), profile("bob", "bob_1")));
  });
  it("26. profil avec le pseudo réservé par quelqu'un d'autre : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "users/mallory"), profile("mallory", "gandxo_1")));
  });
});

describe("Profils (users)", () => {
  it("27. lire son propre profil : accepté, celui d'un autre : refusé", async () => {
    await assertSucceeds(getDoc(doc(user("alice"), "users/alice")));
    await assertFails(getDoc(doc(user("mallory"), "users/alice")));
    await assertFails(getDoc(doc(anon(), "users/alice")));
  });
  it("28. lister les profils : refusé", async () => {
    await assertFails(getDocs(collection(user("alice"), "users")));
  });
  it("29. créer le profil d'un autre uid : refusé", async () => {
    await assertFails(setDoc(doc(user("mallory"), "users/bob"), profile("bob", "bob_1")));
  });
  it("30. modifier la photo : accepté ; changer le pseudo ou l'uid : refusé", async () => {
    await assertSucceeds(updateDoc(doc(user("alice"), "users/alice"), { photoURL: "https://x/y.png", updatedAt: new Date().toISOString() }));
    await assertFails(updateDoc(doc(user("alice"), "users/alice"), { username: "autre_nom" }));
    await assertFails(updateDoc(doc(user("alice"), "users/alice"), { uid: "mallory" }));
  });
  it("31. supprimer un profil : refusé", async () => {
    await assertFails(deleteDoc(doc(user("alice"), "users/alice")));
  });
});
