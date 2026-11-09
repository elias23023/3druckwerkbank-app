import type { Store } from '../store';
import { fold } from './format';
import { WORLDS } from '../types';

export interface Hit { group: string; id: string; title: string; subtitle?: string; keywords: string; action: () => void }

export function buildIndex(s: Store, nav: (h: string) => void): Hit[] {
  const out: Hit[] = [];
  for (const w of WORLDS) out.push({ group: 'Welten', id: `w-${w.id}`, title: `Gehe zu ${w.label}`, subtitle: w.sub, keywords: `${w.label} welt ${w.sub}`, action: () => nav(`#/${w.id}`) });
  const projects = s.projects.filter((p) => !p.deletedAt);
  for (const p of projects) out.push({ group: p.archivedAt ? 'Archiv' : 'Projekte', id: p.id, title: p.name, subtitle: `${p.type} · ${p.stage} · ${p.progress} %`, keywords: `${p.name} ${p.description} ${p.type} ${p.areas.join(' ')} ${p.tags.join(' ')} ${p.versions.map((v) => v.label + ' ' + v.status).join(' ')}`, action: () => nav(`#/projekte/${encodeURIComponent(p.id)}`) });
  for (const p of projects) for (const v of p.versions) out.push({ group: 'Versionen', id: v.id, title: `${p.name} · ${v.label}`, subtitle: `${v.status} · ${v.changes.join(', ')}`, keywords: `${p.name} ${v.label} ${v.status} version beste aktuell final ${v.changes.join(' ')}`, action: () => nav(`#/projekte/${encodeURIComponent(p.id)}`) });
  for (const t of s.tasks.filter((t) => !t.done)) { const p = projects.find((x) => x.id === t.projectId); if (t.projectId && !p) continue; out.push({ group: 'Aufgaben', id: t.id, title: t.title, subtitle: p?.name ?? t.kind, keywords: `${t.title} ${t.kind} aufgabe ${p?.name ?? ''}`, action: () => (p ? nav(`#/projekte/${encodeURIComponent(p.id)}`) : nav('#/heute')) }); }
  for (const pr of s.prints) { const p = projects.find((x) => x.id === pr.projectId); out.push({ group: 'Drucke', id: pr.id, title: pr.name, subtitle: `${pr.status}${pr.result ? ' · ' + pr.result : ''}`, keywords: `${pr.name} druck ${pr.status} ${pr.result ?? ''} ${p?.name ?? ''}`, action: () => { nav('#/druck'); s.openSheet({ kind: 'druck', printId: pr.id }); } }); }
  for (const sp of s.spools) out.push({ group: 'Rollen', id: sp.id, title: sp.label, subtitle: `${sp.material} · ${sp.brand} · ${sp.location}`, keywords: `${sp.label} ${sp.material} ${sp.brand} ${sp.colorName} ${sp.location} rolle filament spule`, action: () => { nav('#/material'); s.openSheet({ kind: 'spule', spoolId: sp.id }); } });
  for (const d of s.devices) out.push({ group: d.kind === 'werkzeug' ? 'Werkzeuge' : 'Geräte', id: d.id, title: d.name, subtitle: [d.model, d.status].filter(Boolean).join(' · '), keywords: `${d.name} ${d.model} ${d.kind} ${d.kind === 'werkzeug' ? 'werkzeug' : 'drucker gerät'} ${d.location}`, action: () => { if (d.kind === 'werkzeug') s.openSheet({ kind: 'geraetForm', deviceId: d.id, returnTo: 'werkzeuge' }); else { nav('#/druck'); s.openSheet({ kind: 'geraet', deviceId: d.id }); } } });
  for (const p of projects) for (const h of p.history.slice(0, 20)) out.push({ group: 'Historie', id: h.id, title: h.title, subtitle: `${p.name} · ${h.detail ?? h.type}`, keywords: `${h.title} ${h.detail ?? ''} ${h.type} ${p.name}`, action: () => nav(`#/projekte/${encodeURIComponent(p.id)}`) });
  out.push({ group: 'Aktionen', id: 'a-new', title: 'Neues Projekt anlegen', keywords: 'neu projekt anlegen erstellen', action: () => s.openSheet({ kind: 'projektForm' }) });
  out.push({ group: 'Aktionen', id: 'a-spool', title: 'Neue Rolle anlegen', keywords: 'neu rolle filament anlegen', action: () => s.openSheet({ kind: 'spule' }) });
  out.push({ group: 'Aktionen', id: 'a-printer', title: 'Drucker anlegen', keywords: 'neu drucker gerät anlegen hinzufügen', action: () => s.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' }) });
  out.push({ group: 'Aktionen', id: 'a-tool', title: 'Werkzeug anlegen', keywords: 'neu werkzeug anlegen hinzufügen', action: () => s.openSheet({ kind: 'geraetForm', deviceKind: 'werkzeug', returnTo: 'werkzeuge' }) });
  out.push({ group: 'Aktionen', id: 'a-devices', title: 'Geräte & Werkzeuge verwalten', keywords: 'geräte werkzeuge drucker ams trockner verwalten bearbeiten löschen', action: () => s.openSheet({ kind: 'geraete' }) });
  out.push({ group: 'Aktionen', id: 'a-konto', title: 'Konto & Synchronisation', keywords: 'konto anmelden login google sync synchronisation abmelden', action: () => s.openSheet({ kind: 'konto' }) });
  out.push({ group: 'Aktionen', id: 'a-settings', title: 'Einstellungen öffnen', keywords: 'einstellungen thema bewegung export import', action: () => s.openSheet({ kind: 'einstellungen' }) });
  out.push({ group: 'Aktionen', id: 'a-about', title: 'Über diesen Entwurf', keywords: 'über info entwurf funktioniert demo später', action: () => s.openSheet({ kind: 'ueber' }) });
  return out;
}

export function score(h: Hit, q: string): number {
  const f = fold(q).trim(); if (!f) return 1;
  const t = fold(h.title), k = fold(h.keywords);
  const words = f.split(/\s+/);
  let total = 0;
  for (const w of words) {
    if (t.startsWith(w)) total += 3;
    else if (t.split(/\s+/).some((x) => x.startsWith(w))) total += 2;
    else if (k.split(/\s+/).some((x) => x.startsWith(w))) total += 1.5;
    else if (k.includes(w)) total += 1;
    else return 0;
  }
  return total;
}
