import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const readOptional = (path: string) => {
  const file = resolve(root, path)
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

describe('DotGrid integration', () => {
  test('uses React and GSAP without the previous WebGL runtime', () => {
    const pkg = JSON.parse(read('package.json'))
    const config = read('astro.config.ts')

    expect(pkg.dependencies['@astrojs/react']).toBe('5.0.7')
    expect(typeof pkg.dependencies.react).toBe('string')
    expect(typeof pkg.dependencies['react-dom']).toBe('string')
    expect(typeof pkg.dependencies.gsap).toBe('string')
    expect(pkg.dependencies.three).toBeUndefined()
    expect(pkg.dependencies.postprocessing).toBeUndefined()
    expect(config).toContain("import react from '@astrojs/react'")
    expect(config).toContain('react(),')
  })

  test('ships the approved fresh light and deep violet dark palettes', () => {
    const config = readOptional('src/components/guestbook/dot-grid-config.ts')

    expect(config).toContain("base: '#4f9db1'")
    expect(config).toContain("active: '#16b8c4'")
    expect(config).toContain("base: '#30283f'")
    expect(config).toContain("active: '#6947ff'")
  })

  test('uses a static fallback for reduced motion or missing Canvas 2D', () => {
    const wrapper = readOptional('src/components/guestbook/GuestbookDotGrid.jsx')

    expect(wrapper).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(wrapper).toContain("canvas.getContext('2d')")
    expect(wrapper).toContain('if (!canAnimate) return null')
  })

  test('keeps the canvas decorative and cleans up animation resources', () => {
    const core = readOptional('src/components/guestbook/DotGrid.jsx')
    const wrapper = readOptional('src/components/guestbook/GuestbookDotGrid.jsx')
    const styles = readOptional('src/components/guestbook/DotGrid.css')

    expect(core).toContain("window.addEventListener('pointermove'")
    expect(core).toContain("window.removeEventListener('pointermove'")
    expect(core).toContain("window.addEventListener('pointerdown'")
    expect(core).toContain("window.removeEventListener('pointerdown'")
    expect(core).toContain("document.addEventListener('visibilitychange'")
    expect(core).toContain("document.removeEventListener('visibilitychange'")
    expect(core).toContain('cancelAnimationFrame')
    expect(core).toContain('ResizeObserver')
    expect(core).toContain('gsap.killTweensOf')
    expect(core).toContain("aria-hidden='true'")
    expect(wrapper).toContain("attributeFilter: ['class']")
    expect(styles).toContain('pointer-events: none')
  })
})
