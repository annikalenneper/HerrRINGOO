const crypto = require('crypto');

// Zeitsicherer Vergleich gegen CREATE_POST_SECRET (einfaches Team-Passwort, kein Nutzer-Login).
// Beide Werte werden vorher gehasht, damit timingSafeEqual (das gleich lange Buffer braucht)
// unabhängig von der tatsächlichen Länge des eingegebenen Passworts funktioniert.
function checkSecret(provided) {
  const expected = process.env.CREATE_POST_SECRET;
  if (!expected || !provided || typeof provided !== 'string') {
    return false;
  }

  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  const providedHash = crypto.createHash('sha256').update(provided).digest();

  return crypto.timingSafeEqual(expectedHash, providedHash);
}

module.exports = { checkSecret };
