import { isAvatarConfig, type AvatarConfig } from './avatar'
import { supabase } from './supabase'

export interface PublicProfile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar: AvatarConfig | null
}

export type FriendState = 'friend' | 'incoming' | 'outgoing'

export interface Friendship {
  other: PublicProfile
  state: FriendState
  createdAt: string
}

const PROFILE_COLS = 'id, username, first_name, last_name, avatar'

function toProfile(row: Record<string, unknown>): PublicProfile {
  return {
    id: row.id as string,
    username: row.username as string,
    first_name: row.first_name as string,
    last_name: (row.last_name as string) ?? '',
    avatar: isAvatarConfig(row.avatar) ? row.avatar : null,
  }
}

export async function listFriendships(myId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `requester, addressee, status, created_at,
       requester_profile:profiles!friendships_requester_fkey(${PROFILE_COLS}),
       addressee_profile:profiles!friendships_addressee_fkey(${PROFILE_COLS})`,
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const iAsked = row.requester === myId
    const other = (iAsked ? row.addressee_profile : row.requester_profile) as unknown as Record<string, unknown>
    return {
      other: toProfile(other),
      state: row.status === 'accepted' ? 'friend' : iAsked ? 'outgoing' : 'incoming',
      createdAt: row.created_at,
    }
  })
}

/** Busca por começo do apelido (sem diferenciar maiúsculas) */
export async function searchProfiles(query: string, myId: string): Promise<PublicProfile[]> {
  const q = query.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .ilike('username', `${q}%`)
    .neq('id', myId)
    .order('username')
    .limit(10)
  if (error) throw error
  return (data ?? []).map(toProfile)
}

export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('username', username).maybeSingle()
  if (error) throw error
  return data ? toProfile(data) : null
}

export async function sendFriendRequest(myId: string, otherId: string) {
  const { error } = await supabase.from('friendships').insert({ requester: myId, addressee: otherId })
  // 23505 = já existe vínculo entre os dois (pedido nos dois sentidos ao mesmo tempo, por exemplo)
  if (error && error.code !== '23505') throw error
}

export async function acceptFriendRequest(myId: string, requesterId: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester', requesterId)
    .eq('addressee', myId)
  if (error) throw error
}

/** Recusar, cancelar pedido ou desfazer amizade */
export async function removeFriendship(myId: string, otherId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester.eq.${myId},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${myId})`)
  if (error) throw error
}

// ---------- Ranking ----------

export interface RankingRow {
  user: Pick<PublicProfile, 'id' | 'username' | 'first_name' | 'avatar'>
  /** Resultado por dia no período */
  days: Map<number, { score: number; results: string[] }>
  total: number
}

export async function fetchRanking(from: number, to: number): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc('friends_ranking', { p_from: from, p_to: to })
  if (error) throw error
  const byUser = new Map<string, RankingRow>()
  for (const r of (data ?? []) as {
    user_id: string
    username: string
    first_name: string
    avatar: unknown
    day: number | null
    score: number | null
    results: string[] | null
  }[]) {
    let row = byUser.get(r.user_id)
    if (!row) {
      row = {
        user: { id: r.user_id, username: r.username, first_name: r.first_name, avatar: isAvatarConfig(r.avatar) ? r.avatar : null },
        days: new Map(),
        total: 0,
      }
      byUser.set(r.user_id, row)
    }
    if (r.day !== null && r.score !== null) {
      row.days.set(r.day, { score: r.score, results: r.results ?? [] })
      row.total += r.score
    }
  }
  return [...byUser.values()]
}

// ---------- Convite por link ----------

const INVITE_PARAM = 'amigo'
const INVITE_KEY = 'qef:invite'

export function inviteLink(username: string) {
  return `${location.origin}${location.pathname}?${INVITE_PARAM}=${encodeURIComponent(username)}`
}

/** Lê ?amigo=apelido da URL (uma vez), guarda até a pessoa estar logada e limpa a URL */
export function takeInviteFromUrl(): string | null {
  const params = new URLSearchParams(location.search)
  const fromUrl = params.get(INVITE_PARAM)
  if (fromUrl) {
    params.delete(INVITE_PARAM)
    const qs = params.toString()
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash)
    try {
      sessionStorage.setItem(INVITE_KEY, fromUrl)
    } catch {
      /* ignora */
    }
    return fromUrl
  }
  try {
    return sessionStorage.getItem(INVITE_KEY)
  } catch {
    return null
  }
}

export function clearInvite() {
  try {
    sessionStorage.removeItem(INVITE_KEY)
  } catch {
    /* ignora */
  }
}
