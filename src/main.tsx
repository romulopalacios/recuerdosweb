import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// When Vite deploys a new version, old chunk hashes referenced by a cached
// index.html will 404. Detect that specific error and do a hard reload once
// so the browser fetches the fresh index.html and new chunks.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})
// Belt-and-suspenders: catch any dynamic import failure the same way.
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason)
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed')) {
    window.location.reload()
  }
})

// Register Service Worker at app start so caching and push subscriptions
// are available immediately — not just after the user visits Settings.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failure is non-fatal — app still works without it
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
