(function () {
  // Feste Team-Liste für die Autor- (post-erstellen-wizard.js), Freigabe- (schedule-wizard.js)
  // und Kommentar-Auswahl (post-erstellen.js): fürs Vier-Augen-Prinzip müssen Autor und
  // Freigabe eindeutig unterscheidbare Personen sein. "Extern" deckt Content/Feedback von
  // außerhalb des Kernteams ab. Serverseitig gespiegelt in
  // netlify/functions/lib/team-members.js (dort die tatsächlich erzwungene Quelle der Wahrheit;
  // hier nur fürs Dropdown - beide synchron halten).
  window.TeamMembers = ['Petra', 'Helmut', 'Anni', 'Lui', 'Extern'];
})();
