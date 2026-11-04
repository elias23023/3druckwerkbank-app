import { useEffect, useMemo, useState } from 'react';
import { Stage } from './scene/Stage';
import { Island } from './scene/Island';
import { MaterialProp, TagesringProp, WetterProp } from './scene/IslandProps';
import { projectCarousel, projectInner, worldIslands, type Placement } from './scene/worldLayouts';
import { navigate, useRoute } from './router';
import { useStore, activeProjects } from './store';
import { dayPhase, useNow } from './lib/time';
import { fetchWeather, todayDaily } from './lib/weather';
import { TopBar } from './ui/TopBar';
import { Dock } from './ui/Dock';
import { SheetHost } from './ui/SheetHost';
import { CommandBar } from './ui/CommandBar';
import { Heute } from './worlds/Heute';
import { Projekte } from './worlds/Projekte';
import { ProjektInnen } from './worlds/ProjektInnen';
import { Druck } from './worlds/Druck';
import { Material } from './worlds/Material';
import { Wetter } from './worlds/Wetter';
import { Archiv } from './worlds/Archiv';
import type { LibraryIsland, WorldId } from './types';

const WORLD_IMAGE: Record<WorldId, LibraryIsland> = { heute: 'rahmen', projekte: 'ideen', druck: 'werkstatt', material: 'rahmen', wetter: 'rahmen', archiv: 'ideen' };

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, [q]);
  return m;
}

export function App() {
  const route = useRoute();
  const now = useNow(1000);
  const projects = useStore((s) => s.projects);
  const spools = useStore((s) => s.spools);
  const settings = useStore((s) => s.settings);
  const weather = useStore((s) => s.weather);
  const setWeather = useStore((s) => s.setWeather);
  const tickPrints = useStore((s) => s.tickPrints);
  const setCommand = useStore((s) => s.setCommand);
  const sheet = useStore((s) => s.ui.sheet);
  const commandOpen = useStore((s) => s.ui.commandOpen);
  const toast = useStore((s) => s.ui.toast);
  const [carousel, setCarousel] = useState(0);

  const reducedPref = useMedia('(prefers-reduced-motion: reduce)');
  const coarse = useMedia('(pointer: coarse)');
  const mobile = useMedia('(max-width: 900px), (orientation: portrait) and (max-width: 1100px)');
  const motionReduced = settings.motion === 'reduziert' || (settings.motion === 'auto' && reducedPref);
  useEffect(() => { document.documentElement.dataset.motion = motionReduced ? 'reduziert' : 'voll'; }, [motionReduced]);
  const today = todayDaily(weather?.data, now);
  const phase = dayPhase(now, today?.sunrise, today?.sunset);
  useEffect(() => {
    const theme = settings.theme === 'auto' ? (phase === 'tag' || phase === 'morgen' ? 'hell' : 'dunkel') : settings.theme;
    document.documentElement.dataset.theme = theme;
  }, [settings.theme, phase]);

  // weather fetch with 30 min cache
  useEffect(() => {
    const age = weather ? Date.now() - new Date(weather.fetchedAt).getTime() : Infinity;
    const stale = !weather || age > 30 * 60_000 || (!!weather.error && age > 5 * 60_000);
    if (!stale) return;
    const ac = new AbortController();
    fetchWeather(settings.location, ac.signal).then((data) => setWeather({ fetchedAt: new Date().toISOString(), data }))
      .catch((e) => { if (e.name !== 'AbortError') setWeather(weather?.data ? { ...weather, fetchedAt: new Date().toISOString(), error: String(e.message || e) } : { fetchedAt: new Date().toISOString(), data: emptyWeather(), error: String(e.message || e) }); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.location.lat, settings.location.lon, weather?.fetchedAt]);

  useEffect(() => { tickPrints(now.getTime()); }, [now, tickPrints]);

  // keyboard: 1-6 worlds, Ctrl+K, Esc
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommand(true); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const worlds: WorldId[] = ['heute', 'projekte', 'druck', 'material', 'wetter', 'archiv'];
      if (/^[1-6]$/.test(e.key)) navigate({ world: worlds[Number(e.key) - 1] });
      if (e.key === 'Escape' && route.world === 'projekte' && route.projectId && !sheet && !commandOpen) navigate({ world: 'projekte' });
    };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [route, sheet, commandOpen, setCommand]);

  const active = useMemo(() => activeProjects(projects), [projects]);
  const current = route.projectId ? projects.find((p) => p.id === route.projectId) : undefined;
  useEffect(() => { if (route.world === 'projekte' && route.projectId && !current) navigate({ world: 'projekte' }); }, [route, current]);
  useEffect(() => { if (carousel >= active.length) setCarousel(0); }, [active.length, carousel]);

  const placements: Placement[] = useMemo(() => {
    if (route.world === 'projekte' && current) return projectInner(current, active.filter((p) => p.id !== current.id));
    if (route.world === 'projekte') return projectCarousel(active, carousel);
    return worldIslands(route.world, mobile ? [50, 50, 70] : undefined);
  }, [route.world, current, active, carousel, mobile]);

  const hour = now.getHours() + now.getMinutes() / 60;
  const islands = placements.map((pl) => {
    if (pl.world) {
      const w = pl.world; const isActive = pl.depth === 0;
      return (
        <Island key={pl.key} image={WORLD_IMAGE[w]} x={pl.x} y={pl.y} size={mobile && !isActive ? 0 : pl.size} depth={pl.depth} active={isActive} opacity={mobile && !isActive ? 0 : pl.opacity}
          label={isActive ? undefined : pl.label} eager={isActive} title={`Zur Welt ${pl.label}`} filter={w === 'archiv' ? 'sepia(.25) saturate(.85)' : w === 'projekte' ? 'hue-rotate(-8deg)' : undefined}
          onClick={isActive ? undefined : () => navigate({ world: w })}>
          {w === 'heute' && !isActive ? <TagesringProp hour={hour} isDay={phase !== 'nacht'} /> : w === 'material' ? <MaterialProp spools={spools} /> : w === 'wetter' ? <WetterProp data={weather?.data} /> : null}
        </Island>
      );
    }
    const p = projects.find((x) => x.id === pl.projectId)!;
    const isActive = pl.depth === 0;
    return (
      <Island key={pl.key} image={p.island.libraryId} x={pl.x} y={pl.y} size={mobile && !isActive ? 0 : pl.size} depth={pl.depth} active={isActive && !!current} opacity={mobile && !isActive ? 0 : pl.opacity} label={current || isActive ? undefined : pl.label} eager={isActive}
        title={p.name} onClick={current ? undefined : isActive ? () => navigate({ world: 'projekte', projectId: p.id }) : () => setCarousel(active.findIndex((x) => x.id === p.id))}>
        {p.island.kind === 'eigenes' && p.island.photoDataUrl ? <PhotoFrame cfg={p.island} /> : null}
      </Island>
    );
  });

  return (
    <Stage phase={phase} world={route.world} parallax={!motionReduced && !coarse && !sheet && !mobile} islands={islands}>
      <div className="ui">
        <TopBar />
        {route.world === 'heute' ? <Heute phase={phase} /> : null}
        {route.world === 'projekte' && !current ? <Projekte index={carousel} setIndex={setCarousel} projects={active} /> : null}
        {route.world === 'projekte' && current ? <ProjektInnen project={current} /> : null}
        {route.world === 'druck' ? <Druck /> : null}
        {route.world === 'material' ? <Material /> : null}
        {route.world === 'wetter' ? <Wetter /> : null}
        {route.world === 'archiv' ? <Archiv /> : null}
        <Dock active={route.world} />
        {sheet ? <SheetHost sheet={sheet} /> : null}
        {commandOpen ? <CommandBar /> : null}
        {toast ? <div className="glass glass--strong toast" role="status">{toast.text}</div> : null}
      </div>
    </Stage>
  );
}

function emptyWeather() { return { current: { time: '', temp: 0, feels: 0, humidity: 0, precip: 0, code: 3, cloud: 0, wind: 0, isDay: true }, hourly: [], daily: [] }; }

export function PhotoFrame({ cfg }: { cfg: { photoDataUrl?: string; frame: { ratio: 'quer' | 'hoch' | 'quadrat'; offsetX: number; offsetY: number; zoom: number; style: 'holz' | 'metall' } } }) {
  const ratio = cfg.frame.ratio === 'quer' ? '4 / 3' : cfg.frame.ratio === 'hoch' ? '3 / 4' : '1 / 1';
  const w = cfg.frame.ratio === 'hoch' ? '34%' : cfg.frame.ratio === 'quadrat' ? '40%' : '48%';
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: '58%', transform: 'translateX(-50%)', width: w, aspectRatio: ratio, borderRadius: 4, padding: '3.5%', background: cfg.frame.style === 'holz' ? 'linear-gradient(135deg,#8a5a2b,#5a391a)' : 'linear-gradient(135deg,#b9bec7,#6c737d)', boxShadow: '0 12px 30px rgba(0,0,0,.45)' }}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}>
        <img src={cfg.photoDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${cfg.frame.offsetX}%, ${cfg.frame.offsetY}%) scale(${cfg.frame.zoom})` }} />
      </div>
    </div>
  );
}
