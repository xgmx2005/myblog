import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('Waline integration', () => {
  test('forces login and provides theme-safe failure handling', () => {
    const component = read('src/components/waline/WalineThread.astro')
    expect(component).toContain("login: 'force'")
    expect(component).toContain("dark: 'html.dark'")
    expect(component).toContain('imageUploader: false')
    expect(component).toContain('wordLimit: [1, 1000]')
    expect(component).toContain('data-waline-status')
    expect(component).toContain("data-initialized")
    expect(component).toContain('评论服务暂时不可用，请稍后重试。')
  })

  test('uses stable and distinct article and guestbook paths', () => {
    const blogLayout = read('src/layouts/BlogPost.astro')
    const guestbook = read('src/pages/guestbook.astro')
    const siteConfig = read('src/site.config.ts')

    expect(blogLayout).toContain('path={`/blog/${id}`}')
    expect(blogLayout).toContain('reaction={true}')
    expect(guestbook).toContain("path='/guestbook'")
    expect(guestbook).toContain('reaction={false}')
    expect(siteConfig).toContain("title: '留言板'")
    expect(siteConfig).toContain('enable: false')
  })
})
