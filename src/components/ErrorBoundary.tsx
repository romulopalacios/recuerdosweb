import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, HeartCrack } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional scoped label shown in the error card (e.g. "Galería") */
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

/**
 * React Error Boundary that catches rendering errors from any child component.
 * Prevents the whole app from turning into a blank white screen.
 *
 * Senior-level note: wrap each major page/section independently so a crash in
 * the Gallery doesn't take down the Sidebar or Dashboard.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to Sentry / LogRocket / etc.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
            <HeartCrack size={26} className="text-rose-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">
              {this.props.label ? `Error en ${this.props.label}` : 'Algo salió mal'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs">{this.state.message}</p>
          </div>
          <button
            onClick={this.reset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
