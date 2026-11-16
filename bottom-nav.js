const STYLE_ID = "sis-bottom-nav-style";

const CSS = `
.sis-bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid rgba(10, 27, 64, 0.09);
  box-shadow: 0 -6px 24px -10px rgba(10, 27, 64, 0.12);
}

@media (prefers-color-scheme: dark) {
  .sis-bottom-nav {
    background: rgba(14, 29, 66, 0.92);
    border-top-color: rgba(238, 244, 255, 0.10);
    box-shadow: 0 -8px 26px -10px rgba(0, 0, 0, 0.55);
  }
}

html[data-theme="dark"] .sis-bottom-nav {
  background: rgba(14, 29, 66, 0.92);
  border-top-color: rgba(238, 244, 255, 0.10);
  box-shadow: 0 -8px 26px -10px rgba(0, 0, 0, 0.55);
}

.sis-bottom-nav[hidden] {
  display: none !important;
}

.sis-bottom-nav__inner {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(var(--sis-nav-cols, 4), minmax(0, 1fr));
  gap: 6px;
}

.sis-bottom-nav__link {
  position: relative;
  min-height: 48px;
  padding: 6px 8px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  text-decoration: none;
  color: #5B6C8F;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition: color .18s ease, background-color .18s ease, transform .15s ease;
}

@media (prefers-color-scheme: dark) {
  .sis-bottom-nav__link {
    color: #8FA3CC;
  }
}

html[data-theme="dark"] .sis-bottom-nav__link {
  color: #8FA3CC;
}

.sis-bottom-nav__link:hover {
  color: #1747C8;
  background: rgba(47, 123, 245, 0.08);
}

@media (prefers-color-scheme: dark) {
  .sis-bottom-nav__link:hover {
    color: #7DB6FF;
    background: rgba(77, 181, 255, 0.10);
  }
}

.sis-bottom-nav__link:active {
  transform: scale(0.96);
}

.sis-bottom-nav__link:focus-visible {
  outline: 3px solid #1747C8;
  outline-offset: 2px;
}

.sis-bottom-nav__link svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.sis-bottom-nav__link[aria-current="page"] {
  color: #1747C8;
  font-weight: 700;
  background: rgba(47, 123, 245, 0.11);
}

@media (prefers-color-scheme: dark) {
  .sis-bottom-nav__link[aria-current="page"] {
    color: #7DB6FF;
    background: rgba(77, 181, 255, 0.14);
  }
}

html[data-theme="dark"] .sis-bottom-nav__link[aria-current="page"] {
  color: #7DB6FF;
  background: rgba(77, 181, 255, 0.14);
}

.sis-bottom-nav__link[aria-current="page"]::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(135deg, #1747C8 0%, #4DB5FF 100%);
}
`;

const ITEMS = [
  {
    key: "classement",
    label: "Classement",
    href: "classement.html",
    svg: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>'
  },
  {
    key: "profil",
    label: "Accueil",
    href: "index.html",
    svg: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'
  },
  {
    key: "messages",
    label: "Messages",
    href: "voir.html",
    svg: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
  },
  {
    // Proximity n'a de sens que dans l'app native : l'entrée est retirée du
    // menu quand le plugin Bluetooth n'est pas disponible (navigateur).
    key: "proximity",
    label: "Proximity",
    href: "proximity.html",
    nativeOnly: true,
    svg: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4"/><path d="M16.2 16.2a6 6 0 0 0 0-8.4"/><path d="M4.9 4.9a10 10 0 0 0 0 14.2"/><path d="M19.1 19.1a10 10 0 0 0 0-14.2"/>'
  },
  {
    key: "compte",
    label: "Compte",
    href: "compte.html",
    svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  }
];

// Même détection que proximity-mesh.js, sans import : le pont Capacitor est
// injecté dans le WebView par l'app native.
function proximityAvailable() {
  const cap = window.Capacitor;
  if (!cap) return false;
  const native = typeof cap.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : typeof cap.getPlatform === "function" && cap.getPlatform() !== "web";
  return Boolean(native && cap.Plugins && cap.Plugins.ProximityMesh);
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function mountBottomNav(activeKey, options = {}) {
  ensureStyle();
  const { hidden = false } = options;
  const items = ITEMS.filter((item) => !item.nativeOnly || proximityAvailable());

  let nav = document.getElementById("sisBottomNav");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "sisBottomNav";
    nav.className = "sis-bottom-nav";
    nav.setAttribute("aria-label", "Navigation principale");

    const inner = document.createElement("div");
    inner.className = "sis-bottom-nav__inner";
    inner.style.setProperty("--sis-nav-cols", String(items.length));

    for (const item of items) {
      const a = document.createElement("a");
      a.className = "sis-bottom-nav__link";
      a.href = item.href;
      a.dataset.navKey = item.key;
      if (item.key === activeKey) a.setAttribute("aria-current", "page");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = item.svg;

      const span = document.createElement("span");
      span.textContent = item.label;

      a.append(svg, span);
      inner.append(a);
    }

    nav.append(inner);
    document.body.appendChild(nav);
  } else {
    const inner = nav.querySelector(".sis-bottom-nav__inner");
    if (inner) inner.style.setProperty("--sis-nav-cols", String(items.length));
    nav.querySelectorAll(".sis-bottom-nav__link").forEach((a) => {
      if (a.dataset.navKey === activeKey) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  nav.hidden = Boolean(hidden);
  return nav;
}
