# 项目文档体系设计

**日期：** 2026-07-17

**状态：** 已确认

**适用项目：** CC Personal Site

## 目标

为 CC Personal Site 建立一套以中文为唯一主语言、适合公开仓库且便于长期维护的项目文档。文档既要帮助未来的自己快速恢复项目上下文，也要让新的协作者能够在不阅读全部源码和历史对话的情况下完成本地运行、内容发布、部署维护与常见故障处理。

## 已确认的决策

- `README.md` 是唯一主 README，使用中文。
- 删除仍保留上游主题介绍的 `README-zh-CN.md`，避免读者误认为这是未定制的主题仓库。
- 采用“简洁 README + `docs/` 专题文档”的分层结构。
- 所有文档随公开 GitHub 仓库发布。
- 文档可以记录公开服务地址、环境变量名称、配置位置和操作步骤。
- 文档不得记录数据库密码、SMTP 授权码、私有 API 密钥、令牌或其他秘密值。
- `docs/superpowers/` 继续保存设计与实施历史，但不作为普通读者的首要入口。
- 现有 `docs/operations/algolia-docsearch.md` 纳入新文档导航，不重复复制其操作细节。
- 本轮只整理当前已经实现和验证的系统，不把计划中的 Waline 管理端 UI 定制写成已完成功能。

## 文档信息架构

### 根 README

`README.md` 负责在最短时间内回答：

1. 这是什么项目；
2. 线上网站在哪里；
3. 当前有哪些功能；
4. 使用了哪些主要技术；
5. 如何在本地启动；
6. 如何执行测试与生产构建；
7. 去哪里阅读详细文档。

README 保持适合 GitHub 首页浏览的长度，不承载完整部署手册或故障排查细节。

### 文档入口

`docs/README.md` 是专题文档索引，按“理解项目、开发、发布内容、部署运维、外部服务、历史与排错”的顺序组织链接。每份专题文档都必须能够独立阅读，并在开头说明它解决的问题。

### 专题文档

- `docs/architecture.md`
  - 当前系统边界；
  - Astro 网站、Astro Theme Pure、Markdown 内容、Waline、Supabase PostgreSQL、Algolia、Pagefind、GitHub 与 Vercel 的职责；
  - 构建、访问、评论和搜索的数据流；
  - 为什么浏览器端不直接连接 Supabase。

- `docs/development.md`
  - Node.js、Bun 与依赖安装要求；
  - 本地开发、类型检查、测试、构建和预览命令；
  - 主要目录与配置文件职责；
  - Windows 下 Pagefind 包装器提示的已知情况；
  - 新环境接手项目的检查清单。

- `docs/content-workflow.md`
  - `src/content/blog/` 文章结构和 frontmatter；
  - 手动新增文章；
  - Obsidian 导入脚本、源文件映射和幂等检查；
  - 标签、草稿、图片和发布日期约定；
  - 发布前检查与上线流程。

- `docs/deployment.md`
  - `main` 为 Vercel 生产分支；
  - 其他分支生成预览部署；
  - GitHub 推送到 Vercel 上线的完整链路；
  - `ccxgmx.fun`、Vercel 项目和 `SITE_URL` 的关系；
  - 网站环境变量清单、修改位置、重新部署和回滚方法；
  - 不使用 GitHub Actions 的当前原因。

- `docs/integrations.md`
  - Waline 服务端与 Astro 客户端的边界；
  - 注册登录、邮件验证、GitHub OAuth、评论、回复、文章反应和留言板；
  - Supabase 只作为 Waline PostgreSQL 存储；
  - Algolia DocSearch 主搜索与 Pagefind 本地后备；
  - Algolia 每月 15 日自动爬取及手动爬取场景；
  - 所有公开与私密配置的边界。

- `docs/project-history.md`
  - 从 Astro minimal 方向到选择 Astro Theme Pure；
  - 个人资料与首批文章内容确定；
  - 从自定义 Supabase 交互方案切换到 Waline；
  - 接入 Vercel、Supabase、Waline、Algolia 和自定义域名；
  - 搜索爬虫问题与当前解决方案；
  - 只记录影响当前系统理解的关键决策，不复述全部聊天过程。

- `docs/troubleshooting.md`
  - 本地端口无法访问；
  - Node/Bun 环境不一致；
  - Astro 检查或构建失败；
  - Windows Pagefind 提示；
  - Vercel 部署未触发或域名仍显示旧版本；
  - Waline 不加载、登录或邮件异常；
  - Algolia 爬虫记录过大、安全检查阻塞或搜索未更新；
  - 每个问题使用“现象—原因—处理—验证”格式。

## 内容来源与真实性

文档只以当前仓库、构建配置、测试、Git 历史和已经确认的线上架构为事实来源。旧设计文档中已经被后续决策取代的内容只能出现在历史说明中，不得写成当前操作方式。

关键命令、目录、环境变量和分支名称必须从实际项目中提取并核对。外部产品行为只记录本项目已经采用且能够验证的部分。

## 安全边界

公开文档允许出现：

- `https://ccxgmx.fun`
- `https://cc-waline.vercel.app`
- GitHub 仓库地址；
- Vercel、Waline、Algolia、Supabase 的产品名称；
- 网站客户端需要的 `PUBLIC_` 环境变量名称；
- Waline 服务端环境变量名称和安全用途；
- 示例占位值。

公开文档禁止出现：

- `.env.local` 中的真实令牌；
- Supabase 数据库密码或完整连接串；
- QQ SMTP 授权码；
- Algolia 写入或管理密钥；
- OAuth Client Secret；
- 任何可以直接获得账户或基础设施权限的值。

示例统一使用 `https://example.com`、`your-value` 或带说明的占位符。文档生成后必须对常见秘密格式和本地环境文件内容执行扫描。

## 导航与去重规则

- README 只保留快速开始和摘要，详细步骤链接到 `docs/`。
- `docs/README.md` 是唯一专题导航入口。
- Algolia 的详细爬虫维护继续放在 `docs/operations/algolia-docsearch.md`。
- 新的 `docs/integrations.md` 只解释 Algolia 的系统角色并链接到操作手册。
- `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 作为历史资料链接，不进入快速开始流程。
- 相同命令只在负责该流程的文档中完整解释，其他页面使用链接引用。

## 维护规则

- 功能、环境变量、部署方式或第三方服务发生变化时，在同一个提交中更新对应文档。
- 新增文章不需要修改项目历史；改变内容工作流时才更新 `docs/content-workflow.md`。
- 只记录已经部署或明确标注为未来计划的能力，禁止把待办事项描述成现状。
- 文档中的命令必须能够在 Windows PowerShell 环境下执行。
- 文档中的内部链接使用相对路径，外部链接使用 HTTPS。

## 验证

实施完成后执行：

1. 检查所有 Markdown 内部相对链接都指向存在的文件。
2. 检查 README 和专题文档不存在上游示例站身份。
3. 检查环境变量名称与源码解析逻辑一致。
4. 检查公开文档不包含 `.env.local` 的真实值或常见秘密。
5. 运行 `bun test`。
6. 运行 `bun run build`。
7. 检查 Git diff，确认只包含文档体系、必要的文档导航和 `.codegraph/` 忽略规则。

## 验收标准

- GitHub 首页能够清楚说明项目现状并在五分钟内引导开发者启动项目。
- 未来维护者能够只依靠 `docs/` 完成文章发布、生产部署、Waline/Algolia 基本维护和常见故障排查。
- 文档准确反映当前 Astro + Vercel + Waline + Supabase PostgreSQL + Algolia/Pagefind 架构。
- 所有秘密值均未进入 Git 历史或公开文档。
- 旧的上游 `README-zh-CN.md` 不再造成身份混淆。
- 现有设计与实施历史得到保留，并与面向维护者的当前文档明确分层。
