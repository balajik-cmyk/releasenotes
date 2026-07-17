// Before/after video toggle. Operates on [data-compare-video] roots.
function setVideoSrc(video, src) {
  const url = String(src || '').trim();
  video.removeAttribute('src');
  video.innerHTML = '';
  if (!url) return;
  const mp4 = document.createElement('source');
  mp4.src = url;
  mp4.type = 'video/mp4';
  const qt = document.createElement('source');
  qt.src = url;
  qt.type = 'video/quicktime';
  video.append(mp4, qt);
}

function initCompareVideo(root) {
  const video = root.querySelector('[data-compare-player]');
  const badge = root.querySelector('[data-compare-badge]');
  const tabs = [...root.querySelectorAll('[data-compare-tab]')];
  if (!video || !tabs.length) return;

  let inView = false;
  const name = root.getAttribute('data-compare-name') || 'Comparison';

  function playSafe() {
    video.muted = true;
    return video.play().catch(() => {});
  }

  function setActive(btn) {
    const src = btn.getAttribute('data-src');
    const label = btn.getAttribute('data-label') || '';

    tabs.forEach((tab) => {
      const on = tab === btn;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.classList.toggle('bg-ink', on);
      tab.classList.toggle('text-white', on);
      tab.classList.toggle('text-muted', !on);
      tab.classList.toggle('hover:text-ink', !on);
    });

    if (badge) badge.textContent = label;
    video.setAttribute('aria-label', `${name} ${label.toLowerCase()}`);
    setVideoSrc(video, src);
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

export function initCompareVideos(root = document) {
  root.querySelectorAll('[data-compare-video]').forEach(initCompareVideo);
}
