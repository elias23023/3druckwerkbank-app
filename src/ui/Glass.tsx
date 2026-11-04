import type { CSSProperties, ReactNode } from 'react';

export function Panel({ title, icon, children, style, foot, className, delay = 0, strong, right }: { title?: string; icon?: ReactNode; children: ReactNode; style?: CSSProperties; foot?: ReactNode; className?: string; delay?: number; strong?: boolean; right?: ReactNode }) {
  return (
    <section className={`glass panel${strong ? ' glass--strong' : ''}${className ? ' ' + className : ''}`} style={{ ...style, ['--delay' as string]: `${delay}ms` }}>
      {title ? <div className="panel__head">{icon}<h3>{title}</h3>{right}</div> : null}
      <div className="panel__body">{children}</div>
      {foot ? <div className="panel__foot">{foot}</div> : null}
    </section>
  );
}

export function Progress({ value, acc }: { value: number; acc?: boolean }) {
  return <div className={`progress${acc ? ' progress--acc' : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Stack({ parts }: { parts: { value: number; color: string; title?: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return <div className="stack">{parts.map((p, i) => <i key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={p.title} />)}</div>;
}

export function Check({ on, skip, onClick, label }: { on: boolean; skip?: boolean; onClick?: () => void; label?: string }) {
  return (
    <button className={`check${on ? ' check--on' : ''}${skip ? ' check--skip' : ''}`} onClick={onClick} aria-label={label ?? (on ? 'Erledigt' : 'Offen')} aria-pressed={on}>
      {on ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="m5 12 4.5 4.5L19 7" /></svg> : null}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return <div className="seg">{options.map((o) => <button key={o.v} type="button" className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}</div>;
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return <div className="stat"><b>{value}</b><span>{label}</span></div>;
}
