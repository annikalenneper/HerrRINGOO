const { checkSecret } = require('./lib/auth');
const { readIdeenFile, writeIdeenFile, generateIdeeId } = require('./lib/ideen');
const { readKategorienFile } = require('./lib/kategorien');

const STATUS_WERTE = ['neu', 'verfeinert', 'umgesetzt'];
const MAX_TITEL_LENGTH = 120;
const MAX_BESCHREIBUNG_LENGTH = 4000;
const MAX_BEBILDERUNG_LENGTH = 500;

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

  const { secret, titel, kategorie, status, beschreibung, bebilderung } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof titel !== 'string' || !titel.trim() || titel.length > MAX_TITEL_LENGTH) {
    return errorResponse(400, `"titel" ist erforderlich (max. ${MAX_TITEL_LENGTH} Zeichen).`);
  }
  if (typeof kategorie !== 'string' || !kategorie) {
    return errorResponse(400, '"kategorie" ist erforderlich.');
  }
  if (status !== undefined && !STATUS_WERTE.includes(status)) {
    return errorResponse(400, `"status" muss einer von: ${STATUS_WERTE.join(', ')} sein.`);
  }
  if (typeof beschreibung !== 'string' || !beschreibung.trim() || beschreibung.length > MAX_BESCHREIBUNG_LENGTH) {
    return errorResponse(400, `"beschreibung" ist erforderlich (max. ${MAX_BESCHREIBUNG_LENGTH} Zeichen).`);
  }
  if (bebilderung !== undefined && typeof bebilderung === 'string' && bebilderung.length > MAX_BEBILDERUNG_LENGTH) {
    return errorResponse(400, `"bebilderung" darf max. ${MAX_BEBILDERUNG_LENGTH} Zeichen haben.`);
  }

  try {
    const { kategorien } = await readKategorienFile();
    const categoryKeys = new Set(kategorien.map((k) => k.key));
    if (!categoryKeys.has(kategorie)) {
      return errorResponse(400, `"kategorie" muss einer von: ${[...categoryKeys].join(', ')} sein.`);
    }

    const { ideen, sha } = await readIdeenFile();
    const id = generateIdeeId(new Set(ideen.map((i) => i.id)));

    const neueIdee = {
      id,
      titel: titel.trim(),
      kategorie,
      status: status || 'neu',
      beschreibung: beschreibung.trim(),
      bebilderung: typeof bebilderung === 'string' ? bebilderung.trim() : '',
      erstellt_am: new Date().toISOString(),
    };

    ideen.push(neueIdee);
    await writeIdeenFile(ideen, sha, `Add idea: ${neueIdee.titel}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, idee: neueIdee }) };
  } catch (error) {
    return errorResponse(500, 'Idee konnte nicht angelegt werden.', error.message);
  }
};
