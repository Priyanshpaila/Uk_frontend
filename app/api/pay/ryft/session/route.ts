import { NextResponse } from 'next/server';

const SECRET = process.env.RYFT_SECRET_KEY || process.env.NEXT_PRIVATE_RYFT_SECRET_KEY;
const isSandbox = !!SECRET && (SECRET.startsWith('sk_test_') || SECRET.startsWith('sk_sandbox_'));
const BASE = isSandbox ? 'https://sandbox-api.ryftpay.com' : 'https://api.ryftpay.com';
const RYFT_ENDPOINT = `${BASE}/v1/payment-sessions`;

type BodyIn = {
  amount: number;
  currency?: string;
  description?: string;
  assessmentId?: string;
  customerEmail?: string;
  reference?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
};

function toFlatStringMeta(src?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!src) return out;
  for (const [k, v] of Object.entries(src)) {
    if (v == null) continue;
    // Ryft requires strings only, and disallows empty-string values
    if (typeof v === 'string') {
      if (v.trim() === '') continue;
      out[k] = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    } else {
      // arrays/objects → stringify
      const s = JSON.stringify(v);
      if (!s || s === '""') continue;
      out[k] = s;
    }
    // Ryft requires 1–250 chars per metadata value: hard-cap at 250
    if (out[k].length > 250) out[k] = out[k].slice(0, 250);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const SECRET = process.env.RYFT_SECRET_KEY || process.env.NEXT_PRIVATE_RYFT_SECRET_KEY;
    if (!SECRET) {
      return NextResponse.json({ message: 'Missing Ryft secret key' }, { status: 500 });
    }

    const body: BodyIn = await req.json();

    // --- ensure metadata has at least one key and returnUrl uses https ---
    const metaObj = toFlatStringMeta({
      ...body.metadata,
      ...(body.assessmentId ? { assessmentId: body.assessmentId } : {}),
    });
    if (Object.keys(metaObj).length === 0) {
      metaObj.source = 'checkout';
    }

    let normalizedReturnUrl = body.returnUrl;
    if (!normalizedReturnUrl || !normalizedReturnUrl.startsWith('https://')) {
      const base = process.env.PUBLIC_BASE_URL || '';
      if (base && base.startsWith('https://')) {
        normalizedReturnUrl = `${base.replace(/\/$/, '')}/checkout/reorder/return`;
      } else {
        // final fallback to a safe https URL
        normalizedReturnUrl = 'https://safescript.co.uk/checkout/reorder/return';
      }
    }

    const payload = {
      amount: Math.round(body.amount),
      currency: body.currency || 'GBP',
      description: body.description || 'Pharmacy payment',
      customerEmail: body.customerEmail,
      returnUrl: normalizedReturnUrl,
      reference: body.reference,       // appears on dashboard
      metadata: metaObj,
      // ensure the embedded form does NOT request billing address
      billingAddressCollection: 'never',   // preferred by newer APIs
      collectBillingAddress: false,        // fallback for older APIs
      billingAddressRequired: false,       // extra safety (some variants use this)
      // fallback shape used by some API variants
      billingAddress: {
        collection: 'never',
        required: false,
      },
      // only allow card payments in this flow
      paymentMethodTypes: ['card'],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: SECRET,
    };

    const res = await fetch(RYFT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch {} // keep raw text if not JSON

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || 'Ryft call failed', detail: text, status: res.status },
        { status: res.status || 500 },
      );
    }

    // Normalized response for the client
    return NextResponse.json({
      clientSecret: data.clientSecret,
      paymentSessionId: data.id,
      url: data?.links?.redirect || data?.hostedUrl || data?.hosted_url,
      raw: data,
      // temporary debug echo for verification in the browser console
      debug: { sentPayload: payload, ryftStatus: data?.status },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: 'Server error creating payment session', detail: err?.message || String(err) },
      { status: 500 },
    );
  }
}