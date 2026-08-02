const sharp = require('sharp');

// Gemeinsame Bildkompression für create-post.js (Drive-Import) und upload-image.js (direkter
// Upload): Instagram skaliert Feed-Bilder ohnehin auf max. 1080px herunter - ein größeres
// Original bringt keine sichtbare Qualität, nur unnötige Upload-Zeit (Base64 zu GitHub ist der
// langsame Teil, siehe Netlify-Function-Zeitlimit). Qualität 82 ist fürs Auge praktisch
// verlustfrei, aber deutlich kleiner als ein unkomprimiertes Original. Immer JPEG, unabhängig
// vom Eingabeformat.
const MAX_BILD_KANTE = 1080;
const JPEG_QUALITAET = 82;

function compressImage(buffer) {
  return sharp(buffer)
    .resize({
      width: MAX_BILD_KANTE,
      height: MAX_BILD_KANTE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITAET })
    .toBuffer();
}

module.exports = { compressImage };
