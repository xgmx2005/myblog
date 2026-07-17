import { useEffect, useState } from 'react'

import { getPixelBlastColor, shouldAnimatePixelBlast } from './pixel-blast-config'
import PixelBlast from './PixelBlast'

function hasWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(context)
  } catch {
    return false
  }
}

function readTheme() {
  return document.documentElement.classList.contains('dark')
}

export default function GuestbookPixelBlast() {
  const [isDark, setIsDark] = useState(false)
  const [canAnimate, setCanAnimate] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateCapability = () => {
      setCanAnimate(shouldAnimatePixelBlast(media.matches, hasWebGL2()))
    }
    const updateTheme = () => setIsDark(readTheme())
    const observer = new MutationObserver(updateTheme)

    updateTheme()
    updateCapability()
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    media.addEventListener('change', updateCapability)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', updateCapability)
    }
  }, [])

  if (!canAnimate || failed) return null

  return (
    <PixelBlast
      variant='circle'
      pixelSize={6}
      color={getPixelBlastColor(isDark)}
      patternScale={3}
      patternDensity={1.2}
      pixelSizeJitter={0.5}
      enableRipples
      rippleSpeed={0.4}
      rippleThickness={0.12}
      rippleIntensityScale={1.5}
      liquid
      liquidStrength={0.12}
      liquidRadius={1.2}
      liquidWobbleSpeed={5}
      speed={0.6}
      edgeFade={0.25}
      transparent
      onError={() => setFailed(true)}
    />
  )
}
