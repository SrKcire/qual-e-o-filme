import { useEffect, useState } from 'react'
import { ImageOff, Lock, RotateCw } from 'lucide-react'
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

// furos da película, em cima e embaixo da tira
const sprockets =
  'h-1.5 rounded-full bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.16)_0_7px,transparent_7px_15px)]'

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
    <div className="flex flex-col gap-3">
      <div className="relative isolate">
        {/* luz ambiente: a própria imagem, borrada, "vazando" em volta da tela */}
        {state === 'loaded' && (
          <img
            src={src}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-105 object-cover opacity-50 blur-3xl saturate-150 transition-opacity duration-700"
          />
        )}

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
          {state !== 'loaded' && (
            <div className="absolute inset-0 z-10 grid place-items-center p-6 text-center text-sm text-zinc-500">
              {state === 'error' || slow ? (
                <div className="flex max-w-sm flex-col items-center gap-3">
                  <ImageOff size={28} className="text-zinc-500" aria-hidden />
                  <p className="text-zinc-300">
                    {state === 'error' ? 'Não foi possível carregar a imagem.' : 'A imagem está demorando para carregar.'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Os frames vêm de image.tmdb.org. Se nunca aparecem, algum bloqueador de anúncios ou extensão pode
                    estar barrando esse endereço.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRetry((r) => r + 1)}
                    className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/15"
                  >
                    <RotateCw size={15} aria-hidden /> Tentar de novo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
                  Carregando frame…
                </div>
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
            className={`h-full w-full object-cover transition duration-500 ${state === 'loaded' ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0'}`}
          />
          {/* vinheta de tela de cinema */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.5))]" />
          <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 font-display text-sm tracking-wider text-zinc-200 backdrop-blur-sm">
            Frame {current + 1}/{MAX_ATTEMPTS}
          </span>
        </div>
      </div>

      {/* tira de filme com os 6 frames */}
      <div className="flex flex-col gap-1.5 rounded-xl bg-black/50 px-2 py-1.5 ring-1 ring-white/10">
        <div className={sprockets} aria-hidden />
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
            const unlocked = i < revealed && !!frames[i]
            const active = i === current
            return (
              <button
                key={i}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelect(i)}
                aria-label={`Ver frame ${i + 1}`}
                aria-pressed={active}
                className={`group relative aspect-video overflow-hidden rounded-md transition ${
                  active
                    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black'
                    : unlocked
                      ? 'opacity-70 ring-1 ring-white/10 hover:opacity-100'
                      : 'cursor-not-allowed bg-zinc-900 ring-1 ring-white/5'
                }`}
              >
                {unlocked ? (
                  <img src={frameUrl(frames[i], 'w300')} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Lock size={13} className="absolute inset-0 m-auto text-zinc-600" aria-hidden />
                )}
                <span
                  className={`absolute right-0.5 bottom-0.5 rounded px-1 font-display text-[11px] leading-tight ${
                    active ? 'bg-amber-400 text-zinc-950' : 'bg-black/70 text-zinc-300'
                  }`}
                >
                  {i + 1}
                </span>
              </button>
            )
          })}
        </div>
        <div className={sprockets} aria-hidden />
      </div>
    </div>
  )
}
