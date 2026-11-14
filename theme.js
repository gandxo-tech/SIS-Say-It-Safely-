// Thème clair / sombre / automatique, réglable depuis Mon compte.
// Le choix est stocké localement et appliqué à toutes les pages SIS.
const KEY = "sis-theme";
const VALID = ["light", "dark", "auto"];

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (VALID.includes(saved)) return saved;
  } catch (e) {
    // stockage indisponible : on suit le système
  }
  return "auto";
}

export function setTheme(theme) {
  const value = VALID.includes(theme) ? theme : "auto";
  try {
    localStorage.setItem(KEY, value);
  } catch (e) {
    // stockage indisponible : le choix ne survivra pas au rechargement
  }
  applyTheme(value);
  return value;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const value = VALID.includes(theme) ? theme : "auto";
  if (value === "auto") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "light dark";
  } else {
    root.setAttribute("data-theme", value);
    root.style.colorScheme = value;
  }
  // La barre du navigateur suit le thème affiché
  const dark = value === "dark" ||
    (value === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", dark ? "#07122B" : "#F3F8FF");
  });
}

// Un seul jeu de règles explicites, plus spécifique que :root et que la
// requête système, pour que le choix manuel gagne sur les préférences.
const CSS = `
html[data-theme="dark"] {
  --bg: #07122B;
  --card-bg: #0E1D42;
  --surface: #0E1D42;
  --text: #EEF4FF;
  --ink: #EEF4FF;
  --text-secondary: #8FA3CC;
  --soft: #8FA3CC;
  --border: rgba(238, 244, 255, .12);
  --line: rgba(238, 244, 255, .10);
  --chip: #142654;
  --accent: #7DB6FF;
  --accent-secondary: #4DB5FF;
  --brand: #7DB6FF;
  --tint: rgba(77, 181, 255, .14);
  --ring: rgba(77, 181, 255, .40);
  --ok: #7DB6FF;
  --err: #BBD6FF;
  --err-bg: rgba(77, 181, 255, .14);
  --gold: #FBBF24;
  --silver: #CBD5E1;
  --bronze: #F59E0B;
  --shadow: 0 12px 28px -16px rgba(0, 0, 0, .65);
  --shadow-hover: 0 18px 40px -18px rgba(0, 0, 0, .75);
  --sh-card: 0 18px 44px -14px rgba(0, 0, 0, .6), 0 2px 10px rgba(0, 0, 0, .35);
  --sh-btn: 0 10px 24px -8px rgba(47, 123, 245, .6);
}

html[data-theme="light"] {
  --bg: #F3F8FF;
  --card-bg: #FFFFFF;
  --surface: #FFFFFF;
  --text: #0A1B40;
  --ink: #0A1B40;
  --text-secondary: #5B6C8F;
  --soft: #5B6C8F;
  --border: rgba(10, 27, 64, .12);
  --line: rgba(10, 27, 64, .09);
  --chip: #E8F0FE;
  --accent: #1747C8;
  --accent-secondary: #2F7BF5;
  --brand: #1747C8;
  --tint: rgba(47, 123, 245, .10);
  --ring: rgba(47, 123, 245, .35);
  --ok: #1747C8;
  --err: #0A2A8F;
  --err-bg: rgba(23, 71, 200, .09);
  --gold: #D97706;
  --silver: #64748B;
  --bronze: #B45309;
  --shadow: 0 10px 24px -14px rgba(10, 27, 64, .28);
  --shadow-hover: 0 16px 34px -16px rgba(10, 27, 64, .35);
  --sh-card: 0 18px 40px -16px rgba(23, 71, 200, .28), 0 2px 10px rgba(10, 27, 64, .05);
  --sh-btn: 0 10px 22px -8px rgba(23, 71, 200, .55);
}
`;

function injectStyle() {
  if (document.getElementById("sis-theme-style")) return;
  const style = document.createElement("style");
  style.id = "sis-theme-style";
  style.textContent = CSS;
  document.head.append(style);
}

injectStyle();
applyTheme(getTheme());

// Suit le système tant que l'utilisateur n'a pas choisi explicitement
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getTheme() === "auto") applyTheme("auto");
});
