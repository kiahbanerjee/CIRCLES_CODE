/* ---------- spin ----------
   Grab anywhere on the page and drag around the middle to turn the ring.
   It keeps turning a little after you let go, slowing down like a real wheel.
   The angle goes into --spin on the ring; the photos and captions turn back by the same amount (style.css). */

(() => {
  const ring = document.querySelector('.ring');
  const FRICTION = 0.95;        // how quickly it slows down after you let go (closer to 1 = spins longer)

  let spin = 0;                 // current turn of the ring, in degrees
  let last = null;              // pointer angle on the previous move, or null when not dragging
  let lastTime = 0;
  let velocity = 0;             // degrees per frame
  let moved = 0;                // how far this drag turned, to tell a drag from a click
  let frame = 0;

  // angle of the pointer around the middle of the ring
  function angleOf(e) {
    const r = ring.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }

  function turnTo(deg) {
    spin = deg;
    ring.style.setProperty('--spin', spin + 'deg');
  }

  function glide() {
    if (Math.abs(velocity) < 0.02) return;
    turnTo(spin + velocity);
    velocity *= FRICTION;
    frame = requestAnimationFrame(glide);
  }

  addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(frame);
    last = angleOf(e);
    lastTime = e.timeStamp;
    velocity = 0;
    moved = 0;
    document.documentElement.classList.add('spinning');
  });

  addEventListener('pointermove', (e) => {
    if (last === null) return;
    const angle = angleOf(e);
    let delta = angle - last;
    if (delta > 180) delta -= 360;      // crossing the left side, where the angle wraps around
    if (delta < -180) delta += 360;
    last = angle;
    moved += Math.abs(delta);
    velocity = (delta / Math.max(e.timeStamp - lastTime, 1)) * 16;
    lastTime = e.timeStamp;
    turnTo(spin + delta);
  });

  function release(e) {
    if (last === null) return;
    last = null;
    document.documentElement.classList.remove('spinning');
    if (e.timeStamp - lastTime > 80) velocity = 0;   // held still before letting go: no throw
    glide();
  }

  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  // a drag shouldn't open (or close) a photo when you let go over it
  addEventListener('click', (e) => {
    if (moved > 2) {
      e.preventDefault();
      e.stopPropagation();
    }
    moved = 0;
  }, true);

  // stop the browser from dragging the links themselves
  addEventListener('dragstart', (e) => e.preventDefault());
})();

/* ---------- text / read more ----------
   Normally the right-hand link is THE TEXT and goes to the text page.
   While a photo is open it becomes READ MORE and goes straight to the text about that photo
   (the figures on readmore.html share the photos' ids: #f01, #f02…). */

(() => {
  const link = document.querySelector('.nav .text-link');

  function update() {
    const open = document.querySelector('.slice:target');
    link.textContent = open ? 'Read More' : 'The Text';
    link.href = open ? 'readmore.html#' + open.id : 'readmore.html';
  }

  addEventListener('hashchange', update);
  update();
})();
