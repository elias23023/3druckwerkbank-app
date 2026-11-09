# Login mit Google und E-Mail (direkt auf Hostinger)

Konto und Synchronisation laufen vollständig auf dem eigenen Hostinger-Webspace von 3druckwerkbank.com: eine kleine PHP-Schnittstelle unter `/api` und eine MySQL-Datenbank auf demselben Server. Kein Fremddienst.

## Was läuft wo
- **Code:** `public/api/_lib.php` (Datenbank, Sitzungen, Google-Prüfung), `auth.php` (Registrieren, Anmelden, Google, Abmelden, Passwort zurücksetzen), `state.php` (Werkstatt-Stand lesen und schreiben), `health.php` (Status). Wird mit dem normalen Build deployt.
- **Datenbank:** `u685288958_werkbank` (MySQL auf srv1700, Zugriff von PHP über 127.0.0.1). Tabellen `users`, `sessions`, `werkstatt` (eine Zeile pro Nutzer mit dem ganzen Stand als JSON), `resets`, `attempts` werden beim ersten Aufruf automatisch angelegt.
- **Konfiguration:** `/werkbank-private/config.php` **neben** `public_html` (nicht über das Web erreichbar, nicht im Git). Vorlage: `docs/werkbank-config.example.php`. Enthält Datenbankzugang, ein App-Geheimnis, die Google-Client-ID und die Absenderadresse.
- **Sitzung:** httpOnly-Cookie `wb_session`, 60 Tage, SameSite=Lax, nur über HTTPS; Token nur als SHA-256-Hash in der Datenbank. Passwörter mit `password_hash` (bcrypt). Höchstens 20 Anmeldeversuche je IP in 15 Minuten. Schreibende Aufrufe nur von der eigenen Domain (Origin-Prüfung).

## Google-Anmeldung aktivieren (ca. 10 Minuten)
1. https://console.cloud.google.com → Projekt anlegen, z. B. `3Druckwerkbank`.
2. **APIs & Dienste → OAuth-Zustimmungsbildschirm**: Typ „Extern“, App-Name `3Druckwerkbank`, Support-E-Mail, Kontakt-E-Mail, speichern. Unter „Zielgruppe“ auf „In Produktion“ stellen, sonst dürfen sich nur eingetragene Test-Nutzer anmelden.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**, Typ „Webanwendung“:
   - Autorisierte JavaScript-Quellen: `https://3druckwerkbank.com`
   - Autorisierte Weiterleitungs-URIs: keine nötig (die App nutzt das Google-ID-Token direkt im Browser).
4. Die **Client-ID** (endet auf `.apps.googleusercontent.com`) dem Hauptchat schicken. Ein Client-Secret wird nicht gebraucht. Der Hauptchat trägt die ID in `/werkbank-private/config.php` ein; danach erscheint der Google-Knopf im Konto-Panel.

Prüfung im Server: Das Google-ID-Token wird gegen Googles aktuelle öffentliche Schlüssel verifiziert (Signatur, Aussteller, Ablauf, Client-ID), erst dann wird das Konto angelegt oder verknüpft.

## E-Mail-Anmeldung
Funktioniert sofort: Registrieren mit E-Mail und Passwort (mindestens 8 Zeichen), Anmelden, Abmelden. „Passwort vergessen“ schickt per PHP `mail()` einen Link `https://3druckwerkbank.com/#/konto/reset/<token>` (eine Stunde gültig). Falls Hostinger-Mails im Spam landen, die Absenderadresse in der Konfiguration auf eine echte Mailbox der Domain setzen.

## Was synchronisiert wird
Nur „Meine Werkstatt“: Projekte, Geräte, Rollen, Aufgaben, Drucke, Berichte, Termine, Einkaufsliste, Einstellungen, Energiewerte (Inhalt des JSON-Exports). Wetter-Cache und Entwürfe bleiben lokal. Jede Änderung wird 1,5 Sekunden nach der letzten Eingabe gespeichert; beim Wechsel in den Tab wird ein neuerer Stand eines anderen Geräts geladen. Schreibt ein anderes Gerät dazwischen, meldet das Panel einen Konflikt und bietet „Stand aus dem Konto übernehmen“ oder „Diesen Stand ins Konto schreiben“. Ein Stand darf bis zu 12 MB groß sein.

## Pflege
- Neue Konfiguration hochladen: TUS-Upload nach `werkbank-private/config.php` (Pfad relativ zum Domain-Ordner, wie `public_html`).
- Tabellen ansehen: hPanel → Datenbanken → phpMyAdmin für `u685288958_werkbank`.
- Test-Konten aus der Entwicklung: `werkbank-test@example.com`, `werkbank-test2@example.com` (können in phpMyAdmin gelöscht werden).
