import { useMemo } from 'react';
import { SEASON_META, type Season } from '../lib/season';

/** Deterministic pseudo-random so the particle field is stable across renders. */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const LEAF_COLOURS = ['#d9772b', '#c9452a', '#e3a33a', '#9a5a2a', '#b8762e'];
const PETAL_COLOURS = ['#ffd6e3', '#fff1f5', '#ffc4d6', '#fff8e8'];

/**
 * Seasonal particles over the landscape: petals in spring, pollen glints by day and fireflies at night in summer,
 * falling leaves in autumn, slow snow dust in winter. CSS-only animation; static with reduced motion.
 */
export function SeasonFx({ season, night, reduced }: { season: Season; night: boolean; reduced: boolean }) {
  const kind = SEASON_META[season].particles === 'pollen' && night ? 'firefly' : SEASON_META[season].particles;
  const items = useMemo(() => {
    const r = rng(season.length * 7919 + (night ? 17 : 3));
    const n = kind === 'firefly' ? 16 : kind === 'pollen' ? 18 : 26;
    return Array.from({ length: n }, (_, i) => {
      const size = kind === 'leaf' ? 9 + r() * 8 : kind === 'petal' ? 6 + r() * 5 : kind === 'firefly' ? 3 + r() * 2 : 2 + r() * 2.5;
      return {
        i, left: r() * 100, top: r() * 100, size, dur: (kind === 'firefly' ? 6 : kind === 'pollen' ? 14 : 16) + r() * (kind === 'leaf' ? 14 : 10), delay: -r() * 30,
        dx: (20 + r() * 60) * (r() > 0.5 ? 1 : -1), rot: Math.round(r() * 360), colour: kind === 'leaf' ? LEAF_COLOURS[i % LEAF_COLOURS.length] : kind === 'petal' ? PETAL_COLOURS[i % PETAL_COLOURS.length] : kind === 'firefly' ? '#e8ff8a' : kind === 'pollen' ? '#ffe9a8' : '#ffffff',
        op: kind === 'flake' ? .55 + r() * .4 : kind === 'pollen' ? .5 + r() * .4 : .85,
      };
    });
  }, [season, night, kind]);
  return (
    <div className={`season-fx season-fx--${kind}${reduced ? ' season-fx--still' : ''}`} data-season={season} aria-hidden>
      {items.map((p) => (
        <i key={p.i} style={{ left: `${p.left}%`, top: kind === 'firefly' || kind === 'pollen' ? `${p.top}%` : undefined, width: p.size, height: kind === 'leaf' ? p.size * 0.62 : kind === 'petal' ? p.size * 0.7 : p.size, background: p.colour, opacity: p.op,
          ['--dur' as string]: `${p.dur.toFixed(1)}s`, ['--delay' as string]: `${p.delay.toFixed(1)}s`, ['--dx' as string]: `${p.dx}px`, ['--rot' as string]: `${p.rot}deg` }} />
      ))}
    </div>
  );
}
