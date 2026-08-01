const { readKategorienFile } = require('./lib/kategorien');

// Live über die GitHub-API gelesen (kein Build-Snapshot), exaktes Gegenstück zu post-data.js -
// genutzt vom "Post erstellen"/"Entwurf bearbeiten"-Flow und von der Ideensammlung.
exports.handler = async () => {
  try {
    const { kategorien } = await readKategorienFile();
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-cache' },
      body: JSON.stringify(kategorien),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Kategorien konnten nicht geladen werden.', details: error.message }),
    };
  }
};
