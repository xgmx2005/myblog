import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'src/assets/avatar.jpg')
const faviconDir = resolve(root, 'public/favicon')
const imageDir = resolve(root, 'public/images')

await Promise.all([mkdir(faviconDir, { recursive: true }), mkdir(imageDir, { recursive: true })])

const squareSizes = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512]
]

await Promise.all(
  squareSizes.map(([name, size]) =>
    sharp(source)
      .resize(Number(size), Number(size), { fit: 'cover' })
      .png()
      .toFile(resolve(faviconDir, String(name)))
  )
)

await sharp(source)
  .resize(520, 520, { fit: 'cover' })
  .extend({ top: 55, bottom: 55, left: 340, right: 340, background: '#f5f7f2' })
  .png()
  .toFile(resolve(imageDir, 'social-card.png'))
