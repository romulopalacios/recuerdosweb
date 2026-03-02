/**
 * Invite Acceptance Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Reached via the invite link: /invite/:token
 *
 * Flow:
 *  • If user is NOT logged in → redirect to /login with ?redirect=/invite/TOKEN
 *  • If user IS logged in → call acceptInvite(token) → redirect to /dashboard
 */
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAcceptInvite } from '@/hooks/useSharing'
import { useAuthStore } from '@/store/authStore'

type PageState = 'loading' | 'success' | 'error' | 'auth-required'

export default function InvitePage() {
  const { token }   = useParams<{ token: string }>()
  const navigate    = useNavigate()
  const { user, initialized } = useAuthStore()
  const acceptMut   = useAcceptInvite()
  const [state, setState]     = useState<PageState>('loading')
  const [errMsg, setErrMsg]   = useState('')
  // Prevent double-firing when auth state loads asynchronously
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!token) { setState('error'); setErrMsg('Enlace inválido'); return }
    // Wait until auth has finished initialising
    if (!initialized) return
    // Already fired — don't try again
    if (attemptedRef.current) return

    if (!user) {
      // Redirect to login, then back here after authentication
      navigate(`/login?redirect=/invite/${token}`, { replace: true })
      return
    }

    attemptedRef.current = true
    acceptMut.mutate(token, {
      onSuccess: () => {
        setState('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
      },
      onError: (err: Error) => {
        setState('error')
        setErrMsg(err.message)
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, initialized])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-sm w-full"
      >
        {state === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-hero flex items-center justify-center">
              <Loader size={28} className="text-white animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Verificando invitación…</h1>
              <p className="text-sm text-gray-500 mt-1">Un momento por favor</p>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">¡Invitación aceptada! 💕</h1>
              <p className="text-sm text-gray-500 mt-1">Ya puedes ver los recuerdos compartidos. Redirigiendo…</p>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
              <XCircle size={28} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Enlace inválido</h1>
              <p className="text-sm text-gray-500 mt-1">{errMsg}</p>
            </div>
            <Button onClick={() => navigate('/dashboard')}>
              <Heart size={14} className="mr-1.5" /> Ir al inicio
            </Button>
          </>
        )}
      </motion.div>
    </div>
  )
}
