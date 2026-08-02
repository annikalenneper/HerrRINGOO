// Feste Team-Liste, serverseitig durchgesetzt für Autor (create-post.js) und Freigabe
// (schedule-post.js) - Grundlage des Vier-Augen-Prinzips (die beiden Namen dürfen nicht
// identisch sein). Frontend-Pendant fürs Dropdown: planungs-webseite/js/team-members.js
// (kein Node-Modul, daher eigene Kopie dort - synchron halten).
const TEAM_MEMBERS = ['Petra', 'Helmut', 'Anni', 'Lui'];

module.exports = { TEAM_MEMBERS };
