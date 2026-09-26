/** localStorage pode falhar (aba anônima, bloqueio); o jogo funciona sem ele */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

type SaveListener = (key: string, value: unknown) => void
const listeners = new Set<SaveListener>()

/** Avisa quando algo é salvo (usado para sincronizar com a conta) */
export function onSave(listener: SaveListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignora */
  }
  listeners.forEach((l) => l(key, value))
}
