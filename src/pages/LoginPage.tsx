import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

const input =
  'w-full rounded-lg bg-zinc-950 px-4 py-3 ring-1 ring-zinc-700 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400'

function friendlyError(message: string) {
  if (/rate limit|too many|security purposes/i.test(message))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (/invalid|expired/i.test(message)) return 'Código inválido ou expirado. Peça um novo.'
  return message
}

export function LoginPage({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true },
    })
    setBusy(false)
    if (error) setError(friendlyError(error.message))
    else setSentTo(email.trim())
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (!sentTo) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(friendlyError(error.message))
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      {!sentTo ? (
        <form onSubmit={sendLink} className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Entrar ou criar conta</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sem senha: enviamos um link de acesso para o seu e-mail. Com a conta, suas estatísticas ficam salvas em
              qualquer aparelho e você ganha um perfil com avatar.
            </p>
          </div>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-amber-400 py-3 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
          >
            {busy ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-4xl">📬</p>
            <h2 className="mt-2 text-xl font-bold">Confira seu e-mail</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enviamos um link para <strong className="text-zinc-200">{sentTo}</strong>. Clique nele para entrar. Se
              não chegar em alguns minutos, olhe o spam.
            </p>
          </div>
          <details className="text-sm text-zinc-400">
            <summary className="cursor-pointer text-center hover:text-zinc-200">O e-mail veio com um código?</summary>
            <div className="mt-3 flex gap-2">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Código"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={input}
              />
              <button
                type="submit"
                disabled={busy || code.length < 6}
                className="rounded-lg bg-amber-400 px-5 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
              >
                Entrar
              </button>
            </div>
          </details>
          <button
            type="button"
            onClick={() => {
              setSentTo(null)
              setCode('')
            }}
            className="text-sm text-zinc-500 underline hover:text-zinc-300"
          >
            Usar outro e-mail
          </button>
        </form>
      )}

      {error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-800">{error}</p>}

      <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Voltar ao jogo sem entrar
      </button>
    </div>
  )
}
