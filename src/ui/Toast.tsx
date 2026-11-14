import { useStore } from '../store';
import { applyUpdate, useUpdateReady } from '../lib/pwa';

/** Kurzer Hinweis am unteren Rand; nach dem Löschen oder Abbrechen mit „Rückgängig“. Ohne anderen Hinweis: „Neue Version“, wenn ein neuerer Stand der App bereitliegt. */
export function Toast() {
  const toast = useStore((s) => s.ui.toast); const undo = useStore((s) => s.undo);
  const update = useUpdateReady();
  if (!toast) return update ? <div className="glass glass--strong toast" role="status"><span>Neue Version verfügbar</span><button className="toast__undo" onClick={applyUpdate}>Neu laden</button></div> : null;
  return <div className="glass glass--strong toast" role="status"><span>{toast.text}</span>{toast.undo ? <button className="toast__undo" onClick={undo}>Rückgängig</button> : null}</div>;
}
