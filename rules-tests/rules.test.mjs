// Tests des règles Firestore. Depuis le dossier rules-tests : npm install puis npm test
// (émulateur Firestore requis, donc Java installé).
import { readFileSync } from "node:fs";
import { before, after, beforeEach, describe, it } from "node:test";
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection,
  query, where, orderBy, writeBatch, serverTimestamp, Timestamp
} from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sis",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8080
    }
  });
});
after(async () => { await env.cleanup(); });

// État de départ : Gandxo (uid "alice") possède le pseudo "gandxo_1" et a reçu un message.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "pseudos/gandxo_1"), { ownerUid: "alice", createdAt: Timestamp.now() });
    await setDoc(doc(db, "users/alice"), { pseudo: "gandxo_1", createdAt: Timestamp.now() });
    await setDoc(doc(db, "messages/m1"), { recipient: "gandxo_1", body: "Salut", createdAt: Timestamp.now() });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid, verified = true) =>
  env.authenticatedContext(uid, { email_verified: verified, email: `${uid}@test.dev` }).firestore();
const msg = (over = {}) => ({
  recipient: "gandxo_1", body: "Bonjour", createdAt: serverTimestamp(), ...over
});

describe("Envoi anonyme", () => {
  it("1. message valide à un pseudo existant : accepté", async () => {
    await assertSucceeds(addDoc(collection(anon(), "messages"), msg()));
  });
  it("2. pseudo inexistant : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ recipient: "inconnu" })));
  });
  it("3. pseudo piégé : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ recipient: "a'; drop" })));
  });
  it("4. champ ajouté (faux expéditeur) : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ sender: "gandxo" })));
  });
  it("5. message de 5001 caractères : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ body: "x".repeat(5001) })));
  });
  it("5b. message de 5000 caractères : accepté", async () => {
    await assertSucceeds(addDoc(collection(anon(), "messages"), msg({ body: "x".repeat(5000) })));
  });
  it("6. message vide : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ body: "" })));
  });
  it("6b. corps qui n'est pas du texte : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ body: { $gt: "" } })));
  });
  it("7. horodatage fabriqué : refusé", async () => {
    await assertFails(addDoc(collection(anon(), "messages"), msg({ createdAt: Timestamp.fromDate(new Date("2000-01-01")) })));
  });
});

describe("Lecture et modification des messages", () => {
  it("8. anonyme lit la boîte : refusé", async () => {
    await assertFails(getDocs(query(collection(anon(), "messages"), where("recipient", "==", "gandxo_1"))));
  });
  it("9. anonyme modifie ou supprime un message : refusé", async () => {
    await assertFails(updateDoc(doc(anon(), "messages/m1"), { body: "insulte" }));
    await assertFails(deleteDoc(doc(anon(), "messages/m1")));
  });
  it("A. le propriétaire lit sa boîte : accepté", async () => {
    await assertSucceeds(getDocs(query(
      collection(user("alice"), "messages"),
      where("recipient", "==", "gandxo_1"), orderBy("createdAt", "desc")
    )));
  });
  it("B. un autre compte lit cette boîte : refusé", async () => {
    await assertFails(getDocs(query(collection(user("mallory"), "messages"), where("recipient", "==", "gandxo_1"))));
  });
  it("C. le propriétaire supprime un message reçu : accepté", async () => {
    await assertSucceeds(deleteDoc(doc(user("alice"), "messages/m1")));
  });
  it("D. un autre compte supprime ce message : refusé", async () => {
    await assertFails(deleteDoc(doc(user("mallory"), "messages/m1")));
  });
  it("E. le propriétaire modifie un message : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "messages/m1"), { body: "réécrit" }));
  });
});

describe("Annuaire des pseudos", () => {
  it("10. anonyme crée un pseudo : refusé", async () => {
    await assertFails(setDoc(doc(anon(), "pseudos/hacker"), { ownerUid: "x", createdAt: serverTimestamp() }));
  });
  it("11. lire un pseudo précis : accepté, lister tous : refusé", async () => {
    await assertSucceeds(getDoc(doc(anon(), "pseudos/gandxo_1")));
    await assertFails(getDocs(collection(anon(), "pseudos")));
  });
});

// Inscription : users/{uid} et pseudos/{pseudo} sont créés dans le même lot.
function claim(db, uid, pseudo) {
  const b = writeBatch(db);
  b.set(doc(db, "pseudos", pseudo), { ownerUid: uid, createdAt: serverTimestamp() });
  b.set(doc(db, "users", uid), { pseudo, createdAt: serverTimestamp() });
  return b.commit();
}

describe("Comptes et pseudos", () => {
  it("F. compte vérifié réserve un pseudo libre : accepté", async () => {
    await assertSucceeds(claim(user("bob"), "bob", "bob_1"));
  });
  it("G. pseudo déjà pris par un autre compte : refusé", async () => {
    await assertFails(claim(user("mallory"), "mallory", "gandxo_1"));
  });
  it("H. même compte, deuxième pseudo : refusé", async () => {
    await assertFails(claim(user("alice"), "alice", "alice_2"));
  });
  it("I. email non vérifié : refusé", async () => {
    await assertFails(claim(user("carl", false), "carl", "carl_1"));
  });
  it("J. visiteur sans compte : refusé", async () => {
    await assertFails(claim(anon(), "x", "visiteur_1"));
  });
  it("K. pseudo sans profil users associé : refusé", async () => {
    await assertFails(setDoc(doc(user("bob"), "pseudos/bob_1"), { ownerUid: "bob", createdAt: serverTimestamp() }));
  });
  it("L. pseudo au nom d'un autre propriétaire : refusé", async () => {
    const db = user("mallory");
    const b = writeBatch(db);
    b.set(doc(db, "pseudos", "vol_1"), { ownerUid: "alice", createdAt: serverTimestamp() });
    b.set(doc(db, "users", "mallory"), { pseudo: "vol_1", createdAt: serverTimestamp() });
    await assertFails(b.commit());
  });
  it("M. pseudo réservé : refusé", async () => {
    await assertFails(claim(user("mallory"), "mallory", "admin"));
  });
  it("N. pseudo invalide (majuscules, espace, trop court) : refusé", async () => {
    await assertFails(claim(user("bob"), "bob", "Bob 1"));
    await assertFails(claim(user("bob"), "bob", "ab"));
  });
  it("O. changer ou supprimer un pseudo existant : refusé", async () => {
    await assertFails(updateDoc(doc(user("alice"), "pseudos/gandxo_1"), { ownerUid: "mallory" }));
    await assertFails(deleteDoc(doc(user("alice"), "pseudos/gandxo_1")));
    await assertFails(deleteDoc(doc(user("alice"), "users/alice")));
  });
  it("P. lire son propre profil : accepté, celui d'un autre : refusé", async () => {
    await assertSucceeds(getDoc(doc(user("alice"), "users/alice")));
    await assertFails(getDoc(doc(user("mallory"), "users/alice")));
  });
});
