const { checkSecret } = require('./lib/auth');
const { readKategorienFile, writeKategorienFile } = require('./lib/kategorien');
const { slugify } = require('./lib/slug');

const MAX_LABEL_LENGTH = 60;

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

  const { secret, label, beschreibung, beispiel } = payload;

  if (!checkSecret(secret)) {
    return errorResponse(401, 'Ungültiges oder fehlendes Team-Passwort.');
  }
  if (typeof label !== 'string' || !label.trim() || label.length > MAX_LABEL_LENGTH) {
    return errorResponse(400, `"label" ist erforderlich (max. ${MAX_LABEL_LENGTH} Zeichen).`);
  }

  try {
    const { kategorien, sha } = await readKategorienFile();
    const trimmedLabel = label.trim();

    // Idempotent bei Label-Kollision: zwei Personen, die (fast) gleichzeitig dieselbe
    // Kategorie anlegen, bekommen dieselbe Kategorie zurück statt eines Fehlers oder eines
    // doppelten Eintrags.
    const existing = kategorien.find((k) => k.label.toLowerCase() === trimmedLabel.toLowerCase());
    if (existing) {
      return { statusCode: 200, body: JSON.stringify({ success: true, kategorie: existing, bereitsVorhanden: true }) };
    }

    let key = slugify(trimmedLabel);
    let attempt = 1;
    while (kategorien.some((k) => k.key === key)) {
      attempt += 1;
      if (attempt > 20) {
        return errorResponse(500, 'Zu viele Namenskollisionen beim Anlegen der Kategorie.');
      }
      key = `${slugify(trimmedLabel)}-${attempt}`;
    }

    const neueKategorie = {
      key,
      label: trimmedLabel,
      beschreibung: typeof beschreibung === 'string' ? beschreibung.trim() : '',
      beispiel: typeof beispiel === 'string' ? beispiel.trim() : '',
    };

    kategorien.push(neueKategorie);
    await writeKategorienFile(kategorien, sha, `Add category ${key}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, kategorie: neueKategorie }) };
  } catch (error) {
    return errorResponse(500, 'Kategorie konnte nicht angelegt werden.', error.message);
  }
};
