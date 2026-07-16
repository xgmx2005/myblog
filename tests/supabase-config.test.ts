import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

describe('resolveSupabaseConfig', () => {
  test('enables Supabase only when both public values exist', async () => {
    const modulePath = '../src/lib/supabase/config.ts'
    expect(existsSync(new URL(modulePath, import.meta.url))).toBe(true)
    if (!existsSync(new URL(modulePath, import.meta.url))) return

    const { resolveSupabaseConfig } = await import(modulePath)
    expect(resolveSupabaseConfig({})).toEqual({ enabled: false, key: '', url: '' })
    expect(
      resolveSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co' })
    ).toEqual({ enabled: false, key: '', url: 'https://demo.supabase.co' })
    expect(
      resolveSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co'
      })
    ).toEqual({ enabled: true, key: 'sb_publishable_demo', url: 'https://demo.supabase.co' })
  })
})
