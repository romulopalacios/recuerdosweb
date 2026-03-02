/**
 * usePushNotifications
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the full push-notification lifecycle:
 *
 *  1. Registers the service worker (`public/sw.js`).
 *  2. Requests Notification permission from the user.
 *  3. Subscribes to the browser Push API with your VAPID public key.
 *  4. On every page load, checks the `memories` table for anniversary dates
 *     (same month + day as today, in a previous year) and fires a local
 *     notification if the user has granted permission.
 *
 * Anniversary detection runs entirely client-side (no server needed) by
 * comparing each memory's `memory_date` against today's month/day.
 *
 * VAPID setup (one-time, run once):
 *   npx web-push generate-vapid-keys
 *   Then set VITE_VAPID_PUBLIC_KEY in .env.local
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Memory } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushNotificationsReturn {
  permission:     NotificationPermission
  isSubscribed:   boolean
  isRegistering:  boolean
  subscribe:      () => Promise<void>
  unsubscribe:    () => Promise<void>
  checkAnniversaries: () => Promise<void>
}

// ─── VAPID public key from env ────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// ─── Utility: convert base64url → Uint8Array (required by subscribe()) ────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission,    setPermission]    = useState<NotificationPermission>('default')
  const [isSubscribed,  setIsSubscribed]  = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [swReg,         setSwReg]         = useState<ServiceWorkerRegistration | null>(null)

  // ── Register the service worker on mount ─────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as NotificationPermission)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        setSwReg(reg)
        const existing = await reg.pushManager.getSubscription()
        setIsSubscribed(Boolean(existing))
      })
      .catch(console.error)
  }, [])

  // ── Request permission + subscribe to Push API ────────────────────────────
  const subscribe = useCallback(async () => {
    if (!swReg || !VAPID_PUBLIC_KEY) {
      console.warn('[usePushNotifications] SW not ready or VAPID key missing')
      return
    }
    setIsRegistering(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermission)
      if (result !== 'granted') return

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Persist subscription to Supabase so your backend can send pushes
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id:      user.id,
            endpoint:     subscription.endpoint,
            p256dh:       btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth:         btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
            updated_at:   new Date().toISOString(),
          }, { onConflict: 'user_id' })
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('[usePushNotifications] subscribe error', err)
    } finally {
      setIsRegistering(false)
    }
  }, [swReg])

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!swReg) return
    const sub = await swReg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
      }
    }
    setIsSubscribed(false)
  }, [swReg])

  // ── Anniversary checker ───────────────────────────────────────────────────
  const checkAnniversaries = useCallback(async () => {
    if (Notification.permission !== 'granted') return

    const today = new Date()
    const mm    = String(today.getMonth() + 1).padStart(2, '0')
    const dd    = String(today.getDate()).padStart(2, '0')

    // Fetch all memories whose month-day matches today (any year)
    const { data: memories, error } = await supabase
      .from('memories')
      .select('id, title, memory_date, cover_photo_url')

    if (error || !memories) return

    const anniversaries = (memories as Memory[]).filter((m) => {
      const d = new Date(m.memory_date)
      return (
        String(d.getMonth() + 1).padStart(2, '0') === mm &&
        String(d.getDate()).padStart(2, '0') === dd &&
        d.getFullYear() < today.getFullYear()
      )
    })

    // Show one notification per anniversary (deduplicated by tag)
    for (const memory of anniversaries) {
      const years = today.getFullYear() - new Date(memory.memory_date).getFullYear()
      const title = `¡${years} año${years !== 1 ? 's' : ''} de "${memory.title}"! 🎉`
      const body  = `Hoy es el aniversario de este recuerdo especial. ¡Revívelo juntos! 💕`

      if (swReg) {
        await swReg.showNotification(title, {
          body,
          icon:    memory.cover_photo_url ?? '/icons/icon-192.png',
          badge:   '/icons/badge-96.png',
          tag:     `anniversary-${memory.id}-${today.getFullYear()}`,

          data:    { url: `/memories/${memory.id}` },
        })
      }
    }
  }, [swReg])

  // ── Auto-check anniversaries once per session (on SW ready) ─────────────
  useEffect(() => {
    if (swReg && Notification.permission === 'granted') {
      // Small delay so the SW is fully active
      const t = setTimeout(() => checkAnniversaries(), 3000)
      return () => clearTimeout(t)
    }
  }, [swReg, checkAnniversaries])

  return { permission, isSubscribed, isRegistering, subscribe, unsubscribe, checkAnniversaries }
}
