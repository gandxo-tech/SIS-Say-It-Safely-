// Validation côté client (confort de l'utilisateur).
// La vraie barrière est dans firestore.rules : ce code peut être contourné.

export const PSEUDO_RE = /^[a-z0-9_]{3,20}$/;
export const BODY_MAX = 5000;

// Retire le @ de tête, les espaces, et met en minuscules.
export function normalizePseudo(raw) {
  return String(raw ?? "").trim().replace(/^@+/, "").toLowerCase();
}

export function isValidPseudo(pseudo) {
  return PSEUDO_RE.test(pseudo);
}

// Retourne le texte nettoyé, ou null s'il est invalide.
// Supprime les caractères de contrôle (sauf retour à la ligne et tabulation).
export function cleanBody(raw) {
  const text = String(raw ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (text.length < 1 || text.length > BODY_MAX) return null;
  return text;
}

// À n'utiliser que si du HTML est vraiment nécessaire.
// Pour afficher un message, préfère toujours element.textContent = message.
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
