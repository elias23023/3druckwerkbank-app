# Wasser-Look: Anleitung

Stand 14.11. Für alle, die den Wasser-Look ansehen, anwenden oder in die App einbauen.
**Nichts davon ist eingebaut.** `src/`, `public/`, `server/` sind unverändert; die App wird erst geändert, wenn der Besitzer es sagt.

| Was | Wo |
|---|---|
| Die Vorlage (drei Stylesheets, ein Skript) | `docs/wasser-look/vorlage/`: `kern.css`, `mobil.css`, `desktop.css`, `wasser.js` |
| Die Werkzeuge (ansehen, prüfen, messen) | `scripts/wasser/` – jede Datei erklärt sich in ihrem Kopf |
| Die Bilder | `docs/wasser-look/bilder/mobil/`, `…/desktop/`, `…/anleitung/` |
| Die Entscheidungen des Besitzers | `docs/wasser-look/entwurf/entscheidungen.md` – gehen allem anderen vor |
| Das Notizbuch der Erbauer (englisch, alle Zahlen) | `docs/wasser-look/vorlage/NOTIZEN.md` |

Inhalt: [1 Was der Look ist](#1-was-der-look-ist) · [2 Entscheidungen](#2-entscheidungen-des-besitzers-binden-alle) · [3 Ansehen](#3-beide-vorlagen-ansehen-ohne-die-app-anzufassen) · [4 Bausteine](#4-die-bausteine) · [5 Dosierung](#5-dosierung) · [6 Töne](#6-töne-und-modi) · [7 Bewegung](#7-bewegung) · [8 Fahrplan](#8-fahrplan-die-vorlage-in-die-app-einbauen) · [9 Fallstricke](#9-fallstricke) · [10 Offen](#10-ungeprüft-und-offen) · [11 Geprüft](#11-was-an-dieser-anleitung-geprüft-wurde)

Alle Befehle laufen aus dem Projektordner. Ausgaben gehen nach `screenshots/` (nicht im Git).

---

## 1. Was der Look ist

1. **Knöpfe sind Tropfen aus klarem Wasser.** Frei über der Landschaft brechen sie das Bild dahinter. Auf einer Karte zeigen sie das Wasser der Karte.
2. **Karten und Panels sind flache Becken aus stillem Wasser:** am Rand klar, in der Mitte tiefer. Unter jedem Tropfen sammelt sich Licht.
3. **Eine Berührung** beantwortet das Becken mit einem dünnen Ring.
4. **Menüleiste (Handy) und Dock (Desktop)** sind dichtes Wasser. Eine Perle fließt zum aktiven Reiter.
5. **Bögen, Felder, Etiketten, Haken, Fortschritt, Hinweis und Suche** bekommen eine abgemessene Dosis: Form und ein heller Rand, kein Glanz.
6. **In Ruhe** wandert Licht an den Rändern. Scrollen zieht das Licht mit. Nach 30 s ohne Berührung ruht alles.
7. **Mit „Bewegung reduzieren“** steht alles still.
8. **Zwei Töne:** „dunkel“ ist der dunkle Modus (Standard), „klar“ der helle Modus. Die Schrift ist in beiden hell.
9. **Am Desktop** bleiben Inseln, ihre Namen, der Tagesring und lose Schrift über der Landschaft unberührt.
10. **Der Look ist ein Aufsatz:** eingeschaltet durch das Attribut `data-wasser` am Wurzelelement. Ohne das Attribut ist die App wie heute.

| | Ton „dunkel“ | Ton „klar“ |
|---|---|---|
| **Handy**, Vorschauseite | [dunkel-start](wasser-look/bilder/mobil/dunkel-start.webp) · [alle Szenen](wasser-look/bilder/mobil/dunkel-szenen.webp) | [klar-start](wasser-look/bilder/mobil/klar-start.webp) · [alle Szenen](wasser-look/bilder/mobil/klar-szenen.webp) |
| **Handy**, echte App (zwölf Bildschirme) | [dunkel-app](wasser-look/bilder/mobil/dunkel-app.webp) · [einer groß](wasser-look/bilder/mobil/dunkel-app-heute.webp) | [klar-app](wasser-look/bilder/mobil/klar-app.webp) · [einer groß](wasser-look/bilder/mobil/klar-app-heute.webp) |
| **Handy**, Knöpfe aus der Nähe | [dunkel-nah](wasser-look/bilder/mobil/dunkel-nah.webp) | [klar-nah](wasser-look/bilder/mobil/klar-nah.webp) |
| **Handy**, die kleinen Bausteine | [dunkel-alles](wasser-look/bilder/mobil/dunkel-alles.webp) | [klar-alles](wasser-look/bilder/mobil/klar-alles.webp) |
| **Desktop**, 2000 × 993 | [Start](wasser-look/bilder/desktop/dunkel-1-start.webp) · [Heute](wasser-look/bilder/desktop/dunkel-2-heute.webp) · [Projekte](wasser-look/bilder/desktop/dunkel-3-projekte.webp) · [Innenwelt](wasser-look/bilder/desktop/dunkel-4-innenwelt.webp) · [3D-Druck](wasser-look/bilder/desktop/dunkel-5-druck.webp) · [Material](wasser-look/bilder/desktop/dunkel-6-material.webp) · [Wetter](wasser-look/bilder/desktop/dunkel-7-wetter.webp) · [Archiv](wasser-look/bilder/desktop/dunkel-8-archiv.webp) | [Heute bei Tag](wasser-look/bilder/desktop/klar-heute.webp) · [Heute bei Nacht](wasser-look/bilder/desktop/klar-heute-nacht.webp) · [Projekte](wasser-look/bilder/desktop/klar-projekte.webp) · [Wetter](wasser-look/bilder/desktop/klar-wetter.webp) |
| **Desktop**, 1920 × 1080 | [Material](wasser-look/bilder/desktop/format-1920-material.webp) · [Innenwelt](wasser-look/bilder/desktop/format-1920-innenwelt.webp) | |
| **Desktop**, heute gegen Vorlage | [Heute](wasser-look/bilder/desktop/vorher-nachher-heute.webp) · [Schublade](wasser-look/bilder/desktop/vorher-nachher-bogen.webp) | [bei Tag](wasser-look/bilder/desktop/vorher-nachher-tag.webp) |

Bewegung als Bildstreifen: Handy [Reiterwechsel](wasser-look/bilder/mobil/film-tab.webp), [Knopfdruck mit Ring](wasser-look/bilder/mobil/film-druck.webp), [Bogen steigt](wasser-look/bilder/mobil/film-bogen.webp); Desktop [Dock, Schublade, Ruhe](wasser-look/bilder/desktop/film-1.webp), [Ring, Mauszeiger](wasser-look/bilder/desktop/film-2.webp), [Pfeil, Lauflinie](wasser-look/bilder/desktop/film-3.webp).
Filme: [mobil.mp4](wasser-look/bilder/mobil/mobil.mp4), [desktop.mp4](wasser-look/bilder/desktop/desktop.mp4) – auf der Arbeitsmaschine aufgenommen, daher ruckelig.

---

## 2. Entscheidungen des Besitzers (binden alle)

Quelle: `docs/wasser-look/entwurf/entscheidungen.md`. Bei Widerspruch gilt die Entscheidung, nicht diese Anleitung.

1. **Knöpfe auf einer Karte zeigen das Wasser der Karte.** Nur Knöpfe frei über der Szene brechen die Landschaft.
2. **Kein Blau.** Farben, die etwas bedeuten (Statuspunkte, Materialnamen, Diagramme), bleiben.
3. **Rot von „Löschen“:** tiefer und ruhiger im Ton „dunkel“, klares Rot im Ton „klar“.
4. **Beide Töne bleiben, als die zwei Modi der App.** Dunkler Modus = Ton „dunkel“. Heller Modus = Ton „klar“.
5. **Die Einstellung „Erscheinungsbild“ wählt den Ton, auf Handy und Desktop:** Dunkel → „dunkel“, Hell → „klar“, Automatisch → nach dem Look der Stunde (`DARK_LOOKS` in `src/scene/looks.ts`).
6. **Das alte helle Thema der App ist nicht der helle Modus.** Helle Flächen mit dunkler Schrift (`:root[data-theme="hell"]`) sind nicht gemeint. Der helle Modus ist der Ton „klar“ mit heller Schrift.
7. **Alles ist bewegt, aber ruhig:** lebt in Ruhe, antwortet auf Berührung und Scrollen. Aus bei reduzierter Bewegung.
8. **Erst die Vorlage.** Zwei Vorlagen zum Ansehen (Handy, Desktop) mit Anleitung. Die App selbst wird nicht geändert, bis er es sagt.

Dazu die Regeln des Projekts (`CLAUDE.md`): Nur der Hauptchat baut, deployt und führt `main` zusammen. Deutsche Oberfläche, englischer Code. Layout immer in 1920 × 1080 und 2000 × 993 prüfen. Neues muss in beiden Bereichen laufen, auch im leeren „Meine Werkstatt“. Bilder erzeugt nur der Besitzer – der Look braucht keine neuen.

---

## 3. Beide Vorlagen ansehen, ohne die App anzufassen

### Beide in der echten App (der beste Weg)

```
npm run build
node scripts/wasser/desktop.mjs zeigen
```

Dann http://localhost:4320 öffnen. Das ist die gebaute App mit der Vorlage obendrauf. Strg+C beendet.

- Breites Fenster = Desktop-Vorlage. Schmales Fenster (unter 900 px) = Handy-Vorlage.
- Am Desktop folgt der Ton der Einstellung „Erscheinungsbild“. Fest wählen: `?ton=klar` oder `?ton=dunkel` vor das `#` hängen, z. B. `http://localhost:4320/?ton=klar#/heute`.
- Im schmalen Fenster ist der Ton „dunkel“, bis man `?ton=klar` anhängt (die mobile App verlangt heute immer das dunkle Thema).
- `?ohne=1` – die App wie heute, zum Vergleichen. `?weich=aus` – die Vorlage ohne Weichzeichner. `?leben=1.5` – mehr Licht in Ruhe.

### Die Handy-Vorschauseite (ein Nachbau des mobilen Bildschirms mit den echten Stylesheets)

```
python3 -m http.server 4311
```

Dann im schmalen Fenster (oder Handy-Ansicht der Entwicklerwerkzeuge, 390 × 844) öffnen. Jeder freie Port geht.

- http://localhost:4311/scripts/wasser/mobil.html – Ton „dunkel“
- http://localhost:4311/scripts/wasser/mobil.html?ton=klar – Ton „klar“
- `&scene=start|heute|projekte|material|druck|wetter|archiv|innen` – das Bild dahinter
- `&alles=1` – ein Bogen mit allen kleinen Bausteinen. `&nah=1` – Knöpfe aus der Nähe (breites Fenster). `&fallback=1` – ohne WebGL. `&ohne=1` – die App wie heute.
- `&vorlage=<Ordner>` – eine andere Kopie der Vorlage, z. B. eine, an der man gerade etwas ausprobiert.

### Bilder und Filme selbst erzeugen

Die Werkzeuge spielen die Vorlage in die gebaute App ein. Dafür muss die Vorschau der App laufen (zweites Terminal):

```
npm run build && npm run preview
```

```
node scripts/wasser/bild.mjs screenshots/wasser/mobil                    # Handy: acht Szenen, Nahaufnahmen, echte App, beide Töne
node scripts/wasser/film.mjs screenshots/wasser/mobil-film               # Handy: Bewegung als Bildstreifen
node scripts/wasser/clip.mjs screenshots/wasser/mobil.mp4                # Handy: kurzer Film
node scripts/wasser/desktop.mjs bild screenshots/wasser/desktop --alles  # Desktop: Welten, Bögen, Suche, Hinweis, leere Werkstatt
node scripts/wasser/desktop.mjs film screenshots/wasser/desktop-film     # Desktop: Bewegung als Bildstreifen
node scripts/wasser/desktop.mjs clip screenshots/wasser/desktop.mp4      # Desktop: Rundgang als Film
```

Schalter der Desktop-Bilder: `--format 1920` (sonst 2000 × 993), `--ton klar`, `--zeit tag` (sonst Nacht), `--nur heute,wetter`, `--look ohne` (die App wie heute).
Bewegung nie aus einem Standbild beurteilen: dafür sind die Bildstreifen da.

---

## 4. Die Bausteine

Der Look besteht aus Bausteinen. Jeder Baustein ist **eine** Regel in `kern.css` (Teil 4) mit **einer** Liste von Selektoren. Alles, was dazugehört (Pseudo-Elemente, gedrückter Zustand, „keine Bewegung“), steht in der Regel selbst. Ein Selektor an einer Stelle bekommt also alles.

### 4.1 Einen Baustein anwenden: zwei Wege

**Weg A – neutrale Klasse.** Dem Element die Klasse des Bausteins geben (`.wa-becken`, `.wa-mulde` …). Kein CSS anfassen, keine Option nötig: Das Skript kennt die neutralen Klassen schon.

**Weg B – Eintrag in die Liste.** Das Element behält seine Klasse. In `kern.css` den Baustein suchen (Suchwort steht bei jedem Baustein unten) und eine Zeile in seine Liste schreiben. Nennt der Baustein eine Option des Skripts, denselben Selektor dort eintragen: in `wasser.js`, ganz oben, im Objekt `MOBIL`.

Fünf Regeln für Weg B:

1. **Die neue Zeile kommt direkt unter die erste Zeile der Liste und endet mit einem Komma.** Dahinter ein Vermerk: `/* mobil: Merkzettel */` oder `/* desktop: … */`.
2. **Ein Eintrag ist nie schwerer als der schwerste, der schon in der Liste steht.** Was er darüber hinaus braucht, kommt in `:where()` – das wiegt nichts: `.panel .glass:where(.col)`.

   | Gewicht der Liste | Bausteine |
   |---|---|
   | eine Klasse | Etikett, Etikett auf Wasser, dichtes Wasser, Markierung, Bogen, Feld, Haken, Pegel |
   | zwei Klassen | alle anderen |
   | drei Klassen | nur Perle (`.btn.btn--icon.btn--ghost`) |

3. **Eine Klasse, die beide Hüllen haben, gilt sonst für beide.** Nur für eine: mit einer Klasse dieser Hülle in `:where()` eingrenzen, z. B. `:where(.topbar) .brand`.
4. **Optionen:** `MOBIL` gilt auch am Desktop – außer bei den acht Optionen, die `DESKTOP` (gleich darunter) ersetzt: `scene`, `shade`, `drops`, `ringOn`, `ringFrom`, `bar`, `light`, `scrollers`. Kommt das Element in beiden Hüllen vor, dort in beide eintragen.
5. **Maße und Platz bleiben Sache der App** (Innenabstand, Breite, Höhe, `position`). Was eine Hülle an einem Baustein ändert, steht in `mobil.css` oder `desktop.css` – mit mindestens dem Gewicht der Liste (siehe 4.4).

Nach jedem Rezept:

```
node scripts/wasser/vergleich.mjs bilder --alt git:HEAD   # nichts anderes darf sich geändert haben (Handy; vor dem Commit)
node scripts/wasser/pruefen.mjs --app                     # 60 Prüfungen, etwa eine Minute
node scripts/wasser/desktop.mjs pruefen                   # 24 Prüfungen, wenn der Desktop betroffen ist
```

Zum Ausprobieren ohne die Vorlage zu ändern: den Ordner kopieren (`cp -r docs/wasser-look/vorlage screenshots/wasser/probe`), in der Kopie ändern, mit `mobil.html?vorlage=screenshots/wasser/probe` ansehen. Jedes Werkzeug nimmt die Kopie mit `--look screenshots/wasser/probe`.

### 4.2 Das durchgehende Beispiel: ein „Merkzettel“

Ein erfundenes neues Stück der mobilen App. Die App schreibt nur Maße und Plätze – keine Farbe, kein Rand, kein Schatten:

```html
<section class="merk">
  <div class="merk__kopf"><b>Merkzettel</b><span class="pill">3 offen</span><button class="merk__plus">+</button></div>
  <div class="merk__zeile"><span class="merk__haken"></span><div><b>Düse reinigen</b><small>vor dem nächsten Druck</small></div><button class="merk__zu">×</button></div>
  <input class="merk__eingabe" placeholder="Neuer Eintrag">
  <div class="merk__wahl"><button class="on">Heute</button><button>Woche</button><button>Alle</button></div>
  <div class="merk__stand"><i style="width: 40%"></i></div>
  <button class="merk__knopf">Hinzufügen</button>
</section>
<div class="merk-tafel"><b>2 erledigt</b><small>diese Woche</small></div>
<nav class="merk-leiste"><button class="on">Offen</button><button>Erledigt</button><button>Alle</button></nav>
```

```css
.merk { position: relative; padding: 15px; }
.merk__plus { width: 40px; height: 40px; }
.merk__zeile { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.merk__haken { width: 26px; height: 26px; border-radius: 50%; }
.merk__zu { width: 30px; height: 30px; }
.merk__eingabe { width: 100%; padding: 12px 14px; font-size: 16px; }
.merk__wahl > button { padding: 7px 12px; }
.merk__stand { height: 6px; border-radius: 3px; overflow: hidden; }
.merk__stand > i { display: block; height: 100%; }
.merk__knopf { padding: 11px 18px; }
.merk-tafel { padding: 13px 16px; }
.merk-leiste { position: relative; display: flex; padding: 5px; border-radius: 28px; --wa-bar-tabs: 3; }
.merk-leiste > button { flex: 1; height: 44px; }
```

Mit den Zeilen aus 4.3 (18 in `kern.css`, 8 Optionen in `wasser.js`) wird daraus das Bild in der Mitte. Rechts derselbe Stand im Ton „klar“, ohne eine weitere Zeile; der Bogen unten trägt nur die neutralen Klassen (Weg A).

![Merkzettel: vorher, nachher dunkel, nachher klar](wasser-look/bilder/anleitung/merkzettel.webp)

### 4.3 Die Bausteine einzeln

Suchwort = danach in `kern.css` suchen. Stufe = wie viel Wasser (Abschnitt 5). Alle Bausteine auf fremden Elementen, nur über die neutrale Klasse: [bausteine](wasser-look/bilder/mobil/bausteine.webp).

#### Tropfen (Stufe 3) ![](wasser-look/bilder/anleitung/baustein-tropfen.webp) ![](wasser-look/bilder/anleitung/baustein-tropfen-rund.webp)

- **Was:** ein Knopf als Tropfen aus klarem Wasser. Ohne Skript ein schlichtes Glas; mit Skript ein lebender, lichtbrechender Tropfen (WebGL). Bernstein: Klasse `btn--primary`. Rot: `btn--danger`. Nah: [dunkel-nah](wasser-look/bilder/mobil/dunkel-nah.webp).
- **Wo:** Suchwort `-- Tropfen (.wa-tropfen)`. Skript: Optionen `drops` und `ringFrom`. Neutrale Klasse `.wa-tropfen`, rund `.wa-tropfen--rund`.
- **Braucht:** 14 px Platz ringsum, in dem nichts abschneidet (`overflow: hidden`).
- **Rezept:** Zeile in die Liste. Runde Knöpfe zusätzlich in die zwei Zeilen darunter, die `round drops` nennen. Selektor an `drops` hängen. Soll er auf einem Becken einen Ring schicken: auch an `ringFrom`.
- **Kein lebender Tropfen** (Knöpfe, die sich je Zeile wiederholen; viele auf einem Bildschirm): nur in die Liste, nicht in `drops`. Er bleibt schlichtes Glas.
- **Beispiel:**

  ```css
  [data-wasser] :is(
    .wa-tropfen,
    .merk__knopf, .merk__plus,                    /* mobil: Merkzettel */
  ```
  ```css
    &:where(.wa-tropfen--rund, .btn--icon, .m-ico, .merk__plus /* round drops: add further round elements here */) { … }
    &:where(.wa-tropfen--rund, .m-ico, .chip, .merk__plus):where(:nth-of-type(2n)) { … }
  ```
  ```js
  drops: '.btn:not(.btn--ghost):not(.m-row .btn, .item .btn), .m-ico, .wa-tropfen, .merk__knopf, .merk__plus',
  ringFrom: '… , .wa-becken .wa-haken, .merk__knopf, .merk .merk__haken',
  ```

#### Film (Stufe 1)

- **Was:** ein Geisterknopf bleibt ohne Rahmen. Nur unter dem Finger erscheint ein Film aus Wasser.
- **Wo:** Suchwort `-- Film:`. Eine einzelne Regel für `.btn.btn--ghost`, keine Liste.
- **Rezept:** dem Knopf die Klassen `btn btn--ghost` geben.

#### Becken (Stufe 2) ![](wasser-look/bilder/anleitung/baustein-becken.webp)

- **Was:** eine Fläche als flaches Becken: am Rand klar (die Szene scheint weich durch), nach innen zwei Stufen tiefer. Mit Randlicht, Bodenlicht und Ring.
- **Wo:** Suchwort `-- Becken (.wa-becken)`. Skript: `ringOn` (sein Boden zeigt den Ring) und `light` (es bekommt das Licht). Neutrale Klasse `.wa-becken`.
- **Braucht:** etwa 100 px in beide Richtungen; eigenen Innenabstand; eine `position` (es setzt selbst keine – `position: relative` genügt). Kleinere Flächen: „stilles Wasser“ nehmen, oder die Tiefe kleiner stellen wie `desktop.css` Teil 2 (`--wa-shelf-inset`, `--wa-deep-inset` …).
- **Beispiel:** `  .merk,                                        /* mobil: Merkzettel */` in die Liste; dazu

  ```js
  ringOn: '.glass.m-card, .wa-becken, .sheet, .merk',
  light: '.glass.m-card, .wa-becken, .sheet, .wa-bogen, .merk',
  ```

#### stilles Wasser (Stufe 2) ![](wasser-look/bilder/anleitung/baustein-stilles-wasser.webp)

- **Was:** eine schlichte Fläche ohne Tiefenstufen, für alles, was für ein Becken zu klein ist (Zahlenkacheln, Wetterschilder).
- **Wo:** Suchwort `-- stilles Wasser (.wa-wasser)`. Keine Option. Neutrale Klasse `.wa-wasser`.
- **Braucht:** eigenen Innenabstand. Setzt keine Position.
- **Beispiel:** `  .merk-tafel,                                  /* mobil: Merkzettel, kleine Tafel */`

#### dichtes Wasser (Stufe 2)

- **Was:** das tiefe Ende desselben Wassers, fast deckend: für Flächen, unter denen Inhalt durchscrollt oder die eine Seite bedecken (Leiste, Dock, Bogen, Hinweis, Suche).
- **Wo:** Suchwort `-- dichtes Wasser (.wa-wasser--dicht)`. Keine Option. Neutrale Klasse `.wa-wasser--dicht`.
- **Braucht:** eigenen `border-radius` und Platz.
- **Beispiel:** `  .merk-leiste,                                 /* mobil: Merkzettel, Leiste */` (Bild bei „Markierung“)

#### Markierung, mit Atmen ![](wasser-look/bilder/anleitung/baustein-markierung.webp)

- **Was:** eine Perle aus klarem Wasser, die das aktive Kind einer Leiste markiert und zum nächsten fließt. In Ruhe atmet sie. Streifen: [film-tab](wasser-look/bilder/mobil/film-tab.webp).
- **Wo:** Suchwort `-- Markierung (.wa-markierung)`. Skript: `bar`; Klasse des aktiven Kinds: `tabOn` (heute `on`). Neutrale Klasse `.wa-markierung`.
- **Braucht:** gleich breite Kinder ohne Lücke (eine Flex-Zeile aus verschieden langen Wörtern ist das nicht: dann `flex: 1` oder ein Raster aus `1fr`-Spalten). Das aktive Kind trägt `on`. `--wa-bar-tabs: <Anzahl>` an der Leiste (bis neun). Eine `position` und `isolation: isolate` (die zweite bringt „dichtes Wasser“ mit).
- **Beispiel:** dieselbe Zeile `.merk-leiste,` in die drei Listen „dichtes Wasser“, „Markierung“, „Lichtlauf“; in der App `--wa-bar-tabs: 3`; dazu `bar: '.m-tabs, .wa-markierung, .merk-leiste',`

#### Bogen (Stufe 2) ![](wasser-look/bilder/anleitung/baustein-bogen.webp)

- **Was:** dichtes Wasser, das vom unteren Rand wie eine weiche Welle steigt und sich setzt; ein Lichtkamm läuft über seine Oberkante. Am Desktop dieselbe Fläche als Schublade von rechts. Streifen: [film-bogen](wasser-look/bilder/mobil/film-bogen.webp).
- **Wo:** Suchwort `-- Bogen (.wa-bogen)`. Skript: `ringOn`, `light`, `modal` (die Seite dahinter ruht), `scrollers` (sein rollender Inhalt). Neutrale Klassen `.wa-wasser--dicht.wa-bogen` (beide).
- **Braucht:** seinen Platz am unteren Rand, `overflow: hidden`, Innenabstand, einen Schleier dahinter (`.sheet-back`).
- **Rezept:** Die App hat nur einen Bogen (`.sheet`), er ist schon in den Listen. Ein neuer Bogen: die zwei neutralen Klassen, oder die Listen „dichtes Wasser“ und „Bogen“ samt den Optionen. Eine andere Form (Schublade): die Werte `--wa-r-bogen`, `--wa-bogen-rim`, `--wa-bogen-lift`, `--wa-bogen-fuss`, `--wa-kamm` für die Hülle neu setzen und einen anderen `animation-name` geben – `desktop.css` Teil 1 und 6 machen genau das vor.
- **Beispiel (Weg A):** `<div class="wa-wasser--dicht wa-bogen" style="position: absolute; left: 0; right: 0; bottom: 0; overflow: hidden; padding: 20px 18px 26px">…</div>`

#### Tropfen-Hinweis (Stufe 2)

- **Was:** der Hinweis am unteren Rand: ein kleines Stück dichtes Wasser, das wie ein Tropfen landet und wie einer geht. Bild: der letzte Bildschirm in [dunkel-app](wasser-look/bilder/mobil/dunkel-app.webp).
- **Wo:** Suchwort `-- Tropfen-Hinweis (.wa-hinweis)`. Skript: `toasts`. Neutrale Klassen `.wa-wasser--dicht.wa-hinweis`, Fehler zusätzlich `.wa-hinweis--fehler`.
- **Braucht:** Position und Innenabstand. Nie mit einem `transform` zentrieren (die Landung ist selbst eines): mit `margin: 0 auto`.
- **Rezept:** `.toast` ist schon in den Listen. Ein zweiter Hinweis: die neutralen Klassen.

#### Setzen

- **Was:** eine Fläche, die erscheint, kommt wie Wasser zur Ruhe: steigt ein wenig, läuft einen Hauch darüber hinaus, sinkt zurück.
- **Wo:** Suchwort `-- Setzen (.wa-setzt)`. Nur die Klasse `.wa-setzt`, keine Liste.
- **Rezept:** Klasse `wa-setzt` auf Flächen, die keinen eigenen Auftritt haben. Mehrere zugleich: `animation-delay: calc(var(--wa-t-step) * n)`. Nicht auf Elemente, die die App selbst hereinbewegt (Karten, Panels).

#### Mulde und Mulde zum Tippen (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-mulde.webp)

- **Was:** eine weiche, etwas tiefere Stelle im Boden einer Fläche: Zeilen und Zahlenkacheln. Die antippbare Mulde hat eine feine Lichtlinie und leuchtet unter dem Finger auf.
- **Wo:** Suchworte `-- Mulde (.wa-mulde)` und `-- Mulde zum Tippen (.wa-mulde--tipp)`. Keine Option. Neutrale Klassen `.wa-mulde`, antippbar zusätzlich `.wa-mulde--tipp`.
- **Braucht:** liegt auf einer Fläche; eigenen Innenabstand.
- **Beispiel:** `  .merk__zeile,                                 /* mobil: Merkzettel */` in beide Listen (antippbar) oder nur in die erste.

#### Etikett und Etikett auf Wasser (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-etikett.webp)

- **Was:** frei über der Szene ist ein Etikett eine kleine Glasperle. Auf einer Wasserfläche ist es ein flaches Schild, damit die Tropfen das Einzige bleiben, was glänzt.
- **Wo:** Suchworte `-- Etikett (.wa-etikett)` und `-- Etikett auf Wasser`. Keine Option. Neutrale Klasse `.wa-etikett`.
- **Rezept:** `.pill` ist schon ein Etikett. Die zweite Liste nennt die **Flächen**, auf denen eine `.pill` flach ist: eine neue Fläche dort eintragen.
- **Beispiel:** `  .merk,                                        /* mobil: Merkzettel */` in die Liste von „Etikett auf Wasser“.

#### Feld (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-feld.webp) ![](wasser-look/bilder/anleitung/baustein-feld-fokus.webp)

- **Was:** eine Mulde zum Hineinschreiben: Textfeld, Textbereich, Auswahl. Mit Fokus läuft die Wasserlinie ein und eine Lichtlinie umläuft das Feld. Tippen löst nie etwas aus.
- **Wo:** Suchwort `-- Feld (.wa-feld)`. Keine Option. Neutrale Klasse `.wa-feld`, eine Auswahl zusätzlich `.wa-feld--auswahl`.
- **Braucht:** Innenabstand, Schrift 16 px (iOS zoomt darunter). Keinen eigenen Rand. Eine Auswahl darf rechts keinen eigenen Innenabstand setzen (dort liegt der Pfeil).
- **Beispiel:** `  .merk__eingabe,                               /* mobil: Merkzettel */`

#### Wahl (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-wahl.webp)

- **Was:** Schilder, von denen eines (oder mehrere) gewählt ist. Die Perle des gewählten fließt vom alten zum neuen.
- **Wo:** Suchwort `-- Wahl (.wa-wahl > *)`. Skript: `groups` (die **Gruppe**), Klassen eines gewählten Schilds: `chosen` (`on`, `pill--on`). Neutrale Klasse `.wa-wahl` an der Gruppe.
- **Braucht:** Innenabstand je Schild; das gewählte trägt `on`.
- **Beispiel:** `  .merk__wahl > button,                         /* mobil: Merkzettel */` und `groups: '.pills, .seg, .tabs, .tiles, .island-lib, .wa-wahl, .merk__wahl',`

#### Haken (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-haken-leer.webp) ![](wasser-look/bilder/anleitung/baustein-haken.webp)

- **Was:** ein Kreis zum Abhaken. Leer eine kleine Vertiefung; abgehakt füllt ihn ein Tropfen grünes Wasser. Auf einem Becken schickt das Abhaken einen grünen Ring.
- **Wo:** Suchwort `-- Haken (.wa-haken)`. Skript: `tick` (was ein Haken ist), `ticked` (Klassen eines abgehakten: `check--on`, `on`), `ringFrom`. Neutrale Klasse `.wa-haken`, übersprungen `.wa-haken--aus`.
- **Braucht:** Breite, Höhe, `border-radius: 50%`. Das Häkchen selbst ist das SVG der App.
- **Beispiel:** `  .merk__haken,                                 /* mobil: Merkzettel */` und `tick: '.check, .wa-haken, .merk__haken',` (der Ring: siehe `ringFrom` bei „Tropfen“)

#### Pegel (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-pegel.webp)

- **Was:** ein Fortschrittsbalken: Wasser in einem dünnen Glasröhrchen. Eine echte Änderung des Stands läuft mit einem kleinen Schwung hin.
- **Wo:** Suchwort `-- Pegel (.wa-pegel > i)`. Skript: `levels`. Neutrale Klasse `.wa-pegel`, Bernstein `.wa-pegel--amber`.
- **Braucht:** das Röhrchen: Höhe, Radius, `overflow: hidden`. Darin ein `<i>` mit `display: block; height: 100%` und der Breite in % als Inline-Stil.
- **Beispiel:** `  .merk__stand,                                 /* mobil: Merkzettel */` und `levels: '.progress, .wa-pegel, .merk__stand',`

#### Perle und Perle mit Schrift (Stufe 1) ![](wasser-look/bilder/anleitung/baustein-perle.webp)

- **Was:** ein kleiner runder Zeichenknopf (schließen, entfernen, „mehr“) als Glasperle. Gibt unter dem Finger nach und federt zurück. „Perle mit Schrift“: Textknöpfe, die sich je Zeile wiederholen, sind flaches Glas statt Tropfen.
- **Wo:** Suchworte `-- Perle (.wa-perle)` und `-- Perle mit Schrift`. Keine Option. Neutrale Klasse `.wa-perle`.
- **Braucht:** Breite und Höhe (28 px und mehr). Achtung: Die Liste wiegt **drei** Klassen, und der Druck ist ein `transform` (Fallstricke 3 und 4).
- **Rezept „mit Schrift“:** Die Liste nennt die **Zeilen** (`.item`, `.m-row`, `.panel`), deren schlichte Knöpfe flach sind. Eine neue Art Zeile dort eintragen – und ihre Knöpfe aus `drops` und `ringFrom` heraushalten.
- **Beispiel:** `  .merk__zu,                                    /* mobil: Merkzettel */`

#### Ring ![](wasser-look/bilder/anleitung/baustein-ring.webp)

- **Was:** die Antwort auf einen Tipp: ein dünner Lichtring läuft über den Boden der Fläche, von der Stelle des Fingers aus. Er startet beim Loslassen. Streifen: [film-druck](wasser-look/bilder/mobil/film-druck.webp).
- **Wo:** Suchwort `-- Ring (.wa-floor > .wa-ring)`. Skript: `ringOn` (welche Flächen), `ringFrom` (welche Knöpfe und Haken ihn auslösen). Den Helfer baut das Skript.
- **Braucht:** die Fläche: `position` und `isolation: isolate` (Becken und Bogen haben das).
- **Rezept:** Fläche an `ringOn`, Auslöser an `ringFrom`. Ganz aus: `ringOn: ''`.

#### Wasserlinie ![](wasser-look/bilder/anleitung/baustein-wasserlinie.webp)

- **Was:** der Tastaturfokus ist eine weiße Lichtlinie außerhalb der Kontur, kein blauer Ring.
- **Wo:** Suchwort `-- Wasserlinie:`. Zwei Listen: mit Abstand um Tropfen und Etiketten, eng um alles andere. Am Desktop fängt `desktop.css` Teil 10 den Rest.
- **Beispiel:** `  .merk__knopf, .merk__plus,                    /* mobil: Merkzettel */` in die erste Liste, `  .merk__zeile, .merk__haken, .merk__zu, .merk__wahl > button, .merk-leiste > button,   /* mobil: Merkzettel */` in die zweite.

#### Licht, Bodenlicht, Lichtlauf (Leben in Ruhe)

- **Was:** Licht, das in Ruhe an den Rändern einer Fläche wandert (Licht), ein sehr weicher Fleck auf dem Boden eines Beckens (Bodenlicht), und dasselbe Randlicht für kleine oder dichte Flächen ohne Helfer (Lichtlauf). Beim Scrollen neigt sich das Licht (Zug), bei einer neuen Fläche schwingt es ein (Schwappen).
- **Wo:** Suchworte `-- Licht (.wa-licht)` und `-- Lichtlauf (.wa-lichtlauf)`. Skript: `light` (Flächen mit Helfer), `scrollers` (Listen, deren Scrollen das Licht zieht). Neutrale Klasse für den Lichtlauf: `.wa-lichtlauf`.
- **Braucht:** die Fläche: `position` und `isolation: isolate`. Lichtlauf: ihr `::after` muss frei sein.
- **Rezept:** große Fläche → `light` (Becken und Bogen bekommen es so). Kleine oder dichte Fläche → Liste „Lichtlauf“. Kein Bodenlicht auf einer Fläche: `.meine-flaeche > .wa-licht > .wa-boden { display: none; animation: none; }`.
- **Beispiel:** `light: '…, .merk'` (bei „Becken“) und `.merk-leiste,` in der Liste „Lichtlauf“ (bei „Markierung“).

#### Ruhe

- **Was:** alles schläft gemeinsam ein und wacht gemeinsam auf (Abschnitt 7).
- **Wo:** Suchwort `Ruhe: asleep together`. Skript: `sleep` (30000 ms), `modal`.
- **Rezept für eine neue Schleife in Ruhe:** nur `transform` und `opacity`, auf einer eigenen Ebene, mit `animation-play-state: var(--wa-lauf)` und den zwei „keine Bewegung“-Regeln am Ende ihres Blocks. Acht gleiche Keyframe-Abstände druckt `node scripts/wasser/keyframes.mjs`.

### 4.4 Etwas an einem Baustein für eine Hülle ändern

Die Regel einer Hülle muss mindestens so schwer sein wie die Liste des Bausteins. Sonst verliert sie – ohne Meldung, und kein Standbild zeigt es.

Am Merkzettel ausprobiert: `[data-wasser="mobil"] .merk { border-radius: var(--wa-r-becken-2); }` ändert **nichts** (die Liste von „Becken“ wiegt zwei Klassen). `[data-wasser="mobil"] .merk.merk { … }` wirkt. Dieselbe Klasse zweimal zu schreiben ist der einfachste Weg, Gewicht zu geben; `desktop.css` macht es bei den Pfeilen so (`.glass.carousel-nav.carousel-nav`).

**Danach immer den berechneten Wert einmal ablesen** (Entwicklerwerkzeuge, „Berechnet“) – und drücken, was man drücken kann.

### 4.5 Eine Fläche, die keiner der Bausteine ist

```css
.meine-flaeche {
  border: 0;
  background: var(--wa-still);                    /* oder --wa-dense */
  -webkit-backdrop-filter: var(--wa-blur);        /* auf der Fläche selbst, nie auf einem Kind; die -webkit-Zeile zuerst */
  backdrop-filter: var(--wa-blur);
  box-shadow: var(--wa-meniscus), var(--wa-shallow), var(--wa-far), var(--wa-lift);
  --water-under: var(--wa-still);                 /* worauf ihre Knöpfe liegen: das lesen die Tropfen */
  --text-2: var(--wa-ink-2); --text-3: var(--wa-ink-3); text-shadow: var(--wa-shade);
}
```

Die Regel muss unter `[data-wasser]` stehen, sonst gibt es die Werte nicht.

### 4.6 Am Desktop ein weiteres Element

1. Baustein wählen (4.3). Zeile in seine Liste, Vermerk `desktop`. Hat auch das Handy die Klasse: mit `:where()` eingrenzen.
2. Nennt der Baustein Optionen: denselben Selektor in `DESKTOP` in `wasser.js` eintragen (bei den acht ersetzten Optionen), sonst in `MOBIL`.
3. Was es darüber hinaus braucht (Platz, Größe, Mauszeiger), kommt in `desktop.css` – mit dem Gewicht der Liste.
4. Liegt es frei über der Bühne und trägt Text: `background: var(--wa-frei)`, kein Weichzeichner. Kann eine Insel dahinter liegen: nie ein lebender Tropfen.
5. Prüfen: `node scripts/wasser/desktop.mjs pruefen`, Bilder in beiden Formaten und beiden Tönen (`desktop.mjs bild … --nur <welt>`), `node scripts/wasser/desktop.mjs kontrast`, und `node scripts/wasser/vergleich.mjs --alt git:HEAD` (das Handy darf sich nicht ändern).

---

## 5. Dosierung

**Die Regel:** Je öfter etwas auf einem Bildschirm vorkommt und je mehr Text es trägt, desto weniger Wasser. Tropfen und die Perle der Leiste sind das Einzige, was glänzt. Flächen sind still. Mulden tragen den Text.

| Stufe | Wie viel Wasser | Bausteine | In der App |
|---|---|---|---|
| 3 | lebendes Wasser, das bricht, was dahinter liegt (WebGL) | Tropfen | Hauptknöpfe, die runden Knöpfe der Kopfzeile. Wenige je Bildschirm |
| 2 | stille Wasserflächen: Material und Rand, in Ruhe durch wanderndes Licht belebt | Becken, stilles Wasser, dichtes Wasser, Bogen, Tropfen-Hinweis | Karten, Panels, Leiste, Dock, Bogen, Hinweis, Suche |
| 1 | ein Hauch: Form und heller Rand, still in Ruhe, jede Änderung bewegt sich wie Wasser | Mulde, Etikett, Feld, Wahl, Haken, Pegel, Perle, Film | Zeilen, Schilder, Formulare, kleine Knöpfe |
| 0 | nichts | – | Text, Zeichen, Fotos, Diagramme; am Desktop Inseln, ihre Namen, der Tagesring, lose Schrift, handgeschriebene Zeilen |

**Die Grenzen:**

- **Lebende Tropfen je Bildschirm:** wenige. Handy heute 4 bis 7 (mit offenem Bogen einer mehr; die dahinter ruhen), Desktop 3 bis 9 (`desktop.mjs pruefen` lässt höchstens 12 zu). Knöpfe, die sich je Zeile wiederholen, sind nie lebende Tropfen. Das Skript begrenzt zusätzlich die Bildpunkte aller Tropfen zusammen und schaltet bei Überlast selbst herunter (weniger Bilder, dann weniger Bildpunkte, zuletzt ein stiller Tropfen).
- **Kein Weichzeichner auf Weichzeichner.** `backdrop-filter` steht nur auf der Fläche selbst, nie auf einem Kind oder Pseudo-Element. Ein Kasten in einem Panel ist eine Mulde, keine zweite weichgezeichnete Fläche. Am Handy trägt der Schleier hinter dem Bogen den Weichzeichner, nicht der Bogen; am Desktop ist es umgekehrt (die Bühne ruht nie).
- **Text bewegt sich nie.** Scharfes Licht läuft nur in einem Streifen am Rand, wo kein Text steht. Das Bodenlicht liegt unter Text und Zeilen. Animiert werden nur `transform` und `opacity`, auf eigenen Ebenen.
- **Die Fläche selbst wird in Ruhe nie animiert** (`.m-card`, `.panel` …). Was sich auf einer weichgezeichneten Fläche bewegt, ist eine kleine eigene Ebene.
- **Am Desktop sind die Inseln die Hauptsache.** Kein Platz und keine Größe ändert sich. Ein Seitenpanel trägt ein Randlicht mit 60 %, nur das eine große Panel einer Welt alle drei Lichter. Nirgends liegt ein lebender Tropfen, hinter dem eine Insel liegen kann (ein freier Tropfen sieht nur das Landschaftsbild, nicht die Inseln).
- **Lesbarkeit geht vor Durchsicht:** Text mindestens 4,5 : 1, Platzhalter 3 : 1 (gemessen, Abschnitt 6). Dünneres Wasser kostet sofort Kontrast.

---

## 6. Töne und Modi

**Ein Ton ist ein Block von 57 Werten** in `kern.css`, Teil 1 – und nichts sonst. „dunkel“ steht auf `[data-wasser]` (Standard, kein Attribut). „klar“ steht auf `:root[data-wa-ton="klar"] [data-wasser]`. Beide Blöcke nennen dieselben Werte in derselben Reihenfolge. Keine andere Regel nennt `data-wa-ton`; das Skript hat keine Ton-Logik.

Was ein Ton festlegt:

| Gruppe | Werte |
|---|---|
| das Wasser, vom Rand zur Tiefe | `--wa-clear`, `--wa-shelf`, `--wa-deep`, `--wa-under`, `--wa-still`, `--wa-dense`, `--wa-sheet`, `--wa-abyss` |
| das Licht | `--wa-light`, `--wa-core`, `--wa-warm`, `--wa-dark` |
| die Ränder | `--wa-meniscus`, `--wa-shallow`, `--wa-far`, `--wa-lift`, `--wa-whisper`, `--wa-dense-*` |
| Mulden | `--wa-trough`, `--wa-trough-walls`, `--wa-trough-line`, `--wa-trough-press` |
| Schrift | `--wa-ink-2`, `--wa-ink-3`, `--wa-ink-2-trough`, `--wa-ink-3-trough`, `--wa-shade`, `--wa-shade-pill` |
| Etiketten, Leiste, Perle | `--wa-pill-*`, `--wa-tab-*`, `--wa-bead-*` |
| Weichheit | `--wa-sat`, `--wa-blur`, `--wa-blur-dense` |
| die Seite (Handy) | `--wa-page-1` bis `-4`, `--wa-page-ink-3` |
| Leben in Ruhe | `--wa-glanz`, `--wa-glanz-linie`, `--wa-glanz-fern`, `--wa-glanz-fern-linie`, `--wa-boden` |
| die Tropfen | `--wa-drop-red`, `--wa-drop-veil` |
| die weite Bühne (nur Desktop) | `--wa-weit-tiefe`, `--wa-weit-grund` |

Formwerte (Radien, Maße; für beide Töne gleich) stehen in Teil 2, Bewegung in Teil 3.

**Wie die App den Ton wählt** (noch nicht eingebaut; Fahrplan Schritt 3):

| Einstellung „Erscheinungsbild“ (`settings.theme`) | Ton | Am `<html>` |
|---|---|---|
| Dunkel | „dunkel“ | kein `data-wa-ton` |
| Hell | „klar“ | `data-wa-ton="klar"` |
| Automatisch (Tageszeit) | nach dem Look der Stunde: dunkler Look (`DARK_LOOKS`) → „dunkel“, sonst „klar“ | |

`data-theme` bleibt überall „dunkel“, wo der Look an ist. Ein Wechsel wirkt sofort; die Tropfen folgen binnen einer Sekunde.

**Eine Farbe sicher ändern:**

1. Den Wert im Block des Tons ändern – nur dort. Soll er in beiden Tönen anders sein: in beiden Blöcken.
2. Ist der Wert aus anderen gebaut (`--wa-meniscus` benutzt `--wa-core`): Er wird dort aufgelöst, wo er steht. Wer `--wa-core` nur für eine Karte ändert, muss dort auch `--wa-meniscus` neu setzen.
3. Diese Werte nicht „aufräumen“, sie sind mit dem Auge gefunden: `--wa-sat` (nicht über etwa 0,6: sonst wird warmes Holz braun), `--wa-drop-veil` im Ton „klar“ (nicht über etwa 0,35), `--wa-shallow`, `--wa-far`. Gründe: `NOTIZEN.md`, Abschnitt 5.
4. Prüfen, dass nur der gemeinte Ton sich ändert – gegen den Stand vor der Änderung (vor dem Commit):

   ```
   node scripts/wasser/vergleich.mjs bilder --alt git:HEAD --toene dunkel   # muss ohne Abweichung bleiben, wenn nur „klar“ geändert wurde
   node scripts/wasser/vergleich.mjs bilder --alt git:HEAD --toene klar     # zeigt, was sich geändert hat (DIFF ist hier gewollt)
   ```

   Ausprobiert mit `--wa-ink-2-trough` im Ton „klar“ (.8 → .9): „dunkel“ ohne Abweichung, „klar“ acht Bilder mit je etwa 4400 geänderten Bildpunkten. `bilder` sieht nur, was auf der Vorschauseite steht. Ein Wert, der nur in Bögen oder Feldern vorkommt (z. B. `--wa-ink-3-trough`, die Platzhalter), zeigt sich dort nicht: dann `app` statt `bilder` nehmen, oder `stile` (jeder berechnete Stil, auch die Werte des Looks).

5. Lesbarkeit messen. Die Werkzeuge messen die Schriftfarbe gegen die Bildpunkte, die wirklich hinter den Buchstaben liegen:

   ```
   node scripts/wasser/kontrast.mjs --app --szenen start,heute,projekte,material,druck,wetter,archiv,innen   # Handy, beide Töne
   node scripts/wasser/desktop.mjs kontrast                                                                 # Desktop, beide Töne, Nacht und Tag
   ```

   Jede Zeile: Median (schlechteste 5 % in Klammern). Grenzen: Text 4,5, Platzhalter 3, am Desktop Titel 7. Unter der Grenze endet das Werkzeug mit Fehler.
6. `node scripts/wasser/pruefen.mjs` – Prüfung 10 vergleicht die Listen der zwei Töne (57 und 57).
7. Ansehen: `node scripts/wasser/bild.mjs screenshots/wasser/farbe` und `node scripts/wasser/desktop.mjs bild screenshots/wasser/farbe-desktop --ton klar --zeit tag`.

Ein Etikett auf einem klaren Tropfen, das schwer zu lesen ist, heilt man mit `--wa-drop-veil` (0 bis 1; weniger = weniger Licht im Tropfen), nicht mit einer dunkleren Fläche.

**Ein dritter Ton, oder einen streichen:** Ein Ton ist der Block `:root[data-wa-ton="<name>"] [data-wasser] { … }` mit allen 57 Werten. Sonst ist nichts zu tun.

---

## 7. Bewegung

**Die Sprache** (alle in `kern.css`, Teil 3; nur dort ändern – das Skript liest sie von dort):

| Wert | Dauer | Bedeutung | Benutzt von |
|---|---|---|---|
| `--wa-t-touch` | 60 ms | unter dem Finger, sofort | Mulde leuchtet auf, Reiter gibt nach |
| `--wa-t-fast` | 0,14 s | eine Berührung wird beantwortet | Glas, Film, Haken |
| `--wa-t-leave` | 0,26 s | etwas geht, oder federt zurück | Hinweis geht, Reiter federt |
| `--wa-t-flow` | 0,36 s | etwas fließt zum nächsten Platz oder Zustand | Perle einer Wahl, Haken, Wasserlinie |
| `--wa-t-settle` | 0,62 s | etwas Größeres kommt an und kommt zur Ruhe | Bogen, Hinweis, Pegel |
| `--wa-t-wave` | 1,1 s | Licht läuft über eine Fläche | Ring, Kamm des Bogens |
| `--wa-t-swing` | 1,6 s | bewegtes Wasser schwingt aus | Licht nach dem Scrollen, Licht einer neuen Fläche |
| `--wa-t-step` | 40 ms | was zusammen ankommt, kommt kurz nacheinander | Karten eines neuen Bildschirms |
| `--wa-t-ruhe-1` bis `-4`, `--wa-t-atem` | 24 / 34 / 40 / 46 s, 9 s | Schleifen in Ruhe: Randlicht, fernes Randlicht, Leisten und Bögen, Boden; Atem der Perle | mit `--wa-gang-*` |
| `--wa-ease-flow` / `-settle` / `-drain` / `-wave` / `-swing` | Kurven | läuft los und kommt weich an / ein wenig darüber hinaus / lässt langsam los / ein Ring breitet sich aus / schwingt gedämpft aus | |

Was wann lebt: Tabelle in `NOTIZEN.md`, Abschnitt 6.

**Der Hauptregler für das Leben in Ruhe: `--wa-leben`** (Teil 3; am Wurzelelement setzen). Eine Zahl von 0 bis 2: 0 = nichts zu sehen, 1 = wie gebaut, etwa 1,5 = das meiste, das noch ruhig wirkt. Er regelt die **Stärke** aller wandernden Lichter, den Atem der Perle und die Antwort aufs Scrollen – nie ein Tempo. Er ist begrenzt: Über 1 werden die Lichter heller, sie rutschen nicht aus der Karte. Zwei Werte nebeneinander ansehen:

```
node scripts/wasser/leben.mjs screenshots/wasser/leben --werte 1,1.5
```

Ehrlich: Der Unterschied zwischen 1 und 1,5 ist auf Handygröße kaum zu sehen ([leben-vergleich](wasser-look/bilder/mobil/leben-vergleich.png)). Mehr sichtbares Leben käme vom Tempo (`--wa-t-ruhe-*` mit ihren `--wa-gang-*`), nicht von der Stärke. Dafür ist nichts gebaut.

**Der Schalter zum Sparen ist ein anderer: `--wa-lauf`.** `[data-wasser] { --wa-lauf: paused; }` hält jede Schleife in Ruhe an, alles andere lebt weiter. `--wa-leben: 0` spart nichts: Die Schleifen laufen unsichtbar weiter.

**Schlafen und Aufwachen.** Eine Uhr im Skript (Option `sleep`, 30000 ms; `0` = nie). Nach 30 s ohne Berührung, Scrollen, Taste oder bewegte Maus kommen die Tropfen zur Ruhe, und das Wurzelelement bekommt `data-wa-ruht`. Damit wird `--wa-lauf` zu `paused`. Die nächste Berührung weckt alles. Hinter einem offenen Bogen oder der Suche ruht die Seite ebenfalls (`mobil.css` Teil 7, `desktop.css` Teil 7; die Liste dort und die Option `modal` müssen gleich bleiben). Nie angehalten werden kurze Antworten auf eine Änderung: Ein Hinweis muss landen können, während das Wasser schläft.

**Keine Bewegung.** Zwei Auslöser: die Systemeinstellung (`prefers-reduced-motion: reduce`) oder der Schalter der App (`data-motion="reduziert"` am `<html>`). Dann gibt es die Lichter gar nicht, nichts schwingt oder atmet, Zustände wechseln sofort, die Tropfen stehen. Jeder Baustein trägt die zwei Regeln selbst, am Ende seines Blocks. Ein neuer Block braucht beide.

**Was der Look nicht allein kann** (die App entfernt das Element in einem Bild): ein Bogen, der weich geht; eine Zeile, die verschwindet; ein Hinweis, der einen anderen ersetzt. Siehe Fahrplan, Schritt 8.

---

## 8. Fahrplan: die Vorlage in die App einbauen

Erst wenn der Besitzer es sagt. Reihenfolge einhalten; nach jedem Schritt prüfen und erst dann weiter.

**Für jeden Schritt gilt:**

- Wer: der Hauptchat, oder ein Unterchat auf dem Branch, den der Hauptchat nennt. Nie auf `main` pushen, nie deployen (`CLAUDE.md`).
- **Die Vorlage bleibt die Quelle.** Die vier Dateien in `src/wasser/` sind Kopien von `docs/wasser-look/vorlage/`. Geändert wird in der Vorlage, dann kopiert. Grund: Alle Werkzeuge lesen die Vorlage dort, und sie laufen nur dann richtig gegen die gebaute App, wenn beide gleich sind.
- Der Prüfblock nach jedem Schritt (Vorschau im zweiten Terminal: `npm run preview`):

  ```
  cmp docs/wasser-look/vorlage/kern.css src/wasser/kern.css && cmp docs/wasser-look/vorlage/mobil.css src/wasser/mobil.css && cmp docs/wasser-look/vorlage/desktop.css src/wasser/desktop.css && cmp docs/wasser-look/vorlage/wasser.js src/wasser/wasser-skript.js && echo gleich
  npm run build
  node scripts/verify.mjs http://localhost:4173        # 69 Prüfungen; Open-Meteo-Ausfälle sind Netz, nicht Code
  node scripts/wasser/pruefen.mjs --app                # 60 Prüfungen
  ```

### Schritt 1 – Die Dateien nach `src/wasser/` bringen

- **Dateien:** neu `src/wasser/kern.css`, `mobil.css`, `desktop.css`, `wasser-skript.js`, `wasser.ts`.
- **Tun:**

  ```
  mkdir -p src/wasser
  cp docs/wasser-look/vorlage/kern.css docs/wasser-look/vorlage/mobil.css docs/wasser-look/vorlage/desktop.css src/wasser/ && cp docs/wasser-look/vorlage/wasser.js src/wasser/wasser-skript.js
  ```

  Dieselbe zweite Zeile kopiert später jede Änderung der Vorlage nach. Dann `src/wasser/wasser.ts` anlegen:

  ```ts
  // Wasser-Look: the one place where the app loads and starts it. Guide: docs/Wasser-Look.md
  // kern.css, mobil.css, desktop.css and wasser-skript.js are COPIES of docs/wasser-look/vorlage (wasser.js there).
  // Change them there, then copy (docs/Wasser-Look.md, Fahrplan step 1).

  // The look wins over the app's own rules by coming LATER. So the app's stylesheets are imported here first:
  // whoever imports this module first, the order in the built CSS stays app -> kern -> mobil -> desktop.
  import '../styles/tokens.css';
  import '../styles/global.css';
  import '../mobile/mobile.css';
  import './kern.css';
  import './mobil.css';
  import './desktop.css';
  import './wasser-skript.js'; // a classic script: sets window.Wasser
  import { useEffect } from 'react';

  type Options = Record<string, unknown>;
  declare global {
    interface Window { Wasser: { start(o?: Options): unknown; stop(): unknown; MOBIL: Options; DESKTOP: Options; info: Record<string, unknown> } }
  }

  /** Starts the look for the shell that has just been mounted and stops it when the shell goes away.
   *  The root element of that shell carries data-wasser="mobil" or data-wasser="desktop". */
  export function useWasser(shell: 'mobil' | 'desktop') {
    useEffect(() => {
      window.Wasser.start(shell === 'desktop' ? window.Wasser.DESKTOP : window.Wasser.MOBIL);
      return () => { window.Wasser.stop(); };
    }, [shell]);
  }

  /** The tone of the look: light mode = "klar" (<html data-wa-ton="klar">), dark mode = "dunkel" (no attribute). */
  export function setWaterTone(light: boolean) {
    const html = document.documentElement;
    if (light) html.dataset.waTon = 'klar'; else delete html.dataset.waTon;
  }
  ```

- **Prüfen:** `npm run build` läuft durch. An der App ändert sich noch nichts (niemand lädt das Modul).
- **Darf nicht passieren:** Das Skript heißt neben `wasser.ts` nicht `wasser.js` (ein Import ohne Endung fände die `.js` zuerst, der Build bricht ab). Die drei Zeilen mit den Stylesheets der App nicht weglassen: Ohne sie steht der Look im gebauten CSS **vor** `mobile.css`, sobald der Desktop das Modul lädt, und verliert am Handy.

### Schritt 2 – Das Handy einschalten

- **Dateien:** `src/mobile/Mobile.tsx` (drei Zeilen).
- **Tun:**
  1. Unter `import './mobile.css';` einfügen: `import { useWasser } from '../wasser/wasser';`
  2. In `Mobile()` als erste Zeile: `useWasser('mobil');`
  3. Am Wurzelelement das Attribut: `<div className="m-shell" data-wasser="mobil" data-look={look}>`
- **Prüfen:** der Prüfblock. Dann die Reihenfolge im gebauten CSS:

  ```
  node -e "const fs=require('fs');const f=fs.readdirSync('dist/assets').find(n=>/^index-.*\.css$/.test(n));const c=fs.readFileSync('dist/assets/'+f,'utf8');const look=c.slice(c.indexOf('[data-wasser]'));console.log(c.indexOf('[data-wasser]')>c.lastIndexOf('.m-shell .btn--sm')?'Reihenfolge gut':'FALSCH: der Look steht vor mobile.css','| Weichzeichner im Look:',(look.match(/-webkit-backdrop-filter:/g)||[]).length,'mit -webkit-,',(look.match(/[^-]backdrop-filter:/g)||[]).length,'ohne')"
  ```

  Es muss „Reihenfolge gut“ melden und zweimal dieselbe Zahl (heute 16 und 16). Dann ansehen: http://localhost:4173 im schmalen Fenster, alle fünf Reiter, ein Projekt, ein Bogen, die Suche. Bilder des eingebauten Looks, ohne Einspielen: `node scripts/wasser/bild.mjs screenshots/wasser/eingebaut app --look ohne` – mit dem Auge gegen [dunkel-app](wasser-look/bilder/mobil/dunkel-app.webp) halten.
- **Darf nicht passieren:** Der Desktop ändert sich (breites Fenster: wie heute). Fehler in der Konsole. Ein Attribut `data-wasser` ohne den Aufruf `useWasser` (dann stehen die Flächen ohne Tropfen, Ring und Licht da).

### Schritt 3 – Der Ton folgt der Einstellung

- **Dateien:** `src/App.tsx` (eine Import-Zeile, ein Effekt), `scripts/wasser/lib.mjs` (eine Zeile).
- **Heute:** `src/App.tsx` setzt `data-theme` und erzwingt am Handy „dunkel“ (`const theme = mobile ? 'dunkel' : …`). Das dunkle Thema am Handy bleibt. Neu ist nur, dass die Einstellung jetzt den Ton wählt.
- **Tun:** `import { setWaterTone } from './wasser/wasser';` und den Effekt, der heute `data-theme` setzt, ersetzen durch:

  ```ts
  useEffect(() => {
    const light = settings.theme === 'auto' ? !DARK_LOOKS.has(look) : settings.theme === 'hell';
    setWaterTone(light); // Wasser-Look: Hell = Ton "klar", Dunkel = Ton "dunkel"
    document.documentElement.dataset.theme = mobile ? 'dunkel' : light ? 'hell' : 'dunkel'; // the old light theme: only on the desktop, until the look is applied there
  }, [settings.theme, look, mobile]);
  ```

  Ab jetzt wählt die App den Ton selbst – bei Tag „klar“. Die Handy-Werkzeuge sagen den Ton bisher nur, wenn er „klar“ sein soll; für „dunkel“ verlassen sie sich darauf, dass kein Attribut da ist. Darum in `scripts/wasser/lib.mjs`, in `openApp`, die Zeile

  ```js
  if (ton && ton !== 'dunkel') await page.evaluate((t) => { document.documentElement.dataset.waTon = t; }, ton);
  ```

  ersetzen durch

  ```js
  await page.evaluate((t) => { if (t && t !== 'dunkel') document.documentElement.dataset.waTon = t; else delete document.documentElement.dataset.waTon; }, ton);   // (with the look built in the app sets the tone itself: say it both ways)
  ```

  (Die Zeile gibt es einmal, gleich nach `waitForSelector('.m-shell'`.) Die Desktop-Werkzeuge sagen den Ton schon in beide Richtungen.
- **Prüfen:** der Prüfblock (`verify.mjs` prüft weiter „Mobile: dark theme forced“). Im schmalen Fenster die Einstellungen öffnen und „Erscheinungsbild“ umschalten: Hell → `<html data-wa-ton="klar">`, Dunkel → kein Attribut, Automatisch → nach der Tageszeit. `data-theme` bleibt am Handy „dunkel“. Dann bei Tag: `node scripts/wasser/bild.mjs screenshots/wasser/eingebaut app --look ohne --toene dunkel` – die Bilder müssen wirklich dunkel sein.
- **Darf nicht passieren:** `data-theme="hell"` zusammen mit dem Look (dunkle Schrift auf Wasser). Am Desktop ändert sich in diesem Schritt nichts: `data-wa-ton` wirkt nur innerhalb von `[data-wasser]`. Ohne die Zeile in `lib.mjs` messen `kontrast.mjs --app` und `bild.mjs` bei Tag unter dem Namen „dunkel“ in Wahrheit „klar“ (so geschehen: Helligkeit eines Kartenstreifens 70 statt 33).

### Schritt 4 – Das Handy abnehmen (lokal)

- **Dateien:** keine. Mängel werden in der Vorlage behoben und nach `src/wasser/` kopiert.
- **Tun und prüfen:**

  ```
  node scripts/wasser/pruefen.mjs --app
  node scripts/wasser/kontrast.mjs --app
  node scripts/wasser/film.mjs screenshots/wasser/eingebaut-film
  VITE_API=node npm run build
  ```

  Mit der Hand im schmalen Fenster: beide Töne; der Bereich „Meine Werkstatt“ (leer, ohne Drucker); ein Formular ausfüllen und speichern; einen Einkauf in „Material“ entfernen (Hinweis mit „Rückgängig“); die Einstellung „Bewegung: Reduziert“ (alles steht); das Fenster über 900 px ziehen und zurück (der Look startet neu, keine Fehler).
- **Darf nicht passieren:** Text unter 4,5 : 1. Etwas, das sich in Ruhe bewegt, obwohl Bewegung reduziert ist. Ein Tipp, der nicht ankommt.

### Schritt 5 – Baustelle und echte Handys, vor allem anderen (Hauptchat)

Noch nie lief der Look auf einem echten Handy. Darum kommt dieser Test **vor** dem Desktop und **vor** live.

- **Tun:** Auf die Baustelle https://antiquewhite-falcon-428175.hostingersite.com einspielen, wie in `CLAUDE.md` beschrieben (`VITE_API=node npm run build`, `dist/` nach `server/public/`, Archiv, `hosting_nodejs_start-build`; vorher `npm audit` in `server/`). Nie auf die Hauptadresse.
- **Content-Security-Policy (`server/index.js`, Konstante `CSP`): nichts zu ändern.** Geprüft: Der Look lädt keine fremde Adresse, kein `eval`, keinen Worker, kein Stylesheet zur Laufzeit. Er benutzt zwei eingebettete SVG-Bilder im CSS (`data:` – erlaubt durch `img-src 'self' data:`), WebGL und Canvas (von der CSP nicht geregelt) und setzt Stile über das DOM. Das Szenenbild, das die Tropfen brechen, kommt von derselben Adresse wie die App – das muss so bleiben: Ein Bild von einer fremden Adresse dürfte nicht in WebGL geladen werden, die Tropfen blieben dann schlichtes Glas.
- **Messen, auf einem iPhone und einem Android-Handy** (Reihenfolge und „die eine Zeile“ je Befund: `NOTIZEN.md`, Abschnitt 13). Werte probiert man am schnellsten in der Konsole des angeschlossenen Handys (Safari: Menü „Entwickler“; Chrome: `chrome://inspect`), z. B. `document.querySelector('[data-wasser]').style.setProperty('--wa-lauf', 'paused')`.

  | # | Ansehen | Schlecht, wenn | Was es ausschaltet |
  |---|---|---|---|
  | 1 | **Bildrate mit Tropfen und Randlichtern zusammen – das bekannte offene Risiko.** Die lange Liste in „Material“ langsam und schnell rollen, zwei Minuten | die Liste ruckelt oder das Handy wird warm | Lichter anhalten: `--wa-lauf: paused` am Wurzelelement. Dauerhaft: `[data-wasser] { --wa-lauf: paused; }` in `kern.css`, Teil 3. Nur das iPhone ruckelt: zuerst den Block `@supports (-webkit-nbsp-mode: space) { … }` in Teil 3 löschen (die Lichter laufen dann in Schritten) |
  | 2 | Tropfen allein: in der Konsole `Wasser.info.level` und `Wasser.info.ms` | die Stufe steigt auf 2 und mehr, oder es ruckelt nur dort, wo Tropfen stehen | weniger lebende Tropfen: in `wasser.js`, `MOBIL`, `drops: '.btn--primary, .m-ico'`. Gar keine: `drops: ''` (schlichtes Glas) |
  | 3 | Einen Bildschirm betreten: durch die fünf Reiter tippen | eine Pause von einer Fünftelsekunde, bevor sich der neue Bildschirm bewegt | weichere Tiefe kleiner: `--wa-deep-soft: 20px; --wa-shelf-soft: 8px;` (Teil 2, „Becken“); dann `--wa-t-step: 0ms` |
  | 4 | Ton „klar“: Suche und ein Formular über „Start“ und „Heute“ | Wörter der Seite sind zwischen den Treffern oder hinter den Feldern zu lesen | dichter: `--wa-dense: rgba(62, 66, 70, .9);` und `--wa-sheet: rgba(56, 60, 64, .9);` (Teil 1, Ton „klar“) |
  | 5 | Bodenlicht auf einem OLED-Handy im Dunkeln, Ton „dunkel“ | langsame Ringe oder Stufen auf dem Boden einer Karte | `--wa-boden: .15;` oder `0` (Teil 1, Ton „dunkel“) |
  | 6 | Der Ring beim Loslassen | er wirkt wie ein spätes Echo | schneller: `--wa-ring-time: .8s;` (Teil 2). Ganz aus: `ringOn: ''` |
  | 7 | Alles zu viel? | | Weichzeichner aus: `[data-wasser] * { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }` (nur zum Vergleichen). Der ganze Look aus: das Attribut `data-wasser` entfernen |

  Danach, in beliebiger Reihenfolge: ob die Lichter auf Armlänge als Licht auf Wasser zu lesen sind; „klar“ bei Tageslicht; Auswahl und Datumswähler auf iOS; Trefferflächen der Kopfzeile und der Reiter mit dem Daumen.
- **Darf nicht passieren:** live gehen, bevor Punkt 1 auf beiden Handys gut ist oder der Besitzer den Ersatz (Lichter aus) gesehen und gewählt hat.

### Schritt 6 – Den Desktop einschalten

- **Dateien:** `src/scene/Stage.tsx` (drei Zeilen), `src/App.tsx` (zwei Zeilen im Effekt aus Schritt 3).
- **Tun:**
  1. `Stage.tsx`: `import { useWasser } from '../wasser/wasser';`, in `Stage()` als erste Zeile `useWasser('desktop');`, am Wurzelelement `<div className="stage" data-wasser="desktop" ref={ref} …>`.
  2. `App.tsx`: Das alte helle Thema bleibt jetzt überall aus:

     ```ts
     document.documentElement.dataset.theme = 'dunkel'; // the look has light text in both tones: the app's old light theme stays off
     }, [settings.theme, look]);
     ```

- **Prüfen:** der Prüfblock, dazu die Reihenfolge im CSS wie in Schritt 2 (jetzt lädt der Desktop das Modul zuerst – hier würde ein fehlender Schutz aus Schritt 1 auffallen) und

  ```
  node scripts/wasser/desktop.mjs pruefen
  node scripts/wasser/desktop.mjs pruefen --format 1920 --ton klar
  node scripts/wasser/desktop.mjs kontrast
  ```

  Das Fenster über 900 px ziehen und zurück: Es läuft immer genau eine Hülle mit Look.
- **Darf nicht passieren:** Ein Panel, ein Titel oder eine Insel steht anders als heute. `data-theme="hell"` irgendwo. Das Handy ändert sich (`node scripts/wasser/vergleich.mjs bilder --alt git:HEAD`, falls dabei die Vorlage angefasst wurde).

### Schritt 7 – Den Desktop Welt für Welt abnehmen

Eine Welt nach der anderen, in dieser Reihenfolge: Start, Heute, Projekte, Innenwelt eines Projekts, 3D-Druck, Material, Wetter, Archiv. Erst wenn eine Welt abgehakt ist, die nächste.

- **Je Welt ansehen** (acht Bilder: zwei Formate, zwei Töne, Nacht und Tag):

  ```
  node scripts/wasser/desktop.mjs bild screenshots/wasser/welt-heute --nur heute
  node scripts/wasser/desktop.mjs bild screenshots/wasser/welt-heute-tag --nur heute --zeit tag
  node scripts/wasser/desktop.mjs bild screenshots/wasser/welt-heute-klar --nur heute --ton klar
  node scripts/wasser/desktop.mjs bild screenshots/wasser/welt-heute-klar-tag --nur heute --ton klar --zeit tag
  ```

  und dieselben vier mit `--format 1920`. Gegen die Bilder in `docs/wasser-look/bilder/desktop/` halten. Namen der Welten für `--nur`: `start`, `heute`, `projekte`, `innen`, `druck`, `material`, `wetter`, `archiv`.
- **Je Welt prüfen:** Keine Insel und kein Inselname ist von Text oder Panels verdeckt. Jeder Text ist lesbar, bei Tag und bei Nacht. Mit der Maus: jeder Knopf, jedes Panel, die Schublade, die Suche.
- **Je Welt aufräumen** – fünf Stellen, an denen die Vorlage heute gegen Inline-Stile der App arbeitet. Die App bekommt eine Klasse, die Regel in `desktop.css` nennt dann die Klasse (jede dieser Regeln sagt das in ihrem Vermerk):

  | Welt | Stelle | In der App | In `desktop.css` |
  |---|---|---|---|
  | 3D-Druck, Material, Wetter, Archiv | das eine große Panel wird an seinem Inline-Stil `bottom:` erkannt | dem Panel eine Klasse geben, z. B. `className="panel--haupt"` | Teil 2: statt `.ui > .glass.panel[style*="bottom:"]` die Klasse |
  | Innenwelt | die aktuelle Version trägt einen blauen Inline-Rand | Klasse statt Inline-Rand (`src/worlds/ProjektInnen.tsx`) | Teil 2: die Regel mit `[style*="solid"]` und `!important` |
  | alle (11 Stellen, auch in Bögen) | kleine Auswahlfelder mit Inline-Innenabstand: der Pfeil hat keinen Platz | den Inline-Innenabstand streichen | Teil 5: die zwei Regeln `.select[style*="padding"]` entfallen |
  | Wetter | das Zeichen eines schlichten Hinweises ist inline blau (`src/worlds/Wetter.tsx`, `IInfo`) | die Inline-Farbe streichen | Teil 2: `!important` entfällt |
  | Projekte | die Kachel der Zeile „Nächstes“ ist inline blau (`src/worlds/Projekte.tsx`) | Klasse statt Inline-Farbe | Teil 2: die Regel mit `[style*="124, 198, 255"]` |

- **In der Welt „Wetter“ zu entscheiden (Anordnung der App, nicht der Look):** Bei 2000 × 993 steht das Schild „Luftdruck“ auf dem Namen der kleinen Insel „Archiv“. Unter dem Wasser ist der Name ganz verdeckt. Das Schild oder die Insel braucht einen anderen Platz (`src/worlds/Wetter.tsx`, `src/scene/worldLayouts.ts`; Ursache in `NOTIZEN.md`, Abschnitt 10, Punkt 8). Der Besitzer entscheidet.
- **Nach jeder Welt:** der Prüfblock und `node scripts/wasser/desktop.mjs pruefen`.
- **Darf nicht passieren:** Eine Regel in `desktop.css` wird leichter als die Liste ihres Bausteins (4.4). Etwas springt beim Drücken (das prüft `desktop.mjs pruefen`).

### Schritt 8 – Bewegung, die die App liefern muss (nur wenn der Besitzer sie will)

Der Look kann nichts festhalten, was React in einem Bild entfernt. Für diese drei Fälle muss die App selbst warten. **Nichts davon ist gebaut.**

| Fall | Was bereitliegt | Was die App tun muss | Was fehlt |
|---|---|---|---|
| **Ein Bogen geht weich** | Klasse `wa-geht` auf `.sheet`: Er sinkt in 0,26 s (`wa-sinkt`), nimmt keine Klicks mehr, bei reduzierter Bewegung ist er sofort weg. Geprüft: Die Klasse allein genügt | Das Entfernen des Bogens um `--wa-t-leave` (260 ms) verzögern und ihm für diese Zeit die Klasse geben. Eine Stelle: dort, wo `{sheet ? <SheetHost sheet={sheet} /> : null}` steht (`src/App.tsx`, `src/mobile/Mobile.tsx`), den letzten Bogen 260 ms weiter zeigen. Öffnet in dieser Zeit ein neuer Bogen: die Klasse wieder wegnehmen | Am Desktop sinkt die Schublade damit nach **unten** statt nach rechts hinauszufließen: `desktop.css` braucht dafür eine eigene Bewegung (`animation-name`). Der Schleier (`.sheet-back`) verschwindet weiter in einem Bild |
| **Eine Zeile verschwindet** (abgehakte Aufgabe) | nichts | Die Zeile 260 ms mit einer Klasse stehen lassen | Eine Regel im Baustein „Mulde“ (nur `opacity` und `transform`). Die Zeilen darunter springen danach trotzdem nach – eine Höhe weich zu ändern, verbietet die Regel „nichts, das Layout braucht“ |
| **Ein Hinweis ersetzt einen anderen** | Ein Hinweis, der ganz verschwindet, geht schon weich (das Skript hält eine Kopie) | Dem neuen Hinweis einen neuen `key` geben, damit React den alten wirklich entfernt | nichts weiter; ausprobieren |

- **Prüfen:** Bildstreifen (`film.mjs`, Streifen `bogen` und `haken`), Tastatur (Escape, Fokus kehrt zum Auslöser zurück), `verify.mjs`.
- **Darf nicht passieren:** Ein Bogen, der beim schnellen Wieder-Öffnen unsichtbar bleibt. Ein Klick auf einen Knopf eines gehenden Bogens. Verzögerung bei reduzierter Bewegung.

### Schritt 9 – Das alte helle Thema der App

Seit Schritt 6 ist `data-theme` immer „dunkel“. Die Regeln für `:root[data-theme="hell"]` greifen dann nie mehr: ein Block in `src/styles/tokens.css` (ab Zeile 29) und 17 Regeln in `src/styles/global.css` (Abschnitt „light theme refinements“).

- **Tun:** Erst nach der Freigabe des Desktops durch den Besitzer diese Regeln löschen. Die Einstellung „Erscheinungsbild“ mit ihren drei Wahlmöglichkeiten bleibt wie sie ist: Sie wählt jetzt den Ton. `settings.theme` und seine Werte bleiben (gespeicherte Stände).
- **Prüfen:** der Prüfblock; `desktop.mjs bild … --zeit tag` in beiden Tönen sieht aus wie vorher.
- **Darf nicht passieren:** Die Regeln löschen, solange eine Hülle noch ohne Look läuft (sie wäre bei Tag ohne ihr helles Thema).

### Schritt 10 – Baustelle, eigener Desktop, live (Hauptchat)

- **Tun:** Einspielen auf die Baustelle wie in Schritt 5. Der Besitzer sieht es an seinem Rechner an (2000 × 993). Reihenfolge und „die eine Zeile“ je Befund: `NOTIZEN.md`, Abschnitt 11.5. Der erste Hebel, falls es ruckelt: weniger weichgezeichnete Flächen – in `desktop.css` Teil 2 den Weichzeichner zuerst von `.bottom-row .glass.panel` nehmen.
- **Dann erst live:** `domain: 3druckwerkbank.com`, danach `hosting_cache_clear`. Xmind-Mindmap nachziehen (`CLAUDE.md`).
- **Darf nicht passieren:** Testvarianten auf der Hauptadresse. Live ohne den Test auf echten Geräten.

### Schritt 11 – Aufräumen (später, nicht ausprobiert)

Ist alles eingebaut und abgenommen, kann `src/wasser/` die einzige Quelle werden: die vier Dateien aus `docs/wasser-look/vorlage/` löschen und die Werkzeuge umstellen (der Ordner `VORLAGE` in `scripts/wasser/lib.mjs` und in `mobil.html`; der Dateiname `wasser.js` in `lib.mjs`, `desktop-lib.mjs`, `desktop.mjs` und `mobil.html`). Bis dahin gilt: Vorlage ändern, kopieren, `cmp`.

### Alle Prüfungen auf einen Blick

| Befehl | Was er sagt | Dauer auf der Arbeitsmaschine |
|---|---|---|
| `npm run build` | TypeScript und Build sind fehlerfrei | DAUER_BUILD |
| `node scripts/verify.mjs http://localhost:4173` | 69 Prüfungen der App | DAUER_VERIFY |
| `node scripts/wasser/pruefen.mjs --app` | 60 Prüfungen: Tropfen, Ring, Markierung, jeder Baustein, Ruhe, Start/Stopp, Töne | DAUER_PRUEFEN |
| `node scripts/wasser/vergleich.mjs` | Ist es noch der freigegebene Look? Bildpunkt für Bildpunkt, Stil für Stil | DAUER_VERGLEICH |
| `node scripts/wasser/vergleich.mjs --alt git:HEAD` | dasselbe gegen die Vorlage vor der eigenen Änderung | |
| `node scripts/wasser/kontrast.mjs --app` | Lesbarkeit am Handy, beide Töne | DAUER_KONTRAST |
| `node scripts/wasser/messen.mjs ruhe` | lebt es in Ruhe, und bleibt es ruhig? | DAUER_RUHE |
| `node scripts/wasser/messen.mjs takt` | Bilder je Sekunde: wie es ist, Lichter angehalten, ohne Tropfen | DAUER_TAKT |
| `node scripts/wasser/desktop.mjs pruefen` | 24 Prüfungen am Desktop, darunter „nichts ist verrückt“ und „nichts springt beim Drücken“ | DAUER_DPRUEFEN |
| `node scripts/wasser/desktop.mjs kontrast` | Lesbarkeit am Desktop, beide Töne, Nacht und Tag | DAUER_DKONTRAST |
| `node scripts/wasser/desktop.mjs takt` | was der Look am Desktop kostet | DAUER_DTAKT |
| `node scripts/wasser/pruefen.mjs --regler` | der Regler der Tropfen (Herunterschalten bei Überlast) | DAUER_REGLER |

Alle Werkzeuge nehmen `--engine webkit` (braucht Playwrights WebKit; auf der Arbeitsmaschine vorher die Umgebung laden, siehe `NOTIZEN.md`, Abschnitt 8). Die App unter einer anderen Adresse: `WASSER_APP=http://localhost:4174` davor.

---

## 9. Fallstricke

Jede Zeile ist eine Falle, in die die Erbauer getreten sind. Nummern in Klammern: `NOTIZEN.md`, Abschnitt 7.

**Listen und Gewicht**

1. Wenn in einer Liste ein Komma fehlt, dann werden zwei Einträge zu einem Nachfahren-Selektor: Das Element verliert den Baustein, ohne Fehlermeldung. Neue Zeile immer unter die erste, mit Komma.
2. Wenn ein neuer Eintrag schwerer ist als die Liste, dann ändert sich das Handy stillschweigend. Das Mehr gehört in `:where()`. `vergleich.mjs stile` findet es. (1)
3. Wenn eine Regel einer Hülle leichter ist als die Liste, dann kommt nichts von ihr an – und sie kann einen Klick kosten: Die Pfeile neben der Insel sprangen beim Drücken 23 px weg. Berechneten Wert ablesen, drücken. (55)
4. Wenn ein Element mit einem eigenen `transform` platziert ist und ein Baustein beim Drücken ein `transform` setzt (Perle, Tropfen-Glas), dann muss sein `:active` den eigenen Platz wiederholen.
5. Wenn eine Klasse beider Hüllen in eine Liste kommt, dann ändern sich beide Hüllen. Eingrenzen: `:where(.topbar) .brand`. (50)
6. Wenn Bausteine in Teil 4 umgestellt werden, dann gewinnen andere Regeln (gleiche Gewichte, die Reihenfolge entscheidet). Teil 4 nicht umsortieren. (2)
7. Wenn ein Wert aus anderen gebaut ist, dann wird er dort aufgelöst, wo er steht. `--wa-core` an einer Karte zu ändern, ändert ihren `--wa-meniscus` nicht. `--wa-leben` gehört ans Wurzelelement. (3)
8. Wenn ein Baustein `position` setzt, dann springt ein absolut platziertes Panel in die Ecke. Kein Baustein setzt eine Position; die Hülle gibt sie, wo sie fehlt. (5)
9. Wenn die App eine Stelle inline stylt, dann schlägt das jede Regel. Entweder `!important` (Notlösung) oder die App bekommt eine Klasse (Schritt 7). (48)
10. Wenn ein Selektor eine Inline-Farbe finden soll, dann so, wie React sie schreibt: `rgb(124, 198, 255)`, mit Leerzeichen. (58)
11. Wenn verschachtelte Regeln geschrieben werden, dann beginnt oder enthält jeder Selektor `&`. Nie in einer Regel verschachteln, deren Selektor auf ein Pseudo-Element endet. (6)
12. Wenn `:has()` fehlt (sehr alte Browser), dann gibt es keine Perle in der Leiste (der aktive Reiter ist getönt), antippbare Mulden leuchten nicht, die Seite ruht nicht hinter einem Bogen. (7)

**Material und Weichzeichner**

13. Wenn ein Weichzeichner auf einem Kind einer Fläche liegt (Pseudo-Element, Helfer), dann zeigt er nichts: Ein Vorfahre mit `opacity`, `filter`, `mask` oder `clip-path` wird zum Hintergrund dieses Kinds. Der Weichzeichner bleibt auf der Fläche selbst. (9)
14. Wenn ein Vorfahre mit einer `opacity`-Animation und `fill-mode: both` hereinkommt, dann bleibt er für immer ein solcher Hintergrund: Das Suchfeld sah durch seinen Schleier nichts. Dem Schleier die Animation nehmen. (47)
15. Wenn die Fläche selbst in Ruhe animiert wird (`.m-card`, `.panel`), dann wird ihr Weichzeichner für jedes Bild neu gerechnet. Bewegt wird nur eine kleine eigene Ebene, mit `transform` und `opacity`.
16. Wenn `backdrop-filter` vor `-webkit-backdrop-filter` steht, dann behält der Build nur die letzte Zeile: kein Weichzeichner in Chromium und Firefox. Die `-webkit-`Zeile zuerst. (Das eigene `global.css` der App hat es andersherum: Darum zeichnet die gebaute App heute `.glass` in Chromium nicht weich.) (8)
17. Wenn näher als 14 px an einem Tropfen etwas abschneidet (`overflow: hidden`), dann fehlen seine Wölbung und sein Schatten.
18. Wenn dunkles Glas mit satter Farbe dahinter über warmem Holz braun wird, dann zuerst `--wa-sat` senken. Eine dunklere Fläche hilft nicht. (10)
19. Wenn am Handy der Bogen selbst weichzeichnet, dann wird das für jedes Bild jedes Tropfens darauf neu gerechnet. Dort trägt der Schleier den Weichzeichner. Über einer Seite, die nie ruht (Desktop), ist es umgekehrt: `--wa-scrim-blur: none`. (11)
20. Wenn die Abdunklung der Seite (`.m-bg::after`) ihre Form ändert, dann verstehen die Tropfen sie nicht mehr. Sie bleibt `linear-gradient(180deg, <Farbe> 0%, … 30%, … 70%, … 100%)` mit vier Stufen. (12)
21. Wenn ein Feld, eine Auswahl oder ein Textbereich ein `::before` bekommen soll: geht nicht. Darum ist die Wasserlinie eine Hintergrundebene. (13)
22. Wenn etwas mit einer Animation hereinkommt, die mit einem `transform` endet (`fill-mode: both`), dann überschreibt sie sein eigenes `transform`. Nie mit `transform` zentrieren, was hereinbewegt wird. (14)
23. Wenn `--wa-drop-red` weniger als vier Zahlen hat (`r, g, b, Menge`), dann bricht `rgba(var(--wa-drop-red))`. (15)
24. Wenn `inset` ungültig ist (es nimmt vier Werte, keine Größe), dann fällt ein Licht still zusammen. (16)
25. Wenn ein Baustein `box-shadow` auf Zeilen setzt, dann muss er der Zeile des gewählten Bereichs (`.bereich-card--on`) ihre farbige Marke zurückgeben. (17)
26. Wenn das Licht unter einem klaren Tropfen durchzieht oder die Seite unter einer Karte heller ist, dann wird der Grund seines Etiketts heller: Ein Tropfen auf einer Fläche ist Licht über deren echten Bildpunkten. Heilen mit `--wa-drop-veil`. (46)

**Bewegung**

27. Wenn Lichter einzeln angehalten oder ihre Helfer im DOM verschoben werden, dann laufen sie danach aus dem Takt. Nur alle gemeinsam (`--wa-lauf`). (19)
28. Wenn ein Wert für jedes Bild am Wurzelelement gesetzt wird, dann wird die ganze Seite neu gestylt (2 bis 3 ms statt 0,1 ms). Der Zug geht nur an die Lichthelfer. (20)
29. Wenn der gezogene Zustand eine Klasse wäre statt eines Attributs, dann läse das Skript bei jeder Änderung alle Tropfen neu. (21)
30. Wenn die Breite eines Pegels weich übergeht, dann läuft bei einem laufenden Druck dauernd ein Übergang auf einer weichgezeichneten Karte (die App ändert den Stand jede Sekunde ein wenig). Die Breite springt; das Skript bewegt nur echte Änderungen. (22)
31. Wenn ein Pseudo-Element mit `display: none` oder `content: none` ausgeblendet wird, dann läuft seine Schleife in WebKit weiter. Immer auch `animation: none`. (23)
32. Wenn eine Schleife in Schritten läuft (`steps()`), dann ist das in Chromium billig – in WebKit läuft sie auf dem Faden der Seite. Darum bekommt WebKit `linear`. Auf einem Handy ist keiner der beiden Wege gemessen. (24)
33. Wenn auf `scale` oder `translate` eine Keyframe-Animation läuft, dann startet ein Übergang auf derselben Eigenschaft nicht. Was vom Scrollen unterbrechbar sein muss, ist als Zug gebaut (`data-wa-kommt`). (43)
34. Wenn ein Hauptregler Maße vervielfacht, dann braucht jedes Produkt eine Grenze (`clamp()`, `min()`): Ein negativer Maßstab klappte ein Licht aus der Karte hinaus. (44)
35. Wenn `--wa-leben: 0` zum Sparen gesetzt wird, dann spart das nichts. Zum Sparen: `--wa-lauf: paused`. (45)
36. Wenn die App selbst eine Schleife auf einer Fläche laufen lässt (die Lauflinie eines Drucks), dann schläft sie nicht mit. Was der Look übernimmt, bekommt `animation-play-state: var(--wa-lauf)`, Keyframes aus `transform` und die „keine Bewegung“-Regel. (57)
37. Wenn Kinder einer Leiste verschieden breit sind (Flex-Zeile aus Wörtern), dann steht die Perle daneben. Gleich breite Kinder: `flex: 1` oder `1fr`-Spalten. (49)

**Skript und React**

38. Wenn ein Wert geändert wird, dann merken die Tropfen es erst nach bis zu einer Sekunde – und gar nicht, solange das Wasser steht (reduzierte Bewegung). In Tests danach `resize` am `window` auslösen. (25, 32)
39. Wenn etwas einen Tropfen verdeckt, ohne ihn auszuhängen, dann muss es dessen Druck beenden. Für `modal` ist das gemacht; bei jeder neuen Art, die Seite zu bedecken, daran denken. (26)
40. Wenn ein Beobachter auf Attribute hört, dann nach Namen filtern: React schreibt `name` und `type` jedes Felds bei jedem Neuzeichnen (bei einem laufenden Druck jede Sekunde). (27)
41. Wenn ein Hinweis auf einen anderen folgt, dann benutzt React denselben Knoten: Keine Kopie geht weich. Die Kopie eines entfernten Hinweises bleibt 0,26 s stehen – ein Test, der `.toast` gleich danach zählt, sieht sie. (28)
42. Wenn Dauern ins Skript kopiert werden, dann laufen sie auseinander. Das Skript liest sie mit `getComputedStyle`. (29)
43. Wenn die Stylesheets des Looks nacheinander geladen werden, dann wird die Seite dazwischen einmal gezeichnet, und Chromium zeichnet weiche Schatten danach auf Dauer anders. Alle zusammen laden; der Build bündelt sie. (39)
44. Wenn das Modul `wasser.ts` die Stylesheets der App nicht selbst zuerst lädt, dann steht der Look im gebauten CSS vor `mobile.css`, sobald `Stage.tsx` das Modul lädt (nachgestellt: Der Look begann bei Zeichen 41 489, `mobile.css` endete bei 107 942).
45. Wenn `Wasser.stop()` fehlt, wenn eine Hülle verschwindet, dann bleiben Helfer, Lauscher und der WebGL-Kontext zurück. `useWasser` ruft es im Aufräumen des Effekts.
46. Wenn die App ein Element umbaut, dann wirft React die Helfer des Looks (`canvas.w3-drop`, `i.wa-licht`, `i.wa-floor`) weg. Das ist vorgesehen; nichts darf von ihnen abhängen. Tests der App müssen mit ihnen rechnen: Jeder lebende Knopf hat ein `<canvas>` als erstes Kind, jede Karte ein `<i>` mehr.

**WebKit und die Arbeitsmaschine**

47. Wenn in WebKit das Szenenbild „geladen“ meldet, dann ist es manchmal noch nicht zeichenbar: Die freien Tropfen blieben schwarz. Die Vorlage lädt kein leeres Bild hoch und schaut im nächsten Bild noch einmal (`Wasser.info.blank`). Ob ein iPhone dasselbe tut, ist unbekannt. (40)
48. Wenn Bilder aus dem WebKit-Testbrowser der Arbeitsmaschine beurteilt werden: Er zeichnet **gar keinen** `backdrop-filter` (Flächen zeigen die Szene scharf, im Ton „klar“ scheinen Wörter der Seite durch). Weichzeichner und Tiefe in Chromium beurteilen. Er ist die Familie von Safari, kein iPhone. (35)
49. Wenn Bildraten von der Arbeitsmaschine gelesen werden: Sie rechnet ohne Grafikkarte. Zahlen gelten nur im Verhältnis zueinander.
50. Wenn eine Bildrate nur mit `requestAnimationFrame` gemessen wird, dann sagt sie nichts über den Compositor. `messen.mjs takt` koppelt sie. (31)
51. Wenn weiches Licht aus einem Film beurteilt werden soll, dann nicht aus Playwrights Videoaufnahme: Ihr Rauschen ist größer als das Licht. `clip.mjs --cast` oder `leben.mjs` nehmen. (42)
52. Wenn unter reduzierter Bewegung ein Bildschirmfoto zu früh kommt, dann zeigt ein Tropfen noch die Szene davor. Kurz warten oder zweimal schauen. (41)
53. Wenn zwei Läufe der echten App verglichen werden, dann müssen Uhr und Wetter stehen (`vergleich.mjs` macht das), sonst unterscheiden sie sich durch die Uhr, einen laufenden Druck und eine Wetterkarte. (38)
54. Wenn Playwright am Desktop etwas anklickt, dann rollt es die Bühne dafür bis zu 40 px „ins Bild“. `desktop-lib.mjs` stellt sie vor jedem Bild zurück. (52)
55. Wenn Elemente vor und nach einer Aktion verglichen werden, dann jedes mit sich selbst, nicht das n-te mit dem n-ten: Die App baut Elemente neu, während man schaut. (56)
56. Wenn ein Ring geprüft wird, dann tippen, nicht halten: Er startet beim Loslassen. (33)
57. Wenn die Vorschauseite `mobil.html` Scrollen oder den Auftritt der Karten zeigen soll: Sie scrollt bei 844 px Höhe nicht und schaltet den Auftritt ab. Beides in der echten App beurteilen (`film.mjs`). (34)
58. Wenn `.m-head .ws-chip` mit Playwright geklickt wird, dann läuft `click()` in die Zeit; `evaluate(el => el.click())` nehmen. (36)
59. Wenn ein Hinweis mit „Rückgängig“ gebraucht wird: Eine Aufgabe in „Heute“ abzuhaken zeigt keinen. Einen Einkauf in „Material“ entfernen. (37)
60. Wenn `vergleich.mjs --alt git:HEAD` nach Zwischen-Commits benutzt wird, dann ist `HEAD` nicht mehr „vor dem Schritt“. `--alt git:<Commit davor>` oder eine Kopie des Ordners nehmen.
61. Wenn für WebKit die Umgebung geladen wurde (`env.sh`), dann findet dieselbe Shell danach kein Chromium mehr. Für Chromium eine neue Shell. 
62. Wenn die App bei Tag ihr helles Thema einschaltet, während der Look an ist, dann bleiben helle Etiketten, Zeilen und Knöpfe stehen. `data-theme` bleibt „dunkel“ (Schritte 3 und 6). (53)

---

## 10. Ungeprüft und offen

**Nie gelaufen:**

- **Auf keinem echten Handy.** Alles wurde in Chromium und in Playwrights WebKit auf einer Maschine ohne Grafikkarte beurteilt. Unbekannt: ob es flüssig läuft; ob die Lichter als Licht auf Wasser zu lesen sind; das Bodenlicht auf einem OLED; der weichgezeichnete Schleier; die Auswahl mit `appearance: none` und der Datumswähler auf iOS; Trefferflächen mit dem Daumen; „klar“ bei Tageslicht.
- **Auf keiner echten Grafikkarte.** Die Arbeitsmaschine zeichnet den Desktop von heute mit 9 bis 11 Bildern je Sekunde, die Vorlage mit 8.
- **Der Regler der Tropfen** wurde nur mit vorgetäuschten Kosten durchlaufen, nie von einem Gerät, das wirklich langsam und wieder schnell wurde.
- **Firefox am Desktop** (sein Build hier hat kein WebGL: schlichtes Glas, alles andere ist CSS).

**Das bekannte Risiko: die Bildrate mit Tropfen und Randlichtern zusammen.** Im WebKit-Testbrowser halten die wandernden Lichter allein den Compositor bei etwa 14 Bildern je Sekunde, der ganze Look bei 9 bis 12 (die App ohne Look: 49 bis 62; jedes für sich: etwa 50). Chromium bleibt unbewegt. Das ist ein Software-Compositor und beweist nichts über ein iPhone – aber es ist das Erste, was dort anzusehen ist (Schritt 5, Punkt 1). Am Desktop kostet der Weichzeichner: 15 bis 29 % weniger Bilder je Sekunde auf der Arbeitsmaschine; die Lichter kosten dort nichts.

**Offen, zu entscheiden oder zu bauen:**

- Leben in Ruhe ist in Zahlen da und mit dem Auge schwer zu finden, bei `--wa-leben` 1 und 1,5 gleichermaßen. Der Besitzer entscheidet; der Hebel wäre das Tempo, nicht gebaut.
- „klar“ wird als heller Modus vielleicht nicht stark genug empfunden: Bögen, Suche, Leiste und die untere Karte sehen in beiden Tönen ähnlich aus, die Schrift ist in beiden hell. Am Desktop ist „klar“ bei Tag Rauchglas, nicht klares Wasser.
- „klar“ braucht `backdrop-filter`. Ohne ihn (WebKit-Testbrowser) zeigen Flächen die Szene scharf, und kleiner Text wird bei Tag schwer lesbar. Jeder aktuelle Browser zeichnet ihn; ein Ersatz ist nicht gebaut.
- Die Etiketten auf klaren Tropfen im Ton „klar“ sehen etwas anders aus als auf den am 13.11. freigegebenen Bildern (weniger Silber im Körper, `--wa-drop-veil: .3`).
- Weiter tot: ein Bogen, der schließt; eine Zeile, die verschwindet; ein Hinweis, der einen anderen ersetzt; die Kopfzeile (Schritt 8).
- Welt „Wetter“ bei 2000 × 993: das Schild „Luftdruck“ auf dem Inselnamen „Archiv“ (Schritt 7).
- Verblasste Hintergrund-Inseln, über die die App schon heute Panels legt, sieht man durch das Wasser weniger als durch das heutige Glas. Das ist das Material; dünner geht nur auf Kosten der Lesbarkeit.
- Ein freier Tropfen sieht die Inseln nicht. Heute liegt keiner vor einer Insel (je Welt geprüft); eine andere Anordnung kann das ändern. Dann den Knopf aus `drops` nehmen.
- Am Handy nicht behoben, um die freigegebenen Bilder nicht zu ändern: kleine Auswahlfelder mit Inline-Innenabstand in Bögen (der Pfeil hat keinen eigenen Platz); der Marken-Knopf der Kopfzeile behält den blauen Fokusring der App (ein Eintrag in der Wasserlinien-Liste).
- Die leere Werkstatt zeigt in „3D-Druck“ und „Material“ große leere Becken. Anordnung der App.
- Der eigene kleine Lichtlauf des Hinweises ist nicht übernommen (`NOTIZEN.md`, Abschnitt 12).
- Die Perle kennt neun Kinder; ein zehntes braucht eine Zeile mehr.
- Lose weiße Schrift über der Landschaft (der Spruch auf „Start“) hat einzelne Stellen bei 2,6 : 1 – in beiden Tönen und in der App von heute.
- Schritt 8 (Bewegung der App), Schritt 9 (altes helles Thema löschen) und Schritt 11 (Aufräumen) sind nicht ausprobiert. Der Weg mit `--engine webkit` wurde für diese Anleitung nicht neu durchlaufen.

---

## 11. Was an dieser Anleitung geprüft wurde

GEPRUEFT_PLATZHALTER
