import { defineType, defineField } from 'sanity';
import { HomeIcon } from '@sanity/icons';

/**
 * 홈 화면 히어로 — 싱글턴 문서.
 *
 * 문서가 하나만 존재해야 하므로 `_id`를 'hero'로 고정해서 쓴다.
 * 스튜디오 구조(sanity.config.ts)에서 documentId('hero')로 바로 열고,
 * 새 문서 생성 템플릿에서는 제외한다.
 *
 * 문서가 없거나 아직 publish 안 된 상태면 사이트는 site.config.ts 값으로
 * 폴백한다 (HeroSection.astro 참고).
 */
export const hero = defineType({
  name: 'hero',
  title: '홈 히어로 / Hero',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'headline',
      title: '큰 제목',
      description: '비워두면 연구실 이름이 들어간다',
      type: 'string',
    }),
    defineField({
      name: 'subheadline',
      title: '부제 / 한 줄 소개',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'keywords',
      title: '연구 키워드',
      description: '제목 아래 배지로 표시됨. 3~5개 권장',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'background',
      title: '배경 사진',
      description:
        '언제든 교체 가능. 가로로 넓은 사진(2000px 이상 권장)이 잘 어울린다. ' +
        '사진 위 초점을 옮기려면 이미지를 클릭해 hotspot을 조절한다.',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'backgroundAlt',
      title: '배경 사진 설명 (대체 텍스트)',
      description: '화면 낭독기용. 장식용 사진이면 비워도 된다',
      type: 'string',
    }),
    defineField({
      name: 'overlay',
      title: '사진 어둡게 (%)',
      description:
        '글자가 안 읽히면 값을 올린다. 0 = 원본, 60 정도면 흰 글씨가 또렷하다',
      type: 'number',
      initialValue: 45,
      validation: (r) => r.min(0).max(90),
    }),
    defineField({
      name: 'align',
      title: '글자 정렬',
      type: 'string',
      initialValue: 'left',
      options: {
        list: [
          { title: '왼쪽', value: 'left' },
          { title: '가운데', value: 'center' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'ctaLabel',
      title: '버튼 문구',
      description: '버튼이 필요 없으면 비워둔다',
      type: 'string',
    }),
    defineField({
      name: 'ctaHref',
      title: '버튼 링크',
      description: '내부 경로(/research)나 전체 URL 모두 가능',
      type: 'string',
      // ctaLabel만 채우고 링크를 빼먹는 실수를 막는다.
      validation: (r) =>
        r.custom((href, ctx) => {
          const label = (ctx.parent as { ctaLabel?: string } | undefined)
            ?.ctaLabel;
          if (label && !href) return '버튼 문구를 넣었으면 링크도 필요하다';
          return true;
        }),
    }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'subheadline', media: 'background' },
    prepare({ title, subtitle, media }) {
      return {
        title: title || '홈 히어로',
        subtitle: subtitle || '제목 없음 — 연구실 이름으로 표시됨',
        media,
      };
    },
  },
});
