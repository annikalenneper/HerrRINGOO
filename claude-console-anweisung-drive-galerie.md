# Aufgabe: Google-Drive-Bildergalerie mit Auswahlfunktion in bestehendes Netlify-Projekt integrieren

## Kontext

Dies ist ein Netlify-Projekt (statische Seite, noch nicht live gehostet). Es soll eine Galerie implementiert werden, die Bilder aus einem Google-Drive-Ordner anzeigt und es Nutzer:innen erlaubt, einzelne Bilder auszuwählen. Die Auswahl soll an eine weitere Funktionalität (z. B. Verarbeitung/Speicherung der ausgewählten Bild-IDs) übergeben werden.

`netlify.toml` und Funktionsordner existieren ggf. noch nicht – bitte anlegen, falls nicht vorhanden.

## Architektur

```
Google Drive Ordner → Netlify Function (Drive API, Service Account) → Frontend-Galerie → Auswahl-Logik → zweite Netlify Function (Auswahl entgegennehmen)
```

Wichtig: Der Google-Service-Account-Key darf **niemals** im Frontend-Code oder Repo landen, ausschließlich über Netlify-Umgebungsvariablen.

## Zu erledigende Schritte

### 1. Projektstruktur ergänzen

```
netlify/
└── functions/
    ├── images.js
    └── select-images.js
```

`netlify.toml` so konfigurieren/ergänzen, dass `functions = "netlify/functions"` gesetzt ist und der bestehende `publish`-Pfad erhalten bleibt.

### 2. `package.json` und Dependency

Falls noch kein `package.json` existiert, eines anlegen (`npm init -y`) und `googleapis` als Dependency hinzufügen.

### 3. Function `netlify/functions/images.js`

- Nutzt einen Google Service Account (Credentials aus `process.env.GOOGLE_SERVICE_ACCOUNT_JSON`, als JSON geparst)
- Scope: `https://www.googleapis.com/auth/drive.readonly`
- Listet alle Bilddateien (`mimeType contains 'image/'`, `trashed = false`) aus dem Ordner `process.env.DRIVE_FOLDER_ID`
- Gibt `id`, `name`, `thumbnailLink` als JSON-Array zurück
- Setzt `Cache-Control: public, max-age=600`
- Fehlerbehandlung: bei API-Fehlern sauberen 500-Response mit Fehlermeldung zurückgeben (kein Absturz der Function)

### 4. Function `netlify/functions/select-images.js`

- Nimmt per POST eine Liste von Bild-IDs (und optional Metadaten) entgegen
- Validiert die Eingabe (Array von Strings, nicht leer)
- Platzhalter-Logik für die Weiterverarbeitung einbauen (z. B. Logging oder Rückgabe einer Bestätigung) mit einem klaren `// TODO:` Kommentar, wo die eigentliche Weiterverarbeitung (Speichern, Weiterleiten an anderen Dienst etc.) ergänzt werden soll
- Gibt bei Erfolg `{ received: [...ids] }` mit Status 200 zurück, bei ungültiger Eingabe Status 400

### 5. Frontend-Integration in `index.html` (bzw. bestehende Struktur)

- Grid-Container für die Galerie
- JS-Logik, die:
  - beim Laden `/.netlify/functions/images` aufruft und die Galerie rendert (Thumbnail pro Bild)
  - per Klick Bilder auswählbar macht (visuelles Toggle, z. B. CSS-Klasse `selected`)
  - die aktuelle Auswahl (Set von IDs) im State hält
  - einen Button/Trigger bereitstellt, der die aktuelle Auswahl per POST an `/.netlify/functions/select-images` sendet
- Einfaches, aber sauberes CSS für ein responsives Grid ergänzen, passend zum bestehenden Stil der Seite (bestehende Styles in `index.html` bzw. verlinktem CSS zuerst prüfen und Konventionen übernehmen)

### 6. Konfigurationsdateien

- `.env.example` anlegen mit den benötigten Variablen (ohne echte Werte):
  ```
  GOOGLE_SERVICE_ACCOUNT_JSON=
  DRIVE_FOLDER_ID=
  ```
- `.gitignore` prüfen/ergänzen, damit `.env` und ggf. lokale Service-Account-Dateien nicht versioniert werden

### 7. Testing

- Sicherstellen, dass sich das Projekt mit `netlify dev` lokal starten lässt und beide Functions über `/.netlify/functions/images` sowie `/.netlify/functions/select-images` erreichbar sind
- Kurz dokumentieren (z. B. in einer README-Sektion), welche Umgebungsvariablen für den lokalen Betrieb in `.env` benötigt werden

## Randbedingungen

- Kein Framework-Wechsel: bestehendes Setup (statisches HTML/JS) beibehalten, sofern nicht bereits ein Frontend-Framework im Projekt vorhanden ist – falls doch, an dessen Konventionen anpassen
- Keine Client-seitigen API-Keys oder Service-Account-Daten
- Code kommentieren, wo Setup-Schritte (Drive-Ordner-Freigabe an Service-Account-E-Mail, Netlify-Env-Variablen) außerhalb des Codes nötig sind
