import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Sheet } from './Sheet';
import { ISparkle, IFlag, IUser, IGear, IChevR, IInfo } from './Icons';
import { workspace, WORKSPACE_META, switchWorkspace, peekWorkspace, type Workspace } from '../lib/workspace';
import { activeProjects } from '../store';

/** Wechsel zwischen Beispiel-Werkstatt (Demodaten) und Meine Werkstatt (echte Daten). Beide Bereiche haben getrennten Speicher. */
export function BereichSheet() {
  const close = useStore((s) => s.closeSheet);
  const { projects, spools } = useStore(useShallow((s) => ({ projects: s.projects, spools: s.spools })));
  const here = { projects: activeProjects(projects).length, spools: spools.length };
  const other: Workspace = workspace === 'demo' ? 'echt' : 'demo';
  const peek = peekWorkspace(other);
  const Card = ({ w, counts }: { w: Workspace; counts: { projects: number; spools: number } | null }) => {
    const m = WORKSPACE_META[w]; const active = w === workspace;
    return (
      <div className={`bereich-card${active ? ' bereich-card--on' : ''}`} style={{ ['--c' as string]: m.color }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>{w === 'demo' ? <ISparkle /> : <IFlag />}<b>{m.label}</b>{active ? <span className="pill xs" style={{ marginLeft: 'auto' }}>aktiv</span> : null}</div>
        <span className="small muted">{m.hint}</span>
        <span className="xs faint">{counts ? `${counts.projects} Projekte · ${counts.spools} Rollen` : w === 'echt' ? 'Noch leer, startet mit deinen Druckern und Werkzeugen.' : 'Demodaten'}</span>
        {active ? null : <button className="btn btn--primary btn--sm" onClick={() => switchWorkspace(w)}>Zu „{m.short}“ wechseln</button>}
      </div>
    );
  };
  return (
    <Sheet title="Bereich wählen" icon={workspace === 'demo' ? <ISparkle /> : <IFlag />} onClose={close}>
      <p className="small">Die App hat zwei getrennte Bereiche mit eigenem Speicher. Du kannst jederzeit wechseln, nichts geht verloren.</p>
      <Card w="echt" counts={workspace === 'echt' ? here : peek} />
      <Card w="demo" counts={workspace === 'demo' ? here : peek} />
      <span className="xs faint" style={{ display: 'block', marginTop: 10 }}>Der Wechsel lädt die Seite neu. Export und Import in den Einstellungen gelten immer für den gerade aktiven Bereich; so kannst du auch Daten vom Beispiel in deine Werkstatt übernehmen.</span>
    </Sheet>
  );
}

/** Phone: the one drop in the header for everything about the person and the app (account, settings, area, about). */
export function MenueSheet() {
  const close = useStore((s) => s.closeSheet); const open = useStore((s) => s.openSheet);
  const m = WORKSPACE_META[workspace];
  const Row = ({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) => (
    <button className="item menue-row" onClick={onClick}>{icon}<span className="col grow" style={{ gap: 1, textAlign: 'left' }}><b className="small">{title}</b><span className="xs muted">{hint}</span></span><IChevR className="muted" /></button>
  );
  return (
    <Sheet title="Konto und Einstellungen" icon={<IUser />} onClose={close}>
      <div className="list">
        <Row icon={<IUser />} title="Konto" hint="Anmelden, Abgleich, gemeinsame Werkstatt" onClick={() => open({ kind: 'konto' })} />
        <Row icon={<IGear />} title="Einstellungen" hint="Ort, Erscheinungsbild, Export und Import" onClick={() => open({ kind: 'einstellungen' })} />
        <Row icon={workspace === 'demo' ? <ISparkle /> : <IFlag />} title="Bereich" hint={`Aktiv: ${m.label}`} onClick={() => open({ kind: 'bereich' })} />
        <Row icon={<IInfo />} title="Über diesen Entwurf" hint="Was funktioniert, was noch fehlt" onClick={() => open({ kind: 'ueber' })} />
      </div>
    </Sheet>
  );
}
