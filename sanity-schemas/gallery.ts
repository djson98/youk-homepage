import { defineType, defineField } from 'sanity';
import { ImagesIcon } from '@sanity/icons';

export const gallery = defineType({
  name: 'gallery',
  title: '갤러리 / Gallery',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: '행사 제목',
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
      name: 'description',
      title: '설명',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'images',
      title: '사진',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'caption',
              title: '캡션',
              type: 'string',
            }),
          ],
        },
      ],
      validation: (r) => r.required().min(1),
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
    select: { title: 'title', date: 'date', media: 'images.0' },
    prepare({ title, date, media }) {
      return { title, subtitle: date, media };
    },
  },
});
