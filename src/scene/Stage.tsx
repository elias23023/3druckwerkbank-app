import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Landscape } from './Landscape';
import { LOOK_META, NIGHT_LOOKS, type Look } from './looks';
import { Clouds } from './Clouds';
import { WeatherFx } from './WeatherFx';
import { SeasonFx } from './SeasonFx';
import { SEASON_META, type Season } from '../lib/season';
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

export function Stage({ phase, look, world, parallax, islands, children, weatherCode, parallaxStrength = 1, season = 'herbst' }: { phase: DayPhase; look: Look; world: WorldId | 'start'; parallax: boolean; islands: ReactNode; children: ReactNode; weatherCode?: number; parallaxStrength?: number; season?: Season }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const m = LOOK_META[look]; const night = NIGHT_LOOKS.has(look);
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
    <div className="stage" ref={ref} data-scene-ready={ready ? 'true' : 'false'} data-phase={phase} data-look={look} data-night={night ? 'true' : 'false'} data-season={season} style={{ ['--sx' as string]: m.sx, ['--sy' as string]: m.sy, ['--season-filter' as string]: SEASON_META[season].islandFilter }}>
      <div className="stage__bg">
        <Landscape look={look} season={season} onReady={onReady} />
        <Clouds look={look} />
        <div className="rays" style={{ opacity: m.rays }} />
        <div className="tint" style={{ background: TINTS[world] }} />
        <div className="season-tint" style={{ background: SEASON_META[season].tint }} />
        <SeasonFx season={season} night={night} reduced={!parallax} />
        <WeatherFx code={weatherCode} reduced={!parallax} look={look} />
      </div>
      <div className="frame"><div className="islands">{islands}</div></div>
      <div className="ground-mist" />
      <div className="vignette" />
      {children}
    </div>
  );
}
