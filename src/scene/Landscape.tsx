import { useEffect, useRef, useState } from 'react';
import { LOOK_META, landscapeKey, type Look } from './looks';
import type { Season } from '../lib/season';

function Layer({ name, on, onLoad }: { name: string; on: boolean; onLoad: () => void }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/img/landschaft-${name}-1280.avif 1280w, /img/landschaft-${name}-1672.avif 1672w`} sizes="100vw" />
      <img src={`/img/landschaft-${name}-1672.webp`} srcSet={`/img/landschaft-${name}-1280.webp 1280w, /img/landschaft-${name}-1672.webp 1672w`} sizes="100vw" alt="" style={{ opacity: on ? 1 : 0 }} fetchPriority={on ? 'high' : 'low'} decoding="async" onLoad={onLoad} />
    </picture>
  );
}

/** Shows the landscape for the current look and season and keeps the previous one mounted for a crossfade. */
export function Landscape({ look, season, onReady }: { look: Look; season: Season; onReady?: () => void }) {
  const key = landscapeKey(look, season);
  const [loaded, setLoaded] = useState(0);
  const [prev, setPrev] = useState<string | null>(null);
  const last = useRef(key);
  useEffect(() => { if (loaded >= 1) onReady?.(); }, [loaded, onReady]);
  useEffect(() => {
    if (last.current !== key) { setPrev(last.current); last.current = key; const t = setTimeout(() => setPrev(null), 2800); return () => clearTimeout(t); }
  }, [key]);
  const inc = () => setLoaded((n) => n + 1);
  const m = LOOK_META[look];
  return (
    <>
      <div className="sky" style={{ background: m.sky }} />
      <div className="land">
        {prev && prev !== key ? <Layer key={prev} name={prev} on={false} onLoad={inc} /> : null}
        <Layer key={key} name={key} on onLoad={inc} />
      </div>
      <div className="sun-glow" style={{ opacity: m.glow }} />
    </>
  );
}
