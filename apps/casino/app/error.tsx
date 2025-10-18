'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logError } from '@mypokies/monitoring/client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logError('Application error', {
      context: 'ErrorBoundary',
      data: { message: error.message, digest: error.digest, stack: error.stack }
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f14] to-[#1a2024] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-[#1a2024] border-2 border-red-900/50 rounded-xl p-8 text-center shadow-2xl">
          {/* Error Icon */}
          <div className="bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          {/* Error Title */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Something Went Wrong!
          </h1>

          {/* Error Description */}
          <p className="text-gray-400 mb-6 leading-relaxed">
            We&apos;re sorry for the inconvenience. An unexpected error occurred while processing your request.
            Please try again or contact support if the problem persists.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300 font-medium">
                Show error details (development only)
              </summary>
              <div className="mt-3 p-4 bg-black/50 rounded-lg">
                <p className="text-xs font-mono text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-gray-500 mt-2">
                    Digest: {error.digest}
                  </p>
                )}
                {error.stack && (
                  <pre className="text-xs font-mono text-gray-600 mt-2 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <Link
              href="/"
              className="px-6 py-3 bg-[#2a3439] hover:bg-[#3a4449] text-gray-300 rounded-lg font-bold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
          </div>

          {/* Support Link */}
          <p className="mt-6 text-sm text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}