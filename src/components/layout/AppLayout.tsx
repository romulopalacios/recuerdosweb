import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useGuestMode } from '@/hooks/useGuestMode'
import { Eye } from 'lucide-react'

function GuestBanner() {
  const { isGuest } = useGuestMode()
  if (!isGuest) return null
  return (
    <div className="w-full bg-violet-600 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 flex-shrink-0">
      <Eye size={14} />
      <span>Estás en <strong>modo vista</strong> — puedes ver estos recuerdos pero no modificarlos 💕</span>
    </div>
  )
}

export function AppLayout() {
  const { open, setOpen } = useCommandPalette()

  // Subscribe to Supabase Realtime for live cross-device / cross-session sync
  useRealtimeSync()

  return (
    <div className="flex flex-col min-h-screen bg-app">
      <GuestBanner />
      <div className="flex flex-1">
        <Sidebar onOpenSearch={() => setOpen(true)} />
        {/* Main content — offset by sidebar width on lg, topbar height on mobile */}
        <main className="flex-1 lg:pl-64 min-h-screen overflow-x-hidden">
          <div className="w-full px-5 pt-20 pb-10 lg:px-10 lg:pt-10 lg:pb-16">
            {/* Per-page error boundary: a crash in one page won't break the sidebar */}
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
