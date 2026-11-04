import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { buildIndex, score } from '../lib/search';
import { ISearch } from './Icons';

export function CommandBar() {
  const s = useStore();
  const [q, setQ] = useState(''); const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const close = () => s.setCommand(false);
  const index = useMemo(() => buildIndex(s, (h) => { location.hash = h; }), [s.projects, s.tasks, s.spools, s.devices, s.prints]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => index.map((h) => ({ h, sc: score(h, q) })).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, q ? 14 : 10).map((x) => x.h), [index, q]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => setSel(0), [q]);
  const run = (i: number) => { const h = hits[i]; if (!h) return; close(); h.action(); };
  const groups: string[] = []; hits.forEach((h) => { if (!groups.includes(h.group)) groups.push(h.group); });
  return (
    <div className="cmd-back" onClick={close}>
      <div className="glass glass--strong cmd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Suche">
        <div className="cmd__input"><ISearch /><input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projekte, Versionen, Aufgaben, Rollen, Geräte … oder „Gehe zu Wetter“" onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setSel((x) => Math.min(hits.length - 1, x + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); } if (e.key === 'Enter') run(sel); if (e.key === 'Escape') close(); }} /><kbd className="pill xs">Esc</kbd></div>
        <div className="cmd__list">
          {hits.length === 0 ? <p className="muted small" style={{ padding: 10 }}>Nichts gefunden. Natürliche Sprache („beste Version des Sensorhalters“) kommt später; probiere Stichwörter.</p> : groups.map((g) => (
            <div key={g}><div className="cmd__group">{g}</div>{hits.map((h, i) => (h.group === g ? <div key={h.id} className={`cmd__item${i === sel ? ' on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => run(i)}><span className="grow ellipsis">{h.title}</span>{h.subtitle ? <small className="ellipsis" style={{ maxWidth: '45%' }}>{h.subtitle}</small> : null}</div> : null))}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
