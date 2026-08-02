(function () {
  // Feste Team-Liste für die Autor- (post-erstellen-wizard.js) und Freigabe-Auswahl
  // (schedule-wizard.js): fürs Vier-Augen-Prinzip muss jede Person eindeutig einer von genau
  // diesen sein. Serverseitig gespiegelt in netlify/functions/lib/team-members.js (dort die
  // tatsächlich erzwungene Quelle der Wahrheit; hier nur fürs Dropdown - beide synchron halten).
  window.TeamMembers = ['Petra', 'Helmut', 'Anni', 'Lui'];
})();
