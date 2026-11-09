import { useEffect, useRef, type ReactNode } from 'react';
import { IX } from './Icons';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ title, onClose, children, foot, icon }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode; icon?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = ref.current;
    // focus moves into the dialog (unless a field asked for it via autoFocus) and returns to the opener afterwards
    if (el && !el.contains(document.activeElement)) el.focus();
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab' || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', on);
    return () => { window.removeEventListener('keydown', on); if (before && document.contains(before)) before.focus?.(); };
  }, []);
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <aside ref={ref} className="glass glass--strong sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="sheet__head">{icon}<h2>{title}</h2><button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Schließen"><IX /></button></div>
        <div className="sheet__body">{children}</div>
        {foot ? <div className="sheet__foot">{foot}</div> : null}
      </aside>
    </>
  );
}
