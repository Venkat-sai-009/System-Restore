// Global state machine:
// boot -> story -> level select -> hub -> sector -> win | K.O. -> ... -> collapse -> boss -> story -> chapter 2 -> ending.
import { AREA, COLORS, FLOW, VIEW, WINDOW, KO, DIFFICULTY, COMEBACK, INTEGRITY_HEAL_RATE, HOWTO } from './config.js';
import { state, resetRun, nextChapter, addFail, markDone, recordRun, setDifficulty, cycleDifficulty, addBounce } from './state.js';
import { input } from './utils/input.js';
import { createParticles } from './utils/particles.js';
import { createGlitchRules } from './glitch.js';
import { text, hintRow } from './utils/draw.js';
import { approach } from './utils/math.js';
import { createBoot } from './ui/boot.js';
import { createStory } from './ui/story.js';
import { createDifficultyScreen } from './ui/difficulty.js';
import { createDesktop, cellCenter } from './ui/desktop.js';
import { drawWindow, beginContent, endContent } from './ui/window.js';
import { drawKo, drawRepair, drawBounce, drawIntro, drawHowTo, drawEnding } from './ui/overlays.js';
import * as sfx from './audio/sfx.js';
import { isMuted, setMuted, suspend, resume } from './audio/context.js';
import { startMusic, setLayers } from './audio/music.js';
import platformer from './sectors/platformer.js';
import shooter from './sectors/shooter.js';
import racer from './sectors/racer.js';
import puzzle from './sectors/puzzle.js';
import boss, { boss2 } from './sectors/pacman.js';
import breakout from './sectors/breakout.js';
import snake from './sectors/snake.js';
import whack from './sectors/whack.js';
import popup from './sectors/popup.js';
import spam from './sectors/spam.js';
import recycle from './sectors/recycle.js';
import task from './sectors/task.js';
import download from './sectors/download.js';
import flappy from './sectors/flappy.js';

const SECTORS = { platformer, shooter, racer, puzzle, boss, breakout, snake, whack, popup, spam, recycle, task, download, flappy, boss2 };
const CONFETTI = [COLORS.yellow, COLORS.teal, COLORS.red, COLORS.white, COLORS.blue];
const HINT_AFTER_FAILS = 2;
const HOWTO_DELAY = 0.3; // ignore the key press that opened the folder

export function createGame(renderer) {
  const { g, postfx } = renderer;
  const boot = createBoot();
  const desktop = createDesktop();
  const levelSelect = createDifficultyScreen();
  const particles = createParticles();

  let mode = 'boot';
  let story = null;
  let storyName = '';
  let time = 0;
  let shake = 0;
  let timer = 0;
  let openT = 0;
  let attemptTime = 0;
  let bounceBanner = 0;
  let sector = null;
  let sectorId = '';

  const fx = {
    shake(amount) { shake = Math.max(shake, amount); },
    glitch(amount) { postfx.pulse(amount); },
  };
  const NO_BONUS = { hp: 0, shield: 0, time: 0 };
  const ctx = {
    g, W: AREA.w, H: AREA.h, input, sfx, fx, particles, twist: 0, diff: DIFFICULTY.normal, bonus: NO_BONUS,
    lives: (base) => base + ctx.diff.hearts + ctx.bonus.hp,
  };

  const rules = createGlitchRules({ input, fx, sfx });

  const updateLayers = () => setLayers(1 + state.ids.filter((id) => state.done[id]).length);

  function confetti(x, y, count) {
    for (let i = 0; i < count; i++) particles.burst(x, y, CONFETTI[i % CONFETTI.length], 6, 110, 1.1, 160, 2);
  }

  function startStory(name) {
    storyName = name;
    story = createStory(name);
    mode = 'story';
    fx.glitch(1);
    sfx.glitch();
  }

  function endStory() {
    if (storyName === 'intro') {
      levelSelect.open(state.difficulty);
      mode = 'level';
    } else if (storyName === 'chapter2') {
      nextChapter();
      updateLayers();
      desktop.select(state.ids[0], state);
      fx.glitch(1);
      sfx.collapse();
      mode = 'hub';
    } else {
      mode = 'ending';
      timer = 0;
      sfx.win();
    }
  }

  function initSector() {
    ctx.twist = Math.min(FLOW.maxTwist, state.twist[sectorId] || 0);
    ctx.diff = DIFFICULTY[state.difficulty];
    sector.init(ctx);
    attemptTime = 0;
    rules.start({
      allowed: sector.glitches,
      integrity: state.integrity,
      diff: ctx.diff,
      comeback: ctx.bonus === COMEBACK,
      boss: sectorId.startsWith('boss'),
      gentle: state.chapter === 1 && Object.keys(state.done).length === 0,
    });
  }

  function openSector(id) {
    sectorId = id;
    sector = SECTORS[id];
    ctx.bonus = NO_BONUS;
    particles.clear();
    initSector();
    mode = 'opening';
    openT = 0;
    fx.glitch(0.5);
  }

  function closeSector() {
    rules.stop();
    if (sector) sector.dispose();
    sector = null;
    particles.clear();
    mode = 'hub';
    desktop.select(sectorId, state);
  }

  function retry() {
    sector.dispose();
    ctx.bonus = COMEBACK;
    addBounce();
    initSector();
    sfx.reboot();
    bounceBanner = FLOW.bounceBannerTime;
    mode = 'play';
  }

  function onWin() {
    rules.stop();
    sfx.repair();
    fx.shake(4);
    fx.glitch(1);
    markDone(sectorId, attemptTime);
    updateLayers();
    confetti(AREA.w / 2, AREA.h / 2, 10);
    mode = 'repair';
    timer = FLOW.repairTime;
  }

  function onLose() {
    rules.stop();
    sfx.error();
    sfx.glitch();
    fx.shake(5);
    fx.glitch(1);
    addFail(sectorId);
    mode = 'ko';
    timer = 0;
  }

  function finishRepair() {
    const id = sectorId;
    closeSector();
    if (id === 'boss') {
      startStory('chapter2');
    } else if (id === 'boss2') {
      recordRun(state.playTime);
      startStory('epilogue');
    } else if (state.bossReady) {
      mode = 'collapse';
      timer = FLOW.collapseTime;
      sfx.collapse();
    } else {
      const c = cellCenter(id, state);
      confetti(c.x, c.y, 6);
    }
  }

  function updateEnding(dt) {
    timer += dt;
    if (Math.floor(timer * 6) !== Math.floor((timer - dt) * 6) && timer < 4) confetti(20 + Math.random() * 280, 20, 1);
    if (timer > 0.8 && input.pressed('confirm')) {
      resetRun();
      updateLayers();
      desktop.select(state.ids[0], state);
      levelSelect.open(state.difficulty);
      fx.glitch(1);
      sfx.reboot();
      particles.clear();
      mode = 'level';
    }
  }

  function updatePlay(dt) {
    attemptTime += dt;
    state.playTime += dt;
    if (input.pressed('back')) {
      closeSector();
      return;
    }
    const gs = rules.update(dt);
    const result = sector.update(dt * gs.timeScale);
    if (result === 'win') onWin();
    else if (result === 'lose') onLose();
  }

  function update(dt) {
    time += dt;
    state.shownIntegrity = approach(state.shownIntegrity, state.integrity, INTEGRITY_HEAL_RATE * dt);
    shake = Math.max(0, shake - FLOW.shakeDecay * dt);
    bounceBanner = Math.max(0, bounceBanner - dt);
    particles.update(dt);
    if (input.pressed('mute')) setMuted(!isMuted());
    if (input.pressed('tab') && (mode === 'hub' || mode === 'ko')) {
      cycleDifficulty();
      sfx.blip();
    }

    switch (mode) {
      case 'boot':
        if (Math.random() < dt * 1.3) fx.glitch(0.5);
        if (boot.update(dt, input)) {
          startMusic();
          updateLayers();
          startStory('intro');
        }
        break;
      case 'story':
        if (story.update(dt, input, fx)) endStory();
        break;
      case 'level': {
        const choice = levelSelect.update(dt, input, sfx);
        if (choice) {
          setDifficulty(choice);
          sfx.repair();
          mode = 'hub';
        }
        break;
      }
      case 'hub': {
        const id = desktop.update(dt, input, state, sfx);
        if (id) openSector(id);
        break;
      }
      case 'opening':
        openT += dt;
        if (openT >= WINDOW.openTime) {
          mode = HOWTO[sectorId] ? 'howto' : 'play';
          timer = 0;
        }
        break;
      case 'howto':
        timer += dt;
        if (input.pressed('back')) closeSector();
        else if (timer > HOWTO_DELAY && (input.pressed('confirm') || input.pointer.clicked)) mode = 'play';
        break;
      case 'play':
        updatePlay(dt);
        break;
      case 'ko':
        timer += dt;
        if (timer > KO.inputDelay) {
          if (input.pressed('confirm') || input.pointer.clicked) retry();
          else if (input.pressed('back')) closeSector();
        }
        break;
      case 'repair':
        timer -= dt;
        if (timer <= 0) finishRepair();
        break;
      case 'collapse':
        timer -= dt;
        if (Math.random() < dt * 8) fx.glitch(0.5);
        fx.shake(1 + (1 - timer / FLOW.collapseTime) * 3);
        if (timer <= 0) openSector(state.bossId);
        break;
      case 'ending':
        updateEnding(dt);
        break;
      default:
        break;
    }
  }

  function drawOverlay() {
    if (mode === 'play' && attemptTime < FLOW.hintTime && sector.hints) {
      const at = sector.hintAt || { x: AREA.w / 2, y: AREA.h - 14 };
      hintRow(g, at.x, at.y, sector.hints);
    }
    if (mode === 'repair') drawRepair(g, sectorId === state.bossId);
    if (mode === 'play' && bounceBanner > 0) drawBounce(g, bounceBanner);
    else if (mode === 'play' && attemptTime < FLOW.introTime && sector.intro) drawIntro(g, sector.intro);
  }

  function drawSector() {
    desktop.draw(g, state, time);
    drawWindow(g, sector.title, 1);
    beginContent(g);
    g.save();
    if (rules.state.mirror) {
      g.translate(AREA.w, 0);
      g.scale(-1, 1);
    }
    if (rules.state.upside) {
      g.translate(0, AREA.h);
      g.scale(1, -1);
    }
    sector.render();
    particles.draw(g);
    g.restore();
    drawOverlay();
    rules.draw(g, AREA.w, AREA.h, time);
    endContent(g);
  }

  function render() {
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
    const sy = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
    g.save();
    g.translate(sx, sy);
    switch (mode) {
      case 'boot': boot.draw(g); break;
      case 'story': story.draw(g); break;
      case 'level': levelSelect.draw(g); break;
      case 'hub':
        desktop.draw(g, state, time);
        particles.draw(g);
        break;
      case 'collapse': desktop.draw(g, state, time, 1 - timer / FLOW.collapseTime); break;
      case 'opening':
        desktop.draw(g, state, time);
        drawWindow(g, sector.title, openT / WINDOW.openTime);
        break;
      case 'ending':
        desktop.draw(g, state, time);
        drawEnding(g, state, time);
        particles.draw(g);
        break;
      case 'ko':
        drawSector();
        drawKo(g, timer, state.difficulty, (state.twist[sectorId] || 0) >= HINT_AFTER_FAILS && state.difficulty !== 'easy');
        break;
      case 'howto':
        drawSector();
        drawHowTo(g, sector.title, HOWTO[sectorId], timer);
        break;
      default: drawSector(); break;
    }
    g.restore();
    if (isMuted()) text(g, 'MUTE', VIEW.width - 2, 1, COLORS.red, 'right');
  }

  return {
    update,
    render,
    pause() { suspend(); },
    resume() { resume(); },
  };
}
