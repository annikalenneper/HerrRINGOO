// Kürzel + Label aus kategorien/README.md, hier als Konstante gepflegt (analog zu
// drive-folders.js) - bei Änderungen an kategorien/README.md hier und im Frontend
// (planungs-webseite/js/post-form.js) nachziehen.
const CATEGORIES = [
  { key: 'werkstatt', label: 'Werkstatt & Prozess' },
  { key: 'unterwegs', label: 'Unterwegs / Standorte' },
  { key: 'kundengeschichten', label: 'Kundengeschichten' },
  { key: 'produkt', label: 'Ring im Detail' },
  { key: 'team', label: 'Team & Menschen dahinter' },
  { key: 'wissen', label: 'Trauring-Wissen' },
  { key: 'community', label: 'Community & Interaktion' },
  { key: 'termine', label: 'Termine & Aktionen' },
  { key: 'zitatkachel', label: 'Zitatkachel' },
  { key: 'ladengeschaeft', label: 'Ladengeschäft (stationär)' },
  { key: 'hitlists', label: 'Listen & Trends' },
  { key: 'warum', label: 'Textkacheln mit Gründen für' },
  { key: 'regionen', label: 'Regionen & Standorte' },
  { key: 'pakete', label: 'Pakete & Angebote' },
];

module.exports = { CATEGORIES };
