import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';

export const sanityClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  useCdn: true,
  perspective: 'published',
});

const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

type Entry<T> = { id: string; data: T };

const wrap = <T>(rows: Array<{ _id: string } & T>): Entry<T>[] =>
  rows.map(({ _id, ...rest }) => ({ id: _id, data: rest as unknown as T }));

// ─── publications ──────────────────────────────────────────────
export type PublicationData = {
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  doi?: string;
  type: 'journal-article' | 'conference-paper' | 'preprint' | 'poster' | 'other';
  isPreprint?: boolean;
  abstract?: string;
  pdf?: string;
  slides?: string;
  video?: string;
  awards?: string[];
  tags?: string[];
};

export async function getPublications(): Promise<Entry<PublicationData>[]> {
  const rows = await sanityClient.fetch<Array<{ _id: string } & PublicationData>>(
    `*[_type == "publication"] | order(year desc) {
      _id, title, authors, journal, year, doi, type, isPreprint, abstract,
      pdf, slides, video, awards, tags
    }`
  );
  return wrap(rows);
}

// ─── members ───────────────────────────────────────────────────
export type MemberData = {
  name: string;
  nameKo?: string;
  position: 'professor' | 'phd' | 'ms' | 'undergrad' | 'postdoc' | 'alumni';
  photo?: string;
  email?: string;
  researchFields?: string[];
  graduationInfo?: string;
  googleScholar?: string;
  homepage?: string;
  bio?: string;
  order?: number;
};

export async function getMembers(): Promise<Entry<MemberData>[]> {
  const rows = await sanityClient.fetch<
    Array<
      { _id: string } & Omit<MemberData, 'photo'> & {
          photo?: SanityImageSource;
        }
    >
  >(
    `*[_type == "member"] {
      _id, name, nameKo, position, "photo": photo,
      email, researchFields, graduationInfo, googleScholar, homepage, bio, order
    }`
  );
  return rows.map(({ _id, photo, ...rest }) => ({
    id: _id,
    data: {
      ...rest,
      photo: photo ? urlFor(photo).width(400).height(400).fit('crop').url() : undefined,
    } as MemberData,
  }));
}

// ─── projects ──────────────────────────────────────────────────
export type ProjectData = {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  images?: string[];
  members?: string[];
  tags?: string[];
  relatedPapers?: string[];
  relatedNews?: string[];
};

export async function getProjects(): Promise<Entry<ProjectData>[]> {
  const rows = await sanityClient.fetch<
    Array<{
      _id: string;
      title: string;
      description: string;
      startDate: string;
      endDate?: string;
      images?: SanityImageSource[];
      members?: Array<{ _id: string }>;
      tags?: string[];
      relatedPapers?: Array<{ _id: string }>;
      relatedNews?: Array<{ _id: string }>;
    }>
  >(
    `*[_type == "project"] | order(startDate desc) {
      _id, title, description, startDate, endDate, images,
      "members": members[]->{_id},
      tags,
      "relatedPapers": relatedPapers[]->{_id},
      "relatedNews": relatedNews[]->{_id}
    }`
  );
  return rows.map(({ _id, startDate, endDate, images, members, relatedPapers, relatedNews, ...rest }) => ({
    id: _id,
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      images: images?.map((img) => urlFor(img).width(800).url()),
      members: members?.map((m) => m._id),
      relatedPapers: relatedPapers?.map((p) => p._id),
      relatedNews: relatedNews?.map((n) => n._id),
    } as ProjectData,
  }));
}

// ─── gallery ───────────────────────────────────────────────────
export type GalleryImage = { src: string; caption?: string };
export type GalleryData = {
  title: string;
  date: Date;
  description?: string;
  images: GalleryImage[];
};

export async function getGallery(): Promise<Entry<GalleryData>[]> {
  const rows = await sanityClient.fetch<
    Array<{
      _id: string;
      title: string;
      date: string;
      description?: string;
      images: Array<SanityImageSource & { caption?: string }>;
    }>
  >(
    `*[_type == "gallery"] | order(date desc) {
      _id, title, date, description,
      images[] { ..., caption }
    }`
  );
  return rows.map(({ _id, date, images, ...rest }) => ({
    id: _id,
    data: {
      ...rest,
      date: new Date(date),
      images: images.map((img) => ({
        src: urlFor(img).width(1200).url(),
        caption: img.caption,
      })),
    },
  }));
}

// ─── news ──────────────────────────────────────────────────────
export type NewsData = {
  title: string;
  date: Date;
  summary?: string;
  link?: string;
  tags?: string[];
};

export async function getNews(): Promise<Entry<NewsData>[]> {
  const rows = await sanityClient.fetch<
    Array<{ _id: string; title: string; date: string; summary?: string; link?: string; tags?: string[] }>
  >(
    `*[_type == "news"] | order(date desc) {
      _id, title, date, summary, link, tags
    }`
  );
  return rows.map(({ _id, date, ...rest }) => ({
    id: _id,
    data: { ...rest, date: new Date(date) },
  }));
}

// ─── lectures ──────────────────────────────────────────────────
export type LectureData = {
  courseName: string;
  description?: string;
  semester: string;
  courseType?: string;
  credits?: number;
  schedule?: string;
  room?: string;
  syllabus?: string;
};

export async function getLectures(): Promise<Entry<LectureData>[]> {
  const rows = await sanityClient.fetch<Array<{ _id: string } & LectureData>>(
    `*[_type == "lecture"] | order(semester desc) {
      _id, courseName, description, semester, courseType, credits, schedule, room, syllabus
    }`
  );
  return wrap(rows);
}

// ─── career ────────────────────────────────────────────────────
export type CareerData = {
  role: string;
  organization: string;
  department?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
};

export async function getCareer(): Promise<Entry<CareerData>[]> {
  const rows = await sanityClient.fetch<
    Array<{
      _id: string;
      role: string;
      organization: string;
      department?: string;
      location?: string;
      startDate: string;
      endDate?: string;
    }>
  >(
    `*[_type == "career"] | order(startDate desc) {
      _id, role, organization, department, location, startDate, endDate
    }`
  );
  return rows.map(({ _id, startDate, endDate, ...rest }) => ({
    id: _id,
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    },
  }));
}
