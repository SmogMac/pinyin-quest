// Optional gentle procedural background music. Ducks automatically while Mandarin is spoken.
import { getState } from '../store/store.js';
import { audioCtx } from './sfx.js';

let master = null;
let timer = null;
let step = 0;
let ducked = false;

// A calm pentatonic loop (C major pentatonic), 2 bars of 8 eighth-notes
const MELODY = [72, 76, 79, 76, 74, 72, 69, 72, 74, 76, 79, 81, 79, 76, 74, 76];
const BASS = [48, 48, 45, 45, 43, 43, 45, 45];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function level() {
  const s = getState().settings;
  if (s.muted || s.soundless || !s.music) return 0;
  return s.musicVol * (ducked ? 0.25 : 1) * 0.12;
}

function note(c, freq, t, dur, type, g) {
  const o = c.createOscillator();
  const env = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(g, t + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(env).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function tick() {
  const c = audioCtx();
  if (!c || !master) return;
  const t = c.currentTime + 0.05;
  master.gain.setTargetAtTime(level(), c.currentTime, 0.2);
  if (step % 2 === 0 || Math.random() < 0.7) note(c, midi(MELODY[step % MELODY.length]), t, 0.5, 'triangle', 0.5);
  if (step % 2 === 0) note(c, midi(BASS[(step / 2) % BASS.length]), t, 0.9, 'sine', 0.6);
  step++;
}

export function syncMusic() {
  const st = getState().settings;
  const on = level() > 0 || (st.music && !st.muted && !st.soundless);
  if (on && !timer) {
    const c = audioCtx();
    if (!c) return;
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    timer = setInterval(tick, 330);
  } else if (!on && timer) {
    clearInterval(timer);
    timer = null;
    master?.disconnect();
    master = null;
  } else if (master) {
    master.gain.setTargetAtTime(level(), audioCtx().currentTime, 0.1);
  }
}

export function duckMusic(on) {
  ducked = on;
  if (master) master.gain.setTargetAtTime(level(), audioCtx().currentTime, 0.08);
}
