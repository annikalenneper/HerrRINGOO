(function () {
  // Mini-Wizard für "Entwurf bearbeiten": Kategorie & Titel, Caption & Hashtags, Vorschau &
  // Bestätigen. Läuft wie schedule-wizard.js in einem eigenen <dialog>, nutzt dieselben
  // geteilten Bausteine (WizardEngine, PostSteps, ConfirmDialog/TeamAuth, PostShared.buildMock).
  // Bilder werden bewusst nicht angefasst - nur Kategorie/Titel/Caption sind editierbar,
  // daher kein Bild-Schritt und keine Bild-Auswahl in der Vorschau.

  const { validateKategorieTitel, mountKategorieTitelStep, mountCaptionStep, validateCaption, buildFinalCaption, CATEGORIES } = window.PostSteps;

  function mountVorschauStep(post) {
    return function (container, state, helpers) {
      const hint = document.createElement('p');
      hint.className = 'wizard-step-hint';
      hint.textContent = 'Prüfe die Änderungen, bevor du sie speicherst. Die Bilder bleiben unverändert.';
      container.appendChild(hint);

      const images = (post.medien || []).map((pfad) => ({ url: `/${pfad}`, alt: state.titel || pfad }));
      container.appendChild(window.PostShared.buildMock({ images, caption: buildFinalCaption(state) }));

      const meta = document.createElement('div');
      meta.className = 'post-preview-meta';
      const kategorie = CATEGORIES.find((c) => c.key === state.kategorie);
      const kategorieChip = document.createElement('span');
      kategorieChip.className = 'category-chip';
      kategorieChip.textContent = kategorie ? kategorie.label : '–';
      meta.appendChild(kategorieChip);
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
      backBtn.textContent = 'Zurück';
      backBtn.addEventListener('click', helpers.back);
      nav.appendChild(backBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'selection-submit btn-primary';
      confirmBtn.setAttribute('data-wizard-nav', '');
      confirmBtn.textContent = 'Änderungen speichern';
      nav.appendChild(confirmBtn);
      container.appendChild(nav);

      confirmBtn.addEventListener('click', async () => {
        helpers.setBusy(true);
        status.className = 'gallery-status';
        status.textContent = 'Wird gespeichert …';

        const secret = await window.TeamAuth.getOrPromptSecret();
        if (!secret) {
          helpers.setBusy(false);
          status.className = 'gallery-status error';
          status.textContent = 'Ohne Team-Passwort können Änderungen nicht gespeichert werden.';
          return;
        }

        try {
          const response = await fetch('/.netlify/functions/update-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret,
              datei: post.datei,
              titel: (state.titel || '').trim(),
              kategorie: state.kategorie,
              caption: buildFinalCaption(state),
            }),
          });
          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) {
              window.TeamAuth.clearCachedSecret();
              status.className = 'gallery-status error';
              status.textContent = 'Team-Passwort war falsch oder abgelaufen. Bitte erneut versuchen.';
              helpers.setBusy(false);
              return;
            }
            throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
          }

          status.className = 'gallery-status success';
          status.textContent = 'Gespeichert.';
          confirmBtn.disabled = true;
          backBtn.disabled = true;
          setTimeout(helpers.finish, 1200);
        } catch (error) {
          status.className = 'gallery-status error';
          status.textContent = `Änderungen konnten nicht gespeichert werden: ${error.message}`;
          helpers.setBusy(false);
        }
      });
    };
  }

  function open(post, onSaved) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog wizard-dialog';

    const heading = document.createElement('h3');
    heading.textContent = 'Entwurf bearbeiten';
    dialog.appendChild(heading);

    const progress = document.createElement('ol');
    progress.className = 'wizard-progress';
    dialog.appendChild(progress);

    const container = document.createElement('div');
    dialog.appendChild(container);

    document.body.appendChild(dialog);

    function closeDialog() {
      dialog.close();
      dialog.remove();
    }

    const wizard = window.WizardEngine.createWizard({
      steps: [
        { id: 'kategorie-titel', titel: 'Kategorie & Titel', mount: mountKategorieTitelStep, validate: validateKategorieTitel },
        { id: 'caption', titel: 'Caption & Hashtags', mount: mountCaptionStep, validate: validateCaption },
        { id: 'vorschau', titel: 'Vorschau & Bestätigen', mount: mountVorschauStep(post) },
      ],
      container,
      progressContainer: progress,
      initialState: {
        kategorie: post.kategorie,
        titel: post.titel,
        captionText: post.caption,
        hashtagSets: new Map(),
      },
      onCancel: closeDialog,
      onComplete: () => {
        closeDialog();
        onSaved();
      },
    });

    dialog.showModal();
    wizard.start();
  }

  window.EditWizard = { open };
})();
