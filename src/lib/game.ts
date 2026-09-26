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

/** Opções do autocompletar: título em português e original, sem repetição */
export const suggestionPool: string[] = [
  ...new Set(movies.flatMap((m) => [`${m.title} (${m.year})`, m.originalTitle !== m.title ? `${m.originalTitle} (${m.year})` : null]).filter((s): s is string => s !== null)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'))

/** Remove o "(ano)" de uma sugestão selecionada */
export function stripYear(text: string) {
  return text.replace(/\s*\(\d{4}\)\s*$/, '')
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
