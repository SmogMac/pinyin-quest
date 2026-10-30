// Browse every animation in the VFX pack (free version) and pick one. Sheets already in the game
// are marked; anything else is previewed straight from the pack and packed on Compile.
import { useMemo, useState } from 'react';
import { SheetFrames } from '../components/Vfx.jsx';

function Thumb({ s, animate }) {
  const box = 92;
  const k = Math.min(box / s.w, box / s.h);
  return (
    <span className="fs-thumb" style={{ width: s.w * k, height: s.h * k }}>
      <SheetFrames sheetKey={`raw-${s.path}`} sh={{ ...s, pending: true }} dur={(s.frames / 15) * 1000} loops={animate ? Infinity : 0} />
    </span>
  );
}

export default function Library({ catalog, sheets, onPick, onClose, title = 'Pick an animation' }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [size, setSize] = useState('large');
  const [hover, setHover] = useState(null);
  const inGame = useMemo(() => new Set(Object.values(sheets).map((s) => s.path)), [sheets]);
  const cats = useMemo(() => ['all', ...new Set((catalog || []).map((s) => s.category))], [catalog]);
  const list = (catalog || []).filter(
    (s) => (cat === 'all' || s.category === cat) && s.variant.includes(`_${size}_`) && (!q || s.path.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="fs-modal" role="dialog" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fs-modal-box fs-library">
        <header>
          <h3>{title}</h3>
          <input type="search" placeholder="Search (fire, impact, blue…)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="large">large</option>
            <option value="small">small</option>
          </select>
          <button type="button" className="fs-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <nav className="fs-cats">
          {cats.map((c) => (
            <button key={c} type="button" className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </nav>
        {!catalog && <p className="fs-muted">Loading the pack…</p>}
        {catalog && !catalog.length && <p className="fs-muted">No VFX pack found: put the Super Pixel Effects Gigapack in the vfx/ folder.</p>}
        <div className="fs-grid">
          {list.map((s) => (
            <button key={s.path} type="button" className={`fs-card ${inGame.has(s.path) ? 'in-game' : ''}`} onMouseEnter={() => setHover(s.path)} onMouseLeave={() => setHover(null)} onClick={() => onPick(s)}>
              <Thumb s={s} animate={hover === s.path} />
              <b>{s.anim.replace(/_/g, ' ')}</b>
              <small>
                {s.variant.split('_').pop()} · {s.frames} frames · {s.w}×{s.h}
              </small>
              {inGame.has(s.path) && <i>in game</i>}
            </button>
          ))}
        </div>
        <p className="fs-muted small">Hover to play. Super Pixel Effects Gigapack (free) by Will Tice / unTied Games.</p>
      </div>
    </div>
  );
}
