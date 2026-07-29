# Netlify Functions – lokales Setup

- `images.js`/`select-images.js` binden die Google-Drive-Ordner aus
  [`../medien/README.md`](../medien/README.md) in die Galerie auf
  `planungs-webseite/bilder-material.html` ein.
- `post-data.js` liest die Post-Entwürfe aus [`../posts/`](../posts/README.md) (Frontmatter +
  Caption) für die Instagram-Vorschau auf `planungs-webseite/post-erstellen.html`. Heißt bewusst
  nicht `posts.js` – Netlifys Node-Laufzeit importiert Functions über ihren Dateinamen, und ein
  gleichnamiger eingebundener Ordner `posts/` (siehe `included_files` unten) würde dabei
  kollidieren (`ERR_UNSUPPORTED_DIR_IMPORT`).
- `media.js` liefert die in den Post-Dateien referenzierten Bilder aus
  [`../medien/`](../medien/README.md) aus, da dieser Ordner außerhalb von `publish` liegt und
  sonst nicht über HTTP erreichbar wäre.
- `caption-blocks.js` liest die Hashtag-Sets aus [`../captions/hashtag-sets.md`](../captions/hashtag-sets.md).
- `create-post.js` legt einen neuen Post an: lädt das ausgewählte Bild aus Drive herunter,
  committet es nach `medien/aus-drive/` und die neue `.md`-Datei nach `posts/01-entwuerfe/` –
  **erste schreibende Function** dieses Projekts, daher zusätzlich per Team-Passwort geschützt
  (siehe unten).

`post-data.js`, `media.js` und `caption-blocks.js` brauchen keine Umgebungsvariablen, nur die
`included_files`-Einträge in `../netlify.toml`, damit `posts/`, `medien/` und `captions/` mit ins
Function-Bundle wandern.

## Benötigte Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vollständiger JSON-Key eines Google Service Accounts (als eine Zeile) mit Zugriff auf die Drive-API |
| `GITHUB_TOKEN` | Fine-grained GitHub PAT, nur für dieses Repo, Permission "Contents: Read and write" – sonst nichts. Wird von `create-post.js` genutzt, um neue Dateien zu committen |
| `CREATE_POST_SECRET` | Frei wählbares Team-Passwort. Schützt `create-post.js` (und später `schedule-post.js`/`publish-post.js`), da die Seite kein Nutzer-Login hat |

Lokal in einer `.env`-Datei im Projekt-Root ablegen (siehe [`../.env.example`](../.env.example)),
`.env` ist in `.gitignore` und wird nie eingecheckt.

## Einmaliges Setup außerhalb des Codes

1. Google-Cloud-Projekt + Service Account anlegen, JSON-Key herunterladen.
2. Jeden der Ordner aus [`../medien/README.md`](../medien/README.md) in Google Drive für die
   `client_email`-Adresse aus dem JSON-Key freigeben (Betrachter-Rechte reichen).
3. Auf [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
   einen **fine-grained Token** erstellen: "Only select repositories" → dieses Repo auswählen,
   unter "Repository permissions" nur **Contents: Read and write** setzen – sonst keine weiteren
   Rechte.
4. Ein beliebiges, ausreichend langes Team-Passwort für `CREATE_POST_SECRET` festlegen (z. B.
   über einen Passwort-Generator) und im Team teilen.
5. `GOOGLE_SERVICE_ACCOUNT_JSON`, `GITHUB_TOKEN` und `CREATE_POST_SECRET` sowohl lokal (`.env`)
   als auch in den Netlify-Site-Settings (Environment variables) hinterlegen.

## Lokal starten

```
npm install
netlify dev
```

Die Functions sind danach unter `/.netlify/functions/images?folder=<schlüssel>`,
`/.netlify/functions/select-images`, `/.netlify/functions/post-data`,
`/.netlify/functions/media?path=...`, `/.netlify/functions/caption-blocks` und
`/.netlify/functions/create-post` erreichbar. Gültige `folder`-Schlüssel stehen in
[`functions/lib/drive-folders.js`](functions/lib/drive-folders.js), gültige `kategorie`-Werte in
[`functions/lib/categories.js`](functions/lib/categories.js).
