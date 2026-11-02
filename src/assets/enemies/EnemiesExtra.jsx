// Biome enemies and the late bosses. All face left; feet at the bottom of the viewBox.
// Vector art in the heroes' style (ink.jsx); replace via src/assets/manifest.js without touching game code.
import { OL, Part, Stick, Eyes, GlowEyes, Blush, Gloss, ell } from './ink.jsx';

export function Panda() {
  return (
    <svg viewBox="0 0 110 110" className="sprite-svg" aria-hidden="true">
      <Stick d="M84 54L103 18" color="#6ab04c" w={5} />
      <path d="M93 36L98 37M99 26L104 27" stroke={OL} strokeWidth="2" strokeLinecap="round" />
      <Part id="pd-leaf" d="M100 22Q110 14 108 6Q99 10 100 22Z" fill="#8fd16a" shade="#4f9a48" off={[-1, -1]} sw={2.4} />
      <Part id="pd-fl" d={ell(39, 100, 12, 7)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-fr" d={ell(71, 100, 12, 7)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-body" d={ell(55, 76, 34, 28)} fill="#fbfaf6" shade="#cfcbd8" off={[-6, -5]}>
        <path d="M21 62Q55 54 89 62L89 72Q55 64 21 72Z" fill="#3a3044" />
        <ellipse cx="55" cy="84" rx="15" ry="12" fill="#fffef9" />
      </Part>
      <Part id="pd-al" d="M22 68Q11 82 23 94Q32 86 31 72Z" fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-ar" d="M88 68Q99 82 87 94Q78 86 79 72Z" fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-earl" d={ell(32, 18, 9.5, 9)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-earr" d={ell(78, 18, 9.5, 9)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pd-head" d={ell(55, 40, 28, 26)} fill="#fbfaf6" shade="#cfcbd8" off={[-5, -4]}>
        <Gloss d="M33 34Q36 23 46 18" color="#ffffff" w={3} />
      </Part>
      <ellipse cx="44" cy="42" rx="9" ry="11" fill="#3a3044" transform="rotate(-24 44 42)" />
      <ellipse cx="66" cy="42" rx="9" ry="11" fill="#3a3044" transform="rotate(24 66 42)" />
      <g className="enemy-eyes">
        {[45, 65].map((x) => (
          <g key={x}>
            <circle cx={x} cy="42" r="4.4" fill="#fff" />
            <circle cx={x - 0.6} cy="42.6" r="3" fill="#5a3a2a" />
            <circle cx={x - 0.6} cy="42.8" r="1.6" fill={OL} />
            <circle cx={x - 1.8} cy="40.8" r="1.3" fill="#fff" />
          </g>
        ))}
      </g>
      <path d="M51 51Q55 49 59 51Q58 55 55 55Q52 55 51 51Z" fill={OL} />
      <path d="M49 58Q52 61 55 58Q58 61 61 58" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Blush x={36} y={53} rx={4} ry={2} />
      <Blush x={74} y={53} rx={4} ry={2} />
    </svg>
  );
}

export function Kite() {
  const kite = 'M50 7Q53 7 56 11L84 41Q87 44 84 47L56 82Q53 86 50 86Q47 86 44 82L16 47Q13 44 16 41L44 11Q47 7 50 7Z';
  return (
    <svg viewBox="0 0 100 110" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <path d="M50 86Q40 95 52 100Q63 105 50 110" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Part id="kt-bow1" d="M50 94L41 90L42 98ZM50 94L59 90L58 98Z" fill="#ff5a6a" shade="#c23a48" off={[0, -1]} sw={2} />
        <Part id="kt-bow2" d="M52 103L61 99L60 107ZM52 103L43 99L44 107Z" fill="#ffcf4a" shade="#d89a2a" off={[0, -1]} sw={2} />
        <Part id="kt-sail" d={kite} fill="#ff8a5c" shade="#d4603a" off={[-3, -3]}>
          <path d="M50 4L90 44L50 44Z" fill="#ffc94a" />
          <path d="M10 44L50 90L50 44Z" fill="#62e0b4" />
          <path d="M50 44L90 44L50 90Z" fill="#4fb0e8" />
          <path d="M50 4L50 90M10 44L90 44" stroke="#7a3a2a" strokeWidth="2.6" />
          <path d="M22 40L44 16" stroke="#ffd8b8" strokeWidth="3" strokeLinecap="round" />
        </Part>
        <Eyes x1={41} x2={59} y={40} r={4.6} iris="#2a3a6a" glow="#6a9aff" />
        <path d="M45 52Q50 57 55 52" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Blush x={34} y={50} rx={3.4} ry={1.8} />
        <Blush x={66} y={50} rx={3.4} ry={1.8} />
      </g>
    </svg>
  );
}

export function Turtle() {
  return (
    <svg viewBox="0 0 120 90" className="sprite-svg" aria-hidden="true">
      <Part id="tt-tail" d="M104 70Q116 68 114 74Q110 77 102 75Z" fill="#8cc78c" shade="#5a9a5a" off={[-1, -1]} sw={2.6} />
      <Part id="tt-fl" d={ell(34, 80, 10, 7)} fill="#8cc78c" shade="#5a9a5a" off={[-2, -2]} />
      <Part id="tt-fr" d={ell(86, 80, 10, 7)} fill="#8cc78c" shade="#5a9a5a" off={[-2, -2]} />
      <Part id="tt-shell" d="M22 70Q23 29 64 26Q105 29 105 70Z" fill="#4a9a68" shade="#2a6444" off={[-6, -5]}>
        <path d="M46 34L54 48L74 48L82 34M54 48L47 68M74 48L81 68M54 48L74 48" stroke="#2a6444" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <path d="M56 46L60 36L70 36L72 46Z" fill="#6ab884" />
        <Gloss d="M32 56Q34 42 46 34" color="#9ad8a8" w={3.5} />
      </Part>
      <Part id="tt-rim" d="M18 70Q18 65 23 65L104 65Q109 65 109 70Q109 75 104 75L23 75Q18 75 18 70Z" fill="#e2f0c4" shade="#a8c88a" off={[0, -2]} sw={2.8} />
      <Part id="tt-head" d={ell(17, 55, 14.5, 13.5)} fill="#8cc78c" shade="#5a9a5a" off={[-3, -3]}>
        <Gloss d="M7 52Q8 46 13 44" color="#c6ecc0" w={2.6} />
      </Part>
      <Eyes x1={11} x2={22} y={53} r={3.4} iris="#3a5a2a" glow="#8ac860" />
      <path d="M7 62Q11 64.5 15 62" stroke={OL} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Blush x={25} y={60} rx={2.8} ry={1.5} />
    </svg>
  );
}

export function Snowman() {
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <Stick d="M24 84L5 70M8 73L4 66M77 84L95 71M92 74L96 67" color="#7a5a3e" w={3.2} />
      <Part id="sm-low" d={ell(50, 88, 28, 27)} fill="#f8fcff" shade="#b4cfe6" off={[-6, -5]}>
        <Gloss d="M28 82Q30 70 40 64" color="#ffffff" w={3.5} />
      </Part>
      <circle cx="50" cy="82" r="3.2" fill={OL} />
      <circle cx="50" cy="94" r="3.2" fill={OL} />
      <Part id="sm-head" d={ell(50, 44, 22, 21)} fill="#f8fcff" shade="#b4cfe6" off={[-5, -4]} />
      <Part id="sm-scarf" d="M27 63Q50 72 73 63L73 70Q50 79 27 70Z" fill="#ec4f54" shade="#a82a35" off={[0, -2]} sw={2.8}>
        <path d="M40 66L40 74M52 67L52 76M64 66L64 74" stroke="#ff9a8a" strokeWidth="2" />
      </Part>
      <Part id="sm-tail" d="M64 66Q72 74 74 86L66 85Q66 76 60 70Z" fill="#ec4f54" shade="#a82a35" off={[-1.5, -1]} sw={2.6} />
      <Part id="sm-hat" d="M35 27L37 9Q37 6 40 6L60 6Q63 6 63 9L65 27Z" fill="#3a3044" shade="#1c1622" off={[-2, -1]}>
        <path d="M36 20L64 20L64 25L36 25Z" fill="#ec4f54" />
      </Part>
      <Part id="sm-brim" d="M27 27Q27 24 30 24L70 24Q73 24 73 27Q73 30 70 30L30 30Q27 30 27 27Z" fill="#3a3044" shade="#1c1622" off={[0, -1]} sw={2.6} />
      <Eyes x1={42} x2={58} y={41} r={3.8} iris="#2a3a5a" glow="#5a8ad8" angry />
      <Part id="sm-nose" d="M48 47Q38 49 29 52Q38 53 48 52Z" fill="#ff9a3c" shade="#d06a1a" off={[0, -1]} sw={2.2} />
      <path d="M44 56Q50 59 56 56" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Blush x={35} y={51} rx={3.2} ry={1.7} color="#ffb8c8" />
    </svg>
  );
}

export function Thunderbird() {
  const wingL = 'M44 46Q20 13 3 22Q15 31 8 40Q23 39 22 52Z';
  const wingR = 'M76 46Q100 11 117 20Q105 29 112 38Q97 39 98 52Z';
  return (
    <svg viewBox="0 0 120 100" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <Part id="tb-wl" className="wing-l" d={wingL} fill="#4a7ee8" shade="#2a4fa8" off={[0, -3]}>
          <path d="M40 44L12 32M38 48L18 44" stroke="#2a4fa8" strokeWidth="2" />
        </Part>
        <Part id="tb-wr" className="wing-r" d={wingR} fill="#4a7ee8" shade="#2a4fa8" off={[0, -3]}>
          <path d="M80 44L108 30M82 48L102 44" stroke="#2a4fa8" strokeWidth="2" />
        </Part>
        <Stick d="M54 73L51 89M66 73L69 89" color="#ffb347" w={3} />
        <Part id="tb-crest" d="M48 38Q42 24 46 14Q52 22 55 30Q56 16 62 10Q66 20 64 31Q70 22 77 21Q76 32 70 39Z" fill="#ffe14a" shade="#d8a020" off={[-2, -2]} sw={2.8} />
        <Part id="tb-body" d={ell(60, 54, 22, 20)} fill="#6a98f4" shade="#3a62c0" off={[-4, -4]}>
          <ellipse cx="62" cy="64" rx="12" ry="8" fill="#c8dcff" />
          <Gloss d="M43 48Q45 40 52 36" color="#b8d0ff" w={3.5} />
        </Part>
        <Eyes x1={52} x2={67} y={50} r={4.6} iris="#c98a00" glow="#ffe04a" angry />
        <Part id="tb-beak" d="M41 56Q30 58 27 62Q33 65 42 63Z" fill="#ffb347" shade="#d07a1a" off={[0, -1]} sw={2.4} />
        <path d="M30 34L36 30L34 36L40 33" stroke="#ffe14a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function ShadowSprite() {
  const cloak = 'M18 114Q14 60 30 34Q50 4 70 34Q86 60 82 114Q74 106 66 114Q58 106 50 114Q42 106 34 114Q26 106 18 114Z';
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <Part id="sh-cloak" d={cloak} fill="#463a6a" shade="#231a3a" off={[-6, -4]}>
        <path d="M30 46Q50 28 70 46L72 84Q50 92 28 84Z" fill="#160f26" />
        <path d="M34 60Q34 100 30 112M66 60Q68 100 72 112" stroke="#2c2248" strokeWidth="3" fill="none" />
        <Gloss d="M26 64Q28 44 40 30" color="#6b5aa0" w={3.5} />
      </Part>
      <GlowEyes x1={40} x2={62} y={60} rx={6} ry={4} color="#ff5a8a" core="#ffd6e2" />
      <path d="M40 76Q50 70 60 76" stroke="#ff5a8a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Lantern() {
  return (
    <svg viewBox="0 0 100 120" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <ellipse cx="50" cy="60" rx="46" ry="46" fill="#ffd27a" opacity=".2" />
        <Stick d="M50 2L50 14" color="#7a5a3e" w={2.4} />
        <Stick d="M44 102L42 117M50 102L50 119M56 102L58 117" color="#ec4f54" w={2.6} />
        <Part id="ln-body" d={ell(50, 58, 34, 38)} fill="#ec4f54" shade="#a82a35" off={[-6, -4]}>
          <ellipse cx="50" cy="60" rx="20" ry="25" fill="#ffb36a" />
          <ellipse cx="48" cy="58" rx="12" ry="16" fill="#ffe0a0" />
          <path d="M34 25Q23 58 34 93M66 25Q77 58 66 93" stroke="#a82a35" strokeWidth="2.8" fill="none" />
          <Gloss d="M22 52Q24 36 32 28" color="#ff9a8a" w={3.5} />
        </Part>
        <Part id="ln-top" d="M33 15Q33 12 36 12L64 12Q67 12 67 15L67 19Q67 22 64 22L36 22Q33 22 33 19Z" fill="#e8b04a" shade="#a8742a" off={[-1, -1]} sw={2.6} />
        <Part id="ln-bot" d="M33 97Q33 94 36 94L64 94Q67 94 67 97L67 101Q67 104 64 104L36 104Q33 104 33 101Z" fill="#e8b04a" shade="#a8742a" off={[-1, -1]} sw={2.6} />
        <Eyes x1={41} x2={59} y={55} r={4.6} iris="#7a2a1a" glow="#ff8a4a" />
        <path d="M44 67Q50 72 56 67" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Blush x={34} y={64} rx={3.4} ry={1.8} color="#ff7a7a" />
        <Blush x={66} y={64} rx={3.4} ry={1.8} color="#ff7a7a" />
      </g>
    </svg>
  );
}

export function Wraith() {
  const sheet = 'M14 56Q10 16 45 10Q80 16 76 56Q74 80 62 94Q56 86 50 96Q44 86 38 96Q32 86 26 94Q16 80 14 56Z';
  return (
    <svg viewBox="0 0 90 100" className="sprite-svg" aria-hidden="true">
      <Part id="wr-body" className="wisp-body" d={sheet} fill="#f8f2e4" shade="#cdbf9e" off={[-5, -4]}>
        <path d="M24 30H64M22 72H66" stroke="#ddd0b2" strokeWidth="2" />
        <rect x="56" y="28" width="12" height="36" rx="1.5" fill="#f4d24a" stroke={OL} strokeWidth="1.8" />
        <path d="M59 34H65M59 40H65M60 46L64 52M64 46L60 52M59 58H65" stroke="#c23a35" strokeWidth="1.6" />
      </Part>
      <g className="enemy-eyes">
        {[32, 49].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="46" rx="5.4" ry="7.4" fill={OL} />
            <circle cx={x - 1.6} cy="43" r="1.8" fill="#fff" />
          </g>
        ))}
      </g>
      <path d="M33 64Q40 59 47 64Q40 68 33 64Z" fill={OL} />
    </svg>
  );
}

export function WordEater() {
  const blob = 'M30 150Q10 90 50 50Q90 10 140 30Q200 50 200 120Q198 170 150 178Q120 168 100 180Q70 168 50 176Q36 170 30 150Z';
  return (
    <svg viewBox="0 0 220 190" className="sprite-svg" aria-hidden="true">
      <Part id="we-hl" d="M98 34Q92 10 106 2Q116 14 118 30Z" fill="#2a1f48" shade="#120c24" off={[-1.5, -1.5]} sw={4} />
      <Part id="we-hr" d="M150 38Q156 16 176 12Q170 26 166 44Z" fill="#2a1f48" shade="#120c24" off={[-1.5, -1.5]} sw={4} />
      <Part id="we-body" d={blob} fill="#3e3070" shade="#191030" off={[-10, -9]} sw={5}>
        <ellipse cx="80" cy="66" rx="34" ry="24" fill="#5a4a9a" />
        <Gloss d="M44 92Q46 66 66 48" color="#7a6ac0" w={6} />
        {[
          [58, 52, -12, '书'],
          [156, 48, 10, '字'],
          [168, 112, 8, '言'],
          [44, 118, -8, '心'],
        ].map(([x, y, r, c]) => (
          <g key={c} transform={`rotate(${r} ${x + 8} ${y + 8})`}>
            <rect x={x} y={y} width="18" height="18" rx="2" fill="#f6efe0" stroke={OL} strokeWidth="2.4" />
            <text x={x + 9} y={y + 14} textAnchor="middle" fontSize="13" fontFamily="serif" fill={OL}>
              {c}
            </text>
          </g>
        ))}
      </Part>
      <Part id="we-mouth" d="M40 100Q90 150 150 112Q120 162 60 142Z" fill="#ff3a6a" shade="#a81a40" off={[0, -4]} sw={4}>
        <path d="M60 140Q86 130 112 146" stroke="#ff8aa8" strokeWidth="6" fill="none" strokeLinecap="round" />
      </Part>
      <path d="M48 106Q52 116 56 118Q60 112 64 107Q68 120 72 122Q76 114 80 110Q84 124 88 124Q92 116 96 112Q100 124 104 122Q108 114 112 110Q116 118 120 116Q124 110 128 108" fill="#fff" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
      <g className="enemy-eyes">
        {[
          [70, 80, 12],
          [110, 70, 15],
          [146, 82, 10],
        ].map(([x, y, r]) => (
          <g key={x}>
            <circle cx={x} cy={y} r={r} fill="#fff6d0" stroke={OL} strokeWidth="3" />
            <circle cx={x - r * 0.3} cy={y + r * 0.12} r={r * 0.5} fill="#e8a020" />
            <circle cx={x - r * 0.3} cy={y + r * 0.12} r={r * 0.28} fill={OL} />
            <circle cx={x - r * 0.48} cy={y - r * 0.14} r={r * 0.16} fill="#fff" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Rabbit() {
  return (
    <svg viewBox="0 0 120 130" className="sprite-svg" aria-hidden="true">
      <ellipse cx="60" cy="66" rx="56" ry="56" fill="#d8f5e6" opacity=".3" />
      <Part id="rb-moon" d="M96 17A13 13 0 1 0 108 37A10 10 0 1 1 96 17Z" fill="#fff6c4" shade="#e8d27a" off={[-1.5, -1.5]} sw={2.6} />
      <Part id="rb-earl" d="M44 40Q33 1 46 2Q57 6 55 40Z" fill="#f6fff9" shade="#b8dcc8" off={[-2, -2]}>
        <path d="M46 34Q42 13 47 9Q51 14 51 34Z" fill="#ffc6d6" />
      </Part>
      <Part id="rb-earr" d="M67 41Q72 0 85 4Q93 10 77 43Z" fill="#f6fff9" shade="#b8dcc8" off={[-2, -2]}>
        <path d="M71 36Q76 14 82 10Q84 16 76 37Z" fill="#ffc6d6" />
      </Part>
      <Stick d="M32 104L19 116M88 104L101 116" color="#f6fff9" w={5} />
      <Part id="rb-body" d={ell(60, 96, 30, 26)} fill="#f6fff9" shade="#b8dcc8" off={[-6, -5]}>
        <ellipse cx="60" cy="102" rx="16" ry="14" fill="#ffffff" />
      </Part>
      <Part id="rb-head" d={ell(60, 58, 24, 23)} fill="#f6fff9" shade="#b8dcc8" off={[-5, -4]}>
        <Gloss d="M40 54Q41 44 49 38" color="#ffffff" w={3} />
      </Part>
      <Eyes x1={50} x2={69} y={56} r={4.6} iris="#c23a5a" glow="#ff8aa8" />
      <path d="M57 65Q59 63 61 65Q60 67.5 59 67.5Q58 67.5 57 65Z" fill="#ff7a9a" stroke={OL} strokeWidth="1.2" />
      <path d="M54 71Q56.5 73.5 59 71Q61.5 73.5 64 71" stroke={OL} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Blush x={42} y={66} rx={3.6} ry={1.9} />
      <Blush x={77} y={66} rx={3.6} ry={1.9} />
    </svg>
  );
}
