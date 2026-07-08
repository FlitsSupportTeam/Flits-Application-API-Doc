/**
 * Theme-aware topbar logo — official Flits CDN assets, preloaded, no layout shift.
 */

export const LOGO_LIGHT_URL =
  'https://cdn.shopify.com/s/files/1/0666/1200/3110/files/flits_light_logo.png?v=1780500564';

export const LOGO_DARK_URL =
  'https://cdn.shopify.com/s/files/1/0666/1200/3110/files/flits_dark_logo.png?v=1780500563';

/** Fixed slot dimensions (must match css/main.css .topbar__logo) */
export const LOGO_WIDTH = 96;
export const LOGO_HEIGHT = 28;

let observer = null;

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Sync accessible alt / aria-hidden on stacked logo images.
 */
export function updateThemeLogo() {
  const isDark = getCurrentTheme() === 'dark';
  const light = document.getElementById('logo-light');
  const dark = document.getElementById('logo-dark');
  if (!light || !dark) return;

  light.setAttribute('aria-hidden', isDark ? 'true' : 'false');
  dark.setAttribute('aria-hidden', isDark ? 'false' : 'true');
}

function preloadLogos() {
  [LOGO_LIGHT_URL, LOGO_DARK_URL].forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}

export function initializeThemeLogo() {
  preloadLogos();
  updateThemeLogo();

  if (observer) observer.disconnect();
  observer = new MutationObserver(updateThemeLogo);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

export function destroyThemeLogo() {
  observer?.disconnect();
  observer = null;
}
