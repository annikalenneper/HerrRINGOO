(function () {
  function kategorieLabel(key) {
    const match = (window.PostSteps.CATEGORIES || []).find((c) => c.key === key);
    return match ? match.label : (key || '–');
  }

  function buildMeta(post) {
    const meta = document.createElement('div');
    meta.className = 'post-preview-meta';

    const kategorieChip = document.createElement('span');
    kategorieChip.className = 'category-chip';
    kategorieChip.textContent = kategorieLabel(post.kategorie);
    meta.appendChild(kategorieChip);

    return meta;
  }

  function todayISO() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Entwurf -> bereit läuft über einen eigenen Mini-Wizard (Datum & Uhrzeit + Vorschau,
  // siehe schedule-wizard.js), da hier jetzt auch eine Uhrzeit festgelegt werden muss.
  // Bereit -> veroeffentlicht bleibt die einfache Inline-Aktion (nur Datum, kein Wizard).
  function buildActions(post, onUpdated) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-preview-actions';

    if (post.status === 'entwurf') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-submit btn-primary';
      button.textContent = '🗓️ Post einplanen';
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

    if (post.status !== 'bereit') {
      return wrapper;
    }

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = todayISO();
    wrapper.appendChild(dateInput);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'selection-submit btn-primary';
    button.textContent = '🚀 Als veröffentlicht markieren';
    wrapper.appendChild(button);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    wrapper.appendChild(status);

    button.addEventListener('click', async () => {
      if (!dateInput.value) {
        status.className = 'gallery-status error';
        status.textContent = 'Bitte ein Datum wählen.';
        return;
      }

      const confirmed = await window.ConfirmDialog.confirmAction({
        titel: 'Aktion bestätigen',
        nachricht: `Post am ${dateInput.value} als veröffentlicht markieren?`,
        bestaetigenLabel: 'Ja, markieren',
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
      status.textContent = 'Wird aktualisiert …';

      try {
        const response = await fetch('/.netlify/functions/publish-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, datei: post.datei, datum_veroeffentlicht: dateInput.value }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            window.TeamAuth.clearCachedSecret();
          }
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }

        status.className = 'gallery-status success';
        status.textContent = 'Aktualisiert.';
        setTimeout(onUpdated, 3000);
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
    return card;
  }

  // Filter: Status-Chips sind statisch im HTML, Kategorie-Chips werden aus den tatsächlich
  // geladenen Posts generiert (nur Kategorien, die gerade vorkommen). Status ist exklusiv
  // (immer nur ein Status gleichzeitig aktiv, wie eine Radio-Gruppe - ein Post hat ohnehin nie
  // mehr als einen Status). Kategorie ist additiv (Mehrfachauswahl, ODER-verknüpft, da mehrere
  // gewählte Kategorien den Ergebnis-Umfang erweitern sollen). Leere Auswahl = kein Filter in
  // dieser Dimension.
  let allPosts = [];
  let activeStatus = null;
  const activeKategorien = new Set();

  function matchesFilters(post) {
    const statusOk = !activeStatus || post.status === activeStatus;
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
  statusChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const status = chip.dataset.status;
      activeStatus = activeStatus === status ? null : status;
      statusChips.forEach((c) => c.classList.toggle('active', c.dataset.status === activeStatus));
      renderGrid();
    });
  });

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
