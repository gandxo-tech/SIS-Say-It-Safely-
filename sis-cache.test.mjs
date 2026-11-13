import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFILE_TTL_MS,
  LEADERBOARD_TTL_MS,
  MSG_SYNC_TTL_MS,
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
  isDirectoryVerified,
  markDirectoryVerified,
  getCachedLeaderboard,
  setCachedLeaderboard,
  updateCachedLeaderboardEntry,
  invalidateLeaderboardCache,
  getCachedRecipient,
  setCachedRecipient,
  getCachedMsgSync,
  shouldWriteLeaderboardSync,
  markMsgSynced
} from "./sis-cache.js";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };
}

test("cache profil respecte le TTL et se vide à la déconnexion", () => {
  const st = createMemoryStorage();
  const t0 = 1_000_000;
  setCachedProfile("uid_1", { username: "koffi", photoURL: "" }, st, t0);
  assert.deepEqual(getCachedProfile("uid_1", st, t0 + 1000), { username: "koffi", photoURL: "" });
  assert.equal(getCachedProfile("uid_other", st, t0 + 1000), null);
  assert.equal(getCachedProfile("uid_1", st, t0 + PROFILE_TTL_MS + 1), null);
  clearCachedProfile("uid_1", st);
  assert.equal(getCachedProfile("uid_1", st, t0 + 1000), null);
});

test("annuaire pseudo vérifié évite les lectures répétées", () => {
  const st = createMemoryStorage();
  assert.equal(isDirectoryVerified("aminata_b", st), false);
  markDirectoryVerified("aminata_b", st);
  assert.equal(isDirectoryVerified("aminata_b", st), true);
});

test("cache classement respecte le TTL, met à jour un profil et s'invalide", () => {
  const st = createMemoryStorage();
  const t0 = 5_000_000;
  setCachedLeaderboard([{ username: "alice", messageCount: 2 }], st, t0);
  assert.equal(getCachedLeaderboard(LEADERBOARD_TTL_MS, st, t0 + 10_000).length, 1);
  updateCachedLeaderboardEntry({ username: "bruno", messageCount: 5 }, st, t0 + 11_000);
  assert.equal(getCachedLeaderboard(LEADERBOARD_TTL_MS, st, t0 + 12_000).length, 2);
  assert.equal(getCachedLeaderboard(LEADERBOARD_TTL_MS, st, t0 + LEADERBOARD_TTL_MS + 1), null);
  invalidateLeaderboardCache(st);
  assert.equal(getCachedLeaderboard(LEADERBOARD_TTL_MS, st, t0 + 1000), null);
});

test("cache destinataire et déduplication d'écriture leaderboard économisent Firestore", () => {
  const st = createMemoryStorage();
  const t0 = 9_000_000;
  setCachedRecipient("koffi", { photoURL: "https://res.cloudinary.com/duddyzckz/image/upload/v1/x.jpg" }, st, t0);
  assert.equal(getCachedRecipient("koffi", 60_000, st, t0 + 10_000).exists, true);
  assert.equal(getCachedRecipient("koffi", 60_000, st, t0 + 70_000), null);

  assert.equal(shouldWriteLeaderboardSync("koffi", 4, "", MSG_SYNC_TTL_MS, st, t0), true);
  markMsgSynced("koffi", 4, "", st, t0);
  assert.equal(getCachedMsgSync("koffi", MSG_SYNC_TTL_MS, st, t0 + 1000).messageCount, 4);
  assert.equal(shouldWriteLeaderboardSync("koffi", 4, "", MSG_SYNC_TTL_MS, st, t0 + 5000), false);
  assert.equal(shouldWriteLeaderboardSync("koffi", 5, "", MSG_SYNC_TTL_MS, st, t0 + 5000), true);
});
