// Full-screen and in-window overlays: K.O. screen, repair banner, bounce-back banner, intro line, ending card.
import { COLORS, VIEW, AREA, DIFFICULTY, KO } from '../config.js';
import { rect, text, bevel, outline, hintRow } from '../utils/draw.js';
import { check } from './icons.js';
import { clamp, easeOutBack } from '../utils/math.js';

const DIFF_COLORS = { easy: COLORS.lime, normal: COLORS.yellow, hard: COLORS.red };

export const diffColor = (name) => DIFF_COLORS[name];

// The K.O. screen: a fake blue screen of death. The reboot bar fills, then the player can bounce back.
export function drawKo(g, t, difficulty, hasHint) {
  const flicker = t < 0.25 && Math.floor(t * 40) % 2 === 0;
  rect(g, 0, 0, VIEW.width, VIEW.height, flicker ? COLORS.ink : COLORS.blue);
  if (flicker) return;
  const slam = easeOutBack(clamp(t / 0.3, 0, 1));
  text(g, ':(', 40, Math.round(-30 + slam * 54), COLORS.white, 'left', 32);
  text(g, 'SYSTEM CRASHED', 40, 66, COLORS.white);
  text(g, 'STOP: BOUNCE_BACK_PENDING', 40, 80, COLORS.pale);
  rect(g, 40, 94, 160, 6, COLORS.night);
  rect(g, 41, 95, Math.round(158 * clamp(t / KO.inputDelay, 0, 1)), 4, COLORS.yellow);
  if (t < KO.inputDelay) return;
  hintRow(g, 104, 108, ['enter']);
  text(g, 'RETRY', 122, 110, COLORS.white);
  bevel(g, 194, 108, 28, 11, COLORS.night, true);
  text(g, 'ESC', 196, 110, COLORS.white);
  text(g, 'MENU', 228, 110, COLORS.white);
  const d = DIFFICULTY[difficulty];
  bevel(g, 80, 128, 30, 11, COLORS.night, true);
  text(g, 'TAB', 82, 130, COLORS.white);
  text(g, 'LEVEL:', 118, 130, COLORS.white);
  text(g, d.label, 170, 130, DIFF_COLORS[difficulty]);
  if (hasHint) text(g, 'TRY EASY FOR MORE HEARTS', VIEW.width / 2, 148, COLORS.grey, 'center');
}

export function drawRepair(g, isBoss) {
  const cx = AREA.w / 2;
  const cy = AREA.h / 2;
  bevel(g, cx - 56, cy - 22, 112, 44, COLORS.night, true);
  outline(g, cx - 54, cy - 20, 108, 40, COLORS.teal, 1);
  check(g, cx - 38, cy - 6, COLORS.teal);
  text(g, isBoss ? 'CLEAN' : '+25%', cx + 12, cy - 4, COLORS.yellow, 'center');
}

export function drawBounce(g, timeLeft) {
  bevel(g, AREA.w / 2 - 66, 18, 132, 25, COLORS.night, true);
  text(g, 'BOUNCE BACK!', AREA.w / 2, 21, Math.floor(timeLeft * 10) % 2 ? COLORS.yellow : COLORS.teal, 'center');
  text(g, 'COMEBACK BONUS!', AREA.w / 2, 32, COLORS.lime, 'center');
}

export function drawIntro(g, line) {
  rect(g, 0, 17, AREA.w, 12, COLORS.ink);
  text(g, line, AREA.w / 2, 19, COLORS.yellow, 'center');
}

// Small instruction popup shown before a sector starts. Waits for a key press.
export function drawHowTo(g, title, lines, t) {
  const w = 214;
  const h = 26 + lines.length * 12 + 16;
  const x = Math.round((AREA.w - w) / 2);
  const y = Math.round((AREA.h - h) / 2) + 6;
  bevel(g, x, y, w, h, COLORS.grey, true);
  rect(g, x + 2, y + 2, w - 4, 11, COLORS.blue);
  text(g, 'how to play', x + 6, y + 4, COLORS.white);
  rect(g, x + 2, y + 13, w - 4, h - 15, COLORS.ink);
  lines.forEach((line, i) => text(g, line, x + w / 2, y + 20 + i * 12, COLORS.white, 'center'));
  if (Math.floor(t * 3) % 2 === 0) text(g, 'PRESS SPACE', x + w / 2, y + h - 12, COLORS.yellow, 'center');
}

export function drawEnding(g, state, time) {
  bevel(g, 50, 36, 220, 108, COLORS.grey, true);
  rect(g, 52, 38, 216, 12, COLORS.teal);
  text(g, 'restore.exe', 58, 40, COLORS.ink);
  rect(g, 52, 50, 216, 92, COLORS.ink);
  check(g, 70, 66, COLORS.teal);
  text(g, 'SYSTEM', 166, 58, COLORS.white, 'center');
  text(g, 'RESTORED!', 166, 70, COLORS.teal, 'center');
  const secs = Math.round(state.playTime);
  text(g, 'TIME ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), 160, 90, COLORS.yellow, 'center');
  if (state.best.run) {
    const b = state.best.run;
    text(g, 'BEST ' + Math.floor(b / 60) + ':' + String(b % 60).padStart(2, '0'), 160, 102, COLORS.grey, 'center');
  }
  text(g, 'BOUNCE-BACKS ' + state.bounces, 160, 114, COLORS.lime, 'center');
  text(g, DIFFICULTY[state.difficulty].label, 160, 125, DIFF_COLORS[state.difficulty], 'center');
  if (Math.floor(time * 2.5) % 2 === 0) hintRow(g, 160, 134, ['enter']);
}
