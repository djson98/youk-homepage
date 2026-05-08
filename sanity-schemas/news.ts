import { defineType, defineField } from 'sanity';
import { BellIcon } from '@sanity/icons';

export const news = defineType({
  name: 'news',
  title: '소식 / News',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'title',
      title: '제목',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'date',
      title: '날짜',
      type: 'date',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      title: '요약',
      description: '홈 화면에 짧게 노출됨',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'link',
      title: '관련 링크',
      type: 'url',
    }),
    defineField({
      name: 'tags',
      title: '태그',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
  ],
  orderings: [
    {
      title: '날짜 (최신순)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', date: 'date' },
    prepare({ title, date }) {
      return { title, subtitle: date };
    },
  },
});
