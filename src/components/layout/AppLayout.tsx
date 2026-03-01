import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette'

export function AppLayout() {
  const { open, setOpen } = useCommandPalette()

  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar onOpenSearch={() => setOpen(true)} />
      {/* Main content — offset by sidebar width on lg, topbar height on mobile */}
      <main className="flex-1 lg:pl-64 min-h-screen overflow-x-hidden">
        <div className="w-full px-5 pt-20 pb-10 lg:px-10 lg:pt-10 lg:pb-16">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
