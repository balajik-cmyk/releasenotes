// Quiet scroll-in reveals for [data-reveal] elements.
export function initReveal(root = document) {
  const reducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';

    if (reducesMotion) {
      el.classList.add('is-in');
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    io.observe(el);
  });
}
