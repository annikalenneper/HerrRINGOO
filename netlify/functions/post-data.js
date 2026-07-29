const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '../../posts');

function collectMarkdownFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      results.push(fullPath);
    }
  }
  return results;
}

// Entfernt die Ausfüllhinweise (HTML-Kommentar) und die "## Caption"-Überschrift
// aus dem Markdown-Body, sodass nur der eigentliche Caption-Text übrig bleibt.
function extractCaption(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s*caption\s*$/im, '')
    .trim();
}

exports.handler = async () => {
  try {
    const files = collectMarkdownFiles(POSTS_DIR);

    const posts = files.map((filePath) => {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);

      return {
        // Voller Repo-Pfad (nicht nur relativ zu posts/): schedule-post.js/publish-post.js
        // erwarten "datei" im Format "posts/01-entwuerfe/...md", da sie damit direkt die
        // GitHub Contents API ansprechen (siehe lib/github.js getFile/moveFile).
        datei: path.join('posts', path.relative(POSTS_DIR, filePath)).split(path.sep).join('/'),
        titel: data.titel || data.beschreibung || '',
        kategorie: data.kategorie || '',
        plattform: data.plattform || '',
        status: data.status || '',
        datum_geplant: data.datum_geplant || '',
        medien: Array.isArray(data.medien) ? data.medien : [],
        caption: extractCaption(content),
      };
    });

    posts.sort((a, b) => a.datei.localeCompare(b.datei));

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-cache' },
      body: JSON.stringify(posts),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Posts konnten nicht geladen werden.', details: error.message }),
    };
  }
};
