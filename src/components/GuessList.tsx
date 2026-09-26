import type { Guess } from '../lib/game'

export function GuessList({ guesses }: { guesses: Guess[] }) {
  const misses = guesses.filter((g) => g.result !== 'correct')
  if (misses.length === 0) return null

  return (
    <ul className="space-y-1">
      {misses.map((g, i) => (
        <li key={i} className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800">
          <span aria-hidden>{g.result === 'skip' ? '⏭️' : '❌'}</span>
          <span className={g.result === 'skip' ? 'italic text-zinc-500' : 'text-zinc-300 line-through decoration-red-500/60'}>
            {g.result === 'skip' ? 'Pulou' : g.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
