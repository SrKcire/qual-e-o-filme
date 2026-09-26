import { avatarDataUri, useAvatarStyles, type AvatarConfig } from '../lib/avatar'

interface Props {
  config: AvatarConfig | null
  /** Usado para a inicial enquanto não há avatar (ou enquanto o estilo carrega) */
  name?: string
  size?: number
  className?: string
}

export function Avatar({ config, name = '?', size = 40, className = '' }: Props) {
  const ready = useAvatarStyles(config ? [config.style] : [])
  const style = { width: size, height: size }
  if (!config || !ready)
    return (
      <span
        style={{ ...style, fontSize: size * 0.45, backgroundColor: config ? `#${config.background}` : undefined }}
        className={`inline-grid shrink-0 place-items-center rounded-full bg-zinc-700 font-bold text-zinc-200 ${className}`}
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    )
  return <img src={avatarDataUri(config)} alt="" style={style} className={`shrink-0 rounded-full ${className}`} />
}
