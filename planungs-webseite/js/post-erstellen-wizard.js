(function () {
  // Feature-Datei für den "Post erstellen"-Flow. Kategorie/Titel/Caption-Schritte kommen aus
  // post-steps-shared.js (window.PostSteps). Nur der Bild-Schritt (Mehrfachauswahl mit
  // Dropdown + Paging) und die Abschluss-Vorschau sind hier feature-spezifisch.

  // Muss mit netlify/functions/lib/drive-folders.js synchron gehalten werden.
  const FOLDERS = [
    { key: 'presse-mappe', label: 'Presse-Mappe' },
    { key: 'bilder-daniel', label: 'Bilder Daniel' },
    { key: 'bilder-deik', label: 'Bilder Deik' },
    { key: 'behind-the-scenes', label: 'Fotos Videodreh "Behind the Scenes"' },
    { key: 'bilder-geschaeft', label: 'Bilder Geschäft' },
    { key: 'anzeigen', label: 'Anzeigen (Magazine, Zeitschriften etc.)' },
  ];
  const PAGE_SIZE = 60;

  const { appendNav, buildFinalCaption, mountKategorieStep, validateKategorie, mountTitelStep, validateTitel, mountCaptionStep, validateCaption, CATEGORIES } = window.PostSteps;

  // --- Schritt 1: Bild(er) ---
  //
  // Mehrfachauswahl statt Einzelbild: state.bilder (Array von { id, name, folderKey,
  // thumbnailLink }) ist die alleinige Quelle der Wahrheit und bleibt ordnerübergreifend
  // erhalten. Beim (Wieder-)Mounten des Schritts wird daraus eine Map zum schnellen Lookup
  // rekonstruiert; jede Änderung fließt sofort zurück in state.bilder.

  function validateBild(state) {
    if (!state.bilder || state.bilder.length === 0) {
      return { valid: false, errors: { bild: 'Bitte mindestens ein Bild auswählen.' } };
    }
    return { valid: true };
  }

  function mountBildStep(container, state, helpers) {
    if (!state.bilder) state.bilder = [];
    const selected = new Map(state.bilder.map((b) => [b.id, b]));
    let currentFolderKey = state.bilder[0] ? state.bilder[0].folderKey : FOLDERS[0].key;
    let nextPageToken = null;

    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'bild');

    const label = document.createElement('label');
    label.setAttribute('for', 'wizard-bild-ordner');
    label.textContent = 'Ordner';
    group.appendChild(label);

    const select = document.createElement('select');
    select.id = 'wizard-bild-ordner';
    FOLDERS.forEach(({ key, label: folderLabel }) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = folderLabel;
      select.appendChild(option);
    });
    select.value = currentFolderKey;
    group.appendChild(select);

    const gallery = document.createElement('div');
    gallery.className = 'image-grid';
    group.appendChild(gallery);

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'selection-submit btn-secondary';
    loadMoreBtn.setAttribute('data-load-more', '');
    loadMoreBtn.textContent = 'Mehr laden';
    loadMoreBtn.hidden = true;
    group.appendChild(loadMoreBtn);

    const info = document.createElement('p');
    info.className = 'selected-image-info';
    group.appendChild(info);
    container.appendChild(group);

    const nav = appendNav(container, helpers, { showBack: false, validate: validateBild, state });

    function updateInfo() {
      if (state.bilder.length > 0) {
        info.textContent = `${state.bilder.length} Bild${state.bilder.length === 1 ? '' : 'er'} ausgewählt`;
        info.classList.add('confirmed');
      } else {
        info.textContent = 'Noch kein Bild ausgewählt.';
        info.classList.remove('confirmed');
      }
    }
    updateInfo();

    function syncState() {
      state.bilder = Array.from(selected.values());
      updateInfo();
      nav.refresh();
    }

    function appendImages(images, folderKey, folderLabel) {
      images.forEach((image) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        if (selected.has(image.id)) card.classList.add('selected');

        const img = document.createElement('img');
        img.src = image.thumbnailLink;
        img.alt = image.name;
        img.loading = 'lazy';

        const tag = document.createElement('div');
        tag.className = 'image-tag';
        tag.textContent = image.name;

        card.appendChild(img);
        card.appendChild(tag);
        card.addEventListener('click', () => {
          if (selected.has(image.id)) {
            selected.delete(image.id);
            card.classList.remove('selected');
          } else {
            selected.set(image.id, { id: image.id, name: image.name, folderKey, folderLabel, thumbnailLink: image.thumbnailLink });
            card.classList.add('selected');
          }
          syncState();
        });

        gallery.appendChild(card);
      });
    }

    async function loadPage(folderKey, pageToken) {
      const folderLabel = (FOLDERS.find((f) => f.key === folderKey) || {}).label || folderKey;
      const params = new URLSearchParams({ folder: folderKey, pageSize: String(PAGE_SIZE) });
      if (pageToken) params.set('pageToken', pageToken);

      loadMoreBtn.hidden = true;
      if (!pageToken) {
        gallery.innerHTML = '<p class="gallery-status" aria-live="polite">Bilder werden geladen …</p>';
      } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Lädt …';
      }

      try {
        const response = await fetch(`/.netlify/functions/images?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        if (!pageToken) gallery.innerHTML = '';

        if (!pageToken && data.images.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'gallery-status';
          empty.textContent = 'Keine Bilder in diesem Ordner gefunden.';
          gallery.appendChild(empty);
        } else {
          appendImages(data.images, folderKey, folderLabel);
        }

        nextPageToken = data.nextPageToken;
        loadMoreBtn.hidden = !nextPageToken;
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Mehr laden';
      } catch (error) {
        if (!pageToken) gallery.innerHTML = '';
        const errorEl = document.createElement('p');
        errorEl.className = 'gallery-status error';
        errorEl.textContent = `Bilder konnten nicht geladen werden: ${error.message}`;
        gallery.appendChild(errorEl);
        loadMoreBtn.hidden = true;
      }
    }

    select.addEventListener('change', () => {
      currentFolderKey = select.value;
      nextPageToken = null;
      loadPage(currentFolderKey, null);
    });

    loadMoreBtn.addEventListener('click', () => {
      if (nextPageToken) loadPage(currentFolderKey, nextPageToken);
    });

    loadPage(currentFolderKey, null);
  }

  // --- Schritt 5: Abschluss-Vorschau ---

  function mountVorschauStep(container, state, helpers) {
    const hint = document.createElement('p');
    hint.className = 'wizard-step-hint';
    hint.textContent = `So sieht dein Post aus (${state.bilder.length} Bild${state.bilder.length === 1 ? '' : 'er'}). Prüfe alles noch einmal, bevor du speicherst.`;
    container.appendChild(hint);

    container.appendChild(window.PostShared.buildMock({
      images: state.bilder.map((bild) => ({ url: bild.thumbnailLink, alt: bild.name })),
      caption: buildFinalCaption(state),
    }));

    if (state.bilder.length > 1) {
      const hintSwipe = document.createElement('p');
      hintSwipe.className = 'wizard-step-hint';
      hintSwipe.textContent = 'Durch die Bilder oben lässt sich wie bei Instagram wischen (oder die Pfeile nutzen).';
      container.appendChild(hintSwipe);
    }

    const meta = document.createElement('div');
    meta.className = 'post-preview-meta';
    const kategorie = CATEGORIES.find((c) => c.key === state.kategorie);
    const kategorieEl = document.createElement('span');
    kategorieEl.textContent = `Kategorie: ${kategorie ? kategorie.label : '–'}`;
    meta.appendChild(kategorieEl);
    const titelEl = document.createElement('span');
    titelEl.textContent = `Titel: ${state.titel}`;
    meta.appendChild(titelEl);
    container.appendChild(meta);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('data-field', 'submit');
    status.setAttribute('aria-live', 'polite');
    container.appendChild(status);

    const nav = document.createElement('div');
    nav.className = 'wizard-nav';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'selection-submit btn-secondary';
    backBtn.setAttribute('data-wizard-nav', '');
    backBtn.textContent = 'Zurück zum Bearbeiten';
    backBtn.addEventListener('click', helpers.back);
    nav.appendChild(backBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'selection-submit btn-primary';
    confirmBtn.setAttribute('data-wizard-nav', '');
    confirmBtn.textContent = 'Bestätigen & Post speichern';
    nav.appendChild(confirmBtn);
    container.appendChild(nav);

    async function submitPost(secret) {
      const response = await fetch('/.netlify/functions/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          titel: (state.titel || '').trim(),
          kategorie: state.kategorie,
          bilder: state.bilder.map((b) => ({ bildFolder: b.folderKey, bildId: b.id })),
          caption: buildFinalCaption(state),
        }),
      });
      const data = await response.json();
      return { response, data };
    }

    confirmBtn.addEventListener('click', async () => {
      helpers.setBusy(true);
      status.className = 'gallery-status';
      status.textContent = 'Post wird gespeichert …';

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        helpers.setBusy(false);
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann der Post nicht gespeichert werden.';
        return;
      }

      try {
        const { response, data } = await submitPost(secret);

        if (!response.ok) {
          // Fehler-Taxonomie: 401 (Passwort falsch/abgelaufen), 400 (z. B. Bild nicht mehr
          // im erwarteten Ordner – zurück zu Schritt 1 springen), 500 (Server-/Teilfehler,
          // Retry ohne Datenverlust). state bleibt in allen Fällen vollständig erhalten.
          if (response.status === 401) {
            window.TeamAuth.clearCachedSecret();
            status.className = 'gallery-status error';
            status.textContent = 'Team-Passwort war falsch oder abgelaufen. Bitte erneut versuchen.';
            helpers.setBusy(false);
            return;
          }
          if (response.status === 400) {
            status.className = 'gallery-status error';
            status.textContent = `${data.details ? `${data.error} (${data.details})` : data.error} – bitte Schritt 1 prüfen.`;
            helpers.setBusy(false);
            helpers.goTo('bild');
            return;
          }
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = `Post gespeichert (${data.datei}) – erscheint nach dem automatischen Redeploy (ca. 1–2 Min.) in der Vorschau.`;
        confirmBtn.disabled = true;
        backBtn.disabled = true;
        setTimeout(helpers.finish, 2000);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Post konnte nicht gespeichert werden: ${error.message}`;
        helpers.setBusy(false);
      }
    });
  }

  // --- Wizard zusammensetzen + View-Umschaltung ---

  const STEPS = [
    { id: 'bild', titel: 'Bild(er)', mount: mountBildStep, validate: validateBild },
    { id: 'kategorie', titel: 'Kategorie', mount: mountKategorieStep, validate: validateKategorie },
    { id: 'titel', titel: 'Titel', mount: mountTitelStep, validate: validateTitel },
    { id: 'caption', titel: 'Caption & Hashtags', mount: mountCaptionStep, validate: validateCaption },
    { id: 'vorschau', titel: 'Vorschau & Bestätigen', mount: mountVorschauStep },
  ];

  const openBtn = document.querySelector('[data-open-create]');
  const vorschauView = document.getElementById('ansicht-vorschau');
  const erstellenView = document.getElementById('ansicht-erstellen');
  const wizardContainer = document.querySelector('[data-wizard-container]');
  const wizardProgress = document.querySelector('[data-wizard-progress]');

  function showCreateView() {
    vorschauView.hidden = true;
    erstellenView.hidden = false;
  }

  function showOverviewView() {
    erstellenView.hidden = true;
    vorschauView.hidden = false;
  }

  openBtn.addEventListener('click', () => {
    const wizard = window.WizardEngine.createWizard({
      steps: STEPS,
      container: wizardContainer,
      progressContainer: wizardProgress,
      onCancel: showOverviewView,
      onComplete: () => {
        showOverviewView();
        window.PostShared.reloadPosts();
      },
    });
    showCreateView();
    wizard.start();
  });
})();
