# CC 个人网站第二版设计

**状态：** 已确认  
**日期：** 2026-07-16

## 目标

第二版在保留 Astro Theme Pure 现有视觉、Markdown 写作流程和 Vercel 自动部署的前提下，加入真实用户互动能力：

- GitHub OAuth 登录。
- 邮箱、密码、邮箱验证注册与登录。
- 文章点赞。
- 文章评论和一级回复。
- 独立留言板和一级回复。
- 用户删除自己的内容，CC 删除任意评论或留言。
- 发布五篇来自现有 Obsidian 知识库的首批文章。

## 不在本轮范围内

- CMS、网页文章编辑器或管理后台。
- 用户个人资料编辑页。
- 无限层级评论、私信、通知或评论审核队列。
- 游客匿名评论。
- 把正式数据库迁到甲骨文服务器。
- 在甲骨文服务器上搭建正式生产 Supabase。

文章仍由 Obsidian 编写，以 Markdown 保存到仓库，通过 GitHub 和 Vercel 发布。

## 总体架构

正式网站继续部署到 Vercel。Supabase 托管项目作为正式后端，提供 PostgreSQL、Auth 和 Data API。浏览器使用 Supabase publishable key 直接访问数据；所有授权判断由 PostgreSQL RLS、约束、触发器和受控数据库函数执行，不能依赖前端按钮是否可见。

```text
浏览器
  ├─ Astro 静态页面与资源 ──────────────> Vercel
  └─ 登录、评论、留言、点赞 ────────────> Supabase 东京区

GitHub main ──自动部署──> Vercel
Supabase SQL migrations ──版本管理──> GitHub
Supabase 数据备份 ──后续独立任务──> 甲骨文大阪服务器
```

Supabase 选择东京 `ap-northeast-1`。Vercel Functions 的默认区域调整为东京 `hnd1`。静态资源仍由 Vercel CDN 就近分发。

甲骨文 Always Free 实例不进入正式网站的实时请求链路。第二版上线后再单独设计定时备份、自托管演练和恢复验证，避免免费实例故障影响网站登录与互动功能。

## 项目边界

### Supabase 客户端

创建一个单一职责的浏览器客户端模块，读取：

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

浏览器代码不得读取或包含 Supabase secret/service-role key、数据库密码或直接 PostgreSQL 连接字符串。缺少公开配置时，互动组件显示“互动功能暂未配置”，静态网站和文章仍可正常访问。

### 身份模块

身份模块负责：

- 读取当前会话。
- 监听登录和登出状态。
- GitHub OAuth 跳转。
- 邮箱注册、邮箱验证和密码登录。
- 处理 `/auth/callback` 回调。
- 登出。

### 评论模块

文章评论与留言板复用同一个组件和数据接口。它们只通过目标类型和目标键区分：

- 文章：`target_type = 'post'`，`target_key = <文章 slug>`。
- 留言板：`target_type = 'guestbook'`，`target_key = 'guestbook'`。

### 点赞模块

点赞只用于文章。未登录用户可以看到数量，点击后引导登录；登录用户可以点赞或取消点赞。

## 数据模型

数据库迁移保存在 `supabase/migrations/`，使正式 Supabase 与未来甲骨文自托管实例使用相同结构。

### `profiles`

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `id` | `uuid` | 主键，引用 `auth.users(id)` |
| `display_name` | `text` | 1–50 字符 |
| `avatar_url` | `text` | 可为空 |
| `created_at` | `timestamptz` | 默认当前时间 |
| `updated_at` | `timestamptz` | 默认当前时间 |

注册触发器根据 GitHub 元数据或邮箱 `@` 前缀创建资料。用户只能更新自己的普通资料字段。管理员身份不放在该表，避免用户提升自己的权限。

### `site_admins`

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `user_id` | `uuid` | 主键，引用 `auth.users(id)` |
| `created_at` | `timestamptz` | 默认当前时间 |

该表不向普通客户端开放直接写入。CC 首次登录后，在 Supabase Dashboard 中按自己的 Auth 用户 UUID 写入一条管理员记录。数据库函数 `is_site_admin()` 只返回当前登录用户是否为管理员，不返回管理员名单。

### `comments`

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `id` | `uuid` | 主键，自动生成 |
| `target_type` | `text` | 仅允许 `post`、`guestbook` |
| `target_key` | `text` | 1–160 字符；留言板固定为 `guestbook` |
| `parent_id` | `uuid` | 可为空，引用同表 |
| `author_id` | `uuid` | 必须等于当前登录用户 |
| `body` | `text` | 有效内容 1–1000 字符；软删除后为空 |
| `created_at` | `timestamptz` | 默认当前时间 |
| `deleted_at` | `timestamptz` | 可为空 |

数据库触发器负责：

- 对正文执行 trim，并拒绝空内容或超过 1000 字的内容。
- 回复必须与父评论属于同一目标。
- 父评论本身必须是顶级评论，从而强制只有一级回复。
- 同一用户距离上一条内容不足 30 秒时拒绝发布。

客户端不能直接更新或物理删除评论。`delete_comment(comment_id)` 数据库函数仅允许作者本人或站点管理员调用，并把 `body` 设为空、记录 `deleted_at`。页面在原位置显示“该内容已删除”，继续保留下方回复。

### `post_likes`

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `post_slug` | `text` | 文章 slug |
| `user_id` | `uuid` | 当前登录用户 |
| `created_at` | `timestamptz` | 默认当前时间 |

联合主键为 `(post_slug, user_id)`，保证同一用户对同一文章最多一条点赞记录。

## RLS 与安全策略

- `profiles`：公开读取；登录用户只能插入或更新自己的记录。
- `site_admins`：客户端不允许直接插入、更新或删除。
- `comments`：公开读取；登录用户只能以自己的 `auth.uid()` 发布；不开放直接更新和删除。
- `post_likes`：公开读取；登录用户只能插入和删除自己的点赞。
- 管理员删除通过受控的 `delete_comment()` 函数完成。
- 所有 `security definer` 函数固定 `search_path`，并只授予所需角色执行权。
- 数据表全部启用 RLS；新表不依赖 Supabase Dashboard 的自动公开权限。
- 日志和错误信息不得输出密码、访问令牌、secret key 或完整数据库连接串。

## 身份流程

### GitHub

用户点击 GitHub 登录后进入 Supabase OAuth 流程，成功后返回 `/auth/callback`，再跳回登录前页面。GitHub 昵称和头像用于初始化 `profiles`。

### 邮箱与密码

注册表单收集邮箱、密码和确认密码。密码仅交给 Supabase Auth，不进入自建数据表。注册成功后提示用户查收验证邮件；验证完成后返回 `/auth/callback`。登录失败、邮箱未验证、密码不一致和请求频率限制均显示简洁中文错误。

邮箱注册正式公开前，Supabase 必须配置生产可用的 SMTP。SMTP 密码或授权码只在 Supabase Dashboard 中填写，不通过聊天、GitHub 或 Vercel 前端环境变量传递。

## 页面与交互

### 顶部身份入口

桌面端和移动端导航都显示身份入口：未登录时为“登录”，登录后显示头像或昵称。用户菜单只提供当前用户信息和“退出登录”；个人资料编辑不在本轮范围内。

### `/login`

登录页延续现有明亮、克制的主题风格和深浅色模式，包括：

- GitHub 登录按钮。
- 邮箱密码登录表单。
- 邮箱密码注册表单。
- 注册成功、邮箱待验证、登录失败和配置缺失状态。

### `/guestbook`

顶部导航新增“留言”。留言板公开展示留言和一级回复；未登录用户看到登录引导，登录用户看到发布框。主留言按最新优先，回复按时间正序。

### 文章互动区

文章正文和版权信息之后显示：

1. 点赞按钮与总数。
2. 评论发布框或登录引导。
3. 主评论列表和一级回复入口。

点赞采用乐观反馈：界面立即更新；数据库请求失败时恢复原状态并提示。评论只有服务器确认成功后才加入列表，避免重复发布。

### 可访问性和状态

- 所有按钮支持键盘操作和明确焦点样式。
- 表单控件有可见标签和关联错误信息。
- 点赞按钮提供 `aria-pressed`。
- 加载、空列表、未登录、配置缺失、网络错误和发布冷却均有中文状态。
- 所有新增组件兼容现有浅色、深色和系统主题。

## 首批文章

第二版从现有 Obsidian 知识库导入以下五篇文章：

| 标题 | 来源文件 | slug | 标签 |
| --- | --- | --- | --- |
| `Obsidian AI Agent 配置指南：Claudian + Obsidian Skills` | `G:/Obsidian Vault/Obsidian/Obsidian AI Agent 配置指南：Claudian + Obsidian Skills.md` | `obsidian-ai-agent-claudian-skills` | `obsidian`、`ai-agent`、`claudian`、`skills` |
| `Obsidian CLI 核心原理` | `G:/Obsidian Vault/Obsidian/Obsidian CLI 核心原理.md` | `obsidian-cli-core-principles` | `obsidian`、`cli`、`ai-agent`、`自动化` |
| `Git 进阶操作：版本管理与分支管理` | `G:/Obsidian Vault/Obsidian/Git 进阶操作：版本管理，分支管理.md` | `git-advanced-version-branch` | `git`、`版本管理`、`分支管理` |
| `Obsidian 必装 Skills` | `G:/Obsidian Vault/Obsidian/Obsidian 必装 Skills.md` | `obsidian-essential-skills` | `obsidian`、`skills`、`ai-agent` |
| `Obsidian 官方 CLI 命令全景速查表` | `G:/Obsidian Vault/Obsidian/Obsidian 官方 CLI 命令全景速查表.md` | `obsidian-cli-command-reference` | `obsidian`、`cli`、`速查表` |

每篇文章使用 `zh-CN`，发布日期采用源文件的本地最后修改日期，以保留现有笔记的时间顺序。文章保留原有观点和内容，只进行格式兼容处理：

- 添加 Astro 内容集合 frontmatter。
- 将正文中的额外一级标题调整为合理层级。
- 把 Obsidian `[!bash]`、`[!tip]`、`[!warning]`、`[!success]`、`[!danger]` 和 `[!info]` callout 转换为主题可稳定渲染的提示块。
- 把命令示例转换为带语言标记的代码块。
- 修正不影响原意的空白、全角标点和明显格式问题。
- 大型命令表格和 Skills 对比表在窄屏下使用横向滚动，不压缩到无法阅读。
- 保留 `你的智谱api key` 等明确的示例占位符，不写入任何真实凭据。

这五个 slug 都会接入相同的点赞和评论组件，并进入文章列表、标签页、归档、搜索索引和 RSS。

## 错误处理

- Supabase 公共配置缺失：静态站点继续工作，互动区显示暂不可用。
- OAuth 回调失败：回到登录页并显示可重试的中文错误。
- 会话过期：清除本地身份状态，保留用户尚未提交的输入，并提示重新登录。
- 评论验证或冷却失败：保留正文并展示数据库返回的友好错误。
- 点赞失败：回滚乐观更新。
- 查询失败：保留页面主体，互动区域显示重试按钮。

## 测试策略

### 自动化测试

- Bun 单元测试：配置解析、认证错误映射、评论校验、评论树组装和点赞状态转换。
- 页面结构测试：登录页、回调页、留言板入口、文章互动组件和无配置降级状态。
- SQL 验证：表约束、唯一点赞、30 秒冷却、一级回复、RLS、自删、管理员删除和越权失败。
- 项目验证：`bun test`、`bun run check`、`bun run build`。

### 浏览器验收

- GitHub 登录和退出。
- 邮箱注册、验证和密码登录。
- 发布文章评论、一级回复和留言板留言。
- 用户删除自己的内容，普通用户不能删除他人内容。
- CC 删除任意内容。
- 点赞、取消点赞和唯一点赞。
- 未登录用户只能读取，不能发布或点赞。
- 浅色、深色、移动端和键盘操作。

### 上线验收

- Supabase 位于东京，Vercel Functions 位于 `hnd1`。
- 公开环境变量存在，secret/service-role key 不出现在客户端构建产物。
- GitHub `main` 推送触发 Vercel 自动部署。
- 首页、登录页、留言板、五篇文章、搜索和 RSS 返回成功。
- 五篇文章均可被搜索和 RSS 收录，评论与点赞正常工作。

## 长期迁移与甲骨文

第二版完成后单独实施以下运维任务：

- 从托管 Supabase 执行定时逻辑备份。
- 加密后保存到甲骨文大阪服务器，并保留第二份异地副本。
- 在 4C24G 实例上部署自托管 Supabase 测试环境。
- 定期把备份恢复到测试环境并执行数据完整性检查。

正式迁移只有在成本、延迟、控制权或托管限制构成实际问题，且备份恢复、监控、更新和故障演练已经可靠后才进行。

## 完成标准

第二版完成时，用户可以通过 GitHub 或经过验证的邮箱账户登录，在任意一篇首批文章下点赞、评论和一级回复，并在留言板留言；五篇文章可正常阅读和检索，权限绕过测试失败，静态内容在后端不可用时仍可访问，所有代码、SQL 迁移和部署配置已推送到 GitHub 并由 Vercel 成功发布。
