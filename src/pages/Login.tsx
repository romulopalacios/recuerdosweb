import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Heart, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { signIn, signUp, loading } = useAuthStore()
  const navigate = useNavigate()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
        navigate('/dashboard')
      } else {
        await signUp(form.email, form.password, form.name)
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu email, luego inicia sesión.')
        setMode('login')
      }
    } catch (err) {
      setError((err as Error).message ?? 'Ocurrió un error inesperado')
    }
  }

  const features = [
    { icon: '📸', text: 'Fotos sin límite' },
    { icon: '📝', text: 'Notas privadas' },
    { icon: '📅', text: 'Timeline especial' },
    { icon: '🏷️', text: 'Categorías' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: dark branding ── */}
      <div className="hidden lg:flex flex-col w-[52%] gradient-sidebar relative overflow-hidden">
        {/* ambient glows */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center shadow-soft">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-base leading-none block">Nuestros Recuerdos</span>
              <span className="text-white/35 text-xs tracking-wide">tu espacio íntimo</span>
            </div>
          </div>

          {/* Main text */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-6">
                Guarda cada<br />
                <span className="text-gradient-purple">momento</span><br />
                especial
              </h1>
              <p className="text-white/50 text-lg leading-relaxed max-w-sm">
                Un espacio íntimo y privado para preservar todos vuestros recuerdos más preciados juntos.
              </p>

              {/* Feature chips */}
              <div className="mt-10 flex flex-wrap gap-2.5">
                {features.map((f) => (
                  <motion.span
                    key={f.text}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + features.indexOf(f) * 0.1 }}
                    className="glass-dark px-4 py-2 rounded-full text-sm text-white/65 flex items-center gap-2"
                  >
                    {f.icon} {f.text}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom */}
          <p className="text-white/20 text-xs">
            Hecho con <Heart size={10} className="inline text-rose-400 fill-rose-400" /> para guardar nuestros recuerdos
          </p>
        </div>

        {/* Floating hearts decorations */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute text-rose-400/20"
            style={{ top: `${15 + i * 22}%`, right: `${8 + i * 5}%` }}
            animate={{ y: [-10, 10, -10], rotate: [-8, 8, -8] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Heart size={24 + i * 10} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      {/* ── Right panel: auth form ── */}
      <div className="flex-1 relative flex items-center justify-center px-6 py-12 min-h-screen bg-gray-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                <Sparkles size={20} className="text-white" />
              </div>
              <h1 className="font-display font-bold text-rose-700 text-xl">Nuestros Recuerdos</h1>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl p-9 shadow-card border border-gray-100">
              {/* Header */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full mb-4">
                  <Sparkles size={11} />
                  {mode === 'login' ? 'Bienvenido de vuelta' : 'Nuevo usuario'}
                </div>
                <h2 className="font-display text-2xl font-bold text-gray-900">
                  {mode === 'login' ? '¡Hola de nuevo! 💕' : 'Crea tu cuenta 🌸'}
                </h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  {mode === 'login'
                    ? 'Ingresa para ver tus recuerdos especiales'
                    : 'Empieza a guardar momentos únicos juntos'}
                </p>
              </div>

              {/* Alerts */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700"
                  >
                    {success}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <Input
                    name="name"
                    label="Tu nombre"
                    placeholder="¿Cómo te llamas?"
                    value={form.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    leftIcon={<User size={15} />}
                  />
                )}

                <Input
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  leftIcon={<Mail size={15} />}
                />

                <Input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  label="Contraseña"
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  leftIcon={<Lock size={15} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="cursor-pointer hover:text-rose-500 transition-colors"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-2"
                  size="lg"
                  rightIcon={!loading ? <ArrowRight size={16} /> : undefined}
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Button>
              </form>

              {/* Mode switch */}
              <div className="mt-6 text-center text-sm text-gray-500">
                {mode === 'login' ? (
                  <>
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
                      className="text-rose-600 font-semibold hover:text-rose-700 cursor-pointer transition-colors"
                    >
                      Regístrate gratis
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                      className="text-rose-600 font-semibold hover:text-rose-700 cursor-pointer transition-colors"
                    >
                      Inicia sesión
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Demo note — pinned to bottom so it doesn't affect form centering */}
        <div className="absolute bottom-5 left-0 right-0 px-6">
          <div className="max-w-sm mx-auto p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
            <strong>Setup:</strong> Configura tu cuenta de Supabase en{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local</code>. Ver{' '}
            <code>SETUP.md</code>.
          </div>
        </div>
      </div>
    </div>
  )
}
