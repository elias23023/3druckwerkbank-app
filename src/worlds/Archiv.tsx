import { useMemo, useState } from 'react';
import { useStore, archivedProjects, liveProjects } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { fmtDate, fmtGrams, fmtNum, fold } from '../lib/format';
import { PanelColumn, Panel, Stat } from '../ui/Glass';
import { islandSrc } from '../scene/Island';
import { ISparkle, IStar, IImage, IHistory, ICopy } from '../ui/Icons';
import { navigate } from '../router';

export function Archiv() {
  const { projects, reports, spools, prints, devices } = useStore(useShallow((s) => ({ projects: s.projects, reports: s.reports, spools: s.spools, prints: s.prints, devices: s.devices })));
  const openSheet = useStore((s) => s.openSheet); const toggleFavorite = useStore((s) => s.toggleFavorite); const projectFromTemplate = useStore((s) => s.projectFromTemplate);
  const [q, setQ] = useState(''); const [fav, setFav] = useState(false); const [tag, setTag] = useState<string | null>(null); const [f, setF] = useState<{ typ?: string; bereich?: string; material?: string; drucker?: string; jahr?: string }>({});
  const all = archivedProjects(projects);
  const matOf = (pid: string) => [...new Set(prints.filter((p) => p.projectId === pid).map((p) => spools.find((s) => s.id === p.spoolId)?.material).filter(Boolean))] as string[];
  const devOf = (pid: string) => [...new Set(prints.filter((p) => p.projectId === pid).map((p) => devices.find((d) => d.id === p.printerId)?.name).filter(Boolean))] as string[];
  const arch = useMemo(() => all.filter((p) => (!fav || p.favorite) && (!tag || p.tags.includes(tag)) && (!f.typ || p.type === f.typ) && (!f.bereich || p.areas.includes(f.bereich)) && (!f.material || matOf(p.id).includes(f.material)) && (!f.drucker || devOf(p.id).includes(f.drucker)) && (!f.jahr || p.archivedAt?.slice(0, 4) === f.jahr) && (!q || fold(`${p.name} ${p.type} ${p.tags.join(' ')} ${p.areas.join(' ')}`).includes(fold(q)))).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')), [all, q, fav, tag, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const lessons = reports.flatMap((r) => r.lessons.map((l) => ({ l, p: projects.find((p) => p.id === r.projectId)?.name })));
  const totals = { prints: reports.reduce((a, r) => a + r.printsTotal, 0), g: reports.reduce((a, r) => a + r.gramsUsed, 0), h: reports.reduce((a, r) => a + r.hours, 0) };
  const tags = useMemo(() => { const m = new Map<string, number>(); all.forEach((p) => p.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); }, [all]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (11 - i), 1); const key = `${d.getFullYear()}-${d.getMonth()}`; return { key, label: d.toLocaleDateString('de-AT', { month: 'short' }), n: all.filter((p) => { if (!p.archivedAt) return false; const a = new Date(p.archivedAt); return `${a.getFullYear()}-${a.getMonth()}` === key; }).length }; }), [all]);
  const rediscover = useMemo(() => [...all].sort((a, b) => (a.archivedAt ?? '').localeCompare(b.archivedAt ?? '')).slice(0, 3), [all]);
  const templates = liveProjects(projects).filter((p) => p.isTemplate);
  const opts = (xs: string[]) => [...new Set(xs)].filter(Boolean);
  const sel = (label: string, key: keyof typeof f, values: string[]) => <select className="select" style={{ width: 'auto', padding: '3px 6px', fontSize: 11 }} value={f[key] ?? ''} onChange={(e) => setF({ ...f, [key]: e.target.value || undefined })}><option value="">{label}</option>{values.map((v) => <option key={v}>{v}</option>)}</select>;

  return (
    <>
      <div className="world-title"><h1>Archiv</h1><p>Deine Projekte. Deine Ideen. Für später. Und für immer.</p>
        <div className="pills" style={{ marginTop: 12 }}>
          {sel('Projektart', 'typ', opts(all.map((p) => p.type)))}{sel('Bereich', 'bereich', opts(all.flatMap((p) => p.areas)))}{sel('Material', 'material', opts(all.flatMap((p) => matOf(p.id))))}{sel('Drucker', 'drucker', opts(all.flatMap((p) => devOf(p.id))))}{sel('Jahr', 'jahr', opts(all.map((p) => p.archivedAt?.slice(0, 4) ?? '')))}
        </div>
      </div>

      <PanelColumn side="left" top="38%" bottom="7%" width="22%">
      <Panel title="Zeitreise" icon={<IHistory />} delay={60}>
        <div className="bars">{months.map((m) => <div key={m.key} title={`${m.n} Projekte`}><i style={{ height: `${Math.max(3, (m.n / Math.max(1, ...months.map((x) => x.n))) * 44)}px`, background: m.n ? undefined : 'rgba(255,255,255,.1)' }} /><span>{m.label}</span></div>)}</div>
        <div className="grid2"><Stat value={all.length} label="archiviert" /><Stat value={totals.prints} label="Drucke" /><Stat value={fmtGrams(totals.g)} label="Material" /><Stat value={`${fmtNum(totals.h)} h`} label="Druckzeit" /></div>
      </Panel>

      <Panel title="Beliebte Tags" icon={<IStar />} delay={120}>
        <div className="pills">{tags.map(([t, n]) => <button key={t} className={`pill xs${tag === t ? ' pill--on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>#{t} <span className="faint">{n}</span></button>)}{tags.length === 0 ? <span className="muted small">Noch keine Tags.</span> : null}</div>
        <b className="small" style={{ marginTop: 4 }}>Wiederentdecken</b>
        {rediscover.map((p) => <div key={p.id} className="sim-item" onClick={() => { const r = reports.find((x) => x.projectId === p.id); if (r) openSheet({ kind: 'bericht', reportId: r.id }); }}><img src={islandSrc(p.island.libraryId, 256)} alt="" /><div className="col grow" style={{ gap: 0 }}><b className="small ellipsis">{p.name}</b><span className="xs muted">{fmtDate(p.archivedAt)}</span></div></div>)}
      </Panel>
      </PanelColumn>

      <Panel title="Galerie" icon={<IImage />} style={{ left: '27%', top: '60%', bottom: '10.5%', width: '43.5%' }} delay={100}
        right={<div className="row" style={{ gap: 6 }}><input className="input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }} placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} /><button className={`pill${fav ? ' pill--on' : ''}`} onClick={() => setFav(!fav)}><IStar width={12} height={12} /> Favoriten</button></div>}>
        {arch.length === 0 ? <p className="muted small">Nichts gefunden. Schließe ein Projekt bewusst ab, dann landet es hier mit Bericht.</p> : (
          <div className="gallery">
            {arch.map((p) => { const r = reports.find((x) => x.projectId === p.id); return (
              <div key={p.id} className="gcard" onClick={() => r ? openSheet({ kind: 'bericht', reportId: r.id }) : navigate({ world: 'projekte', projectId: p.id })}>
                <img src={p.island.kind === 'eigenes' && p.island.photoDataUrl ? p.island.photoDataUrl : islandSrc(p.island.libraryId, 256)} alt="" loading="lazy" />
                <div><div className="row"><b className="small ellipsis grow">{p.name}</b><button className="btn btn--icon btn--ghost" style={{ width: 20, height: 20, color: p.favorite ? '#ffd77a' : undefined }} onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}><IStar width={12} height={12} fill={p.favorite ? 'currentColor' : 'none'} /></button></div><span className="xs muted">{p.type.split(' / ')[0]} · {fmtDate(p.archivedAt)}</span>{r ? <span className="xs ellipsis">{r.result}</span> : null}</div>
              </div>
            ); })}
          </div>
        )}
      </Panel>

      <PanelColumn side="right" top="38%" bottom="2.5%" width="24%">
      <Panel title="Vorlagen" icon={<ICopy />} delay={140}>
        {templates.length === 0 ? <p className="muted small">Noch keine Vorlage. Speichere ein Projekt in der Innenwelt oder beim Abschluss als Vorlage.</p> : templates.map((p) => <div key={p.id} className="sim-item" onClick={() => { const nid = projectFromTemplate(p.id); navigate({ world: 'projekte', projectId: nid }); }}><img src={islandSrc(p.island.libraryId, 256)} alt="" /><div className="col grow" style={{ gap: 0 }}><b className="small ellipsis">{p.name}</b><span className="xs muted">{p.type.split(' / ')[0]} · {p.milestones.length} Meilensteine · {p.tags.length} Tags</span></div><span className="xs muted">Neu daraus</span></div>)}
      </Panel>

      <Panel title="Erfahrungen" icon={<ISparkle />} delay={200}>
        {lessons.length === 0 ? <p className="muted small">Noch keine Erfahrungen festgehalten.</p> : lessons.map((x, i) => <div key={i} className="col" style={{ gap: 0 }}><span className="small">{x.l}</span><span className="xs faint">{x.p}</span></div>)}
      </Panel>
      </PanelColumn>
      <div className="hand hand--bl" style={{ bottom: '4%' }}>{'Aus Ideen.\nWird morgen.'}</div>
    </>
  );
}
