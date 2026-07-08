/**
 * Lightweight Markdown → HTML for Postman descriptions.
 * Handles common API doc patterns: headings, tables, code, lists, links.
 */
import { formatVariables } from './variables.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMarkdownForSearch(md) {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#*_~\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function markdownToHtml(markdown) {
  if (!markdown) return '';
  let text = formatVariables(String(markdown).replace(/\r\n/g, '\n'));

  const codeBlocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length;
    const language = (lang || 'text').trim() || 'text';
    codeBlocks.push({ language, code: code.trimEnd() });
    return `@@CODEBLOCK_${i}@@`;
  });

  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows = [];

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  const flushTable = () => {
    if (!inTable || !tableRows.length) return;
    const [header, ...body] = tableRows;
    const alignRow = body[0]?.every((c) => /^:?-+:?$/.test(c.replace(/\s/g, '')))
      ? body.shift()
      : null;
    void alignRow;
    out.push('<div class="md-table-wrap"><table class="md-table"><thead><tr>');
    header.forEach((cell) => out.push(`<th>${inlineFormat(cell.trim())}</th>`));
    out.push('</tr></thead><tbody>');
    body.forEach((row) => {
      out.push('<tr>');
      row.forEach((cell) => out.push(`<td>${inlineFormat(cell.trim())}</td>`));
      out.push('</tr>');
    });
    out.push('</tbody></table></div>');
    inTable = false;
    tableRows = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('@@CODEBLOCK_')) {
      closeLists();
      flushTable();
      const idx = parseInt(trimmed.match(/\d+/)?.[0], 10);
      const block = codeBlocks[idx];
      const lang = block?.language || 'text';
      const escaped = escapeHtml(block?.code || '');
      out.push(
        `<div class="md-code-wrap"><pre class="code-block md-embedded" data-language="${lang}"><code>${escaped}</code></pre></div>`
      );
      i++;
      continue;
    }

    if (trimmed.includes('|') && trimmed.startsWith('|')) {
      closeLists();
      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
      if (!inTable) inTable = true;
      tableRows.push(cells);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h${level}">${inlineFormat(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      closeLists();
      out.push(`<blockquote class="md-quote">${inlineFormat(trimmed.replace(/^>\s?/, ''))}</blockquote>`);
      i++;
      continue;
    }

    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) {
        closeLists();
        out.push('<ul class="md-ul">');
        inUl = true;
      }
      out.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      i++;
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inOl) {
        closeLists();
        out.push('<ol class="md-ol">');
        inOl = true;
      }
      out.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      i++;
      continue;
    }

    if (!trimmed) {
      closeLists();
      i++;
      continue;
    }

    closeLists();
    out.push(`<p class="md-p">${inlineFormat(trimmed)}</p>`);
    i++;
  }

  closeLists();
  flushTable();

  return out.join('\n');
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" rel="noopener">$1</a>');
  return s;
}

export { stripMarkdownForSearch };
