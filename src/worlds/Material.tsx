import { useMemo, useState } from 'react';
import { useStore, availableGrams, liveProjects } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { fmtDate, fmtGrams, fmtNum, fold } from '../lib/format';
import { PanelColumn, Panel, Stack, Stat } from '../ui/Glass';
import { ILayers, ISpool, ICart, IPlus, IList, IStar, IX } from '../ui/Icons';
import { FILAMENT_CATALOG } from '../types';

const MCOL: Record<string, string> = { PLA: '#4ccf7a', PETG: '#ffbd6b', ABS: '#7cc6ff', TPU: '#ff6b6b', ASA: '#c59bff', PA: '#9fd4ff', PC: '#dfe9ff' };
const PROPS: Record<string, { nozzle: string; bed: string; strength: number; flex: number; weather: number; note: string }> = {
  PLA: { nozzle: '190–230 °C', bed: '45–60 °C', strength: 3, flex: 1, weather: 1, note: 'Einfach, präzise, nicht hitzefest' },
  PETG: { nozzle: '230–260 °C', bed: '60–90 °C', strength: 4, flex: 2, weather: 3, note: 'Zäh, leicht flexibel, wasserfest' },
  ABS: { nozzle: '240–270 °C', bed: '90–110 °C', strength: 4, flex: 2, weather: 3, note: 'Hitzefest, warp-anfällig' },
  ASA: { nozzle: '240–270 °C', bed: '90–110 °C', strength: 4, flex: 2, weather: 5, note: 'UV-stabil für Außenteile' },
  TPU: { nozzle: '210–240 °C', bed: '30–60 °C', strength: 2, flex: 5, weather: 3, note: 'Flexibel, langsam drucken' },
};

export function Material() {
  const { spools, projects, shopping, prints, settings } = useStore(useShallow((s) => ({ spools: s.spools, projects: s.projects, shopping: s.shopping, prints: s.prints, settings: s.settings })));
  const openSheet = useStore((s) => s.openSheet); const toggleShopping = useStore((s) => s.toggleShopping); const addShopping = useStore((s) => s.addShopping); const deleteShopping = useStore((s) => s.deleteShopping); const [buy, setBuy] = useState('');
  const [sort, setSort] = useState<'label' | 'avail' | 'material'>('material'); const [mat, setMat] = useState<string>('alle'); const [q, setQ] = useState(''); const [cmpTab, setCmpTab] = useState<'material' | 'produkte'>('material');
  const mats = useMemo(() => [...new Set(spools.map((s) => s.material))], [spools]);
  const list = useMemo(() => spools.filter((s) => (mat === 'alle' || s.material === mat) && (!q || fold(`${s.label} ${s.brand} ${s.colorName} ${s.location}`).includes(fold(q)))).sort((a, b) => sort === 'label' ? a.label.localeCompare(b.label) : sort === 'avail' ? availableGrams(b) - availableGrams(a) : a.material.localeCompare(b.material) || a.label.localeCompare(b.label)), [spools, sort, mat, q]);
  const totalKg = spools.reduce((a, s) => a + s.remainingGrams, 0) / 1000;
  const byMat = mats.map((m) => ({ m, n: spools.filter((s) => s.material === m).length, g: spools.filter((s) => s.material === m).reduce((a, s) => a + s.remainingGrams, 0) }));
  const live = liveProjects(projects);
  const shortages = live.filter((p) => !p.archivedAt).flatMap((p) => p.requiredSpools.map((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams ? { p, sp, missing: r.grams - availableGrams(sp) } : null; }).filter(Boolean) as { p: typeof projects[number]; sp: typeof spools[number]; missing: number }[]);
  const low = spools.filter((s) => availableGrams(s) < 150);
  const top = useMemo(() => mats.map((m) => ({ m, used: prints.filter((p) => p.status === 'fertig' && spools.find((s) => s.id === p.spoolId)?.material === m).reduce((a, p) => a + (p.gramsUsed ?? 0), 0), projects: live.filter((p) => p.requiredSpools.some((r) => spools.find((s) => s.id === r.spoolId)?.material === m)).length })).sort((a, b) => b.used - a.used).slice(0, 3), [mats, prints, spools, live]);
  let acc = 0; const total = byMat.reduce((a, x) => a + x.g, 0) || 1;
  const dots = (n: number) => '●'.repeat(n) + '○'.repeat(5 - n);

  return (
    <>
      <div className="world-title"><h1>Material</h1><p>Filamente. Werkstoffe. Möglichkeiten.</p></div>

      <PanelColumn side="left" top="38%" bottom="2.5%" width="22%">
      <Panel title="Materialbestand" icon={<ILayers />} delay={60}>
        <div className="donut">
          <svg width="88" height="88" viewBox="0 0 100 100">
            {byMat.map((x) => { const f = x.g / total; const r = 40, C = 2 * Math.PI * r; const el = <circle key={x.m} cx="50" cy="50" r={r} fill="none" stroke={MCOL[x.m] ?? '#aaa'} strokeWidth="12" strokeDasharray={`${C * f} ${C}`} strokeDashoffset={-C * acc} transform="rotate(-90 50 50)" />; acc += f; return el; })}
            <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="600" fill="currentColor">{spools.length}</text><text x="50" y="62" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".7">Rollen</text>
          </svg>
          <div className="col small" style={{ gap: 3 }}>{byMat.map((x) => <span key={x.m} className="row" style={{ gap: 6 }}><span className="dot" style={{ background: MCOL[x.m] ?? '#aaa' }} />{x.m}<span className="muted">{x.n} · {fmtGrams(x.g)}</span></span>)}</div>
        </div>
        <div className="grid2"><Stat value={`${fmtNum(totalKg, 1)} kg`} label="vorhanden" /><Stat value={`${fmtNum(spools.reduce((a, s) => a + s.reservedGrams, 0))} g`} label="reserviert" /></div>
      </Panel>

      <Panel title="Top Materialien" icon={<IStar />} delay={120}>
        {top.map((t) => <div key={t.m} className="row small"><span className="dot" style={{ background: MCOL[t.m] ?? '#aaa' }} /><b style={{ width: 44 }}>{t.m}</b><span className="muted grow">{fmtGrams(t.used)} verdruckt · {t.projects} Projekte</span>{settings.preferredMaterials?.includes(t.m) ? <span className="pill xs pill--acc">bevorzugt</span> : null}</div>)}
        <div className="row" style={{ gap: 6, marginTop: 4 }}><button className="btn btn--sm" onClick={() => openSheet({ kind: 'spule' })}><IPlus width={12} height={12} /> Neue Rolle</button><button className="btn btn--sm btn--ghost" onClick={() => setSort('label')}>Nach Name sortieren</button></div>
      </Panel>
      </PanelColumn>

      <Panel title="Rollen" icon={<ISpool />} className="panel--haupt" style={{ left: '27%', top: '60%', bottom: '10.5%', width: '43.5%' }} delay={100}
        right={<div className="row" style={{ gap: 6 }}><input className="input" style={{ width: 130, padding: '4px 8px', fontSize: 12 }} placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} /><select className="select" style={{ width: 'auto', padding: '4px 6px', fontSize: 12 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="material">nach Material</option><option value="avail">nach Verfügbarkeit</option><option value="label">nach Name / Lagerort</option></select></div>}
        foot={<><div className="pills"><button className={`pill xs${mat === 'alle' ? ' pill--on' : ''}`} onClick={() => setMat('alle')}>Alle</button>{mats.map((m) => <button key={m} className={`pill xs${mat === m ? ' pill--on' : ''}`} onClick={() => setMat(m)}>{m}</button>)}</div></>}>
        {spools.length === 0 ? <div className="col" style={{ gap: 8, alignItems: 'flex-start' }}><p className="small">Noch keine Rolle angelegt. Mit deinen Rollen siehst du Bestand, Reservierungen und Verbrauch auf einen Blick.</p><button className="btn btn--primary btn--sm" onClick={() => openSheet({ kind: 'spule' })}><IPlus width={12} height={12} /> Erste Rolle anlegen</button></div> : list.length === 0 ? <p className="muted small">Keine Rolle passt zur Suche.</p> : null}
        <div className="spool-grid">
          {list.map((s) => (
            <div key={s.id} className="item item--click" style={{ alignItems: 'flex-start' }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openSheet({ kind: 'spule', spoolId: s.id }); }} onClick={() => openSheet({ kind: 'spule', spoolId: s.id })}>
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

      <PanelColumn side="right" top="38%" bottom="2.5%" width="24%">
      <Panel title="Eigenschaften vergleichen" icon={<IList />} right={<div className="tabs" style={{ padding: 2 }}><button className={cmpTab === 'material' ? 'on' : ''} style={{ padding: '2px 8px' }} onClick={() => setCmpTab('material')}>Materialien</button><button className={cmpTab === 'produkte' ? 'on' : ''} style={{ padding: '2px 8px' }} onClick={() => setCmpTab('produkte')}>Produkte</button></div>} delay={140}>
        {cmpTab === 'material' ? (
          <table className="tbl"><thead><tr><th>Material</th><th>Düse</th><th>Bett</th><th>Fest</th><th>Flex</th><th>Wetter</th></tr></thead><tbody>
            {Object.entries(PROPS).map(([m, p]) => <tr key={m}><td><b style={{ color: MCOL[m] }}>{m}</b></td><td>{p.nozzle}</td><td>{p.bed}</td><td title="Festigkeit">{dots(p.strength)}</td><td title="Flexibilität">{dots(p.flex)}</td><td title="Witterung">{dots(p.weather)}</td></tr>)}
          </tbody></table>
        ) : (
          <table className="tbl"><thead><tr><th>Produkt</th><th>Düse °C</th><th>Bett °C</th><th>Trocknung</th></tr></thead><tbody>
            {FILAMENT_CATALOG.map((f) => <tr key={f.product}><td>{f.product}</td><td>{f.nozzle}</td><td>{f.bed}</td><td>{f.dry}</td></tr>)}
          </tbody></table>
        )}
        <span className="xs faint">{cmpTab === 'material' ? 'Richtwerte, keine Herstellerangaben.' : 'Historische Planwerte aus dem Katalog, vor Anwendung prüfen. „—“ = unbekannt.'}</span>
      </Panel>

      <Panel title="Fehlmengen & Einkauf" icon={<ICart />} delay={200}>
        {shortages.map((x, i) => <div key={i} className="row small"><span className="pill pill--bad xs">fehlt {fmtGrams(x.missing)}</span><span className="ellipsis grow">{x.sp.label}</span><button className="btn btn--sm btn--ghost" style={{ fontSize: 11, padding: '1px 6px' }} onClick={() => addShopping({ title: `${x.sp.label} nachkaufen`, qty: '1', price: x.sp.price, projectId: x.p.id, url: x.sp.reorderUrl })}>+ Liste</button></div>)}
        {low.map((s) => <div key={s.id} className="row small"><span className="pill pill--warn xs">wenig</span><span className="ellipsis grow">{s.label}</span><span className="xs muted">{fmtGrams(availableGrams(s))}</span></div>)}
        {shortages.length + low.length === 0 ? <p className="muted small">{spools.length ? 'Bestand reicht für alle geplanten Drucke.' : 'Noch kein Bestand erfasst.'}</p> : null}
        <div className="hr" />
        {shopping.map((it) => <label key={it.id} className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={it.done} onChange={() => toggleShopping(it.id)} /><span className="grow" style={{ textDecoration: it.done ? 'line-through' : undefined }}>{it.title} <span className="muted">× {it.qty}</span></span>{it.price ? <span className="muted">{fmtNum(it.price, 2)} €</span> : null}{it.url && /^https?:\/\//i.test(it.url) ? <a href={it.url} target="_blank" rel="noreferrer noopener" className="xs">Link</a> : null}<button className="btn btn--icon btn--ghost" style={{ width: 20, height: 20 }} aria-label={`${it.title} von der Liste entfernen`} title="Entfernen" onClick={(e) => { e.preventDefault(); deleteShopping(it.id); }}><IX width={10} height={10} /></button></label>)}
        <input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="Auf die Einkaufsliste … (Enter)" value={buy} maxLength={80} onChange={(e) => setBuy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && buy.trim()) { addShopping({ title: buy.trim(), qty: '1' }); setBuy(''); } }} />
        <p className="xs faint">Produktlinks lösen keine Bestellung aus.</p>
      </Panel>
      </PanelColumn>
      <div className="hand hand--tr">{'Gute Ideen brauchen\ndie richtigen Werkstoffe.'}</div>
    </>
  );
}
