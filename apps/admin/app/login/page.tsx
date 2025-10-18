'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create client inside the handler to avoid SSR issues
      const supabase = createClient()

      // For now, we'll use Supabase auth
      // In production, you'd implement custom admin auth with the admin_users table
      const { data, error: _authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (_authError) {
        console.error('Login error:', _authError)
        setError(_authError.message || 'Invalid email or password')
        return
      }

      if (!data.session) {
        console.error('No session created after login')
        setError('Failed to create session')
        return
      }

      console.log('Login successful, user:', data.user?.id)

      // Force refresh the router to update middleware session
      router.refresh()

      // Wait a moment for the refresh to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if user is an admin (you'd verify against admin_users table)
      // For now, we'll just redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Login exception:', error)
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <Image
            src="/mypokies-logo.webp"
            alt="MyPokies"
            width={200}
            height={64}
            className="h-16 w-auto mx-auto mb-4"
            priority
          />
          <p className="text-gray-600 mt-2">Admin Dashboard</p>
        </div>

        {/* Development Mode Notice */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 mb-2">🚀 Development Mode Active</p>
          <p className="text-sm text-yellow-700 mb-3">
            Authentication is bypassed. Click below to enter the admin panel directly.
          </p>
          <Link
            href="/dashboard"
            className="block w-full text-center py-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium"
          >
            Enter Admin Dashboard →
          </Link>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or use production login</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@mypokies.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Protected admin area • Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  )
}