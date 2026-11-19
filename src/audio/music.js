// Looping chiptune that gets fuller as layers unlock (one per restored sector).
import { getCtx, tone, noise } from './context.js';
import { AUDIO } from '../config.js';

const STEP = 60 / AUDIO.bpm / 2; // one eighth note
const STEPS_PER_BAR = 8;
const BASS = [45, 41, 48, 43]; // A, F, C, G
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
const LEAD = [
  76, 0, 72, 76, 0, 79, 76, 0, 77, 0, 72, 77, 0, 81, 77, 0,
  79, 0, 76, 72, 0, 76, 79, 0, 74, 0, 71, 74, 0, 79, 74, 0,
];
const TOTAL = STEPS_PER_BAR * BASS.length;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let timer = null;
let step = 0;
let nextTime = 0;
let layers = 1;

function schedule(s, t) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const beat = s % STEPS_PER_BAR;
  if (layers > 0 && (beat === 0 || beat === 3 || beat === 4 || beat === 6)) {
    tone(hz(BASS[bar] - 12), STEP * 1.6, 'square', 0.16, 0, 0, t);
  }
  if (layers > 1) {
    if (beat === 0 || beat === 4) tone(150, 0.12, 'sine', 0.4, 45, 0, t);
    if (beat === 2 || beat === 6) noise(0.09, 0.12, 4500, 0, t);
    if (beat % 2 === 1) noise(0.03, 0.05, 9000, 0, t);
  }
  if (layers > 2) {
    const chord = CHORDS[bar];
    tone(hz(chord[beat % 3] + 12), STEP * 0.9, 'triangle', 0.1, 0, 0, t);
  }
  if (layers > 3 && LEAD[s]) tone(hz(LEAD[s]), STEP * 1.5, 'square', 0.07, 0, 0, t);
  if (layers > 4 && beat === 0) {
    CHORDS[bar].forEach((m) => tone(hz(m), STEP * 7, 'triangle', 0.06, 0, 0, t));
  }
}

function tick() {
  const ac = getCtx();
  if (!ac) return;
  while (nextTime < ac.currentTime + AUDIO.lookahead) {
    schedule(step, nextTime);
    nextTime += STEP;
    step = (step + 1) % TOTAL;
  }
}

export function startMusic() {
  const ac = getCtx();
  if (!ac || timer) return;
  step = 0;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(tick, 30);
}

export function stopMusic() {
  clearInterval(timer);
  timer = null;
}

export function setLayers(n) {
  layers = Math.max(1, Math.min(5, n));
}
