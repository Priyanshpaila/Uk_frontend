// pharmacy-expressv3/app/api/account/orders/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function apiBaseUrl() {
  return (process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
}

function commonHeaders(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const hostOverride = process.env.API_HOST_HEADER || req.headers.get('x-tenant-host') || undefined
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: auth } : {}),
    ...(hostOverride ? { Host: String(hostOverride) } : {}),
  }
  const xfh = req.headers.get('host')
  if (xfh) headers['X-Forwarded-Host'] = xfh
  return headers
}

async function passthroughJSON(res: Response) {
  const text = await res.text()
  let data: any
  try { data = text ? JSON.parse(text) : {} } catch {
    data = { message: 'Non-JSON upstream', status: res.status, body: text?.slice(0, 1000) }
  }
  return NextResponse.json(data, { status: res.status })
}

// GET → Laravel GET /api/account/orders
export async function GET(req: Request) {
  const upstream = `${apiBaseUrl()}/account/orders`
  try {
    const res = await fetch(upstream, {
      method: 'GET',
      headers: commonHeaders(req),
      cache: 'no-store',
      next: { revalidate: 0 },
    })
    return await passthroughJSON(res)
  } catch (err: any) {
    return NextResponse.json({ message: 'Upstream unavailable', error: String(err?.message || err) }, { status: 502 })
  }
}

export async function POST() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 })
}