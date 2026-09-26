import { useEffect, useState } from 'react'
import { PrimaryButton, ResultPanel } from '../components/ResultPanel'
import { Round } from '../components/Round'
import { StatsBar } from '../components/StatsBar'
import { MAX_ATTEMPTS, movieById, movies, resultSquares, roundState, scoreFor, shuffle, type Guess } from '../lib/game'
import { load, save } from '../lib/storage'

interface Progress {
  queue: number[]
  position: number
  guesses: Guess[]
}

interface Stats {
  played: number
  totalScore: number
  /** distribution[n] = quantas partidas terminaram com n pontos */
  distribution: number[]
}

const PROGRESS_KEY = 'qef:progress'
const STATS_KEY = 'qef:stats'

function newQueue(avoidFirst?: number) {
  const queue = shuffle(movies.map((m) => m.id))
  if (queue.length > 1 && queue[0] === avoidFirst) [queue[0], queue[1]] = [queue[1], queue[0]]
  return queue
}

function initialProgress(): Progress {
  const saved = load<Progress | null>(PROGRESS_KEY, null)
  const ids = new Set(movies.map((m) => m.id))
  // descarta progresso salvo se o catálogo mudou
  if (saved && saved.queue.length === ids.size && saved.queue.every((id) => ids.has(id))) return saved
  return { queue: newQueue(), position: 0, guesses: [] }
}

const emptyStats: Stats = { played: 0, totalScore: 0, distribution: Array(MAX_ATTEMPTS + 1).fill(0) }

/** Filmes em sequência aleatória, sem repetir até passar pelo catálogo inteiro */
export function FreeMode() {
  const [progress, setProgress] = useState(initialProgress)
  const [stats, setStats] = useState(() => load(STATS_KEY, emptyStats))
  const { queue, position, guesses } = progress
  const movie = movieById(queue[position])!
  const score = scoreFor(guesses)

  useEffect(() => save(PROGRESS_KEY, progress), [progress])
  useEffect(() => save(STATS_KEY, stats), [stats])

  function addGuess(guess: Guess) {
    const next = [...guesses, guess]
    setProgress({ ...progress, guesses: next })
    if (roundState(next).finished) {
      const points = scoreFor(next)
      setStats((s) => {
        const distribution = [...s.distribution]
        distribution[points]++
        return { played: s.played + 1, totalScore: s.totalScore + points, distribution }
      })
    }
  }

  function nextMovie() {
    const atEnd = position + 1 >= queue.length
    setProgress({
      queue: atEnd ? newQueue(movie.id) : queue,
      position: atEnd ? 0 : position + 1,
      guesses: [],
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <StatsBar
        items={[
          ['Filme', `${position + 1} de ${queue.length}`],
          ['Pontos', stats.totalScore],
          ['Partidas', stats.played],
          ['Média', stats.played ? (stats.totalScore / stats.played).toFixed(1) : '–'],
        ]}
      />
      <Round
        key={`${movie.id}-${position}`}
        movie={movie}
        guesses={guesses}
        onGuess={addGuess}
        result={
          <ResultPanel
            movie={movie}
            score={score}
            shareText={`🎬 Qual é o Filme? ${score}/${MAX_ATTEMPTS}\n${resultSquares(guesses)}\n${location.href}`}
          >
            <PrimaryButton onClick={nextMovie}>Próximo filme →</PrimaryButton>
          </ResultPanel>
        }
      />
    </div>
  )
}
