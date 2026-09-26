import { createClient } from '@supabase/supabase-js'

// A chave "publishable" é pública por natureza: quem protege os dados são as
// regras de acesso (RLS) em supabase/migrations. Nunca coloque a secret key aqui.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://hhmsncnngaeiuzstmwhy.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_j8cx3qvFgZO_otfJcJ8GPw_hrDX8qQH'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // implicit: o link do e-mail funciona mesmo aberto em outro navegador/aparelho
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
})
