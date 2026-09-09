/** Local-only render harness. See docs/og-unicode.md; never a board route. */
import { buildBlogOgHtml } from '../src/lib/blog-og';
import { initialsOf } from '../src/lib/initials';
import { buildJobOgHtml } from '../src/lib/job-og';
import { loadOgFont, ogFontStack } from '../src/lib/og-font';
import { renderOgPng } from '../src/lib/og-render';
import { ogText, ogSubsetText, truncateOgTitle } from '../src/lib/og-text';

const cases: Record<
  string,
  {
    language: string;
    company: string;
    title: string;
    location: string;
    logo?: string;
  }
> = {
  logo: {
    language: 'en',
    company: 'Example Company',
    title: 'Engineer & Designer <Platform>',
    location: 'Remote',
    logo: 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMTgiIHN0cm9rZT0iIzI3MjcyQSIgc3Ryb2tlLXdpZHRoPSI2Ii8+Cjwvc3ZnPgo=',
  },
  latin: {
    language: 'fr',
    company: 'École Numérique',
    title: 'Développeur expérimenté — München, São Paulo',
    location: 'Télétravail',
  },
  japanese: {
    language: 'ja',
    company: '東京 開発',
    title: 'シニアソフトウェアエンジニア',
    location: '東京・リモート',
  },
  chinese: {
    language: 'zh-CN',
    company: '未来 科技',
    title: '高级软件工程师 — 数据平台',
    location: '上海・远程',
  },
  traditional: {
    language: 'zh-TW',
    company: '未來 科技',
    title: '資深軟體工程師 — 資料平台',
    location: '台北・遠端',
  },
  korean: {
    language: 'ko',
    company: '서울 기술',
    title: '시니어 소프트웨어 엔지니어',
    location: '서울 · 원격 근무',
  },
  arabic: {
    language: 'ar',
    company: 'تقنية المستقبل',
    title: 'مهندس برمجيات أول',
    location: 'دبي · عن بعد',
  },
  hebrew: {
    language: 'he',
    company: 'טכנולוגיה חדשה',
    title: 'מפתח תוכנה בכיר',
    location: 'תל אביב',
  },
  mixed: {
    language: 'ar',
    company: 'Acme تقنية',
    title: 'مهندس React — Remote 2026',
    location: 'دبي · Remote',
  },
  hindi: {
    language: 'hi',
    company: 'नई तकनीक',
    title: 'वरिष्ठ सॉफ्टवेयर इंजीनियर',
    location: 'दिल्ली',
  },
  thai: {
    language: 'th',
    company: 'เทคโนโลยี ใหม่',
    title: 'วิศวกรซอฟต์แวร์อาวุโส',
    location: 'กรุงเทพมหานคร',
  },
  emoji: {
    language: 'en',
    company: '👩🏽‍💻 Studio',
    title: 'Software engineer 👩🏽‍💻 🚀 🇦🇺',
    location: 'Remote 🌏',
  },
  long: {
    language: 'ja',
    company: '東京 開発',
    title:
      'プラットフォームエンジニア・データ基盤・分散システム・機械学習・サービス開発・技術戦略・研究開発・品質保証・ソフトウェア設計・プロダクト開発・セキュリティ管理・クラウド基盤',
    location: '東京・リモート',
  },
};

export default {
  async fetch(request: Request): Promise<Response> {
    const key = new URL(request.url).pathname.slice(1);
    const isBlog = key.startsWith('blog-');
    const example = cases[isBlog ? key.slice(5) : key];
    if (!example)
      return new Response(
        `<html><head><meta charset="utf-8"><title>OG Unicode checks</title></head><body><h1>OG Unicode checks</h1><ul>${Object.entries(
          cases,
        )
          .map(
            ([id, item]) =>
              `<li><a href="/${id}">${id}</a> / <a href="/blog-${id}">blog ${id}</a> — <span dir="auto">${ogText(item.title)}</span></li>`,
          )
          .join('')}</ul></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    const title = truncateOgTitle(example.title, 80);
    const initials = initialsOf(example.company) ?? '';
    const salary = '€90–120K / year';
    const hostname = 'careers.example.com';
    const font = await loadOgFont(
      ogSubsetText([
        title,
        initials,
        example.company,
        example.location,
        salary,
        hostname,
        'Blog',
      ]),
      undefined,
      example.language,
    );
    if (isBlog)
      return renderOgPng(
        buildBlogOgHtml({
          boardName: example.company,
          blogLabel: 'Blog',
          title,
          excerpt: example.location,
          authorName: example.company,
          authorAvatarUrl: example.logo ?? null,
          dateLabel: null,
          themeColor: '#27272a',
          fontFamily: ogFontStack(font),
        }),
        font,
      );
    return renderOgPng(
      buildJobOgHtml({
        ...example,
        title,
        initials,
        salary,
        hostname,
        logo: example.logo ?? null,
        fontFamily: ogFontStack(font),
      }),
      font,
    );
  },
};
