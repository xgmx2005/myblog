import { gsap } from 'gsap'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import './DotGrid.css'

gsap.registerPlugin(InertiaPlugin)

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
  dotSize = 5,
  gap = 15,
  baseColor = '#2f293a',
  activeColor = '#5227ff',
  glowColor = '#5227ff',
  glowOpacity = 0.1,
  proximity = 120,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
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
    lastY: 0,
    inside: false
  })

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor])
  const glowRgb = useMemo(() => hexToRgb(glowColor), [glowColor])
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
          _inertiaApplied: false
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
      if (pointer.inside && glowOpacity > 0) {
        const glowRadius = proximity * 1.45
        const glow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          glowRadius
        )
        const glowChannel = `${glowRgb.r} ${glowRgb.g} ${glowRgb.b}`
        glow.addColorStop(0, `rgb(${glowChannel} / ${glowOpacity})`)
        glow.addColorStop(0.52, `rgb(${glowChannel} / ${glowOpacity * 0.42})`)
        glow.addColorStop(1, `rgb(${glowChannel} / 0)`)
        context.fillStyle = glow
        context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      }

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
  }, [activeRgb, baseColor, baseRgb, circlePath, glowOpacity, glowRgb, proximity])

  useEffect(() => {
    const releaseDot = (dot) => {
      gsap.to(dot, {
        xOffset: 0,
        yOffset: 0,
        duration: returnDuration,
        ease: 'elastic.out(1, 0.75)',
        overwrite: true,
        onComplete: () => {
          dot._inertiaApplied = false
        }
      })
    }

    const moveDot = (dot, pushX, pushY) => {
      dot._inertiaApplied = true
      gsap.killTweensOf(dot)
      gsap.to(dot, {
        inertia: {
          xOffset: pushX,
          yOffset: pushY,
          resistance
        },
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
      pointer.inside =
        pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height

      return { pointer, velocityX, velocityY, speed: Math.min(speed, maxSpeed) }
    }

    const handleMove = throttle((event) => {
      const motion = updatePointer(event)
      if (!motion || !motion.pointer.inside || motion.speed <= speedTrigger) return

      for (const dot of dotsRef.current) {
        if (dot._inertiaApplied) continue
        const distance = Math.hypot(dot.cx - motion.pointer.x, dot.cy - motion.pointer.y)
        if (distance >= proximity) continue

        moveDot(
          dot,
          dot.cx - motion.pointer.x + motion.velocityX * 0.005,
          dot.cy - motion.pointer.y + motion.velocityY * 0.005
        )
      }
    }, 50)

    const handleDown = (event) => {
      const motion = updatePointer(event)
      if (!motion || !motion.pointer.inside) return

      for (const dot of dotsRef.current) {
        const deltaX = dot.cx - motion.pointer.x
        const deltaY = dot.cy - motion.pointer.y
        const distance = Math.hypot(deltaX, deltaY)
        if (distance >= shockRadius) continue

        const falloff = 1 - distance / shockRadius
        moveDot(dot, deltaX * shockStrength * falloff, deltaY * shockStrength * falloff)
      }
    }

    const handleLeave = () => {
      pointerRef.current.inside = false
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('pointerdown', handleDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', handleLeave)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
      document.documentElement.removeEventListener('pointerleave', handleLeave)
      for (const dot of dotsRef.current) gsap.killTweensOf(dot)
    }
  }, [maxSpeed, proximity, resistance, returnDuration, shockRadius, shockStrength, speedTrigger])

  return (
    <section className={`dot-grid ${className}`} style={style} aria-hidden='true'>
      <div ref={wrapperRef} className='dot-grid__wrap'>
        <canvas ref={canvasRef} className='dot-grid__canvas' />
      </div>
    </section>
  )
}
