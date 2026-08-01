const { checkSecret } = require('./lib/auth');
const { readIdeenFile, writeIdeenFile } = require('./lib/ideen');

const ID_PATTERN = /^idea-[\w-]+$/;

function errorResponse(statusCode, error, details) {
  return { statusCode, body: JSON.stringify(details ? { error, details } : { error }) };
}

// Einfacher als delete-post.js: Bebilderung ist reiner Text, kein angehängtes Bild - kein
// Aufräumen von Mediendateien nötig.
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

  const { secret, id } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return errorResponse(400, '"id" hat ein ungültiges Format.');
  }

  try {
    const { ideen, sha } = await readIdeenFile();
    const index = ideen.findIndex((i) => i.id === id);
    if (index === -1) {
      return errorResponse(404, `Idee "${id}" nicht gefunden.`);
    }

    const [entfernt] = ideen.splice(index, 1);
    await writeIdeenFile(ideen, sha, `Delete idea: ${entfernt.titel}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, id }) };
  } catch (error) {
    return errorResponse(500, 'Idee konnte nicht gelöscht werden.', error.message);
  }
};
