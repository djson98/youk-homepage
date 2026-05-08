import { defineType, defineField } from 'sanity';
import { UsersIcon } from '@sanity/icons';

export const member = defineType({
  name: 'member',
  title: '구성원 / Members',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      title: '이름 (영문)',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nameKo',
      title: '이름 (한글)',
      type: 'string',
    }),
    defineField({
      name: 'position',
      title: '직책',
      type: 'string',
      options: {
        list: [
          { title: '교수 (Professor)', value: 'professor' },
          { title: '박사후연구원 (Postdoc)', value: 'postdoc' },
          { title: '박사과정 (PhD)', value: 'phd' },
          { title: '석사과정 (MS)', value: 'ms' },
          { title: '학부생 (Undergrad)', value: 'undergrad' },
          { title: '졸업생 (Alumni)', value: 'alumni' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'photo',
      title: '사진',
      description: '정면, 어깨 위, 흰 배경 권장. 최소 800×1000px',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'email',
      title: '이메일',
      type: 'string',
    }),
    defineField({
      name: 'researchFields',
      title: '관심 분야',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'graduationInfo',
      title: '졸업 정보',
      description: '졸업생만 작성. 예: "2024년 졸업 / 삼성서울병원 임상병리사"',
      type: 'string',
    }),
    defineField({
      name: 'googleScholar',
      title: 'Google Scholar URL',
      type: 'url',
    }),
    defineField({
      name: 'homepage',
      title: '개인 홈페이지 URL',
      type: 'url',
    }),
    defineField({
      name: 'bio',
      title: '소개 (1~2문장)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'order',
      title: '정렬 순서',
      description: '같은 직책 내에서 보여줄 순서 (작은 숫자가 먼저). 비워두면 자동',
      type: 'number',
    }),
  ],
  orderings: [
    {
      title: '직책 → 순서',
      name: 'positionOrder',
      by: [
        { field: 'position', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'nameKo', name: 'name', position: 'position', media: 'photo' },
    prepare({ title, name, position, media }) {
      return {
        title: title || name,
        subtitle: position,
        media,
      };
    },
  },
});
