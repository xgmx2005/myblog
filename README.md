# CC Personal Site

CC 的个人网站，用于记录 AI 探索、搭建过程、工具资源和生活思考。

- 网站：[https://ccxgmx.fun](https://ccxgmx.fun)
- GitHub：[https://github.com/xgmx2005/myblog](https://github.com/xgmx2005/myblog)

## 当前功能

- Markdown/MDX 博客、标签、归档、RSS 和站点地图
- 中文明暗主题与响应式页面
- Algolia DocSearch 在线搜索和 Pagefind 本地后备
- Waline 邮箱/GitHub 登录、评论、回复、文章反应和留言板
- Obsidian 笔记确定性导入
- GitHub 推送触发 Vercel 预览或生产部署

## 技术栈

Astro 6、Astro Theme Pure、TypeScript、Bun、UnoCSS、Vercel、Waline、Supabase PostgreSQL、Algolia DocSearch 和 Pagefind。

## 快速开始

```powershell
bun install --frozen-lockfile
bun run dev
```

浏览器打开 `http://localhost:4321`。

## 常用命令

| 命令                                   | 用途                                 |
| -------------------------------------- | ------------------------------------ |
| `bun run dev`                          | 启动本地开发服务器                   |
| `bun test`                             | 运行自动化测试                       |
| `bun run check`                        | 执行 Astro 类型检查                  |
| `bun run build`                        | 生成 Vercel 生产产物和 Pagefind 索引 |
| `bun scripts/import-obsidian-posts.ts` | 导入已映射的 Obsidian 文章           |

## 项目文档

完整架构、内容发布、部署和维护说明见[项目文档入口](docs/README.md)。

## 上游来源

项目最初基于 [`cworld1/astro-theme-pure`](https://github.com/cworld1/astro-theme-pure) 的提交 `0047f6d4278d4c3e823dca608022cd6ebe7b5c96`，之后已替换为 CC 的内容、页面、搜索、评论和部署配置。

## 验证

```powershell
bun test
bun run check
bun run build
```

## 许可证

项目保留上游 Apache-2.0 许可证，详见 [LICENSE](LICENSE)。
