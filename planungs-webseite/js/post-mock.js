(function () {
  // Baut die Instagram-Mock-Karte aus fertigen Bild-URLs + Caption. Wird für bestehende Posts
  // (Bilder liegen statisch unter planungs-webseite/medien/, siehe post-erstellen.js) und die
  // Abschluss-Vorschau im "Post erstellen"-Wizard (Bilder kommen direkt von Google Drive, siehe
  // post-erstellen-wizard.js) gleichermaßen verwendet – daher bekommt die Funktion fertige URLs
  // statt interner Repo-Pfade. Bei mehreren Bildern wird ein wischbares Karussell gebaut, das
  // Instagrams Mehrfachbild-Posts nachahmt (horizontales Scroll-Snapping + Punkte/Pfeile).
  function buildMock({ imageUrl, imageAlt, caption, images }) {
    const mock = document.createElement('article');
    mock.className = 'ig-mock';

    const header = document.createElement('div');
    header.className = 'ig-mock-header';
    header.innerHTML = '<span class="ig-mock-avatar" aria-hidden="true"><img src="medien/logos/logo-schwarz-gold.png" alt=""></span><span class="ig-mock-username">herr.ringoo</span>';
    mock.appendChild(header);

    const slides = images && images.length ? images : (imageUrl ? [{ url: imageUrl, alt: imageAlt }] : []);

    if (slides.length === 1) {
      const media = document.createElement('div');
      media.className = 'ig-mock-media';
      const img = document.createElement('img');
      img.src = slides[0].url;
      img.alt = slides[0].alt || '';
      img.loading = 'lazy';
      media.appendChild(img);
      mock.appendChild(media);
    } else if (slides.length > 1) {
      mock.appendChild(buildCarousel(slides));
    }

    const actions = document.createElement('div');
    actions.className = 'ig-mock-actions';
    actions.setAttribute('aria-hidden', 'true');
    actions.innerHTML = '<span>&#9825;</span><span>&#128172;</span><span>&#10148;</span><span class="ig-mock-save">&#128278;</span>';
    mock.appendChild(actions);

    const captionEl = document.createElement('p');
    captionEl.className = 'ig-mock-caption';
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'ig-mock-username';
    usernameSpan.textContent = 'herr.ringoo';
    captionEl.appendChild(usernameSpan);
    captionEl.appendChild(document.createTextNode(' ' + (caption || '')));
    mock.appendChild(captionEl);

    return mock;
  }

  function buildCarousel(slides) {
    const wrap = document.createElement('div');
    wrap.className = 'ig-mock-media ig-mock-carousel';

    const track = document.createElement('div');
    track.className = 'ig-mock-carousel-track';
    slides.forEach((slide) => {
      const img = document.createElement('img');
      img.className = 'ig-mock-carousel-slide';
      img.src = slide.url;
      img.alt = slide.alt || '';
      img.loading = 'lazy';
      track.appendChild(img);
    });
    wrap.appendChild(track);

    const counter = document.createElement('span');
    counter.className = 'ig-mock-carousel-counter';
    wrap.appendChild(counter);

    const dots = document.createElement('div');
    dots.className = 'ig-mock-carousel-dots';
    const dotEls = slides.map((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'ig-mock-carousel-dot';
      dots.appendChild(dot);
      return dot;
    });
    wrap.appendChild(dots);

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'ig-mock-carousel-arrow ig-mock-carousel-arrow--prev';
    prevBtn.setAttribute('aria-label', 'Vorheriges Bild');
    prevBtn.innerHTML = '&#8249;';
    wrap.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'ig-mock-carousel-arrow ig-mock-carousel-arrow--next';
    nextBtn.setAttribute('aria-label', 'Nächstes Bild');
    nextBtn.innerHTML = '&#8250;';
    wrap.appendChild(nextBtn);

    function activeIndex() {
      if (!track.clientWidth) return 0;
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    function goTo(index) {
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' });
    }

    function updateActive() {
      const idx = Math.max(0, Math.min(slides.length - 1, activeIndex()));
      dotEls.forEach((dot, i) => dot.classList.toggle('is-active', i === idx));
      counter.textContent = `${idx + 1}/${slides.length}`;
      prevBtn.classList.toggle('is-hidden', idx === 0);
      nextBtn.classList.toggle('is-hidden', idx === slides.length - 1);
    }

    prevBtn.addEventListener('click', () => goTo(activeIndex() - 1));
    nextBtn.addEventListener('click', () => goTo(activeIndex() + 1));

    let scrollTimeout;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActive, 60);
    });

    updateActive();

    return wrap;
  }

  window.PostShared = { buildMock };
})();
