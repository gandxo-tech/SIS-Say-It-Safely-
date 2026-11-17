// Navigation commune à toutes les pages SIS.
//
// 1. Transitions douces entre les pages (View Transitions quand le WebView les
//    gère, simple fondu sinon) pour éviter le « flash » blanc du changement.
// 2. Préchargement discret des quatre onglets après le premier affichage.
// 3. Bouton retour Android : remonte vers la page parente, et demande une
//    confirmation (double appui) avant de quitter depuis l'accueil.
//
// Aucun bundler ici : le plugin natif Capacitor est lu sur `window.Capacitor`
// quand il existe, donc la version web se comporte exactement comme avant.

const STYLE_ID = "sis-nav-style";

const TABS = ["index.html", "classement.html", "voir.html", "compte.html"];

// Page parente de chaque page : c'est là que ramène le bouton retour.
// `null` = on est sur l'accueil, un appui de plus quitte l'application.
const BACK_TARGET = {
  "index.html": null,
  "classement.html": "index.html",
  "voir.html": "index.html",
  "compte.html": "index.html",
  "envoyer.html": "index.html",
  "pays.html": "classement.html",
  "avis.html": "index.html",
  "conditions.html": "index.html",
  "politiques.html": "index.html",
  "propos.html": "index.html"
};

// Délai pendant lequel un second appui sur retour quitte vraiment l'app.
const EXIT_DELAY = 2500;

const CSS = `
/* Transition entre deux documents : le navigateur anime l'ancienne et la
   nouvelle page, sans écran blanc intermédiaire. */
@view-transition { navigation: auto; }

@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root) { animation: sis-page-out 130ms ease-in both; }
  ::view-transition-new(root) { animation: sis-page-in 220ms cubic-bezier(.22, .68, .28, 1) both; }
}

@keyframes sis-page-out { to { opacity: 0; } }
@keyframes sis-page-in { from { opacity: 0; transform: translateY(8px); } }

/* Repli quand les transitions de page natives ne sont pas disponibles :
   un fondu à l'arrivée, sans toucher à la mise en page. */
@supports not (view-transition-name: none) {
  @media (prefers-reduced-motion: no-preference) {
    body { animation: sis-page-fade 200ms ease-out both; }
  }
}

@keyframes sis-page-fade { from { opacity: 0; } }

/* Message « appuie encore pour quitter », au-dessus de la barre du bas. */
.sis-exit-hint {
  position: fixed;
  left: 50%;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 200;
  max-width: calc(100vw - 40px);
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(10, 27, 64, .92);
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 12px 30px -12px rgba(7, 18, 43, .65);
  opacity: 0;
  transform: translate(-50%, 8px);
  pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
}

.sis-exit-hint.on { opacity: 1; transform: translate(-50%, 0); }

@media (prefers-reduced-motion: reduce) {
  .sis-exit-hint { transition: none; }
}
`;

let navigating = false;
let lastBackAt = 0;
let hintTimer = 0;
let backWired = false;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Nom du fichier courant (« index.html », « voir.html », …).
function currentPage() {
  return location.pathname.split("/").pop() || "index.html";
}

function backTarget(page) {
  return Object.prototype.hasOwnProperty.call(BACK_TARGET, page)
    ? BACK_TARGET[page]
    : "index.html";
}

// Le plugin natif n'existe que dans l'APK : sur le web, la fonction renvoie
// null et tout le bloc retour reste inactif.
function nativeApp() {
  const capacitor = window.Capacitor;
  return capacitor && capacitor.Plugins ? capacitor.Plugins.App : null;
}

function hideExitHint() {
  const hint = document.getElementById("sisExitHint");
  if (hint) hint.classList.remove("on");
  clearTimeout(hintTimer);
}

function showExitHint() {
  let hint = document.getElementById("sisExitHint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "sisExitHint";
    hint.className = "sis-exit-hint";
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    hint.textContent = "Appuie encore sur retour pour quitter";
    document.body.appendChild(hint);
  }
  // Force un repaint pour que la transition rejoue à chaque appui.
  void hint.offsetWidth;
  hint.classList.add("on");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.remove("on"), EXIT_DELAY);
}

function goTo(page) {
  navigating = true;
  hideExitHint();
  try {
    // Chemin absolu : la page marche aussi depuis une URL profonde (/to/pseudo).
    location.replace("/" + page);
  } catch (e) {
    location.href = page;
  }
  // Si la navigation a été bloquée, on réautorise un nouvel appui.
  setTimeout(() => { navigating = false; }, 1200);
}

async function exitApp() {
  const app = nativeApp();
  if (app && typeof app.exitApp === "function") {
    try {
      await app.exitApp();
      return;
    } catch (e) {
      // on retombe sur la fermeture navigateur ci-dessous
    }
  }
  window.close();
}

function handleBack() {
  if (navigating) return;

  // Une page peut intercepter le retour : fenêtre modale ouverte, saisie en
  // cours… Elle annule alors l'événement et gère la fermeture elle-même.
  const ask = new CustomEvent("sis:back", { cancelable: true });
  document.dispatchEvent(ask);
  if (ask.defaultPrevented) {
    lastBackAt = 0;
    hideExitHint();
    return;
  }

  const target = backTarget(currentPage());
  if (target) {
    goTo(target);
    return;
  }

  // Accueil : premier appui = avertissement, second appui = sortie.
  const now = Date.now();
  if (now - lastBackAt < EXIT_DELAY) {
    hideExitHint();
    exitApp();
    return;
  }
  lastBackAt = now;
  showExitHint();
}

function setupBackButton() {
  if (backWired) return;
  const app = nativeApp();
  if (!app || typeof app.addListener !== "function") return;
  backWired = true;
  app.addListener("backButton", handleBack);
}

// Les quatre onglets sont préchargés dès que le navigateur est libre : le tap
// suivant ouvre la page sans attendre le réseau (utile sur la version web).
function prefetchTabs() {
  const page = currentPage();
  for (const href of TABS) {
    if (href === page) continue;
    if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "document";
    document.head.appendChild(link);
  }
}

function schedulePrefetch() {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(prefetchTabs, { timeout: 2000 });
  } else {
    setTimeout(prefetchTabs, 1200);
  }
}

ensureStyle();
setupBackButton();
// Le pont natif peut être prêt juste après ce module : une seconde tentative
// couvre ce cas sans jamais doubler l'écouteur.
setTimeout(setupBackButton, 400);
schedulePrefetch();

export { handleBack, prefetchTabs };
