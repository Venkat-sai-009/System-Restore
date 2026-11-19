// Chiptune sound effects, all synthesized.
import { tone, noise } from './context.js';

export const blip = () => tone(880, 0.06, 'square', 0.18);
export const select = () => { tone(520, 0.05, 'square', 0.18); tone(780, 0.07, 'square', 0.18, 0, 0.05); };
export const jump = () => tone(260, 0.16, 'square', 0.2, 620);
export const land = () => noise(0.05, 0.12, 900);
export const bounce = () => { tone(180, 0.28, 'triangle', 0.4, 900); tone(360, 0.2, 'square', 0.12, 1200, 0.03); };
export const shoot = () => tone(900, 0.07, 'square', 0.1, 300);
export const hit = () => { noise(0.16, 0.3, 2500); tone(160, 0.14, 'sawtooth', 0.2, 60); };
export const explode = () => { noise(0.25, 0.28, 1800); tone(120, 0.2, 'square', 0.15, 40); };
export const pickup = () => tone(1100, 0.08, 'square', 0.15, 1700);
export const slide = () => tone(300, 0.05, 'square', 0.12, 380);
export const error = () => {
  tone(220, 0.14, 'square', 0.25);
  tone(160, 0.22, 'square', 0.25, 0, 0.14);
};
export const glitch = () => {
  noise(0.12, 0.2, 5000);
  tone(700, 0.04, 'square', 0.1, 150);
  tone(90, 0.1, 'sawtooth', 0.12, 400, 0.05);
};
export const repair = () => {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.2, 0, i * 0.09));
  tone(1047, 0.5, 'triangle', 0.2, 0, 0.4);
};
export const win = () => {
  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.2, 0, i * 0.08));
};
export const reboot = () => {
  tone(400, 0.12, 'square', 0.2, 120);
  tone(200, 0.2, 'triangle', 0.25, 700, 0.12);
};
export const collapse = () => {
  noise(1.8, 0.3, 700);
  tone(110, 1.8, 'sawtooth', 0.18, 30);
};
