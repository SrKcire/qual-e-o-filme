import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isAvatarConfig, type AvatarConfig } from '../lib/avatar'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar: AvatarConfig | null
}

interface AuthState {
  session: Session | null
  /** null = logado mas ainda sem perfil (precisa criar) */
  profile: Profile | null
  /** Carregando sessão ou perfil */
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...data, avatar: isAvatarConfig(data.avatar) ? data.avatar : null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      // só troca a sessão quando muda o usuário (o refresh do token não recarrega o perfil)
      setSession((prev) => (prev?.user.id === s?.user.id && prev?.access_token === s?.access_token ? prev : s))
      if (!s) {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      setProfile(await fetchProfile(userId))
    } catch (err) {
      console.error('Erro ao carregar perfil', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      setLoading(true)
      refreshProfile()
    }
  }, [userId, refreshProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>{children}</AuthContext.Provider>
  )
}
