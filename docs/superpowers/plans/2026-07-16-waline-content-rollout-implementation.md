# Waline and Initial Content Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the existing `feature/website-v2` worktree. Do not create a second worktree. Stop at every marked user checkpoint.

**Goal:** Publish the five approved Obsidian articles and replace the abandoned custom Supabase interaction layer with a thin Waline client backed by the existing Tokyo Supabase PostgreSQL project.

**Architecture:** Astro remains a content-first Vercel site. It receives one public Waline server URL and renders Waline below articles and on `/guestbook`; it never connects to Supabase directly. A separate `cc-waline` repository and Vercel project run the official Waline server, keep all PostgreSQL and SMTP secrets, and use the official `wl_` PostgreSQL schema.

**Tech Stack:** Astro 6.2.1, TypeScript 6, Bun, `@waline/client` 3.15.2, `@waline/vercel` 1.41.3, Vercel, Supabase PostgreSQL 17, Pagefind.

**Depends on:** Approved design `docs/superpowers/specs/2026-07-16-waline-algolia-architecture-design.md`.

**Does not include:** Algolia activation. Execute `2026-07-16-algolia-docsearch-implementation.md` only after this plan produces a public, crawlable website.

## Global Constraints

- Preserve Astro Theme Pure styling and the existing `html.dark` light/dark behavior.
- Use Waline's native account, reply, administration, and reaction behavior; do not rebuild these features.
- Require login in both client configuration and Waline server configuration.
- The first Waline account must be CC using `2463323447@qq.com`.
- Keep `integ.pagefind: true`; Pagefind is the active search provider throughout this plan.
- Never print, paste into chat, or commit the Supabase database password or QQ SMTP authorization code.
- Do not apply the superseded custom Supabase migration. It was never applied remotely.
- Pin exact package versions and commit lockfiles in both repositories.
- Every article path and Waline path is canonical without a trailing slash, query, or hash.

---

### Task 1: Remove the Superseded Custom Supabase Layer

**Files:**
- Create: `tests/interaction-architecture.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `astro.config.ts`
- Modify: `src/env.d.ts`
- Delete: `src/lib/supabase/config.ts`
- Delete: `src/lib/supabase/client.ts`
- Delete: `src/lib/supabase/database.types.ts`
- Delete: `supabase/config.toml`
- Delete: `supabase/migrations/202607160001_website_v2.sql`
- Delete: `supabase/tests/website_v2.test.sql`
- Delete: `tests/supabase-config.test.ts`
- Delete: `tests/database-migration.test.ts`

- [ ] **Step 1: Write the architecture test before deleting anything**

```ts
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const absolute = (path: string) => resolve(root, path)

describe('interaction architecture', () => {
  test('the Astro site does not connect to Supabase directly', () => {
    const pkg = JSON.parse(readFileSync(absolute('package.json'), 'utf8'))
    expect(pkg.dependencies['@supabase/supabase-js']).toBeUndefined()
    expect(existsSync(absolute('src/lib/supabase'))).toBe(false)
    expect(existsSync(absolute('supabase'))).toBe(false)
  })

  test('declares only the public Waline interaction variable', () => {
    const env = readFileSync(absolute('src/env.d.ts'), 'utf8')
    expect(env).toContain('PUBLIC_WALINE_SERVER_URL')
    expect(env).not.toContain('NEXT_PUBLIC_SUPABASE')
    expect(env).not.toContain('PG_PASSWORD')
    expect(env).not.toContain('SMTP_PASS')
  })
})
```

- [ ] **Step 2: Run RED**

Run: `bun test tests/interaction-architecture.test.ts`

Expected: FAIL because the Supabase dependency and local implementation still exist.

- [ ] **Step 3: Remove the dependency and obsolete files**

Run: `bun remove @supabase/supabase-js`

Delete every file listed above. Remove `NEXT_PUBLIC_` from `vite.envPrefix` so `astro.config.ts` contains:

```ts
vite: { envPrefix: ['PUBLIC_'] },
```

Replace `src/env.d.ts` with:

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WALINE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 4: Verify and commit**

Run: `bun test tests/interaction-architecture.test.ts && bun run check`

Expected: PASS and zero Astro diagnostics.

```powershell
git add -A
git commit -m "refactor: replace custom interactions with Waline"
```

---

### Task 2: Build the Deterministic Obsidian Importer

**Files:**
- Create: `src/utils/obsidian-import.ts`
- Create: `scripts/import-obsidian-posts.ts`
- Create: `tests/obsidian-import.test.ts`

- [ ] **Step 1: Write failing converter tests**

```ts
import { describe, expect, test } from 'bun:test'
import { convertObsidianMarkdown } from '../src/utils/obsidian-import'

describe('convertObsidianMarkdown', () => {
  test('converts callouts and demotes body h1 headings', () => {
    const source = '> [!warning]+ 核心区别\n> 请谨慎操作\n\n# 第二部分\n正文'
    const result = convertObsidianMarkdown(source)
    expect(result).toContain('> **警告 · 核心区别**')
    expect(result).toContain('## 第二部分')
    expect(result).not.toContain('[!warning]')
  })

  test('normalizes non-breaking spaces without changing placeholders', () => {
    expect(convertObsidianMarkdown('git\u00a0log\nANTHROPIC_API_KEY=你的智谱api key'))
      .toBe('git log\nANTHROPIC_API_KEY=你的智谱api key')
  })

  test('fences command-only callout lines', () => {
    const result = convertObsidianMarkdown('> [!bash]+ 查看历史\n> git log -- notes.md')
    expect(result).toContain('> **命令 · 查看历史**')
    expect(result).toContain('> ```bash\n> git log -- notes.md\n> ```')
  })
})
```

- [ ] **Step 2: Run RED**

Run: `bun test tests/obsidian-import.test.ts`

Expected: FAIL because `src/utils/obsidian-import.ts` does not exist.

- [ ] **Step 3: Implement the pure converter**

```ts
const CALLOUT_LABELS: Record<string, string> = {
  bash: '命令',
  danger: '危险',
  info: '信息',
  success: '成功',
  tip: '提示',
  warning: '警告'
}

export function convertObsidianMarkdown(source: string) {
  return source
    .replaceAll('\u00a0', ' ')
    .replace(/^# /gm, '## ')
    .replace(
      /^> \[!(bash|danger|info|success|tip|warning)\]\+?\s*(.*)$/gm,
      (_, type: string, title: string) =>
        `> **${CALLOUT_LABELS[type]}${title ? ` · ${title.trim()}` : ''}**`
    )
    .replace(
      /^> ((?:git|obsidian|python|node|npx|bun|npm|ANTHROPIC_[A-Z_]+=).*)$/gm,
      '> ```bash\n> $1\n> ```'
    )
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

- [ ] **Step 4: Implement the exact source mapping**

`scripts/import-obsidian-posts.ts` reads these five files:

```ts
const posts = [
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian AI Agent 配置指南：Claudian + Obsidian Skills.md',
    slug: 'obsidian-ai-agent-claudian-skills',
    title: 'Obsidian AI Agent 配置指南：Claudian + Obsidian Skills',
    description: '在 Obsidian 中配置 Claudian 与 Obsidian Skills，构建本地优先的 AI Agent 工作流。',
    tags: ['obsidian', 'ai-agent', 'claudian', 'skills']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian CLI 核心原理.md',
    slug: 'obsidian-cli-core-principles',
    title: 'Obsidian CLI 核心原理',
    description: '理解 Obsidian CLI 的架构、Agent 集成方式与自动化工作流。',
    tags: ['obsidian', 'cli', 'ai-agent', '自动化']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Git 进阶操作：版本管理，分支管理.md',
    slug: 'git-advanced-version-branch',
    title: 'Git 进阶操作：版本管理与分支管理',
    description: '用 Git log、restore、revert、reset、blame 与分支操作管理笔记和代码版本。',
    tags: ['git', '版本管理', '分支管理']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian 必装 Skills.md',
    slug: 'obsidian-essential-skills',
    title: 'Obsidian 必装 Skills',
    description: '整理适合 Obsidian AI 工作流的 Skills、用途、依赖与风险。',
    tags: ['obsidian', 'skills', 'ai-agent']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian 官方 CLI 命令全景速查表.md',
    slug: 'obsidian-cli-command-reference',
    title: 'Obsidian 官方 CLI 命令全景速查表',
    description: '按模块速查 Obsidian CLI 命令、完整样例和典型自动化场景。',
    tags: ['obsidian', 'cli', '速查表']
  }
] as const
```

The script must:

1. call `readFileSync(source, 'utf8')`;
2. derive `publishDate` as local `YYYY-MM-DD` from `statSync(source).mtime`;
3. JSON-encode title, description, tags, and language in YAML frontmatter;
4. set `language: "zh-CN"` and `draft: false`;
5. call `convertObsidianMarkdown`;
6. write `src/content/blog/${slug}.md` with `Bun.write`;
7. produce byte-identical output on a second run.

- [ ] **Step 5: Verify and commit**

Run: `bun test tests/obsidian-import.test.ts`

Expected: all converter tests pass.

```powershell
git add src/utils/obsidian-import.ts scripts/import-obsidian-posts.ts tests/obsidian-import.test.ts
git commit -m "feat: add deterministic Obsidian importer"
```

---

### Task 3: Import and Validate the Five Articles

**Files:**
- Create: `src/content/blog/obsidian-ai-agent-claudian-skills.md`
- Create: `src/content/blog/obsidian-cli-core-principles.md`
- Create: `src/content/blog/git-advanced-version-branch.md`
- Create: `src/content/blog/obsidian-essential-skills.md`
- Create: `src/content/blog/obsidian-cli-command-reference.md`
- Create: `tests/articles.test.ts`
- Modify: `tests/content-cleanup.test.ts`
- Modify: `tests/pages.test.ts`
- Modify: `src/assets/styles/app.css`

- [ ] **Step 1: Run the importer**

Run: `bun scripts/import-obsidian-posts.ts`

Expected: exactly five `.md` files are written under `src/content/blog`.

- [ ] **Step 2: Replace obsolete empty-blog assertions**

`tests/articles.test.ts` must assert:

- the exact five slugs and titles above;
- `draft: false`, `language: "zh-CN"`, a valid `publishDate`, description, and tags;
- at least one body heading in every article;
- no `> [!` callout markers remain;
- `ANTHROPIC_API_KEY=你的智谱api key` is retained where present;
- no private key blocks, `AKIA` access keys, or realistic `sk-` secrets exist.

Update `tests/content-cleanup.test.ts` to expect the five files and to stop asserting that Waline is absent. Update the home/page tests so they no longer require “还没有文章，第一篇正在路上。”

- [ ] **Step 3: Make large Markdown tables responsive**

Append to `src/assets/styles/app.css`:

```css
@media (max-width: 767px) {
  .prose table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    white-space: nowrap;
  }
}
```

- [ ] **Step 4: Verify deterministic output and commit**

Run twice:

```powershell
bun scripts/import-obsidian-posts.ts
git add src/content/blog
bun scripts/import-obsidian-posts.ts
git diff --exit-code -- src/content/blog
```

Expected: the second import produces no diff.

Run: `bun test tests/obsidian-import.test.ts tests/articles.test.ts tests/content-cleanup.test.ts tests/pages.test.ts`

Expected: PASS.

```powershell
git add src/content/blog src/assets/styles/app.css tests
git commit -m "feat: publish initial Obsidian articles"
```

---

### Task 4: Add Typed Waline Configuration

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/lib/waline/config.ts`
- Create: `tests/waline-config.test.ts`

- [ ] **Step 1: Write failing configuration and path tests**

```ts
import { describe, expect, test } from 'bun:test'
import { normalizeWalinePath, resolveWalineConfig } from '../src/lib/waline/config'

describe('Waline configuration', () => {
  test('normalizes equivalent URLs to one comment path', () => {
    expect(normalizeWalinePath('blog/post/?from=home#comments')).toBe('/blog/post')
    expect(normalizeWalinePath('/guestbook/')).toBe('/guestbook')
    expect(normalizeWalinePath('/')).toBe('/')
  })

  test('enables only safe server URLs', () => {
    expect(resolveWalineConfig({})).toEqual({ enabled: false, serverURL: '' })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'javascript:alert(1)' }))
      .toEqual({ enabled: false, serverURL: '' })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'https://cc-waline.vercel.app/' }))
      .toEqual({ enabled: true, serverURL: 'https://cc-waline.vercel.app' })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'http://localhost:8360/' }))
      .toEqual({ enabled: true, serverURL: 'http://localhost:8360' })
  })
})
```

- [ ] **Step 2: Run RED**

Run: `bun test tests/waline-config.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Install the pinned client and implement configuration**

Run: `bun add @waline/client@3.15.2 --exact`

```ts
export type PublicWalineEnv = Record<string, string | undefined>

export function normalizeWalinePath(input: string) {
  const pathname = input.split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '')
}

export function resolveWalineConfig(env: PublicWalineEnv) {
  const candidate = env.PUBLIC_WALINE_SERVER_URL?.trim().replace(/\/+$/, '') ?? ''

  try {
    const url = new URL(candidate)
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    const enabled = url.protocol === 'https:' || local
    return enabled
      ? { enabled: true, serverURL: candidate }
      : { enabled: false, serverURL: '' }
  } catch {
    return { enabled: false, serverURL: '' }
  }
}

export const walineConfig = resolveWalineConfig(import.meta.env)
```

- [ ] **Step 4: Verify and commit**

Run: `bun test tests/waline-config.test.ts && bun run check`

Expected: PASS and zero diagnostics.

```powershell
git add package.json bun.lock src/lib/waline tests/waline-config.test.ts
git commit -m "feat: add typed Waline configuration"
```

---

### Task 5: Build the Thin Waline Thread and Integrate It

**Files:**
- Create: `src/components/waline/WalineThread.astro`
- Create: `src/pages/guestbook.astro`
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/site.config.ts`
- Modify: `tests/content-cleanup.test.ts`
- Create: `tests/waline-component.test.ts`
- Modify: `tests/pages.test.ts`

- [ ] **Step 1: Write a failing structural contract**

The test reads the component and integration files and asserts:

```ts
expect(component).toContain("login: 'force'")
expect(component).toContain("dark: 'html.dark'")
expect(component).toContain('imageUploader: false')
expect(component).toContain('wordLimit: [1, 1000]')
expect(component).toContain('data-waline-status')
expect(blogLayout).toContain("path={`/blog/${id}`}")
expect(blogLayout).toContain('reaction={true}')
expect(guestbook).toContain("path='/guestbook'")
expect(guestbook).toContain('reaction={false}')
expect(siteConfig).toContain("title: '留言板'")
```

Run: `bun test tests/waline-component.test.ts`

Expected: FAIL because the component and page do not exist.

- [ ] **Step 2: Implement `WalineThread.astro`**

The component has this exact public interface:

```ts
interface Props {
  path: string
  reaction?: boolean
  title?: string
}
```

Use `normalizeWalinePath(path)` and render article content even when Waline is unavailable. Import `@waline/client/waline.css` and initialize each uninitialized shell with:

```ts
init({
  el: root,
  serverURL,
  path,
  lang: 'zh-CN',
  login: 'force',
  reaction: shell.dataset.reaction === 'true',
  dark: 'html.dark',
  wordLimit: [1, 1000],
  imageUploader: false
})
```

Implementation rules:

- transfer `serverURL`, `path`, and `reaction` through `data-*` attributes;
- show “评论正在加载……” before initialization;
- replace it with “评论服务暂时不可用，请稍后重试。” on synchronous failure;
- after eight seconds without a `.wl-panel`, show the same retry message;
- hide the status after `.wl-panel` appears;
- mark the shell with `data-initialized='true'` to prevent duplicate Astro view-transition initialization;
- never call Waline when `walineConfig.enabled` is false; show “评论服务尚未启用。”

- [ ] **Step 3: Integrate article comments and reactions**

Import `WalineThread` in `src/layouts/BlogPost.astro` and add it after `ArticleBottom`:

```astro
<WalineThread path={`/blog/${id}`} reaction={true} title='评论与回应' />
```

- [ ] **Step 4: Create the guestbook and navigation entry**

Create `/guestbook` with title “留言板”, explanatory text “留言公开可见，登录后可以发布。”, and:

```astro
<WalineThread path='/guestbook' reaction={false} title='伙伴留言' />
```

Add `{ title: '留言板', link: '/guestbook' }` to the header menu. Remove the disabled `integ.waline` block from `src/site.config.ts` because the local wrapper is now authoritative.

- [ ] **Step 5: Verify and commit**

Run: `bun test tests/waline-config.test.ts tests/waline-component.test.ts tests/pages.test.ts tests/content-cleanup.test.ts && bun run check`

Expected: PASS and zero Astro diagnostics.

```powershell
git add src/components/waline src/pages/guestbook.astro src/layouts/BlogPost.astro src/site.config.ts tests
git commit -m "feat: add Waline comments reactions and guestbook"
```

---

### Task 6: Verify and Publicly Deploy the Astro Site with Pagefind

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the complete local suite**

```powershell
bun test
bun run check
$env:SITE_URL='https://cc-xgmx2005.vercel.app'
bun run build
```

Expected:

- all tests pass;
- Astro reports zero diagnostics;
- five article routes, tags, archives, RSS, sitemap, and Pagefind index build;
- `/guestbook` renders its unavailable state because `PUBLIC_WALINE_SERVER_URL` is not set yet.

- [ ] **Step 2: Scan the browser output for forbidden secrets**

Run:

```powershell
rg -n "PG_PASSWORD|SMTP_PASS|POSTGRES_URL|SUPABASE_SECRET|2463323447@qq.com" dist
```

Expected: no matches. `rg` exit code 1 means the scan is clean.

- [ ] **Step 3: Document the deployment boundary**

README must list only:

- `PUBLIC_WALINE_SERVER_URL` for the Astro site;
- `bun scripts/import-obsidian-posts.ts`;
- `bun test`, `bun run check`, and `bun run build`;
- a statement that database/SMTP secrets belong only to `cc-waline` on Vercel;
- Pagefind remains available before Algolia approval.

- [ ] **Step 4: Commit and deploy**

```powershell
git add README.md
git commit -m "docs: document Waline content operations"
git push -u origin feature/website-v2
```

Merge through the normal branch review flow, then wait for the production Vercel deployment.

Verify HTTP 200 for:

- `/`
- `/blog`
- all five article slugs
- `/guestbook`
- `/search`
- `/rss.xml`
- `/sitemap-index.xml`

Expected: the public search uses Pagefind and all five article pages are crawlable without authentication.

---

### Task 7: Create the Independent `cc-waline` Service

**Repository:** New GitHub repository `xgmx2005/cc-waline`

**Files in that repository:**
- Modify: `package.json`
- Modify: lockfile generated by the official template
- Create: `schema/waline.pgsql`
- Create: `README.md`

- [ ] **Step 1: Create from the official template**

Open:

`https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwalinejs%2Fwaline%2Ftree%2Fmain%2Fexample`

Create the GitHub repository and Vercel project as `cc-waline`. Do not expose it in the Astro site yet.

- [ ] **Step 2: Pin the server**

The official template currently uses `"@waline/vercel": "latest"`. Replace it with:

```json
{
  "name": "cc-waline",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@waline/vercel": "1.41.3"
  }
}
```

Regenerate and commit the template's lockfile. Do not change the official API entrypoint.

- [ ] **Step 3: Vendor and review the official PostgreSQL schema**

Copy the official schema from:

`https://raw.githubusercontent.com/walinejs/waline/main/assets/waline.pgsql`

to `schema/waline.pgsql`. Before applying it, assert the file creates exactly these Waline tables:

- `wl_comment`
- `wl_counter`
- `wl_users`

It must not contain the superseded custom tables `profiles`, `comments`, `post_likes`, or `site_admins`.

- [ ] **Step 4: Apply the schema once in Supabase**

Use the existing Tokyo Supabase project's SQL editor. Paste the reviewed `schema/waline.pgsql`, execute it once, then run:

```sql
select tablename
from pg_tables
where schemaname = 'public' and tablename like 'wl_%'
order by tablename;
```

Expected rows: `wl_comment`, `wl_counter`, `wl_users`.

Do not run the old `202607160001_website_v2.sql` migration.

- [ ] **Step 5: Configure Vercel environment variables**

Set these non-secret values for Production, Preview, and Development:

```text
SITE_NAME=CC
SITE_URL=https://cc-xgmx2005.vercel.app
LOGIN=force
PG_PREFIX=wl_
PG_SSL=true
DISABLE_USERAGENT=true
DISABLE_REGION=true
COMMENT_AUDIT=false
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=2463323447@qq.com
SMTP_SECURE=true
SENDER_NAME=CC
SENDER_EMAIL=2463323447@qq.com
AUTHOR_EMAIL=2463323447@qq.com
```

Set `SERVER_URL` to the canonical HTTPS URL Vercel assigned to `cc-waline`.

Set `SECURE_DOMAINS` to a comma-separated list containing exactly:

- `cc-xgmx2005.vercel.app`
- the assigned `cc-waline` Vercel hostname

Copy `PG_HOST`, `PG_PORT`, `PG_DB`, and `PG_USER` from the Supabase transaction-pooler connection parameters. Set `PG_PASSWORD` as a Vercel secret. Leave `OAUTH_URL` unset so Waline uses its default public OAuth service.

- [ ] **User Checkpoint: Enter secrets**

CC enters these values directly in Vercel:

- the Supabase database password as `PG_PASSWORD`;
- the QQ SMTP authorization code, not the QQ login password, as `SMTP_PASS`.

Do not ask CC to paste either value into chat or a shell command.

- [ ] **Step 6: Redeploy and verify the service**

Trigger a fresh Vercel production deployment after environment variables are saved.

Expected:

- the Waline service root responds successfully;
- `/ui/register` loads;
- requests from the site domain are accepted;
- a request with an unrelated `Referer` is rejected;
- Vercel logs contain no database password or SMTP authorization code.

- [ ] **Step 7: Commit the independent service**

```powershell
git add -A
git commit -m "feat: deploy Waline service"
git push origin main
```

README documents variable names only, the schema source URL, and the upgrade process: update one pinned version, regenerate the lockfile, test registration/comments, then deploy.

---

### Task 8: Establish the First Admin and Activate Waline

- [ ] **User Checkpoint: Register CC before opening public registration**

CC opens the assigned Waline `/ui/register` page and registers the first account with:

`2463323447@qq.com`

Complete the QQ email verification. Confirm that the account is the initial Waline administrator before continuing.

- [ ] **Step 1: Verify both login methods**

In a private browser session:

1. verify a signed-out visitor can read comments but cannot publish;
2. verify the confirmed email/password account can log in;
3. verify GitHub login redirects through Waline's default public OAuth service and returns successfully.

- [ ] **Step 2: Connect the Astro site**

In the Astro Vercel project, set:

```text
PUBLIC_WALINE_SERVER_URL=<the canonical cc-waline HTTPS URL>
```

This is public configuration, not a secret. Redeploy the Astro production site.

- [ ] **Step 3: Run end-to-end acceptance checks**

Verify:

- article content renders before and during Waline loading;
- signed-out publishing is blocked;
- CC can publish and delete an article comment;
- a second account can reply using Waline's native reply model;
- `/guestbook` uses a separate `/guestbook` thread;
- reactions appear on articles but not the guestbook;
- light mode and `html.dark` mode are readable;
- QQ confirmation and reply-notification emails arrive;
- Supabase row counts persist in `wl_comment`, `wl_counter`, and `wl_users`;
- an intentionally invalid server URL shows the retry message without breaking the article.

- [ ] **Step 4: Final repository verification**

```powershell
bun test
bun run check
$env:SITE_URL='https://cc-xgmx2005.vercel.app'
bun run build
rg -n "PG_PASSWORD|SMTP_PASS|POSTGRES_URL|SUPABASE_SECRET" dist
git status --short
```

Expected: tests and build pass, secret scan has no matches, and the worktree is clean.

---

## Plan Self-Review

- **Spec coverage:** The plan removes custom Supabase code, imports five articles, adds article comments/reactions and a guestbook, deploys a separate Waline service, initializes the official schema, forces login, configures QQ email and GitHub login, and establishes CC as first administrator.
- **Security boundary:** The Astro bundle receives only `PUBLIC_WALINE_SERVER_URL`. Database and SMTP secrets are entered only in the Waline Vercel project and are never printed.
- **Failure boundary:** Article content and Pagefind do not depend on Waline availability. The component has disabled, loading, and retry states.
- **Data ownership:** Waline alone owns `wl_comment`, `wl_counter`, and `wl_users`; no custom interaction schema remains.
- **Operational sequencing:** Public content ships before DocSearch, the Waline service remains independent, and Algolia work starts only after this plan's public crawlability checks pass.
