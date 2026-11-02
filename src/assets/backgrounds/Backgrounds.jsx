// Layered side-scrolling battle backdrops. Each layer is its own SVG so the battle stage can
// parallax-scroll them independently. Themes vary by floor.
// Every shape is fully opaque: depth comes from colour (mixed toward the sky), never from
// see-through layers, so overlapping parallax layers never show through each other.

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
  volcano: { sky: ['#5a2a22', '#c0603a'], sun: '#ffcf6a', far: '#7a3a2e', mid: '#5a2a24', midDark: '#44201c', near: '#2e1614', ground: '#4a2e26', dirt: '#2a1814', accent: '#ff7a3a', ink: true, decor: 'embers' },
  inklair: { sky: ['#1a1428', '#3a2f52'], sun: '#c9d2ff', far: '#2a2240', mid: '#211a36', midDark: '#18132a', near: '#120e20', ground: '#2f2848', dirt: '#16121f', accent: '#9f7bff', ink: true, decor: 'void' },
  beyond: { sky: ['#e9e4d2', '#ffffff'], sun: '#111111', far: '#c8c4b8', mid: '#9a968c', midDark: '#6a665e', near: '#3a3732', ground: '#d8d2c2', dirt: '#8a8478', accent: '#111111', ink: true, decor: 'scrolls' },
};

/** Mix two #rrggbb colours (t = 0 → a, 1 → b). Used instead of transparency. */
export function mix(a, b, t) {
  const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Theme-specific foreground details (bamboo stalks, waves, lanterns …). */
export function BgDecor({ theme, scenery = true }) {
  const t = THEMES[theme];
  if (!t?.decor) return null;
  const ink = '#2a2622';
  let body = null;
  if (t.decor === 'bamboo') {
    // two depths of stalks: the back ones paler (mixed toward the sky), all solid
    body = [18, 46, 300, 335, 372].map((x, i) => {
      const back = i % 2 === 1;
      const stalk = back ? '#93b384' : '#5f8f5a';
      const node = back ? '#76976a' : '#3f6b3a';
      const leaf = back ? '#86a878' : '#4f7d4a';
      return (
        <g key={i}>
          <rect x={x} y="-4" width="7" height="210" rx="3.5" fill={stalk} />
          <rect x={x + 1.5} y="-4" width="1.6" height="210" fill={back ? '#a9c49a' : '#7aa86f'} />
          {[30, 70, 110, 150].map((y) => (
            <rect key={y} x={x - 1} y={y + i * 6} width="9" height="3" rx="1.5" fill={node} />
          ))}
          <path d={`M${x + 7} ${40 + i * 10} q12 -9 25 -4 q-10 8 -25 4`} fill={leaf} />
          <path d={`M${x + 7} ${46 + i * 10} q10 2 19 9 q-12 1 -19 -9`} fill={leaf} />
          <path d={`M${x} ${90 + i * 8} q-13 -8 -24 -2 q11 6 24 2`} fill={leaf} />
        </g>
      );
    });
  } else if (t.decor === 'waves') {
    body = ['#3f6f90', '#6a93ab', '#9ab8c6'].map((c, i) => (
      <path key={i} d={`M0 ${150 + i * 10} q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`} stroke={c} strokeWidth="3" strokeLinecap="round" fill="none" />
    ));
  } else if (t.decor === 'stalactites') {
    // rounded rock drips (no sharp spikes), each with a lit edge
    body = [10, 60, 110, 170, 230, 290, 350].map((x, i) => {
      const h = 26 + ((i * 7) % 3) * 14;
      const w = 18 + (i % 2) * 6;
      return (
        <g key={i}>
          <path d={`M${x - 2} -2 C${x} ${h * 0.55} ${x + w * 0.3} ${h} ${x + w / 2} ${h} C${x + w * 0.7} ${h} ${x + w} ${h * 0.55} ${x + w + 2} -2Z`} fill="#2e2722" />
          <path d={`M${x + 3} 0 C${x + 4} ${h * 0.45} ${x + w * 0.35} ${h * 0.8} ${x + w * 0.45} ${h * 0.86}`} stroke="#4f453e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );
    });
  } else if (t.decor === 'snowpeaks') {
    // snowdrifts along the ground line (the falling snow is ambient)
    body = [40, 150, 270, 360].map((x, i) => <ellipse key={i} cx={x} cy={198} rx={34 + (i % 2) * 14} ry={9} fill="#ffffff" />);
  } else if (t.decor === 'storm') {
    // heavy two-tone storm clouds, soft and rounded
    body = [
      [80, 30, 70, 22],
      [262, 24, 90, 24],
    ].map(([cx, cy, rx, ry], i) => (
      <g key={i}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a3e50" />
        <ellipse cx={cx - rx * 0.3} cy={cy - ry * 0.45} rx={rx * 0.45} ry={ry * 0.6} fill="#3a3e50" />
        <ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.6} rx={rx * 0.3} ry={ry * 0.3} fill="#50556a" />
        <ellipse cx={cx} cy={cy + ry * 0.55} rx={rx * 0.8} ry={ry * 0.35} fill="#2c3040" />
      </g>
    ));
  } else if (t.decor === 'reeds') {
    body = [20, 34, 360, 375, 388].map((x, i) => {
      const tipX = x + (4 - i * 2) * 0.5 + (-6 + i);
      return (
        <g key={i}>
          <path d={`M${x} 200 q${4 - i * 2} -60 ${-6 + i} -110`} stroke="#2a2536" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <rect x={tipX - 3} y={86} width="6" height="18" rx="3" fill="#5a3f30" />
        </g>
      );
    });
  } else if (t.decor === 'lanterns') {
    body = (
      <>
        <path d="M0 18 Q200 40 400 18" stroke={ink} strokeWidth="1.5" fill="none" />
        {[60, 140, 260, 340].map((x, i) => {
          const y = 30 + (i % 2) * 4;
          return (
            <g key={i}>
              <rect x={x - 5} y={y - 14} width="10" height="3.5" rx="1.5" fill="#c8963a" />
              <ellipse cx={x} cy={y} rx="9.5" ry="11" fill="#e5484d" />
              <ellipse cx={x - 1.5} cy={y} rx="4.5" ry="8" fill="#ff8a5a" />
              <path d={`M${x - 5} ${y - 9} Q${x - 9} ${y} ${x - 5} ${y + 9} M${x + 5} ${y - 9} Q${x + 9} ${y} ${x + 5} ${y + 9}`} stroke="#b8323a" strokeWidth="1.2" fill="none" />
              <rect x={x - 5} y={y + 10.5} width="10" height="3.5" rx="1.5" fill="#c8963a" />
              <path d={`M${x} ${y + 14} v8`} stroke="#e5484d" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        })}
      </>
    );
  } else if (t.decor === 'embers') {
    // a lava seam along the horizon (the sparks are ambient)
    body = <path d="M0 196 Q100 188 200 194 T400 192 L400 202 L0 202Z" fill="#c0441e" />;
  } else if (t.decor === 'scrolls') {
    // drifting calligraphy, solid pale ink
    const chars = ['字', '忘', '言', '书', '墨', '心'];
    body = chars.map((c, i) => (
      <text key={c} className="drift-char" style={{ animationDelay: `${-hash(i, 3) * 6}s`, animationDuration: `${5 + hash(i, 4) * 3}s` }} x={30 + i * 64} y={60 + ((i * 41) % 70)} fontSize={14 + (i % 3) * 5} fill="#c4beb0" fontFamily="serif">
        {c}
      </text>
    ));
  } else if (t.decor === 'void') {
    body = [40, 130, 220, 320].map((x, i) => <path key={i} d={`M${x} ${30 + i * 12} q20 -8 40 0`} stroke="#4a3a7a" strokeWidth="2" strokeLinecap="round" fill="none" />);
  }
  return (
    <>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
        {body}
      </svg>
      {scenery && <Scenery theme={theme} />}
    </>
  );
}

const prop = (id) => `${import.meta.env.BASE_URL}assets/props/${id}.webp`;
// Painted scenery (from the item icon art, so it matches the hand-painted look) placed into the
// backdrop. Distance is shown by tinting toward the sky colour (CSS filters), never by fading,
// so props stay fully opaque: { id, left (%), bottom or top (%), h (% of the layer height) }
const SCENERY = {
  temple: [
    { id: 'pagoda', left: 62, bottom: 32, h: 48, haze: 'far' },
    { id: 'phoenix_banner', left: 3, top: -2, h: 46, haze: 'near' },
    { id: 'phoenix_banner', left: 92, top: -2, h: 40, haze: 'near' },
  ],
  inklair: [
    { id: 'pagoda', left: 74, bottom: 34, h: 46, haze: 'night' },
    { id: 'dragon_banner', left: 4, top: -2, h: 44, haze: 'near' },
  ],
  volcano: [{ id: 'pagoda', left: 18, bottom: 34, h: 42, haze: 'ember' }],
  beyond: [
    { id: 'hanging_scroll', left: 12, top: -4, h: 44, haze: 'near' },
    { id: 'hanging_scroll', left: 91, top: -6, h: 34, haze: 'far' },
    { id: 'pagoda', left: 46, bottom: 36, h: 38, haze: 'ink' },
  ],
  marsh: [{ id: 'pagoda', left: 70, bottom: 34, h: 42, haze: 'mist' }],
};
function Scenery({ theme }) {
  const list = SCENERY[theme];
  if (!list) return null;
  return list.map((p, i) => (
    <img
      key={i}
      src={prop(p.id)}
      alt=""
      draggable="false"
      className={`bg-prop haze-${p.haze}`}
      style={{ left: `${p.left}%`, height: `${p.h}%`, ...(p.top !== undefined ? { top: `${p.top}%` } : { bottom: `${p.bottom}%` }) }}
    />
  ));
}

/** Deterministic pseudo-random in [0, 1) per particle and channel: varied, but stable across renders. */
function hash(i, k) {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Gentle environmental motion per theme (CSS only, paused for Reduced motion). Its own layer that
// doesn't scroll with the world, so particles never jump when a scrolling layer loops.
const AMBIENT = { bamboo: 'leaves', frozen: 'snow', marsh: 'fireflies', caves: 'dust', inklair: 'drips', coast: 'spray', volcano: 'embers', forest: 'leaves', dusk: 'leaves' };
const AMBIENT_SPEC = {
  // count, base duration (s), size range
  leaves: { n: 9, dur: 9, size: [0.7, 1.35] },
  snow: { n: 22, dur: 8, size: [0.5, 1.4] },
  fireflies: { n: 9, dur: 7, size: [0.7, 1.2] },
  dust: { n: 10, dur: 9, size: [0.6, 1.3] },
  drips: { n: 6, dur: 3.6, size: [0.8, 1.2] },
  spray: { n: 8, dur: 4, size: [0.6, 1.3] },
  embers: { n: 12, dur: 4.5, size: [0.6, 1.4] },
};
export function BgAmbient({ theme }) {
  const kind = AMBIENT[theme];
  const spec = AMBIENT_SPEC[kind];
  if (!spec) return null;
  const [s0, s1] = spec.size;
  return (
    <div className={`ambient amb-${kind}`} aria-hidden="true">
      {Array.from({ length: spec.n }, (_, i) => {
        // every particle gets its own position, speed, start, size, drift and spin
        const dur = spec.dur * (0.7 + hash(i, 1) * 0.75);
        return (
          <i
            key={i}
            style={{
              left: `${(hash(i, 0) * 104 - 2).toFixed(1)}%`,
              animationDuration: `${dur.toFixed(2)}s`,
              animationDelay: `${(-hash(i, 2) * dur).toFixed(2)}s`,
              '--s': (s0 + hash(i, 3) * (s1 - s0)).toFixed(2),
              '--dx': `${Math.round(-50 + hash(i, 4) * 60)}px`,
              '--sway': `${Math.round(8 + hash(i, 5) * 22) * (hash(i, 6) < 0.5 ? -1 : 1)}px`,
              '--rot': `${Math.round(180 + hash(i, 7) * 360) * (hash(i, 8) < 0.5 ? -1 : 1)}deg`,
              '--y': `${(hash(i, 9) * 60).toFixed(0)}%`,
            }}
          />
        );
      })}
    </div>
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
  const shade = mix(color, dark, 0.45);
  return trees.map((x, i) => {
    const h = (50 + ((i * 37) % 30)) * scale;
    return (
      <g key={i}>
        <rect x={x - 4} y={base - h * 0.45} width="8" height={h * 0.45} rx="3" fill={dark} />
        <ellipse cx={x} cy={base - h * 0.62} rx={h * 0.42} ry={h * 0.4} fill={color} />
        <ellipse cx={x - h * 0.15} cy={base - h * 0.8} rx={h * 0.26} ry={h * 0.24} fill={color} />
        <ellipse cx={x + h * 0.12} cy={base - h * 0.55} rx={h * 0.22} ry={h * 0.2} fill={shade} />
      </g>
    );
  });
}

export function BgSky({ theme }) {
  const t = THEMES[theme];
  const night = ['lair', 'ember', 'volcano', 'inklair', 'caves', 'marsh', 'thunder'].includes(theme);
  // the sun's halo and the clouds are solid colours mixed with the sky behind them
  const halo = mix(t.sky[0], t.sun, 0.22);
  const cloud = mix(t.sky[0], '#ffffff', 0.85);
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="bg-layer-svg">
      <defs>
        <linearGradient id={`sky-${theme}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.sky[0]} />
          <stop offset="1" stopColor={t.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#sky-${theme})`} />
      <circle cx="320" cy="50" r={night ? 30 : 44} fill={halo} />
      <circle cx="320" cy="50" r={night ? 18 : 26} fill={t.sun} />
      {night
        ? [30, 90, 150, 210, 260, 370, 60, 180].map((x, i) => <circle key={i} cx={x} cy={20 + ((i * 29) % 70)} r={1.2 + (i % 2)} fill={mix(t.sky[0], '#ffffff', 0.8)} />)
        : [
            [60, 40],
            [180, 28],
          ].map(([x, y], i) => (
            <g key={i} fill={cloud}>
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
    // ink-wash mountains fading into mist: an opaque gradient toward the far hills' colour
    return (
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="bg-layer-svg">
        <defs>
          <linearGradient id={`mist-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.mid} />
            <stop offset="1" stopColor={mix(t.mid, t.far, 0.75)} />
          </linearGradient>
        </defs>
        <path d="M0 170 Q20 120 40 96 Q55 72 70 94 Q86 70 100 62 Q118 42 136 70 Q152 96 170 118 Q186 96 200 82 Q220 52 240 86 Q260 112 280 128 Q300 96 320 72 Q340 46 360 80 Q380 100 400 120 L400 200 L0 200Z" fill={`url(#mist-${theme})`} />
        <path d="M100 62 Q118 42 136 70 M320 72 Q340 46 360 80" stroke={mix(t.mid, '#2a2622', 0.4)} strokeWidth="1.5" strokeLinecap="round" fill="none" />
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
  const pebble = mix(t.dirt, '#000000', 0.14);
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="bg-layer-svg">
      <rect width="400" height="60" fill={t.dirt} />
      <rect width="400" height="12" fill={t.ground} />
      <path d="M0 12 Q10 18 20 12 Q30 18 40 12 Q50 18 60 12 Q70 18 80 12 Q90 18 100 12 Q110 18 120 12 Q130 18 140 12 Q150 18 160 12 Q170 18 180 12 Q190 18 200 12 Q210 18 220 12 Q230 18 240 12 Q250 18 260 12 Q270 18 280 12 Q290 18 300 12 Q310 18 320 12 Q330 18 340 12 Q350 18 360 12 Q370 18 380 12 Q390 18 400 12" fill={t.ground} />
      {[30, 110, 170, 250, 330, 380].map((x, i) => (
        <ellipse key={i} cx={x} cy={32 + (i % 3) * 8} rx="7" ry="4" fill={pebble} />
      ))}
    </svg>
  );
}
