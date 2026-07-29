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

  // Muss mit netlify/functions/lib/categories.js synchron gehalten werden.
  const CATEGORIES = [
    { key: 'werkstatt', label: 'Werkstatt & Prozess' },
    { key: 'unterwegs', label: 'Unterwegs / Standorte' },
    { key: 'kundengeschichten', label: 'Kundengeschichten' },
    { key: 'produkt', label: 'Ring im Detail' },
    { key: 'team', label: 'Team & Menschen dahinter' },
    { key: 'wissen', label: 'Trauring-Wissen' },
    { key: 'community', label: 'Community & Interaktion' },
    { key: 'termine', label: 'Termine & Aktionen' },
    { key: 'zitatkachel', label: 'Zitatkachel' },
    { key: 'ladengeschaeft', label: 'Ladengeschäft (stationär)' },
    { key: 'hitlists', label: 'Listen & Trends' },
    { key: 'warum', label: 'Textkacheln mit Gründen für' },
    { key: 'regionen', label: 'Regionen & Standorte' },
    { key: 'pakete', label: 'Pakete & Angebote' },
  ];

  const openBtn = document.querySelector('[data-open-create]');
  const closeBtn = document.querySelector('[data-close-create]');
  const vorschauView = document.getElementById('ansicht-vorschau');
  const erstellenView = document.getElementById('ansicht-erstellen');
  const ordnerSelect = document.querySelector('[data-bild-ordner]');
  const kategorieSelect = document.querySelector('[data-post-kategorie]');
  const gallery = document.querySelector('[data-create-gallery]');
  const selectedImageInfo = document.querySelector('[data-selected-image-info]');
  const hashtagPicker = document.querySelector('[data-hashtag-picker]');
  const form = document.querySelector('[data-post-form]');
  const captionField = document.querySelector('[data-post-caption]');
  const titelField = document.querySelector('[data-post-titel]');
  const passwortField = document.querySelector('[data-post-passwort]');
  const submitBtn = document.querySelector('[data-post-submit]');
  const formStatus = document.querySelector('[data-form-status]');

  let selectedImage = null;
  const selectedHashtagSets = new Map();

  function populateSelect(selectEl, items) {
    items.forEach(({ key, label }) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      selectEl.appendChild(option);
    });
  }

  function resetForm() {
    form.reset();
    selectedImage = null;
    selectedHashtagSets.clear();
    selectedImageInfo.textContent = 'Noch kein Bild ausgewählt.';
    gallery.querySelectorAll('.image-card.selected').forEach((el) => el.classList.remove('selected'));
    hashtagPicker.querySelectorAll('.hashtag-pill.selected').forEach((el) => el.classList.remove('selected'));
    formStatus.textContent = '';
    formStatus.className = 'gallery-status';
  }

  function showCreateView() {
    vorschauView.hidden = true;
    erstellenView.hidden = false;
  }

  function showOverviewView() {
    erstellenView.hidden = true;
    vorschauView.hidden = false;
  }

  async function loadGallery(folderKey) {
    gallery.innerHTML = '<p class="gallery-status">Bilder werden geladen …</p>';
    try {
      const response = await fetch(`/.netlify/functions/images?folder=${encodeURIComponent(folderKey)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
      }

      gallery.innerHTML = '';
      if (data.length === 0) {
        gallery.innerHTML = '<p class="gallery-status">Keine Bilder in diesem Ordner gefunden.</p>';
        return;
      }

      data.forEach((image) => {
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
        card.addEventListener('click', () => {
          gallery.querySelectorAll('.image-card.selected').forEach((el) => el.classList.remove('selected'));
          card.classList.add('selected');
          selectedImage = { folder: folderKey, id: image.id, name: image.name };
          selectedImageInfo.textContent = `Ausgewählt: ${image.name}`;
        });

        gallery.appendChild(card);
      });
    } catch (error) {
      gallery.innerHTML = `<p class="gallery-status error">Bilder konnten nicht geladen werden: ${error.message}</p>`;
    }
  }

  async function loadHashtagSets() {
    try {
      const response = await fetch('/.netlify/functions/caption-blocks');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
      }

      hashtagPicker.innerHTML = '';
      data.forEach((set) => {
        const pill = document.createElement('span');
        pill.className = 'hashtag-pill';
        pill.textContent = set.name;
        pill.title = set.hashtags;
        pill.addEventListener('click', () => {
          if (selectedHashtagSets.has(set.name)) {
            selectedHashtagSets.delete(set.name);
            pill.classList.remove('selected');
          } else {
            selectedHashtagSets.set(set.name, set.hashtags);
            pill.classList.add('selected');
          }
        });
        hashtagPicker.appendChild(pill);
      });
    } catch (error) {
      hashtagPicker.innerHTML = `<p class="gallery-status error">Hashtag-Sets konnten nicht geladen werden: ${error.message}</p>`;
    }
  }

  function buildFinalCaption() {
    const freitext = captionField.value.trim();
    const hashtags = Array.from(selectedHashtagSets.values()).join(' ');
    return hashtags ? `${freitext}\n\n${hashtags}` : freitext;
  }

  openBtn.addEventListener('click', showCreateView);
  closeBtn.addEventListener('click', () => {
    resetForm();
    showOverviewView();
  });

  ordnerSelect.addEventListener('change', () => {
    selectedImage = null;
    selectedImageInfo.textContent = 'Noch kein Bild ausgewählt.';
    loadGallery(ordnerSelect.value);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!selectedImage) {
      formStatus.className = 'gallery-status error';
      formStatus.textContent = 'Bitte zuerst ein Bild auswählen.';
      return;
    }
    if (!titelField.value.trim()) {
      formStatus.className = 'gallery-status error';
      formStatus.textContent = 'Bitte einen Titel eingeben.';
      return;
    }
    if (!captionField.value.trim()) {
      formStatus.className = 'gallery-status error';
      formStatus.textContent = 'Bitte eine Caption schreiben.';
      return;
    }
    if (!passwortField.value) {
      formStatus.className = 'gallery-status error';
      formStatus.textContent = 'Bitte das Team-Passwort eingeben.';
      return;
    }

    submitBtn.disabled = true;
    formStatus.className = 'gallery-status';
    formStatus.textContent = 'Post wird gespeichert …';

    try {
      const response = await fetch('/.netlify/functions/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: passwortField.value,
          titel: titelField.value.trim(),
          kategorie: kategorieSelect.value,
          bildFolder: selectedImage.folder,
          bildId: selectedImage.id,
          caption: buildFinalCaption(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
      }

      sessionStorage.setItem('teamPasswort', passwortField.value);
      formStatus.className = 'gallery-status';
      formStatus.textContent = `Post gespeichert (${data.datei}) – erscheint nach dem automatischen Redeploy (ca. 1–2 Min.) in der Vorschau.`;
      setTimeout(() => {
        resetForm();
        showOverviewView();
      }, 3000);
    } catch (error) {
      formStatus.className = 'gallery-status error';
      formStatus.textContent = `Post konnte nicht gespeichert werden: ${error.message}`;
    } finally {
      submitBtn.disabled = false;
    }
  });

  populateSelect(ordnerSelect, FOLDERS);
  populateSelect(kategorieSelect, CATEGORIES);
  loadGallery(FOLDERS[0].key);
  loadHashtagSets();

  const cachedPasswort = sessionStorage.getItem('teamPasswort');
  if (cachedPasswort) {
    passwortField.value = cachedPasswort;
  }
})();
