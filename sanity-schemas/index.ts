import { publication } from './publication';
import { member } from './member';
import { project } from './project';
import { gallery } from './gallery';
import { news } from './news';
import { lecture } from './lecture';
import { career } from './career';
import { homePage } from './homePage';

export const schemaTypes = [
  publication,
  member,
  project,
  gallery,
  news,
  lecture,
  career,
  homePage,
];

/**
 * 문서가 하나만 존재해야 하는 타입.
 * sanity.config.ts에서 새 문서 생성 템플릿과 문서 액션을 걸러내는 데 쓴다.
 */
export const singletonTypes = new Set<string>(['homePage']);
