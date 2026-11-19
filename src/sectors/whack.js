// bugfix.sys: whack the bugs as they pop up. Do not hit the friendly yellow files!
import { COLORS, WHACK as P, AREA } from '../config.js';
import { rect, hearts, bar, outline } from '../utils/draw.js';
import { clamp, rand, easeOutBack } from '../utils/math.js';

const COLS = 3;
const HOLES = 9;
const SPACING_X = 80;
const SPACING_Y = 36;
const FIRST_Y = 58;
const HIT_W = 36;
const HIT_H = 34;
const BUG = 1;
const FILE = 2;
const SWING_TIME = 0.14;

let s = null;
let ctx = null;

const holeX = (i) => ctx.W / 2 + ((i % COLS) - 1) * SPACING_X;
const holeY = (i) => FIRST_Y + Math.floor(i / COLS) * SPACING_Y;

function spawn() {
  const free = [];
  for (let i = 0; i < HOLES; i++) if (!s.holes[i].kind) free.push(i);
  if (!free.length) return;
  const h = s.holes[free[Math.floor(Math.random() * free.length)]];
  h.kind = Math.random() < P.fileChance ? FILE : BUG;
  h.t = 0;
  h.life = (P.upTime / s.speed) * rand(0.85, 1.15);
}

function whackAt(i) {
  s.cursor = i;
  s.swing = SWING_TIME;
  const h = s.holes[i];
  const x = holeX(i);
  const y = holeY(i);
  if (h.kind === BUG) {
    h.kind = 0;
    s.hits += 1;
    ctx.sfx.explode();
    ctx.particles.burst(x, y - 10, COLORS.lime, 10, 70, 0.45, 100, 2);
    ctx.particles.burst(x, y - 10, COLORS.yellow, 4, 50, 0.3, 0, 2);
  } else if (h.kind === FILE) {
    h.kind = 0;
    s.hp -= 1;
    ctx.sfx.hit();
    ctx.fx.shake(3);
    ctx.fx.glitch(0.3);
    ctx.particles.burst(x, y - 10, COLORS.yellow, 10, 70, 0.5, 100, 2);
  } else {
    ctx.sfx.land();
  }
}

function handleInput() {
  const inp = ctx.input;
  const cx = s.cursor % COLS;
  const cy = Math.floor(s.cursor / COLS);
  if (inp.pressed('left') && cx > 0) s.cursor -= 1;
  if (inp.pressed('right') && cx < COLS - 1) s.cursor += 1;
  if (inp.pressed('up') && cy > 0) s.cursor -= COLS;
  if (inp.pressed('down') && cy < 2) s.cursor += COLS;
  if (inp.pressed('action') || inp.pressed('confirm')) whackAt(s.cursor);
  const p = inp.pointer;
  if (p.clicked) {
    const mx = p.x - AREA.x;
    const my = p.y - AREA.y;
    for (let i = 0; i < HOLES; i++) {
      if (Math.abs(mx - holeX(i)) < HIT_W && my > holeY(i) - HIT_H && my < holeY(i) + 10) {
        whackAt(i);
        break;
      }
    }
  }
}

function drawBug(g, x, y, up) {
  const h = Math.round(18 * up);
  const top = y - h;
  rect(g, x - 9, top + 4, 18, h, COLORS.lime);
  rect(g, x - 7, top, 14, 5, COLORS.lime);
  rect(g, x - 5, top + 4, 4, 4, COLORS.white);
  rect(g, x + 2, top + 4, 4, 4, COLORS.white);
  rect(g, x - 4, top + 5, 2, 3, COLORS.red);
  rect(g, x + 3, top + 5, 2, 3, COLORS.red);
  rect(g, x - 9, top - 3, 2, 4, COLORS.ink);
  rect(g, x + 7, top - 3, 2, 4, COLORS.ink);
  rect(g, x - 9, top + 4 + h - 4, 18, 2, COLORS.green);
}

function drawFile(g, x, y, up) {
  const h = Math.round(18 * up);
  const top = y - h;
  rect(g, x - 9, top + 2, 18, h, COLORS.yellow);
  rect(g, x - 9, top, 8, 3, COLORS.yellow);
  rect(g, x - 6, top + 6, 12, 2, COLORS.white);
  rect(g, x - 6, top + 10, 8, 2, COLORS.white);
  rect(g, x - 9, top + 2, 18, 1, COLORS.white);
}

function drawHole(g, i) {
  const x = holeX(i);
  const y = holeY(i);
  const h = s.holes[i];
  rect(g, x - 24, y - 4, 48, 12, COLORS.brickDark);
  rect(g, x - 20, y - 6, 40, 4, COLORS.brickDark);
  rect(g, x - 20, y - 2, 40, 8, COLORS.ink);
  if (h.kind) {
    const up = clamp(h.t / 0.12, 0, 1) * (h.life - h.t < 0.12 ? clamp((h.life - h.t) / 0.12, 0, 1) : 1);
    (h.kind === BUG ? drawBug : drawFile)(g, x, y + 2, easeOutBack(up) > 1 ? 1 : Math.max(0, easeOutBack(up)));
  }
  rect(g, x - 24, y + 2, 48, 8, COLORS.dirt);
  rect(g, x - 24, y + 2, 48, 2, COLORS.gold);
}

function drawMallet(g) {
  const x = holeX(s.cursor);
  const y = holeY(s.cursor);
  const down = s.swing > 0 ? 1 : 0;
  outline(g, x - 28, y - 30, 56, 44, Math.floor(s.t * 6) % 2 ? COLORS.yellow : COLORS.white, 2);
  rect(g, x + 14, y - 34 + down * 14, 4, 18, COLORS.brick);
  rect(g, x + 6, y - 38 + down * 14, 18, 8, COLORS.slate);
  rect(g, x + 6, y - 38 + down * 14, 18, 2, COLORS.white);
}

export default {
  id: 'whack',
  title: 'bugfix.sys',
  intro: 'WHACK THE BUGS, SPARE THE FILES!',
  duration: P.timeLimit,
  hints: ['left', 'right', 'up', 'down', 'space'],
  hintAt: { x: 152, y: 124 },
  init(c) {
    ctx = c;
    s = {
      holes: Array.from({ length: HOLES }, () => ({ kind: 0, t: 0, life: 1 })),
      cursor: 4, hits: 0, hp: P.hp + c.diff.hearts, t: 0, swing: 0, spawnTimer: 0.5,
      goal: P.goal + c.diff.extra * 2, limit: P.timeLimit * c.diff.time,
      speed: c.diff.speed * (1 + 0.06 * c.twist),
    };
  },
  update(dt) {
    s.t += dt;
    s.swing = Math.max(0, s.swing - dt);
    handleInput();
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = (P.spawnEvery / s.speed) * rand(0.7, 1.2);
      spawn();
    }
    for (const h of s.holes) {
      if (!h.kind) continue;
      h.t += dt;
      if (h.t >= h.life) h.kind = 0;
    }
    if (s.hp <= 0) return 'lose';
    if (s.hits >= s.goal) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.grassLight);
    for (let y = 0; y < ctx.H; y += 12) rect(g, 0, y, ctx.W, 6, COLORS.grassDark);
    rect(g, 0, 0, ctx.W, 16, COLORS.night);
    for (let i = 0; i < HOLES; i++) drawHole(g, i);
    drawMallet(g);
    hearts(g, 4, 3, s.hp, P.hp + ctx.diff.hearts);
    const left = 1 - s.t / s.limit;
    bar(g, ctx.W / 2 - 40, 4, 80, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.ink);
    bar(g, ctx.W - 64, 4, 58, 6, s.hits / s.goal, COLORS.lime, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
