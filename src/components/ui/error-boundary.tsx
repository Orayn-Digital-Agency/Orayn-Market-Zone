'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-12 h-12 bg-orayn-red-bg rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-orayn-red" />
          </div>
          <h3 className="font-sora text-base font-semibold text-orayn-navy mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-orayn-gray mb-6 max-w-xs">
            {this.state.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.reset}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
