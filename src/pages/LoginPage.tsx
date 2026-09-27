import { useEffect, useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { fetchAuthSettings, redirectUrl, supabase, type AuthSettings } from '../lib/supabase'

const input =
  'w-full rounded-lg bg-zinc-950 px-4 py-3 ring-1 ring-zinc-700 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400'
const primary =
  'rounded-lg bg-amber-400 py-3 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60'
const link = 'text-sm text-zinc-400 underline hover:text-zinc-200'

const MIN_PASSWORD = 8

type Mode = 'signin' | 'signup' | 'forgot'

function friendlyError(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com esse e-mail. Entre com a sua senha.'
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar: abra o link que enviamos.'
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.'
    case 'email_address_invalid':
      return 'E-mail inválido.'
    case 'signup_disabled':
      return 'A criação de contas está desativada no momento.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  }
  if (/rate limit|security purposes/i.test(error.message)) return 'Muitas tentativas seguidas. Espere alguns minutos.'
  return error.message
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function LoginPage({ onCancel }: { onCancel: () => void }) {
  const [settings, setSettings] = useState<AuthSettings | null>(null)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    fetchAuthSettings().then(setSettings)
  }, [])

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  async function google() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } })
    if (error) setError(friendlyError(error))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const mail = email.trim()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) setError(friendlyError(error))
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: redirectUrl() } })
      if (error) setError(friendlyError(error))
      // sem sessão = o projeto exige confirmar o e-mail antes do primeiro acesso
      else if (!data.session) setInfo(`Conta criada! Enviamos um link de confirmação para ${mail}. Abra-o para entrar.`)
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: redirectUrl() })
      if (error) setError(friendlyError(error))
      else setInfo(`Se existir uma conta com ${mail}, enviamos um link para criar uma nova senha.`)
    }
    setBusy(false)
  }

  const titles: Record<Mode, string> = {
    signin: 'Entrar',
    signup: 'Criar conta',
    forgot: 'Recuperar senha',
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <div>
        <h2 className="text-xl font-bold">{titles[mode]}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'forgot'
            ? 'Informe o e-mail da conta e enviaremos um link para criar uma nova senha.'
            : 'Com uma conta, suas estatísticas ficam salvas em qualquer aparelho e você ganha um perfil com avatar.'}
        </p>
      </div>

      {mode !== 'forgot' && settings?.google && (
        <>
          <button
            type="button"
            onClick={google}
            className="flex items-center justify-center gap-3 rounded-lg bg-white py-3 font-semibold text-zinc-800 hover:bg-zinc-100"
          >
            <GoogleIcon /> Continuar com Google
          </button>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-zinc-800" /> ou com e-mail <span className="h-px flex-1 bg-zinc-800" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="seu@email.com"
          aria-label="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        {mode !== 'forgot' && (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={mode === 'signup' ? MIN_PASSWORD : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? `Senha (mínimo ${MIN_PASSWORD} caracteres)` : 'Senha'}
              aria-label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${input} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        )}
        <button type="submit" disabled={busy} className={primary}>
          {busy ? 'Aguarde…' : { signin: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link' }[mode]}
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-800">{error}</p>}
      {info && <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 ring-1 ring-emerald-800">{info}</p>}

      <div className="flex flex-col items-center gap-2">
        {mode === 'signin' && (
          <>
            <p className="text-sm text-zinc-400">
              Não tem conta?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-amber-400 hover:text-amber-300">
                Criar conta
              </button>
            </p>
            <button type="button" onClick={() => switchMode('forgot')} className={link}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode === 'signup' && (
          <p className="text-sm text-zinc-400">
            Já tem conta?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-amber-400 hover:text-amber-300">
              Entrar
            </button>
          </p>
        )}
        {mode === 'forgot' && (
          <button type="button" onClick={() => switchMode('signin')} className={link}>
            Voltar para entrar
          </button>
        )}
      </div>

      <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Voltar ao jogo sem entrar
      </button>
    </div>
  )
}

/** Aberta pelo link de "esqueci minha senha": define a senha nova */
export function NewPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(friendlyError(error))
    else onDone()
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <div>
        <h2 className="text-xl font-bold">Nova senha</h2>
        <p className="mt-1 text-sm text-zinc-400">Escolha a nova senha da sua conta.</p>
      </div>
      <input
        type="password"
        required
        autoFocus
        minLength={MIN_PASSWORD}
        autoComplete="new-password"
        placeholder={`Nova senha (mínimo ${MIN_PASSWORD} caracteres)`}
        aria-label="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={input}
      />
      <button type="submit" disabled={busy} className={primary}>
        {busy ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      {error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-800">{error}</p>}
    </form>
  )
}
