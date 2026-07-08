/**
 * Active TOC item — listens on #page-scroll only.
 */
import { setTocActive } from '../render/toc.js';
import {
  SCROLL_BOTTOM_MIN,
  SCROLL_BOTTOM_PAD,
  SCROLL_TOP_PAD,
  TRIGGER_PAD,
} from './constants.js';
import { getScrollOffset, getPageScroller } from './scrollEngine.js';

let scrollSpyCleanup = null;
let suppressSpyUntil = 0;

export function suppressScrollspy(ms) {
  suppressSpyUntil = Date.now() + ms;
}

export function destroyTocScrollspy() {
  if (scrollSpyCleanup) {
    scrollSpyCleanup();
    scrollSpyCleanup = null;
  }
}

export function resolveActiveSectionId(entries, scroller, offset = getScrollOffset()) {
  if (!entries.length || !scroller) return null;

  const scrollTop = scroller.scrollTop;
  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  const scrollerTop = scroller.getBoundingClientRect().top;

  if (scrollTop <= SCROLL_TOP_PAD) {
    return entries[0].id;
  }

  if (maxScroll > SCROLL_BOTTOM_MIN && scrollTop >= maxScroll - SCROLL_BOTTOM_PAD) {
    return entries[entries.length - 1].id;
  }

  const triggerY = offset + TRIGGER_PAD;
  let activeId = entries[0].id;

  for (const entry of entries) {
    const el = entry.el;
    if (!el?.isConnected) continue;
    const top = el.getBoundingClientRect().top - scrollerTop;
    if (top <= triggerY) {
      activeId = entry.id;
    } else {
      break;
    }
  }

  return activeId;
}

export function initTocScrollspy(entries, { initialActiveId } = {}) {
  destroyTocScrollspy();

  const scroller = getPageScroller();
  if (!scroller || !entries.length) return;

  const offset = getScrollOffset();
  let ticking = false;

  const updateActive = () => {
    if (Date.now() < suppressSpyUntil) return;
    const activeId = resolveActiveSectionId(entries, scroller, offset);
    if (activeId) setTocActive(activeId);
  };

  const scheduleUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActive();
      ticking = false;
    });
  };

  scroller.addEventListener('scroll', scheduleUpdate, { passive: true });

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
  if (resizeObserver) {
    resizeObserver.observe(scroller);
    const content = document.getElementById('content-root');
    if (content) resizeObserver.observe(content);
  }

  scrollSpyCleanup = () => {
    scroller.removeEventListener('scroll', scheduleUpdate);
    resizeObserver?.disconnect();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (scroller.scrollTop <= SCROLL_TOP_PAD && initialActiveId) {
        setTocActive(initialActiveId);
      } else {
        updateActive();
      }
    });
  });
}
