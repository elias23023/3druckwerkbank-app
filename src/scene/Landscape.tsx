import { useEffect, useState } from 'react';
import type { DayPhase } from '../lib/time';

const SKY: Record<DayPhase, string> = {
  tag: 'linear-gradient(180deg, #7fb4e8 0%, #cfe3f5 60%, #e9eef2 100%)',
  morgen: 'linear-gradient(180deg, #6c86c9 0%, #f0b893 55%, #f7d8b8 100%)',
  abend: 'linear-gradient(180deg, #3f4f8f 0%, #e78a5c 55%, #f5c38b 100%)',
  nacht: 'linear-gradient(180deg, #05091a 0%, #0c1733 55%, #15213f 100%)',
};

export function Landscape({ phase, onReady }: { phase: DayPhase; onReady?: () => void }) {
  const night = phase === 'nacht';
  const golden = phase === 'morgen' || phase === 'abend';
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { if (loaded >= 1) onReady?.(); }, [loaded, onReady]);
  return (
    <>
      <div className="sky" style={{ background: SKY[phase] }} />
      <div className="land">
        <picture>
          <source type="image/avif" srcSet="/img/landschaft-tag-960.avif 960w, /img/landschaft-tag-1672.avif 1672w" sizes="100vw" />
          <img src="/img/landschaft-tag-1672.webp" srcSet="/img/landschaft-tag-960.webp 960w, /img/landschaft-tag-1672.webp 1672w" sizes="100vw" alt="" style={{ opacity: night ? 0 : 1 }} fetchPriority={night ? 'low' : 'high'} onLoad={() => setLoaded((n) => n + 1)} />
        </picture>
        <picture>
          <source type="image/avif" srcSet="/img/landschaft-nacht-960.avif 960w, /img/landschaft-nacht-1672.avif 1672w" sizes="100vw" />
          <img src="/img/landschaft-nacht-1672.webp" srcSet="/img/landschaft-nacht-960.webp 960w, /img/landschaft-nacht-1672.webp 1672w" sizes="100vw" alt="" style={{ opacity: night ? 1 : 0 }} fetchPriority={night ? 'high' : 'low'} onLoad={() => setLoaded((n) => n + 1)} />
        </picture>
        <div className="land__tint" style={{ opacity: golden ? 1 : 0 }} />
      </div>
      <div className="clouds" aria-hidden>
        <div className="cloud" style={{ left: '-8%', top: '18%', width: '46%', height: '14%', animationDuration: '140s' }} />
        <div className="cloud" style={{ left: '52%', top: '12%', width: '40%', height: '12%', animationDuration: '170s', opacity: .32, animationDirection: 'alternate-reverse' }} />
        <div className="cloud" style={{ left: '20%', top: '40%', width: '60%', height: '16%', animationDuration: '200s', opacity: .22 }} />
      </div>
    </>
  );
}
