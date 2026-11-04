import { navigate } from '../router';
import { WORLDS, type WorldId } from '../types';
import { IArchive, ICube, IFlag, IHome, ILayers, ISun, IClock } from './Icons';

const ICONS: Record<WorldId, React.ReactNode> = { heute: <IClock />, projekte: <IFlag />, druck: <ICube />, material: <ILayers />, wetter: <ISun />, archiv: <IArchive /> };

export function Dock({ active }: { active: WorldId | 'start' }) {
  return (
    <nav className="glass dock" aria-label="Welten">
      <button className={active === 'start' ? 'on' : ''} onClick={() => navigate({ world: 'start' })} aria-current={active === 'start' ? 'page' : undefined} title="Start (Taste 0)"><IHome /><span>Start</span></button>
      {WORLDS.map((w) => (
        <button key={w.id} className={w.id === active ? 'on' : ''} onClick={() => navigate({ world: w.id })} aria-current={w.id === active ? 'page' : undefined} title={`${w.label} (Taste ${w.key})`}>
          {ICONS[w.id]}<span>{w.label}</span><kbd>{w.key}</kbd>
        </button>
      ))}
    </nav>
  );
}
