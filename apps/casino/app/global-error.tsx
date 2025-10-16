'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f14',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: '#1a2024',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Critical Application Error
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              A critical error occurred and the application cannot continue. Please refresh the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}