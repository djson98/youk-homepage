import { defineType, defineField } from 'sanity';
import { CaseIcon } from '@sanity/icons';

export const career = defineType({
  name: 'career',
  title: '약력 / Career',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'role',
      title: '직책',
      description: '예: "조교수", "전임의", "박사과정"',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'organization',
      title: '소속 기관',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'department',
      title: '학과 / 부서',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: '위치',
      type: 'string',
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
      description: '현재 진행 중이면 비워두기',
      type: 'date',
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
    select: {
      role: 'role',
      org: 'organization',
      start: 'startDate',
      end: 'endDate',
    },
    prepare({ role, org, start, end }) {
      const period = end ? `${start} – ${end}` : `${start} – 현재`;
      return { title: `${role} · ${org}`, subtitle: period };
    },
  },
});
