const matter = require('gray-matter');

// Parst Frontmatter + Body, wendet die übergebenen Feld-Updates auf die Frontmatter an und
// serialisiert wieder zu Markdown. Wird von schedule-post.js und publish-post.js genutzt, um
// bestehende Post-Dateien beim Verschieben in die nächste Workflow-Stufe zu aktualisieren.
function updateFrontmatter(content, updates) {
  const parsed = matter(content);
  Object.assign(parsed.data, updates);
  return matter.stringify(parsed.content, parsed.data);
}

// Wie updateFrontmatter, ersetzt zusätzlich den Caption-Body - genutzt von update-post.js,
// um einen bestehenden Entwurf zu bearbeiten (Kategorie/Titel/Caption), ohne medien/status/
// notizen anzufassen (die bleiben, da nicht Teil von frontmatterUpdates, unverändert).
function replaceCaptionAndFrontmatter(content, { frontmatterUpdates, caption }) {
  const parsed = matter(content);
  Object.assign(parsed.data, frontmatterUpdates);
  const newBody = `\n## Caption\n\n${caption}\n`;
  return matter.stringify(newBody, parsed.data);
}

// Entfernt die Ausfüllhinweise (HTML-Kommentar) und die "## Caption"-Überschrift aus dem
// Markdown-Body, sodass nur der eigentliche Caption-Text übrig bleibt. Genutzt von
// post-data.js (Vorschau) und lib/instagram-publish.js (tatsächlicher Instagram-Post).
function extractCaption(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s*caption\s*$/im, '')
    .trim();
}

module.exports = { updateFrontmatter, replaceCaptionAndFrontmatter, extractCaption };
