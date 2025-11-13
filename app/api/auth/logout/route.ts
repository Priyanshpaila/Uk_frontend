

// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS – allow your frontend to hit this route.
 * In production, set a specific origin instead of '*'.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  // Respond to preflight
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function withCors(res: NextResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

function clearAuthCookies(res: NextResponse) {
  // Clear both possible cookie names we have used
  // (adjust names if your app uses a single canonical cookie)
  res.cookies.set('auth_token', '', { expires: new Date(0), path: '/' })
  res.cookies.set('token', '', { expires: new Date(0), path: '/' })
}

/**
 * POST /api/auth/logout
 * Proxies logout to Laravel and clears the local auth cookies.
 */
export async function POST(req: NextRequest) {
  const apiBase = process.env.BACKEND_API_URL?.replace(/\/$/, '')
  if (!apiBase) {
    const res = NextResponse.json(
      { error: 'Server misconfig: BACKEND_API_URL not set' },
      { status: 500 }
    )
    return withCors(res)
  }

  // Grab token from Authorization header or cookie
  const headerAuth = req.headers.get('authorization') // e.g. "Bearer xxx"
  const headerToken =
    headerAuth?.toLowerCase().startsWith('bearer ')
      ? headerAuth.slice(7)
      : null

  const cookieToken =
    req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value

  const token = headerToken || cookieToken

  const url = `${apiBase}/api/auth/logout`

  // Call upstream only if we have a token; otherwise just clear local cookies
  if (!token) {
    const res = NextResponse.json({ ok: true, note: 'No token; local session cleared' })
    clearAuthCookies(res)
    withCors(res)
    res.headers.set('x-debug-upstream', url)
    return res
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // No body needed for logout, but you can pass {} if your backend expects JSON
      body: JSON.stringify({}),
      cache: 'no-store',
    })

    const text = await upstream.text()
    let payload: any
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { raw: text }
    }

    const res = NextResponse.json(payload, { status: upstream.status })
    clearAuthCookies(res)
    withCors(res)
    res.headers.set('x-debug-upstream', url)
    return res
  } catch (err: any) {
    const res = NextResponse.json(
      { error: 'Upstream error', detail: err?.message || String(err) },
      { status: 502 }
    )
    clearAuthCookies(res) // still clear on failure
    withCors(res)
    res.headers.set('x-debug-upstream', url)
    return res
  }
}