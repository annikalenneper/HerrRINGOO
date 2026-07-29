const fs = require('fs');
const path = require('path');

const HASHTAG_FILE = path.join(__dirname, '../../captions/hashtag-sets.md');

// Parst "## Set-Name" + folgenden ```-Codeblock aus captions/hashtag-sets.md zu
// [{ name, hashtags }]. Abschnitte ohne Codeblock (aktuell keine) werden übersprungen.
function parseHashtagSets(content) {
  const sections = content.split(/^## /m).slice(1);

  return sections
    .map((section) => {
      const [titleLine, ...rest] = section.split('\n');
      const body = rest.join('\n');
      const match = body.match(/```([\s\S]*?)```/);
      return {
        name: titleLine.trim(),
        hashtags: match ? match[1].trim() : '',
      };
    })
    .filter((set) => set.hashtags);
}

exports.handler = async () => {
  try {
    const content = fs.readFileSync(HASHTAG_FILE, 'utf8');
    const sets = parseHashtagSets(content);

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(sets),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hashtag-Sets konnten nicht geladen werden.', details: error.message }),
    };
  }
};
