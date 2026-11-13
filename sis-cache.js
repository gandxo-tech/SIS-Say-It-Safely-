import { isValidPseudo, normalizePseudo, safePhotoUrl } from "./leaderboard-utils.js";

export const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
export const LEADERBOARD_TTL_MS = 5 * 60 * 1000;
export const RECIPIENT_TTL_MS = 10 * 60 * 1000;
export const MSG_SYNC_TTL_MS = 10 * 60 * 1000;

const KEY_PROFILE = "sis_cache_profile_v1";
const KEY_LEADERBOARD = "sis_cache_leaderboard_v1";
const KEY_RECIPIENT_PREFIX = "sis_cache_recipient_v1_";
const KEY_MSG_SYNC_PREFIX = "sis_cache_msgsync_v1_";
const KEY_DIR_OK_PREFIX = "sis_cache_dir_ok_v1_";
const KEY_STUDIO_PREFS = "sis_studio_prefs_v1";

function defaultStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (e) {
    return null;
  }
}

function readJson(key, storage = defaultStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeJson(key, value, storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Quota ou mode privé : on ignore silencieusement
  }
}

function removeKey(key, storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (e) {}
}

export function getCachedProfile(uid, storage = defaultStorage(), now = Date.now()) {
  if (!uid) return null;
  const cached = readJson(KEY_PROFILE, storage);
  if (!cached || cached.uid !== uid || !isValidPseudo(cached.username)) return null;
  if (!Number.isFinite(cached.cachedAt) || now - cached.cachedAt > PROFILE_TTL_MS) return null;
  return {
    username: cached.username,
    photoURL: typeof cached.photoURL === "string" ? cached.photoURL : ""
  };
}

export function setCachedProfile(uid, profile, storage = defaultStorage(), now = Date.now()) {
  if (!uid || !profile) return;
  const username = normalizePseudo(profile.username);
  if (!isValidPseudo(username)) return;
  writeJson(
    KEY_PROFILE,
    {
      uid,
      username,
      photoURL: safePhotoUrl(profile.photoURL) || (typeof profile.photoURL === "string" ? profile.photoURL : ""),
      cachedAt: now
    },
    storage
  );
}

export function clearCachedProfile(uid = null, storage = defaultStorage()) {
  const cached = readJson(KEY_PROFILE, storage);
  if (!uid || !cached || cached.uid === uid) {
    removeKey(KEY_PROFILE, storage);
  }
}

export function isDirectoryVerified(pseudo, storage = defaultStorage()) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean) || !storage) return false;
  try {
    return storage.getItem(KEY_DIR_OK_PREFIX + clean) === "1";
  } catch (e) {
    return false;
  }
}

export function markDirectoryVerified(pseudo, storage = defaultStorage()) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean) || !storage) return;
  try {
    storage.setItem(KEY_DIR_OK_PREFIX + clean, "1");
  } catch (e) {}
}

export function getCachedLeaderboard(
  ttlMs = LEADERBOARD_TTL_MS,
  storage = defaultStorage(),
  now = Date.now()
) {
  const cached = readJson(KEY_LEADERBOARD, storage);
  if (!cached || !Array.isArray(cached.entries)) return null;
  if (!Number.isFinite(cached.fetchedAt) || now - cached.fetchedAt > ttlMs) return null;
  return cached.entries;
}

export function setCachedLeaderboard(entries, storage = defaultStorage(), now = Date.now()) {
  if (!Array.isArray(entries)) return;
  writeJson(
    KEY_LEADERBOARD,
    {
      entries,
      fetchedAt: now
    },
    storage
  );
}

export function updateCachedLeaderboardEntry(entry, storage = defaultStorage(), now = Date.now()) {
  if (!entry || typeof entry !== "object") return;
  const target = normalizePseudo(entry.username || entry.id);
  if (!isValidPseudo(target)) return;
  const cached = readJson(KEY_LEADERBOARD, storage);
  if (!cached || !Array.isArray(cached.entries)) return;
  const existing = cached.entries.find((e) => normalizePseudo(e.username || e.id) === target);
  const filtered = cached.entries.filter((e) => normalizePseudo(e.username || e.id) !== target);
  const nextEntry = {
    username: target,
    photoURL: safePhotoUrl(entry.photoURL) || (existing ? safePhotoUrl(existing.photoURL) : ""),
    messageCount: Math.max(0, Math.floor(Number(entry.messageCount) || 0)),
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : (existing?.updatedAt || new Date(now).toISOString())
  };
  writeJson(
    KEY_LEADERBOARD,
    {
      entries: [...filtered, nextEntry],
      fetchedAt: Number.isFinite(cached.fetchedAt) ? cached.fetchedAt : now
    },
    storage
  );
}

export function invalidateLeaderboardCache(storage = defaultStorage()) {
  removeKey(KEY_LEADERBOARD, storage);
}

export function getCachedRecipient(
  pseudo,
  ttlMs = RECIPIENT_TTL_MS,
  storage = defaultStorage(),
  now = Date.now()
) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean)) return null;
  const cached = readJson(KEY_RECIPIENT_PREFIX + clean, storage);
  if (!cached || !Number.isFinite(cached.fetchedAt) || now - cached.fetchedAt > ttlMs) return null;
  return {
    exists: Boolean(cached.exists),
    photoURL: typeof cached.photoURL === "string" ? cached.photoURL : ""
  };
}

export function setCachedRecipient(pseudo, info, storage = defaultStorage(), now = Date.now()) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean)) return;
  writeJson(
    KEY_RECIPIENT_PREFIX + clean,
    {
      exists: Boolean(info && info !== false),
      photoURL: info && typeof info.photoURL === "string" ? info.photoURL : "",
      fetchedAt: now
    },
    storage
  );
}

export function getCachedMsgSync(
  pseudo,
  ttlMs = MSG_SYNC_TTL_MS,
  storage = defaultStorage(),
  now = Date.now()
) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean)) return null;
  const cached = readJson(KEY_MSG_SYNC_PREFIX + clean, storage);
  if (!cached || !Number.isFinite(cached.syncedAt) || now - cached.syncedAt > ttlMs) return null;
  return {
    messageCount: Math.max(0, Math.floor(Number(cached.messageCount) || 0)),
    photoURL: typeof cached.photoURL === "string" ? cached.photoURL : "",
    syncedAt: cached.syncedAt
  };
}

export function shouldWriteLeaderboardSync(
  pseudo,
  messageCount,
  photoURL,
  ttlMs = MSG_SYNC_TTL_MS,
  storage = defaultStorage(),
  now = Date.now()
) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean)) return false;
  const prev = getCachedMsgSync(clean, ttlMs, storage, now);
  if (!prev) return true;
  const nextCount = Math.max(0, Math.floor(Number(messageCount) || 0));
  const nextPhoto = safePhotoUrl(photoURL);
  return prev.messageCount !== nextCount || prev.photoURL !== nextPhoto;
}

export function markMsgSynced(
  pseudo,
  messageCount,
  photoURL = "",
  storage = defaultStorage(),
  now = Date.now()
) {
  const clean = normalizePseudo(pseudo);
  if (!isValidPseudo(clean)) return;
  writeJson(
    KEY_MSG_SYNC_PREFIX + clean,
    {
      messageCount: Math.max(0, Math.floor(Number(messageCount) || 0)),
      photoURL: safePhotoUrl(photoURL),
      syncedAt: now
    },
    storage
  );
}

export function getStudioPrefs(storage = defaultStorage()) {
  const prefs = readJson(KEY_STUDIO_PREFS, storage);
  return prefs && typeof prefs === "object" ? prefs : {};
}

export function setStudioPrefs(prefs, storage = defaultStorage()) {
  if (!prefs || typeof prefs !== "object") return;
  const prev = getStudioPrefs(storage);
  writeJson(KEY_STUDIO_PREFS, { ...prev, ...prefs }, storage);
}
