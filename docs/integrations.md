# Waline、Supabase、Algolia 与 Pagefind

本文记录 Astro 网站与外部服务的当前边界。网站本身保持内容优先：即使评论或在线搜索暂时不可用，文章仍能访问。

## 服务总览

| 服务                | 当前地址或位置                 | 网站中的职责                       |
| ------------------- | ------------------------------ | ---------------------------------- |
| Waline              | `https://cc-waline.vercel.app` | 账户、评论、回复、文章反应、留言板 |
| Supabase PostgreSQL | 由 Waline 服务端私有连接       | 持久化 Waline 的 `wl_` 表          |
| Algolia DocSearch   | Astro 浏览器只读配置           | 在线全文搜索                       |
| Pagefind            | Astro 生产构建产物             | 本地全文搜索后备                   |

## Waline

### 当前功能

Waline 负责：

- 邮箱注册、登录、资料页和密码恢复；
- GitHub OAuth 登录；
- 文章评论与回复；
- 文章反应；
- `/guestbook` 留言；
- 管理员审核与用户管理；
- 评论通知邮件。

Astro 只负责加载 `@waline/client` 并传入公开服务地址和稳定 pathname。登录、会话、权限和数据写入都由 Waline 处理。

### 客户端行为

`src/components/waline/WalineThread.astro` 的当前配置：

| 配置            | 当前值           | 说明                 |
| --------------- | ---------------- | -------------------- |
| `lang`          | `zh-CN`          | 中文界面             |
| `login`         | `force`          | 登录后才能发布       |
| `reaction`      | 文章为 `true`    | 文章显示反应         |
| `reaction`      | 留言板为 `false` | 留言板不显示文章反应 |
| `dark`          | `html.dark`      | 跟随网站深色模式     |
| `wordLimit`     | `[1, 1000]`      | 评论长度范围         |
| `imageUploader` | `false`          | 禁止直接上传图片     |

文章使用规范化后的文章 pathname，留言板固定使用 `/guestbook`。路径稳定能够避免同一页面因查询参数或末尾斜杠形成多套评论。

### 服务端配置边界

以下变量属于独立的 `cc-waline` Vercel 项目：

| 分类       | 环境变量                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| PostgreSQL | `PG_HOST`、`PG_PORT`、`PG_DB`、`PG_USER`、`PG_PASSWORD`、`PG_PREFIX`、`PG_SSL`   |
| 登录安全   | `LOGIN`、`SECURE_DOMAINS`、`JWT_TOKEN`                                           |
| 邮件       | `SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、`SMTP_PASS`、`SENDER_NAME` |
| OAuth      | `OAUTH_URL` 以及自建 OAuth 时使用的 Client ID/Secret                             |
| 管理端资源 | `WALINE_ADMIN_MODULE_ASSET_URL`                                                  |
| 隐私       | `DISABLE_USERAGENT`、`DISABLE_REGION`                                            |

变量值只在 Vercel Dashboard 中维护。Astro 仓库只使用：

```text
PUBLIC_WALINE_SERVER_URL=https://cc-waline.vercel.app
```

### 管理端

- 管理入口：`https://cc-waline.vercel.app/ui`
- 登录、注册和个人资料页属于同一个 `@waline/admin` 单页应用。
- 当前仍使用 Waline 默认管理端 UI。
- 未来可以构建自定义 `@waline/admin` 资源，并通过 `WALINE_ADMIN_MODULE_ASSET_URL` 替换视觉层；功能逻辑继续由 Waline 提供。该 UI 定制尚未实施。

## Supabase PostgreSQL

Supabase 在当前架构中只作为 Waline 的 PostgreSQL 数据库：

- Astro 项目没有 Supabase 浏览器客户端；
- 网站没有 `PUBLIC_SUPABASE_*` 变量；
- Supabase Auth 不参与网站登录；
- Waline 使用服务端私有连接写入 `wl_` 前缀表；
- 数据库密码和连接串不得出现在 Astro 仓库、浏览器包、公开文档或截图中。

这一边界来自第二版架构调整：最初的自定义 Supabase 认证与互动方案已经被移除，以减少自定义表、会话、权限和前端状态代码。

## Algolia DocSearch

### 当前状态

- 在线搜索已经启用；
- 当前索引名称：`CC Blog DocSearch`；
- 正式抓取域名：`https://ccxgmx.fun`；
- 爬虫每月 15 日自动运行；
- 发布或大幅修改文章后可以手动运行；
- 页面使用 `lang:zh-CN` facet 过滤中文记录。

Astro 网站只需要三项公开配置：

```text
PUBLIC_ALGOLIA_APP_ID
PUBLIC_ALGOLIA_SEARCH_API_KEY
PUBLIC_ALGOLIA_INDEX_NAME
```

`PUBLIC_ALGOLIA_SEARCH_API_KEY` 必须是只读、仅允许搜索目标索引的 key。Admin key、Write key 和 Crawler API key 不能进入 Astro 项目。

详细爬虫配置和维护步骤见 [Algolia DocSearch 操作手册](operations/algolia-docsearch.md)。

## Pagefind 后备

Pagefind 在每次生产构建中索引 `dist/client`，不需要数据库或在线服务。

搜索模式由 `src/lib/search/config.ts` 决定：

1. 三项 Algolia 公共变量完整：显示 DocSearch，同时保留折叠的 Pagefind 入口。
2. 任一变量缺失：Pagefind 成为主搜索。
3. DocSearch 请求失败：自动展开 Pagefind 后备并显示中文提示。

Pagefind 不应因为 Algolia 已启用而删除。它同时解决 Algolia 配置缺失、网络故障、额度异常和爬虫尚未更新时的可用性问题。

## 配置与秘密边界

| 可以公开                                      | 必须保密                              |
| --------------------------------------------- | ------------------------------------- |
| 正式网站和 Waline URL                         | Supabase 密码与连接串                 |
| Algolia App ID                                | Algolia Admin、Write、Crawler API key |
| Algolia 只读 Search API key（但无需写入文档） | SMTP 授权码                           |
| Algolia index 名称                            | OAuth Client Secret                   |
| `PUBLIC_` 变量名称                            | Vercel OIDC token                     |
| Waline 服务端变量名称                         | JWT signing token                     |

判断原则：凡是进入 `PUBLIC_` 的值都会到达浏览器；能够写数据、管理索引或登录基础设施的值都不能使用该前缀。

## 修改后的验证

Waline：

1. 未登录用户可以阅读文章和留言；
2. 发布时要求登录；
3. 邮箱注册能收到确认邮件；
4. GitHub 登录能返回个人资料页；
5. 文章显示反应，留言板不显示反应；
6. 深浅色模式可读。

搜索：

1. 中文关键词能够返回文章标题和正文；
2. 点击结果进入 `ccxgmx.fun` 的正确 heading；
3. “使用本地搜索”可以展开；
4. 临时移除任一 Algolia 变量后，构建仍能使用 Pagefind；
5. Crawler 中 `/guestbook` 不生成记录。

## 相关文档

- [系统架构](architecture.md)
- [Vercel 部署、域名与环境变量](deployment.md)
- [常见问题排查](troubleshooting.md)
