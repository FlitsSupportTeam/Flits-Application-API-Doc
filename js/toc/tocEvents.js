/**
 * TOC click handling — buttons only (no anchor/hash navigation side effects).
 */
import { setTocActive } from '../render/toc.js';
import { findScrollTarget, scrollToTarget, getPageScroller } from './scrollEngine.js';
import { suppressScrollspy } from './tocScrollspy.js';

let listCleanup = null;

async function activateTocSection(sectionId, { smooth = true, updateHash = true } = {}) {
  const target = findScrollTarget(sectionId);
  if (!target) {
    console.warn('[FlitsDoc TOC] Section not found:', sectionId);
    return false;
  }
  if (!getPageScroller()) {
    console.warn('[FlitsDoc TOC] Scroll container #page-scroll not found');
    return false;
  }

  suppressScrollspy(smooth ? 1000 : 200);
  const ok = await scrollToTarget(target, { smooth, updateHash, sectionId });
  if (ok) setTocActive(sectionId);
  return ok;
}

export function bindTocListEvents(listEl) {
  unbindTocListEvents();
  if (!listEl) return;

  const onClick = (e) => {
    const control = e.target.closest('[data-toc-link]');
    if (!control || !listEl.contains(control)) return;
    e.preventDefault();
    e.stopPropagation();
    const sectionId = control.getAttribute('data-toc-link');
    if (sectionId) activateTocSection(sectionId);
  };

  const onKeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const control = e.target.closest('[data-toc-link]');
    if (!control || !listEl.contains(control)) return;
    e.preventDefault();
    const sectionId = control.getAttribute('data-toc-link');
    if (sectionId) activateTocSection(sectionId);
  };

  listEl.addEventListener('click', onClick);
  listEl.addEventListener('keydown', onKeydown);

  listCleanup = () => {
    listEl.removeEventListener('click', onClick);
    listEl.removeEventListener('keydown', onKeydown);
  };
}

export function unbindTocListEvents() {
  if (listCleanup) {
    listCleanup();
    listCleanup = null;
  }
}
