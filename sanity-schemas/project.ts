import { defineType, defineField } from 'sanity';
import { RocketIcon } from '@sanity/icons';

export const project = defineType({
  name: 'project',
  title: '프로젝트 / Projects',
  type: 'document',
  icon: RocketIcon,
  fields: [
    defineField({
      name: 'title',
      title: '프로젝트명',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: '설명',
      type: 'text',
      rows: 4,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'startDate',
      title: '시작일',
      type: 'date',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'endDate',
      title: '종료일',
      description: '진행 중이면 비워두기',
      type: 'date',
    }),
    defineField({
      name: 'images',
      title: '이미지',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'members',
      title: '참여 멤버',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'member' }] }],
    }),
    defineField({
      name: 'tags',
      title: '태그',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'relatedPapers',
      title: '관련 논문',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'publication' }] }],
    }),
    defineField({
      name: 'relatedNews',
      title: '관련 뉴스',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'news' }] }],
    }),
  ],
  orderings: [
    {
      title: '시작일 (최신순)',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', startDate: 'startDate', media: 'images.0' },
    prepare({ title, startDate, media }) {
      return { title, subtitle: startDate, media };
    },
  },
});
