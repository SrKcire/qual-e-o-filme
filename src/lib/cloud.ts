import { dailyMovie, roundState, scoreFor, type Guess } from './game'
import { load, onSave, save } from './storage'
import { supabase } from './supabase'

/** Chaves do localStorage que acompanham a conta entre aparelhos */
const SYNC_KEYS = ['qef:stats', 'qef:daily-stats', 'qef:daily', 'qef:progress'] as const
type SyncData = Partial<Record<(typeof SYNC_KEYS)[number], unknown>>

const played = (v: unknown) => (v as { played?: number } | undefined)?.played ?? 0
const dailyDay = (v: unknown) => (v as { day?: number } | undefined)?.day ?? 0
const dailyLen = (v: unknown) => (v as { guesses?: unknown[] } | undefined)?.guesses?.length ?? 0

/** Para cada chave, fica a versão "mais avançada" entre aparelho e nuvem */
function merge(local: SyncData, cloud: SyncData): SyncData {
  const out: SyncData = {}
  for (const key of SYNC_KEYS) {
    const l = local[key]
    const c = cloud[key]
    if (l === undefined || c === undefined) {
      out[key] = l ?? c
    } else if (key === 'qef:stats' || key === 'qef:daily-stats') {
      out[key] = played(l) >= played(c) ? l : c
    } else if (key === 'qef:daily') {
      out[key] = dailyDay(l) !== dailyDay(c) ? (dailyDay(l) > dailyDay(c) ? l : c) : dailyLen(l) >= dailyLen(c) ? l : c
    } else {
      out[key] = c
    }
  }
  return out
}

let currentUser: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | undefined
let stopListening: (() => void) | undefined

function readLocal(): SyncData {
  const data: SyncData = {}
  for (const key of SYNC_KEYS) {
    const v = load<unknown>(key, undefined)
    if (v !== undefined) data[key] = v
  }
  return data
}

async function push() {
  if (!currentUser) return
  const { error } = await supabase.from('user_stats').upsert({ user_id: currentUser, data: readLocal() })
  if (error) console.error('Erro ao salvar estatísticas na conta', error)
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, 1500)
}

/**
 * Liga a sincronização para o usuário: junta dados do aparelho com os da nuvem,
 * grava o resultado nos dois lados e passa a enviar cada mudança.
 * Retorna true se os dados locais mudaram (a tela precisa recarregar os modos).
 */
export async function startSync(userId: string): Promise<boolean> {
  stopSync()
  currentUser = userId
  const { data: row, error } = await supabase.from('user_stats').select('data').eq('user_id', userId).maybeSingle()
  if (error) {
    console.error('Erro ao ler estatísticas da conta', error)
    return false
  }
  if (currentUser !== userId) return false

  const local = readLocal()
  const merged = merge(local, (row?.data ?? {}) as SyncData)
  let changed = false
  for (const key of SYNC_KEYS) {
    if (merged[key] !== undefined && JSON.stringify(merged[key]) !== JSON.stringify(local[key])) {
      save(key, merged[key])
      changed = true
    }
  }

  stopListening = onSave((key) => {
    if ((SYNC_KEYS as readonly string[]).includes(key)) schedulePush()
  })
  await push()

  // Filme do Dia terminado antes de entrar na conta também conta para o ranking
  const daily = merged['qef:daily'] as { day: number; guesses: Guess[] } | undefined
  if (daily && roundState(daily.guesses).finished) recordDailyResult(daily.day, daily.guesses)

  return changed
}

export function stopSync() {
  clearTimeout(pushTimer)
  stopListening?.()
  stopListening = undefined
  currentUser = null
}

/** Ao sair da conta, os dados dela saem do aparelho (continuam salvos na nuvem) */
export function clearSyncedData() {
  for (const key of SYNC_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignora */
    }
  }
}

/** Registra o resultado do Filme do Dia (uma vez por dia; repetições são ignoradas) */
export async function recordDailyResult(day: number, guesses: Guess[]) {
  if (!currentUser || day < 1) return
  await supabase
    .from('daily_results')
    .upsert(
      {
        user_id: currentUser,
        day,
        movie_id: dailyMovie(day).id,
        score: scoreFor(guesses),
        results: guesses.map((g) => g.result),
      },
      { onConflict: 'user_id,day', ignoreDuplicates: true },
    )
    .then(({ error }) => error && console.error('Erro ao registrar resultado do dia', error))
}
