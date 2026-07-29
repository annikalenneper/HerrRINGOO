(function () {
  const STATUS_BADGES = {
    entwurf: '📝',
    bereit: '✅',
    veroeffentlicht: '🚀',
  };

  function formatDate(value) {
    if (!value || value === 'JJJJ-MM-TT') {
      return 'noch nicht geplant';
    }
    return value;
  }

  function buildMock(post) {
    const mock = document.createElement('article');
    mock.className = 'ig-mock';

    const header = document.createElement('div');
    header.className = 'ig-mock-header';
    header.innerHTML = '<span class="ig-mock-avatar" aria-hidden="true">HR</span><span class="ig-mock-username">herr.ringoo</span>';
    mock.appendChild(header);

    const firstImage = post.medien[0];
    if (firstImage) {
      const media = document.createElement('div');
      media.className = 'ig-mock-media';
      const img = document.createElement('img');
      img.src = `/.netlify/functions/media?path=${encodeURIComponent(firstImage)}`;
      img.alt = post.titel || firstImage;
      img.loading = 'lazy';
      media.appendChild(img);
      mock.appendChild(media);
    }

    const actions = document.createElement('div');
    actions.className = 'ig-mock-actions';
    actions.setAttribute('aria-hidden', 'true');
    actions.innerHTML = '<span>&#9825;</span><span>&#128172;</span><span>&#10148;</span><span class="ig-mock-save">&#128278;</span>';
    mock.appendChild(actions);

    const caption = document.createElement('p');
    caption.className = 'ig-mock-caption';
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'ig-mock-username';
    usernameSpan.textContent = 'herr.ringoo';
    caption.appendChild(usernameSpan);
    caption.appendChild(document.createTextNode(' ' + post.caption));
    mock.appendChild(caption);

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
  // keine weitere Aktion mehr.
  function buildActions(post) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-preview-actions';

    if (post.status !== 'entwurf' && post.status !== 'bereit') {
      return wrapper;
    }

    const isEntwurf = post.status === 'entwurf';
    const endpoint = isEntwurf ? 'schedule-post' : 'publish-post';
    const dateField = isEntwurf ? 'datum_geplant' : 'datum_veroeffentlicht';
    const buttonLabel = isEntwurf ? '✅ Als bereit markieren' : '🚀 Als veröffentlicht markieren';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = isEntwurf
      ? (post.datum_geplant && post.datum_geplant !== 'JJJJ-MM-TT' ? post.datum_geplant : '')
      : todayISO();
    wrapper.appendChild(dateInput);

    let passwortInput = null;
    const cachedPasswort = sessionStorage.getItem('teamPasswort');
    if (!cachedPasswort) {
      passwortInput = document.createElement('input');
      passwortInput.type = 'password';
      passwortInput.placeholder = 'Team-Passwort';
      passwortInput.autocomplete = 'off';
      wrapper.appendChild(passwortInput);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'selection-submit';
    button.textContent = buttonLabel;
    wrapper.appendChild(button);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    wrapper.appendChild(status);

    button.addEventListener('click', async () => {
      const secret = cachedPasswort || (passwortInput ? passwortInput.value : '');
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Bitte das Team-Passwort eingeben.';
        return;
      }
      if (!dateInput.value) {
        status.className = 'gallery-status error';
        status.textContent = 'Bitte ein Datum wählen.';
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
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        sessionStorage.setItem('teamPasswort', secret);
        status.className = 'gallery-status';
        status.textContent = 'Aktualisiert – erscheint nach dem automatischen Redeploy (ca. 1–2 Min.) in der Vorschau.';
        setTimeout(loadPosts, 3000);
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
    card.appendChild(buildMock(post));
    card.appendChild(buildMeta(post));
    card.appendChild(buildActions(post));
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

  loadPosts();
})();
