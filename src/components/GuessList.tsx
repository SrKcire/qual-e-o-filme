import { SkipForward, X } from 'lucide-react'
import type { Guess } from '../lib/game'

/** Chutes errados e pulos, em etiquetas lado a lado */
export function GuessList({ guesses }: { guesses: Guess[] }) {
  const misses = guesses.filter((g) => g.result !== 'correct')
  if (misses.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {misses.map((g, i) => (
        <li
          key={i}
          className="flex animate-rise items-center gap-1.5 rounded-full bg-white/[0.04] py-1.5 pr-3.5 pl-2.5 text-sm ring-1 ring-white/10"
        >
          {g.result === 'skip' ? (
            <SkipForward size={14} className="text-zinc-500" aria-hidden />
          ) : (
            <X size={14} strokeWidth={2.6} className="text-curtain-500" aria-hidden />
          )}
          <span className={g.result === 'skip' ? 'text-zinc-500 italic' : 'text-zinc-300 line-through decoration-curtain-500/60'}>
            {g.result === 'skip' ? 'Pulou' : g.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
