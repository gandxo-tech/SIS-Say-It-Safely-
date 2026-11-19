// Enregistrement et partage des affiches SIS, sur le web comme dans l'APK.
//
// Dans l'APK (WebView Capacitor), un lien <a download> vers une URL `blob:`
// ne sauvegarde rien d'exploitable : le fichier obtenu est vide ou tronqué.
// On écrit donc le PNG avec le plugin natif Filesystem, puis on ouvre la
// feuille de partage Android (Share) depuis laquelle l'utilisateur
// l'enregistre dans sa galerie ou l'envoie à ses contacts.
//
// Sur le web, on garde le partage natif du navigateur quand il accepte les
// fichiers, sinon le téléchargement classique.

function capacitor() {
  return typeof window !== "undefined" && window.Capacitor ? window.Capacitor : null;
}

// Vrai uniquement dans l'app native (Android/iOS), pas dans le navigateur.
export function isNativeApp() {
  const cap = capacitor();
  if (!cap || typeof cap.isNativePlatform !== "function") return false;
  try {
    return Boolean(cap.isNativePlatform());
  } catch (e) {
    return false;
  }
}

// Les plugins natifs sont exposés par la WebView sur window.Capacitor.Plugins,
// sans bundler : on les récupère à l'appel pour ne jamais casser le web.
function nativePlugin(name) {
  const cap = capacitor();
  const plugins = cap && cap.Plugins;
  const plugin = plugins ? plugins[name] : null;
  return plugin && typeof plugin === "object" ? plugin : null;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Lecture de l'image impossible."));
    reader.readAsDataURL(blob);
  });
}

export function downloadInBrowser(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Écrit le PNG dans le cache de l'app puis ouvre le partage natif Android.
export async function saveImageToDevice(blob, filename, { title = "SIS", text = "" } = {}) {
  const filesystem = nativePlugin("Filesystem");
  if (!filesystem) return { ok: false, reason: "no-filesystem" };

  const data = await blobToBase64(blob);
  await filesystem.writeFile({ path: filename, data, directory: "CACHE", recursive: true });
  const info = await filesystem.getUri({ path: filename, directory: "CACHE" });
  const uri = info && info.uri;

  const share = nativePlugin("Share");
  if (share && uri) {
    await share.share({
      title,
      text: text || filename,
      files: [uri],
      dialogTitle: "Enregistrer ou partager l'affiche"
    });
  }
  return { ok: true, uri };
}

// Point d'entrée unique : renvoie { mode } avec mode = "native" | "share" |
// "download" | "cancelled". `download: true` force le téléchargement direct
// sur le web, pour les boutons qui promettent un fichier et pas un partage.
export async function exportImage(blob, filename, { title = "SIS", text = "", file = null, download = false } = {}) {
  if (isNativeApp()) {
    try {
      const saved = await saveImageToDevice(blob, filename, { title, text });
      if (saved.ok) return { mode: "native", uri: saved.uri };
    } catch (err) {
      console.warn("Enregistrement natif impossible, repli sur le téléchargement :", err);
    }
    downloadInBrowser(blob, filename);
    return { mode: "download" };
  }

  const shareFile = file || new File([blob], filename, { type: blob.type || "image/png" });
  if (!download && typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
    try {
      await navigator.share({ files: [shareFile], title, text });
      return { mode: "share" };
    } catch (err) {
      if (err && err.name === "AbortError") return { mode: "cancelled" };
    }
  }

  downloadInBrowser(blob, filename);
  return { mode: "download" };
}
