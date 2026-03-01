import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

import LoginPage      from '@/pages/Login'
import DashboardPage  from '@/pages/Dashboard'
import MemoriesPage   from '@/pages/Memories'
import TimelinePage   from '@/pages/Timeline'
import GalleryPage    from '@/pages/Gallery'
import CategoriesPage    from '@/pages/Categories'
import SettingsPage      from '@/pages/Settings'
import MemoryDetailPage  from '@/pages/MemoryDetail'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/memories"   element={<MemoriesPage />} />
          <Route path="/memories/:id" element={<MemoryDetailPage />} />
          <Route path="/timeline"   element={<TimelinePage />} />
          <Route path="/gallery"    element={<GalleryPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings"   element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
