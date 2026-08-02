(function () {
  // Eigenständiger Dialog (kein WizardEngine-Schritt-Flow, da es nur eine einzelne Aktion ist,
  // kein mehrstufiger Content-Wizard) für den direkten Bild-Upload vom eigenen Gerät nach
  // planungs-webseite/medien/uploads/ (siehe upload-image.js). Bilder werden dort anschließend
  // im Bild-Schritt des "Post erstellen"-Wizards als eigener Ordner "uploads" auswählbar
  // (siehe post-erstellen-wizard.js FOLDERS + netlify/functions/images.js).

  // Clientseitige Verkleinerung vor dem Versand: Netlify Functions haben ein hartes
  // Payload-Limit von ca. 6 MB pro Anfrage (inkl. Base64-Overhead von ~33%) - ein
  // unverkleinertes Kamera-/Handyfoto (oft 5-15 MB) würde das leicht überschreiten. Die
  // eigentliche, maßgebliche Kompression (1080px, Qualität 82) passiert serverseitig in
  // upload-image.js über dieselbe Funktion wie beim Drive-Import - diese Verkleinerung hier
  // dient nur der Transportgröße, nicht der Endqualität.
  const MAX_TRANSPORT_KANTE = 2000;
  const TRANSPORT_QUALITAET = 0.85;
  const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

  function resizeForTransport(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX_TRANSPORT_KANTE || height > MAX_TRANSPORT_KANTE) {
          if (width >= height) {
            height = Math.round((height / width) * MAX_TRANSPORT_KANTE);
            width = MAX_TRANSPORT_KANTE;
          } else {
            width = Math.round((width / height) * MAX_TRANSPORT_KANTE);
            height = MAX_TRANSPORT_KANTE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Bild konnte nicht verarbeitet werden.'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          TRANSPORT_QUALITAET
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Datei ist kein lesbares Bild.'));
      };
      img.src = url;
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      reader.readAsDataURL(blob);
    });
  }

  function open() {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const heading = document.createElement('h3');
    heading.textContent = 'Bild(er) hochladen';
    dialog.appendChild(heading);

    const hint = document.createElement('p');
    hint.textContent = 'Bilder werden vor dem Speichern automatisch komprimiert und landen im Ordner "Hochgeladene Bilder".';
    dialog.appendChild(hint);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'app-dialog-input';
    dialog.appendChild(fileInput);

    const fileList = document.createElement('ul');
    fileList.className = 'upload-file-list';
    dialog.appendChild(fileList);

    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.setAttribute('aria-live', 'polite');
    dialog.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'app-dialog-actions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'selection-submit btn-secondary';
    closeBtn.textContent = 'Schließen';
    closeBtn.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
    });
    actions.appendChild(closeBtn);

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'selection-submit btn-primary';
    uploadBtn.textContent = 'Hochladen';
    uploadBtn.disabled = true;
    actions.appendChild(uploadBtn);

    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    fileInput.addEventListener('change', () => {
      uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
      status.className = 'gallery-status';
      status.textContent = '';
    });

    uploadBtn.addEventListener('click', async () => {
      const files = Array.from(fileInput.files || []);
      if (files.length === 0) return;

      const secret = await window.TeamAuth.getOrPromptSecret();
      if (!secret) {
        status.className = 'gallery-status error';
        status.textContent = 'Ohne Team-Passwort können keine Bilder hochgeladen werden.';
        return;
      }

      fileInput.disabled = true;
      uploadBtn.disabled = true;
      closeBtn.disabled = true;
      fileList.innerHTML = '';

      const items = files.map((file) => {
        const item = document.createElement('li');
        item.textContent = `⏳ ${file.name}`;
        fileList.appendChild(item);
        return item;
      });

      let erfolge = 0;
      // Sequentiell statt parallel: vermeidet konkurrierende Schreibzugriffe auf denselben
      // GitHub-Branch (jeder Upload ist ein eigener Commit).
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const item = items[index];
        status.className = 'gallery-status';
        status.textContent = `Bild ${index + 1} von ${files.length} wird hochgeladen …`;

        try {
          if (file.size > MAX_ORIGINAL_BYTES) {
            throw new Error(`Datei ist zu groß (max. ${Math.floor(MAX_ORIGINAL_BYTES / 1024 / 1024)} MB).`);
          }

          const resized = await resizeForTransport(file);
          const bildBase64 = await blobToBase64(resized);

          const response = await fetch('/.netlify/functions/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, dateiname: file.name, bildBase64 }),
          });
          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) {
              window.TeamAuth.clearCachedSecret();
            }
            throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
          }

          item.textContent = `✅ ${file.name}`;
          erfolge += 1;
        } catch (error) {
          item.textContent = `❌ ${file.name}: ${error.message}`;
        }
      }

      closeBtn.disabled = false;
      status.className = erfolge === files.length ? 'gallery-status success' : 'gallery-status error';
      status.textContent = `${erfolge} von ${files.length} Bild${files.length === 1 ? '' : 'ern'} hochgeladen.`;
    });

    dialog.showModal();
  }

  window.UploadWizard = { open };

  const openBtn = document.querySelector('[data-open-upload]');
  if (openBtn) {
    openBtn.addEventListener('click', () => open());
  }
})();
