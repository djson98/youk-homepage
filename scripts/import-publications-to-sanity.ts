/**
 * One-shot: convert src/content/publications/*.md → NDJSON for Sanity import.
 * After running, pipe the output to `sanity dataset import - production`.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..."
// which join() then turns into an unusable "\C:\...".
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUB_DIR = join(ROOT, 'src/content/publications');
const OUT = join(ROOT, 'publications.ndjson');

type Frontmatter = {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  type: string;
  isPreprint?: boolean;
  abstract?: string;
};

function extractFrontmatter(raw: string): Frontmatter | null {
  // \r?\n: git checks these files out with CRLF on Windows (core.autocrlf),
  // and an LF-only pattern silently matches nothing there.
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return parseYaml(match[1]) as Frontmatter;
}

const files = (await readdir(PUB_DIR)).filter((f) => f.endsWith('.md'));
const lines: string[] = [];

for (const file of files) {
  const raw = await readFile(join(PUB_DIR, file), 'utf-8');
  const fm = extractFrontmatter(raw);
  if (!fm) {
    console.warn(`skip (no frontmatter): ${file}`);
    continue;
  }
  // Dedupe authors (some markdown has duplicates from ORCID)
  const authors = [...new Set(fm.authors)];

  const doc = {
    _type: 'publication',
    _id: `publication.${file.replace(/\.md$/, '')}`,
    title: fm.title,
    authors,
    journal: fm.journal,
    year: fm.year,
    doi: fm.doi,
    type: fm.type,
    isPreprint: fm.isPreprint,
    abstract: fm.abstract,
  };
  // strip undefined
  const clean = Object.fromEntries(
    Object.entries(doc).filter(([, v]) => v !== undefined)
  );
  lines.push(JSON.stringify(clean));
}

await writeFile(OUT, lines.join('\n') + '\n');
console.log(`wrote ${lines.length} publications → ${OUT}`);
