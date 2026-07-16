# Algolia DocSearch Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Start only after `2026-07-16-waline-content-rollout-implementation.md` is complete and the production site is publicly crawlable.

**Goal:** Make Algolia DocSearch the primary search experience for CC's public technical blog while preserving Pagefind as a visible, functional fallback.

**Architecture:** The Astro build selects Algolia only when all three public DocSearch values are present. The browser receives a search-only API key and mounts DocSearch v3. Pagefind remains indexed in every build and is shown automatically before approval or manually when Algolia is unavailable. Algolia's hosted crawler indexes only public technical content.

**Tech Stack:** Astro 6.2.1, TypeScript 6, Bun, `@docsearch/js` 3.9.0, `@docsearch/css` 3.9.0, Algolia Crawler, Pagefind.

## Global Constraints

- Do not begin until all five article URLs return HTTP 200 without authentication.
- Keep `integ.pagefind: true` and keep `<PFSearch />` in the shipped search page.
- Expose only App ID, index name, and a search-only key. Never expose an Algolia Admin API key.
- Preserve the required “Search by Algolia” attribution.
- Crawl `/blog/**`, `/tags/**`, and `/archives/**`; exclude `/guestbook`, Waline, authentication, and administration pages.
- If any Algolia variable is absent or DocSearch fails at runtime, local Pagefind search remains usable.
- Use DocSearch v3 because it is the stable, documented vanilla-JavaScript integration; do not migrate to the v4 line in this rollout.

---

### Task 1: Add Strict Search Provider Configuration

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/env.d.ts`
- Create: `src/lib/search/config.ts`
- Create: `tests/search-config.test.ts`

- [ ] **Step 1: Write failing configuration tests**

```ts
import { describe, expect, test } from 'bun:test'
import { resolveSearchConfig } from '../src/lib/search/config'

describe('search configuration', () => {
  test('uses Pagefind until every Algolia value exists', () => {
    expect(resolveSearchConfig({})).toEqual({ algolia: null, mode: 'pagefind' })
    expect(resolveSearchConfig({
      PUBLIC_ALGOLIA_APP_ID: 'APP',
      PUBLIC_ALGOLIA_SEARCH_API_KEY: 'search-only'
    })).toEqual({ algolia: null, mode: 'pagefind' })
  })

  test('uses Algolia with trimmed public values', () => {
    expect(resolveSearchConfig({
      PUBLIC_ALGOLIA_APP_ID: ' APP ',
      PUBLIC_ALGOLIA_INDEX_NAME: ' cc-blog ',
      PUBLIC_ALGOLIA_SEARCH_API_KEY: ' search-only '
    })).toEqual({
      algolia: {
        apiKey: 'search-only',
        appId: 'APP',
        indexName: 'cc-blog'
      },
      mode: 'algolia'
    })
  })
})
```

- [ ] **Step 2: Run RED**

Run: `bun test tests/search-config.test.ts`

Expected: FAIL because the search configuration module does not exist.

- [ ] **Step 3: Install pinned DocSearch packages**

Run:

```powershell
bun add @docsearch/js@3.9.0 @docsearch/css@3.9.0 --exact
```

- [ ] **Step 4: Implement the resolver**

```ts
export type PublicSearchEnv = Record<string, string | undefined>

export function resolveSearchConfig(env: PublicSearchEnv) {
  const appId = env.PUBLIC_ALGOLIA_APP_ID?.trim() ?? ''
  const apiKey = env.PUBLIC_ALGOLIA_SEARCH_API_KEY?.trim() ?? ''
  const indexName = env.PUBLIC_ALGOLIA_INDEX_NAME?.trim() ?? ''

  if (!appId || !apiKey || !indexName) {
    return { algolia: null, mode: 'pagefind' as const }
  }

  return {
    algolia: { apiKey, appId, indexName },
    mode: 'algolia' as const
  }
}

export const searchConfig = resolveSearchConfig(import.meta.env)
```

Extend `src/env.d.ts` with:

```ts
readonly PUBLIC_ALGOLIA_APP_ID?: string
readonly PUBLIC_ALGOLIA_INDEX_NAME?: string
readonly PUBLIC_ALGOLIA_SEARCH_API_KEY?: string
```

- [ ] **Step 5: Verify and commit**

Run: `bun test tests/search-config.test.ts && bun run check`

Expected: PASS and zero diagnostics.

```powershell
git add package.json bun.lock src/env.d.ts src/lib/search tests/search-config.test.ts
git commit -m "feat: add DocSearch provider configuration"
```

---

### Task 2: Build DocSearch with a Permanent Pagefind Fallback

**Files:**
- Create: `src/components/search/DocSearch.astro`
- Modify: `src/pages/search/index.astro`
- Create: `tests/search-page.test.ts`

- [ ] **Step 1: Write the failing page contract**

The test must assert:

```ts
expect(component).toContain("from '@docsearch/js'")
expect(component).toContain("import '@docsearch/css'")
expect(component).toContain('data-docsearch-status')
expect(component).toContain('data-pagefind-fallback')
expect(component).toContain('facetFilters')
expect(searchPage).toContain("searchConfig.mode === 'algolia'")
expect(searchPage).toContain('<PFSearch />')
```

Run: `bun test tests/search-page.test.ts`

Expected: FAIL because `DocSearch.astro` does not exist.

- [ ] **Step 2: Implement the component**

`DocSearch.astro` receives:

```ts
interface Props {
  apiKey: string
  appId: string
  indexName: string
}
```

It renders:

- a `<div data-docsearch-root>` mount point;
- an `aria-live` status initially saying “在线搜索正在加载……”;
- a visible `<details data-pagefind-fallback>` titled “使用本地搜索” containing `<PFSearch />`;
- an explanatory message if initialization throws.

Initialize from data attributes:

```ts
docsearch({
  container: root,
  appId,
  apiKey,
  indexName,
  placeholder: '搜索文章',
  searchParameters: {
    facetFilters: ['language:zh-CN']
  }
})
```

After successful initialization, hide the loading status. On error, set it to “在线搜索暂时不可用，请使用下方本地搜索。” and open the Pagefind `<details>`.

Never remove DocSearch's built-in Algolia attribution.

- [ ] **Step 3: Switch the search page safely**

Import `searchConfig` and `DocSearch`. Replace the current `integ.pagefind` conditional with:

```astro
{
  searchConfig.mode === 'algolia' && searchConfig.algolia ? (
    <DocSearch {...searchConfig.algolia} />
  ) : integ.pagefind ? (
    <>
      <p>输入关键词搜索全部文章。</p>
      <PFSearch />
    </>
  ) : (
    <p>搜索功能未启用。</p>
  )
}
```

Pagefind remains inside `DocSearch.astro` in Algolia mode, so both branches ship a local search.

- [ ] **Step 4: Verify both build modes**

Without Algolia variables:

```powershell
Remove-Item Env:PUBLIC_ALGOLIA_APP_ID -ErrorAction SilentlyContinue
Remove-Item Env:PUBLIC_ALGOLIA_INDEX_NAME -ErrorAction SilentlyContinue
Remove-Item Env:PUBLIC_ALGOLIA_SEARCH_API_KEY -ErrorAction SilentlyContinue
bun test tests/search-config.test.ts tests/search-page.test.ts
bun run build
```

Expected: Pagefind is primary.

With non-secret test values:

```powershell
$env:PUBLIC_ALGOLIA_APP_ID='TESTAPP'
$env:PUBLIC_ALGOLIA_INDEX_NAME='test-index'
$env:PUBLIC_ALGOLIA_SEARCH_API_KEY='search-only-test'
bun run build
```

Expected: build succeeds and both DocSearch and Pagefind assets are present.

- [ ] **Step 5: Commit**

```powershell
git add src/components/search src/pages/search/index.astro tests/search-page.test.ts
git commit -m "feat: add DocSearch with Pagefind fallback"
```

---

### Task 3: Make Public Pages Crawler-Ready

**Files:**
- Modify: `src/components/BaseHead.astro`
- Create: `docs/operations/algolia-docsearch.md`
- Modify: `tests/search-page.test.ts`

- [ ] **Step 1: Add a failing metadata test**

```ts
expect(baseHead).toContain("name='docsearch:language'")
expect(baseHead).toContain("content='zh-CN'")
```

Run: `bun test tests/search-page.test.ts`

Expected: FAIL until the metadata is added.

- [ ] **Step 2: Add DocSearch language metadata**

Add to `src/components/BaseHead.astro`:

```astro
<meta name='docsearch:language' content='zh-CN' />
```

Do not add a fake version facet.

- [ ] **Step 3: Document the exact crawler configuration**

Create `docs/operations/algolia-docsearch.md` with this configuration, replacing only the dashboard-assigned `appId` and `indexName` when the crawler is created:

```js
new Crawler({
  appId: 'DASHBOARD_ASSIGNED_APP_ID',
  apiKey: process.env.API_KEY,
  rateLimit: 8,
  startUrls: ['https://cc-xgmx2005.vercel.app/blog'],
  sitemaps: ['https://cc-xgmx2005.vercel.app/sitemap-index.xml'],
  ignoreCanonicalTo: false,
  exclusionPatterns: [
    'https://cc-xgmx2005.vercel.app/guestbook**',
    'https://cc-xgmx2005.vercel.app/search**'
  ],
  actions: [
    {
      indexName: 'DASHBOARD_ASSIGNED_INDEX_NAME',
      pathsToMatch: [
        'https://cc-xgmx2005.vercel.app/blog/**',
        'https://cc-xgmx2005.vercel.app/tags/**',
        'https://cc-xgmx2005.vercel.app/archives/**'
      ],
      recordExtractor: ({ helpers }) =>
        helpers.docsearch({
          recordProps: {
            lvl0: '#content-header h1',
            lvl1: '#content h2',
            lvl2: '#content h3',
            lvl3: '#content h4',
            lvl4: '#content h5',
            lvl5: '#content h6',
            content: '#content p, #content li, #content td, #content code'
          },
          aggregateContent: true,
          recordVersion: 'v3'
        })
    }
  ],
  initialIndexSettings: {
    'DASHBOARD_ASSIGNED_INDEX_NAME': {
      attributesForFaceting: ['filterOnly(language)']
    }
  }
})
```

Also document:

- domain verification methods;
- URL tester checks for one article, one tag, and one archive page;
- guestbook and Waline domains must return zero crawler records;
- only the search-only key belongs in the Astro Vercel project;
- weekly crawling plus a manual crawl after publishing a new article.

- [ ] **Step 4: Verify static markup and commit**

Run:

```powershell
bun test tests/search-page.test.ts
$env:SITE_URL='https://cc-xgmx2005.vercel.app'
bun run build
rg -n 'docsearch:language|id="content-header"|id="content"' dist
```

Expected: metadata and crawler target containers exist in built HTML.

```powershell
git add src/components/BaseHead.astro docs/operations/algolia-docsearch.md tests/search-page.test.ts
git commit -m "feat: prepare public content for DocSearch crawling"
```

---

### Task 4: Verify Domain, Create the Crawler, and Review the Index

- [ ] **Step 1: Deploy crawler-ready markup**

Push the branch through normal review and wait for the production Vercel deployment. Confirm all five articles and `sitemap-index.xml` return HTTP 200.

- [ ] **Step 2: Add and verify the domain**

In Algolia Dashboard → Data sources → Crawler, add:

`cc-xgmx2005.vercel.app`

Use email verification when Algolia accepts the account/domain email. If it does not, use the dashboard-provided meta tag:

1. add the exact verification tag to `src/components/BaseHead.astro`;
2. commit and deploy it;
3. click “Verify now”;
4. retain the tag unless Algolia explicitly says it may be removed.

This dashboard-generated token is public domain-verification material, not an API key.

- [ ] **External Checkpoint: DocSearch approval**

Wait for Algolia to approve the public technical site. Do not add fake credentials and do not disable Pagefind while waiting.

- [ ] **Step 3: Create and test the crawler**

After approval:

1. create a crawler in the approved Algolia application;
2. paste the reviewed configuration from `docs/operations/algolia-docsearch.md`;
3. replace only the dashboard-assigned App ID and index name;
4. use URL Tester on:
   - `/blog/git-advanced-version-branch`
   - one `/tags/...` URL
   - one `/archives/...` URL
   - `/guestbook`
5. confirm the first three extract records and `/guestbook` extracts none;
6. run the initial test crawl.

- [ ] **Step 4: Review the first crawl before enabling the UI**

Expected:

- all five article titles are searchable;
- headings link to valid fragment IDs;
- Chinese body text is indexed;
- `language:zh-CN` exists on records;
- guestbook messages, Waline UI, account pages, and admin pages are absent;
- no duplicated navigation/footer prose dominates results;
- the index has a search-only API key restricted to this index.

Fix selectors and rerun the crawl if any condition fails.

---

### Task 5: Activate Production DocSearch and Complete Acceptance Testing

- [ ] **Step 1: Add public Vercel values**

In the Astro Vercel project, set for Production and Preview:

```text
PUBLIC_ALGOLIA_APP_ID=<Algolia application ID>
PUBLIC_ALGOLIA_INDEX_NAME=<approved crawler index name>
PUBLIC_ALGOLIA_SEARCH_API_KEY=<index-restricted search-only key>
```

Never set an Admin API key in a `PUBLIC_` variable. Redeploy production.

- [ ] **Step 2: Test normal and failure paths**

Verify in desktop and mobile Chrome:

- `/search` shows the DocSearch button;
- keyboard activation and `Ctrl+K` work;
- searching “Git 分支” finds the Git article;
- searching “Obsidian CLI” finds the relevant articles;
- result links open the correct article or heading;
- dark and light themes are readable;
- “Search by Algolia” remains visible;
- “使用本地搜索” opens a working Pagefind search;
- blocking `*.algolia.net` in DevTools shows the failure message and Pagefind still works.

- [ ] **Step 3: Run security and regression verification**

```powershell
bun test
bun run check
$env:SITE_URL='https://cc-xgmx2005.vercel.app'
bun run build
rg -n "ALGOLIA_ADMIN|ADMIN_API_KEY|PG_PASSWORD|SMTP_PASS|POSTGRES_URL" dist
git status --short
```

Expected: tests/build pass, the secret scan returns no matches, and the worktree is clean.

- [ ] **Step 4: Commit any verification-driven fixes**

If testing required code or documentation changes:

```powershell
git add src tests docs package.json bun.lock
git commit -m "feat: activate Algolia DocSearch"
git push
```

Wait for the final production deployment and repeat the normal/failure acceptance checks.

---

## Plan Self-Review

- **Dependency gate:** The plan cannot start until public content from the Waline/content rollout is crawlable.
- **Fallback guarantee:** Pagefind remains enabled, built, and visible in both configuration branches.
- **Security boundary:** Only a search-only key enters the browser; crawler and Admin API credentials never enter source or Vercel public variables.
- **Crawler scope:** Technical articles, tags, and archives are included; guestbook, Waline, login, and admin content are excluded.
- **Free-program compliance:** Algolia attribution remains visible and the hosted crawler workflow follows the approval/domain-verification sequence.
- **Failure handling:** Incomplete build-time configuration and runtime Algolia failure both preserve usable local search.
