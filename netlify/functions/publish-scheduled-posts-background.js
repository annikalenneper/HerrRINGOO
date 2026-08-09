const matter = require('gray-matter');
const { checkSecret } = require('./lib/auth');
const { listMarkdownFiles, getFile, moveFile } = require('./lib/github');
const { updateFrontmatter } = require('./lib/posts');

// Netlify-Background-Function (Suffix "-background" -> bis zu 15 Min. Laufzeit statt der
// Standard-10-26s, wichtig da mehrere fällige Posts nacheinander verarbeitet werden können).
// Wird per GitHub-Actions-Cron alle 15 Minuten getriggert (siehe
// .github/workflows/publish-scheduled-posts.yml). Setzt NUR den Status - postet nichts
// automatisch auf Instagram (das bleibt zurückgestellt, siehe instagram-publish-plan.md),
// entspricht damit demselben "rein kosmetisch"-Verhalten wie der manuelle
// "Jetzt veröffentlichen"-Button in publish-post.js.
const SOURCE_DIR = 'posts/03-warten-auf-veroeffentlichung';
const TARGET_DIR = 'posts/04-veroeffentlicht';

// datum_geplant ist eine naive Wanduhrzeit ohne Zeitzone (aus einem
// <input type="datetime-local">), faktisch Europe/Berlin - "jetzt" muss für den Vergleich
// ebenfalls als Europe/Berlin-Ortszeit im selben JJJJ-MM-TTThh:mm-Format gebildet werden, sonst
// entsteht durch den UTC-Betrieb von Netlify Functions ein systematischer 1-2-Stunden-Versatz.
function nowBerlinAsDatetimeLocal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    payload = {};
  }

  if (!checkSecret(payload.secret)) {
    console.error('publish-scheduled-posts-background: ungültiges oder fehlendes Team-Passwort.');
    return;
  }

  const now = nowBerlinAsDatetimeLocal();

  let paths;
  try {
    paths = await listMarkdownFiles(`${SOURCE_DIR}/`);
  } catch (error) {
    console.error('publish-scheduled-posts-background: Verzeichnis konnte nicht gelistet werden.', error.message);
    return;
  }

  // Sequentiell statt parallel: vermeidet konkurrierende Git-Schreibzugriffe (jeder Post ist ein
  // eigener Commit, moveFile macht zwei Aufrufe) und GitHub-API-Ratenlimit-Probleme. Fehler bei
  // einem Post (z. B. defektes Frontmatter) blockieren nicht die übrigen fälligen Posts.
  for (const path of paths) {
    try {
      const file = await getFile(path);
      if (!file) continue;

      const content = file.content.toString('utf8');
      const { data } = matter(content);
      if (typeof data.datum_geplant !== 'string' || data.datum_geplant > now) continue;

      const filename = path.slice(SOURCE_DIR.length + 1);
      const targetPath = `${TARGET_DIR}/${filename}`;
      const newContent = updateFrontmatter(content, {
        status: 'veroeffentlicht',
        datum_veroeffentlicht: now.slice(0, 10),
      });

      await moveFile(path, targetPath, `Auto-publish scheduled post: ${filename}`, newContent);
      console.log(`publish-scheduled-posts-background: veröffentlicht - ${path}`);
    } catch (error) {
      console.error(`publish-scheduled-posts-background: Fehler bei ${path}:`, error.message);
    }
  }
};
