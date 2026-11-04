import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Landscape, lookFor } from './Landscape';
import { Clouds } from './Clouds';
import { Foreground } from './Foreground';
import { WeatherFx } from './WeatherFx';
import type { DayPhase } from '../lib/time';
import type { WorldId } from '../types';

const TINTS: Record<WorldId | 'start', string> = {
  start: 'none',
  heute: 'radial-gradient(70% 60% at 50% 60%, rgba(255,180,90,.6), transparent 70%)',
  projekte: 'none',
  druck: 'radial-gradient(70% 60% at 50% 60%, rgba(255,200,140,.5), transparent 70%)',
  material: 'radial-gradient(70% 60% at 50% 60%, rgba(140,200,120,.55), transparent 70%)',
  wetter: 'radial-gradient(70% 60% at 50% 60%, rgba(120,190,255,.6), transparent 70%)',
  archiv: 'radial-gradient(70% 60% at 50% 60%, rgba(220,180,110,.55), transparent 70%)',
};

export function Stage({ phase, world, parallax, islands, children, weatherCode, parallaxStrength = 1 }: { phase: DayPhase; world: WorldId | 'start'; parallax: boolean; islands: ReactNode; children: ReactNode; weatherCode?: number; parallaxStrength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const look = lookFor(phase);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!parallax) { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0'); return; }
    let raf = 0; let px = 0, py = 0;
    const move = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { el.style.setProperty('--px', (px * parallaxStrength).toFixed(3)); el.style.setProperty('--py', (py * parallaxStrength).toFixed(3)); raf = 0; });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, [parallax, parallaxStrength]);
  return (
    <div className="stage" ref={ref} data-scene-ready={ready ? 'true' : 'false'} data-phase={phase} data-look={look}>
      <div className="stage__bg">
        <Landscape look={look} onReady={onReady} />
        <Clouds look={look} />
        <div className="rays" style={{ opacity: look === 'nacht' ? 0.05 : look === 'tag' ? .12 : .2 }} />
        <div className="tint" style={{ background: TINTS[world] }} />
        <WeatherFx code={weatherCode} reduced={!parallax} />
      </div>
      <div className="frame"><div className="islands">{islands}</div></div>
      <Foreground look={look} />
      <div className="vignette" />
      {children}
    </div>
  );
}
