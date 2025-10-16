import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // CRITICAL FIX: Don't create a new NextResponse here
          // This was causing session termination and cookie loss
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) => {
            // SECURITY FIX: Use Supabase's default cookie settings
            // Don't override httpOnly - Supabase sets it appropriately per cookie
            // (refresh tokens are httpOnly, access tokens are not for client-side refresh)
            const secureOptions = {
              ...options,
              // httpOnly is intentionally NOT overridden - let Supabase control this
              secure: request.nextUrl.protocol === 'https:', // Check actual protocol
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') || 'lax', // Use Supabase default or lax
            };
            supabaseResponse.cookies.set(name, value, secureOptions);
          });
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.

  // Add timeout to prevent middleware from hanging the entire app
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Auth check timeout')), 5000)
  );

  let user = null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getClaims(),
      timeoutPromise
    ]) as { data: { claims: any } | null };
    user = data?.claims;
  } catch (error) {
    // If auth check times out or fails, continue without user
    console.error('Middleware auth check failed:', error);
  }

  // Only protect specific routes that require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/protected");

  if (!user && isProtectedRoute) {
    // Redirect to home page if trying to access protected routes without auth
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
