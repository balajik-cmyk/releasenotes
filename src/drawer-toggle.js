const root = document.getElementById('drawer-toggle');
const video = document.getElementById('drawer-video');
const badge = document.getElementById('drawer-video-badge');
if (root && video) {
  const tabs = [...root.querySelectorAll('.drawer-tab')];
  let inView = false;

  function playSafe() {
    video.muted = true;
    return video.play().catch(() => {});
  }

  function setActive(btn) {
    const src = btn.getAttribute('data-drawer-src');
    const label = btn.getAttribute('data-drawer-label') || '';

    tabs.forEach((tab) => {
      const on = tab === btn;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.classList.toggle('bg-ink', on);
      tab.classList.toggle('text-white', on);
      tab.classList.toggle('text-muted', !on);
      tab.classList.toggle('hover:text-ink', !on);
    });

    if (badge) badge.textContent = label;
    video.setAttribute('aria-label', `Drawer ${label.toLowerCase()}`);
    video.querySelectorAll('source').forEach((s) => s.setAttribute('src', src));
    video.load();
    if (inView) {
      video.addEventListener('loadeddata', () => playSafe(), { once: true });
      playSafe();
    }
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setActive(tab)));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if (inView) playSafe();
        else video.pause();
      });
    },
    { threshold: [0, 0.35, 0.6] }
  );
  io.observe(video);
}
