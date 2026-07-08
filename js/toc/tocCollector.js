/**
 * Centralized TOC entry collection — single source for all page types.
 */
import { slugify, uniqueSlug } from '../utils/slug.js';
import {
  PAGE_TYPES,
  PROSE_HEADING_SELECTOR,
  PAGE_VIEW_SELECTOR,
  TOC_SECTION_SELECTOR,
  EXCLUDED_PROSE_SELECTOR,
  DOC_TOC_DEPTH_OFFSET,
} from './constants.js';

/** @typedef {{ id: string, title: string, level: string, el: Element | null }} TocEntry */

/**
 * Collect TOC entries for the currently rendered page only.
 * @param {HTMLElement} pageContainer — #content-root
 * @returns {TocEntry[]}
 */
export function collectTocEntries(pageContainer) {
  const pageView = pageContainer?.querySelector(PAGE_VIEW_SELECTOR);
  if (!pageView) return [];

  const pageType = pageView.dataset?.pageType;
  const seenIds = new Set();

  if (pageType === PAGE_TYPES.API) {
    return collectApiPageEntries(pageView, seenIds);
  }

  if (pageType === PAGE_TYPES.FOLDER || pageType === PAGE_TYPES.OVERVIEW) {
    return collectDocPageEntries(pageView, seenIds);
  }

  return [];
}

/**
 * Assign IDs to prose headings; reserve IDs used by structured sections.
 * @param {HTMLElement} container — #content-root
 */
export function assignProseHeadingIds(container) {
  const seenIds = reserveStructuredSectionIds(container);

  container
    .querySelectorAll(
      `.prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h2, ` +
        `.prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h3, ` +
        `.prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h4`
    )
    .forEach((el) => {
      if (!isTocCandidate(el)) return;
      if (el.id) {
        seenIds.add(el.id);
        return;
      }
      el.id = uniqueSlug(el.textContent || 'section', seenIds);
    });
}

/**
 * Ensure prose headings have IDs and return reserved section title set (for dedupe).
 */
export function preparePageHeadings(container) {
  assignProseHeadingIds(container);
  const pageView = container?.querySelector(PAGE_VIEW_SELECTOR);
  return pageView ? buildSectionTitleIndex(pageView) : new Set();
}

function reserveStructuredSectionIds(container) {
  const seenIds = new Set();
  container.querySelectorAll(`${TOC_SECTION_SELECTOR}[id]`).forEach((el) => {
    if (el.id) seenIds.add(el.id);
  });
  return seenIds;
}

function buildSectionTitleIndex(pageView) {
  const titles = new Set();
  pageView.querySelectorAll(TOC_SECTION_SELECTOR).forEach((el) => {
    const title =
      el.getAttribute('data-toc-title') ||
      el.querySelector('.page-section__title')?.textContent?.trim();
    if (title) titles.add(normalizeTitle(title));
  });
  return titles;
}

function collectApiPageEntries(pageView, seenIds) {
  const entries = [];
  pageView.querySelectorAll(TOC_SECTION_SELECTOR).forEach((el) => {
    pushSectionEntry(el, entries, seenIds);
  });
  return entries;
}

function collectDocPageEntries(pageView, seenIds) {
  const sectionTitles = buildSectionTitleIndex(pageView);
  const tocDepth = getDocTocHeadingDepthRange(pageView);
  const nodes = [
    ...pageView.querySelectorAll(`${PROSE_HEADING_SELECTOR}, ${TOC_SECTION_SELECTOR}`),
  ].filter(isTocCandidate);

  nodes.sort(compareDocumentOrder);

  const entries = [];
  for (const node of nodes) {
    if (node.hasAttribute('data-toc-section')) {
      pushSectionEntry(node, entries, seenIds);
    } else if (isDocTocHeadingElement(node, tocDepth)) {
      pushHeadingEntry(node, entries, seenIds, sectionTitles);
    }
  }
  return entries;
}

/**
 * Doc pages (folder / overview): include the shallowest prose heading level and one
 * level deeper (e.g. h2 + h3). Deeper headings (h4+) are in-page content, not TOC sections.
 * @returns {{ min: number, max: number }}
 */
export function getDocTocHeadingDepthRange(pageView) {
  let min = 6;
  pageView.querySelectorAll(PROSE_HEADING_SELECTOR).forEach((el) => {
    if (!isTocCandidate(el)) return;
    const level = parseInt(el.tagName?.match(/^H(\d)$/i)?.[1] || '2', 10);
    if (level < min) min = level;
  });
  if (min > 5) return { min: 2, max: 2 + DOC_TOC_DEPTH_OFFSET };
  return { min, max: min + DOC_TOC_DEPTH_OFFSET };
}

export function isDocTocHeadingElement(heading, range) {
  const level = parseInt(heading.tagName?.match(/^H(\d)$/i)?.[1] || '2', 10);
  return level >= range.min && level <= range.max;
}

function pushSectionEntry(el, entries, seenIds) {
  const id = el.id;
  const title =
    el.getAttribute('data-toc-title') ||
    el.querySelector('.page-section__title')?.textContent?.trim();
  if (!id || !title || seenIds.has(id)) return;
  seenIds.add(id);
  entries.push({
    id,
    title,
    level: el.getAttribute('data-toc-level') || '2',
    el,
  });
}

function pushHeadingEntry(heading, entries, seenIds, sectionTitles) {
  const title = heading.textContent?.trim();
  if (!title) return;

  if (sectionTitles?.has(normalizeTitle(title))) return;

  let id = heading.id;
  if (!id) {
    id = ensureUniqueId(slugify(title, 'section'), seenIds);
    heading.id = id;
  }
  if (seenIds.has(id)) return;
  seenIds.add(id);

  const tagLevel = heading.tagName?.match(/^H(\d)$/i)?.[1];
  entries.push({
    id,
    title,
    level: tagLevel || '2',
    el: heading,
  });
}

export function isTocCandidate(el) {
  if (!el?.isConnected) return false;
  if (el.closest(EXCLUDED_PROSE_SELECTOR)) return false;
  if (el.closest('[hidden]')) return false;
  if (!el.closest(PAGE_VIEW_SELECTOR)) return false;
  if (typeof getComputedStyle !== 'function') return true;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

const DOC_POS_FOLLOWING = 4;
const DOC_POS_PRECEDING = 2;

export function compareDocumentOrder(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & DOC_POS_FOLLOWING) return -1;
  if (pos & DOC_POS_PRECEDING) return 1;
  return 0;
}

function normalizeTitle(title) {
  return String(title).trim().toLowerCase();
}

function ensureUniqueId(base, seen) {
  let id = base;
  let n = 2;
  while (seen.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

/** Expected structured section ids for an API (audit / tests). */
export function getExpectedApiSectionIds(api) {
  const ids = ['endpoint', 'code-samples'];
  if (api.description) ids.unshift('overview');
  if (api.auth) ids.push('authorization');
  if (api.headers?.length) ids.push('headers');
  if (api.pathVariables?.length) ids.push('path-parameters');
  if (api.queryParams?.length) ids.push('query-parameters');
  if (api.bodyRaw) ids.push('request-body');
  const hasResponses = (api.responses || []).some(
    (r) => !(r.isExample && /curl/i.test(r.name || ''))
  );
  if (hasResponses) ids.push('responses');
  return ids;
}

/** Count markdown headings in raw description (audit). */
export function countMarkdownHeadings(markdown) {
  const counts = { h2: 0, h3: 0, h4: 0 };
  if (!markdown) return counts;
  for (const line of String(markdown).split('\n')) {
    const m = line.trim().match(/^(#{2,4})\s+\S/);
    if (!m) continue;
    const level = m[1].length;
    if (level === 2) counts.h2++;
    else if (level === 3) counts.h3++;
    else if (level === 4) counts.h4++;
  }
  return counts;
}
