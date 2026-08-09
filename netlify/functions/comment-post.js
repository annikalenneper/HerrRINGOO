const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { getFile, putFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

// Kommentare sind auf den Status "entwurf" beschränkt (serverseitig durchgesetzt, nicht nur im
// Frontend versteckt - siehe post-erstellen.js buildCard). Post bleibt am gleichen Pfad, es wird
// nur die "kommentare"-Liste im Frontmatter ergänzt und die Datei per putFile aktualisiert (kein
// moveFile nötig, da sich der Status hier nicht ändert).
const DATEI_PATTERN = /^posts\/01-entwuerfe\/[\w-]+\.md$/;
const MAX_TEXT_LENGTH = 2000;
const MAX_VON_LENGTH = 30;

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

  const { secret, datei, von, text } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, '"datei" hat ein ungültiges Format.');
  }
  if (typeof von !== 'string' || !von.trim() || von.length > MAX_VON_LENGTH) {
    return errorResponse(400, `"von" ist erforderlich (max. ${MAX_VON_LENGTH} Zeichen).`);
  }
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    return errorResponse(400, `"text" ist erforderlich (max. ${MAX_TEXT_LENGTH} Zeichen).`);
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const existingContent = existing.content.toString('utf8');
    const { kommentare } = matter(existingContent).data;
    const neuerKommentar = {
      von,
      text: text.trim(),
      erstellt_am: new Date().toISOString(),
    };
    const aktualisierteKommentare = [...(Array.isArray(kommentare) ? kommentare : []), neuerKommentar];

    const newContent = updateFrontmatter(existingContent, { kommentare: aktualisierteKommentare });
    await putFile(datei, newContent, `Add comment on ${datei} from ${von}`, existing.sha);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, kommentar: neuerKommentar }),
    };
  } catch (error) {
    return errorResponse(500, 'Kommentar konnte nicht gespeichert werden.', error.message);
  }
};
