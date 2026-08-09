(function () {
  // Sperrt den Seiteninhalt hinter einem Netlify-Identity-Login (netlify-identity-widget.js,
  // vor dieser Datei per <script> eingebunden). Rein clientseitiges Gate - passt zum bestehenden
  // Sicherheitsmodell des Tools, in dem tatsächlich schreibende Aktionen ohnehin serverseitig
  // übers Team-Passwort abgesichert sind (siehe lib/auth.js), nicht über dieses Login. Das Login
  // regelt nur, wer die Oberfläche überhaupt zu sehen bekommt.
  //
  // Erwartet im HTML:
  // - [data-identity-loading]: neutrale Lade-Anzeige, standardmäßig sichtbar (kein "hidden" im
  //   HTML) - verhindert ein kurzes Aufblitzen der Login-Box bei bereits eingeloggten Personen
  //   (das Widget-Skript lädt asynchron nach, bis netlifyIdentity den echten Status kennt,
  //   wäre sonst kurz die Login-Box im HTML-Default-Zustand sichtbar)
  // - [data-identity-gate]: Login-Aufforderung, standardmäßig mit "hidden" im HTML
  // - [data-identity-name-gate]: Name-Abfrage nach dem allerersten Login, standardmäßig mit
  //   "hidden" im HTML
  // - [data-identity-name-input] / [data-identity-name-submit] / [data-identity-name-error]:
  //   Eingabefeld/Button/Fehlertext in der Name-Abfrage
  // - [data-identity-protected]: der eigentliche Seiteninhalt, standardmäßig mit "hidden"
  //   im HTML (verhindert ein kurzes Aufblitzen vor dem ersten JS-Check)
  // - [data-identity-status]: Container für Nutzername + Logout im Header, standardmäßig
  //   mit "hidden" im HTML
  // - [data-identity-user]: Textknoten für den angezeigten Namen
  // - [data-identity-login] / [data-identity-logout]: Buttons
  // - [data-identity-error]: Fehlertext, standardmäßig mit "hidden" im HTML
  //
  // Der beim ersten Login abgefragte Name landet in user_metadata.full_name (per
  // GoTrueUser.update()) und wird ab dann überall im Tool automatisch als Autor/Bearbeiter
  // verwendet (siehe window.getIdentityUserName() unten) - ersetzt die früheren
  // Team-Mitglieder-Dropdowns, die es ohne echtes Login brauchte.
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
  let pendingState = null; // 'loggedIn' | 'loggedOut' | 'needsName'
  let pendingUser = null;

  function getFullName(user) {
    return (user && user.user_metadata && user.user_metadata.full_name || '').trim();
  }

  function applyState() {
    if (!domReady || pendingState === null) return;

    const loading = document.querySelector('[data-identity-loading]');
    const gate = document.querySelector('[data-identity-gate]');
    const nameGate = document.querySelector('[data-identity-name-gate]');
    const protectedContent = document.querySelector('[data-identity-protected]');
    const statusEl = document.querySelector('[data-identity-status]');
    const userEl = document.querySelector('[data-identity-user]');

    const isLoggedIn = pendingState === 'loggedIn';
    const isNeedsName = pendingState === 'needsName';

    if (loading) loading.hidden = true;
    if (gate) gate.hidden = isLoggedIn || isNeedsName;
    if (nameGate) nameGate.hidden = !isNeedsName;
    if (protectedContent) protectedContent.hidden = !isLoggedIn;
    if (statusEl) statusEl.hidden = !(isLoggedIn || isNeedsName);
    if (userEl && pendingUser) {
      userEl.textContent = getFullName(pendingUser) || pendingUser.email;
    }
  }

  function setLoggedIn(user) {
    pendingUser = user;
    pendingState = getFullName(user) ? 'loggedIn' : 'needsName';
    applyState();
  }

  function setLoggedOut() {
    pendingState = 'loggedOut';
    pendingUser = null;
    applyState();
  }

  // Selbstheilung: gleicht den DOM-Zustand direkt gegen netlifyIdentity.currentUser() ab
  // (die eigentliche Quelle der Wahrheit, unabhängig von Event-Timing). Beobachtet: nach dem
  // Passwort-Setzen im Invite-Flow blieb das Gate manchmal sichtbar, obwohl der Login
  // serverseitig bereits erfolgreich war (erst ein manueller Reload zeigte den korrekten
  // Zustand) - der genaue Auslöser im Widget ist von außen nicht einsehbar, daher hier robust
  // dagegen absichern statt nur das eine Symptom zu patchen.
  function reconcile() {
    if (!window.netlifyIdentity) return;
    const user = netlifyIdentity.currentUser();
    if (user && pendingState === 'loggedOut') {
      setLoggedIn(user);
    } else if (!user && pendingState !== 'loggedOut') {
      setLoggedOut();
    }
  }

  function showError(message) {
    // Fehlertext sitzt in der Login-Box - die muss also sichtbar sein, sonst sieht niemand die
    // Meldung (z. B. wenn das Widget-Skript nie lädt und pendingState nie gesetzt wird).
    function apply() {
      const loading = document.querySelector('[data-identity-loading]');
      const gate = document.querySelector('[data-identity-gate]');
      const errorEl = document.querySelector('[data-identity-error]');
      if (loading) loading.hidden = true;
      if (gate) gate.hidden = false;
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
      // Zusätzliche verzögerte Gegenprüfung - falls das direkte setLoggedIn() oben aus
      // irgendeinem Grund nicht sichtbar ankam (siehe reconcile()-Kommentar).
      setTimeout(reconcile, 500);
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

  // Von anderen Skripten genutzt (post-erstellen-wizard.js, schedule-wizard.js,
  // post-erstellen.js), um Autor/Freigabe/Kommentar/Bearbeiter automatisch auf die
  // eingeloggte Person zu setzen, statt sie manuell auswählen zu lassen.
  window.getIdentityUserName = function () {
    if (!window.netlifyIdentity) return null;
    const user = netlifyIdentity.currentUser();
    if (!user) return null;
    return getFullName(user) || user.email;
  };

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

  function submitName() {
    const input = document.querySelector('[data-identity-name-input]');
    const errorEl = document.querySelector('[data-identity-name-error]');
    const submitBtn = document.querySelector('[data-identity-name-submit]');
    if (!input) return;

    const name = input.value.trim();
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    if (!name) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Bitte einen Namen eingeben.';
      }
      return;
    }
    if (name.length > 30) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Bitte max. 30 Zeichen.';
      }
      return;
    }

    const user = netlifyIdentity.currentUser();
    if (!user) return;

    if (submitBtn) submitBtn.disabled = true;
    user
      .update({ data: { full_name: name } })
      .then((updatedUser) => {
        setLoggedIn(updatedUser);
      })
      .catch((err) => {
        if (submitBtn) submitBtn.disabled = false;
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = `Name konnte nicht gespeichert werden: ${(err && err.message) || 'unbekannter Fehler'}.`;
        }
      });
  }

  function wireButtons() {
    const loginBtn = document.querySelector('[data-identity-login]');
    const logoutBtn = document.querySelector('[data-identity-logout]');
    const nameSubmitBtn = document.querySelector('[data-identity-name-submit]');
    const nameInput = document.querySelector('[data-identity-name-input]');

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
    if (nameSubmitBtn) {
      nameSubmitBtn.addEventListener('click', submitName);
    }
    if (nameInput) {
      nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') submitName();
      });
    }
  }

  function onDomReady() {
    domReady = true;
    applyState();
    wireButtons();
  }

  if (document.readyState !== 'loading') onDomReady();
  else document.addEventListener('DOMContentLoaded', onDomReady);

  // Zusätzliche Selbstheilungs-Trigger: sobald der Tab wieder aktiv wird, einmal mit dem
  // tatsächlichen Widget-Zustand abgleichen. Deckt genau das beobachtete "nur nach manuellem
  // Reload korrekt" ab, ohne dass Nutzer:innen selbst neu laden müssen.
  window.addEventListener('focus', reconcile);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reconcile();
  });
})();
