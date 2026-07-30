(function () {
  // Baut die Instagram-Mock-Karte aus einer fertigen Bild-URL + Caption. Wird für bestehende
  // Posts (Bild liegt statisch unter planungs-webseite/medien/, siehe post-erstellen.js) und
  // die Abschluss-Vorschau im "Post erstellen"-Wizard (Bild kommt direkt von Google Drive,
  // siehe post-erstellen-wizard.js) gleichermaßen verwendet – daher bekommt die Funktion die
  // fertige URL statt eines internen Repo-Pfads.
  function buildMock({ imageUrl, imageAlt, caption }) {
    const mock = document.createElement('article');
    mock.className = 'ig-mock';

    const header = document.createElement('div');
    header.className = 'ig-mock-header';
    header.innerHTML = '<span class="ig-mock-avatar" aria-hidden="true"><img src="medien/logos/logo-schwarz-gold.png" alt=""></span><span class="ig-mock-username">herr.ringoo</span>';
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

  window.PostShared = { buildMock };
})();
