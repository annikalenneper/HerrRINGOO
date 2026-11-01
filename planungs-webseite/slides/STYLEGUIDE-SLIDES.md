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

Der Textbereich reicht von 150 px (unter der Kategorie) bis ca. **90 px über den höchsten Punkt
der Silhouette**. Der Inhalt wird innerhalb dieses Bereichs vertikal zentriert. Dadurch sind die
Abstände nach oben und unten optisch ausgeglichen.

| Hintergrund | Schwarz beginnt bei | Textbereich endet bei (`--safe-bottom`) |
|---|---|---|
| 1 | 912 px | 822 px |
| 2 | 964 px | 874 px |
| 3 | 980 px | 890 px |
| 4 | 961 px | 871 px |
| 5 | 949 px | 859 px |
| 6 | 947 px | 857 px |
| 7 | 982 px | 892 px |
| 8 | 971 px | 881 px |

In der HTML-Vorschau zeigt „Sicheren Textbereich anzeigen“ diesen Bereich als gestrichelten
Rahmen.

## 3. Typografie

Kein `letter-spacing`. Versalien über `text-transform: uppercase`. Alles **zentriert**.

| Rolle | Klasse | Schrift | Größe | Farbe |
|---|---|---|---|---|
| Kategorie oben (fix bei 72 px) | `.kicker` | Open Sans Condensed 700, Versalien | 32 px | Gold dunkel |
| Cover-Titel, gestapelt | `.p-xl` | Open Sans Condensed 700, Versalien | 124 px | Schwarz bzw. Gold |
| Verbindungswort im Cover („oder“) | `.p-oder` | Josefin Sans 600, Versalien | 54 px | Gold dunkel |
| Große Aussage | `.p-big` | Open Sans Condensed 700, Versalien | 112 px | Schwarz |
| Thema-Titel (z. B. „Weißgold“) | `.p-title` | Josefin Sans 600, Versalien | 116 px | Schwarz |
| Fließtext unter Titel | `.p-text` | Open Sans Condensed 300 | 52 px (lang: 48 px, `.small`) | Fast-Schwarz |
| Reine Text-Folie / Unterzeile | `.p-sub` | Open Sans Condensed 300 | 62 px | Fast-Schwarz |
| Trenner | `.dia` | Zeichen ◆ | 30 px | Gold |
| Hervorhebung | `.g` | – | – | Gold dunkel |

## 4. Farben

| Token | Hex | Verwendung |
|---|---|---|
| `--gray-950` | `#17181a` | Titel |
| `--gray-900` | `#212226` | Fließtext |
| `--gold-dark` | `#a9884c` | Text in Gold (Kategorie, Hervorhebungen, „oder“) |
| `--gold` | `#c8aa6d` | nur der Trenner ◆ |

Gold ist Akzent, nie Fläche.

## 5. Folientypen

1. **Cover:** Titel (gestapelt mit „oder“ oder als große Aussage, ein Teil in Gold) → ◆ →
   Unterzeile.
2. **Aussage:** große Versal-Aussage → ◆ → Unterzeile, ggf. ein Wort in Gold.
3. **Thema:** Thema-Titel in Josefin Sans → ◆ → Fließtext.
4. **Reine Text-Folie:** nur Fließtext in groß (`.p-sub`).
5. **Tipp-Folie:** Kategorie „Unser Tipp“ + freigegebene Überschrift → ◆ → Fließtext.

## 6. Arbeitsablauf

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
| nächster Post | 8, 1, 2, 3, 4 |
