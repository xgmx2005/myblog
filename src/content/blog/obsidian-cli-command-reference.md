---
title: "Obsidian 官方 CLI 命令全景速查表"
description: "按模块速查 Obsidian CLI 命令、完整样例和典型自动化场景。"
publishDate: "2026-04-05"
tags: ["obsidian","cli","速查表"]
language: "zh-CN"
draft: false
---

**核心执行逻辑说明：**
- 基础格式：`obsidian <命令> 参数名=参数值 标记参数`
- 含有空格的值必须加双引号，例如：`content="Hello world"`。
- **标记参数**（如 `open`, `inline`, `total`）不需要赋值，写上就代表启用。
- 以下表格中 `file=Recipe` 代表对库中名为 Recipe 的文件执行操作，实际使用时需要替换为你库中真实存在的文件名。

| 所属模块      | 命令                             | 功能解释                              | 完整样例 (直接在终端运行)                                                        |
| :-------- | :----------------------------- | :-------------------------------- | :-------------------------------------------------------------------- |
| **基础操作**  | `help`                         | 显示帮助。加上具体命令就是查看这个命令的帮助。           | `obsidian help search`                                                |
|           | `version`                      | 显示当前 Obsidian 软件版本号。              | `obsidian version`                                                    |
|           | `reload`                       | 重新加载应用窗口。                         | `obsidian reload`                                                     |
|           | `restart`                      | 重启整个 Obsidian 应用程序。               | `obsidian restart`                                                    |
| **数据库**   | `bases`                        | 列出仓库中所有的 `.base` 数据库文件。           | `obsidian bases`                                                      |
|           | `base:views`                   | 列出当前活动数据库文件中的视图。                  | `obsidian base:views file=Contacts`                                   |
|           | `base:create`                  | 在数据库中创建新记录，支持指定字段内容。              | `obsidian base:create file=Contacts name="John Doe"`                  |
|           | `base:query`                   | 查询数据库并返回 JSON 或 CSV 结果。           | `obsidian base:query file=Contacts view=Active format=json`           |
| **书签**    | `bookmarks`                    | 列出书签。                             | `obsidian bookmarks format=json`                                      |
|           | `bookmark`                     | 将指定文件或查询条件保存为书签。                  | `obsidian bookmark file="Project A" title="当前项目"`                     |
| **命令面板**  | `commands`                     | 获取所有内置或插件命令的 ID。                  | `obsidian commands filter=workspace`                                  |
|           | `command`                      | 强制执行一个内部命令。                       | `obsidian command id=workspace:close`                                 |
|           | `hotkeys`                      | 列出所有快捷键映射。                        | `obsidian hotkeys verbose`                                            |
|           | `hotkey`                       | 获取单个命令的具体快捷键。                     | `obsidian hotkey id=workspace:close`                                  |
| **日记**    | `daily`                        | 打开当天的每日笔记。                        | `obsidian daily paneType=tab`                                         |
|           | `daily:path`                   | 输出每日笔记的物理路径。                      | `obsidian daily:path`                                                 |
|           | `daily:read`                   | 打印当天每日笔记的文本内容。                    | `obsidian daily:read`                                                 |
|           | `daily:append`                 | 向每日笔记末尾追加文本，适合快速记录。               | `obsidian daily:append content="- [ ] 记得回复邮件"`                        |
|           | `daily:prepend`                | 向每日笔记开头插入文本。                      | `obsidian daily:prepend content="# 今日重点"`                             |
| **文件历史**  | `diff`                         | 对比不同历史版本。                         | `obsidian diff file=Recipe from=2 to=1`                               |
|           | `history` / `history:list`     | 显示有本地历史记录的文件列表。                   | `obsidian history file=Recipe`                                        |
|           | `history:read`                 | 读取某个历史版本的内容。                      | `obsidian history:read file=Recipe version=1`                         |
|           | `history:restore`              | 将文件回滚到指定历史版本。                     | `obsidian history:restore file=Recipe version=2`                      |
|           | `history:open`                 | 在界面中打开文件恢复面板。                     | `obsidian history:open file=Recipe`                                   |
| **文件与目录** | `file` / `folder`              | 显示文件或文件夹的元数据（大小、时间）。              | `obsidian file path="Notes/Recipe.md"`                                |
|           | `files` / `folders`            | 遍历列表，支持后缀过滤并返回总数。                 | `obsidian files ext=md total`                                         |
|           | `open`                         | 打开文件。                             | `obsidian open file=Recipe newtab`                                    |
|           | `create`                       | 静默创建文件，支持预设内容或应用模板。               | `obsidian create name=Meeting content="# 会议记录" overwrite`             |
|           | `read`                         | 打印文件内容，Agent 接入必用命令。              | `obsidian read file=Recipe`                                           |
|           | `append` / `prepend`           | 在文件末尾或头部插入内容。                     | `obsidian append file=Recipe content="追加的文本"`                         |
|           | `move` / `rename`              | 移动或重命名文件（自动更新双链）。                 | `obsidian rename file=Recipe name=NewRecipe`                          |
|           | `delete`                       | 删除文件，可附加 `permanent` 彻底删除。        | `obsidian delete file=Recipe permanent`                               |
| **链接网络**  | `backlinks`                    | 列出指向这个文件的反向链接。                    | `obsidian backlinks file=Index format=json`                           |
|           | `links`                        | 列出这个文件包含的出站链接。                    | `obsidian links file=Index total`                                     |
|           | `unresolved`                   | 提取未创建实体文件的死链接节点。                  | `obsidian unresolved format=json`                                     |
|           | `orphans`                      | 列出没有被引用的孤立文件。                     | `obsidian orphans total`                                              |
|           | `deadends`                     | 列出没有向外发出引用的死胡同笔记。                 | `obsidian deadends total`                                             |
| **大纲**    | `outline`                      | 提取文件的标题树状结构。                      | `obsidian outline file=Recipe format=tree`                            |
| **插件管理**  | `plugins` / `enabled`          | 列出所有插件或已开启的插件。                    | `obsidian plugins filter=community`                                   |
|           | `plugins:restrict`             | 开关安全模式。                           | `obsidian plugins:restrict off`                                       |
|           | `plugin` / `plugin:enable`     | 查询插件信息或开启插件。                      | `obsidian plugin:enable id=dataview`                                  |
|           | `plugin:disable`               | 禁用插件。                             | `obsidian plugin:disable id=dataview`                                 |
|           | `plugin:install` / `uninstall` | 静默安装或卸载社区插件。                      | `obsidian plugin:install id=dataview enable`                          |
|           | `plugin:reload`                | 热重载插件（适合开发调试）。                    | `obsidian plugin:reload id=my-plugin`                                 |
| **属性元数据** | `aliases`                      | 提取别名列表。                           | `obsidian aliases active`                                             |
|           | `properties`                   | 提取 YAML 属性，支持排序。                  | `obsidian properties sort=count`                                      |
|           | `property:set`                 | 修改属性值，规范化文本、日期等类型。                | `obsidian property:set name=status value=draft type=text file=Recipe` |
|           | `property:remove` / `read`     | 删除属性或提取特定属性值。                     | `obsidian property:read name=status file=Recipe`                      |
| **发布**    | `publish:site` / `list`        | 获取 Publish 站点信息或已发布清单。            | `obsidian publish:list`                                               |
|           | `publish:status` / `add`       | 检查变更或推送到云端。                       | `obsidian publish:add changed`                                        |
|           | `publish:remove` / `open`      | 撤销发布或在浏览器中查看线上页面。                 | `obsidian publish:open file=Recipe`                                   |
| **随机笔记**  | `random` / `random:read`       | 打开随机笔记或直接打印其内容。                   | `obsidian random folder="Zettelkasten" newtab`                        |
| **全局搜索**  | `search`                       | 全文检索，返回文件路径列表。                    | `obsidian search query="TODO" format=json`                            |
|           | `search:context`               | 提供包含上下文的检索结果。                     | `obsidian search:context query="重要" limit=5`                          |
|           | `search:open`                  | 在图形界面中唤出搜索面板。                     | `obsidian search:open query="会议记录"`                                   |
| **官方同步**  | `sync` / `sync:status`         | 控制同步进程开关，查看状态。                    | `obsidian sync on`                                                    |
|           | `sync:history` / `read`        | 查阅云端版本历史记录或读取内容。                  | `obsidian sync:read file=Recipe version=1`                            |
|           | `sync:restore`                 | 强制回滚到云端版本。                        | `obsidian sync:restore file=Recipe version=2`                         |
|           | `sync:open` / `deleted`        | 打开界面查看历史或已删除文件。                   | `obsidian sync:deleted`                                               |
| **标签**    | `tags`                         | 提取标签网络，统计频次。                      | `obsidian tags sort=count format=json`                                |
|           | `tag`                          | 查询单个标签的分布和出现次数。                   | `obsidian tag name="#important" verbose`                              |
| **任务管理**  | `tasks`                        | 检索全库或指定日记的任务状态。                   | `obsidian tasks todo daily`                                           |
|           | `task`                         | 终端直连修改具体任务的勾选状态。                  | `obsidian task ref="Recipe.md:8" toggle`                              |
| **模板**    | `templates` / `template:read`  | 查看模板库，或解析带变量的模板内容。                | `obsidian template:read name=Meeting resolve`                         |
|           | `template:insert`              | 将模板注入到活动笔记中。                      | `obsidian template:insert name=Meeting`                               |
| **外观与样式** | `themes` / `theme`             | 查看安装的主题或查看当前主题详情。                 | `obsidian themes versions`                                            |
|           | `theme:set` / `install`        | 切换主题，或从终端安装并启用新主题。                | `obsidian theme:install name="Minimal" enable`                        |
|           | `theme:uninstall`              | 卸载主题。                             | `obsidian theme:uninstall name="Minimal"`                             |
|           | `snippets` 相关命令                | 开关 CSS 片段。                        | `obsidian snippet:enable name=custom-font`                            |
| **卡片盒模式** | `unique`                       | 按照 Zettelkasten 时间戳生成唯一笔记。        | `obsidian unique name="Idea" open`                                    |
| **仓库管理**  | `vault` / `vaults`             | 获取当前仓库信息或列出所有本地仓库。                | `obsidian vaults verbose`                                             |
|           | `vault:open`                   | 强制软件跳转打开另一个仓库。                    | `obsidian vault:open name="My Vault"`                                 |
| **内置浏览器** | `web`                          | 在 Obsidian 内直接打开网页。               | `obsidian web url="https://google.com" newtab`                        |
| **字数统计**  | `wordcount`                    | 统计字数或字符数。                         | `obsidian wordcount file=Recipe words`                                |
| **工作区布局** | `workspace` 系列命令               | 保存、载入、删除窗口布局配置。                   | `obsidian workspace:load name=Writing`                                |
|           | `tabs` / `tab:open`            | 管理标签页组，或者在新标签打开文件。                | `obsidian tab:open file=Recipe`                                       |
|           | `recents`                      | 返回最近打开文件的记录。                      | `obsidian recents total`                                              |
| **开发者模式** | `devtools` / `dev:debug`       | 调出底层控制台或挂载 Chrome 调试器。            | `obsidian dev:debug on`                                               |
|           | `dev:cdp`                      | 顶级权限，调用 Chrome DevTools Protocol。 | `obsidian dev:cdp method="Network.enable"`                            |
|           | `dev:screenshot`               | 生成软件当前界面的 base64 图片数据流。           | `obsidian dev:screenshot path=screenshot.png`                         |
|           | `dev:console` / `css`          | 读取控制台日志，或抓取 CSS 渲染数据。             | `obsidian dev:console level=error`                                    |
|           | `dev:dom`                      | 用 CSS 选择器直接抓取界面 DOM 元素。           | `obsidian dev:dom selector=".cm-content" text`                        |
|           | `dev:mobile`                   | 开启移动端布局模拟。                        | `obsidian dev:mobile on`                                              |
|           | `eval`                         | 注入 JavaScript 代码到底层执行并返回结果。       | `obsidian eval code="app.vault.getFiles().length"`                    |

## Obsidian CLI 典型自动化应用场景与工作流

| 工作流名称                   | 功能简介                                                                                                                                                                                | 涉及的 CLI 命令                                                                                                                                                |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. 全局极速闪记 **          | **痛点**：记录一闪而过的灵感时，打开软件、等插件加载、找文件太慢。<br>**方案**：在 Raycast、Alfred 甚至手机捷径中绑定一段终端脚本。输入文字后，脚本在后台直接调用 CLI，将文字无感追加到今天的日记末尾。完全不需要唤醒 Obsidian 界面。                                             | `obsidian daily:append content="灵感内容"`                                                                                                                    |
| **2. 播客/视频沉浸式知识榨取**     | **痛点**：看完 YouTube 视频后，手动整理笔记并建立待办事项费时费力。<br>**方案**：把链接丢给 OpenClaw 或 Telegram 机器人。AI 提取字幕并总结后，调用 CLI 直接使用你的“媒体笔记模板”创建新文件，并把提取出的行动项自动打上标签，插入到当天的日记中。                                  | `obsidian create name="视频名" template="Media"`<br>`obsidian daily:append content="- [ ] 待办项"`                                                              |
| **3. AI 收件箱自动分拣员 **     | **痛点**：平时用 Web Clipper 随手剪藏的网页堆积在 Inbox 文件夹，变成“赛博垃圾场”。<br>**方案**：利用 n8n 建立定时任务，让大模型批量阅读 Inbox 里的文件。理解内容后，通过 CLI 规范化注入 YAML 属性（如作者、分类），最后安全地将文件重命名并移动到对应的归档文件夹。CLI 会自动更新全库的双链，绝不断链。  | `obsidian files folder="Inbox"`<br>`obsidian read file="未命名"`<br>`obsidian property:set name="category" value="AI"`<br>`obsidian move file="旧名" to="新路径"` |
| **4. 绝对隐私的本地 RAG 对话助理** | **痛点**：搭建向量数据库（Chroma/Milvus）太繁琐，且每次笔记更新都要重新 Embedding（向量化）。<br>**方案**：在本地运行 Claude Code 或本地大模型，赋予其 CLI 执行权限。AI 会根据你的提问，自主使用带有上下文的全局搜索指令，并通过提取反向链接顺藤摸瓜，构建准确的背景知识库后再回答，完全零配置。        | `obsidian search:context query="关键词"`<br>`obsidian backlinks file="检索到的文件"`<br>`obsidian read file="目标笔记"`                                                |
| **5. 跨平台数据库级联录入**       | **痛点**：外部数据（如记账、习惯打卡）很难干净地录入到 Obsidian 的表格或 Dataview 中。<br>**方案**：结合 Obsidian 1.12 最新的 Bases（数据库）功能。通过 n8n 接收外部 Webhook（比如银行消费短信），直接让 CLI 在指定的 Base 文件中创建一条新记录，并严格按数据类型（数字、日期）注入字段。 | `obsidian base:create file="财务库" name="打车"`<br>`obsidian property:set type="number" value="30"`                                                           |
| **6. 历史知识自动唤醒与破冰**      | **痛点**：记录了大量笔记但从不回顾，知识变成死水。<br>**方案**：每天早晨执行一个自动化脚本，利用 CLI 提取一篇早于 1 年前的随机笔记，交给 AI 提炼核心观点，并与你最近一周关注的标签（如 `#Agent`）进行强行跨界联想，将联想结果作为“每日思考”追加到今天日记中。                                    | `obsidian random:read folder="卡片盒"`<br>`obsidian tags sort=count limit=5`<br>`obsidian daily:prepend content="AI的跨界联想"`                                   |
| **7. 批量元数据重构与清洗**       | **痛点**：笔记库用久了，属性极其混乱（比如状态标签混用了 `doing`、`in-progress`、`进行中`），导致 Dataview 列表报错。<br>**方案**：让 AI 脚本遍历你的核心文件夹，读取现有的属性值，统一转换为标准格式，然后用 CLI 进行批量覆写。这种方式强制符合 YAML 语法，绝不会多一个空格或少一个引号。         | `obsidian properties`<br>`obsidian property:read name="status"`<br>`obsidian property:set name="status" value="标准值"`                                      |
