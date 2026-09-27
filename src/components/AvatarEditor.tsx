import { useMemo } from 'react'
import { Dices } from 'lucide-react'
import {
  AVATAR_STYLES,
  STYLE_IDS,
  BACKGROUNDS,
  avatarParts,
  partVisible,
  randomAvatar,
  type AvatarConfig,
  type AvatarPart,
  type AvatarStyle,
} from '../lib/avatar'
import { Avatar } from './Avatar'

interface Props {
  value: AvatarConfig
  onChange: (config: AvatarConfig) => void
}

const arrowBtn = 'grid h-8 w-8 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10 text-zinc-200 hover:bg-white/10'

export function AvatarEditor({ value, onChange }: Props) {
  // uma amostra fixa de cada estilo para os botões de escolha (estilos já carregados pela página)
  const samples = useMemo(
    () => Object.fromEntries(STYLE_IDS.map((s) => [s, randomAvatar(s)])),
    [],
  ) as Record<AvatarStyle, AvatarConfig>

  const parts = avatarParts(value.style).filter((p) => partVisible(value, p))

  function setOption(key: string, v: string) {
    onChange({ ...value, options: { ...value.options, [key]: v } })
  }

  function cycle(part: AvatarPart, step: number) {
    const values = part.optional ? ['none', ...part.values] : part.values
    const i = values.indexOf(value.options[part.key] ?? values[0])
    setOption(part.key, values[(i + step + values.length) % values.length])
  }

  function changeStyle(style: AvatarStyle) {
    if (style !== value.style) onChange({ ...samples[style], background: value.background })
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <div className="flex flex-col items-center gap-3 md:w-48">
        <Avatar config={value} size={160} className="ring-4 ring-zinc-800" />
        <button
          type="button"
          onClick={() => onChange(randomAvatar(value.style))}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/10"
        >
          <Dices size={16} aria-hidden /> Aleatório
        </button>

        <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
          {STYLE_IDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeStyle(s)}
              aria-pressed={s === value.style}
              className={`flex flex-col items-center gap-1 rounded-lg p-1.5 text-xs ${
                s === value.style ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Avatar config={s === value.style ? value : samples[s]} size={44} />
              {AVATAR_STYLES[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 md:max-h-[460px] md:overflow-y-auto md:pr-1">
        {parts.map((part) =>
          part.kind === 'variant' ? (
            <div key={part.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-300">{part.label}</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`${part.label} anterior`} onClick={() => cycle(part, -1)} className={arrowBtn}>
                  ‹
                </button>
                <span className="w-16 text-center text-xs tabular-nums text-zinc-400">
                  {value.options[part.key] === 'none'
                    ? 'Nenhum'
                    : `${part.values.indexOf(value.options[part.key]) + 1} / ${part.values.length}`}
                </span>
                <button type="button" aria-label={`Próximo ${part.label}`} onClick={() => cycle(part, 1)} className={arrowBtn}>
                  ›
                </button>
              </div>
            </div>
          ) : (
            <ColorRow
              key={part.key}
              label={part.label}
              colors={part.values}
              value={value.options[part.key]}
              onChange={(c) => setOption(part.key, c)}
            />
          ),
        )}
        <ColorRow
          label="Fundo"
          colors={BACKGROUNDS}
          value={value.background}
          onChange={(c) => onChange({ ...value, background: c })}
        />
      </div>
    </div>
  )
}

function ColorRow(props: { label: string; colors: string[]; value?: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-zinc-300">{props.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {props.colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${props.label} #${c}`}
            aria-pressed={props.value === c}
            onClick={() => props.onChange(c)}
            style={{ backgroundColor: `#${c}` }}
            className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-zinc-900 ${props.value === c ? 'ring-2 ring-amber-400' : 'ring-1 ring-zinc-700'}`}
          />
        ))}
      </div>
    </div>
  )
}
