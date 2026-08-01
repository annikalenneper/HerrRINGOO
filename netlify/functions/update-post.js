const { checkSecret } = require('./lib/auth');
const { getFile, putFile } = require('./lib/github');
const { replaceCaptionAndFrontmatter } = require('./lib/posts');
const { readKategorienFile } = require('./lib/kategorien');

const MAX_TITEL_LENGTH = 120;
const MAX_CAPTION_LENGTH = 2200; // Instagram-Limit

// Bearbeiten ist bewusst nur für Entwürfe möglich - bereit/veroeffentlicht laufen bereits
// im Publish-Workflow, ein nachträgliches Ändern von Titel/Kategorie/Caption dort würde den
// Status-Wechsel-Functions (schedule-post.js/publish-post.js) widersprechen.
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

  const { secret, datei, titel, kategorie, caption } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof datei !== 'string' || !DATEI_PATTERN.test(datei)) {
    return errorResponse(400, `"datei" muss ein Entwurf in "${SOURCE_DIR}/" sein.`);
  }
  if (typeof titel !== 'string' || !titel.trim() || titel.length > MAX_TITEL_LENGTH) {
    return errorResponse(400, `"titel" ist erforderlich (max. ${MAX_TITEL_LENGTH} Zeichen).`);
  }
  if (typeof kategorie !== 'string' || !kategorie) {
    return errorResponse(400, '"kategorie" ist erforderlich.');
  }
  if (typeof caption !== 'string' || !caption.trim() || caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(400, `"caption" ist erforderlich (max. ${MAX_CAPTION_LENGTH} Zeichen).`);
  }

  try {
    // Live geprüft statt gegen ein statisches Array - siehe create-post.js.
    const { kategorien } = await readKategorienFile();
    const categoryKeys = new Set(kategorien.map((c) => c.key));
    if (!categoryKeys.has(kategorie)) {
      return errorResponse(400, `"kategorie" muss einer von: ${[...categoryKeys].join(', ')} sein.`);
    }

    const existing = await getFile(datei);
    if (!existing) {
      return errorResponse(404, `Datei "${datei}" nicht gefunden.`);
    }

    const newContent = replaceCaptionAndFrontmatter(existing.content.toString('utf8'), {
      frontmatterUpdates: { titel: titel.trim(), kategorie },
      caption: caption.trim(),
    });

    const filename = datei.slice(SOURCE_DIR.length + 1);
    await putFile(datei, newContent, `Update post draft ${filename}`, existing.sha);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, datei }),
    };
  } catch (error) {
    return errorResponse(500, 'Post konnte nicht aktualisiert werden.', error.message);
  }
};
