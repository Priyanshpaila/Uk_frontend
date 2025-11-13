// app/api/auth/login/route.ts
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

  let upstream: Response
  const url = buildUrl(API, path)
  const body = await req.json().catch(() => ({}))

  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(KEY ? { 'x-api-key': KEY } : {}),
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ message: 'Upstream unavailable' }, { status: 502 })
  }

  const raw = await upstream.text()
  let payload: any
  try { payload = raw ? JSON.parse(raw) : {} } catch { payload = { message: raw || '' } }

  const resp = NextResponse.json(payload, { status: upstream.status })
  upstream.headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') resp.headers.append('set-cookie', value)
  })
  return resp
}

export async function POST(req: NextRequest) {
  // Try /auth/login first; if not found or method not allowed, fall back to /login
  const primary = await proxy(req, 'auth/login')
  if (primary.status !== 404 && primary.status !== 405) return primary
  return proxy(req, 'login')
}