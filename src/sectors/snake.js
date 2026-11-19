// network.sys: steer the data cable and collect packets. Avoid the red viruses and your own tail.
import { COLORS, SNAKE as P } from '../config.js';
import { rect, hearts, bar } from '../utils/draw.js';
import { randInt, clamp } from '../utils/math.js';

const OFFSET_X = 8;
const OFFSET_Y = 18;
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const KEYS = ['left', 'right', 'up', 'down'];
const DIRS_LIST = Object.values(DIRS);
const MAX_QUEUE = 2;
const MIN_VIRUS_DISTANCE = 6;

let s = null;
let ctx = null;

const px = (cx) => OFFSET_X + cx * P.cell;
const py = (cy) => OFFSET_Y + cy * P.cell;

function occupied(x, y) {
  for (let i = 0; i < s.len; i++) if (s.bx[i] === x && s.by[i] === y) return true;
  for (const v of s.viruses) if (v.x === x && v.y === y) return true;
  return false;
}

function placePacket() {
  for (let tries = 0; tries < 80; tries++) {
    const x = randInt(0, P.cols - 1);
    const y = randInt(0, P.rows - 1);
    if (!occupied(x, y)) {
      s.packet.x = x;
      s.packet.y = y;
      return;
    }
  }
}

function placeViruses(count) {
  s.viruses = [];
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const x = randInt(0, P.cols - 1);
      const y = randInt(0, P.rows - 1);
      const nearStart = Math.abs(y - s.by[0]) < 2 && x < s.bx[0] + MIN_VIRUS_DISTANCE + 4;
      if (!nearStart && !occupied(x, y)) {
        s.viruses.push({ x, y });
        break;
      }
    }
  }
}

function hurt() {
  s.hp -= 1;
  s.invuln = P.invuln;
  s.len = Math.max(P.startLen, Math.floor(s.len / 2));
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(px(s.bx[0]) + 4, py(s.by[0]) + 4, COLORS.red, 10, 80, 0.5, 80, 2);
  return s.hp <= 0;
}

// Wrap-aware difference of two grid coordinates, always -1, 0 or 1 for neighbours.
const wrapStep = (d, n) => (d > 1 ? d - n : d < -1 ? d + n : d);

// Turn the whole snake around so the tail becomes the head: it bounces back.
function bounceBack() {
  for (let i = 0, j = s.len - 1; i < j; i++, j--) {
    const x = s.bx[i];
    const y = s.by[i];
    s.bx[i] = s.bx[j];
    s.by[i] = s.by[j];
    s.bx[j] = x;
    s.by[j] = y;
  }
  const dx = wrapStep(s.bx[0] - s.bx[1], P.cols);
  const dy = wrapStep(s.by[0] - s.by[1], P.rows);
  s.dir = DIRS_LIST.find((d) => d[0] === dx && d[1] === dy) || s.dir;
  s.queue.length = 0;
  ctx.sfx.bounce();
}

// Advance one grid step. Returns 'lose' when out of hearts.
function step() {
  if (s.queue.length) {
    const d = s.queue.shift();
    if (!(d[0] === -s.dir[0] && d[1] === -s.dir[1])) s.dir = d;
  }
  const nx = (s.bx[0] + s.dir[0] + P.cols) % P.cols;
  const ny = (s.by[0] + s.dir[1] + P.rows) % P.rows;
  if (s.invuln <= 0) {
    let crash = s.viruses.some((v) => v.x === nx && v.y === ny);
    for (let i = 0; i < s.len - 1 && !crash; i++) crash = s.bx[i] === nx && s.by[i] === ny;
    if (crash) {
      if (hurt()) return 'lose';
      bounceBack();
      return 'playing';
    }
  }
  const tailX = s.bx[s.len - 1];
  const tailY = s.by[s.len - 1];
  for (let i = s.len - 1; i > 0; i--) {
    s.bx[i] = s.bx[i - 1];
    s.by[i] = s.by[i - 1];
  }
  s.bx[0] = nx;
  s.by[0] = ny;
  if (nx === s.packet.x && ny === s.packet.y) {
    if (s.len < P.maxLen) {
      s.bx[s.len] = tailX;
      s.by[s.len] = tailY;
      s.len += 1;
    }
    s.eaten += 1;
    ctx.sfx.pickup();
    ctx.particles.burst(px(nx) + 4, py(ny) + 4, COLORS.yellow, 8, 60, 0.4, 40, 2);
    placePacket();
  }
  return 'playing';
}

function drawSnake(g) {
  const blink = s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0;
  for (let i = s.len - 1; i >= 0; i--) {
    const color = i === 0 ? COLORS.lime : i % 2 ? COLORS.grassLight : COLORS.green;
    if (blink && i % 2) continue;
    rect(g, px(s.bx[i]), py(s.by[i]), P.cell - 1, P.cell - 1, color);
  }
  const hx = px(s.bx[0]);
  const hy = py(s.by[0]);
  rect(g, hx + 1, hy + 1, 2, 2, COLORS.white);
  rect(g, hx + 4, hy + 1, 2, 2, COLORS.white);
  rect(g, hx + 2, hy + 2, 1, 1, COLORS.ink);
  rect(g, hx + 5, hy + 2, 1, 1, COLORS.ink);
}

function drawField(g) {
  rect(g, 0, 0, ctx.W, ctx.H, COLORS.ink);
  rect(g, OFFSET_X - 2, OFFSET_Y - 2, P.cols * P.cell + 4, P.rows * P.cell + 4, COLORS.teal);
  rect(g, OFFSET_X, OFFSET_Y, P.cols * P.cell, P.rows * P.cell, COLORS.night);
  for (let x = 0; x <= P.cols; x += 2) rect(g, px(x), OFFSET_Y, 1, P.rows * P.cell, COLORS.ink);
  for (let y = 0; y <= P.rows; y += 2) rect(g, OFFSET_X, py(y), P.cols * P.cell, 1, COLORS.ink);
  const pulse = Math.floor(s.t * 6) % 2;
  rect(g, px(s.packet.x), py(s.packet.y), P.cell - 1, P.cell - 1, COLORS.yellow);
  rect(g, px(s.packet.x) + 2, py(s.packet.y) + 2, P.cell - 5, P.cell - 5, pulse ? COLORS.white : COLORS.orange);
  for (const v of s.viruses) {
    rect(g, px(v.x), py(v.y), P.cell - 1, P.cell - 1, COLORS.red);
    rect(g, px(v.x) + 1, py(v.y) + 2, 2, 2, COLORS.white);
    rect(g, px(v.x) + 4, py(v.y) + 2, 2, 2, COLORS.white);
    rect(g, px(v.x) + 2, py(v.y) + 5, 3, 1, COLORS.ink);
    rect(g, px(v.x) - 1 + pulse, py(v.y) + 3, 1, 1, COLORS.red);
    rect(g, px(v.x) + P.cell - 1 - pulse, py(v.y) + 3, 1, 1, COLORS.red);
  }
}

export default {
  id: 'snake',
  title: 'network.sys',
  intro: 'COLLECT PACKETS. BOUNCE OFF VIRUSES!',
  duration: 40,
  glitches: ['flip', 'mirror', 'upside', 'rush'],
  hints: ['left', 'right', 'up', 'down'],
  hintAt: { x: 152, y: 70 },
  init(c) {
    ctx = c;
    s = {
      len: P.startLen, bx: new Int16Array(P.maxLen + 1), by: new Int16Array(P.maxLen + 1), dir: DIRS.right,
      queue: [], timer: 0, eaten: 0, t: 0, invuln: c.bonus.shield, hp: c.lives(P.hp), packet: { x: 0, y: 0 },
      viruses: [], goal: P.goal + c.diff.extra, interval: P.step / (c.diff.speed * (1 + 0.04 * c.twist)),
    };
    for (let i = 0; i < s.len; i++) {
      s.bx[i] = 10 - i;
      s.by[i] = Math.floor(P.rows / 2);
    }
    placeViruses(clamp(P.viruses + c.diff.extra, 0, 8));
    placePacket();
  },
  update(dt) {
    s.t += dt;
    s.invuln = Math.max(0, s.invuln - dt);
    for (const k of KEYS) if (ctx.input.pressed(k) && s.queue.length < MAX_QUEUE) s.queue.push(DIRS[k]);
    s.timer += dt;
    while (s.timer >= s.interval) {
      s.timer -= s.interval;
      if (step() === 'lose') return 'lose';
    }
    return s.eaten >= s.goal ? 'win' : 'playing';
  },
  render() {
    const g = ctx.g;
    drawField(g);
    drawSnake(g);
    hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
    bar(g, ctx.W - 84, 4, 78, 6, s.eaten / s.goal, COLORS.yellow, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
