import {
  PUBLIC_ORIGIN,
  publicProfileLink,
  publicLeaderboardLink,
  formatMessageCount,
  formatShortCount,
  safePhotoUrl,
  normalizePseudo
} from "./leaderboard-utils.js";

export const SHARE_FONTS = [
  {
    id: "space-grotesk",
    name: "Space",
    css: '"Space Grotesk", sans-serif',
    weight: "700",
    loadSpec: '700 48px "Space Grotesk"'
  },
  {
    id: "anton",
    name: "Impact",
    css: '"Anton", sans-serif',
    weight: "400",
    loadSpec: '400 48px "Anton"'
  },
  {
    id: "playfair",
    name: "Édito Serif",
    css: '"Playfair Display", serif',
    weight: "800",
    loadSpec: '800 48px "Playfair Display"'
  },
  {
    id: "bricolage",
    name: "Grotesque",
    css: '"Bricolage Grotesque", sans-serif',
    weight: "800",
    loadSpec: '800 48px "Bricolage Grotesque"'
  },
  {
    id: "jetbrains",
    name: "Mono",
    css: '"JetBrains Mono", monospace',
    weight: "700",
    loadSpec: '700 44px "JetBrains Mono"'
  }
];

export const SHARE_THEMES = [
  {
    id: "nuit-sis",
    name: "Nuit SIS",
    isPro: false,
    bgTop: "#0A2A8F",
    bgMid: "#1747C8",
    bgBottom: "#4DB5FF",
    orb1: "rgba(255, 255, 255, 0.14)",
    orb2: "rgba(10, 27, 64, 0.24)",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(255, 255, 255, 0.5)",
    cardInk: "#0A1B40",
    cardSoft: "#5B6C8F",
    accent: "#1747C8",
    accentText: "#FFFFFF",
    bandBg: "linear-gradient",
    bandStart: "#0F34A6",
    bandEnd: "#2F7BF5",
    bandText: "#FFFFFF",
    chipBg: "#E8F0FE",
    chipInk: "#1747C8",
    pillBg: "#0A1B40",
    pillText: "#FFFFFF",
    pillAccent: "#7DB6FF",
    pillSub: "rgba(255, 255, 255, 0.78)",
    headerText: "#FFFFFF",
    pattern: "rings",
    isLightBg: false
  },
  {
    id: "editorial-creme",
    name: "Éditorial",
    isPro: false,
    bgTop: "#F8F4EC",
    bgMid: "#EFE7D8",
    bgBottom: "#E3D6C1",
    orb1: "rgba(225, 29, 72, 0.08)",
    orb2: "rgba(17, 24, 39, 0.06)",
    cardBg: "#FFFFFF",
    cardBorder: "#111827",
    cardInk: "#111827",
    cardSoft: "#4B5563",
    accent: "#E11D48",
    accentText: "#FFFFFF",
    bandStart: "#111827",
    bandEnd: "#27272A",
    bandText: "#FFFFFF",
    chipBg: "#FEE2E2",
    chipInk: "#BE123C",
    pillBg: "#111827",
    pillText: "#F8F4EC",
    pillAccent: "#FB7185",
    pillSub: "rgba(248, 244, 236, 0.78)",
    headerText: "#111827",
    pattern: "frame",
    isLightBg: true
  },
  {
    id: "aurore-solaire",
    name: "Aurore",
    isPro: false,
    bgTop: "#BE123C",
    bgMid: "#F97316",
    bgBottom: "#FACC15",
    orb1: "rgba(255, 255, 255, 0.16)",
    orb2: "rgba(124, 45, 18, 0.18)",
    cardBg: "#11131C",
    cardBorder: "rgba(255, 255, 255, 0.18)",
    cardInk: "#F8FAFC",
    cardSoft: "#CBD5E1",
    accent: "#FB923C",
    accentText: "#11131C",
    bandStart: "#EA580C",
    bandEnd: "#F59E0B",
    bandText: "#11131C",
    chipBg: "rgba(251, 146, 60, 0.2)",
    chipInk: "#FDBA74",
    pillBg: "#FFFFFF",
    pillText: "#11131C",
    pillAccent: "#C2410C",
    pillSub: "rgba(17, 19, 28, 0.72)",
    headerText: "#FFFFFF",
    pattern: "sun",
    isLightBg: false
  },
  {
    id: "neon-nocturne",
    name: "Nocturne",
    isPro: false,
    bgTop: "#060812",
    bgMid: "#0B132B",
    bgBottom: "#0F2942",
    orb1: "rgba(34, 211, 238, 0.16)",
    orb2: "rgba(52, 211, 153, 0.14)",
    cardBg: "#0F172A",
    cardBorder: "#22D3EE",
    cardInk: "#F1F5F9",
    cardSoft: "#94A3B8",
    accent: "#22D3EE",
    accentText: "#060812",
    bandStart: "#0891B2",
    bandEnd: "#22D3EE",
    bandText: "#060812",
    chipBg: "rgba(34, 211, 238, 0.16)",
    chipInk: "#67E8F9",
    pillBg: "#22D3EE",
    pillText: "#060812",
    pillAccent: "#083344",
    pillSub: "rgba(6, 8, 18, 0.78)",
    headerText: "#F1F5F9",
    pattern: "grid",
    isLightBg: false
  },
  {
    id: "emeraude",
    name: "Émeraude",
    isPro: false,
    bgTop: "#064E3B",
    bgMid: "#059669",
    bgBottom: "#6EE7B7",
    orb1: "rgba(255, 255, 255, 0.14)",
    orb2: "rgba(6, 78, 59, 0.2)",
    cardBg: "#FFFDF8",
    cardBorder: "rgba(6, 78, 59, 0.2)",
    cardInk: "#062C22",
    cardSoft: "#3F6258",
    accent: "#059669",
    accentText: "#FFFFFF",
    bandStart: "#047857",
    bandEnd: "#10B981",
    bandText: "#FFFFFF",
    chipBg: "#D1FAE5",
    chipInk: "#065F46",
    pillBg: "#062C22",
    pillText: "#ECFDF5",
    pillAccent: "#6EE7B7",
    pillSub: "rgba(236, 253, 245, 0.78)",
    headerText: "#FFFFFF",
    pattern: "waves",
    isLightBg: false
  },
  {
    id: "minimal-ardoise",
    name: "Ardoise",
    isPro: false,
    bgTop: "#0F172A",
    bgMid: "#1E293B",
    bgBottom: "#334155",
    orb1: "rgba(148, 163, 184, 0.14)",
    orb2: "rgba(15, 23, 42, 0.35)",
    cardBg: "rgba(255, 255, 255, 0.97)",
    cardBorder: "rgba(255, 255, 255, 0.55)",
    cardInk: "#0F172A",
    cardSoft: "#475569",
    accent: "#2F7BF5",
    accentText: "#FFFFFF",
    bandStart: "#1E293B",
    bandEnd: "#334155",
    bandText: "#F8FAFC",
    chipBg: "#E2E8F0",
    chipInk: "#1E293B",
    pillBg: "#0F172A",
    pillText: "#F8FAFC",
    pillAccent: "#60A5FA",
    pillSub: "rgba(248, 250, 252, 0.78)",
    headerText: "#F8FAFC",
    pattern: "slash",
    isLightBg: false
  }
];

export const PRO_THEMES = [
  {
    id: "or-imperial",
    name: "Or Impérial",
    isPro: true,
    bgTop: "#140E05",
    bgMid: "#3B2809",
    bgBottom: "#B47B17",
    orb1: "rgba(251, 191, 36, 0.18)",
    orb2: "rgba(245, 158, 11, 0.14)",
    cardBg: "#FFFDF7",
    cardBorder: "#D97706",
    cardInk: "#1A1205",
    cardSoft: "#78551A",
    accent: "#D97706",
    accentText: "#FFFFFF",
    bandStart: "#92400E",
    bandEnd: "#F59E0B",
    bandText: "#FFFDF7",
    chipBg: "#FEF3C7",
    chipInk: "#92400E",
    pillBg: "#1A1205",
    pillText: "#FFFDF7",
    pillAccent: "#FBBF24",
    pillSub: "rgba(255, 253, 247, 0.78)",
    headerText: "#FEF3C7",
    pattern: "halftone",
    isLightBg: false
  },
  {
    id: "obsidienne-pro",
    name: "Obsidienne Pro",
    isPro: true,
    bgTop: "#05070E",
    bgMid: "#101B38",
    bgBottom: "#1E3A8A",
    orb1: "rgba(147, 197, 253, 0.15)",
    orb2: "rgba(251, 191, 36, 0.12)",
    cardBg: "#0B1120",
    cardBorder: "#FBBF24",
    cardInk: "#F8FAFC",
    cardSoft: "#CBD5E1",
    accent: "#FBBF24",
    accentText: "#05070E",
    bandStart: "#172554",
    bandEnd: "#1D4ED8",
    bandText: "#F8FAFC",
    chipBg: "rgba(251, 191, 36, 0.18)",
    chipInk: "#FDE68A",
    pillBg: "#FBBF24",
    pillText: "#05070E",
    pillAccent: "#1E3A8A",
    pillSub: "rgba(5, 7, 14, 0.78)",
    headerText: "#F8FAFC",
    pattern: "rays",
    isLightBg: false
  },
  {
    id: "platine-edition",
    name: "Platine Édition",
    isPro: true,
    bgTop: "#F8FAFC",
    bgMid: "#E2E8F0",
    bgBottom: "#94A3B8",
    orb1: "rgba(15, 23, 42, 0.08)",
    orb2: "rgba(23, 71, 200, 0.1)",
    cardBg: "#0F172A",
    cardBorder: "#64748B",
    cardInk: "#F8FAFC",
    cardSoft: "#CBD5E1",
    accent: "#38BDF8",
    accentText: "#0F172A",
    bandStart: "#CBD5E1",
    bandEnd: "#F8FAFC",
    bandText: "#0F172A",
    chipBg: "rgba(56, 189, 248, 0.16)",
    chipInk: "#7DD3FC",
    pillBg: "#FFFFFF",
    pillText: "#0F172A",
    pillAccent: "#1747C8",
    pillSub: "rgba(15, 23, 42, 0.74)",
    headerText: "#0F172A",
    pattern: "stripes",
    isLightBg: true
  }
];

// Accroches par défaut : adresse directe, effort minimal, anonymat rassurant.
// Chaque phrase lève une raison de ne pas répondre (peur d'être reconnu, effort).
export const SHARE_HOOKS = [
  "Dis-moi ce que tu penses vraiment de moi.",
  "Tu as 10 secondes ? Écris ce que tu n'oses pas me dire en face.",
  "Une seule question : que penses-tu de moi quand je ne suis pas là ?",
  "Balance un aveu, personne ne saura que c'est toi.",
  "Note-moi sur 10, sans filtre et sans signature."
];

export const LEADERBOARD_HOOKS = [
  "Qui reçoit le plus de messages anonymes ?",
  "Viens voir mon rang et tente de me dépasser.",
  "Le classement SIS des profils les plus actifs."
];

export const SHARE_NETWORKS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    stickerLabel: "LIEN DIRECT WHATSAPP",
    stickerHint: "Envoie l'affiche en Statut ou partage le lien cliquable",
    steps: [
      "Télécharge ou partage cette affiche dans ton Statut WhatsApp.",
      "Ajoute ton lien en légende ou envoie le message direct avec le bouton WhatsApp ci-dessous.",
      "Chaque réponse reste 100 % anonyme dans ta boîte SIS."
    ]
  },
  {
    id: "instagram",
    label: "Instagram",
    stickerLabel: "COLLER LE STICKER LIEN ICI",
    stickerHint: "Bio + Story Instagram",
    steps: [
      "Copie ton lien SIS puis poste cette affiche en Story Instagram.",
      "Ouvre l'outil Sticker en haut de ta Story et choisis « LIEN ».",
      "Colle ton lien juste sur la zone dédiée en bas de l'affiche."
    ]
  },
  {
    id: "tiktok",
    label: "TikTok",
    stickerLabel: "LIEN DISPONIBLE EN BIO",
    stickerHint: "Ajoute le lien dans Modifier le profil > Site web",
    steps: [
      "Copie ton lien et colle-le dans ta bio TikTok (Modifier le profil).",
      "Publie cette affiche en Story ou en fond de vidéo TikTok.",
      "Invite tes abonnés à cliquer sur le lien dans ta bio."
    ]
  },
  {
    id: "snapchat",
    label: "Snapchat",
    stickerLabel: "AJOUTER LE LIEN TROMBONE",
    stickerHint: "Story Snapchat",
    steps: [
      "Partage cette affiche sur Snapchat.",
      "Touche l'icône Trombone à droite de l'écran.",
      "Colle ton lien SIS et publie ta Story."
    ]
  }
];

export const SHARE_COMBOS = [
  { id: "nuit-space", themeId: "nuit-sis", fontId: "space-grotesk", isPro: false },
  { id: "editorial-serif", themeId: "editorial-creme", fontId: "playfair", isPro: false },
  { id: "aurore-impact", themeId: "aurore-solaire", fontId: "anton", isPro: false },
  { id: "nocturne-mono", themeId: "neon-nocturne", fontId: "jetbrains", isPro: false },
  { id: "emeraude-grotesque", themeId: "emeraude", fontId: "bricolage", isPro: false },
  { id: "ardoise-space", themeId: "minimal-ardoise", fontId: "space-grotesk", isPro: false },
  { id: "or-serif", themeId: "or-imperial", fontId: "playfair", isPro: true },
  { id: "obsidienne-impact", themeId: "obsidienne-pro", fontId: "anton", isPro: true },
  { id: "platine-grotesque", themeId: "platine-edition", fontId: "bricolage", isPro: true }
];

export function stepIndex(currentIndex, delta, length) {
  const total = Math.max(1, Math.floor(Number(length) || 1));
  const cur = Math.floor(Number(currentIndex) || 0);
  const d = Math.floor(Number(delta) || 0);
  return ((cur + d) % total + total) % total;
}

export function getComboAt(index) {
  return SHARE_COMBOS[stepIndex(index, 0, SHARE_COMBOS.length)];
}

export function findComboIndex(themeId, fontId) {
  const exact = SHARE_COMBOS.findIndex((c) => c.themeId === themeId && c.fontId === fontId);
  if (exact >= 0) return exact;
  const byTheme = SHARE_COMBOS.findIndex((c) => c.themeId === themeId);
  return byTheme >= 0 ? byTheme : 0;
}

export function attachSwipeHandler(el, { onPrev, onNext } = {}) {
  if (!el) return () => {};
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    tracking = true;
  };
  const onUp = (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) >= 34 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (dx < 0 && onNext) onNext();
      else if (dx > 0 && onPrev) onPrev();
    }
  };
  const onCancel = () => { tracking = false; };

  el.addEventListener("pointerdown", onDown, { passive: true });
  el.addEventListener("pointerup", onUp, { passive: true });
  el.addEventListener("pointercancel", onCancel, { passive: true });

  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onCancel);
  };
}

export function getAllShareThemes() {
  return [...SHARE_THEMES, ...PRO_THEMES];
}

export function getThemeById(id) {
  return getAllShareThemes().find((t) => t.id === id) || SHARE_THEMES[0];
}

export function isProTheme(id) {
  return PRO_THEMES.some((t) => t.id === id);
}

export function canUseProThemes(rank) {
  const n = Number(rank);
  return Number.isInteger(n) && n >= 1 && n <= 3;
}

export function getFontById(id) {
  return SHARE_FONTS.find((f) => f.id === id) || SHARE_FONTS[0];
}

export function getNetworkById(id) {
  return SHARE_NETWORKS.find((n) => n.id === id) || SHARE_NETWORKS[0];
}

export function buildWhatsAppShareUrl(pseudo, hookText) {
  const link = publicProfileLink(pseudo);
  const hook = String(hookText || SHARE_HOOKS[0]).trim();
  const msg = `${hook}\n\nÉcris-moi en 100 % anonyme ici :\n${link}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function wrapCanvasWords(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || "").split("\n");
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function ensureCanvasFontsLoaded() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all(
      SHARE_FONTS.map((f) => document.fonts.load(f.loadSpec))
    );
  } catch (e) {
    // Meilleur effort si police indisponible hors ligne
  }
  try {
    await document.fonts.ready;
  } catch (e) {}
}

function drawBackdrop(ctx, w, h, theme) {
  const grad = ctx.createLinearGradient(0, 0, w * 0.25, h);
  grad.addColorStop(0, theme.bgTop);
  grad.addColorStop(0.5, theme.bgMid);
  grad.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (theme.pattern === "grid") {
    ctx.strokeStyle = "rgba(34, 211, 238, 0.09)";
    ctx.lineWidth = 2;
    const step = 84;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (theme.pattern === "frame") {
    ctx.strokeStyle = "rgba(17, 24, 39, 0.16)";
    ctx.lineWidth = 3;
    roundRect(ctx, 42, 42, w - 84, h - 84, 34);
    ctx.stroke();
    ctx.strokeStyle = "rgba(225, 29, 72, 0.15)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, 60, 60, w - 120, h - 120, 26);
    ctx.stroke();
  } else if (theme.pattern === "slash") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.35);
    ctx.fillRect(-w, -200, w * 2, 340);
    ctx.fillRect(-w, 220, w * 2, 160);
  } else if (theme.pattern === "halftone") {
    ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
    const spacing = 46;
    for (let y = 24; y < h; y += spacing) {
      for (let x = 24; x < w; x += spacing) {
        const dist = Math.hypot(x - w / 2, y - h * 0.42) / Math.max(w, h);
        const r = Math.max(1.5, 5.2 * (1 - dist));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme.pattern === "rays") {
    ctx.translate(w / 2, h * 0.4);
    ctx.fillStyle = "rgba(251, 191, 36, 0.055)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-90, -h * 1.4);
      ctx.lineTo(90, -h * 1.4);
      ctx.closePath();
      ctx.fill();
    }
  } else if (theme.pattern === "stripes") {
    ctx.strokeStyle = "rgba(15, 23, 42, 0.075)";
    ctx.lineWidth = 18;
    for (let x = -h; x < w + h; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h * 0.45, h);
      ctx.stroke();
    }
  } else if (theme.pattern === "waves") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 3;
    for (let y = 140; y < h; y += 160) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 40) {
        const wy = y + Math.sin(x * 0.012 + y * 0.01) * 28;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = theme.orb1;
    ctx.beginPath();
    ctx.arc(w * 0.84, h * 0.16, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.orb2;
    ctx.beginPath();
    ctx.arc(w * 0.16, h * 0.84, 340, 0, Math.PI * 2);
    ctx.fill();

    if (theme.pattern === "rings" || theme.pattern === "sun") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.44, 440, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.44, 310, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSisBrandHeader(ctx, w, y, theme, rank = null) {
  const showPro = theme.isPro || canUseProThemes(rank);
  const label = showPro && canUseProThemes(rank)
    ? `TOP ${rank} PRO · SIS`
    : (theme.isPro ? "CARTE PRO · TOP 3 SIS" : "SIS · 100 % ANONYME");
  const pillW = showPro ? 430 : 370;
  const pillH = 68;
  const x = (w - pillW) / 2;

  ctx.save();
  ctx.fillStyle = theme.isLightBg ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.16)";
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();

  if (theme.isPro) {
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    roundRect(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.stroke();
  }

  ctx.fillStyle = theme.headerText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '700 28px "Space Grotesk", sans-serif';
  ctx.fillText(label, w / 2, y + pillH / 2 + 1);
  ctx.restore();
}

async function loadCorsImage(url) {
  const safe = safePhotoUrl(url);
  if (!safe) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const timer = setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = safe;
  });
}

function drawAvatarCircle(ctx, cx, cy, radius, img, pseudo, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    const minSide = Math.min(img.width, img.height) || 1;
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    const g = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    g.addColorStop(0, theme.bgMid);
    g.addColorStop(1, theme.accent);
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(radius * 0.88)}px "Space Grotesk", sans-serif`;
    ctx.fillText((pseudo || "?").charAt(0).toUpperCase(), cx, cy + 2);
  }
  ctx.restore();
}

function fitTextBlock(ctx, text, maxWidth, maxLines, startSize, minSize, fontFamily, fontWeight = "700") {
  for (let size = startSize; size >= minSize; size -= 3) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const lines = wrapCanvasWords(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { size, lines, lineHeight: Math.round(size * 1.24) };
    }
  }
  ctx.font = `${fontWeight} ${minSize}px ${fontFamily}`;
  const lines = wrapCanvasWords(ctx, text, maxWidth).slice(0, maxLines);
  return { size: minSize, lines, lineHeight: Math.round(minSize * 1.24) };
}

function drawNglArrowCue(ctx, cx, yTop, yBottom, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.88;

  ctx.beginPath();
  ctx.moveTo(cx - 8, yTop);
  ctx.quadraticCurveTo(cx + 22, (yTop + yBottom) / 2, cx, yBottom - 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 18, yBottom - 26);
  ctx.lineTo(cx, yBottom - 4);
  ctx.lineTo(cx + 18, yBottom - 26);
  ctx.stroke();
  ctx.restore();
}

export async function renderProfileShareCanvas(canvas, options = {}) {
  const {
    pseudo = "pseudo",
    photoURL = "",
    hook = SHARE_HOOKS[0],
    themeId = SHARE_THEMES[0].id,
    fontId = SHARE_FONTS[0].id,
    networkId = "whatsapp",
    rank = null
  } = options;

  const cleanPseudo = normalizePseudo(pseudo) || "pseudo";
  const theme = getThemeById(themeId);
  const font = getFontById(fontId);
  const network = getNetworkById(networkId);
  const w = 1080;
  const h = 1920;

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");

  await ensureCanvasFontsLoaded();
  const avatarImg = await loadCorsImage(photoURL);

  drawBackdrop(ctx, w, h, theme);
  drawSisBrandHeader(ctx, w, 236, theme, rank);

  // Carte NGL authentique en 2 blocs bien positionnés (zones sûres Stories respectées)
  const cardX = 92;
  const cardW = w - 184;
  const cardY = 360;
  const cardH = 696;
  const bandH = 224;

  ctx.save();
  ctx.shadowColor = "rgba(5, 16, 48, 0.3)";
  ctx.shadowBlur = 52;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = theme.cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 54);
  ctx.fill();
  ctx.restore();

  // Bande supérieure façon NGL
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + 54, cardY);
  ctx.lineTo(cardX + cardW - 54, cardY);
  ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + 54, 54);
  ctx.lineTo(cardX + cardW, cardY + bandH);
  ctx.lineTo(cardX, cardY + bandH);
  ctx.lineTo(cardX, cardY + 54);
  ctx.arcTo(cardX, cardY, cardX + 54, cardY, 54);
  ctx.closePath();
  const bandGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + bandH);
  bandGrad.addColorStop(0, theme.bandStart);
  bandGrad.addColorStop(1, theme.bandEnd);
  ctx.fillStyle = bandGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = theme.isPro ? 4 : 3;
  roundRect(ctx, cardX, cardY, cardW, cardH, 54);
  ctx.stroke();
  ctx.restore();

  // Avatar à gauche + @pseudo + mention pro éventuelle
  drawAvatarCircle(ctx, cardX + 124, cardY + bandH / 2, 62, avatarImg, cleanPseudo, theme);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.bandText;
  ctx.font = '700 40px "Space Grotesk", sans-serif';
  ctx.fillText(`@${cleanPseudo}`, cardX + 218, cardY + bandH / 2 - 22, cardW - 260);

  ctx.globalAlpha = 0.88;
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
  const bandSubtitle = canUseProThemes(rank)
    ? `Classé #${rank} · Membre Top 3 Pro`
    : "Envoie-moi un message anonyme";
  ctx.fillText(bandSubtitle, cardX + 218, cardY + bandH / 2 + 26, cardW - 260);
  ctx.restore();

  // Corps du Hook avec la police sélectionnée
  const hookText = String(hook || SHARE_HOOKS[0]).trim();
  const fitted = fitTextBlock(ctx, hookText, cardW - 116, 4, 60, 36, font.css, font.weight);
  const totalTextH = fitted.lines.length * fitted.lineHeight;
  let textY = cardY + bandH + (cardH - bandH - totalTextH) / 2 + fitted.size * 0.45;

  ctx.save();
  ctx.fillStyle = theme.cardInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${font.weight} ${fitted.size}px ${font.css}`;
  for (const line of fitted.lines) {
    ctx.fillText(line, w / 2, textY);
    textY += fitted.lineHeight;
  }
  ctx.restore();

  // Flèche visuelle NGL entre la carte question et le sticker lien
  drawNglArrowCue(ctx, w / 2, 1086, 1184, theme.headerText);

  // Bloc 2 : Zone Sticker / Lien spécifique au réseau
  const stickerX = 112;
  const stickerW = w - 224;
  const stickerY = 1212;
  const stickerH = 264;

  ctx.save();
  ctx.fillStyle = theme.pillBg;
  roundRect(ctx, stickerX, stickerY, stickerW, stickerH, 42);
  ctx.fill();

  ctx.strokeStyle = theme.pillAccent;
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 3;
  roundRect(ctx, stickerX + 14, stickerY + 14, stickerW - 28, stickerH - 28, 30);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.pillAccent;
  ctx.font = '700 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(network.stickerLabel, w / 2, stickerY + 72);

  const shortUrl = `${PUBLIC_ORIGIN.replace(/^https?:\/\//, "")}/?to=${cleanPseudo}`;
  ctx.fillStyle = theme.pillText;
  ctx.font = '700 32px "Space Grotesk", sans-serif';
  ctx.fillText(shortUrl, w / 2, stickerY + 140, stickerW - 80);

  ctx.fillStyle = theme.pillSub;
  ctx.font = '600 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(network.stickerHint, w / 2, stickerY + 202, stickerW - 80);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = theme.headerText;
  ctx.globalAlpha = 0.82;
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("Aucune identité enregistrée · SIS", w / 2, 1554);
  ctx.restore();

  return canvas;
}

export async function renderLeaderboardShareCanvas(canvas, options = {}) {
  const {
    rankedUsers = [],
    myEntry = null,
    hook = LEADERBOARD_HOOKS[0],
    themeId = SHARE_THEMES[0].id,
    fontId = SHARE_FONTS[0].id
  } = options;

  const theme = getThemeById(themeId);
  const font = getFontById(fontId);
  // Format droit 9:6 (paysage 1350 x 900, grille orthogonale 0 deg)
  const w = 1350;
  const h = 900;

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");

  await ensureCanvasFontsLoaded();
  drawBackdrop(ctx, w, h, theme);

  // Colonne gauche : Identité SIS, Hook, Opportunité Top 3 Pro, URL
  const leftX = 64;
  const leftW = 500;

  ctx.save();
  ctx.fillStyle = theme.isLightBg ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.16)";
  roundRect(ctx, leftX, 64, 316, 56, 28);
  ctx.fill();
  ctx.fillStyle = theme.headerText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '700 23px "Space Grotesk", sans-serif';
  ctx.fillText(theme.isPro ? "SIS · CARTE PRO 9:6" : "SIS · CLASSEMENT 9:6", leftX + 158, 92);
  ctx.restore();

  const hookFit = fitTextBlock(ctx, hook, leftW, 4, 52, 34, font.css, font.weight);
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.headerText;
  ctx.font = `${font.weight} ${hookFit.size}px ${font.css}`;
  let hy = 156;
  for (const line of hookFit.lines) {
    ctx.fillText(line, leftX, hy);
    hy += hookFit.lineHeight;
  }
  ctx.restore();

  // Encart Opportunités Top 3 Pro en bas à gauche
  ctx.save();
  ctx.fillStyle = theme.isLightBg ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.14)";
  roundRect(ctx, leftX, 558, leftW, 170, 26);
  ctx.fill();
  ctx.strokeStyle = theme.isLightBg ? "rgba(15, 23, 42, 0.14)" : "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 2;
  roundRect(ctx, leftX, 558, leftW, 170, 26);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.headerText;
  ctx.font = '700 22px "Space Grotesk", sans-serif';
  ctx.fillText("Opportunités Top 3 Pro", leftX + 26, 584);

  ctx.globalAlpha = 0.88;
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("• Cartes Pro exclusives débloquées", leftX + 26, 624);
  ctx.fillText("• Badge Top 3 visible sur envoyer.html", leftX + 26, 656);
  ctx.fillText("• Mise en avant sur l'affiche 9:6", leftX + 26, 688);
  ctx.restore();

  // Lien classement droit en bas à gauche
  ctx.save();
  ctx.fillStyle = theme.pillBg;
  roundRect(ctx, leftX, 756, leftW, 80, 24);
  ctx.fill();
  ctx.fillStyle = theme.pillText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '700 23px "Space Grotesk", sans-serif';
  ctx.fillText(publicLeaderboardLink().replace(/^https?:\/\//, ""), leftX + leftW / 2, 796, leftW - 36);
  ctx.restore();

  // Colonne droite : Panneau droit du classement (Top 5 + position utilisateur)
  const cardX = 604;
  const cardY = 64;
  const cardW = w - cardX - 64;
  const cardH = 772;

  ctx.save();
  ctx.shadowColor = "rgba(5, 16, 48, 0.28)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = theme.cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = theme.isPro ? 3.5 : 2.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();
  ctx.restore();

  // En-tête panneau droit
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.cardInk;
  ctx.font = '700 30px "Space Grotesk", sans-serif';
  ctx.fillText("Top actifs SIS", cardX + 36, cardY + 56);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.accent;
  ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("Format droit 9:6", cardX + cardW - 36, cardY + 56);

  ctx.strokeStyle = theme.chipBg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, cardY + 96);
  ctx.lineTo(cardX + cardW - 36, cardY + 96);
  ctx.stroke();
  ctx.restore();

  const topList = Array.isArray(rankedUsers) ? rankedUsers.slice(0, 5) : [];
  let rowY = cardY + 116;
  const rowH = 102;

  if (topList.length === 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.cardSoft;
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("Le classement attend ses premiers messages.", cardX + cardW / 2, cardY + 340);
    ctx.restore();
  } else {
    topList.forEach((item) => {
      const isTop3 = item.rank >= 1 && item.rank <= 3;
      const isMe = myEntry && item.username === myEntry.username;

      if (isTop3 || isMe) {
        ctx.save();
        ctx.fillStyle = isTop3 ? theme.chipBg : "rgba(47, 123, 245, 0.08)";
        roundRect(ctx, cardX + 28, rowY, cardW - 56, rowH - 12, 20);
        ctx.fill();
        ctx.restore();
      }

      const cy = rowY + (rowH - 12) / 2;
      ctx.save();
      ctx.textBaseline = "middle";

      ctx.textAlign = "left";
      ctx.fillStyle = item.rank === 1 ? "#D97706" : (isTop3 ? theme.accent : theme.cardSoft);
      ctx.font = '700 28px "Space Grotesk", sans-serif';
      ctx.fillText(`#${item.rank}`, cardX + 52, cy);

      ctx.fillStyle = theme.cardInk;
      ctx.font = '700 27px "Space Grotesk", sans-serif';
      const label = `@${item.username}`;
      ctx.fillText(label, cardX + 126, cy, isTop3 ? 276 : 340);

      if (isTop3) {
        ctx.fillStyle = theme.chipInk;
        ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillText("PRO", cardX + 420, cy);
      }

      ctx.textAlign = "right";
      ctx.fillStyle = theme.accent;
      ctx.font = '700 25px "Space Grotesk", sans-serif';
      ctx.fillText(`${formatShortCount(item.messageCount)} msg`, cardX + cardW - 52, cy);
      ctx.restore();

      rowY += rowH;
    });
  }

  // Barre inférieure : Ta position ou statut Top 3
  const barY = cardY + cardH - 116;
  ctx.save();
  ctx.fillStyle = theme.pillBg;
  roundRect(ctx, cardX + 28, barY, cardW - 56, 84, 22);
  ctx.fill();

  ctx.textBaseline = "middle";
  const mcy = barY + 42;
  if (myEntry) {
    const rightText = formatMessageCount(myEntry.messageCount);
    ctx.font = '700 24px "Space Grotesk", sans-serif';
    const rightWidth = ctx.measureText(rightText).width;
    const leftMaxW = Math.max(120, (cardW - 108) - rightWidth - 24);

    ctx.textAlign = "right";
    ctx.fillStyle = theme.pillAccent;
    ctx.fillText(rightText, cardX + cardW - 54, mcy);

    ctx.textAlign = "left";
    ctx.fillStyle = theme.pillText;
    const proNote = canUseProThemes(myEntry.rank) ? " · Top 3 Pro" : "";
    const leftText = `Ma position : #${myEntry.rank} · @${myEntry.username}${proNote}`;
    ctx.fillText(leftText, cardX + 54, mcy, leftMaxW);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = theme.pillText;
    ctx.font = '700 23px "Space Grotesk", sans-serif';
    ctx.fillText("Top 3 débloque les Cartes Pro et le badge sur envoyer.html", cardX + cardW / 2, mcy, cardW - 96);
  }
  ctx.restore();

  return canvas;
}

export async function canvasToPngFile(canvas, filename) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export PNG impossible."))), "image/png");
  });
  return {
    blob,
    file: new File([blob], filename, { type: "image/png" })
  };
}
