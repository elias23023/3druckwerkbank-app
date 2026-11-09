import { useMemo, useState } from 'react';
import { useStore, printProgress, printRemainingMin, liveProjects } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow } from '../lib/time';
import { fmtDuration, fmtNum, relTime, fmtGrams, fold } from '../lib/format';
import { PanelColumn, Panel, Check, Stat } from '../ui/Glass';
import { IPrinter, IList, IWrench, IUp, IDown, IPlay, IX, ILayers, IDownload, IBolt, IPlus } from '../ui/Icons';
import { STATUS_COLOR as stColor } from '../forms/GeraetForm';
import type { PrintJob } from '../types';

const REASONS = ['Material fehlt', 'Drucker belegt', 'Wartung überfällig', 'Werkzeug fehlt', 'Wetter / PV abwarten', 'Komplexität', 'Eigener Grund'];

export function Druck() {
  const now = useNow(1000);
  const { devices, prints, spools, projects, settings, energy } = useStore(useShallow((s) => ({ devices: s.devices, prints: s.prints, spools: s.spools, projects: s.projects, settings: s.settings, energy: s.energy ?? [] })));
  const a = useStore(useShallow((s) => ({ openSheet: s.openSheet, startNextPrint: s.startNextPrint, movePrint: s.movePrint, cancelPrint: s.cancelPrint, toggleMaintenance: s.toggleMaintenance, finishPrint: s.finishPrint, assignPrint: s.assignPrint, ignorePrint: s.ignorePrint, projectFromPrint: s.projectFromPrint, setWaitReason: s.setWaitReason })));
  const [inboxTab, setInboxTab] = useState<'neu' | 'zugeordnet' | 'ignoriert'>('neu');
  const printers = devices.filter((d) => d.kind === 'drucker');
  const running = prints.filter((p) => p.status === 'läuft');
  const queue = prints.filter((p) => p.status === 'wartend').sort((x, y) => x.queueOrder - y.queueOrder);
  const [pick, setPick] = useState<string | undefined>();
  const main = running.find((p) => p.id === pick) ?? running.find((p) => p.printerId === settings.defaultPrinterId) ?? running[0];
  const mainSpool = main ? spools.find((sp) => sp.id === main.spoolId) : undefined;
  const prog = main ? printProgress(main, now.getTime()) : 0;
  const amsAll = devices.filter((d) => d.kind === 'ams');
  const ams = amsAll.find((d) => d.parentId && d.parentId === (main?.printerId ?? settings.defaultPrinterId)) ?? amsAll[0];
  const others = devices.filter((d) => d.kind === 'trockner' || (d.kind === 'ams' && d.id !== ams?.id));
  const maint = devices.flatMap((d) => d.maintenance.filter((m) => !m.done).map((m) => ({ d, m }))).sort((x, y) => x.m.due.localeCompare(y.m.due));
  const R = 54, C = 2 * Math.PI * R;
  const live = liveProjects(projects);

  /** Why a queued job is ready or blocked (plan: show the reason). */
  const readiness = (q: PrintJob): { ok: boolean; text: string } => {
    const sp = spools.find((s) => s.id === q.spoolId); const dev = devices.find((d) => d.id === q.printerId);
    if (q.waitReason) return { ok: false, text: q.waitReason };
    if (!dev) return { ok: false, text: 'Drucker fehlt' };
    if (dev.status === 'offline' || dev.status === 'wartung') return { ok: false, text: `${dev.name} ${dev.status === 'offline' ? 'offline' : 'in Wartung'}` };
    if (sp && sp.remainingGrams < q.gramsPlanned) return { ok: false, text: `Material fehlt (${fmtGrams(sp.remainingGrams)} auf der Rolle)` };
    if (dev?.maintenance.some((m) => !m.done && new Date(m.due).getTime() < now.getTime())) return { ok: false, text: 'Wartung überfällig' };
    if (prints.some((p) => p.printerId === q.printerId && p.status === 'läuft')) return { ok: false, text: `${dev.name} belegt` };
    return { ok: true, text: 'Bereit' };
  };
  // free printers whose next queued job is ready (shown next to a running print)
  const idle = printers.filter((d) => !running.some((p) => p.printerId === d.id) && (() => { const q = queue.find((x) => x.printerId === d.id); return !!q && readiness(q).ok; })());
  // statistics (30 days) incl. energy entries
  const since = now.getTime() - 30 * 86400_000;
  const done30 = prints.filter((p) => p.status === 'fertig' && p.finishedAt && new Date(p.finishedAt).getTime() >= since);
  const stats = { parts: done30.length, hours: done30.reduce((a, p) => a + p.estimatedMinutes / 60, 0), grams: done30.reduce((a, p) => a + (p.gramsUsed ?? 0), 0), ok: done30.length ? Math.round((done30.filter((p) => p.result === 'erfolg').length / done30.length) * 100) : 0 };
  const e30 = energy.filter((e) => new Date(e.at).getTime() >= since);
  const kwhMeasured = e30.filter((e) => e.source === 'messung').reduce((a, e) => a + e.wh, 0) / 1000;
  const kwhEst = e30.filter((e) => e.source === 'schaetzung').reduce((a, e) => a + e.wh, 0) / 1000;
  const weeks = useMemo(() => Array.from({ length: 8 }, (_, i) => { const t0 = now.getTime() - (8 - i) * 7 * 86400_000, t1 = t0 + 7 * 86400_000; return prints.filter((p) => p.status === 'fertig' && p.finishedAt && new Date(p.finishedAt).getTime() >= t0 && new Date(p.finishedAt).getTime() < t1).length; }), [prints, now]);
  // inbox with suggestions
  const inbox = prints.filter((p) => p.imported || (!p.projectId && p.status === 'fertig'));
  const suggest = (p: PrintJob) => live.filter((x) => !x.archivedAt).map((x) => { const toks = fold(p.name).split(/[^a-z0-9]+/).filter((t) => t.length > 2); const hay = fold(`${x.name} ${x.tags.join(' ')} ${x.description}`); const hits = toks.filter((t) => hay.includes(t)).length; return { x, score: hits + (prints.some((o) => o.projectId === x.id && o.printerId === p.printerId) ? .5 : 0) }; }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((r) => ({ ...r, level: r.score >= 2 ? 'hoch' : r.score >= 1 ? 'mittel' : 'niedrig' }));

  return (
    <>
      <div className="world-title"><h1>3D-Druck</h1><p>Deine Drucker. Immer im Blick.</p></div>

      <PanelColumn side="left" top="38%" bottom="10.5%" width="22%">
      <Panel title="Drucker & Geräte" icon={<IPrinter />} delay={60} right={<><button className="btn btn--sm btn--ghost" style={{ fontSize: 11 }} onClick={() => a.openSheet({ kind: 'geraete' })}>verwalten</button><button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} aria-label="Gerät hinzufügen" title="Gerät hinzufügen" onClick={() => a.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPlus width={14} height={14} /></button></>}>
        {printers.length === 0 ? <div className="col" style={{ gap: 6 }}><p className="muted small">Noch kein Drucker angelegt.</p><button className="btn btn--sm btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => a.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPlus width={12} height={12} /> Drucker anlegen</button></div> : null}
        {printers.map((d) => { const job = prints.find((p) => p.printerId === d.id && p.status === 'läuft'); return (
          <div key={d.id} className="item item--click" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') a.openSheet({ kind: 'geraet', deviceId: d.id }); }} onClick={() => a.openSheet({ kind: 'geraet', deviceId: d.id })}>
            <span className="dot" style={{ background: stColor[d.status] }} />
            <div className="grow col" style={{ gap: 1, minWidth: 0 }}><div className="row"><b className="small">{d.name}</b><span className="xs muted ellipsis">{d.model}</span>{settings.defaultPrinterId === d.id ? <span className="pill xs">Standard</span> : null}</div><span className="xs muted ellipsis">{job ? (job.resultDue ? `${job.name} · Ergebnis buchen` : `${job.name} · ${fmtNum(printProgress(job, now.getTime()) * 100)} % · noch ${fmtDuration(printRemainingMin(job, now.getTime()))}`) : d.maintenance.some((m) => !m.done && new Date(m.due).getTime() < now.getTime()) ? 'Wartung fällig' : [d.status, d.nozzle].filter(Boolean).join(' · ')}</span></div>
          </div>
        ); })}
        {others.map((d) => <div key={d.id} className="item item--click" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') a.openSheet({ kind: 'geraet', deviceId: d.id }); }} onClick={() => a.openSheet({ kind: 'geraet', deviceId: d.id })}><span className="dot" style={{ background: stColor[d.status] }} /><div className="grow col" style={{ gap: 1, minWidth: 0 }}><b className="small">{d.name}</b><span className="xs muted ellipsis">{d.notes ?? d.status}</span></div></div>)}
      </Panel>
      {ams ? (
        <Panel title={ams.name || 'AMS'} icon={<ILayers />} right={<button className="btn btn--sm btn--ghost" style={{ fontSize: 11 }} onClick={() => a.openSheet({ kind: 'geraet', deviceId: ams.id })}>verwalten</button>} delay={120}>
          <div className="ams">
            {(ams.slots ?? []).map((sl) => { const sp = spools.find((x) => x.id === sl.spoolId); const fill = sp ? Math.min(1, sp.remainingGrams / Math.max(1, sp.initialGrams)) : 0; return (
              <div key={sl.index}>
                <svg className="spoolsvg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#1a1d23" /><circle cx="20" cy="20" r={17 * Math.max(.2, fill)} fill={sp?.colorHex ?? '#333'} stroke="rgba(255,255,255,.35)" strokeWidth=".8" /><circle cx="20" cy="20" r="5" fill="#0a0b0d" /></svg>
                <b>{sl.index}</b><span>{sp ? sp.material : 'leer'}</span><span className="muted">{sp ? `${Math.round(fill * 100)} %` : '–'}</span>
              </div>
            ); })}
          </div>
        </Panel>
      ) : null}
      </PanelColumn>


      <Panel strong style={{ left: '27%', top: '60%', bottom: '10.5%', width: '43.5%' }} delay={100}
        foot={main ? <><button className="btn btn--sm btn--primary" onClick={() => a.openSheet({ kind: 'druck', printId: main.id })}>Ergebnis buchen</button>{running.length > 1 ? running.filter((p) => p.id !== main.id).map((p) => <button key={p.id} className="btn btn--sm" onClick={() => setPick(p.id)}>{devices.find((d) => d.id === p.printerId)?.name ?? 'Drucker'} zeigen</button>) : null}{idle.map((d) => <button key={d.id} className="btn btn--sm" onClick={() => a.startNextPrint(d.id)}><IPlay width={12} height={12} /> {d.name} starten</button>)}<button className="btn btn--sm btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`Laufenden Druck „${main.name}“ abbrechen? Es wird kein Material gebucht.`)) a.cancelPrint(main.id); }}><IX width={12} height={12} /> Druck abbrechen</button></> : printers.length === 0 ? <button className="btn btn--sm btn--primary" onClick={() => a.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPlus width={12} height={12} /> Drucker anlegen</button> : <>{printers.map((d) => <button key={d.id} className="btn btn--sm btn--primary" disabled={!queue.some((q) => q.printerId === d.id && readiness(q).ok)} onClick={() => a.startNextPrint(d.id)}><IPlay width={12} height={12} /> {d.name} starten</button>)}</>}>
        {main ? (
          <div className="row" style={{ gap: 16 }}>
            <svg width="118" height="118" viewBox="0 0 128 128" style={{ flex: 'none' }}>
              <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" />
              <circle cx="64" cy="64" r={R} fill="none" stroke="url(#pg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - prog)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              <defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stopColor="#7cc6ff" /><stop offset="1" stopColor="#4ccf7a" /></linearGradient></defs>
              <text x="64" y="60" textAnchor="middle" fontSize="22" fontWeight="600" fill="currentColor">{fmtNum(prog * 100)} %</text>
              <text x="64" y="78" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">{main.resultDue ? 'Zeit abgelaufen' : `noch ${fmtDuration(printRemainingMin(main, now.getTime()))}`}</text>
            </svg>
            <div className="col grow" style={{ gap: 6 }}>
              <div><h2 style={{ fontSize: 18 }}>{main.name}</h2><span className="small muted">{projects.find((p) => p.id === main.projectId)?.name ?? 'ohne Projekt'} · {devices.find((d) => d.id === main.printerId)?.name ?? 'Drucker'}</span></div>
              <div className="row small" style={{ gap: 8 }}><span className="swatch" style={{ background: mainSpool?.colorHex ?? '#888', width: 18, height: 18 }} /><span className="grow">{mainSpool?.label ?? 'Rolle unbekannt'}</span><span className="muted">{fmtNum(main.gramsPlanned * prog)} / {main.gramsPlanned} g</span></div>
              <div className="flow"><i /></div>
              <div className="row xs muted" style={{ gap: 12 }}><span>Start {main.startedAt ? relTime(main.startedAt, now.getTime()) : '–'}</span><span>≈ {fmtNum(((main.estimatedMinutes / 60) * (devices.find((d) => d.id === main.printerId)?.wattage ?? settings.printerWatts)) / 1000, 2)} kWh (Schätzung)</span>{main.resultDue ? <span className="pill pill--warn xs">Ergebnis buchen</span> : null}</div>
            </div>
          </div>
        ) : <><h2 style={{ fontSize: 18 }}>{printers.length === 0 ? 'Richte deine Druckecke ein' : 'Kein Druck läuft'}</h2><p className="small muted">{printers.length === 0 ? 'Leg zuerst deinen Drucker an. Danach kannst du aus jedem Projekt heraus Drucke planen, die hier in der Warteschlange erscheinen.' : queue.length ? `${queue.length} in der Warteschlange.` : 'Plane einen Druck aus einem Projekt heraus: Projekt öffnen, dann „Neuen Druck planen“.'}</p></>}
        {printers.length > 0 ? (
          <div className="druck-stats">
            <div className="row" style={{ gap: 6 }}><IBolt width={14} height={14} className="muted" /><b className="small">Statistiken (30 Tage)</b></div>
            <div className="druck-stats__row">
              <Stat value={stats.parts} label="Gedruckte Teile" /><Stat value={`${fmtNum(stats.hours)} h`} label="Druckzeit" /><Stat value={fmtGrams(stats.grams)} label="Material" /><Stat value={stats.parts ? `${stats.ok} %` : '–'} label="Erfolgsquote" />
              <div className="bars" style={{ height: 36 }} title="Fertige Drucke je Woche, letzte acht Wochen">{weeks.map((n, i) => <div key={i}><i style={{ height: `${Math.max(3, (n / Math.max(1, ...weeks)) * 28)}px` }} /><span>W{i + 1}</span></div>)}</div>
            </div>
            <span className="xs muted">Energie: {fmtNum(kwhMeasured, 2)} kWh gemessen · {fmtNum(kwhEst, 2)} kWh geschätzt · ≈ {fmtNum((kwhMeasured + kwhEst) * settings.pricePerKwh, 2)} €</span>
          </div>
        ) : null}
      </Panel>

      <PanelColumn side="right" top="38%" bottom="10.5%" width="24%">
      <Panel title="Nächste Drucke" icon={<IList />} delay={140}>
        {queue.length === 0 ? <p className="muted small">Keine Drucke in der Warteschlange.</p> : queue.map((q, i) => { const r = readiness(q); return (
          <div key={q.id} className="item" style={{ padding: '6px 8px', alignItems: 'flex-start' }}>
            <span className="xs faint" style={{ width: 14, marginTop: 2 }}>{i + 1}</span>
            <div className="grow col item--click" style={{ gap: 2 }} onClick={() => a.openSheet({ kind: 'druck', printId: q.id })}>
              <span className="small ellipsis">{q.name}</span>
              <span className="xs muted">{devices.find((d) => d.id === q.printerId)?.name ?? 'Drucker fehlt'} · {fmtDuration(q.estimatedMinutes)} · {q.gramsPlanned} g</span>
              <div className="row" style={{ gap: 4 }}><span className={`pill xs ${r.ok ? 'pill--ok' : 'pill--warn'}`}>{r.text}</span><select className="select xs" style={{ width: 'auto', padding: '1px 4px', fontSize: 10 }} value={q.waitReason ?? ''} onChange={(e) => a.setWaitReason(q.id, e.target.value || undefined)} title="Wartegrund"><option value="">Wartegrund …</option>{REASONS.map((x) => <option key={x}>{x}</option>)}</select></div>
            </div>
            <div className="col" style={{ gap: 0 }}><button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === 0} aria-label="Nach vorne" title="Nach vorne" onClick={() => a.movePrint(q.id, -1)}><IUp width={11} height={11} /></button><button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === queue.length - 1} aria-label="Nach hinten" title="Nach hinten" onClick={() => a.movePrint(q.id, 1)}><IDown width={11} height={11} /></button><button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Aus Warteschlange entfernen" aria-label="Aus Warteschlange entfernen" onClick={() => { if (confirm(`„${q.name}“ aus der Warteschlange entfernen?`)) a.cancelPrint(q.id); }}><IX width={11} height={11} /></button></div>
          </div>
        ); })}
      </Panel>

      <Panel title="Wartung & Status" icon={<IWrench />} delay={200}>
        {maint.length === 0 ? <p className="muted small">{devices.length ? 'Keine Wartung offen. Wartungen planst du am Gerät.' : 'Noch keine Geräte.'}</p> : maint.slice(0, 3).map(({ d, m }) => <div key={m.id} className="row small"><Check on={m.done} onClick={() => a.toggleMaintenance(d.id, m.id)} /><span className="grow ellipsis">{d.name}: {m.title}</span>{new Date(m.due).getTime() < now.getTime() ? <span className="pill pill--warn xs">überfällig</span> : <span className="xs muted">{relTime(m.due, now.getTime())}</span>}</div>)}
      </Panel>
      <Panel title="Eingang" icon={<IDownload />} right={<div className="tabs" style={{ padding: 2 }}>{(['neu', 'zugeordnet', 'ignoriert'] as const).map((t) => <button key={t} className={inboxTab === t ? 'on' : ''} style={{ padding: '2px 8px' }} onClick={() => setInboxTab(t)}>{t === 'neu' ? `Neu ${inbox.filter((p) => !p.ignored).length}` : t === 'zugeordnet' ? 'Zugeordnet' : `Ignoriert ${inbox.filter((p) => p.ignored).length}`}</button>)}</div>} delay={280}>
        {inboxTab === 'zugeordnet' && !prints.some((p) => p.projectId && p.imported === false) ? <p className="muted small">Noch nichts zugeordnet.</p> : null}
        {inboxTab === 'zugeordnet' ? prints.filter((p) => p.projectId && p.imported === false).slice(0, 3).map((p) => <div key={p.id} className="row small"><span className="dot" style={{ background: '#4ccf7a' }} /><span className="grow ellipsis">{p.name}</span><span className="xs muted">{projects.find((x) => x.id === p.projectId)?.name}</span></div>) : null}
        {inboxTab !== 'zugeordnet' ? (inbox.filter((p) => !!p.ignored === (inboxTab === 'ignoriert')).length === 0 ? <p className="muted small">{inboxTab === 'neu' ? 'Keine neuen Drucke ohne Projekt.' : 'Nichts ignoriert.'}</p> : inbox.filter((p) => !!p.ignored === (inboxTab === 'ignoriert')).map((p) => { const sug = suggest(p); return (
          <div key={p.id} className="col" style={{ gap: 4, padding: '6px 8px', borderRadius: 10, background: 'rgba(255,255,255,.06)' }}>
            <div className="row small"><IPrinter width={14} height={14} className="muted" /><b className="grow ellipsis">{p.name}</b><span className={`pill xs ${p.result === 'erfolg' ? 'pill--ok' : 'pill--warn'}`}>{p.result}</span></div>
            <span className="xs muted">{[devices.find((d) => d.id === p.printerId)?.name, fmtDuration(p.estimatedMinutes), `${p.gramsUsed ?? p.gramsPlanned} g`, p.finishedAt ?? p.startedAt ? relTime((p.finishedAt ?? p.startedAt)!, now.getTime()) : ''].filter(Boolean).join(' · ')}</span>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {sug.map((r) => <button key={r.x.id} className="pill xs" title={`Einschätzung ${r.level}`} onClick={() => a.assignPrint(p.id, r.x.id)}>→ {r.x.name} <span className="faint">({r.level})</span></button>)}
              <select className="select xs" style={{ width: 'auto', padding: '1px 4px', fontSize: 10 }} value="" onChange={(e) => { if (e.target.value) a.assignPrint(p.id, e.target.value); }}><option value="">Projekt wählen …</option>{live.filter((x) => !x.archivedAt).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <button className="btn btn--sm btn--ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => a.projectFromPrint(p.id)}>Neues Projekt</button>
              <button className="btn btn--sm btn--ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => a.ignorePrint(p.id, !p.ignored)}>{p.ignored ? 'Zurückholen' : 'Ignorieren'}</button>
            </div>
          </div>
        ); })) : null}
      </Panel>
      </PanelColumn>



      <div className="hand hand--tr">{'Nicht nur drucken,\nsondern Möglichkeiten\nerschaffen.'}</div>
    </>
  );
}
