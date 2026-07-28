# Netlify Functions – lokales Setup

Diese Functions binden die Google-Drive-Ordner aus [`../medien/README.md`](../medien/README.md)
in die Galerie auf `planungs-webseite/bilder-material.html` ein.

## Benötigte Umgebungsvariable

| Variable | Bedeutung |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vollständiger JSON-Key eines Google Service Accounts (als eine Zeile) mit Zugriff auf die Drive-API |

Lokal in einer `.env`-Datei im Projekt-Root ablegen (siehe [`../.env.example`](../.env.example)),
`.env` ist in `.gitignore` und wird nie eingecheckt.

## Einmaliges Setup außerhalb des Codes

1. Google-Cloud-Projekt + Service Account anlegen, JSON-Key herunterladen.
2. Jeden der Ordner aus [`../medien/README.md`](../medien/README.md) in Google Drive für die
   `client_email`-Adresse aus dem JSON-Key freigeben (Betrachter-Rechte reichen).
3. `GOOGLE_SERVICE_ACCOUNT_JSON` sowohl lokal (`.env`) als auch in den Netlify-Site-Settings
   (Environment variables) hinterlegen.

## Lokal starten

```
npm install
netlify dev
```

Die Functions sind danach unter `/.netlify/functions/images?folder=<schlüssel>` und
`/.netlify/functions/select-images` erreichbar. Gültige `folder`-Schlüssel stehen in
[`functions/images.js`](functions/images.js) (`FOLDERS`-Map).
