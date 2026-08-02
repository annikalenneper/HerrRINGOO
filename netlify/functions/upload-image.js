const crypto = require('crypto');
const { checkSecret } = require('./lib/auth');
const { putFile } = require('./lib/github');
const { slugify } = require('./lib/slug');
const { compressImage } = require('./lib/compress-image');

// Direkter Bild-Upload vom eigenen Gerät (statt über Google Drive, siehe create-post.js) nach
// planungs-webseite/medien/uploads/ - erscheint danach im Bild-Schritt des "Post
// erstellen"-Wizards als eigener Ordner "uploads" (siehe images.js).
const UPLOADS_DIR = 'planungs-webseite/medien/uploads';

// Bild kommt bereits clientseitig grob verkleinert an (siehe upload-wizard.js) - dieses Limit
// ist nur ein zusätzlicher serverseitiger Schutz gegen zu große Anfragen (Netlify-Functions
// haben ein hartes Payload-Limit von ca. 6 MB für den gesamten Request-Body inkl. Base64
// -Overhead), nicht die primäre Kompression.
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

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

  const { secret, dateiname, bildBase64 } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof dateiname !== 'string' || !dateiname.trim()) {
    return errorResponse(400, '"dateiname" ist erforderlich.');
  }
  if (typeof bildBase64 !== 'string' || !bildBase64) {
    return errorResponse(400, '"bildBase64" ist erforderlich.');
  }

  let originalBuffer;
  try {
    originalBuffer = Buffer.from(bildBase64, 'base64');
  } catch (error) {
    return errorResponse(400, '"bildBase64" ist ungültig kodiert.');
  }
  if (originalBuffer.length === 0) {
    return errorResponse(400, '"bildBase64" ist ungültig kodiert.');
  }
  if (originalBuffer.length > MAX_UPLOAD_BYTES) {
    return errorResponse(400, `Bild ist zu groß (max. ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
  }

  let compressedBuffer;
  try {
    compressedBuffer = await compressImage(originalBuffer);
  } catch (error) {
    return errorResponse(400, 'Bild konnte nicht verarbeitet werden (ist es wirklich ein Bild?).', error.message);
  }

  // Dateiname ist rein technisch (Zeitstempel sorgt für chronologische Sortierbarkeit in
  // images.js, Zufallsanteil vermeidet Kollisionen bei gleichzeitigen Uploads) - der
  // ursprüngliche Dateiname dient nur als lesbarer Teil, hat keine weitere Bedeutung.
  const basisName = slugify(dateiname.replace(/\.[^.]+$/, ''));
  const zufall = crypto.randomBytes(3).toString('hex');
  const filename = `${Date.now()}-${zufall}-${basisName}.jpg`;

  try {
    await putFile(`${UPLOADS_DIR}/${filename}`, compressedBuffer, `Add upload ${filename}`);
  } catch (error) {
    return errorResponse(500, 'Bild konnte nicht gespeichert werden.', error.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, pfad: `medien/uploads/${filename}` }),
  };
};
