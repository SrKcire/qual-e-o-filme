import { useEffect, useState } from 'react'
import { Globe, Smartphone } from 'lucide-react'
import { PrimaryButton, ResultPanel } from '../components/ResultPanel'
import { Round } from '../components/Round'
import { MAX_ATTEMPTS, movieById, movies, scoreFor, shuffle, type Guess } from '../lib/game'
import { load, save } from '../lib/storage'
import { LiveMode } from './LiveMode'

interface Player {
  name: string
  /** Pontos de cada rodada já jogada */
  scores: number[]
}

interface Party {
  players: Player[]
  rounds: number
  /** Vez global: jogador = turn % players, rodada = turn / players */
  turn: number
  queue: number[]
  guesses: Guess[]
  /** O jogador da vez já confirmou que está pronto (evita espiar o frame na troca) */
  ready: boolean
}

const PARTY_KEY = 'qef:party'
const SETUP_KEY = 'qef:party-setup'
const MAX_PLAYERS = 8

const total = (p: Player) => p.scores.reduce((a, b) => a + b, 0)

/** Vários jogadores revezando no mesmo aparelho, cada um com o seu filme */
function LocalParty() {
  const [party, setParty] = useState<Party | null>(() => {
    const saved = load<Party | null>(PARTY_KEY, null)
    // descarta partida salva se algum filme saiu do catálogo
    return saved?.queue.every((id) => movieById(id)) ? saved : null
  })

  useEffect(() => save(PARTY_KEY, party), [party])

  function start(names: string[], rounds: number) {
    setParty({
      players: names.map((name) => ({ name, scores: [] })),
      rounds,
      turn: 0,
      queue: shuffle(movies.map((m) => m.id)).slice(0, names.length * rounds),
      guesses: [],
      ready: false,
    })
  }

  if (!party) return <Setup onStart={start} />
  if (party.turn >= party.players.length * party.rounds)
    return (
      <Podium
        party={party}
        onRematch={() => start(party.players.map((p) => p.name), party.rounds)}
        onNew={() => setParty(null)}
      />
    )
  return <Playing party={party} setParty={setParty} onQuit={() => setParty(null)} />
}

function Setup({ onStart }: { onStart: (names: string[], rounds: number) => void }) {
  const saved = load(SETUP_KEY, { names: ['', ''], rounds: 3 })
  const [names, setNames] = useState<string[]>(saved.names)
  const [rounds, setRounds] = useState<number>(saved.rounds)

  const filled = names.map((n, i) => n.trim() || `Jogador ${i + 1}`)
  const maxRounds = Math.max(1, Math.min(10, Math.floor(movies.length / names.length)))
  const safeRounds = Math.min(rounds, maxRounds)

  function start() {
    save(SETUP_KEY, { names, rounds: safeRounds })
    onStart(filled, safeRounds)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 card p-5">
      <div>
        <h2 className="font-display text-3xl tracking-wide">Mesmo aparelho</h2>
        <p className="text-sm text-zinc-400">
          Cada jogador recebe um filme diferente por rodada, na sua vez. Quem somar mais pontos no fim vence.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-300">Jogadores</span>
        {names.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={name}
              maxLength={20}
              placeholder={`Jogador ${i + 1}`}
              onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
              className="flex-1 rounded-xl bg-zinc-950/80 px-3 py-2 ring-1 ring-white/10 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400"
            />
            {names.length > 2 && (
              <button
                type="button"
                aria-label={`Remover ${filled[i]}`}
                onClick={() => setNames(names.filter((_, j) => j !== i))}
                className="rounded-lg px-3 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {names.length < MAX_PLAYERS && (
          <button
            type="button"
            onClick={() => setNames([...names, ''])}
            className="rounded-lg border border-dashed border-zinc-700 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            + Adicionar jogador
          </button>
        )}
      </div>

      <label className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-300">
        Rodadas por jogador
        <select
          value={safeRounds}
          onChange={(e) => setRounds(Number(e.target.value))}
          className="rounded-xl bg-zinc-950/80 px-3 py-2 ring-1 ring-white/10"
        >
          {Array.from({ length: maxRounds }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={start} className="btn-gold py-3">
        Começar partida
      </button>
    </div>
  )
}

function Scoreboard({ players, current }: { players: Player[]; current?: number }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {players.map((p, i) => (
        <li
          key={i}
          className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${i === current ? 'bg-amber-400/15 ring-amber-400 text-amber-200' : 'bg-white/5 ring-white/10 text-zinc-300'}`}
        >
          {p.name} <strong className="ml-1 text-zinc-100">{total(p)}</strong>
        </li>
      ))}
    </ul>
  )
}

interface PlayingProps {
  party: Party
  setParty: (p: Party) => void
  onQuit: () => void
}

function Playing({ party, setParty, onQuit }: PlayingProps) {
  const { players, rounds, turn, guesses } = party
  const playerIndex = turn % players.length
  const player = players[playerIndex]
  const round = Math.floor(turn / players.length) + 1
  const movie = movieById(party.queue[turn])!
  const score = scoreFor(guesses)
  const isLastTurn = turn + 1 >= players.length * rounds
  const nextPlayer = players[(turn + 1) % players.length]

  function next() {
    setParty({
      ...party,
      players: players.map((p, i) => (i === playerIndex ? { ...p, scores: [...p.scores, score] } : p)),
      turn: turn + 1,
      guesses: [],
      ready: false,
    })
  }

  function quit() {
    if (confirm('Encerrar a partida? O placar será perdido.')) onQuit()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-zinc-400">
          Rodada <strong className="text-zinc-100">{round}</strong> de {rounds}
        </p>
        <Scoreboard players={players} current={playerIndex} />
      </div>

      {party.ready ? (
        <Round
          key={turn}
          movie={movie}
          guesses={guesses}
          onGuess={(g) => setParty({ ...party, guesses: [...guesses, g] })}
          result={
            <ResultPanel movie={movie} score={score} winMessage={`${player.name} acertou!`}>
              <PrimaryButton onClick={next}>{isLastTurn ? 'Ver resultado final 🏆' : `Vez de ${nextPlayer.name} →`}</PrimaryButton>
            </ResultPanel>
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-4 card px-5 py-12 text-center">
          <p className="text-sm uppercase tracking-widest text-zinc-500">Passe o aparelho para</p>
          <p className="font-display text-6xl tracking-wide text-amber-400">{player.name}</p>
          <p className="text-sm text-zinc-400">
            {MAX_ATTEMPTS} frames, até {MAX_ATTEMPTS} pontos. Boa sorte!
          </p>
          <PrimaryButton onClick={() => setParty({ ...party, ready: true })}>Começar minha vez</PrimaryButton>
        </div>
      )}

      <button type="button" onClick={quit} className="self-center text-xs text-zinc-600 underline hover:text-zinc-400">
        Encerrar partida
      </button>
    </div>
  )
}

function Podium({ party, onRematch, onNew }: { party: Party; onRematch: () => void; onNew: () => void }) {
  const ranking = [...party.players].sort((a, b) => total(b) - total(a))
  const best = total(ranking[0])
  const winners = ranking.filter((p) => total(p) === best)
  const medals = ['🥇', '🥈', '🥉']
  // posição com empates: quem tem a mesma pontuação divide a colocação
  const place = (p: Player) => ranking.findIndex((q) => total(q) === total(p))

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h2 className="mt-2 font-display text-4xl tracking-wide">
          {winners.length > 1 ? `Empate entre ${winners.map((w) => w.name).join(' e ')}!` : `${winners[0].name} venceu!`}
        </h2>
        <p className="text-sm text-zinc-400">
          {party.rounds} {party.rounds === 1 ? 'rodada' : 'rodadas'} · máximo possível: {party.rounds * MAX_ATTEMPTS} pontos
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {ranking.map((p, i) => (
          <li key={i} className="flex items-center gap-3 card px-4 py-3">
            <span className="w-8 text-center text-xl">{medals[place(p)] ?? `${place(p) + 1}º`}</span>
            <span className="flex-1 font-semibold">{p.name}</span>
            <span className="text-xs text-zinc-500">{p.scores.join(' + ')}</span>
            <span className="w-10 text-right font-display text-3xl text-amber-300">{total(p)}</span>
          </li>
        ))}
      </ol>

      <div className="flex justify-center gap-2">
        <button type="button" onClick={onNew} className="rounded-lg bg-white/5 ring-1 ring-white/10 px-4 py-2 font-semibold hover:bg-white/10">
          Novo jogo
        </button>
        <PrimaryButton onClick={onRematch}>Revanche</PrimaryButton>
      </div>
    </div>
  )
}

type PartyKind = 'local' | 'online'
const KIND_KEY = 'qef:party-kind'

/** Festa: revezando no mesmo aparelho ou numa sala online, cada um no seu celular */
export function PartyMode({ roomCode }: { roomCode: string | null }) {
  const [kind, setKind] = useState<PartyKind>(() => (roomCode ? 'online' : load<PartyKind>(KIND_KEY, 'online')))

  function choose(k: PartyKind) {
    setKind(k)
    save(KIND_KEY, k)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card mx-auto flex w-full max-w-md gap-1 p-1 text-sm" role="tablist">
        {(
          [
            ['online', 'Sala online', Globe],
            ['local', 'Mesmo aparelho', Smartphone],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => choose(k)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 font-semibold transition ${
              kind === k ? 'bg-white/10 text-zinc-50 ring-1 ring-white/15' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon size={15} strokeWidth={2.2} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {kind === 'online' ? <LiveMode initialCode={roomCode} /> : <LocalParty />}
    </div>
  )
}
