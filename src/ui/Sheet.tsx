import { useEffect, type ReactNode } from 'react';
import { IX } from './Icons';

export function Sheet({ title, onClose, children, foot, icon }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode; icon?: ReactNode }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <aside className="glass glass--strong sheet" role="dialog" aria-label={title}>
        <div className="sheet__head">{icon}<h2>{title}</h2><button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Schließen"><IX /></button></div>
        <div className="sheet__body">{children}</div>
        {foot ? <div className="sheet__foot">{foot}</div> : null}
      </aside>
    </>
  );
}
