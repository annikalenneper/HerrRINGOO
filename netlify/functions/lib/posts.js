const matter = require('gray-matter');

// Parst Frontmatter + Body, wendet die übergebenen Feld-Updates auf die Frontmatter an und
// serialisiert wieder zu Markdown. Wird von schedule-post.js und publish-post.js genutzt, um
// bestehende Post-Dateien beim Verschieben in die nächste Workflow-Stufe zu aktualisieren.
function updateFrontmatter(content, updates) {
  const parsed = matter(content);
  Object.assign(parsed.data, updates);
  return matter.stringify(parsed.content, parsed.data);
}

module.exports = { updateFrontmatter };
