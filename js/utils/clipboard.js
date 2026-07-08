/**
 * Copy text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

export function showCopyFeedback(button, successText = 'Copied!', duration = 2000) {
  const labelEl = button.querySelector('.copy-btn__label');
  const originalText = labelEl ? labelEl.textContent : button.textContent;
  const originalAria = button.getAttribute('aria-label');

  button.classList.add('is-copied');
  button.setAttribute('aria-label', successText);
  if (labelEl) {
    labelEl.textContent = successText;
  } else {
    button.textContent = successText;
  }

  setTimeout(() => {
    button.classList.remove('is-copied');
    if (originalAria) button.setAttribute('aria-label', originalAria);
    if (labelEl) {
      labelEl.textContent = originalText;
    } else {
      button.textContent = originalText;
    }
  }, duration);
}
