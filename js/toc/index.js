/**
 * TOC public API — re-exports from rightTOC (the authoritative implementation).
 * Kept so legacy imports via tocManager.js continue to work.
 */
export {
  buildRightTOC,
  buildRightTOC as mountToc,
  buildRightTOC as initToc,
  bindTOCEvents,
  scrollToSection,
  initScrollSpy,
  cleanupTOC,
  cleanupTOC as cleanupToc,
  cleanupTOC as destroyTocScrollspy,  // legacy alias
} from './rightTOC.js';

// Kept from old scrollEngine — used by legacy consumers
export function getPageScroller() {
  return document.getElementById('page-scroll');
}

export function getScrollOffset() {
  const bar = document.querySelector('.topbar');
  return (bar?.offsetHeight || 60) + 24;
}

export function scrollScrollerToTop() {
  const s = document.getElementById('page-scroll');
  if (s) s.scrollTop = 0;
}

// Kept from old tocCollector — re-export so tocManager.js doesn't break
export {
  collectTocEntries,
  preparePageHeadings,
} from './tocCollector.js';

// Kept from old tocScrollspy — re-export so tocManager.js doesn't break
export { resolveActiveSectionId } from './tocScrollspy.js';

// No-op stubs for fully-removed helpers
export function initTocGlobalListeners() {}
export function bindTocListeners() {}
export function resolveScrollRoot() { return document.getElementById('page-scroll'); }
