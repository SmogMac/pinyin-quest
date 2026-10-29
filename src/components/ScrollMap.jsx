// Route map drawn like an unrolled landscape scroll: parchment, ink-brush paths between nodes,
// red seal stamps on visited places and ink mist over the rows you can't see yet.
//
// Every line is generated from the same graph the game navigates (`node.next`), and its style comes
// from the same reachability rules as chooseNode, so the picture always matches where you can go:
//   travelled – dark ink (the route you took)
//   open      – red, glowing, with a flowing ink stroke (your next choices)
//   future    – dashed (still reachable later from where you are)
//   closed    – faint (no longer reachable on this run)
import { useEffect, useId, useMemo, useRef } from 'react';
import { NODE_INFO, reachableNodes } from '../game/run.js';
import { NODE_ICONS } from '../assets/manifest.js';
import { BIOMES } from '../game/data/biomes.js';
import Icon from '../assets/icons/Icons.jsx';
import { Hanzi } from './ui.jsx';
import Bi from './Bi.jsx';

const ROW_H = 92;
const VIEW_W = 340;
const colX = (col) => 50 + col * ((VIEW_W - 100) / 3);
const ORDER = { closed: 0, future: 1, travelled: 2, open: 3 };

/** Ids of every node still reachable (in one or more moves) from the current position. */
function futureNodes(run) {
  const nodes = run.map.nodes;
  const out = new Set();
  const stack = reachableNodes(run).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(nodes[id]?.next || []));
  }
  return out;
}

export default function ScrollMap({ run, onChoose }) {
  const wrapRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  // bring the places you can travel to into view (the scroll unrolls bottom-up)
  useEffect(() => {
    const el = wrapRef.current?.querySelector('.map-node.can');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [run.pos]);
  const map = run.map;
  const nodes = Object.values(map.nodes);
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const H = rows * ROW_H + 40;
  const y = (row) => H - 40 - row * ROW_H;
  const reach = new Set(reachableNodes(run).map((n) => n.id));
  const future = useMemo(() => futureNodes(run), [run]);
  const current = run.pos ? map.nodes[run.pos] : null;
  const visibleRow = (current ? current.row : -1) + 2; // ink mist beyond this
  const biome = BIOMES[map.biome];

  const edges = nodes.flatMap((n) =>
    n.next.map((id) => {
      const m = map.nodes[id];
      let state = 'closed';
      if (n.visited && m.visited) state = 'travelled';
      else if (run.pos === n.id && reach.has(id)) state = 'open';
      else if (future.has(m.id) && (future.has(n.id) || run.pos === n.id)) state = 'future';
      const x1 = colX(n.col);
      const x2 = colX(m.col);
      const y1 = y(n.row);
      const y2 = y(m.row);
      return { key: `${n.id}>${id}`, state, d: `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}` };
    }),
  );
  // starting trails into the first row, so the opening choices are clearly connected too
  const starts = nodes
    .filter((n) => n.row === 0)
    .map((n) => {
      const x = colX(n.col);
      const state = !run.pos ? 'open' : n.visited ? 'travelled' : 'closed';
      return { key: `start>${n.id}`, state, d: `M${VIEW_W / 2} ${H - 2} C${VIEW_W / 2} ${H - 18} ${x} ${y(0) + 24} ${x} ${y(0)}` };
    });
  // drawn faint-first so the routes that matter are always on top
  const allEdges = [...starts, ...edges].sort((a, b) => ORDER[a.state] - ORDER[b.state]);

  return (
    <div className="scroll-wrap" ref={wrapRef}>
      <div className="scroll-rod top" />
      <div className="scroll-paper">
        <div className="scroll-title">
          <span className="scroll-act">Act {map.act}</span>
          <b>{biome.py}</b> <Hanzi text={biome.zh} className="hanzi-sm" />
          <small>{biome.en}</small>
        </div>
        <p className="scroll-desc">{biome.desc}</p>
        <p className="scroll-hint">
          <Bi k="choose" py="xuǎn zé lù xiàn" en="Tap a glowing place to travel there" />
        </p>
        <svg viewBox={`0 0 ${VIEW_W} ${H}`} className="scroll-svg" role="group" aria-label="Route map">
          <defs>
            {/* user-space region: a bounding-box region collapses for straight vertical paths
                (zero width), which made those paths disappear */}
            <filter id={`brush-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={H}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
            </filter>
          </defs>
          {/* ink mountains in the margins */}
          <path d={`M0 ${H} L0 ${H * 0.55} Q30 ${H * 0.45} 52 ${H * 0.6} L70 ${H}Z`} fill="#c9bfa6" opacity=".45" />
          <path d={`M${VIEW_W} ${H} L${VIEW_W} ${H * 0.3} Q${VIEW_W - 30} ${H * 0.22} ${VIEW_W - 50} ${H * 0.36} L${VIEW_W - 70} ${H}Z`} fill="#c9bfa6" opacity=".4" />
          {/* paths */}
          <g filter={`url(#brush-${uid})`}>
            {allEdges.map((e) => (
              <path key={e.key} d={e.d} className={`brush-path ${e.state}`} />
            ))}
          </g>
          {allEdges
            .filter((e) => e.state === 'open')
            .map((e) => (
              <path key={`${e.key}-flow`} d={e.d} className="brush-flow" />
            ))}
          {/* nodes */}
          {nodes.map((n) => {
            const cx = colX(n.col);
            const cy = y(n.row);
            const can = reach.has(n.id);
            const misty = n.row > visibleRow && !n.visited;
            const closed = !n.visited && !future.has(n.id);
            const info = NODE_INFO[n.type];
            const big = n.type === 'guardian' || n.type === 'boss';
            const r = big ? 26 : 19;
            return (
              <g
                key={n.id}
                className={`map-node node-${n.type} ${can ? 'can' : ''} ${n.visited ? 'visited' : ''} ${misty ? 'misty' : ''} ${closed ? 'closed' : ''} ${run.pos === n.id ? 'here' : ''}`}
                transform={`translate(${cx} ${cy})`}
                onClick={() => can && onChoose(n.id)}
                role={can ? 'button' : undefined}
                tabIndex={can ? 0 : undefined}
                aria-label={can ? `${info.py}, ${info.name}` : undefined}
                onKeyDown={(e) => can && (e.key === 'Enter' || e.key === ' ') && onChoose(n.id)}
              >
                {can && <circle r={r + 7} className="node-halo" />}
                <circle r={r} className="node-disc" />
                <foreignObject x={-r * 0.6} y={-r * 0.6} width={r * 1.2} height={r * 1.2}>
                  <div className="node-glyph">
                    <Icon name={misty ? 'cloud' : NODE_ICONS[n.type] || 'sparkle'} size={r * 1.1} />
                  </div>
                </foreignObject>
                {n.visited && (
                  <g className="seal" transform={`translate(${r * 0.7} ${-r * 0.7})`}>
                    <rect x="-8" y="-8" width="16" height="16" rx="2" />
                    <text y="4.5" textAnchor="middle">
                      过
                    </text>
                  </g>
                )}
                {!misty && (can || big) && (
                  <text y={r + 15} textAnchor="middle" className="node-label">
                    {info.py}
                  </text>
                )}
              </g>
            );
          })}
          {/* mist */}
          <rect x="0" y="0" width={VIEW_W} height={Math.max(0, y(visibleRow) - 30)} className="ink-mist" />
        </svg>
      </div>
      <div className="scroll-rod bottom" />
    </div>
  );
}
