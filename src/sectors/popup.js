// popup.sys: the desktop is the level. Hop across fake OS windows sliding by. The floor is a trampoline.
import { COLORS, POPUP as P } from '../config.js';
import { rect, hearts, bar, bevel } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const MAX_WINDOWS = 8;
const TITLE_H = 8;
const WIN_H = 22;
const PLAYER_W = 8;
const PLAYER_H = 10;
const MIN_Y = 60;
const MAX_Y_MARGIN = 26;
const MAX_Y_SHIFT = 36;
const MIN_W = 40;
const MAX_W = 64;

let s = null;
let ctx = null;

const floorY = () => ctx.H - 12;

function spawnWindow(x) {
  const w = s.wins.find((q) => !q.alive);
  if (!w) return;
  s.lastY = clamp(s.lastY + rand(-MAX_Y_SHIFT, MAX_Y_SHIFT), MIN_Y, floorY() - MAX_Y_MARGIN);
  w.alive = true;
  w.x = x;
  w.y = s.lastY;
  w.w = rand(MIN_W, MAX_W);
  w.landed = false;
}

function hurt() {
  s.hp -= 1;
  s.invuln = P.invuln;
  s.vy = -P.bounce;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(s.x, floorY(), COLORS.red, 10, 80, 0.5, 80, 2);
  return s.hp <= 0;
}

function landOn(w) {
  s.ground = w;
  if (!w.landed) {
    w.landed = true;
    s.score += 1;
    ctx.sfx.pickup();
    ctx.particles.burst(s.x, w.y, COLORS.teal, 6, 50, 0.3, 60, 2);
  }
}

function stepPlayer(dt) {
  const inp = ctx.input;
  s.x = clamp(s.x + inp.axisX() * P.runSpeed * dt, PLAYER_W, ctx.W - PLAYER_W);
  if (s.ground) {
    s.x -= s.speed * dt; // the window carries you
    if (inp.pressed('up') || inp.pressed('action') || inp.pressed('confirm')) {
      s.vy = -P.jump;
      s.ground = null;
      ctx.sfx.jump();
    } else if (s.x < s.ground.x - 2 || s.x > s.ground.x + s.ground.w + 2) {
      s.ground = null; // walked or got carried off the edge
    }
  }
  if (s.ground) return;
  const prevBottom = s.y;
  s.vy = Math.min(s.vy + P.gravity * dt, P.maxFall);
  s.y += s.vy * dt;
  if (s.vy > 0) {
    for (const w of s.wins) {
      if (!w.alive) continue;
      if (s.x > w.x && s.x < w.x + w.w && prevBottom <= w.y + 1 && s.y >= w.y) {
        s.y = w.y;
        s.vy = 0;
        landOn(w);
        return;
      }
    }
  }
  if (s.y > floorY() + PLAYER_H) {
    s.y = floorY();
    if (s.invuln > 0) {
      s.vy = -P.bounce;
      ctx.sfx.bounce();
    } else if (hurt()) s.dead = true;
  }
}

function drawWindow(g, w) {
  const x = Math.round(w.x);
  const y = Math.round(w.y);
  bevel(g, x, y, w.w, WIN_H, COLORS.grey);
  rect(g, x + 1, y + 1, w.w - 2, TITLE_H - 1, w.landed ? COLORS.teal : COLORS.blue);
  rect(g, x + w.w - 8, y + 2, 5, 5, COLORS.red);
  rect(g, x + 3, y + 3, 14, 2, COLORS.white);
  rect(g, x + 4, y + TITLE_H + 4, w.w - 8, 2, COLORS.slate);
  rect(g, x + 4, y + TITLE_H + 8, (w.w - 8) * 0.6, 2, COLORS.slate);
}

function drawPlayer(g) {
  if (s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0) return;
  const x = Math.round(s.x) - PLAYER_W / 2;
  const y = Math.round(s.y) - PLAYER_H;
  rect(g, x, y, PLAYER_W, PLAYER_H, COLORS.white);
  rect(g, x + 1, y + 1, PLAYER_W - 2, 3, COLORS.ink);
  rect(g, x + 2, y + 2, 1, 1, COLORS.teal);
  rect(g, x + 5, y + 2, 1, 1, COLORS.teal);
  rect(g, x, y + PLAYER_H - 2, PLAYER_W, 2, COLORS.red);
}

export default {
  id: 'popup',
  title: 'popup.sys',
  intro: 'HOP ACROSS THE WINDOWS!',
  duration: 30,
  glitches: ['mirror', 'rush'],
  hints: ['left', 'right', 'up'],
  hintAt: { x: 152, y: 124 },
  init(c) {
    ctx = c;
    s = {
      x: c.W / 2, y: 100, vy: 0, t: 0, score: 0, hp: c.lives(P.hp), invuln: c.bonus.shield,
      ground: null, dead: false, lastY: 100, goal: P.goal + c.diff.extra,
      speed: P.scroll * c.diff.speed * (1 + 0.04 * c.twist),
      wins: Array.from({ length: MAX_WINDOWS }, () => ({ alive: false, x: 0, y: 0, w: 0, landed: false })),
    };
    spawnWindow(c.W / 2 - 24);
    s.wins[0].y = 100;
    s.wins[0].w = MAX_W;
    s.wins[0].landed = true;
    s.ground = s.wins[0];
  },
  update(dt) {
    s.t += dt;
    s.invuln = Math.max(0, s.invuln - dt);
    let last = -1e9;
    for (const w of s.wins) {
      if (!w.alive) continue;
      w.x -= s.speed * dt;
      last = Math.max(last, w.x + w.w);
      if (w.x + w.w < -4) {
        w.alive = false;
        if (s.ground === w) s.ground = null;
      }
    }
    if (last < ctx.W - P.spacing) spawnWindow(ctx.W + rand(0, 10));
    stepPlayer(dt);
    if (s.dead) return 'lose';
    return s.score >= s.goal ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.desk);
    for (let y = 20; y < ctx.H; y += 16) rect(g, 0, y, ctx.W, 1, COLORS.deskLine);
    rect(g, 0, 0, ctx.W, 16, COLORS.night);
    rect(g, 0, floorY(), ctx.W, ctx.H - floorY(), COLORS.red);
    rect(g, 0, floorY(), ctx.W, 2, COLORS.yellow);
    for (const w of s.wins) if (w.alive) drawWindow(g, w);
    drawPlayer(g);
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    bar(g, ctx.W - 84, 4, 78, 6, s.score / s.goal, COLORS.teal, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
