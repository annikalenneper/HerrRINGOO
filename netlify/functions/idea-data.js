const { readIdeenFile } = require('./lib/ideen');

// Live über die GitHub-API gelesen (kein Build-Snapshot), exaktes Gegenstück zu post-data.js.
exports.handler = async () => {
  try {
    const { ideen } = await readIdeenFile();
    ideen.sort((a, b) => (b.erstellt_am || '').localeCompare(a.erstellt_am || ''));
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-cache' },
      body: JSON.stringify(ideen),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ideen konnten nicht geladen werden.', details: error.message }),
    };
  }
};
