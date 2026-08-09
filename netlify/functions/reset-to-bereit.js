const { checkSecret } = require('./lib/auth');
const { getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

// Nimmt einen bereits eingeplanten Veröffentlichungstermin zurück: Post wandert von "eingeplant"
// zurück zu "bereit", der verworfene Termin wird gelöscht (sonst bliebe ein irreführendes
// Datum im Frontmatter stehen). Inhaltlich unverändert, daher reicht eine reine
// Namensbestätigung statt Grund/Kommentar wie bei reset-to-entwurf.js.
const SOURCE_DIR = 'posts/03-warten-auf-veroeffentlichung';
const TARGET_DIR = 'posts/02-bereit-zur-veroeffentlichung';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);
const MAX_BESTAETIGT_VON_LENGTH = 30;

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

  const { secret, datei, bestaetigt_von: bestaetigtVon } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Post in "${SOURCE_DIR}/" sein.`);
  }
  if (typeof bestaetigtVon !== 'string' || !bestaetigtVon.trim() || bestaetigtVon.length > MAX_BESTAETIGT_VON_LENGTH) {
    return errorResponse(400, `"bestaetigt_von" ist erforderlich (max. ${MAX_BESTAETIGT_VON_LENGTH} Zeichen).`);
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const newContent = updateFrontmatter(existing.content.toString('utf8'), {
      status: 'bereit',
      datum_geplant: '',
    });

    const filename = datei.slice(SOURCE_DIR.length + 1);
    const targetPath = `${TARGET_DIR}/${filename}`;

    await moveFile(datei, targetPath, `Revoke publish schedule, reset post to bereit: ${filename}`, newContent);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei: targetPath }),
    };
  } catch (error) {
    return errorResponse(500, 'Termin konnte nicht zurückgenommen werden.', error.message);
  }
};
