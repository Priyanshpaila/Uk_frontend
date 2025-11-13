// app/api/reorder/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'

const CATALOG = {
  'mounjaro-maintenance': [144.99, 164.99, 224.99, 244.99, 264.99, 284.99],
  'wegovy-refill': [99.49, 104.49, 114.49, 159.99, 209.99],
} as const

export async function POST(req: NextRequest) {
  try {
    const { slug, optionIndex, fullName, dob } = await req.json()

    if (!slug || optionIndex === undefined || !fullName || !dob) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const priceList = (CATALOG as any)[slug] as number[] | undefined
    if (!priceList || !priceList[optionIndex]) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    const amount = Math.round(priceList[optionIndex] * 100) // pence

    // Create a Ryft payment session
    // Docs may differ. Adjust fields to your live account
    const res = await fetch('https://sandbox-api.ryftpay.com/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.RYFT_SECRET_KEY || '',
      },
      body: JSON.stringify({
        amount,
        currency: 'GBP',
        reference: `reorder-${slug}-${Date.now()}`,
        description: `Reorder ${slug} option ${optionIndex + 1} for ${fullName}`,
        returnUrl: `${process.env.NEXT_PUBLIC_RETURN_URL_HTTPS?.replace(/\/+$/, '')}/checkout/return`,
        metadata: { slug, optionIndex, fullName, dob },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Ryft error', detail: text }, { status: 500 })
    }

    const data = await res.json()
    const redirectUrl =
      data?.url ||
      data?.redirect_url ||
      data?.links?.redirect ||
      data?.hostedUrl ||
      data?.hosted_url ||
      undefined

    return NextResponse.json({ checkout_url: redirectUrl })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', detail: String(e?.message || e) }, { status: 500 })
  }
}
