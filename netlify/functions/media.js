const fs = require('fs');
const path = require('path');

// Stellt Dateien aus medien/ (liegt außerhalb von "publish", siehe netlify.toml)
// über die Function bereit, z. B. für Bilder, die in Post-Frontmatter referenziert werden.
const MEDIA_ROOT = path.resolve(path.join(__dirname, '../../medien'));

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

exports.handler = async (event) => {
  const requestedPath = event.queryStringParameters && event.queryStringParameters.path;

  if (!requestedPath || !requestedPath.startsWith('medien/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Pfad.' }) };
  }

  const relativePath = requestedPath.slice('medien/'.length);
  const resolvedPath = path.resolve(MEDIA_ROOT, relativePath);

  // Schutz gegen Path Traversal (z. B. "../../"): der aufgelöste Pfad muss innerhalb
  // von MEDIA_ROOT bleiben, sonst könnten beliebige Dateien des Servers gelesen werden.
  if (resolvedPath !== MEDIA_ROOT && !resolvedPath.startsWith(MEDIA_ROOT + path.sep)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Pfad.' }) };
  }

  const contentType = MIME_TYPES[path.extname(resolvedPath).toLowerCase()];
  if (!contentType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Nicht unterstütztes Dateiformat.' }) };
  }

  try {
    const fileBuffer = fs.readFileSync(resolvedPath);
    return {
      statusCode: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=600' },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Datei nicht gefunden.' }) };
  }
};
