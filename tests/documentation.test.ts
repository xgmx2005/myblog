import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const root = resolve(import.meta.dir, '..')
const requiredDocs = [
  'README.md',
  'docs/README.md',
  'docs/architecture.md',
  'docs/development.md',
  'docs/content-workflow.md',
  'docs/deployment.md',
  'docs/integrations.md',
  'docs/project-history.md',
  'docs/troubleshooting.md',
  'docs/operations/algolia-docsearch.md'
]

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('project documentation', () => {
  test('publishes one complete Chinese documentation set', () => {
    for (const path of requiredDocs) expect(existsSync(resolve(root, path))).toBeTrue()
    expect(existsSync(resolve(root, 'README-zh-CN.md'))).toBeFalse()

    const readme = read('README.md')
    expect(readme).toContain('https://ccxgmx.fun')
    expect(readme).toContain('bun run dev')
    expect(readme).toContain('docs/README.md')
    expect(readme).not.toContain('# Astro Theme Pure')
  })

  test('keeps every relative Markdown link valid', () => {
    const markdownLink = /!?\[[^\]]*]\(([^)]+)\)/g

    for (const path of requiredDocs) {
      const source = read(path)
      for (const match of source.matchAll(markdownLink)) {
        const target = match[1].trim().replace(/^<|>$/g, '')
        if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue

        const fileTarget = decodeURIComponent(target.split('#', 1)[0])
        if (!fileTarget) continue
        const absolute = resolve(dirname(resolve(root, path)), fileTarget)
        expect(existsSync(absolute), `${path} -> ${target}`).toBeTrue()
        expect(['.md', ''].includes(extname(absolute))).toBeTrue()
      }
    }
  })

  test('does not copy local environment secrets into public documents', () => {
    const corpus = requiredDocs.map(read).join('\n')
    const envPath = resolve(root, '.env.local')
    if (!existsSync(envPath)) return

    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const separator = line.indexOf('=')
      if (separator < 1) continue
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      if (value.length >= 12) expect(corpus).not.toContain(value)
    }
  })
})
