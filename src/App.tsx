import { useEffect, useMemo, useState } from 'react';
import { Stage } from './scene/Stage';
import { sceneLook, DARK_LOOKS } from './scene/looks';
import { Island } from './scene/Island';
import { projectCarousel, projectInner, worldIslands, startIslands, type Placement } from './scene/worldLayouts';
import { Start } from './worlds/Start';
import { navigate, useRoute } from './router';
import { useStore, activeProjects, availableGrams, printProgress } from './store';
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
import { Mobile } from './mobile/Mobile';
import { Tagesportal } from './ui/Tagesportal';
import { resolveSeason } from './lib/season';
import type { LibraryIsland, WorldId } from './types';

const STAGE_COLOR: Record<string, string> = { Idee: '#c59bff', Konstruktion: '#7cc6ff', Planung: '#7cc6ff', Vorbereitung: '#ffe29a', Druck: '#4ccf7a', Nacharbeit: '#ffb547', 'Qualität': '#ffb547', Abgeschlossen: '#8a8f96' };
const WORLD_IMAGE: Record<WorldId, LibraryIsland> = { heute: 'heute', projekte: 'projekte', druck: 'druck', material: 'material', wetter: 'wetter', archiv: 'archiv' };

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
  const spot = useStore((s) => s.ui.spotlight);
  const devices = useStore((s) => s.devices);
  const prints = useStore((s) => s.prints);
  const [carousel, setCarousel] = useState(0);

  const reducedPref = useMedia('(prefers-reduced-motion: reduce)');
  const coarse = useMedia('(pointer: coarse)');
  const mobile = useMedia('(max-width: 900px), (orientation: portrait) and (max-width: 1100px)');
  const motionReduced = settings.motion === 'reduziert' || (settings.motion === 'auto' && reducedPref);
  useEffect(() => { document.documentElement.dataset.motion = motionReduced ? 'reduziert' : 'voll'; }, [motionReduced]);
  const today = todayDaily(weather?.data, now);
  const phase = dayPhase(now, today?.sunrise, today?.sunset);
  const look = sceneLook(now, today?.sunrise, today?.sunset, weather?.data.hourly.length ? weather.data.current.code : undefined);
  const season = resolveSeason(settings.season, now);
  useEffect(() => {
    const theme = mobile ? 'dunkel' : settings.theme === 'auto' ? (DARK_LOOKS.has(look) ? 'dunkel' : 'hell') : settings.theme;
    document.documentElement.dataset.theme = theme;
  }, [settings.theme, look, mobile]);

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
      if (e.key === '0') navigate({ world: 'start' });
      if (e.key === 'Escape' && route.world === 'projekte' && route.projectId && !sheet && !commandOpen) navigate({ world: 'projekte' });
      else if (e.key === 'Escape' && route.world !== 'start' && !sheet && !commandOpen) navigate({ world: 'start' });
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
    if (route.world === 'start') return startIslands();
    return worldIslands(route.world, mobile ? [50, 50, 70] : undefined);
  }, [route.world, current, active, carousel, mobile]);

  const blocked = (pid: string) => { const p = projects.find((x) => x.id === pid); return !!p && p.requiredSpools.some((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams; }); };
  const islands = placements.map((pl) => {
    if (pl.key === 'd-p1s') {
      const d = devices.find((x) => x.kind === 'drucker' && x.id !== settings.defaultPrinterId) ?? devices.find((x) => x.kind === 'drucker');
      const job = d ? prints.find((x) => x.printerId === d.id && x.status === 'läuft') : undefined;
      return <Island key={pl.key} image="drucker" x={pl.x} y={pl.y} size={mobile ? 0 : pl.size} depth={pl.depth} label={d?.name ?? 'P1S'} labelSize="small" status={d ? { text: job ? `Druckt ${Math.round(printProgress(job, now.getTime()) * 100)} %` : d.status, color: job ? '#7cc6ff' : '#4ccf7a' } : undefined} onClick={d ? () => useStore.getState().openSheet({ kind: 'geraet', deviceId: d.id }) : undefined} />;
    }
    if (pl.world) {
      const w = pl.world; const isStart = route.world === 'start'; const isActive = !isStart && pl.depth === 0;
      const hideMobile = mobile && !isActive && !isStart;
      return (
        <Island key={pl.key} image={WORLD_IMAGE[w]} x={pl.x} y={pl.y} size={hideMobile ? 0 : mobile ? Math.min(pl.size, 44) : pl.size} depth={pl.depth} active={isActive} opacity={hideMobile ? 0 : pl.opacity}
          label={isActive ? undefined : pl.label} sub={isStart ? pl.sub : undefined} labelSize={pl.labelSize ?? 'big'} cta={isStart ? 'Öffnen' : undefined} eager={isActive || isStart} title={`Zur Welt ${pl.label ?? w}`} filter={w === 'projekte' ? 'hue-rotate(-8deg)' : undefined}
          onClick={isActive ? undefined : () => navigate({ world: w })}>{(isActive || isStart) && w === 'heute' ? <Tagesportal compact={isStart} /> : null}</Island>
      );
    }
    const p = projects.find((x) => x.id === pl.projectId)!;
    const isActive = pl.depth === 0;
    return (
      <Island key={pl.key} image={p.island.libraryId} x={pl.x} y={pl.y} size={mobile && !isActive ? 0 : pl.size} depth={pl.depth} active={isActive && !!current} opacity={mobile && !isActive ? 0 : pl.opacity} label={current || isActive ? undefined : pl.label} labelSize="small" status={current || isActive || !pl.label ? undefined : { text: blocked(p.id) ? 'Blockiert' : p.stage, color: blocked(p.id) ? '#ff6b6b' : STAGE_COLOR[p.stage] ?? '#8a8f96' }} eager={isActive} halo={blocked(p.id) ? 'rgba(255,107,107,.55)' : undefined} spotlight={spot?.projectId === p.id && spot.until > now.getTime()}
        title={p.name} onClick={current ? undefined : isActive ? () => navigate({ world: 'projekte', projectId: p.id }) : () => setCarousel(active.findIndex((x) => x.id === p.id))}>
        {p.island.kind === 'eigenes' && p.island.photoDataUrl ? <PhotoFrame cfg={p.island} bare={p.island.libraryId === 'staffelei'} /> : null}
      </Island>
    );
  });

  if (mobile) return <Mobile />;

  return (
    <Stage phase={phase} look={look} world={route.world} parallax={!motionReduced && !coarse && !sheet && !mobile && (settings.parallax ?? 1) > 0} parallaxStrength={settings.parallax ?? 1} season={season} weatherCode={weather?.data.hourly.length ? weather.data.current.code : undefined} islands={islands}>
      <div className="ui">
        <TopBar />
        {route.world === 'start' ? <Start /> : null}
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

export function PhotoFrame({ cfg, bare }: { cfg: { photoDataUrl?: string; frame: { ratio: 'quer' | 'hoch' | 'quadrat'; offsetX: number; offsetY: number; zoom: number; style: 'holz' | 'metall' } }; bare?: boolean }) {
  // fills the wooden board of the frame island (the island__props box is the board face); `bare` = the easel island paints its own frame, the photo just fills the opening
  const ratio = cfg.frame.ratio === 'quer' ? '4 / 3' : cfg.frame.ratio === 'hoch' ? '3 / 4' : '1 / 1';
  if (bare) return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#1a1a1a' }}><img src={cfg.photoDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${cfg.frame.offsetX}%, ${cfg.frame.offsetY}%) scale(${cfg.frame.zoom})` }} /></div>;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ aspectRatio: ratio, maxWidth: '100%', maxHeight: '100%', width: cfg.frame.ratio === 'quer' ? '100%' : undefined, height: cfg.frame.ratio === 'quer' ? undefined : '100%', borderRadius: 3, padding: '1.2%', background: cfg.frame.style === 'holz' ? 'linear-gradient(135deg,#8a5a2b,#5a391a)' : 'linear-gradient(135deg,#b9bec7,#6b7280)', boxShadow: '0 2px 6px rgba(0,0,0,.4)', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}>
          <img src={cfg.photoDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${cfg.frame.offsetX}%, ${cfg.frame.offsetY}%) scale(${cfg.frame.zoom})` }} />
        </div>
      </div>
    </div>
  );
}
