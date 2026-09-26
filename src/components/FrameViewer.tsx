import { useState } from 'react'
import { MAX_ATTEMPTS, frameUrl } from '../lib/game'

interface Props {
  frames: string[]
  revealed: number
  current: number
  onSelect: (index: number) => void
}

export function FrameViewer({ frames, revealed, current, onSelect }: Props) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const src = frameUrl(frames[current])

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
        {loadedSrc !== src && (
          <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">Carregando frame…</div>
        )}
        <img
          key={src}
          src={src}
          alt={`Frame ${current + 1}`}
          onLoad={() => setLoadedSrc(src)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loadedSrc === src ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const unlocked = i < revealed
          const active = i === current
          return (
            <button
              key={i}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(i)}
              aria-label={`Ver frame ${i + 1}`}
              className={`h-10 w-10 rounded-lg text-sm font-semibold transition ${
                active
                  ? 'bg-amber-400 text-zinc-950'
                  : unlocked
                    ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    : 'cursor-not-allowed bg-zinc-900 text-zinc-600 ring-1 ring-zinc-800'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
