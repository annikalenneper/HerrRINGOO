# Netlify Functions – lokales Setup

- `images.js` bindet die Google-Drive-Ordner aus
  [`../planungs-webseite/medien/README.md`](../planungs-webseite/medien/README.md) in den
  Bild-Schritt des "Post erstellen"-Wizards (`planungs-webseite/post-erstellen.html`, angezeigt
  als "Instagram-Content verwalten") ein.
  Unterstützt Paging über die Query-Parameter `pageToken`/`pageSize` (Antwortform:
  `{ images, nextPageToken }`) für den dortigen "Mehr laden"-Button. Sonderfall
  `?folder=uploads`: listet stattdessen direkt `planungs-webseite/medien/uploads/` über die
  GitHub-API (kein Drive-Ordner, siehe `upload-image.js`), ohne Paging.
- `upload-image.js` nimmt ein direkt vom Gerät hochgeladenes Bild entgegen (Base64 im Body),
  komprimiert es über dieselbe `lib/compress-image.js`-Funktion wie `create-post.js` und
  committet es nach `planungs-webseite/medien/uploads/`. Team-Passwort-geschützt wie alle
  schreibenden Functions. Erscheint danach über `images.js` (`folder=uploads`) im Bild-Schritt.
- `post-data.js` liest die Post-Entwürfe aus [`../posts/`](../posts/README.md) (Frontmatter +
  Caption) für die Instagram-Vorschau auf `planungs-webseite/post-erstellen.html`. Sortiert nach
  `erstellt_am` absteigend (neueste zuerst); Posts ohne dieses Feld (Altbestand von vor dessen
  Einführung) landen ans Ende, untereinander alphabetisch nach Dateiname. Heißt bewusst
  nicht `posts.js` – Netlifys Node-Laufzeit importiert Functions über ihren Dateinamen, und ein
  gleichnamiger eingebundener Ordner `posts/` (siehe `included_files` unten) würde dabei
  kollidieren (`ERR_UNSUPPORTED_DIR_IMPORT`). Für den Status-Filter "eingeplant" überschreibt
  `post-erstellen.js` (`renderGrid`) das clientseitig mit einer Sortierung nach `datum_geplant`
  aufsteigend (nächster Termin zuerst) - dort ist die Reihenfolge relevanter als das
  Erstellungsdatum.
- `caption-blocks.js` liest die Hashtag-Sets aus [`../captions/hashtag-sets.md`](../captions/hashtag-sets.md).
- `create-post.js` legt einen neuen Post an: lädt das ausgewählte Bild aus Drive herunter,
  committet es nach `planungs-webseite/medien/aus-drive/` und die neue `.md`-Datei nach
  `posts/01-entwuerfe/` – **erste schreibende Function** dieses Projekts, daher zusätzlich per
  Team-Passwort geschützt (siehe unten). Bilder aus dem "uploads"-Ordner (`bildFolder: "uploads"`,
  siehe `upload-image.js`) werden dagegen nur referenziert, nicht erneut heruntergeladen/
  komprimiert/committet – die liegen dort bereits fertig. Es gab früher eine eigene `media.js`-Function, die
  Bilder aus `medien/` über die Function-Laufzeit auslieferte; das führte bei größeren Bildern
  (> ~6 MB) zu `502`-Fehlern, da Netlify Functions ein hartes Response-Size-Limit haben.
  `medien/` liegt seitdem innerhalb von `planungs-webseite/` (dem Netlify-Publish-Verzeichnis)
  und wird direkt als statische Datei über die CDN ausgeliefert – kein Limit, keine Function
  mehr nötig.
- `schedule-post.js` gibt einen Entwurf zur Veröffentlichung frei: setzt `status: bereit` und
  `freigegeben_von` im Frontmatter und verschiebt die Datei von `posts/01-entwuerfe/` nach
  `posts/02-bereit-zur-veroeffentlichung/`. Setzt kein Datum mehr (kein automatisches
  Scheduling) – stattdessen Vier-Augen-Prinzip: `freigegeben_von` darf serverseitig nicht mit
  `autor` (gesetzt beim Anlegen über `create-post.js`) übereinstimmen.
- `schedule-publish.js` plant einen bereiten Post ein: setzt `status: eingeplant` und
  `datum_geplant` (Datum + Uhrzeit, muss in der Zukunft liegen) im Frontmatter und verschiebt die
  Datei von `posts/02-bereit-zur-veroeffentlichung/` nach
  `posts/03-warten-auf-veroeffentlichung/`. Nicht zu verwechseln mit `schedule-post.js`
  (entwurf -> bereit, ohne Datum).
- `reset-to-entwurf.js` setzt einen bereiten Post zurück auf `status: entwurf` (Gegenrichtung zu
  `schedule-post.js`) und verschiebt ihn zurück nach `posts/01-entwuerfe/`. Braucht `bearbeiter`
  (Klartext-Name der eingeloggten Person, siehe `identity-gate.js`) und `grund`
  (`fehler_entdeckt` | `verbesserung_vorschlagen` | `sonstiges`); Grund + optionaler `kommentar`
  landen als Eintrag in der `kommentare`-Liste (dort dann wieder sichtbar, da Kommentare nur im
  Status `entwurf` angezeigt werden, siehe `post-erstellen.js`), mit dem Text-Präfix
  `von {bearbeiter} zurückgesetzt ({grund}): ...` - so bleibt in der Kommentar-Historie
  erkennbar, dass der Eintrag aus einem Reset stammt, nicht aus dem normalen Kommentarfeld
  (`comment-post.js`).
- `reset-to-bereit.js` nimmt einen eingeplanten Veröffentlichungstermin zurück (Gegenrichtung zu
  `schedule-publish.js`): setzt `status: bereit`, leert `datum_geplant` und verschiebt die Datei
  zurück nach `posts/02-bereit-zur-veroeffentlichung/`. Braucht nur `bestaetigt_von`
  (Klartext-Name der eingeloggten Person), da der Post inhaltlich unverändert bleibt.
- `publish-post.js` markiert einen Post als veröffentlicht: setzt `status: veroeffentlicht` und
  `datum_veroeffentlicht` im Frontmatter und verschiebt die Datei von
  `posts/03-warten-auf-veroeffentlichung/` nach `posts/04-veroeffentlicht/`. Manueller Vorgriff
  auf den automatischen Übergang (siehe `publish-scheduled-posts-background.js`), z. B. falls ein
  Post schon vor dem geplanten Termin raus soll. Postet nichts automatisch auf Instagram – das
  Team veröffentlicht manuell auf der Plattform selbst, dieses Tool markiert den Post nur als
  erledigt. Ein Plan für echtes automatisches Veröffentlichen (Instagram Content Publishing API)
  liegt bereit unter [`instagram-publish-plan.md`](instagram-publish-plan.md), zurückgestellt bis
  die Meta-App/Entwicklerkonto-Einrichtung ansteht.
- `publish-scheduled-posts-background.js` (Netlify Background Function, bis zu 15 Min. Laufzeit)
  prüft `posts/03-warten-auf-veroeffentlichung/` und versetzt jeden Post, dessen `datum_geplant`
  erreicht ist, automatisch nach `posts/04-veroeffentlicht/` (`status: veroeffentlicht`) - exakt
  dieselbe Statusänderung wie der manuelle Button in `publish-post.js`, nur zeitgesteuert. Wird
  per GitHub-Actions-Cron alle 15 Minuten getriggert (siehe
  [`../.github/workflows/publish-scheduled-posts.yml`](../.github/workflows/publish-scheduled-posts.yml)),
  abgesichert über dasselbe `CREATE_POST_SECRET` (zusätzlich als GitHub-Actions-Repository-Secret
  hinterlegt, gleicher Wert wie in Netlify) plus `NETLIFY_SITE_URL` als Repository-Variable (z. B.
  `https://herr-ringoo.netlify.app`, ohne abschließenden Slash) unter GitHub Settings → Secrets
  and variables → Actions. `datum_geplant` ist eine naive Wanduhrzeit ohne Zeitzone (aus einem
  `<input type="datetime-local">`), faktisch Europe/Berlin - der Vergleich mit "jetzt" wird
  deshalb explizit in Europe/Berlin-Ortszeit gebildet, sonst entstünde durch den UTC-Betrieb von
  Netlify Functions ein systematischer 1–2-Stunden-Versatz.
- `comment-post.js` hängt einen Kommentar (`{ von, text, erstellt_am }`) an die
  `kommentare`-Liste im Frontmatter an - anders als `schedule-post.js`/`publish-post.js`
  status-unabhängig (Post bleibt am gleichen Pfad, kein `moveFile`). `von` ist der Klartext-Name
  der eingeloggten Person (siehe `identity-gate.js`), keine feste Werteliste mehr.

- `categories-data.js` liest [`../kategorien/kategorien.json`](../kategorien/kategorien.json)
  live (kein Auth) - die gemeinsame, dynamische Kategorie-Liste für Posts UND die
  Ideensammlung. `create-kategorie.js` legt eine neue Kategorie an (Team-Passwort geschützt),
  Kürzel wird automatisch aus dem Label generiert (`lib/slug.js`). Ersetzt das frühere
  hart codierte `lib/categories.js`.
- `idea-data.js` liest [`../ideensammlung/ideen.json`](../ideensammlung/README.md) live (kein
  Auth) für die "Ideensammlung"-Seite. `create-idea.js`/`update-idea.js`/`delete-idea.js`
  legen Ideen an, bearbeiten sie (inkl. Status-Änderung) bzw. löschen sie - alle drei Team-
  Passwort geschützt, alle drei prüfen `kategorie` gegen die live aus `kategorien.json`
  gelesene Liste.

`schedule-post.js`, `publish-post.js`, `create-kategorie.js` und die drei
`*-idea.js`-Functions sind wie `create-post.js` schreibende Functions und daher ebenfalls per
`CREATE_POST_SECRET` geschützt.

`post-data.js`, `caption-blocks.js`, `categories-data.js` und `idea-data.js` brauchen keine
Umgebungsvariablen. `caption-blocks.js` braucht zusätzlich den `included_files`-Eintrag für
`captions/` in `../netlify.toml`; `categories-data.js`/`idea-data.js` lesen live über die
GitHub-API (wie `post-data.js`), brauchen also kein `included_files`.

## Benötigte Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vollständiger JSON-Key eines Google Service Accounts (als eine Zeile) mit Zugriff auf die Drive-API |
| `GITHUB_TOKEN` | Fine-grained GitHub PAT, nur für dieses Repo, Permission "Contents: Read and write" – sonst nichts. Wird von `create-post.js` genutzt, um neue Dateien zu committen |
| `CREATE_POST_SECRET` | Frei wählbares Team-Passwort. Schützt alle schreibenden Functions (Post/Idee anlegen, Status ändern, kommentieren, Kategorie anlegen, hochladen). Unabhängig vom Netlify-Identity-Login unten - das regelt nur, wer die Oberfläche überhaupt sieht, nicht wer schreiben darf |

Lokal in einer `.env`-Datei im Projekt-Root ablegen (siehe [`../.env.example`](../.env.example)),
`.env` ist in `.gitignore` und wird nie eingecheckt.

## Einmaliges Setup außerhalb des Codes

1. Google-Cloud-Projekt + Service Account anlegen, JSON-Key herunterladen.
2. Jeden der Ordner aus
   [`../planungs-webseite/medien/README.md`](../planungs-webseite/medien/README.md) in Google
   Drive für die `client_email`-Adresse aus dem JSON-Key freigeben (Betrachter-Rechte reichen).
3. Auf [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
   einen **fine-grained Token** erstellen: "Only select repositories" → dieses Repo auswählen,
   unter "Repository permissions" nur **Contents: Read and write** setzen – sonst keine weiteren
   Rechte.
4. Ein beliebiges, ausreichend langes Team-Passwort für `CREATE_POST_SECRET` festlegen (z. B.
   über einen Passwort-Generator) und im Team teilen.
5. `GOOGLE_SERVICE_ACCOUNT_JSON`, `GITHUB_TOKEN` und `CREATE_POST_SECRET` sowohl lokal (`.env`)
   als auch in den Netlify-Site-Settings (Environment variables) hinterlegen.

## Login (Netlify Identity)

Die gesamte Oberfläche (alle vier Seiten unter `planungs-webseite/`) ist über
[Netlify Identity](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/) +
[`netlify-identity-widget`](https://github.com/netlify/netlify-identity-widget) hinter einem
Login versteckt (`planungs-webseite/js/identity-gate.js`) - rein clientseitig, ändert nichts an
den ohnehin bestehenden serverseitigen Function-Absicherungen über `CREATE_POST_SECRET` oben.

**Einmaliges Setup im Netlify-Dashboard (nicht im Code):**

1. Site auswählen → **Site configuration → Identity → Enable Identity**.
2. Unter **Registration preferences** auf **Invite only** stellen - sonst könnte sich jede/r mit
   beliebiger E-Mail-Adresse selbst registrieren.
3. Unter **Identity → Invite users** die Team-Mitglieder einzeln per E-Mail-Adresse einladen.
   Der Name (`user_metadata.full_name`) wird **nicht** hier im Dashboard gesetzt, sondern beim
   allerersten Login von der Person selbst vergeben (siehe unten).
4. Jede eingeladene Person bekommt eine E-Mail mit einem Link, über den sie **ihr eigenes
   Passwort selbst festlegt** (Standardverhalten von Netlify Identity, keine zusätzliche
   Konfiguration nötig). Passwort vergessen funktioniert ebenso automatisch über den
   "Forgot password?"-Link im Login-Fenster des Widgets.

**Name beim ersten Login:** Hat der eingeloggte User noch kein `user_metadata.full_name`
gesetzt, zeigt `identity-gate.js` statt der eigentlichen Seite eine eigene Abfrage
(`[data-identity-name-gate]`) und speichert den eingegebenen Namen per `user.update({ data:
{ full_name } })`. Dieser Name ist danach die alleinige Quelle für Autor/Freigabe/Bearbeiter/
Kommentare im ganzen Tool (`window.getIdentityUserName()`) - es gibt keine manuelle Auswahl
mehr, die früheren Team-Mitglieder-Dropdowns (`lib/team-members.js`) wurden entfernt.

## Lokal starten

```
npm install
netlify dev
```

Die Functions sind danach unter `/.netlify/functions/images?folder=<schlüssel>`,
`/.netlify/functions/post-data`, `/.netlify/functions/caption-blocks`,
`/.netlify/functions/create-post`, `/.netlify/functions/schedule-post` und
`/.netlify/functions/publish-post` erreichbar. Bilder aus `medien/` sind direkt unter
`/medien/...` erreichbar (statische Datei, keine Function).
`create-post.js` nimmt seit der Mehrbild-Unterstützung ein `bilder`-Array
(`[{ bildFolder, bildId }, ...]`, max. 10 Einträge) statt einzelner `bildFolder`/`bildId`-Felder
entgegen. Gültige `folder`-Schlüssel stehen in
[`functions/lib/drive-folders.js`](functions/lib/drive-folders.js), gültige `kategorie`-Werte in
[`functions/lib/categories.js`](functions/lib/categories.js).

