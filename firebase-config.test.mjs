import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { firebaseConfig, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./firebase-config.js";

// Construite par morceaux : le fichier de test ne doit pas contenir lui-meme
// le motif qu'il recherche, sinon il se detecte comme un doublon.
const KEY_MARKER = ["AIza", "Sy"].join("");

test("firebaseConfig expose les identifiants publics attendus", () => {
  for (const key of [
    "apiKey", "authDomain", "projectId",
    "storageBucket", "messagingSenderId", "appId"
  ]) {
    assert.equal(typeof firebaseConfig[key], "string", `${key} doit être une chaîne`);
    assert.ok(firebaseConfig[key].length > 0, `${key} ne doit pas être vide`);
  }
  assert.equal(firebaseConfig.projectId, "gandxoanonymous");
  assert.equal(typeof CLOUDINARY_CLOUD_NAME, "string");
  assert.equal(typeof CLOUDINARY_UPLOAD_PRESET, "string");
});

test("aucune page HTML ne ré-embarque la configuration Firebase", () => {
  const pages = readdirSync(".").filter((name) => name.endsWith(".html"));
  assert.ok(pages.length > 0, "au moins une page doit être inspectée");

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.equal(
      source.includes(KEY_MARKER),
      false,
      `${page} contient encore la configuration Firebase en dur`
    );
  }
});

test("la configuration n'existe qu'en un seul exemplaire", () => {
  const files = readdirSync(".").filter((name) => /\.(html|js|mjs)$/.test(name));
  const holders = files.filter((name) => readFileSync(name, "utf8").includes(KEY_MARKER));
  assert.deepEqual(holders, ["firebase-config.js"]);
});
