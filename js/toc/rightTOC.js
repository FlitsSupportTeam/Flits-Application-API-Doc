/**
 * Right-side "On This Page" TOC — anchor-based navigation.
 *
 * Root causes of the previous button + JS scroll approach failing:
 * 1. Buttons used data-toc-link + preventDefault — fragile; no native fragment scroll.
 * 2. Bare href="#section" changed location.hash; parseHash treated the fragment as a
 *    route slug (e.g. #overview navigated away from an API page).
 * 3. Custom RAF scroll on #page-scroll fought timing with hashchange remounts.
 * 4. Full page remount on hashchange reset scrollTop before scrollToSection ran.
 *
 * Fix: <a class="toc__link" href="#section-id"> + scrollIntoView (respects scroll-margin-top)
 * + parseHash distinguishes in-page fragments from route slugs.
 *
 * Public API
 * ──────────
 *   buildRightTOC(container, options)   Mount TOC for the current page.
 *   scrollToSection(id, options)        Scroll to a section (hash / deep links).
 *   initScrollSpy(entries, firstId)     Active section on scroll.
 *   cleanupTOC()                        Tear down before navigation.
 */

import { setTocActive } from '../render/toc.js';
import { currentRoute } from '../state/routeState.js';
import { uniqueSlug } from '../utils/slug.js';
import {
  getDocTocHeadingDepthRange,
  isDocTocHeadingElement,
} from './tocCollector.js';

const SCROLL_TOP_GUARD    = 8;
const SCROLL_BOT_MIN      = 48;
const SCROLL_BOT_PAD      = 20;
const SPY_TRIGGER_PAD     = 16;
const SCROLL_MARGIN_GAP   = 28; // matches page.css scroll-margin-top (content sits below topbar)
const SUPPRESS_SMOOTH     = 600;
const SUPPRESS_INSTANT    = 150;

const PAGE_VIEW_SEL    = '.page-view';
const TOC_SECTION_SEL  = '[data-toc-section]';
const EXCLUDED_PROSE   = '.prose--api-description';
const PROSE_HEADING_SEL =
  '.page-body.prose h2.md-h2, .page-body.prose h3.md-h3, .page-body.prose h4.md-h4, ' +
  '#overview-content h2.md-h2, #overview-content h3.md-h3, #overview-content h4.md-h4';

let _spyCleanup        = null;
let _suppressUntil     = 0;
let _tocClickCleanup   = null;

// Retained so the spy can re-init when the layout crosses the 1200px boundary
// (desktop inner-scroll ↔ mobile document-scroll) without a navigation.
let _spyEntries        = null;
let _spyInitialId      = null;
let _breakpointBound   = false;

export function buildRightTOC(container, { initialActiveId } = {}) {
  cleanupTOC();

  const listEl = document.getElementById('toc-list');
  if (!listEl) return;

  _assignProseIds(container);
  const entries = _collectEntries(container);

  listEl.innerHTML = _renderList(entries);

  if (!entries.length) return;

  // Intercept TOC link clicks — scroll directly without relying on hashchange.
  // When clicked, preventDefault stops the browser from setting the bare #section-id
  // hash (which would fire hashchange and be misidentified as a route slug).
  // scrollToSection handles the scroll and updates the hash via pushState.
  const onTocClick = (e) => {
    const link = e.target.closest('[data-toc-link]');
    if (!link || !listEl.contains(link)) return;
    e.preventDefault();
    const sectionId = link.getAttribute('data-toc-link');
    if (sectionId) scrollToSection(sectionId, { smooth: true, updateHash: true });
  };
  listEl.addEventListener('click', onTocClick);
  _tocClickCleanup = () => listEl.removeEventListener('click', onTocClick);

  const firstId =
    initialActiveId && entries.some((e) => e.id === initialActiveId)
      ? initialActiveId
      : entries[0].id;

  setTocActive(firstId);
  initScrollSpy(entries, firstId);
  _applyInitialCollapse();
}

/**
 * On mobile/tablet (≤1199px) the "On this page" card starts collapsed to save
 * vertical space; on desktop it is always expanded. The collapse only has a
 * visual effect ≤1199px (the display rule lives in that media query).
 */
function _applyInitialCollapse() {
  const aside = document.querySelector('.toc-aside');
  const btn = aside?.querySelector('[data-toc-collapse]');
  if (!aside || !btn) return;
  const mobile = window.matchMedia('(max-width: 1199px)').matches;
  aside.classList.toggle('is-collapsed', mobile);
  btn.setAttribute('aria-expanded', String(!mobile));
}

/**
 * Re-init the scrollspy when the layout crosses 1200px (the scroll source
 * switches between #page-scroll and the document). Bound once.
 */
function _ensureBreakpointListener() {
  if (_breakpointBound || typeof window.matchMedia !== 'function') return;
  _breakpointBound = true;
  const mql = window.matchMedia('(max-width: 1199px)');
  const onChange = () => {
    if (!_spyEntries) return;
    initScrollSpy(_spyEntries, _spyInitialId);
    _applyInitialCollapse();
  };
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else if (mql.addListener) mql.addListener(onChange); // older Safari
}

/** @deprecated Anchor links handle clicks; kept for legacy imports (no-op). */
export function bindTOCEvents() {}

export function scrollToSection(sectionId, { smooth = true, updateHash = true } = {}) {
  const target = _findTarget(sectionId);

  if (!target) {
    console.warn('[TOC] scrollToSection — target not found:', sectionId);
    return false;
  }

  _suppressSpy(smooth ? SUPPRESS_SMOOTH : SUPPRESS_INSTANT);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = smooth && !reducedMotion ? 'smooth' : 'auto';
  target.scrollIntoView({ behavior, block: 'start' });

  if (updateHash && sectionId && currentRoute) {
    const hash = `#${currentRoute}--${sectionId}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  setTocActive(sectionId);
  return true;
}

export function initScrollSpy(entries, initialActiveId) {
  if (_spyCleanup) { _spyCleanup(); _spyCleanup = null; }

  _spyEntries = entries;
  _spyInitialId = initialActiveId;
  _ensureBreakpointListener();

  const { el: scroller, isWindow } = _resolveScroller();
  if (!scroller || !entries.length) return;

  let ticking = false;

  const update = () => {
    if (Date.now() < _suppressUntil) return;
    const id = _resolveActive(entries, scroller, isWindow);
    if (id) setTocActive(id);
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };

  // Below 1200px the whole document scrolls, so listen on window; on desktop
  // the internal #page-scroll element is the scroll source.
  const scrollTarget = isWindow ? window : scroller;
  scrollTarget.addEventListener('scroll', schedule, { passive: true });

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  if (ro) {
    ro.observe(isWindow ? document.documentElement : scroller);
    const content = document.getElementById('content-root');
    if (content) ro.observe(content);
  }

  _spyCleanup = () => {
    scrollTarget.removeEventListener('scroll', schedule);
    ro?.disconnect();
  };

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (scroller.scrollTop <= SCROLL_TOP_GUARD && initialActiveId) {
        setTocActive(initialActiveId);
      } else {
        update();
      }
    })
  );
}

export function cleanupTOC() {
  if (_spyCleanup) { _spyCleanup(); _spyCleanup = null; }
  if (_tocClickCleanup) { _tocClickCleanup(); _tocClickCleanup = null; }
  _suppressUntil = 0;
}

/**
 * Resolve the element that actually scrolls the content.
 *   Desktop (≥1200px): #page-scroll is an internal scroll container.
 *   ≤1199px:           #page-scroll is overflow:visible and the document
 *                      scrolls, so use the document scrolling element + window.
 */
function _resolveScroller() {
  const pageScroll = document.getElementById('page-scroll');
  if (pageScroll) {
    const oy = getComputedStyle(pageScroll).overflowY;
    if (oy === 'auto' || oy === 'scroll') {
      return { el: pageScroll, isWindow: false };
    }
  }
  return { el: document.scrollingElement || document.documentElement, isWindow: true };
}

/** Height of the fixed topbar — the offset content sits below in document scroll. */
function _topbarOffset() {
  const tb = document.querySelector('.topbar');
  return tb ? tb.getBoundingClientRect().height : 60;
}

function _suppressSpy(ms) {
  _suppressUntil = Date.now() + ms;
}

function _resolveActive(entries, scroller, isWindow) {
  const scrollTop   = scroller.scrollTop;
  const maxScroll   = scroller.scrollHeight - scroller.clientHeight;
  // Reference line: in document-scroll mode content sits below the fixed
  // topbar, so offset by its height; in element-scroll mode use the scroller's
  // own viewport top (unchanged desktop behaviour).
  const refTop      = isWindow ? _topbarOffset() : scroller.getBoundingClientRect().top;
  const triggerY    = SCROLL_MARGIN_GAP + SPY_TRIGGER_PAD;

  if (scrollTop <= SCROLL_TOP_GUARD) return entries[0].id;

  if (maxScroll > SCROLL_BOT_MIN && scrollTop >= maxScroll - SCROLL_BOT_PAD) {
    return entries[entries.length - 1].id;
  }

  let activeId = entries[0].id;
  for (const entry of entries) {
    if (!entry.el?.isConnected) continue;
    const top = entry.el.getBoundingClientRect().top - refTop;
    if (top <= triggerY) activeId = entry.id;
    else break;
  }
  return activeId;
}

function _findTarget(sectionId) {
  if (!sectionId) return null;
  const pageView = document.getElementById('content-root')?.querySelector(PAGE_VIEW_SEL);
  if (!pageView) return null;

  const byId = document.getElementById(sectionId);
  if (byId && pageView.contains(byId)) return byId;

  const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    pageView.querySelector(`${TOC_SECTION_SEL}[id="${esc(sectionId)}"]`) ||
    pageView.querySelector(`[id="${esc(sectionId)}"]`)
  );
}

function _collectEntries(container) {
  const pageView = container?.querySelector(PAGE_VIEW_SEL);
  if (!pageView) return [];

  const type = pageView.dataset?.pageType;
  const seen = new Set();

  if (type === 'api')                        return _apiEntries(pageView, seen);
  if (type === 'folder' || type === 'overview') return _docEntries(pageView, seen);
  return [];
}

function _apiEntries(pageView, seen) {
  const entries = [];
  pageView.querySelectorAll(TOC_SECTION_SEL).forEach((el) => _pushSection(el, entries, seen));
  return entries;
}

function _docEntries(pageView, seen) {
  const sectionTitles = _buildTitleSet(pageView);
  const tocDepth = getDocTocHeadingDepthRange(pageView);
  const nodes = [
    ...pageView.querySelectorAll(`${PROSE_HEADING_SEL}, ${TOC_SECTION_SEL}`),
  ].filter(_isVisible);

  nodes.sort(_docOrder);

  const entries = [];
  for (const node of nodes) {
    if (node.hasAttribute('data-toc-section')) _pushSection(node, entries, seen);
    else if (isDocTocHeadingElement(node, tocDepth)) _pushHeading(node, entries, seen, sectionTitles);
  }
  return entries;
}

function _buildTitleSet(pageView) {
  const set = new Set();
  pageView.querySelectorAll(TOC_SECTION_SEL).forEach((el) => {
    const t =
      el.getAttribute('data-toc-title') ||
      el.querySelector('.page-section__title')?.textContent?.trim();
    if (t) set.add(t.trim().toLowerCase());
  });
  return set;
}

function _pushSection(el, entries, seen) {
  const id = el.id;
  const title =
    el.getAttribute('data-toc-title') ||
    el.querySelector('.page-section__title')?.textContent?.trim();
  if (!id || !title || seen.has(id)) return;
  seen.add(id);
  entries.push({ id, title, level: el.getAttribute('data-toc-level') || '2', el });
}

function _pushHeading(heading, entries, seen, sectionTitles) {
  const title = heading.textContent?.trim();
  if (!title) return;
  if (sectionTitles?.has(title.toLowerCase())) return;

  let id = heading.id;
  if (!id) {
    id = uniqueSlug(title, seen);
    heading.id = id;
  } else {
    if (seen.has(id)) return;
    seen.add(id);
  }

  const level = heading.tagName?.match(/^H(\d)$/i)?.[1] || '2';
  entries.push({ id, title, level, el: heading });
}

function _isVisible(el) {
  if (!el?.isConnected) return false;
  if (el.closest(EXCLUDED_PROSE)) return false;
  if (el.closest('[hidden]')) return false;
  if (!el.closest(PAGE_VIEW_SEL)) return false;
  if (typeof getComputedStyle === 'function') {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
  }
  return true;
}

function _docOrder(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & 4) return -1;
  if (pos & 2) return 1;
  return 0;
}

function _assignProseIds(container) {
  const seen = new Set();

  container.querySelectorAll(`${TOC_SECTION_SEL}[id]`).forEach((el) => {
    if (el.id) seen.add(el.id);
  });

  container
    .querySelectorAll(
      `.prose:not(${EXCLUDED_PROSE}) .md-h2, ` +
      `.prose:not(${EXCLUDED_PROSE}) .md-h3, ` +
      `.prose:not(${EXCLUDED_PROSE}) .md-h4`
    )
    .forEach((el) => {
      if (!_isVisible(el)) return;
      if (el.id) { seen.add(el.id); return; }
      el.id = uniqueSlug(el.textContent || 'section', seen);
    });
}

function _renderList(entries) {
  if (!entries.length) {
    return `<li class="toc__item toc__item--muted"><span>No sections</span></li>`;
  }
  return entries
    .map(
      (e) => `
    <li class="toc__item toc__item--level-${e.level}">
      <a class="toc__link" href="#${_ea(currentRoute)}--${_ea(e.id)}" data-toc-link="${_ea(e.id)}">${_eh(e.title)}</a>
    </li>`
    )
    .join('');
}

function _eh(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _ea(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
