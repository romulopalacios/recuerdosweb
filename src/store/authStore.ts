import { create } from 'zustand'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

interface AuthState {
  session: Session | null
  user: SupabaseUser | null
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    // Guard against double-call (React StrictMode fires effects twice in dev)
    if (useAuthStore.getState().initialized) return

    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      initialized: true,
    })

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      // SEC: only log internal details in development to avoid leaking
      // implementation info (error messages, stack traces) in production.
      if (error && import.meta.env.DEV) console.warn('[signOut] Supabase error:', error.message)
    } catch (err) {
      // Network failure — still clear local state so the UI doesn't get stuck
      if (import.meta.env.DEV) console.warn('[signOut] Network error:', err)
    } finally {
      set({ session: null, user: null })
      // Clear all cached queries so a new user never sees the previous user's data
      queryClient.clear()
    }
  },
}))
