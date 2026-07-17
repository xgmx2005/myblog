import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('search page', () => {
  test('mounts DocSearch with a permanent Pagefind fallback', () => {
    const component = read('src/components/search/DocSearch.astro')
    const searchPage = read('src/pages/search/index.astro')

    expect(component).toContain("from '@docsearch/js'")
    expect(component).toContain("import '@docsearch/css'")
    expect(component).toContain('data-docsearch-status')
    expect(component).toContain('data-pagefind-fallback')
    expect(component).toContain("facetFilters: ['lang:zh-CN']")
    expect(searchPage).toContain("searchConfig.mode === 'algolia'")
    expect(searchPage).toContain('<PFSearch />')
  })

  test('publishes crawler language metadata', () => {
    const baseHead = read('src/components/BaseHead.astro')

    expect(baseHead).toContain("name='docsearch:language'")
    expect(baseHead).toContain("content='zh-CN'")
  })

  test('publishes the Algolia domain verification tag', () => {
    const baseHead = read('src/components/BaseHead.astro')

    expect(baseHead).toContain("name='algolia-site-verification'")
    expect(baseHead).toContain("content='63A19AA08B0C4815'")
  })
})
