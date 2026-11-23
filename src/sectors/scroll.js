// scroll.sys: hold a key to lift the scrollbar thumb and keep it on the moving target. The ends bounce.
import { COLORS, SCROLL as P } from '../config.js';
import { rect, bar } from '../utils/draw.js';
import { clamp, rand } from '../utils/math.js';

const TOP = 20;
const TRACK_H = 116;
const THUMB_H = 22;
const ZONE_H = 50;
const TRACK_W = 18;
const ZONE_W = 30;
const RETHINK_MIN = 0.8;
const RETHINK_MAX = 1.8;
const END_BOUNCE = 0.45;

let s = null;
let ctx = null;

const trackX = () => Math.round(ctx.W / 2 - TRACK_W / 2);

function holding() {
  const inp = ctx.input;
  return inp.down('up') || inp.down('action') || inp.down('confirm') || inp.pointer.down;
}

function drawPage(g) {
  rect(g, 0, 0, ctx.W, ctx.H, COLORS.pale);
  for (let i = 0; i < 9; i++) {
    const y = TOP + 4 + i * 13 - (Math.round(s.scroll) % 13);
    rect(g, 12, y, 80 + ((i * 37) % 50), 3, COLORS.grey);
    rect(g, ctx.W - 140 + ((i * 23) % 30), y, 120 - ((i * 23) % 30), 3, COLORS.grey);
  }
}

export default {
  id: 'scroll',
  title: 'scroll.sys',
  intro: 'KEEP THE THUMB ON THE FILE!',
  duration: P.timeLimit,
  glitches: ['flip', 'rush'],
  hints: ['up', 'space'],
  hintAt: { x: 152, y: 6 },
  init(c) {
    ctx = c;
    s = {
      y: TRACK_H - THUMB_H, vy: 0, t: 0, scroll: 0, progress: 0.3, zone: TRACK_H / 2, goalZone: TRACK_H / 2, think: 0.5,
      limit: P.timeLimit * c.diff.time + c.bonus.time,
      speed: c.diff.speed * (1 + 0.05 * c.twist),
    };
  },
  update(dt) {
    s.t += dt;
    s.scroll += s.vy * dt * 0.3;
    s.think -= dt;
    if (s.think <= 0) {
      s.think = rand(RETHINK_MIN, RETHINK_MAX) / s.speed;
      s.goalZone = rand(ZONE_H / 2, TRACK_H - ZONE_H / 2);
    }
    const step = P.zoneSpeed * s.speed * dt;
    s.zone += clamp(s.goalZone - s.zone, -step, step);
    s.vy = clamp(s.vy + (holding() ? -P.lift : P.gravity) * dt, -P.maxSpeed, P.maxSpeed);
    s.y += s.vy * dt;
    if (s.y < 0) {
      s.y = 0;
      s.vy = Math.abs(s.vy) * END_BOUNCE;
    }
    if (s.y > TRACK_H - THUMB_H) {
      s.y = TRACK_H - THUMB_H;
      s.vy = -Math.abs(s.vy) * END_BOUNCE;
      if (Math.abs(s.vy) > 20) ctx.sfx.bounce();
    }
    const onTarget = Math.abs(s.y + THUMB_H / 2 - s.zone) < ZONE_H / 2;
    s.on = onTarget;
    s.progress = clamp(s.progress + (onTarget ? P.fill : -P.drain) * dt, 0, 1);
    if (s.progress >= 1) return 'win';
    return s.t >= s.limit ? 'lose' : 'playing';
  },
  render() {
    const g = ctx.g;
    drawPage(g);
    rect(g, 0, 0, ctx.W, 16, COLORS.night);
    const x = trackX();
    rect(g, x, TOP, TRACK_W, TRACK_H, COLORS.slate);
    const zy = TOP + Math.round(s.zone - ZONE_H / 2);
    rect(g, x - 6, zy, ZONE_W, ZONE_H, s.on ? COLORS.lime : COLORS.yellow);
    rect(g, x - 2, zy + 4, 10, 2, COLORS.ink);
    rect(g, x - 2, zy + 9, 6, 2, COLORS.ink);
    rect(g, x + 1, TOP + Math.round(s.y), TRACK_W - 2, THUMB_H, s.on ? COLORS.teal : COLORS.blue);
    rect(g, x + 1, TOP + Math.round(s.y), TRACK_W - 2, 2, COLORS.white);
    const left = 1 - s.t / s.limit;
    bar(g, 6, 4, 80, 6, left, left < 0.25 ? COLORS.red : COLORS.teal, COLORS.ink);
    bar(g, ctx.W - 84, 4, 78, 6, s.progress, COLORS.lime, COLORS.ink);
  },
  dispose() {
    s = null;
    ctx = null;
  },
};
