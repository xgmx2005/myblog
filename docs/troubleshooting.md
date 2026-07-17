# 常见问题排查

排查原则：先确认现象发生在哪一层，再查看对应证据。不要在本地、Vercel、Waline、Algolia 和 DNS 之间盲目重复修改。

## 本地网站显示 `ERR_CONNECTION_REFUSED`

### 现象

浏览器访问 `localhost`，提示“无法访问此网站”或 `ERR_CONNECTION_REFUSED`。

### 常见原因

- Astro 开发服务器没有运行；
- 浏览器使用了旧端口；
- 终端中的进程已经退出；
- Node/Bun 环境没有正确加载。

### 处理

```powershell
where.exe node
node -p "process.execPath"
node --version
bun --version
bun run dev
```

读取终端输出中的 `Local` URL。不要继续使用上一次会话的随机 localhost 端口。

### 验证

```powershell
curl.exe -I http://localhost:4321
```

如果 Astro 输出了其他端口，把命令中的 4321 替换为实际端口。应得到 HTTP 200。

## Node 或 Bun 路径/版本不一致

### 现象

同一条命令在不同终端表现不同，或出现找不到 `node`、依赖 ABI 不匹配、Bun 使用了旧 Node 环境。

### 常见原因

- PATH 同时存在系统 Node、fnm Node 或其他发行版；
- 新终端没有加载 fnm；
- 从旧环境复制了 `node_modules/`。

### 处理

```powershell
where.exe node
node -p "process.execPath"
fnm current
node --version
bun --version
```

删除缓存产物时只清理项目内的 `.astro/`、`dist/` 和 `node_modules/`，随后重新安装：

```powershell
Remove-Item -Recurse -Force -LiteralPath '.astro','dist','node_modules' -ErrorAction SilentlyContinue
bun install --frozen-lockfile
```

### 验证

```powershell
bun test
bun run check
```

## Astro 检查或构建失败

### 现象

`bun run check` 或 `bun run build` 非 0 退出。

### 常见原因

- frontmatter 不符合 `src/content.config.ts`；
- Astro/TypeScript 类型错误；
- Markdown 中图片或导入路径不存在；
- 环境变量格式无效；
- 依赖未按 lockfile 安装。

### 处理

先执行最小诊断：

```powershell
bun install --frozen-lockfile
bun run check
bun test
```

根据第一条错误定位文件。文章错误重点检查标题长度、描述长度、日期、图片和 frontmatter 缩进。

### 验证

```powershell
bun run build
Write-Output "BUILD_EXIT=$LASTEXITCODE"
```

必须看到 `BUILD_EXIT=0`。

## Windows 出现 Pagefind wrapper 提示

### 现象

构建日志出现类似“Failed to run pagefind via the npx wrapper”或 Windows 架构提示。

### 常见原因

Astro/Pure 集成尝试通过包装器调用 Pagefind，而项目自己的固定 `pagefind` 依赖随后仍可能正常执行。

### 处理

继续查看完整日志，不要只截取第一条提示：

- 如果后面出现 `Running Pagefind`、索引页数和词数，说明项目命令已经运行本地 Pagefind；
- 如果最终非 0 退出，重新安装锁定依赖并单独执行：

```powershell
bun install --frozen-lockfile
bunx pagefind --site dist/client
```

### 验证

确认存在 `dist/client/pagefind/`，并且完整的 `bun run build` 退出码为 0。

## GitHub 已推送但正式域名仍显示旧内容

### 现象

GitHub 已有新 commit，但 `ccxgmx.fun` 仍显示旧页面。

### 常见原因

- 只推送了功能分支，未更新 `main`；
- Vercel Production Deployment 仍在排队或构建；
- 构建失败；
- 域名 alias 仍指向上一个 production；
- 浏览器或 CDN 缓存。

### 处理

1. 在 GitHub 确认 `main` 的 commit SHA。
2. 在 Vercel Deployments 选择 `Production`，确认同一 SHA。
3. 等待状态变为 `READY`。
4. 用带查询参数的 URL 绕过浏览器缓存：

```powershell
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
curl.exe -L -sS "https://ccxgmx.fun/?verify=$stamp"
```

### 验证

在响应 HTML 中查找本次新文案或 meta，并确认正式域名 HTTP 200。

## Waline 评论区没有加载

### 现象

页面显示“评论服务尚未启用”或“评论服务暂时不可用”。

### 常见原因

- Astro 项目缺少 `PUBLIC_WALINE_SERVER_URL`；
- 地址不是 HTTPS 或合法 localhost；
- Vercel 修改变量后没有重新部署；
- Waline 服务构建失败；
- `SECURE_DOMAINS` 不包含当前网站域名。

### 处理

1. 确认 Astro 项目中的变量指向 `https://cc-waline.vercel.app`。
2. 重新部署 Astro 网站。
3. 访问 `https://cc-waline.vercel.app/ui` 检查服务。
4. 在 Waline 项目确认 `SECURE_DOMAINS` 包含 `ccxgmx.fun`。
5. 查看 Waline Vercel Runtime Logs。

### 验证

文章页 8 秒内出现 Waline 面板；未登录发布时应进入登录流程。

## Waline 邮箱注册收不到确认信

### 现象

注册成功提示后没有收到确认或密码邮件。

### 常见原因

- QQ SMTP 授权码失效；
- `SMTP_HOST`、端口或 TLS 配置不匹配；
- 发件人和 SMTP 用户不一致；
- 邮件进入垃圾箱；
- Vercel 中变量只更新了 Preview 或只更新了 Production。

### 处理

在 `cc-waline` Vercel 项目检查 SMTP 变量名称和目标环境。QQ 邮箱使用 SMTP 授权码，不使用 QQ 登录密码。更新后重新部署 Waline。

不要把授权码粘贴进 Git、截图、构建日志或公开文档。

### 验证

使用新的测试邮箱触发一次注册或密码恢复，并在 Waline Runtime Logs 中确认邮件请求没有错误。

## Algolia 爬虫提示记录过大

### 现象

Monitoring 显示 `Records extracted are too big`，通常指向正文很长的文章。

### 常见原因

`aggregateContent: true` 将多个段落合并为单条记录，超过 Algolia 单记录大小限制。

### 处理

使用分段记录：

```js
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
```

先用 URL Tester 检查失败文章，再发布 crawler 配置。

### 验证

URL Tester 返回 `SUCCESS` 且 Records 中出现多条分段记录；完整爬取不再报告过大记录。

## Algolia 因记录减少阻塞发布

### 现象

Crawler 显示 `SafeReindexingError`，新记录比旧记录减少超过 `maxLostRecordsPercentage`。

### 常见原因

- selector 失效；
- 更换域名后旧 URL 与新 URL 数量不一致；
- exclusion 或 path pattern 过宽；
- 上一次错误配置产生了异常多的记录。

### 处理

1. 对文章、标签、归档和留言板分别运行 URL Tester。
2. 检查新记录是否包含五篇文章和中文正文。
3. 对比 Monitoring 与 Indices 中的新旧记录数。
4. 先修复 selector、域名或 pattern。
5. 只有确认记录减少符合预期时，才在发布界面执行替换或临时调整安全阈值。

当前配置使用 30% 作为发布前丢失记录保护。不要为了让红色提示消失而永久关闭安全检查。

### 验证

完整爬取成功发布，新索引中的文章标题、标签、归档和正文搜索均正常。

## Algolia 已爬取但网站搜索没有更新

### 现象

Crawler 成功，但网站搜索没有新文章，或结果链接仍指向旧域名。

### 常见原因

- Crawler 更新了不同 index；
- Astro 的 `PUBLIC_ALGOLIA_INDEX_NAME` 不一致；
- 搜索 key 没有目标 index 权限；
- Crawler 尚未 Review and Publish；
- 浏览器读取旧部署；
- `lang` facet 与记录字段不一致。

### 处理

1. 在 Algolia Search 的 Browse 页面确认 `CC Blog DocSearch` 有新记录。
2. 确认记录的 `url` 使用 `https://ccxgmx.fun`。
3. 确认记录具有 `lang: zh-CN`。
4. 在 Astro Vercel 项目核对三项 `PUBLIC_ALGOLIA_*` 变量。
5. 修改变量后重新部署网站。

### 验证

在 `/search` 输入新文章的唯一关键词，结果应出现并跳转到正式域名。展开“使用本地搜索”还应看到 Pagefind 结果。

## 仍无法定位时

按顺序保存证据：

1. 本地命令和退出码；
2. Git commit SHA；
3. Vercel deployment ID、环境和状态；
4. 失败 URL 与 HTTP 状态；
5. Waline Runtime Logs 或 Algolia Monitoring 中的具体错误；
6. 不含密钥的最小配置片段。

有了这六项，通常可以判断问题属于源码、构建、部署、域名还是第三方服务。
