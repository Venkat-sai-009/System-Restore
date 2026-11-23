// Code-drawn pictograms. Each glyph fits a 20x16 box at (x, y).
import { rect, arrowShape, outline } from '../utils/draw.js';

const GLYPHS = {
  platformer(g, x, y, a, b) {
    rect(g, x, y + 11, 7, 5, a);
    rect(g, x + 7, y + 6, 7, 10, a);
    rect(g, x + 14, y + 1, 6, 15, a);
    rect(g, x + 1, y + 4, 4, 6, b);
  },
  shooter(g, x, y, a, b) {
    arrowShape(g, x + 10, y + 10, 'up', 6, a);
    rect(g, x + 8, y + 10, 5, 5, a);
    rect(g, x + 9, y, 2, 3, b);
    rect(g, x + 9, y + 4, 2, 2, b);
  },
  racer(g, x, y, a, b) {
    for (let i = 0; i < 16; i++) {
      const hw = Math.round(1 + i * 0.6);
      rect(g, x + 10 - hw, y + i, hw * 2, 1, a);
      if (i % 4 < 2) rect(g, x + 9, y + i, 2, 1, b);
    }
  },
  puzzle(g, x, y, a, b) {
    rect(g, x + 1, y + 1, 8, 6, a);
    rect(g, x + 11, y + 1, 8, 6, a);
    rect(g, x + 1, y + 9, 8, 6, a);
    outline(g, x + 11, y + 9, 8, 6, b);
  },
  breakout(g, x, y, a, b) {
    rect(g, x + 1, y + 1, 8, 3, a);
    rect(g, x + 11, y + 1, 8, 3, a);
    rect(g, x + 1, y + 5, 8, 3, a);
    rect(g, x + 11, y + 5, 8, 3, a);
    rect(g, x + 9, y + 9, 3, 3, b);
    rect(g, x + 4, y + 14, 12, 2, a);
  },
  snake(g, x, y, a, b) {
    rect(g, x + 4, y + 1, 12, 3, a);
    rect(g, x + 4, y + 1, 3, 7, a);
    rect(g, x + 4, y + 6, 12, 3, a);
    rect(g, x + 13, y + 6, 3, 8, a);
    rect(g, x + 4, y + 12, 12, 3, a);
    rect(g, x + 14, y + 2, 2, 2, b);
  },
  whack(g, x, y, a, b) {
    rect(g, x + 9, y + 5, 3, 11, b);
    rect(g, x + 3, y + 1, 15, 6, a);
    rect(g, x + 3, y + 1, 15, 1, b);
  },
  popup(g, x, y, a, b) {
    rect(g, x + 2, y + 2, 16, 12, a);
    rect(g, x + 2, y + 2, 16, 3, b);
    rect(g, x + 14, y + 3, 2, 2, a);
    rect(g, x + 5, y + 8, 10, 2, b);
  },
  spam(g, x, y, a, b) {
    rect(g, x + 1, y + 2, 14, 10, a);
    rect(g, x + 1, y + 2, 14, 3, b);
    rect(g, x + 8, y + 7, 12, 8, a);
    rect(g, x + 8, y + 7, 12, 2, b);
    rect(g, x + 17, y + 8, 2, 1, a);
  },
  recycle(g, x, y, a, b) {
    rect(g, x + 3, y + 2, 14, 2, b);
    rect(g, x + 4, y + 4, 12, 11, a);
    rect(g, x + 6, y + 6, 2, 7, b);
    rect(g, x + 9, y + 6, 2, 7, b);
    rect(g, x + 12, y + 6, 2, 7, b);
  },
  task(g, x, y, a, b) {
    rect(g, x + 2, y + 2, 16, 3, a);
    rect(g, x + 2, y + 7, 11, 3, a);
    rect(g, x + 2, y + 12, 14, 3, a);
    rect(g, x + 2, y + 2, 6, 3, b);
  },
  scroll(g, x, y, a, b) {
    rect(g, x + 7, y + 1, 6, 16, b);
    rect(g, x + 7, y + 5, 6, 6, a);
    rect(g, x + 2, y + 8, 3, 2, a);
    rect(g, x + 15, y + 8, 3, 2, a);
  },
  download(g, x, y, a, b) {
    rect(g, x + 8, y + 1, 4, 8, a);
    rect(g, x + 4, y + 8, 12, 2, a);
    rect(g, x + 6, y + 10, 8, 2, a);
    rect(g, x + 8, y + 12, 4, 1, a);
    rect(g, x + 2, y + 15, 16, 2, b);
  },
  flappy(g, x, y, a, b) {
    rect(g, x + 4, y + 4, 11, 9, a);
    rect(g, x + 1, y + 8, 5, 3, b);
    rect(g, x + 11, y + 6, 2, 2, b);
    rect(g, x + 15, y + 8, 4, 2, b);
    rect(g, x + 7, y + 13, 2, 2, a);
    rect(g, x + 11, y + 13, 2, 2, a);
  },
  boss2(g, x, y, a, b) {
    rect(g, x + 2, y + 7, 16, 6, a);
    rect(g, x + 5, y + 4, 6, 4, a);
    rect(g, x + 10, y + 2, 6, 6, a);
    rect(g, x + 6, y + 9, 2, 2, b);
    rect(g, x + 12, y + 9, 2, 2, b);
    rect(g, x + 9, y + 13, 2, 3, b);
  },
  boss(g, x, y, a, b) {
    rect(g, x + 3, y + 1, 14, 10, a);
    rect(g, x + 5, y + 4, 3, 3, b);
    rect(g, x + 12, y + 4, 3, 3, b);
    rect(g, x + 6, y + 11, 8, 4, a);
    rect(g, x + 8, y + 12, 1, 3, b);
    rect(g, x + 11, y + 12, 1, 3, b);
  },
};

export function genreGlyph(g, id, x, y, a, b) {
  (GLYPHS[id] || GLYPHS.boss)(g, x, y, a, b);
}

export function check(g, x, y, color) {
  [[0, 4], [1, 5], [2, 6], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 0]].forEach(([i, j]) =>
    rect(g, x + i, y + j, 2, 2, color));
}

export function cross(g, x, y, color) {
  for (let i = 0; i < 7; i++) {
    rect(g, x + i, y + i, 2, 2, color);
    rect(g, x + 6 - i, y + i, 2, 2, color);
  }
}

export function warn(g, x, y, fill, mark) {
  for (let i = 0; i < 10; i++) rect(g, x + 5 - Math.floor(i / 2), y + i, 2 * Math.floor(i / 2) + 2, 1, fill);
  rect(g, x + 5, y + 3, 2, 4, mark);
  rect(g, x + 5, y + 8, 2, 1, mark);
}

export function power(g, x, y, color) {
  outline(g, x + 1, y + 2, 8, 8, color, 1);
  rect(g, x + 4, y, 2, 6, color);
}
