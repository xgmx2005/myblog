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
  test('keeps an empty blog collection and publishes no docs route', () => {
    const posts = walk(absolute('src/content/blog')).filter((file) => ['.md', '.mdx'].includes(extname(file)))
    expect(posts).toEqual([])
    expect(existsSync(absolute('src/content/blog/.gitkeep'))).toBe(true)
    expect(existsSync(absolute('src/content/docs'))).toBe(false)
    expect(existsSync(absolute('src/pages/docs'))).toBe(false)
  })

  test('removes Waline from dependencies and layouts', () => {
    const pkg = JSON.parse(readFileSync(absolute('package.json'), 'utf8'))
    expect(pkg.dependencies['@waline/client']).toBeUndefined()
    expect(existsSync(absolute('src/components/waline'))).toBe(false)
    expect(readFileSync(absolute('src/layouts/CommonPage.astro'), 'utf8')).not.toContain('PageInfo')
    expect(readFileSync(absolute('src/layouts/BlogPost.astro'), 'utf8')).not.toContain('Comment')
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
