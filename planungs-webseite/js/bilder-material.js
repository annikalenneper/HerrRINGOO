(function () {
  const selected = new Set();

  const countEl = document.querySelector('[data-selection-count]');
  const submitBtn = document.querySelector('[data-selection-submit]');

  function updateSelectionCount() {
    countEl.textContent = `${selected.size} Bild${selected.size === 1 ? '' : 'er'} ausgewählt`;
  }

  function toggleSelection(card, id) {
    if (selected.has(id)) {
      selected.delete(id);
      card.classList.remove('selected');
    } else {
      selected.add(id);
      card.classList.add('selected');
    }
    updateSelectionCount();
  }

  function renderGallery(gridEl, images) {
    gridEl.innerHTML = '';

    if (images.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-status';
      empty.textContent = 'Keine Bilder in diesem Ordner gefunden.';
      gridEl.appendChild(empty);
      return;
    }

    images.forEach((image) => {
      const card = document.createElement('div');
      card.className = 'image-card';

      const img = document.createElement('img');
      img.src = image.thumbnailLink;
      img.alt = image.name;
      img.loading = 'lazy';

      const tag = document.createElement('div');
      tag.className = 'image-tag';
      tag.textContent = image.name;

      card.appendChild(img);
      card.appendChild(tag);
      card.addEventListener('click', () => toggleSelection(card, image.id));

      gridEl.appendChild(card);
    });
  }

  async function loadGallery(section) {
    const folderKey = section.dataset.folder;
    const gridEl = section.querySelector('[data-gallery]');

    try {
      const response = await fetch(`/.netlify/functions/images?folder=${encodeURIComponent(folderKey)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unbekannter Fehler');
      }

      renderGallery(gridEl, data);
    } catch (error) {
      gridEl.innerHTML = '';
      const errorEl = document.createElement('p');
      errorEl.className = 'gallery-status error';
      errorEl.textContent = `Bilder konnten nicht geladen werden: ${error.message}`;
      gridEl.appendChild(errorEl);
    }
  }

  async function submitSelection() {
    if (selected.size === 0) {
      return;
    }

    submitBtn.disabled = true;
    try {
      const response = await fetch('/.netlify/functions/select-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unbekannter Fehler');
      }

      countEl.textContent = `${data.received.length} Bild${data.received.length === 1 ? '' : 'er'} übermittelt`;
    } catch (error) {
      countEl.textContent = `Fehler beim Übermitteln: ${error.message}`;
    } finally {
      submitBtn.disabled = false;
    }
  }

  document.querySelectorAll('.gallery-section').forEach(loadGallery);
  submitBtn.addEventListener('click', submitSelection);
})();
