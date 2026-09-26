import { createAvatar, type Style } from '@dicebear/core'
import { useEffect, useSyncExternalStore } from 'react'

// Cada estilo pesa 100–450 KB de desenhos, então só é baixado quando usado
export const AVATAR_STYLES = {
  adventurer: { label: 'Aventureiro', load: () => import('@dicebear/adventurer') },
  notionists: { label: 'Rabisco', load: () => import('@dicebear/notionists') },
  avataaars: { label: 'Cartoon', load: () => import('@dicebear/avataaars') },
  pixelArt: { label: 'Pixel', load: () => import('@dicebear/pixel-art') },
} as const

export type AvatarStyle = keyof typeof AVATAR_STYLES
export const STYLE_IDS = Object.keys(AVATAR_STYLES) as AvatarStyle[]

type AnyStyle = Style<Record<string, unknown>>
const loaded = new Map<AvatarStyle, AnyStyle>()
const loading = new Map<AvatarStyle, Promise<void>>()
const loadListeners = new Set<() => void>()
let loadVersion = 0

function loadStyle(style: AvatarStyle) {
  if (loaded.has(style)) return Promise.resolve()
  let p = loading.get(style)
  if (!p) {
    p = AVATAR_STYLES[style].load().then((mod) => {
      loaded.set(style, mod as unknown as AnyStyle)
      loadVersion++
      loadListeners.forEach((l) => l())
    })
    loading.set(style, p)
  }
  return p
}

function getStyle(style: AvatarStyle): AnyStyle {
  const s = loaded.get(style)
  if (!s) throw new Error(`Estilo de avatar "${style}" ainda não carregado`)
  return s
}

/** Baixa os estilos pedidos; retorna true quando todos estão prontos para uso */
export function useAvatarStyles(styles: readonly AvatarStyle[]) {
  useSyncExternalStore(
    (cb) => {
      loadListeners.add(cb)
      return () => loadListeners.delete(cb)
    },
    () => loadVersion,
  )
  const key = styles.join(',')
  useEffect(() => {
    key.split(',').forEach((s) => s && loadStyle(s as AvatarStyle))
  }, [key])
  return styles.every((s) => loaded.has(s))
}

/** Peça escolhida: variante (string), 'none' para "sem", ou cor em hex */
export interface AvatarConfig {
  style: AvatarStyle
  options: Record<string, string>
  background: string
}

export const BACKGROUNDS = ['fbbf24', 'f87171', 'fb923c', 'a3e635', '34d399', '38bdf8', '818cf8', 'e879f9', 'd4d4d8', '27272a']

const LABELS: Record<string, string> = {
  top: 'Cabelo / chapéu',
  hair: 'Cabelo',
  hairColor: 'Cor do cabelo',
  skinColor: 'Pele',
  eyes: 'Olhos',
  eyesColor: 'Cor dos olhos',
  eyebrows: 'Sobrancelhas',
  brows: 'Sobrancelhas',
  mouth: 'Boca',
  lips: 'Boca',
  mouthColor: 'Cor da boca',
  nose: 'Nariz',
  glasses: 'Óculos',
  glassesColor: 'Cor dos óculos',
  accessories: 'Acessórios',
  accessoriesColor: 'Cor dos acessórios',
  earrings: 'Brincos',
  features: 'Detalhes',
  beard: 'Barba',
  facialHair: 'Barba',
  facialHairColor: 'Cor da barba',
  body: 'Roupa',
  clothing: 'Roupa',
  clothesColor: 'Cor da roupa',
  clothingColor: 'Cor da roupa',
  clothingGraphic: 'Estampa',
  bodyIcon: 'Estampa',
  hat: 'Chapéu',
  hatColor: 'Cor do chapéu',
  gesture: 'Gesto',
}

interface SchemaProp {
  type?: string
  items?: { enum?: string[]; pattern?: string }
  default?: unknown
}

export interface AvatarPart {
  key: string
  label: string
  kind: 'variant' | 'color'
  values: string[]
  /** Peça opcional (tem xxxProbability no estilo): aceita 'none' */
  optional: boolean
  /** Chance (0–100) da peça aparecer no sorteio, segundo o próprio estilo */
  chance: number
}

// opções técnicas do estilo que não fazem sentido no editor
const HIDDEN_PARTS = new Set(['style', 'base'])

// cores e peças que dependem de outra peça opcional (ex.: cor do chapéu só aparece com chapéu)
const COLOR_PARENT: Record<string, string> = {
  hatColor: 'hat',
  glassesColor: 'glasses',
  accessoriesColor: 'accessories',
  facialHairColor: 'facialHair',
  clothingGraphic: 'clothing',
}

const partsCache = new Map<AvatarStyle, AvatarPart[]>()

/** Lê o schema do estilo DiceBear e monta a lista de peças editáveis */
export function avatarParts(style: AvatarStyle): AvatarPart[] {
  const cached = partsCache.get(style)
  if (cached) return cached
  const props = (getStyle(style).schema?.properties ?? {}) as Record<string, SchemaProp>
  const parts: AvatarPart[] = []
  for (const [key, prop] of Object.entries(props)) {
    if (prop.type !== 'array' || !prop.items || HIDDEN_PARTS.has(key)) continue
    const probability = props[`${key}Probability`]
    const optional = probability !== undefined
    const chance = typeof probability?.default === 'number' ? probability.default : 100
    const label = LABELS[key] ?? key
    if (prop.items.enum && prop.items.enum.length > 1) {
      parts.push({ key, label, kind: 'variant', values: [...prop.items.enum].sort(natural), optional, chance })
    } else if (prop.items.pattern && Array.isArray(prop.default) && key !== 'backgroundColor' && prop.default.length > 1) {
      parts.push({ key, label, kind: 'color', values: prop.default as string[], optional: false, chance: 100 })
    }
  }
  // variantes primeiro, cores depois; dentro de cada grupo, na ordem do rosto (LABELS)
  const order = Object.keys(LABELS)
  const rank = (p: AvatarPart) => (p.kind === 'variant' ? 0 : 1000) + (order.indexOf(p.key) + 1 || 999)
  parts.sort((a, b) => rank(a) - rank(b))
  partsCache.set(style, parts)
  return parts
}

function natural(a: string, b: string) {
  return a.localeCompare(b, 'en', { numeric: true })
}

/** A peça está visível? (cores de peças opcionais só fazem sentido se a peça existe) */
export function partVisible(config: AvatarConfig, part: AvatarPart) {
  const parent = COLOR_PARENT[part.key]
  return !parent || !(parent in config.options) || config.options[parent] !== 'none'
}

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

export function randomAvatar(style: AvatarStyle = pick(STYLE_IDS)): AvatarConfig {
  const options: Record<string, string> = {}
  for (const part of avatarParts(style)) {
    // peças opcionais seguem a chance do estilo (cabelo quase sempre, óculos às vezes),
    // com um mínimo de 25% para acessórios aparecerem de vez em quando
    const show = !part.optional || Math.random() * 100 < Math.max(part.chance, 25)
    options[part.key] = show ? pick(part.values) : 'none'
  }
  return { style, options, background: pick(BACKGROUNDS.slice(0, 8)) }
}

export function isAvatarConfig(value: unknown): value is AvatarConfig {
  const v = value as AvatarConfig
  return !!v && typeof v === 'object' && v.style in AVATAR_STYLES && typeof v.options === 'object'
}

const svgCache = new Map<string, string>()

/** Gera o avatar como data URI SVG (com cache, pois é chamado a cada render) */
export function avatarDataUri(config: AvatarConfig): string {
  const cacheKey = JSON.stringify(config)
  const cached = svgCache.get(cacheKey)
  if (cached) return cached

  const opts: Record<string, unknown> = { seed: 'qual-e-o-filme', backgroundColor: [config.background] }
  for (const part of avatarParts(config.style)) {
    const value = config.options[part.key]
    if (value === undefined) continue
    if (value === 'none') {
      opts[`${part.key}Probability`] = 0
    } else {
      opts[part.key] = [value]
      if (part.optional) opts[`${part.key}Probability`] = 100
    }
  }
  // estilos carregados sob demanda perdem o tipo específico; as opções já foram validadas acima
  const uri = createAvatar(getStyle(config.style), opts).toDataUri()
  if (svgCache.size > 200) svgCache.clear()
  svgCache.set(cacheKey, uri)
  return uri
}
