# Plan: Echtes Veröffentlichen auf Instagram + zeitgesteuertes Auto-Publish

**Status: zurückgestellt.** Die Meta-App/Entwicklerkonto-Einrichtung ist verschoben. Bis dahin
bleibt `publish-post.js` wie bisher: rein manuelles Setzen von `status: veroeffentlicht` +
`datum_veroeffentlicht`, ohne echten Instagram-Aufruf. Dieser Plan beschreibt die spätere
Implementierung, sobald die Meta-App steht.

## Kontext

Heute ist "Als veröffentlicht markieren" (`publish-post.js`) rein kosmetisch: die Function
verschiebt die Markdown-Datei von `posts/02-bereit-zur-veroeffentlichung/` nach
`posts/03-veroeffentlicht/` und setzt `status`/`datum_veroeffentlicht` – sie ruft nie
Instagram auf. Das Team postet den Inhalt bisher manuell in der Instagram-App und markiert
den Post hier nur nachträglich als erledigt. Ziel dieses Plans: die Function ruft echt die
Instagram Graph API (Content Publishing) auf, und "Post einplanen" führt tatsächlich zu einem
automatischen Post zur geplanten Zeit, statt nur ein Datum im Frontmatter zu speichern.

**Wichtige Rahmenbedingungen (recherchiert/bestätigt):**
- Das Projekt bedient nur den eigenen Instagram-Account des Teams → **Standard Access**
  genügt vollständig (kein App Review, keine Business Verification nötig), solange der
  Account über eine Rolle auf der Meta-App verknüpft ist.
- Setup außerhalb des Codes (einmalig, manuell): Meta-App anlegen → Produkt "Instagram → API
  setup with Instagram login" (Business Login for Instagram, kein Facebook-Page-Zwang) →
  Account mit Rolle verknüpfen → Access Token mit `instagram_business_basic` +
  `instagram_business_content_publish` erzeugen → gegen long-lived Token (60 Tage) tauschen.
  Dieser long-lived Token muss **manuell alle ~50 Tage erneuert** werden (kein automatisches
  Rotieren in diesem Plan – siehe Nicht-Ziele).
- Instagram bietet **kein natives zeitversetztes Veröffentlichen** für normale Feed-Posts (nur
  für bezahlte Ads) – das eingeplante Datum muss von einem eigenen wiederkehrenden Job
  ausgewertet werden.
- Entscheidung: Scheduling per **GitHub Actions Cron, 15-Minuten-Takt** (kein Netlify-Pro-Plan
  nötig, kein neuer externer Anbieter, Ungenauigkeit von bis zu 15 Minuten ist ausdrücklich
  okay).
- Entscheidung: Der bestehende "Jetzt veröffentlichen"-Button bleibt zusätzlich zum
  automatischen Zeitplan erhalten (sofortiges manuelles Publizieren möglich).
- `medien/`-Dateien sind bereits öffentlich über HTTPS erreichbar (`planungs-webseite` ist
  Netlify-Publish-Root), das erfüllt Instagrams Anforderung an eine öffentlich abrufbare
  Bild-URL ohne zusätzliche Hosting-Änderung.
- Scope: nur Feed-Posts (Einzelbild + Carousel), kein Video/Reels.

## Neue Umgebungsvariable

- `INSTAGRAM_ACCESS_TOKEN` – long-lived Instagram User Access Token (Standard-Konvention wie
  `GITHUB_TOKEN`/`CREATE_POST_SECRET`: in `.env.example` und Netlify-Site-Settings, dokumentiert
  in `netlify/README.md`). Kein separates `INSTAGRAM_BUSINESS_ACCOUNT_ID` nötig – die API
  nutzt durchgängig den `/me`-Alias, der sich über den Token selbst auflöst.
- `CREATE_POST_SECRET` wird wiederverwendet, um den neuen Scheduling-Endpunkt abzusichern
  (zusätzlich als GitHub-Actions-Repository-Secret hinterlegt, gleicher Wert wie in Netlify –
  manuell synchron halten, kein neues Secret nötig).

## Änderungen im Detail

### 1. `netlify/functions/lib/instagram.js` (neu)

Dünner Wrapper analog zu `lib/github.js` (natives `fetch`, kein SDK), Basis-URL
`https://graph.instagram.com`:
- `createImageContainer({ imageUrl, caption, isCarouselItem })` → `POST /me/media`
- `createCarouselContainer({ childrenIds, caption })` → `POST /me/media` mit
  `media_type=CAROUSEL`, `children=[...]`
- `getContainerStatus(containerId)` → `GET /{container-id}?fields=status_code`
- `waitForContainerReady(containerId, { timeoutMs = 20000, intervalMs = 2000 })` – pollt bis
  `FINISHED`, wirft bei `ERROR`/`EXPIRED` oder Zeitüberschreitung (Netlify-Zeitlimit-Risiko,
  gleiches Muster wie schon bei der Bildkompression beachtet)
- `publishContainer(containerId)` → `POST /me/media_publish` mit `creation_id`, liefert die
  echte Instagram-Media-ID zurück

### 2. `netlify/functions/lib/instagram-publish.js` (neu, geteilte Kernlogik)

`publishPostToInstagram(content)` – nimmt den rohen Markdown-Inhalt einer Post-Datei (wie ihn
`getFile(...).content.toString('utf8')` liefert), wird sowohl vom manuellen
Button-Endpunkt als auch vom Scheduling-Job genutzt (keine Duplikation):
1. Validiert, dass alle `medien`-Pfade auf `.jpg`/`.jpeg` enden (Instagram Content Publishing
   verlangt JPEG) – klare deutsche Fehlermeldung, falls nicht (betrifft z. B. manuell
   angelegte Entwürfe mit `.png`).
2. Baut öffentliche Bild-URLs aus `process.env.URL` (von Netlify zur Laufzeit bereitgestellt,
   zeigt auf die Produktions-URL) + `medien`-Pfad.
3. Baut den Caption-Text über `extractCaption` aus `lib/posts.js` (bereits vorhanden, von
   `post-data.js` wiederverwendet).
4. Einzelbild → `createImageContainer` → `waitForContainerReady` → `publishContainer`.
   Mehrere Bilder → je Bild `createImageContainer({ isCarouselItem: true })` →
   `waitForContainerReady` je Kind → `createCarouselContainer` → `waitForContainerReady` →
   `publishContainer`.
5. Gibt `{ instagramMediaId }` zurück oder wirft mit klarer Fehlermeldung.

### 3. `netlify/functions/publish-post.js` (erweitern, nicht ersetzen)

Vor dem bestehenden `moveFile`-Aufruf: `publishPostToInstagram(content)` aufrufen. Bei Erfolg
`instagram_media_id` zusätzlich ins Frontmatter schreiben (zu den bisherigen
`status`/`datum_veroeffentlicht`-Updates). Bei Fehler: Response mit Fehler zurückgeben, ohne
die Git-Datei anzufassen (sicher wiederholbar). Bleibt der Endpunkt für den manuellen "Jetzt
veröffentlichen"-Button.

### 4. `netlify/functions/publish-scheduled-posts-background.js` (neu, Background Function)

Netlify-Background-Function (`-background`-Suffix → bis zu 15 Min. Laufzeit statt der
Standard-10-26s, wichtig da mehrere fällige Posts nacheinander mit Polling verarbeitet werden
können):
1. Prüft `secret` im Body gegen `CREATE_POST_SECRET` (`checkSecret`, wie überall sonst auch).
2. `listMarkdownFiles('posts/02-bereit-zur-veroeffentlichung/')` + `getFile` je Datei (beide
   bereits vorhanden in `lib/github.js`).
3. Filtert Posts, deren `datum_geplant` (ISO `JJJJ-MM-TTThh:mm`) ≤ jetzt ist. Achtung:
   `datum_geplant` ist eine naive Wanduhrzeit ohne Zeitzone (aus einem
   `<input type="datetime-local">`), faktisch Europe/Berlin – "jetzt" muss für den Vergleich
   ebenfalls als Europe/Berlin-Ortszeit gebildet werden (z. B. über
   `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', ... })`), sonst entsteht durch
   den UTC-Betrieb von Netlify Functions ein systematischer 1–2-Stunden-Versatz.
4. Verarbeitet fällige Posts **sequentiell** (nicht parallel – vermeidet Ratenlimit-Probleme
   und konkurrierende Git-Schreibzugriffe): ruft dieselbe `publishPostToInstagram` +
   `moveFile`-mit-Status-Update-Logik wie `publish-post.js` auf, mit `datum_veroeffentlicht`
   = tatsächlicher Zeitpunkt (nicht mehr manuell eingegeben).
5. Fehler-Isolation: schlägt ein Post fehl (z. B. falsches Bildformat), wird das geloggt und
   der nächste fällige Post trotzdem verarbeitet, statt den ganzen Batch abzubrechen.

### 5. `.github/workflows/publish-scheduled-posts.yml` (neu)

```yaml
name: Publish scheduled Instagram posts

on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch: {}

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scheduled Instagram publish
        run: |
          curl -sf -X POST "${{ vars.NETLIFY_SITE_URL }}/.netlify/functions/publish-scheduled-posts-background" \
            -H "Content-Type: application/json" \
            -d "{\"secret\":\"${{ secrets.CREATE_POST_SECRET }}\"}"
```

`workflow_dispatch` zusätzlich für manuelles Testen ohne auf den nächsten Cron-Tick zu warten.
Einmaliges manuelles Setup: `CREATE_POST_SECRET` als Repository-Secret und `NETLIFY_SITE_URL`
(z. B. `https://herr-ringoo.netlify.app`, ohne abschließenden Slash) als Repository-Variable
unter GitHub Settings → Secrets and variables → Actions anlegen.

### 6. Frontmatter/Vorlage

`posts/_vorlage-post.md`: neues Feld `instagram_media_id: ""` ergänzen (rein informativ/zur
Nachvollziehbarkeit, keine Logik liest dieses Feld).

### 7. Doku

`.env.example`: `INSTAGRAM_ACCESS_TOKEN=` ergänzen. `netlify/README.md`: neuer Abschnitt zum
Instagram-Setup (Standard-Access-Schritte, Token-Erzeugung, manuelle 60-Tage-Erneuerung) sowie
Hinweis auf das zusätzliche GitHub-Actions-Secret/-Variable.

## Nicht-Ziele

- Kein Video-/Reels-Support – nur Feed-Posts (Einzelbild + Carousel).
- Keine automatische Token-Erneuerung – bleibt eine dokumentierte manuelle Aufgabe (~alle
  50 Tage), da eine Automatisierung ein zusätzliches Netlify-API-Credential bräuchte, das für
  diese Häufigkeit nicht gerechtfertigt ist.
- Kein Facebook-Login-Pfad – ausschließlich Business Login for Instagram (passt zum
  Standard-Access-Eigenaccount-Fall).
- Keine Sub-Minuten-Präzision beim Scheduling – 15-Minuten-Takt ist ausreichend.
- Kein Parallel-Publishing mehrerer fälliger Posts – bewusst sequentiell wegen
  Ratenlimit/Schreibkonflikten.

## Voraussetzung zum Start dieser Implementierung

1. Meta-Entwicklerkonto + App anlegen (siehe Kontext oben).
2. Instagram-Account mit App-Rolle verknüpfen, long-lived Access Token erzeugen.
3. `INSTAGRAM_ACCESS_TOKEN` in Netlify hinterlegen.
4. Erst dann: Umsetzung der obigen Punkte 1–7.

## Verifikation (bei Umsetzung)

- `node --check` für alle neuen/geänderten Function-Dateien.
- Manueller Endpunkt: Entwurf mit echtem kleinem JPEG anlegen, einplanen, über "Jetzt
  veröffentlichen" sofort auslösen – prüfen, dass der Post wirklich auf Instagram erscheint,
  die Datei nach `posts/03-veroeffentlicht/` verschoben wurde und `instagram_media_id` gesetzt
  ist.
- Scheduling: Post auf ~5 Minuten in der Zukunft einplanen, Workflow per `workflow_dispatch`
  manuell auslösen (nicht auf den nächsten Cron-Tick warten), gleiche Prüfung wie oben.
- Carousel-Fall mit 2–3 Bildern testen.
- PNG-Guard testen: Entwurf mit `.png`-Bildreferenz auslösen, prüfen dass die Fehlermeldung
  klar benennt, welche Datei betroffen ist, und die Git-Datei unverändert bleibt.
- Fehlerfall (z. B. abgelaufener Token) testen: prüfen, dass die Git-Datei nicht verschoben/
  verändert wird, damit ein Retry sicher ist.
