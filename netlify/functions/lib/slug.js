// Slug-Erzeugung (Umlaut-Transliteration + Kleinschreibung + Bindestriche), genutzt von
// create-post.js (Post-Dateiname) und create-kategorie.js (Kategorie-Kürzel). War früher nur
// inline in create-post.js, hierher extrahiert, damit beide Stellen dieselbe Logik teilen.
function slugify(input) {
  const base = input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'eintrag';
}

module.exports = { slugify };
