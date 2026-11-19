// wifi.sys: flap your little signal robot through the gaps. The floor and ceiling are trampolines.
import { COLORS, FLAPPY as P } from '../config.js';
import { rect, hearts, bar } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const MAX_PIPES = 8;
const PIPE_W = 20;
const CEILING = 16;
const GROUND_H = 12;
const SIZE = 10;
const GAP_MARGIN = 36;
const MAX_GAP_SHIFT = 44;
const FLOOR_BOUNCE = 0.9;

let s = null;
let ctx = null;

const floorY = () => ctx.H - GROUND_H;

function spawnPipe(x) {
  const p = s.pipes.find((q) => !q.alive);
  if (!p) return;
  const lo = CEILING + GAP_MARGIN;
  const hi = floorY() - GAP_MARGIN;
  s.lastGap = clamp(s.lastGap + rand(-MAX_GAP_SHIFT, MAX_GAP_SHIFT), lo, hi);
  p.alive = true;
  p.x = x;
  p.gapY = s.lastGap;
  p.passed = false;
}

function flap() {
  s.vy = -P.flap;
  ctx.sfx.jump();
}

function hurt() {
  s.hp -= 1;
  s.invuln = P.invuln;
  s.vy = -P.flap * 0.8;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(P.playerX, s.y, COLORS.red, 10, 80, 0.5, 80, 2);
  return s.hp <= 0;
}

function hitsPipe(p) {
  const half = s.gap / 2;
  const inX = P.playerX + SIZE / 2 - 2 > p.x && P.playerX - SIZE / 2 + 2 < p.x + PIPE_W;
  return inX && (s.y - SIZE / 2 + 2 < p.gapY - half || s.y + SIZE / 2 - 2 > p.gapY + half);
}

function drawPipe(g, p) {
  const half = s.gap / 2;
  const top = p.gapY - half;
  const bottom = p.gapY + half;
  rect(g, p.x, CEILING, PIPE_W, top - CEILING, COLORS.green);
  rect(g, p.x - 2, top - 6, PIPE_W + 4, 6, COLORS.grassLight);
  rect(g, p.x, bottom, PIPE_W, floorY() - bottom, COLORS.green);
  rect(g, p.x - 2, bottom, PIPE_W + 4, 6, COLORS.grassLight);
  rect(g, p.x + 3, CEILING, 3, top - CEILING - 6, COLORS.lime);
  rect(g, p.x + 3, bottom + 6, 3, floorY() - bottom - 6, COLORS.lime);
}

function drawBackdrop(g) {
  rect(g, 0, 0, ctx.W, floorY(), COLORS.sky);
  rect(g, 0, 70, ctx.W, floorY() - 70, COLORS.skyLight);
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 90 - s.scroll * 0.3) % (ctx.W + 40)) + ctx.W + 40) % (ctx.W + 40)) - 30;
    rect(g, x, 30 + i * 14, 26, 7, COLORS.white);
    rect(g, x + 5, 26 + i * 14, 14, 5, COLORS.white);
  }
  rect(g, 0, 0, ctx.W, CEILING, COLORS.night);
  rect(g, 0, floorY(), ctx.W, GROUND_H, COLORS.grassLight);
  for (let x = -((s.scroll | 0) % 16); x < ctx.W; x += 16) rect(g, x, floorY() + 4, 8, 8, COLORS.grassDark);
  rect(g, 0, floorY(), ctx.W, 2, COLORS.yellow);
}

function drawPlayer(g) {
  if (s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0) return;
  const x = P.playerX - 5;
  const y = Math.round(s.y) - 5;
  const spin = Math.floor(s.t * 24) % 2;
  rect(g, x + (spin ? 0 : 2), y - 3, spin ? 10 : 6, 2, COLORS.yellow);
  rect(g, x + 4, y - 2, 2, 3, COLORS.slate);
  rect(g, x, y, SIZE, 8, COLORS.white);
  rect(g, x + 1, y + 2, 8, 4, COLORS.ink);
  rect(g, x + 2, y + 3, 2, 2, COLORS.teal);
  rect(g, x + 6, y + 3, 2, 2, COLORS.teal);
  rect(g, x + 1, y + 8, 8, 2, COLORS.red);
  for (let k = 0; k < 2; k++) rect(g, x - 5 - k * 4, y + 4 - k, 2, 2 + k * 2, COLORS.white);
}

export default {
  id: 'flappy',
  title: 'wifi.sys',
  intro: 'FLY THROUGH THE GAPS!',
  duration: 30,
  hints: ['up', 'space'],
  hintAt: { x: 152, y: 124 },
  init(c) {
    ctx = c;
    s = {
      y: c.H / 2, vy: 0, t: 0, scroll: 0, passed: 0, hp: P.hp + c.diff.hearts, invuln: 0,
      gap: P.gap - c.diff.hearts * 6, goal: P.goal + c.diff.extra, lastGap: c.H / 2,
      speed: P.scroll * c.diff.speed * (1 + 0.04 * c.twist),
      pipes: Array.from({ length: MAX_PIPES }, () => ({ alive: false, x: 0, gapY: 0, passed: false })),
    };
    spawnPipe(c.W + 30);
  },
  update(dt) {
    s.t += dt;
    s.invuln = Math.max(0, s.invuln - dt);
    s.scroll += s.speed * dt;
    const inp = ctx.input;
    if (inp.pressed('up') || inp.pressed('action') || inp.pressed('confirm') || inp.pointer.clicked) flap();
    s.vy += P.gravity * dt;
    s.y += s.vy * dt;
    if (s.y + SIZE / 2 > floorY()) {
      s.y = floorY() - SIZE / 2;
      s.vy = -P.flap * FLOOR_BOUNCE;
      ctx.sfx.bounce();
    }
    if (s.y - SIZE / 2 < CEILING) {
      s.y = CEILING + SIZE / 2;
      s.vy = Math.abs(s.vy) * 0.5;
    }
    let last = -1e9;
    for (const p of s.pipes) {
      if (!p.alive) continue;
      p.x -= s.speed * dt;
      last = Math.max(last, p.x);
      if (p.x < -PIPE_W - 4) p.alive = false;
      if (!p.passed && p.x + PIPE_W < P.playerX - SIZE / 2) {
        p.passed = true;
        s.passed += 1;
        ctx.sfx.pickup();
      }
      if (s.invuln <= 0 && hitsPipe(p) && hurt()) return 'lose';
    }
    if (last < ctx.W - P.spacing) spawnPipe(ctx.W + 10);
    return s.passed >= s.goal ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    drawBackdrop(g);
    for (const p of s.pipes) if (p.alive) drawPipe(g, p);
    drawPlayer(g);
    hearts(g, 4, 3, s.hp, P.hp + ctx.diff.hearts);
    bar(g, ctx.W - 84, 4, 78, 6, s.passed / s.goal, COLORS.teal, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
