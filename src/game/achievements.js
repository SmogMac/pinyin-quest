// Achievements and the cosmetic hero robes they unlock.
import { getState, update } from '../store/store.js';
import { masteryOf } from '../learn/srs.js';
import { levelInfo } from '../store/progress.js';
import { HEROES } from './data/heroes.js';

const wordsAtLeast = (s, m) => Object.values(s.words).filter((r) => masteryOf(r) >= m).length;
const seen = (s) => Object.keys(s.words).length;

export const ACHIEVEMENTS = [
  { id: 'first_word', name: 'First Words', desc: 'Learn your first word.', test: (s) => seen(s) >= 1 },
  { id: 'words_25', name: 'Word Collector', desc: 'Meet 25 words.', test: (s) => seen(s) >= 25 },
  { id: 'words_100', name: 'Hundred Hanzi Hoard', desc: 'Meet 100 words.', test: (s) => seen(s) >= 100 },
  { id: 'words_300', name: 'Lexicon Keeper', desc: 'Meet 300 words.', test: (s) => seen(s) >= 300 },
  { id: 'familiar_20', name: 'Getting Familiar', desc: '20 words reach Familiar.', test: (s) => wordsAtLeast(s, 2) >= 20 },
  { id: 'strong_20', name: 'Strong Roots', desc: '20 words reach Strong.', test: (s) => wordsAtLeast(s, 3) >= 20 },
  { id: 'mastered_1', name: 'True Mastery', desc: 'Master a word.', test: (s) => wordsAtLeast(s, 4) >= 1 },
  { id: 'mastered_50', name: 'Sage of Syllables', desc: 'Master 50 words.', test: (s) => wordsAtLeast(s, 4) >= 50 },
  { id: 'listener_50', name: 'Keen Ears', desc: '50 correct listening answers.', test: (s) => s.stats.modes.listen[0] >= 50 },
  { id: 'recall_50', name: 'Silver Tongue', desc: '50 correct recall answers.', test: (s) => s.stats.modes.reverse[0] >= 50 },
  { id: 'streak_3', name: 'Warming Up', desc: '3-day streak.', test: (s) => s.profile.bestStreak >= 3 },
  { id: 'streak_7', name: 'Week of Wonder', desc: '7-day streak.', test: (s) => s.profile.bestStreak >= 7 },
  { id: 'streak_30', name: 'Unstoppable', desc: '30-day streak.', test: (s) => s.profile.bestStreak >= 30 },
  { id: 'perfect', name: 'Flawless', desc: 'Finish a session of 10+ answers with no mistakes.', test: (s) => s.stats.perfectSessions >= 1 },
  { id: 'first_win', name: 'First Victory', desc: 'Win an adventure battle.', test: (s) => s.adventure.kills >= 1 },
  { id: 'floor_5', name: 'Deep Woods', desc: 'Reach floor 5 in an adventure.', test: (s) => s.adventure.bestFloor >= 5 },
  { id: 'synergy', name: 'Combo Caster', desc: 'Activate an upgrade synergy.', test: (s) => Object.keys(s.adventure.synergies).length >= 1 },
  { id: 'synergy_5', name: 'Grand Alchemist', desc: 'Discover 5 different synergies.', test: (s) => Object.keys(s.adventure.synergies).length >= 5 },
  { id: 'boss', name: 'Dragon Slayer', desc: 'Defeat mò lóng, the Ink Dragon.', test: (s) => s.adventure.bosses >= 1 },
  { id: 'level_10', name: 'Seasoned Scholar', desc: 'Reach account level 10.', test: (s) => levelInfo(s.profile.xp).level >= 10 },
  { id: 'hero_mei', name: 'Méi joins you!', desc: 'Unlock Mei, the Silent Blade (level 3).', test: (s) => heroUnlocked('mei', s) },
  { id: 'hero_ruizhe', name: 'Ruì Zhé joins you!', desc: 'Unlock Ruizhe, the Nervous Scholar (level 5).', test: (s) => heroUnlocked('ruizhe', s) },
  { id: 'hero_huohuo', name: 'Huǒ Huǒ joins you!', desc: 'Unlock Huo Huo, the Ember Apprentice (level 8).', test: (s) => heroUnlocked('huohuo', s) },
];

export function heroUnlocked(id, s = getState()) {
  const req = HEROES[id]?.unlock;
  if (!req) return Boolean(HEROES[id]);
  if (req.level) return levelInfo(s.profile.xp).level >= req.level;
  return false;
}

export function selectedHero(s = getState()) {
  const id = s.cosmetics.hero;
  return HEROES[id] && heroUnlocked(id, s) ? id : 'xinyi';
}

/** Palette for vector heroes that support robes (Huo Huo); ignored by image heroes. */
export function heroPalette(s = getState()) {
  return ROBES[s.cosmetics.robe] || ROBES.ember;
}

// Robe colour schemes for Huo Huo, the vector hero (cosmetic only).
export const ROBES = {
  ember: { name: 'Ember Apprentice', robe: '#d9483b', trim: '#ffb347', hat: '#c23a35', dark: '#8f2530', req: null },
  tide: { name: 'Tide Caller', robe: '#2f7fd8', trim: '#8ee3ff', hat: '#2569b8', dark: '#1d4a85', req: { level: 3 } },
  verdant: { name: 'Verdant Druid', robe: '#3c9d5d', trim: '#c7f27a', hat: '#2f8550', dark: '#1f5c38', req: { level: 5 } },
  royal: { name: 'Royal Scholar', robe: '#6b4bd6', trim: '#ffd84a', hat: '#5a3cc0', dark: '#3a2585', req: { achievement: 'streak_7' } },
  moonlit: { name: 'Moonlit Sage', robe: '#3b3f6b', trim: '#c9d2ff', hat: '#2c2f55', dark: '#1b1d38', req: { achievement: 'boss' } },
  sakura: { name: 'Sakura Mystic', robe: '#f08bb4', trim: '#fff1f7', hat: '#e0709d', dark: '#a84a74', req: { achievement: 'mastered_50' } },
  scholar: { name: 'Ink Scholar', robe: '#3a3a3a', trim: '#e8d5a6', hat: '#262626', dark: '#111111', req: { achievement: 'words_100' } },
};

export function robeUnlocked(id, s = getState()) {
  const req = ROBES[id]?.req;
  if (!req) return true;
  if (req.level) return levelInfo(s.profile.xp).level >= req.level;
  if (req.achievement) return Boolean(s.achievements[req.achievement]);
  return false;
}

const toastListeners = new Set();
export function onAchievement(l) {
  toastListeners.add(l);
  return () => toastListeners.delete(l);
}

/** Checks all achievements; newly earned ones are stored and announced. */
export function checkAchievements() {
  const s = getState();
  const fresh = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(s));
  if (!fresh.length) return [];
  update((st) => {
    for (const a of fresh) st.achievements[a.id] = Date.now();
  });
  fresh.forEach((a) => toastListeners.forEach((l) => l(a)));
  return fresh;
}
