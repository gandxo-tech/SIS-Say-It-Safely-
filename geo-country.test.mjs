import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isCountryCode,
  normalizeCountryCode,
  pickCountry,
  countryName,
  readCachedCountry,
  clearCachedCountry
} from "./geo-country.js";

test("code pays : seulement deux lettres majuscules", () => {
  assert.equal(isCountryCode("FR"), true);
  assert.equal(isCountryCode("fr"), false);
  assert.equal(isCountryCode("FRA"), false);
  assert.equal(isCountryCode(""), false);
  assert.equal(isCountryCode(null), false);
  assert.equal(isCountryCode(42), false);
});

test("normalisation : espaces et minuscules acceptés, noms rejetés", () => {
  assert.equal(normalizeCountryCode(" bj "), "BJ");
  assert.equal(normalizeCountryCode("Benin"), "");
  assert.equal(normalizeCountryCode(undefined), "");
});

test("lecture des réponses GeoJS et ipapi.co", () => {
  assert.equal(pickCountry({ country: "Benin", country_code: "BJ" }), "BJ");
  assert.equal(pickCountry({ country_name: "France", country_code: "FR" }), "FR");
  assert.equal(pickCountry({ country: "FR" }), "FR");
  assert.equal(pickCountry({ country: "Bénin" }), "");
  assert.equal(pickCountry({ country: 42 }), "");
  assert.equal(pickCountry(null), "");
});

test("nom du pays en français, repli sur le code", () => {
  assert.equal(countryName("FR"), "France");
  assert.equal(countryName("bj").length > 2, true);
  assert.equal(countryName(""), "");
  assert.equal(countryName("Benin"), "");
});

test("cache pays : lecture, expiration et vidage", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };

  store.set("sis_geo_country_v1", JSON.stringify({ code: "BJ", at: Date.now() }));
  assert.equal(readCachedCountry(), "BJ");

  assert.equal(readCachedCountry(Date.now() + 8 * 24 * 60 * 60 * 1000), "");

  store.set("sis_geo_country_v1", JSON.stringify({ code: "benin", at: Date.now() }));
  assert.equal(readCachedCountry(), "");

  clearCachedCountry();
  assert.equal(readCachedCountry(), "");

  delete globalThis.localStorage;
});
