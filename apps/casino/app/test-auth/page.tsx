'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing...')
    const supabase = createClient()

    try {
      // Test 1: Check env vars
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      setResult(prev => prev + `\n✓ Env vars present: URL=${hasUrl}, KEY=${hasKey}`)

      // Test 2: Try to get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      setResult(prev => prev + `\n✓ Session check: ${sessionError ? 'Error: ' + sessionError.message : 'OK'}`)
      setResult(prev => prev + `\n  Current session: ${sessionData.session ? 'Logged in as ' + sessionData.session.user.email : 'Not logged in'}`)

      // Test 3: Try to login
      setResult(prev => prev + `\n\nTesting login with test@mypokies.com...`)
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'test@mypokies.com',
        password: 'TestPassword123!'
      })

      if (loginError) {
        setResult(prev => prev + `\n✗ Login failed: ${loginError.message}`)
      } else {
        setResult(prev => prev + `\n✓ Login successful!`)
        setResult(prev => prev + `\n  User: ${loginData.user?.email}`)
        setResult(prev => prev + `\n  Session: ${loginData.session ? 'Created' : 'Not created'}`)
      }
    } catch (e) {
      setResult(prev => prev + `\n✗ Exception: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
