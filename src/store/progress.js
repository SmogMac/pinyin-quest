// XP, levels, daily goal, streaks and per-word answer bookkeeping.
import { update, getState } from './store.js';
import { review, newCard, masteryOf, isDue, SKILLS } from '../learn/srs.js';
import { checkAchievements } from '../game/achievements.js';

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86_400_000);

// Level L needs 50*L*(L-1) total XP: 100, 300, 600, 1000…
export const xpForLevel = (L) => 50 * L * (L - 1);
export function levelInfo(xp) {
  let L = 1;
  while (xp >= xpForLevel(L + 1)) L++;
  const lo = xpForLevel(L);
  const hi = xpForLevel(L + 1);
  return { level: L, into: xp - lo, need: hi - lo, pct: (xp - lo) / (hi - lo) };
}

export function todayXp(s = getState()) {
  return s.profile.daily[dayKey()] || 0;
}

/** Streak: any study on a day keeps it. Each 7-day block earns a shield (max 2) that covers one missed day. */
function touchStreak(p) {
  const today = dayKey();
  if (p.lastDay === today) return;
  if (!p.lastDay) p.streak = 1;
  else {
    const gap = daysBetween(p.lastDay, today);
    if (gap === 1) p.streak += 1;
    else if (gap === 2 && p.shields > 0) {
      p.shields -= 1;
      p.streak += 1;
    } else p.streak = 1;
  }
  if (p.streak > 0 && p.streak % 7 === 0) p.shields = Math.min(2, p.shields + 1);
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  p.lastDay = today;
}

/** Adds XP; returns {gained, levelUp: newLevel|null}. */
export function addXp(amount) {
  let result = { gained: amount, levelUp: null };
  update((s) => {
    const before = levelInfo(s.profile.xp).level;
    s.profile.xp += amount;
    const k = dayKey();
    s.profile.daily[k] = (s.profile.daily[k] || 0) + amount;
    touchStreak(s.profile);
    const after = levelInfo(s.profile.xp).level;
    if (after > before) result.levelUp = after;
  });
  return result;
}

export function wordRecord(s, id) {
  return s.words[id];
}

export function ensureRecord(s, id) {
  if (!s.words[id]) {
    s.words[id] = { skills: {}, first: Date.now(), hist: [], ok: 0, bad: 0 };
    const k = dayKey();
    s.profile.newWords[k] = (s.profile.newWords[k] || 0) + 1;
  }
  return s.words[id];
}

export function newWordsToday(s = getState()) {
  return s.profile.newWords[dayKey()] || 0;
}

const MODE_SKILL = { flash: 'rec', mc: 'rec', listen: 'lis', reverse: 'rev', speak: 'spk' };

/**
 * Record an answer. grade 1-4. Returns { masteryBefore, masteryAfter }.
 * Wrong answers (grade 1) lapse the card so the word comes back sooner.
 */
export function recordAnswer(id, mode, grade) {
  let out;
  update((s) => {
    const r = ensureRecord(s, id);
    const skill = MODE_SKILL[mode];
    const before = masteryOf(r);
    r.skills[skill] = review(r.skills[skill] || newCard(), grade);
    // Learning listening/recall alongside recognition: unlock them once recognition passes.
    const ok = grade >= 2;
    r.hist = [...r.hist.slice(-11), ok ? 1 : 0];
    if (ok) r.ok += 1;
    else r.bad += 1;
    const m = s.stats.modes[mode];
    if (m) m[ok ? 0 : 1] += 1;
    out = { masteryBefore: before, masteryAfter: masteryOf(r) };
  });
  checkAchievements();
  return out;
}

/** Marks a new word as introduced (seen on a teaching card) without grading it. */
export function introduceWord(id) {
  update((s) => {
    const r = ensureRecord(s, id);
    if (!r.skills.rec) r.skills.rec = { ...newCard(), state: 'learning', due: Date.now() };
  });
}

export function dueCount(s = getState(), now = Date.now()) {
  let n = 0;
  for (const r of Object.values(s.words)) if (SKILLS.some((k) => isDue(r.skills[k], now))) n++;
  return n;
}

export function masteryCounts(s = getState()) {
  const counts = [0, 0, 0, 0, 0];
  for (const r of Object.values(s.words)) counts[masteryOf(r)]++;
  return counts;
}
