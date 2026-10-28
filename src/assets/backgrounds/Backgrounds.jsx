// Layered side-scrolling battle backdrops. Each layer is its own SVG so the battle stage can
// parallax-scroll them independently. Themes vary by floor.

export const THEMES = {
  forest: { sky: ['#9fe3ff', '#e8f8ff'], sun: '#fff6c4', far: '#8fcfa8', mid: '#4f9e6a', midDark: '#3d8357', near: '#2f7a4a', ground: '#7bc35a', dirt: '#8a5a3a', accent: '#ffd1e0' },
  dusk: { sky: ['#ff9f7a', '#ffe0b0'], sun: '#fff0c4', far: '#c58aa8', mid: '#7a5a8f', midDark: '#5e4677', near: '#4a3a6a', ground: '#8f7ab8', dirt: '#5a3f60', accent: '#ffd36b' },
  ember: { sky: ['#3b2a6e', '#b45a7a'], sun: '#ffd36b', far: '#6a3f7a', mid: '#4a2f62', midDark: '#3a2452', near: '#2a1a40', ground: '#6a4a8a', dirt: '#3a2448', accent: '#ff9a5a' },
  lair: { sky: ['#140f2e', '#3a2a6e'], sun: '#c9d2ff', far: '#2a2160', mid: '#211a4d', midDark: '#18133a', near: '#120e2c', ground: '#3a2f70', dirt: '#1d1640', accent: '#9f7bff' },
  // Ink-wash biome palettes (landscape-scroll look: paper sky, layered grey-blue mountains)
  bamboo: { sky: ['#e9e4d2', '#f6f1e3'], sun: '#e8604a', far: '#b9c2b4', mid: '#7e9a7a', midDark: '#56735a', near: '#3f6b4a', ground: '#8fae7a', dirt: '#6f6a52', accent: '#e8604a', ink: true, decor: 'bamboo' },
  coast: { sky: ['#dfe8ea', '#f3f1e6'], sun: '#e8604a', far: '#a9bcc4', mid: '#7f9aa6', midDark: '#5f7d8a', near: '#4f7383', ground: '#d8c9a2', dirt: '#a8946a', accent: '#3f8cff', ink: true, decor: 'waves' },
  caves: { sky: ['#3a3430', '#5a5048'], sun: '#c8955a', far: '#6a5e54', mid: '#4f453e', midDark: '#3a322c', near: '#2e2722', ground: '#7a6a58', dirt: '#4a3e32', accent: '#ffcf6a', ink: true, decor: 'stalactites' },
  frozen: { sky: ['#dfe9f2', '#f6f8fb'], sun: '#ffffff', far: '#c4d2e0', mid: '#9fb4c8', midDark: '#7f98b0', near: '#e8f0f8', ground: '#f4f8fc', dirt: '#b8c8d8', accent: '#7fe3ff', ink: true, decor: 'snowpeaks' },
  thunder: { sky: ['#4a4e62', '#7a7e90'], sun: '#ffe14a', far: '#5f6478', mid: '#4a4f62', midDark: '#3a3e50', near: '#2f3344', ground: '#6a7a5a', dirt: '#4a4a3e', accent: '#ffe14a', ink: true, decor: 'storm' },
  marsh: { sky: ['#4a4458', '#6e6680'], sun: '#c9b8ff', far: '#5a5268', mid: '#463f55', midDark: '#363044', near: '#2a2536', ground: '#4f5a48', dirt: '#2f3328', accent: '#9b6bff', ink: true, decor: 'reeds' },
  temple: { sky: ['#f3e3c6', '#fbf2e0'], sun: '#e8604a', far: '#d8c2a0', mid: '#b89a72', midDark: '#8f7252', near: '#7a3f2e', ground: '#c8a87a', dirt: '#8a6a48', accent: '#e5484d', ink: true, decor: 'lanterns' },
  inklair: { sky: ['#1a1428', '#3a2f52'], sun: '#c9d2ff', far: '#2a2240', mid: '#211a36', midDark: '#18132a', near: '#120e20', ground: '#2f2848', dirt: '#16121f', accent: '#9f7bff', ink: true, decor: 'void' },
  beyond: { sky: ['#e9e4d2', '#ffffff'], sun: '#111111', far: '#c8c4b8', mid: '#9a968c', midDark: '#6a665e', near: '#3a3732', ground: '#d8d2c2', dirt: '#8a8478', accent: '#111111', ink: true, decor: 'void' },
};

/** Theme-specific foreground details (bamboo stalks, waves, lanterns …). */
export function BgDecor({ theme }) {
  const t = THEMES[theme];
  if (!t?.decor) return null;
  const ink = '#2a2622';
  let body = null;
  if (t.decor === 'bamboo') {
    body = [18, 46, 300, 335, 372].map((x, i) => (
      <g key={i} opacity={0.75 - (i % 2) * 0.2}>
        <rect x={x} y="0" width="7" height="200" fill="#5f8f5a" />
        {[30, 70, 110, 150].map((y) => (
          <rect key={y} x={x - 1} y={y + i * 6} width="9" height="3" fill={ink} opacity=".5" />
        ))}
        <path d={`M${x + 7} ${40 + i * 10} q14 -6 24 -2 q-12 6 -24 2`} fill="#4f7d4a" />
        <path d={`M${x} ${90 + i * 8} q-14 -6 -22 0 q10 4 22 0`} fill="#4f7d4a" />
      </g>
    ));
  } else if (t.decor === 'waves') {
    body = [150, 160, 170].map((y, i) => (
      <path key={i} d={`M0 ${y} q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`} stroke="#3f6f90" strokeWidth="3" fill="none" opacity={0.6 - i * 0.15} />
    ));
  } else if (t.decor === 'stalactites') {
    body = [10, 60, 110, 170, 230, 290, 350].map((x, i) => <path key={i} d={`M${x} 0 l12 ${30 + (i % 3) * 18} l12 ${-(30 + (i % 3) * 18)}z`} fill="#2e2722" />);
  } else if (t.decor === 'snowpeaks') {
    body = [30, 90, 150, 210, 270, 330, 380].map((x, i) => <circle key={i} className="snowflake" cx={x} cy={20 + ((i * 37) % 80)} r="2" fill="#fff" opacity=".9" />);
  } else if (t.decor === 'storm') {
    body = (
      <>
        <g fill="#3a3e50" opacity=".8">
          <ellipse cx="80" cy="30" rx="70" ry="22" />
          <ellipse cx="260" cy="24" rx="90" ry="24" />
        </g>
        <path className="storm-bolt" d="M240 40 l-14 30 h10 l-12 30" stroke="#ffe14a" strokeWidth="3" fill="none" />
      </>
    );
  } else if (t.decor === 'reeds') {
    body = (
      <>
        {[20, 34, 360, 375, 388].map((x, i) => (
          <path key={i} d={`M${x} 200 q${4 - i * 2} -60 ${-6 + i} -110`} stroke={ink} strokeWidth="2.5" fill="none" opacity=".7" />
        ))}
        <ellipse cx="200" cy="185" rx="120" ry="10" fill="#6b3fb0" opacity=".25" />
      </>
    );
  } else if (t.decor === 'lanterns') {
    body = (
      <>
        <path d="M0 18 Q200 40 400 18" stroke={ink} strokeWidth="1.5" fill="none" />
        {[60, 140, 260, 340].map((x, i) => (
          <g key={i}>
            <ellipse cx={x} cy={30 + (i % 2) * 4} rx="9" ry="11" fill="#e5484d" />
            <ellipse cx={x} cy={30 + (i % 2) * 4} rx="16" ry="18" fill="#ffcf6a" opacity=".25" />
          </g>
        ))}
      </>
    );
  } else if (t.decor === 'void') {
    body = [40, 130, 220, 320].map((x, i) => <path key={i} d={`M${x} ${30 + i * 12} q20 -8 40 0`} stroke={t.accent} strokeWidth="2" fill="none" opacity=".35" />);
  }
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
      {body}
    </svg>
  );
}

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
  const night = ['lair', 'ember', 'inklair', 'caves', 'marsh', 'thunder'].includes(theme);
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
  if (t.ink) {
    // ink-wash mountains fading into mist
    return (
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
        <defs>
          <linearGradient id={`mist-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.mid} />
            <stop offset="1" stopColor={t.sky[1]} stopOpacity=".2" />
          </linearGradient>
        </defs>
        <path d="M0 170 L40 90 Q55 70 70 95 L100 60 Q118 40 136 70 L170 120 L200 80 Q220 50 240 85 L280 130 L320 70 Q340 45 360 80 L400 120 L400 200 L0 200Z" fill={`url(#mist-${theme})`} />
        <path d="M100 60 Q118 40 136 70 M320 70 Q340 45 360 80" stroke="#2a2622" strokeWidth="1.5" fill="none" opacity=".35" />
      </svg>
    );
  }
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
