/**
 * Right sidebar — "On this page" shell and active state styling.
 */

/** Return the TOC shell HTML string (used by devPanel.js to restore the TOC). */
export function tocShellHtml() {
  return `
    <aside class="toc-aside" aria-label="On this page">
      <div class="toc-aside__sticky">
        <nav class="toc" id="toc-nav">
          <button type="button" class="toc__label" data-toc-collapse aria-expanded="true" aria-controls="toc-list">
            <span>On this page</span>
            <svg class="toc__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <ul class="toc__list" id="toc-list" role="list"></ul>
        </nav>
      </div>
    </aside>
  `;
}

export function renderTocShell(container) {
  container.innerHTML = tocShellHtml();
}

function tocLinkSectionId(link) {
  const href = link.getAttribute('href');
  if (href?.startsWith('#')) return href.slice(1);
  return link.getAttribute('data-toc-link');
}

export function setTocActive(anchorId) {
  document.querySelectorAll('.toc__link').forEach((link) => {
    const active = tocLinkSectionId(link) === anchorId;
    link.classList.toggle('is-active', active);
    if (active) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}
