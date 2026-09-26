import { useMemo, useState, type KeyboardEvent } from 'react'
import { normalize, stripYear, suggestionPool } from '../lib/game'

interface Props {
  onGuess: (text: string) => void
  onSkip: () => void
}

export function GuessInput({ onGuess, onSkip }: Props) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const suggestions = useMemo(() => {
    const q = normalize(text)
    if (q.length < 2) return []
    return suggestionPool.filter((s) => normalize(s).includes(q)).slice(0, 8)
  }, [text])

  function submit(value: string) {
    const guess = stripYear(value).trim()
    if (!guess) return
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
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <input
          type="text"
          value={text}
          placeholder="Qual é o filme?"
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-zinc-100 ring-1 ring-zinc-700 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-amber-400"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute bottom-full z-10 mb-1 w-full overflow-hidden rounded-lg bg-zinc-900 shadow-xl ring-1 ring-zinc-700">
            {suggestions.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  // mousedown antes do blur do input, senão a lista fecha antes do clique
                  onMouseDown={(e) => {
                    e.preventDefault()
                    submit(s)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full px-4 py-2 text-left text-sm ${i === highlight ? 'bg-zinc-800 text-amber-300' : 'text-zinc-200'}`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit(text)}
          className="flex-1 rounded-lg bg-amber-400 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-300 sm:flex-none"
        >
          Chutar
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 rounded-lg bg-zinc-800 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-700 sm:flex-none"
        >
          Pular
        </button>
      </div>
    </div>
  )
}
