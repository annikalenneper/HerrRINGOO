(function () {
  const STATUS_BADGES = {
    entwurf: '📝',
    bereit: '✅',
    veroeffentlicht: '🚀',
  };

  const STATUS_LABELS = {
    bereit: 'bereit',
    veroeffentlicht: 'veröffentlicht',
  };

  function formatDate(value) {
    if (!value || value === 'JJJJ-MM-TT') {
      return 'noch nicht geplant';
    }
    return value;
  }

  // Baut die Instagram-Mock-Karte aus einer fertigen Bild-URL + Caption. Wird sowohl für
  // bestehende Posts (Bild kommt aus dem Repo über /.netlify/functions/media) als auch für
  // die Abschluss-Vorschau im "Post erstellen"-Wizard (Bild kommt direkt von Google Drive)
  // verwendet – daher bekommt die Funktion die fertige URL statt eines internen Repo-Pfads.
  function buildMock({ imageUrl, imageAlt, caption }) {
    const mock = document.createElement('article');
    mock.className = 'ig-mock';

    const header = document.createElement('div');
    header.className = 'ig-mock-header';
    header.innerHTML = '<span class="ig-mock-avatar" aria-hidden="true">HR</span><span class="ig-mock-username">herr.ringoo</span>';
    mock.appendChild(header);

    if (imageUrl) {
      const media = document.createElement('div');
      media.className = 'ig-mock-media';
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = imageAlt || '';
      img.loading = 'lazy';
      media.appendChild(img);
      mock.appendChild(media);
    }

    const actions = document.createElement('div');
    actions.className = 'ig-mock-actions';
    actions.setAttribute('aria-hidden', 'true');
    actions.innerHTML = '<span>&#9825;</span><span>&#128172;</span><span>&#10148;</span><span class="ig-mock-save">&#128278;</span>';
    mock.appendChild(actions);

    const captionEl = document.createElement('p');
    captionEl.className = 'ig-mock-caption';
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'ig-mock-username';
    usernameSpan.textContent = 'herr.ringoo';
    captionEl.appendChild(usernameSpan);
    captionEl.appendChild(document.createTextNode(' ' + (caption || '')));
    mock.appendChild(captionEl);

    return mock;
  }

  function buildMeta(post) {
    const meta = document.createElement('div');
    meta.className = 'post-preview-meta';

    const statusEl = document.createElement('span');
    statusEl.className = 'source-note';
    statusEl.textContent = `${STATUS_BADGES[post.status] || '❔'} ${post.status || 'unbekannt'}`;
    meta.appendChild(statusEl);

    const kategorieEl = document.createElement('span');
    kategorieEl.textContent = `Kategorie: ${post.kategorie || '–'}`;
    meta.appendChild(kategorieEl);

    const datumEl = document.createElement('span');
    datumEl.textContent = `Geplant: ${formatDate(post.datum_geplant)}`;
    meta.appendChild(datumEl);

    const dateiEl = document.createElement('span');
    dateiEl.textContent = `Datei: ${post.datei}`;
    meta.appendChild(dateiEl);

    return meta;
  }

  function todayISO() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Schiebt einen Post zur nächsten Workflow-Stufe (entwurf -> bereit -> veroeffentlicht).
  // Zeigt je nach Status den passenden Button + ein Datumsfeld; bei veroeffentlicht gibt es
  // keine weitere Aktion mehr. Vor dem eigentlichen Markieren wird die Aktion per
  // Bestätigungsdialog abgesichert, das Team-Passwort kommt sitzungsweit aus team-auth.js.
  function buildActions(post, onUpdated) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-preview-actions';

    if (post.status !== 'entwurf' && post.status !== 'bereit') {
      return wrapper;
    }

    const isEntwurf = post.status === 'entwurf';
    const endpoint = isEntwurf ? 'schedule-post' : 'publish-post';
    const dateField = isEntwurf ? 'datum_geplant' : 'datum_veroeffentlicht';
    const buttonLabel = isEntwurf ? '✅ Als bereit markieren' : '🚀 Als veröffentlicht markieren';
    const targetStatusLabel = isEntwurf ? STATUS_LABELS.bereit : STATUS_LABELS.veroeffentlicht;

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = isEntwurf
      ? (post.datum_geplant && post.datum_geplant !== 'JJJJ-MM-TT' ? post.datum_geplant : '')
      : todayISO();
    wrapper.appendChild(dateInput);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'selection-submit btn-primary';
    button.textContent = buttonLabel;
    wrapper.appendChild(button);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    wrapper.appendChild(status);

    button.addEventListener('click', async () => {
      if (!dateInput.value) {
        status.className = 'gallery-status error';
        status.textContent = 'Bitte ein Datum wählen.';
        return;
      }

      const confirmed = await window.ConfirmDialog.confirmAction({
        titel: 'Aktion bestätigen',
        nachricht: `Post am ${dateInput.value} als ${targetStatusLabel} markieren?`,
        bestaetigenLabel: 'Ja, markieren',
        abbrechenLabel: 'Abbrechen',
      });
      if (!confirmed) return;

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann diese Aktion nicht ausgeführt werden.';
        return;
      }

      button.disabled = true;
      status.className = 'gallery-status';
      status.textContent = 'Wird aktualisiert …';

      try {
        const response = await fetch(`/.netlify/functions/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, datei: post.datei, [dateField]: dateInput.value }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            window.TeamAuth.clearCachedSecret();
          }
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Aktualisiert – erscheint nach dem automatischen Redeploy (ca. 1–2 Min.) in der Vorschau.';
        setTimeout(onUpdated, 3000);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Aktion fehlgeschlagen: ${error.message}`;
        button.disabled = false;
      }
    });

    return wrapper;
  }

  function buildCard(post) {
    const card = document.createElement('div');
    card.className = 'post-preview';

    const firstImage = post.medien[0];
    card.appendChild(buildMock({
      imageUrl: firstImage ? `/.netlify/functions/media?path=${encodeURIComponent(firstImage)}` : null,
      imageAlt: post.titel || firstImage,
      caption: post.caption,
    }));
    card.appendChild(buildMeta(post));
    card.appendChild(buildActions(post, loadPosts));
    return card;
  }

  async function loadPosts() {
    const grid = document.querySelector('[data-post-grid]');

    try {
      const response = await fetch('/.netlify/functions/post-data');
      const data = await response.json();

      if (!response.ok) {
        const message = data.details ? `${data.error} (${data.details})` : data.error;
        throw new Error(message || data.errorMessage || `HTTP ${response.status}`);
      }

      grid.innerHTML = '';

      if (data.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'gallery-status';
        empty.textContent = 'Noch keine Post-Entwürfe gefunden.';
        grid.appendChild(empty);
        return;
      }

      data.forEach((post) => grid.appendChild(buildCard(post)));
    } catch (error) {
      grid.innerHTML = '';
      const errorEl = document.createElement('p');
      errorEl.className = 'gallery-status error';
      errorEl.textContent = `Posts konnten nicht geladen werden: ${error.message}`;
      grid.appendChild(errorEl);
    }
  }

  // Von post-erstellen-wizard.js genutzt: gleiche Mock-Darstellung für die Abschluss-Vorschau,
  // gleiche Reload-Funktion nach erfolgreichem Speichern.
  window.PostShared = { buildMock, reloadPosts: loadPosts };

  loadPosts();
})();
