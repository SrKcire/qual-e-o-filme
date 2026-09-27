import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Film, Search, SkipForward } from 'lucide-react'
import { normalize, stripYear, suggestionPool } from '../lib/game'

interface Props {
  onGuess: (text: string) => void
  /** Sem onSkip, o botão Pular não aparece (ex.: sala ao vivo) */
  onSkip?: () => void
  disabled?: boolean
  /** Muda a cada chute errado: o campo "treme" */
  wrongCount?: number
}

export function GuessInput({ onGuess, onSkip, disabled = false, wrongCount = 0 }: Props) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [shaking, setShaking] = useState(false)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (wrongCount > 0) setShaking(true)
  }, [wrongCount])

  const suggestions = useMemo(() => {
    const q = normalize(text)
    if (q.length < 2) return []
    return suggestionPool.filter((s) => normalize(s).includes(q)).slice(0, 8)
  }, [text])

  function submit(value: string) {
    const guess = stripYear(value).trim()
    if (!guess || disabled) return
    onGuess(guess)
    setText('')
    setOpen(false)
    setHighlight(0)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') submit(text)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row ${shaking ? 'animate-shake' : ''}`}
      onAnimationEnd={() => setShaking(false)}
    >
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="text"
          value={text}
          placeholder="Qual é o filme?"
          autoComplete="off"
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl bg-zinc-900/80 py-3.5 pr-4 pl-11 text-zinc-100 ring-1 ring-white/10 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-900 focus:ring-2 focus:ring-amber-400/80 disabled:opacity-50"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute bottom-full z-20 mb-2 w-full overflow-hidden rounded-xl bg-zinc-900/95 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur">
            {suggestions.map((s, i) => {
              const year = s.match(/\((\d{4})\)$/)?.[1]
              return (
                <li key={s}>
                  <button
                    type="button"
                    aria-label={s}
                    // mousedown antes do blur do input, senão a lista fecha antes do clique
                    onMouseDown={(e) => {
                      e.preventDefault()
                      submit(s)
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      i === highlight ? 'bg-white/10 text-zinc-50' : 'text-zinc-300'
                    }`}
                  >
                    <Film size={15} className={i === highlight ? 'text-amber-400' : 'text-zinc-600'} aria-hidden />
                    <span className="flex-1 truncate">{stripYear(s)}</span>
                    {year && <span className="text-xs text-zinc-500 tabular-nums">({year})</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => submit(text)} disabled={disabled} className="btn-gold flex-1 px-6 py-3.5 sm:flex-none">
          Chutar
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-3.5 font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-zinc-100 sm:flex-none"
          >
            <SkipForward size={16} aria-hidden />
            Pular
          </button>
        )}
      </div>
    </div>
  )
}
