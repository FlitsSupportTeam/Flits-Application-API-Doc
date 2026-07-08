/**
 * TOC controller — mount, scroll, cleanup (single orchestration entry).
 */
import { setTocActive } from '../render/toc.js';
import { collectTocEntries, preparePageHeadings } from './tocCollector.js';
import { renderTocListHtml } from './tocRenderer.js';
import { findScrollTarget, scrollToTarget, getPageScroller } from './scrollEngine.js';
import { bindTocListEvents, unbindTocListEvents } from './tocEvents.js';
import {
  destroyTocScrollspy,
  initTocScrollspy,
  suppressScrollspy,
} from './tocScrollspy.js';

export function initToc(pageContainer, options = {}) {
  cleanupToc();

  const list = document.getElementById('toc-list');
  if (!list) return;

  preparePageHeadings(pageContainer);
  const entries = collectTocEntries(pageContainer);

  list.innerHTML = renderTocListHtml(entries);
  bindTocListEvents(list);

  if (!entries.length) return;

  const initialId =
    options.initialActiveId && entries.some((e) => e.id === options.initialActiveId)
      ? options.initialActiveId
      : entries[0].id;

  setTocActive(initialId);
  initTocScrollspy(entries, { initialActiveId: initialId });
}

export function cleanupToc() {
  destroyTocScrollspy();
  unbindTocListEvents();
}

export async function scrollToSection(sectionId, { smooth = true, updateHash = true } = {}) {
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
