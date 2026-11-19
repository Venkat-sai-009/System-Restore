// cache.sys: bounce the ball off your paddle and smash every brick in the cache.
import { COLORS, BREAKOUT as P } from '../config.js';
import { rect, hearts, bar } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const ROW_COLORS = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.lime, COLORS.teal];
const WALL_TOP = 14;
const MAX_ANGLE = 1.05; // radians off vertical when the ball hits the paddle edge
const STEP_PIXELS = 2.5; // largest distance the ball may move in one physics step
const MIN_VERTICAL = 0.3; // keeps the ball from bouncing sideways forever
const PADDLE_JITTER = 0.15;
const ASSIST = 0.3; // gentle steering toward the nearest brick so rallies never get stuck

let s = null;
let ctx = null;

const paddleY = () => ctx.H - 12;

function brickPos(i) {
  const c = i % P.cols;
  const r = Math.floor(i / P.cols);
  const left = (ctx.W - (P.cols * (P.brickW + P.gap) - P.gap)) / 2;
  return { x: left + c * (P.brickW + P.gap), y: P.top + r * (P.brickH + P.gap), row: r };
}

function launch() {
  const b = s.ball;
  b.stuck = false;
  const ang = rand(-0.35, 0.35);
  b.vx = Math.sin(ang) * s.speed;
  b.vy = -Math.cos(ang) * s.speed;
  ctx.sfx.jump();
}

function setSpeed() {
  const b = s.ball;
  const len = Math.hypot(b.vx, b.vy) || 1;
  b.vx = (b.vx / len) * s.speed;
  b.vy = (b.vy / len) * s.speed;
  if (Math.abs(b.vy) < s.speed * MIN_VERTICAL) {
    b.vy = Math.sign(b.vy || -1) * s.speed * MIN_VERTICAL;
    b.vx = Math.sign(b.vx || 1) * Math.sqrt(s.speed * s.speed - b.vy * b.vy);
  }
}

// Small angle nudge toward the closest remaining brick.
function assistAngle() {
  let best = 0;
  let bestDist = 1e9;
  for (let i = 0; i < s.bricks.length; i++) {
    if (!s.bricks[i]) continue;
    const d = Math.abs(brickPos(i).x + P.brickW / 2 - s.ball.x);
    if (d < bestDist) {
      bestDist = d;
      best = brickPos(i).x + P.brickW / 2 - s.ball.x;
    }
  }
  return clamp(best / ctx.W, -ASSIST, ASSIST);
}

function hitPaddle() {
  const b = s.ball;
  const rel = clamp((b.x - s.px) / (s.pw / 2) + rand(-PADDLE_JITTER, PADDLE_JITTER) + assistAngle(), -1, 1);
  b.vx = Math.sin(rel * MAX_ANGLE) * s.speed;
  b.vy = -Math.cos(rel * MAX_ANGLE) * s.speed;
  b.y = paddleY() - 2;
  ctx.sfx.bounce();
  ctx.particles.burst(b.x, b.y, COLORS.teal, 4, 40, 0.25, 0, 1);
}

function hitBrick(i) {
  const b = s.ball;
  const p = brickPos(i);
  const ox = Math.min(b.x + 2 - p.x, p.x + P.brickW - (b.x - 2));
  const oy = Math.min(b.y + 2 - p.y, p.y + P.brickH - (b.y - 2));
  if (ox < oy) b.vx = -b.vx;
  else b.vy = -b.vy;
  s.bricks[i] = false;
  s.left -= 1;
  s.speed = Math.min(P.ballMax, s.speed + P.speedPerBrick);
  setSpeed();
  ctx.sfx.pickup();
  ctx.particles.burst(p.x + P.brickW / 2, p.y + P.brickH / 2, ROW_COLORS[p.row % ROW_COLORS.length], 6, 60, 0.4, 100, 2);
}

// Returns true when the ball fell off the bottom.
function stepBall(h) {
  const b = s.ball;
  b.x += b.vx * h;
  b.y += b.vy * h;
  if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); }
  if (b.x > ctx.W - 3) { b.x = ctx.W - 3; b.vx = -Math.abs(b.vx); }
  if (b.y < WALL_TOP + 2) { b.y = WALL_TOP + 2; b.vy = Math.abs(b.vy); setSpeed(); }
  const py = paddleY();
  if (b.vy > 0 && b.y + 2 >= py && b.y <= py + P.paddleH && Math.abs(b.x - s.px) <= s.pw / 2 + 2) hitPaddle();
  if (b.y < P.top + s.rows * (P.brickH + P.gap)) {
    for (let i = 0; i < s.bricks.length; i++) {
      if (!s.bricks[i]) continue;
      const p = brickPos(i);
      if (b.x + 2 > p.x && b.x - 2 < p.x + P.brickW && b.y + 2 > p.y && b.y - 2 < p.y + P.brickH) {
        hitBrick(i);
        break;
      }
    }
  }
  return b.y > ctx.H + 4;
}

function drawBricks(g) {
  for (let i = 0; i < s.bricks.length; i++) {
    if (!s.bricks[i]) continue;
    const p = brickPos(i);
    const color = ROW_COLORS[p.row % ROW_COLORS.length];
    rect(g, p.x, p.y, P.brickW, P.brickH, color);
    rect(g, p.x, p.y, P.brickW, 2, COLORS.white);
    rect(g, p.x, p.y + P.brickH - 2, P.brickW, 2, COLORS.ink);
  }
}

export default {
  id: 'breakout',
  title: 'cache.sys',
  intro: 'BOUNCE THE BALL, CLEAR THE CACHE!',
  duration: 40,
  glitches: ['flip', 'mirror', 'rush'],
  hints: ['left', 'right', 'space'],
  hintAt: { x: 152, y: 100 },
  init(c) {
    ctx = c;
    const rows = clamp(P.rows + Math.sign(c.diff.extra), 2, 6);
    const widen = c.diff.hearts > 0 ? 1.3 : c.diff.hearts < 0 ? 0.8 : 1;
    s = {
      rows, bricks: new Array(rows * P.cols).fill(true), left: rows * P.cols, pw: P.paddleW * widen,
      px: c.W / 2, hp: c.lives(P.hp), wait: 0, t: 0,
      speed: P.ballSpeed * c.diff.speed * (1 + 0.05 * c.twist),
      ball: { x: c.W / 2, y: 0, vx: 0, vy: 0, stuck: true },
    };
  },
  update(dt) {
    s.t += dt;
    s.px = clamp(s.px + ctx.input.axisX() * P.paddleSpeed * dt, s.pw / 2 + 2, ctx.W - s.pw / 2 - 2);
    const b = s.ball;
    if (b.stuck) {
      b.x = s.px;
      b.y = paddleY() - 3;
      s.wait += dt;
      if (ctx.input.pressed('action') || ctx.input.pressed('up') || s.wait > P.autoLaunch) launch();
      return 'playing';
    }
    const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / STEP_PIXELS));
    for (let i = 0; i < steps; i++) {
      if (stepBall(dt / steps)) {
        s.hp -= 1;
        ctx.sfx.hit();
        ctx.fx.shake(3);
        ctx.fx.glitch(0.3);
        ctx.particles.burst(b.x, ctx.H - 4, COLORS.red, 8, 70, 0.5, 80, 2);
        if (s.hp <= 0) return 'lose';
        b.stuck = true;
        s.wait = 0;
        return 'playing';
      }
    }
    return s.left <= 0 ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.night);
    for (let x = 0; x < ctx.W; x += 16) rect(g, x, WALL_TOP, 1, ctx.H, COLORS.ink);
    rect(g, 0, WALL_TOP, ctx.W, 2, COLORS.slate);
    rect(g, 0, WALL_TOP, 2, ctx.H, COLORS.slate);
    rect(g, ctx.W - 2, WALL_TOP, 2, ctx.H, COLORS.slate);
    drawBricks(g);
    const total = s.rows * P.cols;
    const py = paddleY();
    rect(g, s.px - s.pw / 2, py, s.pw, P.paddleH, COLORS.teal);
    rect(g, s.px - s.pw / 2, py, s.pw, 2, COLORS.white);
    rect(g, s.px - s.pw / 2 - 2, py + 1, 2, 3, COLORS.blue);
    rect(g, s.px + s.pw / 2, py + 1, 2, 3, COLORS.blue);
    rect(g, s.ball.x - 2, s.ball.y - 2, 4, 4, COLORS.yellow);
    rect(g, s.ball.x - 1, s.ball.y - 1, 2, 2, COLORS.white);
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    bar(g, ctx.W - 84, 4, 78, 6, 1 - s.left / total, COLORS.lime, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
