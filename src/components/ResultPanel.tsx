import { useState, type ReactNode } from 'react'
import { Check, Share2 } from 'lucide-react'
import type { Movie } from '../lib/game'

interface Props {
  movie: Movie
  score: number
  /** Texto copiado pelo botão Compartilhar; sem ele, o botão não aparece */
  shareText?: string
  /** Mensagem de acerto personalizada (ex.: no modo festa, com o nome do jogador) */
  winMessage?: string
  children?: ReactNode
}

/** Resultado da rodada em forma de ingresso de cinema: canhoto com os pontos + filme */
export function ResultPanel({ movie, score, shareText, winMessage, children }: Props) {
  const [copied, setCopied] = useState(false)
  const won = score > 0
  const pts = `${score} ${score === 1 ? 'ponto' : 'pontos'}`

  async function share() {
    if (!shareText) return
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text: shareText })
        return
      }
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* compartilhamento cancelado ou indisponível */
    }
  }

  return (
    <div className="relative flex overflow-hidden rounded-2xl shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]">
      {/* canhoto */}
      <div
        className={`flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-32 ${
          won ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-950' : 'bg-gradient-to-b from-curtain-500 to-curtain-600 text-white'
        }`}
      >
        <span className="font-display text-5xl leading-none sm:text-6xl">{won ? `+${score}` : '0'}</span>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">{score === 1 ? 'ponto' : 'pontos'}</span>
      </div>

      {/* picote entre o canhoto e o ingresso, com os recortes em cima e embaixo */}
      <div className="relative w-0 border-l-2 border-dashed border-zinc-950/60">
        <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-zinc-950" />
        <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-zinc-950" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 bg-zinc-900 px-5 py-5 sm:px-6">
        <div>
          <p className={`text-xs font-bold tracking-[0.18em] uppercase ${won ? 'text-emerald-400' : 'text-curtain-500'}`}>
            {won ? (winMessage ?? 'Acertou!') + ` +${pts}` : 'Não foi dessa vez…'}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{won ? 'O filme era' : 'A resposta era'}</p>
          <strong className="block font-display text-3xl leading-tight tracking-wide text-amber-300 sm:text-4xl">
            {movie.title}
          </strong>
          <p className="text-sm text-zinc-500">
            {movie.year}
            {movie.originalTitle !== movie.title && ` · ${movie.originalTitle}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shareText && (
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              {copied ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} autoFocus className="btn-gold px-5 py-2 text-sm">
      {children}
    </button>
  )
}
