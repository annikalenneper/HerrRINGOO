(function () {
  function kategorieLabel(key) {
    const match = (window.CategoriesStore.CATEGORIES || []).find((c) => c.key === key);
    return match ? match.label : (key || '–');
  }

  function buildCard(idee, onChanged) {
    const card = document.createElement('div');
    card.className = 'card idea-card';

    const heading = document.createElement('h3');
    heading.textContent = idee.titel;
    card.appendChild(heading);

    const kategorieChip = document.createElement('span');
    kategorieChip.className = 'category-chip';
    kategorieChip.textContent = kategorieLabel(idee.kategorie);
    card.appendChild(kategorieChip);

    const beschreibung = document.createElement('p');
    beschreibung.textContent = idee.beschreibung;
    card.appendChild(beschreibung);

    if (idee.bebilderung) {
      const bebilderung = document.createElement('p');
      bebilderung.className = 'idea-bebilderung';
      bebilderung.textContent = idee.bebilderung;
      card.appendChild(bebilderung);
    }

    const actions = document.createElement('div');
    actions.className = 'idea-card-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'icon-button';
    editButton.setAttribute('aria-label', 'Idee bearbeiten');
    editButton.title = 'Idee bearbeiten';
    editButton.textContent = '✏️';
    editButton.addEventListener('click', async () => {
      if (!(await window.CategoriesStore.ensureReady(editButton))) return;
      window.IdeaDialog.open(idee, onChanged);
    });
    actions.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'icon-button';
    deleteButton.setAttribute('aria-label', 'Idee löschen');
    deleteButton.title = 'Idee löschen';
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', async () => {
      const confirmed = await window.ConfirmDialog.confirmAction({
        titel: 'Idee löschen?',
        nachricht: `„${idee.titel}" wird unwiderruflich gelöscht.`,
        bestaetigenLabel: 'Ja, löschen',
        abbrechenLabel: 'Abbrechen',
        destructive: true,
      });
      if (!confirmed) return;

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) return;

      deleteButton.disabled = true;
      try {
        const response = await fetch('/.netlify/functions/delete-idea', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, id: idee.id }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401) window.TeamAuth.clearCachedSecret();
          throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
        }
        onChanged();
      } catch (error) {
        deleteButton.disabled = false;
        window.alert(`Löschen fehlgeschlagen: ${error.message}`);
      }
    });
    actions.appendChild(deleteButton);

    card.appendChild(actions);
    return card;
  }

  // Filter: Kategorie additiv (Mehrfachauswahl, ODER-verknüpft), plus Freitextsuche über
  // Titel+Beschreibung.
  let allIdeen = [];
  const activeKategorien = new Set();
  let searchTerm = '';

  function matchesFilters(idee) {
    const kategorieOk = activeKategorien.size === 0 || activeKategorien.has(idee.kategorie);
    const searchOk = !searchTerm
      || (idee.titel || '').toLowerCase().includes(searchTerm)
      || (idee.beschreibung || '').toLowerCase().includes(searchTerm);
    return kategorieOk && searchOk;
  }

  function renderGrid() {
    const grid = document.querySelector('[data-idee-grid]');
    grid.innerHTML = '';

    if (allIdeen.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-status';
      empty.textContent = 'Noch keine Ideen gesammelt.';
      grid.appendChild(empty);
      return;
    }

    const filtered = allIdeen.filter(matchesFilters);
    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-status';
      empty.textContent = 'Keine Ideen für die gewählten Filter gefunden.';
      grid.appendChild(empty);
      return;
    }

    filtered.forEach((idee) => grid.appendChild(buildCard(idee, () => window.location.reload())));
  }

  function renderKategorieFilters() {
    const container = document.querySelector('[data-kategorie-filters]');
    container.innerHTML = '';

    const present = new Set(allIdeen.map((idee) => idee.kategorie).filter(Boolean));
    const categories = (window.CategoriesStore.CATEGORIES || []).filter((c) => present.has(c.key));

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

  const searchInput = document.querySelector('[data-idee-suche]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value.trim().toLowerCase();
      renderGrid();
    });
  }

  async function loadIdeen() {
    const grid = document.querySelector('[data-idee-grid]');

    try {
      await window.CategoriesStore.loadCategories();
      const response = await fetch('/.netlify/functions/idea-data');
      const data = await response.json();

      if (!response.ok) {
        const message = data.details ? `${data.error} (${data.details})` : data.error;
        throw new Error(message || `HTTP ${response.status}`);
      }

      allIdeen = data;
      renderKategorieFilters();
      renderGrid();
    } catch (error) {
      grid.innerHTML = '';
      const errorEl = document.createElement('p');
      errorEl.className = 'gallery-status error';
      errorEl.textContent = `Ideen konnten nicht geladen werden: ${error.message}`;
      grid.appendChild(errorEl);
    }
  }

  const openBtn = document.querySelector('[data-open-create-idee]');
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      if (!(await window.CategoriesStore.ensureReady(openBtn))) return;
      window.IdeaDialog.open(null, () => window.location.reload());
    });
  }

  loadIdeen();
})();
