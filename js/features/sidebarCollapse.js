/**
 * Animated sidebar folder collapse/expand.
 */

export function initSidebarCollapse() {
  document.querySelectorAll('.nav-tree--nested').forEach((ul) => {
    collapseFolder(ul, false);
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-folder]');
    if (!btn) return;
    e.preventDefault(); // prevent href hash jump; router handles navigation
    // Do NOT stopPropagation — let the router's [data-nav] handler also fire
    toggleFolder(btn);
  });

  document.addEventListener('keydown', (e) => {
    const btn = e.target.closest('[data-toggle-folder]');
    if (!btn) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFolder(btn);
    }
  });
}

function toggleFolder(btn) {
  const slug = btn.getAttribute('data-toggle-folder');
  const ul = document.getElementById(`folder-${slug}`);
  if (!ul) return;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  if (expanded) collapseFolder(ul, true);
  else expandFolder(ul, true);
}

export function expandFolder(ul, animate = true) {
  const folderItem = ul.closest('.nav-tree__item--folder');
  const btn = folderItem?.querySelector('[data-toggle-folder]');

  ul.classList.remove('is-collapsed');
  if (btn) btn.setAttribute('aria-expanded', 'true');

  if (!animate) {
    ul.style.maxHeight = 'none';
    return;
  }

  ul.style.maxHeight = `${ul.scrollHeight}px`;
  const onEnd = () => {
    if (btn?.getAttribute('aria-expanded') === 'true') {
      ul.style.maxHeight = 'none';
    }
    ul.removeEventListener('transitionend', onEnd);
  };
  ul.addEventListener('transitionend', onEnd);
}

export function collapseFolder(ul, animate = true) {
  const folderItem = ul.closest('.nav-tree__item--folder');
  const btn = folderItem?.querySelector('[data-toggle-folder]');

  if (btn) btn.setAttribute('aria-expanded', 'false');

  if (animate && ul.style.maxHeight === 'none') {
    ul.style.maxHeight = `${ul.scrollHeight}px`;
    requestAnimationFrame(() => {
      ul.classList.add('is-collapsed');
      ul.style.maxHeight = '0px';
    });
  } else {
    ul.classList.add('is-collapsed');
    ul.style.maxHeight = '0px';
  }
}

/**
 * Data-driven node-type check: true when `navEl` is a folder button whose
 * folder actually contains child items (folders or APIs). Used by the mobile
 * drawer to expand-only on folder nodes and navigate+close on leaf nodes.
 * A childless folder returns false (treated as a leaf → navigates).
 */
export function isExpandableFolder(navEl) {
  const slug = navEl?.getAttribute?.('data-toggle-folder');
  if (!slug) return false; // not a folder button (API / overview link) → leaf
  const ul = document.getElementById(`folder-${slug}`);
  return !!ul && ul.querySelector('.nav-tree__item') != null;
}

/** Expand ancestor folders for a nav link (deep link / active item reveal) */
export function expandPathToElement(element) {
  let parent = element.closest('.nav-tree--nested');
  while (parent) {
    expandFolder(parent, true);
    parent = parent.parentElement?.closest('.nav-tree--nested');
  }
}
