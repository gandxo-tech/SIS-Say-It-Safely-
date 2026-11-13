import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidPseudo,
  normalizePseudo,
  publicProfileLink,
  publicLeaderboardLink,
  safePhotoUrl,
  formatMessageCount,
  computeLeaderboard,
  mergeLeaderboardEntry,
  findUserEntry,
  buildLeaderboardShareText
} from "./leaderboard-utils.js";

const SAMPLE_ENTRIES = [
  { username: "aminata_b", photoURL: "", messageCount: 148 },
  { username: "koffi_dev", photoURL: "", messageCount: 112 },
  { username: "nadia_cotonou", photoURL: "", messageCount: 94 },
  { username: "exauce_g", photoURL: "", messageCount: 71 }
];

test("isValidPseudo et normalizePseudo valident et normalisent correctement", () => {
  assert.equal(normalizePseudo("  @Gandxo_1 "), "gandxo_1");
  assert.equal(isValidPseudo("gandxo_1"), true);
  assert.equal(isValidPseudo("ab"), false);
  assert.equal(isValidPseudo("Invalid Space"), false);
  assert.equal(isValidPseudo("a".repeat(21)), false);
});

test("publicProfileLink génère toujours le lien officiel Vercel", () => {
  assert.equal(
    publicProfileLink("@Exauce_G"),
    "https://sis-say-it-safely-pi.vercel.app/?to=exauce_g"
  );
  assert.equal(
    publicLeaderboardLink(),
    "https://sis-say-it-safely-pi.vercel.app/classement"
  );
});

test("safePhotoUrl accepte uniquement les images Cloudinary de SIS", () => {
  const valid = "https://res.cloudinary.com/duddyzckz/image/upload/c_fill,w_256/avatar.jpg";
  assert.equal(safePhotoUrl(valid), valid);
  assert.equal(safePhotoUrl("https://evil.example/avatar.jpg"), "");
  assert.equal(safePhotoUrl("https://res.cloudinary.com/autre/image/upload/x.jpg"), "");
  assert.equal(safePhotoUrl(""), "");
});

test("formatMessageCount gère le singulier et le pluriel en français", () => {
  assert.equal(formatMessageCount(0), "0 message");
  assert.equal(formatMessageCount(1), "1 message");
  assert.equal(formatMessageCount(2), "2 messages");
  assert.match(formatMessageCount(1250), /^1[\s\u202f\u00a0]250 messages$/);
});

test("computeLeaderboard trie par messageCount décroissant et gère les ex-æquo", () => {
  const input = [
    { username: "zoe_1", messageCount: 10 },
    { username: "@Alice_2", messageCount: 45 },
    { username: "bob_3", messageCount: 45 },
    { username: "carol_4", messageCount: 5 },
    { username: "invalid!", messageCount: 999 },
    { username: "bob_3", messageCount: 999 },
    { username: "neg_5", messageCount: -3 }
  ];

  const ranked = computeLeaderboard(input);
  assert.equal(ranked.length, 5);
  assert.deepEqual(
    ranked.map((r) => ({ username: r.username, messageCount: r.messageCount, rank: r.rank })),
    [
      { username: "alice_2", messageCount: 45, rank: 1 },
      { username: "bob_3", messageCount: 45, rank: 1 },
      { username: "zoe_1", messageCount: 10, rank: 3 },
      { username: "carol_4", messageCount: 5, rank: 4 },
      { username: "neg_5", messageCount: 0, rank: 5 }
    ]
  );
});

test("mergeLeaderboardEntry ajoute ou met à jour un profil sans doublon", () => {
  const base = [{ username: "exauce_g", photoURL: "", messageCount: 1 }];
  const updated = mergeLeaderboardEntry(base, {
    username: "@Exauce_G",
    photoURL: "https://res.cloudinary.com/duddyzckz/image/upload/v1/a.jpg",
    messageCount: 3
  });
  assert.equal(updated.length, 1);
  assert.equal(updated[0].messageCount, 3);
  assert.equal(updated[0].photoURL, "https://res.cloudinary.com/duddyzckz/image/upload/v1/a.jpg");
});

test("findUserEntry retrouve un utilisateur classé insensiblement à la casse", () => {
  const ranked = computeLeaderboard(SAMPLE_ENTRIES);
  const found = findUserEntry(ranked, "@Koffi_Dev");
  assert.ok(found);
  assert.equal(found.rank, 2);
  assert.equal(found.messageCount, 112);
  assert.equal(findUserEntry(ranked, "inconnu_99"), null);
});

test("buildLeaderboardShareText génère un résumé propre du classement", () => {
  const ranked = computeLeaderboard(SAMPLE_ENTRIES);
  const myEntry = findUserEntry(ranked, "exauce_g");
  const text = buildLeaderboardShareText(ranked, myEntry);
  assert.match(text, /#1 @aminata_b — 148 messages/);
  assert.match(text, /Ma position : #4 \(@exauce_g · 71 messages\)/);
  assert.match(text, /https:\/\/sis-say-it-safely-pi\.vercel\.app\/classement/);
});
