(function () {
  // Wiederverwendbare Wizard-Schritte (Kategorie, Titel, Caption+Hashtags), gemeinsam genutzt
  // von post-erstellen-wizard.js (Einzelbild) und bilder-material-wizard.js (Mehrbild) – beide
  // Flows unterscheiden sich nur im Bild-Schritt bzw. der Abschluss-Vorschau, nicht in diesen
  // Content-Schritten.

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

  // --- Kategorie ---

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

  // --- Titel ---

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

  // --- Caption + Hashtags ---

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

  window.PostSteps = {
    CATEGORIES,
    MAX_TITEL_LENGTH,
    MAX_CAPTION_LENGTH,
    appendNav,
    buildFinalCaption,
    mountKategorieStep,
    validateKategorie,
    mountTitelStep,
    validateTitel,
    mountCaptionStep,
    validateCaption,
  };
})();
