import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('public pages', () => {
  test('home presents CC before content discovery', () => {
    const home = read('src/pages/index.astro')
    for (const value of ['profile.id', 'profile.location', 'profile.quote', '最近文章', 'Education', 'Projects', 'Skills']) {
      expect(home).toContain(value)
    }
    expect(home).toContain('还没有文章，第一篇正在路上。')
    expect(home).not.toContain('Get Template')
    expect(home).not.toContain('Certifications')
  })

  test('about contains no invented career identity', () => {
    const about = read('src/pages/about/index.astro')
    expect(about).toContain('profile.summary')
    expect(about).toContain('profile.education.school')
    expect(about).not.toContain('Developer / Designer')
  })

  test('projects and links expose honest empty states', () => {
    expect(read('src/pages/projects/index.astro')).toContain('持续更新中')
    expect(read('src/pages/links/index.astro')).toContain('友链正在整理中')
  })

  test('email is decoded only in the browser', () => {
    const contact = read('src/components/contact/ContactLinks.astro')
    expect(contact).toContain('atob(link.dataset.email')
    expect(contact).not.toContain('2463323447@qq.com')
  })

  test('core content pages use Chinese labels', () => {
    expect(read('src/pages/blog/[...page].astro')).toContain('文章')
    expect(read('src/pages/search/index.astro')).toContain('搜索')
    expect(read('src/pages/tags/index.astro')).toContain('全部标签')
    expect(read('src/pages/archives/index.astro')).toContain('归档')
  })
})
