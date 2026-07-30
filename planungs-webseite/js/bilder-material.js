(function () {
  // Muss mit netlify/functions/lib/drive-folders.js synchron gehalten werden.
  const FOLDERS = [
    { key: 'presse-mappe', label: 'Presse-Mappe' },
    { key: 'bilder-daniel', label: 'Bilder Daniel' },
    { key: 'bilder-deik', label: 'Bilder Deik' },
    { key: 'behind-the-scenes', label: 'Fotos Videodreh "Behind the Scenes"' },
    { key: 'bilder-geschaeft', label: 'Bilder Geschäft' },
    { key: 'anzeigen', label: 'Anzeigen (Magazine, Zeitschriften etc.)' },
  ];
  const PAGE_SIZE = 60;

  // id -> { id, name, folderKey, folderLabel, thumbnailLink }. Bleibt ordnerübergreifend
  // erhalten (auch wenn nur ein Ordner sichtbar ist), damit Bilder aus mehreren Ordnern
  // gemeinsam zu einem Mehrbild-Post zusammengefasst werden können.
  const selected = new Map();
  let currentFolderKey = FOLDERS[0].key;
  let nextPageToken = null;

  const ordnerSelect = document.querySelector('[data-galerie-ordner]');
  const gallery = document.querySelector('[data-galerie-gallery]');
  const loadMoreBtn = document.querySelector('[data-load-more]');
  const countEl = document.querySelector('[data-selection-count]');
  const submitBtn = document.querySelector('[data-selection-submit]');
  const galerieView = document.getElementById('ansicht-galerie');
  const postErstellenView = document.getElementById('ansicht-post-erstellen');

  function updateSelectionUI() {
    countEl.textContent = `${selected.size} Bild${selected.size === 1 ? '' : 'er'} ausgewählt`;
    submitBtn.disabled = selected.size === 0;
  }

  function toggleSelection(card, image, folderLabel) {
    if (selected.has(image.id)) {
      selected.delete(image.id);
      card.classList.remove('selected');
    } else {
      selected.set(image.id, {
        id: image.id,
        name: image.name,
        folderKey: currentFolderKey,
        folderLabel,
        thumbnailLink: image.thumbnailLink,
      });
      card.classList.add('selected');
    }
    updateSelectionUI();
  }

  function appendImages(images, folderLabel) {
    images.forEach((image) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      if (selected.has(image.id)) card.classList.add('selected');

      const img = document.createElement('img');
      img.src = image.thumbnailLink;
      img.alt = image.name;
      img.loading = 'lazy';

      const tag = document.createElement('div');
      tag.className = 'image-tag';
      tag.textContent = image.name;

      card.appendChild(img);
      card.appendChild(tag);
      card.addEventListener('click', () => toggleSelection(card, image, folderLabel));

      gallery.appendChild(card);
    });
  }

  async function loadPage(folderKey, pageToken) {
    const folderLabel = (FOLDERS.find((f) => f.key === folderKey) || {}).label || folderKey;
    const params = new URLSearchParams({ folder: folderKey, pageSize: String(PAGE_SIZE) });
    if (pageToken) params.set('pageToken', pageToken);

    loadMoreBtn.hidden = true;
    if (!pageToken) {
      gallery.innerHTML = '<p class="gallery-status" aria-live="polite">Bilder werden geladen …</p>';
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Lädt …';
    }

    try {
      const response = await fetch(`/.netlify/functions/images?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
      }

      if (!pageToken) gallery.innerHTML = '';

      if (!pageToken && data.images.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'gallery-status';
        empty.textContent = 'Keine Bilder in diesem Ordner gefunden.';
        gallery.appendChild(empty);
      } else {
        appendImages(data.images, folderLabel);
      }

      nextPageToken = data.nextPageToken;
      loadMoreBtn.hidden = !nextPageToken;
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Mehr laden';
    } catch (error) {
      if (!pageToken) gallery.innerHTML = '';
      const errorEl = document.createElement('p');
      errorEl.className = 'gallery-status error';
      errorEl.textContent = `Bilder konnten nicht geladen werden: ${error.message}`;
      gallery.appendChild(errorEl);
      loadMoreBtn.hidden = true;
    }
  }

  ordnerSelect.addEventListener('change', () => {
    currentFolderKey = ordnerSelect.value;
    nextPageToken = null;
    loadPage(currentFolderKey, null);
  });

  loadMoreBtn.addEventListener('click', () => {
    if (nextPageToken) loadPage(currentFolderKey, nextPageToken);
  });

  function returnToGallery() {
    postErstellenView.hidden = true;
    galerieView.hidden = false;
  }

  submitBtn.addEventListener('click', () => {
    if (selected.size === 0) return;
    window.BilderMaterialWizard.start(Array.from(selected.values()), {
      onCancel: returnToGallery,
      onComplete: () => {
        // Abbrechen behält die mühsam zusammengestellte Auswahl bei (kein stiller
        // Datenverlust); nach erfolgreichem Speichern wird sie dagegen geleert.
        selected.clear();
        gallery.querySelectorAll('.image-card.selected').forEach((el) => el.classList.remove('selected'));
        updateSelectionUI();
        returnToGallery();
      },
    });
    galerieView.hidden = true;
    postErstellenView.hidden = false;
  });

  FOLDERS.forEach(({ key, label }) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    ordnerSelect.appendChild(option);
  });
  ordnerSelect.value = currentFolderKey;

  updateSelectionUI();
  loadPage(currentFolderKey, null);
})();
