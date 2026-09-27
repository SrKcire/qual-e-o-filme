import { MAX_ATTEMPTS, type Guess } from '../lib/game'

/** Seis marcadores das tentativas: verde acerto, vermelho erro, cinza pulo, dourado a atual */
export function AttemptPips({ guesses, finished }: { guesses: Guess[]; finished: boolean }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const g = guesses[i]
        const color = g
          ? g.result === 'correct'
            ? 'bg-emerald-400'
            : g.result === 'wrong'
              ? 'bg-curtain-500'
              : 'bg-zinc-500'
          : i === guesses.length && !finished
            ? 'bg-amber-400 animate-pulse'
            : 'bg-zinc-800'
        return <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${color}`} />
      })}
    </div>
  )
}
