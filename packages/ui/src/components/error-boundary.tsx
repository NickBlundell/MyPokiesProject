'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  homeLink?: string
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // TODO: Send error to error reporting service (Sentry, LogRocket, etc.)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} reset={this.reset} />
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} homeLink={this.props.homeLink} />
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, reset, homeLink = '/' }: { error: Error; reset: () => void; homeLink?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1a2024] border-2 border-red-900/50 rounded-xl p-6 text-center">
        <div className="bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h2>

        <p className="text-gray-400 mb-4">
          We encountered an unexpected error. Don&apos;t worry, your progress has been saved.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
              Error details (dev only)
            </summary>
            <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-red-400 overflow-auto">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <a
            href={homeLink}
            className="px-4 py-2 bg-[#2a3439] hover:bg-[#3a4449] text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary

// Async error boundary for server components
export function AsyncErrorBoundary({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <ErrorBoundary
      fallback={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </ErrorBoundary>
  )
}
