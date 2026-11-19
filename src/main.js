import './style.css';
import { createRenderer } from './render/renderer.js';
import { createGame } from './game.js';
import { input } from './utils/input.js';
import { unlock } from './audio/context.js';
import { DT_MAX, font } from './config.js';
import { state } from './state.js';

const renderer = createRenderer(document.getElementById('app'));
input.attach(renderer.canvas, renderer.toGame);
input.onGesture(unlock); // audio can only start inside a real user gesture

const game = createGame(renderer);
let last = performance.now();
let raf = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, DT_MAX);
  last = now;
  game.update(dt);
  game.render();
  renderer.present(dt, state.shownIntegrity);
  input.endFrame();
  raf = requestAnimationFrame(frame);
}

function start() {
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

// Stop the loop and the audio while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    game.pause();
  } else {
    game.resume();
    start();
  }
});

// Wait briefly for the bitmap font so the first frame already uses it; never block on failure.
Promise.race([
  document.fonts.load(font(8)),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]).catch(() => {}).then(start);
