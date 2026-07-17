// Before/after comparison slider. Works on any [data-compare-slider] element
// rendered dynamically. Structure expected inside the root:
//   [data-before-clip] > [data-before-inner]   (clipped "before" layer)
//   [data-divider]                             (vertical divider line)
//   [data-handle][role=slider]                 (draggable handle)
function wireSlider(root) {
  const clip = root.querySelector('[data-before-clip]');
  const inner = root.querySelector('[data-before-inner]');
  const divider = root.querySelector('[data-divider]');
  const handle = root.querySelector('[data-handle]');
  if (!clip || !inner || !divider || !handle) return;

  let p = Number(root.dataset.start) || 50;

  function set(v) {
    p = Math.max(0, Math.min(100, v));
    const px = (p / 100) * root.offsetWidth;
    clip.style.height = '100%';
    clip.style.width = px + 'px';
    inner.style.height = '100%';
    inner.style.width = root.offsetWidth + 'px';
    divider.style.top = '0';
    divider.style.bottom = '0';
    divider.style.left = px + 'px';
    divider.style.width = '2px';
    divider.style.height = '100%';
    divider.style.transform = 'translateX(-50%)';
    handle.style.top = '50%';
    handle.style.left = px + 'px';
    handle.style.transform = 'translate(-50%, -50%)';
    handle.setAttribute('aria-valuenow', String(Math.round(p)));
  }

  set(p);

  root.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    root.setPointerCapture(e.pointerId);
    move(e);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
  });
  function onMove(e) {
    move(e);
  }
  function onUp() {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
  }
  function move(e) {
    const r = root.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  }

  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      set(p - 2);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      set(p + 2);
      e.preventDefault();
    }
  });

  window.addEventListener('resize', () => set(p));
}

export function initSliders(root = document) {
  root.querySelectorAll('[data-compare-slider]').forEach(wireSlider);
}
