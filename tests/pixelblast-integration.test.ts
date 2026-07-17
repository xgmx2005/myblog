import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('PixelBlast integration', () => {
  test('registers React and the WebGL runtime dependencies', () => {
    const pkg = JSON.parse(read('package.json'))
    const config = read('astro.config.ts')

    expect(typeof pkg.dependencies['@astrojs/react']).toBe('string')
    expect(typeof pkg.dependencies.react).toBe('string')
    expect(typeof pkg.dependencies['react-dom']).toBe('string')
    expect(typeof pkg.dependencies.three).toBe('string')
    expect(typeof pkg.dependencies.postprocessing).toBe('string')
    expect(config).toContain("import react from '@astrojs/react'")
    expect(config).toContain('react(),')
  })
})
