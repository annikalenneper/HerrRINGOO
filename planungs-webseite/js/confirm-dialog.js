(function () {
  // Generischer Bestätigungsdialog (natives <dialog> – bringt Fokus-Steuerung und
  // Esc-zum-Schließen bereits mit). Kein Feature-Wissen, wird von mehreren Stellen genutzt
  // (Wizard-Abbruch, Status-Aktionen auf Post-Karten).
  function confirmAction({ titel, nachricht, bestaetigenLabel = 'Bestätigen', abbrechenLabel = 'Abbrechen', destructive = false }) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';

      const heading = document.createElement('h3');
      heading.textContent = titel;
      dialog.appendChild(heading);

      const message = document.createElement('p');
      message.textContent = nachricht;
      dialog.appendChild(message);

      const actions = document.createElement('div');
      actions.className = 'app-dialog-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'selection-submit btn-secondary';
      cancelBtn.textContent = abbrechenLabel;
      cancelBtn.addEventListener('click', () => dialog.close('cancel'));
      actions.appendChild(cancelBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = `selection-submit ${destructive ? 'btn-danger' : 'btn-primary'}`;
      confirmBtn.textContent = bestaetigenLabel;
      confirmBtn.addEventListener('click', () => dialog.close('confirm'));
      actions.appendChild(confirmBtn);

      dialog.appendChild(actions);
      document.body.appendChild(dialog);

      // Esc-Taste löst 'close' ohne vorheriges returnValue-Update aus – wird unten wie
      // ein Abbrechen behandelt (confirmed bleibt false).
      dialog.addEventListener('close', () => {
        const confirmed = dialog.returnValue === 'confirm';
        dialog.remove();
        resolve(confirmed);
      });

      dialog.showModal();
      cancelBtn.focus();
    });
  }

  window.ConfirmDialog = { confirmAction };
})();
