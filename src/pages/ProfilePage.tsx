import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AvatarEditor } from '../components/AvatarEditor'
import { STYLE_IDS, randomAvatar, useAvatarStyles, type AvatarConfig } from '../lib/avatar'
import { supabase } from '../lib/supabase'

const input =
  'w-full rounded-lg bg-zinc-950 px-3 py-2.5 ring-1 ring-zinc-700 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-400'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/** "João.Silva+x@mail.com" → "joao_silva_x" */
function toUsername(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
}

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { session, profile, refreshProfile, signOut } = useAuth()
  const creating = !profile
  const email = session?.user.email ?? ''
  // quem entrou com Google já traz o nome da conta
  const meta = (session?.user.user_metadata ?? {}) as Record<string, string | undefined>
  const fullName = (meta.full_name ?? meta.name ?? '').trim()
  const metaFirst = meta.given_name ?? fullName.split(' ')[0] ?? ''
  const metaLast = meta.family_name ?? fullName.split(' ').slice(1).join(' ')

  const [firstName, setFirstName] = useState(profile?.first_name ?? metaFirst.slice(0, 40))
  const [lastName, setLastName] = useState(profile?.last_name ?? metaLast.slice(0, 60))
  const [username, setUsername] = useState(profile?.username ?? toUsername(email.split('@')[0]))
  const [avatar, setAvatar] = useState<AvatarConfig>(() => profile?.avatar ?? randomAvatar())
  const [availability, setAvailability] = useState<Availability>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // confere se o apelido está livre (com atraso para não consultar a cada tecla)
  useEffect(() => {
    if (!USERNAME_RE.test(username)) {
      setAvailability(username ? 'invalid' : 'idle')
      return
    }
    if (username === profile?.username) {
      setAvailability('available')
      return
    }
    setAvailability('checking')
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
      if (!error) setAvailability(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(timer)
  }, [username, profile?.username])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar,
    })
    setSaving(false)
    if (error) {
      setError(error.code === '23505' ? 'Esse apelido acabou de ser usado por outra pessoa. Escolha outro.' : error.message)
      return
    }
    await refreshProfile()
    onDone()
  }

  async function deleteAccount() {
    const typed = prompt(
      `Isso apaga sua conta, perfil e estatísticas salvas, sem volta.\n\nPara confirmar, digite seu apelido: ${profile?.username}`,
    )
    if (typed?.trim().toLowerCase() !== profile?.username) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      alert(`Não foi possível excluir a conta: ${error.message}`)
      return
    }
    await signOut()
    onDone()
  }

  const canSave = firstName.trim().length > 0 && availability === 'available' && !saving

  return (
    <form onSubmit={save} className="flex flex-col gap-6 rounded-xl bg-zinc-900 p-5 ring-1 ring-zinc-800 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">{creating ? 'Crie seu perfil 🎬' : 'Seu perfil'}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {creating
            ? 'Monte seu avatar e escolha um apelido. É assim que os outros jogadores vão te ver.'
            : 'Seu e-mail nunca aparece para outros jogadores.'}
        </p>
      </div>

      <AvatarEditor value={avatar} onChange={setAvatar} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          Nome
          <input required maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          Sobrenome
          <input maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          Apelido
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500">@</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(toUsername(e.target.value.replace(/^@/, '')))}
              className={`${input} pl-7`}
            />
          </div>
          <span
            className={`text-xs ${
              availability === 'available' ? 'text-emerald-400' : availability === 'checking' ? 'text-zinc-500' : 'text-red-400'
            }`}
          >
            {
              {
                idle: '',
                checking: 'Verificando…',
                available: 'Disponível ✓',
                taken: 'Já está em uso',
                invalid: 'De 3 a 20 caracteres: letras, números e _',
              }[availability]
            }
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          E-mail
          <input value={email} disabled className={`${input} text-zinc-500`} />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 ring-1 ring-red-800">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : creating ? 'Criar perfil' : 'Salvar'}
        </button>
        {!creating && (
          <button type="button" onClick={onDone} className="rounded-lg bg-zinc-800 px-5 py-2.5 font-semibold hover:bg-zinc-700">
            Cancelar
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={async () => {
            await signOut()
            onDone()
          }}
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          Sair da conta
        </button>
        {!creating && (
          <button type="button" onClick={deleteAccount} className="text-sm text-red-400/80 underline hover:text-red-300">
            Excluir conta
          </button>
        )}
      </div>
    </form>
  )
}

export function ProfilePage({ onDone }: { onDone: () => void }) {
  // o editor mostra os 4 estilos, então baixa todos antes de abrir
  const ready = useAvatarStyles(STYLE_IDS)
  if (!ready)
    return (
      <div className="grid h-64 place-items-center rounded-xl bg-zinc-900 text-sm text-zinc-500 ring-1 ring-zinc-800">
        Carregando editor de avatar…
      </div>
    )
  return <ProfileForm onDone={onDone} />
}
