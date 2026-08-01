const { getFile, putFile } = require('./github');

// Einzelne JSON-Datei statt Datei-pro-Kategorie (wie bei posts/) - die Datenmenge ist klein und
// wird ausschließlich über die Tool-Seiten (Post erstellen, Ideensammlung) gepflegt, nie von
// Hand editiert. Ersetzt das frühere, hart codierte CATEGORIES-Array (lib/categories.js), das
// unabhängig von einer zweiten Kopie im Frontend (post-steps-shared.js) manuell synchron
// gehalten werden musste - jetzt gibt es nur noch diese eine, live gelesene Quelle.
const KATEGORIEN_PATH = 'kategorien/kategorien.json';

async function readKategorienFile() {
  const file = await getFile(KATEGORIEN_PATH);
  if (!file) return { kategorien: [], sha: null };
  return { kategorien: JSON.parse(file.content.toString('utf8')), sha: file.sha };
}

async function writeKategorienFile(kategorien, sha, message) {
  await putFile(KATEGORIEN_PATH, JSON.stringify(kategorien, null, 2) + '\n', message, sha);
}

module.exports = { KATEGORIEN_PATH, readKategorienFile, writeKategorienFile };
