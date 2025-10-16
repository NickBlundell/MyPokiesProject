'use client'

import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MyPokies Admin</h1>
          <p className="text-gray-600 mt-2">Development Access</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Development Mode:</strong> This bypasses authentication for testing purposes.
            In production, proper authentication will be required.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Enter Admin Dashboard (Dev Mode)
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <strong>To set up proper admin authentication:</strong>
          </p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Go to Supabase Dashboard</li>
            <li>Create a new user in Authentication</li>
            <li>Use email: admin@mypokies.com</li>
            <li>Set a secure password</li>
          </ol>
        </div>
      </div>
    </div>
  )
}