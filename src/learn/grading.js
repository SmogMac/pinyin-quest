// Turns an objective answer into an SRS grade and an XP reward.
// XP is designed not to reward rushing or drilling the same card over and over.

export const XP = {
  intro: 5,
  flash: 8,
  mc: 10,
  listen: 12,
  reverse: 14,
  speak: 15,
  rushedMs: 700, // answers faster than this earn almost nothing
  slowMs: 12_000, // slower correct answers count as "Hard"
};

export function gradeFor(correct, ms) {
  if (!correct) return 1;
  return ms > XP.slowMs ? 2 : 3;
}

/** repeat: how many times this word was already answered this session. */
export function xpFor(mode, correct, ms, repeat = 0) {
  if (!correct) return 0;
  let xp = XP[mode] ?? 10;
  if (ms < XP.rushedMs) xp = 1;
  if (repeat > 0) xp = Math.ceil(xp / (repeat + 1));
  return xp;
}

/** Flashcard self-grades: Again earns nothing, harder honest recall earns a little more. */
export function xpForFlash(grade, repeat = 0) {
  const base = [0, 0, 9, 8, 7][grade];
  return repeat > 0 ? Math.ceil(base / (repeat + 1)) : base;
}
