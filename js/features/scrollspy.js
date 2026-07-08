/**
 * Scroll progress within the current page scroll container.
 */
export function initScrollspy() {
  const scrollRoot = document.getElementById('page-scroll');
  if (!scrollRoot) return;

  const update = () => updateScrollProgress(scrollRoot);
  scrollRoot.addEventListener('scroll', update, { passive: true });
  update();
}

function updateScrollProgress(scrollRoot) {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollRoot;
  const height = scrollHeight - clientHeight;
  const pct = height > 0 ? (scrollTop / height) * 100 : 0;
  bar.style.width = `${pct}%`;
}

export function refreshScrollspy() {
  initScrollspy();
}

/** @deprecated — route navigation replaces document scrollspy */
export function markUserScrolling() {}
