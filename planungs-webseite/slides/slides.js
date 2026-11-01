// Vorschau-Steuerung + Render-Modus für den JPG-Export.
// ?slide=N  -> zeigt nur Folie N in Originalgröße (1080 × 1350), ohne Toolbar.
(function () {
  const params = new URLSearchParams(location.search);
  const n = parseInt(params.get('slide'), 10);
  if (n > 0) {
    document.documentElement.classList.add('render');
    const frames = document.querySelectorAll('.frame');
    if (frames[n - 1]) frames[n - 1].classList.add('active');
    return;
  }
  const scale = document.getElementById('scale');
  const safe = document.getElementById('safe');
  if (scale) scale.addEventListener('change', e => document.documentElement.style.setProperty('--scale', e.target.value));
  if (safe) safe.addEventListener('change', e => document.body.classList.toggle('show-safe', e.target.checked));
})();
