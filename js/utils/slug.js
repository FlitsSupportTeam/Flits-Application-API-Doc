/**
 * URL-safe slug generation for deep links and section IDs.
 */
export function slugify(text, fallback = 'section') {
  if (!text || typeof text !== 'string') return fallback;
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

export function uniqueSlug(base, existing) {
  let slug = slugify(base);
  let counter = 1;
  while (existing.has(slug)) {
    slug = `${slugify(base)}-${counter++}`;
  }
  existing.add(slug);
  return slug;
}
