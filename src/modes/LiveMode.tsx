import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { FrameViewer } from '../components/FrameViewer'
import { GuessInput } from '../components/GuessInput'
import { FRAMES_PER_ROUND, normalizeRoomCode, pointsFor, randomRoomCode, type Identity, type LivePlayer, type LiveSettings, type LiveState } from '../live/protocol'
import { useLiveRoom, type RoomStatus } from '../live/useLiveRoom'
import { frameUrl } from '../lib/game'
import { load, save } from '../lib/storage'

const GUEST_KEY = 'qef:guest'
const SETTINGS_KEY = 'qef:live-settings'
const ROOM_KEY = 'qef:live-room'

const card = 'card p-5'
const input =
  'w-full rounded-xl bg-zinc-950/80 px-3 py-2.5 ring-1 ring-white/10 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400'
const primary = 'btn-gold px-5 py-2.5'
const ghost = 'rounded-lg bg-white/5 ring-1 ring-white/10 px-4 py-2.5 font-semibold text-zinc-200 hover:bg-white/10'

interface Guest {
  id: string
  name: string
}

function loadGuest(): Guest {
  const saved = load<Guest | null>(GUEST_KEY, null)
  if (saved?.id) return saved
  const guest = { id: crypto.randomUUID(), name: '' }
  save(GUEST_KEY, guest)
  return guest
}

interface Joined {
  code: string
  host: boolean
  settings: LiveSettings
}

/** Sala online: todo mundo no próprio aparelho, vendo o mesmo frame ao mesmo tempo */
export function LiveMode({ initialCode }: { initialCode: string | null }) {
  const { profile } = useAuth()
  const [guest, setGuest] = useState(loadGuest)
  const [joined, setJoined] = useState<Joined | null>(() => {
    // recarregou a página no meio da partida: volta para a mesma sala como jogador
    const saved = load<Joined | null>(ROOM_KEY, null)
    return saved && !saved.host ? saved : null
  })

  const me: Identity = profile
    ? { id: profile.id, name: profile.first_name, avatar: profile.avatar }
    : { id: guest.id, name: guest.name.trim(), avatar: null }

  function enter(j: Joined) {
    save(ROOM_KEY, j)
    setJoined(j)
  }

  function leave() {
    save(ROOM_KEY, null)
    setJoined(null)
  }

  if (joined && me.name)
    return <LiveRoom key={`${joined.code}-${joined.host}`} joined={joined} me={me} onLeave={leave} />

  return (
    <Entry
      initialCode={initialCode}
      me={me}
      isGuest={!profile}
      onGuestName={(name) => {
        const g = { ...guest, name }
        setGuest(g)
        save(GUEST_KEY, g)
      }}
      onEnter={enter}
    />
  )
}

function Entry(props: {
  initialCode: string | null
  me: Identity
  isGuest: boolean
  onGuestName: (name: string) => void
  onEnter: (j: Joined) => void
}) {
  const [code, setCode] = useState(props.initialCode ?? '')
  const [settings, setSettings] = useState<LiveSettings>(() => load(SETTINGS_KEY, { rounds: 5, frameSeconds: 15 }))
  const nameOk = props.me.name.length > 0

  function create() {
    save(SETTINGS_KEY, settings)
    props.onEnter({ code: randomRoomCode(), host: true, settings })
  }

  function join() {
    const c = normalizeRoomCode(code)
    if (c.length === 4) props.onEnter({ code: c, host: false, settings })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className={`${card} flex items-center gap-3`}>
        <Avatar config={props.me.avatar} name={props.me.name || '?'} size={44} />
        {props.isGuest ? (
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-400">
            Seu nome na sala
            <input
              value={props.me.name}
              maxLength={20}
              placeholder="Como te chamam?"
              onChange={(e) => props.onGuestName(e.target.value)}
              className={input}
            />
          </label>
        ) : (
          <p className="text-sm text-zinc-400">
            Jogando como <strong className="text-zinc-100">{props.me.name}</strong>
          </p>
        )}
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="font-bold">Entrar numa sala</h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="CÓDIGO"
            aria-label="Código da sala"
            className={`${input} text-center font-display text-3xl tracking-[0.4em] uppercase`}
          />
          <button type="button" onClick={join} disabled={!nameOk || code.length !== 4} className={`${primary} whitespace-nowrap`}>
            Entrar na sala
          </button>
        </div>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="font-bold">Criar uma sala</h2>
        <p className="text-sm text-zinc-400">
          Todos veem o mesmo frame ao mesmo tempo. Um frame novo aparece a cada poucos segundos; acertou no 1º vale 6
          pontos, e quem acerta primeiro ganha +1.
        </p>
        <SettingsForm value={settings} onChange={setSettings} />
        <button type="button" onClick={create} disabled={!nameOk} className={primary}>
          Criar sala
        </button>
      </div>
      {!nameOk && <p className="text-center text-sm text-amber-300">Digite seu nome para jogar.</p>}
    </div>
  )
}

function SettingsForm({ value, onChange }: { value: LiveSettings; onChange: (s: LiveSettings) => void }) {
  const option = (active: boolean) =>
    `flex-1 rounded-md py-1.5 text-sm font-semibold ${active ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-300">Filmes na partida</span>
        <div className="flex rounded-lg bg-zinc-950 p-0.5 ring-1 ring-zinc-800">
          {[3, 5, 10].map((n) => (
            <button key={n} type="button" onClick={() => onChange({ ...value, rounds: n })} className={option(value.rounds === n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-300">Segundos por frame</span>
        <div className="flex rounded-lg bg-zinc-950 p-0.5 ring-1 ring-zinc-800">
          {[10, 15, 20, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...value, frameSeconds: n })}
              className={option(value.frameSeconds === n)}
            >
              {n}s
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Relógio que atualiza algumas vezes por segundo (para as contagens) */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [active])
  return now
}

function statusMessage(status: RoomStatus) {
  return {
    connecting: 'Conectando à sala…',
    ready: '',
    'not-found': 'Sala não encontrada. Confira o código — ou o anfitrião pode ter fechado a sala.',
    'host-gone': 'O anfitrião saiu e a sala foi encerrada.',
    error: 'Não foi possível conectar. Verifique sua internet e tente de novo.',
  }[status]
}

function LiveRoom({ joined, me, onLeave }: { joined: Joined; me: Identity; onLeave: () => void }) {
  const { state, deadline, status, actions } = useLiveRoom({ code: joined.code, host: joined.host, me, settings: joined.settings })
  const running = state?.phase === 'playing' || state?.phase === 'reveal'
  const now = useNow(running)
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000))

  if (status !== 'ready' || !state)
    return (
      <div className={`${card} mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center`}>
        <p className="text-sm text-zinc-300">{statusMessage(status) || 'Conectando…'}</p>
        {status !== 'connecting' && (
          <button type="button" onClick={onLeave} className={ghost}>
            Voltar
          </button>
        )}
      </div>
    )

  const isHost = state.hostId === me.id
  const mePlayer = state.players.find((p) => p.id === me.id)

  function leave() {
    if (!isHost || state?.phase === 'lobby' || confirm('Você é o anfitrião: se sair, a sala fecha para todos. Sair mesmo?')) onLeave()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        <span>
          Sala <strong className="font-mono tracking-widest text-zinc-100">{joined.code}</strong>
          {state.phase !== 'lobby' && state.phase !== 'final' && (
            <>
              {' '}
              · Filme <strong className="text-zinc-100">{state.round}</strong> de {state.settings.rounds}
            </>
          )}
        </span>
        <button type="button" onClick={leave} className="text-xs underline hover:text-zinc-200">
          Sair da sala
        </button>
      </div>

      {state.phase === 'lobby' && <Lobby state={state} code={joined.code} isHost={isHost} actions={actions} />}
      {state.phase === 'playing' && (
        <Playing state={state} me={mePlayer} secondsLeft={secondsLeft} deadline={deadline} now={now} onGuess={actions.guess} />
      )}
      {state.phase === 'reveal' && <Reveal state={state} secondsLeft={secondsLeft} />}
      {state.phase === 'final' && <Final state={state} isHost={isHost} onAgain={actions.backToLobby} onLeave={onLeave} />}
    </div>
  )
}

function PlayerChip({ p, showRound }: { p: LivePlayer; showRound: boolean }) {
  const icon = !p.online ? '💤' : p.status === 'correct' ? '✅' : p.status === 'wrong' ? '❌' : '🤔'
  return (
    <li className={`flex items-center gap-2.5 rounded-lg bg-zinc-950/60 px-3 py-2 ${p.online ? '' : 'opacity-50'}`}>
      <Avatar config={p.avatar} name={p.name} size={30} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
      {showRound && (
        <span className="shrink-0 text-xs text-zinc-400">
          {icon}
          {p.status === 'correct' && (
            <span className="ml-1 font-semibold text-emerald-400">
              +{p.roundPoints}
              {p.first && ' ⚡'}
            </span>
          )}
        </span>
      )}
      <span className="w-8 shrink-0 text-right font-display text-2xl text-amber-300">{p.score}</span>
    </li>
  )
}

function Lobby({
  state,
  code,
  isHost,
  actions,
}: {
  state: LiveState
  code: string
  isHost: boolean
  actions: ReturnType<typeof useLiveRoom>['actions']
}) {
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}${location.pathname}?sala=${code}`

  async function share() {
    const text = `Bora jogar Qual é o Filme? ao vivo! Sala ${code}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) return await navigator.share({ text, url: link })
      await navigator.clipboard.writeText(`${text}\n${link}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={`${card} flex flex-col items-center gap-3 text-center`}>
        <p className="text-sm text-zinc-400">Código da sala</p>
        <p className="font-display text-7xl leading-none tracking-[0.2em] text-amber-400 drop-shadow-[0_0_24px_rgb(247_183_51/0.35)]">{code}</p>
        <button type="button" onClick={share} className={ghost}>
          {copied ? 'Link copiado!' : 'Convidar amigos'}
        </button>
        <p className="text-xs text-zinc-500">Quem abrir o link entra direto — não precisa de conta.</p>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="font-bold">Jogadores ({state.players.length})</h2>
        <ul className="flex flex-col gap-1.5">
          {state.players.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-lg bg-zinc-950/60 px-3 py-2">
              <Avatar config={p.avatar} name={p.name} size={30} />
              <span className="flex-1 truncate text-sm font-semibold">{p.name}</span>
              {p.id === state.hostId && <span className="text-xs text-amber-300">anfitrião</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className={`${card} flex flex-col gap-4 md:col-span-2`}>
        {isHost ? (
          <>
            <SettingsForm value={state.settings} onChange={actions.updateSettings} />
            <button type="button" onClick={actions.start} className={primary}>
              Começar partida ({state.settings.rounds} filmes)
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-zinc-400">
            {state.settings.rounds} filmes · {state.settings.frameSeconds}s por frame
            <br />
            Esperando o anfitrião começar…
          </p>
        )}
      </div>
    </div>
  )
}

function Playing(props: {
  state: LiveState
  me: LivePlayer | undefined
  secondsLeft: number
  deadline: number
  now: number
  onGuess: (text: string) => void
}) {
  const { state, me } = props
  const revealed = state.frames.length
  const [viewing, setViewing] = useState(revealed - 1)
  // chegou frame novo: mostra ele
  const [seen, setSeen] = useState(revealed)
  if (seen !== revealed) {
    setSeen(revealed)
    setViewing(revealed - 1)
  }
  // depois de chutar, espera a resposta do anfitrião antes de liberar de novo
  const [pending, setPending] = useState(false)
  const [lastStatus, setLastStatus] = useState(me?.status)
  if (lastStatus !== me?.status || seen !== revealed) {
    setLastStatus(me?.status)
    if (pending) setPending(false)
  }

  // baixa o próximo frame antes da hora, para ele aparecer na hora certa
  useEffect(() => {
    if (state.next) new Image().src = frameUrl(state.next)
  }, [state.next])

  const total = state.settings.frameSeconds * 1000
  const progress = Math.max(0, Math.min(1, (props.deadline - props.now) / total))
  const canGuess = me?.status === 'guessing' && !pending

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${props.secondsLeft <= 3 ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm font-bold tabular-nums">{props.secondsLeft}s</span>
        </div>

        <FrameViewer frames={state.frames} revealed={revealed} current={Math.min(viewing, revealed - 1)} onSelect={setViewing} />

        {me?.status === 'correct' ? (
          <p className="rounded-lg bg-emerald-950/50 px-4 py-3 text-center font-semibold text-emerald-300 ring-1 ring-emerald-800">
            ✅ Você acertou! +{me.roundPoints} {me.first && '⚡ primeiro a acertar'}
          </p>
        ) : (
          <>
            <p className="text-center text-sm text-zinc-400">
              {me?.status === 'wrong' ? (
                <span className="text-red-300">❌ Errou — espere o próximo frame para chutar de novo</span>
              ) : (
                <>
                  Frame {revealed} de {FRAMES_PER_ROUND} · acertar agora vale{' '}
                  <strong className="text-amber-300">{pointsFor(state.frameIndex, false)}</strong> pontos
                </>
              )}
            </p>
            <GuessInput
              disabled={!canGuess}
              onGuess={(text) => {
                setPending(true)
                props.onGuess(text)
              }}
            />
          </>
        )}
      </div>

      <aside className={`${card} flex flex-col gap-2 self-start p-4`}>
        <h2 className="text-sm font-semibold text-zinc-300">Placar</h2>
        <ul className="flex flex-col gap-1.5">
          {state.players.map((p) => (
            <PlayerChip key={p.id} p={p} showRound />
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Reveal({ state, secondsLeft }: { state: LiveState; secondsLeft: number }) {
  const last = state.round >= state.settings.rounds
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-4">
        <FrameViewer frames={state.frames} revealed={state.frames.length} current={state.frames.length - 1} onSelect={() => {}} />
        <div className={`${card} text-center`}>
          <p className="text-sm text-zinc-400">O filme era</p>
          <p className="font-display text-4xl tracking-wide text-amber-300">{state.answer?.title}</p>
          <p className="text-sm text-zinc-500">
            {state.answer?.year}
            {state.answer && state.answer.originalTitle !== state.answer.title && ` · ${state.answer.originalTitle}`}
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            {last ? 'Resultado final' : 'Próximo filme'} em <strong className="text-zinc-100">{secondsLeft}s</strong>
          </p>
        </div>
      </div>
      <aside className={`${card} flex flex-col gap-2 self-start p-4`}>
        <h2 className="text-sm font-semibold text-zinc-300">Placar</h2>
        <ul className="flex flex-col gap-1.5">
          {state.players.map((p) => (
            <PlayerChip key={p.id} p={p} showRound />
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Final({ state, isHost, onAgain, onLeave }: { state: LiveState; isHost: boolean; onAgain: () => void; onLeave: () => void }) {
  const ranking = state.players
  const best = ranking[0]?.score ?? 0
  const winners = ranking.filter((p) => p.score === best)
  const medals = ['🥇', '🥈', '🥉']
  const place = (p: LivePlayer) => ranking.findIndex((q) => q.score === p.score)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h2 className="mt-2 font-display text-4xl tracking-wide">
          {winners.length > 1 ? `Empate entre ${winners.map((w) => w.name).join(' e ')}!` : `${winners[0]?.name} venceu!`}
        </h2>
        <p className="text-sm text-zinc-400">{state.settings.rounds} filmes</p>
      </div>
      <ol className="flex flex-col gap-2">
        {ranking.map((p) => (
          <li key={p.id} className="flex items-center gap-3 card px-4 py-3">
            <span className="w-8 text-center text-xl">{medals[place(p)] ?? `${place(p) + 1}º`}</span>
            <Avatar config={p.avatar} name={p.name} size={32} />
            <span className="flex-1 truncate font-semibold">{p.name}</span>
            <span className="font-display text-3xl text-amber-300">{p.score}</span>
          </li>
        ))}
      </ol>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={onLeave} className={ghost}>
          Sair
        </button>
        {isHost ? (
          <button type="button" onClick={onAgain} className={primary}>
            Jogar de novo
          </button>
        ) : (
          <p className="self-center text-sm text-zinc-500">O anfitrião pode começar outra partida.</p>
        )}
      </div>
    </div>
  )
}
