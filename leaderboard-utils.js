export const PSEUDO_RE = /^[a-z0-9_]{3,20}$/;
export const CLOUDINARY_PREFIX = "https://res.cloudinary.com/duddyzckz/image/upload/";
export const PUBLIC_ORIGIN = "https://sis-say-it-safely-pi.vercel.app";

export function isValidPseudo(pseudo) {
  return typeof pseudo === "string" && PSEUDO_RE.test(pseudo);
}

export function normalizePseudo(pseudo) {
  return String(pseudo || "").trim().replace(/^@+/, "").toLowerCase();
}

export function publicProfileLink(pseudo) {
  const clean = normalizePseudo(pseudo);
  return `${PUBLIC_ORIGIN}/?to=${encodeURIComponent(clean)}`;
}

export function publicLeaderboardLink() {
  return `${PUBLIC_ORIGIN}/classement`;
}

export function safePhotoUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed.startsWith(CLOUDINARY_PREFIX)) return "";
  return trimmed.length <= 300 ? trimmed : "";
}

export function formatMessageCount(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const formatted = new Intl.NumberFormat("fr-FR").format(n);
  return `${formatted} ${n <= 1 ? "message" : "messages"}`;
}

export function formatShortCount(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return new Intl.NumberFormat("fr-FR").format(n);
}

/**
 * Trie les entrées de classement par nombre de messages reçus (décroissant),
 * puis par pseudo (croissant) en cas d'égalité, et attribue les rangs
 * (ex-æquo partagent le même rang).
 */
export function computeLeaderboard(entries) {
  if (!Array.isArray(entries)) return [];

  const sanitized = [];
  const seen = new Set();

  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const username = normalizePseudo(raw.username || raw.id);
    if (!isValidPseudo(username) || seen.has(username)) continue;
    seen.add(username);

    const parsedCount = Number(raw.messageCount);
    const messageCount = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.floor(parsedCount) : 0;

    sanitized.push({
      username,
      photoURL: safePhotoUrl(raw.photoURL),
      messageCount,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : ""
    });
  }

  sanitized.sort((a, b) => {
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    return a.username.localeCompare(b.username, "fr");
  });

  let currentRank = 0;
  let lastCount = null;

  return sanitized.map((entry, idx) => {
    if (lastCount === null || entry.messageCount !== lastCount) {
      currentRank = idx + 1;
      lastCount = entry.messageCount;
    }
    return {
      ...entry,
      rank: currentRank
    };
  });
}

export function mergeLeaderboardEntry(entries, entry) {
  const base = Array.isArray(entries) ? entries.filter((item) => item && typeof item === "object") : [];
  if (!entry || typeof entry !== "object") return base;
  const target = normalizePseudo(entry.username || entry.id);
  if (!isValidPseudo(target)) return base;

  const existing = base.find((item) => normalizePseudo(item.username || item.id) === target);
  const filtered = base.filter((item) => normalizePseudo(item.username || item.id) !== target);
  const parsedCount = Number(entry.messageCount);
  const nextCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? Math.floor(parsedCount) : 0;

  return [
    ...filtered,
    {
      username: target,
      photoURL: safePhotoUrl(entry.photoURL) || (existing ? safePhotoUrl(existing.photoURL) : ""),
      messageCount: nextCount,
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : (existing?.updatedAt || "")
    }
  ];
}

export function findUserEntry(rankedList, username) {
  if (!Array.isArray(rankedList)) return null;
  const target = normalizePseudo(username);
  if (!isValidPseudo(target)) return null;
  return rankedList.find((item) => item.username === target) || null;
}

export function buildLeaderboardShareText(rankedList, myEntry = null) {
  const list = Array.isArray(rankedList) ? rankedList : [];
  const top = list.slice(0, 5);
  const lines = ["Classement SIS — Les profils les plus actifs :"];

  if (top.length === 0) {
    lines.push("Aucun profil classé pour le moment.");
  } else {
    for (const item of top) {
      lines.push(`#${item.rank} @${item.username} — ${formatMessageCount(item.messageCount)}`);
    }
  }

  if (myEntry && isValidPseudo(normalizePseudo(myEntry.username))) {
    const clean = normalizePseudo(myEntry.username);
    lines.push("");
    lines.push(`Ma position : #${myEntry.rank} (@${clean} · ${formatMessageCount(myEntry.messageCount)})`);
  }

  lines.push("");
  lines.push(`Voir le classement : ${publicLeaderboardLink()}`);
  return lines.join("\n");
}
