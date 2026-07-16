import { describe, expect, test } from 'bun:test'
import { convertObsidianMarkdown } from '../src/utils/obsidian-import'

describe('convertObsidianMarkdown', () => {
  test('converts callouts and demotes body h1 headings', () => {
    const source = '> [!warning]+ 核心区别\n> 请谨慎操作\n\n# 第二部分\n正文'
    const result = convertObsidianMarkdown(source)
    expect(result).toContain('> **警告 · 核心区别**')
    expect(result).toContain('## 第二部分')
    expect(result).not.toContain('[!warning]')
  })

  test('normalizes non-breaking spaces without changing placeholders', () => {
    expect(convertObsidianMarkdown('git\u00a0log\nANTHROPIC_API_KEY=你的智谱api key')).toBe(
      'git log\nANTHROPIC_API_KEY=你的智谱api key'
    )
  })

  test('fences command-only callout lines', () => {
    const result = convertObsidianMarkdown('> [!bash]+ 查看历史\n> git log -- notes.md')
    expect(result).toContain('> **命令 · 查看历史**')
    expect(result).toContain('> ```bash\n> git log -- notes.md\n> ```')
  })
})
