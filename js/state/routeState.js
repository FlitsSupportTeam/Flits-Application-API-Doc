/** Current documentation route slug (shared across router + TOC). */
export let currentRoute = 'overview';

export function setCurrentRoute(slug) {
  currentRoute = slug || 'overview';
}
