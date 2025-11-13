import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Build a very simple ICS string (UTC)
function makeICS(opts: {
  startISO: string
  endISO: string
  summary: string
  description?: string
  location?: string
  uid?: string
}) {
  const toICS = (iso: string) => {
    const d = new Date(iso)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    const ss = String(d.getUTCSeconds()).padStart(2, '0')
    return `${y}${m}${day}T${hh}${mm}${ss}Z`
  }

  const uid = opts.uid || `${Date.now()}@pharmacy-express`
  const dtstamp = toICS(new Date().toISOString())

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pharmacy Express//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toICS(opts.startISO)}`,
    `DTEND:${toICS(opts.endISO)}`,
    `SUMMARY:${escapeICS(opts.summary)}`,
    opts.description ? `DESCRIPTION:${escapeICS(opts.description)}` : '',
    opts.location ? `LOCATION:${escapeICS(opts.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

function escapeICS(s: string) {
  return s.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, start, end, tz } = body || {}

    if (!name || !email || !start || !end) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // TODO: persist + email notifications here

    const summary = 'Online consultation – Pharmacy Express'
    const description = `Patient: ${name}\nEmail: ${email}\nTime zone: ${tz || 'Europe/London'}`

    const ics = makeICS({
      startISO: start,
      endISO: end,
      summary,
      description,
      location: 'Online (video link to be provided)',
    })

    return NextResponse.json({ ok: true, ics })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}