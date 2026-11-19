// Fixed-size particle pool so nothing is allocated while playing.
import { rand } from './math.js';

const MAX = 180;

export function createParticles() {
  const pool = Array.from({ length: MAX }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 2, grav: 0,
  }));
  let next = 0;
  return {
    burst(x, y, color, count = 8, speed = 60, life = 0.5, grav = 140, size = 2) {
      for (let i = 0; i < count; i++) {
        const p = pool[next];
        next = (next + 1) % MAX;
        const a = rand(0, Math.PI * 2);
        const s = rand(speed * 0.3, speed);
        p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
        p.life = p.max = rand(life * 0.6, life); p.color = color; p.size = size; p.grav = grav;
      }
    },
    update(dt) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    draw(g) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        g.fillStyle = p.color;
        const s = p.life < p.max * 0.3 ? 1 : p.size;
        g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    },
    clear() {
      for (const p of pool) p.life = 0;
    },
  };
}
