(function () {
  // Mehrbild-Post-Flow: Bilder sind bereits ausgewählt (bilder-material.js), daher nur 4
  // Schritte statt 5 (kein eigener Bild-Schritt). Kategorie/Titel/Caption kommen unverändert
  // aus post-steps-shared.js – identisch zum Einzelbild-Wizard in post-erstellen-wizard.js.
  const { mountKategorieStep, validateKategorie, mountTitelStep, validateTitel, mountCaptionStep, validateCaption, buildFinalCaption, CATEGORIES } = window.PostSteps;

  function mountVorschauStep(container, state, helpers) {
    const hint = document.createElement('p');
    hint.className = 'wizard-step-hint';
    hint.textContent = `So sieht dein Post aus (${state.bilder.length} Bild${state.bilder.length === 1 ? '' : 'er'}). Prüfe alles noch einmal, bevor du speicherst.`;
    container.appendChild(hint);

    container.appendChild(window.PostShared.buildMock({
      imageUrl: state.bilder[0].thumbnailLink,
      imageAlt: state.titel || state.bilder[0].name,
      caption: buildFinalCaption(state),
    }));

    if (state.bilder.length > 1) {
      const thumbs = document.createElement('div');
      thumbs.className = 'wizard-selected-thumbs';
      state.bilder.forEach((bild) => {
        const img = document.createElement('img');
        img.src = bild.thumbnailLink;
        img.alt = bild.name;
        img.loading = 'lazy';
        thumbs.appendChild(img);
      });
      container.appendChild(thumbs);
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
          if (response.status === 401) {
            window.TeamAuth.clearCachedSecret();
            status.className = 'gallery-status error';
            status.textContent = 'Team-Passwort war falsch oder abgelaufen. Bitte erneut versuchen.';
            helpers.setBusy(false);
            return;
          }
          if (response.status === 400) {
            status.className = 'gallery-status error';
            status.textContent = data.details ? `${data.error} (${data.details})` : data.error;
            helpers.setBusy(false);
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

  const STEPS = [
    { id: 'kategorie', titel: 'Kategorie', mount: mountKategorieStep, validate: validateKategorie },
    { id: 'titel', titel: 'Titel', mount: mountTitelStep, validate: validateTitel },
    { id: 'caption', titel: 'Caption & Hashtags', mount: mountCaptionStep, validate: validateCaption },
    { id: 'vorschau', titel: 'Vorschau & Bestätigen', mount: mountVorschauStep },
  ];

  const wizardContainer = document.querySelector('[data-wizard-container]');
  const wizardProgress = document.querySelector('[data-wizard-progress]');

  // Von bilder-material.js aufgerufen, sobald "Auswahl übernehmen" geklickt wird. `bilder`
  // ist das Array der bereits ausgewählten Bilder (id, name, folderKey, thumbnailLink);
  // `callbacks.onCancel`/`callbacks.onComplete` steuern die Rückkehr zur Galerie-Ansicht.
  function start(bilder, callbacks) {
    const wizard = window.WizardEngine.createWizard({
      steps: STEPS,
      container: wizardContainer,
      progressContainer: wizardProgress,
      onCancel: callbacks.onCancel,
      onComplete: callbacks.onComplete,
    });
    wizard.start();
    wizard.state.bilder = bilder;
  }

  window.BilderMaterialWizard = { start };
})();
