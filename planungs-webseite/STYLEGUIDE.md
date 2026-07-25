# Styleguide – Herr RINGOO Content-Planer

Dieser Styleguide beschreibt das visuelle System der internen Planungs-Website
(`planungs-webseite/`). Er ist die Grundlage für `css/style.css` – Änderungen
am Design sollten hier zuerst entschieden und dann im CSS umgesetzt werden,
nicht umgekehrt.

## Grundprinzip

**Struktur in Grau, Marke in Gold.** Die Fläche (Hintergründe, Rahmen, Karten,
Tabellen) wird ausschließlich mit der Graustufen-Skala aufgebaut. Gold
(`#C8AA6D`, die Markenfarbe von Herr RINGOO) wird **nie flächig** eingesetzt,
sondern ausschließlich dort, wo etwas hervorgehoben werden soll:

- Rahmen von klickbaren Cards (`a.card`) im Hover-Zustand
- Schritt-Nummern im Planer
- Zitat-/Phrasen-Listen (linker Rand)
- Links, CTA-Text und Hover-Zustände
- Haken in Checklisten
- Warn-Callouts

Faustregel beim Hinzufügen neuer Komponenten: *Würde diese Fläche auch ohne
Gold funktionieren?* Wenn ja, bleibt sie grau. Gold ist ein Gewürz, keine
Grundzutat. Das gilt auch für Buttons: Die Referenzseite herr-ringoo.de nutzt
goldgefüllte Buttons – hier bewusst **nicht** übernommen, siehe
[Buttons/CTA](#buttonscta) unten.

## Farben

Alle Farben sind als CSS-Variablen in `:root` (`css/style.css`) definiert.

### Graustufen-Skala

| Token | Hex | Verwendung |
|---|---|---|
| `--gray-950` | `#17181a` | Überschriften, Header-Hintergrund |
| `--gray-900` | `#212226` | Fließtext |
| `--gray-800` | `#35373c` | Callout-Rand (neutral) |
| `--gray-700` | `#4d5058` | – (Reserve) |
| `--gray-600` | `#696d76` | Sekundärtext (`--color-text-muted`) |
| `--gray-500` | `#888c94` | – (Reserve) |
| `--gray-400` | `#adb0b7` | – (Reserve) |
| `--gray-300` | `#d2d4d8` | starke Rahmen (`--color-border-strong`) |
| `--gray-200` | `#e5e6e9` | Standard-Rahmen (`--color-border`) |
| `--gray-100` | `#f1f2f3` | `code`-Hintergrund |
| `--gray-50` | `#f8f8f9` | dezente Flächen (`--color-bg-muted`) |
| `--white` | `#ffffff` | Seiten-/Karten-Hintergrund |

### Gold (Highlight)

| Token | Hex | Verwendung |
|---|---|---|
| `--gold` | `#c8aa6d` | Akzentfläche (Schritt-Kreise, aktive Nav) |
| `--gold-dark` | `#a9884c` | Links, Text auf hellem Grund (bessere Lesbarkeit als `--gold`) |
| `--gold-tint` | `#f7f0e2` | sehr helle Goldfläche, nur für `.callout.warn` |

### Semantische Tokens

Komponenten greifen nicht direkt auf Grau-/Gold-Werte zu, sondern auf
semantische Variablen – so lässt sich die Palette an einer Stelle anpassen:

```
--color-bg            Seitenhintergrund (white)
--color-bg-muted       dezente Flächen, z. B. Tabellenkopf, Footer (gray-50)
--color-surface        Karten/Boxen-Hintergrund (white)
--color-border          Standard-Rahmen (gray-200)
--color-border-strong   betonter Rahmen, z. B. Tags (gray-300)
--color-text            Fließtext (gray-900)
--color-text-muted      Sekundärtext (gray-600)
--color-heading         Überschriften (gray-950)
--color-header-bg       Header-Hintergrund (gray-950)
--color-accent          Gold-Highlight (gold)
--color-accent-dark     Gold für Text/Links (gold-dark)
--color-accent-tint     helle Gold-Fläche (gold-tint)
```

**Kontrast-Hinweis:** `--gold` (`#c8aa6d`) hat auf Weiß nur ~2:1 Kontrast und
ist damit **kein Fließtext-Ton**. Für Text auf hellem Grund immer
`--gold-dark` verwenden; `--gold` ist ausschließlich für Flächen/Ränder
gedacht, die zusätzlich durch Form (Kreis, Balken, Rahmen) erkennbar sind.

## Abstände (Spacing-Skala)

Eine einzige Skala auf Basis von 4px/0.25rem trägt alle Margins, Paddings und
Gaps der Seite. **Neue Komponenten dürfen keine eigenen Zahlenwerte
einführen** – immer einen vorhandenen `--space-*`-Wert wählen, notfalls die
Skala hier dokumentiert erweitern statt lokal einen Literal zu schreiben.

| Token | rem | px | typische Verwendung |
|---|---|---|---|
| `--space-0` | 0 | 0 | Reset (z. B. `margin-top: 0`) |
| `--space-1` | 0.25rem | 4px | Mikro-Gaps, Pill-Innenabstand vertikal |
| `--space-2` | 0.5rem | 8px | Überschrift→Inhalt-Abstand, enge Listen-/Tag-Gaps |
| `--space-3` | 0.75rem | 12px | kompakter Innenabstand horizontal, Icon-Insets |
| `--space-4` | 1rem | 16px | Standard-Innenabstand horizontal, lockeres Grid-Gap |
| `--space-5` | 1.25rem | 20px | Card-Innenabstand, seitlicher Seitenrand |
| `--space-6` | 1.5rem | 24px | Footer-Innenabstand vertikal, Schritte-Rhythmus |
| `--space-7` | 2rem | 32px | Checklist-Einzug |
| `--space-8` | 2.5rem | 40px | Main-Innenabstand oben |
| `--space-9` | 3rem | 48px | großer Rhythmus: Seiten-Intro/Section margin-bottom |
| `--space-10` | 4rem | 64px | Main-Innenabstand unten |

Daneben zwei **eigene Kategorien**, die keine Rhythmus-Abstände sind und
deshalb nicht in der Skala stehen:

- **Geometrie:** `--step-marker-size: 2rem` – der Durchmesser der
  Schritt-Nummern-Kreise im Planer. Eine Objektgröße, kein Abstand.
- **Breite/Messgrößen:** `--max-width: 1000px` (Seitenbreite) und
  `.lede { max-width: 70ch }` (Textspalten-Breite in Zeichen, bewusst
  zeichenbasiert statt px/rem, da es um Lesbarkeit geht).

### Wiederverwendbare Innenabstand-Tiers

Statt dass jede Box-Komponente eigene Padding-Werte bekommt, greifen alle
Komponenten derselben Rolle auf eines von vier Tiers zu:

| Tier | block / inline | Beispiele |
|---|---|---|
| **pill** | `--space-1` / `--space-3` | `.source-note`, `.keyword-tags span` |
| **compact** | `--space-2` / `--space-3` | `th, td`, `.phrase-list li`, `.image-card .image-tag`, `.checklist li` |
| **standard** | `--space-3` / `--space-4` | `.callout`, `.status-legend .card` |
| **card** | `--space-5` / `--space-5` | `.card` |

### Wiederverwendbare Gap-Tiers

| Tier | Wert | Beispiele |
|---|---|---|
| **tight-list** | `--space-2` | `.phrase-list`, `.keyword-tags`, `.status-legend`, `.checklist` |
| **loose-grid** | `--space-4` | `.card-grid`, `.do-dont`, `.image-grid` |

Eine Deklaration darf zwei verschiedene Tokens kombinieren, wenn es sich um
zwei echte Achsen handelt (z. B. `padding: var(--space-3) var(--space-4)` für
block/inline) – das ist kein Verstoß gegen das Prinzip. Verboten ist, dass
zwei Komponenten mit derselben Rolle (z. B. zwei Card-artige Boxen) zwei
unterschiedliche Werte-Paare bekommen, oder dass eine einzelne Deklaration
drei oder mehr unzusammenhängende Werte mischt.

## Radius & Schatten

```
--radius:     12px   Karten, Tabellen, Bilder
--radius-sm:   8px   Buttons, Tags, Checkliste, Nav-Elemente
--radius-xs:   4px   `code`
--radius-pill: 999px Pill-Badges (Tags, Quellenhinweis)

--shadow-soft:  dezenter Ruhezustand (Karten, Header)
--shadow-hover: stärkerer Schatten + leichtes Anheben (transform) bei Hover
```

Radius ist eine eigene Token-Familie, keine Untermenge der Spacing-Skala –
Rundungen und Abstände lösen unterschiedliche Probleme und sollen unabhängig
voneinander änderbar sein.

Karten (`.card`, `.image-card`) heben sich beim Hover leicht ab
(`translateY(-2px)` + `--shadow-hover`).

## Typografie

Die Schriften entsprechen der Hauptwebsite [herr-ringoo.de](https://www.herr-ringoo.de/):

```
--font-heading: "Josefin Sans", "Segoe UI", Arial, sans-serif;
--font-body:    "Open Sans Condensed", "Segoe UI", Arial, sans-serif;
```

Eingebunden über Google Fonts im `<head>` jeder Seite (vor `css/style.css`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Open+Sans+Condensed:ital,wght@0,300;0,700;1,300&display=swap" rel="stylesheet">
```

### Wichtig: Josefin Sans hat genau eine Rolle

Auf herr-ringoo.de wird **Josefin Sans ausschließlich für kurze,
prägnante Section-Titel in Versalien verwendet** (z. B. „WO ROLLT HERR
RINGOO?", „AUF JÜCK", „MIT SCHMACKES" – bei uns die Rolle von `h2`). **Alles
andere** – die große Seiten-Headline, der goldene Kicker darunter,
Fließtext, Navigation, Buttons, Footer – ist **Open Sans Condensed** in
unterschiedlichem Schnitt/Case. Es ist ein Fehler, Josefin Sans pauschal für
„alle Überschriften" zu verwenden – das war die falsche Umsetzung in einer
früheren Version dieses Styleguides und wurde korrigiert.

Die Referenzseite verwendet außerdem **kein `letter-spacing`** – Versalien
entstehen dort ausschließlich durch Groß-/Kleinschreibung, nicht durch
Sperrung. Wir setzen das technisch über `text-transform: uppercase` um
(nicht durch hartcodierten Großbuchstaben-Text in den HTML-Dateien): visuell
identisch, aber robuster gegenüber Textänderungen und zugänglicher, da
Screenreader den zugrundeliegenden Mixed-Case-Text weiter korrekt vorlesen
können, statt Wörter bei durchgehenden Versalien ggf. zu buchstabieren.

### Rollen-Tabelle

| Rolle | Element(e) | Familie | Schnitt | Case |
|---|---|---|---|---|
| Hero-/Seitentitel | `h1` | Open Sans Condensed | 700 | `uppercase` |
| **Section-Titel (einzige Josefin-Sans-Rolle)** | `h2` | **Josefin Sans** | 600 | `uppercase` |
| Sub-Überschrift (keine Referenz-Entsprechung) | `h3`, `h4` | Open Sans Condensed | 700 | normal |
| Kicker | `.eyebrow` | Open Sans Condensed | 700 | `uppercase` |
| Markenname im Header | `.brand-mark` | Josefin Sans | 700 | normal |
| Tagline im Header | `.brand-tag` | Open Sans Condensed | 400 | `uppercase` |
| CTA-/Link-Text | `.card-link`, `.step-target` | Open Sans Condensed | 700 | `uppercase` |
| Tabellenkopf | `thead th` | Open Sans Condensed | 700 | `uppercase` |
| Zitat/Textbaustein | `.phrase-list .phrase` | Open Sans Condensed | 400 italic | normal |
| Fließtext | `body`, `p`, `.card p` etc. | Open Sans Condensed | 400 | normal |
| Hashtags/Keywords | `.keyword-tags span` | Open Sans Condensed | 400 | **unverändert** (Groß-/Kleinschreibung ist inhaltlich bedeutsam, z. B. „#HerrRINGOO") |
| Footer | `.site-footer` | Open Sans Condensed | 400 | normal |

Body-Basisgröße ist `1.15rem` – bewusst kleiner als die 21px (≈1.31rem) der
Referenzseite, da diese Planungsseite dichter ist (Tabellen, Tags, viele
Karten) und die volle Referenzgröße hier zu groß wirken würde.

## Komponenten – Kurzreferenz

- **Header:** dunkelgrauer Grund (`--gray-950`), zeigt nur die Marke
  (`.brand`), kein Unterseitenmenü. Navigation zwischen den Bereichen läuft
  ausschließlich über die Buttons auf der Startseite; die Marke verlinkt
  zurück auf `index.html`.
- **Card / Card-Grid:** weiße Fläche, grauer Rahmen, `card`-Padding-Tier,
  Gold nur im `.card-link`-Text (fett, Versal). `.card` ist intern eine
  Flex-Spalte über die volle Grid-Zeilenhöhe (`display: flex;
  flex-direction: column; height: 100%`) – dadurch stehen alle Karten einer
  Reihe gleich hoch, unabhängig von Titel-/Textlänge. Gilt unverändert, egal
  ob die Karte ein `<div>` (rein informativ) oder ein `<a>` ist (siehe
  unten).
- **Card als Link (z. B. die drei Bereiche-Karten auf der Startseite):**
  dieselbe `.card`-Optik, nur dass `<a class="card">` statt `<div
  class="card">` verwendet wird – die ganze Fläche ist dann der Klickbereich,
  nicht nur ein Link-Text am Ende. `a.card` setzt lediglich
  `text-decoration: none` und `color: inherit` zurück, führt aber **keine**
  eigene Padding-/Radius-/Schatten-Werte ein. Der `.card-link` am Ende
  bekommt `margin-top: auto` – dadurch sitzt „Öffnen" bei jeder Karte exakt
  auf gleicher Höhe am unteren Rand, egal wie viel Text/Tags darüber stehen.
  Hover zusätzlich mit Gold-Rahmen (`a.card:hover`), da hier kein separater
  `.card-link`-Text sichtbar wäre, der die Interaktivität sonst anzeigen
  würde.
- **„Was kann ich hier tun"-Tags:** keine eigene Komponente – nutzt bewusst
  `.keyword-tags` wieder (gleiche Pill-Optik wie Hashtags), statt eine
  zweite Listen-Variante einzuführen. Im Card-Kontext nur der
  Bottom-Margin verkleinert (`.card .keyword-tags`), damit der
  Flex-Rhythmus der Card stimmt.
- **Steps (Planer):** Kreis-Nummern in Gold als einziges Farbelement der
  Zeitleiste, Größe über `--step-marker-size`, Linie und Rahmen grau.
- **Callout:** Standard-Tier, grauer Rand (`--gray-800`) auf `--gray-50`;
  Variante `.warn` nutzt Gold-Rand + `--gold-tint`-Fläche für echte
  Warnungen.
- **Phrase-List (Zitate/Textbausteine):** Gold-Balken links als visueller
  Marker, `compact`-Padding-Tier.
- **Keyword-Tags:** grau (kein Gold), `pill`-Tier, `tight-list`-Gap – Case
  bleibt unverändert, da inhaltlich relevant.
- **Checkliste:** Häkchen in `--gold-dark`, `compact`-artiges Padding mit
  `--step-marker-size` als linkem Einzug, sonst neutral grau.
- **Footer:** dezente graue Fläche (`--color-bg-muted`), kein Gold.

## Buttons/CTA

Die Referenzseite herr-ringoo.de verwendet für echte Call-to-Actions
(„MEHR", „ZU DEN PAKETEN") goldgefüllte Buttons mit weißem, fettem
Versal-Text. Das ist die einzige Stelle, an der die Referenzseite Gold als
Fläche statt als Akzent nutzt.

**Bewusste Entscheidung:** Auf dieser Seite werden CTA-artige Elemente
(`.card-link`, `.step-target`) **nicht** goldgefüllt, sondern bleiben
Text-Links – nur Schrift-Rolle (fett, Versal, Open Sans Condensed) wurde
der Referenz angeglichen, die Goldfläche nicht. Grund: Das übergeordnete
Prinzip dieser Seite ist „Gold nur als Highlight, nie als Fläche" – ein
goldgefüllter Button würde dem widersprechen. Sollte künftig ein echter
Primär-Button gebraucht werden (z. B. eine Freigabe-Aktion), zuerst prüfen,
ob eine Text-/Rand-Variante in Gold ausreicht, bevor eine gefüllte Fläche
eingeführt wird.

## Anwendung auf neue Seiten/Komponenten

1. Neue Flächen zuerst in Grau bauen (Hintergrund `--color-surface` oder
   `--color-bg-muted`, Rahmen `--color-border`).
2. Erst danach prüfen: gibt es ein Element, das wirklich hervorgehoben werden
   muss (Call-to-Action, aktiver Zustand, Kennzeichnung)? Nur das bekommt
   Gold – als Rand, Text oder kleines Flächenelement, nie als große
   Hintergrundfläche (siehe [Buttons/CTA](#buttonscta)).
3. Schrift-Rolle aus der Rollen-Tabelle oben wählen – **nicht** pauschal
   „Überschrift = Josefin Sans, Rest = Open Sans Condensed" annehmen. Josefin
   Sans ist reserviert für die Section-Titel-Rolle (`h2`) und den
   Markennamen. Kein neues `letter-spacing` einführen.
4. Abstände ausschließlich über `--space-0` … `--space-10` bzw. die
   Padding-/Gap-Tiers setzen. Keine neuen `rem`/`px`-Literale für Margin,
   Padding oder Gap. Falls kein passender Wert existiert, die Skala hier im
   Styleguide bewusst erweitern statt lokal einen Einzelwert zu schreiben.
5. Radius/Schatten aus den bestehenden Tokens verwenden, keine neuen Werte
   erfinden.
