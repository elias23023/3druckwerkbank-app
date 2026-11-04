import type { CSSProperties, ReactNode } from 'react';
import type { LibraryIsland } from '../types';

export const ISLAND_META: Record<LibraryIsland, { w: number; h: number; disc?: { cx: number; cy: number; rx: number; ry: number } }> = {
  werkstatt: { w: 1191, h: 1106 }, elektronik: { w: 1172, h: 1140 }, ideen: { w: 1196, h: 1145 },
  rahmen: { w: 1167, h: 597, disc: { cx: 50, cy: 30, rx: 29, ry: 11 } },
};
export const islandSrc = (id: LibraryIsland, w: 1254 | 640 | 256) => `/img/insel-${id}-${w}.webp`;

export interface IslandProps {
  image: LibraryIsland; x: number; y: number; size: number; depth: number; active?: boolean; opacity?: number; label?: string; sub?: string;
  onClick?: () => void; children?: ReactNode; filter?: string; eager?: boolean; title?: string;
}

export function Island({ image, x, y, size, depth, active, opacity, label, sub, onClick, children, filter, eager, title }: IslandProps) {
  const s = 1 - 0.55 * depth;
  const par = (1 - depth) * 28;
  const meta = ISLAND_META[image];
  const style: CSSProperties = {
    left: `${x}%`, top: `${y}%`, width: `${size}cqw`, zIndex: Math.round((1 - depth) * 100),
    opacity: opacity ?? 1 - 0.3 * depth,
    filter: `${filter ?? ''} blur(${(depth * 1.6).toFixed(2)}px) brightness(${(1 - depth * 0.18).toFixed(2)}) saturate(${(1 - depth * 0.25).toFixed(2)})`,
    ['--s' as string]: s, ['--par' as string]: `${par}px`,
  };
  const src = size > 22 ? islandSrc(image, 1254) : size > 9 ? islandSrc(image, 640) : islandSrc(image, 256);
  return (
    <div className={`island${active ? ' island--active' : ''}`} style={style} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : -1} aria-label={title ?? label}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${meta.w} / ${meta.h}` }}>
        <img className="island__img" src={src} alt="" width={meta.w} height={meta.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
        {children ? <div className="island__props" style={image === 'rahmen' ? { left: '14%', right: '14%', top: '-70%', bottom: '55%' } : undefined}>{children}</div> : null}
      </div>
      {label ? <div className="island__label">{label}{sub && active ? <small>{sub}</small> : null}</div> : null}
    </div>
  );
}
