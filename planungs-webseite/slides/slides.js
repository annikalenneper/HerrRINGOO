// Vorschau-Steuerung, automatischer optischer Ausgleich, Überlauf-Prüfung und Render-Modus.
//   ?slide=N  -> zeigt nur Folie N in Originalgröße (1080 × 1350), ohne Toolbar (JPG-Export)
//   ?check=1  -> schreibt das Prüfergebnis in <body data-check="ok|overflow:..."> (für render-slides.ps1)
(function () {
  const params = new URLSearchParams(location.search);

  // 1) Optischer Ausgleich um "oder": Komma/Unterlänge in der Zeile darüber, Akzent/Umlaut in der
  //    Zeile darunter ragen über Versalhöhe bzw. Grundlinie hinaus -> Abstand entsprechend vergrößern.
  //    (Texte stehen in Versalien, daher zählen nur Zeichen, die auch in Versalien überstehen.)
  const DESCENDER = /[,;Q]/;
  const ACCENT = /[ÄÖÜÉÈÊÁÀÂÓÒÔÚÙÛÍÌÎ]/;
  document.querySelectorAll('.p-oder').forEach(el => {
    const prev = el.previousElementSibling, next = el.nextElementSibling;
    if (prev && DESCENDER.test(prev.textContent.toUpperCase())) el.classList.add('after-comma');
    if (next && ACCENT.test(next.textContent.toUpperCase())) el.classList.add('before-accent');
  });

  // 2) Überlauf-Prüfung: Inhalt muss vollständig im sicheren Bereich liegen.
  function check() {
    const problems = [];
    document.querySelectorAll('.slide').forEach((slide, i) => {
      const content = slide.querySelector('.content');
      // Kinder-Positionen sind relativ zu .content (position: absolute = offsetParent)
      const top = parseFloat(getComputedStyle(content).paddingTop);
      const bottom = content.clientHeight;
      let minY = Infinity, maxY = -Infinity;
      [...content.children].forEach(c => {
        minY = Math.min(minY, c.offsetTop);
        maxY = Math.max(maxY, c.offsetTop + c.offsetHeight);
      });
      const over = minY < top - 1 || maxY > bottom + 1 || content.scrollHeight > content.clientHeight + 1;
      slide.dataset.overflow = over ? '1' : '0';
      if (over) problems.push(i + 1);
    });
    document.body.dataset.check = problems.length ? 'overflow:' + problems.join(',') : 'ok';
    if (problems.length) console.warn('Folie(n) ragen aus dem sicheren Bereich:', problems.join(', '));
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(check);

  // 3) Render-Modus
  const n = parseInt(params.get('slide'), 10);
  if (n > 0) {
    document.documentElement.classList.add('render');
    const frames = document.querySelectorAll('.frame');
    if (frames[n - 1]) frames[n - 1].classList.add('active');
    return;
  }

  // 4) Vorschau-Steuerung
  const scale = document.getElementById('scale');
  const safe = document.getElementById('safe');
  if (scale) scale.addEventListener('change', e => document.documentElement.style.setProperty('--scale', e.target.value));
  if (safe) safe.addEventListener('change', e => document.body.classList.toggle('show-safe', e.target.checked));
})();
