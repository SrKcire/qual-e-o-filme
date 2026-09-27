import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { dailyNumber, resultSquares, type GuessResult } from '../lib/game'
import { fetchRanking, type RankingRow } from '../lib/friends'
import { Avatar } from './Avatar'

export type RankingPeriod = 1 | 7 | 30

const medals = ['🥇', '🥈', '🥉']

interface Props {
  period: RankingPeriod
  /** Muda para forçar recarregar (ex.: depois de terminar o Filme do Dia) */
  reloadKey?: unknown
}

export function RankingBoard({ period, reloadKey }: Props) {
  const { profile } = useAuth()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState(false)
  const today = dailyNumber()
  const from = Math.max(1, today - period + 1)

  useEffect(() => {
    let active = true
    setError(false)
    fetchRanking(from, today)
      .then((r) => active && setRows(r))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [from, today, reloadKey])

  if (error) return <p className="text-sm text-red-300">Não foi possível carregar o ranking.</p>
  if (!rows) return <p className="text-sm text-zinc-500">Carregando ranking…</p>

  const daysPlayed = (r: RankingRow) => r.days.size
  const sorted = [...rows].sort(
    (a, b) => b.total - a.total || daysPlayed(b) - daysPlayed(a) || a.user.username.localeCompare(b.user.username),
  )
  // quem não jogou nenhum dia no período fica sem posição
  const played = sorted.filter((r) => daysPlayed(r) > 0)
  const place = (r: RankingRow) => played.findIndex((p) => p.total === r.total && daysPlayed(p) === daysPlayed(r))

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1.5">
        {sorted.map((r) => {
          const me = r.user.id === profile?.id
          const hasPlayed = daysPlayed(r) > 0
          const todayResult = r.days.get(today)
          return (
            <li
              key={r.user.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${me ? 'bg-amber-400/10 ring-1 ring-amber-400/40' : 'bg-zinc-950/60'}`}
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-zinc-400">
                {hasPlayed ? (medals[place(r)] ?? `${place(r) + 1}º`) : '–'}
              </span>
              <Avatar config={r.user.avatar} name={r.user.first_name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold text-zinc-100">{r.user.first_name}</span>{' '}
                <span className="text-zinc-500">@{r.user.username}</span>
              </span>
              {period === 1 ? (
                todayResult ? (
                  <span className="shrink-0 text-xs tracking-tight" aria-label={`${todayResult.score} pontos`}>
                    {resultSquares(todayResult.results.map((result) => ({ text: '', result: result as GuessResult })))}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-zinc-500 italic">ainda não jogou</span>
                )
              ) : (
                <span className="shrink-0 text-xs text-zinc-500">
                  {daysPlayed(r)} {daysPlayed(r) === 1 ? 'dia' : 'dias'}
                </span>
              )}
              <span className="w-8 shrink-0 text-right font-display text-2xl text-amber-300">{hasPlayed ? r.total : ''}</span>
            </li>
          )
        })}
      </ol>
      {rows.length <= 1 && (
        <p className="text-center text-sm text-zinc-500">Adicione amigos para comparar seus resultados.</p>
      )}
    </div>
  )
}
