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
} from '@sanity/icons';
import { schemaTypes } from './sanity-schemas';

const structure: StructureResolver = (S) =>
  S.list()
    .title('biomed Lab CMS')
    .items([
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
  schema: { types: schemaTypes },
});
