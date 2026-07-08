/**
 * Centralized TOC configuration — selectors, thresholds, page types.
 */

export const SCROLL_EXTRA = 24;
export const SCROLL_BOTTOM_MIN = 48;
export const SCROLL_BOTTOM_PAD = 20;
export const SCROLL_TOP_PAD = 8;
export const TRIGGER_PAD = 16;

export const PAGE_TYPES = {
  API: 'api',
  FOLDER: 'folder',
  OVERVIEW: 'overview',
};

/** All markdown prose headings (folder / intro) — used for ID assignment and DOM queries. */
export const PROSE_HEADING_SELECTOR =
  '.page-body.prose h2.md-h2, .page-body.prose h3.md-h3, .page-body.prose h4.md-h4, ' +
  '#overview-content h2.md-h2, #overview-content h3.md-h3, #overview-content h4.md-h4';

/** How many heading levels below the shallowest prose heading appear in the doc-page TOC. */
export const DOC_TOC_DEPTH_OFFSET = 1;

export const PAGE_VIEW_SELECTOR = '.page-view';
export const TOC_SECTION_SELECTOR = '[data-toc-section]';
export const EXCLUDED_PROSE_SELECTOR = '.prose--api-description';
