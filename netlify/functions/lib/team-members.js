// Feste Team-Liste, serverseitig durchgesetzt für Autor (create-post.js), Freigabe
// (schedule-post.js) und Kommentare (comment-post.js). Für Autor/Freigabe zusätzlich Grundlage
// des Vier-Augen-Prinzips (die beiden Namen dürfen nicht identisch sein - "Extern" ist dabei
// keine Ausnahme, siehe Kommentar dort). Frontend-Pendant fürs Dropdown:
// planungs-webseite/js/team-members.js (kein Node-Modul, daher eigene Kopie dort - synchron
// halten).
const TEAM_MEMBERS = ['Petra', 'Helmut', 'Anni', 'Lui', 'Extern'];

module.exports = { TEAM_MEMBERS };
