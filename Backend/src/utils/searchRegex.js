/**
 * Turning a user's search box into a safe regular expression.
 *
 * A search term goes straight into `new RegExp(...)` in a dozen list endpoints.
 * Unescaped, two things go wrong: the punctuation a person naturally types
 * (`.`, `+`, `(`) silently changes what matches, and a crafted term such as
 * `(a+)+$` is a catastrophic-backtracking pattern that pins a CPU core for as
 * long as it runs — a denial of service from a public query string.
 *
 * Taxi already had a local `escapeRegex`; this is the same rule in one place so
 * the rest of the project stops rewriting it.
 */
const SPECIAL = /[.*+?^${}()|[\]\\]/g;

export const escapeRegex = (value = '') => String(value).replace(SPECIAL, '\\$&');

/**
 * A case-insensitive "contains" matcher for a search term, or null when the
 * term is empty — so callers can skip the filter entirely rather than matching
 * everything with an empty pattern.
 */
export const searchRegex = (value) => {
  const term = typeof value === 'string' ? value.trim() : '';
  if (!term) return null;
  // Long terms are truncated: the useful part of a search is the first
  // characters, and the rest is only there to make the engine work harder.
  return new RegExp(escapeRegex(term.slice(0, 120)), 'i');
};

export default { escapeRegex, searchRegex };
