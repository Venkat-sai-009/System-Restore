// kernel.exe and cloud.exe: a maze chase. Munch every data bit, dodge the viruses, and grab a
// power core to turn the tables. A new maze is generated on every attempt.
import { COLORS, PACMAN as P } from '../config.js';
import { rect, hearts, bar } from '../utils/draw.js';
import { clamp } from '../utils/math.js';

const W = P.cols;
const H = P.rows;
const T = P.tile;
const BODY = 5;
const FRIGHT_WARN = 1.5;
const WANT_TIME = 0.6; // how long a queued turn stays valid
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const KEY_DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const GHOST_COLORS = [COLORS.red, COLORS.pink, COLORS.orange, COLORS.lime];
const GHOST_HOMES = [[1, 1], [W - 2, 1], [Math.floor(W / 2) | 1, 3], [1, H - 4]];
const PELLETS = [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]];
const GHOST_CHASE = [0.8, 0.55, 0.4, 0.6];
const START = [Math.floor(W / 2) | 1, H - 2];

let s = null;
let ctx = null;
let v = null;

const idx = (x, y) => y * W + x;
const isOpen = (x, y) => x >= 0 && y >= 0 && x < W && y < H && s.maze[idx(x, y)] === 0;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const posX = (e) => e.x + (e.tx - e.x) * e.t;
const posY = (e) => e.y + (e.ty - e.y) * e.t;
const screenX = (tx) => P.originX + Math.round((tx + 0.5) * T);
const screenY = (ty) => P.originY + Math.round((ty + 0.5) * T);

function generateMaze() {
  const m = new Uint8Array(W * H).fill(1);
  const interior = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const stack = [[1, 1]];
  m[idx(1, 1)] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = DIRS.filter(([dx, dy]) => interior(cx + dx * 2, cy + dy * 2) && m[idx(cx + dx * 2, cy + dy * 2)] === 1);
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = pick(options);
    m[idx(cx + dx, cy + dy)] = 0;
    m[idx(cx + dx * 2, cy + dy * 2)] = 0;
    stack.push([cx + dx * 2, cy + dy * 2]);
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if ((x % 2) + (y % 2) === 1 && m[idx(x, y)] === 1 && Math.random() < v.loops) m[idx(x, y)] = 0;
    }
  }
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x < W - 1; x += 2) {
      const open = DIRS.filter(([dx, dy]) => m[idx(x + dx, y + dy)] === 0);
      if (open.length !== 1 || Math.random() > v.fixDeadEnds) continue;
      const closed = DIRS.filter(([dx, dy]) => interior(x + dx, y + dy) && m[idx(x + dx, y + dy)] === 1);
      if (closed.length) {
        const [dx, dy] = pick(closed);
        m[idx(x + dx, y + dy)] = 0;
      }
    }
  }
  return m;
}

function makeEntity(x, y) {
  return { x, y, tx: x, ty: y, t: 1, dx: 0, dy: 0 };
}

function placeEntity(e, x, y) {
  e.x = x; e.y = y; e.tx = x; e.ty = y; e.t = 1; e.dx = 0; e.dy = 0;
}

// Swap start and target so the entity turns around mid-tile.
function reverseEntity(e) {
  if (!(e.dx || e.dy) || e.t >= 1) return;
  const ox = e.x;
  const oy = e.y;
  e.x = e.tx; e.y = e.ty; e.tx = ox; e.ty = oy;
  e.t = 1 - e.t;
  e.dx = -e.dx; e.dy = -e.dy;
}

// Moves an entity along the grid. At every tile centre `decide` picks the next direction.
function advance(e, speed, dt, decide) {
  let move = speed * dt;
  let guard = 8;
  while (move > 0 && guard-- > 0) {
    if (e.t >= 1) {
      e.x = e.tx; e.y = e.ty;
      decide(e);
      if (e.tx === e.x && e.ty === e.y) {
        e.t = 1;
        return;
      }
      e.t = 0;
    }
    const room = 1 - e.t;
    if (move >= room) {
      e.t = 1;
      move -= room;
    } else {
      e.t += move;
      move = 0;
    }
  }
}

function decidePlayer(e) {
  const want = s.want;
  if (want && isOpen(e.x + want[0], e.y + want[1])) {
    e.dx = want[0];
    e.dy = want[1];
  } else if (!(e.dx || e.dy) || !isOpen(e.x + e.dx, e.y + e.dy)) {
    e.dx = 0;
    e.dy = 0;
  }
  e.tx = e.x + e.dx;
  e.ty = e.y + e.dy;
}

function decideGhost(gh) {
  const moving = gh.dx || gh.dy;
  let options = DIRS.filter(([dx, dy]) => isOpen(gh.x + dx, gh.y + dy) && !(moving && dx === -gh.dx && dy === -gh.dy));
  if (!options.length) options = DIRS.filter(([dx, dy]) => isOpen(gh.x + dx, gh.y + dy));
  let choice;
  if (gh.fright || Math.random() > gh.chase) {
    choice = pick(options);
  } else {
    const px = Math.round(posX(s.player));
    const py = Math.round(posY(s.player));
    let best = 1e9;
    for (const d of options) {
      const dist = Math.abs(gh.x + d[0] - px) + Math.abs(gh.y + d[1] - py);
      if (dist < best) {
        best = dist;
        choice = d;
      }
    }
  }
  gh.dx = choice[0];
  gh.dy = choice[1];
  gh.tx = gh.x + gh.dx;
  gh.ty = gh.y + gh.dy;
}

function resetPositions() {
  placeEntity(s.player, START[0], START[1]);
  s.want = null;
  s.fright = 0;
  s.ghosts.forEach((gh, i) => {
    placeEntity(gh, gh.home[0], gh.home[1]);
    gh.fright = false;
    gh.deadT = 0;
    gh.chase = GHOST_CHASE[i] * v.aggression;
  });
}

function hurt() {
  s.hp -= 1;
  s.invuln = P.invuln;
  ctx.sfx.hit();
  ctx.fx.shake(4);
  ctx.fx.glitch(0.5);
  ctx.particles.burst(screenX(posX(s.player)), screenY(posY(s.player)), COLORS.red, 12, 80, 0.6, 80, 2);
  if (s.hp <= 0) return true;
  resetPositions();
  s.delay = 0.8;
  return false;
}

function eatAt(tx, ty) {
  const i = idx(tx, ty);
  const kind = s.dots[i];
  if (!kind) return;
  s.dots[i] = 0;
  s.left -= 1;
  if (kind === 1) {
    s.chew = !s.chew;
    if (s.chew) ctx.sfx.slide();
    return;
  }
  s.fright = s.frightTime;
  ctx.sfx.bounce();
  ctx.fx.glitch(0.3);
  for (const gh of s.ghosts) {
    if (gh.deadT > 0) continue;
    gh.fright = true;
    reverseEntity(gh);
  }
}

function updateGhosts(dt) {
  if (s.fright > 0) {
    s.fright -= dt;
    if (s.fright <= 0) for (const gh of s.ghosts) gh.fright = false;
  }
  for (const gh of s.ghosts) {
    if (gh.deadT > 0) {
      gh.deadT -= dt;
      if (gh.deadT <= 0) placeEntity(gh, gh.home[0], gh.home[1]);
      continue;
    }
    advance(gh, gh.fright ? P.frightSpeed : P.ghostSpeed * s.ghostMul, dt, decideGhost);
    const dist = Math.hypot(posX(gh) - posX(s.player), posY(gh) - posY(s.player));
    if (dist > P.hitRange) continue;
    if (gh.fright) {
      gh.deadT = P.respawnTime;
      gh.fright = false;
      ctx.sfx.explode();
      ctx.particles.burst(screenX(posX(gh)), screenY(posY(gh)), COLORS.skyLight, 12, 80, 0.5, 40, 2);
    } else if (s.invuln <= 0 && hurt()) {
      return true;
    }
  }
  return false;
}

function readInput() {
  for (const name of Object.keys(KEY_DIRS)) {
    if (ctx.input.pressed(name)) {
      s.want = KEY_DIRS[name];
      s.wantTimer = WANT_TIME;
    }
  }
  const p = s.player;
  const w = s.want;
  if (w && (p.dx || p.dy) && w[0] === -p.dx && w[1] === -p.dy) reverseEntity(p);
}

function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let j = -r; j <= r; j++) {
    const w = Math.round(Math.sqrt(r * r - j * j));
    g.fillRect(cx - w, cy + j, w * 2 + 1, 1);
  }
}

function drawMaze(g) {
  rect(g, 0, 0, ctx.W, ctx.H, COLORS.ink);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = P.originX + x * T;
      const py = P.originY + y * T;
      if (s.maze[idx(x, y)] === 1) {
        rect(g, px, py, T, T, v.fill);
        if (isOpen(x, y - 1)) rect(g, px, py, T, 2, v.edge);
        if (isOpen(x, y + 1)) rect(g, px, py + T - 2, T, 2, v.edge);
        if (isOpen(x - 1, y)) rect(g, px, py, 2, T, v.edge);
        if (isOpen(x + 1, y)) rect(g, px + T - 2, py, 2, T, v.edge);
      } else if (s.dots[idx(x, y)] === 1) {
        rect(g, px + 5, py + 5, 2, 2, COLORS.pale);
      } else if (s.dots[idx(x, y)] === 2) {
        disc(g, px + 6, py + 6, 3, Math.floor(s.t * 5) % 2 ? COLORS.pink : COLORS.white);
      }
    }
  }
}

function drawChomper(g) {
  const p = s.player;
  if (s.invuln > 0 && Math.floor(s.invuln * 14) % 2 === 0) return;
  const cx = screenX(posX(p));
  const cy = screenY(posY(p));
  const open = Math.floor(s.t * 10) % 2 === 0 || !(p.dx || p.dy) ? s.moving : false;
  g.fillStyle = COLORS.yellow;
  for (let j = -BODY; j <= BODY; j++) {
    for (let i = -BODY; i <= BODY; i++) {
      if (i * i + j * j > BODY * BODY + 1) continue;
      const fwd = i * s.face[0] + j * s.face[1];
      const side = Math.abs(-i * s.face[1] + j * s.face[0]);
      if (open && fwd > 0 && side <= fwd * 0.9) continue;
      g.fillRect(cx + i, cy + j, 1, 1);
    }
  }
  rect(g, cx - 1, cy - 4, 2, 2, COLORS.ink);
  rect(g, cx - 1, cy - 7, 2, 2, COLORS.red);
}

function drawGhost(g, gh) {
  const cx = screenX(posX(gh));
  const cy = screenY(posY(gh));
  if (gh.deadT > 0) {
    rect(g, cx - 3, cy - 1, 2, 2, COLORS.white);
    rect(g, cx + 1, cy - 1, 2, 2, COLORS.white);
    return;
  }
  const flash = s.fright > 0 && s.fright < FRIGHT_WARN && Math.floor(s.t * 8) % 2;
  const body = gh.fright ? (flash ? COLORS.white : COLORS.blue) : gh.color;
  g.fillStyle = body;
  for (let j = -BODY; j <= 0; j++) {
    const w = Math.round(Math.sqrt(BODY * BODY - j * j));
    g.fillRect(cx - w, cy + j, w * 2 + 1, 1);
  }
  g.fillRect(cx - BODY, cy + 1, BODY * 2 + 1, BODY - 1);
  const wave = Math.floor(s.t * 6);
  for (let i = -BODY; i <= BODY; i++) {
    if ((i + BODY + wave) % 4 < 2) rect(g, cx + i, cy + BODY, 1, 1, body);
  }
  if (gh.fright) {
    rect(g, cx - 3, cy - 2, 2, 2, COLORS.white);
    rect(g, cx + 1, cy - 2, 2, 2, COLORS.white);
    for (let i = -3; i <= 3; i += 2) rect(g, cx + i, cy + 2 + (i % 4 ? 0 : 1), 2, 1, COLORS.white);
  } else {
    rect(g, cx - 4, cy - 3, 3, 3, COLORS.white);
    rect(g, cx + 1, cy - 3, 3, 3, COLORS.white);
    rect(g, cx - 3 + gh.dx, cy - 2 + gh.dy, 1, 1, COLORS.ink);
    rect(g, cx + 2 + gh.dx, cy - 2 + gh.dy, 1, 1, COLORS.ink);
  }
}

function makePac(variant) {
  return {
    id: variant.id,
    title: variant.title,
    intro: variant.intro,
    duration: 40,
    hints: ['left', 'right', 'up', 'down'],
    hintAt: { x: 152, y: 3 },
    init(c) {
      ctx = c;
      v = variant;
      const factor = c.diff.hearts > 0 ? 1.3 : c.diff.hearts < 0 ? 0.8 : 1;
      s = {
        maze: generateMaze(), dots: new Uint8Array(W * H), left: 0, total: 0, t: 0, delay: P.startDelay,
        player: makeEntity(START[0], START[1]), want: null, wantTimer: 0, face: [1, 0], moving: false,
        hp: c.lives(P.hp), invuln: c.bonus.shield, fright: 0, frightTime: P.frightTime * factor, chew: false,
        ghostMul: c.diff.speed * (1 + 0.05 * c.twist),
        ghosts: [],
      };
      for (let i = 0; i < W * H; i++) if (s.maze[i] === 0) s.dots[i] = 1;
      s.dots[idx(START[0], START[1])] = 0;
      for (const [x, y] of PELLETS) s.dots[idx(x, y)] = 2;
      for (let i = 0; i < W * H; i++) if (s.dots[i]) s.total += 1;
      s.left = s.total;
      const count = clamp(variant.ghosts + Math.sign(c.diff.extra), 2, 4);
      for (let i = 0; i < count; i++) {
        const home = GHOST_HOMES[i];
        const gh = makeEntity(home[0], home[1]);
        Object.assign(gh, { home, color: GHOST_COLORS[i], fright: false, deadT: 0, chase: GHOST_CHASE[i] * variant.aggression });
        s.ghosts.push(gh);
      }
    },
    update(dt) {
      s.t += dt;
      if (s.delay > 0) {
        s.delay -= dt;
        return 'playing';
      }
      s.invuln = Math.max(0, s.invuln - dt);
      s.wantTimer -= dt;
      if (s.wantTimer <= 0) s.want = null;
      readInput();
      advance(s.player, P.playerSpeed, dt, decidePlayer);
      const p = s.player;
      s.moving = p.dx !== 0 || p.dy !== 0;
      if (s.moving) s.face = [p.dx, p.dy];
      eatAt(Math.round(posX(p)), Math.round(posY(p)));
      if (updateGhosts(dt)) return 'lose';
      return s.left <= 0 ? 'win' : 'playing';
    },
    render() {
      const g = ctx.g;
      drawMaze(g);
      for (const gh of s.ghosts) drawGhost(g, gh);
      drawChomper(g);
      hearts(g, 4, 3, s.hp, ctx.lives(P.hp));
      bar(g, ctx.W - 84, 4, 78, 6, 1 - s.left / s.total, COLORS.yellow, COLORS.ink);
      if (s.fright > 0) bar(g, ctx.W - 84, 12, 78, 4, s.fright / s.frightTime, COLORS.blue, COLORS.ink);
    },
    dispose() {
      s = null;
      ctx = null;
      v = null;
    },
  };
}

export default makePac({
  id: 'boss', title: 'kernel.exe', intro: 'POWER CORES LET YOU BOUNCE BACK!', ghosts: 3, aggression: 1,
  loops: 0.35, fixDeadEnds: 0.7, fill: COLORS.night, edge: COLORS.blue,
});

export const boss2 = makePac({
  id: 'boss2', title: 'cloud.exe', intro: 'CLEAR THE STORM DATA!', ghosts: 4, aggression: 1.15,
  loops: 0.45, fixDeadEnds: 0.8, fill: COLORS.slate, edge: COLORS.skyLight,
});
