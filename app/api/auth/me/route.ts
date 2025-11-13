// app/api/users/me/route.ts
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
  if (!API) {
    return NextResponse.json({ message: 'BACKEND_API_URL not set' }, { status: 500 })
  }

  let upstream: Response
  const url = buildUrl(API, path)

  try {
    upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(KEY ? { 'x-api-key': KEY } : {}),
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : {}),
        ...(req.headers.get('authorization')
          ? { authorization: req.headers.get('authorization') as string }
          : {}),
      },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ message: 'Upstream unavailable' }, { status: 502 })
  }

  const raw = await upstream.text()
  let payload: any
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { message: raw || '' }
  }

  return NextResponse.json(payload, { status: upstream.status })
}

export async function GET(req: NextRequest) {
  // Try /auth/me first; if not found, fall back to /me
  const primary = await proxy(req, 'users/me')
  if (primary.status !== 404 && primary.status !== 405) return primary
  return proxy(req, 'me')
}