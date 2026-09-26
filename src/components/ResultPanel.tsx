import { useState, type ReactNode } from 'react'
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
    <div className={`rounded-xl p-5 text-center ring-1 ${won ? 'bg-emerald-950/40 ring-emerald-700' : 'bg-red-950/40 ring-red-800'}`}>
      <p className="text-lg font-bold">{won ? (winMessage ?? 'Acertou!') + ` +${pts}` : 'Não foi dessa vez…'}</p>
      <p className="mt-1 text-zinc-300">
        {won ? 'O filme era' : 'A resposta era'} <strong className="text-amber-300">{movie.title}</strong> ({movie.year})
        {movie.originalTitle !== movie.title && <span className="text-zinc-500"> · {movie.originalTitle}</span>}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {shareText && (
          <button type="button" onClick={share} className="rounded-lg bg-zinc-800 px-4 py-2 font-semibold hover:bg-zinc-700">
            {copied ? 'Copiado!' : 'Compartilhar'}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-300"
    >
      {children}
    </button>
  )
}
