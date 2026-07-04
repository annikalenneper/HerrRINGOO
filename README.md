# HerrRINGOO – Social Media Content Repository

Dieses Repository dient der **Planung, Erstellung und Ablage von Social-Media-Inhalten** für
**Herr RINGOO – das rollende Trauringstudio**. Im Fokus steht aktuell **Instagram**, die Struktur
ist aber bewusst so angelegt, dass sie sich auf weitere Plattformen erweitern lässt.

> **Wichtig:** Dies ist **kein Coding-Projekt**. Es gibt keinen Code und keine Anwendung – nur
> Text- und Planungsdateien im Markdown-Format (`.md`). Diese Wahl ist bewusst: Markdown-Dateien
> lassen sich später ohne Umwege in eine Website oder ein CMS überführen, sind aber schon heute
> einfach mit jedem Editor oder direkt auf GitHub lesbar und bearbeitbar.

## Warum dieses Repository?

- **Ein zentraler Ort** für alle Ideen, Texte und Planungen rund um Social Media – nichts geht
  in Chat-Verläufen, Notiz-Apps oder losen Dokumenten verloren.
- **Nachvollziehbarkeit über Zeit**: Über die Git-Historie lässt sich jederzeit nachvollziehen,
  wann eine Idee entstanden ist, wie sich ein Post-Text entwickelt hat oder wann etwas
  veröffentlicht wurde.
- **Vorbereitung auf eine spätere Website**: Da alles in strukturierten `.md`-Dateien vorliegt,
  können Inhalte später (z. B. über einen Generator oder ein einfaches Skript) automatisiert auf
  einer Website dargestellt werden – ohne dass die Inhalte selbst umgeschrieben werden müssen.

## Struktur im Überblick

| Ordner | Zweck |
|---|---|
| [`ideensammlung/`](ideensammlung/README.md) | Freie Sammlung von Content-Ideen, Rohgedanken, Inspiration |
| [`kategorien/`](kategorien/README.md) | Definition der Post-Kategorien / Content-Säulen |
| [`planung/`](planung/README.md) | Redaktions-/Social-Media-Plan mit zeitlicher Übersicht |
| [`captions/`](captions/README.md) | Wiederverwendbare Textbausteine für Captions (Intros, CTAs, Hashtag-Sets) |
| [`posts/`](posts/README.md) | Einzelne Posts von der ersten Idee bis zur Veröffentlichung |
| [`medien/`](medien/README.md) | Ablage/Referenz für Bild- und Videomaterial zu den Posts |

## Typischer Ablauf eines Posts

1. **Idee sammeln** – ein Gedanke landet in [`ideensammlung/ideenpool.md`](ideensammlung/ideenpool.md).
2. **Einordnen** – die Idee wird einer Kategorie aus [`kategorien/`](kategorien/README.md) zugeordnet.
3. **Einplanen** – ein Termin/Zeitraum wird im [`planung/content-kalender.md`](planung/content-kalender.md) eingetragen.
4. **Ausarbeiten** – aus der Vorlage [`posts/_vorlage-post.md`](posts/_vorlage-post.md) wird eine
   neue Post-Datei erstellt und in [`posts/01-entwuerfe/`](posts/01-entwuerfe/) abgelegt. Caption-Bausteine
   aus [`captions/`](captions/README.md) können dabei als Ausgangspunkt dienen.
5. **Fertigstellen** – ist der Post inhaltlich und mit Medien vollständig, wandert die Datei nach
   [`posts/02-bereit-zur-veroeffentlichung/`](posts/02-bereit-zur-veroeffentlichung/).
6. **Veröffentlichen** – nach der Veröffentlichung wandert die Datei zur Archivierung nach
   [`posts/03-veroeffentlicht/`](posts/03-veroeffentlicht/) und der Status im Kalender wird aktualisiert.

## Konventionen

- Alle Textinhalte werden in **Markdown (`.md`)** verfasst.
- Dateinamen durchgehend in **Kleinschreibung mit Bindestrichen** (`kundengeschichte-anna-tom.md`),
  keine Umlaute oder Leerzeichen – das erleichtert spätere technische Weiterverarbeitung.
- Jeder Post erhält einen **Metadaten-Kopf (Frontmatter)** am Dateianfang (siehe
  [`posts/_vorlage-post.md`](posts/_vorlage-post.md)) – das ist die Grundlage dafür, Inhalte später
  maschinell auswerten und auf einer Website darstellen zu können.
- Bild- und Videodateien selbst liegen (sofern sie versioniert werden) in [`medien/`](medien/README.md)
  und werden aus den Post-Dateien heraus referenziert, nicht dupliziert.

## Status dieses Repositories

Dies ist die **Grundstruktur** – eine solide, gemeinsam geprüfte Ausgangsbasis. Ordner, Vorlagen
und Konventionen können und sollen im Team weiter verfeinert werden, sobald sich in der Praxis
zeigt, was gut funktioniert und was angepasst werden sollte.
