// Shared run state: chapter, difficulty, which sectors are repaired, retry counts, best times.
import { CHAPTERS, INTEGRITY_PER_SECTOR, DIFFICULTY_ORDER } from './config.js';

const STORE_KEY = 'system-restore.best';
const DIFF_KEY = 'system-restore.difficulty';

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage blocked: settings and best times simply are not kept
  }
}

const savedDifficulty = readStore(DIFF_KEY, 'normal');

export const state = {
  chapter: 1,
  difficulty: DIFFICULTY_ORDER.includes(savedDifficulty) ? savedDifficulty : 'normal',
  done: {},          // sector or boss id -> true once repaired
  twist: {},         // sector id -> number of failed attempts (drives the retry twist)
  playTime: 0,       // seconds spent inside sectors this run
  bounces: 0,        // how many times the player bounced back after a K.O. this run
  shownIntegrity: 0, // smoothed value fed to the shader so healing animates
  best: readStore(STORE_KEY, {}),
  get ids() { return CHAPTERS[this.chapter - 1].ids; },
  get bossId() { return CHAPTERS[this.chapter - 1].boss; },
  get integrity() { return this.ids.filter((id) => this.done[id]).length * INTEGRITY_PER_SECTOR; },
  get bossReady() { return this.integrity >= 1 && !this.done[this.bossId]; },
};

export function resetRun() {
  state.chapter = 1;
  state.done = {};
  state.twist = {};
  state.playTime = 0;
  state.bounces = 0;
}

export function addBounce() {
  state.bounces += 1;
}

export function nextChapter() {
  state.chapter = Math.min(CHAPTERS.length, state.chapter + 1);
}

export function setDifficulty(name) {
  state.difficulty = name;
  writeStore(DIFF_KEY, name);
}

export function cycleDifficulty() {
  const i = DIFFICULTY_ORDER.indexOf(state.difficulty);
  setDifficulty(DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length]);
}

export function addFail(id) {
  state.twist[id] = (state.twist[id] || 0) + 1;
}

export function markDone(id, seconds) {
  state.done[id] = true;
  if (!state.best[id] || seconds < state.best[id]) state.best[id] = Math.round(seconds * 10) / 10;
  writeStore(STORE_KEY, state.best);
}

export function recordRun(seconds) {
  if (!state.best.run || seconds < state.best.run) state.best.run = Math.round(seconds);
  writeStore(STORE_KEY, state.best);
}
