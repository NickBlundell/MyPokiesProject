import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1, // 10% of requests for performance tracking

  environment: process.env.NODE_ENV,

  beforeSend(event) {
    // Don't send events if DSN is not configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null
    }
    return event
  },

  // Ignore common errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'socket hang up',
  ],
})
