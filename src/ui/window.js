// Reusable fake OS window. Sectors draw inside the content rectangle.
import { WINDOW, AREA, COLORS } from '../config.js';
import { rect, text, bevel } from '../utils/draw.js';
import { cross } from './icons.js';
import { lerp, easeOutBack, clamp } from '../utils/math.js';

// progress 0..1 animates the window popping open.
export function drawWindow(g, title, progress = 1) {
  const e = progress >= 1 ? 1 : easeOutBack(clamp(progress, 0, 1));
  const w = Math.round(lerp(48, WINDOW.w, e) / 2) * 2;
  const h = Math.round(lerp(32, WINDOW.h, e) / 2) * 2;
  const x = Math.round(WINDOW.x + (WINDOW.w - w) / 2);
  const y = Math.round(WINDOW.y + (WINDOW.h - h) / 2);
  rect(g, x + 3, y + 3, w, h, COLORS.ink); // drop shadow
  bevel(g, x, y, w, h, COLORS.grey, true);
  rect(g, x + WINDOW.border, y + WINDOW.border, w - WINDOW.border * 2, WINDOW.titleH, COLORS.purple);
  if (progress >= 1) {
    text(g, title, x + 6, y + WINDOW.border + 2, COLORS.white);
    bevel(g, x + w - 14, y + 4, 10, 10, COLORS.grey, true);
    cross(g, x + w - 12, y + 6, COLORS.ink);
  }
  rect(g, x + WINDOW.border, y + WINDOW.border + WINDOW.titleH, w - WINDOW.border * 2,
    h - WINDOW.border * 2 - WINDOW.titleH, COLORS.ink);
}

// Clip and translate so sectors can draw in 0..AREA.w x 0..AREA.h.
export function beginContent(g) {
  g.save();
  g.translate(AREA.x, AREA.y);
  g.beginPath();
  g.rect(0, 0, AREA.w, AREA.h);
  g.clip();
}

export function endContent(g) {
  g.restore();
}
