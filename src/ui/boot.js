// Fake boot sequence. Any key or click skips it, which also unlocks audio.
import { COLORS, VIEW } from '../config.js';
import { rect, text } from '../utils/draw.js';

const LINES = [
  ['BIOS ........ OK', COLORS.white],
  ['MEMORY ...... FAIL', COLORS.red],
  ['SECTORS ..... 4 ERR', COLORS.red],
  ['INTEGRITY ... 0%', COLORS.red],
  ['RECOVERY .... START', COLORS.teal],
];
const LINE_DELAY = 0.3;
const LOAD_TIME = 2.4;
const PULSE_PERIOD = 90;

// Heartbeat waveform: flat, then a spike. It starts beating as recovery loads.
function wave(u) {
  if (u < 40) return 0;
  if (u < 46) return -(u - 40) * 2;
  if (u < 54) return -12 + (u - 46) * 3.5;
  if (u < 60) return 16 - (u - 54) * 2.7;
  return 0;
}

export function createBoot() {
  let t = 0;
  return {
    update(dt, input) {
      t += dt;
      return t > 0.15 && input.anyPressed();
    },
    draw(g) {
      rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.ink);
      const jitter = Math.sin(t * 17) > 0.92 ? 2 : 0;
      text(g, 'SYSTEM', VIEW.width / 2 + jitter, 8, COLORS.white, 'center', 16);
      text(g, 'RESTORE', VIEW.width / 2 - jitter, 28, COLORS.teal, 'center', 16);

      const alive = Math.min(1, t / LOAD_TIME);
      let prev = 0;
      for (let x = 24; x < 296; x++) {
        const u = (x - t * 70 + 2000) % PULSE_PERIOD;
        const y = Math.round(wave(u) * alive);
        const top = Math.min(prev, y);
        rect(g, x, 62 + top, 1, Math.abs(y - prev) + 1, COLORS.teal);
        prev = y;
      }

      LINES.forEach(([str, color], i) => {
        const shown = Math.floor((t - 0.3 - i * LINE_DELAY) / 0.03);
        if (shown > 0) text(g, str.slice(0, shown), 40, 90 + i * 10, color);
      });

      const load = Math.min(1, t / LOAD_TIME);
      rect(g, 24, 148, 272, 8, COLORS.slate);
      rect(g, 25, 149, 270, 6, COLORS.ink);
      rect(g, 25, 149, Math.round(270 * load), 6, COLORS.teal);
      if (t > 0.8 && Math.floor(t * 2.5) % 2 === 0) {
        text(g, 'PRESS ANY KEY', VIEW.width / 2, 164, COLORS.yellow, 'center');
      }
    },
  };
}
