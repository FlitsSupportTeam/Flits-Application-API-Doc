/**
 * Render TOC list markup — anchor links matching section ids.
 */

export function renderTocListHtml(entries) {
  if (!entries.length) {
    return `<li class="toc__item toc__item--muted"><span>No sections</span></li>`;
  }

  return entries
    .map(
      (entry) => `
    <li class="toc__item toc__item--level-${entry.level}">
      <a class="toc__link" href="#${escapeAttr(entry.id)}">${escapeHtml(entry.title)}</a>
    </li>
  `
    )
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
