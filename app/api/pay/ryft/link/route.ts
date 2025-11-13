// app/api/pay/ryft/link/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Optional: provide sensible fallbacks if frontend omits fields
    const payload = {
      amount: body.amount,
      currency: body.currency ?? 'GBP',
      description: body.description ?? 'Pharmacy Express',
      returnUrl: body.returnUrl ?? process.env.NEXT_PUBLIC_RETURN_URL_HTTPS?.replace(/\/+$/, '') + '/checkout/return',
      customerEmail: body.customerEmail, // pass through if provided
    };

    const res = await fetch('https://sandbox-api.ryftpay.com/v1/payment-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // IMPORTANT: raw secret key, same as your working curl
        Authorization: process.env.RYFT_SECRET_KEY as string,
      },
      body: JSON.stringify(payload),
    });

    const j = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: 'Ryft call failed', status: res.status, detail: j },
        { status: 502 }
      );
    }

    return NextResponse.json({
      paymentSessionId: j.id,
      clientSecret: j.clientSecret,
      // (If Ryft ever returns a hosted checkout link, include it as `url`)
    });
  } catch (e: any) {
    return NextResponse.json({ message: 'fetch failed', detail: e?.message }, { status: 500 });
  }
}