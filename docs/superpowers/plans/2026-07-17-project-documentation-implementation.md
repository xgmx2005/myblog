# CC Personal Site 项目文档实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一套以中文 `README.md` 为入口、覆盖开发、内容、部署、集成、历史和排错的公开安全项目文档。

**Architecture:** 根 README 只承载项目概览、快速开始和文档导航；`docs/README.md` 作为专题入口，七份职责单一的文档分别描述当前架构和维护流程。自动化测试负责约束文档文件、内部链接、上游残留和本地秘密泄露，现有 `docs/superpowers/` 保留为设计与实施历史。

**Tech Stack:** Markdown、Bun Test、Astro 6、Astro Theme Pure、Vercel、Waline、Supabase PostgreSQL、Algolia DocSearch、Pagefind

## Global Constraints

- `README.md` 是唯一主 README，使用中文。
- 删除仍保留上游主题介绍的 `README-zh-CN.md`。
- 所有文档适合公开 GitHub 仓库，禁止记录数据库密码、SMTP 授权码、私有 API 密钥和令牌。
- 当前生产网站是 `https://ccxgmx.fun`，Waline 服务是 `https://cc-waline.vercel.app`。
- 当前 Vercel 生产分支是 `main`，其他分支生成预览部署。
- 当前搜索是 Algolia DocSearch 主搜索、Pagefind 后备。
- 当前 Algolia 爬虫每月 15 日自动运行。
- 当前网站不在浏览器端直接连接 Supabase；Supabase 只作为 Waline 的 PostgreSQL 存储。
- 未开始的 Waline 管理端 UI 定制只能标记为未来方向，不能写成已完成功能。
- 命令示例以 Windows PowerShell 和 Bun 为准。
- `.codegraph/` 是本地代码索引，不进入 Git。

---

### Task 1: 建立文档契约测试与本地索引忽略规则

**Files:**
- Create: `tests/documentation.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Node/Bun 文件系统 API、仓库根目录和 `.env.local` 的可选本地值。
- Produces: 对后续所有文档文件、Markdown 相对链接、上游 README 清理和秘密值泄露的自动化约束。

- [ ] **Step 1: 写入失败的文档契约测试**

创建 `tests/documentation.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const requiredDocs = [
  'README.md',
  'docs/README.md',
  'docs/architecture.md',
  'docs/development.md',
  'docs/content-workflow.md',
  'docs/deployment.md',
  'docs/integrations.md',
  'docs/project-history.md',
  'docs/troubleshooting.md',
  'docs/operations/algolia-docsearch.md'
]

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('project documentation', () => {
  test('publishes one complete Chinese documentation set', () => {
    for (const path of requiredDocs) expect(existsSync(resolve(root, path))).toBeTrue()
    expect(existsSync(resolve(root, 'README-zh-CN.md'))).toBeFalse()

    const readme = read('README.md')
    expect(readme).toContain('https://ccxgmx.fun')
    expect(readme).toContain('bun run dev')
    expect(readme).toContain('docs/README.md')
    expect(readme).not.toContain('# Astro Theme Pure')
  })

  test('keeps every relative Markdown link valid', () => {
    const markdownLink = /!?\[[^\]]*]\(([^)]+)\)/g

    for (const path of requiredDocs) {
      const source = read(path)
      for (const match of source.matchAll(markdownLink)) {
        const target = match[1].trim().replace(/^<|>$/g, '')
        if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue

        const fileTarget = decodeURIComponent(target.split('#', 1)[0])
        if (!fileTarget) continue
        const absolute = resolve(dirname(resolve(root, path)), fileTarget)
        expect(existsSync(absolute), `${path} -> ${target}`).toBeTrue()
        expect(['.md', ''].includes(extname(absolute))).toBeTrue()
      }
    }
  })

  test('does not copy local environment secrets into public documents', () => {
    const corpus = requiredDocs.map(read).join('\n')
    const envPath = resolve(root, '.env.local')
    if (!existsSync(envPath)) return

    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const separator = line.indexOf('=')
      if (separator < 1) continue
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      if (value.length >= 12) expect(corpus).not.toContain(value)
    }
  })
})
```

- [ ] **Step 2: 运行测试并确认它因专题文档尚不存在而失败**

Run:

```powershell
bun test tests/documentation.test.ts
```

Expected: FAIL，错误指向 `docs/README.md` 或其他尚未创建的专题文档。

- [ ] **Step 3: 忽略本地 CodeGraph 索引**

在 `.gitignore` 的本地代理资料段加入：

```gitignore
# Local code intelligence index
.codegraph/
```

- [ ] **Step 4: 提交测试和忽略规则**

```powershell
git add .gitignore tests/documentation.test.ts
git commit -m "test: define project documentation contract"
```

---

### Task 2: 重写根 README 并建立文档入口

**Files:**
- Modify: `README.md`
- Delete: `README-zh-CN.md`
- Create: `docs/README.md`

**Interfaces:**
- Consumes: Task 1 的必需文档路径约束。
- Produces: GitHub 首页快速入口和全部专题文档的唯一导航页。

- [ ] **Step 1: 将 `README.md` 重写为中文项目首页**

README 使用以下固定结构和事实：

```markdown
# CC Personal Site

CC 的个人网站，用于记录 AI 探索、搭建过程、工具资源和生活思考。

- 网站：https://ccxgmx.fun
- GitHub：https://github.com/xgmx2005/myblog

## 当前功能

- Markdown/MDX 博客、标签、归档、RSS 和站点地图
- 中文明暗主题与响应式页面
- Algolia DocSearch 在线搜索和 Pagefind 本地后备
- Waline 邮箱/GitHub 登录、评论、回复、文章反应和留言板
- Obsidian 笔记确定性导入
- GitHub 推送触发 Vercel 预览或生产部署

## 技术栈

Astro 6、Astro Theme Pure、TypeScript、Bun、UnoCSS、Vercel、Waline、
Supabase PostgreSQL、Algolia DocSearch 和 Pagefind。

## 快速开始

```powershell
bun install --frozen-lockfile
bun run dev
```

浏览器打开 `http://localhost:4321`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动本地开发服务器 |
| `bun test` | 运行自动化测试 |
| `bun run check` | 执行 Astro 类型检查 |
| `bun run build` | 生成 Vercel 生产产物和 Pagefind 索引 |
| `bun scripts/import-obsidian-posts.ts` | 导入已映射的 Obsidian 文章 |

## 项目文档

完整架构、内容发布、部署和维护说明见 [项目文档入口](docs/README.md)。

## 上游来源

项目最初基于 `cworld1/astro-theme-pure` 的提交
`0047f6d4278d4c3e823dca608022cd6ebe7b5c96`，之后已替换为 CC 的内容、
页面、搜索、评论和部署配置。

## 验证

```powershell
bun test
bun run check
bun run build
```

## 许可证

项目保留上游 Apache-2.0 许可证，详见 [LICENSE](LICENSE)。
```

- [ ] **Step 2: 删除上游 `README-zh-CN.md`**

```powershell
git rm README-zh-CN.md
```

- [ ] **Step 3: 创建 `docs/README.md` 文档索引**

索引按以下分组链接：

```markdown
# CC Personal Site 项目文档

这里记录网站当前的架构、开发、内容发布和线上维护方式。第一次接手项目时，
建议依次阅读“架构 → 本地开发 → 内容发布 → 部署”。

## 理解项目

- [系统架构](architecture.md)
- [项目演进与关键决策](project-history.md)

## 开发与内容

- [本地开发与项目结构](development.md)
- [文章与 Obsidian 内容工作流](content-workflow.md)

## 部署与外部服务

- [Vercel 部署、域名与环境变量](deployment.md)
- [Waline、Supabase、Algolia 与 Pagefind](integrations.md)
- [Algolia DocSearch 操作手册](operations/algolia-docsearch.md)

## 维护

- [常见问题排查](troubleshooting.md)
- [设计说明与实施记录](superpowers/)
```

- [ ] **Step 4: 运行当前文档测试**

```powershell
bun test tests/documentation.test.ts
```

Expected: 仍然 FAIL，但 README 与文档入口相关断言通过，失败只来自尚未创建的专题文档。

- [ ] **Step 5: 提交入口文档**

```powershell
git add README.md README-zh-CN.md docs/README.md
git commit -m "docs: establish Chinese project documentation"
```

---

### Task 3: 编写架构与本地开发文档

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/development.md`

**Interfaces:**
- Consumes: `astro.config.ts`、`src/site.config.ts`、`src/content.config.ts`、`src/lib/search/config.ts`、`src/lib/waline/config.ts` 和 `package.json`。
- Produces: 当前系统职责边界、数据流、目录职责和可复现的本地开发步骤。

- [ ] **Step 1: 创建 `docs/architecture.md`**

文档必须包含：

```markdown
# 系统架构

## 一句话架构

Astro 负责内容和页面，Vercel 负责构建与运行，Waline 负责用户互动，
Supabase PostgreSQL 只保存 Waline 数据，Algolia 提供在线搜索，
Pagefind 提供无需网络后端的搜索后备。

## 系统边界

| 模块 | 负责 | 不负责 |
| --- | --- | --- |
| Astro 网站 | 页面、文章、导航、RSS、搜索入口、Waline 客户端 | 数据库密码、用户认证实现 |
| Waline 服务 | 注册登录、评论、回复、反应、留言板、管理端 | 博客内容与页面构建 |
| Supabase PostgreSQL | 持久化 Waline 数据 | 浏览器端 Auth 和博客内容 |
| Algolia DocSearch | 已公开技术内容的在线索引与搜索 | 评论、账户和留言板索引 |
| Pagefind | 构建期静态搜索后备 | 用户互动数据 |
| Vercel | 预览、生产部署与环境变量 | 内容编辑 |

## 数据流

### 页面访问
### 评论与登录
### 在线搜索与本地后备
### Git 推送到生产

## 关键设计决策

- 网站浏览器端不直接连接 Supabase。
- Waline 故障不影响文章正文。
- 三项 Algolia 公共配置缺一时自动使用 Pagefind。
- `main` 是生产事实来源。

## 关键源码入口

用表格列出 `src/pages/`、`src/content/blog/`、`src/site.config.ts`、
`src/lib/waline/config.ts`、`src/lib/search/config.ts`、`astro.config.ts` 和
`packages/pure/`。
```

数据流使用 Mermaid `flowchart LR`，节点只包含上述六个系统，不加入未实现的 CMS 或自定义认证服务。

- [ ] **Step 2: 创建 `docs/development.md`**

文档必须给出：

```markdown
# 本地开发与项目结构

## 环境要求

- Windows PowerShell
- Node.js 24（当前验证版本 `v24.16.0`）
- Bun（依赖由 `bun.lock` 锁定）

## 首次启动

```powershell
git clone https://github.com/xgmx2005/myblog.git
cd myblog
bun install --frozen-lockfile
bun run dev
```

## 环境变量

| 名称 | 是否公开 | 用途 | 缺失行为 |
| --- | --- | --- | --- |
| `SITE_URL` | 服务端构建配置 | 正式站点 origin | 回退到 `http://localhost:4321` |
| `PUBLIC_WALINE_SERVER_URL` | 是 | Waline 服务地址 | 评论区显示不可用状态 |
| `PUBLIC_ALGOLIA_APP_ID` | 是 | Algolia 应用 ID | 使用 Pagefind |
| `PUBLIC_ALGOLIA_SEARCH_API_KEY` | 是 | 只读搜索密钥 | 使用 Pagefind |
| `PUBLIC_ALGOLIA_INDEX_NAME` | 是 | DocSearch 索引名 | 使用 Pagefind |

## 常用命令
## 目录说明
## 修改后的验证顺序
## Windows 下的 Pagefind 提示
## 新环境接手检查清单
```

明确说明 `.env.local` 只在本地使用且已被 Git 忽略，不得把 `VERCEL_OIDC_TOKEN` 等真实值复制到文档。

- [ ] **Step 3: 检查两份文档的事实与内部链接**

```powershell
bun test tests/documentation.test.ts
```

Expected: 只因剩余五份专题文档不存在而失败。

- [ ] **Step 4: 提交架构和开发文档**

```powershell
git add docs/architecture.md docs/development.md
git commit -m "docs: explain architecture and local development"
```

---

### Task 4: 编写内容发布与 Vercel 部署文档

**Files:**
- Create: `docs/content-workflow.md`
- Create: `docs/deployment.md`

**Interfaces:**
- Consumes: `src/content.config.ts` 的 frontmatter schema、`scripts/import-obsidian-posts.ts` 的固定映射、Vercel `main` 生产分支策略。
- Produces: 可复现的文章创建、Obsidian 导入、预览、生产发布、域名验证和回滚流程。

- [ ] **Step 1: 创建 `docs/content-workflow.md`**

文档必须包含完整 frontmatter：

```yaml
---
title: 文章标题
description: 用一句话说明文章解决的问题。
publishDate: 2026-07-17
updatedDate: 2026-07-17
tags:
  - ai
  - obsidian
language: zh-CN
draft: false
---
```

并解释：

- `title` 最长 60 个字符；
- `description` 最长 160 个字符；
- 标签会去空格、转小写并去重；
- `updatedDate` 和 `heroImage` 可选；
- `draft: true` 不进入公开集合；
- 手写文章放入 `src/content/blog/`；
- 当前五篇 Obsidian 源文件由 `scripts/import-obsidian-posts.ts` 显式映射；
- 导入命令连续执行两次，第二次 `git diff --exit-code -- src/content/blog` 应无差异；
- 发布前运行 `bun test` 和 `bun run build`。

- [ ] **Step 2: 创建 `docs/deployment.md`**

文档必须包含：

```markdown
# Vercel 部署、域名与环境变量

## 当前生产信息

- 正式域名：`https://ccxgmx.fun`
- Vercel 项目：`cc-xgmx2005`
- 生产分支：`main`
- 代码仓库：`https://github.com/xgmx2005/myblog`

## 部署流程

1. 在功能分支完成修改并验证。
2. 推送功能分支获得 Vercel Preview。
3. 将同一提交合入并推送 `main`。
4. 等待 Production Deployment 变为 `READY`。
5. 访问正式域名验证页面、评论和搜索。

## 环境变量
## 自定义域名
## 重新部署
## 回滚
## 为什么没有 GitHub Actions
```

环境变量表只列出 Astro 项目的五个变量名称。Waline 服务端变量只链接到 `integrations.md`，避免混入网站项目。

- [ ] **Step 3: 运行文档测试**

```powershell
bun test tests/documentation.test.ts
```

Expected: 只因 `docs/integrations.md`、`docs/project-history.md` 和 `docs/troubleshooting.md` 不存在而失败。

- [ ] **Step 4: 提交内容与部署文档**

```powershell
git add docs/content-workflow.md docs/deployment.md
git commit -m "docs: document content and deployment workflows"
```

---

### Task 5: 编写外部服务、历史和排错文档并更新 Algolia 操作手册

**Files:**
- Create: `docs/integrations.md`
- Create: `docs/project-history.md`
- Create: `docs/troubleshooting.md`
- Modify: `docs/operations/algolia-docsearch.md`

**Interfaces:**
- Consumes: 当前 Waline/Algolia 架构设计、已部署服务、Git 提交历史和现有 Algolia 操作手册。
- Produces: 线上服务维护边界、关键决策上下文和可执行故障排查路径。

- [ ] **Step 1: 创建 `docs/integrations.md`**

固定内容：

```markdown
# Waline、Supabase、Algolia 与 Pagefind

## 服务总览

| 服务 | 当前地址或位置 | 网站中的职责 |
| --- | --- | --- |
| Waline | `https://cc-waline.vercel.app` | 账户、评论、回复、反应、留言板 |
| Supabase | Waline 服务端私有连接 | `wl_` 表的 PostgreSQL 存储 |
| Algolia DocSearch | 浏览器只读配置 | 在线搜索 |
| Pagefind | Astro 构建产物 | 本地搜索后备 |

## Waline
## Supabase PostgreSQL
## Algolia DocSearch
## Pagefind 后备
## 配置与秘密边界
## 后续可选方向
```

Waline 环境变量只列名称与用途，包括 `PG_HOST`、`PG_PORT`、`PG_DB`、
`PG_USER`、`PG_PASSWORD`、`PG_PREFIX`、`PG_SSL`、`LOGIN`、
`SECURE_DOMAINS`、`SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、
`SMTP_PASS`、`OAUTH_URL` 和 `WALINE_ADMIN_MODULE_ASSET_URL`。所有值必须在
`cc-waline` Vercel 项目中配置，不能放进 Astro 仓库。

“后续可选方向”只说明可以通过自定义 `@waline/admin` 资源修改管理端 UI，明确标注当前尚未实施。

- [ ] **Step 2: 创建 `docs/project-history.md`**

按以下已验证时间线编写：

```markdown
# 项目演进与关键决策

## 2026-07-15：确定 Astro 与主题基础
## 2026-07-15：完成个人化与首版页面
## 2026-07-16：确定第二版互动架构
## 2026-07-16：导入首批 Obsidian 文章
## 2026-07-16：部署 Waline 与留言板
## 2026-07-17：启用 Algolia DocSearch 与自定义域名
## 当前状态
## 明确未实施的方向
```

时间线说明从自定义 Supabase 浏览器认证改为 Waline 是为了减少代码和维护面；说明 Pagefind 保留是为了搜索可用性；说明 `ccxgmx.fun` 是当前唯一对外正式域名。

- [ ] **Step 3: 创建 `docs/troubleshooting.md`**

每节统一使用：

```markdown
### 现象
### 常见原因
### 处理
### 验证
```

覆盖以下实际问题：

1. `localhost` 显示 `ERR_CONNECTION_REFUSED`；
2. Node/Bun 不在预期路径或版本不一致；
3. Astro 检查/构建失败；
4. Windows 出现 Pagefind 包装器安装提示但最终索引成功；
5. GitHub 已推送但正式域名仍是旧内容；
6. Waline 评论区未加载或要求登录；
7. Waline 邮件注册收不到确认信；
8. Algolia 爬虫提示记录过大；
9. Algolia 安全检查因记录减少而阻塞发布；
10. Algolia 已爬取但网站搜索未更新。

- [ ] **Step 4: 将 Algolia 操作手册更新为当前生产事实**

在 `docs/operations/algolia-docsearch.md` 中：

- 将公开 origin 和 sitemap 从 `cc-xgmx2005.vercel.app` 改为 `ccxgmx.fun`；
- 将爬虫路径统一改为 `https://ccxgmx.fun/**`；
- 将 `aggregateContent` 改为 `false`，记录选择器限制在 `#content`；
- 将安全检查记录减少阈值说明为当前实际配置；
- 将计划频率改为“每月 15 日自动运行，重大内容更新后可手动运行”；
- 记录当前 index 名称 `CC Blog DocSearch`；
- 保留 API 写入密钥只存在 Algolia 控制台的安全说明。

- [ ] **Step 5: 运行文档测试并确认通过**

```powershell
bun test tests/documentation.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交外部服务与维护文档**

```powershell
git add docs/integrations.md docs/project-history.md docs/troubleshooting.md docs/operations/algolia-docsearch.md
git commit -m "docs: capture integrations history and troubleshooting"
```

---

### Task 6: 全量验证、敏感信息审计与发布

**Files:**
- Modify only when verification finds a factual or link error in the files created by Tasks 1–5.

**Interfaces:**
- Consumes: 全部文档、自动化测试、Astro 构建和本地 `.env.local`。
- Produces: 可公开推送的最终文档提交和已验证的 GitHub/Vercel 状态。

- [ ] **Step 1: 检查计划与设计覆盖**

```powershell
rg -n '^## ' docs/superpowers/specs/2026-07-17-project-documentation-design.md
rg -n '^#|^## ' README.md docs/*.md docs/operations/algolia-docsearch.md
```

Expected: 设计中的 README、文档入口、七份专题文档和 Algolia 操作手册均存在对应章节。

- [ ] **Step 2: 运行文档与全量测试**

```powershell
bun test tests/documentation.test.ts
bun test
```

Expected: 两条命令均以退出码 0 完成。

- [ ] **Step 3: 运行类型检查和生产构建**

```powershell
bun run check
bun run build
```

Expected: Astro diagnostics 为 0 errors；生产构建以退出码 0 完成，Pagefind 成功索引 17 个页面。

- [ ] **Step 4: 执行秘密与占位符扫描**

```powershell
rg -n 'VERCEL_OIDC_TOKEN=|PG_PASSWORD=.+|SMTP_PASS=.+|ALGOLIA.*(ADMIN|WRITE).*KEY=.+' README.md docs
rg -n 'TB[D]|TO[D]O|待定|稍后补充' README.md docs/README.md docs/*.md
```

Expected: 两条命令都没有匹配；环境变量名称可以出现在表格中，但不得出现真实赋值。

- [ ] **Step 5: 检查 Git 状态和 diff**

```powershell
git diff --check
git status -sb
git diff --stat origin/feature/website-v2..HEAD
```

Expected: 没有行尾错误；`.codegraph/` 不再出现在 Git 状态；变更只涉及设计、计划、README、文档、文档测试和 `.gitignore`。

- [ ] **Step 6: 提交验证修正（仅在 Step 1–5 产生修正时执行）**

```powershell
git add README.md docs tests/documentation.test.ts .gitignore
git commit -m "docs: finalize project handbook"
```

- [ ] **Step 7: 推送功能分支和生产分支**

```powershell
git push -u origin feature/website-v2
git push origin HEAD:main
```

Expected: 两次推送成功，Vercel 为 `main` 创建 Production Deployment。

- [ ] **Step 8: 验证公开仓库与生产部署**

确认：

- GitHub 默认分支能打开新的中文 `README.md`；
- 所有 `docs/` 相对链接可访问；
- Vercel Production Deployment 状态为 `READY`；
- 文档变更没有改变 `https://ccxgmx.fun` 的页面功能。
