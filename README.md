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
4. `orcidId`를 채운 뒤 `bun run fetch-orcid`로 publications 자동 수집.
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
  fetch-orcid.ts          ORCID에서 publications 자동 수집 (빌드 전)
```

## 섹션 토글

`src/config/site.config.ts`의 `sections` 객체에서 각 섹션을 `false`로 두면
네비게이션에서 자동으로 숨겨진다.
