import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Sheet } from './Sheet';
import { ISparkle, IFlag } from './Icons';
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
