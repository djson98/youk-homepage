/**
 * site.config.ts
 *
 * Single source of truth for professor-specific data.
 *
 * To use this template for a different professor:
 *   1. Edit the `siteConfig` object below.
 *   2. Replace markdown files under `/src/content/` (career, members,
 *      projects, news, lectures, publications) with the new professor's
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
    orcidId?: string; // 빌드타임 publications 페치
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
    members: boolean;
    projects: boolean;
    publications: boolean;
    lectures: boolean;
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
    nameKo: "육희정",
    nameEn: "Hee-Jeong Youk",
    title: "조교수",
    affiliation: "강원대학교 의과대학 진단검사의학과",
    // TODO: 양식 도착 후 채우기
    email: "",
    photo: "/images/professor.jpg",
    orcidId: "0000-0003-3528-7729",
    // googleScholar: undefined — 양식 도착 후 추가
    // homepage: undefined — 양식 도착 후 추가
    // TODO: 양식 도착 후 bio 채우기
    // bio: undefined,
  },
  lab: {
    // TODO: 양식 도착 후 실제 랩 이름으로 교체
    nameKo: "PLACEHOLDER (양식 미도착)",
    nameEn: "PLACEHOLDER (form pending)",
    // tagline: undefined — 양식 도착 후 추가
    keywords: ["진단검사의학", "Laboratory Medicine"],
    // photo: undefined — 양식 도착 후 추가
  },
  theme: {
    // HAI lab 기본값 유지. 추후 색상 톤 조정 예정.
    primaryColor: "#005b99",
    // secondaryColor: undefined,
    // fontFamily: undefined,
  },
  sections: {
    home: true,
    about: true,
    members: true,
    projects: true,
    publications: true,
    lectures: true,
    news: true,
    contact: true,
  },
  contact: {
    // TODO: 양식 도착 후 채우기
    email: "",
    // labLocation: undefined,
    // address: undefined,
    // phone: undefined,
    // fax: undefined,
    // mapEmbedUrl: undefined,
  },
  nav: {
    items: [
      { href: "/", labelKo: "홈", labelEn: "Home" },
      { href: "/about", labelKo: "소개", labelEn: "About" },
      { href: "/members", labelKo: "구성원", labelEn: "Members" },
      { href: "/projects", labelKo: "프로젝트", labelEn: "Projects" },
      { href: "/publications", labelKo: "논문", labelEn: "Publications" },
      { href: "/lectures", labelKo: "강의", labelEn: "Lectures" },
      { href: "/news", labelKo: "소식", labelEn: "News" },
      { href: "/contact", labelKo: "연락처", labelEn: "Contact" },
    ],
  },
  meta: {
    // TODO: 도메인 결정 후 실제 URL로 교체
    siteUrl: "https://youk-lab.example.com",
    // ogImage: undefined,
    // googleAnalytics: undefined,
  },
};

export default siteConfig;
