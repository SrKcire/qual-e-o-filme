import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Clapperboard, Film, LogIn, PartyPopper, Users } from 'lucide-react'
import { useAuth } from './auth/AuthProvider'
import { Avatar } from './components/Avatar'
import { clearSyncedData, startSync, stopSync } from './lib/cloud'
import { load, save } from './lib/storage'
import { DailyMode } from './modes/DailyMode'
import { FreeMode } from './modes/FreeMode'
import { PartyMode } from './modes/PartyMode'
import { LoginPage, NewPasswordPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { useFriends } from './friends/FriendsProvider'
import { takeInviteFromUrl } from './lib/friends'
import { normalizeRoomCode } from './live/protocol'

const MODES = [
  { id: 'daily', label: 'Filme do Dia', Icon: CalendarDays },
  { id: 'free', label: 'Livre', Icon: Film },
  { id: 'party', label: 'Festa', Icon: PartyPopper },
] as const

type Mode = (typeof MODES)[number]['id']
type View = 'game' | 'login' | 'profile' | 'friends'

const MODE_KEY = 'qef:mode'

function takeRoomFromUrl(): string | null {
  const params = new URLSearchParams(location.search)
  const code = params.get('sala')
  if (!code) return null
  params.delete('sala')
  const qs = params.toString()
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash)
  return normalizeRoomCode(code) || null
}

export default function App() {
  const { session, profile, loading, recovering, finishRecovery } = useAuth()
  const [view, setView] = useState<View>('game')
  // convite por link (?amigo=apelido): abre a página de amigos quando a pessoa estiver logada
  const [invite] = useState(takeInviteFromUrl)
  // link de sala ao vivo (?sala=CODIGO): abre a Festa já com o código
  const [roomCode] = useState(takeRoomFromUrl)
  const [mode, setMode] = useState<Mode>(() => {
    if (roomCode) return 'party'
    const saved = load<string>(MODE_KEY, 'daily')
    return MODES.some((m) => m.id === saved) ? (saved as Mode) : 'daily'
  })
  // muda quando os dados locais são trocados pelos da conta, para os modos recarregarem
  const [dataVersion, setDataVersion] = useState(0)
  const syncedUser = useRef<string | null>(null)
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (userId === syncedUser.current) return
    const previous = syncedUser.current
    syncedUser.current = userId
    if (userId) {
      startSync(userId).then((changed) => changed && setDataVersion((v) => v + 1))
    } else if (previous) {
      stopSync()
      clearSyncedData()
      setDataVersion((v) => v + 1)
    }
  }, [userId])

  // voltou do link de login: sai da tela de login
  useEffect(() => {
    if (session && view === 'login') setView(invite ? 'friends' : 'game')
  }, [session, view, invite])

  useEffect(() => {
    if (!invite || loading) return
    if (profile) setView('friends')
    else if (!session) setView('login')
  }, [invite, loading, profile, session])

  function chooseMode(m: Mode) {
    setMode(m)
    save(MODE_KEY, m)
    setView('game')
  }

  const needsProfile = !!session && !loading && !profile
  const screen: View = needsProfile ? 'profile' : view === 'friends' && !profile ? 'game' : view

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pt-5 pb-8 sm:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
        <button type="button" onClick={() => setView('game')} className="group flex items-center gap-2.5 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-950 shadow-[0_6px_20px_-6px_rgb(247_183_51/0.7)] transition group-hover:-rotate-6">
            <Clapperboard size={22} strokeWidth={2.2} aria-hidden />
          </span>
          <h1 className="font-display text-[2rem] leading-none tracking-wide sm:text-[2.4rem]">
            Qual é o <span className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">Filme?</span>
          </h1>
        </button>
        <div className="flex items-center gap-2">
          {profile && <FriendsButton active={screen === 'friends'} onClick={() => setView('friends')} />}
          <AccountButton onLogin={() => setView('login')} onProfile={() => setView('profile')} />
        </div>
        <nav className="card order-last flex w-full gap-1 p-1.5" aria-label="Modo de jogo">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => chooseMode(m.id)}
              aria-current={screen === 'game' && mode === m.id ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold transition sm:px-3 ${
                screen === 'game' && mode === m.id
                  ? 'bg-zinc-100 text-zinc-950 shadow-[0_4px_16px_-6px_rgb(255_255_255/0.4)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <m.Icon size={16} strokeWidth={2.2} aria-hidden className="shrink-0" />
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="animate-rise" key={screen === 'game' ? mode : screen}>
        {recovering ? (
          <NewPasswordPage onDone={finishRecovery} />
        ) : (
          screen === 'login' && <LoginPage onCancel={() => setView('game')} />
        )}
        {!recovering && screen === 'friends' && <FriendsPage invite={invite} />}
        {!recovering && screen === 'profile' && <ProfilePage key={profile?.id ?? 'new'} onDone={() => setView('game')} />}
        {!recovering && screen === 'game' && (
          <div key={dataVersion}>
            {mode === 'daily' && <DailyMode />}
            {mode === 'free' && <FreeMode />}
            {mode === 'party' && <PartyMode roomCode={roomCode} />}
          </div>
        )}
      </main>

      <footer className="mt-auto flex flex-col gap-1 border-t border-white/5 pt-6 text-center text-[11px] leading-relaxed text-zinc-600">
        <p>
          Imagens:{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
            TMDB
          </a>
          . Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
        </p>
        <p>
          Avatares:{' '}
          <a href="https://www.dicebear.com" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
            DiceBear
          </a>{' '}
          — Adventurer por Lisa Wischofsky (CC BY 4.0), Avataaars por Pablo Stanley, Notionists por Zoish (CC0).
        </p>
      </footer>
    </div>
  )
}

function FriendsButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { friendships } = useFriends()
  const pending = friendships.filter((f) => f.state === 'incoming').length
  return (
    <button
      type="button"
      onClick={onClick}
      title="Amigos e ranking"
      aria-label={pending ? `Amigos e ranking, ${pending} pedido(s) de amizade` : 'Amigos e ranking'}
      className={`relative grid h-10 w-10 place-items-center rounded-full ring-1 transition hover:bg-white/5 ${
        active ? 'bg-amber-400/15 text-amber-300 ring-amber-400/60' : 'text-zinc-300 ring-white/10'
      }`}
    >
      <Users size={18} strokeWidth={2.2} aria-hidden />
      {pending > 0 && (
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-curtain-500 px-1 text-[11px] font-bold text-white ring-2 ring-zinc-950">
          {pending}
        </span>
      )}
    </button>
  )
}

function AccountButton({ onLogin, onProfile }: { onLogin: () => void; onProfile: () => void }) {
  const { session, profile, loading } = useAuth()
  if (loading && session) return <span className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
  if (!session)
    return (
      <button
        type="button"
        onClick={onLogin}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-zinc-100 ring-1 ring-white/15 transition hover:bg-white/5"
      >
        <LogIn size={16} strokeWidth={2.2} aria-hidden />
        Entrar
      </button>
    )
  return (
    <button
      type="button"
      onClick={onProfile}
      title="Seu perfil"
      aria-label={profile ? `Seu perfil, @${profile.username}` : 'Seu perfil'}
      className="flex items-center gap-2 rounded-full p-0.5 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/5 sm:pr-3.5"
    >
      <Avatar config={profile?.avatar ?? null} name={profile?.first_name} size={34} />
      {/* no celular só o avatar, para caber na linha do título */}
      <span className="hidden max-w-40 truncate sm:inline">{profile ? `@${profile.username}` : 'Perfil'}</span>
    </button>
  )
}
