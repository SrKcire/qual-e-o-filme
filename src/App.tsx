import { useState } from 'react'
import { load, save } from './lib/storage'
import { DailyMode } from './modes/DailyMode'
import { FreeMode } from './modes/FreeMode'
import { PartyMode } from './modes/PartyMode'

const MODES = [
  { id: 'daily', label: 'Filme do Dia', icon: '📅' },
  { id: 'free', label: 'Livre', icon: '🎞️' },
  { id: 'party', label: 'Festa', icon: '🎉' },
] as const

type Mode = (typeof MODES)[number]['id']

const MODE_KEY = 'qef:mode'

export default function App() {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = load<string>(MODE_KEY, 'daily')
    return MODES.some((m) => m.id === saved) ? (saved as Mode) : 'daily'
  })

  function choose(m: Mode) {
    setMode(m)
    save(MODE_KEY, m)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          🎬 Qual é o <span className="text-amber-400">Filme?</span>
        </h1>
        <nav className="flex rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800" aria-label="Modo de jogo">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => choose(m.id)}
              aria-current={mode === m.id ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                mode === m.id ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span aria-hidden>{m.icon}</span> {m.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {mode === 'daily' && <DailyMode />}
        {mode === 'free' && <FreeMode />}
        {mode === 'party' && <PartyMode />}
      </main>

      <footer className="mt-auto pt-6 text-center text-xs text-zinc-600">
        Imagens:{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
          TMDB
        </a>
        . Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
      </footer>
    </div>
  )
}
