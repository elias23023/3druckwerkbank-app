import type { CSSProperties, ReactNode } from 'react';
import type { LibraryIsland } from '../types';
import { IArrowR } from '../ui/Icons';

export const ISLAND_META: Record<LibraryIsland, { w: number; h: number; disc?: { cx: number; cy: number; rx: number; ry: number } }> = {
  werkstatt: { w: 1098, h: 1227 }, elektronik: { w: 1098, h: 1226 }, ideen: { w: 1094, h: 1224 },
  rahmen: { w: 1094, h: 1190 },
  heute: { w: 1154, h: 1209 }, material: { w: 1081, h: 1219 }, wetter: { w: 1084, h: 1205 }, archiv: { w: 1079, h: 1205 }, drucker: { w: 1081, h: 1188 },
  'projekt-garten': { w: 1081, h: 1167 }, 'projekt-haushalt': { w: 1080, h: 1168 }, 'projekt-fahrzeug': { w: 1080, h: 1209 }, 'projekt-buero': { w: 1080, h: 1186 },
  'projekt-hobby': { w: 1079, h: 1204 }, 'projekt-technik': { w: 1086, h: 1208 }, 'projekt-deko': { w: 1081, h: 1196 }, 'projekt-modell': { w: 1080, h: 1195 },
};
/** Bump when island sprites change: the CDN and browsers cache /img/* for a year (immutable), so the URL must change. */
export const ASSET_VERSION = '20261106e';
export const islandSrc = (id: LibraryIsland, w: 1254 | 640 | 256) => `/img/insel-${id}-${w}.webp?v=${ASSET_VERSION}`;

export interface IslandProps {
  image: LibraryIsland; x: number; y: number; size: number; depth: number; active?: boolean; opacity?: number;
  label?: string; sub?: string; status?: { text: string; color: string }; labelSize?: 'big' | 'small';
  onClick?: () => void; cta?: string; children?: ReactNode; filter?: string; eager?: boolean; title?: string; halo?: string; spotlight?: boolean;
}

export function Island({ image, x, y, size, depth, active, opacity, label, sub, status, labelSize = 'big', onClick, cta, children, filter, eager, title, halo, spotlight }: IslandProps) {
  const s = 1 - 0.35 * depth;
  const par = (1 - depth) * 26 + 6;
  const meta = ISLAND_META[image];
  const style: CSSProperties = {
    left: `${x}%`, top: `${y}%`, width: `${size}cqw`, zIndex: Math.round((1 - depth) * 100),
    opacity: opacity ?? 1 - 0.25 * depth,
    filter: `${filter ?? ''} blur(${(depth * 1.1).toFixed(2)}px) brightness(${(1 - depth * 0.2).toFixed(2)}) saturate(${(1 - depth * 0.2).toFixed(2)})`,
    ['--s' as string]: s, ['--par' as string]: `${par}px`, ['--halo' as string]: halo ?? 'transparent',
  };
  const src = size > 22 ? islandSrc(image, 1254) : size > 9 ? islandSrc(image, 640) : islandSrc(image, 256);
  return (
    <div className={`island${active ? ' island--active' : ''}${onClick ? ' island--click' : ''}${halo ? ' island--halo' : ''}${spotlight ? ' island--spot' : ''}`} style={style} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : -1} aria-label={title ?? label}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}>
      <div className="island__body" style={{ position: 'relative', width: '100%', aspectRatio: `${meta.w} / ${meta.h}` }}>
        <img className="island__img" src={src} alt="" width={meta.w} height={meta.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
        {children ? <div className="island__props" style={image === 'rahmen' ? { left: '25.5%', right: '22.5%', top: '6%', bottom: '64%' } : undefined}>{children}</div> : null}
      </div>
      {label ? (
        <div className={`island__label island__label--${labelSize}`}>
          <b>{label}</b>
          {sub ? <span>{sub}</span> : null}
          {status ? <span className="island__status"><i className="dot" style={{ background: status.color }} />{status.text}</span> : null}
          {cta ? <span className="btn btn--sm island__cta">{cta} <IArrowR width={12} height={12} /></span> : null}
        </div>
      ) : null}
    </div>
  );
}
