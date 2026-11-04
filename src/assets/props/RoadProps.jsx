// Encounter props on the road (merchant cart, lantern post, treasure chest, roadside shrine), drawn
// with the same ink kit as the characters: thick outlines, cel shading. Sized by CSS (width; the
// height follows the viewBox).
import { OL, Part, Stick, Gloss, ell } from '../enemies/ink.jsx';

const WOOD = ['#c8864a', '#8a5428'];
const WOOD_DARK = ['#9a6234', '#5e3818'];
const GOLD = ['#ffcf4a', '#c98a1a'];

function Wheel({ id, cx, cy, r }) {
  return (
    <g>
      <Part id={id} d={ell(cx, cy, r, r)} fill={WOOD_DARK[0]} shade={WOOD_DARK[1]} off={[-1.5, -1.5]}>
        <circle cx={cx} cy={cy} r={r * 0.62} fill="#e8c890" />
      </Part>
      <path d={`M${cx - r * 0.6} ${cy}H${cx + r * 0.6}M${cx} ${cy - r * 0.6}V${cy + r * 0.6}`} stroke={OL} strokeWidth="2.2" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill={GOLD[0]} stroke={OL} strokeWidth="1.8" />
    </g>
  );
}

/** The fox merchant's cart: a wooden stall on wheels with a cloth canopy and a coin sign. */
export function MerchantCart({ className }) {
  return (
    <svg viewBox="0 0 160 130" className={className} aria-hidden="true">
      <Stick d="M14 104L2 112" color={WOOD[0]} w={4} />
      <Stick d="M30 50L30 98M130 50L130 98" color={WOOD_DARK[0]} w={4.5} />
      {/* goods on the counter */}
      <Part id="mc-jar" d="M46 82Q42 70 50 66L58 66Q66 70 62 82Z" fill="#5a9ad8" shade="#2f6aa8" off={[-1, -1]} sw={2.4} />
      <Part id="mc-scroll" d="M72 80Q72 72 78 72L94 72Q100 72 100 80Z" fill="#fff3d0" shade="#d8c08a" off={[-1, -1]} sw={2.4} />
      <Part id="mc-bun" d={ell(112, 78, 9, 6)} fill="#fff6ec" shade="#e0cdb8" off={[-1, -1]} sw={2.4} />
      <Part id="mc-box" d="M20 84L140 84Q144 84 144 88L144 106Q144 110 140 110L20 110Q16 110 16 106L16 88Q16 84 20 84Z" fill={WOOD[0]} shade={WOOD[1]} off={[-3, -3]}>
        <path d="M18 96H142" stroke={WOOD[1]} strokeWidth="2" />
        <path d="M50 86V108M82 86V108M114 86V108" stroke={WOOD[1]} strokeWidth="1.6" />
      </Part>
      <Part id="mc-roof" d="M14 52Q22 26 80 24Q138 26 146 52Q128 46 112 54Q96 46 80 54Q64 46 48 54Q32 46 14 52Z" fill="#c23a35" shade="#8a2026" off={[-3, -3]}>
        <path d="M30 34Q80 22 130 34" stroke="#ffcf4a" strokeWidth="3" fill="none" />
        <Gloss d="M28 40Q44 30 64 28" color="#e8706a" w={3} />
      </Part>
      <Wheel id="mc-wl" cx={42} cy={112} r={14} />
      <Wheel id="mc-wr" cx={118} cy={112} r={14} />
      {/* coin sign */}
      <Stick d="M142 46L150 30" color={WOOD_DARK[0]} w={3} />
      <Part id="mc-coin" d={ell(150, 24, 9, 9)} fill={GOLD[0]} shade={GOLD[1]} off={[-1.5, -1.5]} sw={2.6}>
        <rect x="146.5" y="20.5" width="7" height="7" rx="1" fill={GOLD[1]} />
      </Part>
    </svg>
  );
}

/** A wooden lantern post with a glowing red lantern. */
export function LanternPost({ className }) {
  return (
    <svg viewBox="0 0 50 130" className={className} aria-hidden="true">
      <ellipse cx="25" cy="54" rx="22" ry="22" fill="#ffd27a" opacity=".35" />
      <Stick d="M10 128L10 18Q10 12 16 12L34 12" color={WOOD_DARK[0]} w={5} />
      <Stick d="M30 12L30 30" color="#3a3044" w={1.6} />
      <Part id="lp-top" d="M20 32Q20 30 22 30L38 30Q40 30 40 32L40 35L20 35Z" fill={GOLD[0]} shade={GOLD[1]} off={[0, -1]} sw={2.2} />
      <Part id="lp-body" d={ell(30, 50, 13, 15)} fill="#ec4f54" shade="#a82a35" off={[-3, -2]}>
        <ellipse cx="29" cy="51" rx="6.5" ry="10" fill="#ffd08a" />
        <path d="M23 37Q19 50 23 63M37 37Q41 50 37 63" stroke="#a82a35" strokeWidth="1.6" fill="none" />
      </Part>
      <Part id="lp-bot" d="M21 65L39 65L39 68Q39 70 37 70L23 70Q21 70 21 68Z" fill={GOLD[0]} shade={GOLD[1]} off={[0, -1]} sw={2.2} />
      <Stick d="M30 70L30 80" color="#ec4f54" w={2.4} />
      <Part id="lp-base" d="M2 128Q2 120 10 120Q18 120 18 128Z" fill="#9a968c" shade="#6a665e" off={[-1, -1]} sw={2.4} />
    </svg>
  );
}

/** A treasure chest; `open` raises the lid on a glowing heap of gold. */
export function TreasureChest({ className, open = false }) {
  return (
    <svg viewBox="0 0 100 90" className={className} aria-hidden="true">
      {open && (
        <>
          <Part id="tc-lidopen" d="M14 40L14 14Q14 6 22 6L78 6Q86 6 86 14L86 40Q50 34 14 40Z" fill={WOOD[0]} shade={WOOD[1]} off={[-2, -2]}>
            <path d="M14 20Q50 14 86 20" stroke={GOLD[1]} strokeWidth="4" fill="none" />
          </Part>
          <ellipse cx="50" cy="44" rx="34" ry="10" fill="#fff3a8" />
          {[30, 40, 50, 60, 70].map((x, i) => (
            <circle key={x} cx={x} cy={42 - (i % 2) * 4} r="5.4" fill={GOLD[0]} stroke={OL} strokeWidth="1.8" />
          ))}
          <path d="M44 34l3 -8 3 8 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5Z" fill="#ff8ad8" stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )}
      <Part id="tc-box" d="M12 44L88 44Q92 44 92 48L92 80Q92 86 86 86L14 86Q8 86 8 80L8 48Q8 44 12 44Z" fill={WOOD[0]} shade={WOOD[1]} off={[-3, -3]}>
        <path d="M8 62H92" stroke={WOOD[1]} strokeWidth="2" />
        <path d="M24 46V84M76 46V84" stroke={GOLD[1]} strokeWidth="5" />
        <path d="M24 46V84M76 46V84" stroke={GOLD[0]} strokeWidth="3" />
      </Part>
      {!open && (
        <Part id="tc-lid" d="M8 46L8 34Q8 18 50 18Q92 18 92 34L92 46Z" fill={WOOD[0]} shade={WOOD[1]} off={[-3, -3]}>
          <path d="M24 20V46M76 20V46" stroke={GOLD[1]} strokeWidth="5" />
          <path d="M24 20V46M76 20V46" stroke={GOLD[0]} strokeWidth="3" />
          <Gloss d="M16 34Q22 24 36 22" color="#e8b07a" w={3} />
        </Part>
      )}
      <Part id="tc-lock" d="M43 44Q43 40 47 40L53 40Q57 40 57 44L57 54Q57 58 53 58L47 58Q43 58 43 54Z" fill={GOLD[0]} shade={GOLD[1]} off={[-1, -1]} sw={2.4}>
        <circle cx="50" cy="48" r="2" fill={OL} />
        <path d="M50 49V53" stroke={OL} strokeWidth="2" />
      </Part>
    </svg>
  );
}

/** A small roadside shrine: stone steps, a red-roofed altar and a glowing offering. */
export function Shrine({ className }) {
  return (
    <svg viewBox="0 0 110 110" className={className} aria-hidden="true">
      <Part id="sh-step2" d="M12 98L98 98Q102 98 102 102L102 106L8 106L8 102Q8 98 12 98Z" fill="#b8b2a4" shade="#7a7468" off={[-2, -1]} />
      <Part id="sh-step1" d="M20 88L90 88Q94 88 94 92L94 98L16 98L16 92Q16 88 20 88Z" fill="#c8c2b4" shade="#8a8478" off={[-2, -1]} />
      <Stick d="M28 88L28 44M82 88L82 44" color="#c23a35" w={5} />
      <Part id="sh-altar" d="M36 62L74 62Q78 62 78 66L78 88L32 88L32 66Q32 62 36 62Z" fill="#e8dcc0" shade="#b8a880" off={[-2, -2]}>
        <path d="M32 74H78" stroke="#b8a880" strokeWidth="2" />
      </Part>
      {/* the offering: a glowing jade orb on a gold dish */}
      <ellipse cx="55" cy="54" rx="16" ry="16" fill="#fff3a8" opacity=".55" />
      <Part id="sh-dish" d="M43 62Q55 68 67 62L65 58L45 58Z" fill={GOLD[0]} shade={GOLD[1]} off={[0, -1]} sw={2.2} />
      <Part id="sh-orb" d={ell(55, 51, 8, 8)} fill="#7ae8b8" shade="#3aa880" off={[-1.5, -1.5]} sw={2.4}>
        <circle cx="52.5" cy="48" r="2.4" fill="#e8fff4" />
      </Part>
      <Part id="sh-roof" d="M8 46Q24 40 34 28Q44 18 55 18Q66 18 76 28Q86 40 102 46Q94 52 84 48Q70 50 55 50Q40 50 26 48Q16 52 8 46Z" fill="#c23a35" shade="#8a2026" off={[-2, -2]}>
        <path d="M22 44Q55 36 88 44" stroke="#ffcf4a" strokeWidth="2.4" fill="none" />
      </Part>
      <Part id="sh-tip" d={ell(55, 16, 4, 4)} fill={GOLD[0]} shade={GOLD[1]} off={[-1, -1]} sw={2} />
    </svg>
  );
}
