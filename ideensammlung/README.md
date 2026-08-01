# Ideensammlung

Freie Sammlung von Content-Ideen, bevor sie zu einem ausgearbeiteten Post werden. Wird
ausschließlich über die "Ideensammlung"-Seite im internen Tool
(`planungs-webseite/ideensammlung.html`) gepflegt - nicht von Hand editieren, die Datei wird bei
jeder Aktion im Tool automatisch neu geschrieben.

## Datenformat

`ideen.json` ist ein Array von Objekten:

| Feld | Bedeutung |
|---|---|
| `id` | Eindeutige, automatisch vergebene ID (`idea-<timestamp>`) |
| `titel` | Kurzer Titel der Idee |
| `kategorie` | Kürzel aus [`../kategorien/kategorien.json`](../kategorien/kategorien.json) - dieselbe Kategorie-Liste wie bei Posts, neue Kategorien lassen sich direkt beim Anlegen einer Idee ergänzen |
| `status` | `neu` \| `verfeinert` \| `umgesetzt`, frei änderbar |
| `beschreibung` | Freitext-Beschreibung der Idee |
| `bebilderung` | Optionaler Text-Vorschlag zur Bebilderung (kein Bild-Upload, nur eine Notiz) |
| `erstellt_am` / `aktualisiert_am` | ISO-Zeitstempel |

Wird eine Idee ausgearbeitet, entsteht daraus ganz normal ein neuer Post über "Post erstellen"
(siehe [`../posts/README.md`](../posts/README.md)); die Idee selbst wird dann im Tool auf
`umgesetzt` gesetzt oder gelöscht.
