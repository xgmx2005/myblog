import { gsap } from 'gsap'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import './DotGrid.css'

const throttle = (callback, limit) => {
  let lastCall = 0

  return (...args) => {
    const now = performance.now()
    if (now - lastCall < limit) return
    lastCall = now
    callback(...args)
  }
}

function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return { r: 0, g: 0, b: 0 }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16)
  }
}

export default function DotGrid({
  dotSize = 4,
  gap = 22,
  baseColor = '#4f9db1',
  activeColor = '#16b8c4',
  proximity = 150,
  speedTrigger = 140,
  shockRadius = 220,
  shockStrength = 1.6,
  maxSpeed = 3200,
  returnDuration = 1.15,
  className = '',
  style
}) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const dotsRef = useRef([])
  const dprRef = useRef(1)
  const pointerRef = useRef({
    x: -1000,
    y: -1000,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  })

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor])
  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null
    const path = new window.Path2D()
    path.arc(0, 0, dotSize / 2, 0, Math.PI * 2)
    return path
  }, [dotSize])

  const buildGrid = useCallback(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const { width, height } = wrapper.getBoundingClientRect()
    if (width === 0 || height === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    dprRef.current = dpr
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    context?.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cell = dotSize + gap
    const columns = Math.max(1, Math.floor((width + gap) / cell))
    const rows = Math.max(1, Math.floor((height + gap) / cell))
    const gridWidth = cell * columns - gap
    const gridHeight = cell * rows - gap
    const startX = (width - gridWidth) / 2 + dotSize / 2
    const startY = (height - gridHeight) / 2 + dotSize / 2
    const dots = []

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        dots.push({
          cx: startX + column * cell,
          cy: startY + row * cell,
          xOffset: 0,
          yOffset: 0,
          moving: false
        })
      }
    }

    for (const dot of dotsRef.current) gsap.killTweensOf(dot)
    dotsRef.current = dots
  }, [dotSize, gap])

  useEffect(() => {
    buildGrid()
    const wrapper = wrapperRef.current
    const observer = new ResizeObserver(buildGrid)
    if (wrapper) observer.observe(wrapper)

    return () => observer.disconnect()
  }, [buildGrid])

  useEffect(() => {
    if (!circlePath) return

    let animationFrame = 0
    let isVisible = !document.hidden
    const proximitySquared = proximity * proximity

    const draw = () => {
      if (!isVisible) return

      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return

      const dpr = dprRef.current
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const pointer = pointerRef.current
      for (const dot of dotsRef.current) {
        const dx = dot.cx - pointer.x
        const dy = dot.cy - pointer.y
        const distanceSquared = dx * dx + dy * dy
        let color = baseColor

        if (distanceSquared <= proximitySquared) {
          const amount = 1 - Math.sqrt(distanceSquared) / proximity
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * amount)
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * amount)
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * amount)
          color = `rgb(${r} ${g} ${b})`
        }

        context.save()
        context.translate(dot.cx + dot.xOffset, dot.cy + dot.yOffset)
        context.fillStyle = color
        context.fill(circlePath)
        context.restore()
      }

      animationFrame = requestAnimationFrame(draw)
    }

    const handleVisibility = () => {
      isVisible = !document.hidden
      if (isVisible) {
        cancelAnimationFrame(animationFrame)
        animationFrame = requestAnimationFrame(draw)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    animationFrame = requestAnimationFrame(draw)

    return () => {
      isVisible = false
      cancelAnimationFrame(animationFrame)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeRgb, baseColor, baseRgb, circlePath, proximity])

  useEffect(() => {
    const releaseDot = (dot) => {
      gsap.to(dot, {
        xOffset: 0,
        yOffset: 0,
        duration: returnDuration,
        ease: 'elastic.out(1, 0.72)',
        overwrite: true,
        onComplete: () => {
          dot.moving = false
        }
      })
    }

    const moveDot = (dot, xOffset, yOffset, duration = 0.18) => {
      dot.moving = true
      gsap.killTweensOf(dot)
      gsap.to(dot, {
        xOffset,
        yOffset,
        duration,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () => releaseDot(dot)
      })
    }

    const updatePointer = (event) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const pointer = pointerRef.current
      const now = performance.now()
      const deltaTime = pointer.lastTime ? Math.max(now - pointer.lastTime, 8) : 16
      const deltaX = event.clientX - pointer.lastX
      const deltaY = event.clientY - pointer.lastY
      let velocityX = (deltaX / deltaTime) * 1000
      let velocityY = (deltaY / deltaTime) * 1000
      const speed = Math.hypot(velocityX, velocityY)

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed
        velocityX *= scale
        velocityY *= scale
      }

      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.lastTime = now
      pointer.lastX = event.clientX
      pointer.lastY = event.clientY

      return { pointer, velocityX, velocityY, speed: Math.min(speed, maxSpeed) }
    }

    const handleMove = throttle((event) => {
      const motion = updatePointer(event)
      if (!motion || motion.speed <= speedTrigger) return

      const speedRatio = Math.min(motion.speed / maxSpeed, 1)
      for (const dot of dotsRef.current) {
        if (dot.moving) continue
        const distance = Math.hypot(dot.cx - motion.pointer.x, dot.cy - motion.pointer.y)
        if (distance >= proximity) continue

        const falloff = 1 - distance / proximity
        moveDot(
          dot,
          motion.velocityX * 0.0035 * speedRatio * falloff,
          motion.velocityY * 0.0035 * speedRatio * falloff
        )
      }
    }, 32)

    const handleDown = (event) => {
      const motion = updatePointer(event)
      if (!motion) return

      for (const dot of dotsRef.current) {
        const deltaX = dot.cx - motion.pointer.x
        const deltaY = dot.cy - motion.pointer.y
        const distance = Math.hypot(deltaX, deltaY)
        if (distance === 0 || distance >= shockRadius) continue

        const falloff = 1 - distance / shockRadius
        const push = Math.min(28, shockStrength * 22 * falloff)
        moveDot(dot, (deltaX / distance) * push, (deltaY / distance) * push, 0.14)
      }
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('pointerdown', handleDown, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
      for (const dot of dotsRef.current) gsap.killTweensOf(dot)
    }
  }, [maxSpeed, proximity, returnDuration, shockRadius, shockStrength, speedTrigger])

  return (
    <section className={`dot-grid ${className}`} style={style} aria-hidden='true'>
      <div ref={wrapperRef} className='dot-grid__wrap'>
        <canvas ref={canvasRef} className='dot-grid__canvas' />
      </div>
    </section>
  )
}
