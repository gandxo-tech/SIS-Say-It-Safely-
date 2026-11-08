// Carte de partage (PNG 1080x1920, format story), extraite de voir.html.
// Rendu identique à l'ancien téléchargement. Tout se passe dans le navigateur : aucune donnée n'est envoyée.

export const CARD_W = 1080;
export const CARD_H = 1920;


export const CARD_STYLES = [
  { key: 'classique', name: 'Classique', emoji: '💌', from: '#00d4ff', to: '#1f3ba6' },
  { key: 'azur',      name: 'Azur',      emoji: '💙', from: '#00bfff', to: '#1e90ff' },
  { key: 'ciel',      name: 'Ciel',      emoji: '☁️', from: '#87ceeb', to: '#4682b4' },
  { key: 'royal',     name: 'Royal',     emoji: '👑', from: '#add8e6', to: '#4169e1' },
  { key: 'minuit',    name: 'Minuit',    emoji: '🌙', from: '#b0e0e6', to: '#191970' }
];

const wrapCanvasText = (ctx, text, maxWidth) => {
  const lines = [];
  String(text).split('\n').forEach((paragraph) => {
    const words = paragraph.split(' ');
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    lines.push(line);
  });
  return lines;
};

const fitMessageFont = (ctx, text, maxWidth, maxHeight, opts = {}) => {
  const {
    fontFamily = 'Inter, sans-serif',
    fontWeight = 700,
    lineHeightRatio = 1.35,
    maxFont = 64,
    minFont = 30
  } = opts;

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 2) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = wrapCanvasText(ctx, text, maxWidth);
    const lineHeight = fontSize * lineHeightRatio;
    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize, lines, lineHeight };
    }
  }
  // Message trop long même en taille mini : troncature propre avec "…"
  ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
  const lineHeight = minFont * lineHeightRatio;
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const lines = wrapCanvasText(ctx, text, maxWidth).slice(0, maxLines);
  let last = lines[maxLines - 1] || '';
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  lines[maxLines - 1] = `${last}…`;
  return { fontSize: minFont, lines, lineHeight };
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Les polices web ne sont "fetchées" qu'une fois réellement utilisées :
// on force le chargement avant de dessiner, sinon le canvas dessine
// avec la police de repli sans jamais se corriger.
const ensureCardFontsLoaded = async () => {
  const specs = ['400 100px Anton', '700 34px "Hanken Grotesk"', '600 30px "Hanken Grotesk"'];
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
  } catch (e) {
    // best-effort : on continue avec la police de repli si le chargement échoue
  }
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
};

export const generateCardBlob = async (message, dateStr, style) => {
  await ensureCardFontsLoaded();

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // Fond dégradé vertical (mêmes couleurs que les headers de messages dans l'app)
  const bgGradient = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bgGradient.addColorStop(0, style.from);
  bgGradient.addColorStop(1, style.to);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Wordmark "SIS"
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0a2233';
  ctx.font = '400 100px Anton, sans-serif';
  ctx.fillText('SIS', CARD_W / 2, 380);
  ctx.restore();

  // Bulle blanche avec le message (majuscules, taille auto-ajustée) + date en bas
  const panelX = 90;
  const panelW = CARD_W - 180;
  const innerPadX = 80;
  const innerPadY = 70;
  const dateZoneH = 90;
  const maxTextWidth = panelW - innerPadX * 2;

  const zoneTop = 460;
  const zoneBottom = 1360;
  const zoneHeight = zoneBottom - zoneTop;
  const maxTextHeight = zoneHeight - innerPadY - dateZoneH;

  const upperMessage = (message || '').toUpperCase();
  const { fontSize, lines, lineHeight } = fitMessageFont(ctx, upperMessage, maxTextWidth, maxTextHeight, {
    fontFamily: 'Anton, sans-serif',
    fontWeight: 400,
    lineHeightRatio: 1.08,
    maxFont: 78,
    minFont: 32
  });

  const panelH = lines.length * lineHeight + innerPadY + dateZoneH;
  const panelY = zoneTop + (zoneHeight - panelH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(8, 16, 24, 0.22)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, panelX, panelY, panelW, panelH, 56);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#14141b';
  ctx.font = `400 ${fontSize}px Anton, sans-serif`;
  let ty = panelY + innerPadY + fontSize * 0.8;
  lines.forEach((line) => {
    ctx.fillText(line, CARD_W / 2, ty);
    ty += lineHeight;
  });
  ctx.restore();

  if (dateStr) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 28px "Hanken Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(20, 20, 27, 0.45)';
    ctx.fillText(dateStr, CARD_W / 2, panelY + panelH - 36);
    ctx.restore();
  }

  // CTA en pastille sombre
  const ctaLabel = 'ENVOIE-MOI UN MESSAGE ANONYME 👀';
  const pillH = 118;
  const pillCenterY = 1460;

  ctx.save();
  ctx.font = '700 34px "Hanken Grotesk", sans-serif';
  ctx.letterSpacing = '3px';
  const ctaTextWidth = ctx.measureText(ctaLabel).width;
  const pillPadX = 56;
  const pillW = Math.min(CARD_W - 140, ctaTextWidth + pillPadX * 2);
  const pillX = (CARD_W - pillW) / 2;
  const pillY = pillCenterY - pillH / 2;

  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = '#15151a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2f1f3';
  ctx.fillText(ctaLabel, CARD_W / 2, pillCenterY);
  ctx.restore();

  // URL du site
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 30px "Hanken Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillText(window.location.host, CARD_W / 2, pillCenterY + pillH / 2 + 55);
  ctx.restore();

  // Emoji flottants décoratifs (dessinés en dernier, par-dessus, comme des
  // stickers posés sur la carte — pas d'image externe : évite de "tainter"
  // le canvas et casser le téléchargement)
  const decos = [
    { char: '🤫', cx: 60, cy: 250, size: 230, rotate: -12, alpha: 0.85 },
    { char: '👀', cx: CARD_W - 40, cy: 860, size: 260, rotate: 12, alpha: 0.8 },
    { char: '💌', cx: 50, cy: CARD_H - 560, size: 210, rotate: 8, alpha: 0.85 },
    { char: '✨', cx: CARD_W - 45, cy: CARD_H - 300, size: 220, rotate: -10, alpha: 0.8 }
  ];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  decos.forEach((d) => {
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.translate(d.cx, d.cy);
    ctx.rotate((d.rotate * Math.PI) / 180);
    ctx.font = `${d.size}px sans-serif`;
    ctx.fillText(d.char, 0, 0);
    ctx.restore();
  });

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};
