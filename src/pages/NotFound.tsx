import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-app px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6 max-w-sm"
      >
        {/* Big number */}
        <div className="relative">
          <p className="text-[8rem] font-display font-black leading-none gradient-hero bg-clip-text text-transparent select-none">
            404
          </p>
          <div className="absolute inset-0 text-[8rem] font-display font-black leading-none text-rose-100 -z-10 blur-2xl select-none">
            404
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-800">Página no encontrada</h1>
          <p className="text-sm text-gray-500">
            Esta página no existe o fue movida a otro lugar.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
          <Button
            size="sm"
            leftIcon={<Home size={14} />}
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Ir al inicio
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
