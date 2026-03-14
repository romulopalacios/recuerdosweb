import { useState } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Shield, Mail, Calendar, LogOut, Save, Eye, EyeOff, Sparkles, Link2, Bell } from 'lucide-react'
import { SharingPanel, NotificationsPanel } from '@/components/sharing/SharingNotificationsPanel'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio').max(80),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  new_password: z.string().min(6, 'Mínimo 6 caracteres').max(72),
  confirm:      z.string().min(6),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security' | 'sharing' | 'notifications'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full gradient-hero flex items-center justify-center text-white font-bold shadow-soft select-none',
      size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm',
    )}>
      {initials || '?'}
    </div>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const fullName   = user?.user_metadata?.full_name ?? ''
  const email      = user?.email ?? ''
  const memberSince = user?.created_at
    ? format(parseISO(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })
    : '—'

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: fullName },
  })

  async function onSubmit(data: ProfileForm) {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.full_name },
      })
      if (error) throw error
      // Sync the Zustand store so the sidebar name updates immediately
      const { data: { user: freshUser } } = await supabase.auth.getUser()
      if (freshUser) useAuthStore.setState({ user: freshUser })
      toast.success('Perfil actualizado 💕')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar + name preview */}
      <div className="flex items-center gap-5">
        <Avatar name={fullName || email} />
        <div>
          <p className="font-semibold text-gray-800">{fullName || 'Sin nombre'}</p>
          <p className="text-sm text-gray-400">{email}</p>
        </div>
      </div>

      {/* Full name */}
      <div className="space-y-1">
        <Input
          label="Nombre completo"
          id="profile-full-name"
          {...register('full_name')}
          placeholder="Escribe tu nombre"
          error={errors.full_name?.message}
          leftIcon={<User size={15} />}
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1">
        <Input
          label="Correo electrónico"
          id="profile-email"
          value={email}
          readOnly
          disabled
          leftIcon={<Mail size={15} />}
          className="opacity-60 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400">El email no se puede cambiar desde aquí.</p>
      </div>

      {/* Member since */}
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <Calendar size={14} className="text-rose-400 flex-shrink-0" />
        <span>Miembro desde <span className="font-medium text-gray-700">{memberSince}</span></span>
      </div>

      <Button
        type="submit"
        leftIcon={<Save size={15} />}
        loading={saving}
        disabled={!isDirty || saving}
      >
        Guardar cambios
      </Button>
    </form>
  )
}

// ─── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [saving, setSaving]     = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [showConf, setShowConf] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(data: PasswordForm) {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.new_password })
      if (error) throw error
      toast.success('Contraseña actualizada 🔒')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 text-sm text-violet-700">
        <Shield size={14} className="inline mr-1.5 -mt-0.5" />
        Escribe una nueva contraseña para actualizar tu acceso.
      </div>

      {/* New password */}
      <div className="space-y-1">
        <Input
          label="Nueva contraseña"
          id="security-new-password"
          {...register('new_password')}
          type={showNew ? 'text' : 'password'}
          placeholder="Mínimo 6 caracteres"
          error={errors.new_password?.message}
          rightIcon={
            <button type="button" onClick={() => setShowNew((v) => !v)} className="cursor-pointer text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
      </div>

      {/* Confirm */}
      <div className="space-y-1">
        <Input
          label="Confirmar contraseña"
          id="security-confirm-password"
          {...register('confirm')}
          type={showConf ? 'text' : 'password'}
          placeholder="Repite la contraseña"
          error={errors.confirm?.message}
          rightIcon={
            <button type="button" onClick={() => setShowConf((v) => !v)} className="cursor-pointer text-gray-400 hover:text-gray-600">
              {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
      </div>

      <Button type="submit" leftIcon={<Shield size={15} />} loading={saving} disabled={saving}>
        Cambiar contraseña
      </Button>
    </form>
  )
}

// ─── Danger zone ─────────────────────────────────────────────────────────────

function DangerZone() {
  const { signOut } = useAuthStore()
  const navigate    = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 space-y-3">
      <p className="text-sm font-semibold text-red-700">Zona de peligro</p>
      <p className="text-xs text-red-500">Estas acciones son irreversibles. Procede con cuidado.</p>
      <Button
        variant="danger"
        size="sm"
        leftIcon={<LogOut size={14} />}
        loading={loading}
        onClick={handleSignOut}
      >
        Cerrar sesión
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Perfil',          icon: <User size={15} /> },
  { id: 'security',     label: 'Seguridad',        icon: <Shield size={15} /> },
  { id: 'sharing',      label: 'Compartir',        icon: <Link2 size={15} /> },
  { id: 'notifications', label: 'Notificaciones',  icon: <Bell size={15} /> },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const { user } = useAuthStore()

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona tu cuenta y preferencias</p>
      </div>

      {/* App info banner */}
      <div className="relative overflow-hidden rounded-2xl gradient-sidebar px-5 py-4 shadow-soft flex items-center gap-4">
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-rose-300" />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-semibold text-white/85">Nuestros Recuerdos</p>
          <p className="text-xs text-white/40">
            {user?.email ?? '—'} · Versión 1.0
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <Card>
        {tab === 'profile'       && <ProfileSection />}
        {tab === 'security'      && <SecuritySection />}
        {tab === 'sharing'       && <SharingPanel />}
        {tab === 'notifications' && <NotificationsPanel />}
      </Card>

      <DangerZone />
      </m.div>
    </LazyMotion>
  )
}
