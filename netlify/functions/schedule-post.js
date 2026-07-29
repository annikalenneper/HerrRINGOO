const { checkSecret } = require('./lib/auth');
const { getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

const SOURCE_DIR = 'posts/01-entwuerfe';
const TARGET_DIR = 'posts/02-bereit-zur-veroeffentlichung';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);
const DATUM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  const { secret, datei, datum_geplant: datumGeplant } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Post in "${SOURCE_DIR}/" sein.`);
  }
  if (typeof datumGeplant !== 'string' || !DATUM_PATTERN.test(datumGeplant)) {
    return errorResponse(400, '"datum_geplant" muss im Format JJJJ-MM-TT angegeben werden.');
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const newContent = updateFrontmatter(existing.content.toString('utf8'), {
      status: 'bereit',
      datum_geplant: datumGeplant,
    });

    const filename = datei.slice(SOURCE_DIR.length + 1);
    const targetPath = `${TARGET_DIR}/${filename}`;

    await moveFile(datei, targetPath, `Mark post as ready: ${filename}`, newContent);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei: targetPath }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht als bereit markiert werden.', error.message);
  }
};
