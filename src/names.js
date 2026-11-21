'use strict';
/**
 * Normalize a visitor name so "  Ana  MARÍA " and "ana maría" match.
 * NFKC folds visually-identical Unicode forms; whitespace is collapsed; case is folded.
 */
function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

/** Tidy a name for display (keeps the visitor's own capitalisation). */
function cleanDisplayName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

module.exports = { normalizeName, cleanDisplayName };
