import { useEffect, useState } from 'react';
import type { WorldId } from './types';

export type Route = { world: WorldId | 'start'; projectId?: string };

export function parseHash(h: string): Route {
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean);
  const w = parts[0] as WorldId | undefined;
  const worlds: WorldId[] = ['heute', 'projekte', 'druck', 'material', 'wetter', 'archiv'];
  if (!w || parts[0] === 'start') return { world: 'start' };
  if (!worlds.includes(w)) return { world: 'start' };
  if (w === 'projekte' && parts[1]) return { world: 'projekte', projectId: decodeURIComponent(parts[1]) };
  return { world: w };
}

export function routeHash(r: Route): string {
  return r.world === 'projekte' && r.projectId ? `#/projekte/${encodeURIComponent(r.projectId)}` : `#/${r.world}`;
}

export function navigate(r: Route) {
  const h = routeHash(r);
  if (location.hash !== h) location.hash = h;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
