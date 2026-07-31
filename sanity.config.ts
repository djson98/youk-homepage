import { defineConfig } from 'sanity';
import { structureTool, type StructureResolver } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import {
  DocumentTextIcon,
  RocketIcon,
  UsersIcon,
  CaseIcon,
  BellIcon,
  ImagesIcon,
  BookIcon,
  HomeIcon,
} from '@sanity/icons';
import { schemaTypes, singletonTypes } from './sanity-schemas';

// 싱글턴 문서에서 허용할 액션. 삭제/복제/발행취소는 막는다.
const singletonActions = new Set(['publish', 'discardChanges', 'restore']);

const structure: StructureResolver = (S) =>
  S.list()
    .title('biomed Lab CMS')
    .items([
      // 홈 화면은 문서가 하나뿐이라 목록 없이 편집 화면으로 바로 들어간다.
      S.listItem()
        .id('homePage')
        .title('홈 화면 (히어로)')
        .icon(HomeIcon)
        .child(
          S.document()
            .schemaType('homePage')
            .documentId('homePage')
            .title('홈 화면 (히어로)')
        ),
      S.divider(),
      S.listItem()
        .id('research')
        .title('연구')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .id('research-list')
            .title('연구')
            .items([
              S.documentTypeListItem('publication')
                .title('논문')
                .icon(DocumentTextIcon),
              S.documentTypeListItem('project')
                .title('프로젝트')
                .icon(RocketIcon),
            ])
        ),
      S.listItem()
        .id('people')
        .title('사람')
        .icon(UsersIcon)
        .child(
          S.list()
            .id('people-list')
            .title('사람')
            .items([
              S.documentTypeListItem('member').title('구성원').icon(UsersIcon),
              S.documentTypeListItem('career').title('약력').icon(CaseIcon),
            ])
        ),
      S.listItem()
        .id('activities')
        .title('활동')
        .icon(BellIcon)
        .child(
          S.list()
            .id('activities-list')
            .title('활동')
            .items([
              S.documentTypeListItem('news').title('소식').icon(BellIcon),
              S.documentTypeListItem('gallery')
                .title('갤러리')
                .icon(ImagesIcon),
              S.documentTypeListItem('lecture').title('강의').icon(BookIcon),
            ])
        ),
    ]);

export default defineConfig({
  name: 'default',
  title: 'biomed Lab',
  projectId: 'wd7ygz18',
  dataset: 'production',
  plugins: [structureTool({ structure }), visionTool()],
  // 싱글턴은 "새 문서" 목록에서 숨기고, 삭제/복제 액션도 제거한다.
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    actions: (prev, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? prev.filter(
            ({ action }) => action && singletonActions.has(action as string)
          )
        : prev,
  },
});
