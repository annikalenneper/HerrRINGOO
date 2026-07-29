const { google } = require('googleapis');
const { FOLDERS } = require('./lib/drive-folders');

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
