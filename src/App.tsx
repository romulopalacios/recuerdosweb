import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { queryClient } from '@/lib/queryClient'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuthStore } from '@/store/authStore'

// Lazy-loaded pages – each chunk is fetched only when the route is first visited
const LoginPage         = lazy(() => import('@/pages/Login'))
const DashboardPage     = lazy(() => import('@/pages/Dashboard'))
const MemoriesPage      = lazy(() => import('@/pages/Memories'))
const TimelinePage      = lazy(() => import('@/pages/Timeline'))
const GalleryPage       = lazy(() => import('@/pages/Gallery'))
const CategoriesPage    = lazy(() => import('@/pages/Categories'))
const SettingsPage      = lazy(() => import('@/pages/Settings'))
const MemoryDetailPage  = lazy(() => import('@/pages/MemoryDetail'))
const NotFoundPage      = lazy(() => import('@/pages/NotFound'))
const InvitePage        = lazy(() => import('@/pages/Invite'))

// Simple full-screen spinner used as Suspense fallback
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"    element={<DashboardPage />} />
            <Route path="/memories"     element={<MemoriesPage />} />
            <Route path="/memories/:id" element={<MemoryDetailPage />} />
            <Route path="/timeline"     element={<TimelinePage />} />
            <Route path="/gallery"      element={<GalleryPage />} />
            <Route path="/categories"   element={<CategoriesPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary label="aplicación">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
