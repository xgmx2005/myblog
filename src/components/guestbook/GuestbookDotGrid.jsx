import { useEffect, useState } from 'react'

import { getDotGridColors, shouldAnimateDotGrid } from './dot-grid-config'
import DotGrid from './DotGrid'

function hasCanvas2D() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('2d'))
  } catch {
    return false
  }
}

function readTheme() {
  return document.documentElement.classList.contains('dark')
}

export default function GuestbookDotGrid() {
  const [isDark, setIsDark] = useState(readTheme)
  const [canAnimate, setCanAnimate] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateCapability = () => {
      setCanAnimate(shouldAnimateDotGrid(media.matches, hasCanvas2D()))
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

  if (!canAnimate) return null

  const colors = getDotGridColors(isDark)

  return (
    <DotGrid
      dotSize={4}
      gap={22}
      baseColor={colors.base}
      activeColor={colors.active}
      proximity={150}
      speedTrigger={140}
      shockRadius={220}
      shockStrength={1.6}
      maxSpeed={3200}
      returnDuration={1.15}
    />
  )
}
