// app/api/pay/ryft/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const key =
      process.env.RYFT_PUBLIC_KEY || process.env.NEXT_PUBLIC_RYFT_PUBLIC_KEY
    if (!key || !key.startsWith('pk_')) {
      return NextResponse.json(
        { message: 'Missing or invalid Ryft PUBLIC key (should start with pk_)' },
        { status: 500 },
      )
    }

    // Read the body ONCE
    const bodyText = await req.text()
    if (!bodyText) {
      return NextResponse.json({ message: 'Missing JSON body' }, { status: 400 })
    }

    // (Optional) quick validation so we fail fast before calling Ryft
    try {
      const parsed = JSON.parse(bodyText)
      if (!parsed?.clientSecret) {
        return NextResponse.json({ message: 'clientSecret is required' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const ryftRes = await fetch(
      'https://sandbox-api.ryftpay.com/v1/checkout-sessions/attempt-payment',
      {
        method: 'POST',
        headers: {
          Authorization: key,              // raw pk_ key (no "Bearer")
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: bodyText,                    // reuse the body we already read
      },
    )

    const text = await ryftRes.text()
    if (!ryftRes.ok) {
      return NextResponse.json(
        { message: 'Ryft attempt failed', status: ryftRes.status, detail: text },
        { status: 502 },
      )
    }

    return NextResponse.json(text ? JSON.parse(text) : {})
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server crash in attempt route', detail: e?.message || String(e) },
      { status: 500 },
    )
  }
}