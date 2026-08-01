(function () {
  // Ein einzelner Formular-Dialog für Idee anlegen UND bearbeiten (kein WizardEngine - alle
  // Felder sind immer gleichzeitig sichtbar, es gibt keinen mehrstufigen Ablauf wie beim
  // Post-Wizard). open(idee, onSaved): idee === null -> anlegen, sonst -> bearbeiten.

  const STATUS_OPTIONS = [
    { key: 'neu', label: 'Neu', badge: '💡' },
    { key: 'verfeinert', label: 'Verfeinert', badge: '🔧' },
    { key: 'umgesetzt', label: 'Umgesetzt', badge: '✅' },
  ];
  const MAX_TITEL_LENGTH = 120;
  const MAX_BESCHREIBUNG_LENGTH = 4000;
  const MAX_BEBILDERUNG_LENGTH = 500;

  function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach((el) => el.remove());
  }

  function showFieldError(form, fieldName, message) {
    const group = form.querySelector(`[data-field="${fieldName}"]`);
    if (!group) return;
    const error = document.createElement('p');
    error.className = 'field-error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    group.appendChild(error);
  }

  function buildKategorieField(state) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'kategorie');

    const label = document.createElement('label');
    label.setAttribute('for', 'idee-kategorie');
    label.textContent = 'Kategorie';
    group.appendChild(label);

    const select = document.createElement('select');
    select.id = 'idee-kategorie';

    function renderOptions() {
      const currentValue = state.kategorie || '';
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Bitte wählen …';
      select.appendChild(placeholder);

      window.CategoriesStore.CATEGORIES.forEach(({ key, label: catLabel }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = catLabel;
        select.appendChild(option);
      });

      const newOption = document.createElement('option');
      newOption.value = '__new__';
      newOption.textContent = '+ Neue Kategorie anlegen';
      select.appendChild(newOption);

      select.value = currentValue;
    }
    renderOptions();
    group.appendChild(select);

    const inlineWrap = document.createElement('div');
    inlineWrap.className = 'new-kategorie-inline';
    inlineWrap.hidden = true;

    const inlineInput = document.createElement('input');
    inlineInput.type = 'text';
    inlineInput.maxLength = 60;
    inlineInput.placeholder = 'Name der neuen Kategorie';
    inlineWrap.appendChild(inlineInput);

    const anlegenBtn = document.createElement('button');
    anlegenBtn.type = 'button';
    anlegenBtn.className = 'selection-submit btn-secondary';
    anlegenBtn.textContent = 'Anlegen';
    inlineWrap.appendChild(anlegenBtn);

    const abbrechenBtn = document.createElement('button');
    abbrechenBtn.type = 'button';
    abbrechenBtn.className = 'icon-button';
    abbrechenBtn.setAttribute('aria-label', 'Neue Kategorie abbrechen');
    abbrechenBtn.title = 'Abbrechen';
    abbrechenBtn.textContent = '✕';
    inlineWrap.appendChild(abbrechenBtn);

    group.appendChild(inlineWrap);

    const inlineStatus = document.createElement('p');
    inlineStatus.className = 'gallery-status';
    inlineStatus.setAttribute('aria-live', 'polite');
    group.appendChild(inlineStatus);

    let previousValue = state.kategorie || '';

    function resetInline() {
      inlineWrap.hidden = true;
      inlineInput.value = '';
      inlineStatus.textContent = '';
      inlineStatus.className = 'gallery-status';
    }

    select.addEventListener('change', () => {
      if (select.value === '__new__') {
        inlineWrap.hidden = false;
        select.value = previousValue;
        inlineInput.focus();
        return;
      }
      previousValue = select.value;
      state.kategorie = select.value;
    });

    abbrechenBtn.addEventListener('click', resetInline);

    anlegenBtn.addEventListener('click', async () => {
      const neuesLabel = inlineInput.value.trim();
      if (!neuesLabel) {
        inlineStatus.className = 'gallery-status error';
        inlineStatus.textContent = 'Bitte einen Namen für die neue Kategorie eingeben.';
        return;
      }

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        inlineStatus.className = 'gallery-status error';
        inlineStatus.textContent = 'Ohne Team-Passwort kann keine Kategorie angelegt werden.';
        return;
      }

      anlegenBtn.disabled = true;
      inlineStatus.className = 'gallery-status';
      inlineStatus.textContent = 'Wird angelegt …';

      try {
        const response = await fetch('/.netlify/functions/create-kategorie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, label: neuesLabel }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) window.TeamAuth.clearCachedSecret();
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        window.CategoriesStore.addCategoryLocally(data.kategorie);
        previousValue = data.kategorie.key;
        state.kategorie = data.kategorie.key;
        renderOptions();
        resetInline();
      } catch (error) {
        inlineStatus.className = 'gallery-status error';
        inlineStatus.textContent = `Kategorie konnte nicht angelegt werden: ${error.message}`;
      } finally {
        anlegenBtn.disabled = false;
      }
    });

    return group;
  }

  function buildStatusField(state) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'status');

    const label = document.createElement('label');
    label.textContent = 'Status';
    group.appendChild(label);

    const badgeGroup = document.createElement('div');
    badgeGroup.className = 'status-badge-group';

    STATUS_OPTIONS.forEach(({ key, label: statusLabel, badge }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-chip';
      if (state.status === key) btn.classList.add('active');
      btn.textContent = `${badge} ${statusLabel}`;
      btn.addEventListener('click', () => {
        state.status = key;
        badgeGroup.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      badgeGroup.appendChild(btn);
    });

    group.appendChild(badgeGroup);
    return group;
  }

  function buildTextField({ id, labelText, fieldName, value, maxLength, multiline, hint }) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', fieldName);

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;
    group.appendChild(label);

    const input = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = 'text';
    else input.rows = 5;
    input.id = id;
    input.maxLength = maxLength;
    input.value = value || '';
    group.appendChild(input);

    if (hint) {
      const hintEl = document.createElement('p');
      hintEl.className = 'wizard-step-hint';
      hintEl.textContent = hint;
      group.appendChild(hintEl);
    }

    return { group, input };
  }

  function validate(state) {
    const errors = {};
    if (!(state.titel || '').trim() || state.titel.length > MAX_TITEL_LENGTH) {
      errors.titel = `Bitte einen Titel eingeben (max. ${MAX_TITEL_LENGTH} Zeichen).`;
    }
    if (!state.kategorie) {
      errors.kategorie = 'Bitte eine Kategorie auswählen.';
    }
    if (!(state.beschreibung || '').trim() || state.beschreibung.length > MAX_BESCHREIBUNG_LENGTH) {
      errors.beschreibung = `Bitte eine Beschreibung eingeben (max. ${MAX_BESCHREIBUNG_LENGTH} Zeichen).`;
    }
    if ((state.bebilderung || '').length > MAX_BEBILDERUNG_LENGTH) {
      errors.bebilderung = `Bebilderung darf max. ${MAX_BEBILDERUNG_LENGTH} Zeichen haben.`;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function open(idee, onSaved) {
    const isEdit = !!idee;
    const state = {
      titel: idee ? idee.titel : '',
      kategorie: idee ? idee.kategorie : '',
      status: idee ? idee.status : 'neu',
      beschreibung: idee ? idee.beschreibung : '',
      bebilderung: idee ? idee.bebilderung : '',
    };

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog idea-dialog';

    const heading = document.createElement('h3');
    heading.textContent = isEdit ? 'Idee bearbeiten' : 'Neue Idee';
    dialog.appendChild(heading);

    const form = document.createElement('div');
    dialog.appendChild(form);

    const titelField = buildTextField({
      id: 'idee-titel', labelText: 'Titel', fieldName: 'titel', value: state.titel, maxLength: MAX_TITEL_LENGTH,
    });
    form.appendChild(titelField.group);
    titelField.input.addEventListener('input', () => { state.titel = titelField.input.value; });

    form.appendChild(buildKategorieField(state));
    form.appendChild(buildStatusField(state));

    const beschreibungField = buildTextField({
      id: 'idee-beschreibung', labelText: 'Beschreibung', fieldName: 'beschreibung', value: state.beschreibung,
      maxLength: MAX_BESCHREIBUNG_LENGTH, multiline: true,
    });
    form.appendChild(beschreibungField.group);
    beschreibungField.input.addEventListener('input', () => { state.beschreibung = beschreibungField.input.value; });

    const bebilderungField = buildTextField({
      id: 'idee-bebilderung', labelText: 'Bebilderung (Vorschlag)', fieldName: 'bebilderung', value: state.bebilderung,
      maxLength: MAX_BEBILDERUNG_LENGTH, hint: 'Nur als Text-Hinweis, kein Bild-Upload (z. B. "Nahaufnahme der Ringe bei Sonnenuntergang").',
    });
    form.appendChild(bebilderungField.group);
    bebilderungField.input.addEventListener('input', () => { state.bebilderung = bebilderungField.input.value; });

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'app-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'selection-submit btn-secondary';
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
    });
    actions.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'selection-submit btn-primary';
    saveBtn.textContent = isEdit ? 'Änderungen speichern' : 'Idee anlegen';
    actions.appendChild(saveBtn);

    form.appendChild(actions);
    document.body.appendChild(dialog);

    saveBtn.addEventListener('click', async () => {
      clearFieldErrors(form);
      const result = validate(state);
      if (!result.valid) {
        Object.entries(result.errors).forEach(([field, message]) => showFieldError(form, field, message));
        return;
      }

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann nicht gespeichert werden.';
        return;
      }

      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      status.className = 'gallery-status';
      status.textContent = 'Wird gespeichert …';

      const endpoint = isEdit ? 'update-idea' : 'create-idea';
      const body = isEdit
        ? { secret, id: idee.id, titel: state.titel.trim(), kategorie: state.kategorie, status: state.status, beschreibung: state.beschreibung.trim(), bebilderung: state.bebilderung.trim() }
        : { secret, titel: state.titel.trim(), kategorie: state.kategorie, status: state.status, beschreibung: state.beschreibung.trim(), bebilderung: state.bebilderung.trim() };

      try {
        const response = await fetch(`/.netlify/functions/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) window.TeamAuth.clearCachedSecret();
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Gespeichert.';
        setTimeout(() => {
          dialog.close();
          dialog.remove();
          onSaved();
        }, 600);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Speichern fehlgeschlagen: ${error.message}`;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    });

    dialog.showModal();
  }

  window.IdeaDialog = { open };
})();
