const { google } = require('googleapis');
const { checkSecret } = require('./lib/auth');
const { getFile, putFile } = require('./lib/github');
const { FOLDERS } = require('./lib/drive-folders');
const { readKategorienFile } = require('./lib/kategorien');
const { slugify } = require('./lib/slug');
const { TEAM_MEMBERS } = require('./lib/team-members');
const { compressImage } = require('./lib/compress-image');

const BILD_ID_PATTERN = /^[\w-]+$/;
const MAX_TITEL_LENGTH = 120;
const MAX_CAPTION_LENGTH = 2200; // Instagram-Limit
const MAX_BILDER = 10; // Instagram-Karussell-Limit
// Dateiname eines bereits über upload-image.js hochgeladenen + komprimierten Bilds in
// planungs-webseite/medien/uploads/ - siehe UPLOADS_FOLDER_KEY-Zweig weiter unten.
const UPLOAD_FILENAME_PATTERN = /^[\w-]+\.jpg$/;
const UPLOADS_FOLDER_KEY = 'uploads';
const UPLOADS_DIR = 'planungs-webseite/medien/uploads';
const UPLOADS_MEDIA_PREFIX = 'medien/uploads/';

function errorResponse(statusCode, error, details) {
  return { statusCode, body: JSON.stringify(details ? { error, details } : { error }) };
}

function datePrefix() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function escapeYamlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildPostContent({ titel, kategorie, mediaPaths, caption, autor }) {
  const medienBlock = mediaPaths.map((mediaPath) => `  - ${mediaPath}`).join('\n');
  return `---
titel: "${escapeYamlString(titel)}"
kategorie: ${kategorie}
plattform: instagram
status: entwurf
erstellt_am: "${new Date().toISOString()}"
autor: "${escapeYamlString(autor)}"
freigegeben_von: ""
datum_geplant: ""
datum_veroeffentlicht:
medien:
${medienBlock}
notizen: ""
---

## Caption

${caption}
`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return errorResponse(400, 'Ungültiges JSON im Request-Body.');
  }

  const { secret, titel, kategorie, bilder, caption, autor } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }

  if (typeof titel !== 'string' || !titel.trim() || titel.length > MAX_TITEL_LENGTH) {
    return errorResponse(400, `"titel" ist erforderlich (max. ${MAX_TITEL_LENGTH} Zeichen).`);
  }
  if (typeof autor !== 'string' || !TEAM_MEMBERS.includes(autor)) {
    return errorResponse(400, `"autor" muss einer von: ${TEAM_MEMBERS.join(', ')} sein.`);
  }
  if (typeof kategorie !== 'string' || !kategorie) {
    return errorResponse(400, '"kategorie" ist erforderlich.');
  }
  if (typeof caption !== 'string' || !caption.trim() || caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(400, `"caption" ist erforderlich (max. ${MAX_CAPTION_LENGTH} Zeichen).`);
  }
  if (!Array.isArray(bilder) || bilder.length === 0 || bilder.length > MAX_BILDER) {
    return errorResponse(400, `"bilder" muss ein Array mit 1 bis ${MAX_BILDER} Bildern sein.`);
  }
  for (const eintrag of bilder) {
    if (eintrag && eintrag.bildFolder === UPLOADS_FOLDER_KEY) {
      if (typeof eintrag.bildId !== 'string' || !UPLOAD_FILENAME_PATTERN.test(eintrag.bildId)) {
        return errorResponse(400, '"bildId" hat ein ungültiges Format.');
      }
      continue;
    }
    const folder = eintrag && FOLDERS[eintrag.bildFolder];
    if (!folder) {
      return errorResponse(400, `"bildFolder" muss einer von: ${[...Object.keys(FOLDERS), UPLOADS_FOLDER_KEY].join(', ')} sein.`);
    }
    if (typeof eintrag.bildId !== 'string' || !BILD_ID_PATTERN.test(eintrag.bildId)) {
      return errorResponse(400, '"bildId" hat ein ungültiges Format.');
    }
  }

  try {
    // Live geprüft statt gegen ein statisches Array - eine gerade erst über die Ideensammlung
    // angelegte Kategorie ist damit sofort gültig, ohne Redeploy.
    const { kategorien } = await readKategorienFile();
    const categoryKeys = new Set(kategorien.map((c) => c.key));
    if (!categoryKeys.has(kategorie)) {
      return errorResponse(400, `"kategorie" muss einer von: ${[...categoryKeys].join(', ')} sein.`);
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const slug = `${datePrefix()}-${slugify(titel)}`;
    let filename = `${slug}.md`;
    let attempt = 1;
    while (await getFile(`posts/01-entwuerfe/${filename}`)) {
      attempt += 1;
      if (attempt > 20) {
        return errorResponse(500, 'Zu viele Namenskollisionen beim Anlegen der Post-Datei.');
      }
      filename = `${slug}-${attempt}.md`;
    }
    const slugWithSuffix = filename.replace(/\.md$/, '');

    const mediaPaths = [];
    for (let index = 0; index < bilder.length; index += 1) {
      const { bildFolder, bildId } = bilder[index];

      // Bilder aus dem "uploads"-Ordner (siehe upload-image.js) liegen bereits komprimiert und
      // öffentlich erreichbar im Repo - kein erneuter Download/Kompression/Commit nötig, nur
      // Existenz am erwarteten Pfad prüfen (Integritätsprüfung analog zum Drive-Zweig unten) und
      // den bestehenden Pfad direkt übernehmen.
      if (bildFolder === UPLOADS_FOLDER_KEY) {
        const uploadExists = await getFile(`${UPLOADS_DIR}/${bildId}`);
        if (!uploadExists) {
          return errorResponse(400, `Bild ${index + 1}: wurde im Uploads-Ordner nicht gefunden.`);
        }
        mediaPaths.push(`${UPLOADS_MEDIA_PREFIX}${bildId}`);
        continue;
      }

      const folder = FOLDERS[bildFolder];

      // Integritätsprüfung: verhindert, dass eine manipulierte Anfrage ein beliebiges (nicht
      // zum angegebenen Ordner gehörendes bzw. nicht-Bild-) Drive-Objekt einschleust.
      // files.get({fields: 'parents'}) liefert das parents-Feld für Dateien in einer Shared
      // Drive nicht zuverlässig zurück (Drive-API-v3-Eigenheit) - deshalb wird die
      // Ordner-Zugehörigkeit stattdessen über dieselbe containment-Query geprüft, die images.js
      // für die Galerie bereits erfolgreich nutzt.
      const listResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id)',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const belongsToFolder = (listResponse.data.files || []).some((f) => f.id === bildId);
      if (!belongsToFolder) {
        console.error('Bild-Integritätsprüfung fehlgeschlagen:', { bildId, erwarteterOrdner: folder.id });
        return errorResponse(400, `Bild ${index + 1}: gehört nicht zum angegebenen Ordner oder ist kein Bild.`);
      }

      const fileResponse = await drive.files.get(
        { fileId: bildId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      );
      const originalBuffer = Buffer.from(fileResponse.data);

      let compressedBuffer;
      try {
        compressedBuffer = await compressImage(originalBuffer);
      } catch (error) {
        return errorResponse(400, `Bild ${index + 1}: konnte nicht verarbeitet werden.`, error.message);
      }

      // mediaPath ist site-relativ (landet so im Frontmatter und wird vom Frontend 1:1 als
      // Bild-URL genutzt, siehe post-mock.js), mediaRepoPath ist der tatsächliche Commit-Pfad
      // im Repo - medien/ liegt innerhalb von planungs-webseite/ (Netlify-Publish-Verzeichnis),
      // damit Bilder direkt statisch über die CDN ausgeliefert werden. Immer .jpg, da jedes
      // Bild oben nach JPEG neu kodiert wird, unabhängig vom Drive-Originalformat.
      const mediaPath = `medien/aus-drive/${slugWithSuffix}-${index + 1}.jpg`;
      const mediaRepoPath = `planungs-webseite/${mediaPath}`;

      try {
        await putFile(mediaRepoPath, compressedBuffer, `Add Drive image ${index + 1} for new post ${slugWithSuffix}`);
      } catch (error) {
        return errorResponse(
          500,
          'Bild konnte nicht gespeichert werden.',
          `${error.message} (bereits hochgeladen: ${mediaPaths.join(', ') || 'keine'})`
        );
      }
      mediaPaths.push(mediaPath);
    }

    const content = buildPostContent({ titel: titel.trim(), kategorie, mediaPaths, caption: caption.trim(), autor: autor.trim() });
    const postPath = `posts/01-entwuerfe/${filename}`;

    try {
      await putFile(postPath, content, `Add new post draft ${slugWithSuffix}`);
    } catch (error) {
      return errorResponse(
        500,
        'Bild(er) gespeichert, Post-Datei konnte aber nicht angelegt werden.',
        `${error.message} (verwaiste Bilder: ${mediaPaths.join(', ')})`
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei: postPath }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht erstellt werden.', error.message);
  }
};
