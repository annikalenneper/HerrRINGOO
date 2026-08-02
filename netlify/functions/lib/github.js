// Dünner Wrapper um die GitHub Contents API (natives fetch, kein Octokit-SDK - siehe
// Entscheidung, Dependencies minimal zu halten). Wird von allen schreibenden Functions
// (create-post.js, schedule-post.js, publish-post.js) genutzt.
const REPO = 'annikalenneper/HerrRINGOO';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;
const API_BASE_TREES = `https://api.github.com/repos/${REPO}/git/trees`;

function authHeaders() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN ist nicht konfiguriert.');
  }
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function encodePath(filePath) {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

async function readErrorDetails(response) {
  try {
    const data = await response.json();
    return data.message || JSON.stringify(data);
  } catch (error) {
    return response.statusText;
  }
}

// Liefert { sha, content (Buffer) } oder null, wenn die Datei nicht existiert.
async function getFile(filePath) {
  const response = await fetch(`${API_BASE}/${encodePath(filePath)}`, { headers: authHeaders() });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub-Lesezugriff auf "${filePath}" fehlgeschlagen: ${await readErrorDetails(response)}`);
  }

  const data = await response.json();
  return {
    sha: data.sha,
    content: Buffer.from(data.content, 'base64'),
  };
}

// Erstellt oder aktualisiert (wenn sha übergeben wird) eine Datei.
async function putFile(filePath, content, message, sha) {
  const body = {
    message,
    content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(String(content), 'utf8').toString('base64'),
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(`${API_BASE}/${encodePath(filePath)}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GitHub-Schreibzugriff auf "${filePath}" fehlgeschlagen: ${await readErrorDetails(response)}`);
  }

  return response.json();
}

async function deleteFile(filePath, sha, message) {
  const response = await fetch(`${API_BASE}/${encodePath(filePath)}`, {
    method: 'DELETE',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha }),
  });

  if (!response.ok) {
    throw new Error(`GitHub-Löschzugriff auf "${filePath}" fehlgeschlagen: ${await readErrorDetails(response)}`);
  }

  return response.json();
}

// Verschiebt eine Datei (get -> put am neuen Pfad -> delete am alten Pfad). Optional kann
// newContent den Inhalt beim Verschieben ersetzen (z. B. aktualisiertes Frontmatter).
async function moveFile(oldPath, newPath, message, newContent) {
  const existing = await getFile(oldPath);
  if (!existing) {
    throw new Error(`Datei "${oldPath}" nicht gefunden, kann nicht verschoben werden.`);
  }

  const content = newContent !== undefined ? newContent : existing.content;
  await putFile(newPath, content, message);
  await deleteFile(oldPath, existing.sha, message);
}

// Listet alle Datei-Pfade unterhalb von `prefix` (z. B. "posts/"), die auf `.md` enden -
// ein einziger API-Call für die komplette Verzeichnisstruktur (rekursiv), unabhängig von der
// Anzahl Unterordner. Genutzt von post-data.js, um Posts live aus GitHub zu lesen statt aus
// dem beim Deploy gebündelten Function-Snapshot (der sonst erst nach einem Redeploy den
// aktuellen Stand zeigen würde).
async function listMarkdownFiles(prefix) {
  const response = await fetch(`${API_BASE_TREES}/${BRANCH}?recursive=1`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub-Verzeichnisabruf fehlgeschlagen: ${await readErrorDetails(response)}`);
  }

  const data = await response.json();
  if (data.truncated) {
    throw new Error('GitHub-Verzeichnisbaum ist zu groß für eine einzelne Anfrage (truncated).');
  }

  return (data.tree || [])
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && entry.path.toLowerCase().endsWith('.md'))
    .map((entry) => entry.path);
}

// Listet alle Bild-Dateien (jpg/jpeg/png) unterhalb von `prefix` - Analog zu listMarkdownFiles,
// aber für Bilder. Genutzt von images.js, um den "uploads"-Ordner (siehe upload-image.js) direkt
// aus dem Repo statt aus Google Drive aufzulisten.
async function listImageFiles(prefix) {
  const response = await fetch(`${API_BASE_TREES}/${BRANCH}?recursive=1`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub-Verzeichnisabruf fehlgeschlagen: ${await readErrorDetails(response)}`);
  }

  const data = await response.json();
  if (data.truncated) {
    throw new Error('GitHub-Verzeichnisbaum ist zu groß für eine einzelne Anfrage (truncated).');
  }

  return (data.tree || [])
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && /\.(jpe?g|png)$/i.test(entry.path))
    .map((entry) => entry.path);
}

module.exports = { getFile, putFile, deleteFile, moveFile, listMarkdownFiles, listImageFiles, REPO };
