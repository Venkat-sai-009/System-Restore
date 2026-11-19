// Level select: three cards so every age group can pick a fair challenge. Picture-first, little text.
import { COLORS, VIEW, DIFFICULTY, DIFFICULTY_ORDER } from '../config.js';
import { rect, text, bevel, outline, hearts, hintRow } from '../utils/draw.js';

const CARD = { w: 92, h: 96, gap: 10, y: 30 };
const CARD_COLORS = { easy: COLORS.green, normal: COLORS.blue, hard: COLORS.red };
const BASE_HEARTS = 3;
const BAR_COUNT = 3;

const cardX = (i) => Math.round((VIEW.width - (CARD.w * 3 + CARD.gap * 2)) / 2) + i * (CARD.w + CARD.gap);

// Little face: smile, neutral, frown. Reads without any words.
function face(g, x, y, kind, color) {
  rect(g, x, y, 20, 16, color);
  rect(g, x + 4, y + 4, 3, 3, COLORS.ink);
  rect(g, x + 13, y + 4, 3, 3, COLORS.ink);
  if (kind === 'easy') {
    rect(g, x + 5, y + 11, 10, 2, COLORS.ink);
    rect(g, x + 4, y + 9, 2, 2, COLORS.ink);
    rect(g, x + 14, y + 9, 2, 2, COLORS.ink);
  } else if (kind === 'normal') {
    rect(g, x + 5, y + 10, 10, 2, COLORS.ink);
  } else {
    rect(g, x + 5, y + 9, 10, 2, COLORS.ink);
    rect(g, x + 4, y + 11, 2, 2, COLORS.ink);
    rect(g, x + 14, y + 11, 2, 2, COLORS.ink);
    rect(g, x + 3, y + 2, 5, 1, COLORS.ink);
    rect(g, x + 12, y + 2, 5, 1, COLORS.ink);
  }
}

export function createDifficultyScreen() {
  let sel = 1;
  let t = 0;
  return {
    open(current) {
      sel = Math.max(0, DIFFICULTY_ORDER.indexOf(current));
      t = 0;
    },
    // Returns the chosen difficulty name, or null while still choosing.
    update(dt, input, sfx) {
      t += dt;
      const before = sel;
      if (input.pressed('left')) sel = Math.max(0, sel - 1);
      if (input.pressed('right')) sel = Math.min(2, sel + 1);
      let clicked = false;
      const p = input.pointer;
      if (p.moved || p.clicked) {
        for (let i = 0; i < 3; i++) {
          if (p.x >= cardX(i) && p.x < cardX(i) + CARD.w && p.y >= CARD.y && p.y < CARD.y + CARD.h) {
            sel = i;
            clicked = p.clicked;
          }
        }
      }
      if (sel !== before) sfx.blip();
      if ((clicked || input.pressed('confirm')) && t > 0.2) {
        sfx.select();
        return DIFFICULTY_ORDER[sel];
      }
      return null;
    },
    draw(g) {
      rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.desk);
      for (let x = 0; x < VIEW.width; x += 16) rect(g, x, 0, 1, VIEW.height, COLORS.deskLine);
      for (let y = 0; y < VIEW.height; y += 16) rect(g, 0, y, VIEW.width, 1, COLORS.deskLine);
      text(g, 'CHOOSE YOUR LEVEL', VIEW.width / 2, 12, COLORS.white, 'center');
      DIFFICULTY_ORDER.forEach((name, i) => {
        const d = DIFFICULTY[name];
        const x = cardX(i);
        const picked = i === sel;
        const y = CARD.y + (picked ? -2 : 0);
        bevel(g, x, y, CARD.w, CARD.h, picked ? COLORS.pale : COLORS.grey, true);
        rect(g, x + 3, y + 3, CARD.w - 6, CARD.h - 6, COLORS.night);
        face(g, x + CARD.w / 2 - 10, y + 8, name, CARD_COLORS[name]);
        text(g, d.label, x + CARD.w / 2, y + 30, CARD_COLORS[name] === COLORS.blue ? COLORS.skyLight : COLORS.white, 'center');
        text(g, d.tag, x + CARD.w / 2, y + 42, COLORS.yellow, 'center');
        hearts(g, x + CARD.w / 2 - 22, y + 58, BASE_HEARTS + d.hearts > 5 ? 5 : BASE_HEARTS + d.hearts, BASE_HEARTS + d.hearts);
        for (let b = 0; b < BAR_COUNT; b++) {
          rect(g, x + 22 + b * 16, y + 76, 12, 6, b < d.bars ? CARD_COLORS[name] : COLORS.slate);
        }
        if (picked && Math.floor(t * 4) % 2 === 0) outline(g, x - 1, y - 1, CARD.w + 2, CARD.h + 2, COLORS.yellow, 2);
      });
      hintRow(g, VIEW.width / 2, 150, ['left', 'right', 'enter']);
    },
  };
}
