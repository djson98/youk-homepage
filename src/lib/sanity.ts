import { createClient, type SanityClient } from '@sanity/client';
import {
  createImageUrlBuilder,
  type SanityImageSource,
} from '@sanity/image-url';
import { z } from 'zod';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = import.meta.env.SANITY_READ_TOKEN;

export const sanityClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  useCdn: true,
  perspective: 'published',
  token,
});

const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

type Entry<T> = { id: string; data: T };

/**
 * 검증된 데이터를 표준 Entry<T> 형태로 감싼다.
 * Sanity의 _id 필드를 id로 옮기고 나머지는 data로 둔다.
 */
function wrapValidated<T>(rows: Array<{ _id: string } & T>): Entry<T>[] {
  return rows.map(({ _id, ...rest }) => ({ id: _id, data: rest as T }));
}

/**
 * zod safeParse 결과를 보고 잘못된 데이터일 때 어떤 컬렉션의
 * 어떤 _id가 어떤 필드에서 실패했는지 명확히 던진다.
 */
function parseOrThrow<T>(
  collection: string,
  schema: z.ZodType<T>,
  raw: unknown,
  rawId?: string
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  const idHint = rawId ? ` (_id="${rawId}")` : '';
  throw new Error(`[sanity:${collection}] zod 검증 실패${idHint}\n${issues}`);
}

/** 배열 응답을 행 단위로 검증해서 깨진 _id를 정확히 알려주는 헬퍼. */
function parseRows<T>(
  collection: string,
  rowSchema: z.ZodType<T>,
  rows: unknown[]
): T[] {
  return rows.map((row) => {
    const id =
      row && typeof row === 'object' && '_id' in row
        ? String((row as { _id: unknown })._id)
        : undefined;
    return parseOrThrow(collection, rowSchema, row, id);
  });
}

/**
 * Sanity는 비어있는 optional 필드를 null로 반환한다.
 * 객체에서 null 값을 모두 제거(undefined 처리)해서 zod의 .optional()과 매칭시킨다.
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null) out[k] = v;
  }
  return out as T;
}

// ─── publications ──────────────────────────────────────────────
export const publicationSchema = z.object({
  _id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  journal: z.string().optional(),
  year: z.number(),
  doi: z.string().optional(),
  type: z.enum([
    'journal-article',
    'conference-paper',
    'preprint',
    'poster',
    'other',
  ]),
  isPreprint: z.boolean().optional(),
  abstract: z.string().optional(),
  pdf: z.string().optional(),
  slides: z.string().optional(),
  video: z.string().optional(),
  awards: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});
export type PublicationData = Omit<z.infer<typeof publicationSchema>, '_id'>;

export async function getPublications(): Promise<Entry<PublicationData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "publication"] | order(year desc) {
      _id, title, authors, journal, year, doi, type, isPreprint, abstract,
      pdf, slides, video, awards, tags
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rows = parseRows('publication', publicationSchema, cleaned);
  return wrapValidated(rows);
}

// ─── members ───────────────────────────────────────────────────
const memberRawSchema = z.object({
  _id: z.string(),
  name: z.string(),
  nameKo: z.string().optional(),
  position: z.enum([
    'professor',
    'phd',
    'ms',
    'undergrad',
    'postdoc',
    'alumni',
  ]),
  photo: z.unknown().optional(),
  email: z.string().optional(),
  researchFields: z.array(z.string()).optional(),
  graduationInfo: z.string().optional(),
  googleScholar: z.string().optional(),
  homepage: z.string().optional(),
  bio: z.string().optional(),
  order: z.number().optional(),
});

export const memberSchema = memberRawSchema
  .omit({ photo: true })
  // photo는 Sanity가 만든 CDN URL이거나, Studio에서 박아넣은 로컬 경로(/images/...)
  // 둘 다 받을 수 있게 일반 string으로 둔다.
  .extend({ photo: z.string().optional() });

export type MemberData = Omit<z.infer<typeof memberSchema>, '_id'>;

export async function getMembers(): Promise<Entry<MemberData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "member"] {
      _id, name, nameKo, position, "photo": photo,
      email, researchFields, graduationInfo, googleScholar, homepage, bio, order
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rawRows = parseRows('member', memberRawSchema, cleaned);
  const transformed = rawRows.map((row) => {
    const { photo, ...rest } = row;
    // photo가 Sanity asset(객체)이면 urlFor로 변환,
    // 이미 URL/경로 문자열이면 그대로 사용 (Studio에서 잘못 박아넣은 경우 대비).
    let photoUrl: string | undefined;
    if (typeof photo === 'string') {
      photoUrl = photo;
    } else if (photo && typeof photo === 'object') {
      photoUrl = urlFor(photo as SanityImageSource)
        .width(400)
        .height(400)
        .fit('crop')
        .url();
    }
    return {
      ...rest,
      photo: photoUrl,
    };
  });
  // 변환 후 최종 형태도 한 번 더 검증해서 URL 변환이 깨지지 않았는지 확인
  const validated = parseRows('member', memberSchema, transformed);
  return wrapValidated(validated);
}

// ─── projects ──────────────────────────────────────────────────
const projectRawSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  images: z.array(z.unknown()).optional(),
  members: z.array(z.object({ _id: z.string() })).optional(),
  tags: z.array(z.string()).optional(),
  relatedPapers: z.array(z.object({ _id: z.string() })).optional(),
  relatedNews: z.array(z.object({ _id: z.string() })).optional(),
});

export const projectSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.date(),
  endDate: z.date().optional(),
  images: z.array(z.url()).optional(),
  members: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  relatedPapers: z.array(z.string()).optional(),
  relatedNews: z.array(z.string()).optional(),
});

export type ProjectData = Omit<z.infer<typeof projectSchema>, '_id'>;

export async function getProjects(): Promise<Entry<ProjectData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "project"] | order(startDate desc) {
      _id, title, description, startDate, endDate, images,
      "members": members[]->{_id},
      tags,
      "relatedPapers": relatedPapers[]->{_id},
      "relatedNews": relatedNews[]->{_id}
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rawRows = parseRows('project', projectRawSchema, cleaned);
  const transformed = rawRows.map((row) => {
    const {
      _id,
      startDate,
      endDate,
      images,
      members,
      relatedPapers,
      relatedNews,
      ...rest
    } = row;
    return {
      _id,
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      images: images?.map((img) =>
        urlFor(img as SanityImageSource)
          .width(800)
          .url()
      ),
      members: members?.map((m) => m._id),
      relatedPapers: relatedPapers?.map((p) => p._id),
      relatedNews: relatedNews?.map((n) => n._id),
    };
  });
  const validated = parseRows('project', projectSchema, transformed);
  return wrapValidated(validated);
}

// ─── gallery ───────────────────────────────────────────────────
export const galleryImageSchema = z.object({
  src: z.url(),
  caption: z.string().optional(),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

const galleryRawSchema = z.object({
  _id: z.string(),
  title: z.string(),
  date: z.string(),
  description: z.string().optional(),
  images: z.array(z.unknown()),
});

export const gallerySchema = z.object({
  _id: z.string(),
  title: z.string(),
  date: z.date(),
  description: z.string().optional(),
  images: z.array(galleryImageSchema),
});

export type GalleryData = Omit<z.infer<typeof gallerySchema>, '_id'>;

export async function getGallery(): Promise<Entry<GalleryData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "gallery"] | order(date desc) {
      _id, title, date, description,
      images[] { ..., caption }
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rawRows = parseRows('gallery', galleryRawSchema, cleaned);
  const transformed = rawRows.map((row) => {
    const { _id, date, images, ...rest } = row;
    return {
      _id,
      ...rest,
      date: new Date(date),
      images: images.map((img) => {
        const imgObj = img as SanityImageSource & { caption?: string | null };
        return {
          src: urlFor(imgObj).width(1200).url(),
          // 캡션을 비워두면 Sanity가 null을 준다. stripNulls는 최상위만
          // 훑으므로 배열 안쪽은 여기서 undefined로 눌러줘야 zod를 통과한다.
          caption:
            typeof imgObj === 'object' && imgObj !== null && 'caption' in imgObj
              ? (imgObj.caption ?? undefined)
              : undefined,
        };
      }),
    };
  });
  const validated = parseRows('gallery', gallerySchema, transformed);
  return wrapValidated(validated);
}

// ─── news ──────────────────────────────────────────────────────
const newsRawSchema = z.object({
  _id: z.string(),
  title: z.string(),
  date: z.string(),
  summary: z.string().optional(),
  link: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const newsSchema = z.object({
  _id: z.string(),
  title: z.string(),
  date: z.date(),
  summary: z.string().optional(),
  link: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type NewsData = Omit<z.infer<typeof newsSchema>, '_id'>;

export async function getNews(): Promise<Entry<NewsData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "news"] | order(date desc) {
      _id, title, date, summary, link, tags
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rawRows = parseRows('news', newsRawSchema, cleaned);
  const transformed = rawRows.map((row) => ({
    ...row,
    date: new Date(row.date),
  }));
  const validated = parseRows('news', newsSchema, transformed);
  return wrapValidated(validated);
}

// ─── lectures ──────────────────────────────────────────────────
export const lectureSchema = z.object({
  _id: z.string(),
  courseName: z.string(),
  description: z.string().optional(),
  semester: z.string(),
  courseType: z.string().optional(),
  credits: z.number().optional(),
  schedule: z.string().optional(),
  room: z.string().optional(),
  syllabus: z.string().optional(),
});

export type LectureData = Omit<z.infer<typeof lectureSchema>, '_id'>;

export async function getLectures(): Promise<Entry<LectureData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "lecture"] | order(semester desc) {
      _id, courseName, description, semester, courseType, credits, schedule, room, syllabus
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rows = parseRows('lecture', lectureSchema, cleaned);
  return wrapValidated(rows);
}

// ─── career ────────────────────────────────────────────────────
const careerRawSchema = z.object({
  _id: z.string(),
  role: z.string(),
  organization: z.string(),
  department: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export const careerSchema = z.object({
  _id: z.string(),
  role: z.string(),
  organization: z.string(),
  department: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export type CareerData = Omit<z.infer<typeof careerSchema>, '_id'>;

export async function getCareer(): Promise<Entry<CareerData>[]> {
  const raw = await sanityClient.fetch<unknown[]>(
    `*[_type == "career"] | order(startDate desc) {
      _id, role, organization, department, location, startDate, endDate
    }`
  );
  const cleaned = (raw as unknown[]).map((r) =>
    stripNulls(r as Record<string, unknown>)
  );
  const rawRows = parseRows('career', careerRawSchema, cleaned);
  const transformed = rawRows.map((row) => ({
    ...row,
    startDate: new Date(row.startDate),
    endDate: row.endDate ? new Date(row.endDate) : undefined,
  }));
  const validated = parseRows('career', careerSchema, transformed);
  return wrapValidated(validated);
}

// ─── homePage / 히어로 (싱글턴) ────────────────────────────────
// 문서 하나뿐이라 Entry<T>로 감싸지 않고 그대로 반환한다.
// 아직 만들지 않았거나 publish 전이면 null → 컴포넌트가 site.config로 폴백.
// 필드명은 스튜디오에서 이미 발행된 문서(heroImage/heroImageAlt)를 따른다.
const heroRawSchema = z.object({
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  heroImage: z.unknown().optional(),
  heroImageAlt: z.string().optional(),
  // hotspot을 실제로 조절한 이미지에만 붙는다.
  focal: z.object({ x: z.number(), y: z.number() }).optional(),
  overlay: z.number().optional(),
  align: z.enum(['left', 'center']).optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

export interface HeroData {
  headline?: string;
  subheadline?: string;
  keywords?: string[];
  /** 데스크톱용 배경 URL (2000w). 사진을 안 올렸으면 undefined. */
  backgroundUrl?: string;
  /** 모바일용 배경 URL (1000w). srcset에 쓴다. */
  backgroundUrlSm?: string;
  backgroundAlt?: string;
  /** hotspot을 CSS object-position으로 옮긴 값. 예: '50% 35%' */
  objectPosition: string;
  /** 사진을 덮는 검은 레이어 불투명도 0~0.9 */
  overlayOpacity: number;
  align: 'left' | 'center';
  ctaLabel?: string;
  ctaHref?: string;
}

export async function getHero(): Promise<HeroData | null> {
  const raw = await sanityClient.fetch<unknown>(
    `*[_id == "homePage"][0] {
      headline, subheadline, keywords, heroImage, heroImageAlt,
      "focal": heroImage.hotspot { x, y },
      overlay, align, ctaLabel, ctaHref
    }`
  );
  if (!raw || typeof raw !== 'object') return null;

  const cleaned = stripNulls(raw as Record<string, unknown>);
  const row = parseOrThrow('homePage', heroRawSchema, cleaned, 'homePage');

  const { heroImage, heroImageAlt, focal, overlay, align, ...rest } = row;

  // 원본 비율 그대로 두고 CSS object-cover로 자른다.
  // 히어로 높이가 뷰포트마다 달라져서 서버 크롭보다 이쪽이 안전하다.
  let backgroundUrl: string | undefined;
  let backgroundUrlSm: string | undefined;
  if (heroImage && typeof heroImage === 'object') {
    const img = urlFor(heroImage as SanityImageSource).auto('format');
    backgroundUrl = img.width(2000).quality(75).url();
    backgroundUrlSm = img.width(1000).quality(70).url();
  }

  return {
    ...rest,
    backgroundUrl,
    backgroundUrlSm,
    backgroundAlt: heroImageAlt,
    objectPosition: focal
      ? `${(focal.x * 100).toFixed(1)}% ${(focal.y * 100).toFixed(1)}%`
      : '50% 50%',
    // 스튜디오는 0~90(%)으로 받고 CSS에는 0~0.9로 넘긴다.
    overlayOpacity: Math.min(Math.max(overlay ?? 45, 0), 90) / 100,
    align: align ?? 'left',
  };
}
