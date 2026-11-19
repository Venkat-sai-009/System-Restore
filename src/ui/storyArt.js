// Pixel-art building blocks for the story panels.
import { COLORS } from '../config.js';
import { rect } from '../utils/draw.js';

export function monitor(g, cx, cy, screen) {
  rect(g, cx - 44, cy - 34, 88, 62, COLORS.grey);
  rect(g, cx - 44, cy - 34, 88, 2, COLORS.white);
  rect(g, cx - 40, cy - 30, 80, 54, screen);
  rect(g, cx - 8, cy + 28, 16, 8, COLORS.slate);
  rect(g, cx - 22, cy + 36, 44, 5, COLORS.slate);
}

export function happyFace(g, cx, cy) {
  rect(g, cx - 18, cy - 14, 10, 12, COLORS.white);
  rect(g, cx + 8, cy - 14, 10, 12, COLORS.white);
  rect(g, cx - 14, cy - 8, 5, 8, COLORS.ink);
  rect(g, cx + 12, cy - 8, 5, 8, COLORS.ink);
  rect(g, cx - 14, cy + 8, 28, 3, COLORS.ink);
  rect(g, cx - 18, cy + 4, 4, 4, COLORS.ink);
  rect(g, cx + 14, cy + 4, 4, 4, COLORS.ink);
}

export function deadFace(g, cx, cy) {
  for (let i = 0; i < 8; i++) {
    for (const ex of [-14, 10]) {
      rect(g, cx + ex + i, cy - 14 + i, 3, 3, COLORS.white);
      rect(g, cx + ex + 7 - i, cy - 14 + i, 3, 3, COLORS.white);
    }
  }
  for (let i = 0; i < 7; i++) rect(g, cx - 16 + i * 5, cy + 8 + (i % 2) * 4, 5, 3, COLORS.white);
}

export function virus(g, cx, cy, t) {
  const r = 15;
  for (let j = -r; j <= r; j++) {
    const w = Math.round(Math.sqrt(r * r - j * j) * 2);
    rect(g, cx - w / 2, cy + j, w, 1, COLORS.grassLight);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + t * 2;
    rect(g, cx + Math.cos(a) * (r + 3) - 2, cy + Math.sin(a) * (r + 3) - 2, 4, 4, COLORS.green);
  }
  rect(g, cx - 9, cy - 6, 7, 7, COLORS.white);
  rect(g, cx + 2, cy - 6, 7, 7, COLORS.white);
  rect(g, cx - 6, cy - 4, 3, 4, COLORS.red);
  rect(g, cx + 4, cy - 4, 3, 4, COLORS.red);
  rect(g, cx - 10, cy - 9, 9, 2, COLORS.ink);
  rect(g, cx + 1, cy - 9, 9, 2, COLORS.ink);
  rect(g, cx - 8, cy + 5, 16, 3, COLORS.ink);
}

export function robot(g, cx, cy, flame = false) {
  if (flame) {
    rect(g, cx - 6, cy + 12, 4, 5, COLORS.orange);
    rect(g, cx + 2, cy + 12, 4, 5, COLORS.orange);
    rect(g, cx - 5, cy + 12, 2, 3, COLORS.yellow);
    rect(g, cx + 3, cy + 12, 2, 3, COLORS.yellow);
  }
  rect(g, cx - 1, cy - 26, 2, 6, COLORS.yellow);
  rect(g, cx - 2, cy - 28, 4, 3, COLORS.red);
  rect(g, cx - 9, cy - 20, 18, 14, COLORS.white);
  rect(g, cx - 7, cy - 17, 14, 7, COLORS.ink);
  rect(g, cx - 5, cy - 15, 3, 3, COLORS.teal);
  rect(g, cx + 2, cy - 15, 3, 3, COLORS.teal);
  rect(g, cx - 8, cy - 6, 16, 12, COLORS.red);
  rect(g, cx - 4, cy - 3, 8, 5, COLORS.yellow);
  rect(g, cx - 13, cy - 5, 4, 9, COLORS.white);
  rect(g, cx + 9, cy - 5, 4, 9, COLORS.white);
  rect(g, cx - 7, cy + 6, 5, 6, COLORS.blue);
  rect(g, cx + 2, cy + 6, 5, 6, COLORS.blue);
}

// mood: 'angry' (dark storm cloud) or 'happy' (fluffy white cloud)
export function cloud(g, cx, cy, mood) {
  const body = mood === 'angry' ? COLORS.slate : COLORS.white;
  const shade = mood === 'angry' ? COLORS.night : COLORS.pale;
  rect(g, cx - 28, cy - 4, 56, 16, body);
  rect(g, cx - 18, cy - 14, 24, 12, body);
  rect(g, cx + 2, cy - 18, 22, 16, body);
  rect(g, cx - 28, cy + 8, 56, 4, shade);
  rect(g, cx - 12, cy, 6, 6, COLORS.white);
  rect(g, cx + 6, cy, 6, 6, COLORS.white);
  rect(g, cx - 10, cy + 2, 3, 4, mood === 'angry' ? COLORS.red : COLORS.ink);
  rect(g, cx + 8, cy + 2, 3, 4, mood === 'angry' ? COLORS.red : COLORS.ink);
  if (mood === 'angry') {
    rect(g, cx - 14, cy - 3, 10, 2, COLORS.ink);
    rect(g, cx + 4, cy - 3, 10, 2, COLORS.ink);
    rect(g, cx - 8, cy + 9, 16, 2, COLORS.ink);
  } else {
    rect(g, cx - 8, cy + 8, 16, 2, COLORS.ink);
    rect(g, cx - 10, cy + 6, 3, 3, COLORS.ink);
    rect(g, cx + 8, cy + 6, 3, 3, COLORS.ink);
  }
}

export function lightning(g, x, y0, y1) {
  let cx = x;
  for (let y = y0; y < y1; y += 6) {
    rect(g, cx, y, 4, 7, COLORS.yellow);
    rect(g, cx + 1, y, 2, 7, COLORS.white);
    cx += (Math.floor(y / 6) % 2 ? -4 : 4);
  }
}
