# Posts

Hier lebt jeder einzelne Instagram-Post als eigene Markdown-Datei – von der ersten Ausarbeitung
bis zur Veröffentlichung. Der Ordner ist in vier Stufen unterteilt, die den Fortschritt eines
Posts abbilden:

| Ordner | Bedeutung |
|---|---|
| [`01-entwuerfe/`](01-entwuerfe/) | Post ist angelegt und in Arbeit, aber noch nicht fertig |
| [`02-bereit-zur-veroeffentlichung/`](02-bereit-zur-veroeffentlichung/) | Inhaltlich und mit Medien fertig, noch ohne festen Termin |
| [`03-warten-auf-veroeffentlichung/`](03-warten-auf-veroeffentlichung/) | Termin gesetzt ("Post einplanen"), wartet auf den geplanten Zeitpunkt |
| [`04-veroeffentlicht/`](04-veroeffentlicht/) | Bereits live auf Instagram – dient als Archiv |

Eine Post-Datei wandert einfach durch diese Ordner (verschieben, nicht kopieren), während sie den
Prozess durchläuft. Der Übergang von der dritten zur vierten Stufe passiert automatisch, sobald
der geplante Termin erreicht ist (siehe [`../netlify/README.md`](../netlify/README.md),
`publish-scheduled-posts-background.js`) - postet aber nichts wirklich auf Instagram, das bleibt
vorerst manuell. Der Status im
[`../planung/content-kalender.md`](../planung/content-kalender.md) wird dabei jeweils mit
aktualisiert.

## Neuen Post anlegen

1. [`_vorlage-post.md`](_vorlage-post.md) kopieren nach `01-entwuerfe/`.
2. Datei sinnvoll benennen (`kleinschreibung-mit-bindestrichen.md`), z. B.
   `making-of-ehering-juli.md`.
3. Frontmatter ausfüllen (Titel, Kategorie, geplantes Datum, Plattform, Status, Medien).
4. Caption im Hauptteil der Datei ausformulieren – ggf. mit Bausteinen aus
   [`../captions/`](../captions/README.md) starten.
5. Referenzierte Bilder/Videos in [`../planungs-webseite/medien/`](../planungs-webseite/medien/README.md)
   ablegen bzw. dort verlinken.

## Warum eine Datei pro Post?

So bleibt jeder Post eigenständig nachvollziehbar (inkl. Versionsverlauf über Git) und lässt sich
später 1:1 als einzelner Inhalt auf einer Website darstellen – die Frontmatter-Felder liefern
dafür bereits die nötigen Metadaten.
