import { useMemo, useState } from 'react';
import { useStore, archivedProjects } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { fmtDate, fmtGrams, fmtNum, fold } from '../lib/format';
import { Panel, Stat } from '../ui/Glass';
import { islandSrc } from '../scene/Island';
import { IArchive, ISparkle, IStar, IImage } from '../ui/Icons';

export function Archiv() {
  const { projects, reports } = useStore(useShallow((s) => ({ projects: s.projects, reports: s.reports })));
  const openSheet = useStore((s) => s.openSheet); const toggleFavorite = useStore((s) => s.toggleFavorite);
  const [q, setQ] = useState(''); const [fav, setFav] = useState(false);
  const arch = useMemo(() => archivedProjects(projects).filter((p) => (!fav || p.favorite) && (!q || fold(`${p.name} ${p.type} ${p.tags.join(' ')} ${p.areas.join(' ')}`).includes(fold(q)))).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')), [projects, q, fav]);
  const lessons = reports.flatMap((r) => r.lessons.map((l) => ({ l, p: projects.find((p) => p.id === r.projectId)?.name })));
  const totals = { prints: reports.reduce((a, r) => a + r.printsTotal, 0), g: reports.reduce((a, r) => a + r.gramsUsed, 0), h: reports.reduce((a, r) => a + r.hours, 0) };

  return (
    <>
      <div className="world-title"><h1>Archiv</h1><p>Deine Projekte. Deine Ideen. Für später. Und für immer.</p></div>

      <Panel title="Archiv-Übersicht" icon={<IArchive />} style={{ left: '3.2%', top: '24%', width: '20%' }} delay={60}>
        <div className="grid2"><Stat value={arch.length} label="Projekte" /><Stat value={totals.prints} label="Drucke" /><Stat value={fmtGrams(totals.g)} label="Material" /><Stat value={`${fmtNum(totals.h)} h`} label="Druckzeit" /></div>
      </Panel>

      <Panel title="Galerie" icon={<IImage />} style={{ left: '25%', bottom: '11%', width: '50%', maxHeight: '38%' }} delay={100}
        right={<div className="row" style={{ gap: 6 }}><input className="input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }} placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} /><button className={`pill${fav ? ' pill--on' : ''}`} onClick={() => setFav(!fav)}><IStar width={12} height={12} /> Favoriten</button></div>}>
        {arch.length === 0 ? <p className="muted small">Noch nichts archiviert. Schließe ein Projekt bewusst ab, dann landet es hier mit Bericht.</p> : (
          <div className="gallery">
            {arch.map((p) => { const r = reports.find((x) => x.projectId === p.id); return (
              <div key={p.id} className="gcard" onClick={() => r ? openSheet({ kind: 'bericht', reportId: r.id }) : undefined}>
                <img src={p.island.kind === 'eigenes' && p.island.photoDataUrl ? p.island.photoDataUrl : islandSrc(p.island.libraryId, 256)} alt="" loading="lazy" />
                <div><div className="row"><b className="small ellipsis grow">{p.name}</b><button className="btn btn--icon btn--ghost" style={{ width: 20, height: 20, color: p.favorite ? '#ffd77a' : undefined }} onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}><IStar width={12} height={12} fill={p.favorite ? 'currentColor' : 'none'} /></button></div><span className="xs muted">{p.type} · {fmtDate(p.archivedAt)}</span>{r ? <span className="xs ellipsis">{r.result}</span> : null}</div>
              </div>
            ); })}
          </div>
        )}
      </Panel>

      <Panel title="Erfahrungen" icon={<ISparkle />} style={{ right: '3.2%', top: '24%', width: '24%', maxHeight: '46%' }} delay={140}>
        {lessons.length === 0 ? <p className="muted small">Noch keine Erfahrungen festgehalten.</p> : lessons.map((x, i) => <div key={i} className="col" style={{ gap: 0 }}><span className="small">{x.l}</span><span className="xs faint">{x.p}</span></div>)}
      </Panel>

      <Panel title="Inselbibliothek" icon={<IImage />} style={{ right: '3.2%', top: '72%', width: '24%' }} delay={200}>
        <div className="row" style={{ gap: 6 }}>{(['werkstatt', 'elektronik', 'ideen', 'rahmen'] as const).map((k) => <img key={k} src={islandSrc(k, 256)} alt={k} title={k} style={{ width: '23%', height: 'auto' }} />)}</div>
        <p className="xs faint">Vier echte Inselmotive plus eigenes Bild mit Rahmen; weitere folgen später.</p>
      </Panel>
    </>
  );
}
