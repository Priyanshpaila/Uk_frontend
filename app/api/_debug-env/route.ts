import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || null,
  })
}