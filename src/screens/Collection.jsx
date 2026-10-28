import { useMemo, useState } from 'react';
import { useStore } from '../store/store.js';
import { VOCAB, getWord, toneless } from '../learn/vocab.js';
import { masteryOf, MASTERY, SKILLS, SKILL_NAMES, formatInterval } from '../learn/srs.js';
import { TopBar, MasteryPips, Pinyin, Hanzi, Modal } from '../components/ui.jsx';
import { AudioButtons } from '../components/AudioButtons.jsx';
import { ELEMENTS } from '../game/data/elements.js';
import { speak } from '../audio/speech.js';
import Icon from '../assets/icons/Icons.jsx';

const PAGE = 60;
const FILTERS = [
  ['met', 'Met'],
  ['all', 'All'],
  ['due', 'Due'],
  ['0', 'New'],
  ['1', 'Learning'],
  ['2', 'Familiar'],
  ['3', 'Strong'],
  ['4', 'Mastered'],
];

export default function Collection({ go }) {
  const s = useStore();
  const hasAny = Object.keys(s.words).length > 0;
  const [filter, setFilter] = useState(hasAny ? 'met' : 'all');
  const [hsk, setHsk] = useState(0);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);

  const list = useMemo(() => {
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    const plain = toneless(needle).replace(/\s+/g, '');
    return VOCAB.filter((w) => {
      const r = s.words[w.id];
      const m = masteryOf(r);
      if (filter === 'met' && !r) return false;
      if (filter === 'due' && !(r && SKILLS.some((k) => r.skills[k] && r.skills[k].state !== 'new' && r.skills[k].due <= now))) return false;
      if (/^\d$/.test(filter) && m !== Number(filter)) return false;
      if (hsk && w.hsk !== hsk) return false;
      if (needle) {
        const hit =
          w.hanzi.includes(needle) ||
          toneless(w.pinyin).replace(/\s+/g, '').includes(plain) ||
          w.meanings.some((x) => x.toLowerCase().includes(needle));
        if (!hit) return false;
      }
      return true;
    });
  }, [s, filter, hsk, q]);

  return (
    <div className="screen collection">
      <TopBar title="Word collection" onBack={() => go('home')} />
      <div className="search">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Search pinyin (no tones needed), English or 汉字"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Search words"
        />
      </div>
      <div className="filter-row" role="tablist">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={`chip ${filter === k ? 'on' : ''}`} onClick={() => (setFilter(k), setLimit(PAGE))}>
            {label}
          </button>
        ))}
      </div>
      <div className="filter-row">
        {[0, 1, 2, 3].map((h) => (
          <button key={h} type="button" className={`chip small ${hsk === h ? 'on' : ''}`} onClick={() => (setHsk(h), setLimit(PAGE))}>
            {h ? `HSK ${h}` : 'All levels'}
          </button>
        ))}
      </div>
      <p className="muted small">
        {list.length} word{list.length === 1 ? '' : 's'}, ordered by how common they are
      </p>
      <ul className="word-list">
        {list.slice(0, limit).map((w) => {
          const m = masteryOf(s.words[w.id]);
          return (
            <li key={w.id}>
              <button type="button" className="word-row" onClick={() => setOpen(w.id)}>
                <span className="wr-rank">#{w.rank}</span>
                <span className="wr-main">
                  <Pinyin text={w.pinyin} className="pinyin-row" />
                  <span className="wr-gloss">{w.gloss}</span>
                </span>
                <Hanzi text={w.hanzi} className="hanzi-xs" />
                <MasteryPips level={m} />
              </button>
              <button type="button" className="mini-audio" onClick={() => speak(w.hanzi)} aria-label={`Play ${w.pinyin}`}>
                <Icon name="speaker" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      {list.length > limit && (
        <button type="button" className="btn btn-secondary wide" onClick={() => setLimit((l) => l + PAGE * 2)}>
          Show more
        </button>
      )}
      {list.length === 0 && <p className="muted center">No words here yet. Start a Quick Learn session to fill your collection!</p>}
      {open && <WordModal id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function WordModal({ id, onClose }) {
  const s = useStore();
  const w = getWord(id);
  const r = s.words[id];
  const m = masteryOf(r);
  const now = Date.now();
  return (
    <Modal onClose={onClose} title={w.pinyin} className="word-modal">
      <div className="wm-head">
        <Pinyin text={w.pinyin} className="pinyin-xl" />
        <Hanzi text={w.hanzi} className="hanzi-md" />
        <AudioButtons text={w.hanzi} big />
      </div>
      <p className="gloss-lg">{w.gloss}</p>
      <p className="small">{w.meanings.join(' · ')}</p>
      {w.other.length > 0 && (
        <div className="small muted">
          Also read:{' '}
          {w.other.map((o) => (
            <span key={o.pinyin}>
              <b>{o.pinyin}</b> ({o.meanings.slice(0, 2).join(', ')}){' '}
            </span>
          ))}
        </div>
      )}
      {w.example && (
        <div className="example">
          <div className="example-py">
            {w.example.py}
            <button type="button" className="mini-audio" onClick={() => speak(w.example.zh)} aria-label="Play example">
              <Icon name="speaker" size={16} />
            </button>
          </div>
          <Hanzi text={w.example.zh} className="example-hz" />
          <div className="example-en">{w.example.en}</div>
        </div>
      )}
      <div className="wm-tags">
        <span className="tag">#{w.rank} most common</span>
        <span className="tag">HSK {w.hsk}</span>
        <span className="tag">{w.pos}</span>
        {w.element && (
          <span className="element-tag" style={{ '--el': ELEMENTS[w.element].color }}>
            {ELEMENTS[w.element].py} {ELEMENTS[w.element].zh} · {ELEMENTS[w.element].name}
          </span>
        )}
      </div>
      <div className="wm-mastery">
        <MasteryPips level={m} showLabel />
        {r && (
          <span className="small muted">
            {r.ok} right · {r.bad} wrong
          </span>
        )}
      </div>
      {r && (
        <table className="skill-table">
          <tbody>
            {SKILLS.map((k) => {
              const c = r.skills[k];
              return (
                <tr key={k}>
                  <td>{SKILL_NAMES[k]}</td>
                  <td>{c ? `${c.ok}/${c.ok + c.bad}` : '—'}</td>
                  <td>{!c || c.state === 'new' ? 'not started' : c.due <= now ? 'due now' : `in ${formatInterval(c.due - now)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="legend small">
        {MASTERY.map((x) => (
          <span key={x.name} style={{ color: x.color }}>
            ● {x.name}{' '}
          </span>
        ))}
      </p>
    </Modal>
  );
}
