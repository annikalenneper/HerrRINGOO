const { checkSecret } = require('./lib/auth');
const { readIdeenFile, writeIdeenFile } = require('./lib/ideen');
const { readKategorienFile } = require('./lib/kategorien');

const STATUS_WERTE = ['neu', 'verfeinert', 'umgesetzt'];
const MAX_TITEL_LENGTH = 120;
const MAX_BESCHREIBUNG_LENGTH = 4000;
const MAX_BEBILDERUNG_LENGTH = 500;
const ID_PATTERN = /^idea-[\w-]+$/;

function errorResponse(statusCode, error, details) {
  return { statusCode, body: JSON.stringify(details ? { error, details } : { error }) };
}

// Nimmt immer den kompletten editierbaren Feldsatz entgegen (wie update-post.js) - sowohl der
// volle Bearbeiten-Dialog als auch der schnelle Status-Klick auf der Karte senden alle Felder,
// damit es nur einen Schreibpfad für Ideen gibt.
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

  const { secret, id, titel, kategorie, status, beschreibung, bebilderung } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return errorResponse(400, '"id" hat ein ungültiges Format.');
  }
  if (typeof titel !== 'string' || !titel.trim() || titel.length > MAX_TITEL_LENGTH) {
    return errorResponse(400, `"titel" ist erforderlich (max. ${MAX_TITEL_LENGTH} Zeichen).`);
  }
  if (typeof kategorie !== 'string' || !kategorie) {
    return errorResponse(400, '"kategorie" ist erforderlich.');
  }
  if (typeof status !== 'string' || !STATUS_WERTE.includes(status)) {
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
    const index = ideen.findIndex((i) => i.id === id);
    if (index === -1) {
      return errorResponse(404, `Idee "${id}" nicht gefunden.`);
    }

    const aktualisiert = {
      ...ideen[index],
      titel: titel.trim(),
      kategorie,
      status,
      beschreibung: beschreibung.trim(),
      bebilderung: typeof bebilderung === 'string' ? bebilderung.trim() : '',
      aktualisiert_am: new Date().toISOString(),
    };
    ideen[index] = aktualisiert;

    await writeIdeenFile(ideen, sha, `Update idea: ${aktualisiert.titel}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, idee: aktualisiert }) };
  } catch (error) {
    return errorResponse(500, 'Idee konnte nicht aktualisiert werden.', error.message);
  }
};
