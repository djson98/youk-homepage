import { defineType, defineField } from 'sanity';
import { BookIcon } from '@sanity/icons';

export const lecture = defineType({
  name: 'lecture',
  title: '강의 / Lectures',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'courseName',
      title: '강의명',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: '설명',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'semester',
      title: '학기',
      description: '예: "2025-1"',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'courseType',
      title: '구분',
      description: '예: "전공필수", "교양선택"',
      type: 'string',
    }),
    defineField({
      name: 'credits',
      title: '학점',
      type: 'number',
    }),
    defineField({
      name: 'schedule',
      title: '시간',
      description: '예: "월/수 10:00–11:30"',
      type: 'string',
    }),
    defineField({
      name: 'room',
      title: '강의실',
      type: 'string',
    }),
    defineField({
      name: 'syllabus',
      title: '강의계획서 URL',
      type: 'url',
    }),
  ],
  preview: {
    select: { title: 'courseName', semester: 'semester' },
    prepare({ title, semester }) {
      return { title, subtitle: semester };
    },
  },
});
