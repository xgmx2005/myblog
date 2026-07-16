import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const absolute = (path: string) => resolve(root, path)

describe('interaction architecture', () => {
  test('the Astro site does not connect to Supabase directly', () => {
    const pkg = JSON.parse(readFileSync(absolute('package.json'), 'utf8'))
    expect(pkg.dependencies['@supabase/supabase-js']).toBeUndefined()
    expect(existsSync(absolute('src/lib/supabase'))).toBe(false)
    expect(existsSync(absolute('supabase'))).toBe(false)
  })

  test('declares only the public Waline interaction variable', () => {
    const env = readFileSync(absolute('src/env.d.ts'), 'utf8')
    expect(env).toContain('PUBLIC_WALINE_SERVER_URL')
    expect(env).not.toContain('NEXT_PUBLIC_SUPABASE')
    expect(env).not.toContain('PG_PASSWORD')
    expect(env).not.toContain('SMTP_PASS')
  })
})
