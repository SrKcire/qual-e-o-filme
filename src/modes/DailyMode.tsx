import { useEffect, useState } from 'react'
import { ResultPanel } from '../components/ResultPanel'
import { Round } from '../components/Round'
import { StatsBar } from '../components/StatsBar'
import { MAX_ATTEMPTS, dailyMovie, dailyNumber, msUntilMidnight, resultSquares, roundState, scoreFor, type Guess } from '../lib/game'
import { load, save } from '../lib/storage'

interface DailyProgress {
  day: number
  guesses: Guess[]
}

interface DailyStats {
  played: number
  wins: number
  totalScore: number
  streak: number
  maxStreak: number
  /** Último dia vencido, para saber se a sequência continua */
  lastWonDay: number
  distribution: number[]
}

const PROGRESS_KEY = 'qef:daily'
const STATS_KEY = 'qef:daily-stats'

const emptyStats: DailyStats = {
  played: 0,
  wins: 0,
  totalScore: 0,
  streak: 0,
  maxStreak: 0,
  lastWonDay: 0,
  distribution: Array(MAX_ATTEMPTS + 1).fill(0),
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

function Countdown({ onNewDay }: { onNewDay: () => void }) {
  const [ms, setMs] = useState(msUntilMidnight)
  useEffect(() => {
    const timer = setInterval(() => {
      const left = msUntilMidnight()
      setMs(left)
      if (dailyNumber() !== dailyNumber(new Date(Date.now() - 1500))) onNewDay()
    }, 1000)
    return () => clearInterval(timer)
  }, [onNewDay])
  return (
    <p className="text-sm text-zinc-400">
      Próximo filme em <span className="font-mono font-semibold text-zinc-100">{formatCountdown(ms)}</span>
    </p>
  )
}

/** Um filme por dia, igual para todo mundo */
export function DailyMode() {
  const [day, setDay] = useState(() => dailyNumber())
  const [progress, setProgress] = useState<DailyProgress>(() => {
    const saved = load<DailyProgress | null>(PROGRESS_KEY, null)
    return saved?.day === day ? saved : { day, guesses: [] }
  })
  const [stats, setStats] = useState(() => load(STATS_KEY, emptyStats))

  // virou o dia com a aba aberta: começa o desafio novo
  const guesses = progress.day === day ? progress.guesses : []
  const movie = dailyMovie(day)
  const score = scoreFor(guesses)

  useEffect(() => save(PROGRESS_KEY, { day, guesses }), [day, guesses])
  useEffect(() => save(STATS_KEY, stats), [stats])

  function addGuess(guess: Guess) {
    const next = [...guesses, guess]
    setProgress({ day, guesses: next })
    const { finished, won } = roundState(next)
    if (!finished) return
    const points = scoreFor(next)
    setStats((s) => {
      const distribution = [...s.distribution]
      distribution[points]++
      const streak = won ? (s.lastWonDay === day - 1 ? s.streak + 1 : 1) : 0
      return {
        played: s.played + 1,
        wins: s.wins + (won ? 1 : 0),
        totalScore: s.totalScore + points,
        streak,
        maxStreak: Math.max(s.maxStreak, streak),
        lastWonDay: won ? day : s.lastWonDay,
        distribution,
      }
    })
  }

  // a sequência só vale se o último acerto foi hoje ou ontem
  const currentStreak = stats.lastWonDay >= day - 1 ? stats.streak : 0

  return (
    <div className="flex flex-col gap-5">
      <StatsBar
        items={[
          ['Desafio', `#${day}`],
          ['Sequência', currentStreak],
          ['Recorde', stats.maxStreak],
          ['Vitórias', stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : '–'],
        ]}
      />
      <Round
        key={day}
        movie={movie}
        guesses={guesses}
        onGuess={addGuess}
        result={
          <ResultPanel
            movie={movie}
            score={score}
            shareText={`🎬 Qual é o Filme? #${day} ${score}/${MAX_ATTEMPTS}\n${resultSquares(guesses)}\n${location.href}`}
          >
            <Countdown onNewDay={() => setDay(dailyNumber())} />
          </ResultPanel>
        }
      />
      {roundState(guesses).finished && <Distribution distribution={stats.distribution} highlight={score} />}
    </div>
  )
}

function Distribution({ distribution, highlight }: { distribution: number[]; highlight: number }) {
  const max = Math.max(1, ...distribution)
  return (
    <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Seus resultados no Filme do Dia</h2>
      <ul className="space-y-1">
        {[...distribution.keys()].reverse().map((points) => (
          <li key={points} className="flex items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-right text-zinc-400">{points === 0 ? 'errou' : `${points} ${points === 1 ? 'pt' : 'pts'}`}</span>
            <span
              className={`rounded px-2 py-0.5 text-right font-semibold ${points === highlight ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-700 text-zinc-100'}`}
              style={{ width: `${Math.max(8, (distribution[points] / max) * 100)}%` }}
            >
              {distribution[points]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
