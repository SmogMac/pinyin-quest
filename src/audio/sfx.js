// Tiny synthesized sound effects (Web Audio API) – no audio files needed.
import { getState } from '../store/store.js';

let ctx = null;
export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function vol() {
  const s = getState().settings;
  return s.muted || s.soundless ? 0 : s.sfxVol;
}

function tone({ freq = 440, to = null, type = 'sine', dur = 0.12, gain = 0.25, delay = 0, attack = 0.005 }) {
  const c = audioCtx();
  const v = vol();
  if (!c || v <= 0) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * v, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.15, gain = 0.2, delay = 0, filter = 1200 }) {
  const c = audioCtx();
  const v = vol();
  if (!c || v <= 0) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.value = gain * v;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

const notes = (list, opts) => list.forEach((f, i) => tone({ freq: f, delay: i * (opts.step || 0.08), ...opts }));

export const sfx = {
  click: () => tone({ freq: 660, type: 'triangle', dur: 0.05, gain: 0.12 }),
  flip: () => tone({ freq: 420, to: 760, type: 'sine', dur: 0.1, gain: 0.12 }),
  correct: () => notes([660, 990], { type: 'triangle', dur: 0.16, gain: 0.2, step: 0.07 }),
  wrong: () => tone({ freq: 260, to: 190, type: 'sine', dur: 0.25, gain: 0.18 }),
  xp: () => tone({ freq: 1200, to: 1700, type: 'sine', dur: 0.08, gain: 0.08 }),
  levelUp: () => notes([523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.22, gain: 0.2, step: 0.09 }),
  reveal: () => notes([880, 1175, 1568], { type: 'sine', dur: 0.18, gain: 0.12, step: 0.05 }),
  pick: () => notes([587, 880], { type: 'square', dur: 0.1, gain: 0.07, step: 0.06 }),
  hit: () => noise({ dur: 0.08, gain: 0.25, filter: 900 }),
  crit: () => {
    noise({ dur: 0.14, gain: 0.35, filter: 2400 });
    tone({ freq: 900, to: 300, type: 'sawtooth', dur: 0.12, gain: 0.06 });
  },
  spell: () => tone({ freq: 300, to: 900, type: 'sawtooth', dur: 0.22, gain: 0.07 }),
  heal: () => notes([784, 988, 1175], { type: 'sine', dur: 0.2, gain: 0.1, step: 0.05 }),
  shield: () => tone({ freq: 500, to: 700, type: 'triangle', dur: 0.25, gain: 0.12 }),
  dodge: () => tone({ freq: 1400, to: 700, type: 'sine', dur: 0.1, gain: 0.08 }),
  die: () => tone({ freq: 400, to: 80, type: 'triangle', dur: 0.4, gain: 0.15 }),
  victory: () => notes([523, 659, 784, 659, 784, 1047], { type: 'triangle', dur: 0.2, gain: 0.18, step: 0.11 }),
  defeat: () => notes([392, 330, 262, 196], { type: 'sine', dur: 0.35, gain: 0.15, step: 0.18 }),
};

export function play(name) {
  try {
    sfx[name]?.();
  } catch {
    /* audio is optional */
  }
}
