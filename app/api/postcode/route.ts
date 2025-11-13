// app/api/postcode/route.ts
import { NextResponse } from "next/server"

const API_TIER_KEY = process.env.APITIER_KEY || "MQhH61aMch5jBhnSTRlI45s6YQ8XXTTa6WJyxQSL"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const postcode = (url.searchParams.get("postcode") || "").trim()

  if (!postcode) {
    return NextResponse.json({ message: "postcode is required", addresses: [] }, { status: 400 })
  }

  try {
    const res = await fetch(`https://postcode.apitier.com/v1/postcodes/${encodeURIComponent(postcode)}?x-api-key=${API_TIER_KEY}`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      if (res.status === 401 || text.toLowerCase().includes("unauthorized")) {
        return NextResponse.json({ message: "Invalid or expired API key", addresses: [] }, { status: 401 })
      }
      return NextResponse.json({ message: "API Tier lookup failed", detail: text, addresses: [] }, { status: res.status })
    }

    const data = await res.json()
    const addresses = data?.result?.addresses?.map((a: any) => a.address).filter(Boolean) || []

    if (addresses.length === 0) {
      return NextResponse.json({ message: "No addresses found", addresses: [] }, { status: 404 })
    }

    return NextResponse.json({
      addresses,
      meta: { source: "apitier" },
    })
  } catch (err) {
    return NextResponse.json({ message: "Lookup failed", error: String(err), addresses: [] }, { status: 500 })
  }
}