/**
 * Debounce utility for search and resize handlers.
 */
export function debounce(fn, wait = 200) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
}
