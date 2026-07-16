const siteNav = document.getElementById('site-nav');
const navPreview = document.getElementById('nav-preview');
const heroPreview = document.getElementById('hero-preview');

if (siteNav) {
  const updateNavFrost = () => {
    siteNav.classList.toggle('is-frosted', window.scrollY > 8);
  };

  updateNavFrost();
  window.addEventListener('scroll', updateNavFrost, { passive: true });
}

if (navPreview && heroPreview) {
  const showNavPreview = (show) => {
    if (show) {
      navPreview.hidden = false;
      requestAnimationFrame(() => navPreview.classList.add('is-visible'));
    } else {
      navPreview.classList.remove('is-visible');
      window.setTimeout(() => {
        if (!navPreview.classList.contains('is-visible')) {
          navPreview.hidden = true;
        }
      }, 200);
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // Show nav Preview only when hero CTA is out of view
        showNavPreview(!entry.isIntersecting);
      });
    },
    { root: null, threshold: 0, rootMargin: '-60px 0px 0px 0px' }
  );

  io.observe(heroPreview);
}
