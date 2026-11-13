import test from "node:test";
import assert from "node:assert/strict";
import {
  SHARE_THEMES,
  PRO_THEMES,
  SHARE_FONTS,
  SHARE_HOOKS,
  LEADERBOARD_HOOKS,
  SHARE_NETWORKS,
  SHARE_COMBOS,
  getAllShareThemes,
  getThemeById,
  getFontById,
  isProTheme,
  canUseProThemes,
  getNetworkById,
  buildWhatsAppShareUrl,
  stepIndex,
  getComboAt,
  findComboIndex
} from "./share-canvas.js";

test("SHARE_THEMES et PRO_THEMES proposent des thèmes variés et sans doublons", () => {
  assert.ok(SHARE_THEMES.length >= 6);
  assert.equal(PRO_THEMES.length, 3);
  const all = getAllShareThemes();
  const ids = new Set(all.map((t) => t.id));
  assert.equal(ids.size, SHARE_THEMES.length + PRO_THEMES.length);
  assert.equal(getThemeById("editorial-creme").name, "Éditorial");
  assert.equal(getThemeById("or-imperial").isPro, true);
  assert.equal(getThemeById("inexistant").id, SHARE_THEMES[0].id);
});

test("SHARE_FONTS propose des polices variées pour les cartes Story et 9:6", () => {
  assert.ok(SHARE_FONTS.length >= 5);
  const ids = new Set(SHARE_FONTS.map((f) => f.id));
  assert.equal(ids.size, SHARE_FONTS.length);
  assert.equal(getFontById("anton").name, "Impact");
  assert.equal(getFontById("playfair").name, "Édito Serif");
  assert.equal(getFontById("inexistant").id, SHARE_FONTS[0].id);
});

test("canUseProThemes réserve les Cartes Pro uniquement au Top 3", () => {
  assert.equal(canUseProThemes(1), true);
  assert.equal(canUseProThemes(2), true);
  assert.equal(canUseProThemes(3), true);
  assert.equal(canUseProThemes(4), false);
  assert.equal(canUseProThemes(0), false);
  assert.equal(canUseProThemes(null), false);
  assert.equal(isProTheme("or-imperial"), true);
  assert.equal(isProTheme("nuit-sis"), false);
});

test("SHARE_COMBOS et stepIndex permettent de balayer circulairement", () => {
  assert.equal(SHARE_COMBOS.length, 9);
  assert.equal(stepIndex(0, -1, SHARE_COMBOS.length), SHARE_COMBOS.length - 1);
  assert.equal(stepIndex(SHARE_COMBOS.length - 1, 1, SHARE_COMBOS.length), 0);
  assert.equal(getComboAt(0).themeId, "nuit-sis");
  assert.equal(findComboIndex("or-imperial", "playfair"), 6);
  assert.equal(findComboIndex("editorial-creme", "anton"), 1);
});

test("SHARE_NETWORKS couvre WhatsApp, Instagram, TikTok et Snapchat", () => {
  const ids = SHARE_NETWORKS.map((n) => n.id);
  assert.deepEqual(ids, ["whatsapp", "instagram", "tiktok", "snapchat"]);
  const wa = getNetworkById("whatsapp");
  assert.ok(wa.steps.length >= 3);
  assert.match(wa.stickerLabel, /WHATSAPP/);
});

test("buildWhatsAppShareUrl inclut le hook et le lien officiel Vercel", () => {
  const url = buildWhatsAppShareUrl("@Exauce_G", SHARE_HOOKS[0]);
  assert.match(url, /^https:\/\/wa\.me\/\?text=/);
  const decoded = decodeURIComponent(url.split("text=")[1]);
  assert.match(decoded, /Dis-moi ce que tu penses vraiment de moi\./);
  assert.match(decoded, /https:\/\/sis-say-it-safely-pi\.vercel\.app\/\?to=exauce_g/);
});

test("SHARE_HOOKS et LEADERBOARD_HOOKS contiennent des accroches non vides", () => {
  assert.ok(SHARE_HOOKS.length >= 4);
  assert.ok(LEADERBOARD_HOOKS.length >= 3);
  for (const h of [...SHARE_HOOKS, ...LEADERBOARD_HOOKS]) {
    assert.ok(h.trim().length > 10);
  }
});
