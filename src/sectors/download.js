// download.sys: mash Space to fill the download bar. When the wifi goes red, STOP or you lose a heart.
import { COLORS, DOWNLOAD as P } from '../config.js';
import { rect, hearts, bar, text, outline } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const GREEN = 0;
const WARN = 1;
const RED = 2;
const BAR_X = 40;
const BAR_Y = 84;
const BAR_W = 240;
const BAR_H = 20;
const PRESS_FLASH = 0.08;

let s = null;
let ctx = null;

function nextPhase() {
  if (s.phase === GREEN) {
    s.phase = WARN;
    s.phaseT = P.warnTime;
  } else if (s.phase === WARN) {
    s.phase = RED;
    s.phaseT = rand(P.redMin, P.redMax);
    ctx.sfx.error();
  } else {
    s.phase = GREEN;
    s.phaseT = rand(P.greenMin, P.greenMax) / s.speed;
  }
}

function mash() {
  s.flash = PRESS_FLASH;
  if (s.phase !== RED) {
    s.progress = clamp(s.progress + P.perPress, 0, 1);
    ctx.sfx.blip();
    return;
  }
  if (s.cool > 0) return;
  s.cool = P.penaltyCooldown;
  s.hp -= 1;
  s.progress = Math.max(0, s.progress - P.penalty);
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.4);
  ctx.particles.burst(ctx.W / 2, BAR_Y, COLORS.red, 10, 80, 0.5, 60, 2);
}

function drawStatus(g) {
  const color = s.phase === RED ? COLORS.red : s.phase === WARN ? COLORS.yellow : COLORS.lime;
  const cx = ctx.W / 2;
  rect(g, cx - 28, 22, 56, 38, COLORS.ink);
  outline(g, cx - 28, 22, 56, 38, color, 2);
  const lit = s.phase === RED ? 0 : s.phase === WARN ? 1 : 3;
  // Wifi arcs: widest on top, the smallest one lights first.
  for (let i = 0; i < 3; i++) {
    const w = 32 - i * 10;
    rect(g, cx - w / 2, 28 + i * 6, w, 3, 3 - i <= lit ? color : COLORS.slate);
  }
  rect(g, cx - 2, 48, 4, 4, color);
  if (s.phase === RED) {
    rect(g, cx - 20, 26, 40, 2, COLORS.red);
    text(g, 'STOP!', cx, 68, Math.floor(s.t * 8) % 2 ? COLORS.red : COLORS.white, 'center');
  } else if (s.phase === GREEN) {
    text(g, 'MASH SPACE!', cx, 68, COLORS.white, 'center');
  }
}

export default {
  id: 'download',
  title: 'download.sys',
  intro: 'MASH WHILE GREEN. STOP ON RED!',
  duration: P.timeLimit,
  glitches: ['flip', 'rush'],
  hints: ['space'],
  hintAt: { x: 152, y: 124 },
  init(c) {
    ctx = c;
    s = {
      progress: 0, hp: c.lives(P.hp), t: 0, flash: 0, cool: 0,
      phase: GREEN, phaseT: P.greenMax,
      limit: P.timeLimit * c.diff.time + c.bonus.time,
      speed: c.diff.speed * (1 + 0.05 * c.twist),
    };
  },
  update(dt) {
    s.t += dt;
    s.flash = Math.max(0, s.flash - dt);
    s.cool = Math.max(0, s.cool - dt);
    s.phaseT -= dt;
    if (s.phaseT <= 0) nextPhase();
    const inp = ctx.input;
    if (inp.pressed('action') || inp.pressed('confirm') || inp.pointer.clicked) mash();
    if (s.hp <= 0) return 'lose';
    if (s.progress >= 1) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.desk);
    for (let y = 20; y < ctx.H; y += 16) rect(g, 0, y, ctx.W, 1, COLORS.deskLine);
    rect(g, 0, 0, ctx.W, 16, COLORS.night);
    drawStatus(g);
    rect(g, BAR_X - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4, COLORS.ink);
    const fill = Math.round(BAR_W * s.progress);
    rect(g, BAR_X, BAR_Y, fill, BAR_H, s.flash > 0 ? COLORS.white : COLORS.teal);
    for (let x = BAR_X + (Math.floor(s.t * 20) % 8); x < BAR_X + fill; x += 8) rect(g, x, BAR_Y, 3, BAR_H, COLORS.lime);
    text(g, Math.round(s.progress * 100) + '%', ctx.W / 2, BAR_Y + BAR_H + 8, COLORS.white, 'center');
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    const left = 1 - s.t / s.limit;
    bar(g, ctx.W - 84, 4, 78, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
