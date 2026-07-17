# 项目演进与关键决策

本文只记录影响当前架构和维护方式的关键变化。更细的需求与实施过程保存在 [`docs/superpowers/`](superpowers/)。

## 2026-07-15：确定 Astro 与主题基础

项目从个人网站需求出发，比较了 Astro、Halo、Hexo 和 Hugo。最终选择 Astro，原因是：

- 内容以 Markdown 为主，适合博客与技术笔记；
- 静态内容性能好，同时允许按需加入服务端能力；
- 前端可自由定制，不需要维护传统 CMS；
- 与 Git、Vercel 自动部署配合简单。

最初考虑从 Astro minimal starter 自行搭建，但为了把时间集中在内容和功能上，随后确定以成熟的 [`cworld1/astro-theme-pure`](https://github.com/cworld1/astro-theme-pure) 为基础。项目记录的上游基准提交为 `0047f6d4278d4c3e823dca608022cd6ebe7b5c96`。

## 2026-07-16：完成个人化与首版页面

引入主题后完成了：

- CC 的公开资料、头像、学校、专业、地区和技术栈；
- 中文导航、页脚、RSS、favicon 与社交卡片；
- 首页、文章、项目、友链、关于等页面；
- 明亮艺术感与深浅色模式；
- 移除上游示例身份、示例文章和不适合的简历模板内容。

网站定位为个人内容站，不把 CC 描述为职业开发者。内容主要面向朋友、同行开发者和偶然访问的互联网用户。

## 2026-07-16：确定第二版互动架构

第二版最初实现过 Supabase 浏览器客户端，并计划自建注册、登录、评论、点赞和留言板数据模型。进一步评估维护成本后，架构改为：

- Waline 负责账号、评论、回复、反应、留言板和管理端；
- Supabase 只提供 Waline 使用的 PostgreSQL；
- Astro 不再直接连接 Supabase；
- Algolia DocSearch 负责在线搜索；
- Pagefind 保留为搜索后备。

这次调整减少了自定义认证、会话、权限策略、数据库表和前端交互代码。原有自定义 Supabase 交互实现已从网站中移除。

## 2026-07-16：导入首批 Obsidian 文章

为了避免手工复制和格式漂移，项目增加确定性导入脚本，将五篇已确认的 Obsidian 笔记转换为博客文章：

1. Obsidian AI Agent 配置指南；
2. Obsidian CLI 核心原理；
3. Git 进阶操作；
4. Obsidian 必装 Skills；
5. Obsidian CLI 命令速查。

导入脚本固定源文件、slug、标题、描述和标签，并转换 Obsidian callout。重复执行不会产生随机输出。

## 2026-07-16：部署 Waline 与留言板

建立独立的 `cc-waline` Vercel 项目：

- 使用 Supabase PostgreSQL 的 `wl_` 表；
- 强制登录后发布；
- 支持邮箱注册和 GitHub 登录；
- 使用 QQ SMTP 发送账户邮件；
- 文章启用评论、回复和反应；
- `/guestbook` 提供公开可读、登录可写的留言板。

Waline 服务故障不会阻止文章和留言板页面本身渲染。

## 2026-07-17：启用 Algolia DocSearch

网站先以 Pagefind 搜索上线，随后完成：

- Algolia 应用注册；
- 网站域名验证；
- Crawler 创建和 URL Tester 检查；
- 中文文章、标签和归档记录抽取；
- 过大记录修复；
- 安全发布检查；
- Astro DocSearch UI 与 Pagefind 后备；
- `lang:zh-CN` facet 对齐。

爬虫当前每月 15 日运行，重大内容更新后可以手动运行。Pagefind 始终随生产构建生成。

## 2026-07-17：启用自定义域名

正式入口从 Vercel 默认域名切换为：

```text
https://ccxgmx.fun
```

随后同步调整：

- Astro `SITE_URL`；
- Vercel domain alias；
- Waline 安全域名；
- Algolia 抓取 origin、路径和索引 URL；
- canonical、RSS 和 sitemap 的生产 origin。

`ccxgmx.fun` 是当前唯一对外正式域名，`*.vercel.app` 地址只用于服务端、预览或底层部署。

## 2026-07-17：建立项目文档体系

在功能稳定后，将此前分散在 README、设计说明、实施计划和操作记录中的信息整理为：

- 中文项目 README；
- 当前架构、开发、内容、部署和集成文档；
- 项目历史与常见问题；
- 自动化文档链接和秘密泄露检查。

## 当前状态

已经完成：

- 个人化 Astro 网站；
- 五篇首发技术文章；
- Vercel 自动预览与生产部署；
- `ccxgmx.fun` 自定义域名；
- Waline 登录、评论、回复、反应和留言板；
- Supabase PostgreSQL 持久化；
- Algolia DocSearch 与 Pagefind 后备；
- 中文维护文档。

## 明确未实施的方向

以下内容不是当前功能：

- CMS；
- Astro 内自建账号和认证系统；
- 浏览器端 Supabase Auth；
- Oracle 服务器上的生产网站或数据库；
- GitHub Actions 部署；
- 自定义 Waline 管理端 UI；
- 独立的文档网站。

其中 Waline 管理端 UI 已确认可以通过自定义 `@waline/admin` 资源实现，但当前继续使用官方界面。
