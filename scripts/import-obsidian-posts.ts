import { readFileSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { convertObsidianMarkdown } from '../src/utils/obsidian-import'

const posts = [
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian AI Agent 配置指南：Claudian + Obsidian Skills.md',
    slug: 'obsidian-ai-agent-claudian-skills',
    title: 'Obsidian AI Agent 配置指南：Claudian + Obsidian Skills',
    description: '在 Obsidian 中配置 Claudian 与 Obsidian Skills，构建本地优先的 AI Agent 工作流。',
    tags: ['obsidian', 'ai-agent', 'claudian', 'skills']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian CLI 核心原理.md',
    slug: 'obsidian-cli-core-principles',
    title: 'Obsidian CLI 核心原理',
    description: '理解 Obsidian CLI 的架构、Agent 集成方式与自动化工作流。',
    tags: ['obsidian', 'cli', 'ai-agent', '自动化']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Git 进阶操作：版本管理，分支管理.md',
    slug: 'git-advanced-version-branch',
    title: 'Git 进阶操作：版本管理与分支管理',
    description: '用 Git log、restore、revert、reset、blame 与分支操作管理笔记和代码版本。',
    tags: ['git', '版本管理', '分支管理']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian 必装 Skills.md',
    slug: 'obsidian-essential-skills',
    title: 'Obsidian 必装 Skills',
    description: '整理适合 Obsidian AI 工作流的 Skills、用途、依赖与风险。',
    tags: ['obsidian', 'skills', 'ai-agent']
  },
  {
    source: 'G:/Obsidian Vault/Obsidian/Obsidian 官方 CLI 命令全景速查表.md',
    slug: 'obsidian-cli-command-reference',
    title: 'Obsidian 官方 CLI 命令全景速查表',
    description: '按模块速查 Obsidian CLI 命令、完整样例和典型自动化场景。',
    tags: ['obsidian', 'cli', '速查表']
  }
] as const

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function frontmatter(post: (typeof posts)[number]) {
  return [
    '---',
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `publishDate: ${JSON.stringify(localDate(statSync(post.source).mtime))}`,
    `tags: ${JSON.stringify(post.tags)}`,
    `language: ${JSON.stringify('zh-CN')}`,
    'draft: false',
    '---'
  ].join('\n')
}

for (const post of posts) {
  const source = readFileSync(post.source, 'utf8')
  const content = `${frontmatter(post)}\n\n${convertObsidianMarkdown(source)}\n`
  await writeFile(resolve(root, 'src/content/blog', `${post.slug}.md`), content, 'utf8')
}
