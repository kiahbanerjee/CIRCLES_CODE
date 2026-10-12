/* ---------- the carved circle ----------
   Like the book's spine: an invisible circle sits fixed in the middle of the screen,
   centered on the line between the white and black halves, and the text on both sides wraps around it.
   Every text block gets two floats at its start (the CSS "float tower" trick):
   a zero-width gap that pushes the circle down to the right spot, then the circle itself (shape-outside). */

(() => {
  const SIZE = 0.36;          // circle radius, as a fraction of the screen height (same proportion as the book)
  const PHONE = 700;          // matches the phone breakpoint in readmore.css: no circle when the sides stack

  const sides = [...document.querySelectorAll('.side')].map((section) => {
    const inner = section.querySelector('.inner');
    const blocks = [...inner.querySelectorAll('h1, h2, h3, p, blockquote')]
      .filter((el) => !el.closest('figure'))
      .map((el) => {
        const gap = document.createElement('span');
        const circle = document.createElement('span');
        const end = document.createElement('span');   // marks where the text ends, ignoring the floats
        gap.className = 'carve-gap';
        circle.className = 'carve-circle';
        end.className = 'carve-end';
        el.classList.add('carve');
        el.prepend(gap, circle);
        el.append(end);
        return { el, gap, circle, end, on: false };
      });

    return {
      section,
      inner,
      blocks,
      headings: [...inner.querySelectorAll('h2')],
      figures: [...inner.querySelectorAll('figure')],
      textLeftOfSeam: section.classList.contains('functional'),
      // wrapping makes the text longer; this negative margin takes the extra back out,
      // so the page height (and the black side's reverse scroll) stays put
      last: inner.lastElementChild.lastElementChild,
      shift: 0,
      base: 0,
    };
  });

  function off(b) {
    if (!b.on) return;
    b.gap.style.display = b.circle.style.display = '';
    b.on = false;
  }

  function setShift(side, px) {
    side.shift = px;
    side.last.style.marginBottom = px ? px + 'px' : '';
  }

  function reset() {
    for (const side of sides) {
      side.blocks.forEach(off);
      setShift(side, 0);
    }
  }

  function measure() {
    reset();
    for (const side of sides) side.base = side.inner.offsetHeight;
  }

  function carve() {
    if (innerWidth <= PHONE) return reset();

    const cy = innerHeight / 2;
    const R = innerHeight * SIZE;
    const seam = sides[0].section.getBoundingClientRect().right;

    // a carved line pushes the text below it down, so settle it over a few passes
    for (let pass = 0; pass < 3; pass++) {
      // read everything first, then write, so the browser only lays out once per pass
      const reads = sides.map((side) =>
        side.blocks.map((b) => ({ box: b.el.getBoundingClientRect(), end: b.end.getBoundingClientRect().bottom }))
      );

      sides.forEach((side, s) => {
        side.blocks.forEach((b, i) => {
          const { box, end } = reads[s][i];
          const top = Math.max(box.top, cy - R);
          const bottom = Math.min(end, cy + R);
          const away = side.textLeftOfSeam ? seam - box.right : box.left - seam;
          const width = R - away;
          if (bottom <= top || width <= 0) return off(b);

          const x = side.textLeftOfSeam ? width + away : -away;
          b.gap.style.display = b.circle.style.display = 'block';
          b.gap.style.height = top - box.top + 'px';
          b.circle.style.width = width + 'px';
          b.circle.style.height = bottom - top + 'px';
          b.circle.style.shapeOutside = `circle(${R}px at ${x}px ${cy - top}px)`;
          b.on = true;
        });
      });

      for (const side of sides) {
        const natural = side.inner.offsetHeight - side.shift;
        setShift(side, Math.min(0, side.base - natural));
      }
    }
  }

  // show the chapter that's currently in the middle of the screen on each side
  const labels = [...document.querySelectorAll('.chapters .chapter')];

  function label() {
    const cy = innerHeight / 2;
    sides.forEach((side, i) => {
      let name = '';
      for (const h of side.headings) if (h.getBoundingClientRect().top <= cy) name = h.textContent;
      if (labels[i].textContent !== name) labels[i].textContent = name;

      // fade the name out while a photo passes behind it
      const l = labels[i].getBoundingClientRect();
      const onPhoto = side.figures.some((f) => {
        const r = f.getBoundingClientRect();
        return r.top < l.bottom && r.bottom > l.top && r.left < l.right && r.right > l.left;
      });
      labels[i].classList.toggle('hidden', onPhoto);
    });
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      carve();
      label();
    });
  }

  function start() {
    measure();
    carve();
    label();
  }

  // arriving from a photo on the Image Index (readmore.html#f12): scroll to the article it belongs to.
  // the black side moves backwards with the page scroll, so a normal anchor jump can't reach it;
  // work out which scroll position brings the article to the top instead
  function goToPhoto() {
    const fig = location.hash && document.getElementById(location.hash.slice(1));
    if (!fig) return;
    const target = fig.closest('article') || fig;
    const side = sides.find((sd) => sd.section.contains(target));
    const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) || 60;

    if (getComputedStyle(side.section).position !== 'sticky') {
      scrollTo(0, target.getBoundingClientRect().top + scrollY - edge);
      return;
    }
    // black side: its top sits at (screen height - its height) × (1 - scroll / max scroll)
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const offset = target.getBoundingClientRect().top - side.inner.getBoundingClientRect().top;
    scrollTo(0, max * (1 - (edge - offset) / (vh - side.inner.offsetHeight)));
  }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(start));
  document.fonts.ready.then(() => {
    start();
    goToPhoto();
  });
  start();
})();
