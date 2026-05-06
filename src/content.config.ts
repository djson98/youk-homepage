import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const publications = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publications' }),
  schema: z.object({
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
  }),
});

const members = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/members' }),
  schema: z.object({
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
    photo: z.string().optional(),
    email: z.string().optional(),
    researchFields: z.array(z.string()).optional(),
    graduationInfo: z.string().optional(),
    googleScholar: z.string().optional(),
    homepage: z.string().optional(),
    bio: z.string().optional(),
    order: z.number().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    images: z.array(z.string()).optional(),
    members: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    relatedPapers: z.array(z.string()).optional(),
    relatedNews: z.array(z.string()).optional(),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    images: z.array(
      z.union([
        z.string(),
        z.object({
          src: z.string(),
          caption: z.string().optional(),
        }),
      ])
    ),
  }),
});

const lectures = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lectures' }),
  schema: z.object({
    courseName: z.string(),
    description: z.string().optional(),
    semester: z.string(),
    courseType: z.string().optional(),
    credits: z.number().optional(),
    schedule: z.string().optional(),
    room: z.string().optional(),
    syllabus: z.string().optional(),
  }),
});

const career = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/career' }),
  schema: z.object({
    role: z.string(),
    organization: z.string(),
    department: z.string().optional(),
    location: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  }),
});

export const collections = {
  publications,
  members,
  projects,
  gallery,
  lectures,
  career,
};
