import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { HostEngine } from './hostEngine'
import type { Identity, LiveSettings, LiveState } from './protocol'

export type RoomStatus = 'connecting' | 'ready' | 'not-found' | 'host-gone' | 'error'

interface Options {
  code: string
  /** true = este aparelho criou a sala e é o anfitrião */
  host: boolean
  me: Identity
  settings: LiveSettings
}

/** Quanto esperar pela primeira resposta do anfitrião antes de dizer que a sala não existe */
const JOIN_TIMEOUT_MS = 6000
/** Quanto tempo o anfitrião pode sumir (queda de conexão) antes de encerrar a sala */
const HOST_GRACE_MS = 10000

export function useLiveRoom({ code, host, me, settings }: Options) {
  const [state, setState] = useState<LiveState | null>(null)
  /** Horário local em que termina a fase atual (frame ou revelação) */
  const [deadline, setDeadline] = useState(0)
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const engineRef = useRef<HostEngine | null>(null)
  // identidade e configurações usadas só na criação do canal
  const meRef = useRef(me)
  const settingsRef = useRef(settings)

  useEffect(() => {
    const identity = meRef.current
    const channel = supabase.channel(`qef-room:${code}`, {
      config: { broadcast: { self: false }, presence: { key: identity.id } },
    })
    channelRef.current = channel
    let hostId: string | null = host ? identity.id : null
    let hostGoneTimer: ReturnType<typeof setTimeout> | undefined
    let joinTimer: ReturnType<typeof setTimeout> | undefined

    const apply = (s: LiveState) => {
      setState(s)
      setDeadline(Date.now() + s.msLeft)
      hostId = s.hostId
    }

    if (host) {
      engineRef.current = new HostEngine(identity, settingsRef.current, (s) => {
        apply(s)
        channel.send({ type: 'broadcast', event: 'state', payload: s })
      })
    }
    const engine = engineRef.current

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (host) return
      clearTimeout(joinTimer)
      setStatus((st) => (st === 'connecting' ? 'ready' : st))
      apply(payload as LiveState)
    })
    channel.on('broadcast', { event: 'hello' }, () => engine?.publish())
    channel.on('broadcast', { event: 'guess' }, ({ payload }) => engine?.guess(payload.id, payload.text))

    channel.on('presence', { event: 'sync' }, () => {
      const presence = channel.presenceState<{ name: string; avatar: Identity['avatar'] }>()
      const present: Identity[] = Object.entries(presence).map(([id, metas]) => ({
        id,
        name: metas[0]?.name ?? '?',
        avatar: metas[0]?.avatar ?? null,
      }))
      if (engine) {
        engine.syncPresence(present)
        return
      }
      // jogador: percebe se o anfitrião caiu
      if (hostId && !present.some((p) => p.id === hostId)) {
        hostGoneTimer ??= setTimeout(() => setStatus('host-gone'), HOST_GRACE_MS)
      } else {
        clearTimeout(hostGoneTimer)
        hostGoneTimer = undefined
      }
    })

    channel.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await channel.track({ name: identity.name, avatar: identity.avatar })
        if (host) {
          setStatus('ready')
        } else {
          channel.send({ type: 'broadcast', event: 'hello', payload: { id: identity.id } })
          joinTimer = setTimeout(() => setStatus((st) => (st === 'connecting' ? 'not-found' : st)), JOIN_TIMEOUT_MS)
        }
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('error')
      }
    })

    return () => {
      clearTimeout(hostGoneTimer)
      clearTimeout(joinTimer)
      engineRef.current?.dispose()
      engineRef.current = null
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [code, host])

  const guess = useCallback(
    (text: string) => {
      const id = meRef.current.id
      if (engineRef.current) engineRef.current.guess(id, text)
      else channelRef.current?.send({ type: 'broadcast', event: 'guess', payload: { id, text } })
    },
    [],
  )

  const actions = {
    guess,
    start: () => engineRef.current?.start(),
    backToLobby: () => engineRef.current?.backToLobby(),
    updateSettings: (s: LiveSettings) => engineRef.current?.updateSettings(s),
  }

  return { state, deadline, status, actions }
}
