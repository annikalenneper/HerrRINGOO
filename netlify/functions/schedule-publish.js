const { checkSecret } = require('./lib/auth');
const { getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

// Zweite Terminstufe im Workflow (bereit -> eingeplant), nicht zu verwechseln mit
// schedule-post.js (entwurf -> bereit, Review-Freigabe ohne Datum). Der hier gesetzte Termin
// wird von publish-scheduled-posts-background.js überwacht, das den Post automatisch auf
// "veroeffentlicht" setzt, sobald der Termin erreicht ist.
const SOURCE_DIR = 'posts/02-bereit-zur-veroeffentlichung';
const TARGET_DIR = 'posts/03-warten-auf-veroeffentlichung';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);
// Format des HTML5 <input type="datetime-local">-Werts (Datum + Uhrzeit, kein Sekunden-Teil).
const DATUM_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

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
    return errorResponse(400, '"datum_geplant" muss im Format JJJJ-MM-TTThh:mm angegeben werden.');
  }
  // Naive Wanduhrzeit ohne Zeitzone (aus <input type="datetime-local">), aber für den
  // "muss in der Zukunft liegen"-Check reicht der Vergleich als lokale Zeit auch serverseitig -
  // eine knapp in der Vergangenheit liegende Zeitzonen-Abweichung wäre ohnehin harmlos, da
  // publish-scheduled-posts-background.js einen bereits fälligen Post beim nächsten Lauf sofort
  // veröffentlicht statt ihn ewig als "eingeplant" liegen zu lassen.
  if (new Date(datumGeplant) <= new Date()) {
    return errorResponse(400, '"datum_geplant" muss in der Zukunft liegen.');
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const newContent = updateFrontmatter(existing.content.toString('utf8'), {
      status: 'eingeplant',
      datum_geplant: datumGeplant,
    });

    const filename = datei.slice(SOURCE_DIR.length + 1);
    const targetPath = `${TARGET_DIR}/${filename}`;

    await moveFile(datei, targetPath, `Schedule post for publishing: ${filename}`, newContent);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei: targetPath }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht eingeplant werden.', error.message);
  }
};
