(function () {
  // Sperrt den Seiteninhalt hinter einem Netlify-Identity-Login (netlify-identity-widget.js,
  // vor dieser Datei per <script> eingebunden). Rein clientseitiges Gate - passt zum bestehenden
  // Sicherheitsmodell des Tools, in dem tatsächlich schreibende Aktionen ohnehin serverseitig
  // übers Team-Passwort abgesichert sind (siehe lib/auth.js), nicht über dieses Login. Das Login
  // regelt nur, wer die Oberfläche überhaupt zu sehen bekommt.
  //
  // Erwartet im HTML:
  // - [data-identity-gate]: Login-Aufforderung, standardmäßig sichtbar (kein "hidden" im HTML)
  // - [data-identity-protected]: der eigentliche Seiteninhalt, standardmäßig mit "hidden"
  //   im HTML (verhindert ein kurzes Aufblitzen vor dem ersten JS-Check)
  // - [data-identity-status]: Container für Nutzername + Logout im Header, standardmäßig
  //   mit "hidden" im HTML
  // - [data-identity-user]: Textknoten für den angezeigten Namen
  // - [data-identity-login] / [data-identity-logout]: Buttons

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    const gate = document.querySelector('[data-identity-gate]');
    const protectedContent = document.querySelector('[data-identity-protected]');
    const statusEl = document.querySelector('[data-identity-status]');
    const userEl = document.querySelector('[data-identity-user]');
    const loginBtn = document.querySelector('[data-identity-login]');
    const logoutBtn = document.querySelector('[data-identity-logout]');
    const errorEl = document.querySelector('[data-identity-error]');

    if (!window.netlifyIdentity) {
      // Widget-Skript konnte nicht laden (z. B. offline, oder Identity läuft nicht als
      // Netlify-Deploy) - klare Fehlermeldung statt eines für immer leeren, unerklärten Gates.
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Login-Dienst konnte nicht geladen werden. Bitte Seite neu laden oder später erneut versuchen.';
      }
      return;
    }

    function showLoggedIn(user) {
      if (gate) gate.hidden = true;
      if (protectedContent) protectedContent.hidden = false;
      if (statusEl) statusEl.hidden = false;
      if (userEl) {
        const name = (user.user_metadata && user.user_metadata.full_name) || user.email;
        userEl.textContent = name;
      }
    }

    function showLoggedOut() {
      if (gate) gate.hidden = false;
      if (protectedContent) protectedContent.hidden = true;
      if (statusEl) statusEl.hidden = true;
    }

    netlifyIdentity.on('init', (user) => {
      if (user) showLoggedIn(user);
      else showLoggedOut();
    });

    netlifyIdentity.on('login', (user) => {
      showLoggedIn(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      showLoggedOut();
    });

    if (loginBtn) {
      loginBtn.addEventListener('click', () => netlifyIdentity.open('login'));
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => netlifyIdentity.logout());
    }

    netlifyIdentity.init();
  });
})();
