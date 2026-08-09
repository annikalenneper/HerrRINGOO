(function () {
  function kategorieLabel(key) {
    const match = (window.PostSteps.CATEGORIES || []).find((c) => c.key === key);
    return match ? match.label : (key || '–');
  }

  function formatErstelltAm(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', { dateStyle: 'medium' });
  }

  function formatKommentarDatum(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatGeplantDatum(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  const RESET_GRUENDE = [
    { key: 'fehler_entdeckt', label: 'Fehler entdeckt' },
    { key: 'verbesserung_vorschlagen', label: 'Verbesserung vorschlagen' },
    { key: 'sonstiges', label: 'Sonstiges' },
  ];

  // Popup für "Status zurücksetzen" im Status "bereit" (bereit -> entwurf): fragt Grund und
  // optional einen Kommentar ab, Bearbeiter kommt automatisch von der eingeloggten Person
  // (siehe identity-gate.js). Der Kommentar landet über reset-to-entwurf.js in derselben
  // "kommentare"-Liste wie normale Kommentare und ist danach wieder sichtbar, da der Post ja
  // zurück im Status "entwurf" ist (siehe buildComments/buildCard).
  function promptResetToEntwurf() {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';

      const heading = document.createElement('h3');
      heading.textContent = 'Den Post in den Status "Entwurf" zurücksetzen';
      dialog.appendChild(heading);

      const bearbeiter = window.getIdentityUserName();
      const bearbeiterHint = document.createElement('p');
      bearbeiterHint.className = 'wizard-step-hint';
      bearbeiterHint.textContent = `Bearbeiter: ${bearbeiter || '–'}`;
      dialog.appendChild(bearbeiterHint);

      const grundGroup = document.createElement('div');
      grundGroup.className = 'form-group';
      const grundLabel = document.createElement('label');
      grundLabel.setAttribute('for', 'reset-grund');
      grundLabel.textContent = 'Grund';
      grundGroup.appendChild(grundLabel);

      const grundSelect = document.createElement('select');
      grundSelect.id = 'reset-grund';
      const grundPlaceholder = document.createElement('option');
      grundPlaceholder.value = '';
      grundPlaceholder.textContent = 'Bitte wählen …';
      grundSelect.appendChild(grundPlaceholder);
      RESET_GRUENDE.forEach(({ key, label }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        grundSelect.appendChild(option);
      });
      grundGroup.appendChild(grundSelect);
      dialog.appendChild(grundGroup);

      const kommentarGroup = document.createElement('div');
      kommentarGroup.className = 'form-group';
      const kommentarLabel = document.createElement('label');
      kommentarLabel.setAttribute('for', 'reset-kommentar');
      kommentarLabel.textContent = 'Kommentar (optional)';
      kommentarGroup.appendChild(kommentarLabel);

      const kommentarInput = document.createElement('textarea');
      kommentarInput.id = 'reset-kommentar';
      kommentarInput.rows = 3;
      kommentarGroup.appendChild(kommentarInput);
      dialog.appendChild(kommentarGroup);

      const errorEl = document.createElement('p');
      errorEl.className = 'field-error';
      errorEl.setAttribute('role', 'alert');
      dialog.appendChild(errorEl);

      const actions = document.createElement('div');
      actions.className = 'app-dialog-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'selection-submit btn-secondary';
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.addEventListener('click', () => dialog.close('cancel'));
      actions.appendChild(cancelBtn);

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'selection-submit btn-primary';
      okBtn.textContent = 'Zurücksetzen';
      okBtn.addEventListener('click', () => {
        if (!bearbeiter) {
          errorEl.textContent = 'Bearbeiter konnte nicht ermittelt werden - bitte Seite neu laden und erneut einloggen.';
          return;
        }
        if (!grundSelect.value) {
          errorEl.textContent = 'Bitte einen Grund auswählen.';
          return;
        }
        dialog.close('ok');
      });
      actions.appendChild(okBtn);

      dialog.appendChild(actions);
      document.body.appendChild(dialog);

      dialog.addEventListener('close', () => {
        const result = dialog.returnValue === 'ok'
          ? { bearbeiter, grund: grundSelect.value, kommentar: kommentarInput.value.trim() }
          : null;
        dialog.remove();
        resolve(result);
      });

      dialog.showModal();
      grundSelect.focus();
    });
  }

  // Bestätigung für "Status zurücksetzen" im Status "eingeplant" (eingeplant -> bereit): wer
  // bestätigt, kommt automatisch von der eingeloggten Person (siehe identity-gate.js) - reicht
  // deshalb ein einfacher Confirm statt eines eigenen Popups mit Namensauswahl, da der Post
  // inhaltlich unverändert bleibt und nur der Termin verworfen wird.
  async function promptResetToBereit() {
    const bestaetigtVon = window.getIdentityUserName();
    if (!bestaetigtVon) return null;

    const confirmed = await window.ConfirmDialog.confirmAction({
      titel: 'Veröffentlichungstermin zurücknehmen?',
      nachricht: `Der Post landet wieder bei "Bereit zur Veröffentlichung". Bestätigt von: ${bestaetigtVon}.`,
      bestaetigenLabel: 'Ja, zurücknehmen',
      abbrechenLabel: 'Abbrechen',
    });
    return confirmed ? { bestaetigtVon } : null;
  }

  // Kommentare sind nur im Status "entwurf" les- und schreibbar (siehe buildCard) - sobald der
  // Post weiter ist, gilt die Kommentierungsphase als abgeschlossen.
  function buildComments(post, onUpdated) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-comments';

    const heading = document.createElement('h4');
    heading.textContent = 'Kommentare';
    wrapper.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'post-comment-list';
    const kommentare = post.kommentare || [];

    if (kommentare.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'post-comment-empty';
      empty.textContent = 'Noch keine Kommentare.';
      wrapper.appendChild(empty);
    } else {
      kommentare.forEach((kommentar) => {
        const entry = document.createElement('p');
        entry.className = 'post-comment';

        const meta = document.createElement('span');
        meta.className = 'post-comment-meta';
        meta.textContent = `${kommentar.von} · ${formatKommentarDatum(kommentar.erstellt_am)}`;
        entry.appendChild(meta);
        entry.appendChild(document.createElement('br'));
        entry.appendChild(document.createTextNode(kommentar.text));

        list.appendChild(entry);
      });
      wrapper.appendChild(list);
    }

    const form = document.createElement('div');
    form.className = 'post-comment-form';

    const textInput = document.createElement('textarea');
    textInput.rows = 2;
    textInput.placeholder = 'Kommentar schreiben …';
    form.appendChild(textInput);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'selection-submit btn-secondary';
    submitBtn.textContent = 'Kommentieren';
    form.appendChild(submitBtn);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    submitBtn.addEventListener('click', async () => {
      if (!textInput.value.trim()) {
        status.className = 'gallery-status error';
        status.textContent = 'Bitte einen Kommentar eingeben.';
        return;
      }

      const von = window.getIdentityUserName();
      if (!von) {
        status.className = 'gallery-status error';
        status.textContent = 'Name konnte nicht ermittelt werden - bitte Seite neu laden und erneut einloggen.';
        return;
      }

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann kein Kommentar gespeichert werden.';
        return;
      }

      submitBtn.disabled = true;
      status.className = 'gallery-status';
      status.textContent = 'Wird gespeichert …';

      try {
        const response = await fetch('/.netlify/functions/comment-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret,
            datei: post.datei,
            von,
            text: textInput.value.trim(),
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) window.TeamAuth.clearCachedSecret();
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Kommentar gespeichert.';
        setTimeout(onUpdated, 600);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Kommentar konnte nicht gespeichert werden: ${error.message}`;
        submitBtn.disabled = false;
      }
    });

    wrapper.appendChild(form);
    return wrapper;
  }

  function buildMeta(post) {
    const meta = document.createElement('div');
    meta.className = 'post-preview-meta';

    const kategorieChip = document.createElement('span');
    kategorieChip.className = 'category-chip';
    kategorieChip.textContent = kategorieLabel(post.kategorie);
    meta.appendChild(kategorieChip);

    const erstelltAmText = formatErstelltAm(post.erstellt_am);
    if (erstelltAmText) {
      const erstelltAmEl = document.createElement('span');
      erstelltAmEl.textContent = `Erstellt: ${erstelltAmText}`;
      meta.appendChild(erstelltAmEl);
    }

    if (post.autor) {
      const autorEl = document.createElement('span');
      autorEl.textContent = `Autor: ${post.autor}`;
      meta.appendChild(autorEl);
    }

    if (post.freigegeben_von) {
      const freigabeEl = document.createElement('span');
      freigabeEl.textContent = `Freigegeben von: ${post.freigegeben_von}`;
      meta.appendChild(freigabeEl);
    }

    return meta;
  }

  function todayISO() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Entwurf -> bereit läuft über einen eigenen Mini-Wizard (Review-Bestätigung + Vier-Augen-
  // Freigabe, siehe schedule-wizard.js), da die freigebende Person hier vom Autor abweichen muss.
  // Bereit -> eingeplant läuft über einen zweiten Mini-Wizard (Datum & Uhrzeit + Vorschau, siehe
  // schedule-publish-wizard.js). Eingeplant -> veroeffentlicht passiert automatisch, sobald der
  // Termin erreicht ist (publish-scheduled-posts-background.js) - die einfache Inline-Aktion
  // hier ist nur der manuelle Vorgriff darauf ("jetzt schon veröffentlichen").
  function buildActions(post, onUpdated) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-preview-actions';

    if (post.status === 'entwurf') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-submit btn-primary';
      button.textContent = '✅ Post freigeben';
      button.addEventListener('click', () => {
        window.ScheduleWizard.open(post, onUpdated);
      });
      wrapper.appendChild(button);

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'icon-button';
      editButton.setAttribute('aria-label', 'Entwurf bearbeiten');
      editButton.title = 'Entwurf bearbeiten';
      editButton.textContent = '✏️';
      editButton.addEventListener('click', async () => {
        if (!(await window.CategoriesStore.ensureReady(editButton))) return;
        window.EditWizard.open(post, onUpdated);
      });
      wrapper.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'icon-button';
      deleteButton.setAttribute('aria-label', 'Entwurf löschen');
      deleteButton.title = 'Entwurf löschen';
      deleteButton.textContent = '🗑️';
      deleteButton.addEventListener('click', async () => {
        const confirmed = await window.ConfirmDialog.confirmAction({
          titel: 'Entwurf löschen?',
          nachricht: `„${post.titel || post.datei}" wird unwiderruflich gelöscht, inklusive der zugehörigen Bilder.`,
          bestaetigenLabel: 'Ja, löschen',
          abbrechenLabel: 'Abbrechen',
          destructive: true,
        });
        if (!confirmed) return;

        const secret = await window.TeamAuth.getOrPromptSecret();
        if (!secret) {
          status.className = 'gallery-status error';
          status.textContent = 'Ohne Team-Passwort kann diese Aktion nicht ausgeführt werden.';
          return;
        }

        deleteButton.disabled = true;
        status.className = 'gallery-status';
        status.textContent = 'Wird gelöscht …';

        try {
          const response = await fetch('/.netlify/functions/delete-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, datei: post.datei }),
          });
          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) {
              window.TeamAuth.clearCachedSecret();
            }
            throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
          }

          status.className = 'gallery-status success';
          status.textContent = 'Gelöscht.';
          setTimeout(onUpdated, 800);
        } catch (error) {
          status.className = 'gallery-status error';
          status.textContent = `Löschen fehlgeschlagen: ${error.message}`;
          deleteButton.disabled = false;
        }
      });
      wrapper.appendChild(deleteButton);

      const status = document.createElement('p');
      status.className = 'gallery-status';
      status.setAttribute('aria-live', 'polite');
      wrapper.appendChild(status);

      return wrapper;
    }

    if (post.status === 'bereit') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-submit btn-primary';
      button.textContent = '🗓️ Post einplanen';
      button.addEventListener('click', () => {
        window.SchedulePublishWizard.open(post, onUpdated);
      });
      wrapper.appendChild(button);

      const resetButton = document.createElement('button');
      resetButton.type = 'button';
      resetButton.className = 'selection-submit btn-secondary';
      resetButton.textContent = '↩️ Status zurücksetzen';
      wrapper.appendChild(resetButton);

      const resetStatus = document.createElement('p');
      resetStatus.className = 'gallery-status';
      resetStatus.setAttribute('aria-live', 'polite');
      wrapper.appendChild(resetStatus);

      resetButton.addEventListener('click', async () => {
        const result = await promptResetToEntwurf();
        if (!result) return;

        const secret = await window.TeamAuth.getOrPromptSecret();
        if (!secret) {
          resetStatus.className = 'gallery-status error';
          resetStatus.textContent = 'Ohne Team-Passwort kann diese Aktion nicht ausgeführt werden.';
          return;
        }

        resetButton.disabled = true;
        resetStatus.className = 'gallery-status';
        resetStatus.textContent = 'Wird zurückgesetzt …';

        try {
          const response = await fetch('/.netlify/functions/reset-to-entwurf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret,
              datei: post.datei,
              bearbeiter: result.bearbeiter,
              grund: result.grund,
              kommentar: result.kommentar,
            }),
          });
          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) window.TeamAuth.clearCachedSecret();
            throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
          }

          resetStatus.className = 'gallery-status success';
          resetStatus.textContent = 'Zurückgesetzt.';
          setTimeout(onUpdated, 1000);
        } catch (error) {
          resetStatus.className = 'gallery-status error';
          resetStatus.textContent = `Zurücksetzen fehlgeschlagen: ${error.message}`;
          resetButton.disabled = false;
        }
      });

      return wrapper;
    }

    if (post.status !== 'eingeplant') {
      return wrapper;
    }

    const geplantText = formatGeplantDatum(post.datum_geplant);
    if (geplantText) {
      const geplantEl = document.createElement('span');
      geplantEl.textContent = `Geplant für: ${geplantText}`;
      wrapper.appendChild(geplantEl);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'selection-submit btn-secondary';
    button.textContent = '🚀 Jetzt veröffentlichen';
    wrapper.appendChild(button);

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'selection-submit btn-secondary';
    resetButton.textContent = '↩️ Status zurücksetzen';
    wrapper.appendChild(resetButton);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    wrapper.appendChild(status);

    resetButton.addEventListener('click', async () => {
      const result = await promptResetToBereit();
      if (!result) return;

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann diese Aktion nicht ausgeführt werden.';
        return;
      }

      resetButton.disabled = true;
      status.className = 'gallery-status';
      status.textContent = 'Termin wird zurückgenommen …';

      try {
        const response = await fetch('/.netlify/functions/reset-to-bereit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, datei: post.datei, bestaetigt_von: result.bestaetigtVon }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) window.TeamAuth.clearCachedSecret();
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Termin zurückgenommen.';
        setTimeout(onUpdated, 1000);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Aktion fehlgeschlagen: ${error.message}`;
        resetButton.disabled = false;
      }
    });

    button.addEventListener('click', async () => {
      const confirmed = await window.ConfirmDialog.confirmAction({
        titel: 'Jetzt veröffentlichen?',
        nachricht: 'Der Post wird sofort als veröffentlicht markiert, unabhängig vom geplanten Termin.',
        bestaetigenLabel: 'Ja, jetzt veröffentlichen',
        abbrechenLabel: 'Abbrechen',
      });
      if (!confirmed) return;

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort kann diese Aktion nicht ausgeführt werden.';
        return;
      }

      button.disabled = true;
      status.className = 'gallery-status';
      status.textContent = 'Wird veröffentlicht …';

      try {
        const response = await fetch('/.netlify/functions/publish-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, datei: post.datei, datum_veroeffentlicht: todayISO() }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            window.TeamAuth.clearCachedSecret();
          }
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Veröffentlicht.';
        setTimeout(onUpdated, 2000);
      } catch (error) {
        status.className = 'gallery-status error';
        status.textContent = `Aktion fehlgeschlagen: ${error.message}`;
        button.disabled = false;
      }
    });

    return wrapper;
  }

  function buildCard(post) {
    const card = document.createElement('div');
    card.className = 'post-preview';

    const images = (post.medien || []).map((pfad) => ({ url: `/${pfad}`, alt: post.titel || pfad }));
    card.appendChild(window.PostShared.buildMock({
      images,
      caption: post.caption,
    }));
    card.appendChild(buildMeta(post));
    card.appendChild(buildActions(post, () => window.location.reload()));
    // Kommentare nur im Status "entwurf" - sobald der Post die Runde weiter ist, ist die
    // Kommentierungsphase vorbei (siehe auch den neuen "Status zurücksetzen"-Button, der
    // genau dafür sorgt, dass ein Post zum Nachbessern wieder kommentierbar wird).
    if (post.status === 'entwurf') {
      card.appendChild(buildComments(post, () => window.location.reload()));
    }
    return card;
  }

  // Filter: Status-Chips sind statisch im HTML, Kategorie-Chips werden aus den tatsächlich
  // geladenen Posts generiert (nur Kategorien, die gerade vorkommen). Status ist exklusiv und
  // Pflicht (immer genau ein Status aktiv, wie eine Radio-Gruppe statt Checkboxen - ein Post hat
  // ohnehin nie mehr als einen Status, und ohne Filter wäre die Übersicht bei wachsendem
  // Postbestand schnell unübersichtlich). Kategorie bleibt additiv (Mehrfachauswahl,
  // ODER-verknüpft) mit optionaler leerer Auswahl = kein Filter in dieser Dimension.
  let allPosts = [];
  let activeStatus = 'entwurf';
  const activeKategorien = new Set();

  function matchesFilters(post) {
    const statusOk = post.status === activeStatus;
    const kategorieOk = activeKategorien.size === 0 || activeKategorien.has(post.kategorie);
    return statusOk && kategorieOk;
  }

  function renderGrid() {
    const grid = document.querySelector('[data-post-grid]');
    grid.innerHTML = '';

    if (allPosts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-status';
      empty.textContent = 'Noch keine Post-Entwürfe gefunden.';
      grid.appendChild(empty);
      return;
    }

    const filtered = allPosts.filter(matchesFilters);
    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-status';
      empty.textContent = 'Keine Posts für die gewählten Filter gefunden.';
      grid.appendChild(empty);
      return;
    }

    // "Warten auf Veröffentlichung": nach Veröffentlichungstermin sortieren (nächster zuerst
    // statt neuester zuerst wie sonst überall, siehe post-data.js) - hier interessiert vor
    // allem, was als Nächstes dran ist. datum_geplant (JJJJ-MM-TTThh:mm) ist lexikografisch
    // sortierbar.
    if (activeStatus === 'eingeplant') {
      filtered.sort((a, b) => (a.datum_geplant || '').localeCompare(b.datum_geplant || ''));
    }

    filtered.forEach((post) => grid.appendChild(buildCard(post)));
  }

  function renderKategorieFilters() {
    const container = document.querySelector('[data-kategorie-filters]');
    container.innerHTML = '';

    const present = new Set(allPosts.map((post) => post.kategorie).filter(Boolean));
    const categories = (window.PostSteps.CATEGORIES || []).filter((c) => present.has(c.key));

    categories.forEach(({ key, label }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-chip';
      if (activeKategorien.has(key)) chip.classList.add('active');
      chip.textContent = label;
      chip.addEventListener('click', () => {
        if (activeKategorien.has(key)) {
          activeKategorien.delete(key);
        } else {
          activeKategorien.add(key);
        }
        chip.classList.toggle('active');
        renderGrid();
      });
      container.appendChild(chip);
    });
  }

  const statusChips = document.querySelectorAll('[data-status-filters] [data-status]');

  function setActiveStatus(status) {
    activeStatus = status;
    statusChips.forEach((c) => c.classList.toggle('active', c.dataset.status === activeStatus));
  }

  statusChips.forEach((chip) => {
    // Kein Abwählen des aktiven Status mehr (früher: erneuter Klick auf den aktiven Chip
    // löschte den Filter) - ein Klick setzt immer genau einen Status, nie "kein Filter".
    chip.addEventListener('click', () => {
      setActiveStatus(chip.dataset.status);
      renderGrid();
    });
  });

  setActiveStatus(activeStatus);

  async function loadPosts() {
    const grid = document.querySelector('[data-post-grid]');

    try {
      // Explizit statt zufälliger Skript-Reihenfolge: renderKategorieFilters() braucht die
      // Kategorienamen, sobald der Post-Fetch durch ist.
      await window.CategoriesStore.loadCategories();
      const response = await fetch('/.netlify/functions/post-data');
      const data = await response.json();

      if (!response.ok) {
        const message = data.details ? `${data.error} (${data.details})` : data.error;
        throw new Error(message || data.errorMessage || `HTTP ${response.status}`);
      }

      allPosts = data;
      renderKategorieFilters();
      renderGrid();
    } catch (error) {
      grid.innerHTML = '';
      const errorEl = document.createElement('p');
      errorEl.className = 'gallery-status error';
      errorEl.textContent = `Posts konnten nicht geladen werden: ${error.message}`;
      grid.appendChild(errorEl);
    }
  }

  // buildMock kommt aus post-mock.js (window.PostShared), das vor dieser Datei geladen wird.
  // reloadPosts wird von post-erstellen-wizard.js genutzt, um die Übersicht nach erfolgreichem
  // Speichern zu aktualisieren.
  window.PostShared.reloadPosts = loadPosts;

  loadPosts();
})();
