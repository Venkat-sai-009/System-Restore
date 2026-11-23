// task.sys: a task manager. Every process keeps filling up. Kill the fullest one before it crashes.
import { COLORS, TASK as P, AREA } from '../config.js';
import { rect, hearts, bar, outline } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const ROWS = 5;
const ROW_H = 22;
const FIRST_Y = 22;
const BAR_X = 46;
const BAR_W = 248;
const BAR_H = 12;
const WARN = 0.6;
const DANGER = 0.85;
const RATE_MIN = 0.04;
const RATE_MAX = 0.16;
const RETHINK_MIN = 1.5;
const RETHINK_MAX = 3.5;

let s = null;
let ctx = null;

const rowY = (i) => FIRST_Y + i * ROW_H;

function killRow(i) {
  s.sel = i;
  const r = s.rows[i];
  if (r.v > 0.05) {
    ctx.sfx.explode();
    ctx.particles.burst(BAR_X + BAR_W * r.v, rowY(i) + BAR_H / 2, COLORS.lime, 8, 70, 0.4, 60, 2);
  }
  r.v = 0;
}

function crash(r, i) {
  r.v = 0;
  s.hp -= 1;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.4);
  ctx.particles.burst(BAR_X + BAR_W, rowY(i) + BAR_H / 2, COLORS.red, 12, 90, 0.5, 60, 2);
}

function handleInput() {
  const inp = ctx.input;
  if (inp.pressed('up')) s.sel = Math.max(0, s.sel - 1);
  if (inp.pressed('down')) s.sel = Math.min(ROWS - 1, s.sel + 1);
  if (inp.pressed('action') || inp.pressed('confirm')) killRow(s.sel);
  const p = inp.pointer;
  if (p.clicked) {
    const row = Math.floor((p.y - AREA.y - FIRST_Y) / ROW_H);
    if (row >= 0 && row < ROWS) killRow(row);
  }
}

function drawRow(g, r, i) {
  const y = rowY(i);
  const hot = r.v > DANGER;
  const color = hot ? COLORS.red : r.v > WARN ? COLORS.yellow : COLORS.lime;
  rect(g, 6, y, 34, BAR_H, r.icon);
  rect(g, 10, y + 3, 14, 2, COLORS.white);
  rect(g, 10, y + 7, 8, 2, COLORS.white);
  rect(g, BAR_X, y, BAR_W, BAR_H, COLORS.ink);
  const blink = hot && Math.floor(s.t * 10) % 2 === 0;
  rect(g, BAR_X + 1, y + 1, Math.round((BAR_W - 2) * r.v), BAR_H - 2, blink ? COLORS.white : color);
  if (i === s.sel) outline(g, BAR_X - 2, y - 2, BAR_W + 4, BAR_H + 4, Math.floor(s.t * 4) % 2 ? COLORS.white : COLORS.yellow, 1);
}

export default {
  id: 'task',
  title: 'task.sys',
  intro: 'KILL THE FULLEST BAR!',
  duration: P.surviveTime,
  glitches: ['flip', 'rush'],
  hints: ['up', 'down', 'space'],
  hintAt: { x: 152, y: 134 },
  init(c) {
    ctx = c;
    const icons = [COLORS.red, COLORS.purple, COLORS.orange, COLORS.pink, COLORS.blue];
    s = {
      t: 0, sel: 2, hp: c.lives(P.hp), limit: P.surviveTime,
      speed: c.diff.speed * (1 + 0.06 * c.twist),
      rows: icons.map((icon) => ({ v: rand(0, 0.3), rate: rand(RATE_MIN, RATE_MAX), think: rand(0, RETHINK_MAX), icon })),
    };
  },
  update(dt) {
    s.t += dt;
    handleInput();
    s.rows.forEach((r, i) => {
      r.think -= dt;
      if (r.think <= 0) {
        r.think = rand(RETHINK_MIN, RETHINK_MAX);
        r.rate = rand(RATE_MIN, RATE_MAX);
      }
      r.v = clamp(r.v + r.rate * s.speed * dt, 0, 1);
      if (r.v >= 1) crash(r, i);
    });
    if (s.hp <= 0) return 'lose';
    return s.t >= s.limit ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.night);
    rect(g, 0, 0, ctx.W, 16, COLORS.ink);
    s.rows.forEach((r, i) => drawRow(g, r, i));
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    bar(g, ctx.W - 84, 4, 78, 6, s.t / s.limit, COLORS.teal, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
