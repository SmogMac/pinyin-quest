// The FX Studio's live stage: the real battle screen in sandbox mode (nothing is simulated), so
// what you see here is exactly what the game shows. Drag on the stage to move the selected layer.
import { useEffect, useMemo, useRef } from 'react';
import BattleScreen from '../components/BattleScreen.jsx';
import { newRun } from '../game/run.js';
import { COMBAT } from '../game/data/balance.js';

export default function Preview({ opts, onApi, drag }) {
  const { hero, enemy, biome, dist, slow } = opts;
  const run = useMemo(() => {
    const r = newRun({ seed: 7, heroId: hero });
    r.battle = { type: 'battle', enemies: [enemy], seed: 7, biome };
    return r;
  }, [hero, enemy, biome]);
  const api = useRef(null);
  const place = () => {
    const a = api.current;
    if (!a) return;
    const mid = COMBAT.worldW / 2;
    const half = (COMBAT.worldW * dist) / 200;
    a.setX('hero', mid - half);
    const foe = a.units().find((u) => u.side === 1);
    if (foe) a.setX(foe.id, mid + half);
  };
  useEffect(place, [dist]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.current?.setSlow(slow);
  }, [slow]);

  // drag on the stage: pixel deltas go to the selected layer (FxStudio converts them)
  const start = useRef(null);
  const onDown = (e) => {
    if (!drag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    if (!drag || !start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.onDelta(dx, dy);
  };

  return (
    <div className={`fs-stage ${drag ? 'dragging' : ''}`}>
      <BattleScreen
        key={`${hero}-${enemy}-${biome}`}
        run={run}
        accountLevel={10}
        sandbox={{
          onReady: (a) => {
            api.current = a;
            a.setSlow(slow);
            place();
            onApi(a);
          },
        }}
      />
      {drag && <div className="fs-drag" onPointerDown={onDown} onPointerUp={onUp} title="Drag to move the selected layer" />}
    </div>
  );
}
