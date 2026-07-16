import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')

describe('production build', () => {
  test('pins and runs Pagefind explicitly after Astro builds', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    expect(pkg.devDependencies.pagefind).toBe('1.5.2')
    expect(pkg.scripts.build).toContain('pagefind --site dist/client')
  })
})
