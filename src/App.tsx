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

const STORAGE_KEY = 'touchgrass.flowers.v1'
const MAX_FLOWERS = 420
const GOLDEN_ANGLE = 2.399963229728653

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hash2(x: number, y: number) {
  let n = x * 374761393 + y * 668265263
  n = (n ^ (n >>> 13)) * 1274126177
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function hash1(value: number) {
  return hash2(value, value * 31 + 17)
}

function readStoredFlowers(): Flower[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as Flower[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((flower) => {
        return (
          typeof flower.id === 'string' &&
          Number.isFinite(flower.x) &&
          Number.isFinite(flower.y) &&
          Number.isFinite(flower.seed) &&
          Number.isFinite(flower.scale) &&
          Number.isFinite(flower.createdAt)
        )
      })
      .slice(-MAX_FLOWERS)
      .map((flower) => ({
        ...flower,
        x: clamp(flower.x, 0, 1),
        y: clamp(flower.y, 0, 1),
        scale: clamp(flower.scale, 0.72, 1.36),
      }))
  } catch {
    return []
  }
}

function drawStem(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, sway: number, unit: number) {
  ctx.fillStyle = '#2a781f'
  const width = Math.max(unit, unit * 1.25)
  ctx.fillRect(Math.round(x - width / 2 + sway * 0.32), Math.round(y - height), width, height)
  ctx.fillStyle = '#76bd3c'
  ctx.fillRect(Math.round(x + sway * 0.55), Math.round(y - height * 0.66), Math.max(unit, width * 0.7), height * 0.42)
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
) {
  const x = flower.x * width
  const y = flower.y * height
  const age = Math.max(0, time - flower.createdAt)
  const grow = clamp(age / 520, 0, 1)
  const breeze = reducedMotion ? 0 : Math.sin(time * 0.0014 + flower.seed * 8.9) * unit * 1.7
  const size = unit * 9.2 * flower.scale * (0.35 + grow * 0.65)
  const stemHeight = size * 2.2
  const stemX = x + breeze * 0.4
  const bloomY = y - stemHeight

  drawStem(ctx, x, y, stemHeight, breeze, unit)

  for (let i = 0; i < 6; i += 1) {
    const angle = i * GOLDEN_ANGLE + flower.seed * 5.2
    const px = stemX + Math.cos(angle) * size * 0.43
    const py = bloomY + Math.sin(angle) * size * 0.33
    const petalW = size * (0.66 + hash1(flower.seed * 100 + i) * 0.12)
    const petalH = size * 0.56

    ctx.fillStyle = '#fdfdf2'
    ctx.beginPath()
    ctx.ellipse(px, py, petalW * 0.5, petalH * 0.5, angle, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(220, 255, 246, 0.65)'
    ctx.fillRect(Math.round(px - unit), Math.round(py - petalH * 0.28), Math.max(unit, unit * 1.1), Math.max(unit, unit * 1.1))
  }

  ctx.fillStyle = '#ffc20d'
  ctx.beginPath()
  ctx.ellipse(stemX, bloomY, size * 0.34, size * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e6a600'
  ctx.fillRect(Math.round(stemX - size * 0.13), Math.round(bloomY - unit * 0.5), Math.max(unit, size * 0.26), Math.max(unit, unit * 1.25))
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  flowers: Flower[],
  pointer: PointerState,
  time: number,
  reducedMotion: boolean,
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
    .forEach((flower) => drawFlower(ctx, flower, width, height, time, unit, reducedMotion))
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const flowersRef = useRef<Flower[]>([])
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false })
  const reducedMotionRef = useRef(false)
  const [flowers, setFlowers] = useState<Flower[]>([])

  useEffect(() => {
    const stored = readStoredFlowers()
    flowersRef.current = stored
    setFlowers(stored)
  }, [])

  useEffect(() => {
    flowersRef.current = flowers
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flowers))
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
      drawScene(ctx, rect.width, rect.height, flowersRef.current, pointerRef.current, time, reducedMotionRef.current)
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  const updatePointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>, active = true) => {
    const rect = event.currentTarget.getBoundingClientRect()
    pointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active,
    }
  }, [])

  const addFlower = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((event.clientY - rect.top) / rect.height, 0.08, 0.98)
    const seed = Math.random()
    const createdAt = performance.now()

    setFlowers((current) => [
      ...current.slice(Math.max(0, current.length - MAX_FLOWERS + 1)),
      {
        id: `${Date.now().toString(36)}-${Math.floor(seed * 100000).toString(36)}`,
        x,
        y,
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
          updatePointer(event)
          event.currentTarget.setPointerCapture(event.pointerId)
          addFlower(event)
        }}
        onPointerMove={updatePointer}
        onPointerEnter={updatePointer}
        onPointerLeave={() => {
          pointerRef.current.active = false
        }}
        onPointerCancel={() => {
          pointerRef.current.active = false
        }}
      />
      <p className="sr-only">
        TouchGrass is an interactive grass patch. Move the pointer over the grass to part the blades, then click or tap
        to grow a white flower. Flowers are stored locally in this browser.
      </p>
    </main>
  )
}

export default App
