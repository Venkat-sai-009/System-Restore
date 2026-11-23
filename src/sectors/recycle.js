// recycle.sys: junk rains down the desktop. Catch the red junk in the bin, let the yellow files fall.
import { COLORS, RECYCLE as P } from '../config.js';
import { rect, hearts, bar } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const MAX_ITEMS = 10;
const ITEM = 10;
const BIN_W = 30;
const BIN_H = 14;
const CEILING = 16;
const FLOOR_H = 6;
const JUNK = 1;
const FILE = 2;

let s = null;
let ctx = null;

const binY = () => ctx.H - FLOOR_H - BIN_H;

function spawn() {
  const it = s.items.find((q) => !q.kind);
  if (!it) return;
  it.kind = Math.random() < P.fileChance ? FILE : JUNK;
  it.x = rand(ITEM, ctx.W - ITEM);
  it.y = CEILING;
  it.vy = P.fall * s.speed * rand(0.85, 1.15);
}

function caught(it) {
  if (it.kind === JUNK) {
    s.score += 1;
    ctx.sfx.pickup();
    ctx.particles.burst(it.x, binY(), COLORS.lime, 8, 60, 0.35, 80, 2);
  } else {
    s.hp -= 1;
    ctx.sfx.hit();
    ctx.fx.shake(3);
    ctx.fx.glitch(0.3);
    ctx.particles.burst(it.x, binY(), COLORS.yellow, 10, 70, 0.5, 80, 2);
  }
  it.kind = 0;
}

function drawItem(g, it) {
  const x = Math.round(it.x) - ITEM / 2;
  const y = Math.round(it.y);
  if (it.kind === FILE) {
    rect(g, x, y, ITEM, ITEM, COLORS.yellow);
    rect(g, x + 2, y + 3, 6, 1, COLORS.white);
    rect(g, x + 2, y + 6, 4, 1, COLORS.white);
  } else {
    rect(g, x, y, ITEM, ITEM, COLORS.red);
    rect(g, x + 2, y + 2, 2, 2, COLORS.white);
    rect(g, x + 6, y + 2, 2, 2, COLORS.white);
    rect(g, x + 2, y + 7, 6, 1, COLORS.ink);
  }
}

function drawBin(g) {
  const x = Math.round(s.x) - BIN_W / 2;
  const y = binY();
  rect(g, x - 2, y, BIN_W + 4, 3, COLORS.slate);
  rect(g, x, y + 3, BIN_W, BIN_H - 3, COLORS.teal);
  rect(g, x + 2, y + 5, 2, BIN_H - 7, COLORS.white);
  rect(g, x + BIN_W / 2 - 1, y + 5, 2, BIN_H - 7, COLORS.white);
  rect(g, x + BIN_W - 4, y + 5, 2, BIN_H - 7, COLORS.white);
}

export default {
  id: 'recycle',
  title: 'recycle.sys',
  intro: 'CATCH RED JUNK. NOT YELLOW FILES!',
  duration: P.timeLimit,
  glitches: ['flip', 'rush'],
  hints: ['left', 'right'],
  hintAt: { x: 152, y: 100 },
  init(c) {
    ctx = c;
    s = {
      items: Array.from({ length: MAX_ITEMS }, () => ({ kind: 0, x: 0, y: 0, vy: 0 })),
      x: c.W / 2, score: 0, hp: c.lives(P.hp), t: 0, spawnTimer: 0.4,
      goal: P.goal + c.diff.extra * 2,
      limit: P.timeLimit * c.diff.time + c.bonus.time,
      speed: c.diff.speed * (1 + 0.05 * c.twist),
    };
  },
  update(dt) {
    s.t += dt;
    s.x = clamp(s.x + ctx.input.axisX() * P.binSpeed * dt, BIN_W / 2, ctx.W - BIN_W / 2);
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = (P.spawnEvery / s.speed) * rand(0.7, 1.2);
      spawn();
    }
    for (const it of s.items) {
      if (!it.kind) continue;
      it.y += it.vy * dt;
      const inBin = Math.abs(it.x - s.x) < BIN_W / 2 + ITEM / 2 - 2;
      if (it.y + ITEM >= binY() && it.y < binY() + 4 && inBin) caught(it);
      else if (it.y > ctx.H - FLOOR_H) it.kind = 0;
    }
    if (s.hp <= 0) return 'lose';
    if (s.score >= s.goal) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.desk);
    for (let y = 20; y < ctx.H; y += 16) rect(g, 0, y, ctx.W, 1, COLORS.deskLine);
    rect(g, 0, 0, ctx.W, CEILING, COLORS.night);
    rect(g, 0, ctx.H - FLOOR_H, ctx.W, FLOOR_H, COLORS.night);
    for (const it of s.items) if (it.kind) drawItem(g, it);
    drawBin(g);
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    const left = 1 - s.t / s.limit;
    bar(g, ctx.W / 2 - 40, 4, 80, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.ink);
    bar(g, ctx.W - 64, 4, 58, 6, s.score / s.goal, COLORS.lime, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
