// photos.sys: the photo got scrambled. Pick a tile and rotate it until the picture matches the preview.
import { COLORS, PUZZLE as P, AREA } from '../config.js';
import { rect, bar, outline, bevel, arrowShape } from '../utils/draw.js';
import { check } from '../ui/icons.js';
import { approach, randInt } from '../utils/math.js';

const N = 3;
const BOARD = P.cell * N;
const PREVIEW_CELL = 16;
const SPIN_TIME = 0.12;

let s = null;
let ctx = null;

function disc(g, cx, cy, r, color) {
  for (let j = -r; j <= r; j++) {
    const w = Math.round(Math.sqrt(r * r - j * j) * 2);
    rect(g, cx - w / 2, cy + j, w, 1, color);
  }
}

// Draws the finished photo once into an offscreen canvas: a sunny little village.
function paintPicture() {
  const art = document.createElement('canvas');
  art.width = BOARD;
  art.height = BOARD;
  const a = art.getContext('2d');
  rect(a, 0, 0, BOARD, 54, COLORS.sky);
  rect(a, 0, 54, BOARD, 18, COLORS.skyLight);
  disc(a, 84, 20, 11, COLORS.yellow);
  rect(a, 8, 14, 26, 7, COLORS.white);
  rect(a, 13, 10, 14, 5, COLORS.white);
  for (let x = 0; x < BOARD; x += 2) {
    const h = 12 + Math.sin(x * 0.07) * 6;
    rect(a, x, 72 - h, 2, h, COLORS.grassDark);
  }
  rect(a, 0, 72, BOARD, BOARD - 72, COLORS.grassLight);
  for (let y = 72; y < BOARD; y++) rect(a, 54 - (6 + (y - 72) * 0.4) / 2, y, 6 + (y - 72) * 0.4, 1, COLORS.gold);
  rect(a, 12, 52, 28, 20, COLORS.pale);
  for (let j = 0; j < 11; j++) rect(a, 26 - (8 + j * 2.8) / 2, 41 + j, 8 + j * 2.8, 1, COLORS.red);
  rect(a, 23, 60, 8, 12, COLORS.brick);
  rect(a, 15, 55, 6, 6, COLORS.sky);
  rect(a, 33, 55, 5, 6, COLORS.sky);
  rect(a, 78, 56, 5, 16, COLORS.brick);
  disc(a, 80, 50, 11, COLORS.green);
  disc(a, 76, 46, 5, COLORS.grassLight);
  rect(a, 6, 92, 3, 3, COLORS.pink);
  rect(a, 90, 96, 3, 3, COLORS.yellow);
  rect(a, 30, 100, 3, 3, COLORS.white);
  rect(a, 72, 88, 3, 3, COLORS.pink);
  rect(a, 58, 84, 8, 6, COLORS.white);
  rect(a, 58, 90, 8, 7, COLORS.red);
  rect(a, 60, 86, 2, 2, COLORS.ink);
  rect(a, 63, 86, 2, 2, COLORS.ink);
  rect(a, 59, 97, 3, 4, COLORS.blue);
  rect(a, 63, 97, 3, 4, COLORS.blue);
  return art;
}

function scramble() {
  const rot = new Array(N * N).fill(0);
  const wrong = Math.max(2, Math.min(N * N, P.wrongTiles + ctx.twist * P.wrongStep + ctx.diff.extra));
  let placed = 0;
  while (placed < wrong) {
    const i = randInt(0, N * N - 1);
    if (rot[i]) continue;
    rot[i] = randInt(1, 3);
    placed++;
  }
  return rot;
}

const isSolved = () => s.rot.every((r) => r === 0);

function nextWrong(from) {
  for (let k = 1; k <= N * N; k++) {
    const i = (from + k) % (N * N);
    if (s.rot[i]) return i;
  }
  return from;
}

function rotateTile(i) {
  s.rot[i] = (s.rot[i] + 1) % 4;
  s.spin[i] = 1;
  ctx.sfx.slide();
  if (s.rot[i] === 0) {
    ctx.sfx.pickup();
    const x = s.ox + (i % N) * P.cell + P.cell / 2;
    const y = s.oy + Math.floor(i / N) * P.cell + P.cell / 2;
    ctx.particles.burst(x, y, COLORS.lime, 8, 60, 0.4, 40, 2);
    if (!isSolved()) s.cursor = nextWrong(i);
  }
}

function handleInput() {
  const inp = ctx.input;
  const cx = s.cursor % N;
  const cy = Math.floor(s.cursor / N);
  if (inp.pressed('left') && cx > 0) s.cursor -= 1;
  if (inp.pressed('right') && cx < N - 1) s.cursor += 1;
  if (inp.pressed('up') && cy > 0) s.cursor -= N;
  if (inp.pressed('down') && cy < N - 1) s.cursor += N;
  if (inp.pressed('action') || inp.pressed('confirm')) rotateTile(s.cursor);
  const p = inp.pointer;
  if (p.clicked) {
    const tx = Math.floor((p.x - AREA.x - s.ox) / P.cell);
    const ty = Math.floor((p.y - AREA.y - s.oy) / P.cell);
    if (tx >= 0 && tx < N && ty >= 0 && ty < N) {
      s.cursor = ty * N + tx;
      rotateTile(s.cursor);
    }
  }
}

function curvedArrow(g, x, y) {
  const c = COLORS.white;
  rect(g, x + 1, y, 5, 1, c);
  rect(g, x + 6, y + 1, 1, 4, c);
  rect(g, x + 1, y + 5, 5, 1, c);
  rect(g, x, y + 1, 1, 2, c);
  arrowShape(g, x + 1, y + 4, 'down', 3, c);
}

function drawTiles(g) {
  rect(g, s.ox - 3, s.oy - 3, BOARD + 6, BOARD + 6, COLORS.slate);
  for (let i = 0; i < N * N; i++) {
    const x = s.ox + (i % N) * P.cell;
    const y = s.oy + Math.floor(i / N) * P.cell;
    const col = i % N;
    const row = Math.floor(i / N);
    const angle = ((s.rot[i] - s.spin[i]) * Math.PI) / 2;
    g.save();
    g.beginPath();
    g.rect(x, y, P.cell, P.cell);
    g.clip();
    g.translate(x + P.cell / 2, y + P.cell / 2);
    g.rotate(angle);
    g.drawImage(s.art, col * P.cell, row * P.cell, P.cell, P.cell, -P.cell / 2, -P.cell / 2, P.cell, P.cell);
    g.restore();
    if (s.rot[i] === 0) {
      outline(g, x, y, P.cell, P.cell, COLORS.lime, 2);
      check(g, x + P.cell - 12, y + 3, COLORS.lime);
    } else {
      outline(g, x, y, P.cell, P.cell, COLORS.ink, 1);
    }
  }
  if (!isSolved()) {
    const x = s.ox + (s.cursor % N) * P.cell;
    const y = s.oy + Math.floor(s.cursor / N) * P.cell;
    outline(g, x - 1, y - 1, P.cell + 2, P.cell + 2, Math.floor(s.t * 6) % 2 ? COLORS.yellow : COLORS.white, 2);
    curvedArrow(g, x + 4, y + 4);
  }
}

function drawPreview(g) {
  const size = PREVIEW_CELL * N;
  const x = AREA.w - size - 26;
  const y = 44;
  arrowShape(g, x - 20, y + size / 2, 'right', 7, COLORS.yellow);
  bevel(g, x - 4, y - 4, size + 8, size + 8, COLORS.grey, true);
  g.drawImage(s.art, 0, 0, BOARD, BOARD, x, y, size, size);
}

export default {
  id: 'puzzle',
  title: 'photos.sys',
  intro: 'TURN TILES TO FIX THE PHOTO',
  duration: P.timeLimit,
  hints: ['left', 'right', 'up', 'down', 'space'],
  hintAt: { x: 259, y: 118 },
  init(c) {
    ctx = c;
    const rot = scramble();
    s = {
      rot, spin: new Array(N * N).fill(0), art: paintPicture(), t: 0, solvedHold: 0, limit: P.timeLimit * ctx.diff.time,
      cursor: rot.findIndex((r) => r !== 0),
      ox: Math.round(ctx.W * 0.3 - BOARD / 2), oy: 30,
    };
  },
  update(dt) {
    s.t += dt;
    for (let i = 0; i < s.spin.length; i++) s.spin[i] = approach(s.spin[i], 0, dt / SPIN_TIME);
    if (isSolved()) {
      s.solvedHold += dt;
      return s.solvedHold > 0.5 ? 'win' : 'playing';
    }
    handleInput();
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    rect(g, 0, 0, ctx.W, ctx.H, COLORS.desk);
    for (let i = 0; i < ctx.W; i += 16) rect(g, i, 0, 1, ctx.H, COLORS.deskLine);
    drawTiles(g);
    drawPreview(g);
    const left = 1 - s.t / s.limit;
    bar(g, 8, 6, ctx.W - 16, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.night);
  },
  dispose() {
    if (s && s.art) {
      s.art.width = 0;
      s.art.height = 0;
    }
    s = null;
    ctx = null;
  },
};
