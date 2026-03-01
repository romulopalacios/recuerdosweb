import { motion } from 'framer-motion'
import { Clock, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function TimelinePage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">Timeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu historia cronológica</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl gradient-sidebar p-10 text-center shadow-soft">
        {/* ambient blobs */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-5 shadow-soft animate-float">
            <Clock size={26} className="text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full mb-4">
            <Sparkles size={10} /> Próximamente • Fase 4
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-3">
            Timeline inteligente
          </h2>
          <p className="text-white/45 text-sm max-w-sm leading-relaxed">
            Un hermoso timeline ordenado cronológicamente con todos sus recuerdos agrupados por mes y año.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
