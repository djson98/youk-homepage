/**
 * pubmed.ts
 *
 * Fetches MEDLINE/PubMed records via the Europe PMC REST API.
 *
 * Why Europe PMC rather than NCBI E-utilities: E-utilities only returns full
 * author forenames as XML, which would mean pulling an XML parser into the
 * build. Europe PMC serves the same MEDLINE records (`SRC:MED`) as JSON,
 * including per-author `firstName`/`lastName`, so the fetcher stays
 * dependency-free.
 *
 * PubMed is the reason this pipeline exists: it carries papers that never made
 * it onto the ORCID record. It is also the better source for author lists.
 *
 * Abstracts are deliberately not collected. Nothing renders `abstract` (it
 * exists in the schema only), and Europe PMC returns abstract bodies with
 * inline markup mixed with unescaped comparison operators ("p < 0.05"), which
 * cannot be stripped reliably.
 *
 * Docs: https://europepmc.org/RestfulWebService
 */

import {
  dedupeAuthors,
  normaliseText,
  stripTrailingPeriod,
  type Publication,
  type PublicationType,
} from '../lib/publications';

const EUROPEPMC_SEARCH =
  'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const PAGE_SIZE = 100;
// Guard against a malformed query matching a whole journal.
const MAX_RESULTS = 500;

// --- API types (only the fields we actually consume) -----------------------

interface EpmcAuthor {
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

interface EpmcResult {
  id?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  pubYear?: string;
  authorList?: { author?: EpmcAuthor | EpmcAuthor[] };
  pubTypeList?: { pubType?: string | string[] };
  journalInfo?: { journal?: { title?: string; medlineAbbreviation?: string } };
}

interface EpmcSearchResponse {
  hitCount?: number;
  nextCursorMark?: string;
  resultList?: { result?: EpmcResult[] };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// --- Transform -------------------------------------------------------------

/**
 * MEDLINE journal titles carry the society subtitle after " : ", e.g.
 * "Transfusion and apheresis science : official journal of the World Apheresis
 * Association ...". Keep the leading title only.
 */
function cleanJournal(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const title = normaliseText(raw).split(' : ')[0];
  return title || undefined;
}

/** Prefer the spelled-out name ("Hee-Jeong Youk") over MEDLINE's "Youk HJ". */
function authorName(a: EpmcAuthor): string {
  const first = a.firstName?.trim();
  const last = a.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  return (a.fullName ?? last ?? '').trim();
}

function mapType(pubTypes: string[]): PublicationType {
  const types = pubTypes.map((t) => t.toLowerCase());
  if (types.includes('preprint')) return 'preprint';
  if (types.some((t) => t.includes('journal article') || t === 'letter')) {
    return 'journal-article';
  }
  if (types.some((t) => t.includes('review') || t.includes('case reports'))) {
    return 'journal-article';
  }
  return 'other';
}

function transform(r: EpmcResult): Publication | null {
  const rawTitle = r.title ? stripTrailingPeriod(normaliseText(r.title)) : '';
  const year = r.pubYear ? Number.parseInt(r.pubYear, 10) : Number.NaN;

  if (!rawTitle) {
    console.warn(`  warn: skipping PubMed record ${r.pmid ?? r.id} (no title)`);
    return null;
  }
  if (!Number.isFinite(year)) {
    console.warn(
      `  warn: skipping PubMed "${rawTitle.slice(0, 60)}" (missing/invalid year)`
    );
    return null;
  }

  const type = mapType(toArray(r.pubTypeList?.pubType));
  const journal = cleanJournal(
    r.journalInfo?.journal?.title ?? r.journalInfo?.journal?.medlineAbbreviation
  );
  const doi = r.doi?.trim();

  const pub: Publication = {
    title: rawTitle,
    authors: dedupeAuthors(toArray(r.authorList?.author).map(authorName)),
    year,
    type,
  };
  if (journal) pub.journal = journal;
  if (doi) pub.doi = doi;
  if (type === 'preprint') pub.isPreprint = true;
  return pub;
}

// --- Fetch -----------------------------------------------------------------

/**
 * Every MEDLINE record matching `query`, normalised.
 *
 * @param query   Europe PMC query, e.g. `AUTH:"Youk HJ"`. `SRC:MED` is added
 *                so only PubMed-indexed records come back.
 * @param exclude PMIDs to drop — the escape hatch for same-name authors.
 */
export async function fetchPubmedPublications(
  query: string,
  exclude: string[] = []
): Promise<Publication[]> {
  const excluded = new Set(exclude.map((p) => p.trim()).filter(Boolean));
  const results: EpmcResult[] = [];
  let cursorMark = '*';

  for (;;) {
    const url =
      `${EUROPEPMC_SEARCH}?query=${encodeURIComponent(`${query} AND SRC:MED`)}` +
      `&format=json&resultType=core&pageSize=${PAGE_SIZE}` +
      `&cursorMark=${encodeURIComponent(cursorMark)}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(
        `Europe PMC request failed (${res.status} ${res.statusText}): ${url}`
      );
    }
    const data = (await res.json()) as EpmcSearchResponse;
    const page = data.resultList?.result ?? [];
    results.push(...page);

    const next = data.nextCursorMark;
    if (!next || next === cursorMark || page.length === 0) break;
    if (results.length >= MAX_RESULTS) {
      console.warn(
        `  warn: PubMed query returned >${MAX_RESULTS} records — check the query in site.config.ts`
      );
      break;
    }
    cursorMark = next;
  }

  const kept = results.filter((r) => !(r.pmid && excluded.has(r.pmid)));
  const skipped = results.length - kept.length;
  const pubs = kept.map(transform).filter((p): p is Publication => p !== null);

  console.log(
    `PubMed: ${pubs.length} publications (${query})` +
      (skipped > 0 ? ` — ${skipped} excluded by PMID` : '')
  );
  return pubs;
}
