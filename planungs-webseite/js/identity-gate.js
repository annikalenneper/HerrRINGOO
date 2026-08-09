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
  // - [data-identity-error]: Fehlertext, standardmäßig mit "hidden" im HTML
  //
  // Wichtig: netlifyIdentity.init() wird HIER SOFORT aufgerufen (nicht erst bei
  // DOMContentLoaded) - das Widget beginnt beim Ausführen seines eigenen <script>-Tags bereits
  // selbst, einen Einladungs-/Bestätigungs-/Recovery-Token aus dem URL-Hash zu verarbeiten.
  // Wartet unser init()-Aufruf zu lange (z. B. bis DOMContentLoaded), entsteht ein Zeitfenster,
  // in dem das Widget seinen eigenen Passwort-Dialog für den Invite-Flow nicht sauber aufbaut
  // (beobachtetes Symptom: kurz aufblitzendes, nicht klickbares Overlay statt Passwort-Formular,
  // erst nach Reload wieder ansprechbar - deckt sich mit bekannten Berichten zu genau diesem
  // Widget). Da init() selbst kein DOM braucht, ist das gefahrlos möglich; die eigentliche
  // DOM-Manipulation (Gate ein-/ausblenden) wird über einen "pending state" entkoppelt und erst
  // angewendet, sobald der DOM bereit ist - unabhängig davon, ob der Login-Status vorher oder
  // nachher bekannt wird.

  let domReady = false;
  let pendingState = null; // 'loggedIn' | 'loggedOut'
  let pendingUser = null;

  function applyState() {
    if (!domReady || pendingState === null) return;

    const gate = document.querySelector('[data-identity-gate]');
    const protectedContent = document.querySelector('[data-identity-protected]');
    const statusEl = document.querySelector('[data-identity-status]');
    const userEl = document.querySelector('[data-identity-user]');

    if (pendingState === 'loggedIn') {
      if (gate) gate.hidden = true;
      if (protectedContent) protectedContent.hidden = false;
      if (statusEl) statusEl.hidden = false;
      if (userEl && pendingUser) {
        const name = (pendingUser.user_metadata && pendingUser.user_metadata.full_name) || pendingUser.email;
        userEl.textContent = name;
      }
    } else {
      if (gate) gate.hidden = false;
      if (protectedContent) protectedContent.hidden = true;
      if (statusEl) statusEl.hidden = true;
    }
  }

  function setLoggedIn(user) {
    pendingState = 'loggedIn';
    pendingUser = user;
    applyState();
  }

  function setLoggedOut() {
    pendingState = 'loggedOut';
    pendingUser = null;
    applyState();
  }

  function showError(message) {
    function apply() {
      const errorEl = document.querySelector('[data-identity-error]');
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = message;
      }
    }
    if (domReady) apply();
    else document.addEventListener('DOMContentLoaded', apply, { once: true });
  }

  if (window.netlifyIdentity) {
    netlifyIdentity.on('init', (user) => {
      if (user) {
        setLoggedIn(user);
        return;
      }
      setLoggedOut();
      // Fallback: falls im Hash noch ein unverarbeiteter Einladungs-/Bestätigungs-/
      // Recovery-Token steht, das Widget diesen aber nicht selbst automatisch geöffnet hat
      // (siehe Kommentar oben), das Passwort-Formular explizit erzwingen.
      const hash = window.location.hash || '';
      if (/(invite_token|confirmation_token|recovery_token|email_change_token)=/.test(hash)) {
        netlifyIdentity.open();
      }
    });

    netlifyIdentity.on('login', (user) => {
      setLoggedIn(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      setLoggedOut();
    });

    netlifyIdentity.on('error', (err) => {
      showError(`Login fehlgeschlagen: ${(err && err.message) || 'unbekannter Fehler'}. Bitte erneut versuchen.`);
    });

    // Baut sein Popup beim allerersten open() erkennbar langsam auf (in Tests 5-6 Sekunden
    // ohne jede Rückmeldung) - resetLoginButton() unten gibt in der Zwischenzeit sichtbares
    // Feedback, damit das nicht wie ein hängender Button wirkt.
    netlifyIdentity.on('open', () => {
      resetLoginButton();
    });

    netlifyIdentity.init({ locale: 'de' });
  } else {
    // Widget-Skript konnte nicht laden (z. B. offline, oder Identity läuft nicht als
    // Netlify-Deploy) - klare Fehlermeldung statt eines für immer leeren, unerklärten Gates.
    showError('Login-Dienst konnte nicht geladen werden. Bitte Seite neu laden oder später erneut versuchen.');
  }

  const LOGIN_BTN_DEFAULT_TEXT = 'Einloggen';

  // Setzt den Button zurück, sobald das Widget-Popup tatsächlich offen ist (on('open') oben)
  // oder spätestens nach 10s (Fallback, falls open() aus irgendeinem Grund nie feuert - lieber
  // ein zu früh nutzbarer Button als ein für immer blockierter).
  let loginBtnResetTimeout = null;
  function resetLoginButton() {
    if (loginBtnResetTimeout) {
      clearTimeout(loginBtnResetTimeout);
      loginBtnResetTimeout = null;
    }
    const loginBtn = document.querySelector('[data-identity-login]');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = LOGIN_BTN_DEFAULT_TEXT;
    }
  }

  function wireButtons() {
    const loginBtn = document.querySelector('[data-identity-login]');
    const logoutBtn = document.querySelector('[data-identity-logout]');
    if (loginBtn && window.netlifyIdentity) {
      loginBtn.addEventListener('click', () => {
        // Das Widget-Popup braucht beim allerersten Öffnen mehrere Sekunden, ohne dass von
        // selbst irgendetwas sichtbar passiert - ohne dieses Feedback wirkt der Button wie
        // hängengeblieben (genau das beobachtete Symptom).
        loginBtn.disabled = true;
        loginBtn.textContent = 'Wird geöffnet …';
        loginBtnResetTimeout = setTimeout(resetLoginButton, 10000);
        netlifyIdentity.open('login');
      });
    }
    if (logoutBtn && window.netlifyIdentity) {
      logoutBtn.addEventListener('click', () => netlifyIdentity.logout());
    }
  }

  function onDomReady() {
    domReady = true;
    applyState();
    wireButtons();
  }

  if (document.readyState !== 'loading') onDomReady();
  else document.addEventListener('DOMContentLoaded', onDomReady);
})();
