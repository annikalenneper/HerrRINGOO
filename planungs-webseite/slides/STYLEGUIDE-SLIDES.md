# Styleguide – Instagram-Slides (Wissens-Posts)

Gilt für alle Karussell-Folien der Wissens-Posts (z. B. Kategorie *Materialkunde*). Technische
Umsetzung: [`slides.css`](slides.css). Schriften und Farben stammen aus dem Styleguide der
Planungsseite ([`../STYLEGUIDE.md`](../STYLEGUIDE.md)) bzw. von herr-ringoo.de.

**Leitidee:** Ein Post ist ein Poster, keine Webseite. Große Typografie, zentriert, wenige
Elemente. Keine Web-Bausteine wie Buttons, Pills, Trennlinien oder Navigationsleisten.

## 1. Inhalt – feste Regeln

- **Texte werden wortgleich übernommen.** Nichts kürzen, umformulieren oder ergänzen. Wer am Text
  etwas verbessern möchte, macht einen **Vorschlag**, der freigegeben werden muss.
- Erlaubte Zusätze ohne Freigabe:
  - die **Kategorie** oben (z. B. „Materialkunde“, auf einer Tipp-Folie „Unser Tipp“)
  - das **Hervorheben einzelner Wörter in Gold** (z. B. „schneller.“, „in einem Ring“)
- **Nicht** einbauen: Call-to-Action-Zeilen („Jetzt Beratung buchen“), „Wischen →“,
  Stichwort-Listen, Foliennummern, zusätzliche Überschriften, die nicht freigegeben sind.
- **Fett im Fließtext wird nicht verwendet.** Hervorhebungen nur über Gold.
- **Keine KI-generierten Bilder** (Kennzeichnungspflicht). Code-/vektorgezeichnete Grafiken wären
  rechtlich unproblematisch, werden aktuell aber nicht verwendet.

## 2. Format & Hintergrund

- **Format:** 1080 × 1350 px (Instagram-Hochformat 4:5), Export als JPG (Qualität 92).
- **Hintergründe:** `medien/bg/bg-white-font-black/1.png` bis `8.png`. Weißer Himmel, schwarze
  Bergsilhouette unten mit dem Logo. Pro Post werden fünf verschiedene Hintergründe verwendet,
  über die Posts hinweg reihum (siehe Tabelle unten).
- Der **untere Teil ist schwarz**. Inhalt steht ausschließlich im oberen weißen Bereich, **nicht
  mittig auf der ganzen Kachel**.

### Sicherer Textbereich je Hintergrund

Der Textbereich reicht von 152 px (unter der Kategorie) bis **138 px über den höchsten Punkt
der Silhouette**. Der Inhalt wird innerhalb dieses Bereichs vertikal zentriert. Dadurch sind die
Abstände nach oben und unten optisch ausgeglichen.

| Hintergrund | Schwarz beginnt bei | Textbereich endet bei (`--safe-bottom`) |
|---|---|---|
| 1 | 912 px | 774 px |
| 2 | 964 px | 826 px |
| 3 | 980 px | 842 px |
| 4 | 961 px | 823 px |
| 5 | 949 px | 811 px |
| 6 | 947 px | 809 px |
| 7 | 982 px | 844 px |
| 8 | 971 px | 833 px |

In der HTML-Vorschau zeigt „Sicheren Textbereich anzeigen“ diesen Bereich als gestrichelten
Rahmen. Ragt Inhalt aus diesem Bereich (z. B. weil ein Text zu lang ist), wird die Folie in der
Vorschau **rot umrandet**, und `render-slides.ps1` bricht ab, ohne JPGs zu erzeugen. Dann den Text
nicht kürzen, sondern eine passende Textgröße wählen (z. B. `.p-text.small`) oder einen
Kürzungs-Vorschlag zur Freigabe machen.

### Invertierte Serie (`bg-black-font-white/`)

Hintergründe mit weißem Himmel oben und großer schwarzer Fläche, Logo unten. Klassen `.ibg1` bis
`.ibg8` statt `.bg1` bis `.bg8`. Die Farben stellen sich damit automatisch um.

- **Inhalt im schwarzen Bereich:** ab 96 px unter dem tiefsten Punkt des weißen Himmels bis
  1039 px (176 px über dem Logo, das bei 1215 px beginnt). Der Inhalt wird darin vertikal zentriert
  und sitzt damit bewusst etwas über der Mitte der schwarzen Fläche.
- **Farben:** Titel Weiß, Fließtext gebrochenes Weiß `#e5e6e9`, Hervorhebungen und Raute im helleren
  Gold `#c8aa6d`. `#a9884c` hätte auf Schwarz zu wenig Kontrast.
- **Kategorie** steht **nicht** im weißen Himmel, sondern als erstes Element im Inhalt: in Gold,
  48 px über dem Titel bzw. Text. Im HTML steht `<p class="kicker">` dafür **innerhalb** von
  `<div class="content">`.

| Hintergrund | Weiß reicht bis | Höchste Spitze | Textbereich beginnt bei (`--safe-top`) |
|---|---|---|---|
| 1 | 309 px | 112 px | 405 px |
| 2 | 290 px | 162 px | 386 px |
| 3 | 310 px | 180 px | 406 px |
| 4 | 303 px | 162 px | 399 px |
| 5 | 279 px | 146 px | 375 px |
| 6 | 283 px | 146 px | 379 px |
| 7 | 316 px | 182 px | 412 px |
| 8 | 302 px | 169 px | 398 px |

Ein Post nutzt durchgängig **eine** Serie, hell oder invertiert, nicht gemischt.

## 3. Typografie

Kein `letter-spacing`. Versalien über `text-transform: uppercase`. Alles **zentriert**.

| Rolle | Klasse | Schrift | Größe | Farbe |
|---|---|---|---|---|
| Kategorie oben (fix, s. Abstände) | `.kicker` | Open Sans Condensed 700, Versalien | 32 px | Gold dunkel |
| Cover-Titel, gestapelt | `.p-xl` | Open Sans Condensed 700, Versalien | 124 px | Schwarz bzw. Gold |
| Verbindungswort im Cover („oder“) | `.p-oder` | Josefin Sans 600, Versalien | 54 px | Gold dunkel |
| Große Aussage | `.p-big` | Open Sans Condensed 700, Versalien | 112 px | Schwarz |
| Thema-Titel (z. B. „Weißgold“) | `.p-title` | Josefin Sans 600, Versalien | 116 px | Schwarz |
| Fließtext unter Titel | `.p-text` | Open Sans Condensed 300 | 52 px (lang: 48 px, `.small`) | Fast-Schwarz |
| Reine Text-Folie / Unterzeile | `.p-sub` | Open Sans Condensed 300 | 62 px | Fast-Schwarz |
| Trenner | `.dia` | Raute (Fläche) | 20 × 20 px | Gold |
| Hervorhebung | `.g` | – | – | Gold dunkel |

### Zeilenumbrüche und Titelschrift

Titel brechen ausgewogen um (`text-wrap: balance`), Fließtext vermeidet einzelne Wörter in der
letzten Zeile (`text-wrap: pretty`). Manuelle Umbrüche (`<br>`) nur in Cover-Titeln, wenn der
zweite Teil farbig hervorgehoben wird (z. B. „Vom Material / zum Trauring“).

Längere Titel (mehr als ca. 10 Zeichen, z. B. „1 · Die Legierung“, „Carat · Gewicht“) stehen in
Open Sans Condensed (`.p-big`). Josefin Sans (`.p-title`) bleibt kurzen, prägnanten Titeln
vorbehalten (z. B. „Weißgold“), wie auf herr-ringoo.de.

## 4. Abstände

**8er-Raster:** Alle Abstände sind Vielfache von 8 px und als Tokens in `slides.css` definiert
(`--space-2` = 16 px, `--space-4` = 32 px, `--space-6` = 48 px, `--space-10` = 80 px,
`--space-19` = 152 px). Neue Einzelwerte werden nicht eingeführt.

**Abstände sind sichtbare Abstände.** Alle Textblöcke werden per
`text-box: trim-both cap alphabetic` auf Versalhöhe und Grundlinie beschnitten. Ein Margin von
32 px ist damit auch optisch 32 px zwischen den Buchstaben und keine leere Schriftbox. Die
Raute ist eine Fläche (20 × 20 px), ihre Box entspricht ihrer sichtbaren Größe.

| Abstand | Token | Wert |
|---|---|---|
| Kategorie: Oberkante Versalien | `--space-10` | 80 px vom oberen Rand |
| Textbereich: Innenabstand oben / seitlich | `--space-19` / `--space-10` | 152 px / 80 px |
| Cover-Titel ↔ „oder“ ↔ Cover-Titel | `--space-4` | 32 px |
| Titel/Aussage ↔ Raute ↔ Text | `--space-6` | 48 px |

**Optischer Ausgleich bei „oder“:** Komma, Akzente oder Unterlängen ragen über die
Versalhöhe bzw. Grundlinie hinaus und würden den Abstand optisch verkleinern. Das gleicht `slides.js` **automatisch** aus, man muss nichts von Hand setzen.
Intern werden dafür zwei Klassen am „oder“ gesetzt:

- `.after-comma`: Die Zeile darüber hat ein Komma oder eine Unterlänge (z. B. „GELB, WEISS“) → +16 px oben
- `.before-accent`: Die Zeile darunter hat einen Akzent (z. B. „ROSÉ“) → +24 px unten

Gemessen am gerenderten Bild: rund 30 px sichtbar um „oder“ und rund 48 px um die Raute, bei
allen Folien höchstens ±3 px Abweichung durch die Schriftform.

## 5. Farben

| Token | Hex | Verwendung |
|---|---|---|
| `--gray-950` | `#17181a` | Titel |
| `--gray-900` | `#212226` | Fließtext |
| `--gold-dark` | `#a9884c` | Text in Gold (Kategorie, Hervorhebungen, „oder“) |
| `--gold` | `#c8aa6d` | nur der Trenner ◆ |

Gold ist Akzent, nie Fläche.

## 6. Folientypen

1. **Cover:** Titel (gestapelt mit „oder“ oder als große Aussage, ein Teil in Gold) → ◆ →
   Unterzeile.
2. **Aussage:** große Versal-Aussage → ◆ → Unterzeile, ggf. ein Wort in Gold.
3. **Thema:** Thema-Titel in Josefin Sans → ◆ → Fließtext.
4. **Reine Text-Folie:** nur Fließtext in groß (`.p-sub`).
5. **Tipp-Folie:** Kategorie „Unser Tipp“ + freigegebene Überschrift → ◆ → Fließtext.

## 7. Arbeitsablauf

1. HTML-Datei pro Post in `planungs-webseite/slides/` anlegen (Dateiname = Post-Slug, z. B.
   `26-08-bicolor.html`), bestehende Datei als Vorlage kopieren, Text wortgleich einsetzen.
2. Im Browser prüfen (`slides/index.html` listet alle Posts).
3. JPGs erzeugen. Sie landen direkt unter `medien/post-folien/<slug>-<n>.jpg` und überschreiben
   die vorhandenen Folien des Posts:
   ```
   powershell -ExecutionPolicy Bypass -File planungs-webseite\slides\render-slides.ps1 26-08-bicolor
   ```
   Ohne Argument werden alle Posts im Ordner gerendert. Benötigt Edge oder Chrome.
4. Die Dateinamen entsprechen dem `medien`-Feld im Frontmatter des Posts, dort muss nichts
   angepasst werden.

### Bisherige Zuordnung der Hintergründe

| Post | Folien 1–5 |
|---|---|
| 26-08-platin-weissgold | 1, 2, 3, 4, 5 |
| 26-08-goldfarben | 6, 7, 8, 1, 2 |
| 26-08-bicolor | 3, 4, 5, 6, 7 |
| 26-08-gebrauchsspuren | 8, 1, 2, 3, 4 |
| 26-08-ring-entsteht | 5, 6, 7, 8, 1 |
| 26-08-die-4c | 2, 3, 4, 5, 6 |
| 26-08-empfindliche-haut (invertiert) | i1, i2, i3, i4, i5 |
| nächster Post (hell) | 7, 8, 1, 2, 3 |
| nächster Post (invertiert) | i6, i7, i8, i1, i2 |
