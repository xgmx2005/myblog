# Algolia DocSearch Operations

CC 的公开技术博客使用 Algolia DocSearch 作为在线搜索，Pagefind 始终作为本地兜底。DocSearch 审核或公开配置尚未完成时，网站只显示 Pagefind。

## Eligibility and public origin

- Public origin: `https://cc-xgmx2005.vercel.app`
- Sitemap: `https://cc-xgmx2005.vercel.app/sitemap-index.xml`
- Scope: public technical articles, tags, and archives
- Excluded: guestbook, search page, Waline service, login/profile pages, and administration pages

Algolia DocSearch accepts public technical blogs. Add and verify the domain within the dashboard's stated seven-day window. Because the site is hosted on `vercel.app` and the account email domain does not match, prefer the dashboard-provided meta tag. Add the exact public verification tag to `src/components/BaseHead.astro`, deploy it, and then click **Verify now**. HTML file, DNS, and `robots.txt` verification remain alternatives.

## Crawler configuration

Create the crawler only after Algolia approves the domain. Replace only the dashboard-assigned App ID and index name. The crawler API key remains inside Algolia and must never enter this repository or a `PUBLIC_` variable.

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

## First-crawl checks

Use the Crawler URL Tester before the first full crawl:

- `/blog/git-advanced-version-branch` must extract article records.
- `/tags/git` must extract tag-page records.
- `/archives` must extract archive records.
- `/guestbook` must extract zero records.

After the test crawl, confirm all five article titles and Chinese body text are searchable, heading fragments open correctly, and records contain `language: zh-CN`. Navigation/footer boilerplate must not dominate results. The separate `cc-waline.vercel.app` domain must not be added to the crawler, and guestbook, account, or administration content must remain absent.

## Public website configuration

Only these public, search-only values belong in the Astro Vercel project:

```text
PUBLIC_ALGOLIA_APP_ID
PUBLIC_ALGOLIA_INDEX_NAME
PUBLIC_ALGOLIA_SEARCH_API_KEY
```

Restrict the search-only key to the crawler index. Never use an Admin API key or crawler API key in a `PUBLIC_` variable. Pagefind remains enabled and visible as “使用本地搜索” after activation, and the DocSearch “Search by Algolia” attribution must remain visible.

## Schedule and publishing

Run the crawler weekly and trigger a manual crawl after publishing or substantially updating an article. Review crawler errors and record counts before activating new selector changes. If DocSearch is unavailable, leave the three public variables unset or use the visible Pagefind fallback.
