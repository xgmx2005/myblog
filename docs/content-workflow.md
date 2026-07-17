# 文章与 Obsidian 内容工作流

博客内容保存在 Git 仓库的 `src/content/blog/` 中。可以直接编写 Markdown/MDX，也可以通过固定映射脚本从 Obsidian 导入。

## 文章结构

最小可发布文章：

```yaml
---
title: 文章标题
description: 用一句话说明文章解决的问题。
publishDate: 2026-07-17
tags:
  - ai
  - obsidian
language: zh-CN
draft: false
---
```

完整字段：

| 字段            | 必填 | 规则                                                               |
| --------------- | ---- | ------------------------------------------------------------------ |
| `title`         | 是   | 字符串，最长 60 个字符                                             |
| `description`   | 是   | 字符串，最长 160 个字符                                            |
| `publishDate`   | 是   | 可被 JavaScript 日期解析的值，推荐 `YYYY-MM-DD`                    |
| `updatedDate`   | 否   | 内容发生实质更新时填写                                             |
| `tags`          | 否   | 字符串数组；构建时去空格、转小写并去重                             |
| `language`      | 否   | 默认 `zh-CN`                                                       |
| `draft`         | 否   | 默认 `false`；生产环境会过滤 `true`                                |
| `heroImage`     | 否   | 可设置图片、替代文本、尺寸和颜色等元数据                           |

包含可选字段的示例：

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

## 手动新增文章

1. 在 `src/content/blog/` 新建语义明确的文件名，例如 `astro-deployment-notes.md`。
2. 写入合法 frontmatter。
3. 正文从二级标题开始组织；文章标题由页面布局根据 frontmatter 渲染。
4. 本地启动网站并检查正文、目录、代码块、表格和深浅色模式。
5. 执行测试和生产构建。

```powershell
bun run dev
bun test
bun run build
```

文件名会影响最终 URL。文章发布后应尽量保持文件名稳定，避免旧链接失效和 Algolia 记录重复。

## 草稿与更新

- `draft: true` 的文章在开发环境可见，在生产集合中被过滤。
- 首次公开时使用 `publishDate`。
- 正文有实质修改时增加或更新 `updatedDate`。
- 只修正错别字时可以不修改 `updatedDate`。
- 已发布 URL 不应仅因为标题调整而更换文件名。

## 标签约定

标签由 `src/content.config.ts` 自动规范化：

- 删除标签首尾空格；
- 转为小写；
- 删除空标签；
- 删除重复标签。

优先复用已有标签，避免同时出现意义相同的 `ai-agent`、`AI Agent`、`ai agent`。可以在 `/tags` 页面检查最终结果。

## 图片

与文章强关联的图片建议放在文章附近并通过相对路径引用；全站品牌资源放在 `src/assets/` 或 `public/`。

每张承载信息的图片都应提供准确的替代文本。不要把数据库连接串、后台截图中的密钥或邮箱授权码放进公开图片。

如果 frontmatter 使用 `heroImage`，图片必须满足 `src/content.config.ts` 中的 Astro image schema。

## Obsidian 导入

当前导入脚本是 `scripts/import-obsidian-posts.ts`。它显式映射以下五篇源笔记：

| 输出 slug                              | 内容主题                         |
| -------------------------------------- | -------------------------------- |
| `obsidian-ai-agent-claudian-skills`    | Claudian 与 Obsidian Skills      |
| `obsidian-cli-core-principles`         | Obsidian CLI 核心原理            |
| `git-advanced-version-branch`          | Git 版本与分支管理               |
| `obsidian-essential-skills`            | Obsidian 必装 Skills             |
| `obsidian-cli-command-reference`       | Obsidian CLI 命令速查            |

脚本会：

1. 读取本机 `G:/Obsidian Vault/Obsidian/` 下的固定源文件；
2. 根据源文件修改时间生成 `publishDate`；
3. 生成固定标题、描述、标签和 slug；
4. 调用 `convertObsidianMarkdown()` 转换 Obsidian callout 等语法；
5. 覆盖写入对应的 `src/content/blog/*.md`。

执行：

```powershell
bun scripts/import-obsidian-posts.ts
```

导入是确定性的。提交前连续运行两次，第二次不应产生差异：

```powershell
bun scripts/import-obsidian-posts.ts
bun scripts/import-obsidian-posts.ts
git diff --exit-code -- src/content/blog
```

如果源笔记路径改变，应先修改脚本中的 `source` 映射，而不是手动复制一份同 slug 文章。

## 发布前检查

```powershell
bun test
bun run check
bun run build
git status -sb
```

人工检查：

- 标题和描述能准确说明内容；
- `draft` 状态符合预期；
- 标签没有重复含义；
- 内部链接、图片和代码块可用；
- 移动端表格可以横向滚动；
- 页面没有私密信息；
- Algolia 需要立即更新时，在部署完成后手动运行爬虫。

## 发布

1. 在功能分支提交文章。
2. 推送功能分支并检查 Vercel Preview。
3. 将同一提交进入 `main`。
4. 等待 Vercel Production Deployment 变为 `READY`。
5. 访问正式文章 URL。
6. 如需立刻进入在线搜索，手动运行 Algolia 爬虫；否则等待每月 15 日的自动任务。

详细部署步骤见 [Vercel 部署、域名与环境变量](deployment.md)。
