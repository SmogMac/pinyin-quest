// Chooses the words asked during an adventure. Reviews come first; brand-new words are only
// asked right after a teaching card, so the game never quizzes vocabulary you haven't seen.
import { dueWords, nextNewWord, pickSkill, modeForSkill } from './session.js';
import { newWordsToday } from '../store/progress.js';
import { RUN } from '../game/data/balance.js';
import { masteryOf } from './srs.js';

export function pickAdventureTasks(save, count, { listeningFocus = false, rng = Math.random } = {}) {
  const now = Date.now();
  const allowSpk = Boolean(save.settings.speaking) && !save.settings.soundless;
  const soundless = Boolean(save.settings.soundless);
  if (soundless) listeningFocus = false;
  const tasks = [];
  const used = new Set();
  const learnedIds = Object.keys(save.words);

  // New learners need new words; experienced learners mostly review.
  let newBudget = learnedIds.length < 12 ? RUN.maxNewWordsPerQuiz : learnedIds.length < 60 ? 1 : 0;
  if (newWordsToday(save) >= save.settings.newPerDay + 10) newBudget = 0;

  const due = dueWords(save, now, allowSpk);
  // Fill with due words, then weakest learned words, introducing new words along the way.
  const learned = learnedIds
    .map((id) => ({ id, m: masteryOf(save.words[id]), r: rng() }))
    .sort((a, b) => a.m - b.m || a.r - b.r);

  const quizFor = (id) => {
    const rec = save.words[id];
    let skill = rec ? pickSkill(rec, now, allowSpk, { soundless }) || 'rec' : 'rec';
    if (listeningFocus && rec?.skills.rec?.ok >= 1) skill = 'lis';
    let mode = modeForSkill(skill, rng, soundless);
    if (mode === 'flash' || mode === 'speak') mode = 'mc'; // keep battles snappy and objective
    return { id, kind: 'quiz', mode };
  };

  while (tasks.filter((t) => t.kind === 'quiz').length < count) {
    const wantNew = newBudget > 0 && (tasks.length % 2 === 0 || (!due.length && !learned.length));
    if (wantNew) {
      const w = nextNewWord(save, used);
      if (w) {
        used.add(w.id);
        newBudget--;
        tasks.push({ id: w.id, kind: 'intro', mode: 'intro' });
        tasks.push({ id: w.id, kind: 'quiz', mode: 'mc' });
        continue;
      }
    }
    const d = due.find((x) => !used.has(x.id));
    if (d) {
      used.add(d.id);
      tasks.push(quizFor(d.id));
      continue;
    }
    const l = learned.find((x) => !used.has(x.id));
    if (l) {
      used.add(l.id);
      tasks.push(quizFor(l.id));
      continue;
    }
    const w = nextNewWord(save, used);
    if (!w) break;
    used.add(w.id);
    tasks.push({ id: w.id, kind: 'intro', mode: 'intro' });
    tasks.push({ id: w.id, kind: 'quiz', mode: 'mc' });
  }
  return tasks;
}
