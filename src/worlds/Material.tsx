import { useMemo, useState } from 'react';
import { useStore, availableGrams } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { fmtDate, fmtGrams, fmtNum, fold } from '../lib/format';
import { Panel, Stack, Stat } from '../ui/Glass';
import { ILayers, ISpool, ICart, IPlus } from '../ui/Icons';

const MCOL: Record<string, string> = { PLA: '#4ccf7a', PETG: '#ffbd6b', ABS: '#7cc6ff', TPU: '#ff6b6b', ASA: '#c59bff' };

export function Material() {
  const { spools, projects, shopping } = useStore(useShallow((s) => ({ spools: s.spools, projects: s.projects, shopping: s.shopping })));
  const openSheet = useStore((s) => s.openSheet); const toggleShopping = useStore((s) => s.toggleShopping);
  const [sort, setSort] = useState<'label' | 'avail' | 'material'>('material'); const [mat, setMat] = useState<string>('alle'); const [q, setQ] = useState('');
  const mats = useMemo(() => [...new Set(spools.map((s) => s.material))], [spools]);
  const list = useMemo(() => spools.filter((s) => (mat === 'alle' || s.material === mat) && (!q || fold(`${s.label} ${s.brand} ${s.colorName} ${s.location}`).includes(fold(q)))).sort((a, b) => sort === 'label' ? a.label.localeCompare(b.label) : sort === 'avail' ? availableGrams(b) - availableGrams(a) : a.material.localeCompare(b.material) || a.label.localeCompare(b.label)), [spools, sort, mat, q]);
  const totalKg = spools.reduce((a, s) => a + s.remainingGrams, 0) / 1000;
  const byMat = mats.map((m) => ({ m, n: spools.filter((s) => s.material === m).length, g: spools.filter((s) => s.material === m).reduce((a, s) => a + s.remainingGrams, 0) }));
  const shortages = projects.filter((p) => !p.archivedAt).flatMap((p) => p.requiredSpools.map((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams ? { p, sp, missing: r.grams - availableGrams(sp) } : null; }).filter(Boolean) as { p: typeof projects[number]; sp: typeof spools[number]; missing: number }[]);
  const low = spools.filter((s) => availableGrams(s) < 150);
  let acc = 0; const total = byMat.reduce((a, x) => a + x.g, 0) || 1;

  return (
    <>
      <div className="world-title"><h1>Material</h1><p>Filamente. Werkstoffe. Möglichkeiten.</p></div>

      <Panel title="Materialbestand" icon={<ILayers />} style={{ left: '3.2%', top: '24%', width: '22%' }} delay={60}>
        <div className="donut">
          <svg width="92" height="92" viewBox="0 0 100 100">
            {byMat.map((x) => { const f = x.g / total; const r = 40, C = 2 * Math.PI * r; const el = <circle key={x.m} cx="50" cy="50" r={r} fill="none" stroke={MCOL[x.m] ?? '#aaa'} strokeWidth="12" strokeDasharray={`${C * f} ${C}`} strokeDashoffset={-C * acc} transform="rotate(-90 50 50)" />; acc += f; return el; })}
            <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="600" fill="#fff">{spools.length}</text><text x="50" y="62" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.7)">Rollen</text>
          </svg>
          <div className="col small" style={{ gap: 3 }}>{byMat.map((x) => <span key={x.m} className="row" style={{ gap: 6 }}><span className="dot" style={{ background: MCOL[x.m] ?? '#aaa' }} />{x.m}<span className="muted">{x.n} · {fmtGrams(x.g)}</span></span>)}</div>
        </div>
        <div className="grid2"><Stat value={`${fmtNum(totalKg, 1)} kg`} label="vorhanden" /><Stat value={`${fmtNum(spools.reduce((a, s) => a + s.reservedGrams, 0))} g`} label="reserviert" /></div>
      </Panel>

      <Panel title="Rollen" icon={<ISpool />} style={{ left: '27%', bottom: '11%', width: '46%', maxHeight: '36%' }} delay={100}
        right={<div className="row" style={{ gap: 6 }}><input className="input" style={{ width: 130, padding: '4px 8px', fontSize: 12 }} placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} /><select className="select" style={{ width: 'auto', padding: '4px 6px', fontSize: 12 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="material">nach Material</option><option value="avail">nach Verfügbarkeit</option><option value="label">nach Name</option></select></div>}
        foot={<><div className="pills"><button className={`pill xs${mat === 'alle' ? ' pill--on' : ''}`} onClick={() => setMat('alle')}>Alle</button>{mats.map((m) => <button key={m} className={`pill xs${mat === m ? ' pill--on' : ''}`} onClick={() => setMat(m)}>{m}</button>)}</div><button className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={() => openSheet({ kind: 'spule' })}><IPlus width={12} height={12} /> Rolle</button></>}>
        <div className="spool-grid">
          {list.map((s) => (
            <div key={s.id} className="item item--click" style={{ alignItems: 'flex-start' }} onClick={() => openSheet({ kind: 'spule', spoolId: s.id })}>
              <span className="swatch" style={{ background: s.colorHex }} />
              <div className="grow col" style={{ gap: 3 }}>
                <div className="row"><b className="small ellipsis grow">{s.label}</b><span className="xs muted">{s.brand}</span></div>
                <Stack parts={[{ value: availableGrams(s), color: '#4ccf7a', title: 'verfügbar' }, { value: s.reservedGrams, color: '#ffb547', title: 'reserviert' }, { value: s.initialGrams - s.remainingGrams, color: 'rgba(255,255,255,.14)', title: 'verbraucht' }]} />
                <span className="xs muted">{fmtGrams(availableGrams(s))} frei{s.reservedGrams ? ` · ${s.reservedGrams} g res.` : ''} · {s.location}{s.lastDriedAt ? ` · getrocknet ${fmtDate(s.lastDriedAt)}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Fehlmengen & Einkauf" icon={<ICart />} style={{ right: '3.2%', top: '24%', width: '24%', maxHeight: '50%' }} delay={140}>
        {shortages.map((x, i) => <div key={i} className="row small"><span className="pill pill--bad xs">fehlt {fmtGrams(x.missing)}</span><span className="ellipsis grow">{x.sp.label}</span><span className="xs muted ellipsis">{x.p.name}</span></div>)}
        {low.map((s) => <div key={s.id} className="row small"><span className="pill pill--warn xs">wenig</span><span className="ellipsis grow">{s.label}</span><span className="xs muted">{fmtGrams(availableGrams(s))}</span></div>)}
        {shortages.length + low.length === 0 ? <p className="muted small">Bestand reicht für alle geplanten Drucke.</p> : null}
        <div className="hr" />
        <b className="small">Einkaufsliste</b>
        {shopping.map((it) => <label key={it.id} className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={it.done} onChange={() => toggleShopping(it.id)} /><span className="grow" style={{ textDecoration: it.done ? 'line-through' : undefined }}>{it.title} <span className="muted">× {it.qty}</span></span>{it.price ? <span className="muted">{fmtNum(it.price, 2)} €</span> : null}{it.auto ? <span className="xs faint">auto</span> : null}</label>)}
        <p className="xs faint">Einkauf ist in diesem Entwurf nur eine Liste.</p>
      </Panel>
    </>
  );
}
