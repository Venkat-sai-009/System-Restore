// racer.sys: Mode 7 style pseudo-3D road. Steer around the cones and cross the finish before time runs out.
import { COLORS, RACER as P } from '../config.js';
import { rect, bar } from '../utils/draw.js';
import { clamp, approach, rand } from '../utils/math.js';

const LANES = [-0.6, 0, 0.6];
const CAR_Z = 3.2;      // distance ahead of the camera where the car sits on screen
const HOP_TIME = 0.5;     // how long the car stays airborne after a crash
const RECOIL = 5;         // metres the car is knocked backwards
const SIDE_BOUNCE = 0.3;  // sideways shove away from the cone
const MAX_OFFSET = 1.6; // how far from the road centre the car may drift
const rowX = new Float32Array(256);
const rowHalf = new Float32Array(256);

let s = null;
let ctx = null;

// Road curvature at a distance along the track. Eases in so the start is straight.
const curveAt = (d) => Math.min(1, d / 150) * (Math.sin(d * 0.006) + Math.sin(d * 0.0023 + 1) * 0.6);

function buildObstacles(twist, extra) {
  const count = Math.max(8, P.obstacleCount + twist * 4 + extra * 3);
  const spacing = (P.trackLength - 140) / count;
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      z: 70 + i * spacing + rand(0, spacing * 0.6),
      x: LANES[Math.floor(rand(0, LANES.length))] + rand(-0.12, 0.12),
      hit: false,
      fly: 0,
    });
  }
  return list;
}

function crash(o) {
  o.hit = true;
  o.fly = 0.8;
  s.speed *= P.hitSlow;
  s.hop = HOP_TIME;
  s.dist = Math.max(0, s.dist - RECOIL);
  s.x += (s.x >= o.x ? 1 : -1) * SIDE_BOUNCE;
  ctx.sfx.bounce();
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(ctx.W / 2, ctx.H - 24, COLORS.orange, 10, 80, 0.5, 120, 2);
}

function drawSky(g) {
  const hz = P.horizon;
  const span = ctx.W + 60;
  rect(g, 0, 0, ctx.W, hz, COLORS.sky);
  rect(g, 0, hz - 18, ctx.W, 18, COLORS.skyLight);
  const sunX = ctx.W - 50 + Math.round((s.bg * 0.3) % 20);
  for (let j = -9; j <= 9; j++) {
    const w = Math.round(Math.sqrt(81 - j * j) * 2);
    rect(g, sunX - w / 2, 18 + j, w, 1, COLORS.yellow);
  }
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 90 - s.bg * 0.5) % span) + span) % span) - 30;
    rect(g, x, 14 + i * 5, 24, 6, COLORS.white);
    rect(g, x + 5, 10 + i * 5, 12, 5, COLORS.white);
  }
  const off = s.bg * 0.8;
  for (let x = 0; x < ctx.W; x += 2) {
    const m = 10 + Math.abs(Math.sin((x + off) * 0.035)) * 14;
    rect(g, x, hz - m, 2, m, COLORS.purple);
    const h = 4 + (Math.sin((x + off * 1.6) * 0.06) + 1) * 3;
    rect(g, x, hz - h, 2, h, COLORS.green);
  }
}

function drawRoad(g) {
  const hz = P.horizon;
  const rows = ctx.H - hz;
  let dx = 0;
  let xw = 0;
  let zPrev = 0;
  for (let row = ctx.H - 1; row > hz; row--) {
    const off = row - hz;
    const z = P.k / off;
    const dz = z - zPrev;
    zPrev = z;
    dx += curveAt(s.dist + z) * dz * P.curveK;
    xw += dx * dz;
    const half = (off / rows) * P.roadHalf;
    const cx = ctx.W / 2 + (xw - s.x) * half;
    rowX[row] = cx;
    rowHalf[row] = half;
    const phase = Math.floor((s.dist + z) / P.stripe) & 1;
    rect(g, 0, row, ctx.W, 1, phase ? COLORS.grassLight : COLORS.grassDark);
    rect(g, cx - half * 1.14, row, half * 2.28, 1, phase ? COLORS.red : COLORS.white);
    rect(g, cx - half, row, half * 2, 1, phase ? COLORS.pale : COLORS.grey);
    if (phase) {
      const lw = Math.max(1, half * 0.035);
      rect(g, cx - half * 0.33 - lw / 2, row, lw, 1, COLORS.white);
      rect(g, cx + half * 0.33 - lw / 2, row, lw, 1, COLORS.white);
    }
  }
}

function rowFor(dz) {
  const row = Math.round(P.horizon + P.k / dz);
  return row >= ctx.H ? -1 : row;
}

function drawFinish(g) {
  const dz = P.trackLength - s.dist;
  if (dz <= 0 || dz > P.visible) return;
  const row = rowFor(dz);
  if (row < 0) return;
  const half = rowHalf[row];
  const h = Math.max(3, half * 0.3);
  const cells = 12;
  const cw = (half * 2) / cells;
  for (let i = 0; i < cells; i++) {
    rect(g, rowX[row] - half + i * cw, row - h, cw + 1, h / 2, i % 2 ? COLORS.ink : COLORS.white);
    rect(g, rowX[row] - half + i * cw, row - h / 2, cw + 1, h / 2, i % 2 ? COLORS.white : COLORS.ink);
  }
  rect(g, rowX[row] - half - 2, row - h * 4, 3, h * 4, COLORS.white);
  rect(g, rowX[row] + half, row - h * 4, 3, h * 4, COLORS.white);
  for (let i = 0; i < cells; i++) {
    rect(g, rowX[row] - half + i * cw, row - h * 4, cw + 1, h, i % 2 ? COLORS.ink : COLORS.white);
  }
}

function drawCone(g, sx, row, w, fly) {
  const h = Math.max(2, w * 1.3);
  const y = row - fly * 18;
  const x = sx + fly * 26;
  for (let j = 0; j < h; j++) {
    const ww = Math.max(1, (w * (j + 1)) / h);
    rect(g, x - ww / 2, y - h + j, ww, 1, COLORS.orange);
  }
  rect(g, x - w * 0.28, y - h * 0.5, w * 0.56, Math.max(1, h * 0.16), COLORS.white);
  rect(g, x - w * 0.6, y - 1, w * 1.2, Math.max(1, h * 0.12), COLORS.ink);
}

function drawObstacles(g) {
  for (let i = s.obstacles.length - 1; i >= 0; i--) {
    const o = s.obstacles[i];
    const dz = o.z - s.dist;
    if (dz <= 0.5 || dz > P.visible) continue;
    if (o.hit && o.fly <= 0) continue;
    const row = rowFor(dz);
    if (row < 0) continue;
    drawCone(g, rowX[row] + o.x * rowHalf[row], row, Math.max(2, rowHalf[row] * 0.26), o.fly);
  }
}

function drawCar(g) {
  const cx = Math.round(ctx.W / 2);
  const y = ctx.H - 6 - (s.hop > 0 ? Math.round(Math.sin((s.hop / HOP_TIME) * Math.PI) * 16) : 0);
  const lean = Math.round(s.steer * 2);
  rect(g, cx - 14, y - 7, 6, 7, COLORS.ink);
  rect(g, cx + 8, y - 7, 6, 7, COLORS.ink);
  rect(g, cx - 12, y - 11, 24, 7, COLORS.red);
  rect(g, cx - 8 + lean, y - 17, 16, 7, COLORS.red);
  rect(g, cx - 6 + lean, y - 16, 12, 4, COLORS.blue);
  rect(g, cx - 12, y - 6, 24, 2, COLORS.white);
  if (s.speed > P.maxSpeed * 0.8 && Math.floor(s.t * 30) % 2 === 0) {
    rect(g, cx - 9, y, 4, 2, COLORS.yellow);
    rect(g, cx + 5, y, 4, 2, COLORS.yellow);
  }
}

export default {
  id: 'racer',
  title: 'databus.sys',
  intro: 'RACE THE DATA BUS!',
  duration: P.timeLimit,
  hints: ['left', 'right'],
  hintAt: { x: 152, y: 24 },
  init(c) {
    ctx = c;
    s = { dist: 0, x: 0, speed: 0, steer: 0, t: 0, hop: 0, bg: 0, obstacles: buildObstacles(c.twist, c.diff.extra), limit: P.timeLimit * c.diff.time + c.bonus.time };
  },
  update(dt) {
    s.t += dt;
    s.hop = Math.max(0, s.hop - dt);
    const ax = ctx.input.axisX();
    s.steer = approach(s.steer, ax, dt * 8);
    const cap = P.maxSpeed * (Math.abs(s.x) > 1.05 ? P.offroadCap : 1);
    s.speed = s.speed < cap ? Math.min(cap, s.speed + P.accel * dt) : Math.max(cap, s.speed - P.accel * 2 * dt);
    const grip = 0.4 + (0.6 * s.speed) / P.maxSpeed;
    s.x += ax * P.steer * grip * dt;
    s.x -= curveAt(s.dist) * (s.speed / P.maxSpeed) * P.pushOut * dt;
    s.x = clamp(s.x, -MAX_OFFSET, MAX_OFFSET);
    s.bg += curveAt(s.dist) * s.speed * dt * 0.15;
    const prev = s.dist;
    s.dist += s.speed * dt;
    for (const o of s.obstacles) {
      if (o.fly > 0) o.fly -= dt;
      if (o.hit) continue;
      const before = o.z - prev;
      const now = o.z - s.dist;
      if (before > CAR_Z && now <= CAR_Z && Math.abs(o.x - s.x) < 0.3) crash(o);
    }
    if (s.dist >= P.trackLength) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    drawSky(g);
    drawRoad(g);
    drawFinish(g);
    drawObstacles(g);
    drawCar(g);
    bar(g, ctx.W / 2 - 60, 4, 120, 6, s.dist / P.trackLength, COLORS.teal, COLORS.night);
    const left = 1 - s.t / s.limit;
    bar(g, ctx.W / 2 - 60, 12, 120, 4, left, left < 0.3 ? COLORS.red : COLORS.yellow, COLORS.night);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
