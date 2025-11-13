// app/api/intakes/route.ts
import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.BACKEND_API_KEY

/**
 * CORS – allow your frontend to hit this route.
 * In production, set a specific origin instead of '*'.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  // Respond to preflight
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function withCors(res: NextResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v as string))
  return res
}

export async function POST(req: NextRequest) {
  // 1) Get auth token (from cookie OR Authorization header)
  const cookieToken = req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value
  const headerAuth = req.headers.get('authorization') // "Bearer xxx"
  const headerToken = headerAuth?.toLowerCase().startsWith('bearer ') ? headerAuth.slice(7) : null
  const token = cookieToken || headerToken

  if (!token) {
    return withCors(
      NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 })
    )
  }

  // 2) Parse JSON body
  const body = await req.json().catch(() => ({}))

  // --- A) If you just want to echo back for now (no Laravel yet), keep this: ---
  // return withCors(NextResponse.json({ ok: true, echo: body }))

  // --- B) Forward to your Laravel pharmacy-api (recommended) ---
  // Set BACKEND_API_URL in your env (e.g. https://api.safescript.co.uk or whatever your Laravel base is)
  const apiBase = process.env.BACKEND_API_URL?.replace(/\/+$/, '')
  if (!apiBase) {
    return withCors(
      NextResponse.json({ error: 'Server misconfig: BACKEND_API_URL not set' }, { status: 500 })
    )
  }

  // Adjust the endpoint path to your Laravel route (example: /api/auth/intakes)
  const url = `${apiBase}${/\/api$/.test(apiBase) ? '' : '/api'}/auth/intakes`
  // NOTE: upstream URL built above; if Laravel lacks this route you'll get 404

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(KEY ? { 'x-api-key': KEY } : {}),
        // pass auth along to Laravel
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      // Ensure Next won’t cache this
      cache: 'no-store',
    })

    // If the Laravel API doesn't have this route yet, gracefully fall back so the UI can continue
    if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
      const out = NextResponse.json(
        {
          ok: true,
          stored: false,
          note: 'Laravel endpoint not found yet; returning stub success from Next.js',
        },
        { status: 200 }
      )
      out.headers.set('x-debug-upstream', url)
      return withCors(out)
    }

    const text = await resp.text()
    let json: any = null
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }

    const out = NextResponse.json(json, { status: resp.status })
    // helpful for local debugging: shows which upstream URL we hit
    out.headers.set('x-debug-upstream', url)
    return withCors(out)
  } catch (err: any) {
    const out = NextResponse.json(
      { error: 'Upstream error', detail: err?.message || String(err) },
      { status: 502 }
    )
    out.headers.set('x-debug-upstream', url ?? 'n/a')
    return withCors(out)
  }
}