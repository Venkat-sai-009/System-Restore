// Short pixel-art stories that explain the premise without a wall of text.
// Three sets: the opening, chapter 2 (after the first boss) and the epilogue (after the last boss).
import { COLORS, VIEW, STORY } from '../config.js';
import { rect, text, heart, hintRow } from '../utils/draw.js';
import { lerp, clamp } from '../utils/math.js';
import { monitor, happyFace, deadFace, virus, robot, cloud, lightning } from './storyArt.js';

const TOP = 14;
const BOTTOM = 138;
const CX = VIEW.width / 2;

const band = (g, color) => rect(g, 0, TOP, VIEW.width, BOTTOM - TOP, color);
const sparkles = (g, t, color) => {
  for (let i = 0; i < 8; i++) {
    const a = t * 2 + i * 0.8;
    rect(g, CX + Math.cos(a) * (50 + i * 6), 70 + Math.sin(a * 1.3) * 34, 2, 2, color);
  }
};

const INTRO = [
  { lines: ['A HAPPY COMPUTER...', ''], draw: (g, t) => {
    band(g, COLORS.desk);
    monitor(g, CX, 76, COLORS.sky);
    happyFace(g, CX, 76);
    for (let i = 0; i < 3; i++) heart(g, 60 + i * 90, 40 + Math.round(Math.sin(t * 3 + i) * 5), COLORS.pink);
  } },
  { lines: ['...UNTIL A VIRUS', 'HIT THE KERNEL!'], glitchy: true, draw: (g, t) => {
    band(g, COLORS.night);
    const k = clamp(t / 1.5, 0, 1);
    monitor(g, CX, 86, k > 0.9 ? COLORS.purple : COLORS.sky);
    if (k <= 0.9) happyFace(g, CX, 86);
    virus(g, CX, Math.round(lerp(-10, 70, k * k)), t);
  } },
  { lines: ['CRASH!', 'EVERYTHING BROKE.'], glitchy: true, draw: (g, t) => {
    band(g, COLORS.ink);
    monitor(g, CX, 76, COLORS.red);
    deadFace(g, CX, 76);
    for (let i = 0; i < 6; i++) rect(g, CX - 40 + i * 14 + (i % 2) * 6, 46 + i * 7, 12, 2, COLORS.ink);
    for (let i = 0; i < 5; i++) {
      const y = TOP + ((Math.floor(t * 17) * 37 + i * 29) % (BOTTOM - TOP));
      rect(g, (i * 71 + Math.floor(t * 30) * 13) % 260, y, 60, 2, i % 2 ? COLORS.teal : COLORS.pink);
    }
  } },
  { lines: ['YOU ARE RESTORE.EXE', 'FIX IT. BOUNCE BACK!'], draw: (g, t) => {
    band(g, COLORS.sky);
    for (let x = 0; x < VIEW.width; x += 2) rect(g, x, 106 + Math.round(Math.sin(x * 0.05) * 6), 2, 40, COLORS.grassDark);
    rect(g, 0, 118, VIEW.width, 22, COLORS.grassLight);
    rect(g, 40, 30, 28, 8, COLORS.white);
    rect(g, 230, 44, 34, 8, COLORS.white);
    rect(g, CX - 12, 118, 24, 4, COLORS.orange);
    rect(g, CX - 8, 114, 16, 4, COLORS.yellow);
    robot(g, CX, Math.round(98 - Math.abs(Math.sin(t * 4.5)) * 22));
    sparkles(g, t, COLORS.yellow);
  } },
];

const CHAPTER2 = [
  { lines: ['THE COMPUTER IS SAVED!', 'EVERYONE CHEERS!'], draw: (g, t) => {
    band(g, COLORS.sky);
    rect(g, 0, 112, VIEW.width, 26, COLORS.grassLight);
    monitor(g, CX, 72, COLORS.skyLight);
    happyFace(g, CX, 72);
    for (let i = 0; i < 4; i++) heart(g, 40 + i * 70, 36 + Math.round(Math.sin(t * 3 + i) * 5), COLORS.pink);
    sparkles(g, t, COLORS.yellow);
  } },
  { lines: ['BUT THE VIRUS WAS A COPY...', 'THE REAL ONE HIDES IN THE CLOUD!'], glitchy: true, draw: (g, t) => {
    band(g, COLORS.night);
    monitor(g, 110, 86, COLORS.sky);
    happyFace(g, 110, 86);
    cloud(g, Math.round(lerp(360, 240, clamp(t / 1.6, 0, 1))), 40, 'angry');
    if (Math.floor(t * 8) % 5 === 0) rect(g, 0, TOP, VIEW.width, BOTTOM - TOP, COLORS.skyLight);
  } },
  { lines: ['ZAP! ALL COLOR', 'FADED AGAIN...'], glitchy: true, draw: (g, t) => {
    band(g, COLORS.ink);
    cloud(g, 240, 40, 'angry');
    lightning(g, 190, 52, 100);
    monitor(g, 110, 86, COLORS.slate);
    deadFace(g, 110, 86);
    for (let i = 0; i < 4; i++) {
      rect(g, (i * 83 + Math.floor(t * 40) * 11) % 280, TOP + ((Math.floor(t * 20) * 29 + i * 41) % 110), 50, 2, COLORS.grey);
    }
  } },
  { lines: ['NEW MISSION, RESTORE.EXE:', 'SAVE THE NETWORK!'], draw: (g, t) => {
    band(g, COLORS.night);
    for (let i = 0; i < 24; i++) rect(g, (i * 53) % VIEW.width, TOP + ((i * 37 + t * 30) % (BOTTOM - TOP)), 1, 3, COLORS.white);
    cloud(g, 240, 36, 'angry');
    robot(g, 100, Math.round(84 - Math.sin(t * 3) * 6), true);
    rect(g, 40, 126, 90, 4, COLORS.slate);
  } },
];

const EPILOGUE = [
  { lines: ['THE CLOUD IS CLEAR!', ''], draw: (g, t) => {
    band(g, COLORS.sky);
    cloud(g, CX, 62 + Math.round(Math.sin(t * 2) * 3), 'happy');
    sparkles(g, t, COLORS.white);
    rect(g, 0, 112, VIEW.width, 26, COLORS.grassLight);
  } },
  { lines: ['THE COMPUTER SMILES AGAIN.', ''], draw: (g, t) => {
    band(g, COLORS.desk);
    monitor(g, 130, 74, COLORS.sky);
    happyFace(g, 130, 74);
    robot(g, 230, 100);
    for (let i = 0; i < 5; i++) heart(g, 30 + i * 60, 34 + Math.round(Math.sin(t * 3 + i) * 5), COLORS.pink);
  } },
  { lines: ['THANK YOU, RESTORE.EXE!', 'YOU BOUNCED BACK!'], draw: (g, t) => {
    band(g, COLORS.sky);
    for (let x = 0; x < VIEW.width; x += 2) rect(g, x, 104 + Math.round(Math.sin(x * 0.05) * 6), 2, 40, COLORS.grassDark);
    rect(g, 0, 118, VIEW.width, 22, COLORS.grassLight);
    rect(g, CX - 12, 118, 24, 4, COLORS.orange);
    rect(g, CX - 8, 114, 16, 4, COLORS.yellow);
    robot(g, CX, Math.round(96 - Math.abs(Math.sin(t * 4)) * 24));
    sparkles(g, t, COLORS.yellow);
    sparkles(g, t + 3, COLORS.pink);
  } },
];

const SETS = { intro: INTRO, chapter2: CHAPTER2, epilogue: EPILOGUE };

export function createStory(name) {
  const panels = SETS[name];
  let index = 0;
  let t = 0;
  const lineLen = () => panels[index].lines[0].length + panels[index].lines[1].length;
  const shown = () => Math.floor(t * STORY.typeSpeed);

  return {
    // Returns true when the story is finished or skipped.
    update(dt, input, fx) {
      t += dt;
      if (panels[index].glitchy && Math.random() < dt * 2) fx.glitch(0.35);
      if (input.pressed('back')) return true;
      let next = t > STORY.panelTime;
      if (input.anyPressed()) {
        if (shown() < lineLen()) t = lineLen() / STORY.typeSpeed;
        else next = true;
      }
      if (next) {
        index += 1;
        t = 0;
        if (index >= panels.length) return true;
        fx.glitch(panels[index].glitchy ? 1 : 0.5);
      }
      return false;
    },
    draw(g) {
      rect(g, 0, 0, VIEW.width, VIEW.height, COLORS.ink);
      panels[index].draw(g, t);
      const [a, b] = panels[index].lines;
      const n = shown();
      text(g, a.slice(0, n), CX, 146, COLORS.white, 'center');
      if (b) text(g, b.slice(0, Math.max(0, n - a.length)), CX, 160, COLORS.yellow, 'center');
      if (Math.floor(t * 2.5) % 2 === 0) hintRow(g, 296, 165, ['enter']);
    },
  };
}
