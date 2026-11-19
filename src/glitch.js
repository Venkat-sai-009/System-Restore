// Corrupted rules: while the system is damaged, the rules of a game glitch for a few seconds.
// The lower the integrity, the more often it happens. At 100% the rules are clean again.
import { COLORS, GLITCH as P } from './config.js';
import { text, bevel, bar } from './utils/draw.js';
import { warn } from './ui/icons.js';
import { rand } from './utils/math.js';

const LABELS = {
  flip: 'CONTROLS FLIP!',
  mirror: 'SCREEN MIRROR!',
  upside: 'UPSIDE DOWN!',
  rush: 'RUSH MODE!',
};
const DEFAULT_RULES = ['flip', 'mirror', 'rush'];
const BOSS_INTEGRITY = 0.5; // bosses are the source of the corruption, so they always glitch
const PULSE_EVERY = 0.3;

export function createGlitchRules({ input, fx, sfx }) {
  let events = [];
  let next = 0;
  let clock = 0;
  let active = null; // { rule, left, total }
  let pulse = 0;
  const state = { timeScale: 1, mirror: false, upside: false };

  function apply() {
    const rule = active ? active.rule : '';
    state.mirror = rule === 'mirror';
    state.upside = rule === 'upside';
    state.timeScale = rule === 'rush' ? P.rushScale : 1;
    input.setFlip(rule === 'flip');
  }

  // The event that is currently warning the player, if any.
  const warning = () => {
    if (active || next >= events.length) return null;
    const e = events[next];
    return clock >= e.at && clock < e.at + P.warn ? e : null;
  };

  return {
    state,
    // allowed: rule names this game supports. comeback: a retry after a K.O. gets one glitch fewer.
    start({ allowed, integrity, diff, comeback, boss, gentle }) {
      const rules = allowed && allowed.length ? allowed : DEFAULT_RULES;
      const effective = boss ? BOSS_INTEGRITY : integrity;
      const scale = 1 + diff.extra * 0.2;
      let count = Math.floor((1 - effective) * P.maxEvents * scale + Math.random());
      if (comeback) count -= 1;
      if (gentle) count = Math.min(count, P.gentleEvents);
      count = Math.max(0, Math.min(P.maxEvents, count));
      events = [];
      let at = rand(P.firstMin, P.firstMax) + (gentle ? P.gentleDelay : 0);
      for (let i = 0; i < count; i++) {
        events.push({ at, rule: rules[Math.floor(Math.random() * rules.length)] });
        at += P.warn + P.duration + rand(P.gapMin, P.gapMax);
      }
      next = 0;
      clock = 0;
      active = null;
      apply();
    },
    stop() {
      events = [];
      active = null;
      apply();
    },
    update(dt) {
      clock += dt;
      if (active) {
        active.left -= dt;
        if (active.left <= 0) {
          active = null;
          fx.glitch(0.4);
          apply();
        }
        return state;
      }
      if (next >= events.length) return state;
      const e = events[next];
      if (clock >= e.at + P.warn) {
        next += 1;
        const total = e.rule === 'rush' ? P.rushDuration : P.duration;
        active = { rule: e.rule, left: total, total };
        fx.glitch(1);
        fx.shake(2);
        sfx.glitch();
        apply();
      } else if (clock >= e.at) {
        pulse -= dt;
        if (pulse <= 0) {
          pulse = PULSE_EVERY;
          fx.glitch(0.25);
        }
      }
      return state;
    },
    // Warning banner before a glitch, and a small timer chip while it is active.
    draw(g, w, h, time) {
      const w1 = warning();
      if (w1) {
        const flash = Math.floor(time * 8) % 2 === 0;
        bevel(g, w / 2 - 76, 46, 152, 16, COLORS.night, true);
        warn(g, w / 2 - 70, 49, COLORS.yellow, COLORS.ink);
        text(g, LABELS[w1.rule], w / 2 + 8, 50, flash ? COLORS.white : COLORS.yellow, 'center');
      }
      if (active) {
        bevel(g, 4, h - 22, 130, 18, COLORS.night, true);
        warn(g, 8, h - 20, COLORS.red, COLORS.white);
        text(g, LABELS[active.rule], 22, h - 20, COLORS.white);
        bar(g, 22, h - 9, 108, 4, active.left / active.total, COLORS.red, COLORS.ink);
      }
    },
  };
}
