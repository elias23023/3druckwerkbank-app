import { useEffect, useState } from 'react';
import type { DayPhase } from '../lib/time';

export type Look = 'tag' | 'abend' | 'nacht';
export const lookFor = (phase: DayPhase): Look => (phase === 'tag' ? 'tag' : phase === 'nacht' ? 'nacht' : 'abend');
const SKY: Record<Look, string> = {
  tag: 'linear-gradient(180deg, #6f98d6 0%, #cfe0f0 55%, #d8dde2 100%)',
  abend: 'linear-gradient(180deg, #3a3f7a 0%, #b57a7a 40%, #f3b070 55%, #4a4068 100%)',
  nacht: 'linear-gradient(180deg, #070a1e 0%, #141c44 50%, #2a2a4a 100%)',
};

function Layer({ name, on, onLoad }: { name: Look; on: boolean; onLoad: () => void }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/img/landschaft-${name}-1280.avif 1280w, /img/landschaft-${name}-1920.avif 1920w`} sizes="100vw" />
      <img src={`/img/landschaft-${name}-1920.webp`} srcSet={`/img/landschaft-${name}-1280.webp 1280w, /img/landschaft-${name}-1920.webp 1920w`} sizes="100vw" alt="" style={{ opacity: on ? 1 : 0 }} fetchPriority={on ? 'high' : 'low'} loading={on ? 'eager' : 'lazy'} decoding="async" onLoad={onLoad} />
    </picture>
  );
}

export function Landscape({ look, onReady }: { look: Look; onReady?: () => void }) {
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { if (loaded >= 1) onReady?.(); }, [loaded, onReady]);
  const inc = () => setLoaded((n) => n + 1);
  return (
    <>
      <div className="sky" style={{ background: SKY[look] }} />
      <div className="land">
        <Layer name="abend" on={look === 'abend'} onLoad={inc} />
        <Layer name="tag" on={look === 'tag'} onLoad={inc} />
        <Layer name="nacht" on={look === 'nacht'} onLoad={inc} />
      </div>
      <div className="sun-glow" style={{ opacity: look === 'nacht' ? 0.25 : look === 'tag' ? 0.55 : 1 }} />
    </>
  );
}
