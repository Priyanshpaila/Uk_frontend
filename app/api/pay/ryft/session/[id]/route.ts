// app/api/pay/ryft/session/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

type Params = { id: string }

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> } | { params: Params } // supports both
) {
  const resolved = 'then' in ctx.params ? await ctx.params : ctx.params
  const { id } = resolved

  const key = process.env.RYFT_SECRET_KEY
  if (!key) {
    return NextResponse.json({ message: 'Missing RYFT_SECRET_KEY' }, { status: 500 })
  }

  try {
    const r = await fetch(
      `https://sandbox-api.ryftpay.com/v1/checkout-sessions/${encodeURIComponent(id)}`,
      { headers: { Authorization: key, Accept: 'application/json' } }
    )
    const text = await r.text()
    if (!r.ok) {
      return NextResponse.json(
        { message: 'Ryft call failed', status: r.status, detail: text },
        { status: 502 }
      )
    }
    return NextResponse.json(text ? JSON.parse(text) : {})
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Ryft call failed', detail: String(e) },
      { status: 502 }
    )
  }
}
