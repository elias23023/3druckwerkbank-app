import { useStore } from '../store';

/** Kurzer Hinweis am unteren Rand; nach dem Löschen oder Abbrechen mit „Rückgängig“.
 *  key per toast: a new toast is a new element, so the old one is really removed and (Wasser-Look) leaves softly as an inert copy under the new one (wasser.js, option "toasts"). */
export function Toast() {
  const toast = useStore((s) => s.ui.toast); const undo = useStore((s) => s.undo);
  if (!toast) return null;
  return <div key={toast.id} className="glass glass--strong toast" role="status"><span>{toast.text}</span>{toast.undo ? <button className="toast__undo" onClick={undo}>Rückgängig</button> : null}</div>;
}
