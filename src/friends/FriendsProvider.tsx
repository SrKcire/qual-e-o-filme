import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { listFriendships, type Friendship } from '../lib/friends'

interface FriendsState {
  friendships: Friendship[]
  loaded: boolean
  refresh: () => Promise<void>
}

const FriendsContext = createContext<FriendsState | null>(null)

export function useFriends() {
  const ctx = useContext(FriendsContext)
  if (!ctx) throw new Error('useFriends fora do FriendsProvider')
  return ctx
}

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const myId = profile?.id
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!myId) return
    try {
      setFriendships(await listFriendships(myId))
    } catch (err) {
      console.error('Erro ao carregar amigos', err)
    } finally {
      setLoaded(true)
    }
  }, [myId])

  useEffect(() => {
    if (!myId) {
      setFriendships([])
      setLoaded(false)
      return
    }
    refresh()
    // pedidos novos aparecem quando a pessoa volta para a aba
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [myId, refresh])

  return <FriendsContext.Provider value={{ friendships, loaded, refresh }}>{children}</FriendsContext.Provider>
}
