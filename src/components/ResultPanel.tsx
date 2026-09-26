import { useState } from 'react'
import { MAX_ATTEMPTS, type Guess, type Movie } from '../lib/game'

interface Props {
  movie: Movie
  guesses: Guess[]
  score: number
  onNext: () => void
}

function shareText(guesses: Guess[], score: number) {
  const squares = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const g = guesses[i]
    if (!g) return '⬜'
    return g.result === 'correct' ? '🟩' : g.result === 'skip' ? '⬛' : '🟥'
  }).join('')
  return `🎬 Qual é o Filme? ${score}/${MAX_ATTEMPTS}\n${squares}\n${location.href}`
}

export function ResultPanel({ movie, guesses, score, onNext }: Props) {
  const [copied, setCopied] = useState(false)
  const won = score > 0

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText(guesses, score))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <div className={`rounded-xl p-5 text-center ring-1 ${won ? 'bg-emerald-950/40 ring-emerald-700' : 'bg-red-950/40 ring-red-800'}`}>
      <p className="text-lg font-bold">
        {won ? `Acertou! +${score} ${score === 1 ? 'ponto' : 'pontos'}` : 'Não foi dessa vez…'}
      </p>
      <p className="mt-1 text-zinc-300">
        {won ? 'O filme era' : 'A resposta era'} <strong className="text-amber-300">{movie.title}</strong> ({movie.year})
        {movie.originalTitle !== movie.title && <span className="text-zinc-500"> · {movie.originalTitle}</span>}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={share} className="rounded-lg bg-zinc-800 px-4 py-2 font-semibold hover:bg-zinc-700">
          {copied ? 'Copiado!' : 'Compartilhar'}
        </button>
        <button
          type="button"
          onClick={onNext}
          autoFocus
          className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-300"
        >
          Próximo filme →
        </button>
      </div>
    </div>
  )
}
