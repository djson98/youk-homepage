/**
 * publications.ts
 *
 * Shared publication model, merge rules and markdown emitter used by the
 * source fetchers in scripts/sources/ and the orchestrator
 * scripts/fetch-publications.ts.
 *
 * Each source normalises its own API payload into `Publication[]`; the
 * orchestrator merges them (see `mergeSources`) and writes one markdown file
 * per publication into src/content/publications/.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..', '..');
export const PUBLICATIONS_DIR = join(
  PROJECT_ROOT,
  'src',
  'content',
  'publications'
);

// ---------------------------------------------------------------------------
// Model (mirrors the publications schema in src/content.config.ts)
// ---------------------------------------------------------------------------

export type PublicationType =
  | 'journal-article'
  | 'conference-paper'
  | 'preprint'
  | 'poster'
  | 'other';

export interface Publication {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  type: PublicationType;
  isPreprint?: boolean;
  abstract?: string;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/**
 * Publishers emit typographic dashes/quotes that differ between ORCID and
 * PubMed for the same paper (e.g. ORCID's "HLA‐B*58:138" uses U+2010). Fold
 * them to ASCII so the same work compares equal and slugs stay stable.
 *
 * The trailing \s+ collapse also folds the non-breaking and thin spaces both
 * APIs sprinkle into titles, since JS \s covers U+00A0 and U+2000-U+200A.
 */
export function normaliseText(input: string): string {
  return input
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** MEDLINE keeps the sentence-ending period in titles; ORCID does not. */
export function stripTrailingPeriod(title: string): string {
  return title.replace(/\.\s*$/, '');
}

export function slugify(input: string): string {
  return (
    normaliseText(input)
      .toLowerCase()
      .normalize('NFKD')
      // Strip diacritics
      .replace(/[̀-ͯ]/g, '')
      // Anything that isn't a-z / 0-9 becomes a separator
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '')
  );
}

/** Collapse a title to a comparison key: alphanumerics only. */
function titleKey(title: string): string {
  return normaliseText(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * ORCID frequently lists the same contributor twice. Drop exact repeats while
 * preserving author order, which is meaningful in biomedical citations.
 */
export function dedupeAuthors(authors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of authors) {
    const name = normaliseText(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export interface SourcedPublications {
  /** The professor's curated record: best titles, journal names and years. */
  orcid: Publication[];
  /** MEDLINE: complete author lists, plus the works ORCID is missing. */
  pubmed: Publication[];
}

interface Bucket {
  orcid?: Publication;
  pubmed?: Publication;
}

/**
 * Identity of a work: DOI when present (authoritative and shared across
 * sources), otherwise the normalised title. Year is deliberately excluded —
 * sources disagree on it for the same paper (online-first vs issue date).
 */
function identityOf(pub: Publication): string {
  const doi = pub.doi?.trim().toLowerCase();
  return doi ? `doi:${doi}` : `title:${titleKey(pub.title)}`;
}

/** The more specific classification wins; 'other' is the fallback bucket. */
function pickType(bucket: Bucket): PublicationType {
  const candidates = [bucket.orcid?.type, bucket.pubmed?.type].filter(
    (t): t is PublicationType => Boolean(t)
  );
  return (
    candidates.find((t) => t === 'preprint') ??
    candidates.find((t) => t !== 'other') ??
    'other'
  );
}

/**
 * Compose one publication from whichever sources described it.
 *
 * Field-level preference rather than whole-record preference, because the two
 * sources are good at different things: ORCID has clean titles and journal
 * names, PubMed has complete and correctly spelled author lists.
 */
function compose(bucket: Bucket): Publication {
  const o = bucket.orcid;
  const p = bucket.pubmed;
  const anchor = o ?? p;
  if (!anchor) throw new Error('compose called with an empty bucket');

  const type = pickType(bucket);
  const pub: Publication = {
    title: o?.title ?? anchor.title,
    authors: p?.authors.length ? p.authors : (o?.authors ?? []),
    year: o?.year ?? anchor.year,
    type,
  };

  const journal = o?.journal ?? p?.journal;
  const doi = o?.doi ?? p?.doi;

  if (journal) pub.journal = journal;
  if (doi) pub.doi = doi;
  if (type === 'preprint' || o?.isPreprint || p?.isPreprint) {
    pub.isPreprint = true;
  }

  return pub;
}

/**
 * Merge the per-source lists into one deduplicated, newest-first set.
 *
 * Works are matched on DOI first and normalised title second, so a record that
 * one source publishes without a DOI still collapses onto its twin.
 */
export function mergeSources(sources: SourcedPublications): Publication[] {
  const buckets = new Map<string, Bucket>();
  // A DOI-less record may still be the same work as a DOI-bearing one from the
  // other source, so index titles too and reuse the existing bucket on a hit.
  const titleIndex = new Map<string, string>();

  const ingest = (pubs: Publication[], source: keyof SourcedPublications) => {
    for (const pub of pubs) {
      const tKey = titleKey(pub.title);
      const identity = identityOf(pub);
      const bucketId = buckets.has(identity)
        ? identity
        : (titleIndex.get(tKey) ?? identity);

      const bucket = buckets.get(bucketId) ?? {};
      // Within one source, the first record for a work wins (ORCID lists the
      // preprint and the published paper under separate DOIs, so they land in
      // separate buckets and both survive — which is intended).
      if (!bucket[source]) bucket[source] = pub;
      buckets.set(bucketId, bucket);
      if (!titleIndex.has(tKey)) titleIndex.set(tKey, bucketId);
    }
  };

  ingest(sources.orcid, 'orcid');
  ingest(sources.pubmed, 'pubmed');

  return [...buckets.values()]
    .map(compose)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// YAML emission
// ---------------------------------------------------------------------------
// We control the schema so a tiny purpose-built emitter is safer than pulling a
// dependency. Always quote strings to keep Korean / unicode / colons / hashes
// safe inside frontmatter.

function yamlString(value: string): string {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

export function toFrontmatter(pub: Publication): string {
  const lines: string[] = ['---'];
  lines.push(`title: ${yamlString(pub.title)}`);
  if (pub.authors.length === 0) {
    lines.push('authors: []');
  } else {
    lines.push('authors:');
    for (const a of pub.authors) lines.push(`  - ${yamlString(a)}`);
  }
  if (pub.journal) lines.push(`journal: ${yamlString(pub.journal)}`);
  lines.push(`year: ${pub.year}`);
  if (pub.doi) lines.push(`doi: ${yamlString(pub.doi)}`);
  lines.push(`type: ${yamlString(pub.type)}`);
  if (pub.isPreprint) lines.push('isPreprint: true');
  if (pub.abstract) lines.push(`abstract: ${yamlString(pub.abstract)}`);
  lines.push('---', '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export async function clearPublicationsDir(): Promise<void> {
  await mkdir(PUBLICATIONS_DIR, { recursive: true });
  const entries = await readdir(PUBLICATIONS_DIR);
  await Promise.all(
    entries
      .filter((name) => name !== '.gitkeep')
      .map((name) =>
        rm(join(PUBLICATIONS_DIR, name), { recursive: true, force: true })
      )
  );
}

export async function writePublications(
  pubs: Publication[]
): Promise<string[]> {
  const written: string[] = [];
  const used = new Set<string>();
  for (const pub of pubs) {
    const base = `${pub.year}-${slugify(pub.title) || 'untitled'}`;
    let filename = `${base}.md`;
    let n = 2;
    while (used.has(filename)) {
      filename = `${base}-${n}.md`;
      n += 1;
    }
    used.add(filename);
    await writeFile(
      join(PUBLICATIONS_DIR, filename),
      toFrontmatter(pub),
      'utf8'
    );
    written.push(filename);
  }
  return written;
}
