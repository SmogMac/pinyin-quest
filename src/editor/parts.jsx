// Small form controls for the FX Studio inspector.
import { useEffect, useState } from 'react';

/** A labelled slider with a number box. `onChange(undefined)` when a clearable field is emptied. */
export function Num({ label, value, min = 0, max = 1, step = 0.01, onChange, hint, clearable = false, unit = '' }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  const v = value ?? (clearable ? '' : min);
  return (
    <label className="fs-row" title={hint}>
      <span className="fs-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v === '' ? min : v} onChange={(e) => onChange(Number(e.target.value))} className={value === undefined && clearable ? 'unset' : ''} />
      <input
        type="number"
        className="fs-num"
        step={step}
        value={text}
        placeholder={clearable ? '—' : ''}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value === '') {
            if (clearable) onChange(undefined);
          } else if (Number.isFinite(Number(e.target.value))) onChange(Number(e.target.value));
        }}
      />
      {unit && <span className="fs-unit">{unit}</span>}
    </label>
  );
}

export function Pick({ label, value, options, onChange, hint }) {
  return (
    <label className="fs-row" title={hint}>
      <span className="fs-label">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Toggle({ label, value, onChange, hint }) {
  return (
    <label className="fs-row fs-toggle" title={hint}>
      <span className="fs-label">{label}</span>
      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Text({ label, value, onChange, hint, placeholder }) {
  return (
    <label className="fs-row" title={hint}>
      <span className="fs-label">{label}</span>
      <input type="text" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Section({ title, children, right }) {
  return (
    <section className="fs-section">
      <header>
        <h4>{title}</h4>
        {right}
      </header>
      {children}
    </section>
  );
}

/** A searchable, grouped list for the left column. */
export function ItemList({ items, selected, onSelect, search, onSearch, footer }) {
  const q = search.trim().toLowerCase();
  const shown = q ? items.filter((it) => `${it.id} ${it.label} ${it.group}`.toLowerCase().includes(q)) : items;
  const groups = [];
  for (const it of shown) {
    let g = groups.find((x) => x.name === it.group);
    if (!g) groups.push((g = { name: it.group, items: [] }));
    g.items.push(it);
  }
  return (
    <div className="fs-list">
      <input className="fs-search" type="search" placeholder="Search…" value={search} onChange={(e) => onSearch(e.target.value)} />
      <div className="fs-list-scroll">
        {groups.map((g) => (
          <div key={g.name || '-'} className="fs-group">
            {g.name && <div className="fs-group-name">{g.name}</div>}
            {g.items.map((it) => (
              <button key={it.id} type="button" className={`fs-item ${selected === it.id ? 'on' : ''}`} onClick={() => onSelect(it.id)}>
                <span>{it.label}</span>
                <small>{it.id}</small>
              </button>
            ))}
          </div>
        ))}
        {!shown.length && <p className="fs-muted">Nothing matches.</p>}
      </div>
      {footer}
    </div>
  );
}
