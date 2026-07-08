/**
 * Global and sidebar search with keyboard navigation.
 */
import { debounce } from '../utils/debounce.js';
import { navigateToRoute } from './router.js';

let activeIndex = -1;
let currentResults = [];

export function initSearch() {
  const globalInput = document.getElementById('global-search');
  const sidebarFilter = document.getElementById('sidebar-filter');
  const resultsEl = document.getElementById('search-results');

  const runGlobalSearch = debounce((query) => {
    if (!window.FlitsDoc) return;
    currentResults = window.FlitsDoc.search(query, 12);
    activeIndex = -1;
    renderSearchResults(resultsEl, currentResults, query);
  }, 180);

  globalInput?.addEventListener('input', (e) => {
    runGlobalSearch(e.target.value);
    globalInput.setAttribute('aria-expanded', e.target.value.trim() ? 'true' : 'false');
  });

  globalInput?.addEventListener('keydown', (e) => handleSearchKeydown(e, resultsEl));

  globalInput?.addEventListener('focus', () => {
    if (globalInput.value.trim()) {
      runGlobalSearch(globalInput.value);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      resultsEl?.setAttribute('hidden', '');
      globalInput?.setAttribute('aria-expanded', 'false');
    }
  });

  resultsEl?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-search-slug]');
    if (item) {
      selectSearchResult(item.getAttribute('data-search-slug'), globalInput, resultsEl);
    }
  });

  sidebarFilter?.addEventListener('input', (e) => {
    import('../render/sidebar.js').then(({ filterSidebar }) => filterSidebar(e.target.value));
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      globalInput?.focus();
      globalInput?.select();
    }
    if (e.key === 'Escape') {
      resultsEl?.setAttribute('hidden', '');
      globalInput?.blur();
    }
  });
}

function handleSearchKeydown(e, resultsEl) {
  if (!currentResults.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
    highlightResult(resultsEl, activeIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    highlightResult(resultsEl, activeIndex);
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    e.preventDefault();
    selectSearchResult(currentResults[activeIndex].slug, e.target, resultsEl);
  }
}

function highlightResult(resultsEl, index) {
  resultsEl?.querySelectorAll('.search-results__item').forEach((el, i) => {
    el.classList.toggle('is-focused', i === index);
    if (i === index) el.scrollIntoView({ block: 'nearest' });
  });
}

function selectSearchResult(slug, input, resultsEl) {
  navigateToRoute(slug);
  if (input) input.value = '';
  resultsEl?.setAttribute('hidden', '');
  input?.setAttribute('aria-expanded', 'false');
  closeMobileSidebar();
}

function renderSearchResults(container, results, query) {
  if (!container) return;
  if (!query.trim()) {
    container.setAttribute('hidden', '');
    container.innerHTML = '';
    return;
  }

  if (!results.length) {
    container.removeAttribute('hidden');
    container.innerHTML = `<div class="search-results__empty">No results for "${escapeHtml(query)}"</div>`;
    return;
  }

  container.removeAttribute('hidden');
  container.innerHTML = results
    .map((r, i) => {
      const methodBadge = r.method
        ? `<span class="method-badge method-${r.method.toLowerCase()}">${r.method}</span>`
        : '';
      return `
        <button type="button" class="search-results__item" role="option" data-search-slug="${r.slug}" data-index="${i}">
          <div class="search-results__row">
            ${methodBadge}
            <span class="search-results__title">${highlightMatch(r.title, query)}</span>
          </div>
          <span class="search-results__meta">${escapeHtml(r.subtitle || '')}</span>
        </button>
      `;
    })
    .join('');
}

function highlightMatch(text, query) {
  const t = escapeHtml(text || '');
  const q = escapeHtml(query.trim());
  if (!q) return t;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return t.replace(re, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
}
