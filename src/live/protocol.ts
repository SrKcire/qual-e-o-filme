import type { AvatarConfig } from '../lib/avatar'

export const FRAMES_PER_ROUND = 6
/** Tempo mostrando a resposta entre uma rodada e outra */
export const REVEAL_MS = 7000

export interface Identity {
  id: string
  name: string
  avatar: AvatarConfig | null
}

export interface LivePlayer extends Identity {
  score: number
  online: boolean
  /** Na rodada atual: ainda tentando, errou neste frame (espera o próximo) ou acertou */
  status: 'guessing' | 'wrong' | 'correct'
  roundPoints: number
  /** Foi o primeiro a acertar a rodada (+1 ponto) */
  first: boolean
}

export interface LiveSettings {
  rounds: number
  frameSeconds: number
}

export interface LiveAnswer {
  title: string
  originalTitle: string
  year: number
}

/**
 * Foto completa da sala, enviada pelo anfitrião a cada mudança.
 * Só leva os frames já revelados, e a resposta só aparece no fim da rodada.
 */
export interface LiveState {
  hostId: string
  phase: 'lobby' | 'playing' | 'reveal' | 'final'
  settings: LiveSettings
  round: number
  frames: string[]
  /** Próximo frame, só para o aparelho baixar antes (não aparece na tela) */
  next: string | null
  frameIndex: number
  /** Tempo restante da fase atual quando a mensagem foi enviada */
  msLeft: number
  players: LivePlayer[]
  answer: LiveAnswer | null
}

// mensagens trocadas pelo canal
export type HostMessage = { event: 'state'; payload: LiveState }
export type PlayerMessage =
  | { event: 'hello'; payload: { id: string } }
  | { event: 'guess'; payload: { id: string; text: string } }

/** Pontos por acertar no frame `index` (0 = primeiro) */
export const pointsFor = (frameIndex: number, first: boolean) => FRAMES_PER_ROUND - frameIndex + (first ? 1 : 0)

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sem I e O, que confundem com 1 e 0

export function randomRoomCode() {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')
}

export function normalizeRoomCode(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
}
