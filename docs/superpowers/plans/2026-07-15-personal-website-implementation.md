# CC 个人网站实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于固定版本的 Astro Theme Pure 建成 CC 的个人网站，并通过 GitHub 与 Vercel Git 集成自动发布。

**Architecture:** 直接导入上游主题应用层，保留 `astro-pure` 的页面、搜索、RSS、SEO 和明暗主题能力；个人资料集中在 `src/data/profile.ts`，文章继续使用 Astro Content Collections。首版全部为代码与 Markdown 驱动，不引入 CMS、数据库、账户系统、评论或点赞服务。

**Tech Stack:** Astro 6.2.1、astro-pure 1.4.6、TypeScript 6、Bun、Astro Content Collections、Pagefind、Vercel Adapter、GitHub、Vercel Hobby

## Global Constraints

- 上游固定为 `cworld1/astro-theme-pure` 的 commit `0047f6d4278d4c3e823dca608022cd6ebe7b5c96`。
- 本地 Node 固定使用 v24.16.0；包管理器使用 Bun 与上游 `bun.lock`。
- 生产分支命名为 `main`；不创建 GitHub Actions 部署工作流。
- Astro `site` 优先读取 `SITE_URL`，本地缺省值为 `http://localhost:4321`，禁止保留 `astro-pure.js.org`。
- 公开身份只能使用已确认的 CC、杭州 · 余杭区、杭州师范大学计算机科学与技术专业、2023 至今及已确认的兴趣与备考信息。
- 首页固定签名为“生命的意义本不在向外的寻取，而在向内的建立”。
- 首版不包含 Docs、CMS、评论、点赞、账户、GitHub OAuth、邮箱注册、数据库或远程随机语录。
- Projects、Links 与 Blog 无内容时必须显示真实空状态，不得填入虚构内容。
- 保留浅色、深色、跟随系统、搜索、RSS、SEO、文章目录、归档和标签能力。
- 头像替代文本固定为 `CC avatar`；邮箱只在浏览器端由 Base64 还原，这只是基础反爬处理。

---

## File Map

- `src/data/profile.ts`：CC 的唯一资料源和 Skills 数据。
- `src/site.config.ts`：站点元数据、导航、页脚和主题集成开关。
- `astro.config.ts`：站点 URL、Vercel Adapter 与 Astro 构建配置。
- `src/components/contact/ContactLinks.astro`：GitHub、邮箱和 RSS 的统一入口。
- `src/pages/index.astro`：首页资料、最近文章、教育、项目入口、技能和联系区。
- `src/pages/about/index.astro`：只使用已确认资料的 About 页面。
- `src/pages/projects/index.astro`、`src/pages/links/index.astro`：首版空状态页面。
- `src/content.config.ts`、`src/content/blog/`：唯一文章集合和 Markdown/MDX 目录。
- `src/layouts/CommonPage.astro`、`src/layouts/BlogPost.astro`：移除 Waline 数据路径后的页面布局。
- `scripts/generate-brand-assets.mjs`：从头像可重复生成 favicon、manifest 图标和社交分享图。
- `tests/*.test.ts`：资料、页面、内容清理和品牌资源契约测试。
- `README.md`：本地使用、写作方式、上游来源与部署说明。

---

### Task 1: 导入可追溯的主题骨架

**Files:**
- Import: 上游 commit 中除 `.git/`、`.github/` 外的全部跟踪文件
- Preserve: `docs/superpowers/specs/2026-07-15-personal-website-design.md`
- Preserve: `docs/superpowers/plans/2026-07-15-personal-website-implementation.md`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: 已确认的上游 commit `0047f6d4278d4c3e823dca608022cd6ebe7b5c96`
- Produces: 可安装、可检查的 Astro Theme Pure 应用骨架，以及名为 `main` 的生产分支

- [ ] **Step 1: 验证运行时、仓库状态和上游引用**

Run:

```powershell
node --version
node -p "process.execPath"
git status --short --branch
git -C .superpowers/astro-theme-pure-reference rev-parse HEAD
```

Expected: Node 输出 `v24.16.0`；仓库无未提交变更；最后一行是 `0047f6d4278d4c3e823dca608022cd6ebe7b5c96`。

- [ ] **Step 2: 验证生产分支与隔离功能分支**

Run:

```powershell
git show-ref --verify refs/heads/main
git branch --show-current
git status --short --branch
```

Expected: `main` 分支存在；当前分支是 `feature/cc-personal-site`；设计规格和实施计划仍然存在。

- [ ] **Step 3: 导入固定版本的上游文件**

Run:

```powershell
$source = (Resolve-Path '.superpowers/astro-theme-pure-reference').Path
$destination = (Resolve-Path '.').Path
if (-not $source.StartsWith($destination, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Reference clone must stay inside the workspace"
}
Get-ChildItem -LiteralPath $source -Force |
  Where-Object { $_.Name -notin @('.git', '.github') } |
  Copy-Item -Destination $destination -Recurse -Force
```

Expected: `package.json`、`bun.lock`、`astro.config.ts`、`src/`、`public/` 和 `packages/` 出现在仓库根目录；现有 `docs/superpowers/` 未被删除。

- [ ] **Step 4: 恢复本项目忽略规则并记录来源**

在 `.gitignore` 末尾加入：

```gitignore

# Local agent reference material
.superpowers/

# Test output
test-results/
playwright-report/
```

将 `README.md` 暂时替换为以下最小来源记录，Task 5 再补齐使用说明：

```markdown
# CC Personal Site

CC 的个人网站，基于 Astro Theme Pure 构建。

## Upstream provenance

Imported from [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure) at commit `0047f6d4278d4c3e823dca608022cd6ebe7b5c96` on 2026-07-15.
```

- [ ] **Step 5: 安装 Bun 和锁定依赖**

Run:

```powershell
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  powershell -c "irm bun.sh/install.ps1 | iex"
  $env:Path = "$HOME\.bun\bin;$env:Path"
}
bun --version
bun install --frozen-lockfile
```

Expected: `bun --version` 输出版本号；安装以 `Saved lockfile` 之外的正常依赖摘要结束，`bun.lock` 不发生变化。

- [ ] **Step 6: 验证未定制骨架并提交**

Run:

```powershell
bun run check
git diff --check
git add .
git commit -m "chore: import astro theme pure scaffold"
```

Expected: Astro check 无错误；提交包含主题骨架但不包含 `.superpowers/`。

---

### Task 2: 建立个人资料与安全的站点配置

**Files:**
- Create: `src/data/profile.ts`
- Create: `tests/profile-config.test.ts`
- Create: `public/quote.json`
- Copy: `D:/xwechat_files/wxid_4gnyiwb06tls22_cf94/temp/RWTemp/2026-07/dfb00fd3fe82e426d8e1971f7b839629.jpg` → `src/assets/avatar.jpg`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `astro.config.ts`
- Replace: `src/site.config.ts`

**Interfaces:**
- Consumes: 本地头像文件和 Global Constraints 中的公开资料
- Produces: `profile`、`skills` 两个只读对象；全站页面通过它们读取个人资料

- [ ] **Step 1: 添加资料与配置契约测试**

在 `package.json` 的 `scripts` 中加入：

```json
"test": "bun test"
```

创建 `tests/profile-config.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { profile, skills } from '../src/data/profile'
import { integ, theme } from '../src/site.config'

const root = resolve(import.meta.dir, '..')

describe('CC profile', () => {
  test('contains only the confirmed public identity', () => {
    expect(profile).toEqual({
      id: 'CC',
      location: '杭州 · 余杭区',
      quote: '生命的意义本不在向外的寻取，而在向内的建立',
      summary:
        '杭州师范大学计算机科学与技术专业在读，同时持续关注 AI、开源工具、互联网资源与公益站。',
      education: {
        school: '杭州师范大学',
        major: '计算机科学与技术',
        period: '2023 至今'
      },
      github: 'https://github.com/xgmx2005/',
      email: {
        encoded: 'MjQ2MzMyMzQ0N0BxcS5jb20=',
        masked: '2463••••••@qq.com'
      }
    })
  })

  test('contains the confirmed skill groups without levels', () => {
    expect(skills).toEqual({
      Languages: ['Python', 'C', 'C++', 'Java', 'HTML', 'JavaScript', 'CSS', 'SQL'],
      Frontend: ['React', 'Vue'],
      Backend: ['Flask', 'Nginx', 'Next.js'],
      Others: ['公益站']
    })
  })

  test('ships the selected avatar', () => {
    const avatar = resolve(root, 'src/assets/avatar.jpg')
    expect(existsSync(avatar)).toBe(true)
    expect(statSync(avatar).size).toBeGreaterThan(10_000)
  })
})

describe('site configuration', () => {
  test('uses Chinese navigation and CC metadata', () => {
    expect(theme.title).toBe('CC')
    expect(theme.author).toBe('CC')
    expect(theme.logo.alt).toBe('CC avatar')
    expect(theme.header.menu).toEqual([
      { title: '首页', link: '/' },
      { title: '文章', link: '/blog' },
      { title: '项目', link: '/projects' },
      { title: '友链', link: '/links' },
      { title: '关于', link: '/about' }
    ])
  })

  test('disables external quote and Waline services', () => {
    expect(integ.quote.server).toBe('/quote.json')
    expect(integ.waline.enable).toBe(false)
    const configSource = readFileSync(resolve(root, 'src/site.config.ts'), 'utf8')
    expect(configSource).not.toContain('dummyjson.com')
    expect(configSource).not.toContain('astro-theme-pure-waline')
    expect(configSource).not.toContain('cworld1')
  })

  test('uses SITE_URL with a localhost fallback', () => {
    const astroConfig = readFileSync(resolve(root, 'astro.config.ts'), 'utf8')
    expect(astroConfig).toContain("process.env.SITE_URL ?? 'http://localhost:4321'")
    expect(astroConfig).not.toContain('astro-pure.js.org')
  })
})
```

- [ ] **Step 2: 运行测试并确认失败原因正确**

Run:

```powershell
bun test tests/profile-config.test.ts
```

Expected: FAIL，首个错误是无法解析 `../src/data/profile`。

- [ ] **Step 3: 创建唯一资料源并复制头像**

创建 `src/data/profile.ts`：

```ts
export const profile = {
  id: 'CC',
  location: '杭州 · 余杭区',
  quote: '生命的意义本不在向外的寻取，而在向内的建立',
  summary:
    '杭州师范大学计算机科学与技术专业在读，同时持续关注 AI、开源工具、互联网资源与公益站。',
  education: {
    school: '杭州师范大学',
    major: '计算机科学与技术',
    period: '2023 至今'
  },
  github: 'https://github.com/xgmx2005/',
  email: {
    encoded: 'MjQ2MzMyMzQ0N0BxcS5jb20=',
    masked: '2463••••••@qq.com'
  }
} as const

export const skills = {
  Languages: ['Python', 'C', 'C++', 'Java', 'HTML', 'JavaScript', 'CSS', 'SQL'],
  Frontend: ['React', 'Vue'],
  Backend: ['Flask', 'Nginx', 'Next.js'],
  Others: ['公益站']
} as const
```

Run:

```powershell
$avatarSource = 'D:\xwechat_files\wxid_4gnyiwb06tls22_cf94\temp\RWTemp\2026-07\dfb00fd3fe82e426d8e1971f7b839629.jpg'
if (-not (Test-Path -LiteralPath $avatarSource)) { throw "Selected avatar is missing" }
Copy-Item -LiteralPath $avatarSource -Destination 'src\assets\avatar.jpg' -Force
```

Expected: `src/assets/avatar.jpg` 存在且大小大于 10 KB。

在 `tsconfig.json` 的 `compilerOptions.paths` 中加入资料目录别名：

```json
"@/data/*": ["./src/data/*"]
```

- [ ] **Step 4: 配置站点身份、导航与禁用项**

将 `src/site.config.ts` 替换为：

```ts
import type { CardListData, Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

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

export const terms: CardListData = { title: 'Site policy', list: [] }

const config = { ...theme, integ } as Config
export default config
```

创建 `public/quote.json`：

```json
{
  "quote": "生命的意义本不在向外的寻取，而在向内的建立"
}
```

在 `astro.config.ts` 的 `defineConfig` 之前加入并替换 `site`：

```ts
const site = process.env.SITE_URL ?? 'http://localhost:4321'

export default defineConfig({
  site,
```

- [ ] **Step 5: 运行测试、类型检查并提交**

Run:

```powershell
bun test tests/profile-config.test.ts
bun run check
git diff --check
git add package.json tsconfig.json astro.config.ts src/site.config.ts src/data/profile.ts src/assets/avatar.jpg public/quote.json tests/profile-config.test.ts
git commit -m "feat: configure CC profile and site identity"
```

Expected: 测试全部 PASS，Astro check 无错误。

---

### Task 3: 实现首页、About 与首版空状态页面

**Files:**
- Create: `src/components/contact/ContactLinks.astro`
- Create: `tests/pages.test.ts`
- Replace: `src/pages/index.astro`
- Replace: `src/pages/about/index.astro`
- Replace: `src/pages/projects/index.astro`
- Replace: `src/pages/links/index.astro`
- Modify: `src/pages/blog/[...page].astro`
- Modify: `src/pages/search/index.astro`
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/tags/[tag]/[...page].astro`
- Modify: `src/pages/archives/index.astro`

**Interfaces:**
- Consumes: `profile`、`skills`、`getBlogCollection()` 和现有 Pure UI 组件
- Produces: 首页、文章、项目、友链、关于、搜索、标签和归档的公开页面

- [ ] **Step 1: 添加页面契约测试**

创建 `tests/pages.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('public pages', () => {
  test('home presents CC before content discovery', () => {
    const home = read('src/pages/index.astro')
    for (const value of ['profile.id', 'profile.location', 'profile.quote', '最近文章', 'Education', 'Projects', 'Skills']) {
      expect(home).toContain(value)
    }
    expect(home).toContain('还没有文章，第一篇正在路上。')
    expect(home).not.toContain('Get Template')
    expect(home).not.toContain('Certifications')
  })

  test('about contains no invented career identity', () => {
    const about = read('src/pages/about/index.astro')
    expect(about).toContain('profile.summary')
    expect(about).toContain('profile.education.school')
    expect(about).not.toContain('Developer / Designer')
  })

  test('projects and links expose honest empty states', () => {
    expect(read('src/pages/projects/index.astro')).toContain('持续更新中')
    expect(read('src/pages/links/index.astro')).toContain('友链正在整理中')
  })

  test('email is decoded only in the browser', () => {
    const contact = read('src/components/contact/ContactLinks.astro')
    expect(contact).toContain('atob(link.dataset.email')
    expect(contact).not.toContain('2463323447@qq.com')
  })

  test('core content pages use Chinese labels', () => {
    expect(read('src/pages/blog/[...page].astro')).toContain('文章')
    expect(read('src/pages/search/index.astro')).toContain('搜索')
    expect(read('src/pages/tags/index.astro')).toContain('全部标签')
    expect(read('src/pages/archives/index.astro')).toContain('归档')
  })
})
```

- [ ] **Step 2: 运行测试并确认旧模板内容导致失败**

Run:

```powershell
bun test tests/pages.test.ts
```

Expected: FAIL，报告首页缺少 `profile.id`，并仍含 `Get Template` 或 `Certifications`。

- [ ] **Step 3: 创建统一联系组件**

创建 `src/components/contact/ContactLinks.astro`：

```astro
---
import { Icon } from 'astro-pure/user'
import { profile } from '@/data/profile'
---

<nav aria-label='联系方式' class='flex flex-wrap gap-x-5 gap-y-3'>
  <a href={profile.github} target='_blank' rel='me noopener'>
    <Icon name='github' class='me-1 inline size-5' />GitHub
  </a>
  <a href='#contact-email' data-email-link data-email={profile.email.encoded}>
    <Icon name='email' class='me-1 inline size-5' />
    <span>{profile.email.masked}</span>
  </a>
  <a href='/rss.xml'>
    <Icon name='rss' class='me-1 inline size-5' />RSS
  </a>
</nav>

<script>
  document.querySelectorAll<HTMLAnchorElement>('[data-email-link]').forEach((link) => {
    const address = atob(link.dataset.email ?? '')
    if (!address) return
    link.href = `mailto:${address}`
    const label = link.querySelector('span')
    if (label) label.textContent = address
  })
</script>
```

- [ ] **Step 4: 重写首页**

将 `src/pages/index.astro` 替换为：

```astro
---
import { Image } from 'astro:assets'

import { PostPreview } from 'astro-pure/components/pages'
import { getBlogCollection, sortMDByDate } from 'astro-pure/server'
import { Button, Card, Icon, Label } from 'astro-pure/user'
import ContactLinks from '@/components/contact/ContactLinks.astro'
import Section from '@/components/home/Section.astro'
import SkillLayout from '@/components/home/SkillLayout.astro'
import avatar from '@/assets/avatar.jpg'
import PageLayout from '@/layouts/BaseLayout.astro'
import { profile, skills } from '@/data/profile'

const recentPosts = sortMDByDate(await getBlogCollection()).slice(0, 6)
---

<PageLayout meta={{ title: '首页' }} highlightColor='#7ba58f'>
  <main class='flex w-full flex-col items-center'>
    <section class='animate mb-10 flex flex-col items-center gap-y-6' id='content-header'>
      <Image
        src={avatar}
        alt='CC avatar'
        class='size-28 rounded-full border object-cover p-1'
        loading='eager'
        fetchpriority='high'
      />
      <div class='flex flex-col items-center gap-y-3'>
        <h1 class='text-3xl font-medium'>{profile.id}</h1>
        <Label title={profile.location}>
          <Icon name='location' class='size-5' slot='icon' />
        </Label>
        <p class='max-w-2xl text-center text-muted-foreground'>{profile.quote}</p>
      </div>
    </section>

    <div id='content' class='animate flex flex-col gap-y-10 md:w-4/5 lg:w-5/6'>
      <Section title='About'>
        <p class='text-muted-foreground'>{profile.summary}</p>
        <Button title='更多关于我' class='w-fit self-end' href='/about' variant='ahead' />
      </Section>

      <Section title='最近文章'>
        {
          recentPosts.length > 0 ? (
            <ul class='flex flex-col gap-y-2'>
              {recentPosts.map((post) => (
                <li><PostPreview {post} /></li>
              ))}
            </ul>
          ) : (
            <p class='text-muted-foreground'>还没有文章，第一篇正在路上。</p>
          )
        }
        <Button title='查看全部文章' class='w-fit self-end' href='/blog' variant='ahead' />
      </Section>

      <Section title='Education'>
        <Card
          heading={profile.education.school}
          subheading={profile.education.major}
          date={profile.education.period}
        />
      </Section>

      <Section title='Projects'>
        <p class='text-muted-foreground'>持续更新中，先保留一个以后认真填满的入口。</p>
        <Button title='查看项目页' class='w-fit self-end' href='/projects' variant='ahead' />
      </Section>

      <Section title='Skills'>
        {Object.entries(skills).map(([title, values]) => (
          <SkillLayout title={title} skills={[...values]} />
        ))}
      </Section>

      <Section title='Contact'>
        <ContactLinks />
      </Section>
    </div>
  </main>
</PageLayout>
```

- [ ] **Step 5: 重写 About、Projects 和 Links 页面**

将 `src/pages/about/index.astro` 替换为：

```astro
---
import ContactLinks from '@/components/contact/ContactLinks.astro'
import PageLayout from '@/layouts/CommonPage.astro'
import { profile } from '@/data/profile'

const headings = [
  { depth: 2, slug: 'education', text: 'Education' },
  { depth: 2, slug: 'interests', text: '关注方向' },
  { depth: 2, slug: 'contact', text: '联系我' }
]
---

<PageLayout title='关于' {headings}>
  <p>{profile.summary}</p>
  <blockquote>{profile.quote}</blockquote>

  <h2 id='education'>Education</h2>
  <p>{profile.education.school} · {profile.education.major} · {profile.education.period}</p>

  <h2 id='interests'>关注方向</h2>
  <p>AI、开源工具、互联网资源、公益站，以及把真正学到的内容整理成可复用的笔记。</p>

  <h2 id='contact'>联系我</h2>
  <ContactLinks />
</PageLayout>
```

将 `src/pages/projects/index.astro` 替换为：

```astro
---
import { Button } from 'astro-pure/user'
import PageLayout from '@/layouts/CommonPage.astro'
---

<PageLayout title='项目'>
  <p class='text-muted-foreground'>持续更新中。这里会放真正完成并愿意长期维护的项目。</p>
  <Button title='先看看文章' href='/blog' variant='ahead' />
</PageLayout>
```

将 `src/pages/links/index.astro` 替换为：

```astro
---
import { Button } from 'astro-pure/user'
import PageLayout from '@/layouts/CommonPage.astro'
---

<PageLayout title='友链'>
  <p class='text-muted-foreground'>友链正在整理中。等我遇到值得认真推荐的网站，会把它们放在这里。</p>
  <Button title='返回首页' href='/' variant='back' />
</PageLayout>
```

- [ ] **Step 6: 本地化文章、搜索、标签和归档中的可见文案**

在对应文件中完成以下精确替换：

```text
src/pages/blog/[...page].astro
Blog → 文章
No posts yet. → 还没有文章，第一篇正在路上。
Tags → 标签
View all → 查看全部
View all posts by years → 按年份查看归档

src/pages/search/index.astro
Search → 搜索
Enter a search term or phrase to search the blog. → 输入关键词搜索全部文章。
Pagefind is disabled. → 搜索功能未启用。

src/pages/tags/index.astro
All Tags / Tags → 全部标签
Any tag yet. → 还没有标签。

src/pages/tags/[tag]/[...page].astro
Tags: → 标签：

src/pages/archives/index.astro
Archives → 归档
No posts yet. → 还没有文章，第一篇正在路上。
```

- [ ] **Step 7: 运行测试、检查并提交**

Run:

```powershell
bun test tests/pages.test.ts
bun run check
git diff --check
git add src/pages src/components/contact tests/pages.test.ts
git commit -m "feat: build CC profile and content pages"
```

Expected: 页面测试全部 PASS，Astro check 无错误。

---

### Task 4: 删除示例内容、Docs 与 Waline 数据路径

**Files:**
- Create: `tests/content-cleanup.test.ts`
- Create: `src/content/blog/.gitkeep`
- Replace: `src/content.config.ts`
- Modify: `src/site.config.ts`
- Replace: `src/layouts/CommonPage.astro`
- Modify: `src/layouts/BlogPost.astro`
- Delete: `src/content/docs/`
- Delete: `src/pages/docs/`
- Delete: 上游 `src/content/blog/` 内全部示例文章和图片
- Delete: `src/components/waline/`、`src/types/waline-style.d.ts`
- Delete: `src/pages/terms/`
- Delete: 未再使用的作者组件与素材目录
- Modify: `package.json`、`bun.lock`

**Interfaces:**
- Consumes: 已完成的公开页面
- Produces: 只有 `blog` 集合、没有示例内容和第三方评论请求的首版内容系统

- [ ] **Step 1: 添加清理契约测试**

创建 `tests/content-cleanup.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const absolute = (path: string) => resolve(root, path)

function walk(path: string): string[] {
  if (!existsSync(path)) return []
  return readdirSync(path).flatMap((name) => {
    const child = resolve(path, name)
    return statSync(child).isDirectory() ? walk(child) : [child]
  })
}

describe('content system cleanup', () => {
  test('keeps an empty blog collection and publishes no docs route', () => {
    const posts = walk(absolute('src/content/blog')).filter((file) => ['.md', '.mdx'].includes(extname(file)))
    expect(posts).toEqual([])
    expect(existsSync(absolute('src/content/blog/.gitkeep'))).toBe(true)
    expect(existsSync(absolute('src/content/docs'))).toBe(false)
    expect(existsSync(absolute('src/pages/docs'))).toBe(false)
  })

  test('removes Waline from dependencies and layouts', () => {
    const pkg = JSON.parse(readFileSync(absolute('package.json'), 'utf8'))
    expect(pkg.dependencies['@waline/client']).toBeUndefined()
    expect(existsSync(absolute('src/components/waline'))).toBe(false)
    expect(readFileSync(absolute('src/layouts/CommonPage.astro'), 'utf8')).not.toContain('PageInfo')
    expect(readFileSync(absolute('src/layouts/BlogPost.astro'), 'utf8')).not.toContain('Comment')
  })

  test('contains no upstream identity or sample prose in public source', () => {
    const textFiles = [...walk(absolute('src')), ...walk(absolute('public'))].filter((file) =>
      ['.astro', '.ts', '.js', '.json', '.md', '.mdx', '.txt', '.xml'].includes(extname(file))
    )
    const source = textFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
    for (const forbidden of ['cworld1', 'cworld0', 'astro-pure.js.org', 'dummyjson.com', 'Lorem ipsum']) {
      expect(source).not.toContain(forbidden)
    }
  })
})
```

- [ ] **Step 2: 运行测试并确认旧内容导致失败**

Run:

```powershell
bun test tests/content-cleanup.test.ts
```

Expected: FAIL，至少报告 Docs 目录仍存在、示例文章不为空和 `@waline/client` 仍在依赖中。

- [ ] **Step 3: 删除已明确排除的文件**

Run:

```powershell
git rm -r -- src/content/docs src/pages/docs src/content/blog src/components/waline src/pages/terms
git rm -r -- src/components/about src/components/projects src/components/links
git rm -- src/components/home/ProjectCard.astro src/types/waline-style.d.ts
git rm -r -- src/assets/projects src/assets/tools
git rm -- src/assets/alipay-qrcode.jpg src/assets/wechat-qrcode.jpg public/links.json
bun remove @waline/client
```

Expected: 命令只删除列出的模板内容、组件和素材；`package.json` 与 `bun.lock` 同步移除 Waline 客户端。

创建 `src/content/blog/.gitkeep`，内容为：

```text
Blog entries live in this directory.
```

同时从 `src/site.config.ts` 删除 `CardListData` 类型导入和不再使用的 `terms` 导出；文件首行只保留：

```ts
import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'
```

- [ ] **Step 4: 将 Content Collections 缩减为 blog**

将 `src/content.config.ts` 替换为：

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
}

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(60),
      description: z.string().max(160),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z
        .object({
          src: image(),
          alt: z.string().optional(),
          inferSize: z.boolean().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          color: z.string().optional()
        })
        .optional(),
      tags: z.array(z.string()).default([]).transform(normalizeTags),
      language: z.string().default('zh-CN'),
      draft: z.boolean().default(false)
    })
})

export const collections = { blog }
```

- [ ] **Step 5: 从布局中切断 Waline 引用**

将 `src/layouts/CommonPage.astro` 替换为：

```astro
---
import type { MarkdownHeading } from 'astro'

import { TOC } from 'astro-pure/components/pages'
import PageLayout from '@/layouts/ContentLayout.astro'

interface Props {
  title: string
  headings?: MarkdownHeading[]
}

const { title, headings, ...props } = Astro.props
---

<PageLayout meta={{ title }} {...props}>
  {headings?.length && <TOC headings={headings} slot='sidebar' />}

  <Fragment slot='header'>
    <h1 class='text-2xl font-medium sm:mb-2 sm:text-3xl'>{title}</h1>
  </Fragment>

  <slot />
  <slot name='bottom' slot='bottom' />
  <slot name='bottom-sidebar' slot='bottom-sidebar' />
</PageLayout>
```

在 `src/layouts/BlogPost.astro` 中删除 Waline import、`comment: enableComment` 解构、`PageInfo` 和 `Comment` 节点，使正文底部保留以下内容：

```astro
<Fragment slot='bottom'>
  <Copyright {data} />
  <ArticleBottom collections={posts} {id} class='mt-3 sm:mt-6' />
</Fragment>
```

- [ ] **Step 6: 运行测试、正式检查并提交**

Run:

```powershell
bun test tests/content-cleanup.test.ts
bun test
bun run check
git diff --check
git add .
git commit -m "refactor: remove template content and external services"
```

Expected: 全部测试 PASS；Astro check 无错误；`src/content/blog/` 只剩 `.gitkeep`。

---

### Task 5: 生成品牌资源并补齐项目文档

**Files:**
- Create: `scripts/generate-brand-assets.mjs`
- Create: `tests/brand-assets.test.ts`
- Replace: `public/favicon/site.webmanifest`
- Generate: `public/favicon/favicon-16x16.png`
- Generate: `public/favicon/favicon-32x32.png`
- Generate: `public/favicon/apple-touch-icon.png`
- Generate: `public/favicon/android-chrome-192x192.png`
- Generate: `public/favicon/android-chrome-512x512.png`
- Generate: `public/images/social-card.png`
- Delete: `public/favicon/favicon.ico`
- Replace: `README.md`

**Interfaces:**
- Consumes: `src/assets/avatar.jpg` 和已安装的 `sharp`
- Produces: 可重复生成的 CC favicon、PWA 图标、社交分享图和使用文档

- [ ] **Step 1: 添加品牌资源测试**

创建 `tests/brand-assets.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dir, '..')

describe('brand assets', () => {
  test('uses CC metadata in the web manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/favicon/site.webmanifest'), 'utf8'))
    expect(manifest.name).toBe('CC Personal Site')
    expect(manifest.short_name).toBe('CC')
    expect(manifest.theme_color).toBe('#7ba58f')
  })

  test.each([
    ['favicon-16x16.png', 16, 16],
    ['favicon-32x32.png', 32, 32],
    ['apple-touch-icon.png', 180, 180],
    ['android-chrome-192x192.png', 192, 192],
    ['android-chrome-512x512.png', 512, 512]
  ])('%s has the expected dimensions', async (name, width, height) => {
    const metadata = await sharp(resolve(root, 'public/favicon', name)).metadata()
    expect(metadata.width).toBe(width)
    expect(metadata.height).toBe(height)
  })

  test('creates a 1200 by 630 social card', async () => {
    const metadata = await sharp(resolve(root, 'public/images/social-card.png')).metadata()
    expect(metadata.width).toBe(1200)
    expect(metadata.height).toBe(630)
  })
})
```

- [ ] **Step 2: 运行测试并确认上游 manifest 导致失败**

Run:

```powershell
bun test tests/brand-assets.test.ts
```

Expected: FAIL，manifest 的 `name` 不是 `CC Personal Site`。

- [ ] **Step 3: 创建可重复的图片生成脚本**

创建 `scripts/generate-brand-assets.mjs`：

```js
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'src/assets/avatar.jpg')
const faviconDir = resolve(root, 'public/favicon')
const imageDir = resolve(root, 'public/images')

await Promise.all([mkdir(faviconDir, { recursive: true }), mkdir(imageDir, { recursive: true })])

const squareSizes = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512]
]

await Promise.all(
  squareSizes.map(([name, size]) =>
    sharp(source)
      .resize(Number(size), Number(size), { fit: 'cover' })
      .png()
      .toFile(resolve(faviconDir, String(name)))
  )
)

await sharp(source)
  .resize(520, 520, { fit: 'cover' })
  .extend({ top: 55, bottom: 55, left: 340, right: 340, background: '#f5f7f2' })
  .png()
  .toFile(resolve(imageDir, 'social-card.png'))
```

将 `public/favicon/site.webmanifest` 替换为：

```json
{
  "name": "CC Personal Site",
  "short_name": "CC",
  "icons": [
    {
      "src": "/favicon/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#7ba58f",
  "background_color": "#f5f7f2",
  "display": "standalone"
}
```

Run:

```powershell
bun scripts/generate-brand-assets.mjs
git rm -- public/favicon/favicon.ico
```

Expected: 六张 PNG 被生成，旧 `.ico` 被删除。

- [ ] **Step 4: 写清本地开发、写作和上游来源**

将 `README.md` 替换为：

```markdown
# CC Personal Site

CC 的个人网站，使用 Astro Theme Pure 构建，内容包括 AI 探索、搭建记录、工具资源和生活随笔。

## Upstream provenance

Imported from [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure) at commit `0047f6d4278d4c3e823dca608022cd6ebe7b5c96` on 2026-07-15.

## Local development

- Node.js: `v24.16.0`
- Package manager: Bun

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:4321`.

## Writing

Add Markdown or MDX files under `src/content/blog/`. A minimal post uses:

```yaml
---
title: 第一篇文章
description: 这篇文章解决什么问题。
publishDate: 2026-07-15
tags:
  - AI 探索
  - 搭建记录
language: zh-CN
draft: false
---
```

Recommended tags are `AI 探索`, `搭建记录`, `工具资源`, and `生活随笔`. Multiple tags are allowed.

## Verification

```bash
bun test
bun run check
bun run build
```

## Deployment

The production branch is `main`. Vercel Git integration builds preview deployments for other branches and production deployments for `main`. Set `SITE_URL` in Vercel to the real production origin. This repository intentionally contains no GitHub Actions deployment workflow.
```

- [ ] **Step 5: 验证品牌资源并提交**

Run:

```powershell
bun test tests/brand-assets.test.ts
bun test
bun run check
git diff --check
git add scripts tests public README.md
git commit -m "feat: add CC brand assets and project guide"
```

Expected: 品牌测试和全部契约测试 PASS，Astro check 无错误。

---

### Task 6: 正式构建、生产预览、视觉验收与 CodeGraph

**Files:**
- Generate: `.astro/`、`.vercel/` 或 `dist/` 构建输出（均保持忽略）
- Generate: `.codegraph/` 本地代码索引

**Interfaces:**
- Consumes: 完整本地站点
- Produces: 可部署构建、人工验收记录和可用 CodeGraph 索引

- [ ] **Step 1: 执行全部自动验证**

Run:

```powershell
bun install --frozen-lockfile
bun test
bun run check
bunx eslint 'src/**/*.{js,ts,jsx,tsx,astro}'
bun run build
git diff --check
```

Expected: 所有命令 exit code 为 0；构建生成 Vercel 输出；工作树没有被检查命令意外改写。

- [ ] **Step 2: 检查公开构建中没有 Docs 和上游示例**

Run:

```powershell
if (Test-Path '.vercel/output/static/docs') { throw 'Unexpected /docs output' }
if (Test-Path 'dist/docs') { throw 'Unexpected /docs output' }
rg -n "cworld1|cworld0|astro-pure\.js\.org|dummyjson\.com|Lorem ipsum|Get Template|Certifications" src public
```

Expected: Docs 检查不抛错；公开源码和静态资源中 `rg` 无匹配并以 1 表示“未找到”。README 的上游来源记录与主题的必要署名不属于作者个人资料。

- [ ] **Step 3: 启动生产预览并做 HTTP 冒烟测试**

Run:

```powershell
$preview = Start-Process -FilePath 'bun' -ArgumentList @('run', 'preview', '--host', '127.0.0.1', '--port', '4322') -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 3
  foreach ($path in @('/', '/blog', '/projects', '/links', '/about', '/search', '/rss.xml')) {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:4322$path" -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw "$path returned $($response.StatusCode)" }
  }
} finally {
  Stop-Process -Id $preview.Id -ErrorAction SilentlyContinue
}
```

Expected: 七个路径都返回 200，预览进程随后被关闭。若 Vercel Adapter 明确报告不支持 `astro preview`，改用 `bunx vercel dev --listen 4322` 执行同一组请求，并把适配器提示记录在验收结果中。

- [ ] **Step 4: 进行桌面和手机视觉验收**

在执行阶段加载 `playwright` skill，分别以 1440×900 和 390×844 检查：

```text
首页头像为圆形且 alt 为 CC avatar
浅色、深色和 system 三次点击循环正常
移动端菜单可打开并访问首页、文章、项目、友链、关于和搜索
Blog、Projects、Links 的空状态可读且没有布局塌陷
GitHub 链接打开 https://github.com/xgmx2005/
邮箱入口点击后 href 变为 mailto:2463323447@qq.com
页面无横向滚动，无浏览器控制台错误
```

Expected: 所有条目通过；截图保存到 `test-results/visual/`，该目录不提交。

- [ ] **Step 5: 初始化 CodeGraph 并检查索引健康**

Run:

```powershell
codegraph init -i
codegraph status
```

Expected: 仓库出现 `.codegraph/`，状态显示索引已建立且没有 pending sync。若 CLI 报告命令不可用，保留已完成的网站结果并报告缺失的 CodeGraph CLI，不安装来源不明的替代包。

- [ ] **Step 6: 提交验收所需的最后修正**

Run:

```powershell
git status --short
git diff --check
git add .
git commit -m "chore: verify production website"
```

Expected: 若没有需要修正的跟踪文件，则不创建空提交；若有修正，提交后 `git status --short` 为空。

---

### Task 7: 连接 GitHub 与 Vercel 自动部署

**Files:**
- Remote: GitHub 仓库 `xgmx2005/myblog`
- Remote: Vercel 项目 `cc-xgmx2005`
- Environment: Vercel `SITE_URL=https://cc-xgmx2005.vercel.app`（Production 与 Preview）
- Verify absent: `.github/workflows/`

**Interfaces:**
- Consumes: 已通过 Task 6 的 `main` 分支
- Produces: Git push 驱动的 Preview/Production 部署流程和公开生产网址

- [ ] **Step 1: 验证 GitHub 身份并创建远程仓库**

Run:

```powershell
gh auth status
```

Expected: 当前账号为 `xgmx2005`。若未登录，运行 `gh auth login --web --git-protocol https`，只在 GitHub 官方授权页完成登录。

当远程仓库不存在时运行：

```powershell
gh repo create xgmx2005/myblog --public --source=. --remote=origin --push
```

当远程仓库已经存在时运行：

```powershell
git remote add origin https://github.com/xgmx2005/myblog.git
git push -u origin main
```

Expected: `origin` 指向 `https://github.com/xgmx2005/myblog.git`，GitHub 默认分支为 `main`。

- [ ] **Step 2: 验证仓库没有 Actions 部署工作流**

Run:

```powershell
if (Test-Path '.github/workflows') { throw 'GitHub Actions deployment is out of scope' }
git ls-files '.github/workflows/*'
```

Expected: 没有输出。

- [ ] **Step 3: 登录并连接 Vercel 项目与 Git 仓库**

Run:

```powershell
bunx vercel login
bunx vercel link --yes --project cc-xgmx2005
bunx vercel git connect --yes
```

Expected: `.vercel/project.json` 指向 `cc-xgmx2005`；Vercel 确认已连接 `xgmx2005/myblog`。若 `cc-xgmx2005` 已被其他账号占用，停止配置并向 CC 报告冲突，不猜测另一个生产域名。

- [ ] **Step 4: 设置真实站点 URL 并触发生产部署**

Run:

```powershell
"https://cc-xgmx2005.vercel.app" | bunx vercel env add SITE_URL production
"https://cc-xgmx2005.vercel.app" | bunx vercel env add SITE_URL preview
bunx vercel --prod
```

Expected: Production Deployment 为 Ready，公开域名是 `https://cc-xgmx2005.vercel.app`；生成的 canonical、sitemap 和 RSS 不包含 localhost。

- [ ] **Step 5: 验证 Git 分支触发 Preview Deployment**

Run:

```powershell
git switch -c verify/vercel-preview
git commit --allow-empty -m "chore: verify vercel preview"
git push -u origin verify/vercel-preview
```

Expected: Vercel 为 `verify/vercel-preview` 生成独立 Preview URL，不替换 Production。

验证后清理验证分支：

```powershell
git switch main
git push origin --delete verify/vercel-preview
git branch -d verify/vercel-preview
```

Expected: 本地回到 `main`，验证分支已删除，Production 仍指向 `main` 的最近成功构建。

- [ ] **Step 6: 最终线上验收**

Run:

```powershell
foreach ($path in @('/', '/blog', '/projects', '/links', '/about', '/search', '/rss.xml', '/sitemap-index.xml')) {
  $response = Invoke-WebRequest -Uri "https://cc-xgmx2005.vercel.app$path" -UseBasicParsing
  if ($response.StatusCode -ne 200) { throw "$path returned $($response.StatusCode)" }
}
git status --short --branch
```

Expected: 八个路径全部返回 200；本地工作树干净且位于 `main`；后续向 `main` 推送会自动生产部署，其他分支推送会自动预览部署。

---

## Deployment References

- Vercel Git integration: <https://vercel.com/docs/git>
- `vercel git connect`: <https://vercel.com/docs/cli/git>
- Vercel environment variables: <https://vercel.com/docs/environment-variables>
