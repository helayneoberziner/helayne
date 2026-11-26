'use client'

/**
 * Hero editorial da Helayne, adaptada do bloco "Elias" (nome gigante vazado, retrato recortado, carta que se escreve
 * sozinha, splash de tinta e cursor de tinta). Aqui o carrossel de livros virou um carrossel de CDs que tocam os Reels.
 * Todo o texto vem de `SiteContent` (src/content/site.ts); nada de conteúdo fica neste arquivo.
 *
 * Dependências: motion, lucide-react, @fontsource/inter (Inter 900 dá a métrica exata do nome gigante).
 */

import { createContext, Fragment, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { animate, AnimatePresence, domAnimation, LazyMotion, m, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionStyle, Transition } from 'motion/react'
import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import '@fontsource/inter/latin-900.css'
import type { SiteContent, Video } from '@/content/site'

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export type EliasHeroProps = {
  hero: SiteContent['hero']
  videos: Video[]
  /** Forçar movimento reduzido (ligado/desligado); por padrão vale a preferência do visitante */
  reducedMotion?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

const MOTION = {
  delays: { nav: 0, first: 0.1, last: 0.25, portrait: 0.4, book: 0.6, pad: 0.7, intro: 0.8, socials: 1.15 },
  letterStagger: 0.055,
  depth: { portrait: 14, first: 6, last: 9 },
  letter: { perCharacter: 0.075, pauseAfterPunctuation: 0.36, beforeSeal: 1.4, press: 0.8, sealHold: 4.8 },
  discTilt: 14,
  discCycle: 5,
  spotlight: { radius: 145, readyAfter: 2.1 },
  cursor: { dot: 10, ring: 44, disc: 72 }
}

const SPLASH = { drawAt: 0.1, drawDuration: 0.75, floodAt: 0.7, floodDuration: 0.65, openAt: 1.4, openDuration: 0.85, fontTimeout: 1.2 }

const MEDIA = {
  finePointer: '(hover: hover) and (pointer: fine)',
  composition: '(min-width: 1024px) and (min-aspect-ratio: 5/4)',
  reducedMotion: '(prefers-reduced-motion: reduce)'
}

type Ctx = { hero: SiteContent['hero']; videos: Video[]; reduced: boolean | undefined; portrait: { src: string; alt: string; width: number; height: number } | undefined }
const EliasContext = createContext<Ctx | null>(null)

const useElias = () => {
  const value = useContext(EliasContext)

  if (!value) throw new Error('Partes da hero precisam estar dentro de <EliasHero>')

  return value
}

const useReduce = () => {
  const { reduced } = useElias()
  const system = useReducedMotion()

  return reduced ?? system
}

const IntroContext = createContext(true)
const useIntroStarted = () => useContext(IntroContext)
const OnScreenContext = createContext(true)
const useHeroOnScreen = () => useContext(OnScreenContext)

const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)

      list.addEventListener('change', onChange)

      return () => list.removeEventListener('change', onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

const reveal = (reduceMotion: boolean | null, delay: number, duration = 1): Transition => (reduceMotion ? { duration: 0 } : { delay, duration, ease: EASE })

/** Filtros de tinta: duotone do retrato (tinta → rosa → creme) e contorno de 2px dentro das letras */
const InkFilters = () => (
  <svg width='0' height='0' aria-hidden focusable='false' className='absolute'>
    <filter id='ea-ink-duotone' colorInterpolationFilters='sRGB'>
      <feColorMatrix type='matrix' values='0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0' />
      <feComponentTransfer>
        <feFuncR type='table' tableValues='0.067 0.886 0.949' />
        <feFuncG type='table' tableValues='0.067 0.471 0.937' />
        <feFuncB type='table' tableValues='0.067 0.604 0.914' />
      </feComponentTransfer>
    </filter>
    <filter id='ea-ink-outline'>
      <feMorphology in='SourceAlpha' operator='erode' radius='2' result='inside' />
      <feComposite in='SourceGraphic' in2='inside' operator='out' />
    </filter>
  </svg>
)

type InkButtonProps = { label: string; icon?: 'right' | 'up-right'; href?: string; className?: string }

const InkButton = ({ label, icon = 'right', href, className }: InkButtonProps) => {
  const Arrow = icon === 'up-right' ? ArrowUpRightIcon : ArrowRightIcon

  return (
    <a href={href} className={cn('ea-cta', icon === 'up-right' && 'ea-cta-diagonal', className)}>
      <span className='ea-cta-label'>{label}</span>
      <span aria-hidden className='ea-cta-mark'>
        <Arrow className='ea-cta-arrow ea-cta-arrow-out' strokeWidth={2} />
        <Arrow className='ea-cta-arrow ea-cta-arrow-in' strokeWidth={2} />
      </span>
    </a>
  )
}

type MaskedWordProps = { text: string; delay: number; from: 'below' | 'above'; reverse?: boolean }

/** Dividir a palavra em letras perde o kerning; mede-se cada par uma vez e devolve-se como margem */
const measureKerning = (element: HTMLElement, text: string) => {
  const context = document.createElement('canvas').getContext('2d')

  if (!context) return []

  const style = getComputedStyle(element)
  const shown = style.textTransform === 'uppercase' ? text.toUpperCase() : text

  context.font = `${style.fontWeight} 100px ${style.fontFamily}`

  const width = (value: string) => context.measureText(value).width

  return [...shown].map((letter, index) => {
    const next = shown[index + 1]

    return next ? (width(letter + next) - width(letter) - width(next)) / 100 : 0
  })
}

const MaskedWord = ({ text, delay, from, reverse = false }: MaskedWordProps) => {
  const [kerning, setKerning] = useState<number[]>([])
  const wordRef = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReduce()
  const started = useIntroStarted()
  const letters = [...text]
  const offset = from === 'below' ? '105%' : '-105%'

  useEffect(() => {
    let active = true

    document.fonts.ready.then(() => {
      if (active && wordRef.current) setKerning(measureKerning(wordRef.current, text))
    })

    return () => {
      active = false
    }
  }, [text])

  return (
    <span ref={wordRef} aria-hidden className='inline-block whitespace-nowrap'>
      {letters.map((letter, index) => {
        const order = reverse ? letters.length - 1 - index : index

        return (
          <span key={`${letter}-${index}`} className='ea-letter-mask inline-block' style={kerning[index] ? { marginRight: `${kerning[index]}em` } : undefined}>
            <m.span
              className='inline-block'
              initial={{ transform: `translateY(${offset})` }}
              animate={started ? { transform: 'translateY(0%)' } : undefined}
              transition={reveal(reduceMotion, delay + order * MOTION.letterStagger, 1.05)}
            >
              {letter}
            </m.span>
          </span>
        )
      })}
    </span>
  )
}

type CursorMode = 'dot' | 'link' | 'read'

const TRAIL_SPRING = { stiffness: 420, damping: 34, mass: 0.5 }

const modeFor = (target: EventTarget | null): CursorMode => {
  if (!(target instanceof Element)) return 'dot'
  if (target.closest('.ea-strip-item')) return 'read'
  if (target.closest('a, button')) return 'link'

  return 'dot'
}

/** Cursor da hero: ponto rosa; sobre links vira anel; sobre o CD vira um disco que diz o rótulo (ex.: "Ver") */
const InkCursor = () => {
  const [mode, setMode] = useState<CursorMode>('dot')
  const rootRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<CursorMode>('dot')
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const visible = useMotionValue(0)
  const trailX = useSpring(x, TRAIL_SPRING)
  const trailY = useSpring(y, TRAIL_SPRING)
  const { hero } = useElias()
  const { dot, ring, disc } = MOTION.cursor

  useEffect(() => {
    const section = rootRef.current?.parentElement

    if (!section) return

    const handleMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect()
      const next = modeFor(event.target)

      x.set(event.clientX - rect.left)
      y.set(event.clientY - rect.top)
      visible.set(1)

      if (next !== modeRef.current) {
        modeRef.current = next
        setMode(next)
      }
    }

    const handleLeave = () => visible.set(0)

    section.addEventListener('pointermove', handleMove, { passive: true })
    section.addEventListener('pointerleave', handleLeave)

    return () => {
      section.removeEventListener('pointermove', handleMove)
      section.removeEventListener('pointerleave', handleLeave)
    }
  }, [x, y, visible])

  return (
    <div ref={rootRef} aria-hidden className='pointer-events-none absolute inset-0 z-[60] overflow-hidden'>
      <m.div className='absolute top-0 left-0' style={{ x: trailX, y: trailY, opacity: visible }}>
        <m.div
          className='border-ea-accent absolute rounded-full border-[1.5px]'
          style={{ width: ring, height: ring, left: -ring / 2, top: -ring / 2 }}
          initial={{ transform: 'scale(0.2)', opacity: 0 }}
          animate={mode === 'link' ? { transform: 'scale(1)', opacity: 1 } : { transform: 'scale(0.2)', opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        />
        <m.div
          className='bg-ea-accent text-ea-dark absolute grid place-items-center rounded-full text-[11px] font-medium tracking-[0.18em] uppercase'
          style={{ width: disc, height: disc, left: -disc / 2, top: -disc / 2, fontFamily: 'JfMarker, sans-serif' }}
          initial={{ transform: 'scale(0)', opacity: 0 }}
          animate={mode === 'read' ? { transform: 'scale(1)', opacity: 1 } : { transform: 'scale(0)', opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {hero.cursorLabel}
        </m.div>
      </m.div>

      <m.div className='absolute top-0 left-0' style={{ x, y, opacity: visible }}>
        <m.div
          className='bg-ea-accent ring-ea-page absolute rounded-full ring-2'
          style={{ width: dot, height: dot, left: -dot / 2, top: -dot / 2 }}
          animate={{ transform: mode === 'dot' ? 'scale(1)' : mode === 'link' ? 'scale(0.5)' : 'scale(0)' }}
          transition={{ duration: 0.3, ease: EASE }}
        />
      </m.div>
    </div>
  )
}

const SWEEP_EASE = [0.76, 0, 0.24, 1] as const
const FLOOD = { fromRadius: 70, toRadius: 760 }

/**
 * Abertura numa página rosa: o nome é desenhado em contorno, um círculo de luz o enche de tinta e a página
 * se abre num buraco que revela a hero escura.
 */
const InkSplash = ({ onOpen }: { onOpen: () => void }) => {
  const { hero } = useElias()
  const [tracing, setTracing] = useState(false)
  const [done, setDone] = useState(false)
  const openedRef = useRef(false)
  const clipId = useId()
  const wipeId = useId()
  const hole = useMotionValue(0)
  const holeEdge = useTransform(hole, value => value - 1)
  const maskImage = useMotionTemplate`radial-gradient(circle ${hole}px at 50% 50%, transparent ${holeEdge}px, #000 ${hole}px)`

  const open = useCallback(() => {
    if (openedRef.current) return

    openedRef.current = true
    onOpen()

    const radius = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 24

    animate(hole, radius, { duration: SPLASH.openDuration, ease: SWEEP_EASE }).then(() => setDone(true))
  }, [hole, onOpen])

  useEffect(() => {
    let active = true
    const timeout = new Promise(resolve => window.setTimeout(resolve, SPLASH.fontTimeout * 1000))

    Promise.race([document.fonts.ready, timeout]).then(() => {
      if (active) setTracing(true)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!tracing) return

    const timer = window.setTimeout(open, SPLASH.openAt * 1000)

    return () => window.clearTimeout(timer)
  }, [tracing, open])

  // Segura a página enquanto o splash cobre; qualquer tecla ou toque pula para a abertura
  useEffect(() => {
    if (done) return

    const root = document.documentElement
    const previous = root.style.overflow

    root.style.overflow = 'hidden'
    window.addEventListener('keydown', open)

    return () => {
      root.style.overflow = previous
      window.removeEventListener('keydown', open)
    }
  }, [done, open])

  if (done) return null

  const first = hero.name.first.toUpperCase()
  const last = hero.name.last.toUpperCase()

  return (
    <m.div aria-hidden className='ea-splash bg-ea-accent fixed top-0 left-0 z-50 flex h-svh w-full flex-col' style={{ maskImage, WebkitMaskImage: maskImage }} onPointerDown={open}>
      <div className='ea-wrap flex h-19 shrink-0 items-center'>
        <m.p
          className='text-ea-dark/70 flex gap-[0.6em] text-[11px] font-medium tracking-[0.2em] uppercase'
          initial={{ opacity: 0 }}
          animate={tracing ? { opacity: 1 } : undefined}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          {hero.roles.map((role, index) => (
            <Fragment key={role}>
              {index > 0 && <span>/</span>}
              <span>{role}</span>
            </Fragment>
          ))}
        </m.p>
      </div>

      <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
        <svg viewBox='0 23 1000 414' className='ea-splash-name font-ea-display font-black'>
          <defs>
            <clipPath id={wipeId}>
              <m.rect x={0} y={0} width={1000} height={440} style={{ originX: 0 }} initial={{ scaleX: 0 }} animate={tracing ? { scaleX: 1 } : undefined} transition={{ delay: SPLASH.drawAt, duration: SPLASH.drawDuration, ease: EASE }} />
            </clipPath>
            <clipPath id={clipId}>
              <m.circle
                cx={0}
                cy={230}
                r={FLOOD.fromRadius}
                initial={{ x: -260, scale: 1 }}
                animate={tracing ? { x: 500, scale: FLOOD.toRadius / FLOOD.fromRadius } : undefined}
                transition={{ delay: SPLASH.floodAt, duration: SPLASH.floodDuration, ease: SWEEP_EASE }}
              />
            </clipPath>
          </defs>

          <g clipPath={`url(#${wipeId})`} filter='url(#ea-ink-outline)' textAnchor='middle'>
            <text x={500} y={255} fontSize={190} letterSpacing='0.02em' fill='#111111'>
              {first}
            </text>
            <text x={500} y={424} fontSize={150} letterSpacing='0.02em' fill='var(--color-ea-ink)'>
              {last}
            </text>
          </g>

          <g clipPath={`url(#${clipId})`} textAnchor='middle'>
            <text x={500} y={255} fontSize={190} letterSpacing='0.02em' fill='#111111'>
              {first}
            </text>
            <text x={500} y={424} fontSize={150} letterSpacing='0.02em' fill='var(--color-ea-ink)'>
              {last}
            </text>
          </g>
        </svg>
      </div>
    </m.div>
  )
}

type NavLinkProps = { label: string; href: string; active?: boolean; step: number }

const NavLink = ({ label, href, active = false, step }: NavLinkProps) => {
  const reduceMotion = useReduce()
  const started = useIntroStarted()

  return (
    <m.li initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={started ? { opacity: 1, transform: 'translateY(0px)' } : undefined} transition={reveal(reduceMotion, MOTION.delays.nav + 0.15 + step * 0.08, 0.8)}>
      <a href={href} aria-current={active ? 'page' : undefined} className={cn('ea-nav-link inline-flex min-h-10 items-center gap-2 font-medium uppercase', active ? 'text-ea-accent' : 'text-ea-ink')}>
        <span className='ea-roll'>
          <span>{label}</span>
          <span aria-hidden>{label}</span>
        </span>
      </a>
    </m.li>
  )
}

const HeroNavbar = () => {
  const { hero } = useElias()
  const reduceMotion = useReduce()
  const started = useIntroStarted()

  return (
    <header className='ea-wrap'>
      <nav aria-label='Principal' className='ea-nav'>
        <a href='#top' className='ea-nav-logo font-ea-display text-ea-accent overflow-y-clip leading-none font-black tracking-[-0.045em] uppercase'>
          <m.span className='block' initial={{ transform: 'translateY(105%)' }} animate={started ? { transform: 'translateY(0%)' } : undefined} transition={reveal(reduceMotion, MOTION.delays.nav, 0.9)}>
            {hero.brand}
          </m.span>
        </a>

        <m.p className='ea-nav-status' initial={{ opacity: 0 }} animate={started ? { opacity: 1 } : undefined} transition={reveal(reduceMotion, MOTION.delays.nav + 0.5, 0.8)}>
          <span aria-hidden className='ea-nav-status-dot' />
          {hero.status.label}
          <span aria-hidden className='text-ea-accent'>
            ·
          </span>
          <span className='text-ea-ink'>{hero.status.detail}</span>
        </m.p>

        <ul className='ea-nav-left'>
          {hero.navLeft.map((link, index) => (
            <NavLink key={link.label} {...link} active={index === 0} step={hero.navLeft.length - 1 - index} />
          ))}
        </ul>

        <ul className='ea-nav-right'>
          {hero.navRight.map((link, index) => (
            <NavLink key={link.label} {...link} step={index} />
          ))}
        </ul>

        <m.div
          className='ea-nav-cta'
          initial={{ opacity: 0, transform: 'translateY(8px)' }}
          animate={started ? { opacity: 1, transform: 'translateY(0px)' } : undefined}
          transition={reveal(reduceMotion, MOTION.delays.nav + 0.15 + hero.navRight.length * 0.08, 0.8)}
        >
          <InkButton label={hero.navCta.label} href={hero.navCta.href} icon='up-right' />
        </m.div>
      </nav>
    </header>
  )
}

const WRITTEN = {
  hidden: { opacity: 0, transform: 'translateY(0.45em)', clipPath: 'inset(0% 0% 100% 0%)' },
  shown: { opacity: 1, transform: 'translateY(0em)', clipPath: 'inset(-20% -5% -35% -5%)' }
}

const HeroIntro = () => {
  const { hero } = useElias()
  const reduceMotion = useReduce()
  const started = useIntroStarted()
  const start = MOTION.delays.intro

  return (
    <div className='ea-intro'>
      <m.p className='ea-intro-roles text-ea-ink font-medium uppercase' initial={WRITTEN.hidden} animate={started ? WRITTEN.shown : undefined} transition={reveal(reduceMotion, start, 0.9)}>
        {hero.roles.map((role, index) => (
          <Fragment key={role}>
            {index > 0 && (
              <span aria-hidden className='text-ea-accent'>
                /
              </span>
            )}
            <span>{role}</span>
          </Fragment>
        ))}
      </m.p>

      <p className='ea-intro-headline text-ea-ink font-medium'>
        {hero.headline.map((line, index) => (
          <m.span key={line} className='block' initial={WRITTEN.hidden} animate={started ? WRITTEN.shown : undefined} transition={reveal(reduceMotion, start + 0.1 + index * 0.09, 1)}>
            {line}
          </m.span>
        ))}
      </p>

      <m.hr className='ea-intro-rule bg-ea-accent origin-left border-0' initial={{ transform: 'scaleX(0)' }} animate={started ? { transform: 'scaleX(1)' } : undefined} transition={reveal(reduceMotion, start + 0.45, 0.9)} />

      <m.p className='ea-intro-description text-ea-muted font-light' initial={{ opacity: 0, transform: 'translateY(10px)' }} animate={started ? { opacity: 1, transform: 'translateY(0px)' } : undefined} transition={reveal(reduceMotion, start + 0.55, 0.9)}>
        {hero.description}
      </m.p>
    </div>
  )
}

const SocialLinks = () => {
  const { hero } = useElias()
  const reduceMotion = useReduce()
  const started = useIntroStarted()
  const enter = (step: number) => reveal(reduceMotion, MOTION.delays.socials + step * 0.07, 0.8)

  return (
    <ul aria-label='Redes' className='ea-socials text-ea-ink flex items-center gap-2.5 text-[14px] lg:gap-2 lg:text-[13px]'>
      {hero.socials.map((link, index) => {
        const external = link.href.startsWith('http')

        return (
          <Fragment key={link.label}>
            {index > 0 && (
              <m.li aria-hidden className='text-ea-accent' initial={{ opacity: 0 }} animate={started ? { opacity: 1 } : undefined} transition={enter(index * 2 - 1)}>
                /
              </m.li>
            )}
            <m.li initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={started ? { opacity: 1, transform: 'translateY(0px)' } : undefined} transition={enter(index * 2)}>
              <a href={link.href} {...(external ? { target: '_blank', rel: 'noopener' } : {})} className='ea-link inline-flex min-h-10 items-center'>
                {link.label}
              </a>
            </m.li>
          </Fragment>
        )
      })}
    </ul>
  )
}

type Stage = 'typing' | 'pressing' | 'sealing'

const pad = (value: number) => String(value).padStart(2, '0')

const tomorrowLabel = () => {
  const date = new Date()

  date.setDate(date.getDate() + 1)

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

/** O envelope visto de trás, feito em código: carta entra no bolso, aba fecha, lacre e carimbo do dia seguinte */
const Envelope = ({ date }: { date: string }) => {
  const { hero } = useElias()
  const reduceMotion = useReduce()
  const timing = (delay: number, duration: number) => (reduceMotion ? { duration: 0 } : { delay, duration, ease: EASE })

  return (
    <span aria-hidden className='ea-envelope'>
      <m.span className='ea-envelope-letter' initial={{ transform: 'translateY(-78%)' }} animate={{ transform: 'translateY(6%)' }} transition={timing(0.2, 1.05)} />
      <span className='ea-envelope-side ea-envelope-left' />
      <span className='ea-envelope-side ea-envelope-right' />
      <span className='ea-envelope-bottom' />
      <m.span className='ea-envelope-flap' initial={{ transform: 'rotateX(180deg)', opacity: 0 }} animate={{ transform: 'rotateX(0deg)', opacity: 1 }} transition={timing(1.2, 0.95)}>
        <span className='ea-envelope-flap-shape' />
      </m.span>
      <m.span className='ea-wax-seal font-ea-display' initial={{ transform: 'scale(2.2)', opacity: 0 }} animate={{ transform: 'scale(1)', opacity: 1 }} transition={timing(2.25, 0.55)}>
        {hero.letter.seal}
      </m.span>
      <m.span className='ea-postmark' initial={{ transform: 'scale(1.7) rotate(-34deg)', opacity: 0 }} animate={{ transform: 'scale(1) rotate(-12deg)', opacity: 1 }} transition={timing(2.75, 0.55)}>
        <span>{hero.letter.postmark}</span>
        <span className='ea-postmark-date'>{date}</span>
      </m.span>
    </span>
  )
}

/** Carta para as marcas: cada promessa é digitada na folha, o carimbo bate, e ela vai para o envelope lacrado */
const BrandLetter = () => {
  const { hero } = useElias()
  const letter = hero.letter
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState(0)
  const [stage, setStage] = useState<Stage>('typing')
  const waitedRef = useRef({ step: '', ms: 0 })
  const reduceMotion = useReduce()
  const started = useIntroStarted()
  const onScreen = useHeroOnScreen()
  const timing = MOTION.letter
  const message = letter.messages[index]
  const shown = reduceMotion ? message : message.slice(0, typed)
  const finished = shown.length === message.length
  const swap = reduceMotion ? { duration: 0 } : { duration: 0.75, ease: EASE }

  useEffect(() => {
    if (!started || reduceMotion || !onScreen) return

    let delay: number
    let step: () => void

    if (stage === 'typing' && typed < message.length) {
      const previous = message[typed - 1] ?? ''

      delay = timing.perCharacter + (/[,.]/.test(previous) ? timing.pauseAfterPunctuation : 0)
      step = () => setTyped(count => count + 1)
    } else if (stage === 'typing') {
      delay = timing.beforeSeal
      step = () => setStage('pressing')
    } else if (stage === 'pressing') {
      delay = timing.press
      step = () => setStage('sealing')
    } else {
      delay = timing.sealHold

      step = () => {
        setIndex(current => (current + 1) % letter.messages.length)
        setTyped(0)
        setStage('typing')
      }
    }

    const key = `${index}:${stage}:${typed}`
    const waited = waitedRef.current.step === key ? waitedRef.current.ms : 0
    const begun = performance.now() - waited
    const timer = window.setTimeout(step, Math.max(0, delay * 1000 - waited))

    return () => {
      waitedRef.current = { step: key, ms: performance.now() - begun }
      window.clearTimeout(timer)
    }
  }, [started, reduceMotion, onScreen, index, stage, typed, message, timing, letter.messages.length])

  return (
    <m.section aria-label={letter.eyebrow} className='ea-pad' initial={{ clipPath: 'inset(0% 0% 0% 100%)' }} animate={started ? { clipPath: 'inset(-10% -10% 0% -10%)' } : undefined} transition={reveal(reduceMotion, MOTION.delays.pad, 1.15)}>
      <p className='sr-only'>{`${letter.greeting} ${letter.messages[0]}`}</p>

      <div aria-hidden className='ea-pad-inner'>
        <AnimatePresence mode='wait' initial={false}>
          {stage !== 'sealing' ? (
            <m.div key={`sheet-${index}`} className='ea-letter-sheet' initial={{ opacity: 0, transform: 'translateY(28px) rotate(-1.4deg)' }} animate={{ opacity: 1, transform: 'translateY(0px) rotate(-1.4deg)' }} exit={{ opacity: 0, transform: 'translateY(40px) scale(0.94) rotate(-1.4deg)' }} transition={swap}>
              <p className='ea-letter-eyebrow'>{letter.eyebrow}</p>
              <span className={cn('ea-letter-stamp', finished && 'is-ready', stage === 'pressing' && 'is-pressed')}>{letter.stamp}</span>
              <p className='ea-letter-greeting'>{letter.greeting}</p>
              <p className='ea-letter-field ea-letter-read'>
                {shown}
                {stage === 'typing' && !reduceMotion && <span className='ea-letter-caret' />}
              </p>
              <p className='ea-letter-meta'>
                {letter.counter} {pad(index + 1)} / {pad(letter.messages.length)}
              </p>
            </m.div>
          ) : (
            <m.div key={`envelope-${index}`} className='ea-letter-envelope-view' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: '70%', rotate: 8 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.6, 0, 0.35, 1] }}>
              <p className='ea-letter-eyebrow'>
                {letter.sealing} · {tomorrowLabel()}
              </p>
              <Envelope date={tomorrowLabel()} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.section>
  )
}

/** Um Reel dentro da faixa: toca mudo e em loop só enquanto a hero aparece; com movimento reduzido fica no poster */
const StripVideo = ({ video, reduced }: { video: Video; reduced: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null)
  const onScreen = useHeroOnScreen()

  useEffect(() => {
    const el = ref.current

    if (!el) return

    el.muted = true

    if (reduced || !onScreen) el.pause()
    else void el.play().catch(() => undefined)
  }, [reduced, onScreen])

  return <video ref={ref} className='ea-strip-video' src={video.src} poster={video.poster} autoPlay={!reduced} muted loop playsInline preload='metadata' tabIndex={-1} />
}

/**
 * Faixa de vídeos: os Reels tocando lado a lado (mudos, em loop). Cada vídeo abre o Reel no Instagram. Com mais
 * vídeos do que cabem, a faixa rola para o lado; os vídeos vêm de `creator.videos`, que o editor controla.
 */
const VideoStrip = () => {
  const { hero, videos } = useElias()
  const reduceMotion = useReduce()
  const started = useIntroStarted()
  const profile = hero.socials[0]?.href

  return (
    <figure className='ea-book'>
      <m.div
        className='ea-strip'
        initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
        animate={started ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
        transition={reveal(reduceMotion, MOTION.delays.book, 1.05)}
      >
        {videos.map((video, index) => {
          const edit = { 'data-edit': `creator.videos.${index}` }
          const inner = <StripVideo video={video} reduced={Boolean(reduceMotion)} />

          return video.reelUrl ? (
            <a key={video.id} className='ea-strip-item' href={video.reelUrl} target='_blank' rel='noopener' aria-label={`${hero.discOpen}: ${video.alt}`} {...edit}>
              {inner}
            </a>
          ) : (
            <div key={video.id} className='ea-strip-item' role='img' aria-label={video.alt} {...edit}>
              {inner}
            </div>
          )
        })}
      </m.div>

      <figcaption className='ea-book-caption flex items-center gap-3'>
        <m.span className='ea-book-label text-ea-ink mr-auto text-[15px] font-medium whitespace-nowrap' initial={{ opacity: 0, transform: 'translateX(-12px)' }} animate={started ? { opacity: 1, transform: 'translateX(0px)' } : undefined} transition={reveal(reduceMotion, MOTION.delays.book + 0.45, 0.8)}>
          {hero.discLabel}
        </m.span>
        {profile && (
          <m.a
            href={profile}
            target='_blank'
            rel='noopener'
            aria-label={hero.discOpen}
            className='ea-book-arrow relative shrink-0 rounded-full after:absolute after:-inset-2'
            initial={{ transform: 'scale(0) rotate(-90deg)' }}
            animate={started ? { transform: 'scale(1) rotate(0deg)' } : undefined}
            transition={reveal(reduceMotion, MOTION.delays.book + 0.7, 0.7)}
          >
            <span className='ea-cta-mark ea-cta-diagonal'>
              <ArrowUpRightIcon aria-hidden className='ea-cta-arrow ea-cta-arrow-out' strokeWidth={2} />
              <ArrowUpRightIcon aria-hidden className='ea-cta-arrow ea-cta-arrow-in' strokeWidth={2} />
            </span>
          </m.a>
        )}
      </figcaption>
    </figure>
  )
}

const DEPTH_SPRING = { stiffness: 50, damping: 18, mass: 0.9 }
const SPOT_SPRING = { stiffness: 380, damping: 36, mass: 0.6 }

/**
 * Pintada de trás para frente: nome gigante, CDs e carta, depois o retrato. Com mouse, retrato e nome se afastam
 * (profundidade) e um holofote de tinta segue o cursor: dentro dele o nome vira contorno e o retrato vira duotone.
 */
const HeroSection = () => {
  const { hero, videos, portrait, reduced } = useElias()
  const [opened, setOpened] = useState(false)
  const [spotReady, setSpotReady] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const spotOpenRef = useRef(false)
  const reduceMotion = useReduce()
  const finePointer = useMediaQuery(MEDIA.finePointer)
  const composition = useMediaQuery(MEDIA.composition)
  const mediaReduced = useMediaQuery(MEDIA.reducedMotion)
  const prefersReduced = reduced ?? mediaReduced
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const depthX = useSpring(pointerX, DEPTH_SPRING)
  const depthY = useSpring(pointerY, DEPTH_SPRING)
  const firstX = useTransform(depthX, value => value * -MOTION.depth.first)
  const firstY = useTransform(depthY, value => value * -MOTION.depth.first * 0.4)
  const lastX = useTransform(depthX, value => value * -MOTION.depth.last)
  const lastY = useTransform(depthY, value => value * -MOTION.depth.last * 0.3)
  const portraitX = useTransform(depthX, value => value * MOTION.depth.portrait)
  const spotX = useMotionValue(0)
  const spotY = useMotionValue(0)
  const spotRadius = useMotionValue(0)
  const spotCentreX = useSpring(spotX, SPOT_SPRING)
  const spotCentreY = useSpring(spotY, SPOT_SPRING)
  const spotXVar = useMotionTemplate`${spotCentreX}px`
  const spotYVar = useMotionTemplate`${spotCentreY}px`
  const spotRadiusVar = useMotionTemplate`${spotRadius}px`
  const { delays, spotlight } = MOTION
  const depthActive = finePointer && !reduceMotion
  const spotActive = depthActive && composition && spotReady && Boolean(portrait)
  const started = opened || prefersReduced
  const cursorActive = finePointer && !prefersReduced
  const canvasStyle = {
    '--ea-spot-x': spotXVar,
    '--ea-spot-y': spotYVar,
    '--ea-spot-r': spotRadiusVar,
    '--ea-portrait-ratio': portrait ? portrait.width / portrait.height : 0.8
  } as MotionStyle

  useEffect(() => {
    if (!started) return

    const timer = window.setTimeout(() => setSpotReady(true), spotlight.readyAfter * 1000)

    return () => window.clearTimeout(timer)
  }, [started, spotlight.readyAfter])

  useEffect(() => {
    const section = sectionRef.current

    if (!section) return

    let visible = true

    const update = () => setOnScreen(visible && !document.hidden)

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    })

    observer.observe(section)
    document.addEventListener('visibilitychange', update)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const handleSplashOpen = useCallback(() => setOpened(true), [])

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!depthActive) return

    pointerX.set((event.clientX / window.innerWidth) * 2 - 1)
    pointerY.set((event.clientY / window.innerHeight) * 2 - 1)

    if (!spotActive || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (!spotOpenRef.current) {
      spotOpenRef.current = true

      if (spotRadius.get() < 1) {
        spotCentreX.jump(x)
        spotCentreY.jump(y)
      }

      animate(spotRadius, spotlight.radius, { duration: 0.6, ease: EASE })
    }

    spotX.set(x)
    spotY.set(y)
  }

  const handlePointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
    spotOpenRef.current = false
    animate(spotRadius, 0, { duration: 0.45, ease: EASE })
  }

  const fullName = `${hero.name.first} ${hero.name.last}`

  return (
    <section ref={sectionRef} id='top' aria-label={fullName} className={cn('ea-hero bg-ea-page text-ea-ink font-ea-sans relative', cursorActive && 'ea-has-cursor')} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <InkFilters />
      {cursorActive && <InkCursor />}
      {!prefersReduced && <InkSplash onOpen={handleSplashOpen} />}

      <IntroContext.Provider value={started}>
        <HeroNavbar />

        <div className='ea-wrap ea-stage'>
          <m.div ref={canvasRef} className='ea-canvas' style={canvasStyle}>
            <div className='ea-figure'>
              <div className='ea-layer ea-layer-name ea-layer-base'>
                <h1 className='ea-name font-ea-display font-black uppercase'>
                  <span className='sr-only'>{fullName}</span>
                  <m.span className='ea-name-first text-ea-accent' style={{ x: firstX, y: firstY }}>
                    <MaskedWord text={hero.name.first} delay={delays.first} from='below' />
                  </m.span>
                  <m.span className='ea-name-last text-ea-ink' style={{ x: lastX, y: lastY }}>
                    <MaskedWord text={hero.name.last} delay={delays.last} from='above' reverse />
                  </m.span>
                </h1>
              </div>

              {spotActive && (
                <div aria-hidden className='ea-layer ea-layer-name ea-layer-ink'>
                  <div className='ea-name font-ea-display font-black uppercase'>
                    <m.span className='ea-name-first ea-ink-first' style={{ x: firstX, y: firstY }}>
                      {hero.name.first}
                    </m.span>
                    <m.span className='ea-name-last ea-ink-last' style={{ x: lastX, y: lastY }}>
                      {hero.name.last}
                    </m.span>
                  </div>
                </div>
              )}

              <div className='ea-layer ea-layer-portrait ea-layer-base'>
                {portrait && (
                  <m.img
                    src={portrait.src}
                    alt={portrait.alt}
                    width={portrait.width}
                    height={portrait.height}
                    fetchPriority='high'
                    decoding='async'
                    className='ea-portrait origin-bottom'
                    style={{ x: portraitX }}
                    initial={{ clipPath: 'inset(100% 0% 0% 0%)', scale: 1.06 }}
                    animate={started ? { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 } : undefined}
                    transition={reveal(reduceMotion, delays.portrait, 1.3)}
                  />
                )}
              </div>

              {spotActive && portrait && (
                <div aria-hidden className='ea-layer ea-layer-portrait ea-layer-ink'>
                  <m.img src={portrait.src} alt='' width={portrait.width} height={portrait.height} decoding='async' className='ea-portrait ea-ink-portrait' style={{ x: portraitX }} />
                </div>
              )}
            </div>

            <HeroIntro />
            <OnScreenContext.Provider value={onScreen}>
              {hero.letter.messages.length > 0 && <BrandLetter />}
              {videos.length > 0 && <VideoStrip />}
            </OnScreenContext.Provider>
            <SocialLinks />
          </m.div>
        </div>
      </IntroContext.Provider>
    </section>
  )
}

const useImageSize = (src: string | undefined) => {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (!src) return setSize(null)

    const image = new Image()

    image.onload = () => setSize({ width: image.naturalWidth, height: image.naturalHeight })
    image.src = src
  }, [src])

  return size
}

const BLOCK_CSS = `
.ea-hero {
  --color-ea-page: #111111;
  --color-ea-accent: #e2789a;
  --color-ea-ink: #f2efe9;
  --color-ea-dark: #111111;
  --color-ea-muted: rgb(242 239 233 / 0.62);
  --color-ea-paper: #1d1a1b;
  --font-ea-display: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-ea-sans: JfSans, ui-sans-serif, system-ui, sans-serif;
}

@layer utilities {
  .bg-ea-page { background-color: var(--color-ea-page); }
  .bg-ea-accent { background-color: var(--color-ea-accent); }
  .text-ea-page { color: var(--color-ea-page); }
  .text-ea-dark { color: var(--color-ea-dark); }
  .text-ea-dark\\/70 { color: color-mix(in oklab, var(--color-ea-dark) 70%, transparent); }
  .text-ea-ink { color: var(--color-ea-ink); }
  .text-ea-accent { color: var(--color-ea-accent); }
  .text-ea-muted { color: var(--color-ea-muted); }
  .border-ea-accent { border-color: var(--color-ea-accent); }
  .ring-ea-page { --tw-ring-color: var(--color-ea-page); }
  .font-ea-display { font-family: var(--font-ea-display); }
  .font-ea-sans { font-family: var(--font-ea-sans); }
}

.ea-hero {
  --ea-gutter: 16px;
  --ea-nav-h: 84px;
  --ea-w: min(100cqw - 2 * var(--ea-gutter), 1440px);
  container-type: inline-size;
  min-height: 100svh;
  overflow: clip;
}

@media (min-width: 640px) { .ea-hero { --ea-gutter: 24px; } }
@media (min-width: 1024px) { .ea-hero { --ea-gutter: 40px; } }

.ea-wrap { width: var(--ea-w); margin-inline: auto; }

.ea-nav {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(4, auto);
  justify-content: space-between;
  align-items: center;
  row-gap: 6px;
  padding-block: 14px 6px;
}

.ea-nav-logo { grid-row: 1; grid-column: 1 / -1; justify-self: center; font-size: 28px; }
.ea-nav-cta { grid-row: 1; grid-column: 1 / -1; justify-self: end; }
.ea-nav-left, .ea-nav-right { display: contents; white-space: nowrap; }
.ea-nav-left > li, .ea-nav-right > li { grid-row: 2; }

@media (max-width: 1023px) {
  .ea-nav-cta .ea-cta { gap: 0; padding: 4px; }
  .ea-nav-cta .ea-cta-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}

.ea-nav-status { display: none; }

.ea-roll { position: relative; display: inline-block; overflow: hidden; line-height: 1.25; }
.ea-roll > span { display: block; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.ea-roll > span + span { position: absolute; inset: 0; transform: translateY(100%); }

@media (hover: hover) {
  .ea-nav-link:hover .ea-roll > span:first-child { transform: translateY(-100%); }
  .ea-nav-link:hover .ea-roll > span + span { transform: translateY(0); }
}

.ea-nav-link { font-size: clamp(12px, 3.4vw, 13px); letter-spacing: 0.06em; }
.ea-nav-link[aria-current='page']::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

@media (min-width: 640px) {
  .ea-nav {
    --ea-nav-u: calc(100cqw / 1280);
    --ea-nav-gap: clamp(16px, 2.6vw, 28px);
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas: 'left logo right';
    justify-content: normal;
    height: var(--ea-nav-h);
    padding-block: 0;
  }
  .ea-nav-logo { grid-area: logo; font-size: clamp(26px, 29 * var(--ea-nav-u), 32px); }
  .ea-nav-left, .ea-nav-right { display: flex; }
  .ea-nav-left { grid-area: left; justify-self: end; gap: var(--ea-nav-gap); margin-right: var(--ea-nav-gap); }
  .ea-nav-right { grid-area: right; justify-self: start; gap: var(--ea-nav-gap); margin-left: var(--ea-nav-gap); }
  .ea-nav-cta { grid-area: right; }
  .ea-nav-link { font-size: clamp(13px, 14 * var(--ea-nav-u), 15px); }
}

@media (min-width: 1024px) { .ea-nav { --ea-nav-gap: clamp(36px, 64 * var(--ea-nav-u), 80px); } }

@media (min-width: 1280px) {
  .ea-nav-status {
    grid-area: left;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-ea-muted);
    font-family: JfMarker, sans-serif;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .ea-nav-status-dot { position: relative; width: 7px; height: 7px; margin-right: 2px; border-radius: 50%; background: var(--color-ea-accent); }
  .ea-nav-status-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: var(--color-ea-accent); animation: ea-breathe 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
}

/* Botão de tinta: pílula vazada com disco rosa; no hover a tinta enche a pílula a partir do disco */
.ea-cta {
  --ea-cta-mark: 34px;
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  height: 44px;
  padding-inline: 20px 5px;
  overflow: hidden;
  border: 1px solid rgb(242 239 233 / 0.4);
  border-radius: 999px;
  color: var(--color-ea-ink);
  font-family: JfMarker, sans-serif;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.ea-cta::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: 50%;
  right: calc(5px + var(--ea-cta-mark) / 2);
  width: var(--ea-cta-mark);
  height: var(--ea-cta-mark);
  margin: calc(var(--ea-cta-mark) / -2) calc(var(--ea-cta-mark) / -2) 0 0;
  border-radius: 50%;
  background: var(--color-ea-ink);
  transform: scale(0);
  transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}

.ea-cta-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--ea-cta-mark);
  height: var(--ea-cta-mark);
  overflow: hidden;
  border-radius: 50%;
  background: var(--color-ea-accent);
  color: var(--color-ea-dark);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.ea-cta-arrow { position: absolute; width: 44%; height: 44%; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.ea-cta-arrow-in { transform: translateX(-160%); }
.ea-cta-diagonal .ea-cta-arrow-in { transform: translate(-160%, 160%); }

@media (hover: hover) {
  .ea-cta:hover { border-color: var(--color-ea-ink); color: var(--color-ea-dark); }
  .ea-cta:hover::before { transform: scale(14); }
  .ea-cta:hover .ea-cta-mark { transform: scale(1.06); }
  .ea-cta:hover .ea-cta-arrow-out { transform: translateX(160%); }
  .ea-cta-diagonal:hover .ea-cta-arrow-out { transform: translate(160%, -160%); }
  .ea-cta:hover .ea-cta-arrow-in { transform: translate(0, 0); }
}

.ea-cta:focus-visible { border-color: var(--color-ea-ink); color: var(--color-ea-dark); outline: 2px solid var(--color-ea-accent); outline-offset: 3px; }
.ea-cta:focus-visible::before { transform: scale(14); }

.ea-stage { padding-block: 12px 40px; }

.ea-canvas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'figure' 'intro' 'pad' 'book' 'socials';
  row-gap: 40px;
}

.ea-figure { grid-area: figure; position: relative; container-type: inline-size; }
.ea-layer { display: contents; }

.ea-ink-first, .ea-ink-last { color: var(--color-ea-accent); filter: url(#ea-ink-outline); }
.ea-ink-last { color: var(--color-ea-ink); }
.ea-ink-portrait { filter: url(#ea-ink-duotone); }

.ea-name { position: relative; display: flex; flex-direction: column; line-height: 0.8; font-weight: 900; }
.ea-name-first, .ea-name-last { letter-spacing: 0.02em; }
.ea-name { --ea-mask-top: 0.015em; --ea-mask-bottom: 0.015em; }
.ea-letter-mask { clip-path: inset(var(--ea-mask-top) -0.25em var(--ea-mask-bottom) -0.25em); }

/* HELAYNE e OBERZINER: tamanhos em cqw para cada linha ocupar a largura do quadro */
.ea-name-first { font-size: 19.4cqw; margin-left: -0.05em; }
.ea-name-last { align-self: flex-end; font-size: 16cqw; margin-right: -0.04em; }

.ea-figure::after {
  content: '';
  display: block;
  width: 64cqw;
  height: 60cqw;
  margin: 3cqw 0 0 auto;
  border-radius: 10px 10px 0 0;
  background: var(--color-ea-paper);
}

.ea-portrait { position: absolute; z-index: 1; top: 9cqw; left: -3cqw; height: calc(100% - 9cqw); width: auto; max-width: none; }

.ea-intro { grid-area: intro; }
.ea-intro-roles { display: flex; flex-wrap: wrap; gap: 0.75em; font-family: JfMarker, sans-serif; font-size: 12px; letter-spacing: 0.18em; margin-bottom: 14px; }
.ea-intro-headline { font-size: 24px; line-height: 1.14; letter-spacing: -0.01em; margin-bottom: 22px; }
.ea-intro-rule { width: 52px; height: 2px; margin-bottom: 22px; }
.ea-intro-description { max-width: 260px; font-size: 15px; line-height: 1.55; }

.ea-book { grid-area: book; }
.ea-book-caption { margin-top: 12px; }
.ea-socials { grid-area: socials; }

@media (min-width: 640px) {
  .ea-canvas {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: 'figure figure' 'intro book' 'pad pad' 'socials socials';
    column-gap: 32px;
  }
  .ea-figure::after { height: 48cqw; }
}

/* Carta para as marcas */
.ea-pad { grid-area: pad; position: relative; }
.ea-pad-inner { display: flex; flex-direction: column; height: 100%; min-height: 380px; }
.ea-letter-sheet, .ea-letter-envelope-view { position: relative; display: flex; flex: 1; flex-direction: column; }

/* A folha é papel claro: texto escuro mesmo no tema escuro */
.ea-letter-sheet {
  --color-ea-ink: #171412;
  --color-ea-muted: #77716e;
  padding: 24px 22px 18px;
  border-radius: 4px;
  background: #fbf9f5;
  box-shadow: 0 18px 40px -18px rgb(0 0 0 / 0.6);
}

.ea-letter-eyebrow { padding-right: 64px; color: var(--color-ea-muted); font-family: JfMarker, sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }

.ea-letter-stamp {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  padding: 0 0 0 0.16em;
  border: 2px solid var(--color-ea-accent);
  border-radius: 50%;
  color: var(--color-ea-accent);
  font-family: JfMarker, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transform: rotate(12deg);
  opacity: 0.35;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, color 0.3s, opacity 0.4s;
}
.ea-letter-stamp.is-ready { opacity: 1; }
.ea-letter-stamp.is-pressed { background: var(--color-ea-accent); color: #fff; transform: rotate(0deg) scale(0.86); }

.ea-letter-greeting { display: block; margin-top: 20px; color: var(--color-ea-ink); font-family: JfMarker, sans-serif; font-size: 18px; }
.ea-letter-field { flex: 1; width: 100%; min-height: 84px; margin-top: 4px; color: var(--color-ea-ink); font-family: ui-monospace, 'Courier New', monospace; font-size: 17px; line-height: 1.65; }
.ea-letter-read { white-space: pre-wrap; }
.ea-letter-caret { display: inline-block; width: 0.55em; height: 1.1em; margin-left: 2px; background: var(--color-ea-accent); vertical-align: -0.2em; animation: ea-caret 1s steps(2, jump-none) infinite; }
@keyframes ea-caret { 50% { opacity: 0; } }
.ea-letter-meta { margin-top: auto; color: var(--color-ea-muted); font-family: JfMarker, sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }

.ea-letter-envelope-view { align-items: center; justify-content: center; gap: 18px; text-align: center; }
.ea-letter-envelope-view .ea-letter-eyebrow { padding-right: 0; }

.ea-envelope {
  position: relative;
  display: block;
  width: min(100%, 320px);
  aspect-ratio: 1.62;
  border-radius: 6px;
  background: #e6dccb;
  box-shadow: 0 22px 40px -22px rgb(0 0 0 / 0.7), 0 2px 6px -2px rgb(0 0 0 / 0.3);
  container-type: inline-size;
  perspective: 900px;
}
.ea-envelope > span { position: absolute; }
.ea-envelope-letter {
  inset: 6% 7% auto;
  height: 86%;
  border-radius: 3px;
  background: repeating-linear-gradient(to bottom, transparent 0 9cqw, rgb(23 20 18 / 0.22) 9cqw 9.6cqw) 12% 22% / 62% 40% no-repeat, #fbf9f5;
  box-shadow: 0 2px 6px rgb(23 20 18 / 0.15);
}
.ea-envelope-side { inset: 0; border-radius: 6px; background: #ece3d4; }
.ea-envelope-left { clip-path: polygon(0 0, 52% 56%, 0 100%); }
.ea-envelope-right { clip-path: polygon(100% 0, 48% 56%, 100% 100%); }
.ea-envelope-bottom { inset: 0; border-radius: 6px; background: #f4eee4; clip-path: polygon(0 100%, 50% 47%, 100% 100%); }
.ea-envelope-flap { inset: 0 0 auto; height: 60%; filter: drop-shadow(0 3px 3px rgb(23 20 18 / 0.18)); transform-origin: top center; }
.ea-envelope-flap-shape { position: absolute; inset: 0; border-radius: 6px 6px 0 0; background: linear-gradient(to bottom, #ddd0bb, #e3d7c4); clip-path: polygon(0 0, 100% 0, 50% 100%); }
.ea-wax-seal {
  top: 60%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 17cqw;
  aspect-ratio: 1;
  margin: -8.5cqw 0 0 -8.5cqw;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f29ab7, var(--color-ea-accent) 55%, #b84e72);
  box-shadow: 0 3px 6px rgb(23 20 18 / 0.3), inset 0 0 0 0.9cqw rgb(255 255 255 / 0.16);
  color: rgb(255 255 255 / 0.92);
  font-size: 7.5cqw;
  font-weight: 900;
  line-height: 1;
}
.ea-postmark {
  right: 7%;
  bottom: 9%;
  display: grid;
  place-items: center;
  align-content: center;
  width: 23cqw;
  aspect-ratio: 1;
  border: 0.5cqw solid var(--color-ea-accent);
  border-radius: 50%;
  color: var(--color-ea-accent);
  font-family: JfMarker, sans-serif;
  font-size: 2.6cqw;
  line-height: 1.35;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.9;
}
.ea-postmark::before { content: ''; position: absolute; inset: 7%; border: 0.25cqw solid currentColor; border-radius: 50%; }
.ea-postmark::after { content: ''; position: absolute; top: 30%; right: 100%; width: 26cqw; height: 40%; background: repeating-linear-gradient(to bottom, currentColor 0 0.4cqw, transparent 0.4cqw 2.2cqw); opacity: 0.7; }
.ea-postmark-date { font-family: ui-monospace, 'Courier New', monospace; letter-spacing: 0.04em; }

/* Composição larga (paisagem, a partir de 1024px): medida numa grade de 1280px em unidades --ea-u */
@media (min-width: 1024px) and (min-aspect-ratio: 5/4) {
  .ea-hero { display: grid; grid-template-rows: auto 1fr; }
  .ea-stage { position: relative; min-height: calc(var(--ea-w) * 621 / 1600 + 40px); padding: 0; }

  .ea-canvas {
    --ea-u: max(min(100cqw / 1280, (100cqh - 40px) / 621), 100cqw / 1600);
    --ea-slack: max(0px, 100cqh - 685 * var(--ea-u));
    --ea-head: calc(55 * var(--ea-u));
    --ea-portrait-max: max(738 * var(--ea-u), 640px);
    --ea-portrait-left: max(100cqw - 1070 * var(--ea-u), 221px);
    --ea-top: max(10 * var(--ea-u) + var(--ea-slack) * 0.15, 100cqh - var(--ea-portrait-max) - var(--ea-head));
    --ea-portrait-h: min(100cqh - var(--ea-top) - var(--ea-head), var(--ea-portrait-max));
    /* HELAYNE tem 129u de altura de capitular; OBERZINER (120u de fonte, 87u de capitular) começa 83u abaixo */
    --ea-last-top: calc(var(--ea-top) + 212 * var(--ea-u));
    --ea-last-base: calc(var(--ea-top) + 299 * var(--ea-u));
    --ea-intro-top: calc(var(--ea-top) + 165 * var(--ea-u));
    position: absolute;
    inset: 0;
    display: block;
    container-type: size;
  }

  .ea-figure { display: contents; }

  .ea-layer { position: absolute; inset: 0; display: block; pointer-events: none; }
  .ea-layer-name { z-index: 0; }
  .ea-layer-portrait { z-index: 2; }

  .ea-layer-base {
    --ea-spot: radial-gradient(circle var(--ea-spot-r, 0px) at var(--ea-spot-x, 0px) var(--ea-spot-y, 0px), transparent calc(var(--ea-spot-r, 0px) - 1px), #000 calc(var(--ea-spot-r, 0px) + 1px));
    mask-image: var(--ea-spot);
    -webkit-mask-image: var(--ea-spot);
  }

  .ea-layer-ink {
    --ea-spot: radial-gradient(circle var(--ea-spot-r, 0px) at var(--ea-spot-x, 0px) var(--ea-spot-y, 0px), #000 calc(var(--ea-spot-r, 0px) + 1px), transparent calc(var(--ea-spot-r, 0px) + 2px));
    mask-image: var(--ea-spot);
    -webkit-mask-image: var(--ea-spot);
  }

  .ea-name { --ea-mask-top: 0.115em; --ea-mask-bottom: 0.115em; position: static; display: block; line-height: 1; }
  .ea-name-first, .ea-name-last { position: absolute; white-space: nowrap; }
  .ea-name-first { top: calc(var(--ea-top) - 0.136em); left: -0.05em; margin: 0; font-size: calc(178 * var(--ea-u)); }
  .ea-name-last { top: calc(var(--ea-last-top) - 0.136em); right: -0.04em; margin: 0; font-size: calc(120 * var(--ea-u)); }
  .ea-figure::after { display: none; }

  .ea-pad {
    position: absolute;
    z-index: 1;
    top: calc(var(--ea-last-base) + 16 * var(--ea-u));
    left: calc(620 * var(--ea-u));
    width: calc(100% - 620 * var(--ea-u));
    height: calc(100% - var(--ea-last-base) - 16 * var(--ea-u));
  }

  .ea-pad-inner {
    min-height: 0;
    padding: calc(14 * var(--ea-u)) calc(18 * var(--ea-u)) 0 max(120 * var(--ea-u), var(--ea-portrait-left) + var(--ea-portrait-h) * var(--ea-portrait-ratio, 0.8) - 620 * var(--ea-u) + 14px + 24 * var(--ea-u));
  }

  .ea-letter-sheet { padding: calc(24 * var(--ea-u)) calc(26 * var(--ea-u)) calc(18 * var(--ea-u)); border-radius: 4px 4px 0 0; }
  .ea-letter-eyebrow, .ea-letter-meta { font-size: max(10px, 11 * var(--ea-u)); }
  .ea-letter-stamp { top: calc(16 * var(--ea-u)); right: calc(18 * var(--ea-u)); width: max(64px, 78 * var(--ea-u)); height: max(64px, 78 * var(--ea-u)); font-size: max(9px, 10.5 * var(--ea-u)); }
  .ea-letter-greeting { margin-top: calc(22 * var(--ea-u)); font-size: max(14px, 18 * var(--ea-u)); }
  .ea-letter-field { min-height: 0; font-size: max(14px, 18 * var(--ea-u)); }
  .ea-envelope { width: min(100%, 330 * var(--ea-u)); }

  .ea-portrait { z-index: 2; top: calc(100% - var(--ea-portrait-h)); left: var(--ea-portrait-left); height: var(--ea-portrait-h); }

  .ea-intro { position: absolute; z-index: 3; top: var(--ea-intro-top); left: 0; width: calc(250 * var(--ea-u)); }
  .ea-intro-roles { gap: 0.4em 0.55em; font-size: max(10px, 11 * var(--ea-u)); letter-spacing: 0.15em; margin-bottom: calc(18 * var(--ea-u)); }
  .ea-intro-headline { font-size: max(19px, 26 * var(--ea-u)); line-height: 1.12; margin-bottom: calc(26 * var(--ea-u)); }
  .ea-intro-rule { width: calc(52 * var(--ea-u)); margin-bottom: calc(26 * var(--ea-u)); }
  .ea-intro-description { max-width: calc(240 * var(--ea-u)); font-size: max(14px, 15.5 * var(--ea-u)); line-height: 1.6; text-wrap: pretty; }

  /* O carrossel de CDs fica à direita de HELAYNE e termina antes de OBERZINER */
  .ea-book { position: absolute; z-index: 1; top: var(--ea-top); right: 0; width: calc(344 * var(--ea-u)); }
  .ea-canvas .ea-strip { height: calc(150 * var(--ea-u)); border-radius: calc(8 * var(--ea-u)); }
  .ea-canvas .ea-strip-item { flex: 0 0 calc((100% - 18px) / 4); height: 100%; aspect-ratio: auto; border-radius: calc(8 * var(--ea-u)); }
  .ea-book-caption { gap: calc(10 * var(--ea-u)); margin-top: calc(8 * var(--ea-u)); }
  .ea-book-label { font-size: max(12px, 14 * var(--ea-u)); }

  .ea-socials {
    position: absolute;
    z-index: 3;
    font-size: max(13px, 13 * var(--ea-u));
    top: max(var(--ea-intro-top) + max(305 * var(--ea-u), 280px), 100% - 78 * var(--ea-u) - 40px);
    left: 0;
  }
}

.ea-link { position: relative; }
.ea-book-arrow .ea-cta-mark { --ea-cta-mark: clamp(22px, 28 * var(--ea-u, 1px), 28px); }

@media (hover: hover) {
  .ea-link::after { content: ''; position: absolute; inset-inline: 0; bottom: calc(50% - 0.95em); height: 1px; background: currentColor; transform: scaleX(0); transform-origin: right; transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
  .ea-link:hover::after { transform: scaleX(1); transform-origin: left; }
  .ea-book:hover .ea-book-arrow .ea-cta-arrow-out { transform: translate(160%, -160%); }
  .ea-book:hover .ea-book-arrow .ea-cta-arrow-in { transform: translate(0, 0); }
}

.ea-splash-name { width: min(88vw, 130svh); max-height: 70%; height: auto; overflow: visible; font-weight: 900; }

@media (prefers-reduced-motion: reduce) { .ea-splash { display: none; } }

.ea-has-cursor, .ea-has-cursor * { cursor: none; }

/* Faixa de vídeos: Reels lado a lado, rolagem lateral quando houver mais do que cabem */
.ea-strip { display: flex; gap: 6px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; border-radius: 10px; }
.ea-strip::-webkit-scrollbar { display: none; }
.ea-strip-item { position: relative; display: block; flex: 0 0 calc((100% - 12px) / 3); aspect-ratio: 9 / 16; overflow: hidden; border-radius: 10px; background: #000; scroll-snap-align: start; }
.ea-strip-video { display: block; width: 100%; height: 100%; object-fit: cover; }
@media (min-width: 640px) { .ea-strip-item { flex-basis: calc((100% - 6px) / 2); } }

@keyframes ea-breathe {
  0% { opacity: 0.55; transform: scale(1); }
  70%, 100% { opacity: 0; transform: scale(3); }
}

@media (prefers-reduced-motion: reduce) {
  .ea-nav-status-dot::after, .ea-letter-caret { animation: none; }
}
`

export function EliasHero({ hero, videos, reducedMotion }: EliasHeroProps) {
  // `hero.portrait` é o retrato SEM fundo (PNG/WebP com transparência); uma foto com fundo vira um retângulo atrás do nome
  const cutout = hero.portrait
  const size = useImageSize(cutout?.src)
  const portrait = cutout && size ? { src: cutout.src, alt: cutout.alt, width: size.width, height: size.height } : undefined

  return (
    <EliasContext.Provider value={{ hero, videos, reduced: reducedMotion, portrait }}>
      <LazyMotion features={domAnimation}>
        <style>{BLOCK_CSS}</style>
        <HeroSection />
      </LazyMotion>
    </EliasContext.Provider>
  )
}

export default EliasHero
