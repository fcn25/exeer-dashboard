/** Coerce API / cache values to a safe array for `.map` and `.length`. */
export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
