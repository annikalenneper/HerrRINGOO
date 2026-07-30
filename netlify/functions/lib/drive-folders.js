// Ordner-Zuordnung: Schlüssel (vom Frontend als ?folder=... übergeben) -> Drive-Ordner-ID.
// Übersicht/Quelle der Ordner-Links: ../../../planungs-webseite/medien/README.md
// Setup außerhalb des Codes: jeder dieser Ordner muss in Google Drive für die
// E-Mail-Adresse des Service Accounts (client_email im JSON-Key) freigegeben werden
// (Betrachter-Rechte reichen).
// Liegt in lib/, nicht auf Top-Level des Functions-Ordners: eine Datei/ein Ordner mit exakt
// dem Namen einer Function (z. B. "posts") kollidiert dort mit Netlifys Function-Bundler
// (siehe Git-Historie: posts.js -> post-data.js). lib/ ist der dokumentierte Weg für
// gemeinsamen Code, der von mehreren Functions per require() eingebunden wird.
const FOLDERS = {
  'presse-mappe': { id: '1wzsyXw45STnDdLvQDelglKD_8c8bDcdV', label: 'Presse-Mappe' },
  'bilder-daniel': { id: '1D6cqdA07n0lmV9l6ECLi6KZvKWWKpqw4', label: 'Bilder Daniel' },
  'bilder-deik': { id: '1WQ_EhlZkT3L8-6oMFSLOkj2MuvpEIcr7', label: 'Bilder Deik' },
  'behind-the-scenes': { id: '15xhOUBX0cWsXq31SekyS7atQqf0z7Kg4', label: 'Fotos Videodreh "Behind the Scenes"' },
  'bilder-geschaeft': { id: '1HBYGEtiMaNhXHEleVlr9gIdJLqtWrK97', label: 'Bilder Geschäft' },
  anzeigen: { id: '1IIPdG9wdxSfUoPTQobKLYS1YXzUji0Uu', label: 'Anzeigen (Magazine, Zeitschriften etc.)' },
};

module.exports = { FOLDERS };
