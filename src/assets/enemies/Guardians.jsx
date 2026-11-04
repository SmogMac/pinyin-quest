// Act guardians (the boss at the end of each map), each with its own art: never a recoloured or
// scaled-up common enemy. All face left; feet at the bottom of the viewBox. Drawn with the shared
// ink kit (ink.jsx) to match the heroes: thick outlines, cel shading, anime eyes.
import { OL, Part, Stick, Eyes, GlowEyes, Blush, Gloss, ell } from './ink.jsx';

const GOLD = ['#ffcf4a', '#c98a1a'];
/** A small rounded crown (three rounded points with jewels), centred at cx with its base at y. */
function Crown({ id, cx, y, w = 30, jewel = '#e5484d' }) {
  const h = w * 0.55;
  const l = cx - w / 2;
  const d = `M${l} ${y}L${l} ${y - h * 0.55}Q${l + w * 0.08} ${y - h * 1.05} ${l + w * 0.2} ${y - h * 0.6}Q${l + w * 0.35} ${y - h * 1.25} ${cx} ${y - h * 0.65}Q${l + w * 0.65} ${y - h * 1.25} ${l + w * 0.8} ${y - h * 0.6}Q${l + w * 0.92} ${y - h * 1.05} ${l + w} ${y - h * 0.55}L${l + w} ${y}Z`;
  return (
    <g>
      <Part id={id} d={d} fill={GOLD[0]} shade={GOLD[1]} off={[-1.5, -1.5]} sw={2.6}>
        <path d={`M${l} ${y - h * 0.25}H${l + w}`} stroke="#fff3b0" strokeWidth="1.6" />
      </Part>
      <circle cx={cx} cy={y - h * 0.35} r={w * 0.08} fill={jewel} stroke={OL} strokeWidth="1.4" />
    </g>
  );
}

// ------------------------------------------------------------------ Bamboo Forest
export function PandaKing() {
  return (
    <svg viewBox="0 0 140 150" className="sprite-svg" aria-hidden="true">
      <Stick d="M20 146L30 34" color="#6ab04c" w={6} />
      <path d="M22 118h7M25 88h7M28 58h7" stroke={OL} strokeWidth="2.2" strokeLinecap="round" />
      <Part id="pk-leaf" d="M30 36Q44 22 48 10Q34 14 30 36Z" fill="#8fd16a" shade="#4f9a48" off={[-1, -1]} sw={2.4} />
      <Part id="pk-fl" d={ell(52, 140, 15, 8)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-fr" d={ell(92, 140, 15, 8)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-body" d={ell(72, 104, 42, 36)} fill="#fbfaf6" shade="#cfcbd8" off={[-7, -6]}>
        <path d="M30 96Q72 84 114 96L114 112Q72 100 30 112Z" fill="#c23a35" />
        <path d="M30 100Q72 88 114 100" stroke="#ffcf4a" strokeWidth="3" fill="none" />
        <ellipse cx="72" cy="122" rx="18" ry="12" fill="#fffef9" />
      </Part>
      <Part id="pk-al" d="M34 92Q20 110 34 124Q44 114 42 98Z" fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-ar" d="M110 92Q124 110 110 124Q100 114 102 98Z" fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-hand" d={ell(30, 104, 8, 7)} fill="#3a3044" shade="#1c1622" off={[-1, -1]} />
      <Part id="pk-earl" d={ell(44, 30, 11, 10)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-earr" d={ell(100, 30, 11, 10)} fill="#3a3044" shade="#1c1622" off={[-2, -2]} />
      <Part id="pk-head" d={ell(72, 54, 33, 30)} fill="#fbfaf6" shade="#cfcbd8" off={[-5, -4]}>
        <Gloss d="M46 46Q50 34 62 28" color="#ffffff" w={3} />
      </Part>
      <ellipse cx="58" cy="56" rx="10" ry="12.5" fill="#3a3044" transform="rotate(-24 58 56)" />
      <ellipse cx="85" cy="56" rx="10" ry="12.5" fill="#3a3044" transform="rotate(24 85 56)" />
      <g className="enemy-eyes">
        {[59, 84].map((x) => (
          <g key={x}>
            <circle cx={x - 0.6} cy="56.4" r="3.6" fill="#2a1a22" />
            <circle cx={x - 1.8} cy="55" r="1.3" fill="#fff" />
          </g>
        ))}
        <path d="M50 42L63 46M93 42L80 46" stroke={OL} strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M67 67Q72 64 77 67Q76 71 72 71Q68 71 67 67Z" fill={OL} />
      <path d="M64 75Q68 78 72 75Q76 78 80 75" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Crown id="pk-crown" cx={72} cy={0} y={28} w={32} />
    </svg>
  );
}

export function MantisMaster() {
  return (
    <svg viewBox="0 0 140 150" className="sprite-svg" aria-hidden="true">
      <Stick d="M70 112L58 146M84 112L94 146M60 112L40 140M92 110L112 138" color="#5fa548" w={4} />
      <Part id="mm-abd" d="M78 84Q122 88 124 116Q122 132 104 128Q86 122 74 100Z" fill="#8fd16a" shade="#4f9a48" off={[-4, -4]}>
        <path d="M92 96Q100 112 98 126M106 98Q114 110 112 124" stroke="#5fa548" strokeWidth="2.6" fill="none" />
      </Part>
      <Part id="mm-wing" d="M84 72Q120 64 132 92Q112 92 86 90Z" fill="#c8f0a8" shade="#8fc87a" off={[-2, -2]} sw={2.6} />
      <Part id="mm-chest" d="M60 58Q78 54 86 70L86 108Q74 118 62 108Z" fill="#8fd16a" shade="#4f9a48" off={[-4, -3]}>
        <path d="M60 80Q74 84 86 80" stroke="#c23a35" strokeWidth="5" />
      </Part>
      {/* raised scythe arms, rounded hooks */}
      <Stick d="M64 66Q44 56 36 70" color="#7cc458" w={6} />
      <Part id="mm-scl" d="M38 70Q14 64 10 40Q24 48 28 58Q34 52 40 62Z" fill="#a8e08a" shade="#5fa548" off={[1, -2]} sw={2.8} />
      <Stick d="M82 64Q100 46 94 34" color="#7cc458" w={6} />
      <Part id="mm-scr" d="M94 36Q86 14 102 2Q102 18 98 24Q108 24 104 34Z" fill="#a8e08a" shade="#5fa548" off={[-1, -2]} sw={2.8} />
      <Stick d="M54 30Q46 12 34 8M64 28Q64 10 74 2" color="#5fa548" w={2.2} />
      <Part id="mm-head" d="M44 38Q50 22 66 24Q82 26 80 42Q76 58 62 60Q48 56 44 38Z" fill="#a8e08a" shade="#5fa548" off={[-3, -3]}>
        <path d="M44 32Q62 28 80 34" stroke="#c23a35" strokeWidth="5" />
      </Part>
      <Stick d="M80 34Q92 40 98 50" color="#c23a35" w={3.4} />
      <Eyes x1={54} x2={70} y={42} r={5.4} iris="#2a7a3a" glow="#ffe04a" angry />
      <path d="M58 54Q62 56.5 66 54" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BambooSage() {
  return (
    <svg viewBox="0 0 140 150" className="sprite-svg" aria-hidden="true">
      <Stick d="M30 146L38 46" color="#a87a3a" w={5} />
      <Part id="bs-gourd" d="M34 54Q24 58 26 68Q28 78 38 76Q46 72 42 62Q44 52 34 54Z" fill="#e8a83a" shade="#b06a1a" off={[-1.5, -1.5]} sw={2.4}>
        <path d="M28 64H42" stroke="#c23a35" strokeWidth="2.4" />
      </Part>
      <Part id="bs-robe" d="M48 70Q74 62 98 72L110 140Q76 150 40 140Z" fill="#7ab86a" shade="#4a7a48" off={[-6, -4]}>
        <path d="M56 74Q74 106 66 142M88 74Q96 110 100 140" stroke="#5a9a52" strokeWidth="3" fill="none" />
        <path d="M44 120Q76 128 106 120" stroke="#e8d27a" strokeWidth="3" fill="none" />
      </Part>
      <Stick d="M56 84Q44 82 38 78" color="#7ab86a" w={9} />
      <Part id="bs-hand" d={ell(37, 77, 6, 6)} fill="#f6d8b8" shade="#d8a882" off={[-1, -1]} sw={2.4} />
      <Part id="bs-face" d={ell(74, 56, 20, 19)} fill="#f6d8b8" shade="#d8a882" off={[-4, -3]} />
      <Part id="bs-beard" d="M58 62Q60 90 70 104Q76 96 78 104Q86 92 90 62Q74 72 58 62Z" fill="#f4f4f0" shade="#c8c8d0" off={[-3, -2]} sw={2.6}>
        <path d="M66 72Q70 88 72 98M80 72Q80 86 78 96" stroke="#d8d8e0" strokeWidth="2" fill="none" />
      </Part>
      <g className="enemy-eyes">
        <path d="M62 54Q66 50 70 54M78 54Q82 50 86 54" stroke={OL} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </g>
      <path d="M58 46Q64 42 70 46M78 46Q84 42 90 46" stroke="#f4f4f0" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <Blush x={60} y={60} rx={3.4} ry={1.8} />
      <Part id="bs-hat" d="M36 44Q74 6 114 44Q104 50 74 48Q44 50 36 44Z" fill="#e8c878" shade="#b8944a" off={[-3, -2]}>
        <path d="M74 12L52 44M74 12L74 48M74 12L96 44" stroke="#c8a458" strokeWidth="2" />
      </Part>
      {[
        [112, 30, 20],
        [124, 70, -30],
        [18, 30, 40],
      ].map(([x, y, r]) => (
        <path key={x} d={`M${x} ${y}q8 -6 14 -2q-6 8 -14 2Z`} fill="#8fd16a" stroke={OL} strokeWidth="1.8" transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ Coastal Ruins
export function CrabQueen() {
  return (
    <svg viewBox="0 0 150 120" className="sprite-svg" aria-hidden="true">
      <Stick d="M44 92L24 112M54 98L40 116M100 92L122 112M92 98L108 116" color="#d8503a" w={4.5} />
      <Stick d="M62 52L58 32M86 52L90 32" color="#d8503a" w={4} />
      <Part id="cq-eyel" d={ell(58, 28, 8, 8)} fill="#fff" shade="#e0e0e8" off={[-1, -1]} sw={2.6} />
      <Part id="cq-eyer" d={ell(90, 28, 8, 8)} fill="#fff" shade="#e0e0e8" off={[-1, -1]} sw={2.6} />
      <g className="enemy-eyes">
        <circle cx="56" cy="29" r="4.2" fill="#2a1a3a" />
        <circle cx="88" cy="29" r="4.2" fill="#2a1a3a" />
        <circle cx="54.6" cy="27.4" r="1.6" fill="#fff" />
        <circle cx="86.6" cy="27.4" r="1.6" fill="#fff" />
      </g>
      <Crown id="cq-crown" cx={74} y={22} w={26} jewel="#5ac8ff" />
      <Part id="cq-body" d="M28 74Q30 46 74 44Q118 46 120 74Q118 100 74 102Q30 100 28 74Z" fill="#ec6a4a" shade="#b03a2a" off={[-7, -6]}>
        <path d="M40 80Q74 94 108 80" stroke="#ffb08a" strokeWidth="3" fill="none" />
        <Gloss d="M40 62Q50 52 64 50" color="#ffb08a" w={4} />
      </Part>
      {[52, 64, 76, 88, 100].map((x, i) => (
        <circle key={x} cx={x} cy={86 + (i % 2) * 2} r="3.4" fill="#fff6ee" stroke={OL} strokeWidth="1.6" />
      ))}
      <path d="M64 70Q74 76 84 70" stroke={OL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <Stick d="M32 70Q18 64 16 52" color="#ec6a4a" w={7} />
      <Part id="cq-claw" d="M16 54Q0 46 4 26Q14 20 22 30L16 38Q24 40 28 32Q34 46 16 54Z" fill="#ec6a4a" shade="#b03a2a" off={[-2, -2]} />
      <Stick d="M116 70Q128 62 130 54" color="#ec6a4a" w={6} />
      <Part id="cq-claw2" d="M130 56Q146 50 144 36Q136 30 130 38L134 44Q126 44 124 40Q120 52 130 56Z" fill="#ec6a4a" shade="#b03a2a" off={[-2, -2]} />
    </svg>
  );
}

export function JellyfishEmpress() {
  const bell = 'M22 66Q22 18 70 16Q118 18 118 66Q108 74 96 68Q84 76 70 68Q56 76 44 68Q32 74 22 66Z';
  return (
    <svg viewBox="0 0 140 150" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        {[34, 50, 66, 82, 98].map((x, i) => (
          <Stick key={x} d={`M${x} 70q${i % 2 ? 8 : -8} 18 0 34q${i % 2 ? -8 : 8} 16 0 34`} color={i % 2 ? '#c89aff' : '#ff9ad8'} w={4} />
        ))}
        <Part id="je-bell" d={bell} fill="#d8a8ff" shade="#9a6ad8" off={[-6, -6]}>
          <ellipse cx="64" cy="38" rx="26" ry="14" fill="#ecd4ff" />
          <Gloss d="M34 48Q36 32 50 24" color="#ffffff" w={4.5} />
          {[38, 70, 100].map((x) => (
            <circle key={x} cx={x} cy={58} r="3" fill="#ff9ad8" />
          ))}
        </Part>
        <Crown id="je-tiara" cx={70} y={20} w={30} jewel="#ff5aa8" />
        <Eyes x1={58} x2={80} y={46} r={5.6} iris="#7a3ad8" glow="#ff9ad8" />
        <path d="M64 58Q69 61 74 58" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Blush x={48} y={56} rx={4} ry={2} />
        <Blush x={90} y={56} rx={4} ry={2} />
      </g>
    </svg>
  );
}

export function OctopusCaptain() {
  return (
    <svg viewBox="0 0 140 150" className="sprite-svg" aria-hidden="true">
      {[
        'M40 112Q20 128 22 142Q34 144 36 132',
        'M56 118Q50 140 62 146Q70 140 64 130',
        'M84 118Q92 140 80 146Q72 140 78 130',
        'M100 112Q122 126 118 142Q106 144 104 132',
      ].map((d) => (
        <Stick key={d} d={d} color="#9a5ad8" w={11} />
      ))}
      <Part id="oc-head" d="M28 86Q22 34 70 30Q118 34 112 86Q108 122 70 122Q32 122 28 86Z" fill="#a86ae8" shade="#6a3aa8" off={[-7, -6]}>
        {[
          [44, 98, 4],
          [96, 100, 5],
          [88, 54, 3.4],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} fill="#c89aff" />
        ))}
        <Gloss d="M38 70Q40 52 52 44" color="#d8b8ff" w={4.5} />
      </Part>
      <Part id="oc-hat" d="M26 40Q46 18 70 22Q94 18 114 40Q100 46 70 42Q40 46 26 40Z" fill="#3a3044" shade="#1c1622" off={[-2, -2]}>
        <path d="M30 38Q70 30 110 38" stroke="#ffcf4a" strokeWidth="2.6" fill="none" />
      </Part>
      <path d="M64 30l6 -6 6 6 -6 6Z" fill="#fff" stroke={OL} strokeWidth="1.8" />
      <Eyes x1={56} x2={82} y={74} r={6.2} iris="#c98a00" glow="#ffe04a" angry />
      <path d="M76 66L90 64M78 70Q82 82 90 78" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M62 92Q69 97 76 92" stroke={OL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <Stick d="M30 96Q12 92 10 78" color="#9a5ad8" w={8} />
      <Part id="oc-blade" d="M10 80Q4 54 14 36Q18 56 16 80Z" fill="#dfe6f0" shade="#8f9aae" off={[-1, -1]} sw={2.4} />
      <path d="M4 80H22" stroke={OL} strokeWidth="5" strokeLinecap="round" />
      <path d="M4 80H22" stroke="#ffcf4a" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ Earthen Caves
export function StoneKing() {
  return (
    <svg viewBox="0 0 150 150" className="sprite-svg" aria-hidden="true">
      <Part id="sk-ll" d="M44 148Q38 124 50 118Q64 116 66 148Z" fill="#8f88a6" shade="#5a5474" off={[-3, -2]} />
      <Part id="sk-lr" d="M88 148Q86 118 100 118Q114 122 108 148Z" fill="#8f88a6" shade="#5a5474" off={[-3, -2]} />
      <Part id="sk-ar" d="M126 112Q144 86 128 66Q114 74 114 108Z" fill="#9f98b6" shade="#5a5474" off={[-3, -2]} />
      <Part id="sk-body" d="M34 120Q22 72 52 58Q76 48 102 58Q130 72 120 120Q76 134 34 120Z" fill="#a9a2be" shade="#666082" off={[-8, -7]}>
        <path d="M48 70L62 64L58 78Z M94 90L104 86L102 96Z" fill="#cfc9dc" />
        <path d="M58 92Q76 104 96 92" stroke="#5a5474" strokeWidth="3" fill="none" />
        <path d="M68 76l8 -9 8 9 -8 9Z" fill="#5af0ff" stroke={OL} strokeWidth="2" />
      </Part>
      <Part id="sk-beard" d="M56 64Q60 92 76 98Q92 92 96 64Q76 72 56 64Z" fill="#6aa85a" shade="#3f7a3a" off={[-2, -2]} sw={2.8}>
        <path d="M66 72Q70 86 74 92M84 72Q84 84 82 92" stroke="#4f8a46" strokeWidth="2" fill="none" />
      </Part>
      <Part id="sk-head" d="M50 46Q48 22 76 20Q104 22 102 46Q102 66 76 68Q50 66 50 46Z" fill="#b9b3c8" shade="#736c8a" off={[-5, -4]} />
      <GlowEyes x1={64} x2={88} y={44} rx={6} ry={4.4} color="#ffcf4a" core="#fff6d0" />
      <path d="M58 34L70 37M94 34L82 37" stroke={OL} strokeWidth="3.4" strokeLinecap="round" />
      {/* crystal crown: rounded gems */}
      {[
        [62, 22, 7, '#9a7aff'],
        [76, 16, 9, '#5af0ff'],
        [90, 22, 7, '#ff8ad8'],
      ].map(([x, y, r, c]) => (
        <Part key={x} id={`sk-gem${x}`} d={`M${x - r * 0.7} ${y + r}Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.3}Q${x + r} ${y - r * 0.2} ${x + r * 0.7} ${y + r}Z`} fill={c} shade="#4a3a8a" off={[-1.5, -1.5]} sw={2.4} />
      ))}
      <Part id="sk-al" d="M24 112Q6 88 22 66Q36 72 36 108Z" fill="#b9b3c8" shade="#5a5474" off={[-3, -2]}>
        <path d="M14 84L24 78" stroke="#d6d1e2" strokeWidth="3" strokeLinecap="round" />
      </Part>
      <Part id="sk-fist" d={ell(24, 114, 14, 12)} fill="#a9a2be" shade="#5a5474" off={[-2, -2]} />
    </svg>
  );
}

export function MoleMiner() {
  return (
    <svg viewBox="0 0 140 140" className="sprite-svg" aria-hidden="true">
      <Stick d="M40 120L26 52" color="#8a5a32" w={5} />
      <Part id="mo-pick" d="M8 58Q24 40 46 44Q30 50 24 60Q16 56 8 58Z" fill="#b8c0d0" shade="#6f7790" off={[-1, -1]} sw={2.6} />
      <Part id="mo-fl" d={ell(54, 132, 14, 7)} fill="#f2a8b8" shade="#c87888" off={[-2, -2]} />
      <Part id="mo-fr" d={ell(90, 132, 14, 7)} fill="#f2a8b8" shade="#c87888" off={[-2, -2]} />
      <Part id="mo-body" d="M30 104Q28 60 72 54Q116 60 114 104Q110 132 72 132Q34 132 30 104Z" fill="#7a5a4a" shade="#4a3428" off={[-7, -6]}>
        <ellipse cx="72" cy="110" rx="24" ry="18" fill="#a8846a" />
        <path d="M46 86Q72 96 98 86" stroke="#3a6aa8" strokeWidth="9" />
        <path d="M58 82L58 96M86 82L86 96" stroke="#ffcf4a" strokeWidth="2.6" />
      </Part>
      <Part id="mo-hand" d="M40 104Q24 106 22 116Q30 124 42 116Z" fill="#f2a8b8" shade="#c87888" off={[-1, -1]} sw={2.6}>
        <path d="M24 112L30 114M26 118L32 118" stroke="#c87888" strokeWidth="1.6" />
      </Part>
      <Part id="mo-head" d={ell(68, 50, 28, 24)} fill="#8a6a58" shade="#5a4232" off={[-5, -4]} />
      <Part id="mo-snout" d="M44 56Q30 56 30 64Q32 72 46 68Z" fill="#a8846a" shade="#7a5a48" off={[-1, -1]} sw={2.6} />
      <Part id="mo-nose" d={ell(30, 62, 6, 5)} fill="#ff8aa8" shade="#d85a7a" off={[-1, -1]} sw={2.4} />
      <Eyes x1={54} x2={72} y={50} r={4} iris="#3a2a1a" glow="#8a6a4a" />
      <path d="M44 72Q50 75 56 72" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Part id="mo-helm" d="M40 36Q42 12 70 12Q98 12 98 36Q70 30 40 36Z" fill="#ffcf4a" shade="#c98a1a" off={[-2, -2]}>
        <path d="M44 34Q70 28 96 34" stroke="#fff3b0" strokeWidth="2" fill="none" />
      </Part>
      <Part id="mo-lamp" d={ell(58, 22, 7, 7)} fill="#fff6c4" shade="#e8d27a" off={[-1, -1]} sw={2.4} />
    </svg>
  );
}

export function CrystalSpider() {
  return (
    <svg viewBox="0 0 150 120" className="sprite-svg" aria-hidden="true">
      {[
        'M54 76Q30 58 16 74Q10 88 6 108',
        'M60 84Q40 78 28 92Q24 104 22 116',
        'M92 84Q112 78 124 92Q128 104 130 116',
        'M98 76Q122 58 136 74Q142 88 146 108',
      ].map((d) => (
        <Stick key={d} d={d} color="#4a3a6a" w={5} />
      ))}
      <Part id="cs-abd" d={ell(104, 64, 34, 28)} fill="#4a3a6a" shade="#251a3a" off={[-6, -5]}>
        <Gloss d="M80 56Q86 44 98 40" color="#6a5a9a" w={4} />
      </Part>
      {[
        [96, 40, 8, '#9a7aff'],
        [110, 34, 10, '#5af0ff'],
        [124, 44, 7, '#ff8ad8'],
      ].map(([x, y, r, c]) => (
        <Part key={x} id={`cs-gem${x}`} d={`M${x - r * 0.7} ${y + r}Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.4}Q${x + r} ${y - r * 0.2} ${x + r * 0.7} ${y + r}Z`} fill={c} shade="#4a3a8a" off={[-1.5, -1.5]} sw={2.4}>
          <path d={`M${x - r * 0.2} ${y + r * 0.6}L${x - r * 0.1} ${y - r * 0.6}`} stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        </Part>
      ))}
      <Part id="cs-head" d={ell(56, 74, 26, 22)} fill="#5a4a7a" shade="#2e2248" off={[-5, -4]} />
      <Eyes x1={46} x2={64} y={72} r={5.4} iris="#c23a5a" glow="#ff8aa8" angry />
      <circle cx="40" cy="62" r="2.6" fill="#ff8aa8" stroke={OL} strokeWidth="1.4" />
      <circle cx="70" cy="62" r="2.6" fill="#ff8aa8" stroke={OL} strokeWidth="1.4" />
      <path d="M48 88Q50 94 52 88M58 88Q60 94 62 88" stroke={OL} strokeWidth="2.2" fill="#fff" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ Frozen Mountain
export function SnowMaiden() {
  return (
    <svg viewBox="0 0 120 150" className="sprite-svg" aria-hidden="true">
      <g className="wisp-body">
        <Part id="smd-hairb" d="M30 50Q24 100 36 128Q50 120 60 130Q72 120 84 128Q96 100 90 50Z" fill="#dce8ff" shade="#9ab4e0" off={[-4, -2]} />
        <Part id="smd-robe" d="M38 76Q60 66 82 76L96 140Q80 132 70 146Q60 134 50 146Q40 132 24 140Z" fill="#bfe0ff" shade="#7aa8d8" off={[-5, -4]}>
          <path d="M60 72L60 140" stroke="#ffffff" strokeWidth="3" />
          <path d="M40 98Q60 106 80 98" stroke="#4fa8e8" strokeWidth="5" />
          <path d="M44 120l4 4M74 116l4 4" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </Part>
        <Stick d="M40 86Q26 96 22 108" color="#bfe0ff" w={7} />
        <Part id="smd-hand" d={ell(22, 109, 5, 5)} fill="#f4f8ff" shade="#c8d8ec" off={[-1, -1]} sw={2.4} />
        <circle cx="14" cy="100" r="5" fill="#e8fbff" stroke={OL} strokeWidth="1.8" />
        <Part id="smd-face" d={ell(60, 50, 22, 21)} fill="#f4f8ff" shade="#c8d8ec" off={[-4, -3]} />
        <Part id="smd-bangs" d="M36 52Q34 24 60 24Q86 24 84 52Q78 38 66 40Q62 32 56 40Q44 38 36 52Z" fill="#e8f0ff" shade="#a8c0e8" off={[-2, -2]} />
        <path d="M84 30l6 -6M87 27l6 6M84 24l9 9" stroke="#4fa8e8" strokeWidth="2.4" strokeLinecap="round" />
        <Eyes x1={51} x2={68} y={54} r={4.8} iris="#2a6ac8" glow="#7ad8ff" />
        <path d="M56 64Q59.5 66 63 64" stroke={OL} strokeWidth="2" fill="none" strokeLinecap="round" />
        <Blush x={44} y={61} rx={3.4} ry={1.7} color="#b8d4ff" />
        <Blush x={75} y={61} rx={3.4} ry={1.7} color="#b8d4ff" />
      </g>
    </svg>
  );
}

export function Yeti() {
  return (
    <svg viewBox="0 0 150 150" className="sprite-svg" aria-hidden="true">
      <Part id="ye-fl" d={ell(54, 142, 16, 8)} fill="#9fb4c8" shade="#6a809a" off={[-2, -2]} />
      <Part id="ye-fr" d={ell(98, 142, 16, 8)} fill="#9fb4c8" shade="#6a809a" off={[-2, -2]} />
      <Part id="ye-ar" d="M118 68Q146 90 136 126Q124 130 118 118Q122 96 106 82Z" fill="#f4f8fc" shade="#b4c8dc" off={[-3, -2]} />
      <Part id="ye-body" d="M36 70Q40 40 76 38Q112 40 116 72Q122 112 110 136Q76 148 42 136Q30 112 36 70Z" fill="#f4f8fc" shade="#b4c8dc" off={[-8, -7]}>
        {[
          [48, 96],
          [62, 120],
          [96, 104],
          [86, 130],
        ].map(([x, y]) => (
          <path key={x} d={`M${x} ${y}q4 -6 8 0`} stroke="#c8d8ec" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        ))}
      </Part>
      <Part id="ye-face" d="M50 56Q50 40 72 40Q94 40 94 56Q94 78 72 80Q50 78 50 56Z" fill="#7fa8d8" shade="#4f78a8" off={[-3, -3]} />
      <Part id="ye-hornl" d="M50 34Q38 24 42 12Q50 22 58 28Z" fill="#e8dcc0" shade="#b8a880" off={[-1, -1]} sw={2.4} />
      <Part id="ye-hornr" d="M92 32Q104 22 102 10Q94 20 86 26Z" fill="#e8dcc0" shade="#b8a880" off={[-1, -1]} sw={2.4} />
      <Eyes x1={62} x2={82} y={56} r={5} iris="#c23a3a" glow="#ff8a6a" angry brow="#f4f8fc" />
      <path d="M60 70Q72 64 84 70Q72 78 60 70Z" fill="#3a2a4a" stroke={OL} strokeWidth="2" />
      <path d="M64 69L66 73L68 68.6ZM76 68.6L78 73L80 69Z" fill="#fff" />
      <Part id="ye-al" d="M38 70Q10 88 18 124Q30 130 36 118Q30 96 46 84Z" fill="#f4f8fc" shade="#b4c8dc" off={[-3, -2]} />
      <Part id="ye-fist" d={ell(24, 124, 12, 10)} fill="#7fa8d8" shade="#4f78a8" off={[-2, -2]} />
    </svg>
  );
}

export function FrostFox() {
  return (
    <svg viewBox="0 0 150 120" className="sprite-svg" aria-hidden="true">
      {/* three plump fox tails with icy tips */}
      {[
        ['M98 72Q112 40 136 28Q150 38 140 56Q124 70 102 80Z', 138, 38],
        ['M100 78Q128 60 146 64Q152 80 136 88Q118 92 102 86Z', 142, 74],
        ['M98 84Q118 94 136 106Q132 120 116 114Q102 106 96 90Z', 128, 110],
      ].map(([d, tx, ty], i) => (
        <Part key={i} id={`ff-tail${i}`} d={d} fill="#eaf6ff" shade="#9ac8ec" off={[-3, -3]} sw={3}>
          <circle cx={tx} cy={ty} r="11" fill="#7ad8ff" />
          <circle cx={tx - 3} cy={ty - 3} r="4" fill="#c8f0ff" />
        </Part>
      ))}
      <Stick d="M52 92L48 114M68 94L68 116M86 92L90 114M100 88L106 112" color="#eaf6ff" w={6} />
      <Part id="ff-body" d="M40 82Q44 58 74 58Q104 58 106 82Q104 100 74 100Q44 100 40 82Z" fill="#eaf6ff" shade="#9ac8ec" off={[-5, -4]}>
        <path d="M52 66Q60 62 66 66M76 64Q84 60 90 64" stroke="#7ad8ff" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Part>
      <Part id="ff-earl" d="M32 38L34 12L48 30Z" fill="#eaf6ff" shade="#9ac8ec" off={[-1, -1]} sw={2.6}>
        <path d="M35 32L36 19L43 29Z" fill="#7ad8ff" />
      </Part>
      <Part id="ff-earr" d="M52 30L64 10L66 34Z" fill="#eaf6ff" shade="#9ac8ec" off={[-1, -1]} sw={2.6}>
        <path d="M56 29L62 18L63 31Z" fill="#7ad8ff" />
      </Part>
      <Part id="ff-head" d={ell(48, 48, 22, 19)} fill="#eaf6ff" shade="#9ac8ec" off={[-4, -3]}>
        <path d="M28 56Q16 58 14 52Q24 46 32 48Z" fill="#ffffff" />
      </Part>
      <Part id="ff-snout" d="M30 50Q14 52 12 58Q22 64 34 60Z" fill="#ffffff" shade="#c8e0f4" off={[-1, -1]} sw={2.6} />
      <circle cx="12.5" cy="57" r="2.6" fill={OL} />
      <Eyes x1={40} x2={55} y={46} r={4.2} iris="#2a8ad8" glow="#7ad8ff" angry />
      <path d="M48 32l3 -6 3 6 -3 3Z" fill="#7ad8ff" stroke={OL} strokeWidth="1.6" />
    </svg>
  );
}

// ------------------------------------------------------------------ Thunder Highlands
export function ThunderQilin() {
  return (
    <svg viewBox="0 0 150 140" className="sprite-svg" aria-hidden="true">
      <Part id="tq-tail" d="M112 74Q140 60 144 80Q136 74 130 80Q140 92 126 96Q122 84 110 84Z" fill="#ffcf4a" shade="#c98a1a" off={[-1.5, -1.5]} sw={2.6} />
      <Stick d="M54 100L48 134M66 102L66 136M98 100L96 134M110 98L114 132" color="#3a62c0" w={6} />
      {[48, 66, 96, 114].map((x) => (
        <rect key={x} x={x - 5} y={130} width="10" height="7" rx="2.5" fill="#ffcf4a" stroke={OL} strokeWidth="2" />
      ))}
      <Part id="tq-body" d="M42 88Q44 64 80 64Q116 64 118 88Q116 108 80 108Q44 108 42 88Z" fill="#5a8cf0" shade="#2a4fa8" off={[-6, -5]}>
        {[
          [62, 82],
          [76, 78],
          [90, 82],
          [70, 94],
          [86, 96],
          [100, 90],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={`M${x - 5} ${y}q5 6 10 0`} stroke="#a8c8ff" strokeWidth="2.2" fill="none" />
        ))}
      </Part>
      <Part id="tq-mane" d="M44 74Q30 60 40 44Q48 52 54 46Q54 60 64 66Z" fill="#ffcf4a" shade="#c98a1a" off={[-1.5, -1.5]} sw={2.6} />
      <Part id="tq-neck" d="M40 82Q30 62 34 46L52 46Q56 66 60 76Z" fill="#5a8cf0" shade="#2a4fa8" off={[-2, -2]} />
      <Part id="tq-head" d="M16 46Q14 30 34 26Q52 26 54 42Q52 56 36 58Q24 60 16 54Z" fill="#6a98f4" shade="#3a62c0" off={[-3, -3]}>
        <path d="M14 50Q20 48 26 52" stroke={OL} strokeWidth="2" fill="none" />
      </Part>
      {/* rounded antlers */}
      <Stick d="M34 28Q30 14 38 6M34 18Q26 14 22 18M46 28Q50 14 60 10M50 18Q58 20 60 24" color="#ffcf4a" w={3.6} />
      <Part id="tq-beard" d="M18 56Q14 66 20 70Q24 64 28 58Z" fill="#ffcf4a" shade="#c98a1a" off={[-1, -1]} sw={2.2} />
      <Eyes x1={28} x2={42} y={40} r={4.4} iris="#c98a00" glow="#ffe04a" angry />
      <path d="M36 72L28 86L36 86L30 100" stroke="#ffe14a" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ThunderDrummer() {
  return (
    <svg viewBox="0 0 150 150" className="sprite-svg" aria-hidden="true">
      {/* the drum ring behind him */}
      <path d="M26 78Q22 18 76 14Q130 18 126 78" stroke={OL} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M26 78Q22 18 76 14Q130 18 126 78" stroke="#c23a35" strokeWidth="5" fill="none" strokeLinecap="round" />
      {[
        [28, 70],
        [36, 36],
        [62, 16],
        [92, 16],
        [116, 36],
        [124, 70],
      ].map(([x, y]) => (
        <Part key={`${x}${y}`} id={`td-drum${x}${y}`} d={ell(x, y, 10, 10)} fill="#ffcf4a" shade="#c98a1a" off={[-1.5, -1.5]} sw={2.6}>
          <circle cx={x} cy={y} r="5" fill="#fff3d0" />
        </Part>
      ))}
      <Part id="td-wingl" d="M50 84Q22 72 16 96Q30 94 34 104Q42 92 52 98Z" fill="#8a66c8" shade="#5b3f8f" off={[0, -2]} sw={2.8} />
      <Part id="td-wingr" d="M102 84Q130 72 136 96Q122 94 118 104Q110 92 100 98Z" fill="#8a66c8" shade="#5b3f8f" off={[0, -2]} sw={2.8} />
      <Stick d="M62 126L56 146M90 126L96 146" color="#3a62c0" w={6} />
      <Part id="td-body" d="M50 96Q52 72 76 72Q100 72 102 96Q102 126 76 128Q50 126 50 96Z" fill="#5a8cf0" shade="#2a4fa8" off={[-5, -4]}>
        <path d="M50 108Q76 116 102 108L102 118Q76 126 50 118Z" fill="#ffcf4a" />
      </Part>
      <Stick d="M54 90Q38 88 30 76" color="#5a8cf0" w={7} />
      <Stick d="M30 78L18 60" color="#8a5a32" w={4} />
      <Part id="td-ham" d="M8 56Q8 48 16 48L26 48Q32 48 32 54L32 60Q32 66 26 66L16 66Q8 66 8 60Z" fill="#b8c0d0" shade="#6f7790" off={[-1, -1]} sw={2.6} />
      <Part id="td-head" d={ell(76, 56, 24, 22)} fill="#6a98f4" shade="#3a62c0" off={[-4, -3]} />
      <Part id="td-beak" d="M56 60Q42 62 40 70Q50 74 60 68Z" fill="#ffb347" shade="#d07a1a" off={[0, -1]} sw={2.4} />
      <Eyes x1={66} x2={84} y={52} r={5} iris="#c98a00" glow="#ffe04a" angry />
      <path d="M62 34Q70 26 76 34Q82 24 90 34" stroke="#ffe14a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CloudRam() {
  const puffs = [
    [48, 78, 18],
    [72, 68, 20],
    [98, 74, 19],
    [114, 92, 16],
    [86, 98, 20],
    [58, 100, 18],
  ];
  return (
    <svg viewBox="0 0 150 140" className="sprite-svg" aria-hidden="true">
      <Stick d="M56 110L52 134M74 112L74 136M96 110L98 134M110 104L116 128" color="#3a3e50" w={6} />
      {puffs.map(([x, y, r]) => (
        <path key={`o${x}`} d={ell(x, y, r, r)} fill="none" stroke={OL} strokeWidth="6.8" />
      ))}
      {puffs.map(([x, y, r]) => (
        <path key={`f${x}`} d={ell(x, y, r, r)} fill="#9aa2b8" />
      ))}
      {puffs.map(([x, y, r]) => (
        <ellipse key={`h${x}`} cx={x - r * 0.25} cy={y - r * 0.3} rx={r * 0.6} ry={r * 0.5} fill="#c8cee0" />
      ))}
      <path d="M66 112L60 124L68 124L62 136" stroke="#ffe14a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Part id="cr-head" d="M22 62Q20 42 40 40Q58 40 58 58Q58 76 42 80Q26 80 22 62Z" fill="#3a3e50" shade="#22242f" off={[-3, -3]} />
      <Part id="cr-horn" d="M44 40Q60 24 72 38Q78 52 64 58Q56 58 58 50Q66 48 62 42Q56 38 50 46Z" fill="#ffcf4a" shade="#c98a1a" off={[-1.5, -1.5]} sw={2.6}>
        <path d="M54 36Q62 36 66 42" stroke="#fff3b0" strokeWidth="1.8" fill="none" />
      </Part>
      <GlowEyes x1={30} x2={44} y={58} rx={4.4} ry={3} color="#ffe14a" core="#fff6d0" />
      <path d="M26 72Q30 74 34 72" stroke="#9aa2b8" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ Shadow Marsh
export function BogWitch() {
  return (
    <svg viewBox="0 0 130 150" className="sprite-svg" aria-hidden="true">
      <Stick d="M22 146L30 46" color="#6a4a2e" w={5} />
      <Part id="bw-orb" d={ell(30, 40, 9, 9)} fill="#9aff7a" shade="#4fb04a" off={[-1.5, -1.5]} sw={2.6}>
        <circle cx="27" cy="37" r="3" fill="#e8ffd8" />
      </Part>
      <Part id="bw-robe" d="M44 74Q70 64 92 78L108 144Q74 150 36 144Z" fill="#5a3f8a" shade="#2f1f52" off={[-6, -4]}>
        <path d="M44 128Q50 136 56 128Q62 136 68 128Q74 136 80 128Q86 136 92 128Q98 136 104 128" stroke="#3f2a66" strokeWidth="3" fill="none" />
        <path d="M60 80L64 120" stroke="#7a5aaa" strokeWidth="3" />
      </Part>
      <Stick d="M50 88Q38 84 32 76" color="#5a3f8a" w={8} />
      <Part id="bw-hand" d={ell(31, 74, 5.4, 5.4)} fill="#a8d88a" shade="#6aa858" off={[-1, -1]} sw={2.4} />
      <Part id="bw-face" d={ell(70, 60, 20, 19)} fill="#a8d88a" shade="#6aa858" off={[-4, -3]} />
      <Part id="bw-nose" d="M52 60Q38 66 44 72Q52 70 56 66Z" fill="#a8d88a" shade="#6aa858" off={[-1, -1]} sw={2.4} />
      <circle cx="47" cy="68" r="2" fill="#6aa858" stroke={OL} strokeWidth="1" />
      <Part id="bw-hair" d="M82 56Q96 74 92 96Q86 84 80 82Z" fill="#c8c8d8" shade="#8a8aa0" off={[-1, -1]} sw={2.4} />
      <Eyes x1={62} x2={77} y={57} r={4.4} iris="#c8ff3a" glow="#ffffff" angry />
      <path d="M58 72Q64 76 72 72" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Part id="bw-brim" d="M36 46Q70 34 104 46Q96 52 70 50Q44 52 36 46Z" fill="#3a2a5a" shade="#1c1230" off={[-1, -1]} sw={2.8} />
      <Part id="bw-hat" d="M50 44Q56 18 72 10Q84 4 96 14Q86 14 82 22Q86 34 90 44Q70 48 50 44Z" fill="#3a2a5a" shade="#1c1230" off={[-2, -2]}>
        <path d="M52 38Q70 42 88 38" stroke="#9aff7a" strokeWidth="3" fill="none" />
      </Part>
    </svg>
  );
}

export function MoneyToad() {
  return (
    <svg viewBox="0 0 150 130" className="sprite-svg" aria-hidden="true">
      <Part id="mt-legr" d="M104 96Q136 96 136 120Q120 126 100 120Z" fill="#7ab05a" shade="#4a7a3a" off={[-2, -2]} />
      <Part id="mt-body" d="M24 92Q22 50 76 46Q126 48 126 92Q124 122 76 124Q26 122 24 92Z" fill="#8fc46a" shade="#557f40" off={[-8, -7]}>
        <ellipse cx="64" cy="104" rx="30" ry="16" fill="#f0e6a8" />
        {[
          [92, 64, 5],
          [108, 80, 4],
          [100, 98, 4.4],
          [80, 58, 3.4],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} fill="#ffcf4a" stroke="#c98a1a" strokeWidth="1.6" />
        ))}
      </Part>
      <Part id="mt-legl" d="M44 104Q14 108 16 124Q32 128 52 120Z" fill="#7ab05a" shade="#4a7a3a" off={[-2, -2]} />
      <Part id="mt-eyel" d={ell(44, 48, 13, 12)} fill="#8fc46a" shade="#557f40" off={[-2, -2]} />
      <Part id="mt-eyer" d={ell(74, 42, 13, 12)} fill="#8fc46a" shade="#557f40" off={[-2, -2]} />
      <Eyes x1={44} x2={74} y={48} r={6} iris="#c23a1a" glow="#ffb03a" angry />
      <path d="M26 74Q56 90 92 72" stroke={OL} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* the coin in its mouth */}
      <Part id="mt-coin" d={ell(30, 80, 13, 13)} fill="#ffcf4a" shade="#c98a1a" off={[-2, -2]} sw={2.8}>
        <rect x="26" y="76" width="8" height="8" rx="1" fill="#c98a1a" />
      </Part>
    </svg>
  );
}

export function WillowSpirit() {
  return (
    <svg viewBox="0 0 150 150" className="sprite-svg" aria-hidden="true">
      <Part id="ws-roots" d="M44 146Q50 130 60 126L94 126Q104 130 110 146Q96 140 88 146Q78 138 70 146Q60 140 44 146Z" fill="#6a5040" shade="#3a2a20" off={[-2, -2]} />
      <Part id="ws-trunk" d="M56 130Q50 90 58 60Q76 50 94 60Q104 90 98 130Z" fill="#7a5c48" shade="#45322a" off={[-6, -4]}>
        <path d="M66 74Q70 100 66 124M88 70Q84 98 90 124" stroke="#5a4232" strokeWidth="3" fill="none" />
      </Part>
      <Part id="ws-crown" d="M22 60Q20 18 76 14Q132 18 130 60Q120 72 100 64Q86 74 76 64Q64 74 52 64Q34 72 22 60Z" fill="#6a9a5a" shade="#3a5a32" off={[-6, -5]}>
        <Gloss d="M36 46Q44 30 62 24" color="#9ac88a" w={4} />
      </Part>
      {/* drooping branches with rounded leaves */}
      {[24, 40, 112, 128].map((x, i) => (
        <g key={x}>
          <Stick d={`M${x} 56Q${x + (i < 2 ? -6 : 6)} 84 ${x + (i < 2 ? -2 : 2)} ${108 + (i % 2) * 10}`} color="#5a8a4a" w={2.6} />
          {[72, 88, 102].map((y) => (
            <ellipse key={y} cx={x + (i < 2 ? -4 : 4)} cy={y + (i % 2) * 4} rx="3.4" ry="6" fill="#8fc46a" stroke={OL} strokeWidth="1.6" />
          ))}
        </g>
      ))}
      <path d="M62 92Q66 86 70 92M84 92Q88 86 92 92" fill="none" stroke={OL} strokeWidth="2" />
      <GlowEyes x1={66} x2={88} y={92} rx={6.4} ry={4.6} color="#c8ff7a" core="#f4ffe0" />
      <path d="M68 110Q77 104 86 110Q77 116 68 110Z" fill="#2a1a20" stroke={OL} strokeWidth="2" />
    </svg>
  );
}

// ------------------------------------------------------------------ Temple (elite guardian)
export function LanternKing() {
  return (
    <svg viewBox="0 0 120 150" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <ellipse cx="60" cy="80" rx="58" ry="58" fill="#ffd27a" opacity=".2" />
        <Stick d="M60 2L60 14" color="#7a5a3e" w={2.6} />
        <Stick d="M46 132L42 148M60 132L60 150M74 132L78 148" color="#ec4f54" w={3} />
        {/* pagoda roof with upturned, rounded eaves */}
        <Part id="lk-roof" d="M14 34Q30 30 40 20Q50 12 60 12Q70 12 80 20Q90 30 106 34Q100 40 92 36Q76 40 60 40Q44 40 28 36Q20 40 14 34Z" fill="#c23a35" shade="#8a2026" off={[-2, -2]}>
          <path d="M28 34Q60 26 92 34" stroke="#ffcf4a" strokeWidth="2.4" fill="none" />
        </Part>
        <Part id="lk-body" d="M22 82Q22 42 60 40Q98 42 98 82Q98 122 60 124Q22 122 22 82Z" fill="#ec4f54" shade="#a82a35" off={[-7, -5]}>
          <ellipse cx="58" cy="84" rx="24" ry="28" fill="#ffb36a" />
          <ellipse cx="56" cy="82" rx="14" ry="18" fill="#ffe0a0" />
          <path d="M36 46Q26 82 36 118M84 46Q94 82 84 118" stroke="#ffcf4a" strokeWidth="3" fill="none" />
        </Part>
        <Part id="lk-base" d="M36 120Q36 116 40 116L80 116Q84 116 84 120L84 128Q84 132 80 132L40 132Q36 132 36 128Z" fill="#ffcf4a" shade="#c98a1a" off={[-1, -1]} sw={2.6} />
        <Crown id="lk-crown" cx={60} y={14} w={22} />
        <Eyes x1={49} x2={70} y={78} r={5.2} iris="#7a2a1a" glow="#ff8a4a" angry />
        <path d="M52 94Q59.5 99 67 94" stroke={OL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
