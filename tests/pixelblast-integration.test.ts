import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

import {
  getPixelBlastColor,
  PIXEL_BLAST_COLORS,
  shouldAnimatePixelBlast
} from '../src/components/guestbook/pixel-blast-config'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('PixelBlast integration', () => {
  test('registers React and the WebGL runtime dependencies', () => {
    const pkg = JSON.parse(read('package.json'))
    const config = read('astro.config.ts')

    expect(pkg.dependencies['@astrojs/react']).toBe('5.0.7')
    expect(typeof pkg.dependencies.react).toBe('string')
    expect(typeof pkg.dependencies['react-dom']).toBe('string')
    expect(typeof pkg.dependencies.three).toBe('string')
    expect(typeof pkg.dependencies.postprocessing).toBe('string')
    expect(config).toContain("import react from '@astrojs/react'")
    expect(config).toContain('react(),')
  })

  test('chooses the configured color for the active site theme', () => {
    expect(getPixelBlastColor(false)).toBe(PIXEL_BLAST_COLORS.light)
    expect(getPixelBlastColor(true)).toBe(PIXEL_BLAST_COLORS.dark)
  })

  test('uses a static fallback for reduced motion or missing WebGL', () => {
    expect(shouldAnimatePixelBlast(false, true)).toBe(true)
    expect(shouldAnimatePixelBlast(true, true)).toBe(false)
    expect(shouldAnimatePixelBlast(false, false)).toBe(false)
  })

  test('keeps the renderer decorative and cleans up global resources', () => {
    const core = read('src/components/guestbook/PixelBlast.jsx')
    const wrapper = read('src/components/guestbook/GuestbookPixelBlast.jsx')
    const styles = read('src/components/guestbook/PixelBlast.css')

    expect(core).toContain("window.addEventListener('pointerdown'")
    expect(core).toContain("window.removeEventListener('pointerdown'")
    expect(core).toContain("window.addEventListener('pointermove'")
    expect(core).toContain("window.removeEventListener('pointermove'")
    expect(core).toContain("document.addEventListener('visibilitychange'")
    expect(core).toContain("document.removeEventListener('visibilitychange'")
    expect(core).toContain('cancelAnimationFrame')
    expect(core).toContain('forceContextLoss')
    expect(core).toContain('touch?.texture.dispose()')
    expect(core).toContain('new THREE.Timer()')
    expect(core).not.toContain('new THREE.Clock()')
    expect(core).toContain('timer.dispose()')
    expect(core).toContain('aria-hidden')
    expect(wrapper).toContain("attributeFilter: ['class']")
    expect(wrapper).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(wrapper).toContain("canvas.getContext('webgl2')")
    expect(styles).toContain('pointer-events: none')
  })
})
