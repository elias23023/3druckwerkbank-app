/**
 * Zwei Bereiche in einer App:
 *  - „Beispiel“ (demo): die Demodaten zum Ausprobieren und Weiterentwickeln, Speicher `3druckwerkbank:v1` (wie bisher).
 *  - „Meine Werkstatt“ (echt): die echten Projekte des Nutzers, eigener Speicher `3druckwerkbank:echt:v1`, startet leer
 *    (nur Drucker, AMS, Trockner und Werkzeuge bleiben als Ausgangspunkt). Nur dieser Bereich wird mit dem Konto synchronisiert.
 * Der Bereich wird beim Laden gelesen; ein Wechsel schreibt den Schlüssel und lädt die Seite neu, damit der Store sauber neu startet.
 */
export type Workspace = 'demo' | 'echt';
const KEY = '3druckwerkbank:bereich';

export const workspace: Workspace = (() => { try { return localStorage.getItem(KEY) === 'echt' ? 'echt' : 'demo'; } catch { return 'demo'; } })();
export const storageName = workspace === 'echt' ? '3druckwerkbank:echt:v1' : '3druckwerkbank:v1';
export const isDemo = workspace === 'demo';

export const WORKSPACE_META: Record<Workspace, { label: string; short: string; hint: string; color: string }> = {
  demo: { label: 'Beispiel-Werkstatt', short: 'Beispiel', hint: 'Demodaten zum Ausprobieren und Weiterentwickeln. Änderungen hier sind nur Spielwiese.', color: '#ffb547' },
  echt: { label: 'Meine Werkstatt', short: 'Meine Werkstatt', hint: 'Deine echten Projekte, Rollen und Drucke. Wird mit deinem Konto synchronisiert, sobald du angemeldet bist.', color: '#4ccf7a' },
};

export function switchWorkspace(w: Workspace) {
  if (w === workspace) return;
  try { localStorage.setItem(KEY, w); } catch { /* ignore */ }
  const hash = w === 'echt' ? '#/start' : window.location.hash || '#/start';
  window.location.hash = hash;
  window.location.reload();
}

/** Grobe Zahlen des jeweils anderen Bereichs, nur zur Anzeige im Wechsel-Panel. */
export function peekWorkspace(w: Workspace): { projects: number; spools: number } | null {
  try {
    const raw = localStorage.getItem(w === 'echt' ? '3druckwerkbank:echt:v1' : '3druckwerkbank:v1');
    if (!raw) return null;
    const st = JSON.parse(raw)?.state ?? {};
    return { projects: (st.projects ?? []).filter((p: { deletedAt?: string }) => !p.deletedAt).length, spools: (st.spools ?? []).length };
  } catch { return null; }
}
