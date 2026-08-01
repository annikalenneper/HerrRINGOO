const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { getFile, deleteFile } = require('./lib/github');

// Löschen ist bewusst nur für Entwürfe möglich - bereit/veroeffentlicht laufen bereits im
// Publish-Workflow (siehe update-post.js für dieselbe Einschränkung beim Bearbeiten).
const SOURCE_DIR = 'posts/01-entwuerfe';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);

function errorResponse(statusCode, error, details) {
  return { statusCode, body: JSON.stringify(details ? { error, details } : { error }) };
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

  const { secret, datei } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Entwurf in "${SOURCE_DIR}/" sein.`);
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const { data } = matter(existing.content.toString('utf8'));
    const mediaPaths = Array.isArray(data.medien) ? data.medien : [];

    const filename = datei.slice(SOURCE_DIR.length + 1);
    await deleteFile(datei, existing.sha, `Delete post draft ${filename}`);

    // Zugehörige Bilder aufräumen - best effort: der Post selbst ist bereits gelöscht (die
    // eigentliche Nutzeraktion), ein einzelnes fehlschlagendes Bild soll das nicht rückgängig
    // machen. Übrig bleibende Bilder wären nur verwaiste Dateien, kein kaputter Zustand.
    for (const mediaPath of mediaPaths) {
      const mediaRepoPath = `planungs-webseite/${mediaPath}`;
      try {
        const mediaFile = await getFile(mediaRepoPath);
        if (mediaFile) {
          await deleteFile(mediaRepoPath, mediaFile.sha, `Delete image for removed post ${filename}`);
        }
      } catch (error) {
        console.error(`Bild konnte nicht gelöscht werden (${mediaRepoPath}):`, error.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht gelöscht werden.', error.message);
  }
};
