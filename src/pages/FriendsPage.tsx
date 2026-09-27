import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { RankingBoard, type RankingPeriod } from '../components/RankingBoard'
import { useFriends } from '../friends/FriendsProvider'
import {
  acceptFriendRequest,
  clearInvite,
  getProfileByUsername,
  inviteLink,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
  type FriendState,
  type PublicProfile,
} from '../lib/friends'

const btn = 'rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50'
const btnPrimary = `${btn} bg-amber-400 text-zinc-950 hover:bg-amber-300`
const btnGhost = `${btn} bg-zinc-800 text-zinc-200 hover:bg-zinc-700`

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function PersonRow({ person, children }: { person: PublicProfile; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-zinc-950/60 px-3 py-2">
      <Avatar config={person.avatar} name={person.first_name} size={36} />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold text-zinc-100">
          {person.first_name} {person.last_name}
        </span>{' '}
        <span className="text-zinc-500">@{person.username}</span>
      </span>
      <span className="flex shrink-0 gap-1.5">{children}</span>
    </li>
  )
}

export function FriendsPage({ invite }: { invite: string | null }) {
  const { profile } = useAuth()
  const { friendships, loaded, refresh } = useFriends()
  const myId = profile!.id
  const [period, setPeriod] = useState<RankingPeriod>(1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [invited, setInvited] = useState<PublicProfile | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stateOf = (id: string): FriendState | undefined => friendships.find((f) => f.other.id === id)?.state
  const incoming = friendships.filter((f) => f.state === 'incoming')
  const outgoing = friendships.filter((f) => f.state === 'outgoing')
  const friends = friendships.filter((f) => f.state === 'friend')

  // convite por link (?amigo=apelido)
  useEffect(() => {
    if (!invite) return
    if (invite === profile?.username) {
      clearInvite()
      return
    }
    getProfileByUsername(invite)
      .then((p) => {
        setInvited(p)
        if (!p) clearInvite()
      })
      .catch(() => setInvited(null))
  }, [invite, profile?.username])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProfiles(query, myId)
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, myId])

  async function run(id: string, action: () => Promise<void>) {
    setBusy(id)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setBusy(null)
    }
  }

  const add = (p: PublicProfile) =>
    run(p.id, async () => {
      // se a pessoa já tinha me pedido, adicionar = aceitar
      if (stateOf(p.id) === 'incoming') await acceptFriendRequest(myId, p.id)
      else await sendFriendRequest(myId, p.id)
      if (p.id === invited?.id) clearInvite()
    })

  function actionFor(p: PublicProfile) {
    const state = stateOf(p.id)
    if (state === 'friend') return <span className="text-xs text-emerald-400">Amigos ✓</span>
    if (state === 'outgoing') return <span className="text-xs text-zinc-500">Pedido enviado</span>
    return (
      <button type="button" disabled={busy === p.id} onClick={() => add(p)} className={btnPrimary}>
        {state === 'incoming' ? 'Aceitar' : 'Adicionar'}
      </button>
    )
  }

  async function shareInvite() {
    const url = inviteLink(profile!.username)
    const text = `Bora jogar Qual é o Filme? Me adiciona: @${profile!.username}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text, url })
        return
      }
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {invited && stateOf(invited.id) !== 'friend' && (
        <Card title="Convite">
          <ul>
            <PersonRow person={invited}>{actionFor(invited)}</PersonRow>
          </ul>
        </Card>
      )}

      {incoming.length > 0 && (
        <Card title={`Pedidos de amizade (${incoming.length})`}>
          <ul className="flex flex-col gap-1.5">
            {incoming.map((f) => (
              <PersonRow key={f.other.id} person={f.other}>
                <button
                  type="button"
                  disabled={busy === f.other.id}
                  onClick={() => run(f.other.id, () => acceptFriendRequest(myId, f.other.id))}
                  className={btnPrimary}
                >
                  Aceitar
                </button>
                <button
                  type="button"
                  disabled={busy === f.other.id}
                  onClick={() => run(f.other.id, () => removeFriendship(myId, f.other.id))}
                  className={btnGhost}
                >
                  Recusar
                </button>
              </PersonRow>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Ranking do Filme do Dia"
        right={
          <div className="flex rounded-lg bg-zinc-950 p-0.5 text-xs ring-1 ring-zinc-800">
            {([1, 7, 30] as RankingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 font-semibold ${period === p ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                {p === 1 ? 'Hoje' : `${p} dias`}
              </button>
            ))}
          </div>
        }
      >
        <RankingBoard period={period} reloadKey={friends.length} />
      </Card>

      <Card title="Adicionar amigos">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pelo apelido"
            aria-label="Buscar pelo apelido"
            className="w-full rounded-lg bg-zinc-950 py-2.5 pr-3 pl-7 ring-1 ring-zinc-700 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {query.replace(/^@/, '').trim().length >= 2 &&
          (results.length ? (
            <ul className="flex flex-col gap-1.5">
              {results.map((p) => (
                <PersonRow key={p.id} person={p}>
                  {actionFor(p)}
                </PersonRow>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Ninguém encontrado com esse apelido.</p>
          ))}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-950/60 px-3 py-2.5 text-sm">
          <span className="text-zinc-400">
            Ou mande seu link de convite — quem abrir já vê o botão para te adicionar.
          </span>
          <button type="button" onClick={shareInvite} className={btnGhost}>
            {copied ? 'Link copiado!' : 'Compartilhar convite'}
          </button>
        </div>
      </Card>

      {error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-800">{error}</p>}

      <Card title={`Amigos${friends.length ? ` (${friends.length})` : ''}`}>
        {!loaded ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : friends.length === 0 && outgoing.length === 0 ? (
          <p className="text-sm text-zinc-500">Você ainda não adicionou ninguém.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {friends.map((f) => (
              <PersonRow key={f.other.id} person={f.other}>
                <button
                  type="button"
                  disabled={busy === f.other.id}
                  onClick={() => {
                    if (confirm(`Desfazer a amizade com @${f.other.username}?`))
                      run(f.other.id, () => removeFriendship(myId, f.other.id))
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Remover
                </button>
              </PersonRow>
            ))}
            {outgoing.map((f) => (
              <PersonRow key={f.other.id} person={f.other}>
                <span className="self-center text-xs text-zinc-500">aguardando</span>
                <button
                  type="button"
                  disabled={busy === f.other.id}
                  onClick={() => run(f.other.id, () => removeFriendship(myId, f.other.id))}
                  className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
