import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Heart,
  Clock,
  Tag,
  Images,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',       to: '/dashboard',   icon: <LayoutDashboard size={17} /> },
  { label: 'Recuerdos',    to: '/memories',    icon: <Heart size={17} /> },
  { label: 'Timeline',     to: '/timeline',    icon: <Clock size={17} /> },
  { label: 'Galería',      to: '/gallery',     icon: <Images size={17} /> },
  { label: 'Categorías',   to: '/categories',  icon: <Tag size={17} /> },
]

interface SidebarProps {
  onOpenSearch?: () => void
}

export function Sidebar({ onOpenSearch }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const initials =
    user?.user_metadata?.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('') ??
    user?.email?.charAt(0)?.toUpperCase() ??
    '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* ── Mobile topbar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
        style={{ background: 'linear-gradient(175deg,#1c0a2e,#2e1055)' }}>
        <button
          className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-hero flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-display text-sm font-bold text-white/90">Nuestros Recuerdos</span>
        </div>
      </div>

      {/* ── Overlay ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 z-50 flex flex-col gradient-sidebar shadow-sidebar',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ── Mobile spacer: clears the fixed topbar (h-14 = 56px) ── */}
        <div className="h-14 flex-shrink-0 lg:hidden" />
        {/* ── Logo (desktop only — topbar already shows brand on mobile) ── */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-6 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl gradient-hero flex items-center justify-center shadow-soft flex-shrink-0">
            <Sparkles size={19} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-[15px] leading-tight tracking-tight">
              Nuestros Recuerdos
            </h1>
            <p className="text-[10px] text-rose-300/70 font-medium tracking-wide uppercase mt-0.5">
              tu espacio íntimo ✨
            </p>
          </div>
        </div>

        {/* ── Divider (desktop only) ── */}
        <div className="mx-5 divider-dark mb-2 hidden lg:block" />

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 px-3 py-2">
            Navegación
          </p>

          {/* Search button */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-white/55 hover:text-white/90 hover:bg-white/8 group mb-1"
            >
              <Search size={17} className="flex-shrink-0" />
              <span className="flex-1 text-left">Buscar</span>
              <span className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-semibold text-white/25 bg-white/8 border border-white/10 rounded px-1 py-0.5">
                ⌃K
              </span>
            </button>
          )}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'gradient-hero text-white nav-active-glow'
                    : 'text-white/55 hover:text-white/90 hover:bg-white/8',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex-shrink-0 transition-transform duration-200', isActive ? 'scale-110' : 'group-hover:scale-105')}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] bg-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded-full font-semibold">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer section ── */}
        <div className="flex-shrink-0 px-3 pb-4 space-y-1">
          <div className="mx-2 divider-dark mb-2" />

          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'gradient-hero text-white nav-active-glow'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/8',
              )
            }
          >
            <Settings size={17} />
            Configuración
          </NavLink>

          {/* ── User card ── */}
          <div className="mt-2 mx-0 rounded-2xl bg-white/5 border border-white/8 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-soft">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/85 truncate leading-tight">
                {user?.user_metadata?.full_name ?? 'Usuario'}
              </p>
              <p className="text-xs text-white/60 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
