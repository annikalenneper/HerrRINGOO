const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

const SOURCE_DIR = 'posts/01-entwuerfe';
const TARGET_DIR = 'posts/02-bereit-zur-veroeffentlichung';
const DATEI_PATTERN = new RegExp(`^${SOURCE_DIR}/[\\w-]+\\.md$`);
const MAX_FREIGEGEBEN_VON_LENGTH = 30;

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

  const { secret, datei, freigegeben_von: freigegebenVon } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Post in "${SOURCE_DIR}/" sein.`);
  }
  if (typeof freigegebenVon !== 'string' || !freigegebenVon.trim() || freigegebenVon.length > MAX_FREIGEGEBEN_VON_LENGTH) {
    return errorResponse(400, `"freigegeben_von" ist erforderlich (max. ${MAX_FREIGEGEBEN_VON_LENGTH} Zeichen).`);
  }

  try {
    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const existingContent = existing.content.toString('utf8');

    // Vier-Augen-Prinzip: serverseitig durchgesetzt, nicht nur im Frontend (schedule-wizard.js
    // prüft dasselbe, aber ein Client-Check allein ließe sich per direktem Function-Aufruf
    // umgehen). Ältere Entwürfe ohne "autor"-Feld werden durchgelassen, da sich das Prinzip ohne
    // hinterlegten Autor nicht durchsetzen lässt. autor/freigegeben_von kommen inzwischen vom
    // Netlify-Identity-Login (siehe identity-gate.js), sind also echte, unterscheidbare Personen.
    const { autor } = matter(existingContent).data;
    const freigegebenVonTrimmed = freigegebenVon.trim();
    if (autor && String(autor).trim().toLowerCase() === freigegebenVonTrimmed.toLowerCase()) {
      return errorResponse(400, `Vier-Augen-Prinzip: Die Freigabe darf nicht durch den Autor (${autor}) selbst erfolgen.`);
    }

    const newContent = updateFrontmatter(existingContent, {
      status: 'bereit',
      freigegeben_von: freigegebenVonTrimmed,
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
