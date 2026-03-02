import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, LayoutDashboard, Heart, Clock, Images, Tag, Settings,
  MapPin, ArrowRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatDate, cn } from '@/lib/utils'
import { getMoodEmoji } from '@/lib/moodData'
import { getMemories } from '@/services/memoriesService'
import type { Memory } from '@/types'

// ─── Simple debounce hook ─────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Quick nav links shown when no query ─────────────────────────────────────

const QUICK_LINKS = [
  { label: 'Inicio',      to: '/dashboard',   icon: <LayoutDashboard size={15} /> },
  { label: 'Recuerdos',   to: '/memories',    icon: <Heart size={15} /> },
  { label: 'Timeline',    to: '/timeline',    icon: <Clock size={15} /> },
  { label: 'Galería',     to: '/gallery',     icon: <Images size={15} /> },
  { label: 'Categorías',  to: '/categories',  icon: <Tag size={15} /> },
  { label: 'Configuración', to: '/settings',  icon: <Settings size={15} /> },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultItem =
  | { kind: 'link';   label: string; to: string; icon: React.ReactNode }
  | { kind: 'memory'; memory: Memory }

// ─── Palette ─────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open:    boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate    = useNavigate()
  const inputRef    = useRef<HTMLInputElement>(null)
  const listRef     = useRef<HTMLUListElement>(null)
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)

  const debouncedQuery = useDebounce(query.trim(), 300)

  // Query Supabase only when the user has typed something (server-side search)
  const { data: searchMemories = [], isFetching } = useQuery({
    queryKey: ['memories', 'palette-search', debouncedQuery],
    queryFn:  () => getMemories({ search: debouncedQuery, limit: 8, sort: 'date_desc' }),
    staleTime: 1000 * 60,
    enabled: Boolean(debouncedQuery),
  })

  // Build results list
  const results = useMemo<ResultItem[]>(() => {
    if (!debouncedQuery) {
      return QUICK_LINKS.map((l) => ({ kind: 'link' as const, ...l }))
    }
    return searchMemories.map((m) => ({ kind: 'memory' as const, memory: m }))
  }, [debouncedQuery, searchMemories])

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  // Scroll cursor item into view
  useEffect(() => {
    const li = listRef.current?.children[cursor] as HTMLLIElement | undefined
    li?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const execute = useCallback(
    (item: ResultItem) => {
      onClose()
      if (item.kind === 'link')   navigate(item.to)
      if (item.kind === 'memory') navigate(`/memories/${item.memory.id}`)
    },
    [navigate, onClose],
  )

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[cursor]) execute(results[cursor])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Reset cursor when results change
  useEffect(() => { setCursor(0) }, [results])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed z-[101] left-1/2 top-[15vh] -translate-x-1/2 w-full max-w-lg px-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

              {/* Search input row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Buscar recuerdos, páginas…"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <ul
                ref={listRef}
                className="max-h-72 overflow-y-auto py-2"
              >
                {/* Loading state while debounce / fetch in progress */}
                {isFetching && debouncedQuery ? (
                  <li className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
                    Buscando…
                  </li>
                ) : results.length === 0 && debouncedQuery ? (
                  <li className="flex flex-col items-center py-8 text-gray-400 text-sm gap-2">
                    <Search size={20} className="opacity-40" />
                    Sin resultados para «{query}»
                  </li>
                ) : (
                  results.map((item, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => execute(item)}
                        onMouseEnter={() => setCursor(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                          cursor === idx ? 'bg-rose-50' : 'hover:bg-gray-50',
                        )}
                      >
                        {item.kind === 'link' ? (
                          <>
                            <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                              cursor === idx ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500')}>
                              {item.icon}
                            </span>
                            <span className="text-sm font-medium text-gray-800">{item.label}</span>
                            <ArrowRight size={12} className="ml-auto text-gray-300" />
                          </>
                        ) : (
                          <>
                            {/* Cover thumb */}
                            <div className="flex-shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-sm">
                              {item.memory.cover_photo_url
                                ? <img src={item.memory.cover_photo_url} alt="" className="w-full h-full object-cover" />
                                : <span className="opacity-50">{getMoodEmoji(item.memory.mood) || '💕'}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.memory.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{formatDate(item.memory.memory_date)}</span>
                                {item.memory.location && (
                                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                    <MapPin size={9} />{item.memory.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight size={12} className="ml-auto text-gray-300 flex-shrink-0" />
                          </>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              {/* Footer hint */}
              <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-medium">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-medium">↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-medium">↵</kbd>
                  abrir
                </span>
                {query && <span className="ml-auto">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Global keyboard shortcut hook ───────────────────────────────────────────

/**
 * Call this once at the app root. Listens for Ctrl+K / Cmd+K globally.
 * Returns [open, setOpen] to pass into <CommandPalette />.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { open, setOpen }
}
