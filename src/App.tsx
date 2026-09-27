import { useEffect, useRef, useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import { Avatar } from './components/Avatar'
import { clearSyncedData, startSync, stopSync } from './lib/cloud'
import { load, save } from './lib/storage'
import { DailyMode } from './modes/DailyMode'
import { FreeMode } from './modes/FreeMode'
import { PartyMode } from './modes/PartyMode'
import { LoginPage, NewPasswordPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'

const MODES = [
  { id: 'daily', label: 'Filme do Dia', icon: '📅' },
  { id: 'free', label: 'Livre', icon: '🎞️' },
  { id: 'party', label: 'Festa', icon: '🎉' },
] as const

type Mode = (typeof MODES)[number]['id']
type View = 'game' | 'login' | 'profile'

const MODE_KEY = 'qef:mode'

export default function App() {
  const { session, profile, loading, recovering, finishRecovery } = useAuth()
  const [view, setView] = useState<View>('game')
  const [mode, setMode] = useState<Mode>(() => {
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
    if (session && view === 'login') setView('game')
  }, [session, view])

  function chooseMode(m: Mode) {
    setMode(m)
    save(MODE_KEY, m)
    setView('game')
  }

  const needsProfile = !!session && !loading && !profile
  const screen: View = needsProfile ? 'profile' : view

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setView('game')} className="text-left">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            🎬 Qual é o <span className="text-amber-400">Filme?</span>
          </h1>
        </button>
        <AccountButton onLogin={() => setView('login')} onProfile={() => setView('profile')} />
        <nav className="flex w-full justify-center rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800 sm:w-auto" aria-label="Modo de jogo">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => chooseMode(m.id)}
              aria-current={screen === 'game' && mode === m.id ? 'page' : undefined}
              className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold transition sm:flex-none sm:px-3 ${
                screen === 'game' && mode === m.id ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span aria-hidden>{m.icon}</span> {m.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {recovering ? (
          <NewPasswordPage onDone={finishRecovery} />
        ) : (
          screen === 'login' && <LoginPage onCancel={() => setView('game')} />
        )}
        {!recovering && screen === 'profile' && <ProfilePage key={profile?.id ?? 'new'} onDone={() => setView('game')} />}
        {!recovering && screen === 'game' && (
          <div key={dataVersion}>
            {mode === 'daily' && <DailyMode />}
            {mode === 'free' && <FreeMode />}
            {mode === 'party' && <PartyMode />}
          </div>
        )}
      </main>

      <footer className="mt-auto flex flex-col gap-1 pt-6 text-center text-xs text-zinc-600">
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

function AccountButton({ onLogin, onProfile }: { onLogin: () => void; onProfile: () => void }) {
  const { session, profile, loading } = useAuth()
  if (loading && session) return <span className="h-9 w-9 animate-pulse rounded-full bg-zinc-800 sm:order-last" />
  if (!session)
    return (
      <button
        type="button"
        onClick={onLogin}
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 sm:order-last"
      >
        Entrar
      </button>
    )
  return (
    <button
      type="button"
      onClick={onProfile}
      title="Seu perfil"
      className="flex items-center gap-2 rounded-full py-0.5 pr-3 pl-0.5 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-900 sm:order-last"
    >
      <Avatar config={profile?.avatar ?? null} name={profile?.first_name} size={32} />
      {profile ? `@${profile.username}` : 'Perfil'}
    </button>
  )
}
