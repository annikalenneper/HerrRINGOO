const path = require('path');
const { google } = require('googleapis');
const { checkSecret } = require('./lib/auth');
const { getFile, putFile } = require('./lib/github');
const { FOLDERS } = require('./lib/drive-folders');
const { CATEGORIES } = require('./lib/categories');

const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));
const BILD_ID_PATTERN = /^[\w-]+$/;
const MAX_TITEL_LENGTH = 120;
const MAX_CAPTION_LENGTH = 2200; // Instagram-Limit

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const KNOWN_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function errorResponse(statusCode, error, details) {
  return { statusCode, body: JSON.stringify(details ? { error, details } : { error }) };
}

function resolveExtension(name, mimeType) {
  const nameExt = path.extname(name || '').replace('.', '').toLowerCase();
  if (KNOWN_EXTENSIONS.includes(nameExt)) {
    return nameExt === 'jpeg' ? 'jpg' : nameExt;
  }
  return EXTENSION_BY_MIME[mimeType] || null;
}

function slugify(input) {
  const base = input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'post';
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

function buildPostContent({ titel, kategorie, mediaPath, caption }) {
  return `---
titel: "${escapeYamlString(titel)}"
kategorie: ${kategorie}
plattform: instagram
status: entwurf
datum_geplant: ""
datum_veroeffentlicht:
medien:
  - ${mediaPath}
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

  const { secret, titel, kategorie, bildFolder, bildId, caption } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }

  if (typeof titel !== 'string' || !titel.trim() || titel.length > MAX_TITEL_LENGTH) {
    return errorResponse(400, `"titel" ist erforderlich (max. ${MAX_TITEL_LENGTH} Zeichen).`);
  }
  if (typeof kategorie !== 'string' || !CATEGORY_KEYS.has(kategorie)) {
    return errorResponse(400, `"kategorie" muss einer von: ${[...CATEGORY_KEYS].join(', ')} sein.`);
  }
  if (typeof caption !== 'string' || !caption.trim() || caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(400, `"caption" ist erforderlich (max. ${MAX_CAPTION_LENGTH} Zeichen).`);
  }
  const folder = FOLDERS[bildFolder];
  if (!folder) {
    return errorResponse(400, `"bildFolder" muss einer von: ${Object.keys(FOLDERS).join(', ')} sein.`);
  }
  if (typeof bildId !== 'string' || !BILD_ID_PATTERN.test(bildId)) {
    return errorResponse(400, '"bildId" hat ein ungültiges Format.');
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Integritätsprüfung: verhindert, dass eine manipulierte Anfrage ein beliebiges (nicht
    // zum angegebenen Ordner gehörendes bzw. nicht-Bild-) Drive-Objekt einschleust.
    const meta = await drive.files.get({ fileId: bildId, fields: 'parents,mimeType,name' });
    const isImage = (meta.data.mimeType || '').startsWith('image/');
    const belongsToFolder = (meta.data.parents || []).includes(folder.id);
    if (!isImage || !belongsToFolder) {
      return errorResponse(400, 'Das angegebene Bild gehört nicht zum angegebenen Ordner oder ist kein Bild.');
    }

    const extension = resolveExtension(meta.data.name, meta.data.mimeType);
    if (!extension) {
      return errorResponse(400, 'Nicht unterstütztes Bildformat.');
    }

    const fileResponse = await drive.files.get(
      { fileId: bildId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const imageBuffer = Buffer.from(fileResponse.data);

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
    const mediaPath = `medien/aus-drive/${slugWithSuffix}.${extension}`;

    await putFile(mediaPath, imageBuffer, `Add Drive image for new post ${slugWithSuffix}`);

    const content = buildPostContent({ titel: titel.trim(), kategorie, mediaPath, caption: caption.trim() });
    const postPath = `posts/01-entwuerfe/${filename}`;

    try {
      await putFile(postPath, content, `Add new post draft ${slugWithSuffix}`);
    } catch (error) {
      return errorResponse(
        500,
        'Bild wurde gespeichert, Post-Datei konnte aber nicht angelegt werden.',
        `${error.message} (verwaistes Bild: ${mediaPath})`
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
