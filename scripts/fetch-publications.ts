/**
 * fetch-publications.ts
 *
 * Collects the professor's publications from every configured source and
 * writes one Markdown file per publication into src/content/publications/.
 *
 * Sources (see scripts/sources/):
 *   - ORCID   — the curated record; best titles, journal names, years.
 *   - PubMed  — via Europe PMC; complete author lists, abstracts, and the
 *               papers that never made it onto the ORCID record.
 *
 * Google Scholar and ResearchGate are deliberately absent: neither offers a
 * public API and both forbid automated collection in their terms of use.
 * Between ORCID and PubMed the coverage is equivalent for this record.
 *
 * Configured from src/config/site.config.ts (`professor.orcidId`,
 * `professor.pubmedQuery`, `professor.pubmedExcludePmids`), with a
 * `--orcid=XXXX-XXXX-XXXX-XXXX` CLI override for one-off runs.
 *
 * Wired via package.json: `prebuild` -> `bun run fetch-publications`, and run
 * daily by .github/workflows/update-publications.yml.
 *
 * Behaviour:
 *   - No source configured   -> log + exit 0 (never fail the build).
 *   - A configured source errors -> exit 1 (fail loudly rather than silently
 *     publishing a truncated list).
 *   - Stale entries are removed: the directory is wiped (except .gitkeep)
 *     before writing, keeping the sources the single source of truth.
 */

import siteConfig from '../src/config/site.config';
import {
  clearPublicationsDir,
  mergeSources,
  PUBLICATIONS_DIR,
  writePublications,
  type Publication,
} from './lib/publications';
import { fetchOrcidPublications } from './sources/orcid';
import { fetchPubmedPublications } from './sources/pubmed';

import { readdir } from 'node:fs/promises';

function parseCliOrcid(argv: string[]): string | undefined {
  const flag = argv.find((a) => a.startsWith('--orcid='));
  return flag?.slice('--orcid='.length).trim() || undefined;
}

async function main(): Promise<void> {
  const { professor } = siteConfig;
  const orcidId = (
    parseCliOrcid(process.argv.slice(2)) ??
    professor.orcidId ??
    ''
  ).trim();
  const pubmedQuery = (professor.pubmedQuery ?? '').trim();

  if (!orcidId && !pubmedQuery) {
    console.log(
      'Neither orcidId nor pubmedQuery configured — skipping publication fetch'
    );
    return;
  }

  const orcid: Publication[] = orcidId
    ? await fetchOrcidPublications(orcidId)
    : [];
  const pubmed: Publication[] = pubmedQuery
    ? await fetchPubmedPublications(
        pubmedQuery,
        professor.pubmedExcludePmids ?? []
      )
    : [];

  const publications = mergeSources({ orcid, pubmed });
  const overlap = orcid.length + pubmed.length - publications.length;
  console.log(
    `Merged into ${publications.length} unique publications (${overlap} matched across sources)`
  );

  await clearPublicationsDir();
  const written = await writePublications(publications);

  // Re-read the directory: a silent mismatch here would mean a slug collision
  // dropped a paper from the site.
  const onDisk = (await readdir(PUBLICATIONS_DIR)).filter((n) =>
    n.endsWith('.md')
  );
  if (onDisk.length !== publications.length) {
    throw new Error(
      `expected ${publications.length} .md files, found ${onDisk.length} in ${PUBLICATIONS_DIR}`
    );
  }

  console.log(
    `Wrote ${written.length} publication markdown files to src/content/publications/`
  );
}

main().catch((err) => {
  console.error('fetch-publications failed:', (err as Error).message);
  process.exit(1);
});
