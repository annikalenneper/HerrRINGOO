const matter = require('gray-matter');
const { listMarkdownFiles, getFile } = require('./lib/github');
const { extractCaption } = require('./lib/posts');

const POSTS_PREFIX = 'posts/';

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
        erstellt_am: data.erstellt_am || '',
        autor: data.autor || '',
        freigegeben_von: data.freigegeben_von || '',
        kommentare: Array.isArray(data.kommentare) ? data.kommentare : [],
        datum_geplant: data.datum_geplant || '',
        medien: Array.isArray(data.medien) ? data.medien : [],
        caption: extractCaption(content),
      };
    }));

    // Neueste zuerst. Ältere Posts ohne erstellt_am (vor Einführung dieses Felds) landen ans
    // Ende, untereinander weiter alphabetisch nach Dateiname sortiert (Fallback für Altbestand).
    posts.sort((a, b) => {
      if (a.erstellt_am && b.erstellt_am) return b.erstellt_am.localeCompare(a.erstellt_am);
      if (a.erstellt_am !== b.erstellt_am) return a.erstellt_am ? -1 : 1;
      return a.datei.localeCompare(b.datei);
    });

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
