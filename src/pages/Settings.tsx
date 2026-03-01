import { motion } from 'framer-motion'
import { Settings, User, Shield, Bell, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const settingsSections = [
    { icon: <User size={20} />, label: 'Perfil',          desc: 'Nombre, avatar, email',   color: 'bg-rose-50 text-rose-500' },
    { icon: <Shield size={20} />, label: 'Seguridad',     desc: 'Contraseña, 2FA',         color: 'bg-violet-50 text-violet-500' },
    { icon: <Bell size={20} />, label: 'Notificaciones',  desc: 'Alertas, recordatorios',  color: 'bg-amber-50 text-amber-500' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personaliza tu experiencia</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {settingsSections.map((item) => (
          <div key={item.label} className="group bg-white rounded-2xl border border-gray-100 shadow-card p-5 opacity-60 cursor-not-allowed">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
              {item.icon}
            </div>
            <p className="font-semibold text-gray-800 text-sm mb-1">{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl gradient-sidebar p-7 shadow-soft">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-rose-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Configuración completa</p>
            <p className="text-xs text-white/40 mt-0.5">Disponible en Fase 5 — Búsqueda avanzada & polish.</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
