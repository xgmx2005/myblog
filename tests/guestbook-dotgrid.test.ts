import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('guestbook DotGrid page', () => {
  test('mounts the lightweight background only on the guestbook route', () => {
    const guestbook = read('src/pages/guestbook.astro')
    const baseLayout = read('src/layouts/BaseLayout.astro')

    expect(guestbook).toContain('import GuestbookDotGrid')
    expect(guestbook).toContain("client:only='react'")
    expect(guestbook).toContain("pageId='guestbook'")
    expect(guestbook).toContain("slot='background'")
    expect(guestbook).toContain("class='guestbook-backdrop'")
    expect(baseLayout).not.toContain('GuestbookDotGrid')
    expect(guestbook).not.toContain('GuestbookPixelBlast')
  })

  test('forwards the page identifier and background outside transformed content', () => {
    const common = read('src/layouts/CommonPage.astro')
    const content = read('src/layouts/ContentLayout.astro')
    const base = read('src/layouts/BaseLayout.astro')

    expect(common).toContain('pageId?: string')
    expect(common).toContain("slot='background'")
    expect(content).toContain('pageId?: string')
    expect(content).toContain("slot='background'")
    expect(base).toContain('pageId?: string')
    expect(base).toContain('data-page={pageId}')
    expect(base.indexOf("<slot name='background' />")).toBeLessThan(
      base.indexOf("id='main-container'")
    )
  })

  test('keeps the existing Waline thread identity and behavior', () => {
    const guestbook = read('src/pages/guestbook.astro')

    expect(guestbook).toContain("path='/guestbook'")
    expect(guestbook).toContain('reaction={false}')
    expect(guestbook).toContain("title='伙伴留言'")
  })

  test('matches the approved clear daytime and violet night surfaces', () => {
    const guestbook = read('src/pages/guestbook.astro')

    expect(guestbook).toContain('--guestbook-surface: #eaf8fa')
    expect(guestbook).toContain('--guestbook-surface: #121017')
    expect(guestbook).toContain('backdrop-filter: blur(')
    expect(guestbook).toContain('#content-header')
    expect(guestbook).toContain('#content')
    expect(guestbook).toContain('html.dark')
    expect(guestbook).toContain('pointer-events: none')
  })
})
