import type { Project, WorldId } from '../types';

export interface Placement { key: string; x: number; y: number; size: number; depth: number; world?: WorldId; projectId?: string; label?: string; sub?: string; opacity?: number; labelSize?: 'big' | 'small' }

export const ORDER: WorldId[] = ['heute', 'projekte', 'druck', 'material', 'wetter', 'archiv'];
export const LABELS: Record<WorldId, [string, string]> = {
  heute: ['Heute', 'Dein Tag auf einen Blick'], projekte: ['Projekte', 'Deine Ideen. Schritt für Schritt.'], druck: ['3D-Druck', 'Deine Drucker. Immer im Blick.'],
  material: ['Material', 'Filamente. Werkstoffe. Möglichkeiten.'], wetter: ['Wetter', 'Bedingungen. Energie. Gute Zeiten.'], archiv: ['Archiv', 'Fertige Projekte. Bleibende Ideen.'],
};

/** Start world: six large islands in two rows. */
export const START_POS: Record<WorldId, [number, number, number, number]> = {
  heute: [15, 29, 15.5, 0.12], projekte: [50, 25, 21, 0], druck: [85, 29, 15.5, 0.12],
  material: [22, 67, 15.5, 0.05], wetter: [50, 69, 15, 0.08], archiv: [79, 67, 15.5, 0.05],
};
export function startIslands(): Placement[] {
  return ORDER.map((w) => { const [x, y, size, depth] = START_POS[w]; return { key: `w-${w}`, x, y, size, depth, world: w, label: LABELS[w][0], sub: LABELS[w][1] }; });
}

const RING: [number, number, number, number][] = [[12, 47, 16, 0.5], [88, 47, 16, 0.5], [29, 20, 12.5, 0.66], [71, 20, 12.5, 0.66], [50, 13, 10.5, 0.78]];

/** Per-world overrides so neighbour islands stay visible beside that world's panels (side columns start lower there). */
const HIGH_RING: typeof RING = [[12, 28, 14, 0.5], [88, 28, 14, 0.5], [30, 13, 12, 0.66], [70, 13, 12, 0.66], [50, 8, 10, 0.78]];
const RING_BY_WORLD: Partial<Record<WorldId, typeof RING>> = { material: HIGH_RING, wetter: HIGH_RING, archiv: HIGH_RING };
const CENTRE_BY_WORLD: Partial<Record<WorldId, [number, number, number]>> = { material: [50, 48, 34], wetter: [50, 48, 34], archiv: [50, 48, 34] };

export function worldIslands(active: WorldId, centre?: [number, number, number]): Placement[] {
  const out: Placement[] = [];
  const c = centre ?? CENTRE_BY_WORLD[active] ?? [50, 54, 34];
  const ring = RING_BY_WORLD[active] ?? RING;
  if (active === 'druck') out.push({ key: 'd-p1s', x: 29, y: 42, size: 11, depth: 0.3, label: 'P1S', labelSize: 'small' });
  let slot = 0;
  for (const w of ORDER) {
    if (w === active) out.push({ key: `w-${w}`, x: c[0], y: c[1], size: c[2], depth: 0, world: w });
    else { const [x, y, size, depth] = ring[slot++]; out.push({ key: `w-${w}`, x, y, size, depth, world: w, label: LABELS[w][0], labelSize: 'small' }); }
  }
  return out;
}

const FAR: [number, number, number, number][] = [[8, 24, 7, 0.9], [92, 24, 7, 0.9], [24, 13, 6, 0.93], [76, 13, 6, 0.93], [50, 10, 5.5, 0.95], [50, 19, 5.5, 0.94]];

export function projectCarousel(projects: Project[], activeIndex: number): Placement[] {
  const out: Placement[] = [];
  ORDER.forEach((w, i) => { const [x, y, size, depth] = FAR[i]; out.push({ key: `w-${w}`, x, y, size, depth, world: w, opacity: 0.55 }); });
  const n = projects.length;
  if (n === 0) return out;
  const rel = (i: number) => { let r = i - activeIndex; if (r > n / 2) r -= n; if (r < -n / 2) r += n; return r; };
  projects.forEach((p, i) => {
    const r = rel(i);
    if (r === 0) out.push({ key: `p-${p.id}`, x: 50, y: 40, size: 30, depth: 0, projectId: p.id });
    else if (r === -1) out.push({ key: `p-${p.id}`, x: 17, y: 44, size: 19, depth: 0.4, projectId: p.id, label: p.name, labelSize: 'small' });
    else if (r === 1) out.push({ key: `p-${p.id}`, x: 83, y: 44, size: 19, depth: 0.4, projectId: p.id, label: p.name, labelSize: 'small' });
    else if (r === -2) out.push({ key: `p-${p.id}`, x: 4, y: 34, size: 11, depth: 0.7, projectId: p.id, label: p.name, labelSize: 'small' });
    else if (r === 2) out.push({ key: `p-${p.id}`, x: 96, y: 34, size: 11, depth: 0.7, projectId: p.id, label: p.name, labelSize: 'small' });
    else out.push({ key: `p-${p.id}`, x: 50 + (r < 0 ? -34 : 34), y: 22, size: 6, depth: 0.92, projectId: p.id, opacity: 0.35 });
  });
  return out;
}

export function projectInner(project: Project, others: Project[]): Placement[] {
  const out: Placement[] = [];
  ORDER.forEach((w, i) => { const [x, y, size, depth] = FAR[i]; out.push({ key: `w-${w}`, x, y, size, depth, world: w, opacity: 0.25 }); });
  out.push({ key: `p-${project.id}`, x: 50, y: 52, size: 28, depth: 0, projectId: project.id });
  others.slice(0, 4).forEach((p, i) => out.push({ key: `p-${p.id}`, x: [6, 94, 18, 82][i], y: [42, 44, 24, 26][i], size: 7, depth: 0.9, projectId: p.id, opacity: 0.2 }));
  return out;
}
