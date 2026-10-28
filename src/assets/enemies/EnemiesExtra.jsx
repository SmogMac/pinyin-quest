// Biome enemies and the late bosses. All face left; feet at the bottom of the viewBox.
// Placeholder vector art: replace via src/assets/manifest.js without touching game code.

const Eyes = ({ x1, x2, y, r = 4.5, color = '#2a1a2e', angry = false }) => (
  <g className="enemy-eyes">
    <ellipse cx={x1} cy={y} rx={r} ry={r * 1.2} fill={color} />
    <ellipse cx={x2} cy={y} rx={r} ry={r * 1.2} fill={color} />
    <circle cx={x1 - r * 0.35} cy={y - r * 0.45} r={r * 0.4} fill="#fff" />
    <circle cx={x2 - r * 0.35} cy={y - r * 0.45} r={r * 0.4} fill="#fff" />
    {angry && <path d={`M${x1 - r * 1.4} ${y - r * 2} L${x1 + r} ${y - r * 1.2} M${x2 + r * 1.4} ${y - r * 2} L${x2 - r} ${y - r * 1.2}`} stroke={color} strokeWidth="2.4" strokeLinecap="round" />}
  </g>
);
const Shadow = ({ cx, cy, rx }) => <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill="#000" opacity=".18" />;
const Ink = '#2a2233';

export function Panda() {
  return (
    <svg viewBox="0 0 110 110" className="sprite-svg" aria-hidden="true">
      <Shadow cx={55} cy={106} rx={36} />
      <ellipse cx="40" cy="100" rx="11" ry="7" fill={Ink} />
      <ellipse cx="70" cy="100" rx="11" ry="7" fill={Ink} />
      <ellipse cx="55" cy="76" rx="34" ry="28" fill="#fbfaf6" stroke={Ink} strokeWidth="2.5" />
      <path d="M22 70 Q14 82 24 92 Q30 84 30 74Z M88 70 Q96 82 86 92 Q80 84 80 74Z" fill={Ink} />
      <circle cx="55" cy="40" r="28" fill="#fbfaf6" stroke={Ink} strokeWidth="2.5" />
      <circle cx="32" cy="18" r="9" fill={Ink} />
      <circle cx="78" cy="18" r="9" fill={Ink} />
      <ellipse cx="44" cy="42" rx="8" ry="10" fill={Ink} transform="rotate(-20 44 42)" />
      <ellipse cx="66" cy="42" rx="8" ry="10" fill={Ink} transform="rotate(20 66 42)" />
      <g className="enemy-eyes">
        <circle cx="45" cy="42" r="3" fill="#fff" />
        <circle cx="65" cy="42" r="3" fill="#fff" />
      </g>
      <ellipse cx="55" cy="53" rx="4" ry="3" fill={Ink} />
      <path d="M50 58 Q55 62 60 58" stroke={Ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M86 50 L104 20" stroke="#6ab04c" strokeWidth="5" strokeLinecap="round" />
      <path d="M98 28 q8 -4 10 -12 M94 36 q-8 -2 -12 -10" stroke="#6ab04c" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Kite() {
  return (
    <svg viewBox="0 0 100 110" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <path d="M50 6 L86 44 L50 86 L14 44Z" fill="#ff8a5c" stroke={Ink} strokeWidth="2.5" />
        <path d="M50 6 L50 86 M14 44 L86 44" stroke={Ink} strokeWidth="1.5" opacity=".6" />
        <path d="M50 6 L86 44 L50 44Z" fill="#ffc94a" />
        <path d="M14 44 L50 86 L50 44Z" fill="#62e0b4" />
        <Eyes x1={42} x2={58} y={40} r={4.2} />
        <path d="M45 52 Q50 56 55 52" stroke={Ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M50 86 Q40 96 52 100 Q62 104 50 110" stroke={Ink} strokeWidth="2" fill="none" />
        <path d="M44 94 l-6 -3 l2 6z M56 102 l6 -3 l-2 6z" fill="#ff5a6a" />
      </g>
    </svg>
  );
}

export function Turtle() {
  return (
    <svg viewBox="0 0 120 90" className="sprite-svg" aria-hidden="true">
      <Shadow cx={60} cy={86} rx={46} />
      <ellipse cx="34" cy="80" rx="9" ry="6" fill="#6aa86a" />
      <ellipse cx="86" cy="80" rx="9" ry="6" fill="#6aa86a" />
      <path d="M22 70 Q24 30 64 26 Q104 30 104 70Z" fill="#3e7d5a" stroke={Ink} strokeWidth="2.5" />
      <path d="M44 34 l10 14 l20 0 l10 -14 M54 48 l-8 20 M74 48 l8 20" stroke="#a7d68a" strokeWidth="2.5" fill="none" />
      <rect x="18" y="66" width="90" height="8" rx="4" fill="#cfe7b0" stroke={Ink} strokeWidth="2" />
      <circle cx="16" cy="56" r="14" fill="#8cc78c" stroke={Ink} strokeWidth="2.5" />
      <Eyes x1={10} x2={20} y={53} r={3} />
      <path d="M8 62 Q12 64 16 62" stroke={Ink} strokeWidth="1.8" fill="none" />
    </svg>
  );
}

export function Snowman() {
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <Shadow cx={50} cy={116} rx={34} />
      <circle cx="50" cy="88" r="28" fill="#f4fbff" stroke="#7fb3d6" strokeWidth="2.5" />
      <circle cx="50" cy="44" r="22" fill="#f4fbff" stroke="#7fb3d6" strokeWidth="2.5" />
      <path d="M28 64 Q50 72 72 64 L72 70 Q50 78 28 70Z" fill="#e5484d" />
      <path d="M66 66 l8 18 l-8 -2z" fill="#c23a35" />
      <path d="M32 26 L68 26 L64 8 L36 8Z" fill={Ink} />
      <rect x="28" y="24" width="44" height="5" rx="2" fill={Ink} />
      <Eyes x1={42} x2={58} y={40} r={3.4} angry />
      <path d="M48 48 L30 52 L48 52Z" fill="#ff9a3c" />
      <circle cx="50" cy="82" r="3" fill={Ink} />
      <circle cx="50" cy="94" r="3" fill={Ink} />
      <path d="M22 84 L4 70 M78 84 L96 72 M8 73 l-4 -6 M92 74 l4 -6" stroke="#7a5a3e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Thunderbird() {
  return (
    <svg viewBox="0 0 120 100" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <path className="wing-l" d="M44 46 Q20 14 2 22 Q14 32 8 40 Q24 40 22 52Z" fill="#3a6fd8" />
        <path className="wing-r" d="M76 46 Q100 12 118 20 Q106 30 112 38 Q96 40 98 52Z" fill="#3a6fd8" />
        <path d="M30 38 l8 -6 l-2 8 l8 -4" stroke="#ffe14a" strokeWidth="2.5" fill="none" />
        <ellipse cx="60" cy="54" rx="22" ry="20" fill="#5a8cf0" stroke={Ink} strokeWidth="2" />
        <path d="M48 36 L44 18 L56 32 L60 14 L64 32 L74 20 L70 38Z" fill="#ffe14a" stroke={Ink} strokeWidth="1.5" />
        <Eyes x1={52} x2={66} y={50} r={4} color="#1a1440" angry />
        <path d="M40 58 L28 62 L40 64Z" fill="#ffb347" />
        <path d="M54 74 L50 90 M66 74 L70 90" stroke="#ffb347" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function ShadowSprite() {
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <Shadow cx={50} cy={116} rx={30} />
      <path d="M18 116 Q14 60 30 34 Q50 4 70 34 Q86 60 82 116 Q74 106 66 116 Q58 106 50 116 Q42 106 34 116 Q26 106 18 116Z" fill="#2d2445" opacity=".92" />
      <path d="M30 40 Q50 20 70 40" stroke="#6b5aa0" strokeWidth="3" fill="none" opacity=".6" />
      <ellipse cx="40" cy="58" rx="6" ry="4" fill="#ff5a8a" />
      <ellipse cx="62" cy="58" rx="6" ry="4" fill="#ff5a8a" />
      <ellipse cx="40" cy="58" rx="11" ry="8" fill="#ff5a8a" opacity=".2" />
      <ellipse cx="62" cy="58" rx="11" ry="8" fill="#ff5a8a" opacity=".2" />
      <path d="M40 76 Q50 70 60 76" stroke="#ff5a8a" strokeWidth="2" fill="none" opacity=".7" />
    </svg>
  );
}

export function Lantern() {
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <ellipse cx="50" cy="60" rx="46" ry="46" fill="#ffd27a" opacity=".18" />
        <path d="M50 2 L50 14" stroke={Ink} strokeWidth="3" />
        <rect x="34" y="12" width="32" height="8" rx="3" fill="#c8963a" stroke={Ink} strokeWidth="2" />
        <ellipse cx="50" cy="58" rx="34" ry="38" fill="#e5484d" stroke={Ink} strokeWidth="2.5" />
        <path d="M34 26 Q24 58 34 92 M66 26 Q76 58 66 92 M50 20 L50 96" stroke="#b8323a" strokeWidth="2.5" fill="none" />
        <ellipse cx="50" cy="58" rx="20" ry="24" fill="#ffcf6a" opacity=".55" />
        <Eyes x1={42} x2={58} y={54} r={4} />
        <path d="M44 66 Q50 71 56 66" stroke={Ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="34" y="94" width="32" height="8" rx="3" fill="#c8963a" stroke={Ink} strokeWidth="2" />
        <path d="M44 102 L42 118 M50 102 L50 120 M56 102 L58 118" stroke="#e5484d" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export function Wraith() {
  return (
    <svg viewBox="0 0 90 100" className="sprite-svg" aria-hidden="true">
      <g className="wisp-body">
        <path d="M14 56 Q10 16 45 10 Q80 16 76 56 Q74 80 62 94 Q56 84 50 96 Q44 84 38 96 Q32 84 26 94 Q16 80 14 56Z" fill="#f6efe0" stroke={Ink} strokeWidth="2.5" />
        <path d="M24 30 h40 M22 42 h46 M26 54 h36" stroke="#cbbfa6" strokeWidth="2" />
        <ellipse cx="36" cy="46" rx="5" ry="7" fill={Ink} />
        <ellipse cx="56" cy="46" rx="5" ry="7" fill={Ink} />
        <path d="M38 66 Q45 62 52 66" stroke={Ink} strokeWidth="2.5" fill="none" />
        <circle cx="70" cy="22" r="6" fill={Ink} opacity=".7" />
      </g>
    </svg>
  );
}

export function WordEater() {
  return (
    <svg viewBox="0 0 220 190" className="sprite-svg" aria-hidden="true">
      <defs>
        <radialGradient id="weG" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#4a3a7a" />
          <stop offset="1" stopColor="#120c24" />
        </radialGradient>
      </defs>
      <Shadow cx={110} cy={184} rx={80} />
      <path d="M30 150 Q10 90 50 50 Q90 10 140 30 Q200 50 200 120 Q198 170 150 178 Q120 168 100 180 Q70 168 50 176 Q36 170 30 150Z" fill="url(#weG)" stroke="#000" strokeWidth="3" />
      <g fill="#f6efe0" opacity=".85">
        <path d="M60 60 h14 v14 h-14z M150 50 h12 v12 h-12z M170 110 h12 v12 h-12z M48 120 h10 v10 h-10z" />
      </g>
      <path d="M40 100 Q90 150 150 112 Q120 160 60 140Z" fill="#ff3a6a" />
      <path d="M48 104 l8 14 l8 -12 l8 16 l8 -14 l8 16 l8 -14 l8 14 l8 -12 l8 10" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <g className="enemy-eyes">
        <circle cx="70" cy="80" r="12" fill="#fff6d0" />
        <circle cx="110" cy="70" r="15" fill="#fff6d0" />
        <circle cx="146" cy="82" r="10" fill="#fff6d0" />
        <circle cx="66" cy="82" r="5" fill="#120c24" />
        <circle cx="105" cy="72" r="7" fill="#120c24" />
        <circle cx="142" cy="84" r="4" fill="#120c24" />
      </g>
      <path d="M100 30 Q96 6 112 0 Q108 16 118 28Z M150 36 Q160 14 176 14 Q164 24 162 42Z" fill="#120c24" />
    </svg>
  );
}

export function Rabbit() {
  return (
    <svg viewBox="0 0 120 130" className="sprite-svg" aria-hidden="true">
      <Shadow cx={60} cy={126} rx={34} />
      <ellipse cx="60" cy="64" rx="56" ry="56" fill="#d8f5e6" opacity=".25" />
      <path d="M44 40 Q34 0 46 2 Q56 6 54 40Z M68 40 Q72 0 84 4 Q92 10 76 42Z" fill="#f4fff8" stroke="#6fbf98" strokeWidth="2.5" />
      <path d="M46 36 Q42 12 47 8 M72 36 Q78 14 82 10" stroke="#ffc6d6" strokeWidth="4" fill="none" />
      <ellipse cx="60" cy="96" rx="30" ry="26" fill="#f4fff8" stroke="#6fbf98" strokeWidth="2.5" />
      <circle cx="60" cy="58" r="24" fill="#f4fff8" stroke="#6fbf98" strokeWidth="2.5" />
      <Eyes x1={50} x2={68} y={56} r={4} color="#2f8a5f" />
      <ellipse cx="59" cy="66" rx="3" ry="2" fill="#ff9ab8" />
      <path d="M54 72 Q59 75 64 72" stroke="#2f8a5f" strokeWidth="2" fill="none" />
      <circle cx="96" cy="30" r="12" fill="#fff6c4" />
      <circle cx="101" cy="26" r="10" fill="#d8f5e6" opacity=".9" />
      <path d="M30 104 L18 116 M90 104 L102 116" stroke="#6fbf98" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
