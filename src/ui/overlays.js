// Full-screen and in-window overlays: K.O. screen, repair banner, bounce-back banner, intro line, ending card.
import { COLORS, VIEW, AREA, DIFFICULTY, KO } from '../config.js';
import { rect, text, bevel, outline, heart, hintRow } from '../utils/draw.js';
import { check } from './icons.js';
import { clamp, easeOutBack } from '../utils/math.js';

const DIFF_COLORS = { easy: COLORS.lime, normal: COLORS.yellow, hard: COLORS.red };

export const diffColor = (name) => DIFF_COLORS[name];

// The K.O. screen. The caller draws the frozen sector first; this dims it and slams the title in.
export function drawKo(g, t, difficulty, hasHint) {
  g.globalAlpha = 0.72;
  rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.ink);
  g.globalAlpha = 0.25;
  rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.red);
  g.globalAlpha = 1;
  const slam = easeOutBack(clamp(t / 0.3, 0, 1));
  const y = Math.round(-40 + slam * 76);
  const jitter = t < 0.5 ? Math.round(Math.sin(t * 90) * 2) : 0;
  text(g, 'K.O.', VIEW.width / 2 + jitter + 4, y + 4, COLORS.ink, 'center', 32);
  text(g, 'K.O.', VIEW.width / 2 + jitter, y, Math.floor(t * 5) % 2 ? COLORS.yellow : COLORS.white, 'center', 32);
  text(g, 'SYSTEM CRASHED', VIEW.width / 2, 78, COLORS.red, 'center');
  for (let i = 0; i < 3; i++) heart(g, VIEW.width / 2 - 14 + i * 10, 92, COLORS.slate);
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
  bevel(g, AREA.w / 2 - 52, 18, 104, 14, COLORS.night, true);
  text(g, 'BOUNCE BACK!', AREA.w / 2, 21, Math.floor(timeLeft * 10) % 2 ? COLORS.yellow : COLORS.teal, 'center');
}

export function drawIntro(g, line) {
  rect(g, 0, 17, AREA.w, 12, COLORS.ink);
  text(g, line, AREA.w / 2, 19, COLORS.yellow, 'center');
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
  text(g, DIFFICULTY[state.difficulty].label, 160, 114, DIFF_COLORS[state.difficulty], 'center');
  if (Math.floor(time * 2.5) % 2 === 0) hintRow(g, 160, 126, ['enter']);
}
