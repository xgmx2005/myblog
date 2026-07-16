import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const absolute = (path: string) => resolve(root, path)

function walk(path: string): string[] {
  if (!existsSync(path)) return []
  return readdirSync(path).flatMap((name) => {
    const child = resolve(path, name)
    return statSync(child).isDirectory() ? walk(child) : [child]
  })
}

describe('content system cleanup', () => {
  test('publishes only the approved initial blog collection and no docs route', () => {
    const posts = walk(absolute('src/content/blog')).filter((file) => ['.md', '.mdx'].includes(extname(file)))
    expect(posts.map((file) => file.replaceAll('\\', '/').split('/').at(-1)).sort()).toEqual([
      'git-advanced-version-branch.md',
      'obsidian-ai-agent-claudian-skills.md',
      'obsidian-cli-command-reference.md',
      'obsidian-cli-core-principles.md',
      'obsidian-essential-skills.md'
    ])
    expect(existsSync(absolute('src/content/docs'))).toBe(false)
    expect(existsSync(absolute('src/pages/docs'))).toBe(false)
  })

  test('keeps local layouts free of upstream sample content', () => {
    expect(readFileSync(absolute('src/layouts/CommonPage.astro'), 'utf8')).not.toContain('PageInfo')
  })

  test('contains no upstream identity or sample prose in public source', () => {
    const textFiles = [...walk(absolute('src')), ...walk(absolute('public'))].filter((file) =>
      ['.astro', '.ts', '.js', '.json', '.md', '.mdx', '.txt', '.xml'].includes(extname(file))
    )
    const source = textFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
    for (const forbidden of ['cworld1', 'cworld0', 'astro-pure.js.org', 'dummyjson.com', 'Lorem ipsum']) {
      expect(source).not.toContain(forbidden)
    }
  })
})
