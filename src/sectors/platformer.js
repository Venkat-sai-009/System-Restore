// memory.sys: run through the memory banks. Pits and spikes cost a heart and bounce you back.
import { COLORS, PLATFORMER as P } from '../config.js';
import { rect, hearts } from '../utils/draw.js';
import { clamp, approach, overlap } from '../utils/math.js';

const T = P.tile;
const G = P.groundRow;

// Level plans. f=flat, g=gap, s=spikes, u=raised step, w=bounce pad + wall, F=finish.
// Each bounce-back switches to the next layout (the "twist").
const PLANS = [
  'f10 g2 f5 s1 f5 g3 f4 w f5 s2 f5 g2 f5 s1 f5 g3 f5 F',
  'f10 s1 f5 g3 f5 u2 f4 g2 f4 w f5 s1 f5 s1 f5 g3 f5 F',
  'f10 g3 f4 s2 f5 w f5 g2 f4 u2 f4 g3 f4 s1 f5 s1 f5 F',
  'f10 s2 f4 g2 f4 w f4 g3 f4 u2 f4 s1 f5 g2 f5 g2 f5 F',
];

function buildLevel(variant) {
  const top = [];
  const spike = [];
  const pad = [];
  const push = (t, s = false, p = false) => { top.push(t); spike.push(s); pad.push(p); };
  for (const token of PLANS[variant % PLANS.length].split(' ')) {
    const kind = token[0];
    const n = parseInt(token.slice(1), 10) || 1;
    for (let i = 0; i < n; i++) {
      if (kind === 'f') push(G);
      else if (kind === 'g') push(-1);
      else if (kind === 's') push(G, true);
      else if (kind === 'u') push(G - 1);
    }
    if (kind === 'w') {
      push(G, false, true); push(G); push(G); push(G - P.wallHeight);
      for (let i = 0; i < 5; i++) push(G);
    }
  }
  const flagCol = top.length + 2;
  for (let i = 0; i < 8; i++) push(G);
  return { top, spike, pad, cols: top.length, flagCol };
}

let s = null;
let ctx = null;

const solid = (lv, c, r) => {
  if (c < 0) return true;
  if (r < 0) return false;
  if (c >= lv.cols) return r >= G;
  return lv.top[c] >= 0 && r >= lv.top[c];
};

function overlappedTiles(x, y) {
  return [Math.floor(x / T), Math.floor((x + P.playerW - 0.01) / T),
    Math.floor(y / T), Math.floor((y + P.playerH - 0.01) / T)];
}

function moveX(dx) {
  s.x = Math.max(0, s.x + dx);
  const [c0, c1, r0, r1] = overlappedTiles(s.x, s.y);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!solid(s.lv, c, r)) continue;
      s.x = dx > 0 ? c * T - P.playerW : (c + 1) * T;
      s.vx = 0;
      return;
    }
  }
}

function moveY(dy) {
  s.y += dy;
  const wasGround = s.onGround;
  s.onGround = false;
  const [c0, c1, r0, r1] = overlappedTiles(s.x, s.y);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!solid(s.lv, c, r)) continue;
      if (dy > 0) {
        s.y = r * T - P.playerH;
        s.onGround = true;
        if (!wasGround && s.vy > 150) {
          ctx.sfx.land();
          ctx.particles.burst(s.x - s.cam + 5, s.y + P.playerH, COLORS.pale, 4, 30, 0.3, 60, 1);
          s.squash = 0.8;
        }
      } else s.y = (r + 1) * T;
      s.vy = 0;
      return;
    }
  }
}

function checkPad() {
  const col = Math.floor((s.x + P.playerW / 2) / T);
  if (!s.onGround || !s.lv.pad[col] || s.lv.top[col] !== Math.floor((s.y + P.playerH + 1) / T)) return;
  s.vy = -P.bounceVel;
  s.onGround = false;
  s.squash = -0.8;
  ctx.sfx.bounce();
  ctx.fx.shake(1.5);
  ctx.particles.burst(s.x - s.cam + 5, s.y + P.playerH, COLORS.yellow, 8, 70, 0.4, 120, 2);
}

// Remember the last steady ground so a pit can bounce the player back to it.
function rememberSafeSpot() {
  const c = Math.floor((s.x + P.playerW / 2) / T);
  const lv = s.lv;
  if (c < 1 || c >= lv.cols - 1 || lv.top[c] !== G || lv.spike[c] || lv.pad[c]) return;
  if (lv.top[c - 1] < 0 || lv.top[c + 1] < 0 || lv.spike[c + 1] || lv.spike[c - 1]) return;
  s.safeX = s.x;
}

function hitsSpike() {
  const [c0, c1] = overlappedTiles(s.x, s.y);
  for (let c = c0; c <= c1; c++) {
    if (c < 0 || c >= s.lv.cols || !s.lv.spike[c]) continue;
    if (overlap(s.x + 2, s.y + 2, P.playerW - 4, P.playerH - 2, c * T + 2, s.lv.top[c] * T - 8, 12, 8)) return true;
  }
  return false;
}

// Lose a heart. Returns true when none are left (the sector then bounces back from the start).
function hurt() {
  s.hp -= 1;
  s.invuln = P.invuln;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.35);
  ctx.particles.burst(s.x - s.cam + 5, Math.min(s.y + 7, ctx.H - 4), COLORS.red, 10, 90, 0.6, 160, 2);
  return s.hp <= 0;
}

function bounceOutOfPit() {
  ctx.particles.burst(s.x - s.cam + 5, ctx.H - 4, COLORS.yellow, 10, 80, 0.5, 100, 2);
  s.x = s.safeX;
  s.y = G * T - P.playerH - 2;
  s.vx = 0;
  s.vy = -P.pitBounce;
  s.onGround = false;
  s.invuln = P.invuln + 0.3;
  ctx.sfx.bounce();
}

function drawBackdrop(g, cam) {
  rect(g, 0, 0, ctx.W, 56, COLORS.sky);
  rect(g, 0, 56, ctx.W, G * T - 56, COLORS.skyLight);
  const span = ctx.W + 60;
  for (let i = 0; i < 5; i++) {
    const x = ((((i * 83 - cam * 0.15) % span) + span) % span) - 30;
    const y = 22 + ((i * 29) % 40);
    rect(g, x, y, 26, 7, COLORS.white);
    rect(g, x + 5, y - 4, 14, 5, COLORS.white);
    rect(g, x + 16, y - 2, 10, 4, COLORS.white);
  }
  for (let x = 0; x < ctx.W; x += 2) {
    const far = 18 + Math.sin((x + cam * 0.3) * 0.035) * 9 + Math.sin((x + cam * 0.3) * 0.09) * 3;
    rect(g, x, G * T - far, 2, far, COLORS.grassDark);
    const near = 8 + Math.sin((x + cam * 0.6) * 0.06 + 2) * 6;
    rect(g, x, G * T - near, 2, near, COLORS.grassLight);
  }
}

function drawSpike(g, x, y) {
  for (let j = 0; j < 8; j++) {
    const w = 2 * Math.floor(j / 2) + 2;
    rect(g, x + 4 - w / 2, y + j, w / 2, 1, COLORS.white);
    rect(g, x + 4, y + j, w / 2, 1, COLORS.grey);
  }
}

function drawBrick(g, x, y, r) {
  rect(g, x, y, T, T, COLORS.brick);
  rect(g, x, y + 7, T, 1, COLORS.brickDark);
  rect(g, x, y + 15, T, 1, COLORS.brickDark);
  rect(g, x + (r % 2 ? 4 : 11), y, 1, 7, COLORS.brickDark);
  rect(g, x + (r % 2 ? 11 : 4), y + 8, 1, 7, COLORS.brickDark);
  rect(g, x, y, T, 1, COLORS.orange);
}

function drawTerrain(g, cam) {
  const c0 = Math.max(0, Math.floor(cam / T));
  const c1 = Math.min(s.lv.cols - 1, c0 + Math.ceil(ctx.W / T) + 1);
  for (let c = c0; c <= c1; c++) {
    const top = s.lv.top[c];
    if (top < 0) continue;
    const x = c * T - cam;
    for (let r = top; r < G; r++) drawBrick(g, x, r * T, r);
    const y = G * T;
    rect(g, x, y, T, ctx.H - y, COLORS.dirt);
    rect(g, x + 3, y + 10, 4, 2, COLORS.brickDark);
    rect(g, x + 10, y + 20, 4, 2, COLORS.brickDark);
    if (top === G) {
      rect(g, x, y, T, 4, COLORS.grassLight);
      rect(g, x, y + 4, T, 1, COLORS.grassDark);
    }
    if (s.lv.spike[c]) {
      drawSpike(g, x + 1, y - 8);
      drawSpike(g, x + 9, y - 8);
    }
    if (s.lv.pad[c]) {
      rect(g, x + 4, y - 3, 8, 3, COLORS.orange);
      rect(g, x + 1, y - 6, 14, 3, COLORS.yellow);
      rect(g, x + 1, y - 6, 14, 1, COLORS.white);
    }
  }
  const fx = s.lv.flagCol * T - cam;
  rect(g, fx + 4, G * T - 46, 2, 46, COLORS.white);
  rect(g, fx + 2, G * T - 49, 6, 4, COLORS.yellow);
  for (let j = 0; j < 9; j++) rect(g, fx + 6, G * T - 44 + j, 14 - j, 1, COLORS.red);
}

function drawPlayer(g, cam) {
  if (s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0) return;
  const px = Math.round(s.x - cam);
  const stretch = Math.round(s.squash * 3);
  const py = Math.round(s.y) - stretch;
  const h = P.playerH + stretch;
  const leg = s.onGround && Math.abs(s.vx) > 10 ? Math.floor(s.anim) % 2 : 0;
  const look = s.facing > 0 ? 1 : 0;
  rect(g, px + 4, py - 2, 2, 2, COLORS.yellow);
  rect(g, px + 1, py, 8, 6, COLORS.white);
  rect(g, px + 2 + look, py + 2, 2, 2, COLORS.ink);
  rect(g, px + 6 + look - 1, py + 2, 2, 2, COLORS.ink);
  rect(g, px, py + 6, 10, h - 9, COLORS.red);
  rect(g, px + 3, py + 7, 4, 3, COLORS.yellow);
  rect(g, px + 1, py + h - 3, 3, 3 - leg, COLORS.blue);
  rect(g, px + P.playerW - 4, py + h - 3, 3, 2 + leg, COLORS.blue);
}

export default {
  id: 'platformer',
  title: 'memory.sys',
  intro: 'RUN THROUGH MEMORY!',
  duration: 30,
  hints: ['left', 'right', 'up'],
  hintAt: { x: 152, y: 34 },
  init(c) {
    ctx = c;
    const lv = buildLevel(c.twist);
    s = { lv, x: 24, y: G * T - P.playerH, vx: 0, vy: 0, onGround: true, coyote: 0, buffer: 0,
      cam: 0, squash: 0, facing: 1, anim: 0, hp: P.hp + c.diff.hearts, invuln: 0, safeX: 24 };
  },
  update(dt) {
    s.invuln = Math.max(0, s.invuln - dt);
    const dir = ctx.input.axisX();
    if (dir) s.facing = dir;
    s.vx = approach(s.vx, dir * P.runSpeed, P.accel * dt);
    s.buffer = ctx.input.pressed('up') || ctx.input.pressed('action') ? P.jumpBuffer : s.buffer - dt;
    s.coyote = s.onGround ? P.coyote : s.coyote - dt;
    if (s.buffer > 0 && s.coyote > 0) {
      s.vy = -P.jumpVel;
      s.buffer = 0;
      s.coyote = 0;
      s.onGround = false;
      s.squash = -0.6;
      ctx.sfx.jump();
    }
    s.vy = Math.min(s.vy + P.gravity * dt, P.maxFall);
    moveX(s.vx * dt);
    moveY(s.vy * dt);
    checkPad();
    if (s.onGround) rememberSafeSpot();
    s.squash = approach(s.squash, 0, dt * 5);
    s.anim += dt * Math.abs(s.vx) * 0.12;
    const camTarget = clamp(s.x + P.playerW / 2 - ctx.W * P.cameraLead, 0, s.lv.cols * T - ctx.W);
    s.cam += (camTarget - s.cam) * Math.min(1, dt * 8);

    if (s.invuln <= 0 && hitsSpike()) {
      if (hurt()) return 'lose';
      s.vy = -220;
      s.vx = -s.facing * 90;
      s.onGround = false;
    }
    if (s.y > ctx.H + 24) {
      if (hurt()) return 'lose';
      bounceOutOfPit();
    }
    return s.x + P.playerW > s.lv.flagCol * T ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    const cam = Math.round(s.cam);
    drawBackdrop(g, cam);
    drawTerrain(g, cam);
    drawPlayer(g, cam);
    rect(g, ctx.W / 2 - 60, 4, 120, 4, COLORS.night);
    rect(g, ctx.W / 2 - 60 + Math.round((s.x / (s.lv.flagCol * T)) * 116), 3, 4, 6, COLORS.yellow);
    hearts(g, 4, 3, s.hp, P.hp + ctx.diff.hearts);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
