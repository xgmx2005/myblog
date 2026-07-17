# Guestbook PixelBlast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a theme-aware, full-page React Bits PixelBlast background to `/guestbook` without changing Waline login, data paths, or interaction behavior.

**Architecture:** Astro remains the application shell. A page-scoped React island owns the Three.js/Postprocessing renderer, watches the existing `html.dark` theme class, and listens to window-level pointer events while its Canvas remains non-interactive. The Astro page supplies a static gradient fallback and glass content surfaces so Waline stays readable and usable when WebGL is loading, disabled, or unavailable.

**Tech Stack:** Astro 6, React, `@astrojs/react`, Three.js, Postprocessing, Bun test, Waline, scoped Astro CSS

## Global Constraints

- The effect applies only to `/guestbook`.
- Waline keeps the exact stable path `"/guestbook"` and `reaction={false}`.
- Do not modify Waline server, database, account, login, or admin behavior.
- Enable continuous animation, liquid pointer distortion, and click/touch ripples.
- Pixel color must update when the existing `html.dark` class changes.
- Canvas must never intercept navigation, form, login, or comment interactions.
- `prefers-reduced-motion: reduce` and WebGL failure must fall back to the static theme gradient.
- React, Three.js, Postprocessing, and the renderer must only execute on the guestbook route.
- Mobile retains the full effect, with renderer pixel ratio capped at `2`.
- Every event listener, animation frame, observer, WebGL resource, and texture must be released on unmount.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `astro.config.ts` | Register the React renderer integration. |
| `package.json`, `bun.lock` | Record React, Astro React, Three.js, and Postprocessing dependencies. |
| `src/components/guestbook/pixel-blast-config.ts` | Hold theme colors and pure capability decisions that can be unit tested without a browser. |
| `src/components/guestbook/PixelBlast.jsx` | Own the React Bits shader, renderer, liquid texture, pointer input, animation loop, and resource cleanup. |
| `src/components/guestbook/PixelBlast.css` | Size the renderer and make its Canvas decorative/non-interactive. |
| `src/components/guestbook/GuestbookPixelBlast.jsx` | Observe theme and reduced-motion state, check WebGL2, configure PixelBlast, and disable it after initialization failure. |
| `src/layouts/CommonPage.astro` | Forward an optional page identifier and the named background slot. |
| `src/layouts/ContentLayout.astro` | Forward the page identifier/background slot through the content shell. |
| `src/layouts/BaseLayout.astro` | Put the page identifier on `<body>` and render the background outside transformed content. |
| `src/pages/guestbook.astro` | Mount the client-only island, provide the static fallback, and style guestbook-only glass surfaces. |
| `tests/pixelblast-integration.test.ts` | Verify dependency/configuration and the React component lifecycle contract. |
| `tests/guestbook-pixelblast.test.ts` | Verify page-scoped mounting, visual fallback, and unchanged Waline path/configuration. |
| `docs/integrations.md` | Record the new page-scoped visual integration and operational fallback. |
| `docs/architecture.md` | Add the guestbook visual component to the source map without changing system boundaries. |

### Source provenance

`src/components/guestbook/PixelBlast.jsx` starts from the complete JavaScript + CSS source supplied by the user in:

`C:\Users\ASUS\.codex\attachments\e2bca6f6-611f-4dce-a390-a357aeac39d9\pasted-text.txt`

Use the `Full Component Source` block as the shader/renderer baseline. Do not fetch a different PixelBlast revision during implementation. Apply the exact lifecycle and event adaptations specified in Task 2.

---

### Task 1: Register the page-scoped React/WebGL toolchain

**Files:**
- Create: `tests/pixelblast-integration.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `astro.config.ts:1-55`

**Interfaces:**
- Consumes: Astro's existing `integrations` array and Bun package management.
- Produces: React JSX rendering support plus resolvable `react`, `react-dom`, `three`, and `postprocessing` packages for Task 2.

- [ ] **Step 1: Write the failing dependency and Astro integration test**

Create `tests/pixelblast-integration.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('PixelBlast integration', () => {
  test('registers React and the WebGL runtime dependencies', () => {
    const pkg = JSON.parse(read('package.json'))
    const config = read('astro.config.ts')

    expect(typeof pkg.dependencies['@astrojs/react']).toBe('string')
    expect(typeof pkg.dependencies.react).toBe('string')
    expect(typeof pkg.dependencies['react-dom']).toBe('string')
    expect(typeof pkg.dependencies.three).toBe('string')
    expect(typeof pkg.dependencies.postprocessing).toBe('string')
    expect(config).toContain("import react from '@astrojs/react'")
    expect(config).toContain('react(),')
  })
})
```

- [ ] **Step 2: Run the test and verify the contract is absent**

Run:

```powershell
bun test tests/pixelblast-integration.test.ts
```

Expected: FAIL because `@astrojs/react` is undefined and `astro.config.ts` does not import `react`.

- [ ] **Step 3: Install the runtime packages**

Run:

```powershell
bun add @astrojs/react react react-dom three postprocessing
```

Expected: `package.json` and `bun.lock` change, with all five packages under `dependencies`.

- [ ] **Step 4: Register React before the existing Astro Pure integration**

Add this import near the other `@astrojs` imports in `astro.config.ts`:

```ts
import react from '@astrojs/react'
```

Change the integrations section to:

```ts
integrations: [
  react(),
  // astro-pure will automatically add sitemap, mdx & unocss
  // sitemap(),
  // mdx(),
  AstroPureIntegration(config)
],
```

- [ ] **Step 5: Verify the integration**

Run:

```powershell
bun test tests/pixelblast-integration.test.ts
bun run check
```

Expected: the new test passes and Astro check reports no errors.

- [ ] **Step 6: Commit the toolchain**

```powershell
git add package.json bun.lock astro.config.ts tests/pixelblast-integration.test.ts
git commit -m "build: add React runtime for guestbook background"
```

---

### Task 2: Add the theme-aware PixelBlast React island

**Files:**
- Create: `src/components/guestbook/pixel-blast-config.ts`
- Create: `src/components/guestbook/PixelBlast.jsx`
- Create: `src/components/guestbook/PixelBlast.css`
- Create: `src/components/guestbook/GuestbookPixelBlast.jsx`
- Modify: `tests/pixelblast-integration.test.ts`

**Interfaces:**
- Consumes: React, Three.js, Postprocessing, `html.dark`, `prefers-reduced-motion`, window pointer events, and the approved PixelBlast source.
- Produces: default React component `GuestbookPixelBlast` with no required props; it renders a decorative full-size PixelBlast or `null`.

- [ ] **Step 1: Add failing tests for color selection, fallback policy, and lifecycle markers**

Append these imports to `tests/pixelblast-integration.test.ts`:

```ts
import {
  PIXEL_BLAST_COLORS,
  getPixelBlastColor,
  shouldAnimatePixelBlast
} from '../src/components/guestbook/pixel-blast-config'
```

Append these tests inside the existing `describe` block:

```ts
test('chooses the configured color for the active site theme', () => {
  expect(getPixelBlastColor(false)).toBe(PIXEL_BLAST_COLORS.light)
  expect(getPixelBlastColor(true)).toBe(PIXEL_BLAST_COLORS.dark)
})

test('uses a static fallback for reduced motion or missing WebGL', () => {
  expect(shouldAnimatePixelBlast(false, true)).toBe(true)
  expect(shouldAnimatePixelBlast(true, true)).toBe(false)
  expect(shouldAnimatePixelBlast(false, false)).toBe(false)
})

test('keeps the renderer decorative and cleans up global resources', () => {
  const core = read('src/components/guestbook/PixelBlast.jsx')
  const wrapper = read('src/components/guestbook/GuestbookPixelBlast.jsx')
  const styles = read('src/components/guestbook/PixelBlast.css')

  expect(core).toContain("window.addEventListener('pointerdown'")
  expect(core).toContain("window.removeEventListener('pointerdown'")
  expect(core).toContain("window.addEventListener('pointermove'")
  expect(core).toContain("window.removeEventListener('pointermove'")
  expect(core).toContain("document.addEventListener('visibilitychange'")
  expect(core).toContain("document.removeEventListener('visibilitychange'")
  expect(core).toContain('cancelAnimationFrame')
  expect(core).toContain('forceContextLoss')
  expect(core).toContain('touch?.texture.dispose()')
  expect(core).toContain('aria-hidden')
  expect(wrapper).toContain("attributeFilter: ['class']")
  expect(wrapper).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
  expect(wrapper).toContain("canvas.getContext('webgl2')")
  expect(styles).toContain('pointer-events: none')
})
```

- [ ] **Step 2: Run the tests and verify the component files are absent**

Run:

```powershell
bun test tests/pixelblast-integration.test.ts
```

Expected: FAIL with module/file-not-found errors for `pixel-blast-config.ts` and the new guestbook components.

- [ ] **Step 3: Add the pure theme and capability policy**

Create `src/components/guestbook/pixel-blast-config.ts`:

```ts
export const PIXEL_BLAST_COLORS = {
  light: '#7183c8',
  dark: '#7b82d9'
} as const

export function getPixelBlastColor(isDark: boolean): string {
  return isDark ? PIXEL_BLAST_COLORS.dark : PIXEL_BLAST_COLORS.light
}

export function shouldAnimatePixelBlast(
  prefersReducedMotion: boolean,
  webglAvailable: boolean
): boolean {
  return !prefersReducedMotion && webglAvailable
}
```

- [ ] **Step 4: Add the component CSS**

Create `src/components/guestbook/PixelBlast.css`:

```css
.pixel-blast-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.pixel-blast-container canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

- [ ] **Step 5: Import the approved PixelBlast source and apply the site adaptations**

Create `src/components/guestbook/PixelBlast.jsx` from the approved `Full Component Source` block. Preserve `createTouchTexture`, `createLiquidEffect`, `SHAPE_MAP`, `VERTEX_SRC`, `FRAGMENT_SRC`, `MAX_CLICKS`, the public prop defaults, and the Three.js/Postprocessing render path.

Apply all of the following concrete changes:

1. Add `onError` to the component props.
2. Set the container output to decorative:

```jsx
return (
  <div
    ref={containerRef}
    className={`pixel-blast-container ${className ?? ''}`}
    style={style}
    aria-hidden='true'
  />
)
```

3. Cap device pixel ratio exactly as follows:

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
```

4. Replace Canvas-level pointer listeners with window-level listeners:

```js
window.addEventListener('pointerdown', onPointerDown, { passive: true })
window.addEventListener('pointermove', onPointerMove, { passive: true })
```

5. Guard pointer mapping so events outside the viewport cannot divide by zero:

```js
const mapToPixels = (event) => {
  const rect = renderer.domElement.getBoundingClientRect()
  const width = Math.max(rect.width, 1)
  const height = Math.max(rect.height, 1)
  const scaleX = renderer.domElement.width / width
  const scaleY = renderer.domElement.height / height

  return {
    fx: (event.clientX - rect.left) * scaleX,
    fy: (height - (event.clientY - rect.top)) * scaleY,
    w: Math.max(renderer.domElement.width, 1),
    h: Math.max(renderer.domElement.height, 1)
  }
}
```

6. Pause the render loop while the document is hidden:

```js
const onVisibilityChange = () => {
  visibilityRef.current.visible = !document.hidden
}

document.addEventListener('visibilitychange', onVisibilityChange)
```

7. Correct the supplied liquid strength update:

```js
const strengthUniform = t.liquidEffect?.uniforms.get('uStrength')
if (strengthUniform) strengthUniform.value = liquidStrength
```

8. Use one idempotent teardown function for reinitialization and unmount:

```js
const teardown = () => {
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  resizeObserver.disconnect()
  cancelAnimationFrame(raf)
  quad.geometry.dispose()
  material.dispose()
  touch?.texture.dispose()
  composer?.dispose()
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.domElement.remove()
}
```

Return `teardown` from the initialization effect. Do not retain the supplied early-return cleanup branch that skips disposal when `mustReinit` is true.

9. Wrap renderer initialization in `try/catch`; if initialization fails, dispose any resources already created, call `onError?.(error)`, and leave the container empty so the Astro static gradient remains visible:

```js
try {
  // renderer, scene, passes, events, and animation setup
} catch (error) {
  onError?.(error)
}
```

10. Keep uniform-only prop changes (`color`, density, speed, ripple values, and liquid strength) out of renderer reinitialization. Update their existing uniforms instead.

- [ ] **Step 6: Add the theme/reduced-motion/WebGL wrapper**

Create `src/components/guestbook/GuestbookPixelBlast.jsx`:

```jsx
import { useEffect, useState } from 'react'

import {
  getPixelBlastColor,
  shouldAnimatePixelBlast
} from './pixel-blast-config'
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
```

- [ ] **Step 7: Format and verify the island**

Run:

```powershell
bunx prettier --write src/components/guestbook tests/pixelblast-integration.test.ts
bun test tests/pixelblast-integration.test.ts
bun run check
```

Expected: all PixelBlast integration tests pass and Astro check reports no errors.

- [ ] **Step 8: Commit the island**

```powershell
git add src/components/guestbook tests/pixelblast-integration.test.ts
git commit -m "feat: add theme-aware PixelBlast island"
```

---

### Task 3: Mount the background without changing Waline

**Files:**
- Create: `tests/guestbook-pixelblast.test.ts`
- Modify: `src/layouts/CommonPage.astro:6-24`
- Modify: `src/layouts/ContentLayout.astro:8-33`
- Modify: `src/layouts/BaseLayout.astro:9-41`
- Modify: `src/pages/guestbook.astro:1-9`

**Interfaces:**
- Consumes: default `GuestbookPixelBlast` React component from Task 2 and the existing `CommonPage`/`ContentLayout`/`BaseLayout` chain.
- Produces: optional `pageId?: string` and `background` slot forwarding for page-scoped decoration, plus `/guestbook` with a fixed theme gradient, client-only PixelBlast layer, glass title/content surfaces, and the unchanged Waline thread.

- [ ] **Step 1: Write the failing guestbook page contract**

Create `tests/guestbook-pixelblast.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('guestbook PixelBlast page', () => {
  test('mounts the background only on the guestbook route', () => {
    const guestbook = read('src/pages/guestbook.astro')
    const baseLayout = read('src/layouts/BaseLayout.astro')

    expect(guestbook).toContain("import GuestbookPixelBlast")
    expect(guestbook).toContain("client:only='react'")
    expect(guestbook).toContain("pageId='guestbook'")
    expect(guestbook).toContain("slot='background'")
    expect(guestbook).toContain("class='guestbook-backdrop'")
    expect(baseLayout).not.toContain('GuestbookPixelBlast')
  })

  test('forwards the page identifier and background outside transformed content', () => {
    const common = read('src/layouts/CommonPage.astro')
    const content = read('src/layouts/ContentLayout.astro')
    const base = read('src/layouts/BaseLayout.astro')

    expect(common).toContain('pageId?: string')
    expect(common).toContain("slot='background'")
    expect(content).toContain('pageId?: string')
    expect(content).toContain("slot='background'")
    expect(base).toContain('pageId?: string')
    expect(base).toContain('data-page={pageId}')
    expect(base.indexOf("<slot name='background' />")).toBeLessThan(
      base.indexOf("id='main-container'")
    )
  })

  test('keeps the existing Waline thread identity and behavior', () => {
    const guestbook = read('src/pages/guestbook.astro')

    expect(guestbook).toContain("path='/guestbook'")
    expect(guestbook).toContain('reaction={false}')
    expect(guestbook).toContain("title='伙伴留言'")
  })

  test('provides readable glass surfaces and a static fallback', () => {
    const guestbook = read('src/pages/guestbook.astro')

    expect(guestbook).toContain('linear-gradient')
    expect(guestbook).toContain('backdrop-filter: blur(')
    expect(guestbook).toContain("#content-header")
    expect(guestbook).toContain("#content")
    expect(guestbook).toContain("html.dark")
    expect(guestbook).toContain('pointer-events: none')
  })
})
```

- [ ] **Step 2: Run the test and verify the page has no PixelBlast layer**

Run:

```powershell
bun test tests/guestbook-pixelblast.test.ts
```

Expected: FAIL because the guestbook does not import or mount `GuestbookPixelBlast`.

- [ ] **Step 3: Add explicit page identity and background-slot forwarding**

In `src/layouts/CommonPage.astro`, extend and forward the optional page identifier:

```astro
interface Props {
  title: string
  headings?: MarkdownHeading[]
  pageId?: string
}

const { title, headings, pageId, ...props } = Astro.props
---

<PageLayout meta={{ title }} {pageId} {...props}>
  <Fragment slot='background'>
    <slot name='background' />
  </Fragment>
```

Keep the existing sidebar, header, default, bottom, and bottom-sidebar slots after this new fragment.

In `src/layouts/ContentLayout.astro`, extend the props and destructuring:

```astro
interface Props {
  meta: SiteMeta
  highlightColor?: string
  back?: string
  pageId?: string
}

const { meta, highlightColor, back = '/', pageId, ...props } = Astro.props
---

<PageLayout {meta} {highlightColor} {pageId} {...props}>
  <Fragment slot='background'>
    <slot name='background' />
  </Fragment>
```

Keep the existing `Button`, main content, bottom area, and `BackToTop` inside this layout after the new fragment.

In `src/layouts/BaseLayout.astro`, accept `pageId`:

```astro
interface Props {
  meta: SiteMeta
  highlightColor?: string
  pageId?: string
}

const {
  meta: { articleDate, description = config.description, ogImage, title },
  highlightColor,
  pageId,
  ...props
} = Astro.props
```

Then render the page identity and background immediately inside `<body>`, before `#main-container`:

```astro
<body class='flex justify-center bg-background text-foreground' data-page={pageId} {...props}>
  <slot name='background' />
  <!-- existing highlight gradient and #main-container follow -->
```

This named slot must remain outside `#content`, whose entrance animation applies a transform that would otherwise stop a fixed Canvas from being viewport-fixed.

- [ ] **Step 4: Replace the guestbook page with the page-scoped mount and styles**

Replace `src/pages/guestbook.astro` with:

```astro
---
import GuestbookPixelBlast from '@/components/guestbook/GuestbookPixelBlast.jsx'
import WalineThread from '@/components/waline/WalineThread.astro'
import PageLayout from '@/layouts/CommonPage.astro'
---

<PageLayout title='留言板' pageId='guestbook'>
  <div slot='background' class='guestbook-backdrop' aria-hidden='true'>
    <GuestbookPixelBlast client:only='react' />
  </div>

  <p>欢迎来这里打个招呼。留言公开可见，登录后可以发布。</p>
  <WalineThread path='/guestbook' reaction={false} title='伙伴留言' />
</PageLayout>

<style is:global>
  body[data-page='guestbook'] {
    background:
      radial-gradient(circle at 18% 12%, rgb(196 217 255 / 72%), transparent 44%),
      radial-gradient(circle at 82% 28%, rgb(222 205 255 / 66%), transparent 48%),
      hsl(var(--background));
  }

  body[data-page='guestbook'] #main-container {
    position: relative;
    z-index: 1;
  }

  body[data-page='guestbook'] .guestbook-backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 12%, rgb(196 217 255 / 72%), transparent 44%),
      radial-gradient(circle at 82% 28%, rgb(222 205 255 / 66%), transparent 48%);
  }

  html.dark body[data-page='guestbook'] {
    background:
      radial-gradient(circle at 18% 12%, rgb(52 71 126 / 52%), transparent 45%),
      radial-gradient(circle at 82% 28%, rgb(88 61 126 / 46%), transparent 50%),
      hsl(var(--background));
  }

  html.dark body[data-page='guestbook'] .guestbook-backdrop {
    background:
      radial-gradient(circle at 18% 12%, rgb(52 71 126 / 52%), transparent 45%),
      radial-gradient(circle at 82% 28%, rgb(88 61 126 / 46%), transparent 50%);
  }

  body[data-page='guestbook'] #content-header,
  body[data-page='guestbook'] #content {
    border: 1px solid hsl(var(--border) / 0.72);
    border-radius: calc(var(--radius) + 0.5rem);
    background: hsl(var(--background) / 0.76);
    box-shadow: 0 1.25rem 4rem rgb(47 54 92 / 12%);
    backdrop-filter: blur(1.25rem) saturate(130%);
  }

  body[data-page='guestbook'] #content-header {
    padding: 1.25rem 1.5rem;
  }

  body[data-page='guestbook'] #content {
    margin-top: 1rem;
    padding: 1.5rem;
  }

  html.dark body[data-page='guestbook'] #content-header,
  html.dark body[data-page='guestbook'] #content {
    border-color: hsl(var(--border) / 0.8);
    background: hsl(var(--background) / 0.72);
    box-shadow: 0 1.25rem 4rem rgb(0 0 0 / 28%);
  }

  @media (max-width: 640px) {
    body[data-page='guestbook'] #content-header,
    body[data-page='guestbook'] #content {
      border-radius: calc(var(--radius) + 0.25rem);
    }

    body[data-page='guestbook'] #content-header {
      padding: 1rem;
    }

    body[data-page='guestbook'] #content {
      padding: 1rem;
    }
  }
</style>
```

- [ ] **Step 5: Run the guestbook and existing Waline tests**

Run:

```powershell
bun test tests/guestbook-pixelblast.test.ts tests/waline-component.test.ts
bun run check
```

Expected: both test files pass; Astro check reports no errors; the existing test still proves `path='/guestbook'` and `reaction={false}`.

- [ ] **Step 6: Commit the page integration**

```powershell
git add src/layouts/CommonPage.astro src/layouts/ContentLayout.astro src/layouts/BaseLayout.astro src/pages/guestbook.astro tests/guestbook-pixelblast.test.ts
git commit -m "feat: add PixelBlast guestbook backdrop"
```

---

### Task 4: Document and verify the complete experience

**Files:**
- Modify: `docs/integrations.md`
- Modify: `docs/architecture.md`
- Modify: `docs/superpowers/specs/2026-07-17-guestbook-pixelblast-design.md`

**Interfaces:**
- Consumes: the completed guestbook page and the existing project documentation.
- Produces: documented maintenance boundaries plus test, build, accessibility, interaction, and visual verification evidence.

- [ ] **Step 1: Update the integration documentation**

Add this subsection after `## Waline` in `docs/integrations.md`:

```md
### 留言板视觉层

`/guestbook` 在 Astro 页面内挂载一个仅客户端运行的 React Island，使用 React Bits PixelBlast、Three.js 和 Postprocessing 绘制整页背景。该层只负责视觉表现：

- 主题颜色跟随 `html.dark`；
- Canvas 不接管指针事件，页面级事件只用于背景涟漪和流体扰动；
- `prefers-reduced-motion: reduce`、WebGL2 不可用或初始化失败时只显示静态渐变；
- Waline 仍固定使用 `/guestbook`，登录、留言与管理逻辑不经过 React Island。

修改视觉参数时不要改变 Waline 的 `path`，也不要把 PixelBlast 移入全局布局，否则其他页面会额外加载 React 和 WebGL 运行时。
```

Add this row to the key source table in `docs/architecture.md`:

```md
| `src/components/guestbook/` | 留言板专属 PixelBlast React Island、主题同步与 WebGL 退化 |
```

Change the design document status from:

```text
状态：已确认，待实现
```

to:

```text
状态：已实现
```

- [ ] **Step 2: Run the complete automated verification**

Run:

```powershell
bun test
bun run check
bun run build
git diff --check
```

Expected:

- all Bun tests pass with zero failures;
- Astro check reports zero errors;
- production build completes and Pagefind indexes `dist/client`;
- `git diff --check` prints no whitespace errors.

- [ ] **Step 3: Start the local production-equivalent page for browser verification**

Run in a background terminal:

```powershell
bun run dev -- --host 127.0.0.1
```

Open the printed local `/guestbook` URL and verify:

1. the Canvas fills the viewport and remains fixed while scrolling;
2. light mode uses the light blue-purple color;
3. dark mode changes the PixelBlast color without reloading;
4. pointer movement produces liquid distortion;
5. clicking blank areas, links, inputs, and buttons produces a background ripple without blocking the foreground action;
6. Waline input can be focused and typed into;
7. login and pagination controls remain clickable;
8. a mobile viewport retains the effect without horizontal overflow;
9. emulated `prefers-reduced-motion: reduce` removes the Canvas but leaves the static gradient and Waline;
10. navigating away from `/guestbook` leaves no running PixelBlast Canvas or window listeners.

Expected: all ten checks pass. Capture one light-mode desktop screenshot, one dark-mode desktop screenshot, and one mobile screenshot for the implementation handoff.

- [ ] **Step 4: Inspect the built route isolation**

Run:

```powershell
rg -l "PixelBlast|postprocessing|three" dist/client/_astro
```

Expected: matches appear only in the guestbook React island chunks and their imported WebGL chunks; ordinary route entry chunks do not initialize PixelBlast.

- [ ] **Step 5: Commit documentation and final verification state**

```powershell
git add docs/integrations.md docs/architecture.md docs/superpowers/specs/2026-07-17-guestbook-pixelblast-design.md
git commit -m "docs: document guestbook PixelBlast integration"
```

- [ ] **Step 6: Confirm a clean implementation branch**

Run:

```powershell
git status --short
git log -4 --oneline
```

Expected: `git status --short` is empty and the four PixelBlast commits are visible in dependency, island, page, and documentation order.
