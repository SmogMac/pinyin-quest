// Forgiving shape recognition for the drawing puzzle (circle, square, triangle, star).
// Works on raw touch/mouse points; tolerant of wobbly lines and partially closed shapes.

function rdp(points, eps) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let maxD = 0;
  let idx = 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [a, b];
}

function angleAt(p0, p1, p2) {
  const a = Math.atan2(p0.y - p1.y, p0.x - p1.x);
  const b = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
}

export function analyzeShape(points) {
  if (!points || points.length < 8) return { ok: false };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const size = Math.max(w, h);
  if (size < 30) return { ok: false };
  const start = points[0];
  const end = points[points.length - 1];
  const closed = Math.hypot(start.x - end.x, start.y - end.y) < size * 0.38;
  const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const cy = ys.reduce((s, v) => s + v, 0) / ys.length;
  const radii = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const mean = radii.reduce((s, v) => s + v, 0) / radii.length;
  const cv = Math.sqrt(radii.reduce((s, v) => s + (v - mean) ** 2, 0) / radii.length) / (mean || 1);
  const eps = Math.hypot(w, h) * 0.07;
  let simp;
  if (closed) {
    // RDP needs distinct endpoints: split the loop at the point farthest from the start
    const pts = [...points, points[0]];
    let far = 0;
    let farD = 0;
    pts.forEach((p, i) => {
      const d = Math.hypot(p.x - start.x, p.y - start.y);
      if (d > farD) {
        farD = d;
        far = i;
      }
    });
    simp = [...rdp(pts.slice(0, far + 1), eps).slice(0, -1), ...rdp(pts.slice(far), eps)];
  } else simp = rdp(points, eps);
  // corners: vertices of the simplified polygon with a real turn
  let corners = 0;
  let sharp = 0;
  const ring = closed ? simp.slice(0, -1) : simp;
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[(i - 1 + ring.length) % ring.length];
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    if (!closed && (i === 0 || i === ring.length - 1)) continue;
    const ang = angleAt(p0, p1, p2);
    if (ang < 150) corners++;
    if (ang < 75) sharp++;
  }
  const aspect = w / (h || 1);
  const scores = {
    circle: closed ? Math.max(0, 1 - cv / 0.28) * (corners >= 5 || cv < 0.12 ? 1 : 0.6) : 0,
    triangle: closed ? (corners === 3 ? 1 : corners === 4 && sharp >= 2 ? 0.6 : 0) : 0,
    square: closed ? (corners === 4 && aspect > 0.45 && aspect < 2.2 ? 1 : corners === 5 ? 0.5 : 0) : 0,
    // stars (outline or pentagram) have 4-5 very sharp points; squares and circles have none
    star: sharp >= 4 ? 1.2 : sharp === 3 && corners >= 5 ? 0.6 : 0,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { ok: true, closed, cv, corners, sharp, scores, best: best[1] > 0.3 ? best[0] : null };
}

/** Forgiving check: the drawn shape counts if the target is the best match or scores well. */
export function matchesShape(points, target) {
  const a = analyzeShape(points);
  if (!a.ok) return { match: false, analysis: a };
  const top = Math.max(...Object.values(a.scores));
  return { match: a.best === target || (a.scores[target] >= 0.55 && a.scores[target] >= top * 0.85), analysis: a };
}

// Shape words used by the drawing puzzle. They are taught (English hint) until answered well.
export const SHAPE_WORDS = [
  { zh: '圆形', py: 'yuán xíng', en: 'circle', shape: 'circle' },
  { zh: '方形', py: 'fāng xíng', en: 'square', shape: 'square' },
  { zh: '三角形', py: 'sān jiǎo xíng', en: 'triangle', shape: 'triangle' },
  { zh: '星形', py: 'xīng xíng', en: 'star', shape: 'star' },
];
