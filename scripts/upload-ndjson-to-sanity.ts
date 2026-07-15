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
 *
 * 고아 문서 정리: _id가 `publication.`으로 시작하는데 이번 NDJSON에 없는 문서는
 * 삭제한다. 논문 제목이 바뀌어 슬러그(=_id)가 달라지거나 소스에서 논문이 빠지면
 * 옛 문서가 남아 사이트에 중복으로 뜨기 때문. 이 접두사는 자동 생성 문서의
 * 네임스페이스라, Studio에서 직접 만든 문서(랜덤 _id)는 건드리지 않는다.
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

const base = `https://${projectId}.api.sanity.io/v2024-01-01/data`;
const authHeaders = { Authorization: `Bearer ${token}` };

// 자동 생성된 기존 문서를 먼저 조회해 이번 업로드에 없는 것을 골라낸다.
const groq =
  '*[_type == "publication" && string::startsWith(_id, "publication.")]._id';
const queryRes = await fetch(
  `${base}/query/${dataset}?query=${encodeURIComponent(groq)}`,
  {
    headers: authHeaders,
  }
);
if (!queryRes.ok) {
  console.error(`Sanity query failed: HTTP ${queryRes.status}`);
  console.error((await queryRes.text()).slice(0, 1000));
  process.exit(1);
}
const existingIds =
  ((await queryRes.json()) as { result: string[] }).result ?? [];

const incomingIds = new Set(docs.map((d) => d._id));
const orphanIds = existingIds.filter((id) => !incomingIds.has(id));

const mutations = [
  ...docs.map((d) => ({ createOrReplace: d })),
  ...orphanIds.map((id) => ({ delete: { id } })),
];

const res = await fetch(`${base}/mutate/${dataset}`, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
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
  `uploaded ${docs.length} documents` +
    (orphanIds.length > 0
      ? `, deleted ${orphanIds.length} orphaned (${orphanIds.join(', ')})`
      : '') +
    ` (transaction ${body.transactionId})`
);
console.log('operations:', counts);
