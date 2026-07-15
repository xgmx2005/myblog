import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

export const theme: ThemeUserConfig = {
  title: 'CC',
  author: 'CC',
  description: 'CC 的个人网站：记录 AI 探索、搭建过程、工具资源与生活思考。',
  favicon: '/favicon/favicon-32x32.png',
  socialCard: '/images/social-card.png',
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    dateLocale: 'zh-CN',
    dateOptions: { year: 'numeric', month: 'long', day: 'numeric' }
  },
  logo: { src: '/src/assets/avatar.jpg', alt: 'CC avatar' },
  titleDelimiter: '•',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: '首页', link: '/' },
      { title: '文章', link: '/blog' },
      { title: '项目', link: '/projects' },
      { title: '友链', link: '/links' },
      { title: '关于', link: '/about' }
    ]
  },
  footer: {
    year: `© ${new Date().getFullYear()} `,
    links: [],
    credits: true,
    social: [
      { icon: 'github', label: 'GitHub', href: 'https://github.com/xgmx2005/' },
      { icon: 'rss', label: 'RSS', href: '/rss.xml' }
    ]
  },
  content: {
    externalLinks: {
      content: ' ↗',
      properties: { style: 'user-select:none' }
    },
    blogPageSize: 8,
    share: ['weibo']
  }
}

export const integ: IntegrationUserConfig = {
  links: { logbook: [], applyTip: [], cacheAvatar: false },
  pagefind: true,
  quote: { server: '/quote.json', target: '(data) => data.quote' },
  typography: {
    class: 'prose text-base',
    blockquoteStyle: 'normal',
    inlineCodeBlockStyle: 'modern'
  },
  mediumZoom: {
    enable: true,
    selector: '.prose .zoomable',
    options: { className: 'zoomable' }
  },
  waline: {
    enable: false,
    showMeta: false,
    additionalConfigs: {}
  }
}

const config = { ...theme, integ } as Config
export default config
