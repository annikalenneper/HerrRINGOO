(function () {
  // Geteilter Kategorie-Store: von post-steps-shared.js (Post erstellen/bearbeiten) UND
  // ideensammlung.js/idea-dialog.js genutzt. Kategorien kommen jetzt live von
  // /.netlify/functions/categories-data statt aus einem hart codierten Array - neue, über die
  // Ideensammlung angelegte Kategorien sind dadurch sofort auch bei Posts wählbar.
  //
  // CATEGORIES wird bewusst NIE neu zugewiesen, nur mutiert (length=0 + push) - Module, die
  // die Array-Referenz früh destrukturieren (z. B. post-steps-shared.js beim Laden), sehen so
  // auch nachträglich befüllte Einträge, ohne selbst neu abfragen zu müssen. Eine Neuzuweisung
  // hier (CATEGORIES = [...]) würde solche Referenzen stumm von der echten Liste abkoppeln.
  const CATEGORIES = [];
  let loaded = false;
  let loadPromise = null;

  async function loadCategories() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const response = await fetch('/.netlify/functions/categories-data');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} (${data.details})` : data.error || `HTTP ${response.status}`);
      }
      CATEGORIES.length = 0;
      data.forEach((c) => CATEGORIES.push(c));
      loaded = true;
    })();
    return loadPromise;
  }

  function areCategoriesLoaded() {
    return loaded;
  }

  // Nach erfolgreichem create-kategorie-Aufruf: neue Kategorie sofort lokal ergänzen, ohne
  // erneut fetchen zu müssen.
  function addCategoryLocally(kategorie) {
    if (!CATEGORIES.some((c) => c.key === kategorie.key)) {
      CATEGORIES.push(kategorie);
    }
  }

  // Absicherung für Buttons, die einen Wizard/Dialog öffnen, der Kategorien sofort synchron
  // rendert (z. B. "+ Neuen Post erstellen", "Bearbeiten", "+ Neue Idee"). In der Praxis ist
  // der Fetch beim Laden des Skripts längst durch, bevor jemand klickt - das hier fängt nur den
  // seltenen Fall sehr schneller Klicks oder langsamen Netzwerks ab.
  async function ensureReady(button) {
    if (loaded) return true;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Lädt …';
    try {
      await loadCategories();
      return true;
    } catch (error) {
      console.error('Kategorien konnten nicht geladen werden:', error.message);
      return false;
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }

  loadCategories().catch((error) => {
    console.error('Kategorien konnten beim Laden nicht geholt werden:', error.message);
  });

  window.CategoriesStore = { CATEGORIES, loadCategories, areCategoriesLoaded, addCategoryLocally, ensureReady };
})();
