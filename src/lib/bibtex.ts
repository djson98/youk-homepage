/**
 * Minimal BibTeX serializer for the publications collection.
 *
 * Goals:
 *  - Stable citation keys: `{firstAuthorLastName}{year}{firstSignificantTitleWord}`
 *  - Escape characters that BibTeX/LaTeX cares about (braces, backslashes,
 *    `&`, `%`, `#`, `_`, `$`, `~`, `^`).
 *  - Stay framework-free so it can run in both server (Astro) and client (React)
 *    contexts.
 */

export interface PublicationData {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  type:
    | 'journal-article'
    | 'conference-paper'
    | 'preprint'
    | 'poster'
    | 'other';
}

/** Words skipped when picking the "first significant" title word for the key. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'on',
  'in',
  'of',
  'and',
  'or',
  'for',
  'to',
  'with',
  'from',
  'by',
  'at',
  'is',
  'as',
  'are',
  'be',
]);

function asciiSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase();
}

function lastName(author: string): string {
  // Authors arrive as "First Middle Last". We grab the trailing token.
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] || author;
}

function firstSignificantWord(title: string): string {
  const tokens = title
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const t of tokens) {
    if (!STOPWORDS.has(t.toLowerCase())) return t;
  }
  return tokens[0] ?? 'ref';
}

export function citationKey(pub: PublicationData): string {
  const author = pub.authors[0] ? asciiSlug(lastName(pub.authors[0])) : 'anon';
  const word = asciiSlug(firstSignificantWord(pub.title)) || 'ref';
  return `${author}${pub.year}${word}`;
}

/** Escape a value so it survives a `field = {…}` slot. */
function escapeField(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, (m) => `\\${m}`)
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function entryType(type: PublicationData['type']): string {
  switch (type) {
    case 'journal-article':
      return 'article';
    case 'conference-paper':
      return 'inproceedings';
    case 'preprint':
      return 'misc';
    case 'poster':
      return 'misc';
    default:
      return 'misc';
  }
}

/** Convert one publication to a BibTeX entry. */
export function toBibtex(pub: PublicationData): string {
  const key = citationKey(pub);
  const fields: Array<[string, string]> = [];
  fields.push(['title', escapeField(pub.title)]);
  if (pub.authors.length) {
    fields.push(['author', pub.authors.map(escapeField).join(' and ')]);
  }
  if (pub.journal) fields.push(['journal', escapeField(pub.journal)]);
  fields.push(['year', String(pub.year)]);
  if (pub.doi) fields.push(['doi', escapeField(pub.doi)]);

  const body = fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n');
  return `@${entryType(pub.type)}{${key},\n${body}\n}`;
}

/** Convert many publications to a single BibTeX file (entries separated by blank lines). */
export function toBibtexCollection(pubs: PublicationData[]): string {
  return pubs.map(toBibtex).join('\n\n') + '\n';
}
