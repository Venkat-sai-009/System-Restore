// Small pixel-crisp drawing helpers shared by the UI and the sectors.
import { COLORS, font } from '../config.js';

export function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function text(g, str, x, y, color = COLORS.white, align = 'left', size = 8) {
  g.font = font(size);
  g.textBaseline = 'top';
  g.textAlign = align;
  g.fillStyle = color;
  g.fillText(str, Math.round(x), Math.round(y));
}

// Raised (or sunken) fake-OS box.
export function bevel(g, x, y, w, h, fill = COLORS.grey, raised = true) {
  const hi = raised ? COLORS.white : COLORS.slate;
  const lo = raised ? COLORS.slate : COLORS.white;
  rect(g, x, y, w, h, fill);
  rect(g, x, y, w, 1, hi);
  rect(g, x, y, 1, h, hi);
  rect(g, x, y + h - 1, w, 1, lo);
  rect(g, x + w - 1, y, 1, h, lo);
}

export function outline(g, x, y, w, h, color, t = 1) {
  rect(g, x, y, w, t, color);
  rect(g, x, y + h - t, w, t, color);
  rect(g, x, y, t, h, color);
  rect(g, x + w - t, y, t, h, color);
}

export function bar(g, x, y, w, h, frac, color, back = COLORS.ink) {
  rect(g, x, y, w, h, back);
  rect(g, x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, frac))), h - 2, color);
}

const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
export function heart(g, x, y, color) {
  g.fillStyle = color;
  HEART.forEach((row, j) => {
    for (let i = 0; i < 7; i++) if (row[i] === '1') g.fillRect(x + i, y + j, 1, 1);
  });
}

export function hearts(g, x, y, n, max) {
  for (let i = 0; i < max; i++) heart(g, x + i * 9, y, i < n ? COLORS.red : COLORS.slate);
}

// Pixel triangle (no antialiasing). dir: up | down | left | right.
export function arrowShape(g, cx, cy, dir, s, color) {
  g.fillStyle = color;
  const half = Math.floor(s / 2);
  for (let i = 0; i < s; i++) {
    const grow = 2 * i + 1;
    const shrink = 2 * (s - 1 - i) + 1;
    if (dir === 'up') g.fillRect(cx - i, cy - half + i, grow, 1);
    else if (dir === 'down') g.fillRect(cx - (s - 1 - i), cy - half + i, shrink, 1);
    else if (dir === 'left') g.fillRect(cx - half + i, cy - i, 1, grow);
    else g.fillRect(cx - half + i, cy - (s - 1 - i), 1, shrink);
  }
}

const CAP_W = { space: 26, enter: 18 };
function keycap(g, x, y, kind) {
  const w = CAP_W[kind] || 11;
  bevel(g, x, y, w, 11, COLORS.night, true);
  const cx = x + Math.floor(w / 2);
  if (kind === 'space') {
    rect(g, x + 5, y + 5, w - 10, 1, COLORS.white);
    rect(g, x + 5, y + 4, 1, 2, COLORS.white);
    rect(g, x + w - 6, y + 4, 1, 2, COLORS.white);
  } else if (kind === 'enter') {
    rect(g, x + 5, y + 3, 1, 4, COLORS.white);
    rect(g, x + 5, y + 6, 7, 1, COLORS.white);
    arrowShape(g, x + 5, y + 6, 'left', 3, COLORS.white);
  } else {
    arrowShape(g, cx, y + 5, kind, 3, COLORS.white);
  }
}

// Row of key icons centred on cx. Replaces written instructions.
export function hintRow(g, cx, y, kinds) {
  const widths = kinds.map((k) => CAP_W[k] || 11);
  const total = widths.reduce((a, b) => a + b, 0) + (kinds.length - 1) * 3;
  let x = Math.round(cx - total / 2);
  kinds.forEach((k, i) => {
    keycap(g, x, y, k);
    x += widths[i] + 3;
  });
}
