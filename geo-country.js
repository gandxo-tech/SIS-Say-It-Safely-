/**
 * Pays de l'utilisateur, déduit de son adresse IP.
 *
 * Deux services publics, sans clé et sans inscription, sont interrogés dans
 * l'ordre : GeoJS puis ipapi.co. Le premier qui répond avec un pays gagne.
 * Seul le pays (code ISO à 2 lettres) est conservé : SIS ne stocke jamais
 * l'adresse IP elle-même.
 */

export const GEO_ENDPOINTS = [
  "https://get.geojs.io/v1/ip/geo.json",
  "https://ipapi.co/json/"
];

const CACHE_KEY = "sis_geo_country_v1";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/** Un code pays valide : deux lettres majuscules (ISO 3166-1 alpha-2). */
export function isCountryCode(value) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

export function normalizeCountryCode(value) {
  const raw = String(value || "").trim().toUpperCase();
  return isCountryCode(raw) ? raw : "";
}

/**
 * Extrait le code pays d'une réponse d'API, quel que soit son format.
 * `country` peut contenir un nom complet : il n'est retenu que si c'est
 * déjà un code à deux lettres.
 */
export function pickCountry(payload) {
  if (!payload || typeof payload !== "object") return "";
  return (
    normalizeCountryCode(payload.country_code) ||
    normalizeCountryCode(payload.countryCode) ||
    normalizeCountryCode(payload.country)
  );
}

/** Nom du pays en français, ou le code lui-même si l'environnement ne sait pas. */
export function countryName(code) {
  const clean = normalizeCountryCode(code);
  if (!clean) return "";
  try {
    const dn = new Intl.DisplayNames(["fr"], { type: "region" });
    return dn.of(clean) || clean;
  } catch (e) {
    return clean;
  }
}

export function readCachedCountry(now = Date.now()) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (!parsed || !isCountryCode(parsed.code)) return "";
    if (!Number.isFinite(parsed.at) || now - parsed.at > CACHE_TTL) return "";
    return parsed.code;
  } catch (e) {
    return "";
  }
}

function writeCachedCountry(code) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch (e) {
    /* stockage indisponible : on continue sans cache */
  }
}

export function clearCachedCountry() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    /* rien à faire */
  }
}

async function fetchFrom(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return "";
    return pickCountry(await res.json());
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Renvoie le code pays de l'utilisateur, ou "" si aucun service ne répond.
 * Le résultat est mémorisé 7 jours : un visiteur ne déclenche pas un appel
 * réseau à chaque page.
 */
export async function getUserCountry({ force = false, timeoutMs = 6000 } = {}) {
  if (!force) {
    const cached = readCachedCountry();
    if (cached) return cached;
  }

  for (const url of GEO_ENDPOINTS) {
    const code = await fetchFrom(url, timeoutMs);
    if (code) {
      writeCachedCountry(code);
      return code;
    }
  }
  return "";
}
