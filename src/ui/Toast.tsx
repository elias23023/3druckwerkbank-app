import { useStore } from '../store';

/** Kurzer Hinweis am unteren Rand; nach dem Löschen oder Abbrechen mit „Rückgängig“. */
export function Toast() {
  const toast = useStore((s) => s.ui.toast); const undo = useStore((s) => s.undo);
  if (!toast) return null;
  return <div className="glass glass--strong toast" role="status"><span>{toast.text}</span>{toast.undo ? <button className="toast__undo" onClick={undo}>Rückgängig</button> : null}</div>;
}
