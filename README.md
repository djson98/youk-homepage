# youk-homepage

강원대학교 의과대학 진단검사의학과 육희정 교수님 연구실 홈페이지.
첫 인스턴스 겸 의대 교수 홈페이지 템플릿. 코드와 콘텐츠를 분리해 두어,
다음 인스턴스는 `src/config/site.config.ts` + `/src/content/`만 갈아끼우면 된다.

## Quick start

```bash
bun install
bun dev
```

빌드:

```bash
bun run build
bun run preview
```

## 다른 교수님께 템플릿으로 재사용

1. 이 저장소를 복제 (`git clone` 또는 `degit`).
2. `src/config/site.config.ts`의 PLACEHOLDER 값을 새 교수님 정보로 교체.
3. `src/content/`의 마크다운 파일을 모두 비우고 새로 채워넣기.
   - `members/`, `projects/`, `news/`, `lectures/`, `career/`
4. `orcidId`와 `pubmedQuery`를 채운 뒤 `bun run fetch-publications`로
   publications 자동 수집.
5. `bun run build`로 검증.

## Stack

- [Astro 5](https://astro.build) + TypeScript (strict)
- [Tailwind CSS 4](https://tailwindcss.com) (Vite plugin)
- `@astrojs/mdx` — 마크다운 + 컴포넌트
- `@astrojs/sitemap` — sitemap 자동 생성
- `@astrojs/react` — React islands (필요 시)
- Astro Content Collections (zod 검증)

## 폴더 구조

```
src/
  config/site.config.ts   교수/연구실 메타데이터 단일 출처
  content.config.ts       콘텐츠 컬렉션 zod 스키마
  content/                마크다운 콘텐츠 (publications/members/...)
  layouts/                BaseLayout
  components/             공용 컴포넌트
  pages/                  라우트
  styles/global.css       Tailwind + CSS 변수
scripts/
  fetch-publications.ts   ORCID + PubMed에서 publications 수집 (빌드 전)
  sources/orcid.ts        ORCID 소스
  sources/pubmed.ts       PubMed 소스 (Europe PMC API)
  lib/publications.ts     공용 모델 · 병합 규칙 · 마크다운 생성
```

## Publications 자동 업데이트

논문 목록은 **매일 03:00(KST)** `.github/workflows/update-publications.yml`이
자동으로 갱신한다. 손댈 일은 없고, 급하면 Actions 탭에서 `Update publications`를
**Run workflow**로 즉시 돌릴 수 있다.

동작 순서 — 사이트는 빌드 시점에 Sanity를 읽어 정적 페이지를 굽기 때문에 순서가 중요하다:

1. ORCID + PubMed에서 논문을 모아 `src/content/publications/*.md` 생성
2. md → NDJSON → **Sanity 업로드** (사라진 논문 문서도 정리)
3. md 변경분 커밋·푸시 → Cloudflare Pages가 리빌드하며 새 Sanity 데이터 반영

필요한 GitHub secret은 `SANITY_WRITE_TOKEN` 하나다 (editor 이상 권한).

### 소스가 ORCID + PubMed인 이유

두 소스는 서로의 구멍을 메운다. ORCID에는 PubMed에 색인되지 않는 국내 학회지
(JLMQA, 대한수혈학회지 등)가 있고, PubMed에는 ORCID 등록이 누락된 논문이 있다.
필드도 골라서 쓴다 — 제목·학술지명은 ORCID(저자가 직접 정리한 값), 저자 목록은
PubMed(전체 이름이 온전함)를 우선한다.

**Google Scholar와 ResearchGate는 쓰지 않는다.** 공개 API가 없고 이용약관이
자동 수집을 금지하며, 봇 차단 때문에 CI에서 동작하지도 않는다. 확인 결과 두
곳에 있는 논문은 ORCID + PubMed 조합으로 모두 커버된다.

### 동명이인 논문이 섞여 들어올 때

`src/config/site.config.ts`의 `professor.pubmedExcludePmids`에 PMID를 넣으면
제외된다. `pubmedQuery`(Europe PMC 쿼리 문법)를 좁히는 것도 방법이다.

## 섹션 토글

`src/config/site.config.ts`의 `sections` 객체에서 각 섹션을 `false`로 두면
네비게이션에서 자동으로 숨겨진다.
