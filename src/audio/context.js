// Shared Web Audio context, master gain, mute and tiny synth primitives.
import { AUDIO } from '../config.js';

let ac = null;
let master = null;
let muted = false;
let noiseBuffer = null;

// Must be called from a real user gesture. Safe to call repeatedly.
export function unlock() {
  try {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = 0; // start silent, fade in so nothing blasts
    master.connect(ac.destination);
    master.gain.setTargetAtTime(muted ? 0 : AUDIO.master, ac.currentTime, AUDIO.fadeIn / 3);
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {
    ac = null;
  }
}

export const getCtx = () => ac;
export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  if (ac && master) master.gain.setTargetAtTime(muted ? 0 : AUDIO.master, ac.currentTime, 0.02);
}

export function suspend() {
  if (ac && ac.state === 'running') ac.suspend();
}

export function resume() {
  if (ac && ac.state === 'suspended') ac.resume();
}

// One oscillator note. `to` slides the pitch, `delay` offsets in seconds, `at` is an absolute time.
export function tone(freq, dur, type = 'square', vol = 0.3, to = 0, delay = 0, at = 0) {
  if (!ac) return;
  const t = (at || ac.currentTime) + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

// Burst of white noise. `cutoff` is a low-pass frequency (lower = duller).
export function noise(dur, vol = 0.3, cutoff = 6000, delay = 0, at = 0) {
  if (!ac) return;
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = (at || ac.currentTime) + delay;
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer = noiseBuffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
  src.stop(t + dur + 0.03);
}
