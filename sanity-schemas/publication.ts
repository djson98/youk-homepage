import { defineType, defineField } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons';

export const publication = defineType({
  name: 'publication',
  title: '논문 / Publications',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: '논문 제목',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'authors',
      title: '저자',
      description: '저자 한 명씩 추가. 1저자/교신저자 표기는 이름 뒤에 (1st), (corr.) 식으로.',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'journal',
      title: '저널 / 학회',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: '연도',
      type: 'number',
      validation: (r) => r.required().min(1900).max(2100),
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      description: '예: 10.1234/abcd.2024.001',
      type: 'string',
    }),
    defineField({
      name: 'type',
      title: '종류',
      type: 'string',
      options: {
        list: [
          { title: 'Journal Article', value: 'journal-article' },
          { title: 'Conference Paper', value: 'conference-paper' },
          { title: 'Preprint', value: 'preprint' },
          { title: 'Poster', value: 'poster' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'isPreprint',
      title: 'Preprint 여부',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'abstract',
      title: '초록',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'pdf',
      title: 'PDF 파일',
      type: 'file',
      options: { accept: '.pdf' },
    }),
    defineField({
      name: 'slides',
      title: '발표자료 (slides URL)',
      type: 'url',
    }),
    defineField({
      name: 'video',
      title: '영상 URL',
      type: 'url',
    }),
    defineField({
      name: 'awards',
      title: '수상',
      type: 'array',
      of: [{ type: 'string' }],
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
      title: '연도 (최신순)',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', year: 'year', journal: 'journal' },
    prepare({ title, year, journal }) {
      return {
        title,
        subtitle: [year, journal].filter(Boolean).join(' · '),
      };
    },
  },
});
