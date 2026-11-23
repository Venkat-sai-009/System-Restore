// spam.sys: error popups bounce around the desktop. Steer the cursor and close them before they time out.
import { COLORS, SPAM as P, AREA } from '../config.js';
import { rect, hearts, bar, bevel } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const MAX_POPUPS = 6;
const POP_W = 44;
const POP_H = 28;
const TITLE_H = 9;
const CLOSE_SIZE = 7;
const CLOSE_HIT = 6; // forgiving hit area around the X button
const CEILING = 16;
const CURSOR_START_Y = 100;

let s = null;
let ctx = null;

const closeX = (p) => p.x + POP_W - CLOSE_SIZE - 2;
const closeY = (p) => p.y + 1;

function spawn() {
  const p = s.pops.find((q) => !q.alive);
  if (!p) return;
  const angle = rand(0, Math.PI * 2);
  p.alive = true;
  p.x = rand(8, ctx.W - POP_W - 8);
  p.y = rand(CEILING + 4, ctx.H - POP_H - 8);
  p.vx = Math.cos(angle) * s.speed;
  p.vy = Math.sin(angle) * s.speed;
  p.age = 0;
}

function closeAt(px, py) {
  for (const p of s.pops) {
    if (!p.alive) continue;
    const cx = closeX(p) + CLOSE_SIZE / 2;
    const cy = closeY(p) + CLOSE_SIZE / 2;
    if (Math.abs(px - cx) <= CLOSE_HIT && Math.abs(py - cy) <= CLOSE_HIT) {
      p.alive = false;
      s.closed += 1;
      ctx.sfx.explode();
      ctx.particles.burst(cx, cy, COLORS.teal, 8, 60, 0.4, 80, 2);
      return;
    }
  }
}

function missed(p) {
  p.alive = false;
  s.hp -= 1;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(p.x + POP_W / 2, p.y + POP_H / 2, COLORS.red, 10, 70, 0.5, 80, 2);
}

function handleInput(dt) {
  const inp = ctx.input;
  s.cx = clamp(s.cx + inp.axisX() * P.cursorSpeed * dt, 0, ctx.W);
  s.cy = clamp(s.cy + inp.axisY() * P.cursorSpeed * dt, CEILING, ctx.H);
  if (inp.pressed('action') || inp.pressed('confirm')) closeAt(s.cx, s.cy);
  const p = inp.pointer;
  if (p.moved && p.x >= 0) {
    s.cx = clamp(p.x - AREA.x, 0, ctx.W);
    s.cy = clamp(p.y - AREA.y, CEILING, ctx.H);
  }
  if (p.clicked) closeAt(p.x - AREA.x, p.y - AREA.y);
}

function movePopup(p, dt) {
  p.age += dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < 0 || p.x + POP_W > ctx.W) {
    p.vx = -p.vx;
    p.x = clamp(p.x, 0, ctx.W - POP_W);
    ctx.sfx.bounce();
  }
  if (p.y < CEILING || p.y + POP_H > ctx.H) {
    p.vy = -p.vy;
    p.y = clamp(p.y, CEILING, ctx.H - POP_H);
  }
}

function drawPopup(g, p) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const urgent = p.age > s.life * 0.7 && Math.floor(p.age * 10) % 2 === 0;
  bevel(g, x, y, POP_W, POP_H, COLORS.grey);
  rect(g, x + 1, y + 1, POP_W - 2, TITLE_H, urgent ? COLORS.orange : COLORS.red);
  rect(g, closeX(p), closeY(p) + 1, CLOSE_SIZE, CLOSE_SIZE, COLORS.white);
  rect(g, closeX(p) + 2, closeY(p) + 3, 3, 3, COLORS.red);
  rect(g, x + 4, y + TITLE_H + 6, 8, 8, COLORS.yellow);
  rect(g, x + 7, y + TITLE_H + 8, 2, 3, COLORS.ink);
  rect(g, x + 16, y + TITLE_H + 8, 22, 2, COLORS.slate);
  rect(g, x + 16, y + TITLE_H + 12, 14, 2, COLORS.slate);
}

function drawCursor(g) {
  const x = Math.round(s.cx);
  const y = Math.round(s.cy);
  rect(g, x, y, 2, 10, COLORS.ink);
  rect(g, x, y, 7, 2, COLORS.ink);
  rect(g, x + 1, y + 1, 1, 8, COLORS.white);
  rect(g, x + 1, y + 1, 5, 1, COLORS.white);
  rect(g, x + 2, y + 2, 2, 5, COLORS.white);
}

export default {
  id: 'spam',
  title: 'spam.sys',
  intro: 'CLOSE THE POPUPS!',
  duration: P.timeLimit,
  glitches: ['flip', 'rush'],
  hints: ['left', 'right', 'up', 'down', 'space'],
  hintAt: { x: 152, y: 124 },
  init(c) {
    ctx = c;
    s = {
      pops: Array.from({ length: MAX_POPUPS }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, age: 0 })),
      cx: c.W / 2, cy: CURSOR_START_Y, closed: 0, hp: c.lives(P.hp), t: 0, spawnTimer: 0.4,
      goal: P.goal + c.diff.extra * 2,
      limit: P.timeLimit * c.diff.time + c.bonus.time,
      speed: P.popSpeed * c.diff.speed * (1 + 0.06 * c.twist),
      life: P.popLife * c.diff.time,
    };
  },
  update(dt) {
    s.t += dt;
    handleInput(dt);
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = (P.spawnEvery / c2(s.speed)) * rand(0.8, 1.2);
      spawn();
    }
    for (const p of s.pops) {
      if (!p.alive) continue;
      movePopup(p, dt);
      if (p.age >= s.life) missed(p);
    }
    if (s.hp <= 0) return 'lose';
    if (s.closed >= s.goal) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.desk);
    for (let y = 20; y < ctx.H; y += 16) rect(g, 0, y, ctx.W, 1, COLORS.deskLine);
    rect(g, 0, 0, ctx.W, CEILING, COLORS.night);
    for (const p of s.pops) if (p.alive) drawPopup(g, p);
    drawCursor(g);
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    const left = 1 - s.t / s.limit;
    bar(g, ctx.W / 2 - 40, 4, 80, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.ink);
    bar(g, ctx.W - 64, 4, 58, 6, s.closed / s.goal, COLORS.lime, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};

// Faster popups also spawn a bit faster, but never more than twice as fast.
function c2(speedValue) {
  return clamp(speedValue / P.popSpeed, 0.75, 2);
}
