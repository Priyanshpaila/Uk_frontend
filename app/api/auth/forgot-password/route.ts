// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API = process.env.BACKEND_API_URL
const KEY = process.env.BACKEND_API_KEY

function buildUrl(base: string, path: string) {
  const root = base.replace(/\/+$/, '') + '/'
  return new URL(path.replace(/^\/+/, ''), root).toString()
}

async function proxy(req: NextRequest, path: string) {
  if (!API) return NextResponse.json({ message: 'BACKEND_API_URL not set' }, { status: 500 })

  const { email } = await req.json().catch(() => ({}))
  // Always validate, but don’t leak info
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const url = buildUrl(API, path)

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(KEY ? { 'x-api-key': KEY } : {}),
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : {}),
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    })

    // Regardless of backend response body, return ok to avoid enumeration
    return NextResponse.json({ ok: true }, { status: upstream.ok ? 200 : upstream.status })
  } catch {
    // Still return ok to avoid email enumeration via timing/errors
    return NextResponse.json({ ok: true })
  }
}

export async function POST(req: NextRequest) {
  // Try common paths in order
  const primary = await proxy(req, 'auth/forgot-password')
  if (primary.status !== 404 && primary.status !== 405) return primary
  const alt1 = await proxy(req, 'password/email') // Laravel default for sending reset link
  if (alt1.status !== 404 && alt1.status !== 405) return alt1
  return proxy(req, 'forgot-password')
}