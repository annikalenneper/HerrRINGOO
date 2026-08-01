# HerrRINGOO – Social Media Content Repository

Dieses Repository dient der **Planung, Erstellung und Ablage von Social-Media-Inhalten** für
**Herr RINGOO – das rollende Trauringstudio**. Im Fokus steht aktuell **Instagram**, die Struktur
ist aber bewusst so angelegt, dass sie sich auf weitere Plattformen erweitern lässt.

Der Inhalt (Ideen, Post-Texte, Frontmatter-Metadaten, Bild-/Videomaterial) liegt durchgehend in
strukturierten Markdown-Dateien bzw. referenzierten Mediendateien – so bleibt alles über Git
versioniert, nachvollziehbar und mit jedem Editor lesbar. Darüber hinaus enthält das Repository
mittlerweile auch ein **eigenes internes Tool** (`planungs-webseite/` + `netlify/functions/`,
als Netlify-Site deployt): eine kleine Weboberfläche, mit der das Team ohne Git-Kenntnisse
Bildmaterial durchsuchen, Posts (auch mit mehreren Bildern) erstellen und deren
Veröffentlichungs-Status pflegen kann. Details dazu in [`netlify/README.md`](netlify/README.md).

## Warum dieses Repository?

- **Ein zentraler Ort** für alle Ideen, Texte und Planungen rund um Social Media – nichts geht
  in Chat-Verläufen, Notiz-Apps oder losen Dokumenten verloren.
- **Nachvollziehbarkeit über Zeit**: Über die Git-Historie lässt sich jederzeit nachvollziehen,
  wann eine Idee entstanden ist, wie sich ein Post-Text entwickelt hat oder wann etwas
  veröffentlicht wurde.
- **Ein eigenes internes Tool statt loser Skripte**: Die unter `planungs-webseite/` gebaute
  Weboberfläche macht die strukturierten Inhalte für das ganze Team nutzbar, auch ohne dass
  jede:r direkt Markdown-Dateien bearbeiten oder mit Git umgehen können muss.

## Struktur im Überblick

| Ordner/Datei | Zweck |
|---|---|
| [`markenkommunikation-guide.md`](markenkommunikation-guide.md) | Guide zu Tonalität, Slogans/Catch-Phrases und SEO-Keywords der Marke (auch als Unterseite im Tool) |
| [`ideensammlung/`](ideensammlung/README.md) | Strukturierte Sammlung von Content-Ideen (Titel, Kategorie, Status, Beschreibung, Bebilderungs-Vorschlag), gepflegt über die "Ideensammlung"-Seite im internen Tool |
| [`kategorien/`](kategorien/README.md) | Definition der Post-Kategorien / Content-Säulen |
| [`planung/`](planung/README.md) | Redaktions-/Social-Media-Plan mit zeitlicher Übersicht |
| [`captions/`](captions/README.md) | Wiederverwendbare Textbausteine für Captions (Intros, CTAs, Hashtag-Sets) |
| [`posts/`](posts/README.md) | Einzelne Posts von der ersten Idee bis zur Veröffentlichung |
| [`planungs-webseite/`](netlify/README.md) | Internes Tool (Netlify-Site): Bildmaterial durchsuchen, Posts erstellen/planen/veröffentlichen. Enthält auch `planungs-webseite/medien/` – das Bild-/Videomaterial zu den Posts, hier statt auf Root-Ebene, damit Netlify es direkt als statische Datei ausliefern kann |
| [`netlify/`](netlify/README.md) | Serverless Functions hinter dem Tool (Google-Drive-Anbindung, Post-Erstellung/-Status per GitHub-API) |

## Typischer Ablauf eines Posts

1. **Idee sammeln** – ein Gedanke landet über die "Ideensammlung"-Seite im internen Tool in
   [`ideensammlung/ideen.json`](ideensammlung/README.md).
2. **Einordnen** – die Idee wird einer Kategorie aus [`kategorien/`](kategorien/README.md) zugeordnet.
3. **Einplanen** – ein Termin/Zeitraum wird im [`planung/content-kalender.md`](planung/content-kalender.md) eingetragen.
4. **Ausarbeiten** – entweder über das interne Tool ("Post erstellen": Bild(er) auswählen,
   Kategorie/Titel/Caption ausfüllen, Vorschau bestätigen – legt die Post-Datei automatisch an)
   oder manuell: aus der Vorlage [`posts/_vorlage-post.md`](posts/_vorlage-post.md) wird eine
   neue Post-Datei erstellt und in [`posts/01-entwuerfe/`](posts/01-entwuerfe/) abgelegt.
   Caption-Bausteine aus [`captions/`](captions/README.md) können dabei als Ausgangspunkt dienen.
5. **Fertigstellen** – ist der Post inhaltlich und mit Medien vollständig, wandert die Datei nach
   [`posts/02-bereit-zur-veroeffentlichung/`](posts/02-bereit-zur-veroeffentlichung/) (im Tool:
   "Als bereit markieren").
6. **Veröffentlichen** – nach der Veröffentlichung wandert die Datei zur Archivierung nach
   [`posts/03-veroeffentlicht/`](posts/03-veroeffentlicht/) (im Tool: "Als veröffentlicht
   markieren") und der Status im Kalender wird aktualisiert.

## Konventionen

- Alle Textinhalte werden in **Markdown (`.md`)** verfasst.
- Dateinamen durchgehend in **Kleinschreibung mit Bindestrichen** (`kundengeschichte-anna-tom.md`),
  keine Umlaute oder Leerzeichen – das erleichtert spätere technische Weiterverarbeitung.
- Jeder Post erhält einen **Metadaten-Kopf (Frontmatter)** am Dateianfang (siehe
  [`posts/_vorlage-post.md`](posts/_vorlage-post.md)) – das ist die Grundlage dafür, Inhalte später
  maschinell auswerten und auf einer Website darstellen zu können.
- Bild- und Videodateien selbst liegen (sofern sie versioniert werden) in
  [`planungs-webseite/medien/`](planungs-webseite/medien/README.md) und werden aus den
  Post-Dateien heraus referenziert, nicht dupliziert.

## Status dieses Repositories

Struktur, Vorlagen und Konventionen haben sich seit dem Start bewährt und werden weiter im Team
verfeinert, sobald sich in der Praxis zeigt, was gut funktioniert und was angepasst werden
sollte. Darauf aufbauend gibt es inzwischen das interne Tool (`planungs-webseite/` +
`netlify/`), das den Umgang mit diesen Inhalten für das Team spürbar vereinfacht – die
Markdown-Struktur bleibt dabei die Grundlage, nicht nur eine Zwischenlösung.
