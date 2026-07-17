import { Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import './PixelBlast.css'

const MAX_CLICKS = 10

const SHAPE_MAP = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
}

const createTouchTexture = () => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D context not available')

  context.fillStyle = 'black'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.Texture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  const trail = []
  const maxAge = 64
  const speed = 1 / maxAge
  let last = null
  let radius = 0.1 * size

  const clear = () => {
    context.fillStyle = 'black'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  const drawPoint = (point) => {
    const position = { x: point.x * size, y: (1 - point.y) * size }
    const easeOutSine = (value) => Math.sin((value * Math.PI) / 2)
    const easeOutQuad = (value) => -value * (value - 2)
    let intensity = 1

    if (point.age < maxAge * 0.3) {
      intensity = easeOutSine(point.age / (maxAge * 0.3))
    } else {
      intensity = easeOutQuad(1 - (point.age - maxAge * 0.3) / (maxAge * 0.7)) || 0
    }

    intensity *= point.force
    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`
    const offset = size * 5

    context.shadowOffsetX = offset
    context.shadowOffsetY = offset
    context.shadowBlur = radius
    context.shadowColor = `rgba(${color},${0.22 * intensity})`
    context.beginPath()
    context.fillStyle = 'rgba(255,0,0,1)'
    context.arc(position.x - offset, position.y - offset, radius, 0, Math.PI * 2)
    context.fill()
  }

  const addTouch = (normalized) => {
    let force = 0
    let vx = 0
    let vy = 0

    if (last) {
      const dx = normalized.x - last.x
      const dy = normalized.y - last.y
      if (dx === 0 && dy === 0) return

      const distanceSquared = dx * dx + dy * dy
      const distance = Math.sqrt(distanceSquared)
      vx = dx / (distance || 1)
      vy = dy / (distance || 1)
      force = Math.min(distanceSquared * 10000, 1)
    }

    last = { x: normalized.x, y: normalized.y }
    trail.push({ x: normalized.x, y: normalized.y, age: 0, force, vx, vy })
  }

  const update = () => {
    clear()

    for (let index = trail.length - 1; index >= 0; index -= 1) {
      const point = trail[index]
      const force = point.force * speed * (1 - point.age / maxAge)
      point.x += point.vx * force
      point.y += point.vy * force
      point.age += 1
      if (point.age > maxAge) trail.splice(index, 1)
    }

    for (const point of trail) drawPoint(point)
    texture.needsUpdate = true
  }

  return {
    texture,
    addTouch,
    update,
    set radiusScale(value) {
      radius = 0.1 * size * value
    }
  }
}

const createLiquidEffect = (texture, options) => {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;
      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);
      float amount = uStrength * intensity * wave;
      uv += vec2(vx, vy) * amount;
    }
  `

  return new Effect('LiquidEffect', fragment, {
    uniforms: new Map([
      ['uTexture', new THREE.Uniform(texture)],
      ['uStrength', new THREE.Uniform(options?.strength ?? 0.025)],
      ['uTime', new THREE.Uniform(0)],
      ['uFreq', new THREE.Uniform(options?.frequency ?? 4.5)]
    ])
  })
}

const VERTEX_SOURCE = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`

const FRAGMENT_SOURCE = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int   uShapeType;

const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;
const int MAX_CLICKS = 10;

uniform vec2  uClickPos[MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

#define Bayer4(a) (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))
#define FBM_OCTAVES 5
#define FBM_LACUNARITY 1.25
#define FBM_GAIN 1.0

float hash11(float n) {
  return fract(sin(n) * 43758.5453);
}

float vnoise(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n100 = hash11(dot(ip + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n010 = hash11(dot(ip + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n110 = hash11(dot(ip + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
  float n001 = hash11(dot(ip + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n101 = hash11(dot(ip + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n011 = hash11(dot(ip + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
  float n111 = hash11(dot(ip + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
  vec3 weight = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  float x00 = mix(n000, n100, weight.x);
  float x10 = mix(n010, n110, weight.x);
  float x01 = mix(n001, n101, weight.x);
  float x11 = mix(n011, n111, weight.x);
  float y0 = mix(x00, x10, weight.y);
  float y1 = mix(x01, x11, weight.y);
  return mix(y0, y1, weight.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float time) {
  vec3 point = vec3(uv * uScale, time);
  float amplitude = 1.0;
  float frequency = 1.0;
  float sum = 1.0;

  for (int index = 0; index < FBM_OCTAVES; ++index) {
    sum += amplitude * vnoise(point * frequency);
    frequency *= FBM_LACUNARITY;
    amplitude *= FBM_GAIN;
  }

  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 point, float coverage) {
  float radius = sqrt(coverage) * 0.25;
  float distanceToEdge = length(point - 0.5) - radius;
  float antialias = 0.5 * fwidth(distanceToEdge);
  return coverage * (1.0 - smoothstep(-antialias, antialias, distanceToEdge * 2.0));
}

float maskTriangle(vec2 point, vec2 id, float coverage) {
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) point.x = 1.0 - point.x;
  float radius = sqrt(coverage);
  float distanceToEdge = point.y - radius * (1.0 - point.x);
  float antialias = fwidth(distanceToEdge);
  return coverage * clamp(0.5 - distanceToEdge / antialias, 0.0, 1.0);
}

float maskDiamond(vec2 point, float coverage) {
  float radius = sqrt(coverage) * 0.564;
  return step(abs(point.x - 0.49) + abs(point.y - 0.49), radius);
}

void main() {
  float pixelSize = uPixelSize;
  vec2 fragmentCoordinate = gl_FragCoord.xy - uResolution * 0.5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 pixelId = floor(fragmentCoordinate / pixelSize);
  vec2 pixelUv = fract(fragmentCoordinate / pixelSize);
  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragmentCoordinate / cellPixelSize);
  vec2 cellCoordinate = cellId * cellPixelSize;
  vec2 uv = cellCoordinate / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;

  if (uEnableRipples == 1) {
    for (int index = 0; index < MAX_CLICKS; ++index) {
      vec2 position = uClickPos[index];
      if (position.x < 0.0) continue;

      vec2 clickUv =
        ((position - uResolution * 0.5 - cellPixelSize * 0.5) / uResolution) *
        vec2(aspectRatio, 1.0);
      float elapsed = max(uTime - uClickTimes[index], 0.0);
      float radius = distance(uv, clickUv);
      float waveRadius = uRippleSpeed * elapsed;
      float ring = exp(-pow((radius - waveRadius) / uRippleThickness, 2.0));
      float attenuation = exp(-elapsed) * exp(-10.0 * radius);
      feed = max(feed, ring * attenuation * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragmentCoordinate / uPixelSize) - 0.5;
  float blackAndWhite = step(0.5, feed + bayer);
  float hash = fract(
    sin(dot(floor(fragmentCoordinate / uPixelSize), vec2(127.1, 311.7))) * 43758.5453
  );
  float jitterScale = 1.0 + (hash - 0.5) * uPixelJitter;
  float coverage = blackAndWhite * jitterScale;
  float mask;

  if (uShapeType == SHAPE_CIRCLE) {
    mask = maskCircle(pixelUv, coverage);
  } else if (uShapeType == SHAPE_TRIANGLE) {
    mask = maskTriangle(pixelUv, pixelId, coverage);
  } else if (uShapeType == SHAPE_DIAMOND) {
    mask = maskDiamond(pixelUv, coverage);
  } else {
    mask = coverage;
  }

  if (uEdgeFade > 0.0) {
    vec2 normalized = gl_FragCoord.xy / uResolution;
    float edge = min(
      min(normalized.x, normalized.y),
      min(1.0 - normalized.x, 1.0 - normalized.y)
    );
    mask *= smoothstep(0.0, uEdgeFade, edge);
  }

  vec3 srgbColor = mix(
    uColor * 12.92,
    1.055 * pow(uColor, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, uColor)
  );
  fragColor = vec4(srgbColor, mask);
}
`

const PixelBlast = ({
  variant = 'square',
  pixelSize = 3,
  color = '#B497CF',
  className,
  style,
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
  onError
}) => {
  const containerRef = useRef(null)
  const stateRef = useRef(null)
  const speedRef = useRef(speed)
  const visibilityRef = useRef({ visible: true })
  const onErrorRef = useRef(onError)

  useEffect(() => {
    speedRef.current = speed
    onErrorRef.current = onError
  }, [onError, speed])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let renderer
    let material
    let quad
    let composer
    let touch
    let liquidEffect
    let timer
    let resizeObserver
    let raf = 0
    let disposed = false
    let onPointerDown = () => {}
    let onPointerMove = () => {}
    let onVisibilityChange = () => {}

    const teardown = () => {
      if (disposed) return
      disposed = true
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver?.disconnect()
      cancelAnimationFrame(raf)
      quad?.geometry.dispose()
      material?.dispose()
      touch?.texture.dispose()
      composer?.dispose()
      if (timer) timer.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
      renderer?.domElement.remove()
      stateRef.current = null
    }

    try {
      const canvas = document.createElement('canvas')
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias,
        alpha: true,
        powerPreference: 'high-performance'
      })
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      container.appendChild(renderer.domElement)

      if (transparent) renderer.setClearAlpha(0)
      else renderer.setClearColor(0x000000, 1)

      const uniforms = {
        uResolution: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uClickPos: {
          value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1))
        },
        uClickTimes: { value: new Float32Array(MAX_CLICKS) },
        uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
        uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade }
      }

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SOURCE,
        fragmentShader: FRAGMENT_SOURCE,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        glslVersion: THREE.GLSL3
      })
      quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
      scene.add(quad)

      timer = new THREE.Timer()
      const setSize = () => {
        const width = container.clientWidth || 1
        const height = container.clientHeight || 1
        renderer.setSize(width, height, false)
        uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height)
        composer?.setSize(renderer.domElement.width, renderer.domElement.height)
        uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio()
      }

      setSize()
      resizeObserver = new ResizeObserver(setSize)
      resizeObserver.observe(container)

      if (liquid) {
        touch = createTouchTexture()
        touch.radiusScale = liquidRadius
        composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        liquidEffect = createLiquidEffect(touch.texture, {
          strength: liquidStrength,
          frequency: liquidWobbleSpeed
        })
        const liquidPass = new EffectPass(camera, liquidEffect)
        liquidPass.renderToScreen = true
        composer.addPass(liquidPass)
      }

      if (noiseAmount > 0) {
        if (!composer) {
          composer = new EffectComposer(renderer)
          composer.addPass(new RenderPass(scene, camera))
        }

        const noiseEffect = new Effect(
          'NoiseEffect',
          `
            uniform float uTime;
            uniform float uAmount;
            float hash(vec2 point) {
              return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
            }
            void mainUv(inout vec2 uv) {}
            void mainImage(
              const in vec4 inputColor,
              const in vec2 uv,
              out vec4 outputColor
            ) {
              float noise = hash(
                floor(uv * vec2(1920.0, 1080.0)) + floor(uTime * 60.0)
              );
              float grain = (noise - 0.5) * uAmount;
              outputColor = inputColor + vec4(vec3(grain), 0.0);
            }
          `,
          {
            uniforms: new Map([
              ['uTime', new THREE.Uniform(0)],
              ['uAmount', new THREE.Uniform(noiseAmount)]
            ])
          }
        )
        const noisePass = new EffectPass(camera, noiseEffect)
        for (const pass of composer.passes) pass.renderToScreen = false
        noisePass.renderToScreen = true
        composer.addPass(noisePass)
      }

      composer?.setSize(renderer.domElement.width, renderer.domElement.height)

      const mapToPixels = (event) => {
        const rectangle = renderer.domElement.getBoundingClientRect()
        const width = Math.max(rectangle.width, 1)
        const height = Math.max(rectangle.height, 1)
        const scaleX = renderer.domElement.width / width
        const scaleY = renderer.domElement.height / height

        return {
          fx: (event.clientX - rectangle.left) * scaleX,
          fy: (height - (event.clientY - rectangle.top)) * scaleY,
          w: Math.max(renderer.domElement.width, 1),
          h: Math.max(renderer.domElement.height, 1)
        }
      }

      let clickIndex = 0
      onPointerDown = (event) => {
        const { fx, fy } = mapToPixels(event)
        uniforms.uClickPos.value[clickIndex].set(fx, fy)
        uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value
        clickIndex = (clickIndex + 1) % MAX_CLICKS
      }
      onPointerMove = (event) => {
        if (!touch) return
        const { fx, fy, w, h } = mapToPixels(event)
        touch.addTouch({ x: fx / w, y: fy / h })
      }
      onVisibilityChange = () => {
        visibilityRef.current.visible = !document.hidden
      }

      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.addEventListener('visibilitychange', onVisibilityChange)
      onVisibilityChange()

      const randomArray = new Uint32Array(1)
      window.crypto?.getRandomValues?.(randomArray)
      const randomValue = randomArray[0] ? randomArray[0] / 0xffffffff : Math.random()
      const timeOffset = randomValue * 1000

      stateRef.current = {
        renderer,
        uniforms,
        composer,
        touch,
        liquidEffect
      }

      const animate = (timestamp) => {
        if (autoPauseOffscreen && !visibilityRef.current.visible) {
          raf = requestAnimationFrame(animate)
          return
        }

        timer.update(timestamp)
        uniforms.uTime.value = timeOffset + timer.getElapsed() * speedRef.current
        const liquidTime = liquidEffect?.uniforms.get('uTime')
        if (liquidTime) liquidTime.value = uniforms.uTime.value

        if (composer) {
          touch?.update()
          for (const pass of composer.passes) {
            for (const effect of pass.effects ?? []) {
              const effectTime = effect.uniforms?.get('uTime')
              if (effectTime) effectTime.value = uniforms.uTime.value
            }
          }
          composer.render()
        } else {
          renderer.render(scene, camera)
        }

        raf = requestAnimationFrame(animate)
      }

      raf = requestAnimationFrame(animate)
    } catch (error) {
      teardown()
      onErrorRef.current?.(error)
    }

    return teardown
  }, [antialias, autoPauseOffscreen, liquid, noiseAmount])

  useEffect(() => {
    const state = stateRef.current
    if (!state) return

    state.uniforms.uShapeType.value = SHAPE_MAP[variant] ?? 0
    state.uniforms.uPixelSize.value = pixelSize * state.renderer.getPixelRatio()
    state.uniforms.uColor.value.set(color)
    state.uniforms.uScale.value = patternScale
    state.uniforms.uDensity.value = patternDensity
    state.uniforms.uPixelJitter.value = pixelSizeJitter
    state.uniforms.uEnableRipples.value = enableRipples ? 1 : 0
    state.uniforms.uRippleIntensity.value = rippleIntensityScale
    state.uniforms.uRippleThickness.value = rippleThickness
    state.uniforms.uRippleSpeed.value = rippleSpeed
    state.uniforms.uEdgeFade.value = edgeFade

    if (transparent) state.renderer.setClearAlpha(0)
    else state.renderer.setClearColor(0x000000, 1)

    const strengthUniform = state.liquidEffect?.uniforms.get('uStrength')
    if (strengthUniform) strengthUniform.value = liquidStrength
    const frequencyUniform = state.liquidEffect?.uniforms.get('uFreq')
    if (frequencyUniform) frequencyUniform.value = liquidWobbleSpeed
    if (state.touch) state.touch.radiusScale = liquidRadius
  }, [
    color,
    edgeFade,
    enableRipples,
    liquidRadius,
    liquidStrength,
    liquidWobbleSpeed,
    patternDensity,
    patternScale,
    pixelSize,
    pixelSizeJitter,
    rippleIntensityScale,
    rippleSpeed,
    rippleThickness,
    transparent,
    variant
  ])

  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={style}
      aria-hidden='true'
    />
  )
}

export default PixelBlast
