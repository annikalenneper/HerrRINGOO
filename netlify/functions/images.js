const { google } = require('googleapis');

// Ordner-Zuordnung: Schlüssel (vom Frontend als ?folder=... übergeben) -> Drive-Ordner-ID.
// Übersicht/Quelle der Ordner-Links: ../../medien/README.md
// Setup außerhalb des Codes: jeder dieser Ordner muss in Google Drive für die
// E-Mail-Adresse des Service Accounts (client_email im JSON-Key) freigegeben werden
// (Betrachter-Rechte reichen).
const FOLDERS = {
  'presse-mappe': { id: '1wzsyXw45STnDdLvQDelglKD_8c8bDcdV', label: 'Presse-Mappe' },
  'bilder-daniel': { id: '1D6cqdA07n0lmV9l6ECLi6KZvKWWKpqw4', label: 'Bilder Daniel' },
  'bilder-deik': { id: '1WQ_EhlZkT3L8-6oMFSLOkj2MuvpEIcr7', label: 'Bilder Deik' },
  'behind-the-scenes': { id: '15xhOUBX0cWsXq31SekyS7atQqf0z7Kg4', label: 'Fotos Videodreh "Behind the Scenes"' },
  'bilder-geschaeft': { id: '1HBYGEtiMaNhXHEleVlr9gIdJLqtWrK97', label: 'Bilder Geschäft' },
  anzeigen: { id: '1IIPdG9wdxSfUoPTQobKLYS1YXzUji0Uu', label: 'Anzeigen (Magazine, Zeitschriften etc.)' },
};

exports.handler = async (event) => {
  const folderKey = event.queryStringParameters && event.queryStringParameters.folder;
  const folder = FOLDERS[folderKey];

  if (!folder) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Unbekannter oder fehlender Ordner-Schlüssel "${folderKey || ''}". Gültige Werte: ${Object.keys(FOLDERS).join(', ')}`,
      }),
    };
  }

  try {
    // Setup außerhalb des Codes: GOOGLE_SERVICE_ACCOUNT_JSON muss als Netlify-Umgebungsvariable
    // mit dem vollständigen JSON-Key des Service Accounts befüllt sein (siehe netlify/README.md).
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, thumbnailLink)',
      pageSize: 1000,
    });

    const images = (response.data.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      thumbnailLink: file.thumbnailLink,
    }));

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=600' },
      body: JSON.stringify(images),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Bilder konnten nicht geladen werden.', details: error.message }),
    };
  }
};
