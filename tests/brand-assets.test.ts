import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dir, '..')

describe('brand assets', () => {
  test('uses CC metadata in the web manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/favicon/site.webmanifest'), 'utf8'))
    expect(manifest.name).toBe('CC Personal Site')
    expect(manifest.short_name).toBe('CC')
    expect(manifest.theme_color).toBe('#7ba58f')
  })

  test.each([
    ['favicon-16x16.png', 16, 16],
    ['favicon-32x32.png', 32, 32],
    ['apple-touch-icon.png', 180, 180],
    ['android-chrome-192x192.png', 192, 192],
    ['android-chrome-512x512.png', 512, 512]
  ])('%s has the expected dimensions', async (name, width, height) => {
    const metadata = await sharp(resolve(root, 'public/favicon', name)).metadata()
    expect(metadata.width).toBe(width)
    expect(metadata.height).toBe(height)
  })

  test('creates a 1200 by 630 social card', async () => {
    const metadata = await sharp(resolve(root, 'public/images/social-card.png')).metadata()
    expect(metadata.width).toBe(1200)
    expect(metadata.height).toBe(630)
  })
})
