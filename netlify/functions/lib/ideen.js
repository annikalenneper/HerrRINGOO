const { getFile, putFile } = require('./github');

const IDEEN_PATH = 'ideensammlung/ideen.json';

async function readIdeenFile() {
  const file = await getFile(IDEEN_PATH);
  if (!file) return { ideen: [], sha: null };
  return { ideen: JSON.parse(file.content.toString('utf8')), sha: file.sha };
}

async function writeIdeenFile(ideen, sha, message) {
  await putFile(IDEEN_PATH, JSON.stringify(ideen, null, 2) + '\n', message, sha);
}

// idea-<timestamp>, mit Kollisionsschleife für den seltenen Fall, dass zwei Ideen in derselben
// Millisekunde angelegt werden.
function generateIdeeId(existingIds) {
  let id = `idea-${Date.now()}`;
  let attempt = 1;
  while (existingIds.has(id)) {
    attempt += 1;
    id = `idea-${Date.now()}-${attempt}`;
  }
  return id;
}

module.exports = { IDEEN_PATH, readIdeenFile, writeIdeenFile, generateIdeeId };
