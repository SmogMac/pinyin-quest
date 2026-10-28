// Single persisted game/learning state, saved to localStorage.
// Components subscribe with useStore(); mutations go through update(fn).
import { useSyncExternalStore } from 'react';

const KEY = 'pinyin-quest-save-v1';
export const SAVE_VERSION = 1;

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    createdAt: Date.now(),
    profile: { xp: 0, streak: 0, bestStreak: 0, lastDay: null, shields: 0, daily: {}, newWords: {} },
    words: {},
    stats: {
      modes: { flash: [0, 0], mc: [0, 0], listen: [0, 0], reverse: [0, 0], speak: [0, 0] },
      sessions: 0,
      perfectSessions: 0,
      studyMs: 0,
    },
    achievements: {},
    cosmetics: { robe: 'ember', hero: 'xinyi' },
    settings: {
      hideHanzi: false,
      autoplay: true,
      autoContinue: false,
      speechVol: 1,
      sfxVol: 0.6,
      musicVol: 0.35,
      music: false,
      muted: false,
      reducedMotion: prefersReducedMotion(),
      dailyGoal: 100,
      newPerDay: 15,
      voiceURI: null,
      rate: 0.85,
      speaking: false,
      sessionMinutes: 5,
      battleSpeed: 1,
    },
    adventure: { runs: 0, wins: 0, bestFloor: 0, bestScore: 0, bosses: 0, kills: 0, synergies: {}, current: null },
  };
}

// Merge a loaded/imported save over defaults so new fields appear after updates.
function hydrate(data) {
  const base = defaultSave();
  if (!data || typeof data !== 'object') return base;
  const out = { ...base, ...data };
  for (const k of ['profile', 'stats', 'settings', 'adventure', 'cosmetics']) out[k] = { ...base[k], ...(data[k] || {}) };
  out.stats.modes = { ...base.stats.modes, ...(data.stats?.modes || {}) };
  out.words = data.words || {};
  out.achievements = data.achievements || {};
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return hydrate(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultSave();
  }
}

let state = load();
let version = 0;
let saveTimer = null;
let storageOk = true;
const listeners = new Set();

function persistNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistNow);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && persistNow());
}

export function getState() {
  return state;
}

/** Mutate state in place inside fn, then notify and schedule a save. */
export function update(fn) {
  fn(state);
  version += 1;
  listeners.forEach((l) => l());
  if (!saveTimer) saveTimer = setTimeout(persistNow, 300);
}

export const flush = persistNow;
export const isStorageOk = () => storageOk;

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders the component whenever the save changes. */
export function useStore() {
  useSyncExternalStore(subscribe, () => version);
  return state;
}

export function exportSave() {
  persistNow();
  const blob = new Blob([JSON.stringify({ app: 'pinyin-quest', exportedAt: new Date().toISOString(), save: state }, null, 1)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pinyin-quest-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Returns an error message, or null on success. */
export function importSave(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'That file is not valid JSON.';
  }
  const data = parsed?.save ?? parsed;
  if (!data || typeof data !== 'object' || typeof data.words !== 'object' || !data.profile) {
    return 'That file does not look like a Pinyin Quest save.';
  }
  state = hydrate(data);
  update(() => {});
  persistNow();
  return null;
}

export function resetSave() {
  state = defaultSave();
  update(() => {});
  persistNow();
}
