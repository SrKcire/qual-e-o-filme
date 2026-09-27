import { createClient } from '@supabase/supabase-js'

// A chave "publishable" é pública por natureza: quem protege os dados são as
// regras de acesso (RLS) em supabase/migrations. Nunca coloque a secret key aqui.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://hhmsncnngaeiuzstmwhy.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_j8cx3qvFgZO_otfJcJ8GPw_hrDX8qQH'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // implicit: o link do e-mail funciona mesmo aberto em outro navegador/aparelho
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
})

/** Endereço para onde o Supabase devolve a pessoa depois do Google ou de um link por e-mail */
export const redirectUrl = () => location.origin + location.pathname

export interface AuthSettings {
  google: boolean
  /** true = conta criada com senha já entra direto, sem confirmar o e-mail */
  autoconfirm: boolean
}

let settingsPromise: Promise<AuthSettings> | undefined

/**
 * Lê a configuração pública de login do projeto, para a tela se adaptar sozinha
 * (ex.: o botão do Google só aparece quando o provedor está ligado no painel).
 */
export function fetchAuthSettings(): Promise<AuthSettings> {
  settingsPromise ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    .then((r) => r.json())
    .then((s) => ({ google: !!s.external?.google, autoconfirm: !!s.mailer_autoconfirm }))
    .catch(() => ({ google: false, autoconfirm: false }))
  return settingsPromise
}
