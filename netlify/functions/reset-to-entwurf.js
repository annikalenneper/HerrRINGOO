const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

// Setzt einen Post aus "bereit" zurück auf "entwurf" (z. B. weil beim Review doch noch ein
// Fehler auffiel). Der gewählte Grund + optionale Kommentar landen als normaler Eintrag in der
// "kommentare"-Liste - ab dann wieder sichtbar, da der Post ja zurück im Status "entwurf" ist
// (siehe post-erstellen.js buildComments/buildCard).
const SOURCE_DIR = 'posts/02-bereit-zur-veroeffentlichung';
const TARGET_DIR = 'posts/01-entwuerfe';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);
const MAX_KOMMENTAR_LENGTH = 2000;
const MAX_BEARBEITER_LENGTH = 30;

const GRUENDE = {
  fehler_entdeckt: 'Fehler entdeckt',
  verbesserung_vorschlagen: 'Verbesserung vorschlagen',
  sonstiges: 'Sonstiges',
};

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

  const { secret, datei, bearbeiter, grund, kommentar } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Post in "${SOURCE_DIR}/" sein.`);
  }
  if (typeof bearbeiter !== 'string' || !bearbeiter.trim() || bearbeiter.length > MAX_BEARBEITER_LENGTH) {
    return errorResponse(400, `"bearbeiter" ist erforderlich (max. ${MAX_BEARBEITER_LENGTH} Zeichen).`);
  }
  if (typeof grund !== 'string' || !GRUENDE[grund]) {
    return errorResponse(400, `"grund" muss einer von: ${Object.keys(GRUENDE).join(', ')} sein.`);
  }
  if (kommentar !== undefined && kommentar !== '' && (typeof kommentar !== 'string' || kommentar.length > MAX_KOMMENTAR_LENGTH)) {
    return errorResponse(400, `"kommentar" darf max. ${MAX_KOMMENTAR_LENGTH} Zeichen haben.`);
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const existingContent = existing.content.toString('utf8');
    const { kommentare } = matter(existingContent).data;

    // Als Reset markiert (statt eines normalen Kommentartexts), damit in der Kommentar-Historie
    // erkennbar bleibt, dass dieser Eintrag aus einem "Status zurücksetzen" stammt, nicht aus
    // dem normalen Kommentarfeld (siehe comment-post.js).
    const kommentarText = typeof kommentar === 'string' && kommentar.trim()
      ? `von ${bearbeiter} zurückgesetzt (${GRUENDE[grund]}): ${kommentar.trim()}`
      : `von ${bearbeiter} zurückgesetzt (${GRUENDE[grund]})`;
    const neuerKommentar = { von: bearbeiter, text: kommentarText, erstellt_am: new Date().toISOString() };
    const aktualisierteKommentare = [...(Array.isArray(kommentare) ? kommentare : []), neuerKommentar];

    const newContent = updateFrontmatter(existingContent, {
      status: 'entwurf',
      kommentare: aktualisierteKommentare,
    });

    const filename = datei.slice(SOURCE_DIR.length + 1);
    const targetPath = `${TARGET_DIR}/${filename}`;

    await moveFile(datei, targetPath, `Reset post to entwurf: ${filename}`, newContent);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei: targetPath }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht zurückgesetzt werden.', error.message);
  }
};
