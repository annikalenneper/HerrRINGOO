(function () {
  // Bündelt das sitzungsweite Team-Passwort (früher dupliziert in post-form.js und
  // post-erstellen.js): einmal pro Sitzung abfragen, danach aus sessionStorage bedienen.
  const STORAGE_KEY = 'teamPasswort';

  function showPasswordDialog() {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';

      const form = document.createElement('form');
      form.method = 'dialog';

      const heading = document.createElement('h3');
      heading.textContent = 'Team-Passwort erforderlich';
      form.appendChild(heading);

      const hint = document.createElement('p');
      hint.textContent = 'Bitte das Team-Passwort eingeben, um fortzufahren.';
      form.appendChild(hint);

      const input = document.createElement('input');
      input.type = 'password';
      input.autocomplete = 'off';
      input.required = true;
      input.className = 'app-dialog-input';
      form.appendChild(input);

      const actions = document.createElement('div');
      actions.className = 'app-dialog-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'selection-submit btn-secondary';
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.addEventListener('click', () => dialog.close('cancel'));
      actions.appendChild(cancelBtn);

      const okBtn = document.createElement('button');
      okBtn.type = 'submit';
      okBtn.className = 'selection-submit btn-primary';
      okBtn.textContent = 'Bestätigen';
      actions.appendChild(okBtn);

      form.appendChild(actions);
      dialog.appendChild(form);
      document.body.appendChild(dialog);

      dialog.addEventListener('close', () => {
        const value = dialog.returnValue === 'cancel' ? null : input.value;
        dialog.remove();
        resolve(value || null);
      });

      dialog.showModal();
      input.focus();
    });
  }

  async function getOrPromptSecret() {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) return cached;

    const value = await showPasswordDialog();
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    return value;
  }

  function clearCachedSecret() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  window.TeamAuth = { getOrPromptSecret, clearCachedSecret };
})();
