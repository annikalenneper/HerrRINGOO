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

  function buildCard(post) {
    const card = document.createElement('div');
    card.className = 'post-preview';
    card.appendChild(buildMock(post));
    card.appendChild(buildMeta(post));
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
