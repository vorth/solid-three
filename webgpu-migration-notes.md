# WebGPURenderer Support

## Problem

Passing a `WebGPURenderer` instance as the `gl` prop to `<Canvas>` failed for two reasons:

1. **Wrong renderer created** — the `gl` memo checked `props.gl instanceof WebGLRenderer` first; anything that wasn't a `WebGLRenderer` fell through to creating a brand-new `WebGLRenderer`, silently ignoring the user-supplied renderer.
2. **Async `init()` not awaited** — `WebGPURenderer` requires `await renderer.init()` before any call to `renderer.render()`. The render loop started immediately, causing a crash on the first frame.

## Changes

### `src/types.ts`

- Added a `RendererLike` interface — the minimal structural contract shared by `WebGLRenderer`, `WebGPURenderer`, and any other custom renderer:
  - `render()`, `setSize()`, `setPixelRatio()`, `getPixelRatio()`
  - `xr?` — optional XR manager
  - `shadowMap?` — optional shadow map (WebGL-specific)
  - `init?(): Promise<void>` — optional async initializer (WebGPU-specific)
- Changed `Context.gl` from `Meta<WebGLRenderer>` to `Meta<RendererLike>`.

### `src/canvas.tsx`

- Updated `CanvasProps.gl` to accept `RendererLike` instances and factory functions returning `RendererLike`, in addition to the existing `WebGLRenderer`-specific options.

### `src/create-three.tsx`

**`gl` memo — renderer instance detection**

Reordered and extended the checks:
1. Factory function → call it with `canvas`
2. `instanceof WebGLRenderer` → use directly
3. Object with a `.render()` method → use directly as `RendererLike` (covers `WebGPURenderer`)
4. Anything else → create a default `WebGLRenderer` (treats `props.gl` as config props)

**Async `init()` support**

Added a `glInitialized` boolean flag. A `createEffect` watches `gl()` and:
- Resets `glInitialized = false`
- Calls `await renderer.init()` if the method exists
- Sets `glInitialized = true` when ready

`render()` returns early when `!glInitialized`, so the render loop spins harmlessly until the GPU is ready.

**WebGL-specific effects guarded**

- `outputEncoding` / `toneMapping` props are only applied when `gl() instanceof WebGLRenderer`.
- The "apply `props.gl` as config props" branch now skips when `props.gl` is any renderer instance (not just `WebGLRenderer`).

**XR non-null assertions**

Because `xr` is now optional in `RendererLike`, the XR handler functions that are only ever called after `if (renderer.xr)` confirming presence use `!` non-null assertions.

## Usage

```tsx
import WebGPURenderer from 'three/webgpu'

const renderer = new WebGPURenderer()

<Canvas gl={renderer}>
  {/* scene */}
</Canvas>
```

`solid-three` will call `renderer.init()` automatically before the first render frame.
