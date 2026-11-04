import { useStore, printProgress, printRemainingMin } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow } from '../lib/time';
import { fmtDuration, fmtNum, relTime } from '../lib/format';
import { Panel, Check } from '../ui/Glass';
import { IPrinter, IList, IWrench, IUp, IDown, IPlay, IX, ILayers } from '../ui/Icons';

export function Druck() {
  const now = useNow(1000);
  const { devices, prints, spools, projects, settings } = useStore(useShallow((s) => ({ devices: s.devices, prints: s.prints, spools: s.spools, projects: s.projects, settings: s.settings })));
  const a = useStore(useShallow((s) => ({ openSheet: s.openSheet, startNextPrint: s.startNextPrint, movePrint: s.movePrint, cancelPrint: s.cancelPrint, toggleMaintenance: s.toggleMaintenance, finishPrint: s.finishPrint })));
  const printers = devices.filter((d) => d.kind === 'drucker');
  const running = prints.filter((p) => p.status === 'läuft');
  const queue = prints.filter((p) => p.status === 'wartend').sort((x, y) => x.queueOrder - y.queueOrder);
  const main = running[0];
  const mainSpool = main ? spools.find((sp) => sp.id === main.spoolId) : undefined;
  const prog = main ? printProgress(main, now.getTime()) : 0;
  const ams = devices.find((d) => d.kind === 'ams'); const dryer = devices.find((d) => d.kind === 'trockner');
  const maint = devices.flatMap((d) => d.maintenance.filter((m) => !m.done).map((m) => ({ d, m }))).sort((x, y) => x.m.due.localeCompare(y.m.due));
  const stColor: Record<string, string> = { bereit: '#4ccf7a', druckt: '#7cc6ff', wartung: '#ffb547', offline: '#8a8f96', trocknet: '#ffbd6b' };
  const R = 54, C = 2 * Math.PI * R;

  return (
    <>
      <div className="world-title"><h1>3D-Druck</h1><p>Deine Drucker. Immer im Blick.</p></div>

      <Panel title="Drucker" icon={<IPrinter />} style={{ left: '3.2%', top: '24%', width: '24%', maxHeight: '44%' }} delay={60}>
        {printers.map((d) => {
          const job = prints.find((p) => p.printerId === d.id && p.status === 'läuft');
          return (
            <div key={d.id} className="item item--click" onClick={() => a.openSheet({ kind: 'geraet', deviceId: d.id })}>
              <span className="dot" style={{ background: stColor[d.status] }} />
              <div className="grow col" style={{ gap: 1 }}>
                <div className="row"><b className="small">{d.name}</b><span className="xs muted">{d.model}</span></div>
                <span className="xs muted ellipsis">{job ? `${job.name} · ${fmtNum(printProgress(job, now.getTime()) * 100)} %` : d.status === 'bereit' ? `bereit · ${d.nozzle}` : d.status}</span>
              </div>
              <span className="xs faint">{fmtNum(d.hoursTotal)} h</span>
            </div>
          );
        })}
        {ams ? <div className="item item--click" onClick={() => a.openSheet({ kind: 'geraet', deviceId: ams.id })}><ILayers width={16} height={16} /><div className="grow col" style={{ gap: 2 }}><b className="small">{ams.name} · Materialfluss</b><div className="row" style={{ gap: 4 }}>{(ams.slots ?? []).map((sl) => { const sp = spools.find((x) => x.id === sl.spoolId); return <span key={sl.index} className="pill xs" style={{ gap: 4 }}><span className="swatch" style={{ width: 10, height: 10, background: sp?.colorHex ?? 'transparent', boxShadow: 'none' }} />{sp ? sp.material : 'leer'}</span>; })}</div></div></div> : null}
        {dryer ? <div className="item item--click" onClick={() => a.openSheet({ kind: 'geraet', deviceId: dryer.id })}><span className="dot" style={{ background: stColor[dryer.status] }} /><div className="grow col" style={{ gap: 1 }}><b className="small">{dryer.name}</b><span className="xs muted">{dryer.notes ?? dryer.status}</span></div></div> : null}
      </Panel>

      <Panel strong style={{ left: '32%', bottom: '11%', width: '36%' }} delay={100}
        foot={main ? <><button className="btn btn--sm" onClick={() => a.openSheet({ kind: 'druck', printId: main.id })}>Details</button><button className="btn btn--sm btn--ghost" onClick={() => a.finishPrint(main.id, 'erfolg')}>Als fertig buchen</button><button className="btn btn--sm btn--ghost btn--danger" onClick={() => a.cancelPrint(main.id)}><IX width={12} height={12} /> Abbrechen</button><span className="xs faint" style={{ marginLeft: 'auto' }}>simuliert</span></> : <>{printers.map((d) => <button key={d.id} className="btn btn--sm btn--primary" disabled={!queue.some((q) => q.printerId === d.id)} onClick={() => a.startNextPrint(d.id)}><IPlay width={12} height={12} /> {d.name} starten</button>)}</>}>
        {main ? (
          <div className="row" style={{ gap: 16 }}>
            <svg width="128" height="128" viewBox="0 0 128 128" style={{ flex: 'none' }}>
              <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" />
              <circle cx="64" cy="64" r={R} fill="none" stroke="url(#pg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - prog)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              <defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stopColor="#7cc6ff" /><stop offset="1" stopColor="#4ccf7a" /></linearGradient></defs>
              <text x="64" y="60" textAnchor="middle" fontSize="22" fontWeight="600" fill="#fff">{fmtNum(prog * 100)} %</text>
              <text x="64" y="78" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.7)">noch {fmtDuration(printRemainingMin(main, now.getTime()))}</text>
            </svg>
            <div className="col grow" style={{ gap: 6 }}>
              <div><h2 style={{ fontSize: 18 }}>{main.name}</h2><span className="small muted">{projects.find((p) => p.id === main.projectId)?.name} · {devices.find((d) => d.id === main.printerId)?.name}</span></div>
              <div className="row small" style={{ gap: 8 }}>
                <span className="swatch" style={{ background: mainSpool?.colorHex ?? '#888', width: 18, height: 18 }} />
                <span className="grow">{mainSpool?.label ?? 'Rolle unbekannt'}</span>
                <span className="muted">{fmtNum(main.gramsPlanned * prog)} / {main.gramsPlanned} g</span>
              </div>
              <div className="flow"><i /></div>
              <div className="row xs muted" style={{ gap: 12 }}><span>Start {relTime(main.startedAt!, now.getTime())}</span><span>≈ {fmtNum(((main.estimatedMinutes / 60) * settings.printerWatts) / 1000, 2)} kWh · {fmtNum((((main.estimatedMinutes / 60) * settings.printerWatts) / 1000) * settings.pricePerKwh, 2)} € (Schätzung)</span></div>
            </div>
          </div>
        ) : <><h2 style={{ fontSize: 18 }}>Kein Druck läuft</h2><p className="small muted">{queue.length ? `${queue.length} in der Warteschlange.` : 'Plane einen Druck aus einem Projekt heraus.'}</p></>}
      </Panel>

      <Panel title="Warteschlange" icon={<IList />} style={{ right: '3.2%', top: '24%', width: '24%', maxHeight: '38%' }} delay={140}>
        {queue.length === 0 ? <p className="muted small">Leer.</p> : queue.map((q, i) => (
          <div key={q.id} className="item" style={{ padding: '6px 8px' }}>
            <span className="xs faint" style={{ width: 14 }}>{i + 1}</span>
            <div className="grow col item--click" style={{ gap: 1 }} onClick={() => a.openSheet({ kind: 'druck', printId: q.id })}>
              <span className="small ellipsis">{q.name}</span>
              <span className="xs muted">{devices.find((d) => d.id === q.printerId)?.name} · {fmtDuration(q.estimatedMinutes)} · {q.gramsPlanned} g · {spools.find((s) => s.id === q.spoolId)?.label ?? '–'}</span>
            </div>
            <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === 0} onClick={() => a.movePrint(q.id, -1)}><IUp width={11} height={11} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === queue.length - 1} onClick={() => a.movePrint(q.id, 1)}><IDown width={11} height={11} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Entfernen" onClick={() => a.cancelPrint(q.id)}><IX width={11} height={11} /></button>
          </div>
        ))}
      </Panel>

      <Panel title="Wartung" icon={<IWrench />} style={{ right: '3.2%', top: '65%', width: '24%', maxHeight: '26%' }} delay={200}>
        {maint.length === 0 ? <p className="muted small">Nichts offen.</p> : maint.map(({ d, m }) => (
          <div key={m.id} className="item" style={{ padding: '5px 8px' }}>
            <Check on={m.done} onClick={() => a.toggleMaintenance(d.id, m.id)} />
            <div className="grow col" style={{ gap: 0 }}><span className="small">{m.title}</span><span className="xs muted">{d.name} · {new Date(m.due).getTime() < now.getTime() ? <span className="pill pill--warn xs">überfällig</span> : relTime(m.due, now.getTime())}</span></div>
          </div>
        ))}
      </Panel>
    </>
  );
}
