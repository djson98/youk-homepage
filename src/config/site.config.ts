/**
 * site.config.ts
 *
 * Single source of truth for professor-specific data.
 *
 * To use this template for a different professor:
 *   1. Edit the `siteConfig` object below.
 *   2. Replace markdown files under `/src/content/` (career, members,
 *      projects, gallery, lectures, publications) with the new professor's
 *      content.
 *
 * NOTE: Fields marked `// TODO: 양식 도착 후 채우기` are pending the
 * professor's intake form. Once the form arrives, fill these in.
 */

export interface SiteConfig {
  professor: {
    nameKo: string;
    nameEn: string;
    title: string; // 예: "조교수"
    affiliation: string; // 예: "강원대학교 의과대학 진단검사의학과"
    email: string;
    photo?: string; // /images/professor.jpg
    orcidId?: string; // publications 자동 수집 (ORCID)
    /**
     * publications 자동 수집 (PubMed). Europe PMC 쿼리 문법.
     * 예: 'AUTH:"Youk HJ"' — 비워두면 PubMed 수집을 건너뛴다.
     */
    pubmedQuery?: string;
    /** 동명이인 논문이 섞여 들어올 때 제외할 PMID 목록. */
    pubmedExcludePmids?: string[];
    googleScholar?: string;
    homepage?: string;
    bio?: string;
  };
  lab: {
    nameKo: string;
    nameEn: string;
    tagline?: string;
    keywords: string[]; // 3-5개 연구 키워드
    photo?: string;
  };
  theme: {
    primaryColor: string; // hex
    secondaryColor?: string;
    fontFamily?: string;
  };
  sections: {
    home: boolean;
    about: boolean;
    research: boolean;
    members: boolean;
    projects: boolean;
    publications: boolean;
    lectures: boolean;
    gallery: boolean;
    news: boolean;
    contact: boolean;
  };
  contact: {
    email: string;
    labLocation?: string; // 건물/호수
    address?: string; // 전체 주소
    phone?: string;
    fax?: string;
    mapEmbedUrl?: string;
  };
  nav: {
    items: { href: string; labelKo: string; labelEn: string }[];
  };
  meta: {
    siteUrl: string;
    ogImage?: string;
    googleAnalytics?: string;
  };
}

export const siteConfig: SiteConfig = {
  professor: {
    nameKo: '육희정',
    nameEn: 'Hee-Jeong Youk',
    title: '조교수',
    affiliation: '강원대학교 의과대학 진단검사의학과',
    email: 'hjyouk@kangwon.ac.kr',
    photo: '/images/professor.jpg',
    orcidId: '0000-0003-3528-7729',
    // ORCID에 없는 논문이 PubMed에는 있어서 두 소스를 합쳐 수집한다.
    // 2005~2006년 연구소 시절 논문까지 모두 본인 논문으로 확인됨.
    pubmedQuery: 'AUTH:"Youk HJ"',
    pubmedExcludePmids: [],
    // googleScholar: undefined — 양식 도착 후 추가
    homepage: 'https://m.knuh.or.kr/medical/doc_info.asp?part_dep=25',
    bio: '강원대학교 의과대학 진단검사의학과 조교수. 진단혈액, 수혈의학, 분자유전 분야의 진단검사를 전문으로 하며, 알러지질환·암진단·감염진단 영역의 검사실 진단을 담당합니다.',
  },
  lab: {
    nameKo: 'biomed Lab',
    nameEn: 'biomed Lab',
    // TODO: 한글명 별도 결정 시 nameKo 교체 (예: "의과학 연구실")
    tagline: '연구실 한 줄 소개를 적어주세요',
    keywords: ['진단혈액', '수혈의학', '분자유전', '진단면역', '암진단'],
    // photo: undefined — 양식 도착 후 추가
  },
  theme: {
    // HAI lab 기본값 유지. 추후 색상 톤 조정 예정.
    primaryColor: '#005b99',
    // secondaryColor: undefined,
    // fontFamily: undefined,
  },
  sections: {
    home: true,
    about: true,
    research: true,
    members: true,
    projects: true,
    publications: true,
    lectures: true,
    gallery: true,
    news: true,
    contact: true,
  },
  contact: {
    email: 'hjyouk@kangwon.ac.kr',
    phone: '033-258-2157',
    // TODO: 양식 도착 후 채우기 — 연구실 위치/주소/팩스/지도
    // labLocation: undefined,
    // address: undefined,
    // fax: undefined,
    // mapEmbedUrl: undefined,
  },
  nav: {
    items: [
      { href: '/research', labelKo: '연구', labelEn: 'Research' },
      { href: '/members', labelKo: '구성원', labelEn: 'Members' },
      { href: '/publications', labelKo: '논문', labelEn: 'Publications' },
      { href: '/gallery', labelKo: '갤러리', labelEn: 'Gallery' },
      { href: '/contact', labelKo: '연락처', labelEn: 'Contacts' },
    ],
  },
  meta: {
    siteUrl: 'https://biomed.kangwon.ac.kr',
    // ogImage: undefined,
    // googleAnalytics: undefined,
  },
};

export default siteConfig;
