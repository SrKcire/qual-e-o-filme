import { useEffect, useState } from 'react'
import { FrameViewer } from './components/FrameViewer'
import { GuessInput } from './components/GuessInput'
import { GuessList } from './components/GuessList'
import { ResultPanel } from './components/ResultPanel'
import { MAX_ATTEMPTS, frameUrl, isCorrectGuess, movies, scoreFor, shuffle, type Guess } from './lib/game'
import { load, save } from './lib/storage'

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

export default function App() {
  const [progress, setProgress] = useState(initialProgress)
  const [stats, setStats] = useState(() => load(STATS_KEY, emptyStats))
  const { queue, position, guesses } = progress

  const movie = movies.find((m) => m.id === queue[position])!
  const won = guesses.some((g) => g.result === 'correct')
  const finished = won || guesses.length >= MAX_ATTEMPTS
  const revealed = finished ? MAX_ATTEMPTS : guesses.length + 1
  const [viewing, setViewing] = useState(revealed - 1)
  const score = scoreFor(guesses)

  useEffect(() => save(PROGRESS_KEY, progress), [progress])
  useEffect(() => save(STATS_KEY, stats), [stats])

  // pré-carrega o próximo frame para a troca ser instantânea
  useEffect(() => {
    if (revealed < MAX_ATTEMPTS) new Image().src = frameUrl(movie.frames[revealed])
  }, [movie, revealed])

  function addGuess(guess: Guess) {
    if (finished) return
    const next = [...guesses, guess]
    setProgress({ ...progress, guesses: next })
    const nowFinished = guess.result === 'correct' || next.length >= MAX_ATTEMPTS
    setViewing(nowFinished ? next.length - 1 : next.length)
    if (nowFinished) {
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
    setViewing(0)
  }

  const average = stats.played ? (stats.totalScore / stats.played).toFixed(1) : '–'

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          🎬 Qual é o <span className="text-amber-400">Filme?</span>
        </h1>
        <dl className="flex gap-4 text-sm text-zinc-400">
          <div>
            <dt className="inline">Pontos: </dt>
            <dd className="inline font-semibold text-zinc-100">{stats.totalScore}</dd>
          </div>
          <div>
            <dt className="inline">Partidas: </dt>
            <dd className="inline font-semibold text-zinc-100">{stats.played}</dd>
          </div>
          <div>
            <dt className="inline">Média: </dt>
            <dd className="inline font-semibold text-zinc-100">{average}</dd>
          </div>
        </dl>
      </header>

      <FrameViewer frames={movie.frames} revealed={revealed} current={viewing} onSelect={setViewing} />

      {finished ? (
        <ResultPanel movie={movie} guesses={guesses} score={score} onNext={nextMovie} />
      ) : (
        <>
          <p className="text-center text-sm text-zinc-400">
            Tentativa <strong className="text-zinc-100">{guesses.length + 1}</strong> de {MAX_ATTEMPTS} · vale{' '}
            <strong className="text-amber-300">{MAX_ATTEMPTS - guesses.length}</strong>{' '}
            {MAX_ATTEMPTS - guesses.length === 1 ? 'ponto' : 'pontos'}
          </p>
          <GuessInput
            onGuess={(text) => addGuess({ text, result: isCorrectGuess(movie, text) ? 'correct' : 'wrong' })}
            onSkip={() => addGuess({ text: '', result: 'skip' })}
          />
        </>
      )}

      <GuessList guesses={guesses} />

      <footer className="mt-auto pt-6 text-center text-xs text-zinc-600">
        Filme {position + 1} de {queue.length} · Imagens:{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
          TMDB
        </a>
        . Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
      </footer>
    </div>
  )
}
