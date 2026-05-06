/**
 * fetch-orcid.ts
 *
 * Build-time fetcher for ORCID public publications.
 *
 * Reads the configured ORCID ID from src/config/site.config.ts (or a
 * --orcid=XXXX-XXXX-XXXX-XXXX CLI override) and writes one Markdown file per
 * publication into src/content/publications/. The publications collection
 * (defined in src/content.config.ts) then resolves these entries during
 * `astro build`.
 *
 * Wired via package.json: `prebuild` -> `bun run scripts/fetch-orcid.ts`.
 *
 * Behaviour summary:
 *  - No ORCID configured -> log + exit 0 (do not fail the build).
 *  - Network / 404 / parse error -> log + exit 1 (build fails fast).
 *  - Stale entries are removed: the publications dir is wiped (except
 *    .gitkeep) before new files are written, keeping ORCID as the single
 *    source of truth.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import siteConfig from '../src/config/site.config';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const PUBLICATIONS_DIR = join(PROJECT_ROOT, 'src', 'content', 'publications');

// ---------------------------------------------------------------------------
// ORCID API types (only the fields we actually consume)
// ---------------------------------------------------------------------------

interface OrcidValue<T = string> {
  value: T;
}

interface OrcidExternalId {
  'external-id-type': string;
  'external-id-value': string;
  'external-id-url'?: OrcidValue | null;
}

interface OrcidExternalIds {
  'external-id': OrcidExternalId[];
}

interface OrcidWorkSummary {
  'put-code': number;
  type?: string | null;
  title?: { title?: OrcidValue | null } | null;
  'external-ids'?: OrcidExternalIds | null;
}

interface OrcidWorksGroup {
  'work-summary': OrcidWorkSummary[];
}

interface OrcidWorksResponse {
  group: OrcidWorksGroup[];
}

interface OrcidContributor {
  'credit-name'?: OrcidValue | null;
  'contributor-attributes'?: {
    'contributor-role'?: string | null;
  } | null;
}

interface OrcidWork {
  'put-code': number;
  type?: string | null;
  title?: { title?: OrcidValue | null } | null;
  'journal-title'?: OrcidValue | null;
  'short-description'?: string | null;
  'publication-date'?: {
    year?: OrcidValue | null;
  } | null;
  'external-ids'?: OrcidExternalIds | null;
  contributors?: { contributor?: OrcidContributor[] | null } | null;
}

interface OrcidBulkResponse {
  bulk: Array<{ work: OrcidWork; error?: unknown }>;
}

// ---------------------------------------------------------------------------
// Normalised publication shape (mirrors content.config.ts schema)
// ---------------------------------------------------------------------------

type PublicationType =
  | 'journal-article'
  | 'conference-paper'
  | 'preprint'
  | 'poster'
  | 'other';

interface Publication {
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
// Helpers
// ---------------------------------------------------------------------------

const ORCID_ID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

function parseCliOrcid(argv: string[]): string | undefined {
  const flag = argv.find((a) => a.startsWith('--orcid='));
  if (!flag) return undefined;
  const value = flag.slice('--orcid='.length).trim();
  return value || undefined;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    // Strip diacritics
    .replace(/[̀-ͯ]/g, '')
    // Anything that isn't a-z / 0-9 becomes a separator
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function mapType(rawType: string | null | undefined): PublicationType {
  if (!rawType) return 'other';
  const t = rawType.toLowerCase();
  switch (t) {
    case 'journal-article':
      return 'journal-article';
    case 'conference-paper':
    case 'conference-abstract':
    case 'conference-poster':
      return t === 'conference-poster' ? 'poster' : 'conference-paper';
    case 'preprint':
      return 'preprint';
    case 'poster':
      return 'poster';
    default:
      return 'other';
  }
}

function extractDoi(ids: OrcidExternalIds | null | undefined): string | undefined {
  const list = ids?.['external-id'];
  if (!Array.isArray(list)) return undefined;
  const doi = list.find(
    (e) => (e['external-id-type'] || '').toLowerCase() === 'doi'
  );
  return doi?.['external-id-value']?.trim() || undefined;
}

function extractAuthors(work: OrcidWork): string[] {
  const list = work.contributors?.contributor;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => {
      const role = c['contributor-attributes']?.['contributor-role'];
      // ORCID often omits role. Treat missing as author. Filter out clear
      // non-authors like editors / reviewers / translators.
      if (!role) return true;
      return role.toLowerCase() === 'author';
    })
    .map((c) => c['credit-name']?.value?.trim())
    .filter((n): n is string => Boolean(n));
}

function transform(work: OrcidWork): Publication | null {
  const title = work.title?.title?.value?.trim();
  const yearRaw = work['publication-date']?.year?.value?.trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : NaN;

  if (!title) {
    console.warn(
      `  warn: skipping work put-code=${work['put-code']} (missing title)`
    );
    return null;
  }
  if (!Number.isFinite(year)) {
    console.warn(
      `  warn: skipping work "${title.slice(0, 60)}" (missing/invalid year)`
    );
    return null;
  }

  const type = mapType(work.type);
  const journal =
    work['journal-title']?.value?.trim() ||
    work['short-description']?.trim() ||
    undefined;
  const doi = extractDoi(work['external-ids']);
  const authors = extractAuthors(work);

  const pub: Publication = {
    title,
    authors,
    year,
    type,
  };
  if (journal) pub.journal = journal;
  if (doi) pub.doi = doi;
  if (type === 'preprint') pub.isPreprint = true;

  return pub;
}

// YAML emission ----------------------------------------------------------------
// We control the schema so a tiny purpose-built emitter is safer than pulling a
// dependency. Always quote strings to keep Korean / unicode / colons / hashes
// safe inside frontmatter.

function yamlString(value: string): string {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function toFrontmatter(pub: Publication): string {
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
// ORCID fetchers
// ---------------------------------------------------------------------------

const ORCID_BASE = 'https://pub.orcid.org/v3.0';
const BATCH_SIZE = 50;
const HEADERS = { Accept: 'application/json' } as const;

async function orcidFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) {
    throw new Error(`ORCID returned 404 (not found): ${url}`);
  }
  if (!res.ok) {
    throw new Error(
      `ORCID request failed (${res.status} ${res.statusText}): ${url}`
    );
  }
  return (await res.json()) as T;
}

async function fetchPutCodes(orcidId: string): Promise<number[]> {
  const data = await orcidFetch<OrcidWorksResponse>(
    `${ORCID_BASE}/${orcidId}/works`
  );
  const codes: number[] = [];
  for (const group of data.group ?? []) {
    const summary = group['work-summary']?.[0];
    if (summary && typeof summary['put-code'] === 'number') {
      codes.push(summary['put-code']);
    }
  }
  return codes;
}

async function fetchWorks(
  orcidId: string,
  putCodes: number[]
): Promise<OrcidWork[]> {
  const works: OrcidWork[] = [];
  let batches = 0;
  for (let i = 0; i < putCodes.length; i += BATCH_SIZE) {
    const slice = putCodes.slice(i, i + BATCH_SIZE);
    const url = `${ORCID_BASE}/${orcidId}/works/${slice.join(',')}`;
    const data = await orcidFetch<OrcidBulkResponse>(url);
    for (const entry of data.bulk ?? []) {
      if (entry.work) works.push(entry.work);
    }
    batches += 1;
  }
  console.log(
    `Fetched ${works.length} works in ${batches} batch${batches === 1 ? '' : 'es'}`
  );
  return works;
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

async function clearPublicationsDir(): Promise<void> {
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

async function writePublications(pubs: Publication[]): Promise<string[]> {
  const written: string[] = [];
  const used = new Set<string>();
  for (const pub of pubs) {
    let base = `${pub.year}-${slugify(pub.title) || 'untitled'}`;
    let filename = `${base}.md`;
    let n = 2;
    while (used.has(filename)) {
      filename = `${base}-${n}.md`;
      n += 1;
    }
    used.add(filename);
    const filepath = join(PUBLICATIONS_DIR, filename);
    await writeFile(filepath, toFrontmatter(pub), 'utf8');
    written.push(filename);
  }
  return written;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cliOrcid = parseCliOrcid(process.argv.slice(2));
  const orcidId = (cliOrcid || siteConfig.professor.orcidId || '').trim();

  if (!orcidId) {
    console.log('ORCID ID not configured — skipping publication fetch');
    return;
  }

  if (!ORCID_ID_RE.test(orcidId)) {
    console.error(
      `Invalid ORCID ID format: "${orcidId}" (expected XXXX-XXXX-XXXX-XXXX)`
    );
    process.exit(1);
  }

  console.log(`Fetching ORCID publications for ${orcidId}...`);

  let putCodes: number[];
  try {
    putCodes = await fetchPutCodes(orcidId);
  } catch (err) {
    console.error(
      `Failed to fetch ORCID works list: ${(err as Error).message}`
    );
    process.exit(1);
  }

  if (putCodes.length === 0) {
    console.log('No public works found on this ORCID record.');
    await clearPublicationsDir();
    return;
  }

  let works: OrcidWork[];
  try {
    works = await fetchWorks(orcidId, putCodes);
  } catch (err) {
    console.error(
      `Failed to fetch ORCID work details: ${(err as Error).message}`
    );
    process.exit(1);
  }

  const publications: Publication[] = [];
  for (const w of works) {
    const p = transform(w);
    if (p) publications.push(p);
  }
  // Newest-first by year so filenames sort sensibly when listed.
  publications.sort((a, b) => b.year - a.year);

  await clearPublicationsDir();
  const written = await writePublications(publications);

  // Validation: re-read directory and count .md files.
  const onDisk = (await readdir(PUBLICATIONS_DIR)).filter((n) =>
    n.endsWith('.md')
  );
  if (onDisk.length !== publications.length) {
    console.warn(
      `  warn: expected ${publications.length} .md files, found ${onDisk.length} on disk`
    );
  }

  console.log(
    `Wrote ${written.length} publication markdown files to src/content/publications/`
  );
}

main().catch((err) => {
  console.error('fetch-orcid failed:', err);
  process.exit(1);
});
