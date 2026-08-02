(function () {
  // Mini-Wizard für "Post freigeben" (entwurf -> bereit): keine Terminwahl mehr,
  // sondern eine Review-Bestätigung + Vier-Augen-Freigabe (die freigebende Person darf nicht der
  // Autor des Posts sein). Läuft in einem eigenen <dialog> (nicht in der Seite selbst wie der
  // große "Post erstellen"-Wizard), da es eine Aktion an genau einer bestehenden Post-Karte ist.
  // Nutzt WizardEngine + die generischen ConfirmDialog/TeamAuth-Bausteine.

  function validateFreigabe(state, post) {
    if (!state.reviewBestaetigt) {
      return { valid: false, errors: { reviewBestaetigt: 'Bitte bestätigen, dass der Post ein Review erhalten hat.' } };
    }

    const freigegebenVon = (state.freigegebenVon || '').trim();
    if (!freigegebenVon) {
      return { valid: false, errors: { freigegebenVon: 'Bitte den Namen der freigebenden Person eintragen.' } };
    }

    const autor = (post.autor || '').trim();
    if (autor && autor.toLowerCase() === freigegebenVon.toLowerCase()) {
      return {
        valid: false,
        errors: { freigegebenVon: `Vier-Augen-Prinzip: Die Freigabe darf nicht durch den Autor (${autor}) selbst erfolgen.` },
      };
    }

    return { valid: true };
  }

  function mountFreigabeStep(post) {
    return function (container, state, helpers) {
      const hint = document.createElement('p');
      hint.className = 'wizard-step-hint';
      hint.textContent = 'Prüfe den Post, bevor du ihn zur Veröffentlichung freigibst.';
      container.appendChild(hint);

      const images = (post.medien || []).map((pfad) => ({ url: `/${pfad}`, alt: post.titel || pfad }));
      container.appendChild(window.PostShared.buildMock({ images, caption: post.caption }));

      if (post.autor) {
        const meta = document.createElement('div');
        meta.className = 'post-preview-meta';
        const autorEl = document.createElement('span');
        autorEl.textContent = `Autor: ${post.autor}`;
        meta.appendChild(autorEl);
        container.appendChild(meta);
      }

      const reviewGroup = document.createElement('div');
      reviewGroup.className = 'form-group';
      reviewGroup.setAttribute('data-field', 'reviewBestaetigt');

      const reviewLabel = document.createElement('label');
      const reviewCheckbox = document.createElement('input');
      reviewCheckbox.type = 'checkbox';
      reviewCheckbox.checked = Boolean(state.reviewBestaetigt);
      reviewLabel.appendChild(reviewCheckbox);
      reviewLabel.appendChild(document.createTextNode(' Ich bestätige: Dieser Post hat ein Review erhalten und kann veröffentlicht werden.'));
      reviewGroup.appendChild(reviewLabel);
      container.appendChild(reviewGroup);

      reviewCheckbox.addEventListener('change', () => {
        state.reviewBestaetigt = reviewCheckbox.checked;
      });

      const freigabeGroup = document.createElement('div');
      freigabeGroup.className = 'form-group';
      freigabeGroup.setAttribute('data-field', 'freigegebenVon');

      const freigabeLabel = document.createElement('label');
      freigabeLabel.setAttribute('for', 'schedule-freigegeben-von');
      freigabeLabel.textContent = 'Freigegeben von';
      freigabeGroup.appendChild(freigabeLabel);

      const freigabeInput = document.createElement('select');
      freigabeInput.id = 'schedule-freigegeben-von';
      const freigabePlaceholder = document.createElement('option');
      freigabePlaceholder.value = '';
      freigabePlaceholder.textContent = 'Bitte wählen …';
      freigabeInput.appendChild(freigabePlaceholder);
      // Kommt aus team-members.js (window.TeamMembers), dieselbe feste Liste wie beim
      // Autor-Feld im "Post erstellen"-Wizard.
      window.TeamMembers.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        freigabeInput.appendChild(option);
      });
      freigabeInput.value = state.freigegebenVon || '';
      freigabeGroup.appendChild(freigabeInput);
      container.appendChild(freigabeGroup);

      freigabeInput.addEventListener('change', () => {
        state.freigegebenVon = freigabeInput.value;
      });

      const status = document.createElement('p');
      status.className = 'gallery-status';
      status.setAttribute('data-field', 'submit');
      status.setAttribute('aria-live', 'polite');
      container.appendChild(status);

      const nav = document.createElement('div');
      nav.className = 'wizard-nav';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'selection-submit btn-secondary';
      cancelBtn.setAttribute('data-wizard-nav', '');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.addEventListener('click', helpers.cancel);
      nav.appendChild(cancelBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'selection-submit btn-primary';
      confirmBtn.setAttribute('data-wizard-nav', '');
      confirmBtn.textContent = 'Post freigeben';
      nav.appendChild(confirmBtn);
      container.appendChild(nav);

      confirmBtn.addEventListener('click', async () => {
        const result = validateFreigabe(state, post);
        if (!result.valid) {
          status.className = 'gallery-status error';
          status.textContent = Object.values(result.errors)[0];
          return;
        }

        helpers.setBusy(true);
        status.className = 'gallery-status';
        status.textContent = 'Wird freigegeben …';

        const secret = await window.TeamAuth.getOrPromptSecret();
        if (!secret) {
          helpers.setBusy(false);
          status.className = 'gallery-status error';
          status.textContent = 'Ohne Team-Passwort kann der Post nicht freigegeben werden.';
          return;
        }

        try {
          const response = await fetch('/.netlify/functions/schedule-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, datei: post.datei, freigegeben_von: state.freigegebenVon.trim() }),
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
          status.textContent = 'Freigegeben.';
          confirmBtn.disabled = true;
          cancelBtn.disabled = true;
          setTimeout(helpers.finish, 2000);
        } catch (error) {
          status.className = 'gallery-status error';
          status.textContent = `Post konnte nicht freigegeben werden: ${error.message}`;
          helpers.setBusy(false);
        }
      });
    };
  }

  function open(post, onScheduled) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog wizard-dialog';

    const heading = document.createElement('h3');
    heading.textContent = 'Post freigeben';
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
        { id: 'freigabe', titel: 'Freigabe', mount: mountFreigabeStep(post) },
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

  window.ScheduleWizard = { open };
})();
