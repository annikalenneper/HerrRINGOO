const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { getFile, putFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');
const { TEAM_MEMBERS } = require('./lib/team-members');

// Kommentare sind status-unabhängig (anders als schedule-post.js/publish-post.js) - ein Post
// bleibt am gleichen Pfad, es wird nur die "kommentare"-Liste im Frontmatter ergänzt und die
// Datei per putFile am selben Ort aktualisiert (kein moveFile nötig).
const DATEI_PATTERN = /^posts\/(01-entwuerfe|02-bereit-zur-veroeffentlichung|03-veroeffentlicht)\/[\w-]+\.md$/;
const MAX_TEXT_LENGTH = 2000;
const MAX_VON_NAME_LENGTH = 60;

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

  const { secret, datei, von, von_name: vonName, text } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, '"datei" hat ein ungültiges Format.');
  }
  if (typeof von !== 'string' || !TEAM_MEMBERS.includes(von)) {
    return errorResponse(400, `"von" muss einer von: ${TEAM_MEMBERS.join(', ')} sein.`);
  }
  // "Extern" identifiziert allein keine Person - deshalb zusätzlich ein Name Pflicht (im
  // Frontend über ein Popup beim Abschicken abgefragt, siehe post-erstellen.js).
  if (von === 'Extern' && (typeof vonName !== 'string' || !vonName.trim() || vonName.length > MAX_VON_NAME_LENGTH)) {
    return errorResponse(400, `"von_name" ist bei "Extern" erforderlich (max. ${MAX_VON_NAME_LENGTH} Zeichen).`);
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
      von_name: von === 'Extern' ? vonName.trim() : '',
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
