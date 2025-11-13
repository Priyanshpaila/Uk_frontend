// app/api/pay/ryft-ping/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const r = await fetch('https://sandbox-api.ryftpay.com/', { method: 'GET' })
    const text = await r.text()
    return NextResponse.json({ ok: true, status: r.status, body: text.slice(0, 200) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.cause ?? e) }, { status: 500 })
  }
}
