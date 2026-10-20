import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const isDemoAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "true";
  const mockToken = isDemoAllowed ? request.cookies.get("sb-mock-token")?.value : undefined;
  let user = null;

  if (!mockToken) {
    const allCookies = request.cookies.getAll();
    const hasSupabaseAuthCookie = allCookies.some(c => 
      c.name.startsWith('sb-') && (c.name.includes('-auth-token') || c.name.endsWith('-token'))
    );

    if (hasSupabaseAuthCookie) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
      } catch {
        user = null
      }
    }
  }

  const isAuthenticated = !!user || !!mockToken;

  // Protect /dashboard and sub-routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if logged-in user visits login page
  if (request.nextUrl.pathname.startsWith('/login') && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root path to dashboard or login
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAuthenticated ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
