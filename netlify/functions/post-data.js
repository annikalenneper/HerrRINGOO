const matter = require('gray-matter');
const { listMarkdownFiles, getFile } = require('./lib/github');

const POSTS_PREFIX = 'posts/';

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
    const allPaths = await listMarkdownFiles(POSTS_PREFIX);
    const paths = allPaths.filter((filePath) => {
      const basename = filePath.slice(filePath.lastIndexOf('/') + 1).toLowerCase();
      return !basename.startsWith('_') && !basename.startsWith('.') && basename !== 'readme.md';
    });

    // Live über die GitHub-API statt aus einem beim Deploy gebündelten Snapshot - ein neuer
    // oder geänderter Post ist dadurch sofort sichtbar, ganz ohne auf den nächsten
    // automatischen Redeploy warten zu müssen.
    const posts = await Promise.all(paths.map(async (filePath) => {
      const file = await getFile(filePath);
      const { data, content } = matter(file.content.toString('utf8'));

      return {
        datei: filePath,
        titel: data.titel || data.beschreibung || '',
        kategorie: data.kategorie || '',
        plattform: data.plattform || '',
        status: data.status || '',
        datum_geplant: data.datum_geplant || '',
        medien: Array.isArray(data.medien) ? data.medien : [],
        caption: extractCaption(content),
      };
    }));

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
