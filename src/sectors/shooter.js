// firewall.sys: viruses attack the firewall. Your shots ricochet off the glowing walls.
import { COLORS, SHOOTER as P } from '../config.js';
import { rect, hearts, bar, arrowShape, text } from '../utils/draw.js';
import { clamp, rand, overlap } from '../utils/math.js';

const MAX_BULLETS = 64;
const MAX_ENEMY_BULLETS = 32;
const MAX_ENEMIES = 20;
const STAR_COUNT = 36;
const STAR_COLORS = [COLORS.white, COLORS.skyLight, COLORS.pink, COLORS.yellow];

let s = null;
let ctx = null;

function makePool(n, make) {
  return Array.from({ length: n }, make);
}

function spawnEnemy() {
  const e = s.enemies.find((q) => !q.alive);
  if (!e) return;
  const gunner = Math.random() < P.gunnerChance;
  e.alive = true;
  e.gunner = gunner;
  e.hp = gunner ? 2 : 1;
  e.x = rand(14, ctx.W - 14);
  e.y = -10;
  e.baseX = e.x;
  e.phase = rand(0, 6);
  e.fire = rand(0.4, P.gunnerFire);
  e.stopY = rand(24, 52);
}

function fireEnemyBullet(e) {
  const b = s.enemyBullets.find((q) => !q.alive);
  if (!b) return;
  const dx = s.x - e.x;
  const dy = s.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  b.alive = true;
  b.x = e.x;
  b.y = e.y + 6;
  b.vx = (dx / len) * P.enemyBulletSpeed * s.speedMul;
  b.vy = (dy / len) * P.enemyBulletSpeed * s.speedMul;
}

// One shot leaving at the given sideways speed; it bounces around the arena.
function spawnBullet(vx) {
  const b = s.bullets.find((q) => !q.alive);
  if (!b) return;
  b.alive = true;
  b.x = s.x;
  b.y = s.y - 8;
  b.vx = vx + ctx.input.axisX() * 30;
  b.vy = -P.bulletVy;
  b.bounces = 0;
  b.life = P.bulletLife;
}

// The weapon upgrades by itself: 1 alternating shot, 2 twin shots, 3 triple spread with faster fire.
function fireVolley() {
  if (s.level === 1) {
    s.fireSide = -s.fireSide;
    spawnBullet(s.fireSide * P.bulletVx);
  } else if (s.level === 2) {
    spawnBullet(-P.bulletVx);
    spawnBullet(P.bulletVx);
  } else {
    spawnBullet(-P.bulletVx * 1.4);
    spawnBullet(0);
    spawnBullet(P.bulletVx * 1.4);
  }
  ctx.sfx.shoot();
}

function checkUpgrade() {
  const level = Math.min(P.maxLevel, 1 + Math.floor(s.time / P.upgradeEvery));
  if (level <= s.level) return;
  s.level = level;
  s.flash = P.upgradeFlash;
  ctx.sfx.repair();
  ctx.fx.shake(2);
  ctx.fx.glitch(0.4);
  ctx.particles.burst(s.x, s.y, COLORS.yellow, 16, 90, 0.7, 40, 2);
  ctx.particles.burst(s.x, s.y, COLORS.teal, 10, 70, 0.6, 40, 2);
}

function hurtPlayer() {
  if (s.invuln > 0) return;
  s.hp -= 1;
  s.invuln = P.invuln;
  ctx.sfx.hit();
  ctx.fx.shake(3);
  ctx.fx.glitch(0.3);
  ctx.particles.burst(s.x, s.y, COLORS.red, 10, 80, 0.5, 80, 2);
}

function killEnemy(e) {
  e.alive = false;
  ctx.sfx.explode();
  ctx.particles.burst(e.x, e.y, e.gunner ? COLORS.pink : COLORS.lime, 10, 70, 0.45, 60, 2);
}

function updateSpawns(dt) {
  s.spawnTimer -= dt;
  if (s.spawnTimer > 0) return;
  const k = s.time / P.duration;
  s.spawnTimer = (P.spawnStart + (P.spawnEnd - P.spawnStart) * k) / s.speedMul;
  spawnEnemy();
}

function updateEnemies(dt) {
  for (const e of s.enemies) {
    if (!e.alive) continue;
    e.phase += dt * 2.2;
    if (e.gunner) {
      if (e.y < e.stopY) e.y += P.bugSpeed * 1.6 * s.speedMul * dt;
      e.x = e.baseX + Math.sin(e.phase) * 18;
      e.fire -= dt;
      if (e.fire <= 0) {
        e.fire = P.gunnerFire / s.speedMul;
        fireEnemyBullet(e);
      }
    } else {
      e.y += P.bugSpeed * s.speedMul * dt;
      e.x = e.baseX + Math.sin(e.phase) * 14;
    }
    if (e.y > ctx.H + 10) e.alive = false;
    if (overlap(e.x - 5, e.y - 5, 10, 10, s.x - 4, s.y - 4, 8, 8)) {
      killEnemy(e);
      hurtPlayer();
    }
  }
}

function bounceBullet(b) {
  b.bounces += 1;
  ctx.particles.burst(b.x, b.y, COLORS.teal, 2, 30, 0.2, 0, 1);
  if (b.bounces > P.maxBounces) b.alive = false;
}

function updatePlayerBullets(dt) {
  for (const b of s.bullets) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); bounceBullet(b); }
    else if (b.x > ctx.W - 3) { b.x = ctx.W - 3; b.vx = -Math.abs(b.vx); bounceBullet(b); }
    if (b.y < 3) { b.y = 3; b.vy = Math.abs(b.vy); bounceBullet(b); }
    if (b.y > ctx.H + 4 || b.life <= 0) b.alive = false;
    for (const e of s.enemies) {
      if (!b.alive || !e.alive || !overlap(b.x - 2, b.y - 2, 4, 4, e.x - 5, e.y - 5, 10, 10)) continue;
      b.alive = false;
      e.hp -= 1;
      if (e.hp <= 0) killEnemy(e);
      else ctx.particles.burst(e.x, e.y, COLORS.white, 3, 40, 0.2, 0, 1);
    }
  }
}

function updateBullets(dt) {
  updatePlayerBullets(dt);
  for (const b of s.enemyBullets) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > ctx.H + 6 || b.y < -6 || b.x < -6 || b.x > ctx.W + 6) b.alive = false;
    else if (overlap(b.x - 2, b.y - 2, 4, 4, s.x - 3, s.y - 3, 6, 6)) {
      b.alive = false;
      hurtPlayer();
    }
  }
}

function drawEnemy(g, e) {
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  const body = e.gunner ? COLORS.pink : COLORS.lime;
  const dark = e.gunner ? COLORS.purple : COLORS.green;
  rect(g, x - 6, y - 4, 12, 9, body);
  rect(g, x - 4, y - 6, 8, 2, body);
  rect(g, x - 6, y + 2, 12, 3, dark);
  rect(g, x - 4, y - 2, 3, 3, COLORS.white);
  rect(g, x + 1, y - 2, 3, 3, COLORS.white);
  rect(g, x - 3, y - 1, 2, 2, COLORS.red);
  rect(g, x + 2, y - 1, 2, 2, COLORS.red);
  const wiggle = Math.floor(e.phase * 2) % 2;
  rect(g, x - 7, y + 5, 2, 2 + wiggle, dark);
  rect(g, x + 5, y + 5, 2, 3 - wiggle, dark);
  if (e.gunner) rect(g, x - 1, y + 5, 2, 3, COLORS.yellow);
}

function drawBackdrop(g) {
  rect(g, 0, 0, ctx.W, ctx.H, COLORS.ink);
  rect(g, 0, 50, ctx.W, ctx.H - 50, '#18184a');
  rect(g, 0, 92, ctx.W, ctx.H - 92, '#2a2074');
  for (let i = 0; i < s.stars.length; i++) {
    const st = s.stars[i];
    rect(g, st.x, st.y, 1, st.v > 30 ? 2 : 1, STAR_COLORS[i % STAR_COLORS.length]);
  }
  rect(g, 0, 0, 2, ctx.H, COLORS.teal);
  rect(g, ctx.W - 2, 0, 2, ctx.H, COLORS.teal);
  rect(g, 0, 0, ctx.W, 2, COLORS.teal);
}

function drawShip(g) {
  if (s.invuln > 0 && Math.floor(s.time * 14) % 2 !== 0) return;
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  arrowShape(g, x, y, 'up', 7, COLORS.white);
  rect(g, x - 6, y + 2, 13, 4, COLORS.blue);
  rect(g, x - 7, y + 3, 2, 4, COLORS.red);
  rect(g, x + 6, y + 3, 2, 4, COLORS.red);
  rect(g, x - 1, y, 3, 3, COLORS.teal);
  if (Math.floor(s.time * 20) % 2 === 0) rect(g, x - 1, y + 7, 3, 3, COLORS.orange);
}

export default {
  id: 'shooter',
  title: 'firewall.sys',
  intro: 'DEFEND THE FIREWALL!',
  duration: P.duration,
  hints: ['left', 'right', 'up', 'down', 'space'],
  hintAt: { x: 152, y: 60 },
  init(c) {
    ctx = c;
    s = {
      x: c.W / 2, y: c.H - 22, hp: c.lives(P.hp), invuln: c.bonus.shield, time: 0, fireTimer: 0, spawnTimer: 0.6,
      fireSide: 1, level: 1, flash: 0, speedMul: c.diff.speed * (1 + 0.12 * c.twist),
      bullets: makePool(MAX_BULLETS, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, bounces: 0, life: 0 })),
      enemyBullets: makePool(MAX_ENEMY_BULLETS, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0 })),
      enemies: makePool(MAX_ENEMIES, () => ({
        alive: false, gunner: false, hp: 1, x: 0, y: 0, baseX: 0, phase: 0, fire: 0, stopY: 0,
      })),
      stars: makePool(STAR_COUNT, () => ({ x: rand(0, c.W), y: rand(0, c.H), v: rand(10, 50) })),
    };
  },
  update(dt) {
    s.time += dt;
    s.flash = Math.max(0, s.flash - dt);
    checkUpgrade();
    s.invuln = Math.max(0, s.invuln - dt);
    s.x = clamp(s.x + ctx.input.axisX() * P.playerSpeed * dt, 8, ctx.W - 8);
    s.y = clamp(s.y + ctx.input.axisY() * P.playerSpeed * dt, ctx.H * 0.45, ctx.H - 10);
    s.fireTimer -= dt;
    if (s.fireTimer <= 0) {
      const base = ctx.input.down('action') ? P.fireFast : P.fireSlow;
      s.fireTimer = s.level >= P.maxLevel ? base * P.topLevelFireScale : base;
      fireVolley();
    }
    for (const st of s.stars) st.y = (st.y + st.v * dt) % ctx.H;
    updateSpawns(dt);
    updateEnemies(dt);
    updateBullets(dt);
    if (s.hp <= 0) {
      ctx.particles.burst(s.x, s.y, COLORS.white, 16, 100, 0.8, 100, 2);
      return 'lose';
    }
    if (s.time >= P.duration) {
      for (const e of s.enemies) if (e.alive) killEnemy(e);
      return 'win';
    }
    return 'playing';
  },
  render() {
    const g = ctx.g;
    drawBackdrop(g);
    for (const e of s.enemies) if (e.alive) drawEnemy(g, e);
    for (const b of s.bullets) {
      if (!b.alive) continue;
      rect(g, b.x - 2, b.y - 2, 4, 4, COLORS.yellow);
      rect(g, b.x - 1, b.y - 1, 2, 2, COLORS.white);
    }
    for (const b of s.enemyBullets) {
      if (!b.alive) continue;
      rect(g, b.x - 2, b.y - 1, 4, 2, COLORS.red);
      rect(g, b.x - 1, b.y - 2, 2, 4, COLORS.red);
      rect(g, b.x - 1, b.y - 1, 2, 2, COLORS.white);
    }
    drawShip(g);
    hearts(g, 6, 4, s.hp, ctx.lives(P.hp));
    for (let i = 0; i < P.maxLevel; i++) rect(g, 6 + i * 10, 15, 8, 4, i < s.level ? COLORS.yellow : COLORS.slate);
    if (s.flash > 0 && Math.floor(s.flash * 10) % 2 === 0) {
      rect(g, ctx.W / 2 - 44, 34, 88, 12, COLORS.night);
      text(g, 'POWER UP!', ctx.W / 2, 36, COLORS.yellow, 'center');
    }
    bar(g, ctx.W - 84, 4, 78, 6, s.time / P.duration, COLORS.teal, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
