// Layered side-scrolling battle backdrops. Each layer is its own SVG so the battle stage can
// parallax-scroll them independently. Themes vary by floor.

export const THEMES = {
  forest: { sky: ['#9fe3ff', '#e8f8ff'], sun: '#fff6c4', far: '#8fcfa8', mid: '#4f9e6a', midDark: '#3d8357', near: '#2f7a4a', ground: '#7bc35a', dirt: '#8a5a3a', accent: '#ffd1e0' },
  dusk: { sky: ['#ff9f7a', '#ffe0b0'], sun: '#fff0c4', far: '#c58aa8', mid: '#7a5a8f', midDark: '#5e4677', near: '#4a3a6a', ground: '#8f7ab8', dirt: '#5a3f60', accent: '#ffd36b' },
  ember: { sky: ['#3b2a6e', '#b45a7a'], sun: '#ffd36b', far: '#6a3f7a', mid: '#4a2f62', midDark: '#3a2452', near: '#2a1a40', ground: '#6a4a8a', dirt: '#3a2448', accent: '#ff9a5a' },
  lair: { sky: ['#140f2e', '#3a2a6e'], sun: '#c9d2ff', far: '#2a2160', mid: '#211a4d', midDark: '#18133a', near: '#120e2c', ground: '#3a2f70', dirt: '#1d1640', accent: '#9f7bff' },
};

export function themeForFloor(floor) {
  if (floor >= 10) return 'lair';
  if (floor >= 7) return 'ember';
  if (floor >= 4) return 'dusk';
  return 'forest';
}

// Repeating tree row (width 400) — rounded chibi canopies
function Trees({ color, dark, base, scale = 1 }) {
  const trees = [20, 85, 150, 220, 290, 350];
  return trees.map((x, i) => {
    const h = (50 + ((i * 37) % 30)) * scale;
    return (
      <g key={i}>
        <rect x={x - 4} y={base - h * 0.45} width="8" height={h * 0.45} rx="3" fill={dark} />
        <ellipse cx={x} cy={base - h * 0.62} rx={h * 0.42} ry={h * 0.4} fill={color} />
        <ellipse cx={x - h * 0.15} cy={base - h * 0.8} rx={h * 0.26} ry={h * 0.24} fill={color} />
        <ellipse cx={x + h * 0.12} cy={base - h * 0.55} rx={h * 0.22} ry={h * 0.2} fill={dark} opacity=".35" />
      </g>
    );
  });
}

export function BgSky({ theme }) {
  const t = THEMES[theme];
  const night = theme === 'lair' || theme === 'ember';
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="bg-layer-svg">
      <defs>
        <linearGradient id={`sky-${theme}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.sky[0]} />
          <stop offset="1" stopColor={t.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#sky-${theme})`} />
      <circle cx="320" cy="50" r={night ? 18 : 26} fill={t.sun} opacity=".9" />
      <circle cx="320" cy="50" r={night ? 30 : 44} fill={t.sun} opacity=".2" />
      {night
        ? [30, 90, 150, 210, 260, 370, 60, 180].map((x, i) => <circle key={i} cx={x} cy={20 + ((i * 29) % 70)} r={1.2 + (i % 2)} fill="#fff" opacity=".8" />)
        : [
            [60, 40],
            [180, 28],
          ].map(([x, y], i) => (
            <g key={i} fill="#fff" opacity=".85">
              <ellipse cx={x} cy={y} rx="26" ry="9" />
              <ellipse cx={x + 14} cy={y - 6} rx="14" ry="9" />
            </g>
          ))}
    </svg>
  );
}

export function BgFar({ theme }) {
  const t = THEMES[theme];
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
      <path d="M0 150 Q40 90 90 120 Q140 70 200 115 Q260 80 310 118 Q360 92 400 130 L400 200 L0 200Z" fill={t.far} />
    </svg>
  );
}

export function BgMid({ theme }) {
  const t = THEMES[theme];
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
      <Trees color={t.mid} dark={t.midDark} base={175} scale={1.15} />
      <rect y="170" width="400" height="30" fill={t.midDark} />
    </svg>
  );
}

export function BgNear({ theme }) {
  const t = THEMES[theme];
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
      {[0, 70, 140, 210, 280, 350].map((x, i) => (
        <g key={i} fill={t.near}>
          <ellipse cx={x + 20} cy="176" rx="34" ry="18" />
          <ellipse cx={x + 44} cy="172" rx="22" ry="16" />
        </g>
      ))}
      {[40, 190, 330].map((x, i) => (
        <g key={`f${i}`}>
          <circle cx={x} cy="170" r="3" fill={t.accent} />
          <circle cx={x + 8} cy="174" r="2.4" fill={t.accent} />
        </g>
      ))}
    </svg>
  );
}

export function BgGround({ theme }) {
  const t = THEMES[theme];
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="bg-layer-svg">
      <rect width="400" height="60" fill={t.dirt} />
      <rect width="400" height="12" fill={t.ground} />
      <path d="M0 12 Q10 18 20 12 Q30 18 40 12 Q50 18 60 12 Q70 18 80 12 Q90 18 100 12 Q110 18 120 12 Q130 18 140 12 Q150 18 160 12 Q170 18 180 12 Q190 18 200 12 Q210 18 220 12 Q230 18 240 12 Q250 18 260 12 Q270 18 280 12 Q290 18 300 12 Q310 18 320 12 Q330 18 340 12 Q350 18 360 12 Q370 18 380 12 Q390 18 400 12" fill={t.ground} />
      {[30, 110, 170, 250, 330, 380].map((x, i) => (
        <ellipse key={i} cx={x} cy={32 + (i % 3) * 8} rx="7" ry="4" fill="#000" opacity=".12" />
      ))}
    </svg>
  );
}
