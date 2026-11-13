import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const MIN = 1 / 60;

/** How dark the island is (0 = day, 1 = night). Follows the landscape: dark from about 50 min after sunset until about 70 min before sunrise. */
export const nightAmount = (h: number, sr: number, ss: number) => (h < 12 ? clamp01((sr - 25 * MIN - h) / (50 * MIN)) : clamp01((h - ss - 10 * MIN) / (50 * MIN)));
/** How strongly the lamps glow (0–1). They come on before it gets dark (golden hour) and stay on a little after sunrise. */
export const lampAmount = (h: number, sr: number, ss: number) => (h < 12 ? clamp01((sr + 20 * MIN - h) / (50 * MIN)) : clamp01((h - ss + 45 * MIN) / (50 * MIN)));

/**
 * Light and life on the painted Heute island, laid over the sprite (child of the island, so it floats and scales with it):
 *  - dusk and dawn: a warm rose wash while the landscape shows sunset or sunrise;
 *  - night: a moonlight wash darkens the island (masked with the sprite itself), except around the lantern on the table, the lamp in the hut
 *    and the two wall lamps, whose painted warm light stays and gets a soft glow; the lantern flickers;
 *  - a running print: smoke rises from the chimney and the small printer in the hut glows.
 * Positions are percent of the sprite box, measured on insel-heute (lantern 81.4 / 49.2, hut lamp 70.8 / 33.4, wall lamps 60.5 / 35.5 and
 * 84.3 / 33.6, printer 72.7 / 39.6, chimney 92.2 / 8.6).
 */
/** Dusk and dawn (0–1): the warm wash while the landscape shows sunset or sunrise, fading as the night takes over. */
export const duskAmount = (h: number, sr: number, ss: number) => (h < 12 ? clamp01((sr + 50 * MIN - h) / (45 * MIN)) : clamp01((h - ss + 65 * MIN) / (50 * MIN))) * (1 - nightAmount(h, sr, ss));

export function Inselstimmung({ hour, sunrise, sunset, printing }: { hour: number; sunrise: number; sunset: number; printing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sprite, setSprite] = useState<string>();
  // the mask must be the very image the island shows (size and cache version are chosen by the island component)
  useLayoutEffect(() => {
    const img = ref.current?.closest('.island__body')?.querySelector<HTMLImageElement>('.island__img');
    if (!img) return;
    const read = () => setSprite(img.currentSrc || img.src);
    read(); img.addEventListener('load', read);
    return () => img.removeEventListener('load', read);
  }, []);
  const n = nightAmount(hour, sunrise, sunset); const l = lampAmount(hour, sunrise, sunset); const d = duskAmount(hour, sunrise, sunset);
  const style = { ['--n' as string]: n.toFixed(3), ['--l' as string]: l.toFixed(3), ['--d' as string]: d.toFixed(3), ['--sprite' as string]: sprite ? `url("${sprite}")` : 'none' } as CSSProperties;
  return (
    <div ref={ref} className="inselstimmung" style={style} data-testid="inselstimmung" data-night={n > 0.5 ? 'true' : 'false'} data-lamps={l > 0.05 ? 'an' : 'aus'} data-printing={printing ? 'true' : 'false'} aria-hidden>
      {sprite && n > 0.01 ? <div className="inselstimmung__nacht" /> : null}
      {sprite && d > 0.01 ? <div className="inselstimmung__abend" /> : null}
      {sprite && n > 0.01 ? <div className="inselstimmung__mond" /> : null}
      {sprite && l > 0.05 ? <div className="inselstimmung__schein" /> : null}
      {l > 0.05 ? <div className="inselstimmung__flamme" /> : null}
      {printing ? <div className="inselstimmung__drucker" title="Ein Druck läuft" /> : null}
      {printing ? <div className="inselstimmung__rauch">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} style={{ animationDelay: `${(-i * 9) / 7}s` }} />)}</div> : null}
    </div>
  );
}
