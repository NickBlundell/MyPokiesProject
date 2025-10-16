import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { ipWhitelistMiddleware, rateLimitMiddleware } from '@mypokies/security/edge'
import { edgeLogger as logger } from '@mypokies/monitoring/edge'

export async function middleware(request: NextRequest) {
  // DEVELOPMENT BYPASS: Skip authentication and IP checks in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.ENFORCE_IP_WHITELIST) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  // IP Whitelisting for Admin Access
  const { allowed, ip, reason } = await ipWhitelistMiddleware(request as unknown as Request)

  if (!allowed) {
    logger.warn(`Admin access blocked: ${reason}`, {
      event: 'admin_access_blocked',
      ip,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    })

    return new NextResponse('Access Denied', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  // Rate Limiting for Admin Panel
  const { success, headers: rateLimitHeaders } = await rateLimitMiddleware(
    request as unknown as Request,
    'strict' // Use strict rate limiting for admin
  )

  if (!success) {
    logger.warn(`Admin rate limit exceeded for IP: ${ip}`, {
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