(function () {
  // Einzige Datei, die die post-spezifischen Begriffe (Bildordner, Kategorie, Caption,
  // Hashtags) kennt. Definiert die 5 Schritte aus den fachlichen Anforderungen als Daten für
  // wizard-engine.js und verbindet sie mit den bestehenden Backend-Endpunkten.

  // Muss mit netlify/functions/lib/drive-folders.js synchron gehalten werden.
  const FOLDERS = [
    { key: 'presse-mappe', label: 'Presse-Mappe' },
    { key: 'bilder-daniel', label: 'Bilder Daniel' },
    { key: 'bilder-deik', label: 'Bilder Deik' },
    { key: 'behind-the-scenes', label: 'Fotos Videodreh "Behind the Scenes"' },
    { key: 'bilder-geschaeft', label: 'Bilder Geschäft' },
    { key: 'anzeigen', label: 'Anzeigen (Magazine, Zeitschriften etc.)' },
  ];

  // Muss mit netlify/functions/lib/categories.js synchron gehalten werden.
  const CATEGORIES = [
    { key: 'werkstatt', label: 'Werkstatt & Prozess' },
    { key: 'unterwegs', label: 'Unterwegs / Standorte' },
    { key: 'kundengeschichten', label: 'Kundengeschichten' },
    { key: 'produkt', label: 'Ring im Detail' },
    { key: 'team', label: 'Team & Menschen dahinter' },
    { key: 'wissen', label: 'Trauring-Wissen' },
    { key: 'community', label: 'Community & Interaktion' },
    { key: 'termine', label: 'Termine & Aktionen' },
    { key: 'zitatkachel', label: 'Zitatkachel' },
    { key: 'ladengeschaeft', label: 'Ladengeschäft (stationär)' },
    { key: 'hitlists', label: 'Listen & Trends' },
    { key: 'warum', label: 'Textkacheln mit Gründen für' },
    { key: 'regionen', label: 'Regionen & Standorte' },
    { key: 'pakete', label: 'Pakete & Angebote' },
  ];
  const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));
  const MAX_TITEL_LENGTH = 120;
  const MAX_CAPTION_LENGTH = 2200;

  function buildFinalCaption(state) {
    const freitext = (state.captionText || '').trim();
    const hashtags = Array.from((state.hashtagSets || new Map()).values()).join(' ');
    return hashtags ? `${freitext}\n\n${hashtags}` : freitext;
  }

  // Baut die Weiter/Zurück/Abbrechen-Navigation eines Schritts. `validate` (falls übergeben)
  // steuert, ob "Weiter" aktiv ist – dieselbe Funktion, die auch der Step-Descriptor für die
  // Engine nutzt, damit Live-Freischaltung und tatsächliche Validierung nie auseinanderlaufen.
  function appendNav(container, helpers, { showBack = true, showCancel = true, nextLabel = 'Weiter', validate, state } = {}) {
    const nav = document.createElement('div');
    nav.className = 'wizard-nav';

    if (showCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'selection-submit btn-secondary';
      cancelBtn.setAttribute('data-wizard-nav', '');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.addEventListener('click', helpers.cancel);
      nav.appendChild(cancelBtn);
    }

    if (showBack) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'selection-submit btn-secondary';
      backBtn.setAttribute('data-wizard-nav', '');
      backBtn.textContent = 'Zurück';
      backBtn.addEventListener('click', helpers.back);
      nav.appendChild(backBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'selection-submit btn-primary';
    nextBtn.setAttribute('data-wizard-nav', '');
    nextBtn.textContent = nextLabel;
    nextBtn.addEventListener('click', helpers.next);
    nav.appendChild(nextBtn);

    container.appendChild(nav);

    function refresh() {
      if (validate) {
        nextBtn.disabled = !validate(state).valid;
      }
    }

    refresh();
    return { refresh };
  }

  // --- Schritt 1: Bild ---

  function validateBild(state) {
    if (!state.bildId) {
      return { valid: false, errors: { bild: 'Bitte zuerst ein Bild auswählen.' } };
    }
    return { valid: true };
  }

  function mountBildStep(container, state, helpers) {
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
    group.appendChild(select);

    const gallery = document.createElement('div');
    gallery.className = 'image-grid';
    group.appendChild(gallery);

    const info = document.createElement('p');
    info.className = 'selected-image-info';
    group.appendChild(info);
    container.appendChild(group);

    function updateInfo() {
      if (state.bildId) {
        info.textContent = `Ausgewählt: ${state.bildName}`;
        info.classList.add('confirmed');
      } else {
        info.textContent = 'Noch kein Bild ausgewählt.';
        info.classList.remove('confirmed');
      }
    }
    updateInfo();

    const nav = appendNav(container, helpers, { showBack: false, validate: validateBild, state });

    async function loadGallery(folderKey) {
      gallery.innerHTML = '<p class="gallery-status" aria-live="polite">Bilder werden geladen …</p>';
      try {
        const response = await fetch(`/.netlify/functions/images?folder=${encodeURIComponent(folderKey)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        gallery.innerHTML = '';
        if (data.length === 0) {
          gallery.innerHTML = '<p class="gallery-status">Keine Bilder in diesem Ordner gefunden.</p>';
          return;
        }

        data.forEach((image) => {
          const card = document.createElement('div');
          card.className = 'image-card';
          if (state.bildId === image.id) card.classList.add('selected');

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
            gallery.querySelectorAll('.image-card.selected').forEach((el) => el.classList.remove('selected'));
            card.classList.add('selected');
            state.bildFolder = folderKey;
            state.bildId = image.id;
            state.bildName = image.name;
            state.bildThumbnail = image.thumbnailLink;
            updateInfo();
            nav.refresh();
          });

          gallery.appendChild(card);
        });
      } catch (error) {
        gallery.innerHTML = `<p class="gallery-status error">Bilder konnten nicht geladen werden: ${error.message}</p>`;
      }
    }

    select.addEventListener('change', () => {
      state.bildFolder = select.value;
      state.bildId = null;
      state.bildName = null;
      state.bildThumbnail = null;
      updateInfo();
      nav.refresh();
      loadGallery(select.value);
    });

    const startFolder = state.bildFolder || FOLDERS[0].key;
    select.value = startFolder;
    state.bildFolder = startFolder;
    loadGallery(startFolder);
  }

  // --- Schritt 2: Kategorie ---

  function validateKategorie(state) {
    if (!state.kategorie || !CATEGORY_KEYS.has(state.kategorie)) {
      return { valid: false, errors: { kategorie: 'Bitte eine Kategorie auswählen.' } };
    }
    return { valid: true };
  }

  function mountKategorieStep(container, state, helpers) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'kategorie');

    const label = document.createElement('label');
    label.setAttribute('for', 'wizard-kategorie');
    label.textContent = 'Kategorie';
    group.appendChild(label);

    const select = document.createElement('select');
    select.id = 'wizard-kategorie';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Bitte wählen …';
    select.appendChild(placeholder);

    CATEGORIES.forEach(({ key, label: catLabel }) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = catLabel;
      select.appendChild(option);
    });
    select.value = state.kategorie || '';
    group.appendChild(select);
    container.appendChild(group);

    const nav = appendNav(container, helpers, { validate: validateKategorie, state });

    select.addEventListener('change', () => {
      state.kategorie = select.value;
      nav.refresh();
    });
  }

  // --- Schritt 3: Titel ---

  function validateTitel(state) {
    const titel = (state.titel || '').trim();
    if (!titel || titel.length > MAX_TITEL_LENGTH) {
      return { valid: false, errors: { titel: `Bitte einen Titel eingeben (max. ${MAX_TITEL_LENGTH} Zeichen).` } };
    }
    return { valid: true };
  }

  function mountTitelStep(container, state, helpers) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'titel');

    const label = document.createElement('label');
    label.setAttribute('for', 'wizard-titel');
    label.textContent = 'Titel / Beschreibung (intern)';
    group.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'wizard-titel';
    input.maxLength = MAX_TITEL_LENGTH;
    input.value = state.titel || '';
    group.appendChild(input);
    container.appendChild(group);

    const nav = appendNav(container, helpers, { validate: validateTitel, state });

    input.addEventListener('input', () => {
      state.titel = input.value;
      nav.refresh();
    });
  }

  // --- Schritt 4: Caption + Hashtags ---

  function validateCaption(state) {
    const caption = (state.captionText || '').trim();
    if (!caption || caption.length > MAX_CAPTION_LENGTH) {
      return { valid: false, errors: { caption: `Bitte eine Caption schreiben (max. ${MAX_CAPTION_LENGTH} Zeichen).` } };
    }
    return { valid: true };
  }

  function mountCaptionStep(container, state, helpers) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'caption');

    const label = document.createElement('label');
    label.setAttribute('for', 'wizard-caption');
    label.textContent = 'Caption';
    group.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.id = 'wizard-caption';
    textarea.maxLength = MAX_CAPTION_LENGTH;
    textarea.rows = 6;
    textarea.value = state.captionText || '';
    group.appendChild(textarea);

    const hashtagPicker = document.createElement('div');
    hashtagPicker.className = 'hashtag-picker';
    group.appendChild(hashtagPicker);
    container.appendChild(group);

    const nav = appendNav(container, helpers, { validate: validateCaption, state });

    textarea.addEventListener('input', () => {
      state.captionText = textarea.value;
      nav.refresh();
    });

    if (!state.hashtagSets) state.hashtagSets = new Map();

    async function loadHashtagSets() {
      try {
        const response = await fetch('/.netlify/functions/caption-blocks');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        hashtagPicker.innerHTML = '';
        data.forEach((set) => {
          const pill = document.createElement('span');
          pill.className = 'hashtag-pill';
          pill.textContent = set.name;
          pill.title = set.hashtags;
          if (state.hashtagSets.has(set.name)) pill.classList.add('selected');
          pill.addEventListener('click', () => {
            if (state.hashtagSets.has(set.name)) {
              state.hashtagSets.delete(set.name);
              pill.classList.remove('selected');
            } else {
              state.hashtagSets.set(set.name, set.hashtags);
              pill.classList.add('selected');
            }
          });
          hashtagPicker.appendChild(pill);
        });
      } catch (error) {
        hashtagPicker.innerHTML = `<p class="gallery-status error">Hashtag-Sets konnten nicht geladen werden: ${error.message}</p>`;
      }
    }

    loadHashtagSets();
  }

  // --- Schritt 5: Abschluss-Vorschau ---

  function mountVorschauStep(container, state, helpers) {
    const hint = document.createElement('p');
    hint.className = 'wizard-step-hint';
    hint.textContent = 'So sieht dein Post aus. Prüfe alles noch einmal, bevor du speicherst.';
    container.appendChild(hint);

    container.appendChild(window.PostShared.buildMock({
      imageUrl: state.bildThumbnail || null,
      imageAlt: state.titel || state.bildName,
      caption: buildFinalCaption(state),
    }));

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
          bildFolder: state.bildFolder,
          bildId: state.bildId,
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
    { id: 'bild', titel: 'Bild', mount: mountBildStep, validate: validateBild },
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
