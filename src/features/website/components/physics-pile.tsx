import type MatterNS from 'matter-js'
import { useEffect, useRef } from 'react'
import { cn } from '#/lib/utils'

/**
 * A tray of feature pills that drop in under gravity when the tray scrolls
 * into view, pile up, and can be grabbed and tossed. Laid out after Ondeck's
 * "What you can ask for" board.
 *
 * Physics: matter-js (MIT), loaded only on the client. Each pill is a real
 * DOM element (so it uses the site's fonts and tokens) moved with transforms
 * written straight from the simulation, never through React state. The
 * loop runs at a fixed step, stops once everything has settled or the tray
 * is off screen, and starts again when a pill is grabbed. With reduced
 * motion the pile is computed instantly instead of falling. Approach after
 * Subframe Motion's "Sticker gravity" (MIT).
 */

export type PileTone = 'lime' | 'blue' | 'paper' | 'ink'

export interface PileItem {
  label: string
  tone: PileTone
}

const TONES: Record<PileTone, string> = {
  lime: 'bg-brand-lime text-brand-ink',
  blue: 'bg-primary text-white',
  paper: 'bg-brand-paper text-brand-ink',
  ink: 'bg-brand-ink text-white',
}

type Matter = typeof MatterNS

export function PhysicsPile({
  items,
  className,
}: {
  items: PileItem[]
  className?: string
}) {
  const trayRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const tray = trayRef.current
    if (!tray) return
    let disposed = false
    let stopPile = () => {}
    Promise.all([import('matter-js'), document.fonts.ready]).then(([mod]) => {
      if (disposed) return
      const matter = ((mod as { default?: Matter }).default ?? mod) as Matter
      const pills = pillRefs.current.filter((el): el is HTMLDivElement => !!el)
      stopPile = startPile(matter, tray, pills)
    })
    return () => {
      disposed = true
      stopPile()
    }
  }, [])

  return (
    <div className={className}>
      {/* The pile is decorative; this is the same list for screen readers */}
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.label}>{item.label}</li>
        ))}
      </ul>
      <div
        aria-hidden
        className="relative h-[460px] touch-pan-y select-none overflow-hidden rounded-[2rem] bg-card ring-1 ring-border md:h-[560px]"
        ref={trayRef}
      >
        {items.map((item, index) => (
          <div
            className={cn(
              'absolute top-0 left-0 cursor-grab touch-none whitespace-nowrap rounded-2xl border-2 border-sticker-line px-4 py-2 font-display font-bold text-lg leading-7 tracking-[-0.02em] shadow-[0_10px_24px_-14px_rgb(0_0_0/0.55)] active:cursor-grabbing md:px-7 md:py-3.5 md:text-[1.75rem] md:leading-9',
              TONES[item.tone],
            )}
            data-pile-index={index}
            key={item.label}
            ref={(el) => {
              pillRefs.current[index] = el
            }}
            // Shown once the simulation has placed it
            style={{ visibility: 'hidden' }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Fixed simulation step, in ms. */
const STEP = 1000 / 60
/** Thickness of the invisible walls around the tray. */
const WALL = 400
/** Pills beyond this share of the tray's area are left out (small screens). */
const MAX_FILL = 0.46
/** Frames everything must be still before the loop stops. */
const SETTLE_FRAMES = 40
/** Fastest a tossed pill may fly, in px per step. */
const MAX_TOSS = 28

/** Runs the pile; returns a function that tears it down. */
function startPile(
  M: Matter,
  tray: HTMLDivElement,
  pills: HTMLDivElement[],
): () => void {
  const { Body, Bodies, Composite, Constraint, Engine } = M
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const engine = Engine.create()

  let width = 0
  let height = 0
  /** For each pill: its body (null if left out) and size. */
  let slots: Array<{ body: MatterNS.Body; w: number; h: number } | null> = []
  let drag: {
    constraint: MatterNS.Constraint
    pointerId: number
    index: number
  } | null = null
  let raf = 0
  let last = 0
  let carry = 0
  let stillFrames = 0
  let onScreen = false
  let dropped = false
  let topZ = 1

  const live = () => slots.filter((s): s is NonNullable<typeof s> => s !== null)

  /** Creates walls and bodies for the tray's current size, above the tray. */
  const build = () => {
    Composite.clear(engine.world, false)
    width = tray.clientWidth
    height = tray.clientHeight

    const tall = height * 4 + WALL
    Composite.add(engine.world, [
      // Floor, and side walls reaching far above so tosses come back down
      Bodies.rectangle(width / 2, height + WALL / 2, width + WALL * 2, WALL, {
        isStatic: true,
      }),
      Bodies.rectangle(-WALL / 2, height + WALL - tall / 2, WALL, tall, {
        isStatic: true,
      }),
      Bodies.rectangle(width + WALL / 2, height + WALL - tall / 2, WALL, tall, {
        isStatic: true,
      }),
    ])

    let budget = width * height * MAX_FILL
    slots = pills.map((el, i) => {
      el.style.display = ''
      const w = el.offsetWidth
      const h = el.offsetHeight
      budget -= w * h
      if (budget < 0 || w > width - 8) {
        el.style.display = 'none'
        return null
      }
      const body = Bodies.rectangle(
        w / 2 + Math.random() * (width - w),
        -h - i * 55 - Math.random() * 80,
        w,
        h,
        {
          chamfer: { radius: Math.min(16, h / 2 - 1) },
          density: 0.0015,
          friction: 0.5,
          frictionAir: 0.012,
          restitution: 0.15,
        },
      )
      // Mostly tilted, a few standing on end, like a tipped-out box
      const upright = Math.random() < 0.18 ? Math.PI / 2 : 0
      Body.setAngle(body, (Math.random() - 0.5) * 0.9 + upright)
      Composite.add(engine.world, body)
      return { body, w, h }
    })
  }

  const render = () => {
    slots.forEach((slot, i) => {
      if (!slot) return
      const { body, w, h } = slot
      const el = pills[i]
      el.style.transform = `translate3d(${body.position.x - w / 2}px, ${body.position.y - h / 2}px, 0) rotate(${body.angle}rad)`
      el.style.visibility = 'visible'
    })
  }

  /** Puts back anything thrown out of the tray (e.g. through a wall). */
  const rescueStrays = () => {
    for (const { body } of live()) {
      const { x, y } = body.position
      if (x < -WALL / 2 || x > width + WALL / 2 || y > height + WALL / 2) {
        Body.setPosition(body, { x: width / 2, y: -120 })
        Body.setVelocity(body, { x: 0, y: 0 })
      }
    }
  }

  const isStill = () =>
    live().every(
      ({ body }) => body.speed < 0.08 && Math.abs(body.angularSpeed) < 0.006,
    )

  /** Runs the simulation to rest at once (reduced motion, resizes). */
  const settleNow = () => {
    let still = 0
    for (let i = 0; i < 1200 && still < SETTLE_FRAMES; i++) {
      Engine.update(engine, STEP)
      still = isStill() ? still + 1 : 0
    }
    rescueStrays()
    render()
  }

  const frame = (time: number) => {
    raf = 0
    carry += Math.min(time - (last || time - STEP), 100)
    last = time
    let steps = 0
    while (carry >= STEP && steps < 4) {
      Engine.update(engine, STEP)
      carry -= STEP
      steps++
    }
    if (steps === 4) carry = 0
    rescueStrays()
    render()

    stillFrames = !drag && isStill() ? stillFrames + 1 : 0
    if (stillFrames < SETTLE_FRAMES) wake()
  }

  const wake = () => {
    if (raf || !onScreen || document.hidden) return
    if (!drag && motion.matches) return
    raf = requestAnimationFrame(frame)
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
    last = 0
    carry = 0
  }

  // Grab and toss
  const pointerIn = (e: PointerEvent) => {
    const rect = tray.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onDown = (e: PointerEvent) => {
    if (drag || e.button !== 0 || !dropped) return
    const el = (e.target as Element).closest<HTMLElement>('[data-pile-index]')
    const index = Number(el?.dataset.pileIndex)
    const slot = slots[index]
    if (!el || !slot) return
    e.preventDefault()
    const p = pointerIn(e)
    const constraint = Constraint.create({
      pointA: p,
      bodyB: slot.body,
      pointB: { x: p.x - slot.body.position.x, y: p.y - slot.body.position.y },
      length: 0,
      stiffness: 0.2,
      damping: 0.1,
    })
    Composite.add(engine.world, constraint)
    tray.setPointerCapture(e.pointerId)
    drag = { constraint, pointerId: e.pointerId, index }
    el.style.zIndex = String(++topZ)
    stillFrames = 0
    wake()
  }

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.constraint.pointA = pointerIn(e)
  }

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    Composite.remove(engine.world, drag.constraint)
    const body = slots[drag.index]?.body
    if (body && body.speed > MAX_TOSS) {
      const scale = MAX_TOSS / body.speed
      Body.setVelocity(body, {
        x: body.velocity.x * scale,
        y: body.velocity.y * scale,
      })
    }
    if (tray.hasPointerCapture(e.pointerId)) {
      tray.releasePointerCapture(e.pointerId)
    }
    drag = null
    stillFrames = 0
    // With reduced motion, let it land without animating the fall
    if (motion.matches) {
      stop()
      settleNow()
    } else {
      wake()
    }
  }

  // Drop when the tray scrolls into view; pause while it's off screen
  const visibility = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting
      if (!onScreen) return stop()
      if (!dropped) {
        dropped = true
        if (motion.matches) return settleNow()
      }
      stillFrames = 0
      wake()
    },
    { threshold: 0.3 },
  )

  // A new size gets a fresh pile, settled at once (no second drop)
  let resizeTimer = 0
  const resize = new ResizeObserver(() => {
    if (
      Math.abs(tray.clientWidth - width) < 2 &&
      Math.abs(tray.clientHeight - height) < 2
    ) {
      return
    }
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (drag) return
      stop()
      build()
      if (dropped) settleNow()
    }, 150)
  })

  const onPageVisibility = () => (document.hidden ? stop() : wake())

  build()
  visibility.observe(tray)
  resize.observe(tray)
  tray.addEventListener('pointerdown', onDown)
  tray.addEventListener('pointermove', onMove)
  tray.addEventListener('pointerup', onUp)
  tray.addEventListener('pointercancel', onUp)
  document.addEventListener('visibilitychange', onPageVisibility)

  return () => {
    stop()
    window.clearTimeout(resizeTimer)
    visibility.disconnect()
    resize.disconnect()
    tray.removeEventListener('pointerdown', onDown)
    tray.removeEventListener('pointermove', onMove)
    tray.removeEventListener('pointerup', onUp)
    tray.removeEventListener('pointercancel', onUp)
    document.removeEventListener('visibilitychange', onPageVisibility)
    Composite.clear(engine.world, false)
    Engine.clear(engine)
  }
}
