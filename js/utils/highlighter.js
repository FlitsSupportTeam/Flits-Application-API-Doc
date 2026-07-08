/**
 * Lightweight JSON / code syntax highlighting (no external deps).
 */
export function highlightJson(code) {
  if (code == null) return '';
  let text = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
  try {
    text = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    /* keep raw */
  }
  return highlightCode(text, 'json');
}

export function highlightCode(code, language = 'text') {
  const escaped = escapeHtml(code);
  if (language === 'json' || looksLikeJson(code)) {
    return highlightJsonTokens(escaped);
  }
  if (language === 'bash' || language === 'shell' || language === 'curl') {
    return highlightBash(escaped);
  }
  return escaped;
}

function looksLikeJson(code) {
  const t = String(code).trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightJsonTokens(escaped) {
  return escaped.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, str, colon, bool) => {
      if (colon) return `<span class="hl-key">${str}</span><span class="hl-punc">:</span>`;
      if (bool) return `<span class="hl-bool">${match}</span>`;
      if (str) return `<span class="hl-str">${str}</span>`;
      if (/^-?\d/.test(match)) return `<span class="hl-num">${match}</span>`;
      return match;
    }
  );
}

function highlightBash(escaped) {
  return escaped
    .replace(/^(curl\b.*)$/gm, '<span class="hl-cmd">$1</span>')
    .replace(/(--[\w-]+)/g, '<span class="hl-flag">$1</span>')
    .replace(/('[^']*')/g, '<span class="hl-str">$1</span>');
}

export function wrapCodeBlock(code, language = 'json', extraClass = '') {
  const highlighted = highlightCode(code, language);
  return `<pre class="code-block ${extraClass}" data-language="${language}"><code>${highlighted}</code></pre>`;
}
