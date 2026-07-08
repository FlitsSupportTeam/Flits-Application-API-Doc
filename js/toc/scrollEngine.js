/**
 * Scroll engine — #page-scroll is the only vertical scroll container in this layout.
 */
import { currentRoute } from '../state/routeState.js';
import { SCROLL_EXTRA } from './constants.js';

export const PAGE_SCROLL_SELECTOR = '#page-scroll';

let smoothScrollRaf = null;

export function getPageScroller() {
  return document.querySelector(PAGE_SCROLL_SELECTOR);
}

export function getScrollOffset() {
  const topbar = document.querySelector('.topbar');
  return (topbar?.offsetHeight || 60) + SCROLL_EXTRA;
}

export function getActivePageView() {
  return document.getElementById('content-root')?.querySelector('.page-view') ?? null;
}

/**
 * Resolve scroll target by ID within the active page only.
 */
export function findScrollTarget(sectionId) {
  if (!sectionId) return null;

  const pageView = getActivePageView();
  if (!pageView) return null;

  const byId = document.getElementById(sectionId);
  if (byId && pageView.contains(byId)) return byId;

  const escaped = cssAttrEscape(sectionId);
  return (
    pageView.querySelector(`[data-toc-section][id="${escaped}"]`) ||
    pageView.querySelector(`[id="${escaped}"]`)
  );
}

function cssAttrEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Pixel offset of element top inside the scroll container (layout-stable).
 */
export function getTargetScrollTop(target, scroller, offset = getScrollOffset()) {
  let y = 0;
  let node = target;

  while (node && node !== scroller) {
    y += node.offsetTop;
    node = node.offsetParent;
    if (node && !scroller.contains(node)) {
      const targetRect = target.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      y = scroller.scrollTop + targetRect.top - scrollerRect.top;
      break;
    }
  }

  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  return Math.min(max, Math.max(0, Math.round(y - offset)));
}

function cancelSmoothScroll() {
  if (smoothScrollRaf != null) {
    cancelAnimationFrame(smoothScrollRaf);
    smoothScrollRaf = null;
  }
}

function animateScrollTo(scroller, targetY, durationMs = 320) {
  cancelSmoothScroll();
  const startY = scroller.scrollTop;
  const delta = targetY - startY;
  if (Math.abs(delta) < 2) {
    scroller.scrollTop = targetY;
    return Promise.resolve();
  }

  const start = performance.now();
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  return new Promise((resolve) => {
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      scroller.scrollTop = Math.round(startY + delta * ease(t));
      if (t < 1) {
        smoothScrollRaf = requestAnimationFrame(step);
      } else {
        smoothScrollRaf = null;
        scroller.scrollTop = targetY;
        resolve();
      }
    };
    smoothScrollRaf = requestAnimationFrame(step);
  });
}

/**
 * Scroll #page-scroll so `target` aligns below the sticky top bar.
 */
export async function scrollToTarget(target, { smooth = true, updateHash = true, sectionId } = {}) {
  const scroller = getPageScroller();
  if (!scroller || !target?.isConnected) {
    console.warn('[FlitsDoc TOC] Missing scroll container or target');
    return false;
  }

  const offset = getScrollOffset();
  target.style.scrollMarginTop = `${offset}px`;

  const top = getTargetScrollTop(target, scroller, offset);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const useSmooth = smooth && !reducedMotion;

  cancelSmoothScroll();

  if (useSmooth) {
    await animateScrollTo(scroller, top);
  } else {
    scroller.scrollTop = top;
  }

  if (Math.abs(scroller.scrollTop - top) > 8) {
    scroller.scrollTop = top;
  }

  if (updateHash && sectionId) {
    const hash = `#${currentRoute}--${sectionId}`;
    if (location.hash !== hash) {
      history.pushState(null, '', hash);
    }
  }

  return true;
}

export function getScrollerScrollTop() {
  return getPageScroller()?.scrollTop ?? 0;
}

export function scrollScrollerToTop() {
  const scroller = getPageScroller();
  if (scroller) scroller.scrollTop = 0;
}
