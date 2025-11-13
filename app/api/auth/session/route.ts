import { NextResponse } from "next/server"

const RYFT_API_BASE = process.env.RYFT_API_BASE || "https://sandbox-api.ryftpay.com"
const RYFT_SECRET_KEY = process.env.RYFT_SECRET_KEY || ""

// optional: normalize a return URL for post-payment flows
function buildReturnUrl(explicit?: string) {
  const baseRaw = process.env.NEXT_PUBLIC_RETURN_URL_HTTPS || ""
  const base = baseRaw.trim().replace(/\/+$/, "")
  const url = explicit && explicit.startsWith("http")
    ? explicit
    : (base ? `${base}/checkout/return` : "")
  return url || undefined
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const useMinimal = body?.useMinimal === true

    if (!RYFT_SECRET_KEY || !RYFT_SECRET_KEY.startsWith("sk_")) {
      return NextResponse.json(
        { message: "Server misconfig. Missing or invalid RYFT_SECRET_KEY" },
        { status: 500 }
      )
    }

    // minimal sandbox payload for quick testing
    const nowIso = new Date().toISOString().replace(/[:.]/g, "")
    const amount = useMinimal ? 10000 : Number(body?.amount)
    const currency = String(body?.currency || "GBP")
    const reference = (typeof body?.reference === "string" && body.reference.trim())
      ? body.reference.trim()
      : `order-${nowIso}`
    const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail : ""
    const returnUrl = buildReturnUrl(body?.returnUrl)

    if (!useMinimal && (!amount || !Number.isInteger(amount) || amount < 50)) {
      return NextResponse.json(
        { message: "Bad request. amount must be integer pence and >= 50" },
        { status: 400 }
      )
    }

    const payload: Record<string, any> = {
      amount,
      currency,
      reference,
      returnUrl,
    }
    if (customerEmail) payload.customerEmail = customerEmail

    // Embedded SDK expects a **payment session**, not a hosted checkout session
    const endpoint = `${RYFT_API_BASE}/v1/payment-sessions`
    const idempotency = `ps-${reference}-${amount}`

    const ryftRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // IMPORTANT: Bearer prefix
        "Authorization": `Bearer ${RYFT_SECRET_KEY}`,
        "Idempotency-Key": idempotency,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const text = await ryftRes.text()
    let data: any
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }

    if (!ryftRes.ok) {
      const status = ryftRes.status
      const reqId = ryftRes.headers.get("x-request-id") || data?.requestId
      return NextResponse.json(
        { message: "Ryft call failed", status, requestId: reqId, detail: text },
        { status: 502 }
      )
    }

    // return the clientSecret only (what the Embedded SDK needs)
    return NextResponse.json({ clientSecret: data?.clientSecret })
  } catch (err: any) {
    return NextResponse.json(
      { message: "Server crash in session route", detail: String(err?.message || err) },
      { status: 500 }
    )
  }
}