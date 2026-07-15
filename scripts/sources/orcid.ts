/**
 * orcid.ts
 *
 * Fetches the professor's public works from the ORCID API.
 *
 * ORCID is the curated record: titles and journal names are the ones the
 * author signed off on, so scripts/lib/publications.ts prefers them. Its
 * weakness is contributor lists — often duplicated, sometimes empty — which
 * is why PubMed wins on authors.
 */

import {
  dedupeAuthors,
  normaliseText,
  type Publication,
  type PublicationType,
} from '../lib/publications';

const ORCID_BASE = 'https://pub.orcid.org/v3.0';
const BATCH_SIZE = 50;
const HEADERS = { Accept: 'application/json' } as const;

export const ORCID_ID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// --- API types (only the fields we actually consume) -----------------------

interface OrcidValue<T = string> {
  value: T;
}

interface OrcidExternalId {
  'external-id-type': string;
  'external-id-value': string;
}

interface OrcidExternalIds {
  'external-id': OrcidExternalId[];
}

interface OrcidWorkSummary {
  'put-code': number;
}

interface OrcidWorksResponse {
  group: Array<{ 'work-summary': OrcidWorkSummary[] }>;
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
  'publication-date'?: { year?: OrcidValue | null } | null;
  'external-ids'?: OrcidExternalIds | null;
  contributors?: { contributor?: OrcidContributor[] | null } | null;
}

interface OrcidBulkResponse {
  bulk: Array<{ work?: OrcidWork }>;
}

// --- Transform -------------------------------------------------------------

function mapType(rawType: string | null | undefined): PublicationType {
  switch ((rawType ?? '').toLowerCase()) {
    case 'journal-article':
      return 'journal-article';
    case 'conference-paper':
    case 'conference-abstract':
      return 'conference-paper';
    case 'conference-poster':
    case 'poster':
      return 'poster';
    case 'preprint':
      return 'preprint';
    default:
      return 'other';
  }
}

function extractDoi(
  ids: OrcidExternalIds | null | undefined
): string | undefined {
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
  return dedupeAuthors(
    list
      .filter((c) => {
        const role = c['contributor-attributes']?.['contributor-role'];
        // ORCID often omits the role. Treat missing as author and filter out
        // only the clear non-authors (editors / reviewers / translators).
        if (!role) return true;
        return role.toLowerCase() === 'author';
      })
      .map((c) => c['credit-name']?.value ?? '')
  );
}

function transform(work: OrcidWork): Publication | null {
  const rawTitle = work.title?.title?.value;
  const title = rawTitle ? normaliseText(rawTitle) : '';
  const yearRaw = work['publication-date']?.year?.value?.trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : Number.NaN;

  if (!title) {
    console.warn(
      `  warn: skipping ORCID work put-code=${work['put-code']} (missing title)`
    );
    return null;
  }
  if (!Number.isFinite(year)) {
    console.warn(
      `  warn: skipping ORCID work "${title.slice(0, 60)}" (missing/invalid year)`
    );
    return null;
  }

  const type = mapType(work.type);
  const journalRaw =
    work['journal-title']?.value ?? work['short-description'] ?? '';
  const journal = normaliseText(journalRaw) || undefined;
  const doi = extractDoi(work['external-ids']);

  const pub: Publication = {
    title,
    authors: extractAuthors(work),
    year,
    type,
  };
  if (journal) pub.journal = journal;
  if (doi) pub.doi = doi;
  if (type === 'preprint') pub.isPreprint = true;
  return pub;
}

// --- Fetch -----------------------------------------------------------------

async function orcidFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404)
    throw new Error(`ORCID returned 404 (not found): ${url}`);
  if (!res.ok) {
    throw new Error(
      `ORCID request failed (${res.status} ${res.statusText}): ${url}`
    );
  }
  return (await res.json()) as T;
}

/**
 * Every public work on the given ORCID record, normalised.
 * Throws on network/HTTP failure so the caller can fail the run loudly.
 */
export async function fetchOrcidPublications(
  orcidId: string
): Promise<Publication[]> {
  if (!ORCID_ID_RE.test(orcidId)) {
    throw new Error(
      `Invalid ORCID ID format: "${orcidId}" (expected XXXX-XXXX-XXXX-XXXX)`
    );
  }

  const summary = await orcidFetch<OrcidWorksResponse>(
    `${ORCID_BASE}/${orcidId}/works`
  );
  const putCodes = (summary.group ?? [])
    .map((g) => g['work-summary']?.[0]?.['put-code'])
    .filter((c): c is number => typeof c === 'number');

  if (putCodes.length === 0) {
    console.log('ORCID: no public works on this record');
    return [];
  }

  const works: OrcidWork[] = [];
  for (let i = 0; i < putCodes.length; i += BATCH_SIZE) {
    const slice = putCodes.slice(i, i + BATCH_SIZE);
    const data = await orcidFetch<OrcidBulkResponse>(
      `${ORCID_BASE}/${orcidId}/works/${slice.join(',')}`
    );
    for (const entry of data.bulk ?? []) {
      if (entry.work) works.push(entry.work);
    }
  }

  const pubs = works.map(transform).filter((p): p is Publication => p !== null);
  console.log(`ORCID: ${pubs.length} publications (${orcidId})`);
  return pubs;
}
