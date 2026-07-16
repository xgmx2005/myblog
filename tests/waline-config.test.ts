import { describe, expect, test } from 'bun:test'
import { normalizeWalinePath, resolveWalineConfig } from '../src/lib/waline/config'

describe('Waline configuration', () => {
  test('normalizes equivalent URLs to one comment path', () => {
    expect(normalizeWalinePath('blog/post/?from=home#comments')).toBe('/blog/post')
    expect(normalizeWalinePath('/guestbook/')).toBe('/guestbook')
    expect(normalizeWalinePath('/')).toBe('/')
  })

  test('enables only safe server URLs', () => {
    expect(resolveWalineConfig({})).toEqual({ enabled: false, serverURL: '' })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'javascript:alert(1)' })).toEqual({
      enabled: false,
      serverURL: ''
    })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'https://cc-waline.vercel.app/' })).toEqual({
      enabled: true,
      serverURL: 'https://cc-waline.vercel.app'
    })
    expect(resolveWalineConfig({ PUBLIC_WALINE_SERVER_URL: 'http://localhost:8360/' })).toEqual({
      enabled: true,
      serverURL: 'http://localhost:8360'
    })
  })
})
