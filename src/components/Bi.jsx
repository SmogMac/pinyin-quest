// Bilingual label: Pinyin first (primary), English underneath (smaller). Hanzi is optional (`showZh`).
import { LABELS } from '../i18n/labels.js';

export default function Bi({ k, py, en, zh, showZh = false, className = '', inline = false }) {
  const l = LABELS[k] || {};
  const p = py ?? l.py ?? k;
  const e = en ?? l.en;
  const h = zh ?? l.zh;
  return (
    <span className={`bi ${inline ? 'bi-inline' : ''} ${className}`}>
      <span className="bi-py">
        {p}
        {showZh && h && <span className="bi-zh"> {h}</span>}
      </span>
      {e && (
        <span className="bi-en" lang="en">
          {e}
        </span>
      )}
    </span>
  );
}
