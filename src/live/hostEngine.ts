import { isCorrectGuess, movieById, movies, shuffle, type Movie } from '../lib/game'
import {
  FRAMES_PER_ROUND,
  REVEAL_MS,
  pointsFor,
  type Identity,
  type LivePlayer,
  type LiveSettings,
  type LiveState,
} from './protocol'

/**
 * Regras da sala ao vivo. Roda só no aparelho do anfitrião: sorteia os filmes,
 * controla o tempo de cada frame, confere os chutes e soma os pontos.
 * A cada mudança chama `emit` com a foto atual, que é repassada a todos.
 */
export class HostEngine {
  private players = new Map<string, LivePlayer>()
  private phase: LiveState['phase'] = 'lobby'
  private round = 0
  private frameIndex = 0
  private queue: number[] = []
  private movie: Movie | null = null
  private deadline = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private hostId: string
  private settings: LiveSettings
  private emit: (state: LiveState) => void

  constructor(host: Identity, settings: LiveSettings, emit: (state: LiveState) => void) {
    this.hostId = host.id
    this.settings = settings
    this.emit = emit
    this.join(host)
  }

  /** Entrou (ou voltou) alguém na sala */
  join(who: Identity) {
    const existing = this.players.get(who.id)
    if (existing) Object.assign(existing, { name: who.name, avatar: who.avatar, online: true })
    else
      this.players.set(who.id, { ...who, score: 0, online: true, status: 'guessing', roundPoints: 0, first: false })
    this.publish()
  }

  /** Lista de quem está no canal agora: adiciona quem chegou e marca quem saiu */
  syncPresence(present: Identity[]) {
    let added = false
    for (const who of present) {
      const p = this.players.get(who.id)
      if (!p) {
        this.players.set(who.id, { ...who, score: 0, online: true, status: 'guessing', roundPoints: 0, first: false })
        added = true
      } else if (p.name !== who.name || JSON.stringify(p.avatar) !== JSON.stringify(who.avatar)) {
        Object.assign(p, { name: who.name, avatar: who.avatar })
        added = true
      }
    }
    const changed = this.setOnline(new Set(present.map((p) => p.id)))
    if (added && !changed) this.publish()
  }

  /** Atualiza quem está conectado; retorna se algo mudou (e já publicou) */
  private setOnline(ids: Set<string>) {
    let changed = false
    for (const p of this.players.values()) {
      const online = ids.has(p.id) || p.id === this.hostId
      if (p.online !== online) {
        p.online = online
        changed = true
      }
    }
    // no lobby, quem saiu some da lista
    if (this.phase === 'lobby')
      for (const p of [...this.players.values()]) if (!p.online) this.players.delete(p.id)
    if (changed) {
      this.publish()
      this.checkRoundOver()
    }
    return changed
  }

  updateSettings(settings: LiveSettings) {
    if (this.phase !== 'lobby') return
    this.settings = settings
    this.publish()
  }

  start() {
    if (this.phase !== 'lobby' && this.phase !== 'final') return
    const rounds = Math.min(this.settings.rounds, movies.length)
    this.queue = shuffle(movies.map((m) => m.id)).slice(0, rounds)
    for (const p of this.players.values()) p.score = 0
    this.beginRound(1)
  }

  guess(playerId: string, text: string) {
    const p = this.players.get(playerId)
    if (this.phase !== 'playing' || !this.movie || !p || p.status !== 'guessing') return
    if (isCorrectGuess(this.movie, text)) {
      const first = ![...this.players.values()].some((o) => o.status === 'correct')
      p.status = 'correct'
      p.first = first
      p.roundPoints = pointsFor(this.frameIndex, first)
      p.score += p.roundPoints
    } else {
      p.status = 'wrong'
    }
    this.publish()
    this.checkRoundOver()
  }

  /** Volta para a sala de espera, zerando o placar */
  backToLobby() {
    clearTimeout(this.timer)
    this.phase = 'lobby'
    this.round = 0
    this.movie = null
    for (const p of [...this.players.values()]) {
      if (!p.online) this.players.delete(p.id)
      else Object.assign(p, { score: 0, status: 'guessing', roundPoints: 0, first: false })
    }
    this.publish()
  }

  /** Reenvia a foto atual (ex.: alguém acabou de entrar) */
  publish() {
    this.emit(this.snapshot())
  }

  dispose() {
    clearTimeout(this.timer)
  }

  private beginRound(n: number) {
    this.round = n
    this.movie = movieById(this.queue[n - 1]) ?? null
    this.frameIndex = 0
    this.phase = 'playing'
    for (const p of this.players.values()) Object.assign(p, { status: 'guessing', roundPoints: 0, first: false })
    this.schedule(this.settings.frameSeconds * 1000, () => this.nextFrame())
    this.publish()
  }

  private nextFrame() {
    if (this.frameIndex < FRAMES_PER_ROUND - 1) {
      this.frameIndex++
      // quem errou no frame anterior pode tentar de novo
      for (const p of this.players.values()) if (p.status === 'wrong') p.status = 'guessing'
      this.schedule(this.settings.frameSeconds * 1000, () => this.nextFrame())
      this.publish()
    } else {
      this.endRound()
    }
  }

  private checkRoundOver() {
    if (this.phase !== 'playing') return
    const online = [...this.players.values()].filter((p) => p.online)
    if (online.length > 0 && online.every((p) => p.status === 'correct')) this.endRound()
  }

  private endRound() {
    this.phase = 'reveal'
    this.schedule(REVEAL_MS, () => {
      if (this.round < this.queue.length) this.beginRound(this.round + 1)
      else {
        this.phase = 'final'
        clearTimeout(this.timer)
        this.publish()
      }
    })
    this.publish()
  }

  private schedule(ms: number, fn: () => void) {
    clearTimeout(this.timer)
    this.deadline = Date.now() + ms
    this.timer = setTimeout(fn, ms)
  }

  private snapshot(): LiveState {
    const m = this.movie
    const revealAll = this.phase === 'reveal' || this.phase === 'final'
    return {
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      round: this.round,
      frames: m ? m.frames.slice(0, revealAll ? FRAMES_PER_ROUND : this.frameIndex + 1) : [],
      next: m && this.phase === 'playing' && this.frameIndex < FRAMES_PER_ROUND - 1 ? m.frames[this.frameIndex + 1] : null,
      frameIndex: this.frameIndex,
      msLeft: this.phase === 'playing' || this.phase === 'reveal' ? Math.max(0, this.deadline - Date.now()) : 0,
      players: [...this.players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
      answer: revealAll && m ? { title: m.title, originalTitle: m.originalTitle, year: m.year } : null,
    }
  }
}
