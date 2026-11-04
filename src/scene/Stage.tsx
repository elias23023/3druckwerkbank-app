import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Landscape } from './Landscape';
import type { DayPhase } from '../lib/time';
import type { WorldId } from '../types';

const TINTS: Record<WorldId, string> = {
  heute: 'radial-gradient(70% 60% at 50% 60%, rgba(255,180,90,.9), transparent 70%)',
  projekte: 'radial-gradient(70% 60% at 50% 60%, rgba(255,220,180,.5), transparent 70%)',
  druck: 'radial-gradient(70% 60% at 50% 60%, rgba(255,200,140,.7), transparent 70%)',
  material: 'radial-gradient(70% 60% at 50% 60%, rgba(140,200,120,.8), transparent 70%)',
  wetter: 'radial-gradient(70% 60% at 50% 60%, rgba(120,190,255,.9), transparent 70%)',
  archiv: 'radial-gradient(70% 60% at 50% 60%, rgba(220,180,110,.8), transparent 70%)',
};

export function Stage({ phase, world, parallax, islands, children }: { phase: DayPhase; world: WorldId; parallax: boolean; islands: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!parallax) { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0'); return; }
    let raf = 0; let px = 0, py = 0;
    const move = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { el.style.setProperty('--px', px.toFixed(3)); el.style.setProperty('--py', py.toFixed(3)); raf = 0; });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, [parallax]);
  const night = phase === 'nacht';
  return (
    <div className="stage" ref={ref} data-scene-ready={ready ? 'true' : 'false'} data-phase={phase}>
      <div className="stage__bg">
        <Landscape phase={phase} onReady={onReady} />
        <div className="fog" style={{ opacity: night ? .5 : 1 }} />
        <div className="rays" style={{ opacity: night ? 0 : phase === 'tag' ? .14 : .22, ['--sx' as string]: '74%', ['--sy' as string]: phase === 'tag' ? '14%' : '34%' }} />
        <div className="tint" style={{ background: TINTS[world] }} />
        <div className="vignette" />
      </div>
      <div className="frame"><div className="islands">{islands}</div></div>
      {children}
    </div>
  );
}
