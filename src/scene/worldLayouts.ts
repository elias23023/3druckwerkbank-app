import type { Project, WorldId } from '../types';

export interface Placement { key: string; x: number; y: number; size: number; depth: number; world?: WorldId; projectId?: string; label?: string; sub?: string; opacity?: number }

const ORDER: WorldId[] = ['heute', 'projekte', 'druck', 'material', 'wetter', 'archiv'];
const LABELS: Record<WorldId, [string, string]> = {
  heute: ['Heute', 'Dein Tag auf einen Blick'], projekte: ['Projekte', 'Deine Ideen, Schritt für Schritt'], druck: ['3D-Druck', 'Immer im Blick'],
  material: ['Material', 'Werkstoffe & Bestand'], wetter: ['Wetter', 'Energie. Gute Zeiten.'], archiv: ['Archiv', 'Bewahrt. Wiederentdeckt.'],
};
const BACK_SLOTS: [number, number, number, number][] = [
  [14, 47, 13, 0.68], [86, 48, 13, 0.68], [29, 25, 9, 0.86], [71, 24, 9, 0.86], [50, 18, 7.5, 0.94],
];
const FAR_SLOTS: [number, number, number, number][] = [
  [10, 30, 6, 0.95], [90, 30, 6, 0.95], [26, 16, 5, 0.97], [74, 16, 5, 0.97], [50, 12, 4.5, 0.98], [50, 24, 5, 0.97],
];

export function worldIslands(active: WorldId, centre: [number, number, number] = [50, 56, 34]): Placement[] {
  const out: Placement[] = [];
  let slot = 0;
  for (const w of ORDER) {
    if (w === active) out.push({ key: `w-${w}`, x: centre[0], y: centre[1], size: centre[2], depth: 0, world: w, label: LABELS[w][0], sub: LABELS[w][1] });
    else {
      const [x, y, size, depth] = BACK_SLOTS[slot++];
      out.push({ key: `w-${w}`, x, y, size, depth, world: w, label: LABELS[w][0] });
    }
  }
  return out;
}

/** Projekte world: carousel of project islands, world islands pushed far back. */
export function projectCarousel(projects: Project[], activeIndex: number): Placement[] {
  const out: Placement[] = [];
  ORDER.forEach((w, i) => { const [x, y, size, depth] = FAR_SLOTS[i]; out.push({ key: `w-${w}`, x, y, size, depth, world: w, opacity: 0.6 }); });
  const n = projects.length;
  if (n === 0) return out;
  const rel = (i: number) => { let r = i - activeIndex; if (r > n / 2) r -= n; if (r < -n / 2) r += n; return r; };
  projects.forEach((p, i) => {
    const r = rel(i);
    if (r === 0) out.push({ key: `p-${p.id}`, x: 50, y: 56, size: 34, depth: 0, projectId: p.id, label: p.name });
    else if (r === -1) out.push({ key: `p-${p.id}`, x: 19, y: 52, size: 19, depth: 0.5, projectId: p.id, label: p.name });
    else if (r === 1) out.push({ key: `p-${p.id}`, x: 81, y: 52, size: 19, depth: 0.5, projectId: p.id, label: p.name });
    else if (r === -2) out.push({ key: `p-${p.id}`, x: 6, y: 38, size: 10, depth: 0.82, projectId: p.id });
    else if (r === 2) out.push({ key: `p-${p.id}`, x: 94, y: 38, size: 10, depth: 0.82, projectId: p.id });
    else out.push({ key: `p-${p.id}`, x: 50 + (r < 0 ? -30 : 30), y: 26, size: 6, depth: 0.95, projectId: p.id, opacity: 0.35 });
  });
  return out;
}

/** Inner world of one project: its island left of centre, everything else fades. */
export function projectInner(project: Project, others: Project[]): Placement[] {
  const out: Placement[] = [];
  ORDER.forEach((w, i) => { const [x, y, size, depth] = FAR_SLOTS[i]; out.push({ key: `w-${w}`, x, y, size, depth, world: w, opacity: 0.25 }); });
  out.push({ key: `p-${project.id}`, x: 29, y: 56, size: 34, depth: 0, projectId: project.id });
  others.slice(0, 4).forEach((p, i) => out.push({ key: `p-${p.id}`, x: [8, 92, 20, 80][i], y: [40, 42, 20, 22][i], size: 8, depth: 0.9, projectId: p.id, opacity: 0.2 }));
  return out;
}
