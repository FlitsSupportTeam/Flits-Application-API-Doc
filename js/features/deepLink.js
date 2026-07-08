/**
 * Deep linking — delegates to route-based navigation.
 */
import { navigateToRoute, parseHash, scrollToAnchor } from './router.js';
import { copyToClipboard, showCopyFeedback } from '../utils/clipboard.js';

export function initDeepLink() {
  document.addEventListener('click', (e) => {
    const copyLink = e.target.closest('[data-copy-link]');
    if (!copyLink) return;

    e.preventDefault();
    const slug = copyLink.getAttribute('data-copy-link') || currentRouteFromHash();
    const url = `${location.origin}${location.pathname}#${slug}`;
    copyToClipboard(url)
      .then(() => showCopyFeedback(copyLink, 'Link copied!'))
      .catch((err) => console.warn('[FlitsDoc] Copy link failed:', err));
  });

  const { slug, anchor } = parseHash();
  navigateToRoute(slug, { anchor, updateHash: false, animate: false });
}

function currentRouteFromHash() {
  return parseHash().slug;
}

export function navigateTo(slug, options = {}) {
  navigateToRoute(slug, {
    anchor: options.anchor,
    animate: options.scroll !== false,
    updateHash: true,
  });
}

export function getScrollOffset() {
  const topbar = document.querySelector('.topbar');
  return (topbar?.offsetHeight || 64) + 16;
}
