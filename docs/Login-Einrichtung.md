# Login mit Google und E-Mail (direkt auf Hostinger)

Konto und Synchronisation laufen vollständig auf dem eigenen Hostinger-Webspace von 3druckwerkbank.com: eine kleine PHP-Schnittstelle unter `/api` und eine MySQL-Datenbank auf demselben Server. Kein Fremddienst.

## Was läuft wo
- **Code:** `public/api/_lib.php` (Datenbank, Sitzungen, Google-Prüfung), `auth.php` (Registrieren, Anmelden, Google, Abmelden, Passwort zurücksetzen), `state.php` (Werkstatt-Stand lesen und schreiben), `health.php` (Status). Wird mit dem normalen Build deployt.
- **Datenbank:** `u685288958_werkbank` (MySQL auf srv1700, Zugriff von PHP über 127.0.0.1). Tabellen `users`, `sessions`, `werkstatt` (eine Zeile pro Nutzer mit dem ganzen Stand als JSON), `resets`, `attempts` werden beim ersten Aufruf automatisch angelegt und erweitert. Der Stand des Schemas steht in einer Merkerdatei `werkbank-private/schema-v2`; fehlt sie, laufen die (wiederholbaren) Schritte erneut.
- **Konfiguration:** `/werkbank-private/config.php` **neben** `public_html` (nicht über das Web erreichbar, nicht im Git). Vorlage: `docs/werkbank-config.example.php`. Enthält Datenbankzugang, ein App-Geheimnis, die Google-Client-ID, die Absenderadresse und optional `base_url` (Adresse für den Link in der Passwort-E-Mail, Standard `https://3druckwerkbank.com`).
- **Sitzung:** httpOnly-Cookie `wb_session`, 60 Tage, SameSite=Lax, nur über HTTPS; Token nur als SHA-256-Hash in der Datenbank. Passwörter mit `password_hash` (bcrypt). Höchstens 20 Versuche je Anschluss (IPv6 als /64-Netz) und 10 je E-Mail-Adresse in 15 Minuten. Schreibende Aufrufe nur von der eigenen Domain (Origin- und Sec-Fetch-Site-Prüfung). Fehler kommen immer als kurze JSON-Antwort, Details stehen nur im Server-Log.

## Google-Anmeldung aktivieren (ca. 10 Minuten)
1. https://console.cloud.google.com → Projekt anlegen, z. B. `3Druckwerkbank`.
2. **APIs & Dienste → OAuth-Zustimmungsbildschirm**: Typ „Extern“, App-Name `3Druckwerkbank`, Support-E-Mail, Kontakt-E-Mail, speichern. Unter „Zielgruppe“ auf „In Produktion“ stellen, sonst dürfen sich nur eingetragene Test-Nutzer anmelden.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**, Typ „Webanwendung“:
   - Autorisierte JavaScript-Quellen: `https://3druckwerkbank.com`
   - Autorisierte Weiterleitungs-URIs: keine nötig (die App nutzt das Google-ID-Token direkt im Browser).
4. Die **Client-ID** (endet auf `.apps.googleusercontent.com`) dem Hauptchat schicken. Ein Client-Secret wird nicht gebraucht. Der Hauptchat trägt die ID in `/werkbank-private/config.php` ein; danach erscheint der Google-Knopf im Konto-Panel.

Prüfung im Server: Das Google-ID-Token wird gegen Googles aktuelle öffentliche Schlüssel verifiziert (Signatur, Aussteller, Ablauf, Client-ID), erst dann wird das Konto angelegt oder verknüpft.

Verknüpfung mit einem bestehenden E-Mail-Konto: Gleiche Adresse heißt gleiches Konto, die Werkstatt bleibt erhalten. Wurde die Adresse dort noch nie bestätigt (kein Passwort-Link benutzt), wird das alte Passwort entfernt und alle Sitzungen enden; ein neues Passwort gibt es über „Passwort vergessen“. So kann niemand ein Konto mit fremder Adresse vorab anlegen und später mitlesen.

## E-Mail-Anmeldung
Funktioniert sofort: Registrieren mit E-Mail und Passwort (mindestens 8 Zeichen), Anmelden, Abmelden. Für eine Adresse, zu der es schon ein Konto gibt (auch ein reines Google-Konto), lässt sich kein zweites Konto und kein Passwort per Registrierung anlegen; ein Passwort setzt man dort über „Passwort vergessen“. „Passwort vergessen“ schickt per PHP `mail()` einen Link `https://3druckwerkbank.com/#/konto/reset/<token>` (eine Stunde gültig). Falls Hostinger-Mails im Spam landen, die Absenderadresse in der Konfiguration auf eine echte Mailbox der Domain setzen.

## Was synchronisiert wird
Nur „Meine Werkstatt“: Projekte, Geräte, Rollen, Aufgaben, Drucke, Berichte, Termine, Einkaufsliste, Einstellungen, Energiewerte (Inhalt des JSON-Exports). Wetter-Cache und Entwürfe bleiben lokal. Jede Änderung wird 1,5 Sekunden nach der letzten Eingabe gespeichert; beim Wechsel in den Tab wird ein neuerer Stand eines anderen Geräts geladen. Es wird nie still überschrieben:
- Erste Anmeldung in einem Browser: Ist das Konto leer, wandert der Stand des Browsers ins Konto. Ist der Browser leer, wird der Stand aus dem Konto geladen. Liegen auf beiden Seiten Daten, zeigt das Konto-Panel beide Stände mit Anzahl der Projekte, Rollen und Geräte, und der Nutzer wählt „Diesen Stand behalten“ oder „Stand aus dem Konto übernehmen“.
- Schreibt ein anderes Gerät dazwischen, meldet das Panel denselben Konflikt. Der Server nimmt einen Stand nur an, wenn der Aufrufer den aktuellen Stand kennt (`ifUpdatedAt`) oder ausdrücklich überschreibt (`force`).
- Vor dem Übernehmen aus dem Konto und bei einem Kontowechsel wird der Stand des Browsers gesichert (`3druckwerkbank:echt:sicherung` im Browser-Speicher) und lässt sich im Konto-Panel wiederherstellen.
- Schlägt das Laden oder Speichern fehl, wird automatisch erneut versucht; bis zum ersten erfolgreichen Abgleich wird nichts hochgeladen.

Ein Stand darf bis zu 12 MB groß sein.

## Pflege
- Neue Konfiguration hochladen: TUS-Upload nach `werkbank-private/config.php` (Pfad relativ zum Domain-Ordner, wie `public_html`).
- Tabellen ansehen: hPanel → Datenbanken → phpMyAdmin für `u685288958_werkbank`.
- Test-Konten aus der Entwicklung: `werkbank-test@example.com`, `werkbank-test2@example.com` (können in phpMyAdmin gelöscht werden).
