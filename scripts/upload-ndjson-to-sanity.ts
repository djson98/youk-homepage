/**
 * publications.ndjson을 Sanity Mutation API로 createOrReplace.
 * 환경변수:
 *   PUBLIC_SANITY_PROJECT_ID  (필수, .env 또는 GH Actions env)
 *   PUBLIC_SANITY_DATASET     (기본: production)
 *   SANITY_WRITE_TOKEN        (필수, editor 이상 권한)
 *
 * 멱등: 같은 _id 도큐먼트는 createOrReplace로 갱신, 신규는 생성.
 * 호출: bun run scripts/upload-ndjson-to-sanity.ts [path/to/file.ndjson]
 *       (path 생략 시 ./publications.ndjson)
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId) {
  console.error('PUBLIC_SANITY_PROJECT_ID is required');
  process.exit(1);
}
if (!token) {
  console.error('SANITY_WRITE_TOKEN is required');
  process.exit(1);
}

const ndjsonPath = resolve(process.argv[2] ?? './publications.ndjson');
const raw = await readFile(ndjsonPath, 'utf-8');

const docs = raw
  .split('\n')
  .filter((l) => l.trim().length > 0)
  .map((l) => JSON.parse(l) as { _id: string; _type: string });

if (docs.length === 0) {
  console.log('no documents to upload');
  process.exit(0);
}

const mutations = docs.map((d) => ({ createOrReplace: d }));

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
  const body = await res.text();
  console.error(`Sanity mutate failed: HTTP ${res.status}`);
  console.error(body.slice(0, 1000));
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
  `uploaded ${docs.length} documents (transaction ${body.transactionId})`
);
console.log('operations:', counts);
