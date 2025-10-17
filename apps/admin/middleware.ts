import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { rateLimitMiddleware } from '@mypokies/security/edge'
import { edgeLogger as logger } from '@mypokies/monitoring/edge'

// Helper to get client IP for logging
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwarded) return forwarded.split(',')[0].trim()
  if (cfConnectingIp) return cfConnectingIp
  if (realIp) return realIp

  return 'unknown'
}

export async function middleware(request: NextRequest) {
  // DEVELOPMENT BYPASS: Skip authentication in development mode
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  const ip = getClientIP(request)

  // Rate Limiting for Admin Panel
  const { success, headers: rateLimitHeaders } = await rateLimitMiddleware(
    request as unknown as Request,
    'strict' // Use strict rate limiting for admin
  )

  if (!success) {
    logger.warn(`Admin rate limit exceeded`, {
      event: 'admin_rate_limit_exceeded',
      ip,
      path: request.nextUrl.pathname,
    })

    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: Object.fromEntries(rateLimitHeaders.entries()),
    })
  }

  // SECURITY FIX: Authentication is ALWAYS required in production
  // No bypasses allowed

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Log authentication errors for debugging
  if (authError) {
    logger.error('Auth error in middleware', {
      event: 'middleware_auth_error',
      path: request.nextUrl.pathname,
      ip,
      error: authError,
    })
  }

  // If user is not authenticated and trying to access protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    logger.info('Redirecting unauthenticated user to login', {
      event: 'auth_redirect_to_login',
      path: request.nextUrl.pathname,
      ip,
    })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated and trying to access login page
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    logger.info('Redirecting authenticated user to dashboard', {
      event: 'auth_redirect_to_dashboard',
      userId: user.id,
      ip,
    })
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  )

  // Add rate limit headers
  rateLimitHeaders.forEach((value, key) => {
    response.headers.set(key, value)
  })

  // Log successful admin access for audit trail
  logger.info('Admin access granted', {
    event: 'admin_access_granted',
    ip,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}