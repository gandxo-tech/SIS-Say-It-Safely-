// Proximity — pont entre les pages SIS et le plugin natif Android
// `ProximityMesh` (découverte Bluetooth LE).
//
// Le plugin natif est enregistré par Capacitor ; il apparaît dans le WebView
// sous `window.Capacitor.Plugins.ProximityMesh`. Sur le web (Vercel), ce pont
// n'existe pas : `isAvailable()` renvoie false et les pages masquent l'entrée.
// On n'importe donc PAS @capacitor/core ici : le PWA doit rester autonome.

const PLUGIN_NAME = "ProximityMesh";
const PEERS_KEY = "sis-proximity-peers-v1";
const CHAT_PREFIX = "sis-proximity-chat-v1:";

// Un pair non revu depuis 90 s est considéré comme parti.
const PEER_TTL_MS = 90_000;
// Nombre maximum de conversations gardées localement.
const MAX_PEERS = 50;

/* ------------------------------------------------------------------ */
/* Détection de l'environnement natif                                  */
/* ------------------------------------------------------------------ */

function capacitor() {
  return typeof window !== "undefined" ? window.Capacitor : undefined;
}

function isNative() {
  const cap = capacitor();
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform();
  if (typeof cap.getPlatform === "function") return cap.getPlatform() !== "web";
  return false;
}

/** Le plugin natif est-il disponible dans ce contexte ? */
export function isAvailable() {
  return Boolean(plugin());
}

/** Retourne le plugin Capacitor ou null sur le web. */
export function plugin() {
  const cap = capacitor();
  if (!cap || !isNative()) return null;
  return (cap.Plugins && cap.Plugins[PLUGIN_NAME]) || null;
}

/* ------------------------------------------------------------------ */
/* Stockage local (aucune donnée ne quitte le téléphone)               */
/* ------------------------------------------------------------------ */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Stockage plein ou désactivé : la session reste utilisable en mémoire.
  }
}

function readPeers() {
  const value = readJSON(PEERS_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter((peer) => peer && typeof peer.id === "string");
}

/** Pairs encore à portée, du plus récent au plus ancien. */
export function loadPeers() {
  const now = Date.now();
  return readPeers()
    .filter((peer) => now - Number(peer.lastSeen || 0) < PEER_TTL_MS)
    .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));
}

export function loadPeer(peerId) {
  if (!peerId) return null;
  return readPeers().find((peer) => peer.id === peerId) || null;
}

/** Normalise un événement natif `peerFound`. */
export function normalizePeer(raw) {
  if (!raw || typeof raw.id !== "string" || !raw.id) return null;
  const lastSeen = Number(raw.lastSeen) || Date.now();
  return {
    id: raw.id,
    rssi: Number.isFinite(Number(raw.rssi)) ? Number(raw.rssi) : null,
    name: typeof raw.name === "string" && raw.name ? raw.name : null,
    lastSeen,
  };
}

/** Ajoute ou rafraîchit un pair dans le stockage local. */
export function upsertPeer(raw) {
  const peer = normalizePeer(raw);
  if (!peer) return null;

  const peers = readPeers();
  const previous = peers.find((item) => item.id === peer.id);
  const merged = {
    id: peer.id,
    name: peer.name || (previous && previous.name) || null,
    rssi: peer.rssi,
    firstSeen: (previous && previous.firstSeen) || peer.lastSeen,
    lastSeen: peer.lastSeen,
  };

  const next = peers.filter((item) => item.id !== peer.id);
  next.push(merged);
  next.sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));
  writeJSON(PEERS_KEY, next.slice(0, MAX_PEERS));
  return merged;
}

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export function loadMessages(peerId) {
  if (!peerId) return [];
  const value = readJSON(CHAT_PREFIX + peerId, []);
  return Array.isArray(value) ? value : [];
}

export function appendMessage(peerId, message) {
  const messages = loadMessages(peerId);
  messages.push(message);
  // On garde les 200 derniers messages de chaque conversation.
  writeJSON(CHAT_PREFIX + peerId, messages.slice(-200));
  return messages;
}

export function newMessageId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Identités temporaires                                               */
/* ------------------------------------------------------------------ */

// Pseudos déterministes : le même identifiant donne toujours le même nom,
// sans jamais révéler l'adresse de l'appareil ni son nom Bluetooth.
// Animaux au masculin pour que les adjectifs s'accordent.
const ANIMALS = [
  ["Renard", "🦊"],
  ["Hérisson", "🦔"],
  ["Panda", "🐼"],
  ["Lynx", "🐱"],
  ["Castor", "🦫"],
  ["Corbeau", "🐦‍⬛"],
  ["Dauphin", "🐬"],
  ["Koala", "🐨"],
  ["Tigre", "🐯"],
  ["Hibou", "🦉"],
  ["Blaireau", "🦡"],
  ["Élan", "🦌"],
  ["Puma", "🐆"],
  ["Colibri", "🐦"],
  ["Manchot", "🐧"],
  ["Loutre", "🦦"]
];

const ADJECTIVES = [
  "Discret", "Rapide", "Curieux", "Silencieux", "Nocturne", "Malin",
  "Sauvage", "Paisible", "Intrépide", "Vif", "Sage", "Furtif",
  "Radieux", "Poli", "Léger", "Attentif"
];

function hash32(value) {
  // FNV-1a : rapide, stable et suffisant pour choisir un pseudo.
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Identité temporaire associée à un pair. */
export function pseudonym(peerId) {
  const id = typeof peerId === "string" ? peerId : "";
  const animal = ANIMALS[hash32(id) % ANIMALS.length];
  const adjective = ADJECTIVES[hash32(id + "|adj") % ADJECTIVES.length];
  return { name: `${animal[0]} ${adjective}`, emoji: animal[1] };
}

/* ------------------------------------------------------------------ */
/* Scan                                                                */
/* ------------------------------------------------------------------ */

/**
 * Lance le scan natif et branche les événements.
 * @returns {Promise<{stop: () => Promise<void>}>}
 */
export async function startScan({ onPeer, onState } = {}) {
  const capabilities = plugin();
  if (!capabilities) {
    const error = new Error("Proximity n'est disponible que dans l'application Android SIS.");
    error.code = "unavailable";
    throw error;
  }

  let peerHandle = null;
  let stateHandle = null;

  const cleanup = async () => {
    try { if (peerHandle) await peerHandle.remove(); } catch (e) { /* déjà retiré */ }
    try { if (stateHandle) await stateHandle.remove(); } catch (e) { /* déjà retiré */ }
    peerHandle = null;
    stateHandle = null;
  };

  try {
    peerHandle = await capabilities.addListener("peerFound", (event) => {
      const peer = normalizePeer(event);
      if (peer && typeof onPeer === "function") onPeer(peer);
    });
    stateHandle = await capabilities.addListener("scanState", (state) => {
      if (typeof onState === "function") onState(state || {});
    });
    await capabilities.start();
  } catch (error) {
    await cleanup();
    throw error;
  }

  return {
    async stop() {
      try { await capabilities.stop(); } catch (e) { /* déjà arrêté */ }
      await cleanup();
    }
  };
}

/** État Bluetooth côté natif. */
export async function getStatus() {
  const capabilities = plugin();
  if (!capabilities) return { supported: false, bluetoothEnabled: false, scanning: false, native: false };
  try {
    const status = await capabilities.getStatus();
    return { ...status, native: true };
  } catch (error) {
    return { supported: false, bluetoothEnabled: false, scanning: false, native: true };
  }
}

/* ------------------------------------------------------------------ */
/* Affichage                                                           */
/* ------------------------------------------------------------------ */

/** Libellé lisible de la force du signal. */
export function signalLabel(rssi) {
  const value = Number(rssi);
  if (!Number.isFinite(value)) return "À portée";
  if (value >= -55) return "Très proche";
  if (value >= -70) return "Proche";
  if (value >= -85) return "À portée";
  return "Loin";
}

/** « à l'instant », « il y a 12 s »… */
export function relativeTime(timestamp) {
  const delta = Date.now() - Number(timestamp || 0);
  if (!Number.isFinite(delta) || delta < 5000) return "à l'instant";
  if (delta < 60_000) return `il y a ${Math.round(delta / 1000)} s`;
  if (delta < 3_600_000) return `il y a ${Math.round(delta / 60_000)} min`;
  return "il y a plus d'une heure";
}

/** Message d'erreur en français à partir du code renvoyé par le plugin. */
export function describeError(error) {
  const code = error && error.code;
  if (code === "unavailable") {
    return "Proximity fonctionne uniquement dans l'application Android SIS.";
  }
  if (code === "permission_denied") {
    return "Autorise le Bluetooth pour SIS dans les réglages du téléphone, puis réessaie.";
  }
  if (code === "bluetooth_off") {
    return "Active le Bluetooth de ton téléphone, puis relance la recherche.";
  }
  if (code === "ble_unsupported" || code === "unsupported") {
    return "Ce téléphone ne gère pas le Bluetooth Low Energy.";
  }
  return (error && error.message) || "La recherche n'a pas pu démarrer. Réessaie.";
}
