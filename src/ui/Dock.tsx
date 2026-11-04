import { navigate } from '../router';
import { WORLDS, type WorldId } from '../types';
import { IArchive, ICube, IFlag, IHome, ILayers, ISun } from './Icons';

const ICONS: Record<WorldId, React.ReactNode> = { heute: <IHome />, projekte: <IFlag />, druck: <ICube />, material: <ILayers />, wetter: <ISun />, archiv: <IArchive /> };

export function Dock({ active }: { active: WorldId }) {
  return (
    <nav className="glass dock" aria-label="Welten">
      {WORLDS.map((w) => (
        <button key={w.id} className={w.id === active ? 'on' : ''} onClick={() => navigate({ world: w.id })} aria-current={w.id === active ? 'page' : undefined} title={`${w.label} (Taste ${w.key})`}>
          {ICONS[w.id]}<span>{w.label}</span><kbd>{w.key}</kbd>
        </button>
      ))}
    </nav>
  );
}
