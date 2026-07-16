function initSlider(sid, bid, biid, did, gid, startPct, orientation) {
  const sl = document.getElementById(sid);
  const be = document.getElementById(bid);
  const bi = document.getElementById(biid);
  const dv = document.getElementById(did);
  const gr = document.getElementById(gid);
  if (!sl || !be || !bi || !dv || !gr) return;

  const vertical = orientation === 'vertical' || sl.dataset.orientation === 'vertical';
  let p = startPct || 50;

  function set(v) {
    p = Math.max(0, Math.min(100, v));
    if (vertical) {
      const py = (p / 100) * sl.offsetHeight;
      be.style.width = '100%';
      be.style.height = py + 'px';
      bi.style.width = '100%';
      bi.style.height = sl.offsetHeight + 'px';
      dv.style.left = '0';
      dv.style.right = '0';
      dv.style.top = py + 'px';
      dv.style.width = '100%';
      dv.style.height = '2px';
      dv.style.transform = 'translateY(-50%)';
      gr.style.left = '50%';
      gr.style.top = py + 'px';
      gr.style.transform = 'translate(-50%, -50%)';
    } else {
      const px = (p / 100) * sl.offsetWidth;
      be.style.height = '100%';
      be.style.width = px + 'px';
      bi.style.height = '100%';
      bi.style.width = sl.offsetWidth + 'px';
      dv.style.top = '0';
      dv.style.bottom = '0';
      dv.style.left = px + 'px';
      dv.style.width = '2px';
      dv.style.height = '100%';
      dv.style.transform = 'translateX(-50%)';
      gr.style.top = '50%';
      gr.style.left = px + 'px';
      gr.style.transform = 'translate(-50%, -50%)';
    }
    gr.setAttribute('aria-valuenow', Math.round(p));
  }

  set(p);

  sl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sl.setPointerCapture(e.pointerId);
    move(e);
    sl.addEventListener('pointermove', onMove);
    sl.addEventListener('pointerup', onUp);
  });
  function onMove(e) { move(e); }
  function onUp() {
    sl.removeEventListener('pointermove', onMove);
    sl.removeEventListener('pointerup', onUp);
  }
  function move(e) {
    const r = sl.getBoundingClientRect();
    if (vertical) {
      set(((e.clientY - r.top) / r.height) * 100);
    } else {
      set(((e.clientX - r.left) / r.width) * 100);
    }
  }

  gr.addEventListener('keydown', (e) => {
    if (vertical) {
      if (e.key === 'ArrowUp') { set(p - 2); e.preventDefault(); }
      if (e.key === 'ArrowDown') { set(p + 2); e.preventDefault(); }
    } else {
      if (e.key === 'ArrowLeft') { set(p - 2); e.preventDefault(); }
      if (e.key === 'ArrowRight') { set(p + 2); e.preventDefault(); }
    }
  });

  window.addEventListener('resize', () => set(p));
}

initSlider('s5', 'b5', 'bi5', 'd5', 'g5', 50);
