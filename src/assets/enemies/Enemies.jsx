// Enemy sprites. All face left (toward the hero). Feet/base at the bottom of the viewBox.
// Each is self-contained so it can be swapped for a PNG/WebP/sprite sheet via the manifest.
// Drawn with the shared ink kit (ink.jsx) to match the heroes: thick outlines, cel shading.
import { OL, Part, Stick, Eyes, GlowEyes, Blush, Gloss, ell } from './ink.jsx';

export function Slime() {
  const body = 'M14 80Q4 58 24 41Q36 22 50 23Q55 8 64 19Q86 27 92 54Q97 75 87 81Q50 89 14 80Z';
  return (
    <svg viewBox="0 0 100 90" className="sprite-svg" aria-hidden="true">
      <Part id="sl-body" d={body} fill="#72dc5f" shade="#2f9a46" off={[-6, -5]}>
        <path d="M18 76Q50 82 88 74Q86 84 50 86Q20 84 18 76Z" fill="#2f9a46" />
        <ellipse cx="70" cy="70" rx="5" ry="4" fill="#4fbf50" />
        <ellipse cx="78" cy="58" rx="3" ry="2.6" fill="#4fbf50" />
        <ellipse cx="62" cy="34" rx="7" ry="5" fill="#a8f08a" />
        <Gloss d="M24 50Q28 37 40 32" color="#e8ffd6" w={5.5} />
        <circle cx="22" cy="60" r="2.6" fill="#e8ffd6" />
      </Part>
      <Eyes x1={38} x2={60} y={55} r={6.2} iris="#1f6b3a" glow="#5fd08a" />
      <path d="M44 66Q49 74 55 66Z" fill="#7a2a3a" stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M47 69Q49.5 71.5 52 69" fill="#ff8aa0" />
      <Blush x={28} y={66} />
      <Blush x={71} y={66} />
    </svg>
  );
}

export function Sporecap() {
  const cap = 'M6 58Q6 18 50 12Q94 18 94 58Q80 66 50 64Q20 66 6 58Z';
  return (
    <svg viewBox="0 0 100 110" className="sprite-svg" aria-hidden="true">
      <Part id="sp-fl" d={ell(37, 101, 10, 5.5)} fill="#9b6a4a" shade="#5e3a24" off={[-2, -2]} />
      <Part id="sp-fr" d={ell(63, 101, 10, 5.5)} fill="#9b6a4a" shade="#5e3a24" off={[-2, -2]} />
      <Part id="sp-stem" d="M31 58Q27 98 50 100Q73 98 69 58Z" fill="#fbe8cf" shade="#d6b48c" off={[-5, -3]}>
        <path d="M32 84Q50 92 68 84" stroke="#e6c9a2" strokeWidth="3" fill="none" />
      </Part>
      <Eyes x1={41} x2={59} y={77} r={5} iris="#5a3a2a" glow="#c98a5a" />
      <path d="M46 89Q50 85.5 54 89" stroke={OL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Blush x={33} y={86} rx={3.6} />
      <Blush x={67} y={86} rx={3.6} />
      <Part id="sp-cap" d={cap} fill="#ec4f54" shade="#a82a35" off={[-6, -6]}>
        <Gloss d="M18 34Q26 20 42 17" color="#ff9a8a" w={5} />
      </Part>
      <Part id="sp-gill" d="M10 59Q50 71 90 59Q88 67 50 69Q12 67 10 59Z" fill="#f3d2b0" shade="#c9a07a" off={[0, -2]} sw={2.6} />
      {[
        [30, 34, 7.5],
        [57, 25, 5.5],
        [76, 41, 6.5],
        [46, 47, 4],
        [14, 48, 3.5],
      ].map(([x, y, r]) => (
        <Part key={x} id={`sp-dot${x}`} d={ell(x, y, r, r * 0.86)} fill="#fff7ec" shade="#efd2bd" off={[-1.6, -1.6]} sw={2.4} />
      ))}
      <g className="spores" fill="#d6f07a" stroke={OL} strokeWidth="1.4">
        <circle cx="16" cy="76" r="2.4" />
        <circle cx="87" cy="78" r="2" />
        <circle cx="92" cy="66" r="1.6" />
      </g>
    </svg>
  );
}

export function Bat() {
  const wingL = 'M40 40Q24 13 4 26Q12 32 9 42Q17 37 19 49Q27 42 35 53Z';
  const wingR = 'M70 40Q86 13 106 26Q98 32 101 42Q93 37 91 49Q83 42 75 53Z';
  return (
    <svg viewBox="0 0 110 90" className="sprite-svg" aria-hidden="true">
      <g className="bat-body">
        <Part id="bt-wl" className="wing-l" d={wingL} fill="#6b4aa6" shade="#3b2766" off={[0, -3]}>
          <path d="M38 41L10 41M37 45L20 48" stroke="#3b2766" strokeWidth="2" />
        </Part>
        <Part id="bt-wr" className="wing-r" d={wingR} fill="#6b4aa6" shade="#3b2766" off={[0, -3]}>
          <path d="M72 41L100 41M73 45L90 48" stroke="#3b2766" strokeWidth="2" />
        </Part>
        <Part id="bt-el" d="M38 33Q33 22 37 13Q46 20 49 29Z" fill="#8a66c8" shade="#5b3f8f">
          <path d="M40 29Q38 23 39.5 18Q44 23 45 28Z" fill="#f29cc8" />
        </Part>
        <Part id="bt-er" d="M72 33Q77 22 73 13Q64 20 61 29Z" fill="#8a66c8" shade="#5b3f8f">
          <path d="M70 29Q72 23 70.5 18Q66 23 65 28Z" fill="#f29cc8" />
        </Part>
        <Part id="bt-body" d={ell(55, 46, 22, 20)} fill="#8a66c8" shade="#5b3f8f" off={[-4, -4]}>
          <ellipse cx="55" cy="57" rx="12" ry="9" fill="#c8b0ee" />
          <Gloss d="M39 38Q42 31 49 28" color="#b79ae6" w={4} />
        </Part>
        <Eyes x1={47} x2={63} y={43} r={4.8} iris="#c98a00" glow="#ffe04a" angry />
        <path d="M48 53Q55 57 62 53" stroke={OL} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M50 54L51.5 59L53 54.6ZM57 54.6L58.5 59L60 54Z" fill="#fff" stroke={OL} strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Goblin() {
  return (
    <svg viewBox="0 0 110 120" className="sprite-svg" aria-hidden="true">
      <Stick d="M15 112L23 32" color="#8a5a32" w={4.5} />
      <Part id="gb-tip" d="M23 33Q15 22 22 9Q30 22 23 33Z" fill="#b8c0d0" shade="#6f7790" off={[-2, -1]} sw={2.6} />
      <Part id="gb-fl" d={ell(45, 111, 10, 5.5)} fill="#5a3f2a" shade="#3a2618" off={[-2, -2]} />
      <Part id="gb-fr" d={ell(67, 111, 10, 5.5)} fill="#5a3f2a" shade="#3a2618" off={[-2, -2]} />
      <Part id="gb-tunic" d="M36 72Q56 63 76 72L83 108Q56 116 29 108Z" fill="#a07a48" shade="#6a4c28" off={[-5, -3]}>
        <path d="M29 102Q56 110 83 102L84 112L28 112Z" fill="#6a4c28" />
        <path d="M44 74L48 100M64 74L62 100" stroke="#7d5c34" strokeWidth="2" />
      </Part>
      <Part id="gb-belt" d="M34 84Q56 89 78 84L78 91Q56 96 34 91Z" fill="#4a3424" shade="#2e1f14" off={[0, -1]} sw={2.6}>
        <rect x="52" y="85" width="8" height="8" rx="1.5" fill="#ffcf5a" stroke={OL} strokeWidth="1.6" />
      </Part>
      <Stick d="M40 78Q28 80 23 85" color="#a07a48" w={8} />
      <Part id="gb-hand" d={ell(22, 85, 6, 6)} fill="#8fd16a" shade="#5fa548" off={[-1.5, -1.5]} />
      <Part id="gb-earl" d="M30 46Q6 44 3 30Q18 32 33 40Z" fill="#8fd16a" shade="#5fa548" off={[0, -2.5]}>
        <path d="M27 42Q14 40 9 33Q20 35 29 40Z" fill="#e88a8a" />
      </Part>
      <Part id="gb-earr" d="M82 46Q106 44 109 30Q94 32 79 40Z" fill="#8fd16a" shade="#5fa548" off={[0, -2.5]}>
        <path d="M85 42Q98 40 103 33Q92 35 83 40Z" fill="#e88a8a" />
      </Part>
      <Part id="gb-head" d={ell(56, 51, 26, 25)} fill="#8fd16a" shade="#5fa548" off={[-5, -4]}>
        <Gloss d="M36 58Q35 50 38 44" color="#bff09a" w={3.5} />
      </Part>
      <Part id="gb-hood" d="M29 47Q30 21 56 19Q82 21 83 47Q72 31 56 34Q40 31 29 47Z" fill="#6a4a2e" shade="#45301c" off={[-3, -3]}>
        <path d="M44 27Q50 24 58 24" stroke="#8a6a46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </Part>
      <Eyes x1={46} x2={65} y={53} r={5.4} iris="#b8322a" glow="#ff8a4a" angry />
      <Part id="gb-nose" d="M53 58Q56 55 59 58Q60 62 56 63Q52 62 53 58Z" fill="#7cc458" shade="#5fa548" off={[-1, -1]} sw={2} />
      <path d="M45 67Q56 63 67 67" stroke={OL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M50 65.3L52 70L54.2 64.6Z" fill="#fff" stroke={OL} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function Golem() {
  return (
    <svg viewBox="0 0 120 120" className="sprite-svg" aria-hidden="true">
      <Part id="gl-ll" d="M30 116Q24 100 34 95Q46 93 47 116Z" fill="#9790ad" shade="#5f5878" off={[-3, -2]} />
      <Part id="gl-lr" d="M73 116Q72 95 85 95Q97 100 91 116Z" fill="#9790ad" shade="#5f5878" off={[-3, -2]} />
      <Part id="gl-ar" d="M106 92Q115 72 102 61Q91 66 93 90Z" fill="#9790ad" shade="#5f5878" off={[-3, -2]} />
      <Part id="gl-body" d="M26 98Q17 60 40 50Q60 41 82 50Q103 60 96 98Q60 109 26 98Z" fill="#b9b3c8" shade="#736c8a" off={[-7, -6]}>
        <path d="M36 60L48 56L46 66Z" fill="#d6d1e2" />
        <path d="M44 70L54 78L48 88M78 66L70 76L74 84" stroke={OL} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M58 63L64 71L58 79L52 71Z" fill="#5af0ff" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M56.5 67L58 65L60 68Z" fill="#e8ffff" />
      </Part>
      <Part id="gl-al" d="M14 92Q5 72 18 61Q29 66 27 90Z" fill="#a9a2be" shade="#5f5878" off={[-3, -2]}>
        <path d="M12 74L20 70" stroke="#d6d1e2" strokeWidth="3" strokeLinecap="round" />
      </Part>
      <Part id="gl-head" d="M37 34Q35 13 60 11Q85 13 83 34Q85 53 60 55Q35 53 37 34Z" fill="#b9b3c8" shade="#736c8a" off={[-5, -4]}>
        <path d="M44 22L52 18L50 25Z" fill="#d6d1e2" />
      </Part>
      <Part id="gl-moss" d="M39 22Q48 8 67 12Q59 18 55 25Q46 20 39 22ZM70 15Q82 17 83 29Q75 24 70 15Z" fill="#7cc46a" shade="#4f9a48" off={[-1.5, -1.5]} sw={2.6} />
      <circle cx="45" cy="17" r="3" fill="#ffb0c8" stroke={OL} strokeWidth="1.5" />
      <GlowEyes x1={50} x2={70} y={34} rx={5.4} ry={4.2} color="#5af0ff" />
      <path d="M50 45L70 45" stroke={OL} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wisp() {
  const body = 'M20 64Q16 24 50 10Q44 26 58 22Q66 6 76 16Q96 32 90 64Q88 86 74 96Q72 108 62 104Q56 114 48 104Q36 110 36 96Q20 86 20 64Z';
  return (
    <svg viewBox="0 0 110 120" className="sprite-svg" aria-hidden="true">
      <ellipse cx="55" cy="62" rx="48" ry="48" fill="#9f7bff" opacity=".16" />
      <Part id="wp-body" className="wisp-body" d={body} fill="#a98aff" shade="#5b3fc4" off={[-7, -6]}>
        <ellipse cx="50" cy="56" rx="22" ry="26" fill="#cbb6ff" />
        <ellipse cx="46" cy="50" rx="11" ry="13" fill="#ece2ff" />
        <Gloss d="M28 52Q28 36 40 26" color="#f4eeff" w={4.5} />
      </Part>
      <g className="enemy-eyes">
        {[44, 66].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="60" rx="6" ry="8.5" fill="#1d1238" />
            <circle cx={x - 2} cy="56.5" r="2.4" fill="#fff" />
          </g>
        ))}
      </g>
      <path d="M48 79Q55 75 62 79Q55 86 48 79Z" fill="#1d1238" stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
      <g fill="#d9c8ff" stroke={OL} strokeWidth="1.5">
        <circle cx="12" cy="40" r="3.2" />
        <circle cx="98" cy="88" r="2.6" />
        <circle cx="99" cy="30" r="2.2" />
      </g>
    </svg>
  );
}

export function Knight() {
  return (
    <svg viewBox="0 0 120 130" className="sprite-svg" aria-hidden="true">
      <Part id="kn-fl" d={ell(46, 121, 11, 6)} fill="#2a4a52" shade="#132a30" off={[-2, -2]} />
      <Part id="kn-fr" d={ell(75, 121, 11, 6)} fill="#2a4a52" shade="#132a30" off={[-2, -2]} />
      <Part id="kn-cape" d="M60 30Q101 34 104 80Q105 110 88 118Q92 80 60 60Z" fill="#3fb7a2" shade="#1f5f63" off={[-5, -3]}>
        <path d="M70 40Q92 50 96 80" stroke="#8fe8d2" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Part>
      {[
        [86, 42],
        [98, 60],
        [102, 82],
        [97, 102],
      ].map(([x, y]) => (
        <Part key={y} id={`kn-nub${y}`} d={ell(x, y, 4.2, 4.2)} fill="#a6f0d9" shade="#5fbfa6" off={[-1.2, -1.2]} sw={2.4} />
      ))}
      <Part id="kn-body" d="M34 72Q60 62 86 72L90 117Q60 126 30 117Z" fill="#35918a" shade="#1f5f63" off={[-5, -3]}>
        <path d="M32 94Q60 102 88 94" stroke="#1f5f63" strokeWidth="3" fill="none" />
        <path d="M44 74L42 92" stroke="#6fd0c0" strokeWidth="3" strokeLinecap="round" />
      </Part>
      <Part id="kn-head" d={ell(56, 50, 24, 24)} fill="#d6e2ea" shade="#8a9db0" off={[-5, -4]}>
        <path d="M32 50Q34 24 56 24Q78 24 80 50Z" fill="#9fb3c5" />
        <Gloss d="M38 40Q42 30 52 28" color="#f4f8fb" w={3.5} />
      </Part>
      <Part id="kn-plume" d="M56 25Q57 6 72 8Q80 10 76 16Q66 14 63 26Z" fill="#ec4f54" shade="#a82a35" off={[-2, -2]} sw={2.8} />
      <Part id="kn-visor" d="M36 50Q36 44 42 44L70 44Q76 44 76 50Q76 58 70 58L42 58Q36 58 36 50Z" fill="#1f2a3a" shade="#0f1520" off={[0, 0]} sw={2.8} />
      <GlowEyes x1={47} x2={65} y={51} rx={4.4} ry={3} color="#ff6a5a" core="#ffe0d0" />
      <Part id="kn-shield" d="M8 76Q10 63 25 61Q41 63 41 78Q41 100 25 109Q8 100 8 76Z" fill="#a9bccc" shade="#647c92" off={[-3, -3]}>
        <path d="M25 68L25 101M14 81L36 81" stroke="#e5484d" strokeWidth="5" strokeLinecap="round" />
        <path d="M13 72Q16 66 22 65" stroke="#e4eef5" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Part>
    </svg>
  );
}
