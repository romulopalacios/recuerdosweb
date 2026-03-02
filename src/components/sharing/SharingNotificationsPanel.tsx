/**
 * Sharing & Notifications panel — embedded in Settings.tsx
 *
 * Shows in Settings under a new "Compartir & Notificaciones" tab.
 * Can also be used standalone.
 *
 * Exports:
 *  <SharingPanel />         — manage invite links (owner view)
 *  <NotificationsPanel />   — enable/disable push notifications + anniversary check
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Link2, Copy, Trash2, Bell, BellOff, BellRing, RefreshCw,
  Users, Calendar, Eye, Pencil, UserRound, Mail,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { useMyShares, useCreateInvite, useRevokeShare } from '@/hooks/useSharing'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { SharedAccess, SharePermission } from '@/types'

// ─── Sharing Panel ────────────────────────────────────────────────────────────

export function SharingPanel() {
  const { data: shares = [], isLoading } = useMyShares()
  const createMut  = useCreateInvite()
  const revokeMut  = useRevokeShare()
  const [copiedId, setCopiedId]             = useState<string | null>(null)
  const [newPermission, setNewPermission]   = useState<SharePermission>('read')
  const [newName, setNewName]               = useState('')
  const [newEmail, setNewEmail]             = useState('')

  function copyLink(share: SharedAccess) {
    const url = `${window.location.origin}/invite/${share.invite_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(share.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function statusBadge(share: SharedAccess) {
    if (share.accepted_at) {
      return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Activo</span>
    }
    if (new Date(share.expires_at) < new Date()) {
      return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">Expirado</span>
    }
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">Pendiente</span>
  }

  function permissionBadge(share: SharedAccess) {
    if (share.permission === 'write') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          <Pencil size={9} /> Leer y escribir
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
        <Eye size={9} /> Solo lectura
      </span>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-800 text-sm">Acceso compartido</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Crea un enlace de invitación para que tu pareja pueda acceder a los recuerdos.
        </p>
      </div>

      {/* ── Create invite form ─────────────────────────────────────────── */}
      <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
        {/* Name + Email inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <UserRound size={10} /> Nombre (opcional)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Mi amor"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent placeholder-gray-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Mail size={10} /> Correo (opcional)
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent placeholder-gray-300"
            />
          </div>
        </div>

        {newEmail && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Mail size={10} />
            Solo quien inicie sesión con <strong>{newEmail.trim().toLowerCase()}</strong> podrá aceptar este enlace.
          </p>
        )}

        {/* Permission selector */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Tipo de acceso</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewPermission('read')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                newPermission === 'read'
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400'
              }`}
            >
              <Eye size={11} /> Solo lectura
            </button>
            <button
              type="button"
              onClick={() => setNewPermission('write')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                newPermission === 'write'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              <Pencil size={11} /> Leer y escribir
            </button>
          </div>
        </div>

        <Button
          size="sm"
          leftIcon={<Link2 size={13} />}
          loading={createMut.isPending}
          onClick={() => {
            createMut.mutate({
              permission: newPermission,
              guestName:  newName.trim()  || undefined,
              guestEmail: newEmail.trim() || undefined,
            }, {
              onSuccess: () => { setNewName(''); setNewEmail('') },
            })
          }}
          className="w-full"
        >
          Crear enlace de invitación
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {!isLoading && shares.length === 0 && (
        <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
          <Users size={24} className="opacity-40" />
          <p className="text-sm">No hay invitaciones creadas</p>
        </div>
      )}

      {shares.map((share) => (
        <motion.div
          key={share.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
        >
          <div className="flex-1 min-w-0">
            {/* Name / email label */}
            {(share.guest_name || share.guest_email) && (
              <p className="text-xs font-semibold text-gray-700 truncate flex items-center gap-1 mb-1">
                {share.guest_name
                  ? <><UserRound size={10} className="text-gray-400" /> {share.guest_name}</>
                  : <><Mail size={10} className="text-gray-400" /> {share.guest_email}</>
                }
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(share)}
              {permissionBadge(share)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Calendar size={9} />
              Expira: {format(parseISO(share.expires_at), "d MMM yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {!share.accepted_at && new Date(share.expires_at) > new Date() && (
              <button
                type="button"
                onClick={() => copyLink(share)}
                title="Copiar enlace"
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                {copiedId === share.id ? <Copy size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => revokeMut.mutate(share.id)}
              disabled={revokeMut.isPending}
              title="Revocar acceso"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

export function NotificationsPanel() {
  const {
    permission,
    isSubscribed,
    isRegistering,
    subscribe,
    unsubscribe,
    checkAnniversaries,
    refreshPermission,
  } = usePushNotifications()

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-800 text-sm">Notificaciones push</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Recibe una alerta el día exacto del aniversario de cada recuerdo.
        </p>
      </div>

      {permission === 'unsupported' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
          Tu navegador no soporta notificaciones push.
        </div>
      )}

      {permission === 'denied' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
          <p className="text-sm font-medium text-red-700">Notificaciones bloqueadas para este sitio</p>
          <ol className="text-xs text-red-600 space-y-1 list-decimal list-inside">
            <li>Haz clic en el <strong>candado 🔒</strong> junto a la barra de direcciones</li>
            <li>Busca <strong>Notificaciones</strong> y cámbialo a <strong>Permitir</strong></li>
            <li>Recarga la página y vuelve a hacer clic en <strong>Activar</strong></li>
          </ol>
          <button
            onClick={refreshPermission}
            className="text-xs underline text-red-500 hover:text-red-700 mt-1"
          >
            Ya lo activé — actualizar
          </button>
        </div>
      )}

      {permission !== 'unsupported' && permission !== 'denied' && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isSubscribed ? 'bg-rose-100' : 'bg-gray-100'
            }`}>
              {isSubscribed
                ? <BellRing size={16} className="text-rose-500" />
                : <BellOff  size={16} className="text-gray-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {isSubscribed ? 'Notificaciones activas' : 'Notificaciones inactivas'}
              </p>
              <p className="text-xs text-gray-400">
                {isSubscribed
                  ? 'Recibirás alertas de aniversarios'
                  : 'Actívalas para no olvidar ningún aniversario'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isSubscribed ? 'secondary' : 'primary'}
            loading={isRegistering}
            leftIcon={isSubscribed ? <BellOff size={13} /> : <Bell size={13} />}
            onClick={isSubscribed ? unsubscribe : subscribe}
          >
            {isSubscribed ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      )}

      {isSubscribed && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RefreshCw size={13} />}
          onClick={checkAnniversaries}
          className="w-full"
        >
          Comprobar aniversarios ahora
        </Button>
      )}
    </div>
  )
}
