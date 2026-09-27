import { useEffect, useState } from 'react'
import { MAX_ATTEMPTS, frameUrl } from '../lib/game'

interface Props {
  frames: string[]
  revealed: number
  current: number
  onSelect: (index: number) => void
}

/** Depois disso sem carregar, avisa que algo pode estar bloqueando as imagens */
const SLOW_MS = 8000

type LoadState = 'loading' | 'loaded' | 'error'

export function FrameViewer({ frames, revealed, current, onSelect }: Props) {
  const [retry, setRetry] = useState(0)
  const base = frameUrl(frames[current])
  // na nova tentativa, muda a URL para o navegador não reaproveitar a falha
  const src = retry ? `${base}${base.includes('?') ? '&' : '?'}r=${retry}` : base
  const [status, setStatus] = useState<{ src: string; state: LoadState }>({ src, state: 'loading' })
  const state: LoadState = status.src === src ? status.state : 'loading'
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    setSlow(false)
    const t = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(t)
  }, [src])

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
        {state !== 'loaded' && (
          <div className="absolute inset-0 z-10 grid place-items-center p-6 text-center text-sm text-zinc-500">
            {state === 'error' || slow ? (
              <div className="flex max-w-sm flex-col items-center gap-3">
                <p className="text-zinc-300">
                  {state === 'error' ? 'Não foi possível carregar a imagem.' : 'A imagem está demorando para carregar.'}
                </p>
                <p className="text-xs text-zinc-500">
                  Os frames vêm de image.tmdb.org. Se nunca aparecem, algum bloqueador de anúncios ou extensão pode estar
                  barrando esse endereço.
                </p>
                <button
                  type="button"
                  onClick={() => setRetry((r) => r + 1)}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  Tentar de novo
                </button>
              </div>
            ) : (
              'Carregando frame…'
            )}
          </div>
        )}
        <img
          key={src}
          src={src}
          alt={`Frame ${current + 1}`}
          // se a imagem já veio pronta do cache antes do onLoad ser ligado, confere na montagem
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0 && state !== 'loaded') setStatus({ src, state: 'loaded' })
          }}
          onLoad={() => setStatus({ src, state: 'loaded' })}
          onError={() => setStatus({ src, state: 'error' })}
          className={`h-full w-full object-cover transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
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
