import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

type Flower = {
  id: string
  x: number
  y: number
  seed: number
  scale: number
  createdAt: number
}

type PointerState = {
  x: number
  y: number
  active: boolean
}

type CanvasPoint = {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
}

type FlowerSprite = {
  image: HTMLImageElement
  loaded: boolean
}

const LEGACY_STORAGE_KEY = 'touchgrass.flowers.v1'
const MAX_FLOWERS = 420
const FLOWER_SPACING_PX = 46
const FLOWER_SPRITE_SRC = '/flower-sprite.png'
const FLOWER_SPRITE_ANCHOR_X = 26.5 / 48
const FLOWER_SPRITE_ANCHOR_Y = 22 / 72
const FLOWER_SPRITE_ASPECT = 48 / 72

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hash2(x: number, y: number) {
  let n = x * 374761393 + y * 668265263
  n = (n ^ (n >>> 13)) * 1274126177
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function drawGrassBlade(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  sway: number,
  color: string,
  unit: number,
) {
  const segment = Math.max(unit * 1.3, height / 5)
  const width = Math.max(unit, unit * 1.5)
  ctx.fillStyle = color

  for (let i = 0; i < 5; i += 1) {
    const progress = i / 4
    const y = baseY - progress * height
    const xOffset = sway * progress * progress
    const shrink = 1 - progress * 0.45
    ctx.fillRect(
      Math.round(x + xOffset - (width * shrink) / 2),
      Math.round(y - segment),
      Math.max(unit, Math.round(width * shrink)),
      Math.ceil(segment + unit * 0.35),
    )
  }
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  flower: Flower,
  width: number,
  height: number,
  time: number,
  unit: number,
  reducedMotion: boolean,
  flowerSprite: FlowerSprite | null,
) {
  if (!flowerSprite?.loaded) {
    return
  }

  const x = flower.x * width
  const y = flower.y * height
  const age = Math.max(0, time - flower.createdAt)
  const grow = clamp(age / 520, 0, 1)
  const breezeX = reducedMotion ? 0 : Math.sin(time * 0.0014 + flower.seed * 8.9) * unit * 1.8
  const breezeY = reducedMotion ? 0 : Math.sin(time * 0.001 + flower.seed * 4.7) * unit * 0.28
  const spriteHeight = unit * 26 * flower.scale * (0.35 + grow * 0.65)
  const spriteWidth = spriteHeight * FLOWER_SPRITE_ASPECT
  const anchorX = x + breezeX
  const anchorY = y + breezeY

  ctx.drawImage(
    flowerSprite.image,
    Math.round(anchorX - spriteWidth * FLOWER_SPRITE_ANCHOR_X),
    Math.round(anchorY - spriteHeight * FLOWER_SPRITE_ANCHOR_Y),
    Math.round(spriteWidth),
    Math.round(spriteHeight),
  )
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  flowers: Flower[],
  pointer: PointerState,
  time: number,
  reducedMotion: boolean,
  flowerSprite: FlowerSprite | null,
) {
  const unit = Math.max(2, Math.floor(Math.min(width, height) / 180))
  const tile = unit * 16
  const bladeColors = ['#1f6f20', '#2f8e24', '#51a930', '#82c548', '#163f1c']

  ctx.fillStyle = '#2f8d25'
  ctx.fillRect(0, 0, width, height)

  for (let y = 0; y < height + tile; y += tile) {
    for (let x = 0; x < width + tile; x += tile) {
      const jitter = hash2(x / tile, y / tile)
      ctx.fillStyle = jitter > 0.5 ? '#338f24' : '#2a8322'
      ctx.fillRect(x, y, tile, tile)

      ctx.fillStyle = jitter > 0.68 ? '#3b9d28' : '#25751f'
      ctx.fillRect(x + unit * 3, y, unit * 2, tile)
      ctx.fillRect(x + unit * 11, y + unit * 4, unit * 2, tile - unit * 4)
    }
  }

  const bladeStep = unit * 5
  const rows = Math.ceil(height / bladeStep) + 3
  const cols = Math.ceil(width / bladeStep) + 3
  const pointerRadius = Math.max(44, unit * 22)

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = hash2(col, row)
      const x = (col - 1) * bladeStep + seed * unit * 4
      const baseY = (row - 1) * bladeStep + hash2(col + 13, row - 9) * unit * 5
      const bladeHeight = unit * (7 + seed * 9)
      const wind = reducedMotion ? 0 : Math.sin(time * 0.001 + col * 0.63 + row * 0.39) * unit * (1.4 + seed)
      let push = 0

      if (pointer.active) {
        const dx = x - pointer.x
        const dy = baseY - bladeHeight * 0.7 - pointer.y
        const distance = Math.hypot(dx, dy)
        if (distance < pointerRadius) {
          const strength = (1 - distance / pointerRadius) ** 2
          push = (dx < 0 ? -1 : 1) * strength * unit * 12
        }
      }

      drawGrassBlade(ctx, x, baseY, bladeHeight, wind + push, bladeColors[Math.floor(seed * bladeColors.length)], unit)

      if (seed > 0.82) {
        ctx.fillStyle = seed > 0.92 ? '#9eda55' : '#68b837'
        ctx.fillRect(Math.round(x + unit * 2), Math.round(baseY - bladeHeight * 0.72), unit * 2, unit * 2)
      }
    }
  }

  flowers
    .slice()
    .sort((a, b) => a.y - b.y)
    .forEach((flower) => drawFlower(ctx, flower, width, height, time, unit, reducedMotion, flowerSprite))
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const flowersRef = useRef<Flower[]>([])
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false })
  const reducedMotionRef = useRef(false)
  const isPlantingRef = useRef(false)
  const lastFlowerPointRef = useRef<CanvasPoint | null>(null)
  const flowerSpriteRef = useRef<FlowerSprite | null>(null)
  const [flowers, setFlowers] = useState<Flower[]>([])

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }, [])

  useEffect(() => {
    flowersRef.current = flowers
  }, [flowers])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => {
      reducedMotionRef.current = query.matches
    }

    updateMotionPreference()
    query.addEventListener('change', updateMotionPreference)
    return () => query.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    const image = new Image()
    const sprite: FlowerSprite = { image, loaded: false }
    flowerSpriteRef.current = sprite

    image.onload = () => {
      sprite.loaded = true
    }

    image.src = FLOWER_SPRITE_SRC
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let animationFrame = 0

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetWidth = Math.max(1, Math.floor(rect.width * dpr))
      const targetHeight = Math.max(1, Math.floor(rect.height * dpr))

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      drawScene(
        ctx,
        rect.width,
        rect.height,
        flowersRef.current,
        pointerRef.current,
        time,
        reducedMotionRef.current,
        flowerSpriteRef.current,
      )
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  const getCanvasPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    return {
      x,
      y,
      normalizedX: clamp(x / rect.width, 0, 1),
      normalizedY: clamp(y / rect.height, 0, 1),
    }
  }, [])

  const updatePointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>, active = true) => {
    const point = getCanvasPoint(event)
    pointerRef.current = {
      x: point.x,
      y: point.y,
      active,
    }
    return point
  }, [getCanvasPoint])

  const addFlower = useCallback((point: CanvasPoint, force = false) => {
    const lastPoint = lastFlowerPointRef.current
    if (!force && lastPoint && Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < FLOWER_SPACING_PX) {
      return
    }

    const seed = Math.random()
    const createdAt = performance.now()
    lastFlowerPointRef.current = point

    setFlowers((current) => [
      ...current.slice(Math.max(0, current.length - MAX_FLOWERS + 1)),
      {
        id: `${Date.now().toString(36)}-${Math.floor(seed * 100000).toString(36)}`,
        x: point.normalizedX,
        y: point.normalizedY,
        seed,
        scale: 0.76 + seed * 0.48,
        createdAt,
      },
    ])
  }, [])

  return (
    <main className="touchgrass" aria-label="TouchGrass flower canvas">
      <canvas
        ref={canvasRef}
        className="touchgrass-canvas"
        aria-label="Animated patch of grass. Click or tap to grow white flowers."
        role="img"
        onPointerDown={(event) => {
          const point = updatePointer(event)
          isPlantingRef.current = true
          lastFlowerPointRef.current = null
          event.currentTarget.setPointerCapture(event.pointerId)
          addFlower(point, true)
        }}
        onPointerMove={(event) => {
          const point = updatePointer(event)
          if (isPlantingRef.current) {
            addFlower(point)
          }
        }}
        onPointerUp={(event) => {
          isPlantingRef.current = false
          lastFlowerPointRef.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
        onPointerEnter={updatePointer}
        onPointerLeave={() => {
          pointerRef.current.active = false
          isPlantingRef.current = false
          lastFlowerPointRef.current = null
        }}
        onPointerCancel={(event) => {
          pointerRef.current.active = false
          isPlantingRef.current = false
          lastFlowerPointRef.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
      />
      <p className="sr-only">
        TouchGrass is an interactive grass patch. Move the pointer over the grass to part the blades, then click or tap
        and drag to grow spaced streaks of white flowers. Flowers clear when the project refreshes.
      </p>
    </main>
  )
}

export default App
