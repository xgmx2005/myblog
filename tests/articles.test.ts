import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const posts = [
  ['obsidian-ai-agent-claudian-skills', 'Obsidian AI Agent 配置指南：Claudian + Obsidian Skills'],
  ['obsidian-cli-core-principles', 'Obsidian CLI 核心原理'],
  ['git-advanced-version-branch', 'Git 进阶操作：版本管理与分支管理'],
  ['obsidian-essential-skills', 'Obsidian 必装 Skills'],
  ['obsidian-cli-command-reference', 'Obsidian 官方 CLI 命令全景速查表']
] as const

describe('initial article collection', () => {
  for (const [slug, title] of posts) {
    test(`publishes ${slug} with valid frontmatter and content`, () => {
      const path = resolve(root, 'src/content/blog', `${slug}.md`)
      expect(existsSync(path)).toBe(true)
      const source = readFileSync(path, 'utf8')

      expect(source).toContain(`title: ${JSON.stringify(title)}`)
      expect(source).toMatch(/description: ".+"/)
      expect(source).toMatch(/publishDate: "\d{4}-\d{2}-\d{2}"/)
      expect(source).toMatch(/tags: \[.+\]/)
      expect(source).toContain('language: "zh-CN"')
      expect(source).toContain('draft: false')
      expect(source).toMatch(/^##+ .+/m)
      expect(source).not.toContain('> [!')
      expect(source).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/)
      expect(source).not.toMatch(/\bAKIA[0-9A-Z]{16}\b/)
      expect(source).not.toMatch(/\bsk-[A-Za-z0-9]{24,}\b/)
    })
  }

  test('keeps the documented API-key placeholder', () => {
    const collection = posts
      .map(([slug]) => readFileSync(resolve(root, 'src/content/blog', `${slug}.md`), 'utf8'))
      .join('\n')
    expect(collection).toContain('ANTHROPIC_API_KEY=你的智谱api key')
  })

  test('keeps wide article tables usable on narrow screens', () => {
    const css = readFileSync(resolve(root, 'src/assets/styles/app.css'), 'utf8')
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('.prose table')
    expect(css).toContain('overflow-x: auto')
  })
})
