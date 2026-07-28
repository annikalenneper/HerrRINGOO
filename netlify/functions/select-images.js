exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiges JSON im Request-Body.' }) };
  }

  const ids = payload.ids;
  const isValid = Array.isArray(ids) && ids.length > 0 && ids.every((id) => typeof id === 'string');

  if (!isValid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '"ids" muss ein nicht-leeres Array von Strings sein.' }),
    };
  }

  // TODO: eigentliche Weiterverarbeitung der ausgewählten Bild-IDs ergänzen
  // (z. B. Speichern in einer Datenbank/Datei, Weiterleiten an einen anderen Dienst,
  // Verknüpfen mit einem Post aus posts/).
  console.log('Ausgewählte Bild-IDs erhalten:', ids);

  return {
    statusCode: 200,
    body: JSON.stringify({ received: ids }),
  };
};
