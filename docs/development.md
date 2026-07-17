# 本地开发与项目结构

本文说明如何在新的 Windows 环境中启动、检查和构建 CC Personal Site。

## 环境要求

- Windows PowerShell
- Node.js 24（当前验证版本为 `v24.16.0`）
- Bun（依赖版本由 `bun.lock` 锁定）
- Git

Node 与 Bun 的实际路径可以这样确认：

```powershell
where.exe node
node -p "process.execPath"
node --version
bun --version
```

## 首次启动

```powershell
git clone https://github.com/xgmx2005/myblog.git
cd myblog
bun install --frozen-lockfile
bun run dev
```

默认访问地址是 `http://localhost:4321`。终端输出的端口优先于文档；如果 4321 已被占用，Astro 会选择其他端口。

## 环境变量

本地配置放在 `.env.local`。该文件已经被 Git 忽略，不得提交或把真实值复制到公开文档。

| 名称                            | 是否公开到浏览器 | 用途                       | 缺失时的行为                  |
| ------------------------------- | ---------------- | -------------------------- | ----------------------------- |
| `SITE_URL`                      | 否               | 正式站点 origin            | 使用 `http://localhost:4321`  |
| `PUBLIC_WALINE_SERVER_URL`      | 是               | Waline 服务地址            | 互动区显示不可用状态          |
| `PUBLIC_ALGOLIA_APP_ID`         | 是               | Algolia 应用 ID            | 使用 Pagefind                 |
| `PUBLIC_ALGOLIA_SEARCH_API_KEY` | 是               | Algolia 只读搜索密钥       | 使用 Pagefind                 |
| `PUBLIC_ALGOLIA_INDEX_NAME`     | 是               | DocSearch 索引名称         | 使用 Pagefind                 |

示例：

```dotenv
SITE_URL=https://example.com
PUBLIC_WALINE_SERVER_URL=https://waline.example.com
PUBLIC_ALGOLIA_APP_ID=your-value
PUBLIC_ALGOLIA_SEARCH_API_KEY=your-search-only-value
PUBLIC_ALGOLIA_INDEX_NAME=your-index
```

`PUBLIC_` 表示值会进入浏览器包，只能放公开地址或只读搜索配置。数据库密码、SMTP 授权码、Algolia 写入密钥、OAuth Secret 和 Vercel 令牌都不能使用 `PUBLIC_` 前缀。

## 常用命令

| 命令                                   | 作用                                      |
| -------------------------------------- | ----------------------------------------- |
| `bun run dev`                          | 启动 Astro 开发服务器                     |
| `bun test`                             | 执行全部 Bun 测试                         |
| `bun test tests/文件名.test.ts`        | 执行单个测试文件                          |
| `bun run check`                        | 执行 Astro 类型检查                       |
| `bun run build`                        | 完整生产构建并生成 Pagefind 索引          |
| `bun run preview`                      | 预览已生成的 Astro 产物                   |
| `bun run format`                       | 使用 Prettier 格式化代码和 Markdown       |
| `bun run lint`                         | 检查并修复 `src/` 下的 ESLint 问题        |
| `bun scripts/import-obsidian-posts.ts` | 导入脚本中已经映射的 Obsidian 文章        |

## 目录说明

```text
src/
├─ assets/             头像、样式和本地资源
├─ components/         本地页面、搜索和 Waline 组件
├─ content/blog/       博客 Markdown/MDX
├─ data/               个人资料等结构化内容
├─ layouts/            页面布局
├─ lib/                搜索与 Waline 配置逻辑
├─ pages/              Astro 文件路由
├─ plugins/            Markdown、Shiki 与 rehype 扩展
└─ site.config.ts      站点和主题主配置

packages/pure/          Astro Theme Pure 本地支持代码
scripts/                品牌资源与 Obsidian 导入脚本
public/                 favicon、社交卡片和公开静态文件
tests/                  自动化契约测试
docs/                   当前维护文档与历史设计记录
```

常见修改入口：

- 修改个人介绍：`src/data/profile.ts`
- 修改导航、标题和社交账号：`src/site.config.ts`
- 新增文章：`src/content/blog/`
- 修改文章布局：`src/layouts/BlogPost.astro`
- 修改评论与留言板：`src/components/waline/WalineThread.astro`
- 修改搜索入口：`src/components/search/DocSearch.astro`

## 修改后的验证顺序

小型文案修改：

```powershell
bun test tests/profile-config.test.ts
bun test
```

文章或页面修改：

```powershell
bun test
bun run check
bun run build
```

搜索、Waline、构建配置或依赖修改必须执行完整验证：

```powershell
bun test
bun run check
bun run build
```

不要只根据浏览器页面判断构建成功。最终以命令退出码、Astro diagnostics 和 Vercel Deployment 状态为准。

## Windows 下的 Pagefind 提示

部分 Windows 环境会在构建日志中出现 Pagefind 的 `npx wrapper` 安装提示。判断是否真正失败需要看完整日志：

- 如果随后出现 `Running Pagefind`、索引页面/词数统计、`Complete!`，并且命令退出码为 0，索引已经成功生成。
- 如果命令以非 0 退出，先运行 `bun install --frozen-lockfile`，确认 `pagefind` 版本来自 `package.json`，再单独执行：

```powershell
bunx pagefind --site dist/client
```

项目的正式构建命令已经固定为 Astro 构建后执行 `pagefind --site dist/client`。

## 新环境接手检查清单

1. 确认当前分支和工作区：`git status -sb`。
2. 确认 Node 24 与 Bun 可用。
3. 使用 `bun install --frozen-lockfile` 安装锁定依赖。
4. 不复制旧电脑的 `node_modules/`、`.astro/`、`dist/` 或 `.vercel/`。
5. 从 Vercel 控制台获取需要的环境变量，不从聊天记录或公开文档复制秘密。
6. 运行 `bun test`，确认基线测试通过。
7. 运行 `bun run build`，确认 Astro 和 Pagefind 均完成。
8. 使用功能分支开发，验证后再进入 `main`。

## 延伸阅读

- [系统架构](architecture.md)
- [文章与 Obsidian 内容工作流](content-workflow.md)
- [Vercel 部署、域名与环境变量](deployment.md)
- [常见问题排查](troubleshooting.md)
