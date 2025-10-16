import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-200">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-gray-400">
          Page Not Found
        </h2>
        <p className="mb-8 text-gray-500">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}