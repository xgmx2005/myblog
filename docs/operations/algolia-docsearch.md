# Algolia DocSearch 操作手册

CC 的公开技术博客使用 Algolia DocSearch 作为在线搜索，Pagefind 始终作为本地后备。

## 当前生产信息

- Public origin：`https://ccxgmx.fun`
- Sitemap：`https://ccxgmx.fun/sitemap-index.xml`
- Index：`CC Blog DocSearch`
- 语言字段：`lang: zh-CN`
- 自动计划：每月 15 日
- 手动运行：发布或大幅更新文章后
- 抓取内容：公开文章、标签和归档
- 不进入索引：留言板、搜索页、Waline 服务、登录/资料页和管理端

## Crawler 配置

以下是当前配置的安全版本。App ID 和 Crawler API key 只在 Algolia 控制台中维护。

```js
new Crawler({
  appId: 'ALGOLIA_APP_ID',
  apiKey: process.env.API_KEY,
  indexPrefix: '',
  rateLimit: 8,
  startUrls: ['https://ccxgmx.fun'],
  renderJavaScript: false,
  maxDepth: 10,
  maxUrls: 100,
  schedule: 'on the 15 day of the month',
  sitemaps: [],
  ignoreCanonicalTo: false,
  discoveryPatterns: ['https://ccxgmx.fun/**'],
  actions: [
    {
      indexName: 'CC Blog DocSearch',
      pathsToMatch: ['https://ccxgmx.fun/**'],
      recordExtractor: ({ helpers }) =>
        helpers.docsearch({
          recordProps: {
            lvl0: {
              selectors: '#content-header h1',
              defaultValue: 'CC 技术博客'
            },
            lvl1: '#content h2',
            lvl2: '#content h3',
            lvl3: '#content h4',
            lvl4: '#content h5',
            lvl5: '#content h6',
            content: '#content p, #content li, #content td, #content code'
          },
          aggregateContent: false,
          recordVersion: 'v3'
        })
    }
  ],
  safetyChecks: {
    beforeIndexPublishing: {
      maxLostRecordsPercentage: 30
    }
  },
  initialIndexSettings: {
    'CC Blog DocSearch': {
      attributesForFaceting: ['type', 'lang', 'filterOnly(language)'],
      attributesToRetrieve: [
        'hierarchy',
        'content',
        'anchor',
        'url',
        'url_without_anchor',
        'type'
      ],
      attributesToHighlight: ['hierarchy', 'content'],
      attributesToSnippet: ['content:10'],
      camelCaseAttributes: ['hierarchy', 'content'],
      searchableAttributes: [
        'unordered(hierarchy.lvl0)',
        'unordered(hierarchy.lvl1)',
        'unordered(hierarchy.lvl2)',
        'unordered(hierarchy.lvl3)',
        'unordered(hierarchy.lvl4)',
        'unordered(hierarchy.lvl5)',
        'content'
      ],
      distinct: true,
      attributeForDistinct: 'url',
      ranking: ['words', 'filters', 'typo', 'attribute', 'proximity', 'exact', 'custom']
    }
  }
})
```

关键点：

- `aggregateContent: false` 防止长文章被合并成超大记录；
- selector 限制在 `#content-header` 和 `#content`，避免导航与页脚污染索引；
- `maxLostRecordsPercentage: 30` 在新索引异常减少时阻止自动替换；
- Crawler 可能发现留言板，但由于页面没有目标正文结构，URL Tester 应提取 0 条记录。

## URL Tester

发布 crawler 配置前测试：

| URL | 预期 |
| --- | --- |
| `https://ccxgmx.fun/blog/git-advanced-version-branch` | 多条文章 heading/正文记录 |
| `https://ccxgmx.fun/tags/git` | 标签页记录 |
| `https://ccxgmx.fun/archives` | 归档记录 |
| `https://ccxgmx.fun/guestbook` | 0 条记录 |

每个测试都应是 HTTP 200 和 `SUCCESS`。文章 Records 应包含：

- `hierarchy`；
- `content`；
- `url` 与 `url_without_anchor`；
- `lang: zh-CN`；
- heading anchor。

## 完整爬取

1. 在 Editor 中确认 `CONFIGURATION IS VALID`。
2. 使用 URL Tester 测试四类页面。
3. 选择 `Review and Publish` 保存当前版本。
4. 点击 `Start Crawling`。
5. 等待 Overview 显示 Crawl Complete。
6. 在 Monitoring 检查成功、忽略和失败 URL。
7. 在 Indices 检查记录数量和抽样内容。
8. 在 Search → Browse 搜索五篇文章的唯一关键词。

一次失败 URL 不一定表示整次爬取失败。先打开 Monitoring 查看失败类型；长文章的 `Records extracted are too big` 必须修复。

## 安全发布阻塞

如果出现 `SafeReindexingError`：

1. 比较旧记录数与新记录数；
2. 检查是否刚修改域名、selector、path 或 exclusion；
3. 确认五篇文章、标签和归档仍有记录；
4. 修复错误后重新抓取；
5. 只有记录减少确实符合预期时才替换生产索引。

不要长期禁用安全检查。30% 阈值用于避免一次错误配置清空大部分搜索数据。

## Astro 公共配置

Astro Vercel 项目只设置：

```text
PUBLIC_ALGOLIA_APP_ID
PUBLIC_ALGOLIA_INDEX_NAME
PUBLIC_ALGOLIA_SEARCH_API_KEY
```

Search key 必须：

- 只允许搜索；
- 只允许目标 index；
- 可以公开到浏览器；
- 不能是 Admin、Write 或 Crawler key。

修改变量后重新部署 Astro 网站。`src/components/search/DocSearch.astro` 使用 `lang:zh-CN` facet，所以 index 必须能按 `lang` 过滤。

## 自动与手动更新

- Crawler 每月 15 日自动运行；
- 新文章需要立即被搜索时手动运行；
- 只修正不影响搜索的样式或文案时不必手动运行；
- 修改 selector 前先使用 URL Tester；
- 完整爬取后检查记录数变化和失败 URL。

## Pagefind 后备

Pagefind 每次执行 `bun run build` 都会生成。DocSearch 缺少配置或运行失败时，访问者仍能使用本地搜索。

不要因为 Algolia 已稳定就删除 Pagefind，也不要让 Algolia Crawler 抓取 `cc-waline.vercel.app`。

## 故障排查

详细处理见 [常见问题排查](../troubleshooting.md)：

- 记录过大；
- 安全替换阻塞；
- 已爬取但前端没有新结果；
- 旧域名仍出现在记录 URL；
- `lang` facet 不匹配。
