/**
 * Left sidebar navigation tree — collapsed by default.
 */
import { docStore } from '../data/docStore.js';
import { expandPathToElement, expandFolder, collapseFolder } from '../features/sidebarCollapse.js';

export function renderSidebar(container) {
  const doc = docStore.doc;
  if (!doc) return;

  const apiCount = doc.meta?.apiCount ?? doc.apis?.length ?? 0;

  container.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="API navigation">
      <div class="sidebar__header">
        <div class="sidebar__search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
          <input type="search" id="sidebar-filter" class="sidebar__filter" placeholder="Filter endpoints…" aria-label="Filter sidebar" />
        </div>
        <span class="sidebar__count">${apiCount} endpoints</span>
      </div>
      <nav class="sidebar__nav" id="sidebar-nav">
        <ul class="nav-tree" role="tree">
          <li class="nav-tree__item nav-tree__item--overview" role="none">
            <a href="#overview" class="nav-tree__link nav-tree__link--overview" data-nav="overview" data-slug="overview" role="treeitem">
              <span class="nav-tree__label">Introduction</span>
            </a>
          </li>
          ${renderNavNodes(doc.navTree, 0)}
        </ul>
      </nav>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay" hidden aria-hidden="true"></div>
  `;
}

function renderNavNodes(nodes, depth) {
  return (nodes || [])
    .map((node) => {
      if (node.type === 'folder') {
        const childHtml = renderNavNodes(node.children, depth + 1);
        return `
          <li class="nav-tree__item nav-tree__item--folder" role="none" data-folder-slug="${node.slug}">
            <a href="#${node.slug}"
               class="nav-tree__folder-btn"
               data-nav="${node.slug}"
               data-slug="${node.slug}"
               data-toggle-folder="${node.slug}"
               aria-expanded="false"
               aria-controls="folder-${node.slug}"
               role="treeitem">
              <span class="nav-tree__label">${escapeHtml(node.name)}</span>
              ${node.apiCount ? `<span class="nav-tree__count">${node.apiCount}</span>` : ''}
              <svg class="nav-tree__chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
            <ul class="nav-tree nav-tree--nested is-collapsed" id="folder-${node.slug}" role="group" style="--depth: ${depth + 1}; max-height: 0">
              ${childHtml}
            </ul>
          </li>
        `;
      }
      // API endpoint item
      const methodLower = (node.method || 'get').toLowerCase();
      return `
        <li class="nav-tree__item" role="none" data-api-name="${escapeHtml(node.name).toLowerCase()}">
          <a href="#${node.slug}"
             class="nav-tree__link nav-tree__link--api"
             data-nav="${node.slug}"
             data-slug="${node.slug}"
             role="treeitem">
            <span class="nav-tree__label">${escapeHtml(node.name)}</span>
            <span class="nav-tree__method-badge method-${methodLower}">${escapeHtml(node.method || 'GET')}</span>
          </a>
        </li>
      `;
    })
    .join('');
}

export function setSidebarActive(slug) {
  document.querySelectorAll('.nav-tree__link, .nav-tree__folder-btn').forEach((el) => {
    el.classList.remove('is-active');
    el.removeAttribute('aria-current');
  });

  const link = document.querySelector(`[data-slug="${slug}"]`);
  if (link) {
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'page');
    expandPathToElement(link);
  }
}

/* ════════════════════════════════════════════════════════════════════════
   Hierarchical sidebar search
   ─────────────────────────────────────────────────────────────────────────
   Searches every navigation entity — parent folders, child folders and APIs
   (by name + HTTP method). Visibility rules:
     • parent folder matches  → show the whole subtree
     • child folder matches   → show it + all its APIs (+ ancestor path)
     • API matches            → show it + its ancestor folders only
   Matching folders auto-expand. Clearing restores the original expand state.
   Operates on a cached flat index (built once) for O(n) live filtering.
   ════════════════════════════════════════════════════════════════════════ */

let _navIndex = null;      // { nav, entries: [{ li, isFolder, name, method, ul, parents }] }
let _navIndexFor = null;   // the #sidebar-nav element the index was built from
let _filterActive = false; // currently in filtered mode?
let _origExpanded = null;  // Set<HTMLUListElement> — folders expanded when filtering began

function buildNavIndex() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return { nav: null, entries: [] };

  const entries = [];
  nav.querySelectorAll('.nav-tree__item').forEach((li) => {
    const isFolder = li.classList.contains('nav-tree__item--folder');
    const labelEl = li.querySelector(
      ':scope > .nav-tree__folder-btn .nav-tree__label, :scope > .nav-tree__link .nav-tree__label'
    );
    const name = (labelEl?.textContent || '').trim().toLowerCase();
    const method = isFolder
      ? ''
      : (li.querySelector(':scope > .nav-tree__link .nav-tree__method-badge')?.textContent || '')
          .trim().toLowerCase();
    const ul = isFolder ? li.querySelector(':scope > .nav-tree--nested') : null;

    const parents = [];
    let p = li.parentElement?.closest('.nav-tree__item--folder');
    while (p) {
      parents.push(p);
      p = p.parentElement?.closest('.nav-tree__item--folder');
    }

    entries.push({ li, isFolder, name, method, ul, parents });
  });

  return { nav, entries };
}

function getNavIndex() {
  const nav = document.getElementById('sidebar-nav');
  if (!_navIndex || _navIndexFor !== nav) {
    _navIndex = buildNavIndex();
    _navIndexFor = _navIndex.nav;
  }
  return _navIndex;
}

function snapshotExpanded(entries) {
  const set = new Set();
  for (const e of entries) {
    if (e.isFolder && e.ul && !e.ul.classList.contains('is-collapsed')) set.add(e.ul);
  }
  return set;
}

function restoreNav(entries) {
  for (const e of entries) {
    e.li.hidden = false;
    e.li.classList.remove('is-filtered-out');
    if (e.isFolder && e.ul) {
      if (_origExpanded?.has(e.ul)) expandFolder(e.ul, false);
      else collapseFolder(e.ul, false);
    }
  }
  _filterActive = false;
  _origExpanded = null;
}

export function filterSidebar(query) {
  const q = query.trim().toLowerCase();
  const { entries } = getNavIndex();
  if (!entries.length) return;

  // Empty query → restore the navigation to its pre-search state.
  if (!q) {
    if (_filterActive) restoreNav(entries);
    return;
  }

  // Capture the expand state once, the moment filtering begins.
  if (!_filterActive) {
    _origExpanded = snapshotExpanded(entries);
    _filterActive = true;
  }

  // Pass 1 — self match (name or HTTP method). Track matched folders.
  const matchedFolders = new Set();
  for (const e of entries) {
    e._self = e.name.includes(q) || (e.method && e.method.includes(q));
    if (e._self && e.isFolder) matchedFolders.add(e.li);
  }

  // Pass 2 — every ancestor of a matched node gains a matching descendant.
  const hasMatchingDescendant = new Set();
  for (const e of entries) {
    if (!e._self) continue;
    for (const p of e.parents) hasMatchingDescendant.add(p);
  }

  // Apply visibility + auto-expand (instant — no animation while typing).
  for (const e of entries) {
    const ancestorMatch = e.parents.some((p) => matchedFolders.has(p));
    const descendantMatch = e.isFolder && hasMatchingDescendant.has(e.li);
    const visible = e._self || ancestorMatch || descendantMatch;

    e.li.hidden = !visible;
    e.li.classList.toggle('is-filtered-out', !visible);

    if (e.isFolder && e.ul) {
      if (visible) expandFolder(e.ul, false);
      else collapseFolder(e.ul, false);
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
