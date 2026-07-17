import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

import { DOT_GRID_COLORS } from '../src/components/guestbook/dot-grid-config'

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

  test('ships a high-contrast fresh light palette and the official violet dark palette', () => {
    expect(DOT_GRID_COLORS.light).toEqual({
      base: '#6aa6b5',
      active: '#00b8d4',
      glow: '#70e2e8',
      glowOpacity: 0.18
    })
    expect(DOT_GRID_COLORS.dark).toEqual({
      base: '#2f293a',
      active: '#5227ff',
      glow: '#5227ff',
      glowOpacity: 0.1
    })
  })

  test('uses the official React Bits demo density and motion parameters', () => {
    const wrapper = readOptional('src/components/guestbook/GuestbookDotGrid.jsx')

    expect(wrapper).toContain('dotSize={5}')
    expect(wrapper).toContain('gap={15}')
    expect(wrapper).toContain('proximity={120}')
    expect(wrapper).toContain('speedTrigger={100}')
    expect(wrapper).toContain('shockRadius={250}')
    expect(wrapper).toContain('shockStrength={5}')
    expect(wrapper).toContain('resistance={750}')
    expect(wrapper).toContain('returnDuration={1.5}')
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
    expect(core).toContain("import { InertiaPlugin } from 'gsap/InertiaPlugin'")
    expect(core).toContain('gsap.registerPlugin(InertiaPlugin)')
    expect(core).toContain('inertia: {')
    expect(core).toContain('resistance')
    expect(core).toContain('createRadialGradient')
    expect(core).toContain('glowOpacity')
    expect(core).toContain('Math.min(window.devicePixelRatio || 1, 1.5)')
    expect(core).toContain("aria-hidden='true'")
    expect(wrapper).toContain("attributeFilter: ['class']")
    expect(styles).toContain('pointer-events: none')
  })
})
