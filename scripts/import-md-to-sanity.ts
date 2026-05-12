/**
 * src/content/(collection)/(slug).md 를 모두 읽어 Sanity로 일괄 createOrReplace.
 * publication은 ORCID에서 자동 생성되므로 제외 (sync-orcid가 따로 처리).
 *
 * 환경변수:
 *   PUBLIC_SANITY_PROJECT_ID, SANITY_WRITE_TOKEN
 *
 * 마크다운 본문은:
 *   - member: bio가 짧으면 frontmatter.bio 유지. 본문 있으면 그걸로 덮어씀.
 *   - news, lecture, project, gallery: 본문이 있으면 description 또는 summary에 넣음.
 *   - career: 본문 없음 (frontmatter만).
 *
 * 사용: bun run scripts/import-md-to-sanity.ts
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('PUBLIC_SANITY_PROJECT_ID와 SANITY_WRITE_TOKEN이 필요합니다');
  process.exit(1);
}

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, 'src/content');

interface Frontmatter {
  [key: string]: unknown;
}

function splitFrontmatter(raw: string): { fm: Frontmatter; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  return {
    fm: (parseYaml(m[1]) as Frontmatter) ?? {},
    body: m[2].trim(),
  };
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

interface SanityDoc {
  _type: string;
  _id: string;
  [key: string]: unknown;
}

function buildMember(slug: string, fm: Frontmatter, body: string): SanityDoc {
  const doc: SanityDoc = {
    _type: 'member',
    _id: `member.${slug}`,
    ...fm,
  };
  if (body.length > 0) {
    doc.bio = body;
  }
  return doc;
}

function buildNews(slug: string, fm: Frontmatter, body: string): SanityDoc {
  const doc: SanityDoc = {
    _type: 'news',
    _id: `news.${slug}`,
    ...fm,
  };
  if (body.length > 0 && !doc.summary) {
    doc.summary = body;
  }
  return doc;
}

function buildLecture(slug: string, fm: Frontmatter, body: string): SanityDoc {
  const doc: SanityDoc = {
    _type: 'lecture',
    _id: `lecture.${slug}`,
    ...fm,
  };
  if (body.length > 0 && !doc.description) {
    doc.description = body;
  }
  return doc;
}

function buildProject(slug: string, fm: Frontmatter, body: string): SanityDoc {
  const doc: SanityDoc = {
    _type: 'project',
    _id: `project.${slug}`,
    ...fm,
  };
  if (body.length > 0 && !doc.description) {
    doc.description = body;
  }
  // members/relatedPapers/relatedNews는 reference 배열 — md엔 안 들어 있어 무시
  delete doc.members;
  delete doc.relatedPapers;
  delete doc.relatedNews;
  return doc;
}

function buildCareer(slug: string, fm: Frontmatter): SanityDoc {
  return {
    _type: 'career',
    _id: `career.${slug}`,
    ...fm,
  };
}

function buildGallery(slug: string, fm: Frontmatter): SanityDoc {
  return {
    _type: 'gallery',
    _id: `gallery.${slug}`,
    ...fm,
  };
}

const COLLECTIONS: Array<{
  dir: string;
  builder: (slug: string, fm: Frontmatter, body: string) => SanityDoc;
}> = [
  { dir: 'members', builder: buildMember },
  { dir: 'news', builder: buildNews },
  { dir: 'lectures', builder: buildLecture },
  { dir: 'projects', builder: buildProject },
  { dir: 'career', builder: buildCareer },
  { dir: 'gallery', builder: buildGallery },
];

const allDocs: SanityDoc[] = [];

for (const { dir, builder } of COLLECTIONS) {
  const collectionDir = join(CONTENT_DIR, dir);
  let files: string[] = [];
  try {
    files = (await readdir(collectionDir)).filter((f) => f.endsWith('.md'));
  } catch {
    continue;
  }
  for (const file of files) {
    const raw = await readFile(join(collectionDir, file), 'utf-8');
    const { fm, body } = splitFrontmatter(raw);
    const slug = slugFromFilename(file);
    const doc = builder(slug, fm, body);
    // strip undefined
    const clean = Object.fromEntries(
      Object.entries(doc).filter(([, v]) => v !== undefined && v !== null)
    ) as SanityDoc;
    allDocs.push(clean);
  }
  console.log(`  ${dir}: ${files.length}개 발견`);
}

console.log(`총 ${allDocs.length}개 도큐먼트를 Sanity로 보냅니다...`);

const mutations = allDocs.map((d) => ({ createOrReplace: d }));
const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ mutations }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, (await res.text()).slice(0, 1000));
  process.exit(1);
}

const body = (await res.json()) as {
  transactionId: string;
  results: Array<{ operation: string }>;
};
const counts = body.results.reduce<Record<string, number>>((acc, r) => {
  acc[r.operation] = (acc[r.operation] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `✓ ${allDocs.length}개 mutation 완료 (transaction ${body.transactionId})`
);
console.log('operations:', counts);
