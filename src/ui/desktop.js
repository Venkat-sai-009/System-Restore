// The hub: a fake desktop with one folder per sector, plus a taskbar showing system integrity.
import { HUB, COLORS, VIEW, TASKBAR, SECTOR_LABELS, DIFFICULTY } from '../config.js';
import { rect, text, bevel, outline, hintRow } from '../utils/draw.js';
import { genreGlyph, check, warn, power } from './icons.js';
import { diffColor } from './overlays.js';

const BOSS_INDEX = 4;
const BAR = { x: 22, y: TASKBAR.y + 4, w: 154, h: 8 };

const idsOf = (state) => [...state.ids, state.bossId];
const countOf = (state) => (state.bossReady ? 5 : 4);

function cellRect(i) {
  if (i === BOSS_INDEX) return { x: (VIEW.width - HUB.cellW) / 2, y: 134, w: HUB.cellW, h: 28 };
  return {
    x: HUB.startX + (i % 2) * (HUB.cellW + HUB.gapX),
    y: HUB.rowY[Math.floor(i / 2)],
    w: HUB.cellW,
    h: HUB.cellH,
  };
}

export function cellCenter(id, state) {
  const c = cellRect(Math.max(0, idsOf(state).indexOf(id)));
  return { x: c.x + 20, y: c.y + c.h / 2 };
}

export function createDesktop() {
  let sel = 0;

  function move(dx, dy, state) {
    const row = sel === BOSS_INDEX ? 2 : Math.floor(sel / 2);
    const col = sel === BOSS_INDEX ? 0 : sel % 2;
    const maxRow = countOf(state) > 4 ? 2 : 1;
    const nr = Math.max(0, Math.min(maxRow, row + dy));
    const nc = Math.max(0, Math.min(1, col + dx));
    sel = nr === 2 ? BOSS_INDEX : nr * 2 + nc;
  }

  return {
    select(id, state) {
      sel = Math.max(0, idsOf(state).indexOf(id));
    },
    // Returns the id of the folder the player opened, or null.
    update(dt, input, state, sfx) {
      if (sel >= countOf(state)) sel = 0;
      const before = sel;
      if (input.pressed('left')) move(-1, 0, state);
      if (input.pressed('right')) move(1, 0, state);
      if (input.pressed('up')) move(0, -1, state);
      if (input.pressed('down')) move(0, 1, state);
      const p = input.pointer;
      let clicked = -1;
      if (p.moved || p.clicked) {
        for (let i = 0; i < countOf(state); i++) {
          const c = cellRect(i);
          if (p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h) {
            sel = i;
            if (p.clicked) clicked = i;
          }
        }
      }
      if (sel !== before) sfx.blip();
      if (clicked >= 0 || input.pressed('confirm')) {
        sfx.select();
        return idsOf(state)[sel];
      }
      return null;
    },
    // fall (0..1) makes everything drop away for the collapse into the boss.
    draw(g, state, time, fall = 0) {
      rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.desk);
      for (let x = 0; x < VIEW.width; x += 16) rect(g, x, 0, 1, TASKBAR.y, COLORS.deskLine);
      for (let y = 0; y < TASKBAR.y; y += 16) rect(g, 0, y, VIEW.width, 1, COLORS.deskLine);
      const clean = state.integrity >= 1;
      const title = state.chapter === 1 ? 'SYSTEM RESTORE' : 'NETWORK RESTORE';
      text(g, title, VIEW.width / 2, 12, clean ? COLORS.teal : COLORS.white, 'center');
      rect(g, 96, 24, 128, 2, clean ? COLORS.teal : COLORS.red);
      text(g, DIFFICULTY[state.difficulty].label, VIEW.width - 4, 4, diffColor(state.difficulty), 'right');
      text(g, 'TAB', VIEW.width - 4, 14, COLORS.skyLight, 'right');
      const ids = idsOf(state);
      for (let i = 0; i < countOf(state); i++) this.drawCell(g, state, ids[i], i, time, fall);
      this.drawTaskbar(g, state);
    },
    drawCell(g, state, id, i, time, fall) {
      const c = cellRect(i);
      const isBoss = i === BOSS_INDEX;
      const done = !isBoss && state.done[id];
      const drop = fall * fall * (150 + (i % 3) * 60);
      let ox = fall > 0 ? Math.round(Math.sin(time * 40 + i) * fall * 3) : 0;
      if (!done && Math.sin(time * 11 + i * 5) > 0.985) ox += Math.sin(time * 97 + i) > 0 ? 2 : -2;
      const x = Math.round(c.x + ox);
      const y = Math.round(c.y + drop);

      if (i === sel) {
        rect(g, x, y, c.w, c.h, COLORS.night);
        outline(g, x, y, c.w, c.h, Math.floor(time * 4) % 2 === 0 ? COLORS.white : COLORS.yellow, 2);
      }
      const body = isBoss ? COLORS.purple : done ? COLORS.teal : COLORS.red;
      const fx = x + 6;
      const ih = isBoss ? 20 : HUB.iconH;
      const fy = y + Math.round((c.h - ih) / 2);
      rect(g, fx, fy, 14, 4, body);
      rect(g, fx, fy + 4, HUB.iconW, ih - 4, body);
      rect(g, fx, fy + ih - 3, HUB.iconW, 3, COLORS.ink);
      genreGlyph(g, id, fx + 8, fy + (isBoss ? 3 : 7), COLORS.ink, COLORS.white);
      text(g, SECTOR_LABELS[id], x + 50, y + (isBoss ? 10 : 11), COLORS.white);
      if (isBoss) return;
      if (done) check(g, x + 50, y + 26, COLORS.teal);
      else warn(g, x + 50, y + 25, COLORS.yellow, COLORS.ink);
    },
    drawTaskbar(g, state) {
      bevel(g, 0, TASKBAR.y, VIEW.width, TASKBAR.h, COLORS.grey, true);
      bevel(g, 2, TASKBAR.y + 2, 16, 12, COLORS.grey, true);
      power(g, 5, TASKBAR.y + 3, COLORS.ink);
      bevel(g, BAR.x, BAR.y, BAR.w, BAR.h, COLORS.ink, false);
      rect(g, BAR.x + 1, BAR.y + 1, Math.round((BAR.w - 2) * state.shownIntegrity), BAR.h - 2, COLORS.teal);
      for (let i = 1; i < 4; i++) rect(g, BAR.x + Math.round((BAR.w * i) / 4), BAR.y + 1, 1, BAR.h - 2, COLORS.ink);
      text(g, Math.round(state.shownIntegrity * 100) + '%', 182, TASKBAR.y + 4, COLORS.ink);
      hintRow(g, 270, TASKBAR.y + 3, ['left', 'right', 'up', 'down', 'enter']);
    },
  };
}
