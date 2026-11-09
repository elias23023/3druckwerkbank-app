# Login mit Google und E-Mail einrichten (Supabase)

Die App bleibt eine statische Seite. Konto und Synchronisation laufen über **Supabase** (kostenloser Free-Plan reicht): Anmeldung mit Google oder E-Mail und Passwort, Daten in einer Postgres-Tabelle, die jede Person nur für sich selbst lesen und schreiben darf.

## 1. Supabase-Projekt anlegen (ca. 5 Minuten)
1. https://supabase.com → „Start your project“ → mit GitHub oder E-Mail anmelden.
2. „New project“: Name `3druckwerkbank`, Region **Frankfurt (eu-central-1)**, Datenbank-Passwort vergeben (irgendwo sicher notieren, wir brauchen es nicht in der App).
3. Nach dem Anlegen: **Project Settings → API**. Dort zwei Werte kopieren:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public** Key (langer Text, beginnt mit `eyJ…`). Der darf öffentlich sein, er steckt später im Browser-Code; geschützt wird alles über die Regeln in Schritt 2.

## 2. Tabelle und Regeln anlegen
**SQL Editor** (links im Menü) → „New query“ → folgendes einfügen → **Run**:

```sql
create table if not exists public.werkstatt (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.werkstatt enable row level security;

create policy "eigene zeile lesen" on public.werkstatt
  for select using (auth.uid() = user_id);
create policy "eigene zeile anlegen" on public.werkstatt
  for insert with check (auth.uid() = user_id);
create policy "eigene zeile ändern" on public.werkstatt
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene zeile löschen" on public.werkstatt
  for delete using (auth.uid() = user_id);
```

## 3. Anmeldung einstellen
**Authentication → URL Configuration**
- Site URL: `https://3druckwerkbank.com`
- Redirect URLs: `https://3druckwerkbank.com`, `https://3druckwerkbank.com/`, `http://localhost:4173`, `http://localhost:5173`

**Authentication → Providers → Email**: eingeschaltet lassen. „Confirm email“ kann an bleiben (dann kommt beim Registrieren eine Bestätigungsmail) oder aus (sofort angemeldet).

## 4. Google-Anmeldung aktivieren
1. https://console.cloud.google.com → Projekt anlegen (z. B. `3Druckwerkbank`).
2. **APIs & Dienste → OAuth-Zustimmungsbildschirm**: Typ „Extern“, App-Name `3Druckwerkbank`, Support-E-Mail und Kontakt-E-Mail eintragen, speichern. Unter „Zielgruppe“ ggf. auf „In Produktion“ stellen, sonst dürfen sich nur eingetragene Test-Nutzer anmelden.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**: Typ „Webanwendung“.
   - Autorisierte JavaScript-Quellen: `https://3druckwerkbank.com`
   - Autorisierte Weiterleitungs-URI: die Callback-URL aus Supabase. Sie steht in Supabase unter **Authentication → Providers → Google** als „Callback URL (for OAuth)“ und sieht so aus: `https://<projekt>.supabase.co/auth/v1/callback`
   - Erstellen → **Client-ID** und **Client-Secret** kopieren.
4. Zurück in Supabase: **Authentication → Providers → Google** einschalten, Client-ID und Client-Secret eintragen, speichern.

## 5. Werte in die App
Die beiden Werte aus Schritt 1 gehören in die Datei `.env.production` im Projekt (der anon-Key ist öffentlich, das ist bei Supabase so vorgesehen):

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…
```

Danach Build und Deploy wie gewohnt. Ohne diese Werte zeigt das Konto-Panel nur den Hinweis, dass der Dienst nicht eingerichtet ist, und die App arbeitet wie bisher nur im Browser.

## Was synchronisiert wird
Projekte, Geräte, Rollen, Aufgaben, Drucke, Berichte, Termine, Einkaufsliste, Einstellungen und Energiewerte, also genau das, was auch der JSON-Export enthält. Der Wetter-Cache und Entwürfe bleiben lokal. Pro Konto liegt eine Zeile mit dem ganzen Stand als JSON; jede Änderung wird nach 1,5 Sekunden Ruhe gespeichert, beim Wechsel in den Tab wird ein neuerer Stand von anderen Geräten geladen.

## Grenzen (Free-Plan)
500 MB Datenbank, 50.000 monatlich aktive Nutzer, Projekt pausiert nach 7 Tagen ohne Zugriff (wird beim nächsten Zugriff wieder geweckt). Für eine persönliche Werkstatt mehr als genug.
