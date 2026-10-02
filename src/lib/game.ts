import moviesData from '../data/movies.json'

export interface Movie {
  id: number
  title: string
  originalTitle: string
  year: number
  aliases: string[]
  /** Caminhos de imagem do TMDB, do frame mais difícil para o mais fácil */
  frames: string[]
}

export type GuessResult = 'correct' | 'wrong' | 'skip'

export interface Guess {
  text: string
  result: GuessResult
}

export const MAX_ATTEMPTS = 6

/** Tentativa (1-based) a partir da qual o campo sugere nomes de filmes; antes disso, facilitaria demais */
export const SUGGESTIONS_FROM_ATTEMPT = 4

export const movies: Movie[] = moviesData

export function frameUrl(path: string, size: 'w300' | 'w780' | 'w1280' = 'w1280') {
  return path.startsWith('http') || path.startsWith('/') || path.startsWith('.')
    ? path
    : `https://image.tmdb.org/t/p/${size}/${path}`
}

/** Remove acentos, pontuação e caixa para comparar títulos */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function movieNames(movie: Movie) {
  return [movie.title, movie.originalTitle, ...movie.aliases]
}

export function isCorrectGuess(movie: Movie, guess: string) {
  const g = normalize(guess)
  return g.length > 0 && movieNames(movie).some((name) => normalize(name) === g)
}

/** Acertou no 1º frame = 6 pontos, no 2º = 5, ..., no 6º = 1 */
export function scoreFor(guesses: Guess[]) {
  const index = guesses.findIndex((g) => g.result === 'correct')
  return index === -1 ? 0 : MAX_ATTEMPTS - index
}

export function roundState(guesses: Guess[]) {
  const won = guesses.some((g) => g.result === 'correct')
  const finished = won || guesses.length >= MAX_ATTEMPTS
  return { won, finished, revealed: finished ? MAX_ATTEMPTS : guesses.length + 1 }
}

export function movieById(id: number) {
  return movies.find((m) => m.id === id)
}

/** Quadradinhos do resultado: 🟥 erro, ⬛ pulo, 🟩 acerto, ⬜ não usado */
export function resultSquares(guesses: Guess[]) {
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const g = guesses[i]
    if (!g) return '⬜'
    return g.result === 'correct' ? '🟩' : g.result === 'skip' ? '⬛' : '🟥'
  }).join('')
}

/** Opções do autocompletar: título em português e original, sem repetição */
export const suggestionPool: string[] = [
  ...new Set(movies.flatMap((m) => [`${m.title} (${m.year})`, m.originalTitle !== m.title ? `${m.originalTitle} (${m.year})` : null]).filter((s): s is string => s !== null)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'))

/** Remove o "(ano)" de uma sugestão selecionada */
export function stripYear(text: string) {
  return text.replace(/\s*\(\d{4}\)\s*$/, '')
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma sequência */
function seededRandom(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Filme do Dia ----------

/** Dia 1 do Filme do Dia */
const DAILY_EPOCH = Date.UTC(2026, 8, 26)

/** Número do desafio de hoje, pela data local do jogador */
export function dailyNumber(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - DAILY_EPOCH) / 86_400_000) + 1
}

/**
 * Filmes dos dias 1–8, sorteados quando o catálogo tinha 49 filmes. Ficam fixos para
 * que a ampliação do catálogo não troque o desafio de quem já jogou esses dias.
 */
const FIXED_DAYS = [348, 680, 98, 671, 329, 694, 446159, 19995]
const DAILY_SEED = 0x9e3779b9

/**
 * Todo mundo recebe o mesmo filme no mesmo dia. O catálogo é embaralhado com uma
 * semente por "ciclo", então nenhum filme repete até o catálogo inteiro passar.
 * O primeiro ciclo depois dos dias fixos pula os filmes que já saíram neles.
 */
export function dailyMovie(day: number): Movie {
  if (day <= FIXED_DAYS.length) return movieById(FIXED_DAYS[Math.max(day, 1) - 1])!
  const ids = movies.map((m) => m.id).sort((a, b) => a - b)
  const firstCycle = ids.filter((id) => !FIXED_DAYS.includes(id))
  let d = day - FIXED_DAYS.length
  if (d <= firstCycle.length) return movieById(shuffle(firstCycle, seededRandom(DAILY_SEED))[d - 1])!
  d -= firstCycle.length
  const n = ids.length
  const cycle = Math.floor((d - 1) / n) + 1
  const order = shuffle(ids, seededRandom(DAILY_SEED ^ cycle))
  return movieById(order[(d - 1) % n])!
}

export function msUntilMidnight(now = new Date()) {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}
