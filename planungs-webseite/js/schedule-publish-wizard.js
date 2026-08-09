(function () {
  // Mini-Wizard für "Post einplanen" (bereit -> eingeplant): Datum & Uhrzeit, dann Vorschau &
  // Bestätigen - vom Aufbau identisch zum früheren schedule-wizard.js (das inzwischen die
  // Freigabe entwurf -> bereit übernimmt), nur für die nächste Stufe im Workflow. Läuft in einem
  // eigenen <dialog>, da es eine Aktion an genau einer bestehenden Post-Karte ist.

  function validateDatumZeit(state) {
    if (!state.datumZeit) {
      return { valid: false, errors: { datumZeit: 'Bitte Datum und Uhrzeit wählen.' } };
    }
    const chosen = new Date(state.datumZeit);
    if (Number.isNaN(chosen.getTime()) || chosen <= new Date()) {
      return { valid: false, errors: { datumZeit: 'Der Termin muss in der Zukunft liegen.' } };
    }
    return { valid: true };
  }

  function mountDatumZeitStep(container, state, helpers) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.setAttribute('data-field', 'datumZeit');

    const label = document.createElement('label');
    label.setAttribute('for', 'schedule-publish-datum-zeit');
    label.textContent = 'Datum & Uhrzeit';
    group.appendChild(label);

    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.id = 'schedule-publish-datum-zeit';
    input.value = state.datumZeit || '';
    group.appendChild(input);
    container.appendChild(group);

    const nav = window.PostSteps.appendNav(container, helpers, {
      showBack: false,
      validate: validateDatumZeit,
      state,
    });

    input.addEventListener('input', () => {
      state.datumZeit = input.value;
      nav.refresh();
    });
  }

  function formatDatumZeit(value) {
    const date = new Date(value);
    return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function mountVorschauStep(post) {
    return function (container, state, helpers) {
      const hint = document.createElement('p');
      hint.className = 'wizard-step-hint';
      hint.textContent = 'Prüfe Termin und Post, bevor du ihn einplanst.';
      container.appendChild(hint);

      const images = (post.medien || []).map((pfad) => ({ url: `/${pfad}`, alt: post.titel || pfad }));
      container.appendChild(window.PostShared.buildMock({ images, caption: post.caption }));

      const meta = document.createElement('div');
      meta.className = 'post-preview-meta';
      const termin = document.createElement('span');
      termin.textContent = `Geplant für: ${formatDatumZeit(state.datumZeit)}`;
      meta.appendChild(termin);
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
      confirmBtn.textContent = 'Post einplanen';
      nav.appendChild(confirmBtn);
      container.appendChild(nav);

      confirmBtn.addEventListener('click', async () => {
        helpers.setBusy(true);
        status.className = 'gallery-status';
        status.textContent = 'Wird eingeplant …';

        const secret = await window.TeamAuth.getOrPromptSecret();
        if (!secret) {
          helpers.setBusy(false);
          status.className = 'gallery-status error';
          status.textContent = 'Ohne Team-Passwort kann der Post nicht eingeplant werden.';
          return;
        }

        try {
          const response = await fetch('/.netlify/functions/schedule-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, datei: post.datei, datum_geplant: state.datumZeit }),
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
          status.textContent = 'Eingeplant.';
          confirmBtn.disabled = true;
          backBtn.disabled = true;
          setTimeout(helpers.finish, 2000);
        } catch (error) {
          status.className = 'gallery-status error';
          status.textContent = `Post konnte nicht eingeplant werden: ${error.message}`;
          helpers.setBusy(false);
        }
      });
    };
  }

  function open(post, onScheduled) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog wizard-dialog';

    const heading = document.createElement('h3');
    heading.textContent = 'Post einplanen';
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
        { id: 'datum-zeit', titel: 'Datum & Uhrzeit', mount: mountDatumZeitStep, validate: validateDatumZeit },
        { id: 'vorschau', titel: 'Vorschau & Bestätigen', mount: mountVorschauStep(post) },
      ],
      container,
      progressContainer: progress,
      onCancel: closeDialog,
      onComplete: () => {
        closeDialog();
        onScheduled();
      },
    });

    dialog.showModal();
    wizard.start();
  }

  window.SchedulePublishWizard = { open };
})();
